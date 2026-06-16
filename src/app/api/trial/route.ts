import { NextRequest, NextResponse } from 'next/server';
import { TrialData, IntakeForm } from '@/lib/types';
import { setTrial, getTrial, updateTrial } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';

// Simple in-memory rate limiting (IP-based)
const ipCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_FILINGS_PER_IP = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipCounts.get(ip);
  if (!record || now > record.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_FILINGS_PER_IP) return false;
  record.count++;
  return true;
}

// Mock trials for development without API keys
function generateMockTrial(intake: IntakeForm): Omit<TrialData, 'id' | 'createdAt' | 'isSample'> {
  const words = intake.proposal.split(' ');
  const shortTitle = words.slice(0, 4).join(' ');

  return {
    intake,
    charge: `The decision to "${intake.proposal}" stands charged with insufficient evidence of user need, questionable timing, and unacceptable opportunity cost.`,
    case_title: `The People v. ${shortTitle.length > 30 ? shortTitle.slice(0, 30) + '...' : shortTitle}`,
    prosecution: {
      opening: `Look, I've seen this play before. "${intake.proposal}" sounds great in a roadmap presentation, but let's talk about what you're actually signing up for.`,
      arguments: [
        `You say this serves "${intake.audience}" — but how many of them actually asked for this? Be honest.`,
        `Your timing argument ("${intake.whyNow}") is reactive, not strategic. You're responding to noise, not signal.`,
        `The tradeoff is ${intake.tradeoff}. That's not nothing. What critical work dies so this can live?`,
      ],
    },
    defense: {
      opening: `My opponent would have us believe that doing nothing is the safe bet. Let me tell you why doing nothing is actually the riskiest move of all.`,
      arguments: [
        `"${intake.audience}" may not have asked for this explicitly, but that's because they don't know what's possible yet. This is $PRODUCT deciding what's next, not reacting to a feature request tally.`,
        `"${intake.whyNow}" isn't reactive — it's called having market awareness. Waiting is a decision too, and it's usually the wrong one.`,
        `Yes, the tradeoff is ${intake.tradeoff}. But great products are defined by the bold calls they make, not the safe bets they place.`,
      ],
    },
    cross_examination: [
      {
        question: `If you ${intake.tradeoff.toLowerCase().includes('delay') || intake.tradeoff.toLowerCase().includes('month') ? 'commit to this' : 'pursue this'}, what concrete metric are you willing to see go flat or down as a result?`,
        choices: [
          { label: "Revenue", text: "I'll watch revenue growth — if it dips, I'll course-correct immediately.", bailiff_reaction: "A sharp eye on the bottom line. Prudent." },
          { label: "Engineering velocity", text: "Ship velocity will tell the real story. If we slow down, this wasn't worth it.", bailiff_reaction: "Velocity over vanity. The court approves." },
          { label: "User engagement", text: "If engagement drops in the core experience, the tradeoff isn't worth it.", bailiff_reaction: "The user's voice — always the truest measure." },
        ],
      },
      {
        question: `Be honest: is "${intake.whyNow}" a real market signal, or is it FOMO dressed up as strategy?`,
        choices: [
          { label: "Real signal", text: "I've got the data to back this up. This is real demand.", bailiff_reaction: "Data speaks louder than doubt." },
          { label: "Could be FOMO", text: "Honestly? Maybe both. But sometimes you need to move before the data is perfect.", bailiff_reaction: "Rare honesty in this court. The jury will note it." },
          { label: "Either way, now is right", text: "Signal or FOMO — the window is now either way.", bailiff_reaction: "Decisiveness has its own virtue." },
        ],
      },
    ],
    verdicts: {
      ship: {
        sentence: `The bench finds the evidence sufficient and the timing right. Ship it before you talk yourself out of it.`,
        real_risk: `You're betting on "${intake.whyNow}" being signal, not noise. If you're wrong, you've burned ${intake.tradeoff} on the wrong priority.`,
        strongest_ignored_argument: `The prosecution's point about "${intake.audience}" not asking for this deserves more weight. Consider a softer launch to validate demand.`,
        test_first: `Ship to 10% of ${intake.audience} with clear success metrics and a 2-week evaluation gate before full rollout.`,
      },
      kill: {
        sentence: `The court rules: not guilty of being worth the cost. At least not right now.`,
        real_risk: `By killing this, you're banking that "${intake.whyNow}" won't become a competitive disadvantage in the next quarter.`,
        strongest_ignored_argument: `The defense made a real point about opportunity cost of inaction. Don't dismiss it — schedule a re-evaluation in 90 days.`,
        test_first: `Before fully killing it, run a lightweight smoke test: could a 2-week sprint validate the core assumption for under 10% of the stated tradeoff?`,
      },
      revise: {
        sentence: `The court finds merit in the idea but not in the plan. Go back, sharpen the case, and resubmit.`,
        real_risk: `The scope as described requires ${intake.tradeoff} — that's too much uncertainty for the level of validation you have.`,
        strongest_ignored_argument: `The defense correctly identified that "${intake.whyNow}" won't wait forever. Don't take too long revising.`,
        test_first: `Define the smallest possible version (think: 90% less scope) that would prove the thesis for ${intake.audience}. Start there.`,
      },
      mistrial: {
        sentence: `The court cannot rule with the evidence presented. More data is required before justice can be served.`,
        real_risk: `The biggest danger is making a decision — either way — based on the assumptions in this filing rather than real user evidence.`,
        strongest_ignored_argument: `Both sides made valid points, which is exactly why you need more data. The strongest signal will come from ${intake.audience} directly.`,
        test_first: `Run a 2-week discovery sprint: 5 user interviews with ${intake.audience}, a landing page test, and a competitive audit. Then come back.`,
      },
    },
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const all = searchParams.get('all');

  if (all) {
    const { getPublicTrials } = await import('@/lib/store');
    return NextResponse.json(await getPublicTrials());
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const trial = await getTrial(id);
  if (!trial) {
    return NextResponse.json({ error: 'Trial not found' }, { status: 404 });
  }

  return NextResponse.json(trial);
}

export async function POST(request: NextRequest) {
  // Rate limit check
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many cases filed. Please try again later.' },
      { status: 429 }
    );
  }

  const intake: IntakeForm & { isSample?: boolean } = await request.json();
  const isSample = intake.isSample || false;

  // Validate required fields
  if (!intake.proposal || !intake.audience || !intake.whyNow || !intake.tradeoff) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const id = uuidv4();

  // Create empty trial record immediately so the client can poll and show progress
  const emptyVerdicts = {
    ship: { sentence: '', real_risk: '', strongest_ignored_argument: '', test_first: '' },
    kill: { sentence: '', real_risk: '', strongest_ignored_argument: '', test_first: '' },
    revise: { sentence: '', real_risk: '', strongest_ignored_argument: '', test_first: '' },
    mistrial: { sentence: '', real_risk: '', strongest_ignored_argument: '', test_first: '' },
  };

  const initialTrial: TrialData = {
    id,
    intake,
    charge: '',
    case_title: '',
    prosecution: { opening: '', arguments: [] },
    defense: { opening: '', arguments: [] },
    cross_examination: [],
    verdicts: emptyVerdicts,
    createdAt: Date.now(),
    isSample,
    generationStep: 0,
  };

  await setTrial(id, initialTrial);

  // Fire background generation — client polls for incremental progress
  generateAndUpdateInBackground(id, intake, isSample).catch((err) => {
    console.error('Background generation failed:', err);
    const mockData = generateMockTrial(intake);
    updateTrial(id, { ...mockData, generationStep: 5 }).catch(e =>
      console.error('Mock fallback save failed:', e)
    );
  });

  return NextResponse.json({ id });
}

