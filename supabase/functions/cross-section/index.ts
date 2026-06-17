import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Supabase not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { trial_id }: { trial_id: string } = await req.json();
  if (!trial_id) {
    return new Response(JSON.stringify({ error: "Missing trial_id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    const { data: trial, error: loadError } = await supabase.from("trials").select("*").eq("id", trial_id).single();
    if (loadError || !trial) {
      return new Response(JSON.stringify({ error: "Trial not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const intake = trial.intake as { proposal: string; audience: string; whyNow: string; tradeoff: string };
    const previousConversationId = trial.conversation_id as string | undefined;
    const charge = trial.charge as string;

    const body: Record<string, unknown> = {
      model: "gpt-4o",
      input: `Product Proposal: "${intake.proposal}"
Target Audience: "${intake.audience}"
Timing/Rationale: "${intake.whyNow}"
Tradeoff: "${intake.tradeoff}"

The charge: "${charge}"

Both sides have argued the case. Now generate the CROSS-EXAMINATION for this trial.

Generate 2 questions that the BAILIFF will ask the user (the judge) before they deliver their ruling. These should probe the user's conviction, honesty, and readiness.

Each question must have 3 answer choices. Each choice has:
- label: a short label (e.g. "Confident", "Cautious", "Pragmatic")
- text: what the user says when they pick this choice
- bailiff_reaction: Bailiff Sprint's dramatic reaction

Also generate a "bailiff_dialogue" array of exactly 3 lines that Bailiff Sprint says:
1. "The court has heard both sides. Before you rule, you must answer."
2. "Let us begin with the first question."
3. "Well reasoned. One more question to answer."

Make questions and choices SPECIFIC to this trial. NOT generic.

Return ONLY this JSON:
{
  "questions": [
    {
      "question": "...",
      "choices": [
        { "label": "...", "text": "...", "bailiff_reaction": "..." },
        { "label": "...", "text": "...", "bailiff_reaction": "..." },
        { "label": "...", "text": "...", "bailiff_reaction": "..." }
      ]
    },
    {
      "question": "...",
      "choices": [
        { "label": "...", "text": "...", "bailiff_reaction": "..." },
        { "label": "...", "text": "...", "bailiff_reaction": "..." },
        { "label": "...", "text": "...", "bailiff_reaction": "..." }
      ]
    }
  ],
  "bailiff_dialogue": ["...", "...", "..."]
}`,
      max_output_tokens: 4096,
      temperature: 0.8,
    };

    if (previousConversationId) {
      body.previous_response_id = previousConversationId;
    } else {
      body.instructions = "You are the Feature Court AI. Generate cross-examination questions for the BAILIFF. Be specific to THIS trial. Each question must force the user to reconcile the arguments they just heard.";
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const contentText = data.output_text || data.output?.[0]?.content?.[0]?.text;
    if (!contentText) throw new Error("No content in OpenAI response");

    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in OpenAI response");
    const parsed = JSON.parse(jsonMatch[0]);

    const questions = parsed.questions as Array<{ question: string; choices: Array<{ label: string; text: string; bailiff_reaction: string }> }>;
    const bailiff_dialogue = parsed.bailiff_dialogue as string[];
    const conversation_id = data.id;

    const { error: updateError } = await supabase.from("trials").update({
      cross_examination: questions,
      cross_bailiff_dialogue: bailiff_dialogue || [],
      conversation_id,
      generation_step: 4,
    }).eq("id", trial_id);

    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);

    return new Response(JSON.stringify({
      cross_examination: questions,
      cross_bailiff_dialogue: bailiff_dialogue || [],
      conversation_id,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("cross-section error:", error);
    return new Response(JSON.stringify({ error: "Cross-examination generation failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
