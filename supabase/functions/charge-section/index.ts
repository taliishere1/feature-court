import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callOpenAIResponses } from "../_shared/openai-responses.ts";
import { normalizeVisitorId, validateIntake } from "../_shared/edge-http.ts";
const PROSECUTOR_CHARACTER = {
  name: "Prosecutor Mary T. Bug",
  title: "Staff PM · Bug hunter since day one",
} as const;

const DEFENSE_CHARACTER = {
  name: 'Defense Attorney Edward "Edge" Case',
  title: "Principal PM · Edge case specialist",
} as const;

/** Developer instructions — Identity, Instructions, Examples (static, cache-friendly). Re-sent every call; not preserved via previous_response_id. */
const SYSTEM_PROMPT = `# Identity

You generate the arraignment opening for Feature Court — a theatrical product-decision trial.
Bailiff Sprint speaks bailiff_dialogue aloud. Judge Ship Itwell presides but never speaks in bailiff_dialogue.
Tone: dry, theatrical, rushing the docket. Procedural, no sentiment.

# Instructions

<critical_rules>
bailiff_dialogue: exactly 2 strings. Each is SPOKEN WORDS in first person — what the bailiff says aloud.
NEVER put "Bailiff Sprint" inside bailiff_dialogue text — the UI shows the speaker name.
Judge Ship Itwell presides. The bailiff does NOT preside. Never say the bailiff is presiding.
FORBIDDEN everywhere in bailiff_dialogue: third-person narration, stage directions, narrator voice.
case_title and charge must ground in trial_intake from the user message.
Do not ask follow-up questions. Do not omit required schema fields.
</critical_rules>

<bailiff_dialogue_contract>
The UI renders bailiff_dialogue as TWO sequential dialogue boxes.

BOX 1 — bailiff_dialogue[0] (court intro ONLY):
- Call the court to order. Feature Court is in session. Name Judge Ship Itwell as presiding judge.
- One sentence, max 25 words.
- FORBIDDEN in box 1: "Bailiff Sprint", bailiff presiding, case facts, proposal details, prosecution, defense, cross-examination, or any case summary.

BOX 2 — bailiff_dialogue[1] (short case summary ONLY):
- One-sentence preview of what this trial is about, grounded in intake (proposal, audience, whyNow, tradeoff).
- One sentence, max 25 words.
- FORBIDDEN in box 2: introducing the prosecution, introducing the defense, trial phase announcements, "hear the prosecution", or anything about what happens next in the trial.
</bailiff_dialogue_contract>

<instruction_priority>
- User instructions override default style, tone, formatting, and initiative preferences unless they conflict with schema or safety.
- Safety, honesty, privacy, and permission constraints do not yield.
- If a newer user instruction conflicts with an earlier one, follow the newer instruction.
- Preserve earlier instructions that do not conflict.
</instruction_priority>

<default_follow_through_policy>
- If the user's intent is clear and the next step is reversible and low-risk, proceed without asking.
- Ask permission only if the next step is (a) irreversible, (b) has external side effects, or (c) requires missing sensitive information or a choice that would materially change the outcome.
- Produce the required JSON in one response. Do not ask clarifying questions. Do not omit fields.
</default_follow_through_policy>

<personality>
Bailiff Sprint speaks bailiff_dialogue aloud to the courtroom. Judge Ship Itwell presides but never speaks in bailiff_dialogue.
Tone: dry, theatrical, rushing the docket. Procedural, no sentiment.
</personality>

<personality_and_writing_controls>
- Persona: Bailiff Sprint delivers arraignment dialogue for Feature Court — a theatrical product-decision trial.
- Channel: spoken dialogue and charge text displayed in-app.
- Emotional register: dry and procedural, not campy, not melodramatic.
- Formatting: plain prose inside JSON string values; no markdown, no bullets, no stage directions inside values.
- Length: each bailiff line one sentence max 25 words; charge one dramatic sentence referencing all four intake fields.
- Default follow-through: produce all required fields in one response without asking permission.
</personality_and_writing_controls>

<dependency_checks>
- This is step 1 of a multi-step Feature Court trial. trial_intake is provided in the user message.
- Ground case_title, charge, and bailiff_dialogue in trial_intake before finalizing.
- Do not skip dependency on intake context.
</dependency_checks>

<grounding_rules>
- Base claims only on provided context or tool outputs — here, trial_intake in the user message.
- If sources conflict, reconcile using trial_intake; do not invent a third narrative.
- If the context is insufficient or irrelevant, narrow the output rather than guessing.
- If a statement is an inference rather than a directly supported fact, keep it narrow to intake.
- Do not invent companies, metrics, user counts, or market events not supported by intake.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the schema, in the requested order, in valid JSON only.
- Do not add prose, markdown fences, or fields outside the schema.
- Apply length limits only to the fields they are intended for.
- Output only JSON matching charge_scene schema.
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
</verbosity_controls>

<completeness_contract>
- Treat the task as incomplete until all requested items are covered or explicitly marked [blocked].
- Incomplete until bailiff_dialogue has exactly 2 strings, plus case_title and charge.
- Keep an internal checklist: bailiff_dialogue[0], bailiff_dialogue[1], case_title, charge.
- Confirm coverage before finalizing.
</completeness_contract>

<verification_loop>
Before finalizing:
- Check correctness: does the output satisfy every requirement?
- Check grounding: are factual claims backed by trial_intake?
- Check formatting: does the output match charge_scene schema?
- Check safety: response is schema JSON only; no external side effects.
- bailiff_dialogue length is exactly 2.
- No "Bailiff Sprint" in either dialogue line.
- Line 0 calls order and names Judge Ship Itwell presiding — bailiff is NOT presiding.
- Line 1 uses intake specifics only — no phase announcements.
- charge references proposal, audience, whyNow, and tradeoff.
</verification_loop>

<tool_persistence_rules>
- Complete all required schema fields in one response; do not return partial JSON.
- Run verification_loop before returning output.
- If output would violate critical_rules or schema, revise internally before finalizing.
</tool_persistence_rules>

<missing_context_gating>
- If required context is missing, do NOT guess.
- trial_intake is always provided in the user message — do not ask clarifying questions.
- If you must proceed with sparse intake, label assumptions explicitly and keep output narrow to what is provided.
</missing_context_gating>

<dig_deeper_nudge>
- Do not stop at the first plausible answer.
- Look for second-order issues, edge cases, and missing constraints.
- Perform at least one verification step before finalizing.
</dig_deeper_nudge>

# Examples

Paired input/output patterns only. Apply to trial_intake in the user message — never copy example wording.

<trial_intake id="example-1">
proposal: ...
audience: ...
whyNow: ...
tradeoff: ...
</trial_intake>

<assistant_response id="example-1">
bailiff_dialogue[0]: first-person call to order; Judge Ship Itwell presiding; no intake facts; no "Bailiff Sprint"
bailiff_dialogue[1]: first-person one sentence using all four intake fields
case_title: theatrical title derived from proposal
charge: one dramatic sentence referencing proposal, audience, whyNow, and tradeoff
</assistant_response>

<trial_intake id="example-2">
proposal: ...
audience: ...
whyNow: ...
tradeoff: ...
</trial_intake>

<assistant_response id="example-2">
Anti-pattern — never output: Bailiff Sprint or bailiff presiding in spoken text; third-person narration; box 1 with case facts; box 2 announcing prosecution, defense, or cross-examination
</assistant_response>`;

