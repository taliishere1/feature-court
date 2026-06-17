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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
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
    const { error: updateError } = await supabase.from("trials").update({ ruling }).eq("id", trial_id);
    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);
    return json({ success: true });
  } catch (error) {
    console.error("record-ruling error:", error);
    return json({ error: "Failed to record ruling" }, 500);
  }
});
