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

Generate the PROSECUTION for this trial. Return ONLY this JSON:
{
  "character": { "name": "...", "title": "..." },
  "bailiff_intro": "...",
  "opening": "...",
  "arguments": ["...", "...", "..."],
  "closing": "..."
}

character: creative prosecutor name and title
bailiff_intro: Bailiff Sprint announces the prosecution
opening: sharp opening statement referencing the proposal
arguments: 3 specific paragraphs, each tied to the proposal/audience/timing/tradeoff
closing: ties it together`,
      max_output_tokens: 4096,
      temperature: 0.8,
    };

    if (previousConversationId) {
      body.previous_response_id = previousConversationId;
    } else {
      body.instructions = "You are the Feature Court AI. You write the PROSECUTION - sharp, relentless, exposes every flaw. Be specific to THIS decision.";
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

    const character = parsed.character || { name: "Mary T. Bug", title: "Staff PM" };
    const opening = parsed.opening as string;
    const arguments_ = parsed.arguments as string[];
    const closing = parsed.closing as string;
    const bailiff_intro = parsed.bailiff_intro as string;
    const conversation_id = data.id;

    const { error: updateError } = await supabase.from("trials").update({
      prosecution: { opening, arguments: arguments_, closing, character, bailiff_intro },
      conversation_id,
      generation_step: 2,
    }).eq("id", trial_id);

    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);

    return new Response(JSON.stringify({
      prosecution: { opening, arguments: arguments_, closing, character, bailiff_intro },
      conversation_id,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("prosecution-section error:", error);
    return new Response(JSON.stringify({ error: "Prosecution generation failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
