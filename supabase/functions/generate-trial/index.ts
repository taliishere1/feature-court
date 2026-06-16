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

interface CrossExaminationChoice {
  label: string;
  text: string;
  bailiff_reaction: string;
}

interface CrossExaminationQuestion {
  question: string;
  choices: CrossExaminationChoice[];
}

interface TrialOutput {
  charge: string;
  case_title: string;
  prosecution: { opening: string; arguments: string[] };
  defense: { opening: string; arguments: string[] };
  cross_examination: CrossExaminationQuestion[];
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

async function callOpenAI(params: {
  apiKey: string;
  input: string;
  instructions?: string;
  previous_response_id?: string;
}): Promise<{ id: string; text: string }> {
  const body: Record<string, unknown> = {
    model: "gpt-4o-mini",
    instructions: params.instructions || systemPrompt,
    input: params.input,
    max_output_tokens: 4096,
  };
  if (params.previous_response_id) {
    body.previous_response_id = params.previous_response_id;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const content = data.output_text || data.output?.[0]?.content?.[0]?.text;
  if (!content) throw new Error("No content in OpenAI response");
  return { id: data.id, text: content };
}

function extractJSON(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in OpenAI response");
  return JSON.parse(match[0]);
}

const systemPrompt = `You are the engine behind FEATURE COURT, where product decisions go on trial. You write three distinct voices: the BAILIFF "Bailiff Sprint" (dry, theatrical, always rushing the docket), the PROSECUTION "Prosecutor Mary T. Bug" (sharp, relentless, exposes every flaw with surgical precision), and the DEFENSE "Defense Attorney Edward 'Edge' Case" (optimistic, principled, steel-mans the upside with conviction). Be specific to THIS decision. Every argument must reference the actual proposal, user, timing, or tradeoff given. Be witty but substantive. Do not invent facts about real companies or real events. Return ONLY valid JSON matching the schema.`;

async function generateTrial(intake: IntakeForm, apiKey: string): Promise<TrialOutput> {
  const intakeContext = `Product Decision:
Proposal: ${intake.proposal}
Who it serves: ${intake.audience}
Why now: ${intake.whyNow}
Tradeoff: ${intake.tradeoff}`;

  // === STEP 1: Charge and Case Title ===
  const step1 = await callOpenAI({
    apiKey,
    input: `${intakeContext}\n\nGenerate only the charge and case_title for this Feature Court trial. The charge is a single dramatic sentence describing what this proposal "stands charged" with. The case_title is a short, theatrical court case name.\n\nReturn JSON:\n{\n  "charge": "...",\n  "case_title": "..."\n}`,
  });
  const chargeData = extractJSON(step1.text);
  const charge = chargeData.charge as string;
  const case_title = chargeData.case_title as string;

  // === STEP 2: Prosecution Opening + Arguments ===
  const step2 = await callOpenAI({
    apiKey,
    previous_response_id: step1.id,
    input: `The charge has been read: "${charge}"\n\nNow generate the PROSECUTION's opening statement and 3 arguments. Prosecutor Mary T. Bug is sharp, relentless, exposes every flaw with surgical precision. Each argument must reference the actual proposal, audience, timing, or tradeoff.\n\nReturn JSON:\n{\n  "prosecution": { "opening": "...", "arguments": ["...", "...", "..."] }\n}`,
  });
  const prosecutionData = extractJSON(step2.text);
  const prosecution = prosecutionData.prosecution as { opening: string; arguments: string[] };

  // === STEP 3: Defense Opening + Arguments ===
  const step3 = await callOpenAI({
    apiKey,
    previous_response_id: step2.id,
    input: `The prosecution has made their case. Now generate the DEFENSE's opening statement and 3 arguments. Defense Attorney Edward "Edge" Case is optimistic, principled, steel-mans the upside with conviction. Each argument must directly respond to or reframe the prosecution's points and reference the actual proposal, audience, timing, or tradeoff.\n\nReturn JSON:\n{\n  "defense": { "opening": "...", "arguments": ["...", "...", "..."] }\n}`,
  });
  const defenseData = extractJSON(step3.text);
  const defense = defenseData.defense as { opening: string; arguments: string[] };

  // === STEP 4: Cross-Examination Questions with Choices ===
  const step4 = await callOpenAI({
    apiKey,
    previous_response_id: step3.id,
    input: `Both sides have argued. Now generate 2 cross-examination questions that the BAILIFF will ask the user (the judge) before they deliver their ruling. These should probe the user's conviction, honesty, and readiness — forcing them to reconcile the tension between the prosecution and defense arguments they just heard.

Each question must have 3 answer choices. Each choice has:
- label: a short label describing the type of answer (e.g. "Confident", "Cautious", "Pragmatic")
- text: what the user says when they pick this choice
- bailiff_reaction: Bailiff Sprint's dramatic reaction to this choice

Make the questions and choices SPECIFIC to this trial's proposal, audience, timing, and tradeoff. NOT generic.

Return JSON:
{
  "cross_examination": [
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
  ]
}`,
  });
  const crossData = extractJSON(step4.text);
  const cross_examination = crossData.cross_examination as CrossExaminationQuestion[];

  // === STEP 5: All Verdicts ===
  const step5 = await callOpenAI({
    apiKey,
    previous_response_id: step4.id,
    input: `Now generate all 4 possible verdicts for this trial. Each verdict must have a sentence, real_risk, strongest_ignored_argument, and test_first. Reflect the specific arguments made by both sides in this case.\n\nReturn JSON:\n{\n  "verdicts": {\n    "ship": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },\n    "kill": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },\n    "revise": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },\n    "mistrial": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." }\n  }\n}`,
  });
  const verdictsData = extractJSON(step5.text);
  const verdicts = verdictsData.verdicts as TrialOutput["verdicts"];

  const assembled: TrialOutput = {
    charge,
    case_title,
    prosecution,
    defense,
    cross_examination,
    verdicts,
  };

  return validateTrialJSON(assembled as unknown as Record<string, unknown>);
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
  // Validate each cross-examination question has question + choices
  for (const q of j.cross_examination) {
    if (!q.question || !Array.isArray(q.choices) || q.choices.length < 2) {
      throw new Error("Invalid cross_examination question format");
    }
    for (const c of q.choices) {
      if (!c.label || !c.text || !c.bailiff_reaction) {
        throw new Error("Invalid cross_examination choice format");
      }
    }
  }

  for (const v of ["ship", "kill", "revise", "mistrial"] as const) {
    if (!j.verdicts?.[v]?.sentence) {
      throw new Error(`Missing sentence for verdict: ${v}`);
    }
  }

  return j;
}