import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  getPublishableKey,
  getSupabaseClient,
  isRateLimited,
  isValidUuid,
  json,
} from "../_shared/edge-http.ts";

const VALID_RULINGS = ["ship", "kill", "revise", "mistrial"] as const;

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
  if (!isValidUuid(trial_id)) {
    return json({ error: "Invalid trial_id" }, 400);
  }
  if (!VALID_RULINGS.includes(ruling as (typeof VALID_RULINGS)[number])) {
    return json({ error: "Invalid ruling" }, 400);
  }

  try {
    const { data: trial, error: loadError } = await supabase
      .from("trials")
      .select("ruling, verdicts")
      .eq("id", trial_id)
      .single();

    if (loadError || !trial) {
      return json({ error: "Trial not found" }, 404);
    }

    const verdicts = trial.verdicts as { ship?: { sentence?: string } } | null;
    if (!verdicts?.ship?.sentence?.trim()) {
      return json({ error: "Trial is not ready for a ruling" }, 400);
    }

    const existingRuling = trial.ruling as string | null;
    if (existingRuling) {
      if (existingRuling === ruling) {
        return json({ success: true });
      }
      return json({ error: "Ruling already recorded" }, 409);
    }

    const { error: updateError } = await supabase
      .from("trials")
      .update({ ruling })
      .eq("id", trial_id);

    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);
    return json({ success: true });
  } catch (error) {
    console.error("record-ruling error:", error);
    return json({ error: "Failed to record ruling" }, 500);
  }
});
