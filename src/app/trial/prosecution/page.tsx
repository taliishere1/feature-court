"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { StageProgress, CaseDocketHeader, LegalPaper } from "@/components/court-components";
import { useSound } from "@/lib/use-sound";

function ProsecutionContent() {
  const searchParams = useSearchParams();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const { playGavel } = useSound();
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

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  return (
    <div className="min-h-screen flex flex-col wood-panel">
      <div className="courtroom-scene" />
      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href={`/trial/arraignment?id=${trial.id}`} className="flex items-center gap-2 group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-[10px] text-court-400 group-hover:text-court-200 font-mono uppercase tracking-[0.15em] transition-colors">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-court-500">
              <path d="M12 3L14 7L18 8L15 11L16 15L12 13L8 15L9 11L6 8L10 7L12 3Z" fill="currentColor" />
            </svg>
            <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">The Prosecution</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-12 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <CaseDocketHeader
            caseTitle={trial.case_title}
            caseId={trial.id}
            stageLabel="Prosecution"
            stageNum={2}
          />

          <StageProgress current={2} />

          {/* Prosecutor identity */}
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-4 border border-court-700 rounded-sm px-6 py-3 bg-court-900/60 hover-lift">
              <div className="w-10 h-10 rounded-full border-2 border-court-600 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-court-400">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-left">
                <h2 className="font-serif text-base text-court-100">The People&apos;s Skeptic</h2>
                <p className="text-court-600 text-[10px] font-mono uppercase tracking-[0.15em]">Staff PM, 15 years of shipping</p>
              </div>
            </div>
          </div>

          {/* Opening statement */}
          <LegalPaper className="mb-8 animate-fade-in-up stagger-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">Opening Statement</span>
            </div>
            <div className="border-l-2 border-court-600 pl-4">
              <p className="text-court-200 text-base leading-relaxed font-legal tracking-wide italic">
                &ldquo;{trial.prosecution.opening}&rdquo;
              </p>
              <p className="text-court-600 text-[10px] font-mono uppercase tracking-[0.2em] mt-3">— The Prosecution</p>
            </div>
          </LegalPaper>

          {/* Arguments */}
          <div className="space-y-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500 block mb-4 animate-fade-in-up stagger-2">Exhibits</span>
            {trial.prosecution.arguments.map((arg, i) => (
              <div
                key={i}
                className="group parchment p-4 animate-evidence-slide hover-lift"
                style={{ animationDelay: `${0.25 + i * 0.15}s` }}
              >
                <div className="flex gap-4" style={{ position: "relative", zIndex: 2 }}>
                  <span className="font-mono text-[10px] text-gold-500/80 mt-0.5 shrink-0">
                    Exhibit {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-court-200 text-sm leading-relaxed font-legal">{arg}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 animate-fade-in-up stagger-5">
            <Link
              href={`/trial/defense?id=${trial.id}`}
              onClick={() => playGavel()}
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base hover-lift btn-press"
            >
              Hear the defense
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <p className="text-court-600 text-[10px] mt-3 font-mono uppercase tracking-[0.2em]">The Advocate makes the case for your decision</p>
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