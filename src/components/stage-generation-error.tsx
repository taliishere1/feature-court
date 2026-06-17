"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RATE_LIMIT_COOLDOWN_MS } from "@/lib/edge-function-errors";

type StageGenerationErrorProps = {
  headline: string;
  isRateLimited: boolean;
  message?: string;
  onRetry?: () => void;
  newCaseHref?: string;
  newCaseLabel?: string;
};

export function StageGenerationError({
  headline,
  isRateLimited,
  message,
  onRetry,
  newCaseHref = "/file",
  newCaseLabel = "File a new case",
}: StageGenerationErrorProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(
    isRateLimited ? RATE_LIMIT_COOLDOWN_MS : 0
  );

  useEffect(() => {
    if (!isRateLimited) return;
    const started = Date.now();
    const interval = setInterval(() => {
      const remaining = RATE_LIMIT_COOLDOWN_MS - (Date.now() - started);
      setCooldownRemaining(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRateLimited]);

  const canRetry = Boolean(onRetry && (!isRateLimited || cooldownRemaining <= 0));

  const subtext = isRateLimited
    ? cooldownRemaining > 0
      ? `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before trying again.`
      : message ?? "You can try again now."
    : "Generation timed out. You can retry or start over.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 wood-panel px-6">
      <p className="text-court-400 font-serif text-center">{headline}</p>
      <p className="text-court-600 text-sm font-legal text-center max-w-md">{subtext}</p>
      {canRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-sm animate-button-press"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          Retry
        </button>
      )}
      <Link href={newCaseHref} className="inline-block text-sm text-gold-500 hover:text-gold-400 underline mt-2">
        {newCaseLabel}
      </Link>
    </div>
  );
}
