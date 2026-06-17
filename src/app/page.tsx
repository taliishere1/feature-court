"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CourtroomBackground, CourtSeal, InteractiveGavel } from "@/components/court-components";
import { Ruling } from "@/lib/types";
import { getAllTrials } from "@/lib/store";

export default function LandingPage() {
  const [casesTried, setCasesTried] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastRuling, setLastRuling] = useState<Ruling | null>(null);
  const [loaded, setLoaded] = useState(false);

  const isReturning = loaded && casesTried > 0;

  // Fetch stats directly from Supabase
  useEffect(() => {
    let cancelled = false;
    getAllTrials()
      .then((data) => {
        if (cancelled) return;
        const ruled = data.filter((t) => !t.isSample && t.ruling);
        setCasesTried(ruled.length);
        if (ruled.length > 0) {
          ruled.sort((a, b) => a.createdAt - b.createdAt);
          const last = ruled[ruled.length - 1].ruling!;
          setLastRuling(last);
          let s = 0;
          for (let i = ruled.length - 1; i >= 0; i--) {
            if (ruled[i].ruling === last) s++;
            else break;
          }
          setStreak(s);
        }
      })
      .catch((err) => console.error("Failed to load trials:", err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [intro, setIntro] = useState({
    dark: true,
    title: false,
    tagline: false,
    cta: false,
  });

  // Start intro animation immediately — no network wait
  useEffect(() => {
    const t0 = setTimeout(() => setIntro(s => ({ ...s, dark: false })), 100);
    const t1 = setTimeout(() => setIntro(s => ({ ...s, title: true })), 200);
    const t2 = setTimeout(() => setIntro(s => ({ ...s, tagline: true })), 500);
    const t3 = setTimeout(() => setIntro(s => ({ ...s, cta: true })), 900);
    return () => [t0, t1, t2, t3].forEach(clearTimeout);
  }, []);

  // When data loads, skip to end for returning users
  useEffect(() => {
    if (loaded && isReturning) {
      const t = setTimeout(() => setIntro({ dark: false, title: true, tagline: true, cta: true }), 0);
      return () => clearTimeout(t);
    }
  }, [loaded, isReturning]);

  return (
    <div className="min-h-screen flex flex-col wood-panel relative overflow-hidden">
      <CourtroomBackground opacity={0.1} />

      <div className={`fixed inset-0 bg-[#030712] z-50 transition-opacity duration-500 ${intro.dark ? "opacity-100" : "opacity-0 pointer-events-none"}`} />

      {/* Clean header */}
      <header className={`relative z-10 transition-all duration-1000 ${intro.title ? "opacity-100" : "opacity-0 -translate-y-4"}`}>
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CourtSeal className="w-5 h-5 text-gold-500" />
            <span className="font-display text-lg text-gold-500 tracking-tight">
              FEATURE COURT
            </span>
          </div>
          <div className="flex items-center gap-6">
            {casesTried > 0 && (
              <span className="text-xs text-court-500">
                {casesTried} case{casesTried !== 1 ? "s" : ""}
              </span>
            )}
            <Link href="/guide" className="text-sm text-court-400 hover:text-court-200 transition-colors">
              Guide
            </Link>
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
      <main className="flex-1 flex flex-col items-center justify-center px-8 pt-0 pb-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">

          {/* Title */}
          <div className={`mb-2 transition-all duration-1000 ${intro.title ? "opacity-100" : "opacity-0"}`}>
            <div className="flex justify-center mb-1">
              <InteractiveGavel width={200} height={200} className="text-gold-500" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black leading-[1.04] gold-foil tracking-normal">
              FEATURE COURT
            </h1>
          </div>

          {/* Subtitle */}
          <div className={`mb-3 transition-all duration-700 ${intro.tagline ? "opacity-100" : "opacity-0"}`}>
            <p className="text-base text-court-500 font-mono uppercase tracking-[0.25em]">
              In the Court of Product Decisions
            </p>
          </div>

          {/* Tagline */}
          <div className={`transition-all duration-700 ${intro.tagline ? "opacity-100" : "opacity-0"}`}>
            <p className="text-court-300 text-lg max-w-md mx-auto mb-10 leading-relaxed font-legal italic">
              Every feature stands trial. The prosecution charges. The defense argues. You deliver the verdict.
            </p>
          </div>

          {/* CTA buttons */}
          <div className={`flex flex-col sm:flex-row gap-3 justify-center items-center ${intro.cta ? "animate-cta-rise" : "opacity-0 pointer-events-none"}`}>
            <Link
              href="/file"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-court-950 font-medium rounded-md transition-all duration-200 text-sm hover:bg-gold-400"
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

          <div className={`transition-all duration-700 ${intro.cta ? "opacity-100" : "opacity-0"}`}>
            {casesTried > 0 && (
              <p className="text-court-600 text-xs mt-6 font-mono">
                {casesTried} case{casesTried !== 1 ? "s" : ""} tried
                {streak >= 2 && lastRuling && <> &middot; {streak}-case streak</>}
              </p>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className={`mt-24 max-w-3xl w-full transition-all duration-1000 ${intro.cta ? "opacity-100" : "opacity-0 translate-y-8"}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.title} className="text-center">
                <h3 className="font-serif text-lg font-medium text-gold-400 mb-2">{step.title}</h3>
                <p className="text-court-400 text-base leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-court-800 px-8 py-4 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-court-600 text-xs">
          <span>FEATURE COURT</span>
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