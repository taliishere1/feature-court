"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData, Ruling } from "@/lib/types";
import { CourtSeal, StageProgress, OrnateDivider, ScrollworkBorder } from "@/components/court-components";

const RULING_OPTIONS: { key: Ruling; label: string; description: string; icon: string; color: string }[] = [
  { key: "ship", label: "Ship It", description: "Full speed ahead. This decision is sound.", icon: "M5 13l4 4L19 7", color: "var(--color-stamp-ship)" },
  { key: "kill", label: "Kill It", description: "Stop. This isn't the right move.", icon: "M6 6l12 12M18 6L6 18", color: "var(--color-stamp-kill)" },
  { key: "revise", label: "Send Back", description: "Revise and resubmit with changes.", icon: "M4 4v5h5M20 20v-5h-5", color: "var(--color-stamp-revise)" },
  { key: "mistrial", label: "Mistrial", description: "Need more data to make the call.", icon: "M12 8v4l3 3M12 2a10 10 0 100 20", color: "var(--color-stamp-mistrial)" },
];

function RulingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ruling | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    fetch(`/api/trial?id=${id}`)
      .then((r) => r.json())
      .then(setTrial)
      .finally(() => setLoading(false));
  }, [searchParams]);

  function handleSubmit() {
    if (!selected || !trial) return;

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
          <div className="text-center mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-500">Stage 5 of 5</span>
          </div>

          <StageProgress current={5} />

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-2 animate-fade-in-up">
              <CourtSeal className="w-7 h-7 text-gold-500" />
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-court-100">
                How do you rule, Your Honor?
              </h1>
              <CourtSeal className="w-7 h-7 text-gold-500" />
            </div>
            <p className="text-court-400 text-sm font-legal animate-fade-in-up stagger-1">
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
                    className={`w-full border rounded-sm text-left transition-all duration-300 animate-fade-in-up ${
                      isSelected
                        ? "border-gold-500 bg-gold-500/10 shadow-[0_0_20px_rgba(212,175,55,0.12)]"
                        : "border-court-700 bg-court-900/50 hover:border-court-500"
                    }`}
                    style={{ animationDelay: `${i * 0.1}s` }}
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
                      <p className="text-court-500 text-xs ml-8 leading-relaxed">{option.description}</p>
                    </div>
                    {isSelected && (
                      <div className="h-0.5 bg-gradient-to-r from-gold-500 to-transparent" />
                    )}
                  </button>
                </ScrollworkBorder>
              );
            })}
          </div>

          <div className="text-center animate-fade-in-up stagger-5">
            <button
              onClick={handleSubmit}
              disabled={!selected}
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-court-700 disabled:text-court-500 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base"
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
        <CourtSeal className="w-8 h-8 text-gold-500" animated />
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