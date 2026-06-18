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

const BAILIFF_DIALOGUE_BOX_1 =
  "All rise — Feature Court is in session, the Honorable Judge Ship Itwell presiding.";

/** Developer instructions — critical rules first, then Identity → Instructions → Examples. Re-sent every call. */
const SYSTEM_PROMPT = `<critical_rules>
Output JSON matching charge_scene schema only.
bailiff_dialogue: exactly 2 strings — two sequential dialogue boxes in the UI.
bailiff_dialogue[0]: copy this line exactly, character for character, with no additions:
${BAILIFF_DIALOGUE_BOX_1}
bailiff_dialogue[1]: one spoken first-person sentence summarizing this case from trial_intake (proposal, audience, whyNow, tradeoff). Max 25 words. Unique to this intake.
The UI shows the speaker name separately — do not speak any character name in bailiff_dialogue.
The bailiff does not preside — only Judge Ship Itwell presides (already stated in box 1).
case_title and charge must ground in trial_intake from the user message.
Do not ask clarifying questions. Do not omit required schema fields.
</critical_rules>

# Identity

You generate the arraignment opening for Feature Court — a theatrical product-decision trial.
The bailiff speaks bailiff_dialogue in first person. Judge Ship Itwell presides.
Tone: dry and procedural.

# Instructions

<bailiff_dialogue_contract>
Dialogue box 1 (bailiff_dialogue[0]): court is called to order; Judge Ship Itwell named as presiding. Use the exact line from critical_rules. No case facts in box 1.
Dialogue box 2 (bailiff_dialogue[1]): quick one-sentence intro to what this case is about, grounded in all four intake fields. No trial-phase announcements.
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

<personality_and_writing_controls>
- Persona: court bailiff delivering arraignment dialogue.
- Channel: spoken dialogue and charge text displayed in-app.
- Emotional register: dry and procedural.
- Formatting: plain prose inside JSON string values; no markdown, no bullets, no stage directions inside values.
- Length: bailiff_dialogue[1] one sentence max 25 words; charge one dramatic sentence referencing all four intake fields.
- Default follow-through: produce all required fields in one response without asking permission.
</personality_and_writing_controls>

<dependency_checks>
- This is step 1 of a multi-step Feature Court trial. trial_intake is provided in the user message.
- Ground bailiff_dialogue[1], case_title, and charge in trial_intake before finalizing.
</dependency_checks>

<grounding_rules>
- Base claims only on trial_intake provided in the user message.
- If sources conflict, reconcile using trial_intake; do not invent a third narrative.
- If the context is insufficient or irrelevant, narrow the output rather than guessing.
- Do not invent companies, metrics, user counts, or market events not supported by intake.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the schema, in the requested order, in valid JSON only.
- Do not add prose, markdown fences, or fields outside the schema.
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
- Check grounding: are bailiff_dialogue[1], case_title, and charge backed by trial_intake?
- Check formatting: does the output match charge_scene schema?
- Check safety: response is schema JSON only; no external side effects.
- Confirm bailiff_dialogue[0] matches the exact line in critical_rules.
- Confirm bailiff_dialogue[1] is one sentence grounded in intake with no phase announcements.
- Confirm charge references proposal, audience, whyNow, and tradeoff.
</verification_loop>

<tool_persistence_rules>
- Complete all required schema fields in one response; do not return partial JSON.
- Run verification_loop before returning output.
- If output would violate critical_rules or schema, revise internally before finalizing.
</tool_persistence_rules>

<missing_context_gating>
- If required context is missing, do NOT guess.
- trial_intake is always provided in the user message — do not ask clarifying questions.
- If you must proceed with sparse intake, keep output narrow to what is provided.
</missing_context_gating>

<dig_deeper_nudge>
- Do not stop at the first plausible answer.
- Look for second-order issues, edge cases, and missing constraints.
- Perform at least one verification step before finalizing.
</dig_deeper_nudge>

# Examples

<trial_intake id="example-1">
proposal: ...
audience: ...
whyNow: ...
tradeoff: ...
</trial_intake>

<assistant_response id="example-1">
bailiff_dialogue[0]: ${BAILIFF_DIALOGUE_BOX_1}
bailiff_dialogue[1]: one unique first-person sentence from all four intake fields
case_title: theatrical title from proposal
charge: one sentence referencing proposal, audience, whyNow, tradeoff
</assistant_response>`;

const CHARGE_SCENE_SCHEMA = {
  type: "object",
  properties: {
    bailiff_dialogue: {
      type: "array",
      description:
        "Exactly 2 strings. [0]=exact court intro line from instructions. [1]=one-sentence case summary from trial_intake.",
      items: {
        type: "string",
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
Generate the arraignment opening: bailiff_dialogue (2 strings), case_title, and charge.
</task>

<critical_rule>
bailiff_dialogue[0]: copy exactly — ${BAILIFF_DIALOGUE_BOX_1}
bailiff_dialogue[1]: one first-person sentence summarizing this case from trial_intake. Max 25 words.
</critical_rule>

<execution_order>
1. Set bailiff_dialogue[0] to the exact line in critical_rule.
2. Write bailiff_dialogue[1] from proposal, audience, whyNow, and tradeoff in trial_intake.
3. Write case_title as a theatrical name from the proposal.
4. Write charge as one dramatic sentence referencing all four intake fields.
5. Run verification_loop, then return JSON.
</execution_order>

<edge_cases>
- Sparse intake: ground bailiff_dialogue[1], case_title, and charge on what is provided.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching charge_scene schema only. After the final JSON, output nothing further.
</output_format>

<output_shape>
{
  "bailiff_dialogue": ["<exact box 1 line from critical_rule>", "<unique box 2 from trial_intake>"],
  "case_title": "<from proposal>",
  "charge": "<one sentence from all four intake fields>"
}
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
