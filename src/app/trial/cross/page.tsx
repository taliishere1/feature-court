"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { StageProgress, CourtroomBackground, BailiffPortrait, DialogueBox } from "@/components/court-components";
import { supabase } from "@/lib/supabase";

const BAILIFF_DIALOGUES: string[] = [
  "The court has heard both sides. Before you rule, you must answer.",
  "Let us begin with the first question.",
  "Well reasoned. One more question to answer.",
];

function CrossContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<Record<number, number | null>>({});
  const [bailiffMessages, setBailiffMessages] = useState<(string | null)[]>([null, null]);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showQuestion, setShowQuestion] = useState<number>(-1);
  const [bailiffText, setBailiffText] = useState("The court has heard both sides. Before you rule, you must answer.");
  const [showContinue, setShowContinue] = useState(false);
  const [bailiffDialogueIndex, setBailiffDialogueIndex] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const mounted = useRef(false);

  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  const trialId = searchParams.get("id");

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

        const cross = row.cross_examination as unknown[] | null;
        const hasCross = Array.isArray(cross) && cross.length > 0;
        if (!hasCross) {
          const { error: fnError } = await supabase!.functions.invoke("cross-section", {
            body: { trial_id: id },
          });
          if (cancelled) return;
          if (fnError) throw new Error(fnError.message);

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
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => { mounted.current = false; cancelled = true; };
  }, [searchParams, retryKey]);

  const handleDialogueComplete = useCallback(() => {
    setShowContinue(true);
  }, []);

  const advanceDialogue = useCallback(() => {
    setShowContinue(false);
    if (bailiffDialogueIndex === 0) {
      setBailiffDialogueIndex(1);
      setBailiffText(BAILIFF_DIALOGUES[1]);
      setShowQuestion(0);
    }
  }, [bailiffDialogueIndex]);

  const handleChoice = useCallback((questionIdx: number, choiceIdx: number) => {
    setSelectedChoices((prev) => ({ ...prev, [questionIdx]: choiceIdx }));
    const questions = trial?.cross_examination;
    if (!questions || !questions[questionIdx]) return;
    const choice = questions[questionIdx].choices[choiceIdx];
    if (!choice) return;
    setBailiffMessages((prev) => {
      const next = [...prev];
      next[questionIdx] = choice.bailiff_reaction;
      return next;
    });
    // Auto-advance to next question
    setTimeout(() => {
      if (questionIdx === 0) {
        setShowQuestion(1);
        setBailiffDialogueIndex(2);
        setBailiffText(BAILIFF_DIALOGUES[2]);
      }
    }, 1200);
  }, [trial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numQuestions = Math.min(trial?.cross_examination.length || 0, 2);
    const allAnswered = Array.from({ length: numQuestions }).every((_, i) => selectedChoices[i] !== undefined);
    if (!allAnswered) return;
    setSubmitting(true);
    const id = searchParams.get("id");

    if (typeof window !== "undefined" && window.pendo) {
      window.pendo.track("cross_examination_submitted", {
        trial_id: id,
        question_count: trial?.cross_examination.length ?? 0,
        total_answer_length: Object.keys(selectedChoices).length,
        case_title: trial?.case_title ?? "",
      });
    }

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

  if (error) return <TimeoutState onRetry={handleRetry} trialId={trialId} />;
  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  const numQuestions = Math.min(trial.cross_examination.length, 2);
  const allAnswered = Array.from({ length: numQuestions }).every((_, i) => selectedChoices[i] !== undefined);

  return (
    <div className="min-h-screen flex flex-col wood-panel relative">
      <CourtroomBackground opacity={0.1} />

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
            {trial.cross_examination.slice(0, 2).map((cq, i) => {
              const choices = cq.choices;
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
                        <p className="text-court-200 font-serif text-lg mb-5 leading-relaxed">{cq.question}</p>
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
            name="Bailiff Sprint"
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
      <div className="text-court-400 font-serif">Preparing the questions...</div>
    </div>
  );
}

function migrateCrossExamination(data: unknown): Array<{ question: string; choices: Array<{ label: string; text: string; bailiff_reaction: string }> }> {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
    return (data as string[]).map((q) => ({
      question: q,
      choices: [
        { label: "Yes", text: "Yes. The evidence supports moving forward.", bailiff_reaction: "Decisive. The court respects conviction." },
        { label: "No", text: "No. There are too many open questions.", bailiff_reaction: "Caution has its place in these chambers." },
        { label: "I need more data", text: "I need more data before I can answer that.", bailiff_reaction: "Prudence over haste. Noted." },
      ],
    }));
  }
  return (data || []) as Array<{ question: string; choices: Array<{ label: string; text: string; bailiff_reaction: string }> }>;
}

function rowToTrialData(row: Record<string, unknown>): TrialData {
  return {
    id: row.id as string,
    intake: row.intake as TrialData["intake"],
    charge: row.charge as string,
    case_title: row.case_title as string,
    prosecution: row.prosecution as TrialData["prosecution"],
    defense: row.defense as TrialData["defense"],
    cross_examination: migrateCrossExamination(row.cross_examination as unknown),
    verdicts: row.verdicts as TrialData["verdicts"],
    createdAt: new Date(row.created_at as string).getTime(),
    isSample: (row.is_sample as boolean) || undefined,
    ruling: row.ruling as TrialData["ruling"] | undefined,
    generationStep: row.generation_step as number | undefined,
  };
}

function TimeoutState({ onRetry, trialId }: { onRetry: () => void; trialId: string | null }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 wood-panel">
      <p className="text-court-400 font-serif">The questions are taking too long to prepare.</p>
      <p className="text-court-600 text-sm font-legal">Generation timed out. You can retry or start over.</p>
      {trialId && (
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
      <Link href="/file" className="inline-block text-sm text-gold-500 hover:text-gold-400 underline mt-2">
        File a new case
      </Link>
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