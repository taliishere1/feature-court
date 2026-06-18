import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callOpenAIResponses } from "../_shared/openai-responses.ts";

const PROSECUTOR_NAME = "Prosecutor Mary T. Bug";
const DEFENSE_NAME = 'Defense Attorney Edward "Edge" Case';

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
Feature Court docket clerk — theatrical brevity for Hall of Verdicts entries.
- Role: write a brief docket summary after the judge has ruled.
- Tone: theatrical docket entry style; efficient, specific to this case.
- Decision style: summarize case, arguments, and ruling in 2-3 sentences.
- Substance: must reference the fixed cast names provided in the user message; never invent alternate names.
</personality>

<personality_and_writing_controls>
- Persona: docket clerk recording the trial outcome for the Hall of Verdicts.
- Channel: short docket entry displayed on the verdict gallery page.
- Emotional register: theatrical but concise, not campy, not melodramatic.
- Formatting: plain prose inside JSON string values; no markdown, no bullets, no stage directions inside values.
- Length: summary is 2-3 sentences total.
- Default follow-through: produce the schema output in one response without asking permission.
</personality_and_writing_controls>

<dependency_checks>
- This runs after the judge has ruled. Case title, charge, ruling, and counsel openings are provided in the user message.
- Ground the summary in the provided trial context before finalizing.
</dependency_checks>

<grounding_rules>
- Base the summary only on fields provided in the user message.
- Use the fixed prosecutor and defense names from the user message; do not invent alternate names.
- Do not invent companies, metrics, or events not supported by the provided context.
- If context is insufficient, keep the summary narrow rather than guessing.
</grounding_rules>

<output_contract>
- Return exactly the JSON fields required by the schema, in valid JSON only.
- Do not add prose, markdown fences, or fields outside the schema.
- Output only JSON matching the docket_summary schema.
</output_contract>

<structured_output_contract>
- Output only the requested JSON format.
- Do not add prose or markdown fences unless they were requested.
- Validate that parentheses and brackets are balanced.
- Do not invent schema fields.
</structured_output_contract>

<verbosity_controls>
- Prefer concise, information-dense writing.
- Summary: 2-3 sentences only.
</verbosity_controls>

<completeness_contract>
- Treat the task as incomplete until summary is present and 2-3 sentences.
- Confirm coverage before finalizing.
</completeness_contract>

<verification_loop>
Before finalizing:
- Check correctness: does the summary satisfy every requirement?
- Check grounding: does the summary reference this case and ruling?
- Check formatting: does the output match the docket_summary schema?
- Confirm summary is 2-3 sentences.
</verification_loop>

<missing_context_gating>
- Required trial context is always provided in the user message.
- Do not ask clarifying questions; produce the schema output.
</missing_context_gating>

<dig_deeper_nudge>
- Do not stop at the first plausible answer.
- Ensure the summary captures the tension between prosecution and defense and the final ruling.
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
  let ruling: string;
  try {
    const parsed = await req.json();
    trial_id = parsed.trial_id;
    ruling = parsed.ruling;
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  if (!trial_id || !ruling) {
    return json({ error: "Missing trial_id or ruling" }, 400);
  }
  if (!["ship", "kill", "revise", "mistrial"].includes(ruling)) {
    return json({ error: "Invalid ruling" }, 400);
  }

  try {
    const { data: trial, error: loadError } = await supabase.from("trials").select("*").eq("id", trial_id).single();
    if (loadError || !trial) {
      return json({ error: "Trial not found" }, 404);
    }

    const intake = trial.intake as { proposal: string; audience: string; whyNow: string; tradeoff: string };
    const charge = trial.charge as string;
    const case_title = trial.case_title as string;
    const prosecution = trial.prosecution as { opening?: string } | null;
    const defense = trial.defense as { opening?: string } | null;
    const previousConversationId = trial.conversation_id as string | undefined;

    const input = `<trial_context>
case_title: ${case_title}
charge: ${charge}
proposal: ${intake.proposal}
audience: ${intake.audience}
whyNow: ${intake.whyNow}
tradeoff: ${intake.tradeoff}
ruling: ${ruling}
prosecutor_name: ${PROSECUTOR_NAME}
defense_name: ${DEFENSE_NAME}
prosecution_opening: ${prosecution?.opening ?? ""}
defense_opening: ${defense?.opening ?? ""}
</trial_context>

<task>
Generate a docket summary for the Hall of Verdicts page.
</task>

<critical_rule>
summary must be 2-3 sentences.
Must reference the case, the arguments from both sides, and the ruling.
Use the fixed prosecutor_name and defense_name from trial_context; do not invent alternate names.
</critical_rule>

<execution_order>
1. Write summary as a brief theatrical docket entry: case identification, counsel positions, and final ruling.
</execution_order>

<edge_cases>
- If openings are empty, summarize from charge and ruling only.
- Do not output placeholder or template prose; summary must be unique to this trial.
- If prior conversation context exists via previous_response_id, continue the same trial grounding.
</edge_cases>

<output_format>
JSON matching the docket_summary schema only. No prose outside JSON.
</output_format>`;

    const { outputText } = await callOpenAIResponses({
      apiKey,
      instructions: SYSTEM_PROMPT,
      input,
      schemaName: "docket_summary",
      previousResponseId: previousConversationId,
      maxOutputTokens: 6000,
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
        },
        required: ["summary"],
        additionalProperties: false,
      },
    });

    const parsed = JSON.parse(outputText);
    const summary = parsed.summary as string;
    if (!summary?.trim()) throw new Error("summary is required");

    const { error: updateError } = await supabase.from("trials").update({ summary }).eq("id", trial_id);
    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);

    return json({ summary });
  } catch (error) {
    console.error("summary-section error:", error);
    return json({ error: "Summary generation failed" }, 500);
  }
});