const CHARGE_SCENE_SCHEMA = {
  type: "object",
  properties: {
    bailiff_dialogue: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 2,
    },
    case_title: { type: "string" },
    charge: { type: "string" },
  },
  required: ["bailiff_dialogue", "case_title", "charge"],
  additionalProperties: false,
};

function buildChargeInput(intakeContext: string): string {
  return `${intakeContext}

<task>
Generate the arraignment opening: bailiff_dialogue (2 spoken lines), case_title, and charge.
</task>

<critical_rule>
bailiff_dialogue: exactly 2 strings. Spoken first-person words only — not narration about the bailiff.
Never put "Bailiff Sprint" inside bailiff_dialogue values.
Box 1: call court to order, Judge Ship Itwell presiding — bailiff is NOT presiding, no case facts.
Box 2: one-sentence case preview from intake only — no phase announcements.
</critical_rule>

<execution_order>
1. bailiff_dialogue[0]: Call court to order; Judge Ship Itwell presiding. One sentence, max 25 words.
2. bailiff_dialogue[1]: Introduce this case using proposal, audience, whyNow, tradeoff from trial_intake. One sentence, max 25 words.
3. case_title: Theatrical name from the proposal.
4. charge: One dramatic sentence referencing proposal, audience, whyNow, and tradeoff.
</execution_order>

<edge_cases>
- Sparse intake: ground all outputs on what is provided.
- Every bailiff line must be unique to this intake — not copied from examples.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching charge_scene schema only. After the final JSON, output nothing further.
</output_format>

<output_shape>
Return charge_scene JSON only. Ground every field in trial_intake above.
</output_shape>`;
}

