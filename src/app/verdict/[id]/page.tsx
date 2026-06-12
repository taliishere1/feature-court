"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrialData, Ruling } from "@/lib/types";
import {
  CourtSeal,
  WaxSeal,
  OrnateDivider,
  GoldParticles,
  ScrollworkBorder,
  ConfettiBurst,
  SignatureBlock,
} from "@/components/court-components";
import { useSound } from "@/lib/use-sound";
import { useGameStats } from "@/lib/use-game-stats";

const RULING_LABELS: Record<Ruling, string> = {
  ship: "SHIP IT",
  kill: "KILL IT",
  revise: "SEND BACK FOR REVISION",
  mistrial: "MISTRIAL",
};

const RULING_COLORS: Record<Ruling, string> = {
  ship: "text-stamp-ship border-stamp-ship",
  kill: "text-stamp-kill border-stamp-kill",
  revise: "text-stamp-revise border-stamp-revise",
  mistrial: "text-stamp-mistrial border-stamp-mistrial",
};

const RULING_BG: Record<Ruling, string> = {
  ship: "bg-stamp-ship/10",
  kill: "bg-stamp-kill/10",
  revise: "bg-stamp-revise/10",
  mistrial: "bg-stamp-mistrial/10",
};

export default function VerdictPage({ params }: { params: Promise<{ id: string }> }) {
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [ruling, setRuling] = useState<Ruling | null>(null);
  const [gutCall, setGutCall] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<"loading" | "stamp" | "seal" | "sentence" | "details" | "complete">("loading");
  const { playGavel, playStamp } = useSound();
  const { recordRuling } = useGameStats();

  useEffect(() => {
    async function load() {
      const { id } = await params;
      const urlParams = new URLSearchParams(window.location.search);
      const r = urlParams.get("ruling") as Ruling;
      setRuling(r);
      setGutCall(urlParams.get("gut"));

      const res = await fetch(`/api/trial?id=${id}`);
      const data = await res.json();
      setTrial(data);
      setLoading(false);

      if (r) recordRuling(r);

      // Cinematic sequence
      setTimeout(() => {
        setPhase("stamp");
        playGavel();
        setTimeout(() => playGavel(), 200);
        setTimeout(() => playGavel(), 400);
      }, 200);
      setTimeout(() => {
        setPhase("seal");
        playStamp();
      }, 900);
      setTimeout(() => setPhase("sentence"), 1600);
      setTimeout(() => setPhase("details"), 2400);
      setTimeout(() => setPhase("complete"), 3200);
    }
    load();
  }, [params, playGavel, playStamp, recordRuling]);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    if (typeof window !== "undefined" && window.pendo) {
      window.pendo.track("verdict_link_copied", {
        trial_id: trial?.id ?? "",
        ruling: ruling ?? "",
        case_title: trial?.case_title ?? "",
        is_sample: trial?.isSample ?? false,
      });
    }
  }

  if (loading || !trial || !ruling) {
    return (
      <div className="min-h-screen flex items-center justify-center wood-panel">
        <div className="flex flex-col items-center gap-4">
          <CourtSeal className="w-12 h-12 text-gold-500" animated />
          <div className="text-court-400 font-serif">Preparing the verdict...</div>
        </div>
      </div>
    );
  }

  const verdict = trial.verdicts[ruling];
  const gutMismatch = gutCall && ruling !== gutCall;

  return (
    <div className="min-h-screen flex flex-col wood-panel">
      <ConfettiBurst active={ruling === "ship"} count={50} />
      {ruling === "kill" && phase === "stamp" && (
        <div className="stamp-overlay" />
      )}
      <GoldParticles count={12} />

      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="font-serif text-base text-court-300 group-hover:text-court-100 transition-colors">Feature Court</span>
          </Link>
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">Final Verdict</span>
        </div>
      </header>

      <main className="flex-1 px-6 py-16 flex items-center justify-center relative z-10">
        <div className="max-w-xl w-full animate-page-enter">
          <ScrollworkBorder>
            <div className="parchment p-6 md:p-8 overflow-hidden">
              {/* Red ribbon banner */}
              <div className={`-mx-6 -mt-6 mb-6 transition-all duration-700 ${phase !== "loading" ? "opacity-100" : "opacity-0"}`}>
                <div className="verdict-ribbon">
                  <p className="font-serif text-sm font-bold text-white uppercase tracking-[0.3em]">Verdict Delivered</p>
                </div>
              </div>

              {/* Letterhead */}
              <div className={`text-center border-b border-court-700 pb-5 mb-6 transition-all duration-1000 ${phase !== "loading" ? "opacity-100" : "opacity-0"}`}>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CourtSeal className="w-7 h-7 text-gold-500" />
                  <div>
                    <p className="font-serif text-base text-court-100 tracking-wide">Feature Court</p>
                    <p className="text-[8px] text-court-600 font-mono uppercase tracking-[0.25em]">District of Product Decisions</p>
                  </div>
                  <CourtSeal className="w-7 h-7 text-gold-500" />
                </div>
                <p className="text-[8px] text-court-600 font-mono uppercase tracking-[0.3em]">In the Court of Product Decisions · Established 2026</p>
                <p className="text-[8px] text-court-500 font-mono mt-1 tracking-wider">
                  Docket No. {trial.id.slice(0, 8).toUpperCase()} · Filed Under Seal
                </p>
              </div>

              {/* Case title */}
              <div className={`text-center mb-5 transition-all duration-1000 delay-200 ${phase !== "loading" ? "opacity-100" : "opacity-0"}`}>
                <h1 className="font-serif text-lg sm:text-xl font-bold text-court-100 leading-tight">
                  {trial.case_title}
                </h1>
              </div>

              {/* Ruling stamp */}
              <div className={`text-center py-5 ${phase === "stamp" || phase !== "loading" ? "opacity-100" : "opacity-0"}`}>
                <div
                  className={`inline-block ${RULING_BG[ruling]} border-2 ${RULING_COLORS[ruling]} px-10 py-4 rounded-sm ${
                    phase === "stamp" ? "animate-stamp-impact" : ""
                  }`}
                >
                  <p className={`font-serif text-2xl sm:text-3xl font-black tracking-[0.15em] ${RULING_COLORS[ruling]}`}>
                    {RULING_LABELS[ruling]}
                  </p>
                </div>
                <div className="mt-4 flex justify-center">
                  <WaxSeal ruling={ruling} animated={phase === "seal" || (phase !== "loading" && phase !== "stamp")} />
                </div>
              </div>

              {/* Sentence */}
              <div className={`text-center mb-5 transition-all duration-700 ${phase === "sentence" || phase === "details" || phase === "complete" ? "opacity-100" : "opacity-0"}`}>
                <OrnateDivider className="mb-4" />
                <p className="text-court-200 text-base italic font-legal leading-relaxed max-w-md mx-auto">
                  &ldquo;{verdict.sentence}&rdquo;
                </p>
              </div>

              {/* Verdict details */}
              <div className={`border-t border-court-700 pt-5 space-y-4 transition-all duration-700 ${phase === "details" || phase === "complete" ? "opacity-100" : "opacity-0"}`}>
                <VerdictField label="Real risk you might be missing" value={verdict.real_risk} index={0} />
                <VerdictField label="Strongest argument to reconsider" value={verdict.strongest_ignored_argument} index={1} />
                <VerdictField label="Validate before committing" value={verdict.test_first} index={2} />
              </div>

              {/* Gut call note */}
              {gutMismatch && (
                <div className={`border-t border-court-700 pt-4 mt-5 text-center transition-all duration-700 ${phase === "complete" ? "opacity-100" : "opacity-0"}`}>
                  <div className="inline-flex items-center gap-2 text-court-500 text-[11px]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    Your gut said <span className="text-court-300 capitalize font-medium">{gutCall === "ship" ? "Ship it" : "Kill it"}</span> — but the court ruled differently.
                    <span className="text-court-600 ml-1">Worth sitting with.</span>
                  </div>
                </div>
              )}

              {/* Signature block */}
              <div className={`transition-all duration-700 ${phase === "complete" ? "opacity-100" : "opacity-0"}`}>
                <SignatureBlock ruling={ruling} />
              </div>

              {/* Footer */}
              <div className={`border-t border-court-700 pt-4 mt-5 flex items-center justify-between transition-all duration-700 ${phase === "complete" ? "opacity-100" : "opacity-0"}`}>
                <span className="font-mono text-[9px] text-court-600">Filed under seal</span>
                <span className="font-mono text-[9px] text-court-600">featurecourt.app</span>
              </div>
            </div>
          </ScrollworkBorder>

          {/* Actions */}
          <div className={`flex flex-wrap gap-3 mt-8 justify-center transition-all duration-700 ${phase === "complete" ? "opacity-100" : "opacity-0"}`}>
            <button
              onClick={handleCopyLink}
              className="group inline-flex items-center gap-2 px-5 py-3 border border-court-600 hover:border-court-400 text-court-300 hover:text-court-100 rounded-sm transition-all duration-200 text-sm font-medium hover-lift btn-press"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={() => {
                const text = `⚖️ FEATURE COURT\n\n${trial.case_title}\nRuling: ${RULING_LABELS[ruling]}\n\n"${verdict.sentence}"\n\nfeaturecourt.app`;
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);

                if (typeof window !== "undefined" && window.pendo) {
                  window.pendo.track("verdict_shared", {
                    trial_id: trial.id,
                    ruling: ruling,
                    case_title: trial.case_title,
                    is_sample: trial.isSample ?? false,
                  });
                }
              }}
              className="group inline-flex items-center gap-2 px-5 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-sm hover-lift btn-press"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              Share verdict
            </button>
            <Link
              href="/file"
              className="group inline-flex items-center gap-2 px-5 py-3 border border-court-600 hover:border-court-400 text-court-300 hover:text-court-100 rounded-sm transition-all duration-200 text-sm font-medium hover-lift btn-press"
            >
              File another case
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function VerdictField({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: `${index * 0.15}s` }}>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-court-500 mb-1.5">{label}</p>
      <p className="text-court-200 text-sm leading-relaxed font-legal">{value}</p>
    </div>
  );
}