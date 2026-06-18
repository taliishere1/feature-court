"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { StageProgress, CourtroomBackground, DefensePortrait, EvidenceCard, ObjectionOverlay, ExhibitEngagementPrompt, ExhibitListFrame, StageProceedLink } from "@/components/court-components";
import { supabase } from "@/lib/supabase";
import { rowToTrialData, resolveTrialRowAfterGeneration, rowHasDefense } from "@/lib/store";
import { EdgeFunctionErrorInfo, parseEdgeFunctionError } from "@/lib/edge-function-errors";
import { StageGenerationError } from "@/components/stage-generation-error";
import { CAST } from "@/lib/cast";

function DefenseContent() {
  const searchParams = useSearchParams();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<EdgeFunctionErrorInfo | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [exhibitEngaged, setExhibitEngaged] = useState(false);
  const [objectionTrigger, setObjectionTrigger] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const mounted = useRef(false);

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    setExhibitEngaged(false);
    setObjectionTrigger(0);
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const id = searchParams.get("id");
    if (!id) return;

    let cancelled = false;

    (async function load() {
      try {
        const first = await supabase!
          .from("trials")
          .select("*")
          .eq("id", id)
          .single();
        if (cancelled) return;
        if (first.error || !first.data) throw new Error("Trial not found");
        let row = first.data;

        const hasDefense = rowHasDefense(row);
        if (!hasDefense) {
          const { data: fnData, error: fnError, response: fnResponse } = await supabase!.functions.invoke("defense-section", {
            body: { trial_id: id },
          });
          if (cancelled) return;
          if (fnError) {
            const info = await parseEdgeFunctionError(fnError, fnResponse);
            if (mounted.current) {
              setLoadError(info);
              setLoading(false);
            }
            return;
          }

          row = await resolveTrialRowAfterGeneration(
            id,
            row,
            fnData,
            (current, data) =>
              data.defense
                ? {
                    ...current,
                    defense: data.defense,
                    conversation_id: data.conversation_id,
                    generation_step: 3,
                  }
                : current,
            rowHasDefense,
          );
          if (cancelled) return;
        }

        const converted = rowToTrialData(row);
        if (mounted.current) {
          setTrial(converted);
          setRevealed(true);
          setLoading(false);
        }
      } catch {
        if (!cancelled && mounted.current) {
          setLoadError({ message: "Something went wrong. Please try again.", isRateLimited: false });
          setLoading(false);
        }
      }
    })();

    return () => { mounted.current = false; cancelled = true; };
  }, [searchParams, retryKey]);

  const handleEvidenceClick = useCallback(() => {
    setExhibitEngaged(true);
    setObjectionTrigger((n) => n + 1);
  }, []);

  if (loadError) {
    const id = searchParams.get("id");
    return (
      <StageGenerationError
        headline={
          loadError.isRateLimited
            ? "The court is busy right now."
            : "The defense is taking too long to prepare."
        }
        isRateLimited={loadError.isRateLimited}
        message={loadError.message}
        onRetry={handleRetry}
        backHref={id ? `/trial/prosecution?id=${id}` : undefined}
        backLabel="Back to prosecution"
      />
    );
  }
  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  const defenseName = trial.defense.character?.name ?? CAST.defense.name;
  const defenseTitle = trial.defense.character?.title ?? CAST.defense.title;

  return (
    <div className="min-h-screen flex flex-col wood-panel relative">
      <CourtroomBackground opacity={0.1} />
      <ObjectionOverlay trigger={objectionTrigger} side="defense" />

      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href={`/trial/prosecution?id=${trial.id}`} className="flex items-center gap-2 group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-[10px] text-court-400 group-hover:text-court-200 font-mono uppercase tracking-[0.15em] transition-colors">Back</span>
          </Link>
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">The Defense</span>
        </div>
      </header>

      <main className="flex-1 px-6 pt-4 pb-48 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <div className="text-center mb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-court-500">Stage 3 of 5</span>
          </div>

          <StageProgress current={3} />

          {revealed && (
            <div className="text-center mb-4 animate-fade-in-up">
              <div className="inline-flex items-center gap-4 border border-court-700 rounded-sm px-5 py-3 bg-court-900/60">
                <DefensePortrait size="medium" />
                <div className="text-left">
                  <h2 className="font-serif text-base text-court-100">{defenseName}</h2>
                  <p className="text-court-600 text-xs font-mono uppercase tracking-[0.15em]">{defenseTitle}</p>
                </div>
              </div>
            </div>
          )}

          {revealed && (
            <div className="parchment-ruled p-4 mb-4 animate-fade-in-up max-w-lg mx-auto w-full">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500 block mb-2 relative z-10">Opening Statement</span>
              <p className="text-court-200 text-sm leading-relaxed font-legal italic relative z-10">
                &ldquo;{trial.defense.opening}&rdquo;
              </p>
            </div>
          )}

          {revealed && (
            <div className="max-w-lg mx-auto w-full">
              <ExhibitEngagementPrompt engaged={exhibitEngaged} side="defense" />
              <ExhibitListFrame engaged={exhibitEngaged}>
                {trial.defense.arguments.map((arg, i) => (
                  <EvidenceCard
                    key={i}
                    exhibit={String(i + 1)}
                    side="defense"
                    index={i}
                    onClick={handleEvidenceClick}
                  >
                    {arg}
                  </EvidenceCard>
                ))}
              </ExhibitListFrame>
            </div>
          )}

          {revealed && (
            <div className="text-center mt-6 animate-fade-in-up">
              <StageProceedLink
                engaged={exhibitEngaged}
                href={`/trial/cross?id=${trial.id}`}
                label="Cross-examination"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center wood-panel">
      <div className="text-court-400 font-serif">The defense rises...</div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 wood-panel">
      <p className="text-court-400 font-serif">No case found.</p>
      <Link href="/" className="text-gold-500 hover:text-gold-400 underline">Return to the court</Link>
    </div>
  );
}

export default function DefensePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DefenseContent />
    </Suspense>
  );
}
