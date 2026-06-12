// Core types for Feature Court

export interface IntakeForm {
  proposal: string;
  audience: string;
  whyNow: string;
  tradeoff: string;
  gutCall?: 'ship' | 'kill' | 'unsure';
}

export interface VerdictContent {
  sentence: string;
  real_risk: string;
  strongest_ignored_argument: string;
  test_first: string;
}

export interface TrialData {
  id: string;
  intake: IntakeForm;
  charge: string;
  case_title: string;
  prosecution: {
    opening: string;
    arguments: string[];
  };
  defense: {
    opening: string;
    arguments: string[];
  };
  cross_examination: string[];
  verdicts: {
    ship: VerdictContent;
    kill: VerdictContent;
    revise: VerdictContent;
    mistrial: VerdictContent;
  };
  createdAt: number;
  isSample?: boolean;
}

export type Ruling = 'ship' | 'kill' | 'revise' | 'mistrial';

export interface VerdictDisplay {
  trial: TrialData;
  ruling: Ruling;
  gutCall?: 'ship' | 'kill' | 'unsure';
}

export const SAMPLE_CASES: IntakeForm[] = [
  {
    proposal: 'Build a mobile app for our SaaS analytics dashboard',
    audience: 'Existing desktop power users who want to check metrics on the go',
    whyNow: 'Competitors are launching mobile companions and our NPS is dropping among commuters',
    tradeoff: '6 months of engineering time away from the core platform roadmap',
    gutCall: 'unsure',
  },
  {
    proposal: 'Add a dark mode toggle to the product',
    audience: 'All users who work late or have visual sensitivities',
    whyNow: 'It\'s the #1 most requested feature in our feedback tool for 8 months straight',
    tradeoff: 'Significant design system work across 200+ components with minimal revenue impact',
    gutCall: 'ship',
  },
  {
    proposal: 'Cut the "comments" feature from our publishing platform',
    audience: 'The 12% of power users who actively use comments',
    whyNow: 'Comments generate 70% of moderation cost but only 2% of engagement time',
    tradeoff: 'Losing a vocal community segment and potential engagement surface area',
    gutCall: 'kill',
  },
];