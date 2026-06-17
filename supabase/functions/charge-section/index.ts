import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface IntakeForm {
  proposal: string;
  audience: string;
  whyNow: string;
  tradeoff: string;
  gutCall?: "ship" | "kill" | "unsure";
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Supabase not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { intake }: { intake: IntakeForm } = await req.json();

  if (!intake?.proposal || !intake?.audience || !intake?.whyNow || !intake?.tradeoff) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Generate trial ID
    const trial_id = crypto.randomUUID();

    // Build context for AI
    const intakeContext = `Product Proposal: "${intake.proposal}"
Target Audience: "${intake.audience}"
Timing/Rationale: "${intake.whyNow}"
Tradeoff: "${intake.tradeoff}"`;

    // ONE OpenAI call — generate charge + case_title + bailiff dialogue
    const body = {
      model: "gpt-4o",
      instructions: `You are the Feature Court AI — a theatrical courtroom drama generator for product decisions. You write the BAILIFF "Bailiff Sprint" — dry, theatrical, always rushing the docket. Every response must reference the actual proposal, audience, timing, and tradeoff provided. Be specific, not generic.`,
      input: `${intakeContext}

You are generating the OPENING SCENE of a Feature Court trial. Generate EXACTLY this JSON structure:

1. "bailiff_dialogue" — an array of exactly 4 strings. Bailiff Sprint announces the court opening, calls the case, presents the charge, passes the floor. Each line should be theatrical and specific to THIS proposal.

2. "case_title" — a theatrical court case name like "The People v. [short description of proposal]"

3. "charge" — a single dramatic sentence describing what this proposal "stands charged" with. Reference the specific proposal, audience, timing, and tradeoff.

Return ONLY valid JSON. No markdown. No explanation.`,
      max_output_tokens: 2048,
      temperature: 0.8,
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
    const contentText = data.output_text || data.output?.[0]?.content?.[0]?.text;
    if (!contentText) throw new Error("No content in OpenAI response");

    // Extract JSON from response
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in OpenAI response");
    const parsed = JSON.parse(jsonMatch[0]);

    const charge = parsed.charge as string;
    const case_title = parsed.case_title as string;
    const bailiff_dialogue = parsed.bailiff_dialogue as string[];
    const conversation_id = data.id;

    // Create trial in Supabase
    const { error: insertError } = await supabase.from("trials").insert({
      id: trial_id,
      intake,
      charge,
      case_title,
      charge_data: { bailiff_dialogue: bailiff_dialogue || [] },
      conversation_id,
      generation_step: 1,
      created_at: new Date().toISOString(),
      is_sample: false,
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

    return new Response(JSON.stringify({
      trial_id,
      charge,
      case_title,
      bailiff_dialogue,
      conversation_id,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("charge-section error:", error);
    return new Response(JSON.stringify({ error: "Charge generation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
