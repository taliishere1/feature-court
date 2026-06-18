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

/** Developer instructions — critical rules first (gpt-5.4-mini), then Identity → Instructions → Examples. Re-sent every call. */
const SYSTEM_PROMPT = `<critical_rules>
bailiff_dialogue: exactly 2 strings. Spoken first-person words the bailiff says aloud — not narration about the bailiff.
The UI shows the bailiff's name as a label. NEVER speak that name or any character name inside bailiff_dialogue.
Judge Ship Itwell presides. The bailiff does NOT preside. NEVER say the bailiff is presiding. ONLY Judge Ship Itwell may be called presiding.
NEVER introduce yourself. Do not say "I am", "my name", or refer to yourself in third person.
FORBIDDEN in bailiff_dialogue: third-person narration, stage directions, narrator voice, speed or running metaphors ("dead run", "at a sprint").
case_title and charge must ground in trial_intake from the user message.
Do not ask follow-up questions. Do not omit required schema fields.

bailiff_dialogue[0] FIXED PROCEDURE — pick exactly one line below verbatim except you may swap "All rise" for "Court is in session":
- "All rise — Feature Court is in session, the Honorable Judge Ship Itwell presiding."
- "Court is now in session — Judge Ship Itwell presides."
Do not add any other words to box 1. No case topic. No character names. No theatrical flourish.

bailiff_dialogue[1] ONLY: one sentence preview of this case using proposal, audience, whyNow, and tradeoff from trial_intake. Max 25 words.
</critical_rules>

# Identity

You generate the arraignment opening for Feature Court — a theatrical product-decision trial.
The bailiff speaks bailiff_dialogue in first person. Judge Ship Itwell presides but never speaks in bailiff_dialogue.
Tone: dry and procedural. No sentiment. No camp. No speed metaphors.

# Instructions

<bailiff_spoken_voice>
Speak as the court bailiff in first person.
You are NOT introducing yourself. Do not say your name — the UI label already shows it.
You are NOT the presiding judge. Only Judge Ship Itwell presides — stated in bailiff_dialogue[0] only.
Never write third person about the bailiff.
</bailiff_spoken_voice>

<bailiff_dialogue_contract>
The UI renders bailiff_dialogue as TWO sequential dialogue boxes.

BOX 1 — bailiff_dialogue[0]:
- Use ONLY one of the two fixed procedural lines in critical_rules. No edits except All rise vs Court is in session.
- FORBIDDEN in box 1: any case fact, proposal, audience, whyNow, tradeoff, character name, bailiff presiding, "session on", "we open", prosecution, defense.

BOX 2 — bailiff_dialogue[1]:
- One-sentence case preview grounded in all four intake fields.
- FORBIDDEN in box 2: prosecution or defense introductions; phase announcements; "hear the prosecution".
</bailiff_dialogue_contract>

<forbidden_substrings>
Never appear anywhere in bailiff_dialogue: the bailiff's UI display name; "presiding" unless attached to Judge Ship Itwell; "I preside"; "my name is"; "the bailiff"; "dead run"; "at a sprint"
</forbidden_substrings>

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
The bailiff speaks bailiff_dialogue aloud. Judge Ship Itwell presides but never speaks in bailiff_dialogue.
Tone: dry and procedural.
</personality>

<personality_and_writing_controls>
- Persona: court bailiff delivering arraignment dialogue for Feature Court — a theatrical product-decision trial.
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
- Search bailiff_dialogue[0]: must match one of the two fixed procedural lines in critical_rules exactly — if not, replace before returning.
- Search bailiff_dialogue[0] for any intake field text — if found, replace box 1 with the fixed procedural line before returning.
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
bailiff_dialogue[0]: one of the two fixed procedural lines from critical_rules — verbatim, no case content
bailiff_dialogue[1]: one sentence using all four intake fields
case_title: from proposal
charge: one sentence using all four intake fields
</assistant_response>

<trial_intake id="example-2">
proposal: ...
audience: ...
whyNow: ...
tradeoff: ...
</trial_intake>

<assistant_response id="example-2">
Violations — never output: bailiff name in spoken text; bailiff presiding; case topic in box 1; third-person narration about the bailiff
</assistant_response>`;

const CHARGE_SCENE_SCHEMA = {
  type: "object",
  properties: {
    bailiff_dialogue: {
      type: "array",
      description:
        "Exactly 2 strings. [0] MUST be one of the two fixed procedural lines in critical_rules — no case content. [1] one-sentence case preview from intake only.",
      items: {
        type: "string",
        description:
          "[0] Fixed procedural call to order naming Judge Ship Itwell only. [1] Case preview from intake. Never speak the bailiff's UI name. Never say the bailiff presides.",
      },
      minItems: 2,
      maxItems: 2,
    },
    case_title: {
      type: "string",
      description: "Theatrical court case name derived from trial_intake.proposal.",
    },
    charge: {
      type: "string",
      description:
        "One dramatic sentence referencing proposal, audience, whyNow, and tradeoff from trial_intake.",
    },
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
bailiff_dialogue[0]: copy verbatim one of these two lines — no other words:
"All rise — Feature Court is in session, the Honorable Judge Ship Itwell presiding."
"Court is now in session — Judge Ship Itwell presides."
bailiff_dialogue[1]: one sentence case preview from trial_intake only. Max 25 words.
Never speak the bailiff's UI name. Never say the bailiff presides. Never put case facts in box 1.
</critical_rule>

<execution_order>
1. bailiff_dialogue[0]: paste one fixed procedural line from critical_rule — zero case content.
2. bailiff_dialogue[1]: one sentence from proposal, audience, whyNow, tradeoff.
3. case_title: theatrical name from proposal.
4. charge: one sentence referencing all four intake fields.
5. Verify box 1 matches a fixed procedural line exactly before returning.
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
