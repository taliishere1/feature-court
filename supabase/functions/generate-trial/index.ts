import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface IntakeForm {
  proposal: string;
  audience: string;
  whyNow: string;
  tradeoff: string;
  gutCall?: "ship" | "kill" | "unsure";
}

interface VerdictContent {
  sentence: string;
  real_risk: string;
  strongest_ignored_argument: string;
  test_first: string;
}

interface TrialOutput {
  charge: string;
  case_title: string;
  prosecution: { opening: string; arguments: string[] };
  defense: { opening: string; arguments: string[] };
  cross_examination: string[];
  verdicts: {
    ship: VerdictContent;
    kill: VerdictContent;
    revise: VerdictContent;
    mistrial: VerdictContent;
  };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { intake }: { intake: IntakeForm } = await req.json();

  if (!intake?.proposal || !intake?.audience || !intake?.whyNow || !intake?.tradeoff) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const trialData = await generateTrial(intake, apiKey);
    return new Response(JSON.stringify(trialData), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: "AI generation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function generateTrial(intake: IntakeForm, apiKey: string): Promise<TrialOutput> {
  const systemPrompt = `You are the engine behind FEATURE COURT, where product decisions go on trial. You write three distinct voices: the BAILIFF "Bailiff Sprint" (dry, theatrical, always rushing the docket), the PROSECUTION "Prosecutor Mary T. Bug" (sharp, relentless, exposes every flaw with surgical precision), and the DEFENSE "Defense Attorney Edward 'Edge' Case" (optimistic, principled, steel-mans the upside with conviction). Be specific to THIS decision. Every argument must reference the actual proposal, user, timing, or tradeoff given. Be witty but substantive. Do not invent facts about real companies or real events. Return ONLY valid JSON matching the schema.`;

  const userInput = `Generate a Feature Court trial for this product decision:
Proposal: ${intake.proposal}
Who it serves: ${intake.audience}
Why now: ${intake.whyNow}
Tradeoff: ${intake.tradeoff}

Return the JSON in this exact format:
{
  "charge": "...",
  "case_title": "...",
  "prosecution": { "opening": "...", "arguments": ["...", "...", "..."] },
  "defense": { "opening": "...", "arguments": ["...", "...", "..."] },
  "cross_examination": ["...", "..."],
  "verdicts": {
    "ship": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },
    "kill": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },
    "revise": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },
    "mistrial": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." }
  }
}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4",
      instructions: systemPrompt,
      input: userInput,
      max_output_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const content = data.output_text || data.output?.[0]?.content?.[0]?.text;
  if (!content) throw new Error("No content in OpenAI response");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in OpenAI response");

  const parsed = JSON.parse(jsonMatch[0]);
  return validateTrialJSON(parsed);
}

function validateTrialJSON(json: Record<string, unknown>): TrialOutput {
  const required = ["charge", "case_title", "prosecution", "defense", "cross_examination", "verdicts"];
  for (const key of required) {
    if (!json[key]) throw new Error(`Missing required field: ${key}`);
  }

  const j = json as unknown as TrialOutput;

  if (!j.prosecution?.opening || !Array.isArray(j.prosecution?.arguments)) {
    throw new Error("Invalid prosecution format");
  }
  if (!j.defense?.opening || !Array.isArray(j.defense?.arguments)) {
    throw new Error("Invalid defense format");
  }
  if (!Array.isArray(j.cross_examination)) {
    throw new Error("Invalid cross_examination format");
  }

  for (const v of ["ship", "kill", "revise", "mistrial"] as const) {
    if (!j.verdicts?.[v]?.sentence) {
      throw new Error(`Missing sentence for verdict: ${v}`);
    }
  }

  return j;
}