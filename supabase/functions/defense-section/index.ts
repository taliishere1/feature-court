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

    const intakeContext = `Product Proposal: "${intake.proposal}"
Target Audience: "${intake.audience}"
Timing/Rationale: "${intake.whyNow}"
Tradeoff: "${intake.tradeoff}"`;

    const charge = trial.charge as string;
    const prosecution = trial.prosecution as { opening: string; arguments: string[] } | null;

    const body: Record<string, unknown> = {
      model: "gpt-4o",
      input: `${intakeContext}

The charge: "${charge}"

The prosecution has argued: "${prosecution?.opening || 'No opening'}"

Now generate the DEFENSE for this Feature Court trial. Generate:

1. "character" — an object with "name" and "title" for the defense attorney. Be creative, theatrical.

2. "bailiff_intro" — a single line Bailiff Sprint says introducing the defense.

3. "opening" — the defense attorney's opening statement, optimizing and reframing, responding to the prosecution.

4. "arguments" — an array of exactly 3 arguments. Each argument must directly respond to or reframe the prosecution's points. Each is a complete paragraph.

5. "closing" — a closing statement that ties it together.

Return ONLY valid JSON in this exact format:
{
  "character": { "name": "...", "title": "..." },
  "bailiff_intro": "...",
  "opening": "...",
  "arguments": ["...", "...", "..."],
  "closing": "..."
}`,
      max_output_tokens: 4096,
      temperature: 0.8,
    };

    if (previousConversationId) {
      body.previous_response_id = previousConversationId;
    } else {
      body.instructions = `You are the Feature Court AI. You write the DEFENSE "Defense Attorney Edward 'Edge' Case" — optimistic, principled, steel-mans the upside with conviction. Each argument must directly respond to the prosecution and reference the actual proposal, user, timing, or tradeoff. Return ONLY valid JSON.`;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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

    const character = parsed.character || { name: "Edward 'Edge' Case", title: "Public Defender" };
    const opening = parsed.opening as string;
    const arguments_ = parsed.arguments as string[];
    const closing = parsed.closing as string;
    const bailiff_intro = parsed.bailiff_intro as string;
    const conversation_id = data.id;

    const { error: updateError } = await supabase.from("trials").update({
      defense: { opening, arguments: arguments_, closing, character, bailiff_intro },
      conversation_id,
      generation_step: 3,
    }).eq("id", trial_id);

    if (updateError) {
      throw new Error(`Supabase update error: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      defense: { opening, arguments: arguments_, closing, character, bailiff_intro },
      conversation_id,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("defense-section error:", error);
    return new Response(JSON.stringify({ error: "Defense generation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
