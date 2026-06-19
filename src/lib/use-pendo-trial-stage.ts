"use client";

import { useEffect, useRef } from "react";
import { trackTrialStageViewed, type TrialStage } from "./pendo-analytics";

/** Fire once when a trial stage becomes visible (after generation / load). */
export function usePendoTrialStage(stage: TrialStage, active: boolean, trialId?: string): void {
  const tracked = useRef(false);

  useEffect(() => {
    if (!active || tracked.current) return;
    tracked.current = true;
    trackTrialStageViewed(stage, trialId);
  }, [active, stage, trialId]);
}
