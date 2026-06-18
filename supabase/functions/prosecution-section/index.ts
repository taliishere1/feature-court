import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callOpenAIResponses } from "../_shared/openai-responses.ts";
import { isValidUuid } from "../_shared/edge-http.ts";

const PROSECUTOR_CHARACTER = {
  name: "Prosecutor Mary T. Bug",
  title: "Staff PM · Bug hunter since day one",
} as const;

/** Full GPT-5.4-mini system prompt — sent to OpenAI as `instructions`. */
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
Bailiff Sprint — voice for bailiff_intro only (one spoken sentence, max 25 words).
- bailiff_intro is SPOKEN WORDS aloud in first person — never third-person narration.
- NEVER put "Bailiff Sprint" inside bailiff_intro text; the UI shows the speaker name.
- Role: court announcer introducing the prosecution phase for THIS case.
- Tone: dry, theatrical, rushing the docket.

Prosecutor Mary T. Bug — voice for opening, arguments, and closing.
- Role: prosecutor arguing against shipping this feature proposal; exposes flaws, risks, and weak reasoning.
- Tone: sharp, relentless, surgical; treats product tradeoffs as evidence against the accused proposal.
- Decision style: argument-driven, specific, no generic product-management platitudes.
- Substance: every argument must reference this trial's intake fields or charge; do not invent companies, metrics, or market events.
- Do not invent alternate prosecutor names, titles, or roles. Write prosecution content only in this voice.
</personality>

<personality_and_writing_controls>
- Persona: Prosecutor Mary T. Bug presents the prosecution; Bailiff Sprint delivers bailiff_intro only.
- Channel: courtroom legal argument and spoken dialogue displayed in-app.
- Emotional register: prosecution sharp and relentless, not campy, not melodramatic; bailiff_intro dry and efficient.
- Formatting: plain prose inside JSON string values; no markdown, no bullets, no stage directions inside values.
- Length: bailiff_intro exactly one sentence, maximum 25 words; opening and closing substantive but concise; arguments array exactly 3 entries, each a distinct paragraph.
- Default follow-through: produce all required fields in one response without asking permission.
</personality_and_writing_controls>

<dependency_checks>
- This is step 2 of a multi-step Feature Court trial. Prior arraignment charge and intake are provided in the user message.
- Ground every prosecution field in the provided charge and intake before finalizing.
- Do not skip dependency on charge and intake context.
</dependency_checks>

<grounding_rules>
- Base every claim only on intake fields and charge provided in the user message.
- Do not invent companies, metrics, user counts, or market events not supported by intake or charge.
- If context is insufficient for a field, keep output narrow rather than guessing.
- If a statement is an inference rather than a directly supported fact, keep it narrow to intake and charge.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the schema, in valid JSON only.
- Do not add prose, markdown fences, or fields outside the schema.
- Apply length limits only to the fields they are intended for.
- Output only JSON matching the prosecution schema.
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
- Bailiff_intro: one sentence, max 25 words.
- Arguments: three distinct paragraphs, no filler.
</verbosity_controls>

<completeness_contract>
- Treat the task as incomplete until all requested fields are present and arguments contains exactly 3 strings.
- Keep an internal checklist: bailiff_intro, opening, arguments[0], arguments[1], arguments[2], closing.
- Confirm coverage before finalizing.
</completeness_contract>

<verification_loop>
Before finalizing:
- Check correctness: does the output satisfy every requirement?
- Check grounding: are factual claims backed by the provided intake and charge?
- Check formatting: does the output match the prosecution schema?
- Confirm arguments array length is exactly 3.
- Confirm bailiff_intro is one sentence, maximum 25 words.
- Confirm bailiff_intro is first-person spoken words with no "Bailiff Sprint" in the text.
</verification_loop>

# Examples

<example good="true">
bailiff_intro: "The prosecution will now present its case against this proposal, your honor."
</example>

<example good="false">
bailiff_intro: "Bailiff Sprint calls the prosecution to open against the accused feature."
<why_bad>Third-person narration with character name — NEVER output like this.</why_bad>
</example>

