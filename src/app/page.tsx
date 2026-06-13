"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { CourtSeal, InteractiveGavel, useSoundEffects } from "@/components/court-components";
import { Ruling } from "@/lib/types";

export default function LandingPage() {
  const { playGavelKnock, playPaperRustle } = useSoundEffects();
  const [casesTried, setCasesTried] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastRuling, setLastRuling] = useState<Ruling | null>(null);

  // Intro sequence
  const [intro, setIntro] = useState({ content: false, cta: false });
  const played = useRef(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem("fc-cases-tried") || "0", 10);
    setCasesTried(count);
    setStreak(parseInt(localStorage.getItem("fc-streak") || "0", 10));
    setLastRuling(localStorage.getItem("fc-last-ruling") as Ruling | null);
  }, []);

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    const speed = casesTried > 0 ? 0.5 : 1;
    setTimeout(() => {
      setIntro((s) => ({ ...s, content: true }));
      playPaperRustle();
    }, 200 * speed);
    setTimeout(() => {
      setIntro((s) => ({ ...s, cta: true }));
    }, 800 * speed);
  }, [casesTried, playPaperRustle]);

  const handleGavelStrike = () => {
    playGavelKnock();
  };

  return (
    <div className="min-h-screen flex flex-col app-bg relative">

      {/* Header */}
      <header className={`relative z-10 border-b border-court-800/50 transition-all duration-700 ${intro.content ? "opacity-100" : "opacity-0"}`}>
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CourtSeal className="w-5 h-5 text-gold-400" />
            <span className="text-sm font-serif text-court-200 tracking-wide">Feature Court</span>
          </div>
          <div className="flex items-center gap-4">
            {casesTried > 0 && (
              <span className="text-[11px] text-court-500">
                <span className="text-gold-400">{casesTried}</span> case{casesTried !== 1 ? "s" : ""}
              </span>
            )}
            <Link href="/gallery" className="text-xs text-court-500 hover:text-court-200 transition-colors">
              Hall of Verdicts
            </Link>
          </div>
        </div>
        {casesTried > 0 && (
          <div className="border-t border-court-800/50 px-6 py-1">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <p className="text-[10px] text-court-500 italic font-body">Welcome back, Your Honor.</p>
              {streak >= 2 && lastRuling && (
                <p className="text-[10px] text-court-500">
                  <span className="text-gold-400">{streak}</span>-case {lastRuling} streak
                </p>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="max-w-lg mx-auto text-center">

          {/* Gavel + Title */}
          <div className={`transition-all duration-700 ${intro.content ? "animate-fade-up" : "opacity-0"}`}>
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 text-[10px] text-court-500 font-mono uppercase tracking-[0.25em] mb-4">
                <span className="accent-bar-left inline-block" />
                In the Court of Product Decisions
                <span className="accent-bar-left inline-block" />
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl text-court-100 leading-[1.1] mb-4 tracking-tight">
                Feature Court
              </h1>

              <p className="text-sm text-court-400 leading-relaxed max-w-sm mx-auto font-body">
                Put your product decision on trial. The prosecution tears it apart. The defense fights for it. You deliver the verdict.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className={`flex items-center justify-center gap-3 transition-all duration-700 ${intro.cta ? "animate-fade-up" : "opacity-0 pointer-events-none"}`}>
            <Link
              href="/file"
              className="btn btn-primary"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              File a case
            </Link>
            <Link
              href="/trial/arraignment?sample=0"
              className="btn btn-secondary"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3L14 7L18 8L15 11L16 15L12 13L8 15L9 11L6 8L10 7L12 3Z" />
              </svg>
              Sample case
            </Link>
          </div>

          {casesTried > 0 && intro.cta && (
            <p className="text-[10px] text-court-500 font-mono mt-5">
              {casesTried} case{casesTried !== 1 ? "s" : ""} presided
              {streak >= 2 && lastRuling && <> &middot; {streak}-{lastRuling} streak</>}
            </p>
          )}
        </div>

        {/* How it works */}
        <div className={`max-w-2xl w-full mt-16 transition-all duration-1000 ${intro.cta ? "opacity-100" : "opacity-0"}`}>
          <div className="accent-bar mb-6" />
          <div className="grid grid-cols-3 gap-4">
            {steps.map((step, i) => (
              <div key={step.title} className="stage-card text-center">
                <p className="text-[10px] font-mono text-gold-500/60 mb-2">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="text-xs font-medium text-court-200 mb-1 font-serif">{step.title}</h3>
                <p className="text-[11px] text-court-500 leading-relaxed font-body">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-court-800/50 px-6 py-3 relative z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] text-court-600">
          <span className="font-mono">Feature Court &middot; 2026</span>
          <span className="font-mono tracking-wider">All Rise</span>
        </div>
      </footer>
    </div>
  );
}

const steps = [
  { title: "Present Your Case", description: "File the product decision you're wrestling with." },
  { title: "Hear the Arguments", description: "Both sides make their case. Cross-examination follows." },
  { title: "Deliver Your Verdict", description: "Ship it, kill it, revise it, or call a mistrial." },
];