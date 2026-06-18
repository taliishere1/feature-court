import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAIResponses } from "../_shared/openai-responses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Developer instructions — Identity, Instructions, Examples (static, cache-friendly). Re-sent every chained call. */
const SYSTEM_PROMPT = `# Identity

You generate one step of a chained Feature Court trial — a theatrical product-decision trial.
Prosecutor Mary T. Bug and Defense Attorney Edward "Edge" Case argue; Bailiff Sprint speaks bailiff_reaction during cross.
Judge Ship Itwell presides. Cast names are fixed and must not be altered in output.

# Instructions

<critical_rules>
Output only the JSON fields required by the current step schema named in the user message.
Every bailiff_reaction: one sentence, first-person spoken words only.
NEVER put "Bailiff Sprint" inside bailiff_reaction text — the UI shows the speaker name.
Judge Ship Itwell presides. The bailiff does NOT preside.
FORBIDDEN: third-person narration, stage directions, narrator voice.
Prosecution arguments: exactly 3 strings. Defense arguments: exactly 3 strings.
Cross-examination: exactly 2 questions, each with exactly 3 choices.
Verdicts: exactly four keys — ship, kill, revise, mistrial.
Do not ask clarifying questions. Do not omit required fields.
</critical_rules>

<instruction_priority>
- User instructions override default style, tone, formatting, and initiative preferences unless they conflict with schema or safety.
- Safety, honesty, privacy, and permission constraints do not yield.
- If a newer user instruction conflicts with an earlier one, follow the newer instruction.
- Preserve earlier instructions that do not conflict.
</instruction_priority>

<default_follow_through_policy>
- If the user's intent is clear and the next step is reversible and low-risk, proceed without asking.
- Ask permission only if the next step is (a) irreversible, (b) has external side effects, or (c) requires missing sensitive information or a choice that would materially change the outcome.
- Produce the required JSON output in one response. Do not ask clarifying questions. Do not omit required fields.
</default_follow_through_policy>

<personality>
Bailiff Sprint speaks bailiff_reaction fields aloud during cross-examination. Judge Ship Itwell presides.
- bailiff_reaction is SPOKEN WORDS in first person — never third-person narration.
- NEVER put "Bailiff Sprint" inside bailiff_reaction text; the UI shows the speaker name.
- Tone: dry, theatrical, rushing the docket.

Prosecutor Mary T. Bug — persistent voice for prosecution fields.
- Role: prosecutor arguing against shipping this feature proposal; exposes flaws, risks, and weak reasoning.
- Tone: sharp, relentless, surgical; treats product tradeoffs as evidence against the accused proposal.
- Decision style: argument-driven, specific, no generic product-management platitudes.
- Substance: every prosecution argument must reference this trial's intake fields; do not invent companies, metrics, or market events.
- Do not invent alternate prosecutor names, titles, or roles.

Defense Attorney Edward "Edge" Case — persistent voice for defense fields.
- Role: defense attorney arguing for shipping this feature proposal; steel-mans upside and reframes risks.
- Tone: optimistic, principled, conviction-driven.
- Decision style: argument-driven, specific, responds directly to prosecution points.
- Substance: every defense argument must reference this trial's intake fields or prosecution; do not invent companies, metrics, or market events.
- Do not invent alternate defense names, titles, or roles.

Judge Ship Itwell presides. Cast names are fixed and must not be altered in output.
</personality>

<personality_and_writing_controls>
- Persona: Feature Court trial engine generating one step of a chained trial per user message.
- Channel: courtroom legal argument and spoken dialogue displayed in-app.
- Emotional register: theatrical but substantive, not campy, not melodramatic.
- Formatting: plain prose inside JSON string values; no markdown, no bullets, no stage directions inside values.
- Default follow-through: produce all required fields for the current step schema in one response without asking permission.
</personality_and_writing_controls>

<dependency_checks>
- Each chained step builds on prior steps via previous_response_id.
- Ground every field in the intake and prior-step context provided in the user message.
- Do not skip prerequisite context from the user message.
</dependency_checks>

<grounding_rules>
- Base claims only on trial_intake and prior-step context provided in the user message.
- If sources conflict, reconcile using provided context; attribute each side rather than inventing a third narrative.
- If the context is insufficient or irrelevant, narrow the output rather than guessing.
- If a statement is an inference rather than a directly supported fact, keep it narrow to provided context.
- Do not invent companies, metrics, user counts, or market events not supported by provided context.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the current step schema, in the requested order, in valid JSON only.
- Do not add prose, markdown fences, or fields outside the schema.
- Apply length limits only to the fields they are intended for.
- Output only JSON matching the schema named in the user message output_format.
</output_contract>

<structured_output_contract>
- Output only the requested JSON format.
- Do not add prose or markdown fences unless they were requested.
- Validate that parentheses and brackets are balanced.
- Do not invent schema fields.
</structured_output_contract>

<verbosity_controls>
- Prefer concise, information-dense writing.
- Avoid repeating the user's request.
- Do not shorten output so aggressively that required evidence or completion checks are omitted.
</verbosity_controls>

<completeness_contract>
- Treat the task as incomplete until all requested items are covered or explicitly marked [blocked].
- Incomplete until all fields required by the current step schema are present.
- Keep an internal checklist of required deliverables for the current step.
- Confirm coverage before finalizing.
</completeness_contract>

<verification_loop>
Before finalizing:
- Check correctness: does the output satisfy every requirement for this step?
- Check grounding: are factual claims backed by the provided intake and prior-step context?
- Check formatting: does the output match the current step schema?
- Check safety: response is schema JSON only; no external side effects.
</verification_loop>

<tool_persistence_rules>
- Complete all required schema fields in one response; do not return partial JSON.
- Run verification_loop before returning output.
- If output would violate critical_rules or schema, revise internally before finalizing.
</tool_persistence_rules>

<missing_context_gating>
- If required context is missing, do NOT guess.
- trial_intake and prior-step context are provided in the user message — do not ask clarifying questions.
- If you must proceed with sparse context, label assumptions explicitly and keep output narrow to what is provided.
</missing_context_gating>

<dig_deeper_nudge>
- Do not stop at the first plausible answer.
- Look for second-order issues, edge cases, and missing constraints.
- Perform at least one verification step before finalizing.
</dig_deeper_nudge>

# Examples

Paired input/output patterns only. Apply to the user message for the current step — never copy example wording.

<user_message id="example-1">
trial_intake and step task with output_format naming the step schema
</user_message>

<assistant_response id="example-1">
JSON matching only the named step schema; all fields grounded in user message context; spoken fields first person with no "Bailiff Sprint"
</assistant_response>

<user_message id="example-2">
trial_intake and step task with output_format naming the step schema
</user_message>

<assistant_response id="example-2">
Anti-pattern — never output: Bailiff Sprint in spoken fields; third-person narration; fields from wrong schema; prose outside requested JSON
</assistant_response>`;

