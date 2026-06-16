"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrialData, Ruling } from "@/lib/types";
import { TypewriterText, SignatureBlock, ToastNotification, CourtroomBackground } from "@/components/court-components";

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

const RULING_ACCENTS: Record<Ruling, string> = {
  ship: "rgba(26,107,60,0.15)",
  kill: "rgba(139,26,26,0.15)",
  revise: "rgba(107,90,26,0.15)",
  mistrial: "rgba(74,61,107,0.15)",
};

export default function VerdictPage({ params }: { params: Promise<{ id: string }> }) {
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [ruling, setRuling] = useState<Ruling | null>(null);
  const [gutCall, setGutCall] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSigned, setUserSigned] = useState(false);

  // Ceremony sequence stages
  const [ceremony, setCeremony] = useState({
    gavel: false,
    stamp: false,
    seal: false,
    sentence: false,
    details: false,
    signature: false,
    actions: false,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [screenDim, setScreenDim] = useState(false);
  const [showKillOverlay, setShowKillOverlay] = useState(false);

  useEffect(() => {
    async function load() {
      const { id } = await params;
      const urlParams = new URLSearchParams(window.location.search);
      const r = urlParams.get("ruling") as Ruling;
      setRuling(r);
      setGutCall(urlParams.get("gut"));

      const res = await fetch(`/api/trial?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setTrial(data);
      }
      setLoading(false);
    }
    load();
  }, [params]);

  // Run ceremony sequence when loaded
  useEffect(() => {
    if (!loading && trial && ruling) {
      setScreenDim(true);
      const t1 = setTimeout(() => {}, 400);
      const t2 = setTimeout(() => {}, 800);
      const t3 = setTimeout(() => {
        setCeremony((c) => ({ ...c, gavel: true }));
        setScreenDim(false);
      }, 1200);
      const t4 = setTimeout(() => {
        setCeremony((c) => ({ ...c, stamp: true }));
        if (ruling === "kill") {
          setShowKillOverlay(true);
          setTimeout(() => setShowKillOverlay(false), 2000);
        }
      }, 1800);
      const t5 = setTimeout(() => {
        setCeremony((c) => ({ ...c, seal: true }));
      }, 2400);
      const t6 = setTimeout(() => {
        setCeremony((c) => ({ ...c, sentence: true }));
        if (ruling === "ship") {
          setShowConfetti(true);
        }
      }, 3200);
      const t7 = setTimeout(() => {
        setCeremony((c) => ({ ...c, details: true }));
      }, 4200);
      const t8 = setTimeout(() => {
        setCeremony((c) => ({ ...c, signature: true }));
      }, 5200);
      const t9 = setTimeout(() => {
        setCeremony((c) => ({ ...c, actions: true }));
      }, 6000);

      return () => {
        [t1, t2, t3, t4, t5, t6, t7, t8, t9].forEach(clearTimeout);
      };
    }
  }, [loading, trial, ruling]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  if (loading) return <LoadingState />;
  if (!trial || !ruling) return <NotFoundState />;

  const verdict = trial.verdicts[ruling];
  const gutMismatch = gutCall && ruling !== gutCall;
  const accentColor = RULING_ACCENTS[ruling];

  return (
    <div className="min-h-screen flex flex-col wood-panel relative" style={{ "--verdict-accent": accentColor } as React.CSSProperties & Record<string, string>}>
      <CourtroomBackground opacity={0.08} />
      {showConfetti && <div className="fixed inset-0 pointer-events-none z-50 bg-gradient-to-t from-transparent via-gold-500/5 to-transparent" />}
      {screenDim && (
        <div className="fixed inset-0 bg-black/60 z-50 animate-fade-in" />
      )}

      <ToastNotification
        message={toastMessage}
        show={showToast}
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold-500">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        }
        onComplete={() => setShowToast(false)}
      />

      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="font-display text-base text-gold-500">FEATURE COURT</span>
          </Link>
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">Final Verdict</span>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 flex items-center justify-center relative z-10">
        <div className="max-w-xl w-full">
          {/* Official Verdict Certificate */}
            <div className={`verdict-certificate verdict-certificate-${ruling} p-4 md:p-6 overflow-hidden ${ceremony.gavel ? "" : "opacity-0"} transition-opacity duration-1000`}>
              {/* Background accent glow for ruling */}
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 50%, ${accentColor} 0%, transparent 70%)`,
                }}
              />

              {/* Kill It dramatic red stamp overlay */}
              {ruling === "kill" && showKillOverlay && (
                <div className="absolute inset-0 pointer-events-none z-20 animate-kill-stamp flex items-center justify-center">
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: "radial-gradient(ellipse at 50% 50%, rgba(139,26,26,0.25) 0%, transparent 60%)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center -rotate-6">
                    <div
                      className="px-12 py-6 border-4 border-stamp-kill"
                      style={{
                        background: "rgba(139,26,26,0.15)",
                        boxShadow: "0 0 60px rgba(139,26,26,0.3), inset 0 0 30px rgba(139,26,26,0.1)",
                      }}
                    >
                      <p className="font-serif text-4xl sm:text-5xl font-black tracking-[0.2em] text-stamp-kill" style={{ textShadow: "0 0 20px rgba(139,26,26,0.4)" }}>
                        KILL IT
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Red wash behind Kill It */}
              {ruling === "kill" && showKillOverlay && (
                <div className="absolute inset-0 pointer-events-none z-10 animate-kill-wash" />
              )}

              {/* Letterhead */}
              <div className={`text-center border-b border-court-700 pb-4 mb-4 transition-all duration-1000 relative z-10 ${ceremony.gavel ? "opacity-100" : "opacity-0"}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div>
                    <p className="font-display text-base text-gold-500 tracking-tight">FEATURE COURT</p>
                    <p className="text-[8px] text-court-600 font-mono uppercase tracking-[0.25em]">District of Product Decisions</p>
                  </div>
                </div>
                <p className="text-[8px] text-court-600 font-mono uppercase tracking-[0.3em]">In the Court of Product Decisions · Established 2026</p>
                <p className="text-[8px] text-court-500 font-mono mt-1 tracking-wider">
                  Docket No. {trial.id.slice(0, 8).toUpperCase()} · Filed Under Seal
                </p>
              </div>

              {/* Case title */}
              <div className={`text-center mb-5 transition-all duration-1000 delay-200 relative z-10 ${ceremony.gavel ? "opacity-100" : "opacity-0"}`}>
                <h1 className="font-display text-lg sm:text-xl font-bold text-gold-500 leading-tight">
                  {trial.case_title}
                </h1>
              </div>

              {/* Ruling stamp with slam animation */}
              <div className={`text-center py-5 relative z-10 ${ceremony.stamp ? "opacity-100" : "opacity-0"}`}>
                <div className={`inline-block ${RULING_BG[ruling]} border-2 ${RULING_COLORS[ruling]} px-10 py-4 rounded-sm ${ceremony.stamp ? "animate-stamp-impact" : ""}`}>
                  <p className={`font-serif text-2xl sm:text-3xl font-black tracking-[0.15em] ${RULING_COLORS[ruling]}`}>
                    {RULING_LABELS[ruling]}
                  </p>
                </div>
              </div>

              {/* Ink splash effect behind stamp */}
              <div className={`flex justify-center -mt-8 relative z-0 ${ceremony.stamp ? "animate-ink-splash" : "opacity-0"}`}>
                <div
                  className="w-32 h-32 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                    filter: "blur(8px)",
                  }}
                />
              </div>

              {/* Sentence typewriter */}
              <div className={`text-center mb-4 transition-all duration-700 relative z-10 ${ceremony.sentence ? "opacity-100" : "opacity-0"}`}>
                <div className="border-t border-gold-500/20 mb-3"></div>
                <p className="text-court-200 text-base italic font-certificate leading-relaxed max-w-md mx-auto">
                  <TypewriterText text={verdict.sentence} speed={25} tag="span" />
                </p>
              </div>

              {/* Verdict details */}
              <div className={`border-t border-court-700 pt-5 space-y-4 transition-all duration-700 relative z-10 ${ceremony.details ? "opacity-100" : "opacity-0"}`}>
                <VerdictField label="Real risk you might be missing" value={verdict.real_risk} index={0} />
                <VerdictField label="Strongest argument to reconsider" value={verdict.strongest_ignored_argument} index={1} />
                <VerdictField label="Validate before committing" value={verdict.test_first} index={2} />
              </div>

              {/* Gut call note */}
              {gutMismatch && (
                <div className={`border-t border-court-700 pt-4 mt-5 text-center transition-all duration-700 relative z-10 ${ceremony.details ? "opacity-100" : "opacity-0"}`}>
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

              {/* Signature block — interactive, click to sign */}
              <div className={`relative z-10 ${ceremony.signature ? "opacity-100" : "opacity-0"}`}>
                <SignatureBlock interactive onSign={() => setUserSigned(true)} />
              </div>

              {/* Footer */}
              <div className={`border-t border-court-700 pt-4 mt-5 flex items-center justify-between transition-all duration-700 relative z-10 ${ceremony.signature ? "opacity-100" : "opacity-0"}`}>
                <span className="font-mono text-[9px] text-court-600">Filed under seal</span>
                <span className="font-mono text-[9px] text-court-600">featurecourt.app</span>
              </div>
            </div>

          {/* Actions */}
          <div className={`flex flex-wrap gap-3 mt-8 justify-center transition-all duration-700 delay-200 ${ceremony.actions ? "opacity-100" : "opacity-0"}`}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                triggerToast("Verdict link copied");

                if (typeof window !== "undefined" && window.pendo) {
                  window.pendo.track("verdict_link_copied", {
                    trial_id: trial?.id ?? "",
                    ruling: ruling ?? "",
                    case_title: trial?.case_title ?? "",
                    is_sample: trial?.isSample ?? false,
                  });
                }
              }}
              className="group inline-flex items-center gap-2 px-5 py-3 border border-court-600 hover:border-court-400 text-court-300 hover:text-court-100 rounded-sm transition-all duration-200 text-sm font-medium animate-button-press"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:scale-110 transition-transform">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy link
            </button>
            <button
              onClick={() => {
                const text = `FEATURE COURT\n\n${trial.case_title}\nRuling: ${RULING_LABELS[ruling]}\n\n"${verdict.sentence}"\n\nfeaturecourt.app`;
                navigator.clipboard.writeText(text);
                triggerToast("Verdict text copied");

                if (typeof window !== "undefined" && window.pendo) {
                  window.pendo.track("verdict_shared", {
                    trial_id: trial.id,
                    ruling: ruling,
                    case_title: trial.case_title,
                    is_sample: trial.isSample ?? false,
                  });
                }
              }}
              className="group inline-flex items-center gap-2 px-5 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-sm animate-button-press"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:scale-110 transition-transform">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              Share verdict
            </button>
            <Link
              href="/file"
              className="group inline-flex items-center gap-2 px-5 py-3 border border-court-600 hover:border-court-400 text-court-300 hover:text-court-100 rounded-sm transition-all duration-200 text-sm font-medium animate-button-press"
            >
              File another case
            </Link>
            <Link
              href="/gallery"
              className="group inline-flex items-center gap-2 px-5 py-3 border border-court-600 hover:border-court-400 text-court-300 hover:text-court-100 rounded-sm transition-all duration-200 text-sm font-medium animate-button-press"
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

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center wood-panel">
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 rounded-full border border-gold-500/30 animate-pulse" />
        <div className="text-court-400 font-serif">Preparing the verdict...</div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 wood-panel">
      <p className="text-court-400 font-serif">Verdict not found.</p>
      <Link href="/" className="text-gold-500 hover:text-gold-400 underline">Return to the court</Link>
    </div>
  );
}