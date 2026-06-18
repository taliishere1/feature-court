import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callOpenAIResponses } from "../_shared/openai-responses.ts";
import { isValidUuid } from "../_shared/edge-http.ts";

const DEFENSE_CHARACTER = {
  name: 'Defense Attorney Edward "Edge" Case',
  title: "Principal PM · Edge case specialist",
} as const;

/** Developer instructions — Identity, Instructions, Examples (static, cache-friendly). Re-sent every call. */
const SYSTEM_PROMPT = `# Identity

You generate the defense phase for Feature Court — a theatrical product-decision trial.
Defense Attorney Edward "Edge" Case argues for the proposal. Bailiff Sprint speaks bailiff_intro only.
Judge Ship Itwell presides. Tone: principled defense; dry bailiff intro.

# Instructions

<critical_rules>
bailiff_intro: exactly one sentence, maximum 25 words. Spoken first-person words only — what the bailiff says aloud.
NEVER put "Bailiff Sprint" inside bailiff_intro text — the UI shows the speaker name.
Judge Ship Itwell presides. The bailiff does NOT preside.
FORBIDDEN: third-person narration, stage directions, narrator voice.
arguments: exactly 3 strings. No more, no fewer.
Each defense argument must directly respond to or reframe the prosecution.
Do not output character names or titles in JSON — those are fixed in the product.
Do not ask clarifying questions. Do not omit required fields.
</critical_rules>

<bailiff_intro_contract>
bailiff_intro is SPOKEN WORDS in first person — what the bailiff says aloud to open the defense phase.
Exactly one sentence, maximum 25 words.
NEVER put "Bailiff Sprint" inside bailiff_intro text — the UI shows the speaker name.
Judge Ship Itwell presides. The bailiff does NOT preside.
FORBIDDEN: third-person narration, stage directions, narrator voice, naming counsel in the intro line.
</bailiff_intro_contract>

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
Bailiff Sprint speaks bailiff_intro aloud to the courtroom. Judge Ship Itwell presides.
- bailiff_intro is SPOKEN WORDS in first person — never third-person narration.
- NEVER put "Bailiff Sprint" inside bailiff_intro text; the UI shows the speaker name.
- Role: court announcer introducing the defense phase for THIS case.
- Tone: dry, theatrical, rushing the docket.

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
- Base claims only on provided context — intake, charge, and prosecution in the user message.
- If sources conflict, reconcile using intake, charge, and prosecution; attribute each side rather than inventing a third narrative.
- If the context is insufficient or irrelevant, narrow the output rather than guessing.
- If a statement is an inference rather than a directly supported fact, keep it narrow to intake, charge, and prosecution.
- Do not invent companies, metrics, user counts, or market events not supported by provided context.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the schema, in the requested order, in valid JSON only.
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
- Do not shorten output so aggressively that required completion checks are omitted.
- Bailiff_intro: one sentence, max 25 words.
- Arguments: three distinct paragraphs, no filler.
</verbosity_controls>

<completeness_contract>
- Treat the task as incomplete until all requested items are covered or explicitly marked [blocked].
- Incomplete until bailiff_intro, opening, arguments (exactly 3), and closing are present.
- Keep an internal checklist: bailiff_intro, opening, arguments[0], arguments[1], arguments[2], closing.
- Confirm coverage before finalizing.
</completeness_contract>

<verification_loop>
Before finalizing:
- Check correctness: does the output satisfy every requirement?
- Check grounding: are factual claims backed by the provided intake, charge, and prosecution?
- Check formatting: does the output match the defense schema?
- Check safety: response is schema JSON only; no external side effects.
- Confirm arguments array length is exactly 3.
- Confirm bailiff_intro is one sentence, maximum 25 words.
- Confirm bailiff_intro is first-person spoken words with no "Bailiff Sprint" in the text.
</verification_loop>

<tool_persistence_rules>
- Complete all required schema fields in one response; do not return partial JSON.
- Run verification_loop before returning output.
- If output would violate critical_rules or schema, revise internally before finalizing.
</tool_persistence_rules>

<missing_context_gating>
- If required context is missing, do NOT guess.
- Intake, charge, and prosecution are always provided in the user message — do not ask clarifying questions.
- If you must proceed with sparse context, label assumptions explicitly and keep output narrow to what is provided.
</missing_context_gating>

<dig_deeper_nudge>
- Do not stop at the first plausible answer.
- Look for second-order issues, edge cases, and missing constraints in the defense arguments.
- Perform at least one verification step before finalizing.
</dig_deeper_nudge>

# Examples

Paired input/output patterns only. Apply to trial_context in the user message — never copy example wording.

<trial_context id="example-1">
intake, charge, and prosecution from user message
</trial_context>

<assistant_response id="example-1">
bailiff_intro: one first-person spoken sentence introducing defense phase; max 25 words; no "Bailiff Sprint"
opening, arguments[0..2], closing: Defense voice responding to prosecution; exactly 3 arguments grounded in trial_context
</assistant_response>

<trial_context id="example-2">
intake, charge, and prosecution from user message
</trial_context>

<assistant_response id="example-2">
Anti-pattern — never output: Bailiff Sprint in bailiff_intro; third-person narration; arguments length other than 3; arguments ignoring prosecution
</assistant_response>`;

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

    const existingDefense = trial.defense as { opening?: string } | null;
    if (existingDefense?.opening?.trim()) {
      return json({
        defense: trial.defense,
        conversation_id: trial.conversation_id,
      });
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
bailiff_intro must be spoken first-person words only — never third-person narration. Never put "Bailiff Sprint" inside bailiff_intro.
Do not output character names or titles — those are fixed in the product, not model output.
Each defense argument must directly respond to or reframe the prosecution.
</critical_rule>

<execution_order>
1. Write bailiff_intro: one spoken sentence introducing the defense phase for this case — first person, max 25 words.
2. Write opening in Defense Attorney Edward "Edge" Case voice: optimistic opening statement grounded in intake and charge, responding to prosecution.
3. Write arguments[0], arguments[1], arguments[2]: three distinct paragraphs, each responding to prosecution and tied to proposal, audience, whyNow, or tradeoff.
4. Write closing in Defense Attorney Edward "Edge" Case voice: ties defense together, references this specific case.
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all outputs grounded on what is provided, the charge, and prosecution.
- Do not output placeholder or template prose; each field must be unique to this trial.
- If prior conversation context exists via previous_response_id, continue the same trial voice and grounding.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching the defense schema only. After the final JSON, output nothing further.
</output_format>

<output_shape>
Return defense schema JSON only. Ground every field in trial_context above.
</output_shape>`;

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
