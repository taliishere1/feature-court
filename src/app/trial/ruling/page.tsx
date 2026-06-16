"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData, Ruling } from "@/lib/types";
import { StageProgress, ScrollworkBorder, CourtroomBackground, DramaticPause } from "@/components/court-components";

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
  const [showOptions, setShowOptions] = useState(false);
  const [readyClicked, setReadyClicked] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
  const [dramaticPause, setDramaticPause] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const id = searchParams.get("id");
    if (!id) return;
    fetch(`/api/trial?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (mounted.current) setTrial(data);
      })
      .finally(() => setLoading(false));
    return () => { mounted.current = false; };
  }, [searchParams]);

  const handleReadyToRule = () => {
    setReadyClicked(true);
    setLetterbox(true);
    // Dramatic pause with letterbox
    setTimeout(() => { setDramaticPause(true); }, 300);
    setTimeout(() => {
      setDramaticPause(false);
      setLetterbox(false);
      setShowOptions(true);
    }, 1500);
  };

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

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  return (
    <div className={`min-h-screen flex flex-col wood-panel relative ${letterbox ? "letterbox-active" : ""}`}>
      <CourtroomBackground opacity={0.1} />
      <DramaticPause active={dramaticPause} />

      {/* Letterbox bars */}
      <div className="letterbox-top" />
      <div className="letterbox-bottom" />

      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href={`/trial/cross?id=${trial.id}`} className={`flex items-center gap-2 group ${showOptions ? "" : ""}`}>
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

          {/* Dramatic pause - click to reveal options */}
          {!showOptions ? (
            <div className="text-center animate-fade-in-up stagger-2">
              <div className="parchment p-6 mb-8 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">The Bench</span>
                </div>
                <p className="text-court-300 font-legal italic text-lg leading-relaxed mb-6">
                  &ldquo;You have heard both sides. The evidence has been presented.
                  The arguments have been made. Now you must decide.&rdquo;
                </p>
                <button
                  onClick={handleReadyToRule}
                  disabled={readyClicked}
                  className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-court-700 disabled:text-court-500 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press"
                >
                  {readyClicked ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Summoning the options...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                      Ready to rule
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
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

              <div className="text-center animate-fade-in-up stagger-5">
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