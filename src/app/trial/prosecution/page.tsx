"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { StageProgress, CourtroomBackground, ProsecutorPortrait, EvidenceCard, ObjectionOverlay } from "@/components/court-components";
import { supabase } from "@/lib/supabase";
import { rowToTrialData } from "@/lib/store";
import { EdgeFunctionErrorInfo, parseEdgeFunctionError } from "@/lib/edge-function-errors";
import { StageGenerationError } from "@/components/stage-generation-error";

function ProsecutionContent() {
  const searchParams = useSearchParams();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<EdgeFunctionErrorInfo | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [objectionActive, setObjectionActive] = useState(false);
  const [showNext, setShowNext] = useState(false);
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

    let cancelled = false;

    (async function load() {
      try {
        // Read the trial first; only generate this stage if it doesn't exist yet,
        // so revisiting the page doesn't regenerate (and overwrite) the content.
        const first = await supabase!
          .from("trials")
          .select("*")
          .eq("id", id)
          .single();
        if (cancelled) return;
        if (first.error || !first.data) throw new Error("Trial not found");
        let row = first.data;

        const hasProsecution = Boolean((row.prosecution as { opening?: string } | null)?.opening);
        if (!hasProsecution) {
          const { error: fnError, response: fnResponse } = await supabase!.functions.invoke("prosecution-section", {
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

          const second = await supabase!
            .from("trials")
            .select("*")
            .eq("id", id)
            .single();
          if (cancelled) return;
          if (second.error || !second.data) throw new Error("Trial not found");
          row = second.data;
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

  const handleEvidenceClick = useCallback((idx: number) => {
    if (objectionActive) return;
    setObjectionActive(true);
    setTimeout(() => {
      setObjectionActive(false);
      if (idx === (trial?.prosecution.arguments.length || 0) - 1) {
        setShowNext(true);
      }
    }, 1500);
  }, [objectionActive, trial]);

  if (loadError) {
    return (
      <StageGenerationError
        headline={
          loadError.isRateLimited
            ? "The court is busy right now."
            : "The prosecution is taking too long to assemble."
        }
        isRateLimited={loadError.isRateLimited}
        message={loadError.message}
        onRetry={handleRetry}
      />
    );
  }
  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  return (
    <div className="min-h-screen flex flex-col wood-panel relative">
      <CourtroomBackground opacity={0.1} />
      <ObjectionOverlay active={objectionActive} side="prosecution" />

      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href={`/trial/arraignment?id=${trial.id}`} className="flex items-center gap-2 group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-[10px] text-court-400 group-hover:text-court-200 font-mono uppercase tracking-[0.15em] transition-colors">Back</span>
          </Link>
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">The Prosecution</span>
        </div>
      </header>

      <main className="flex-1 px-6 pt-4 pb-48 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <div className="text-center mb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-court-500">Stage 2 of 5</span>
          </div>

          <StageProgress current={2} />

          {/* Prosecutor identity badge */}
          {revealed && (
            <div className="text-center mb-4 animate-fade-in-up">
              <div className="inline-flex items-center gap-3 border border-court-700 rounded-sm px-4 py-2 bg-court-900/60">
                <ProsecutorPortrait size="thumb" />
                <div className="text-left">
                  <h2 className="font-serif text-sm text-court-100">Prosecutor Mary T. Bug</h2>
                  <p className="text-court-600 text-xs font-mono uppercase tracking-[0.15em]">Staff PM · Bug hunter since day one</p>
                </div>
              </div>
            </div>
          )}

          {/* Opening statement */}
          {revealed && (
            <div className="parchment-ruled p-4 mb-4 animate-fade-in-up max-w-lg mx-auto">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-court-500 block mb-1 relative z-10">Opening Statement</span>
              <p className="text-court-200 text-base leading-relaxed font-legal italic relative z-10">
                &ldquo;{trial.prosecution.opening}&rdquo;
              </p>
            </div>
          )}

          {/* Evidence cards */}
          {revealed && (
            <div className="space-y-2 max-w-2xl mx-auto">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-court-500 text-center mb-3">Click each exhibit to examine</p>
              {trial.prosecution.arguments.map((arg, i) => (
                <EvidenceCard
                  key={i}
                  exhibit={String.fromCharCode(65 + i)}
                  side="prosecution"
                  index={i}
                  onClick={() => handleEvidenceClick(i)}
                >
                  {arg}
                </EvidenceCard>
              ))}
            </div>
          )}

          {/* Next button */}
          {showNext && (
            <div className="text-center mt-4 animate-fade-in-up">
              <Link
                href={`/trial/defense?id=${trial.id}`}
                className="group inline-flex items-center gap-2.5 px-8 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press"
              >
                Hear the defense
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
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
      <div className="text-court-400 font-serif">Calling the first witness...</div>
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

export default function ProsecutionPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProsecutionContent />
    </Suspense>
  );
}