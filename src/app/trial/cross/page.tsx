"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { StageProgress, OrnateDivider, CaseDocketHeader, LegalPaper, BailiffAnnouncement } from "@/components/court-components";
import { useSound } from "@/lib/use-sound";

function CrossContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { playGavel, playRustle } = useSound();
  const playedRef = useRef(false);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    fetch(`/api/trial?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTrial(data);
        setChecked(data.cross_examination.map(() => -1));
      })
      .finally(() => {
        setLoading(false);
        if (!playedRef.current) {
          setTimeout(() => { playGavel(); playedRef.current = true; }, 300);
        }
      });
  }, [searchParams, playGavel]);

  function handleSubmit() {
    if (checked.some((c) => c < 0)) return;
    setSubmitting(true);
    playGavel();
    const id = searchParams.get("id");

    if (typeof window !== "undefined" && window.pendo) {
      window.pendo.track("cross_examination_submitted", {
        trial_id: id,
        question_count: trial?.cross_examination.length ?? 0,
        total_answer_length: answers.reduce((sum, a) => sum + a.length, 0),
        case_title: trial?.case_title ?? "",
      });
    }

    router.push(`/trial/ruling?id=${id}`);
  }

  // Generate multiple choice options based on the question
  function getOptions(question: string, index: number): string[] {
    const options = [
      `We should prioritize user feedback — if ${question.toLowerCase().includes("metric") ? "metrics drop" : "users are asking"}, we listen.`,
      `The data supports it, and waiting means missing the window. Bold decisions win.`,
      `Let's validate with a small test before committing fully.`,
    ];
    // Slightly vary options based on index for variety
    if (index % 3 === 1) {
      options[0] = `Trust the team's conviction. Sometimes you have to lead, not follow.`;
      options[2] = `Compromise: ship a minimal version and iterate based on real usage.`;
    } else if (index % 3 === 2) {
      options[0] = `The cost of inaction is higher than the risk of acting.`;
      options[1] = `Push back. Not every user request is a strategy.`;
    }
    return options;
  }

  // Bailiff reactions based on choice
  const bailiffReactions = [
    "The Bailiff nods thoughtfully.",
    "The Bailiff scribbles a note.",
    "The Bailiff raises an eyebrow.",
    "A murmur runs through the gallery.",
  ];

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  return (
    <div className="min-h-screen flex flex-col wood-panel">
      <div className="courtroom-scene" />
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
          <CaseDocketHeader
            caseTitle={trial.case_title}
            caseId={trial.id}
            stageLabel="Cross-Examination"
            stageNum={4}
          />

          <StageProgress current={4} />

          <BailiffAnnouncement text="The court has heard both sides. Before you rule, you must answer." />

          <div className="mt-8 space-y-8">
            {trial.cross_examination.map((question, i) => {
              const options = getOptions(question, i);
              const selected = checked[i];
              return (
                <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${0.25 + i * 0.2}s` }}>
                  <LegalPaper>
                    <div className="flex items-center gap-2 mb-3" style={{ position: "relative", zIndex: 2 }}>
                      <span className="font-mono text-[10px] text-gold-500">Interrogatory №{i + 1}</span>
                    </div>
                    <p className="text-court-200 font-serif text-base mb-4 leading-relaxed" style={{ position: "relative", zIndex: 2 }}>
                      {question}
                    </p>
                    <div className="space-y-2" style={{ position: "relative", zIndex: 2 }}>
                      {options.map((opt, oi) => (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => {
                            const next = [...checked];
                            next[i] = oi;
                            setChecked(next);
                            playRustle();
                          }}
                          className={`w-full text-left px-4 py-3 rounded-sm border text-sm transition-all duration-200 hover-lift btn-press ${
                            selected === oi
                              ? "border-gold-500 bg-gold-500/10 text-gold-200"
                              : "border-court-700 text-court-400 hover:border-court-500 hover:text-court-200"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`font-mono text-[10px] mt-0.5 ${selected === oi ? "text-gold-500" : "text-court-600"}`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="font-legal leading-relaxed">{opt}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Bailiff reaction */}
                    {selected >= 0 && (
                      <div className="mt-3 pt-3 border-t border-court-800 animate-fade-in-up" style={{ position: "relative", zIndex: 2 }}>
                        <p className="text-court-500 text-[10px] font-mono italic">
                          &ldquo;{bailiffReactions[i % bailiffReactions.length]}&rdquo;
                        </p>
                      </div>
                    )}
                  </LegalPaper>
                </div>
              );
            })}
          </div>

          <OrnateDivider className="pt-8 pb-6" />

          <div className="text-center animate-fade-in-up stagger-5">
            <button
              onClick={handleSubmit}
              disabled={submitting || checked.some((c) => c < 0)}
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-court-700 disabled:text-court-500 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base hover-lift btn-press"
            >
              {submitting ? (
                <>Delivering ruling...</>
              ) : (
                <>
                  Deliver your ruling
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
            {checked.some((c) => c < 0) && (
              <p className="text-court-600 text-[10px] mt-3 font-mono uppercase tracking-[0.2em]">
                Answer all questions before ruling
              </p>
            )}
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