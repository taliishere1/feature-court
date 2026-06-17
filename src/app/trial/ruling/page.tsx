"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData, Ruling } from "@/lib/types";
import { StageProgress, ScrollworkBorder, CourtroomBackground } from "@/components/court-components";
import { supabase } from "@/lib/supabase";
import { rowToTrialData, resolveTrialRowAfterGeneration, rowHasVerdicts } from "@/lib/store";
import { EdgeFunctionErrorInfo, parseEdgeFunctionError } from "@/lib/edge-function-errors";
import { pendoTrack } from "@/lib/pendo-track";
import { StageGenerationError } from "@/components/stage-generation-error";

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

        setTrial(rowToTrialData(row));
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

  function handleSubmit() {
    if (!selected || !trial) return;

    pendoTrack("verdict_delivered", {
      trial_id: trial.id,
      ruling: selected,
      gut_call: trial.intake.gutCall ?? "none",
      gut_mismatch: trial.intake.gutCall ? selected !== trial.intake.gutCall : false,
      case_title: trial.case_title,
      is_sample: trial.isSample ?? false,
    });

    // Save ruling to Supabase via edge function
    supabase!.functions.invoke("record-ruling", {
      body: { trial_id: trial.id, ruling: selected },
    }).catch((e) => console.error("Failed to save ruling:", e));

    // Local storage for instant landing page stats (legacy — will replace)
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
  }


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
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href={`/trial/cross?id=${trial.id}`} className="flex items-center gap-2 group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-[10px] text-court-400 group-hover:text-court-200 font-mono uppercase tracking-[0.15em] transition-colors">Back</span>
          </Link>
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">The Ruling</span>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <div className="text-center mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-500">Stage 5 of 5</span>
          </div>

          <StageProgress current={5} />

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-2 animate-fade-in-up">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-gold-500">
                How do you rule, Your Honor?
              </h1>
            </div>
            <p className="text-court-400 text-base font-legal animate-fade-in-up stagger-1">
              Case: <span className="text-court-200">{trial.case_title}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {RULING_OPTIONS.map((option, i) => {
              const isSelected = selected === option.key;
              return (
                <ScrollworkBorder key={option.key}>
                  <button
                    onClick={() => setSelected(option.key)}
                    className={`w-full border rounded-sm text-left transition-all duration-300 animate-fade-in-up cursor-pointer ${
                      isSelected
                        ? "border-gold-500 bg-gold-500/10 shadow-[0_0_20px_rgba(212,175,55,0.12)]"
                        : `border-court-700 bg-court-900/50 ${option.bgClass} hover:border-court-500`
                    }`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? "border-gold-500" : "border-court-500"
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-seal-appear" />}
                        </div>
                        <span className={`font-serif text-lg font-bold transition-colors ${
                          isSelected ? "gold-foil" : "text-court-200"
                        }`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-court-500 text-xs ml-8 leading-relaxed mb-2">{option.description}</p>
                      {isSelected && (
                        <div className="ml-8 mt-2 pt-2 border-t border-gold-500/20">
                          <p className="font-legal text-court-400 text-xs italic animate-fade-in-up">
                            &ldquo;{option.sentence}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="h-0.5 bg-gradient-to-r from-gold-500 to-transparent" />
                    )}
                  </button>
                </ScrollworkBorder>
              );
            })}
          </div>

          <div className="text-center animate-fade-in-up">
            <button
              onClick={handleSubmit}
              disabled={!selected}
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-court-700 disabled:text-court-500 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press"
            >
              Read the verdict
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
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