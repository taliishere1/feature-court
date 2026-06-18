"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData, Ruling } from "@/lib/types";
import { StageProgress, ScrollworkBorder, CourtroomBackground, JudgePortrait, SiteHomeLink, CounselStageLayout, trialStageShellClass, trialStageHeaderClass } from "@/components/court-components";
import { supabase } from "@/lib/supabase";
import { rowToTrialData, resolveTrialRowAfterGeneration, rowHasVerdicts } from "@/lib/store";
import { EdgeFunctionErrorInfo, parseEdgeFunctionError } from "@/lib/edge-function-errors";
import { pendoTrack } from "@/lib/pendo-track";
import { StageGenerationError } from "@/components/stage-generation-error";
import { CAST } from "@/lib/cast";

const RULING_OPTIONS: { key: Ruling; label: string; description: string; sentence: string; color: string; bgClass: string }[] = [
  { key: "ship", label: "Ship It", description: "Full speed ahead.", sentence: "The evidence is sufficient. Proceed with confidence.", color: "var(--color-stamp-ship)", bgClass: "hover:bg-stamp-ship/5" },
  { key: "kill", label: "Kill It", description: "Stop. Not the right move.", sentence: "The cost outweighs the benefit. Abandon this path.", color: "var(--color-stamp-kill)", bgClass: "hover:bg-stamp-kill/5" },
  { key: "revise", label: "Send Back", description: "Revise and resubmit.", sentence: "Good idea, wrong plan. Sharpen the case.", color: "var(--color-stamp-revise)", bgClass: "hover:bg-stamp-revise/5" },
  { key: "mistrial", label: "Mistrial", description: "Need more data.", sentence: "Insufficient evidence. Investigate further.", color: "var(--color-stamp-mistrial)", bgClass: "hover:bg-stamp-mistrial/5" },
];

function RulingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ruling | null>(null);
  const [recordedRuling, setRecordedRuling] = useState<Ruling | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<EdgeFunctionErrorInfo | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const mounted = useRef(false);

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const id = searchParams.get("id");
    if (!id) return;

    (async function load() {
      try {
        // First try to read trial — if it has verdicts, great. If not, generate them.
        const { data: trialData } = await supabase!
          .from("trials")
          .select("*")
          .eq("id", id)
          .single();
        if (!mounted.current) return;

        if (!trialData) throw new Error("Trial not found");

        let row = trialData as Record<string, unknown>;
        const hasVerdicts = rowHasVerdicts(row);

        if (!hasVerdicts) {
          const { data: fnData, error: fnError, response: fnResponse } = await supabase!.functions.invoke("verdict-section", {
            body: { trial_id: id },
          });
          if (!mounted.current) return;
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
              data.verdicts
                ? {
                    ...current,
                    verdicts: data.verdicts,
                    conversation_id: data.conversation_id,
                    generation_step: 5,
                  }
                : current,
            rowHasVerdicts,
          );
        }

        const converted = rowToTrialData(row);
        setTrial(converted);
        if (converted.ruling) {
          setRecordedRuling(converted.ruling);
          setSelected(converted.ruling);
        }
      } catch (e) {
        console.error("Failed to load trial:", e);
        if (mounted.current) {
          setLoadError({ message: "Something went wrong. Please try again.", isRateLimited: false });
          setLoading(false);
        }
        return;
      }
      if (mounted.current) setLoading(false);
    })();

    return () => { mounted.current = false; };
  }, [searchParams, retryKey]);

  async function handleSubmit() {
    if (!selected || !trial || recordedRuling) return;

    setSubmitting(true);
    setSubmitError(null);

    pendoTrack("verdict_delivered", {
      trial_id: trial.id,
      ruling: selected,
      gut_call: trial.intake.gutCall ?? "none",
      gut_mismatch: trial.intake.gutCall ? selected !== trial.intake.gutCall : false,
      case_title: trial.case_title,
      is_sample: trial.isSample ?? false,
    });

    try {
      const { error, response } = await supabase!.functions.invoke("record-ruling", {
        body: { trial_id: trial.id, ruling: selected },
      });

      if (error) {
        const info = await parseEdgeFunctionError(error, response);
        if (response?.status === 409) {
          const { data: fresh } = await supabase!
            .from("trials")
            .select("ruling")
            .eq("id", trial.id)
            .single();
          const existing = fresh?.ruling as Ruling | undefined;
          if (existing) {
            setRecordedRuling(existing);
            setSelected(existing);
          }
          setSubmitError("This case already has a recorded ruling. Your original verdict stands.");
        } else {
          setSubmitError(info.message);
        }
        setSubmitting(false);
        return;
      }

      setRecordedRuling(selected);

      const count = parseInt(localStorage.getItem("fc-cases-tried") || "0", 10);
      localStorage.setItem("fc-cases-tried", String(count + 1));
      const rulings = JSON.parse(localStorage.getItem("fc-rulings") || "[]");
      rulings.push({ id: trial.id, ruling: selected, caseTitle: trial.case_title, timestamp: Date.now() });
      localStorage.setItem("fc-rulings", JSON.stringify(rulings));
      const lastRuling = localStorage.getItem("fc-last-ruling") || "";
      const streak = parseInt(localStorage.getItem("fc-streak") || "0", 10);
      if (lastRuling === selected) {
        localStorage.setItem("fc-streak", String(streak + 1));
      } else {
        localStorage.setItem("fc-streak", "1");
      }
      localStorage.setItem("fc-last-ruling", selected);
      router.push(`/verdict/${trial.id}?ruling=${selected}` + (trial.intake.gutCall ? `&gut=${trial.intake.gutCall}` : ""));
    } catch {
      setSubmitError("Failed to record your ruling. Please try again.");
      setSubmitting(false);
    }
  }

  const rulingLocked = recordedRuling !== null;
  const lockedLabel = recordedRuling
    ? (RULING_OPTIONS.find((o) => o.key === recordedRuling)?.label ?? recordedRuling)
    : null;

  if (loadError) {
    const id = searchParams.get("id");
    return (
      <StageGenerationError
        headline={
          loadError.isRateLimited
            ? "The court is busy right now."
            : "The bench is taking too long to prepare."
        }
        isRateLimited={loadError.isRateLimited}
        message={loadError.message}
        onRetry={handleRetry}
        backHref={id ? `/trial/cross?id=${id}` : undefined}
        backLabel="Back to cross-examination"
      />
    );
  }

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  return (
    <div className="min-h-screen flex flex-col wood-panel relative">
      <CourtroomBackground opacity={0.1} />

      <header className="border-b border-court-800 relative z-10">
        <div className={`${trialStageHeaderClass} px-6 py-3 flex items-center justify-between`}>
          <Link href={`/trial/cross?id=${trial.id}`} className="flex items-center gap-2 group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-[10px] text-court-400 group-hover:text-court-200 font-mono uppercase tracking-[0.15em] transition-colors">Back</span>
          </Link>
          <div className="flex items-center gap-4">
            <SiteHomeLink />
            <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">The Ruling</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 px-6 py-4 pb-8 relative z-10">
        <div className={`${trialStageShellClass} flex-1 flex flex-col min-h-0 animate-page-enter`}>
          <div className="text-center mb-2 shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-500">Stage 5 of 5</span>
          </div>

          <div className="shrink-0">
            <StageProgress current={5} />
          </div>

          <div className="flex-1 min-h-0 mt-2">
          <CounselStageLayout
            portrait={<JudgePortrait size="medium" reaction="neutral" />}
            portraitLarge={<JudgePortrait size="full" reaction="neutral" />}
            name={CAST.judge.name}
            title="Presiding Judge"
            footer={
              <div className="animate-fade-in-up flex flex-col items-center justify-center gap-3 w-full">
                {submitError && (
                  <p className="text-sm text-red-400/90 font-legal text-center" role="alert">
                    {submitError}
                  </p>
                )}
                {rulingLocked && recordedRuling ? (
                  <Link
                    href={`/verdict/${trial.id}?ruling=${recordedRuling}` + (trial.intake.gutCall ? `&gut=${trial.intake.gutCall}` : "")}
                    className="group inline-flex items-center justify-center gap-2.5 min-w-[12rem] px-8 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-colors duration-200 text-base"
                  >
                    View your verdict
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!selected || submitting}
                    className="inline-flex items-center justify-center gap-2.5 min-w-[12rem] px-8 py-3 bg-gold-500 hover:bg-gold-400 disabled:bg-court-700 disabled:text-court-500 text-court-950 font-semibold rounded-sm transition-colors duration-200 text-base"
                  >
                    {submitting ? "Recording ruling..." : "Read the verdict"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            }
          >
            <div className="text-center animate-fade-in-up">
              <h1 className="font-display text-lg lg:text-xl font-bold text-gold-500 mb-1">
                How do you rule, Your Honor?
              </h1>
              <p className="text-court-400 text-xs lg:text-sm font-legal">
                Case: <span className="text-court-200">{trial.case_title}</span>
              </p>
              {!rulingLocked && selected && (
                <p className="text-court-500 text-[11px] mt-1 font-legal italic">
                  Select a different ruling anytime before you read the verdict.
                </p>
              )}
            </div>

            {rulingLocked && (
              <div
                className="rounded-sm border border-gold-500/60 bg-gold-500/10 px-3 py-2.5 text-center"
                role="status"
              >
                <p className="text-gold-300 text-xs lg:text-sm font-semibold">
                  Ruling recorded: {lockedLabel}
                </p>
                <p className="text-court-300 text-[11px] mt-1 font-legal italic">
                  The court&apos;s verdict is final for this case.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-2.5 items-stretch">
              {RULING_OPTIONS.map((option, i) => {
                const isSelected = selected === option.key;
                const verdict = trial.verdicts?.[option.key];
                const label = verdict?.label ?? option.label;
                const description = verdict?.description ?? option.description;
                const sentence = verdict?.sentence ?? option.sentence;
                return (
                  <ScrollworkBorder key={option.key} className="h-full">
                    <button
                      type="button"
                      onClick={() => { if (!rulingLocked) setSelected(option.key); }}
                      disabled={rulingLocked}
                      className={`w-full h-full min-h-[4.75rem] border rounded-sm text-left transition-colors duration-200 animate-fade-in-up ${
                        rulingLocked ? "cursor-default" : "cursor-pointer"
                      } ${
                        isSelected
                          ? "border-gold-500 bg-gold-500/10 shadow-[0_0_16px_rgba(212,175,55,0.1)]"
                          : `border-court-700 bg-court-900/50 ${rulingLocked ? "opacity-60" : option.bgClass + " hover:border-court-500"}`
                      }`}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="p-2.5 lg:p-3 h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5 shrink-0">
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-gold-500" : "border-court-500"
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />}
                          </div>
                          <span className={`font-serif text-xs lg:text-sm font-bold transition-colors ${
                            isSelected ? "gold-foil" : "text-court-200"
                          }`}>
                            {label}
                          </span>
                        </div>
                        <p className="text-court-500 text-[10px] lg:text-[11px] ml-5 leading-snug line-clamp-2">{description}</p>
                        <div className={`ml-5 mt-1 pt-1 border-t min-h-[2.5rem] ${isSelected ? "border-gold-500/20" : "border-transparent"}`}>
                          {isSelected && (
                            <p className="font-legal text-court-400 text-[10px] lg:text-[11px] italic line-clamp-2">
                              &ldquo;{sentence}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </ScrollworkBorder>
                );
              })}
            </div>

          </CounselStageLayout>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center wood-panel">
      <div className="flex flex-col items-center gap-4">
        <div className="text-court-400 font-serif">Preparing the bench...</div>
      </div>
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

export default function RulingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RulingContent />
    </Suspense>
  );
}