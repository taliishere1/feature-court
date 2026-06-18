// Core types for Feature Court

export interface IntakeForm {
  proposal: string;
  audience: string;
  whyNow: string;
  tradeoff: string;
  gutCall?: 'ship' | 'kill' | 'unsure';
}

export interface VerdictContent {
  label?: string;
  description?: string;
  sentence: string;
  real_risk: string;
  strongest_ignored_argument: string;
  test_first: string;
}

export interface CrossExaminationChoice {
  label: string;
  text: string;
  bailiff_reaction: string;
}

export interface CrossExaminationQuestion {
  question: string;
  choices: CrossExaminationChoice[];
}

export interface TrialCharacter {
  name: string;
  title: string;
}

export interface TrialSide {
  opening: string;
  arguments: string[];
  closing?: string;
  bailiff_intro?: string;
  character?: TrialCharacter;
}

export interface TrialData {
  id: string;
  intake: IntakeForm;
  charge: string;
  case_title: string;
  charge_data?: { bailiff_dialogue?: string[] };
  prosecution: TrialSide;
  defense: TrialSide;
  cross_examination: CrossExaminationQuestion[];
  cross_bailiff_dialogue?: string[];
  verdicts: {
    ship: VerdictContent;
    kill: VerdictContent;
    revise: VerdictContent;
    mistrial: VerdictContent;
  };
  createdAt: number;
  isSample?: boolean;
  ruling?: Ruling;
  generationStep?: number;
}

export type Ruling = 'ship' | 'kill' | 'revise' | 'mistrial';

export interface VerdictDisplay {
  trial: TrialData;
  ruling: Ruling;
  gutCall?: 'ship' | 'kill' | 'unsure';
}

export const SAMPLE_CASES: IntakeForm[] = [
  {
    proposal: 'Switch our SaaS pricing from per-seat to usage-based billing',
    audience: 'SMBs who churn when headcount grows, and enterprises who want pay-as-you-go',
    whyNow: 'Our biggest competitor switched to usage-based pricing last quarter and we\'re losing 30% of enterprise evaluations to them',
    tradeoff: '3-4 months of engineering on billing infrastructure + risk of short-term revenue decline during transition',
    gutCall: 'unsure',
  },
  {
    proposal: 'Add an AI-powered feature discovery assistant as a premium add-on tier',
    audience: 'Enterprise power users who want personalized onboarding and workflow suggestions',
    whyNow: 'Enterprise churn analysis shows 45% of users never discover core features within their first 30 days',
    tradeoff: 'Dedicated ML team for 6 months + ongoing LLM inference costs that eat into the premium margin',
    gutCall: 'ship',
  },
  {
    proposal: 'Remove the free tier and require a credit card for trials',
    audience: '~40K free-tier users who convert at 2%, and new acquisition top-of-funnel',
    whyNow: 'Free tier infrastructure costs $80K/month and conversion has dropped from 8% to 2% over the last year',
    tradeoff: 'Slowing new user acquisition by ~60% and risking negative brand perception in the dev community',
    gutCall: 'kill',
  },
];