const RL_WINDOW_MS = 60_000;
const RL_MAX_PER_WINDOW = 10;
const rlBuckets = new Map<string, number[]>();
function isRateLimited(req: Request): boolean {
  try {
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const now = Date.now();
    const recent = (rlBuckets.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
    if (recent.length >= RL_MAX_PER_WINDOW) {
      rlBuckets.set(ip, recent);
      return true;
    }
    recent.push(now);
    rlBuckets.set(ip, recent);
    return false;
  } catch {
    return false;
  }
}

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isRateLimited(req)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { intake }: { intake: IntakeForm } = await req.json();

  if (!intake?.proposal || !intake?.audience || !intake?.whyNow || !intake?.tradeoff) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const trialData = await generateTrial(intake, apiKey);
    return new Response(JSON.stringify(trialData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: "AI generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateTrial(intake: IntakeForm, apiKey: string): Promise<TrialOutput> {
  const intakeContext = `<trial_intake>
proposal: ${intake.proposal}
audience: ${intake.audience}
whyNow: ${intake.whyNow}
tradeoff: ${intake.tradeoff}
</trial_intake>`;

  const step1 = await callOpenAIResponses({
    apiKey,
    instructions: SYSTEM_PROMPT,
    input: `${intakeContext}

<task>
Generate charge and case_title for this Feature Court trial.
</task>

<critical_rule>
charge must be one dramatic sentence referencing proposal, audience, whyNow, and tradeoff.
case_title must be a theatrical court case name derived from the proposal.
</critical_rule>

<execution_order>
1. Write case_title grounded in intake.
2. Write charge as one dramatic sentence grounded in all four intake fields.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce both outputs grounded on what is provided.
- Do not output placeholder or template prose.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching charge_step schema only. After the final JSON, output nothing further.
</output_format>

<output_shape>
Return charge_step JSON only. Ground case_title and charge in trial_intake above.
</output_shape>`,
    schemaName: "charge_step",
    schema: {
      type: "object",
      properties: {
        charge: { type: "string" },
        case_title: { type: "string" },
      },
      required: ["charge", "case_title"],
      additionalProperties: false,
    },
  });
  const chargeData = JSON.parse(step1.outputText);
  const charge = chargeData.charge as string;
  const case_title = chargeData.case_title as string;

  const step2 = await callOpenAIResponses({
    apiKey,
    instructions: SYSTEM_PROMPT,
    previousResponseId: step1.id,
    input: `${intakeContext}
charge: ${charge}
case_title: ${case_title}

<task>
Generate prosecution opening and exactly 3 arguments for this Feature Court trial.
</task>

<critical_rule>
arguments must contain exactly 3 strings. No more, no fewer.
Write in Prosecutor Mary T. Bug voice.
</critical_rule>

<execution_order>
1. Write opening: sharp opening statement grounded in intake and charge.
2. Write arguments[0], arguments[1], arguments[2]: three distinct paragraphs tied to proposal, audience, whyNow, or tradeoff.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all outputs grounded on what is provided and the charge.
- Do not output placeholder or template prose.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching prosecution_step schema only. After the final JSON, output nothing further.
</output_format>

<output_shape>
Return prosecution_step JSON only. Ground opening and arguments in trial_intake and charge above.
</output_shape>`,
    schemaName: "prosecution_step",
    schema: {
      type: "object",
      properties: {
        prosecution: {
          type: "object",
          properties: {
            opening: { type: "string" },
            arguments: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
          },
          required: ["opening", "arguments"],
          additionalProperties: false,
        },
      },
      required: ["prosecution"],
      additionalProperties: false,
    },
  });
  const prosecutionData = JSON.parse(step2.outputText);
  const prosecution = prosecutionData.prosecution as { opening: string; arguments: string[] };

  const step3 = await callOpenAIResponses({
    apiKey,
    instructions: SYSTEM_PROMPT,
    previousResponseId: step2.id,
    input: `${intakeContext}
charge: ${charge}
prosecution_opening: ${prosecution.opening}

<task>
Generate defense opening and exactly 3 arguments for this Feature Court trial.
</task>

<critical_rule>
arguments must contain exactly 3 strings. No more, no fewer.
Write in Defense Attorney Edward "Edge" Case voice.
Each argument must directly respond to or reframe the prosecution.
</critical_rule>

<execution_order>
1. Write opening: optimistic opening statement grounded in intake and charge, responding to prosecution.
2. Write arguments[0], arguments[1], arguments[2]: three distinct paragraphs responding to prosecution and tied to intake.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all outputs grounded on what is provided, the charge, and prosecution.
- Do not output placeholder or template prose.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching defense_step schema only. After the final JSON, output nothing further.
</output_format>

<output_shape>
Return defense_step JSON only. Ground opening and arguments in trial_intake, charge, and prosecution above.
</output_shape>`,
    schemaName: "defense_step",
    schema: {
      type: "object",
      properties: {
        defense: {
          type: "object",
          properties: {
            opening: { type: "string" },
            arguments: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
          },
          required: ["opening", "arguments"],
          additionalProperties: false,
        },
      },
      required: ["defense"],
      additionalProperties: false,
    },
  });
  const defenseData = JSON.parse(step3.outputText);
  const defense = defenseData.defense as { opening: string; arguments: string[] };

  const choiceSchema = {
    type: "object",
    properties: {
      label: { type: "string" },
      text: { type: "string" },
      bailiff_reaction: { type: "string" },
    },
    required: ["label", "text", "bailiff_reaction"],
    additionalProperties: false,
  };

  const step4 = await callOpenAIResponses({
    apiKey,
    instructions: SYSTEM_PROMPT,
    previousResponseId: step3.id,
    input: `${intakeContext}
charge: ${charge}

<task>
Generate cross-examination questions for this Feature Court trial.
</task>

<critical_rule>
cross_examination must contain exactly 2 questions.
Each question must have exactly 3 choices with label, text, and bailiff_reaction.
bailiff_reaction: spoken first-person words only — never third-person narration. Never put "Bailiff Sprint" inside bailiff_reaction values.
Questions must probe the judge's conviction on this specific case.
</critical_rule>

<execution_order>
1. Write questions[0] with question text and 3 choices.
2. Write questions[1] with question text and 3 choices.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all outputs grounded on what is provided and the charge.
- Do not output placeholder or template prose.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching cross_step schema only. After the final JSON, output nothing further.
</output_format>

<output_shape>
Return cross_step JSON only. Ground questions and bailiff_reaction fields in trial_intake and charge above.
</output_shape>`,
    schemaName: "cross_step",
    schema: {
      type: "object",
      properties: {
        cross_examination: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              choices: {
                type: "array",
                items: choiceSchema,
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ["question", "choices"],
            additionalProperties: false,
          },
          minItems: 2,
          maxItems: 2,
        },
      },
      required: ["cross_examination"],
      additionalProperties: false,
    },
  });
  const crossData = JSON.parse(step4.outputText);
  const cross_examination = crossData.cross_examination as CrossExaminationQuestion[];

  const verdictItemSchema = {
    type: "object",
    properties: {
      sentence: { type: "string" },
      real_risk: { type: "string" },
      strongest_ignored_argument: { type: "string" },
      test_first: { type: "string" },
    },
    required: ["sentence", "real_risk", "strongest_ignored_argument", "test_first"],
    additionalProperties: false,
  };

  const step5 = await callOpenAIResponses({
    apiKey,
    instructions: SYSTEM_PROMPT,
    previousResponseId: step4.id,
    maxOutputTokens: 16000,
    input: `${intakeContext}
charge: ${charge}

<task>
Generate all four verdicts for this Feature Court trial.
</task>

<critical_rule>
verdicts must contain exactly four keys: ship, kill, revise, mistrial.
Each verdict must have sentence, real_risk, strongest_ignored_argument, and test_first.
Each verdict must reflect this specific trial, not generic product advice.
</critical_rule>

<execution_order>
1. Write verdicts.ship.
2. Write verdicts.kill.
3. Write verdicts.revise.
4. Write verdicts.mistrial.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all four verdicts grounded on what is provided and the charge.
- Do not output placeholder or template prose.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching verdicts_step schema only. After the final JSON, output nothing further.
</output_format>

<output_shape>
Return verdicts_step JSON only. Ground all four verdicts in trial_intake and charge above.
</output_shape>`,
    schemaName: "verdicts_step",
    schema: {
      type: "object",
      properties: {
        verdicts: {
          type: "object",
          properties: {
            ship: verdictItemSchema,
            kill: verdictItemSchema,
            revise: verdictItemSchema,
            mistrial: verdictItemSchema,
          },
          required: ["ship", "kill", "revise", "mistrial"],
          additionalProperties: false,
        },
      },
      required: ["verdicts"],
      additionalProperties: false,
    },
  });
  const verdictsData = JSON.parse(step5.outputText);
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

  if (!j.prosecution?.opening || !Array.isArray(j.prosecution?.arguments) || j.prosecution.arguments.length !== 3) {
    throw new Error("Invalid prosecution format");
  }
  if (!j.defense?.opening || !Array.isArray(j.defense?.arguments) || j.defense.arguments.length !== 3) {
    throw new Error("Invalid defense format");
  }
  if (!Array.isArray(j.cross_examination) || j.cross_examination.length !== 2) {
    throw new Error("Invalid cross_examination format");
  }
  for (const q of j.cross_examination) {
    if (!q.question || !Array.isArray(q.choices) || q.choices.length !== 3) {
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
