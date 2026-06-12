"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { SAMPLE_CASES } from "@/lib/types";
import { CourtSeal, StageProgress, TypewriterText, OrnateDivider } from "@/components/court-components";

function ArraignmentContent() {
  const searchParams = useSearchParams();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const id = searchParams.get("id");
    const sampleIdx = searchParams.get("sample");

    async function load() {
      if (sampleIdx !== null) {
        const idx = parseInt(sampleIdx);
        const intake = SAMPLE_CASES[idx] || SAMPLE_CASES[0];
        const res = await fetch("/api/trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...intake, isSample: true }),
        });
        const data = await res.json();
        setTrial(data);
      } else if (id) {
        const res = await fetch(`/api/trial?id=${id}`);
        const data = await res.json();
        setTrial(data);
      }
      setLoading(false);
      setTimeout(() => setRevealed(true), 300);
    }

    load();
  }, [searchParams]);

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  return (
    <div className="min-h-screen flex flex-col wood-panel">
      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-serif text-base text-court-300 hover:text-court-100 transition-colors">
            Feature Court
          </Link>
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.25em]">
            Docket No. {trial.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </header>

      <main className="flex-1 px-6 py-12 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <div className="text-center mb-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-court-500">Stage 1 of 5</span>
          </div>

          <StageProgress current={1} />

          {/* Bailiff announcement */}
          <div className={`text-center mb-12 transition-all duration-700 ${revealed ? "opacity-100" : "opacity-0"}`}>
            <p className="text-court-400 text-xs font-mono uppercase tracking-widest mb-6">
              <span className="animate-gavel-bang inline-block mr-2">🔨</span>
              All rise. The Honorable&nbsp;
              <span className="gold-foil not-italic font-bold">You</span>
              &nbsp;presiding.
            </p>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-court-100 leading-tight mb-4">
              <TypewriterText text={trial.case_title} speed={20} delay={600} tag="span" />
            </h1>

            <OrnateDivider className="mb-5" />

            <p className="text-court-300 text-base sm:text-lg mt-4 max-w-xl mx-auto leading-relaxed font-legal tracking-wide italic">
              &ldquo;{trial.charge}&rdquo;
            </p>
          </div>

          {/* Charges */}
          <div className={`parchment p-6 mb-12 transition-all duration-700 delay-300 ${revealed ? "opacity-100" : "opacity-0"}`}>
            <div className="flex items-center gap-2 mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gold-500">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">The Charges — Based on the Filing</span>
            </div>
            <div className="space-y-3">
              <SummaryRow label="Proposal" value={trial.intake.proposal} />
              <SummaryRow label="Serves" value={trial.intake.audience} />
              <SummaryRow label="Timing" value={trial.intake.whyNow} />
              <SummaryRow label="Cost" value={trial.intake.tradeoff} />
            </div>
          </div>

          {/* Proceed CTA */}
          <div className={`text-center animate-fade-in-up delay-500 ${revealed ? "" : "opacity-0"}`}>
            <Link
              href={`/trial/prosecution?id=${trial.id}`}
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base"
            >
              Hear the prosecution
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <p className="text-court-600 text-[10px] mt-3 font-mono uppercase tracking-[0.2em]">
              The People&apos;s Skeptic will make the case against
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1">
      <span className="text-court-500 text-[10px] font-mono uppercase tracking-wider min-w-[80px] pt-0.5">{label}:</span>
      <span className="text-court-200 text-sm font-legal leading-relaxed">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 wood-panel">
      <CourtSeal className="w-10 h-10 text-gold-500" animated />
      <div className="font-serif text-court-400 text-lg animate-pulse">The court is assembling...</div>
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

export default function ArraignmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center wood-panel">
        <div className="font-serif text-court-400 text-lg animate-pulse">The court is assembling...</div>
      </div>
    }>
      <ArraignmentContent />
    </Suspense>
  );
}