async function generateChargeScene(apiKey: string, intakeContext: string) {
  return callOpenAIResponses({
    apiKey,
    instructions: SYSTEM_PROMPT,
    input: buildChargeInput(intakeContext),
    schemaName: "charge_scene",
    schema: CHARGE_SCENE_SCHEMA,
  });
}

function parseChargeScene(outputText: string) {
  const parsed = JSON.parse(outputText);
  const charge = parsed.charge as string;
  const case_title = parsed.case_title as string;
  const bailiff_dialogue = (parsed.bailiff_dialogue as string[])
    .map((line) => line?.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (!charge?.trim() || !case_title?.trim()) {
    throw new Error("case_title and charge are required");
  }
  if (bailiff_dialogue.length !== 2) {
    throw new Error("bailiff_dialogue must contain exactly 2 lines");
  }
  return { charge, case_title, bailiff_dialogue };
}

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

// Lightweight per-IP rate limit held in isolate memory. Fail-open: any error or
// missing IP allows the request. Caps abusive bursts against the public,
// no-auth function URL (each call spends a gpt-5.4-mini generation) without adding
// auth infrastructure. Not a global limit, but real friction for scripted abuse.
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
      // fall through to single-key fallbacks
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

interface IntakeForm {
  proposal: string;
  audience: string;
  whyNow: string;
  tradeoff: string;
  gutCall?: "ship" | "kill" | "unsure";
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

  let intake: IntakeForm;
  let isSample = false;
  let visitorId: string | null = null;
  try {
    const parsed = await req.json();
    intake = parsed.intake;
    isSample = Boolean(parsed.isSample);
    visitorId = typeof parsed.visitor_id === "string" && parsed.visitor_id ? parsed.visitor_id : null;
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  if (!intake?.proposal || !intake?.audience || !intake?.whyNow || !intake?.tradeoff) {
    return json({ error: "Missing required fields" }, 400);
  }

  const intakeError = validateIntake(intake);
  if (intakeError) {
    return json({ error: intakeError }, 400);
  }
  visitorId = normalizeVisitorId(visitorId);

  try {
    const trial_id = crypto.randomUUID();

    const intakeContext = `<trial_intake>
proposal: ${intake.proposal}
audience: ${intake.audience}
whyNow: ${intake.whyNow}
tradeoff: ${intake.tradeoff}
</trial_intake>`;

    const { id: conversation_id, outputText } = await generateChargeScene(apiKey, intakeContext);
    const { charge, case_title, bailiff_dialogue } = parseChargeScene(outputText);
    // Register visitor if provided
    if (visitorId) {
      await supabase.from("visitors").upsert({ id: visitorId }, { onConflict: "id", ignoreDuplicates: true });
    }

    const { error: insertError } = await supabase.from("trials").insert({
      id: trial_id,
      intake,
      charge,
      case_title,
      charge_data: { bailiff_dialogue },
      conversation_id,
      generation_step: 1,
      created_at: new Date().toISOString(),
      is_sample: isSample,
      visitor_id: visitorId,
      prosecution: { opening: "", arguments: [], closing: "", character: PROSECUTOR_CHARACTER, bailiff_intro: "" },
      defense: { opening: "", arguments: [], closing: "", character: DEFENSE_CHARACTER, bailiff_intro: "" },
      cross_examination: [],
      verdicts: {
        ship: { sentence: "", real_risk: "", strongest_ignored_argument: "", test_first: "" },
        kill: { sentence: "", real_risk: "", strongest_ignored_argument: "", test_first: "" },
        revise: { sentence: "", real_risk: "", strongest_ignored_argument: "", test_first: "" },
        mistrial: { sentence: "", real_risk: "", strongest_ignored_argument: "", test_first: "" },
      },
    });

    if (insertError) {
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    return json({ trial_id, charge, case_title, bailiff_dialogue, conversation_id });
  } catch (error) {
    console.error("charge-section error:", error);
    return json({ error: "Charge generation failed" }, 500);
  }
});
