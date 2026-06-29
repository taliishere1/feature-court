import { pendoTrack } from "./pendo-track";

/** Canonical trial stages for Novus funnels and track events. */
export const TRIAL_STAGES = {
  arraignment: { number: 1, label: "Arraignment" },
  prosecution: { number: 2, label: "Prosecution" },
  defense: { number: 3, label: "Defense" },
  cross: { number: 4, label: "Cross-Examination" },
  ruling: { number: 5, label: "Ruling" },
  verdict: { number: 6, label: "Verdict" },
} as const;

export type TrialStage = keyof typeof TRIAL_STAGES;

/**
 * Pendo Page URL rules to create in Novus (Product → Pages → Tag pages).
 * Use "is equal to" or "starts with" on the path after Location API strips query strings.
 */
export const PENDO_PAGE_TAG_PATHS = [
  { path: "/", name: "Landing Page" },
  { path: "/file", name: "Case Filing" },
  { path: "/guide", name: "Guide" },
  { path: "/gallery", name: "Verdict Gallery" },
  { path: "/trial/arraignment", name: "Trial — Arraignment" },
  { path: "/trial/prosecution", name: "Trial — Prosecution" },
  { path: "/trial/defense", name: "Trial — Defense" },
  { path: "/trial/cross", name: "Trial — Cross-Examination" },
  { path: "/trial/ruling", name: "Trial — Ruling" },
  { path: "/verdict", name: "Verdict Certificate" },
] as const;

/** Normalizes URLs sent to Pendo (pathname only; collapses /verdict/:id → /verdict). */
export function pendoAnalyticsUrl(): string {
  if (typeof window === "undefined") return "";
  return sanitizePendoUrl(window.location.href);
}

export function trackTrialStageViewed(stage: TrialStage, trialId?: string): void {
  const meta = TRIAL_STAGES[stage];
  pendoTrack("trial_stage_viewed", {
    stage,
    stage_number: meta.number,
    stage_label: meta.label,
    ...(trialId ? { trial_id: trialId } : {}),
  });
}

export function trackCaseFilingViewed(): void {
  pendoTrack("case_filing_viewed");
}

export function trackFileAnotherCaseClicked(trialId: string, ruling: string): void {
  pendoTrack("file_another_case_clicked", { trial_id: trialId, ruling });
}

export function trackSampleCaseClicked(from: "landing" | "guide"): void {
  pendoTrack("sample_case_cta_clicked", { from });
}

/** Strips query strings and normalizes dynamic routes for Pendo Page rules. */
export function sanitizePendoUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    if (path.startsWith("/verdict/")) path = "/verdict";
    return parsed.origin + path;
  } catch {
    return url.split("?")[0]?.split("#")[0] ?? url;
  }
}
