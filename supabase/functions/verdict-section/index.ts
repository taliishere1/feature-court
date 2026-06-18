import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callOpenAIResponses } from "../_shared/openai-responses.ts";
import { isValidUuid } from "../_shared/edge-http.ts";

const VERDICT_LABELS = {
  ship: "Ship It",
  kill: "Kill It",
  revise: "Send Back",
  mistrial: "Mistrial",
} as const;

/** Developer instructions — Identity, Instructions, Examples (static, cache-friendly). Re-sent every call. */
const SYSTEM_PROMPT = `# Identity

You generate the four verdict options for Feature Court — a theatrical product-decision trial.
Neutral judicial framing for ship, kill, revise, and mistrial. Judge Ship Itwell selects one after cross-examination.
Tone: theatrical but substantive; each verdict reflects this trial's specific arguments.

# Instructions

<critical_rules>
verdicts: exactly four keys — ship, kill, revise, mistrial.
Each verdict must have label, description, sentence, real_risk, strongest_ignored_argument, and test_first.
Each verdict must reflect this trial's intake and charge — not generic product advice.
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
Feature Court verdict engine — neutral judicial framing for all four possible rulings.
- Role: generate the four verdict options the presiding judge may choose after hearing prosecution and defense.
- Tone: theatrical but substantive; each verdict reflects the specific arguments from this trial.
- Decision style: ship rewards conviction, kill punishes fatal flaws, revise sends back for rework, mistrial acknowledges insufficient clarity.
- Substance: every verdict field must reference this trial's intake and charge; never generic product advice.
</personality>

<personality_and_writing_controls>
- Persona: neutral verdict engine writing four distinct ruling outcomes for this case.
- Channel: verdict cards displayed in-app for judge selection.
- Emotional register: theatrical but substantive, not campy, not melodramatic.
- Formatting: plain prose inside JSON string values; no markdown, no bullets, no stage directions inside values.
- Length: label short display text; description one-line tagline; other fields substantive but concise.
- Default follow-through: produce all required fields in one response without asking permission.
</personality_and_writing_controls>

<dependency_checks>
- This is step 5 of a multi-step Feature Court trial. trial_context includes intake, charge, prosecution, and defense.
- Ground every verdict in the specific arguments and evidence from this trial.
- Do not skip dependency on prosecution and defense before finalizing.
</dependency_checks>

<grounding_rules>
- Base claims only on trial_context provided in the user message — intake, charge, prosecution, and defense.
- If sources conflict, reconcile using prosecution and defense arguments; attribute each side rather than inventing a third narrative.
- Each verdict must reflect tensions raised in this specific trial, not generic product dilemmas.
- If the context is insufficient or irrelevant, narrow the output rather than guessing.
- If a statement is an inference rather than a directly supported fact, keep it narrow to trial_context.
- Do not invent companies, metrics, user counts, or market events not supported by trial_context.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the schema, in the requested order, in valid JSON only.
- Do not add prose, markdown fences, or fields outside the schema.
- Apply length limits only to the fields they are intended for.
- Output only JSON matching the verdicts schema.
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
- Do not shorten output so aggressively that required completion checks are omitted.
- Description: one-line tagline per verdict.
</verbosity_controls>

<completeness_contract>
- Treat the task as incomplete until all requested items are covered or explicitly marked [blocked].
- Incomplete until verdicts contains ship, kill, revise, and mistrial, each with all required fields.
- Keep an internal checklist: all four verdict keys and their six fields each.
- Confirm coverage before finalizing.
</completeness_contract>

<verification_loop>
Before finalizing:
- Check correctness: does the output satisfy every requirement?
- Check grounding: does each verdict reflect this trial's intake, charge, prosecution, and defense?
- Check formatting: does the output match the verdicts schema?
- Check safety: response is schema JSON only; no external side effects.
- Confirm all four verdict keys are present with label, description, sentence, real_risk, strongest_ignored_argument, test_first.
</verification_loop>

<tool_persistence_rules>
- Complete all required schema fields in one response; do not return partial JSON.
- Run verification_loop before returning output.
- If output would violate critical_rules or schema, revise internally before finalizing.
</tool_persistence_rules>

<missing_context_gating>
- If required context is missing, do NOT guess.
- trial_context (intake, charge, prosecution, defense) is always provided in the user message — do not ask clarifying questions.
- If you must proceed with sparse context, label assumptions explicitly and keep output narrow to what is provided.
</missing_context_gating>

<dig_deeper_nudge>
- Do not stop at the first plausible answer.
- Look for second-order risks and ignored arguments unique to each verdict path.
- Perform at least one verification step before finalizing.
</dig_deeper_nudge>

# Examples

Illustrates structure and violations only. Never copy example wording — ground every field in trial_context from the user message.

<correct_flow>
trial_context in user message →
verdicts.ship: all six fields; reflects ship path for this trial →
verdicts.kill: all six fields; reflects kill path for this trial →
verdicts.revise: all six fields; reflects revise path for this trial →
verdicts.mistrial: all six fields; reflects mistrial path for this trial
</correct_flow>

<incorrect_pattern>
FORBIDDEN: missing any of ship, kill, revise, mistrial keys
FORBIDDEN: missing any required field on a verdict
FORBIDDEN: generic product advice not tied to this trial's intake and arguments
</incorrect_pattern>`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

