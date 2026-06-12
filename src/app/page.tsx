"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { CourtSeal, OrnateDivider, GoldParticles, InteractiveGavel, useSoundEffects } from "@/components/court-components";
import { Ruling } from "@/lib/types";

export default function LandingPage() {
  const { playGavelKnock, playSwoosh, playPaperRustle } = useSoundEffects();
  const [casesTried, setCasesTried] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [streak, setStreak] = useState(0);
  const [lastRuling, setLastRuling] = useState<Ruling | null>(null);

  // Cinematic intro sequence
  const [intro, setIntro] = useState({
    dark: true,
    seal: false,
    gavel: false,
    title: false,
    banner: false,
    tagline: false,
    cta: false,
  });

  const hasPlayedRef = useRef(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem("fc-cases-tried") || "0", 10);
    setCasesTried(count);
    const s = parseInt(localStorage.getItem("fc-streak") || "0", 10);
    setStreak(s);
    setLastRuling(localStorage.getItem("fc-last-ruling") as Ruling | null);
  }, []);

  useEffect(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    const isReturning = parseInt(localStorage.getItem("fc-cases-tried") || "0", 10) > 0;
    const speed = isReturning ? 0.5 : 1;

    const t0 = setTimeout(() => setIntro((s) => ({ ...s, dark: false })), 200 * speed);
    const t1 = setTimeout(() => {
      setIntro((s) => ({ ...s, seal: true }));
      playGavelKnock();
    }, 400 * speed);
    const t2 = setTimeout(() => {
      setIntro((s) => ({ ...s, gavel: true }));
      playGavelKnock();
    }, 1000 * speed);
    const t3 = setTimeout(() => {
      playGavelKnock();
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }, 1400 * speed);
    const t4 = setTimeout(() => {
      playGavelKnock();
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }, 1800 * speed);
    const t5 = setTimeout(() => {
      setIntro((s) => ({ ...s, title: true }));
      playPaperRustle();
    }, 2400 * speed);
    const t6 = setTimeout(() => {
      setIntro((s) => ({ ...s, banner: true }));
    }, 3400 * speed);
    const t7 = setTimeout(() => {
      setIntro((s) => ({ ...s, tagline: true }));
    }, 4000 * speed);
    const t8 = setTimeout(() => {
      setIntro((s) => ({ ...s, cta: true }));
      playSwoosh();
    }, 4800 * speed);

    return () => {
      [t0, t1, t2, t3, t4, t5, t6, t7, t8].forEach(clearTimeout);
    };
  }, [playGavelKnock, playPaperRustle, playSwoosh]);

  const handleGavelStrike = () => {
    playGavelKnock();
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  return (
    <div className={`min-h-screen flex flex-col wood-panel relative ${shaking ? "animate-screen-shake" : ""}`}>
      <GoldParticles count={20} />

      {/* Courtroom decorative columns */}
      <div className="hidden lg:block courtroom-column left-[5%]" />
      <div className="hidden lg:block courtroom-column right-[5%]" />

      {/* Initial dark overlay that fades */}
      {intro.dark && (
        <div className="fixed inset-0 bg-court-950 z-50 animate-fade-in-down" />
      )}

      {/* Header bar */}
      <header
        className={`border-b border-court-800 relative z-10 transition-all duration-1000 ${
          intro.title ? "opacity-100" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CourtSeal className="w-9 h-9 text-gold-500" />
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
            {casesTried > 0 && (
              <span className="text-[10px] font-mono text-court-500 uppercase tracking-[0.15em] hidden sm:block">
                <span className="text-gold-500">{casesTried}</span> case{casesTried !== 1 ? "s" : ""} tried
              </span>
            )}
            <Link
              href="/gallery"
              className={`group flex items-center gap-2 text-sm text-court-400 hover:text-court-200 transition-colors ${intro.cta ? "" : "pointer-events-none"}`}
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
        {casesTried > 0 && (
          <div className="border-t border-court-800 px-6 py-1.5">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <p className="text-[10px] text-court-500 font-legal italic">
                Welcome back, Your Honor. You&apos;ve been busy.
              </p>
              {streak >= 2 && lastRuling && (
                <p className="text-[9px] text-court-500 font-mono tracking-wide hidden sm:block">
                  <span className="text-gold-500">{streak}</span>-case {lastRuling} streak
                </p>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Light beam sweep */}
      <div className="absolute top-0 left-0 w-full h-[600px] pointer-events-none z-0 overflow-hidden opacity-[0.03]">
        <div className="absolute inset-0 animate-light-sweep bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
      </div>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative z-10">
        <div className="max-w-3xl mx-auto text-center">

          {/* Step 2: Court Seal expands */}
          <div className={`mb-6 transition-all duration-1000 ${intro.seal ? "opacity-100" : "opacity-0"}`}>
            <div className={intro.seal ? "animate-seal-expand inline-block" : "inline-block"}>
              <CourtSeal className="w-16 h-16 sm:w-20 sm:h-20 text-gold-500" />
            </div>
          </div>

          {/* Step 3: Gavel drops in */}
          <div className={`mb-6 ${intro.gavel ? "" : "opacity-0"}`}>
            <div className={intro.gavel ? "animate-gavel-drop" : ""}>
              <InteractiveGavel onStrike={handleGavelStrike} className="mx-auto" />
            </div>
          </div>

          {/* Click prompt */}
          <p
            className={`text-court-600 text-[9px] font-mono uppercase tracking-[0.3em] mb-5 transition-all duration-700 ${
              intro.gavel && !intro.title ? "opacity-100" : "opacity-0"
            }`}
          >
            Click the gavel
          </p>

          {/* Step 4: Main Title with gold shimmer */}
          <div
            className={`mb-4 transition-all duration-1000 ${
              intro.title ? "opacity-100" : "opacity-0"
            }`}
          >
            {intro.title && (
              <h1
                className="animate-title-shimmer font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] text-transparent bg-clip-text"
                style={{
                  backgroundImage: "linear-gradient(135deg, #c4b098 0%, #d4af37 30%, #f0d974 50%, #d4af37 70%, #c4b098 100%)",
                }}
              >
                Feature Court
              </h1>
            )}
          </div>

          {/* Step 5: Court banner */}
          <div
            className={`flex items-center gap-3 justify-center mb-6 transition-all duration-700 ${
              intro.banner ? "opacity-100" : "opacity-0"
            }`}
          >
            <svg width="60" height="10" viewBox="0 0 60 10" className="text-gold-500 animate-banner-left" fill="none">
              <path d="M0 5 Q15 0 30 5 Q45 10 60 5" stroke="currentColor" strokeWidth="0.5" />
            </svg>
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.35em] text-gold-500/80">
              In the Court of Product Decisions
            </span>
            <svg width="60" height="10" viewBox="0 0 60 10" className="text-gold-500 animate-banner-right" fill="none">
              <path d="M0 5 Q15 0 30 5 Q45 10 60 5" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          </div>

          {/* Step 6: Tagline */}
          <div
            className={`transition-all duration-700 ${
              intro.tagline ? "opacity-100 animate-tagline" : "opacity-0"
            }`}
          >
            <p className="text-court-400 text-base sm:text-lg max-w-lg mx-auto mb-8 leading-relaxed font-legal tracking-wide">
              The prosecution tears it apart. The defense fights for it.
              <br />
              <span className="text-court-200">You deliver the verdict.</span>
            </p>
          </div>

          {/* Step 7: CTA buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center items-center ${
              intro.cta ? "animate-cta-rise" : "opacity-0 pointer-events-none"
            }`}
          >
            <Link
              href="/file"
              onClick={(e) => { playSwoosh(); playGavelKnock(); }}
              className="group inline-flex items-center gap-2.5 px-9 py-3.5 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press animate-card-lift"
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
              onClick={(e) => { playGavelKnock(); }}
              className="group inline-flex items-center gap-2.5 px-9 py-3.5 border border-court-600 hover:border-court-400 text-court-300 hover:text-court-100 font-medium rounded-sm transition-all duration-200 text-base animate-button-press animate-card-lift"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:rotate-12 transition-transform">
                <path d="M12 3L14 7L18 8L15 11L16 15L12 13L8 15L9 11L6 8L10 7L12 3Z" />
              </svg>
              Try a sample case
            </Link>
          </div>

          {/* Case count for returning users */}
          {casesTried > 0 && intro.cta && (
            <p className="text-court-600 text-[9px] font-mono uppercase tracking-[0.2em] mt-6 animate-fade-in-up">
              You have presided over <span className="text-gold-500 font-semibold">{casesTried}</span> case{casesTried !== 1 ? "s" : ""}
              {streak >= 2 && lastRuling && (
                <> · <span className="text-court-500">{streak}</span>-case streak</>
              )}
            </p>
          )}
        </div>

        {/* How it works */}
        <div
          className={`mt-20 max-w-4xl w-full transition-all duration-1000 ${
            intro.cta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <OrnateDivider className="mb-10" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="group text-center p-6 border border-court-800/60 hover:border-court-600/60 transition-all duration-300 rounded-sm animate-card-lift"
                style={{ animationDelay: `${i * 0.15}s` }}
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
      </main>

      {/* Footer */}
      <footer className="border-t border-court-800 px-6 py-4 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-court-600 text-xs">
          <span className="font-mono">© Feature Court · World Product Day Hackathon 2026</span>
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