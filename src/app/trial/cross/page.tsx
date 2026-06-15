"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { CourtSeal, StageProgress, CourtroomBackground, BailiffPortrait, DialogueBox, useSoundEffects } from "@/components/court-components";

const BAILIFF_REACTIONS: Record<string, Record<number, string>> = {
  confident: {
    0: "Confidence — a dangerous currency in this court.",
    1: "You speak with conviction. The jury will note it.",
  },
  cautious: {
    0: "Wisdom in uncertainty. The bench appreciates humility.",
    1: "A measured response. Prudence has its place.",
  },
  contrarian: {
    0: "Bold. The prosecution will have words about this.",
    1: "Interesting angle. The Advocate would agree.",
  },
  practical: {
    0: "A pragmatic answer. The numbers matter here.",
    1: "Practicality — the unsung virtue of good judgment.",
  },
  honest: {
    0: "Honesty. Rare in these chambers.",
    1: "Truth-telling. The court values candor.",
  },
};

const CHOICES: Record<number, { label: string; reaction: keyof typeof BAILIFF_REACTIONS; text: string }[]> = {
  0: [
    { label: "The metric goes flat", reaction: "honest", text: "I'll watch it closely and kill this if it dips." },
    { label: "It'll go up — I believe in this", reaction: "confident", text: "Growth. If I didn't believe in this, I wouldn't be here." },
    { label: "I'd set a clear guardrail", reaction: "practical", text: "I'll define the metric upfront and set a decision gate." },
  ],
  1: [
    { label: "It's real signal", reaction: "confident", text: "I've done the research. This isn't FOMO." },
    { label: "Honestly? Maybe FOMO", reaction: "cautious", text: "It could be. Sometimes FOMO is just early market awareness." },
    { label: "Both — signal AND urgency", reaction: "contrarian", text: "Signal says go, urgency says now. Both." },
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
  const [spotlight, setSpotlight] = useState(0);
  const [showQuestion, setShowQuestion] = useState<number>(0);
  const [bailiffText, setBailiffText] = useState("The court has heard both sides. Before you rule, you must answer.");
  const [showContinue, setShowContinue] = useState(false);
  const [bailiffDialogueIndex, setBailiffDialogueIndex] = useState(0);
  const { playPaperRustle, playGavelKnock } = useSoundEffects();
  const mounted = useRef(false);

  const bailiffDialogues = [
    "The court has heard both sides. Before you rule, you must answer.",
    "The court awaits your answer...",
    "One more question, Your Honor.",
  ];

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

  const handleDialogueComplete = useCallback(() => {
    setShowContinue(true);
  }, []);

  const advanceDialogue = useCallback(() => {
    setShowContinue(false);
    if (bailiffDialogueIndex === 0) {
      setBailiffDialogueIndex(1);
      setBailiffText(bailiffDialogues[1]);
      setSpotlight(1);
      setShowQuestion(0);
    }
  }, [bailiffDialogueIndex]);

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
    // Auto-advance to next question
    setTimeout(() => {
      if (questionIdx === 0) {
        setShowQuestion(1);
        setSpotlight(2);
        setBailiffDialogueIndex(2);
        setBailiffText(bailiffDialogues[2]);
      }
    }, 1200);
  }, [playPaperRustle]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numQuestions = Math.min(trial?.cross_examination.length || 0, 2);
    const allAnswered = Array.from({ length: numQuestions }).every((_, i) => selectedChoices[i] !== undefined);
    if (!allAnswered) return;
    setSubmitting(true);
    playGavelKnock();
    const id = searchParams.get("id");
    router.push(`/trial/ruling?id=${id}`);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && showContinue) {
        e.preventDefault();
        advanceDialogue();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showContinue, advanceDialogue]);

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  const numQuestions = Math.min(trial.cross_examination.length, 2);
  const allAnswered = Array.from({ length: numQuestions }).every((_, i) => selectedChoices[i] !== undefined);

  return (
    <div className="min-h-screen flex flex-col wood-panel relative">
      <CourtroomBackground opacity={0.1} />

      {/* Spotlight effect */}
      <div className={`spotlight-overlay ${spotlight > 0 ? "spotlight-intense" : ""} transition-all duration-700`} />

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

      <main className="flex-1 px-6 pt-8 pb-48 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <div className="text-center mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-court-500">Stage 4 of 5</span>
          </div>

          <StageProgress current={4} />

          {/* Questions */}
          <form onSubmit={handleSubmit} className="space-y-8 mt-8">
            {trial.cross_examination.slice(0, 2).map((question, i) => {
              const choices = CHOICES[i];
              const selected = selectedChoices[i];
              const isVisible = showQuestion === i;
              return (
                <div
                  key={i}
                  className={`transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                  {isVisible && (
                    <div className="animate-dramatic-zoom text-center">
                      <div className="parchment p-6 max-w-xl mx-auto">
                        <span className="font-mono text-[9px] text-gold-500 uppercase tracking-[0.25em] block mb-3">Question {i + 1}</span>
                        <p className="text-court-200 font-serif text-lg mb-5 leading-relaxed">{question}</p>
                        {choices && (
                          <div className="space-y-2">
                            {choices.map((choice, ci) => (
                              <button
                                key={ci}
                                type="button"
                                onClick={() => handleChoice(i, ci)}
                                disabled={selected !== undefined}
                                className={`w-full text-left px-4 py-3 rounded-sm border text-sm font-legal tracking-wide transition-all duration-200 cursor-pointer ${
                                  selected === ci
                                    ? "border-gold-500 bg-gold-500/10 text-court-100 shadow-[0_0_12px_rgba(212,175,55,0.1)]"
                                    : "border-court-700 text-court-400 hover:border-court-500 hover:text-court-200"
                                } ${selected !== undefined && selected !== ci ? "opacity-50" : ""}`}
                              >
                                <span className="block leading-relaxed">&ldquo;{choice.text}&rdquo;</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {selected !== undefined && bailiffMessages[i] && (
                          <div className="mt-4 pt-3 border-t border-court-700 animate-fade-in-up">
                            <div className="flex items-center gap-2 justify-center">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-court-500">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                              <p className="text-court-500 text-xs italic font-legal">{bailiffMessages[i]}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submit */}
            {allAnswered && (
              <div className="text-center animate-fade-in-up">
                <button
                  type="submit"
                  disabled={submitting}
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
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Dialogue box - bailiff */}
      {revealed && (
        <>
          <DialogueBox
            portrait={<BailiffPortrait size="thumb" />}
            name="Bailiff J. Docket"
            text={bailiffText}
            color="#a67c00"
            typingSpeed={25}
            onComplete={handleDialogueComplete}
            showContinue={showContinue && bailiffDialogueIndex === 0}
          />
          {showContinue && bailiffDialogueIndex === 0 && (
            <div className="fixed inset-0 z-30 cursor-pointer" onClick={advanceDialogue} />
          )}
        </>
      )}
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