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
    const prosecution = trial.prosecution as { opening?: string; character?: { name: string } } | null;
    const defense = trial.defense as { opening?: string; character?: { name: string } } | null;
    const previousConversationId = trial.conversation_id as string | undefined;

    const body: Record<string, unknown> = {
      model: "gpt-5.4",
      reasoning: { effort: "low" },
      max_output_tokens: 8000,
      input: `Case: ${case_title}
Charge: "${charge}"
Proposal: "${intake.proposal}"
Ruling: ${ruling.toUpperCase()}

Prosecutor: "${prosecution?.character?.name || "Prosecutor"}" argued: "${(prosecution?.opening || "").slice(0, 200)}"
Defense: "${defense?.character?.name || "Defense"}" argued: "${(defense?.opening || "").slice(0, 200)}"

Generate a 2-3 sentence DOCKET SUMMARY for this trial. This appears on the Hall of Verdicts page. Write it as a brief, theatrical docket entry summarizing the case, the arguments, and the ruling.`,
      text: {
        format: {
          type: "json_schema",
          name: "docket_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
            },
            required: ["summary"],
            additionalProperties: false,
          },
        },
      },
    };

    if (previousConversationId) {
      body.previous_response_id = previousConversationId;
    } else {
      body.instructions = "You are the Feature Court AI. Write a brief, theatrical docket summary for the Hall of Verdicts.";
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
    const summary = parsed.summary as string;

    const { error: updateError } = await supabase.from("trials").update({ summary }).eq("id", trial_id);
    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);

    return json({ summary });
  } catch (error) {
    console.error("summary-section error:", error);
    return json({ error: "Summary generation failed" }, 500);
  }
});
