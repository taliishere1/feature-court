import { NextRequest, NextResponse } from 'next/server';
import { TrialData, IntakeForm } from '@/lib/types';
import { setTrial, getTrial } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

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
      `If you ${intake.tradeoff.toLowerCase().includes('delay') || intake.tradeoff.toLowerCase().includes('month') ? 'commit to this' : 'pursue this'}, what concrete metric are you willing to see go flat or down as a result?`,
      `Be honest: is "${intake.whyNow}" a real market signal, or is it FOMO dressed up as strategy?`,
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

  try {
    let trialData: Omit<TrialData, 'id' | 'createdAt' | 'isSample'>;

    // Use OpenAI if key is configured, otherwise fall back to mock
    if (process.env.OPENAI_API_KEY) {
      trialData = await generateWithOpenAI(intake);
    } else {
      trialData = generateMockTrial(intake);
    }

    const trial: TrialData = {
      id,
      ...trialData,
      createdAt: Date.now(),
      isSample,
    };

    await setTrial(id, trial);
    return NextResponse.json(trial);
  } catch (error) {
    console.error('AI generation failed:', error);
    // Fallback to mock on error
    const mockData = generateMockTrial(intake);
    const trial: TrialData = {
      id,
      ...mockData,
      createdAt: Date.now(),
      isSample,
    };
    await setTrial(id, trial);
    return NextResponse.json(trial);
  }
}

async function generateWithOpenAI(intake: IntakeForm): Promise<Omit<TrialData, 'id' | 'createdAt' | 'isSample'>> {
  const openai = new OpenAI();

  const systemPrompt = `You are the engine behind FEATURE COURT, where product decisions go on trial. You write three distinct voices: the BAILIFF "Bailiff Sprint" (dry, theatrical, always rushing the docket), the PROSECUTION "Prosecutor Mary T. Bug" (sharp, relentless, exposes every flaw with surgical precision), and the DEFENSE "Defense Attorney Edward 'Edge' Case" (optimistic, principled, steel-mans the upside with conviction). Be specific to THIS decision. Every argument must reference the actual proposal, user, timing, or tradeoff given. Be witty but substantive. Do not invent facts about real companies or real events. Return ONLY valid JSON matching the schema.`;

  const userInput = `Generate a Feature Court trial for this product decision:
Proposal: ${intake.proposal}
Who it serves: ${intake.audience}
Why now: ${intake.whyNow}
Tradeoff: ${intake.tradeoff}

Return the JSON in this exact format:
{
  "charge": "...",
  "case_title": "...",
  "prosecution": { "opening": "...", "arguments": ["...", "...", "..."] },
  "defense": { "opening": "...", "arguments": ["...", "...", "..."] },
  "cross_examination": ["...", "..."],
  "verdicts": {
    "ship": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },
    "kill": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },
    "revise": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." },
    "mistrial": { "sentence": "...", "real_risk": "...", "strongest_ignored_argument": "...", "test_first": "..." }
  }
}`;

  const response = await openai.responses.create({
    model: 'gpt-5.4',
    instructions: systemPrompt,
    input: userInput,
    max_output_tokens: 8192,
  });

  const content = response.output_text;
  if (!content) throw new Error('No content in OpenAI response');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in OpenAI response');

  const parsed = JSON.parse(jsonMatch[0]);
  return validateTrialJSON(parsed, intake);
}

function validateTrialJSON(json: Record<string, unknown>, intake: IntakeForm): Omit<TrialData, 'id' | 'createdAt' | 'isSample'> {
  const j = json as unknown as Omit<TrialData, 'id' | 'createdAt' | 'isSample' | 'intake'>;
  const required = ['charge', 'case_title', 'prosecution', 'defense', 'cross_examination', 'verdicts'];
  for (const key of required) {
    if (!json[key]) throw new Error(`Missing required field: ${key}`);
  }

  // Ensure prosecution has opening and arguments
  if (!j.prosecution.opening || !Array.isArray(j.prosecution.arguments)) {
    throw new Error('Invalid prosecution format');
  }

  // Ensure defense has opening and arguments
  if (!j.defense.opening || !Array.isArray(j.defense.arguments)) {
    throw new Error('Invalid defense format');
  }

  // Ensure cross_examination is an array
  if (!Array.isArray(j.cross_examination)) {
    throw new Error('Invalid cross_examination format');
  }

  // Ensure all verdicts exist
  for (const v of ['ship', 'kill', 'revise', 'mistrial'] as const) {
    if (!j.verdicts[v]?.sentence) {
      throw new Error(`Missing sentence for verdict: ${v}`);
    }
  }

  return {
    intake,
    charge: j.charge,
    case_title: j.case_title,
    prosecution: {
      opening: j.prosecution.opening,
      arguments: j.prosecution.arguments,
    },
    defense: {
      opening: j.defense.opening,
      arguments: j.defense.arguments,
    },
    cross_examination: j.cross_examination,
    verdicts: {
      ship: j.verdicts.ship,
      kill: j.verdicts.kill,
      revise: j.verdicts.revise,
      mistrial: j.verdicts.mistrial,
    },
  };
}