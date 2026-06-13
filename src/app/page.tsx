"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { GoldParticles, CourtroomBackground, useSoundEffects } from "@/components/court-components";
import { Ruling } from "@/lib/types";

export default function LandingPage() {
  const { playGavelKnock, playSwoosh } = useSoundEffects();
  const [casesTried, setCasesTried] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastRuling, setLastRuling] = useState<Ruling | null>(null);

  const [intro, setIntro] = useState({ dark: true, title: false, tagline: false, cta: false });
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem("fc-cases-tried") || "0", 10);
    setCasesTried(count);
    setStreak(parseInt(localStorage.getItem("fc-streak") || "0", 10));
    setLastRuling(localStorage.getItem("fc-last-ruling") as Ruling | null);
  }, []);

  useEffect(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;
    const speed = parseInt(localStorage.getItem("fc-cases-tried") || "0", 10) > 0 ? 0.5 : 1;
    const t0 = setTimeout(() => setIntro(s => ({ ...s, dark: false })), 200 * speed);
    const t1 = setTimeout(() => { playGavelKnock(); setIntro(s => ({ ...s, title: true })); }, 600 * speed);
    const t2 = setTimeout(() => setIntro(s => ({ ...s, tagline: true })), 1600 * speed);
    const t3 = setTimeout(() => { setIntro(s => ({ ...s, cta: true })); playSwoosh(); }, 2800 * speed);
    return () => [t0, t1, t2, t3].forEach(clearTimeout);
  }, [playGavelKnock, playSwoosh]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <GoldParticles count={12} />
      <CourtroomBackground opacity={0.06} />

      {intro.dark && <div className="fixed inset-0 bg-court-950 z-50 animate-fade-in-down" />}

      {/* Clean header */}
      <header className={`relative z-10 transition-all duration-1000 ${intro.title ? "opacity-100" : "opacity-0 -translate-y-4"}`}>
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <span className="font-serif text-lg text-court-100 tracking-tight">
            Feature Court
          </span>
          <div className="flex items-center gap-6">
            {casesTried > 0 && (
              <span className="text-xs text-court-500">
                {casesTried} case{casesTried !== 1 ? "s" : ""}
              </span>
            )}
            <Link href="/gallery" className="text-sm text-court-400 hover:text-court-200 transition-colors">
              Record
            </Link>
          </div>
        </div>
        {casesTried > 0 && (
          <div className="border-t border-court-800 px-8 py-2">
            <p className="text-xs text-court-500 italic text-center font-legal">
              Welcome back, Your Honor.
              {streak >= 2 && lastRuling && <> &middot; {streak}-case streak</>}
            </p>
          </div>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-20 relative z-10">
        <div className="max-w-2xl mx-auto text-center">

          {/* Title */}
          <div className={`mb-4 transition-all duration-1000 ${intro.title ? "opacity-100" : "opacity-0"}`}>
            {intro.title && (
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.06] text-court-100 tracking-tight">
                Feature Court
              </h1>
            )}
          </div>

          {/* Subtitle */}
          <div className={`mb-3 transition-all duration-700 ${intro.tagline ? "opacity-100" : "opacity-0"}`}>
            <p className="text-sm text-court-500 font-mono uppercase tracking-[0.25em]">
              In the Court of Product Decisions
            </p>
          </div>

          {/* Tagline */}
          <div className={`transition-all duration-700 ${intro.tagline ? "opacity-100" : "opacity-0"}`}>
            <p className="text-court-400 text-base max-w-md mx-auto mb-10 leading-relaxed">
              The prosecution tears it apart. The defense fights for it. You deliver the verdict.
            </p>
          </div>

          {/* CTA buttons — refined sizing */}
          <div className={`flex flex-col sm:flex-row gap-3 justify-center items-center ${intro.cta ? "animate-cta-rise" : "opacity-0 pointer-events-none"}`}>
            <Link
              href="/file"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-court-100 text-court-950 font-medium rounded-md transition-all duration-200 text-sm hover:bg-white"
            >
              File a case
            </Link>
            <Link
              href="/trial/arraignment?sample=0"
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-court-600 text-court-300 rounded-md transition-all duration-200 text-sm hover:border-court-400 hover:text-court-100"
            >
              Try a sample
            </Link>
          </div>

          {casesTried > 0 && intro.cta && (
            <p className="text-court-600 text-xs mt-6 font-mono">
              {casesTried} case{casesTried !== 1 ? "s" : ""} tried
              {streak >= 2 && lastRuling && <> &middot; {streak}-case streak</>}
            </p>
          )}
        </div>

        {/* How it works — clean cards */}
        <div className={`mt-24 max-w-3xl w-full transition-all duration-1000 ${intro.cta ? "opacity-100" : "opacity-0 translate-y-8"}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <h3 className="font-serif text-base font-medium text-court-200 mb-2">{step.title}</h3>
                <p className="text-court-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-court-800 px-8 py-4 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-court-600 text-xs">
          <span>Feature Court</span>
          <span>All Rise &middot; All Ship &middot; All Kill</span>
        </div>
      </footer>
    </div>
  );
}

const steps = [
  { title: "Present Your Case", description: "File the product decision you're wrestling with. The court needs the facts." },
  { title: "Hear the Arguments", description: "The prosecution tears it down. The defense fights for it. Cross-examination follows." },
  { title: "Deliver Your Verdict", description: "Rule from the bench. Ship it, kill it, revise it, or call a mistrial." },
];