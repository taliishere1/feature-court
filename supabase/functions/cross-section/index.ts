import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

function extractOutputText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string" && payload.output_text) {
    return payload.output_text;
  }
  const output = payload.output as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = item.content as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (c.type === "output_text" && typeof c.text === "string") {
            return c.text;
          }
        }
      }
    }
  }
  return "";
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

    const body: Record<string, unknown> = {
      model: "gpt-5.4",
      reasoning: { effort: "none" },
      max_output_tokens: 6000,
      input: `Product Proposal: "${intake.proposal}"
Target Audience: "${intake.audience}"
Timing/Rationale: "${intake.whyNow}"
Tradeoff: "${intake.tradeoff}"

The charge: "${charge}"

Both sides have argued the case. Generate the CROSS-EXAMINATION.

Generate exactly 2 questions that the BAILIFF asks the user (the judge) before they rule. They should probe the user's conviction, honesty, and readiness. Each question has exactly 3 answer choices. Each choice has:
- label: a short label (e.g. "Confident", "Cautious", "Pragmatic")
- text: what the user says when they pick this choice
- bailiff_reaction: Bailiff Sprint's dramatic reaction

Also generate "bailiff_dialogue" — exactly these 3 lines:
1. "The court has heard both sides. Before you rule, you must answer."
2. "Let us begin with the first question."
3. "Well reasoned. One more question to answer."

Make questions and choices SPECIFIC to this trial. NOT generic.`,
      text: {
        format: {
          type: "json_schema",
          name: "cross_examination",
          strict: true,
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
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          text: { type: "string" },
                          bailiff_reaction: { type: "string" },
                        },
                        required: ["label", "text", "bailiff_reaction"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["question", "choices"],
                  additionalProperties: false,
                },
              },
              bailiff_dialogue: { type: "array", items: { type: "string" } },
            },
            required: ["questions", "bailiff_dialogue"],
            additionalProperties: false,
          },
        },
      },
    };

    if (previousConversationId) {
      body.previous_response_id = previousConversationId;
    } else {
      body.instructions = "You are the Feature Court AI. Generate cross-examination questions for the BAILIFF. Be specific to THIS trial. Each question must force the user to reconcile the arguments they just heard.";
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    if (data.status === "incomplete") {
      throw new Error(`OpenAI response incomplete: ${data.incomplete_details?.reason ?? "unknown"}`);
    }

    const contentText = extractOutputText(data);
    if (!contentText) throw new Error("No content in OpenAI response");

    const parsed = JSON.parse(contentText);
    const questions = parsed.questions as Array<{ question: string; choices: Array<{ label: string; text: string; bailiff_reaction: string }> }>;
    const bailiff_dialogue = (parsed.bailiff_dialogue as string[]) || [];
    const conversation_id = data.id as string;

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
