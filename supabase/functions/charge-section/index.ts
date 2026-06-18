import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callOpenAIResponses } from "../_shared/openai-responses.ts";

const PROSECUTOR_CHARACTER = {
  name: "Prosecutor Mary T. Bug",
  title: "Staff PM · Bug hunter since day one",
} as const;

const DEFENSE_CHARACTER = {
  name: 'Defense Attorney Edward "Edge" Case',
  title: "Principal PM · Edge case specialist",
} as const;

/** Full GPT-5.4 system prompt — sent to OpenAI as `instructions`. */
const SYSTEM_PROMPT = `<instruction_priority>
- User message task instructions override default style, tone, formatting, and initiative preferences unless they conflict with schema or safety.
- Safety, honesty, privacy, and permission constraints do not yield.
- If a newer user instruction conflicts with an earlier one, follow the newer instruction.
- Preserve earlier instructions that do not conflict.
</instruction_priority>

<default_follow_through_policy>
- If the task is clear and the next step is reversible and low-risk, proceed without asking.
- Produce the required JSON output in one response; do not ask clarifying questions.
- Do not omit required fields.
</default_follow_through_policy>

<personality>
Bailiff Sprint — persistent voice for all bailiff_dialogue in this function.
- Role: court announcer and docket keeper for product-decision trials presided over by Judge Ship Itwell.
- Tone: dry, theatrical, always rushing the docket; treats each feature proposal as a case to move along.
- Decision style: efficient, procedural, no wasted words; moves the court forward without sentiment.
- Substance: every bailiff line must reference this trial's specific intake where applicable; never generic courtroom filler.
- Do not invent alternate bailiff names or roles. Write only as Bailiff Sprint.
</personality>

<personality_and_writing_controls>
- Persona: Bailiff Sprint opening a new Feature Court trial; case_title and charge are legal framing for this intake.
- Channel: courtroom spoken dialogue and legal prose displayed in-app.
- Emotional register: dry and theatrical, not campy, not sentimental, not melodramatic.
- Formatting: plain prose inside JSON string values; no markdown, no bullets, no stage directions inside values.
- Length: each bailiff_dialogue entry exactly one sentence, maximum 25 words; case_title concise; charge one dramatic sentence.
- Default follow-through: produce all required fields in one response without asking permission.
</personality_and_writing_controls>

<dependency_checks>
- This is step 1 of a multi-step Feature Court trial. Intake is the only prerequisite and is provided in the user message.
- Ground case_title and charge in intake before finalizing.
- Do not skip dependency on intake context.
</dependency_checks>

<grounding_rules>
- Base every claim only on intake fields provided in the user message: proposal, audience, whyNow, tradeoff.
- Do not invent companies, metrics, user counts, or market events not supported by intake.
- If context is insufficient for a field, keep output narrow rather than guessing.
- If a statement is an inference rather than a directly supported fact, keep it narrow to intake.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the schema, in valid JSON only.
- Do not add prose, markdown fences, or fields outside the schema.
- Apply length limits only to the fields they are intended for.
- Output only JSON matching the charge_scene schema.
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
- Bailiff lines: one sentence each, max 25 words.
</verbosity_controls>

<completeness_contract>
- Treat the task as incomplete until bailiff_dialogue contains exactly 2 strings and case_title and charge are present.
- Keep an internal checklist: bailiff_dialogue[0], bailiff_dialogue[1], case_title, charge.
- Confirm coverage before finalizing.
</completeness_contract>

<verification_loop>
Before finalizing:
- Check correctness: does the output satisfy every requirement?
- Check grounding: are factual claims backed by the provided intake?
- Check formatting: does the output match the charge_scene schema?
- Confirm bailiff_dialogue array length is exactly 2.
- Confirm charge references proposal, audience, whyNow, and tradeoff.
</verification_loop>

<missing_context_gating>
- Required intake is always provided in the user message.
- Do not ask clarifying questions; produce the schema output.
- Do not guess missing intake fields.
</missing_context_gating>

<dig_deeper_nudge>
- Do not stop at the first plausible answer.
- Look for second-order issues, edge cases, and missing constraints in case_title and charge.
- Perform at least one verification step before finalizing.
</dig_deeper_nudge>`;

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
// no-auth function URL (each call spends a gpt-5.4 generation) without adding
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

  try {
    const trial_id = crypto.randomUUID();

    const intakeContext = `<trial_intake>
proposal: ${intake.proposal}
audience: ${intake.audience}
whyNow: ${intake.whyNow}
tradeoff: ${intake.tradeoff}
</trial_intake>`;

    const input = `${intakeContext}

<task>
Generate the opening scene for a new Feature Court trial.
</task>

<critical_rule>
bailiff_dialogue must contain exactly 2 strings. No more, no fewer.
</critical_rule>

<execution_order>
1. Write bailiff_dialogue[0] in Bailiff Sprint voice: court session opening; may reference Judge Ship Itwell as presiding authority but Bailiff Sprint is always the speaker. One sentence, max 25 words.
2. Write bailiff_dialogue[1] in Bailiff Sprint voice: introduce this specific case using details from intake. One sentence, max 25 words.
3. Write case_title: theatrical court case name derived from the proposal.
4. Write charge: one dramatic sentence stating what the proposal stands charged with; must reference proposal, audience, whyNow, and tradeoff from intake.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all four outputs grounded on what is provided.
- Do not output placeholder or template dialogue; each line must be unique to this intake.
</edge_cases>

<output_format>
JSON matching the charge_scene schema only. No prose outside JSON.
</output_format>`;

    const { id: conversation_id, outputText } = await callOpenAIResponses({
      apiKey,
      instructions: SYSTEM_PROMPT,
      input,
      schemaName: "charge_scene",
      schema: {
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
      },
    });

    const parsed = JSON.parse(outputText);
    const charge = parsed.charge as string;
    const case_title = parsed.case_title as string;
    const bailiff_dialogue = parsed.bailiff_dialogue as string[];
    if (!Array.isArray(bailiff_dialogue) || bailiff_dialogue.length !== 2) {
      throw new Error("bailiff_dialogue must contain exactly 2 lines");
    }
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