async function generateAndUpdateInBackground(id: string, intake: IntakeForm, isSample: boolean) {
  if (process.env.OPENAI_API_KEY) {
    // 5-step with progress saved to Supabase after each step
    await generateWithOpenAIInBackground(id, intake);
  } else if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
    // Edge function — one-shot, can't do incremental
    const trialData = await generateWithEdgeFunction(intake);
    await updateTrial(id, { ...trialData, generationStep: 5 });
  } else {
    // Mock — synchronous, one-shot
    const mockData = generateMockTrial(intake);
    await updateTrial(id, { ...mockData, generationStep: 5 });
  }
}

async function generateWithOpenAIInBackground(id: string, intake: IntakeForm) {
  const systemPrompt = `You are the engine behind FEATURE COURT, where product decisions go on trial. You write three distinct voices: the BAILIFF "Bailiff Sprint" (dry, theatrical, always rushing the docket), the PROSECUTION "Prosecutor Mary T. Bug" (sharp, relentless, exposes every flaw with surgical precision), and the DEFENSE "Defense Attorney Edward 'Edge' Case" (optimistic, principled, steel-mans the upside with conviction). Be specific to THIS decision. Every argument must reference the actual proposal, user, timing, or tradeoff given. Be witty but substantive. Do not invent facts about real companies or real events. Return ONLY valid JSON matching the schema.`;

  const intakeContext = `Product Decision:
Proposal: ${intake.proposal}
Who it serves: ${intake.audience}
Why now: ${intake.whyNow}
Tradeoff: ${intake.tradeoff}`;

  async function callOpenAI(params: {
    input: string;
    instructions?: string;
    previous_response_id?: string;
  }): Promise<{ id: string; text: string }> {
    const body: Record<string, unknown> = {
      model: "gpt-4o-mini",
      instructions: params.instructions || systemPrompt,
      input: params.input,
      max_output_tokens: 4096,
    };
    if (params.previous_response_id) {
      body.previous_response_id = params.previous_response_id;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const content = data.output_text || data.output?.[0]?.content?.[0]?.text;
    if (!content) throw new Error("No content in OpenAI response");
    return { id: data.id, text: content };
  }

  function extractJSON(text: string): Record<string, unknown> {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in OpenAI response");
    return JSON.parse(match[0]);
  }

  // === STEP 1: Charge and Case Title — save to Supabase immediately ===
  const step1 = await callOpenAI({
    input: `${intakeContext}\n\nGenerate only the charge and case_title for this Feature Court trial. The charge is a single dramatic sentence describing what this proposal "stands charged" with. The case_title is a short, theatrical court case name.\n\nReturn JSON:\n{\n  "charge": "...",\n  "case_title": "..."\n}`,
  });
  const chargeData = extractJSON(step1.text);
  const charge = chargeData.charge as string;
  const case_title = chargeData.case_title as string;
  await updateTrial(id, { intake, charge, case_title, generationStep: 1 });

  // === STEP 2: Prosecution Opening + Arguments ===
  const step2 = await callOpenAI({
    previous_response_id: step1.id,
    input: `The charge has been read: "${charge}"\n\nNow generate the PROSECUTION's opening statement and 3 arguments. Prosecutor Mary T. Bug is sharp, relentless, exposes every flaw with surgical precision. Each argument must reference the actual proposal, audience, timing, or tradeoff.\n\nReturn JSON:\n{\n  "prosecution": { "opening": "...", "arguments": ["...", "...", "..."] }\n}`,
  });
  const prosecutionData = extractJSON(step2.text);
  const prosecution = prosecutionData.prosecution as { opening: string; arguments: string[] };
  await updateTrial(id, { prosecution, generationStep: 2 });

  // === STEP 3: Defense Opening + Arguments ===
  const step3 = await callOpenAI({
    previous_response_id: step2.id,
    input: `The prosecution has made their case. Now generate the DEFENSE's opening statement and 3 arguments. Defense Attorney Edward "Edge" Case is optimistic, principled, steel-mans the upside with conviction. Each argument must directly respond to or reframe the prosecution's points and reference the actual proposal, audience, timing, or tradeoff.\n\nReturn JSON:\n{\n  "defense": { "opening": "...", "arguments": ["...", "...", "..."] }\n}`,
  });
  const defenseData = extractJSON(step3.text);
  const defense = defenseData.defense as { opening: string; arguments: string[] };
  await updateTrial(id, { defense, generationStep: 3 });

  // === STEP 4: Cross-Examination Questions with Choices ===
  const step4 = await callOpenAI({
    previous_response_id: step3.id,
    input: `Both sides have argued. Now generate 2 cross-examination questions that the BAILIFF will ask the user (the judge) before they deliver their ruling. These should probe the user's conviction, honesty, and readiness — forcing them to reconcile the tension between the prosecution and defense arguments they just heard.

Each question must have 3 answer choices. Each choice has:
- label: a short label describing the type of answer (e.g. "Confident", "Cautious", "Pragmatic")
- text: what the user says when they pick this choice
- bailiff_reaction: Bailiff Sprint's dramatic reaction to this choice

Make the questions and choices SPECIFIC to this trial's proposal, audience, timing, and tradeoff. NOT generic.

Return JSON:
{
  "cross_examination": [
    {
      "question": "...",
      "choices": [
        { "label": "...", "text": "...", "bailiff_reaction": "..." },
        { "label": "...", "text": "...", "bailiff_reaction": "..." },
        { "label": "...", "text": "...", "bailiff_reaction": "..." }
      ]
    },
    {
      "question": "...",
      "choices": [
        { "label": "...", "text": "...", "bailiff_reaction": "..." },
        { "label": "...", "text": "...", "bailiff_reaction": "..." },
        { "label": "...", "text": "...", "bailiff_reaction": "..." }
      ]
    }
  ]
}`,
  });
  const crossData = extractJSON(step4.text);
  const cross_examination = crossData.cross_examination as TrialData["cross_examination"];
  await updateTrial(id, { cross_examination, generationStep: 4 });

  // === STEP 5: All Verdicts ===
  const step5 = await callOpenAI({
    previous_response_id: step4.id,
    input: `Now generate all 4 possible verdicts for this trial. Each verdict must have a sentence, real_risk, strongest_ignored_argument, and test_first. Reflect the specific arguments made by both sides in this case.\n\nReturn JSON:\n{\n  "verdicts": {\n    "ship": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },\n    "kill": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },\n    "revise": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },\n    "mistrial": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." }\n  }\n}`,
  });
  const verdictsData = extractJSON(step5.text);
  const verdicts = verdictsData.verdicts as TrialData["verdicts"];
  await updateTrial(id, { verdicts, generationStep: 5 });
}

async function generateWithEdgeFunction(intake: IntakeForm): Promise<Omit<TrialData, 'id' | 'createdAt' | 'isSample'>> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-trial`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ intake }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Edge function error ${response.status}: ${errText}`);
  }

  const trialData = await response.json();
  return {
    intake,
    ...trialData,
  };
}

export async function PATCH(request: NextRequest) {
  const { id, ruling } = await request.json();

  if (!id || !ruling) {
    return NextResponse.json({ error: 'Missing id or ruling' }, { status: 400 });
  }

  if (!['ship', 'kill', 'revise', 'mistrial'].includes(ruling)) {
    return NextResponse.json({ error: 'Invalid ruling' }, { status: 400 });
  }

  const { recordRuling } = await import('@/lib/store');
  await recordRuling(id, ruling);
  return NextResponse.json({ success: true });
}