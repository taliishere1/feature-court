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
    const prosecution = trial.prosecution as { opening: string; arguments: string[] } | null;

    const intakeContext = `Product Proposal: "${intake.proposal}"
Target Audience: "${intake.audience}"
Timing/Rationale: "${intake.whyNow}"
Tradeoff: "${intake.tradeoff}"`;

    const body: Record<string, unknown> = {
      model: "gpt-5.4",
      reasoning: { effort: "low" },
      max_output_tokens: 16000,
      input: `${intakeContext}

The charge: "${charge}"

The prosecution has argued: "${prosecution?.opening || "No opening"}"

Generate the DEFENSE for this Feature Court trial.
- character: theatrical defense attorney name and title
- bailiff_intro: a single line Bailiff Sprint says introducing the defense
- opening: the defense attorney's opening statement, optimistic and reframing, responding to the prosecution
- arguments: exactly 3 arguments, each a complete paragraph that directly responds to or reframes the prosecution's points
- closing: a closing statement that ties it together`,
      text: {
        format: {
          type: "json_schema",
          name: "defense",
          strict: true,
          schema: {
            type: "object",
            properties: {
              character: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  title: { type: "string" },
                },
                required: ["name", "title"],
                additionalProperties: false,
              },
              bailiff_intro: { type: "string" },
              opening: { type: "string" },
              arguments: { type: "array", items: { type: "string" } },
              closing: { type: "string" },
            },
            required: ["character", "bailiff_intro", "opening", "arguments", "closing"],
            additionalProperties: false,
          },
        },
      },
    };

    if (previousConversationId) {
      body.previous_response_id = previousConversationId;
    } else {
      body.instructions = `You are the Feature Court AI. You write the DEFENSE "Defense Attorney Edward 'Edge' Case" — optimistic, principled, steel-mans the upside with conviction. Each argument must directly respond to the prosecution and reference the actual proposal, user, timing, or tradeoff.`;
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
    const character = parsed.character || { name: "Edward 'Edge' Case", title: "Public Defender" };
    const opening = parsed.opening as string;
    const arguments_ = parsed.arguments as string[];
    const closing = parsed.closing as string;
    const bailiff_intro = parsed.bailiff_intro as string;
    const conversation_id = data.id as string;

    const { error: updateError } = await supabase.from("trials").update({
      defense: { opening, arguments: arguments_, closing, character, bailiff_intro },
      conversation_id,
      generation_step: 3,
    }).eq("id", trial_id);

    if (updateError) {
      throw new Error(`Supabase update error: ${updateError.message}`);
    }

    return json({
      defense: { opening, arguments: arguments_, closing, character, bailiff_intro },
      conversation_id,
    });
  } catch (error) {
    console.error("defense-section error:", error);
    return json({ error: "Defense generation failed" }, 500);
  }
});
