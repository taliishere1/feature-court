"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { CourtSeal, OrnateDivider, useSoundEffects } from "@/components/court-components";

export default function GalleryPage() {
  const [trials, setTrials] = useState<TrialData[]>([]);
  const [loading, setLoading] = useState(true);
  const { playGavelKnock } = useSoundEffects();

  useEffect(() => {
    fetch("/api/trial?all=true")
      .then((r) => r.json())
      .then((data) => {
        setTrials(data);
        if (data.length > 0) playGavelKnock();
      })
      .finally(() => setLoading(false));
  }, [playGavelKnock]);

  return (
    <div className="min-h-screen flex flex-col wood-panel">
      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="font-serif text-base text-court-300 group-hover:text-court-100 transition-colors">Feature Court</span>
          </Link>
          <div className="flex items-center gap-4">
            {!loading && trials.length > 0 && (
              <span className="text-[10px] font-mono text-court-500 uppercase tracking-[0.15em] hidden sm:block">
                <span className="text-gold-500">{trials.length}</span> case{trials.length !== 1 ? "s" : ""} on docket
              </span>
            )}
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gold-500">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
              </svg>
              <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">Hall of Verdicts</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-16 relative z-10">
        <div className="max-w-6xl mx-auto animate-page-enter">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CourtSeal className="w-8 h-8 text-gold-500" />
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-gold-500">The Docket</span>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-court-100 mt-1">
                  Hall of Verdicts
                </h1>
              </div>
              <CourtSeal className="w-8 h-8 text-gold-500" />
            </div>
            <div className="flex items-center justify-center gap-2 text-court-400 text-sm font-legal">
              <span>Product decisions that have been put on trial</span>
            </div>
            <OrnateDivider className="mt-6 max-w-xs mx-auto" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <CourtSeal className="w-8 h-8 text-gold-500" animated />
                <div className="text-court-400 font-serif">Loading the docket...</div>
              </div>
            </div>
          ) : trials.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-court-700 rounded-sm max-w-lg mx-auto parchment-ruled">
              <div className="mb-4 relative z-10">
                <svg width="36" height="36" viewBox="0 0 48 48" fill="none" className="mx-auto text-court-600">
                  <rect x="6" y="8" width="36" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <line x1="14" y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="14" y1="24" x2="30" y2="24" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="14" y1="30" x2="26" y2="30" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <p className="text-court-500 font-serif text-lg mb-2 relative z-10">The docket is empty</p>
              <p className="text-court-600 text-sm mb-6 relative z-10">Be the first to put a decision on trial.</p>
              <Link
                href="/file"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-sm animate-button-press"
              >
                File a case
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {trials.map((trial, i) => (
                <Link
                  key={trial.id}
                  href={`/trial/arraignment?id=${trial.id}`}
                  className="group block parchment-ruled p-5 hover:border-court-500 transition-all duration-300 animate-fade-in-up animate-card-lift"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="flex items-center gap-2 mb-3 relative z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500/60 group-hover:bg-gold-500 transition-colors" />
                    <span className="font-mono text-[9px] text-court-600 uppercase tracking-[0.15em]">
                      Case No. {trial.id.slice(0, 8).toUpperCase()}
                    </span>
                    {trial.isSample && (
                      <span className="font-mono text-[9px] text-gold-500 uppercase tracking-[0.15em] ml-auto">Sample</span>
                    )}
                  </div>
                  <p className="font-serif text-court-100 font-bold text-base mb-2 leading-snug group-hover:text-gold-200 transition-colors relative z-10">
                    {trial.case_title}
                  </p>
                  <p className="text-court-500 text-xs leading-relaxed mb-3 line-clamp-2 font-legal relative z-10">
                    {trial.intake.proposal}
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-court-800 relative z-10">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-court-600">
                      <path d="M12 3L14 7L18 8L15 11L16 15L12 13L8 15L9 11L6 8L10 7L12 3Z" fill="currentColor" />
                    </svg>
                    <span className="font-mono text-[9px] text-court-600 uppercase tracking-[0.15em]">View case</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && trials.length > 0 && (
            <div className="text-center mt-12">
              <Link
                href="/file"
                className="group inline-flex items-center gap-2.5 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-sm animate-button-press"
              >
                File your own case
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}