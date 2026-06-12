"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData, Ruling } from "@/lib/types";
import { StageProgress, OrnateDivider, CaseDocketHeader, CourtSeal, RulingPreviewCard } from "@/components/court-components";
import { useSound } from "@/lib/use-sound";

const RULING_OPTIONS: { key: Ruling; label: string; description: string; color: string }[] = [
  { key: "ship", label: "Ship It", description: "Full speed ahead. This decision is sound.", color: "var(--color-stamp-ship)" },
  { key: "kill", label: "Kill It", description: "Stop. This isn't the right move.", color: "var(--color-stamp-kill)" },
  { key: "revise", label: "Send Back", description: "Revise and resubmit with changes.", color: "var(--color-stamp-revise)" },
  { key: "mistrial", label: "Mistrial", description: "Need more data to make the call.", color: "var(--color-stamp-mistrial)" },
];

function RulingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ruling | null>(null);
  const [readyToRule, setReadyToRule] = useState(false);
  const { playGavel, playStamp } = useSound();
  const playedRef = useRef(false);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    fetch(`/api/trial?id=${id}`)
      .then((r) => r.json())
      .then(setTrial)
      .finally(() => {
        setLoading(false);
        if (!playedRef.current) {
          setTimeout(() => { playGavel(); playedRef.current = true; }, 300);
        }
      });
  }, [searchParams, playGavel]);

  function handleSelect(key: Ruling) {
    setSelected(key);
    playStamp();
  }

  function handleSubmit() {
    if (!selected || !trial) return;
    playGavel();

    if (typeof window !== "undefined" && window.pendo) {
      window.pendo.track("verdict_delivered", {
        trial_id: trial.id,
        ruling: selected,
        gut_call: trial.intake.gutCall ?? "none",
        gut_mismatch: trial.intake.gutCall ? selected !== trial.intake.gutCall : false,
        case_title: trial.case_title,
        is_sample: trial.isSample ?? false,
      });
    }

    router.push(`/verdict/${trial.id}?ruling=${selected}` + (trial.intake.gutCall ? `&gut=${trial.intake.gutCall}` : ""));
  }

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  return (
    <div className="min-h-screen flex flex-col wood-panel">
      <div className="courtroom-scene" />
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

      <main className="flex-1 px-6 py-12 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <CaseDocketHeader
            caseTitle={trial.case_title}
            caseId={trial.id}
            stageLabel="The Ruling"
            stageNum={5}
          />

          <StageProgress current={5} />

          {/* Dramatic pause: click to reveal options */}
          {!readyToRule ? (
            <div className="text-center animate-fade-in-up">
              <div className="inline-flex items-center gap-3 mb-6">
                <CourtSeal className="w-8 h-8 text-gold-500" />
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-court-100">
                  Ready to rule, Your Honor?
                </h1>
                <CourtSeal className="w-8 h-8 text-gold-500" />
              </div>
              <p className="text-court-400 text-sm font-legal mb-8 max-w-md mx-auto">
                You&apos;ve heard both sides. The evidence is before you.
                <br />
                <span className="text-court-300">The court awaits your judgment.</span>
              </p>
              <button
                onClick={() => {
                  setReadyToRule(true);
                  playGavel();
                }}
                className="group inline-flex items-center gap-2.5 px-10 py-4 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-lg hover-lift btn-press"
              >
                <svg width="18" height="18" viewBox="0 0 56 56" fill="none" className="text-court-950/60">
                  <rect x="16" y="42" width="24" height="4" rx="1" fill="currentColor" opacity="0.35" />
                  <rect x="25" y="22" width="6" height="22" rx="1.5" fill="currentColor" opacity="0.55" />
                  <rect x="13" y="6" width="30" height="18" rx="3" fill="currentColor" opacity="0.85" />
                </svg>
                Bang the gavel — I am ready
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8 animate-fade-in-down">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-court-100">
                  How do you rule, Your Honor?
                </h1>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 animate-fade-in-up">
                {RULING_OPTIONS.map((option, i) => {
                  const preview = selected === option.key
                    ? trial.verdicts[option.key].sentence
                    : trial.verdicts[option.key].sentence;
                  return (
                    <RulingPreviewCard
                      key={option.key}
                      label={option.label}
                      description={option.description}
                      preview={preview}
                      color={option.color}
                      isSelected={selected === option.key}
                      onClick={() => handleSelect(option.key)}
                    />
                  );
                })}
              </div>

              <div className="text-center animate-fade-in-up stagger-5">
                <button
                  onClick={handleSubmit}
                  disabled={!selected}
                  className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-court-700 disabled:text-court-500 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base hover-lift btn-press"
                >
                  Read the verdict
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          )}
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