<missing_context_gating>
- Required intake and charge are always provided in the user message.
- Do not ask clarifying questions; produce the schema output.
- Do not guess missing intake fields.
</missing_context_gating>

<dig_deeper_nudge>
- Do not stop at the first plausible answer.
- Look for second-order issues, edge cases, and missing constraints in the prosecution arguments.
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

    const existingProsecution = trial.prosecution as { opening?: string } | null;
    if (existingProsecution?.opening?.trim()) {
      return json({
        prosecution: trial.prosecution,
        conversation_id: trial.conversation_id,
      });
    }

    const intake = trial.intake as { proposal: string; audience: string; whyNow: string; tradeoff: string };
    const previousConversationId = trial.conversation_id as string | undefined;
    const charge = trial.charge as string;
    const case_title = (trial.case_title as string) ?? "";

    const input = `<trial_context>
proposal: ${intake.proposal}
audience: ${intake.audience}
whyNow: ${intake.whyNow}
tradeoff: ${intake.tradeoff}
charge: ${charge}
case_title: ${case_title}
</trial_context>

<task>
Generate the prosecution section for this Feature Court trial.
</task>

<critical_rule>
arguments must contain exactly 3 strings. No more, no fewer.
bailiff_intro must be exactly one sentence, maximum 25 words.
bailiff_intro must be spoken first-person words only — never third-person narration. Never put "Bailiff Sprint" inside bailiff_intro.
Do not output character names or titles — those are fixed in the product, not model output.
</critical_rule>

<execution_order>
1. Write bailiff_intro: one spoken sentence introducing the prosecution phase for this case — first person, max 25 words. Never narrate "Bailiff Sprint" in third person.
2. Write opening in Prosecutor Mary T. Bug voice: sharp opening statement grounded in intake and charge.
3. Write arguments[0], arguments[1], arguments[2]: three distinct paragraphs, each tied to proposal, audience, whyNow, or tradeoff.
4. Write closing in Prosecutor Mary T. Bug voice: ties prosecution together, references this specific case.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all outputs grounded on what is provided and the charge.
- Do not output placeholder or template prose; each field must be unique to this trial.
- If prior conversation context exists via previous_response_id, continue the same trial voice and grounding.
</edge_cases>

<output_format>
JSON matching the prosecution schema only. No prose outside JSON.
</output_format>`;

    const { id: conversation_id, outputText } = await callOpenAIResponses({
      apiKey,
      instructions: SYSTEM_PROMPT,
      input,
      schemaName: "prosecution",
      previousResponseId: previousConversationId,
      schema: {
        type: "object",
        properties: {
          bailiff_intro: { type: "string" },
          opening: { type: "string" },
          arguments: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 3,
          },
          closing: { type: "string" },
        },
        required: ["bailiff_intro", "opening", "arguments", "closing"],
        additionalProperties: false,
      },
    });

    const parsed = JSON.parse(outputText);
    const opening = parsed.opening as string;
    const arguments_ = parsed.arguments as string[];
    const closing = parsed.closing as string;
    const bailiff_intro = parsed.bailiff_intro as string;

    if (!opening?.trim()) throw new Error("opening is required");
    if (!closing?.trim()) throw new Error("closing is required");
    if (!bailiff_intro?.trim()) throw new Error("bailiff_intro is required");
    if (!Array.isArray(arguments_) || arguments_.length !== 3) {
      throw new Error("arguments must contain exactly 3 entries");
    }

    const prosecution = {
      opening,
      arguments: arguments_,
      closing,
      character: PROSECUTOR_CHARACTER,
      bailiff_intro,
    };
    const { error: updateError } = await supabase.from("trials").update({
      prosecution,
      conversation_id,
      generation_step: 2,
    }).eq("id", trial_id);

    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);

    return json({ prosecution, conversation_id });
  } catch (error) {
    console.error("prosecution-section error:", error);
    return json({ error: "Prosecution generation failed" }, 500);
  }
});
