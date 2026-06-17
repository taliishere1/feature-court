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
  try {
    const parsed = await req.json();
    intake = parsed.intake;
    isSample = Boolean(parsed.isSample);
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  if (!intake?.proposal || !intake?.audience || !intake?.whyNow || !intake?.tradeoff) {
    return json({ error: "Missing required fields" }, 400);
  }

  try {
    const trial_id = crypto.randomUUID();

    const intakeContext = `Product Proposal: "${intake.proposal}"
Target Audience: "${intake.audience}"
Timing/Rationale: "${intake.whyNow}"
Tradeoff: "${intake.tradeoff}"`;

    const body = {
      model: "gpt-5.4",
      reasoning: { effort: "low" },
      max_output_tokens: 16000,
      instructions: `You are the Feature Court AI — a theatrical courtroom drama generator for product decisions. You write the BAILIFF "Bailiff Sprint" — dry, theatrical, always rushing the docket. Every response must reference the actual proposal, audience, timing, and tradeoff provided. Be specific, not generic.`,
      input: `${intakeContext}

You are generating the OPENING SCENE of a Feature Court trial.

1. "bailiff_dialogue" — exactly 4 strings. Bailiff Sprint announces the court opening, calls the case, presents the charge, passes the floor. Each line theatrical and specific to THIS proposal.
2. "case_title" — a theatrical court case name like "The People v. [short description of proposal]".
3. "charge" — a single dramatic sentence describing what this proposal "stands charged" with, referencing the specific proposal, audience, timing, and tradeoff.`,
      text: {
        format: {
          type: "json_schema",
          name: "charge_scene",
          strict: true,
          schema: {
            type: "object",
            properties: {
              bailiff_dialogue: { type: "array", items: { type: "string" } },
              case_title: { type: "string" },
              charge: { type: "string" },
            },
            required: ["bailiff_dialogue", "case_title", "charge"],
            additionalProperties: false,
          },
        },
      },
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
    const charge = parsed.charge as string;
    const case_title = parsed.case_title as string;
    const bailiff_dialogue = (parsed.bailiff_dialogue as string[]) || [];
    const conversation_id = data.id as string;

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
      prosecution: { opening: "", arguments: [], closing: "", character: { name: "", title: "" }, bailiff_intro: "" },
      defense: { opening: "", arguments: [], closing: "", character: { name: "", title: "" }, bailiff_intro: "" },
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
