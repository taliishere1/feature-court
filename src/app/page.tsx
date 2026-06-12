"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CourtSeal,
  OrnateDivider,
  GoldParticles,
  InteractiveGavel,
  ConfettiBurst,
  BailiffAnnouncement,
} from "@/components/court-components";
import { useSound } from "@/lib/use-sound";
import { useGameStats } from "@/lib/use-game-stats";

export default function LandingPage() {
  const { playGavel } = useSound();
  const { stats, getBailiffGreeting } = useGameStats();
  const [greeting, setGreeting] = useState("");
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    setGreeting(getBailiffGreeting());
  }, [getBailiffGreeting]);

  function handleGavelBang() {
    playGavel();
  }

  function handleFileCase() {
    setConfetti(true);
    playGavel();
    setTimeout(() => setConfetti(false), 3000);
  }

  return (
    <div className="min-h-screen flex flex-col wood-panel relative">
      <ConfettiBurst active={confetti} count={30} />
      <GoldParticles count={15} />

      {/* Courtroom scene backdrop */}
      <div className="courtroom-scene" />

      {/* Courtroom header bar */}
      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CourtSeal className="w-9 h-9 text-gold-500" animated />
            <div>
              <span className="font-serif text-xl text-court-100 tracking-wide leading-none block">
                Feature Court
              </span>
              <span className="text-[9px] text-court-600 font-mono uppercase tracking-[0.2em] leading-none mt-0.5 block">
                Est. 2026 · District of Product Decisions
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Cases tried counter */}
            {stats.casesTried > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-court-500 font-mono uppercase tracking-[0.15em] border border-court-700 px-2.5 py-1 rounded-sm">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold-500">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                {stats.casesTried} case{stats.casesTried !== 1 ? "s" : ""} tried
              </span>
            )}
            <Link
              href="/gallery"
              className="group flex items-center gap-2 text-sm text-court-400 hover:text-court-200 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-court-500 group-hover:text-gold-500 transition-colors">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
              </svg>
              Hall of Verdicts
            </Link>
          </div>
        </div>
      </header>

      {/* Bailiff greeting */}
      {stats.casesTried > 0 && (
        <div className="relative z-10 pt-6">
          <BailiffAnnouncement text={greeting} />
        </div>
      )}

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Interactive gavel emblem */}
          <div className="mb-8">
            <InteractiveGavel onBang={handleGavelBang} />
            <p className="text-court-600 text-[9px] font-mono uppercase tracking-[0.2em] mt-2 animate-fade-in-up">
              Bang the gavel
            </p>
          </div>

          {/* Court ceremonial banner */}
          <div className="banner-line mb-5" />

          {/* Title */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-court-100 leading-[1.08] mb-5 animate-fade-in-up">
            Put your product decision&nbsp;
            <span className="italic gold-foil">on trial</span>
          </h1>

          <p className="text-court-400 text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed font-legal tracking-wide animate-fade-in-up stagger-1">
            The prosecution tears it apart. The defense fights for it.
            <br />
            <span className="text-court-200">You deliver the verdict.</span>
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up stagger-2">
            <Link
              href="/file"
              onClick={handleFileCase}
              className="group inline-flex items-center gap-2.5 px-9 py-3.5 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base hover-lift btn-press"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:scale-110 transition-transform">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              File a case
            </Link>
            <Link
              href="/trial/arraignment?sample=0"
              onClick={playGavel}
              className="group inline-flex items-center gap-2.5 px-9 py-3.5 border border-court-600 hover:border-court-400 text-court-300 hover:text-court-100 font-medium rounded-sm transition-all duration-200 text-base hover-lift btn-press"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:rotate-12 transition-transform">
                <path d="M12 3L14 7L18 8L15 11L16 15L12 13L8 15L9 11L6 8L10 7L12 3Z" />
              </svg>
              Try a sample case
            </Link>
          </div>
        </div>

        {/* How it works */}
        {stats.casesTried === 0 && (
          <div className="mt-20 max-w-4xl w-full animate-fade-in-up stagger-3">
            <OrnateDivider className="mb-10" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="group text-center p-6 border border-court-800/60 hover:border-court-600/60 transition-all duration-300 rounded-sm hover-lift"
                >
                  <div className="w-10 h-10 mx-auto mb-4 rounded-full border border-court-700 flex items-center justify-center group-hover:border-gold-500/50 transition-colors bench-accent">
                    <span className="font-mono text-xs text-gold-500">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="font-serif text-base font-semibold text-court-200 mb-2">{step.title}</h3>
                  <p className="text-court-500 text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-court-800 px-6 py-4 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-court-600 text-xs">
          <span className="font-mono">&copy; Feature Court · World Product Day Hackathon 2026</span>
          <span className="font-mono tracking-wider">All Rise · All Ship · All Kill</span>
        </div>
      </footer>
    </div>
  );
}

const steps = [
  {
    title: "Present Your Case",
    description: "File the product decision you're wrestling with. The court needs the facts.",
  },
  {
    title: "Hear the Arguments",
    description: "The prosecution tears it down. The defense fights for it. Cross-examination follows.",
  },
  {
    title: "Deliver Your Verdict",
    description: "Rule from the bench. Ship it, kill it, revise it, or call a mistrial.",
  },
];