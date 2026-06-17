import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Supabase not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { trial_id, ruling }: { trial_id: string; ruling: string } = await req.json();
  if (!trial_id || !ruling) {
    return new Response(JSON.stringify({ error: "Missing trial_id or ruling" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (!["ship", "kill", "revise", "mistrial"].includes(ruling)) {
    return new Response(JSON.stringify({ error: "Invalid ruling" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    const { error: updateError } = await supabase.from("trials").update({ ruling }).eq("id", trial_id);
    if (updateError) throw new Error(`Supabase update error: ${updateError.message}`);
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("record-ruling error:", error);
    return new Response(JSON.stringify({ error: "Failed to record ruling" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
