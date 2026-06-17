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

  const { trial_id, ruling }: { trial_id: string; ruling: string } = await req.json();
  if (!trial_id || !ruling) {
    return new Response(JSON.stringify({ error: "Missing trial_id or ruling" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (!["ship", "kill", "revise", "mistrial"].includes(ruling)) {
    return new Response(JSON.stringify({ error: "Invalid ruling" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    const { data: trial, error: loadError } = await supabase.from("trials").select("*").eq("id", trial_id).single();
    if (loadError || !trial) {
      return new Response(JSON.stringify({ error: "Trial not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const intake = trial.intake as { proposal: string; audience: string; whyNow: string; tradeoff: string };
    const charge = trial.charge as string;
    const case_title = trial.case_title as string;
    const prosecution = trial.prosecution as { opening?: string; character?: { name: string } } | null;
    const defense = trial.defense as { opening?: string; character?: { name: string } } | null;
    const previousConversationId = trial.conversation_id as string | undefined;

    const body: Record<string, unknown> = {
      model: "gpt-4o",
      input: `Case: ${case_title}
Charge: "${charge}"
Proposal: "${intake.proposal}"
Ruling: ${ruling.toUpperCase()}

Prosecutor: "${prosecution?.character?.name || "Prosecutor"}" argued: "${(prosecution?.opening || "").slice(0, 200)}"
Defense: "${defense?.character?.name || "Defense"}" argued: "${(defense?.opening || "").slice(0, 200)}"

Generate a 2-3 sentence DOCKET SUMMARY for this trial. This appears on the Hall of Verdicts page. 
Write it as a brief, theatrical docket entry summarizing the case, the arguments, and the ruling.

Return ONLY this JSON:
{
  "summary": "..."
}`,
      max_output_tokens: 1024,
      temperature: 0.7,
    };

    if (previousConversationId) {
      body.previous_response_id = previousConversationId;
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

    const summary = parsed.summary as string;

    const { error: updateError } = await supabase.from("trials").update({
      summary,
    }).eq("id", trial_id);

    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);

    return new Response(JSON.stringify({ summary }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("summary-section error:", error);
    return new Response(JSON.stringify({ error: "Summary generation failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
