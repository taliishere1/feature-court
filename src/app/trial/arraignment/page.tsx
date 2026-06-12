"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrialData, SAMPLE_CASES } from "@/lib/types";
import { StageProgress, TypewriterText, OrnateDivider, CaseDocketHeader, LegalPaper, BailiffAnnouncement } from "@/components/court-components";
import { useSound } from "@/lib/use-sound";

function ArraignmentContent() {
  const searchParams = useSearchParams();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const { playGavel, playRustle } = useSound();
  const playedRef = useRef(false);

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

        if (typeof window !== "undefined" && window.pendo) {
          window.pendo.track("sample_case_started", {
            sample_index: idx,
            sample_proposal: intake.proposal,
            trial_id: data.id,
          });
        }
      } else if (id) {
        const res = await fetch(`/api/trial?id=${id}`);
        const data = await res.json();
        setTrial(data);
      }
      setLoading(false);
      setTimeout(() => {
        setRevealed(true);
        if (!playedRef.current) {
          playGavel();
          playedRef.current = true;
        }
      }, 500);
    }

    load();
  }, [searchParams, playGavel]);

  if (loading) return <LoadingState />;
  if (!trial) return <NotFoundState />;

  const releaseCharge = trial.charge.startsWith('"') ? trial.charge.slice(1) : trial.charge;
  const dropCapText = releaseCharge.replace(/^["""'']/, "");

  return (
    <div className="min-h-screen flex flex-col wood-panel">
      <div className="courtroom-scene" />
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
          <CaseDocketHeader
            caseTitle={trial.case_title}
            caseId={trial.id}
            stageLabel="Arraignment"
            stageNum={1}
          />

          <StageProgress current={1} />

          {/* Bailiff announcement */}
          <BailiffAnnouncement text="All rise. The court is now in session." visible={revealed} />

          {/* Charges */}
          <div className={`mt-8 mb-10 transition-all duration-700 delay-200 ${revealed ? "opacity-100" : "opacity-0"}`}>
            <LegalPaper className="text-center">
              <p className={`drop-cap text-court-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-legal tracking-wide italic ${revealed ? "" : ""}`}>
                &ldquo;{trial.charge}&rdquo;
              </p>
            </LegalPaper>
          </div>

          {/* The Filing Summary */}
          <div className={`transition-all duration-700 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
            <LegalPaper>
              <div className="flex items-center gap-2 mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gold-500">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">The Charges — Based on the Filing</span>
              </div>
              <div className="space-y-3" style={{ position: "relative", zIndex: 2 }}>
                <SummaryRow label="Proposal" value={trial.intake.proposal} />
                <SummaryRow label="Serves" value={trial.intake.audience} />
                <SummaryRow label="Timing" value={trial.intake.whyNow} />
                <SummaryRow label="Cost" value={trial.intake.tradeoff} />
              </div>
            </LegalPaper>
          </div>

          {/* Proceed CTA */}
          <div className={`text-center animate-fade-in-up ${revealed ? "" : "opacity-0"}`} style={{ animationDelay: "0.8s" }}>
            <Link
              href={`/trial/prosecution?id=${trial.id}`}
              onClick={() => playGavel()}
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base hover-lift btn-press"
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