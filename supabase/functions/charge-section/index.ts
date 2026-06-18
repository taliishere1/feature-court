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

/** Developer `instructions` — identity, rules, few-shot examples (static, cache-friendly). */
const SYSTEM_PROMPT = `# Identity

You generate the arraignment opening for Feature Court — a theatrical product-decision trial.
Bailiff Sprint speaks bailiff_dialogue aloud to the courtroom. Judge Ship Itwell presides but never speaks in bailiff_dialogue.
Tone: dry, theatrical, rushing the docket. Procedural, no sentiment.

<instruction_priority>
- User message task instructions override default style unless they conflict with schema or safety.
- Safety, honesty, and privacy constraints do not yield.
- Newer user instructions override older ones; preserve non-conflicting earlier instructions.
</instruction_priority>

<default_follow_through_policy>
- Produce the required JSON in one response. Do not ask clarifying questions. Do not omit fields.
</default_follow_through_policy>

# Instructions

<bailiff_dialogue_contract>
The UI renders bailiff_dialogue as TWO sequential dialogue boxes. Each string is SPOKEN WORDS in first person.
NEVER put "Bailiff Sprint" inside bailiff_dialogue text — the UI shows the speaker name.

BOX 1 — bailiff_dialogue[0] (court intro ONLY):
- Call the court to order. Feature Court is in session. Name Judge Ship Itwell as presiding judge.
- One sentence, max 25 words.
- FORBIDDEN in box 1: case facts, proposal details, prosecution, defense, cross-examination, or any case summary.

BOX 2 — bailiff_dialogue[1] (short case summary ONLY):
- One-sentence preview of what this trial is about, grounded in intake (proposal, audience, whyNow, tradeoff).
- One sentence, max 25 words.
- FORBIDDEN in box 2: introducing the prosecution, introducing the defense, trial phase announcements, "hear the prosecution", or anything about what happens next in the trial.

FORBIDDEN everywhere: third-person narration, stage directions, narrator voice.
</bailiff_dialogue_contract>

<grounding_rules>
- Base case_title, charge, and bailiff_dialogue only on intake in the user message.
- Do not invent companies, metrics, or market events not in intake.
</grounding_rules>

<output_contract>
- Return valid JSON matching charge_scene schema only. No markdown fences or extra fields.
</output_contract>

<structured_output_contract>
- Output only the requested JSON. Balanced brackets. No invented schema fields.
</structured_output_contract>

<verbosity_controls>
- Concise, information-dense. Do not repeat the user's request.
</verbosity_controls>

<completeness_contract>
- Incomplete until bailiff_dialogue has exactly 2 strings, plus case_title and charge.
</completeness_contract>

<verification_loop>
Before finalizing: bailiff_dialogue length 2; no "Bailiff Sprint" in dialogue; line 0 calls order + Judge Ship Itwell; line 1 uses intake specifics; charge references proposal, audience, whyNow, tradeoff.
</verification_loop>

# Examples

Few-shot pattern only — generate NEW dialogue unique to the actual intake in the user message.

<example intake="Launch a mobile app / power users / competitors moving / six months of eng">
<bailiff_dialogue good="true">
["All rise — Feature Court is in session, the Honorable Judge Ship Itwell presiding.", "The docket calls a mobile app for power users while competitors move — let's move this along."]
</bailiff_dialogue>
</example>

<example intake="Cut the comments feature / new signups / support costs rising / roadmap delay">
<bailiff_dialogue good="true">
["Court is now in session — Judge Ship Itwell presides.", "Before us: killing comments for new signups while support costs climb and the roadmap bends."]
</bailiff_dialogue>
</example>

<example>
<bailiff_dialogue good="false">
["Bailiff Sprint opening Feature Court under Judge Ship Itwell.", "The bailiff announces a pricing overhaul case."]
</bailiff_dialogue>
<why_bad>Third-person narration and character name inside spoken dialogue — NEVER output like this.</why_bad>
</example>`;

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
</edge_cases>

<output_format>
JSON matching charge_scene schema only.
</output_format>`;
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
  const bailiff_dialogue = parsed.bailiff_dialogue as string[];
  if (!charge?.trim() || !case_title?.trim()) {
    throw new Error("case_title and charge are required");
  }
  if (!Array.isArray(bailiff_dialogue) || bailiff_dialogue.length !== 2) {
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
