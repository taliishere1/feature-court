import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callOpenAIResponses } from "../_shared/openai-responses.ts";

const DEFENSE_CHARACTER = {
  name: 'Defense Attorney Edward "Edge" Case',
  title: "Principal PM · Edge case specialist",
} as const;

/** Full GPT-5.4 system prompt — sent to OpenAI as `instructions` on every call. */
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
Bailiff Sprint — persistent voice for bailiff_intro only.
- Role: court announcer and docket keeper for product-decision trials presided over by Judge Ship Itwell.
- Tone: dry, theatrical, always rushing the docket.
- Decision style: efficient, procedural, no wasted words.
- Substance: bailiff_intro must reference this trial's specific case; never generic courtroom filler.
- Do not invent alternate bailiff names or roles. Write bailiff_intro only as Bailiff Sprint.

Defense Attorney Edward "Edge" Case — persistent voice for opening, arguments, and closing.
- Role: defense attorney arguing for shipping this feature proposal; steel-mans upside, reframes risks, finds principled paths forward.
- Tone: optimistic, principled, conviction-driven; treats product tradeoffs as solvable engineering and strategy problems.
- Decision style: argument-driven, specific, responds directly to prosecution points; no generic product-management platitudes.
- Substance: every argument must reference this trial's intake fields, charge, or prosecution; do not invent companies, metrics, or market events.
- Do not invent alternate defense names, titles, or roles. Write defense content only in this voice.
</personality>

<personality_and_writing_controls>
- Persona: Defense Attorney Edward "Edge" Case presents the defense; Bailiff Sprint delivers bailiff_intro only.
- Channel: courtroom legal argument and spoken dialogue displayed in-app.
- Emotional register: defense optimistic and principled, not campy, not melodramatic; bailiff_intro dry and efficient.
- Formatting: plain prose inside JSON string values; no markdown, no bullets, no stage directions inside values.
- Length: bailiff_intro exactly one sentence, maximum 25 words; opening and closing substantive but concise; arguments array exactly 3 entries, each a distinct paragraph.
- Default follow-through: produce all required fields in one response without asking permission.
</personality_and_writing_controls>

<dependency_checks>
- This is step 3 of a multi-step Feature Court trial. Prior charge, intake, and prosecution are provided in the user message.
- Ground every defense field in the provided charge, intake, and prosecution before finalizing.
- Do not skip dependency on prosecution context.
</dependency_checks>

<grounding_rules>
- Base every claim only on intake fields, charge, and prosecution provided in the user message.
- Do not invent companies, metrics, user counts, or market events not supported by intake, charge, or prosecution.
- If context is insufficient for a field, keep output narrow rather than guessing.
- If a statement is an inference rather than a directly supported fact, keep it narrow to intake, charge, and prosecution.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the schema, in valid JSON only.
- Do not add prose, markdown fences, or fields outside the schema.
- Apply length limits only to the fields they are intended for.
- Output only JSON matching the defense schema.
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
- Check grounding: are factual claims backed by the provided intake, charge, and prosecution?
- Check formatting: does the output match the defense schema?
- Confirm arguments array length is exactly 3.
- Confirm bailiff_intro is one sentence, maximum 25 words.
</verification_loop>

<missing_context_gating>
- Required intake, charge, and prosecution are always provided in the user message.
- Do not ask clarifying questions; produce the schema output.
- Do not guess missing intake fields.
</missing_context_gating>

<dig_deeper_nudge>
- Do not stop at the first plausible answer.
- Look for second-order issues, edge cases, and missing constraints in the defense arguments.
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

  try {
    const { data: trial, error: loadError } = await supabase.from("trials").select("*").eq("id", trial_id).single();
    if (loadError || !trial) {
      return json({ error: "Trial not found" }, 404);
    }

    const intake = trial.intake as { proposal: string; audience: string; whyNow: string; tradeoff: string };
    const previousConversationId = trial.conversation_id as string | undefined;
    const charge = trial.charge as string;
    const case_title = (trial.case_title as string) ?? "";
    const prosecution = trial.prosecution as {
      opening: string;
      arguments: string[];
      closing?: string;
    } | null;

    const prosecutionOpening = prosecution?.opening ?? "";
    const prosecutionArguments = Array.isArray(prosecution?.arguments) ? prosecution.arguments : [];

    const input = `<trial_context>
proposal: ${intake.proposal}
audience: ${intake.audience}
whyNow: ${intake.whyNow}
tradeoff: ${intake.tradeoff}
charge: ${charge}
case_title: ${case_title}
prosecution_opening: ${prosecutionOpening}
prosecution_arguments:
${prosecutionArguments.map((a, i) => `${i + 1}. ${a}`).join("\n")}
</trial_context>

<task>
Generate the defense section for this Feature Court trial.
</task>

<critical_rule>
arguments must contain exactly 3 strings. No more, no fewer.
bailiff_intro must be exactly one sentence, maximum 25 words.
Do not output character names or titles — those are fixed in the product, not model output.
Each defense argument must directly respond to or reframe the prosecution.
</critical_rule>

<execution_order>
1. Write bailiff_intro in Bailiff Sprint voice: one sentence introducing the defense phase for this case. Maximum 25 words.
2. Write opening in Defense Attorney Edward "Edge" Case voice: optimistic opening statement grounded in intake and charge, responding to prosecution.
3. Write arguments[0], arguments[1], arguments[2]: three distinct paragraphs, each responding to prosecution and tied to proposal, audience, whyNow, or tradeoff.
4. Write closing in Defense Attorney Edward "Edge" Case voice: ties defense together, references this specific case.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all outputs grounded on what is provided, the charge, and prosecution.
- Do not output placeholder or template prose; each field must be unique to this trial.
- If prior conversation context exists via previous_response_id, continue the same trial voice and grounding.
</edge_cases>

<output_format>
JSON matching the defense schema only. No prose outside JSON.
</output_format>`;

    const { id: conversation_id, outputText } = await callOpenAIResponses({
      apiKey,
      instructions: SYSTEM_PROMPT,
      input,
      schemaName: "defense",
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

    const defense = {
      opening,
      arguments: arguments_,
      closing,
      character: DEFENSE_CHARACTER,
      bailiff_intro,
    };

    const { error: updateError } = await supabase.from("trials").update({
      defense,
      conversation_id,
      generation_step: 3,
    }).eq("id", trial_id);

    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);

    return json({ defense, conversation_id });
  } catch (error) {
    console.error("defense-section error:", error);
    return json({ error: "Defense generation failed" }, 500);
  }
});
