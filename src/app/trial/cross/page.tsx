"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { CourtSeal, StageProgress, OrnateDivider, useSoundEffects } from "@/components/court-components";

const BAILIFF_REACTIONS: Record<string, Record<number, string>> = {
  confident: {
    0: "\u201cConfidence \u2014 a dangerous currency in this court.\u201d",
    1: "\u201cYou speak with conviction. The jury will note it.\u201d",
  },
  cautious: {
    0: "\u201cWisdom in uncertainty. The bench appreciates humility.\u201d",
    1: "\u201cA measured response. Prudence has its place.\u201d",
  },
  contrarian: {
    0: "\u201cBold. The prosecution will have words about this.\u201d",
    1: "\u201cInteresting angle. The Advocate would agree.\u201d",
  },
  practical: {
    0: "\u201cA pragmatic answer. The numbers matter here.\u201d",
    1: "\u201cPracticality \u2014 the unsung virtue of good judgment.\u201d",
  },
  honest: {
    0: "\u201cHonesty. Rare in these chambers.\u201d",
    1: "\u201cTruth-telling. The court values candor.\u201d",
  },
};

const CHOICES: Record<number, { label: string; reaction: keyof typeof BAILIFF_REACTIONS; text: string }[]> = {
  0: [
    { label: "The metric goes flat", reaction: "honest", text: "I'll watch it closely and kill this if it dips." },
    { label: "It'll go up \u2014 I believe in this", reaction: "confident", text: "Growth. If I didn't believe in this, I wouldn't be here." },
    { label: "I'd set a clear guardrail", reaction: "practical", text: "I'll define the metric upfront and set a decision gate." },
  ],
  1: [
    { label: "It's real signal", reaction: "confident", text: "I've done the research. This isn't FOMO." },
    { label: "Honestly? Maybe FOMO", reaction: "cautious", text: "It could be. Sometimes FOMO is just early market awareness." },
    { label: "Both \u2014 signal AND urgency", reaction: "contrarian", text: "Signal says go, urgency says now. Both." },
  ],
};

function CrossContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChoices, setSelectedChoices] = useState<Record<number, number | null>>({});
  const [bailiffMessages, setBailiffMessages] = useState<(string | null)[]>([null, null]);
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
          setRevealed(true);
          playPaperRustle();
        }
      })
      .finally(() => setLoading(false));
    return () => { mounted.current = false; };
  }, [searchParams, playPaperRustle]);

  const handleChoice = useCallback((questionIdx: number, choiceIdx: number) => {
    setSelectedChoices((prev) => ({ ...prev, [questionIdx]: choiceIdx }));
    const choices = CHOICES[questionIdx];
    if (!choices) return;
    const choice = choices[choiceIdx];
    const reactions = BAILIFF_REACTIONS[choice.reaction];
    const msg = reactions[questionIdx] || reactions[0];
    setBailiffMessages((prev) => {
      const next = [...prev];
      next[questionIdx] = msg;
      return next;
    });
    playPaperRustle();
  }, [playPaperRustle]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numQuestions = trial?.cross_examination.length || 0;
    const allAnswered = Array.from({ length: numQuestions }).every((_, i) => selectedChoices[i] !== undefined);
    if (!allAnswered) return;
    setSubmitting(true);
    playGavelKnock();
    const id = searchParams.get("id");
    router.push(`/trial/ruling?id=${id}`);
  }

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  const numQuestions = Math.min(trial.cross_examination.length, 2);
  const allAnswered = Array.from({ length: numQuestions }).every((_, i) => selectedChoices[i] !== undefined);

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

          {/* Bailiff intro */}
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

          <form onSubmit={handleSubmit} className="space-y-8">
            {trial.cross_examination.slice(0, 2).map((question, i) => {
              const choices = CHOICES[i];
              const selected = selectedChoices[i];
              return (
                <div key={i} className={`transition-all duration-700 ${revealed ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${0.25 + i * 0.15}s` }}>
                  <div className="parchment-ruled p-5">
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                      <span className="font-mono text-[10px] text-gold-500">Question {i + 1}</span>
                    </div>
                    <label className="block text-court-200 font-serif text-base mb-4 leading-relaxed relative z-10">
                      {question}
                    </label>

                    {choices && (
                      <div className="space-y-2 relative z-10">
                        {choices.map((choice, ci) => (
                          <button
                            key={ci}
                            type="button"
                            onClick={() => handleChoice(i, ci)}
                            className={`w-full text-left px-4 py-3 rounded-sm border text-sm font-legal tracking-wide transition-all duration-200 cursor-pointer ${
                              selected === ci
                                ? "border-gold-500 bg-gold-500/10 text-court-100 shadow-[0_0_12px_rgba(212,175,55,0.1)]"
                                : "border-court-700 text-court-400 hover:border-court-500 hover:text-court-200"
                            }`}
                          >
                            <span className="block leading-relaxed">&ldquo;{choice.text}&rdquo;</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Bailiff reaction */}
                    {selected !== undefined && bailiffMessages[i] && (
                      <div className="mt-4 pt-3 border-t border-court-700 animate-fade-in-up relative z-10">
                        <div className="flex items-start gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-court-500 mt-0.5 shrink-0">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <p className="text-court-500 text-xs italic font-legal leading-relaxed">
                            {bailiffMessages[i]}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <OrnateDivider className="pt-4" />

            <div className="text-center animate-fade-in-up stagger-5">
              <button
                type="submit"
                disabled={submitting || !allAnswered}
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-court-700 disabled:text-court-500 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Recording answers...
                  </>
                ) : (
                  <>
                    Deliver your ruling
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
              {!allAnswered && (
                <p className="text-court-600 text-[10px] mt-3 font-mono uppercase tracking-[0.2em] animate-fade-in-up">
                  Answer both questions to proceed
                </p>
              )}
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