function getPublishableKey(): string {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.default) return parsed.default as string;
      const first = Object.values(parsed)[0];
      if (typeof first === "string") return first;
    } catch {
      // fall through
    }
  }
  return (
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    ""
  );
}

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  return createClient(url, getPublishableKey());
}

function verdictSchema() {
  return {
    type: "object",
    properties: {
      label: { type: "string" },
      description: { type: "string" },
      sentence: { type: "string" },
      real_risk: { type: "string" },
      strongest_ignored_argument: { type: "string" },
      test_first: { type: "string" },
    },
    required: ["label", "description", "sentence", "real_risk", "strongest_ignored_argument", "test_first"],
    additionalProperties: false,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (isRateLimited(req)) {
    return json({ error: "Too many requests. Please wait a moment and try again." }, 429);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json({ error: "OpenAI API key not configured" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl || !getPublishableKey()) {
    return json({ error: "Supabase not configured" }, 500);
  }

  const supabase = getSupabaseClient();

  let trial_id: string;
  try {
    const parsed = await req.json();
    trial_id = parsed.trial_id;
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!trial_id) {
    return json({ error: "Missing trial_id" }, 400);
  }
  if (!isValidUuid(trial_id)) {
    return json({ error: "Invalid trial_id" }, 400);
  }

  try {
    const { data: trial, error: loadError } = await supabase.from("trials").select("*").eq("id", trial_id).single();
    if (loadError || !trial) {
      return json({ error: "Trial not found" }, 404);
    }

    const existingVerdicts = trial.verdicts as { ship?: { sentence?: string } } | null;
    if (existingVerdicts?.ship?.sentence?.trim()) {
      return json({
        verdicts: trial.verdicts,
        conversation_id: trial.conversation_id,
      });
    }

    const intake = trial.intake as { proposal: string; audience: string; whyNow: string; tradeoff: string };
    const previousConversationId = trial.conversation_id as string | undefined;
    const charge = trial.charge as string;
    const case_title = (trial.case_title as string) ?? "";
    const prosecution = trial.prosecution as { opening?: string; arguments?: string[] } | null;
    const defense = trial.defense as { opening?: string; arguments?: string[] } | null;
    const prosecutionOpening = prosecution?.opening ?? "";
    const defenseOpening = defense?.opening ?? "";
    const prosecutionArgs = Array.isArray(prosecution?.arguments) ? prosecution.arguments : [];
    const defenseArgs = Array.isArray(defense?.arguments) ? defense.arguments : [];

    const input = `<trial_context>
proposal: ${intake.proposal}
audience: ${intake.audience}
whyNow: ${intake.whyNow}
tradeoff: ${intake.tradeoff}
charge: ${charge}
case_title: ${case_title}
prosecution_opening: ${prosecutionOpening}
prosecution_arguments:
${prosecutionArgs.map((a, i) => `${i + 1}. ${a}`).join("\n")}
defense_opening: ${defenseOpening}
defense_arguments:
${defenseArgs.map((a, i) => `${i + 1}. ${a}`).join("\n")}
</trial_context>

<task>
Generate all four verdicts for this Feature Court trial.
</task>

<critical_rule>
verdicts must contain exactly four keys: ship, kill, revise, mistrial.
Each verdict must have label, description, sentence, real_risk, strongest_ignored_argument, and test_first.
Each verdict must reflect the specific arguments and evidence from this trial, not generic advice.
</critical_rule>

<execution_order>
1. Write verdicts.ship: ruling to ship the feature; label is short display text for shipping.
2. Write verdicts.kill: ruling to kill the feature; label is short display text for killing.
3. Write verdicts.revise: ruling to send the feature back for revision; label is short display text for revision.
4. Write verdicts.mistrial: ruling that the case lacks sufficient clarity; label is short display text for mistrial.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all four verdicts grounded on what is provided and the charge.
- Do not output placeholder or template prose; each field must be unique to this trial.
- If prior conversation context exists via previous_response_id, continue the same trial voice and grounding.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching the verdicts schema only. After the final JSON, output nothing further.
</output_format>

<example>
Execution shape only — every value must come from trial_context above, not from this example:
{
  "verdicts": {
    "ship": {"label": "<short>", "description": "<one line>", "sentence": "<grounded in this trial>", "real_risk": "<from this trial>", "strongest_ignored_argument": "<from this trial>", "test_first": "<from this trial>"},
    "kill": {"label": "<short>", "description": "<one line>", "sentence": "<grounded in this trial>", "real_risk": "<from this trial>", "strongest_ignored_argument": "<from this trial>", "test_first": "<from this trial>"},
    "revise": {"label": "<short>", "description": "<one line>", "sentence": "<grounded in this trial>", "real_risk": "<from this trial>", "strongest_ignored_argument": "<from this trial>", "test_first": "<from this trial>"},
    "mistrial": {"label": "<short>", "description": "<one line>", "sentence": "<grounded in this trial>", "real_risk": "<from this trial>", "strongest_ignored_argument": "<from this trial>", "test_first": "<from this trial>"}
  }
}
</example>`;

    const { id: conversation_id, outputText } = await callOpenAIResponses({
      apiKey,
      instructions: SYSTEM_PROMPT,
      input,
      schemaName: "verdicts",
      previousResponseId: previousConversationId,
      maxOutputTokens: 14000,
      schema: {
        type: "object",
        properties: {
          verdicts: {
            type: "object",
            properties: {
              ship: verdictSchema(),
              kill: verdictSchema(),
              revise: verdictSchema(),
              mistrial: verdictSchema(),
            },
            required: ["ship", "kill", "revise", "mistrial"],
            additionalProperties: false,
          },
        },
        required: ["verdicts"],
        additionalProperties: false,
      },
    });

    const parsed = JSON.parse(outputText);
    const verdicts = parsed.verdicts as Record<string, Record<string, string>>;

    for (const key of ["ship", "kill", "revise", "mistrial"] as const) {
      const v = verdicts[key];
      if (!v) throw new Error(`Missing verdict: ${key}`);
      for (const field of ["label", "description", "sentence", "real_risk", "strongest_ignored_argument", "test_first"]) {
        if (!v[field]?.trim()) throw new Error(`Missing ${field} for verdict ${key}`);
      }
      v.label = VERDICT_LABELS[key];
    }

    const { error: updateError } = await supabase.from("trials").update({
      verdicts,
      conversation_id,
      generation_step: 5,
    }).eq("id", trial_id);

    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);

    return json({ verdicts, conversation_id });
  } catch (error) {
    console.error("verdict-section error:", error);
    return json({ error: "Verdict generation failed" }, 500);
  }
});
