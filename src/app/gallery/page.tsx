"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrialData, Ruling } from "@/lib/types";
import { getAllTrials, getMyTrials } from "@/lib/store";
import { getVisitorId } from "@/lib/visitor";
import { CourtroomBackground, JudgePortrait, SiteBrand, SiteNavLinks } from "@/components/court-components";

const RULING_LABELS: Record<Ruling, string> = {
  ship: "Ship It",
  kill: "Kill It",
  revise: "Send Back",
  mistrial: "Mistrial",
};

const RULING_COLORS: Record<Ruling, string> = {
  ship: "text-stamp-ship",
  kill: "text-stamp-kill",
  revise: "text-stamp-revise",
  mistrial: "text-stamp-mistrial",
};

const RULING_BG: Record<Ruling, string> = {
  ship: "bg-stamp-ship/10 border-stamp-ship/30",
  kill: "bg-stamp-kill/10 border-stamp-kill/30",
  revise: "bg-stamp-revise/10 border-stamp-revise/30",
  mistrial: "bg-stamp-mistrial/10 border-stamp-mistrial/30",
};

function trialCardHref(trial: TrialData): string {
  if (trial.ruling) {
    const params = new URLSearchParams({ ruling: trial.ruling });
    if (trial.intake.gutCall) params.set("gut", trial.intake.gutCall);
    return `/verdict/${trial.id}?${params.toString()}`;
  }
  return `/trial/arraignment?id=${trial.id}`;
}

export default function GalleryPage() {
  const [trials, setTrials] = useState<TrialData[]>([]);
  const [myRuledTrials, setMyRuledTrials] = useState<TrialData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const visitorId = getVisitorId();
    const allLoad = getAllTrials();
    const myLoad = visitorId
      ? getMyTrials(visitorId)
      : Promise.resolve([] as TrialData[]);

    Promise.all([allLoad, myLoad])
      .then(([allData, myData]) => {
        if (cancelled) return;
        setTrials(allData.filter((t) => !t.isSample));
        setMyRuledTrials(myData.filter((t) => !t.isSample && t.ruling));
      })
      .catch((err) => console.error("Failed to load trials:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalVerdicts = myRuledTrials.length;

  const stats: { key: Ruling; count: number; pct: number }[] = (["ship", "kill", "revise", "mistrial"] as Ruling[]).map((key) => {
    const count = myRuledTrials.filter((t) => t.ruling === key).length;
    return { key, count, pct: totalVerdicts > 0 ? Math.round((count / totalVerdicts) * 100) : 0 };
  });

  const sortedByTime = [...myRuledTrials].sort((a, b) => a.createdAt - b.createdAt);
  const lastRuling = sortedByTime.length > 0 ? sortedByTime[sortedByTime.length - 1].ruling : null;
  let streak = 0;
  for (let i = sortedByTime.length - 1; i >= 0; i--) {
    if (sortedByTime[i].ruling === lastRuling) streak++;
    else break;
  }

  return (
    <div className="min-h-screen flex flex-col wood-panel relative">
      <CourtroomBackground opacity={0.08} />
      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <SiteBrand />
          <div className="flex items-center gap-4 sm:gap-6">
            {!loading && trials.length > 0 && (
              <span className="text-[10px] font-mono text-court-500 uppercase tracking-[0.15em] hidden sm:block">
                <span className="text-gold-500">{trials.length}</span> case{trials.length !== 1 ? "s" : ""} on docket
              </span>
            )}
            <SiteNavLinks />
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 relative z-10">
        <div className="w-full max-w-[1600px] mx-auto animate-page-enter">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-gold-500">The Docket</span>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-gold-500 mt-1">
                  Hall of Verdicts
                </h1>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          {totalVerdicts > 0 && (
            <div className="max-w-5xl mx-auto mb-8">
              <div className="parchment p-4 animate-fade-in-up">
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-court-500">Your Record</span>
                  <span className="font-mono text-[9px] text-court-500">
                    <span className="text-gold-500">{totalVerdicts}</span> case{totalVerdicts !== 1 ? "s" : ""} tried
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 relative z-10">
                  {stats.map((s) => (
                    <div key={s.key} className={`text-center p-4 rounded-sm border ${RULING_BG[s.key]}`}>
                      <p className={`font-mono text-[10px] font-bold ${RULING_COLORS[s.key]}`}>{s.count}</p>
                      <p className="text-court-500 text-[8px] font-mono uppercase tracking-[0.1em] mt-0.5">{RULING_LABELS[s.key]}</p>
                      {totalVerdicts > 0 && (
                        <div className="w-full h-1 bg-court-800 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full rounded-full ${s.key === "ship" ? "bg-stamp-ship" : s.key === "kill" ? "bg-stamp-kill" : s.key === "revise" ? "bg-stamp-revise" : "bg-stamp-mistrial"}`} style={{ width: `${s.pct}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {streak >= 2 && lastRuling && (
                  <div className="mt-3 pt-2 border-t border-court-800 relative z-10">
                    <div className="flex items-center justify-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold-500">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                      <span className="text-[10px] text-court-400 font-legal italic">
                        You&apos;re on a <span className={`font-semibold ${RULING_COLORS[lastRuling]}`}>{RULING_LABELS[lastRuling]}</span> streak of <span className="text-gold-500 font-semibold">{streak}</span>!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-court-700 mb-8 max-w-5xl mx-auto"></div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="text-court-400 font-serif">Loading the docket...</div>
              </div>
            </div>
          ) : trials.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-court-700 rounded-sm max-w-4xl mx-auto parchment-ruled">
              <div className="mb-4 relative z-10 flex justify-center">
                <JudgePortrait />
              </div>
              <p className="text-court-500 font-serif text-lg mb-2 relative z-10">The docket is empty</p>
              <p className="text-court-600 text-sm mb-6 relative z-10">No cases have been filed yet. Be the first to put a feature on trial.</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {trials.map((trial, i) => (
                <Link
                  key={trial.id}
                  href={trialCardHref(trial)}
                  className="group block parchment-ruled p-5 hover:border-court-500 transition-all duration-300 animate-fade-in-up animate-card-lift"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="flex items-center gap-2 mb-3 relative z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500/60 group-hover:bg-gold-500 transition-colors" />
                    <span className="font-mono text-[9px] text-court-600 uppercase tracking-[0.15em]">
                      Case No. {trial.id.slice(0, 8).toUpperCase()}
                    </span>
                    {trial.ruling && (
                      <span className={`font-mono text-[9px] uppercase tracking-[0.1em] ml-auto px-1.5 py-0.5 rounded-sm border ${RULING_BG[trial.ruling]} ${RULING_COLORS[trial.ruling]}`}>
                        {RULING_LABELS[trial.ruling]}
                      </span>
                    )}
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
                    <span className="font-mono text-[9px] text-court-600 uppercase tracking-[0.15em]">
                      {trial.ruling ? "View verdict" : "View case"}
                    </span>
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