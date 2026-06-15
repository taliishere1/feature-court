"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { CourtSeal, StageProgress, CourtroomBackground, ProsecutorPortrait, DialogueBox, EvidenceCard, ObjectionOverlay, useSoundEffects } from "@/components/court-components";

function ProsecutionContent() {
  const searchParams = useSearchParams();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [objectionActive, setObjectionActive] = useState(false);
  const [objectionArg, setObjectionArg] = useState<number | null>(null);
  const [showNext, setShowNext] = useState(false);
  const { playGavelKnock, playPaperRustle } = useSoundEffects();
  const mounted = useRef(false);

  const prosecutorDialogues = [
    `Your Honor. Let me tell you why this is a mistake.`,
    `The evidence is clear. Here are the facts of the case.`,
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
          playGavelKnock();
        }
      })
      .finally(() => setLoading(false));
    return () => { mounted.current = false; };
  }, [searchParams, playGavelKnock]);

  const handleDialogueComplete = useCallback(() => {
    if (dialogueIndex < prosecutorDialogues.length - 1) {
      setShowContinue(true);
    } else {
      setShowEvidence(true);
    }
  }, [dialogueIndex, prosecutorDialogues.length]);

  const advanceDialogue = useCallback(() => {
    if (dialogueIndex < prosecutorDialogues.length - 1) {
      setDialogueIndex((i) => i + 1);
      setShowContinue(false);
    }
  }, [dialogueIndex, prosecutorDialogues.length]);

  const handleEvidenceClick = useCallback((idx: number) => {
    if (objectionActive) return;
    setObjectionActive(true);
    setObjectionArg(idx);
    setTimeout(() => {
      setObjectionActive(false);
      setObjectionArg(null);
      if (idx === (trial?.prosecution.arguments.length || 0) - 1) {
        setShowNext(true);
      }
    }, 1500);
  }, [objectionActive, trial]);

  // Keyboard support
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

  useEffect(() => {
    if (showEvidence) {
      playPaperRustle();
    }
  }, [showEvidence, playPaperRustle]);

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

      <main className="flex-1 px-6 pt-8 pb-48 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <div className="text-center mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-court-500">Stage 2 of 5</span>
          </div>

          <StageProgress current={2} />

          {/* Prosecutor identity badge */}
          {revealed && (
            <div className="text-center mb-6 animate-fade-in-up">
              <div className="inline-flex items-center gap-3 border border-court-700 rounded-sm px-5 py-2.5 bg-court-900/60">
                <ProsecutorPortrait size="thumb" />
                <div className="text-left">
                  <h2 className="font-serif text-sm text-court-100">Victoria Chase</h2>
                  <p className="text-court-600 text-[9px] font-mono uppercase tracking-[0.15em]">The Prosecution</p>
                </div>
              </div>
            </div>
          )}

          {/* Opening statement */}
          {revealed && (
            <div className="parchment-ruled p-5 mb-6 animate-fade-in-up max-w-lg mx-auto">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-court-500 block mb-2 relative z-10">Opening Statement</span>
              <p className="text-court-200 text-sm leading-relaxed font-legal italic relative z-10">
                &ldquo;{trial.prosecution.opening}&rdquo;
              </p>
            </div>
          )}

          {/* Evidence cards */}
          {showEvidence && (
            <div className="space-y-3 max-w-2xl mx-auto">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-court-500 text-center mb-4">Click each exhibit to examine</p>
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
            <div className="text-center mt-8 animate-fade-in-up">
              <Link
                href={`/trial/defense?id=${trial.id}`}
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press"
                onClick={() => playPaperRustle()}
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

      {/* Dialogue box - prosecutor */}
      {revealed && !showNext && (
        <>
          <DialogueBox
            portrait={<ProsecutorPortrait size="thumb" reaction={dialogueIndex === 0 ? "serious" : "neutral"} />}
            name="Victoria Chase"
            text={prosecutorDialogues[dialogueIndex]}
            color="#b91c1c"
            typingSpeed={30}
            onComplete={handleDialogueComplete}
            showContinue={showContinue}
          />
          {showContinue && (
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
        <div className="text-court-400 font-serif">Calling the first witness...</div>
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

export default function ProsecutionPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProsecutionContent />
    </Suspense>
  );
}