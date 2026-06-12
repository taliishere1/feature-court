"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { CourtSeal, StageProgress, OrnateDivider, CaseDocketHeader, useSoundEffects } from "@/components/court-components";

function CrossContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { playPaperRustle, playGavelKnock } = useSoundEffects();
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const id = searchParams.get("id");
    if (!id) return;
    fetch(`/api/trial?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (mounted.current) {
          setTrial(data);
          setAnswers(data.cross_examination.map(() => ""));
          setRevealed(true);
          playPaperRustle();
        }
      })
      .finally(() => setLoading(false));
    return () => { mounted.current = false; };
  }, [searchParams, playPaperRustle]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answers.some((a) => !a.trim())) return;
    setSubmitting(true);
    playGavelKnock();
    const id = searchParams.get("id");
    router.push(`/trial/ruling?id=${id}`);
  }

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  return (
    <div className="min-h-screen flex flex-col wood-panel">
      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href={`/trial/defense?id=${trial.id}`} className="flex items-center gap-2 group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-[10px] text-court-400 group-hover:text-court-200 font-mono uppercase tracking-[0.15em] transition-colors">Back</span>
          </Link>
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">Cross-Examination</span>
        </div>
      </header>

      <main className="flex-1 px-6 py-12 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <div className="text-center mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-court-500">Stage 4 of 5</span>
          </div>

          <StageProgress current={4} />

          <div className={`text-center mb-10 transition-all duration-700 ${revealed ? "opacity-100" : "opacity-0"}`}>
            <div className="parchment-ruled p-6 animate-fade-in-up inline-block">
              <div className="flex items-center gap-3 mb-3 justify-center relative z-10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold-500">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                </svg>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">The Bailiff addresses the bench</span>
              </div>
              <p className="text-court-300 text-sm italic font-legal leading-relaxed relative z-10">
                &ldquo;The court has heard both sides. Before you rule, you must answer.&rdquo;
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {trial.cross_examination.map((question, i) => (
              <div key={i} className={`parchment-ruled p-5 ${revealed ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${0.25 + i * 0.15}s` }}>
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <span className="font-mono text-[10px] text-gold-500">Question {i + 1}</span>
                </div>
                <label className="block text-court-200 font-serif text-base mb-3 leading-relaxed relative z-10">
                  {question}
                </label>
                <textarea
                  required
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  rows={3}
                  placeholder="Your answer..."
                  className="w-full bg-transparent border border-court-700 rounded-sm px-4 py-3 text-court-100 placeholder:text-court-600/40 focus:outline-none focus:border-gold-500/60 transition-colors resize-none text-sm font-legal tracking-wide relative z-10"
                />
              </div>
            ))}

            <OrnateDivider className="pt-4" />

            <div className="text-center animate-fade-in-up stagger-5">
              <button
                type="submit"
                disabled={submitting || answers.some((a) => !a.trim())}
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-court-700 disabled:text-court-500 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press"
              >
                Deliver your ruling
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
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
        <div className="text-court-400 font-serif">Preparing the questions...</div>
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

export default function CrossPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CrossContent />
    </Suspense>
  );
}