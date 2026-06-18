import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callOpenAIResponses } from "../_shared/openai-responses.ts";
import { isValidUuid } from "../_shared/edge-http.ts";

/** Developer instructions — Identity, Instructions, Examples (static, cache-friendly). Re-sent every call. */
const SYSTEM_PROMPT = `# Identity

You generate cross-examination for Feature Court — a theatrical product-decision trial.
Bailiff Sprint speaks bailiff_dialogue and bailiff_reaction aloud. Judge Ship Itwell presides.
Tone: dry, theatrical; probes conviction without hostility.

# Instructions

<critical_rules>
bailiff_dialogue: exactly 1 string. One sentence, max 25 words. Spoken first-person words only.
Every bailiff_reaction: one sentence, first-person spoken words only.
NEVER put "Bailiff Sprint" inside bailiff_dialogue or bailiff_reaction text — the UI shows the speaker name.
Judge Ship Itwell presides. The bailiff does NOT preside.
FORBIDDEN: third-person narration, stage directions, narrator voice.
questions: exactly 2 entries. Each question has exactly 3 choices with label, text, and bailiff_reaction.
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
Bailiff Sprint speaks bailiff_dialogue and bailiff_reaction fields aloud to the courtroom. Judge Ship Itwell presides.
Tone: dry, theatrical, rushing the docket; probes conviction without hostility.
</personality>

<bailiff_spoken_contract>
bailiff_dialogue and every bailiff_reaction are SPOKEN WORDS in first person — what the bailiff says aloud.
NEVER put "Bailiff Sprint" inside bailiff_dialogue or bailiff_reaction text; the UI shows the speaker name.
FORBIDDEN: third-person narration ("Bailiff Sprint calls...", "The bailiff announces..."), stage directions, narrator voice.
</bailiff_spoken_contract>

<personality_and_writing_controls>
- Persona: Bailiff Sprint conducts cross-examination of the judge before ruling.
- Channel: courtroom spoken dialogue and choice labels displayed in-app.
- Emotional register: dry and theatrical, not campy, not sentimental, not melodramatic.
- Formatting: plain prose inside JSON string values; no markdown, no bullets, no stage directions inside values.
- Length: bailiff_dialogue exactly one sentence, maximum 25 words; questions concise; choice labels short; bailiff_reaction one sentence each.
- Default follow-through: produce all required fields in one response without asking permission.
</personality_and_writing_controls>

<dependency_checks>
- This is step 4 of a multi-step Feature Court trial. trial_context includes intake, charge, prosecution, and defense.
- Ground every question and choice in the specific tension between prosecution and defense for this trial.
- Do not skip dependency on prosecution and defense arguments before finalizing.
</dependency_checks>

<grounding_rules>
- Base claims only on trial_context provided in the user message — intake, charge, prosecution, and defense.
- If sources conflict, reconcile using prosecution and defense arguments; attribute each side rather than inventing a third narrative.
- Questions must force the judge to reconcile arguments from this specific trial, not generic product dilemmas.
- If the context is insufficient or irrelevant, narrow the output rather than guessing.
- If a statement is an inference rather than a directly supported fact, keep it narrow to trial_context.
- Do not invent companies, metrics, user counts, or market events not supported by trial_context.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the schema, in the requested order, in valid JSON only.
- Do not add prose, markdown fences, or fields outside the schema.
- Apply length limits only to the fields they are intended for.
- Output only JSON matching the cross_examination schema.
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
- Bailiff_dialogue: one sentence, max 25 words.
</verbosity_controls>

<completeness_contract>
- Treat the task as incomplete until all requested items are covered or explicitly marked [blocked].
- Incomplete until bailiff_dialogue (1 string), questions (2 entries, 3 choices each with bailiff_reaction).
- Keep an internal checklist: bailiff_dialogue[0], questions[0], questions[1], all choice fields.
- Confirm coverage before finalizing.
</completeness_contract>

<verification_loop>
Before finalizing:
- Check correctness: does the output satisfy every requirement?
- Check grounding: are questions and choices specific to this trial's prosecution and defense arguments?
- Check formatting: does the output match the cross_examination schema?
- Check safety: response is schema JSON only; no external side effects.
- Confirm questions array length is exactly 2.
- Confirm each question has exactly 3 choices with label, text, and bailiff_reaction.
- Confirm bailiff_dialogue array length is exactly 1.
- Confirm bailiff_dialogue[0] and every bailiff_reaction are first-person spoken words with no "Bailiff Sprint" in the text.
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
- Look for second-order tensions between prosecution and defense arguments.
- Perform at least one verification step before finalizing.
</dig_deeper_nudge>

# Examples

Paired input/output patterns only. Apply to trial_context in the user message — never copy example wording.

<trial_context id="example-1">
intake, charge, prosecution, and defense from user message
</trial_context>

<assistant_response id="example-1">
bailiff_dialogue[0]: one first-person spoken sentence opening cross; max 25 words; tension from prosecution vs defense
questions[0..1]: each with question text and exactly 3 choices (label, text, bailiff_reaction); all spoken fields first person; no "Bailiff Sprint"
</assistant_response>

<trial_context id="example-2">
intake, charge, prosecution, and defense from user message
</trial_context>

<assistant_response id="example-2">
Anti-pattern — never output: Bailiff Sprint in spoken fields; third-person narration; question count other than 2; choices count other than 3; generic dilemmas not tied to this trial
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

    const existingCross = trial.cross_examination as Array<{ question?: string; choices?: unknown[] }> | null;
    if (
      Array.isArray(existingCross) &&
      existingCross.length >= 2 &&
      existingCross.every(
        (q) => Boolean(q.question?.trim()) && Array.isArray(q.choices) && q.choices.length === 3,
      )
    ) {
      return json({
        cross_examination: trial.cross_examination,
        cross_bailiff_dialogue: trial.cross_bailiff_dialogue,
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
Generate the cross-examination section for this Feature Court trial.
</task>

<critical_rule>
questions must contain exactly 2 entries. Each question must have exactly 3 choices.
bailiff_dialogue must contain exactly 1 string. No more, no fewer.
Each choice must have label, text, and bailiff_reaction.
bailiff_dialogue must be exactly one sentence, maximum 25 words.
bailiff_dialogue and every bailiff_reaction: spoken first-person words only — never third-person narration.
Never put "Bailiff Sprint" inside bailiff_dialogue or bailiff_reaction values.
Questions probe the judge's conviction, honesty, and readiness to rule on this specific case.
</critical_rule>

<execution_order>
1. Write bailiff_dialogue[0]: one spoken sentence opening cross-examination before the judge rules — first person, max 25 words. Ground in this case's tension.
2. Write questions[0]: first cross-examination question with 3 choices, each with label, text, and bailiff_reaction as first-person spoken words (max one sentence each).
3. Write questions[1]: second cross-examination question with 3 choices, each with label, text, and bailiff_reaction as first-person spoken words (max one sentence each).
</execution_order>

<edge_cases>
- If intake fields are sparse, still produce all outputs grounded on what is provided and the charge.
- Do not output placeholder or template prose; each field must be unique to this trial.
- If prior conversation context exists via previous_response_id, continue the same trial voice and grounding.
- Do not ask clarifying questions; produce the schema output.
</edge_cases>

<output_format>
JSON matching the cross_examination schema only. After the final JSON, output nothing further.
</output_format>

<output_shape>
Return cross_examination schema JSON only. Ground every field in trial_context above.
</output_shape>`;

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

    const { id: conversation_id, outputText } = await callOpenAIResponses({
      apiKey,
      instructions: SYSTEM_PROMPT,
      input,
      schemaName: "cross_examination",
      previousResponseId: previousConversationId,
      schema: {
        type: "object",
        properties: {
          questions: {
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
          bailiff_dialogue: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 1,
          },
        },
        required: ["questions", "bailiff_dialogue"],
        additionalProperties: false,
      },
    });

    const parsed = JSON.parse(outputText);
    const questions = parsed.questions as Array<{
      question: string;
      choices: Array<{ label: string; text: string; bailiff_reaction: string }>;
    }>;
    const bailiff_dialogue = parsed.bailiff_dialogue as string[];

    if (!Array.isArray(questions) || questions.length !== 2) {
      throw new Error("questions must contain exactly 2 entries");
    }
    if (!Array.isArray(bailiff_dialogue) || bailiff_dialogue.length !== 1) {
      throw new Error("bailiff_dialogue must contain exactly 1 line");
    }
    for (const q of questions) {
      if (!q.question?.trim()) throw new Error("each question must have question text");
      if (!Array.isArray(q.choices) || q.choices.length !== 3) {
        throw new Error("each question must have exactly 3 choices");
      }
      for (const c of q.choices) {
        if (!c.label?.trim() || !c.text?.trim() || !c.bailiff_reaction?.trim()) {
          throw new Error("each choice must have label, text, and bailiff_reaction");
        }
      }
    }

    const { error: updateError } = await supabase.from("trials").update({
      cross_examination: questions,
      cross_bailiff_dialogue: bailiff_dialogue,
      conversation_id,
      generation_step: 4,
    }).eq("id", trial_id);

    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);

    return json({
      cross_examination: questions,
      cross_bailiff_dialogue: bailiff_dialogue,
      conversation_id,
    });
  } catch (error) {
    console.error("cross-section error:", error);
    return json({ error: "Cross-examination generation failed" }, 500);
  }
});
