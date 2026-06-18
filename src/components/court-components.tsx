"use client";

import { useEffect, useState, useRef, useCallback, useReducer, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { CAST } from "@/lib/cast";
import { playGavelClunk } from "@/lib/gavel-sound";

// ─── Ornate Court Seal ───

export function CourtSeal({ className = "w-12 h-12", animated = false }: { className?: string; animated?: boolean }) {
  return (
    <div className={`relative ${animated ? "animate-seal-appear" : ""}`}>
      <Image
        src="/images/seal.png"
        alt="Court seal"
        width={48}
        height={48}
        className={`${className} object-contain`}
        unoptimized
        priority
      />
    </div>
  );
}

// ─── Site chrome ───

export function SiteBrand() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <CourtSeal className="w-5 h-5 text-gold-500" />
      <span className="font-display text-sm font-black text-gold-500 tracking-tight uppercase">
        FEATURE COURT
      </span>
    </Link>
  );
}

export function SiteNavLinks() {
  return (
    <nav className="flex items-center gap-4 sm:gap-6" aria-label="Site navigation">
      <Link href="/" className="text-sm text-court-400 hover:text-court-200 transition-colors">
        Home
      </Link>
      <Link href="/guide" className="text-sm text-court-400 hover:text-court-200 transition-colors">
        Guide
      </Link>
      <Link href="/gallery" className="text-sm text-court-400 hover:text-court-200 transition-colors">
        Verdicts
      </Link>
    </nav>
  );
}

export function SiteHomeLink() {
  return (
    <Link
      href="/"
      className="text-[10px] text-court-400 hover:text-court-200 font-mono uppercase tracking-[0.15em] transition-colors"
    >
      Home
    </Link>
  );
}

export function SiteFooter({ end }: { end?: React.ReactNode }) {
  return (
    <footer className="border-t border-court-800 px-6 sm:px-8 py-4 relative z-10">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap text-court-600 text-xs">
        <span className="font-mono uppercase tracking-[0.15em]">Feature Court</span>
        <div className="flex items-center gap-4 flex-wrap">
          <span>
            Built by{" "}
            <a
              href={SITE.creatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-court-400 hover:text-court-200 transition-colors"
            >
              {SITE.creatorName}
            </a>
          </span>
          {end}
        </div>
      </div>
    </footer>
  );
}

// ─── Wax Seal ───

export function WaxSeal({ ruling, animated = true, size = 72 }: { ruling?: string; animated?: boolean; size?: number }) {
  const colorMap: Record<string, string> = {
    ship: "#1a6b3c",
    kill: "#8b1a1a",
    revise: "#6b5a1a",
    mistrial: "#4a3d6b",
  };
  const fill = ruling ? colorMap[ruling] || "#8b1a1a" : "#8b1a1a";

  return (
    <div className={`${animated ? "animate-stamp-impact" : ""} inline-block`}>
      <svg viewBox="0 0 60 60" width={size} height={size}>
        <defs>
          <filter id="waxTexture">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
          </filter>
          <radialGradient id={`waxGrad-${ruling || "default"}`} cx="40%" cy="35%">
            <stop offset="0%" stopColor={fill} stopOpacity="0.95" />
            <stop offset="40%" stopColor={fill} stopOpacity="0.85" />
            <stop offset="70%" stopColor={fill} stopOpacity="0.7" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.5" />
          </radialGradient>
        </defs>
        {/* Wax blob shadow */}
        <ellipse cx="30" cy="32" rx="28" ry="26" fill="rgba(0,0,0,0.3)" filter="url(#waxTexture)" opacity="0.3" />
        {/* Wax blob */}
        <ellipse cx="30" cy="30" rx="28" ry="26" fill={`url(#waxGrad-${ruling || "default"})`} filter="url(#waxTexture)" />
        {/* Raised rim */}
        <ellipse cx="30" cy="30" rx="22" ry="20" fill="none" stroke={fill} strokeWidth="0.5" opacity="0.4" />
        {/* Embossed FC emblem */}
        <text x="30" y="35" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="16" fontWeight="bold" fontFamily="serif">FC</text>
        {/* Ribbon hanging from seal */}
        <path d="M22 48 Q30 58 38 48" fill="none" stroke={fill} strokeWidth="1.5" opacity="0.4" />
        <path d="M26 50 Q30 56 34 50" fill="none" stroke={fill} strokeWidth="1" opacity="0.3" />
        {/* Rough edge - decorative dots */}
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i * 18 * Math.PI) / 180;
          return (
            <circle
              key={i}
              cx={30 + 26 * Math.cos(angle)}
              cy={30 + 24 * Math.sin(angle)}
              r="1.5"
              fill={fill}
              opacity="0.25"
            />
          );
        })}
      </svg>
    </div>
  );
}

// ─── Stage Progress ───

const STAGES = [
  { num: 1, label: "Arraignment" },
  { num: 2, label: "Prosecution" },
  { num: 3, label: "Defense" },
  { num: 4, label: "Cross" },
  { num: 5, label: "Ruling" },
];

/** Shared width tokens for trial stage pages — widen on large viewports. */
export const trialStageShellClass = "w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto";
export const trialStageHeaderClass = "w-full max-w-4xl lg:max-w-6xl mx-auto";

/** Fixed height for counsel two-column stage (profile + scrollable content). */
export const counselStagePanelHeightClass = "h-[calc(100vh-13rem)] min-h-[28rem]";

function CounselProfileCard({
  portrait,
  portraitLarge,
  name,
  title,
  tall = false,
}: {
  portrait: React.ReactNode;
  portraitLarge: React.ReactNode;
  name: string;
  title: string;
  tall?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-4 border border-court-700 rounded-sm px-5 py-5 bg-court-900/60 w-full text-center ${
        tall ? `${counselStagePanelHeightClass} justify-between` : ""
      }`}
    >
      <div className={`w-full ${tall ? "flex-1 flex items-center justify-center min-h-0 py-2 [&_img]:max-h-full [&_img]:w-auto [&_img]:mx-auto" : ""}`}>
        {tall ? portraitLarge : portrait}
      </div>
      <div className="shrink-0 w-full">
        <h2 className="font-serif text-base lg:text-lg text-court-100 leading-snug">{name}</h2>
        <p className="text-court-600 text-xs font-mono uppercase tracking-[0.15em] mt-1">{title}</p>
      </div>
    </div>
  );
}

export function CounselStageLayout({
  portrait,
  portraitLarge,
  name,
  title,
  children,
  footer,
}: {
  portrait: React.ReactNode;
  portraitLarge: React.ReactNode;
  name: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const footerBlock = footer ? (
    <div className="pt-4 mt-4 border-t border-court-800/80 shrink-0 w-full flex flex-col items-center justify-center text-center gap-3">
      {footer}
    </div>
  ) : null;

  return (
    <div className="animate-fade-in-up">
      {/* Mobile: stacked, page scrolls normally */}
      <div className="lg:hidden">
        <CounselProfileCard portrait={portrait} portraitLarge={portraitLarge} name={name} title={title} />
        <div className="space-y-4 mt-5 w-full">{children}</div>
        {footerBlock}
      </div>

      {/* Desktop: 1/3 profile (fixed) + 2/3 content (scrolls, footer pinned below) */}
      <div className={`hidden lg:grid lg:grid-cols-3 lg:gap-8 xl:gap-10 ${counselStagePanelHeightClass}`}>
        <div className="col-span-1 min-h-0">
          <CounselProfileCard
            portrait={portrait}
            portraitLarge={portraitLarge}
            name={name}
            title={title}
            tall
          />
        </div>
        <div className="col-span-2 min-h-0 flex flex-col">
          <div className="relative flex-1 min-h-0">
            <div className="h-full overflow-y-auto overscroll-contain pr-1 counsel-stage-scroll">
              <div className="space-y-4 pb-2">{children}</div>
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-court-950/90 to-transparent"
              aria-hidden="true"
            />
          </div>
          {footerBlock}
        </div>
      </div>
    </div>
  );
}

export function StageProgress({ current }: { current: number }) {
  return (
    <div className="w-full max-w-xl lg:max-w-4xl xl:max-w-5xl mx-auto mb-10">
      <div className="flex items-center justify-between">
        {STAGES.map((stage, i) => (
          <div key={stage.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-mono transition-all duration-700 ${
                  stage.num <= current
                    ? "bg-gold-500/20 border-gold-500 text-gold-400 shadow-[0_0_8px_rgba(212,175,55,0.2)]"
                    : "border-court-700 text-court-600"
                } ${stage.num === current ? "animate-glow-pulse" : ""}`}
              >
                {stage.num < current ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  stage.num
                )}
              </div>
              <span
                className={`text-[9px] font-mono uppercase tracking-wider mt-1.5 transition-all duration-500 ${
                  stage.num === current ? "text-gold-500" : "text-court-600"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="flex items-center mx-2">
                {stage.num < current ? (
                  <svg width="20" height="12" viewBox="0 0 20 12" className="text-gold-500/40">
                    <rect x="0" y="5" width="12" height="2" rx="1" fill="currentColor" />
                    <path d="M14 2 L18 6 L14 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                ) : (
                  <div className="w-14 sm:w-16 lg:w-20 xl:w-28 h-px bg-court-700" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Interactive Gavel ───

export function InteractiveGavel({ onStrike, className = "", width = 72, height = 72 }: { onStrike?: () => void; className?: string; width?: number; height?: number }) {
  const [striking, setStriking] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleClick = () => {
    setStriking(true);
    playGavelClunk();
    onStrike?.();
    setTimeout(() => setStriking(false), 600);
  };

  if (!imgError) {
    return (
      <button
        onClick={handleClick}
        className={`cursor-pointer focus:outline-none ${className}`}
        aria-label="Strike gavel"
      >
        <div className={striking ? "animate-gavel-strike" : ""}>
          <Image
            src="/images/gavel.png"
            alt="Gavel"
            width={width}
            height={height}
            className="shrink-0 object-contain"
            unoptimized
            onError={() => setImgError(true)}
            priority
          />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`cursor-pointer focus:outline-none ${className}`}
      aria-label="Strike gavel"
    >
      <div className={striking ? "animate-gavel-strike" : ""}>
        <svg width="72" height="72" viewBox="0 0 56 56" fill="none" className="text-gold-500" style={{ filter: "drop-shadow(0 0 12px rgba(212,175,55,0.25))" }}>
          {/* Platform base */}
          <rect x="16" y="42" width="24" height="4" rx="1" fill="currentColor" opacity="0.35" />
          {/* Handle */}
          <rect x="25" y="22" width="6" height="22" rx="1.5" fill="currentColor" opacity="0.55" />
          {/* Gavel head */}
          <rect x="13" y="6" width="30" height="18" rx="3" fill="currentColor" opacity="0.85" />
          {/* Star emblem on gavel */}
          <polygon points="28,8 30.5,13 36,13 31.5,16.5 33,22 28,19 23,22 24.5,16.5 20,13 25.5,13" fill="var(--color-court-950)" opacity="0.9" />
          {/* Decorative lines on gavel head */}
          <line x1="15" y1="18" x2="26" y2="18" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="30" y1="18" x2="41" y2="18" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        </svg>
      </div>
    </button>
  );
}

// ─── Judicial Bench ───

export function JudicialBench({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative text-center ${className}`}>
      {/* Bench top accent */}
      <div className="relative inline-block">
        <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-500/40 to-transparent rounded-full" />
        {children}
      </div>
    </div>
  );
}

// ─── Case Docket Header ───

export function CaseDocketHeader({
  caseNo,
  caseTitle,
  stageLabel,
}: {
  caseNo: string;
  caseTitle: string;
  stageLabel: string;
}) {
  return (
    <div className="border-b border-court-700 pb-3 mb-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <CourtSeal className="w-6 h-6 text-gold-500" />
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">
            Docket No. {caseNo.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <span className="font-mono text-[10px] text-gold-500 uppercase tracking-[0.25em]">{stageLabel}</span>
      </div>
      <p className="font-serif text-court-200 text-sm leading-snug mt-1">{caseTitle}</p>
    </div>
  );
}

// ─── Legal Ribbon Banner ───

export function LegalRibbon({ text, color = "#8b1a1a" }: { text: string; color?: string }) {
  return (
    <div className="ribbon-banner text-center mb-8 animate-ribbon-slide">
      <div
        className="inline-block px-8 py-2"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
          clipPath: "polygon(0 0, 100% 0, 95% 50%, 100% 100%, 0 100%, 5% 50%)",
        }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white font-bold">{text}</span>
      </div>
    </div>
  );
}

// ─── Signature Block ───

export function SignatureBlock({
  date,
  interactive = false,
  onSign,
  printedName = "Hon. Ship Itwell",
}: {
  date?: string;
  interactive?: boolean;
  onSign?: () => void;
  printedName?: string;
}) {
  const today = date || new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const [signed, setSigned] = useState(false);

  const handleSign = () => {
    if (signed) return;
    setSigned(true);
    onSign?.();
  };

  const signatureMark = (
    <p className="judge-signature text-[2.75rem] text-gold-400 leading-none tracking-normal pt-1">
      Ship Itwell
    </p>
  );

  return (
    <div className="mt-6 pt-4 border-t border-court-700">
      <p className="font-legal text-court-500 text-xs italic mb-4">
        So ordered this day, {today}.
      </p>
      <div className="flex items-center gap-4">
        <div className="flex-[3] min-w-0">
          <div className="min-h-[2.5rem]">
            {interactive ? (
              <button
                onClick={handleSign}
                disabled={signed}
                className={`block text-left w-full cursor-pointer ${signed ? "" : "group"}`}
              >
                {signed ? (
                  signatureMark
                ) : (
                  <div className="border border-dashed border-court-600 rounded-sm px-4 py-2 group-hover:border-gold-500/50 group-hover:bg-gold-500/5 transition-all duration-200">
                    <span className="font-mono text-[10px] text-court-500 group-hover:text-gold-500 uppercase tracking-[0.15em] transition-colors">
                      Click to sign
                    </span>
                  </div>
                )}
              </button>
            ) : (
              signatureMark
            )}
          </div>
          <p className="font-serif text-court-200 text-sm mt-3">{printedName}</p>
          <p className="font-mono text-[9px] text-court-600 uppercase tracking-[0.15em] mt-0.5">
            Presiding Judge
          </p>
        </div>
        <div className="flex-[1] flex justify-center items-center shrink-0">
          <JudgePortrait size="thumb" reaction="neutral" />
        </div>
      </div>
    </div>
  );
}

// ─── Typewriter Text ───

export function TypewriterText({
  text,
  speed = 30,
  delay = 0,
  className = "",
  tag: Tag = "p",
  onComplete,
}: {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  tag?: "p" | "h1" | "h2" | "h3" | "span" | "div";
  onComplete?: () => void;
}) {
  type TWState = { displayed: string; started: boolean };
type TWAction = { type: 'RESET' } | { type: 'START' } | { type: 'ADD_CHAR'; text: string; i: number };

function twReducer(state: TWState, action: TWAction): TWState {
  switch (action.type) {
    case 'RESET': return { displayed: '', started: false };
    case 'START': return { ...state, started: true };
    case 'ADD_CHAR': return { ...state, displayed: action.text.slice(0, action.i) };
    default: return state;
  }
}

  const [{ displayed, started }, dispatch] = useReducer(twReducer, { displayed: '', started: false });
  const completedRef = useRef(false);

  useEffect(() => {
    dispatch({ type: 'RESET' });
    completedRef.current = false;
    const timer = setTimeout(() => dispatch({ type: 'START' }), delay);
    return () => clearTimeout(timer);
  }, [delay, text]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      dispatch({ type: 'ADD_CHAR', text, i });
      if (i >= text.length) {
        clearInterval(interval);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }
    }, speed);
    return () => clearInterval(interval);
  }, [started, text, speed, onComplete]);

  return (
    <Tag className={className}>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-gold-500/70 ml-0.5 animate-pulse align-middle" />
      )}
    </Tag>
  );
}

// ─── Ornate Divider ───

export function OrnateDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div className="flex-1 max-w-24">
        <svg viewBox="0 0 100 10" className="w-full h-3 text-court-600" fill="none">
          <path d="M0 5 Q25 0 50 5 Q75 10 100 5" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
        </svg>
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gold-500 shrink-0">
        <polygon points="12,3 14,9 20,9 15,13 17,19 12,15 7,19 9,13 4,9 10,9" fill="currentColor" opacity="0.6" />
      </svg>
      <div className="flex-1 max-w-24">
        <svg viewBox="0 0 100 10" className="w-full h-3 text-court-600" fill="none">
          <path d="M0 5 Q25 0 50 5 Q75 10 100 5" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

// ─── Scrollwork Border ───

export function ScrollworkBorder({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Corner scrollwork - top left */}
      <div className="absolute -top-3 -left-3 w-12 h-12 pointer-events-none">
        <svg viewBox="0 0 40 40" className="w-full h-full text-gold-500/30" fill="none">
          <path d="M0 40V0h40" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 35V5h30" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="0.5" />
          <path d="M0 20 Q10 15 20 0" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <circle cx="6" cy="12" r="1" fill="currentColor" opacity="0.2" />
        </svg>
      </div>
      {/* Corner scrollwork - top right */}
      <div className="absolute -top-3 -right-3 w-12 h-12 pointer-events-none rotate-90">
        <svg viewBox="0 0 40 40" className="w-full h-full text-gold-500/30" fill="none">
          <path d="M0 40V0h40" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 35V5h30" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="6" cy="12" r="1" fill="currentColor" opacity="0.2" />
        </svg>
      </div>
      {/* Corner scrollwork - bottom left */}
      <div className="absolute -bottom-3 -left-3 w-12 h-12 pointer-events-none -rotate-90">
        <svg viewBox="0 0 40 40" className="w-full h-full text-gold-500/30" fill="none">
          <path d="M0 40V0h40" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 35V5h30" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </div>
      {/* Corner scrollwork - bottom right */}
      <div className="absolute -bottom-3 -right-3 w-12 h-12 pointer-events-none rotate-180">
        <svg viewBox="0 0 40 40" className="w-full h-full text-gold-500/30" fill="none">
          <path d="M0 40V0h40" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 35V5h30" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </div>
      {children}
    </div>
  );
}

// ─── Letterhead ───

export function Letterhead({ caseNo }: { caseNo?: string }) {
  return (
    <div className="text-center border-b-2 border-court-700 pb-5 mb-6">
      <div className="flex items-center justify-center gap-3 mb-3">
        <CourtSeal className="w-8 h-8 text-gold-500" />
        <div>
          <h2 className="font-serif text-lg text-court-100 tracking-wide">Feature Court</h2>
          <p className="text-[9px] text-court-600 font-mono uppercase tracking-[0.2em]">
            District of Product Decisions
          </p>
        </div>
        <CourtSeal className="w-8 h-8 text-gold-500" />
      </div>
      <p className="text-[9px] text-court-600 font-mono uppercase tracking-[0.25em] mt-2">
        In the Court of Product Decisions · Established 2026
      </p>
      {caseNo && (
        <p className="text-[9px] text-court-600 font-mono mt-1">
          Docket No. <span className="text-court-500">{caseNo}</span> · Filed Under Seal
        </p>
      )}
    </div>
  );
}

// ─── Gold Particles ───

export function GoldParticles({ count = 20 }: { count?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.style.cssText = `
        position: fixed;
        width: ${2 + Math.random() * 3}px;
        height: ${2 + Math.random() * 3}px;
        background: rgba(212, 175, 55, ${0.1 + Math.random() * 0.2});
        border-radius: 50%;
        pointer-events: none;
        z-index: 9998;
        left: ${Math.random() * 100}vw;
        top: ${Math.random() * 100}vh;
        animation: particle-float ${15 + Math.random() * 20}s linear infinite;
        animation-delay: ${-Math.random() * 20}s;
        opacity: ${0.1 + Math.random() * 0.15};
      `;
      document.body.appendChild(p);
      particles.push(p);
    }

    return () => {
      particles.forEach((p) => p.remove());
    };
  }, [count]);

  return <div ref={containerRef} />;
}

// ─── Dust Motes ───

export function DustMotes({ count = 8 }: { count?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const motes: HTMLDivElement[] = [];
    for (let i = 0; i < count; i++) {
      const m = document.createElement("div");
      m.style.cssText = `
        position: fixed;
        width: ${1 + Math.random() * 2}px;
        height: ${1 + Math.random() * 2}px;
        background: rgba(212, 175, 55, ${0.03 + Math.random() * 0.06});
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        left: ${Math.random() * 100}vw;
        top: ${Math.random() * 100}vh;
        animation: dust-float ${20 + Math.random() * 30}s ease-in-out infinite;
        animation-delay: ${-Math.random() * 30}s;
      `;
      document.body.appendChild(m);
      motes.push(m);
    }

    return () => {
      motes.forEach((m) => m.remove());
    };
  }, [count]);

  return <div ref={containerRef} />;
}

// ─── Rubber Stamp ───

export function RubberStamp({
  text,
  color = "#8b1a1a",
  offset = true,
}: {
  text: string;
  color?: string;
  offset?: boolean;
}) {
  const [rotation] = useState(() => offset ? (Math.random() - 0.5) * 6 : 0);
  const inkDx = 1;
  const inkDy = 1;

  return (
    <div
      className="animate-stamp-impact inline-block"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div
        className="px-6 py-3"
        style={{
          border: `3px solid ${color}`,
          background: `${color}08`,
          borderRadius: "4px",
          boxShadow: `inset 0 0 0 1px ${color}20`,
        }}
      >
        <p
          className="font-serif text-2xl font-black tracking-[0.15em]"
          style={{ color }}
        >
          {text}
        </p>
      </div>
      {/* Ink bleed effect */}
      <div
        className="absolute inset-0 -z-10 blur-sm opacity-30"
        style={{
          border: `2px solid ${color}`,
          borderRadius: "4px",
          transform: `translate(${inkDx}px, ${inkDy}px)`,
        }}
      />
    </div>
  );
}

// ─── Confetti Effect ───

export function ConfettiEffect({ active, duration = 3000 }: { active: boolean; duration?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const colors = ["#d4af37", "#f0d974", "#b8942f", "#8b6f3e", "#e6c84a", "#f7ecb3"];
    const pieces: HTMLDivElement[] = [];

    for (let i = 0; i < 40; i++) {
      const p = document.createElement("div");
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 4 + Math.random() * 6;
      const left = Math.random() * 100;
      const delay = Math.random() * 1;
      const fallDuration = 2 + Math.random() * 2;

      p.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size * 0.6}px;
        background: ${color};
        left: ${left}%;
        top: -10px;
        border-radius: 1px;
        animation: confetti-fall ${fallDuration}s ease-in ${delay}s forwards;
        transform: rotate(${Math.random() * 360}deg);
      `;
      container.appendChild(p);
      pieces.push(p);
    }

    const timer = setTimeout(() => {
      pieces.forEach((p) => p.remove());
    }, duration + 2000);

    return () => {
      clearTimeout(timer);
      pieces.forEach((p) => p.remove());
    };
  }, [active, duration]);

  if (!active) return null;

  return <div ref={containerRef} className="confetti-container" />;
}

// ─── Toast Notification ───

export function ToastNotification({ message, show, icon, onComplete }: { message: string; show: boolean; icon?: React.ReactNode; onComplete?: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onComplete?.(), 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="toast-notification">
      {icon && <span>{icon}</span>}
      <span>{message}</span>
    </div>
  );
}

// ─── Page Transition ───

export function PageTransition({ children, direction = "in" }: { children: React.ReactNode; direction?: "in" | "out" }) {
  return (
    <div className={direction === "in" ? "animate-swoosh-in" : "animate-swoosh-out"}>
      {children}
    </div>
  );
}

// ─── Loading Ceremony ───

export function LoadingCeremony({ message = "The court is assembling..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center wood-panel">
      <div className="flex flex-col items-center gap-6 animate-page-enter">
        <CourtSeal className="w-12 h-12 text-gold-500" animated />
        <div className="font-serif text-court-400 text-lg animate-pulse">{message}</div>
      </div>
    </div>
  );
}

// ─── Objection Stamp ───

type StampAction = { type: 'SHOW' } | { type: 'HIDE' };

function stampReducer(state: boolean, action: StampAction): boolean {
  switch (action.type) {
    case 'SHOW': return true;
    case 'HIDE': return false;
    default: return state;
  }
}

export function ObjectionStamp({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const [showing, dispatch] = useReducer(stampReducer, false);

  useEffect(() => {
    if (active) {
      dispatch({ type: 'SHOW' });
      const timer = setTimeout(() => {
        dispatch({ type: 'HIDE' });
        onComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!showing) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="animate-stamp-impact">
        <div className="px-8 py-4 border-4 border-red-700 bg-red-900/30 rotate-[-8deg]">
          <p className="font-serif text-3xl font-black tracking-[0.2em] text-red-600">OBJECTION!</p>
        </div>
      </div>
    </div>
  );
}

// ─── Courtroom Background (SVG Scene) ───

export function CourtroomBackground({ opacity = 0.12 }: { opacity?: number }) {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <div className="courtroom-bg" style={{ opacity }}>
        <Image
          src="/images/courtroom.png"
          alt="Courtroom"
          fill
          className="object-cover"
          unoptimized
          onError={() => setImgError(true)}
          priority
        />
      </div>
    );
  }

  return (
    <div className="courtroom-bg" style={{ opacity }}>
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Vaulted ceiling */}
        <path d="M0 0 L1440 0 L1440 120 Q1080 30 720 60 Q360 30 0 120 Z" fill="currentColor" opacity="0.08" />
        <path d="M0 120 Q360 30 720 60 Q1080 30 1440 120 L1440 140 Q1080 50 720 80 Q360 50 0 140 Z" fill="currentColor" opacity="0.05" />

        {/* Left column */}
        <rect x="60" y="60" width="40" height="840" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="50" y="55" width="60" height="12" rx="2" fill="currentColor" opacity="0.1" />
        <rect x="50" y="893" width="60" height="12" rx="2" fill="currentColor" opacity="0.1" />
        <rect x="65" y="72" width="30" height="826" fill="currentColor" opacity="0.03" />

        {/* Right column */}
        <rect x="1340" y="60" width="40" height="840" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="1330" y="55" width="60" height="12" rx="2" fill="currentColor" opacity="0.1" />
        <rect x="1330" y="893" width="60" height="12" rx="2" fill="currentColor" opacity="0.1" />
        <rect x="1345" y="72" width="30" height="826" fill="currentColor" opacity="0.03" />

        {/* Left column capital */}
        <path d="M40 55 L140 55 L130 70 L50 70 Z" fill="currentColor" opacity="0.08" />
        <path d="M40 888 L140 888 L130 900 L50 900 Z" fill="currentColor" opacity="0.08" />

        {/* Right column capital */}
        <path d="M1300 55 L1400 55 L1390 70 L1310 70 Z" fill="currentColor" opacity="0.08" />
        <path d="M1300 888 L1400 888 L1390 900 L1310 900 Z" fill="currentColor" opacity="0.08" />

        {/* Judge's bench */}
        <rect x="540" y="300" width="360" height="180" rx="4" fill="currentColor" opacity="0.08" />
        <rect x="530" y="300" width="380" height="8" rx="2" fill="currentColor" opacity="0.12" />
        <rect x="550" y="310" width="340" height="6" fill="currentColor" opacity="0.06" />
        <rect x="540" y="460" width="360" height="5" fill="currentColor" opacity="0.1" />
        {/* Bench seal */}
        <circle cx="720" cy="390" r="36" stroke="currentColor" opacity="0.15" strokeWidth="1" />
        <circle cx="720" cy="390" r="24" stroke="currentColor" opacity="0.1" strokeWidth="0.5" />
        {/* Bench front panel */}
        <rect x="580" y="400" width="280" height="60" rx="2" fill="currentColor" opacity="0.04" />

        {/* Light beam */}
        <path d="M600 0 L840 0 L960 300 L480 300 Z" fill="currentColor" opacity="0.03" />
        <path d="M640 0 L800 0 L880 300 L560 300 Z" fill="currentColor" opacity="0.02" />

        {/* Floor */}
        <rect x="0" y="600" width="1440" height="300" fill="currentColor" opacity="0.04" />
        <rect x="0" y="600" width="1440" height="2" fill="currentColor" opacity="0.08" />
        {/* Floor lines */}
        <line x1="0" y1="660" x2="1440" y2="660" stroke="currentColor" opacity="0.03" strokeWidth="0.5" />
        <line x1="0" y1="720" x2="1440" y2="720" stroke="currentColor" opacity="0.03" strokeWidth="0.5" />
        <line x1="0" y1="780" x2="1440" y2="780" stroke="currentColor" opacity="0.03" strokeWidth="0.5" />
        <line x1="0" y1="840" x2="1440" y2="840" stroke="currentColor" opacity="0.03" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

// ─── Character Image Loader ───

function CharacterImage({
  src,
  alt,
  width,
  height,
  children,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) return <>{children}</>;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="shrink-0 object-contain"
      unoptimized
      onError={() => setHasError(true)}
      priority
    />
  );
}

// ─── Character Portraits ───

type PortraitReaction = "neutral" | "serious" | "objecting";

function PortraitHead({ expression = "neutral", color }: { expression: PortraitReaction; color: string }) {
  const eyebrowY = expression === "serious" || expression === "objecting" ? "-1" : "0";
  const mouthD = expression === "objecting"
    ? "M 38 54 Q 42 56 46 54"
    : expression === "serious"
    ? "M 38 54 Q 42 53 46 54"
    : "M 38 53 Q 42 56 46 53";
  const mouthStroke = expression === "objecting" ? "2" : "1.5";
  return (
    <>
      {/* Head shape */}
      <ellipse cx="42" cy="38" rx="16" ry="20" fill={color} opacity="0.3" />
      <ellipse cx="42" cy="38" rx="16" ry="20" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Eyes */}
      <circle cx="36" cy="34" r="2" fill={color} opacity="0.7" />
      <circle cx="48" cy="34" r="2" fill={color} opacity="0.7" />
      {/* Eyebrows */}
      <line x1="32" y1={eyebrowY === "-1" ? "27" : "28"} x2="39" y2={eyebrowY === "-1" ? "26" : "28"} stroke={color} strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
      <line x1="45" y1={eyebrowY === "-1" ? "26" : "28"} x2="52" y2={eyebrowY === "-1" ? "27" : "28"} stroke={color} strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
      {/* Mouth */}
      <path d={mouthD} stroke={color} strokeWidth={mouthStroke} fill="none" opacity="0.6" strokeLinecap="round" />
    </>
  );
}

type PortraitSize = "full" | "medium" | "thumb" | "mini";

const PORTRAIT_DIMS: Record<PortraitSize, { w: number; h: number }> = {
  full: { w: 220, h: 244 },
  medium: { w: 140, h: 155 },
  thumb: { w: 100, h: 110 },
  mini: { w: 52, h: 58 },
};

export function ProsecutorPortrait({ reaction = "neutral", size = "full" }: { reaction?: PortraitReaction; size?: PortraitSize }) {
  const { w, h } = PORTRAIT_DIMS[size];
  const color = "#b91c1c";
  return (
    <CharacterImage src="/images/prosecutor.png" alt="Prosecutor" width={w} height={h}>
      <svg width={w} height={h} viewBox="0 0 84 96" className="shrink-0">
        {/* Shoulders / Suit */}
        <path d="M 10 90 L 18 60 Q 20 55 25 52 L 59 52 Q 64 55 66 60 L 74 90 Z" fill={color} opacity="0.2" />
        <path d="M 18 60 Q 20 55 25 52 L 59 52 Q 64 55 66 60" stroke={color} strokeWidth="1.5" fill="none" opacity="0.4" />
        {/* Pointing arm */}
        <path d="M 66 60 Q 80 45 74 35" stroke={color} strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round" />
        <circle cx="74" cy="34" r="3" fill={color} opacity="0.5" />
        {/* Collar */}
        <path d="M 36 48 L 42 58 L 48 48" stroke={color} strokeWidth="1" fill="none" opacity="0.4" />
        {/* Lapel badge */}
        <circle cx="42" cy="62" r="3" stroke={color} strokeWidth="0.8" fill={color} opacity="0.15" />
        {/* Head */}
        <PortraitHead expression={reaction === "objecting" ? "objecting" : reaction} color={color} />
      </svg>
    </CharacterImage>
  );
}

export function DefensePortrait({ reaction = "neutral", size = "full" }: { reaction?: PortraitReaction; size?: PortraitSize }) {
  const { w, h } = PORTRAIT_DIMS[size];
  const color = "#2563eb";
  return (
    <CharacterImage src="/images/defense.png" alt="Defense" width={w} height={h}>
      <svg width={w} height={h} viewBox="0 0 84 96" className="shrink-0">
        {/* Shoulders / Suit */}
        <path d="M 10 90 L 18 60 Q 20 55 25 52 L 59 52 Q 64 55 66 60 L 74 90 Z" fill={color} opacity="0.15" />
        <path d="M 18 60 Q 20 55 25 52 L 59 52 Q 64 55 66 60" stroke={color} strokeWidth="1.5" fill="none" opacity="0.35" />
        {/* Open palms gesture */}
        <path d="M 66 55 Q 78 48 80 40" stroke={color} strokeWidth="2" fill="none" opacity="0.45" strokeLinecap="round" />
        <path d="M 18 55 Q 6 48 4 40" stroke={color} strokeWidth="2" fill="none" opacity="0.45" strokeLinecap="round" />
        <circle cx="80" cy="39" r="3" fill={color} opacity="0.4" />
        <circle cx="4" cy="39" r="3" fill={color} opacity="0.4" />
        {/* Collar */}
        <path d="M 36 48 L 42 58 L 48 48" stroke={color} strokeWidth="1" fill="none" opacity="0.4" />
        {/* Lapel badge */}
        <circle cx="42" cy="62" r="3" stroke={color} strokeWidth="0.8" fill={color} opacity="0.15" />
        {/* Head */}
        <PortraitHead expression={reaction === "objecting" ? "serious" : reaction} color={color} />
      </svg>
    </CharacterImage>
  );
}

export function BailiffPortrait({ reaction = "neutral", size = "full" }: { reaction?: PortraitReaction; size?: PortraitSize }) {
  const { w, h } = PORTRAIT_DIMS[size];
  const color = "#a67c00";
  return (
    <CharacterImage src="/images/bailiff.png" alt="Bailiff" width={w} height={h}>
      <svg width={w} height={h} viewBox="0 0 84 96" className="shrink-0">
        {/* Shoulders / Uniform */}
        <path d="M 10 90 L 16 58 Q 18 52 24 50 L 60 50 Q 66 52 68 58 L 74 90 Z" fill={color} opacity="0.15" />
        <path d="M 16 58 Q 18 52 24 50 L 60 50 Q 66 52 68 58" stroke={color} strokeWidth="1.5" fill="none" opacity="0.35" />
        {/* Collar / Tie */}
        <path d="M 36 46 L 42 56 L 48 46" fill={color} opacity="0.1" />
        <path d="M 40 48 L 42 56 L 44 48" stroke={color} strokeWidth="0.8" fill="none" opacity="0.3" />
        {/* Badge */}
        <circle cx="42" cy="60" r="4" stroke={color} strokeWidth="0.6" fill={color} opacity="0.1" />
        {/* Head */}
        <PortraitHead expression={reaction} color={color} />
      </svg>
    </CharacterImage>
  );
}

export function JudgePortrait({ reaction = "neutral", size = "full" }: { reaction?: PortraitReaction; size?: PortraitSize }) {
  const color = "#6b7280";
  const { w, h } = PORTRAIT_DIMS[size];
  return (
    <CharacterImage src="/images/judge.png" alt="Judge" width={w} height={h}>
      <svg width={w} height={h} viewBox="0 0 84 96" className="shrink-0">
        {/* Robe */}
        <path d="M 8 96 L 14 52 Q 16 46 22 44 L 62 44 Q 68 46 70 52 L 76 96 Z" fill={color} opacity="0.12" />
        <path d="M 14 52 Q 16 46 22 44 L 62 44 Q 68 46 70 52" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" />
        {/* Collar / Judicial tabs */}
        <rect x="36" y="44" width="12" height="3" rx="1" fill={color} opacity="0.08" />
        <rect x="34" y="48" width="16" height="2" rx="1" fill={color} opacity="0.06" />
        {/* Head */}
        <PortraitHead expression={reaction} color={color} />
        {/* Gray hair / judicial look */}
        <ellipse cx="42" cy="22" rx="14" ry="4" fill={color} opacity="0.08" />
      </svg>
    </CharacterImage>
  );
}

type PortraitComponent = React.ComponentType<{ reaction?: PortraitReaction; size?: PortraitSize }>;

function DialoguePortraitPair({
  Portrait,
  reaction = "neutral",
}: {
  Portrait: PortraitComponent;
  reaction?: PortraitReaction;
}) {
  return (
    <>
      <span className="inline-flex lg:hidden">
        <Portrait size="thumb" reaction={reaction} />
      </span>
      <span className="hidden lg:inline-flex">
        <Portrait size="medium" reaction={reaction} />
      </span>
    </>
  );
}

/** Bailiff-only: uncropped portrait sizes for DialogueBox and inline cross reactions. */
export function BailiffDialoguePortrait({ reaction = "neutral" }: { reaction?: PortraitReaction }) {
  return <DialoguePortraitPair Portrait={BailiffPortrait} reaction={reaction} />;
}

function BailiffDialoguePortraitFrame({
  children,
  color,
  compact = false,
}: {
  children: React.ReactNode;
  color?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`dialogue-box-portrait shrink-0 rounded-lg border border-court-600 ${
        compact ? "w-[100px]" : "w-[100px] lg:w-[140px]"
      }`}
      style={color ? { borderColor: `${color}40` } : undefined}
    >
      {children}
    </div>
  );
}

/** Bailiff-only inline quip on cross-examination — same layout as DialogueBox. */
export function BailiffInlineDialogue({
  text,
  reaction = "neutral",
}: {
  text: string;
  reaction?: PortraitReaction;
}) {
  return (
    <div className="bailiff-inline-dialogue">
      <BailiffDialoguePortraitFrame color={CAST.bailiff.color} compact>
        <BailiffPortrait size="thumb" reaction={reaction} />
      </BailiffDialoguePortraitFrame>
      <div className="bailiff-inline-dialogue-content">
        <span className="dialogue-box-name block mb-1" style={{ color: CAST.bailiff.color }}>
          {CAST.bailiff.name}
        </span>
        <p className="text-court-500 text-xs italic font-legal leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ─── Dialogue Box (Bailiff) ───

interface DialogueBoxProps {
  portrait?: React.ReactNode;
  name: string;
  text: string;
  color?: string;
  typingSpeed?: number;
  onComplete?: () => void;
  showContinue?: boolean;
  onAdvance?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function DialogueBox({
  portrait,
  name,
  text,
  color = "#d4af37",
  typingSpeed = 25,
  onComplete,
  showContinue = true,
  onAdvance,
  onSkip,
  showSkip = false,
}: DialogueBoxProps) {
  type TBAction = { type: 'START_TYPING' } | { type: 'FINISH_TYPING' };

function tbReducer(state: { typing: boolean; typingDone: boolean }, action: TBAction): typeof state {
  switch (action.type) {
    case 'START_TYPING': return { typing: true, typingDone: false };
    case 'FINISH_TYPING': return { typing: false, typingDone: true };
    default: return state;
  }
}

  const [{ typing, typingDone }, tbDispatch] = useReducer(tbReducer, { typing: true, typingDone: false });

  useEffect(() => {
    if (!text) return;
    tbDispatch({ type: 'START_TYPING' });
  }, [text]);

  const handleTypeComplete = useCallback(() => {
    tbDispatch({ type: 'FINISH_TYPING' });
    onComplete?.();
  }, [onComplete]);

  const portraitNode = portrait ?? <BailiffDialoguePortrait />;

  return (
    <div className="dialogue-box">
      <div className="dialogue-box-inner">
        <BailiffDialoguePortraitFrame color={color}>{portraitNode}</BailiffDialoguePortraitFrame>
        <div className="dialogue-box-content">
          <div className="dialogue-box-top">
            <span className="dialogue-box-name" style={{ color }}>{name}</span>
            {showSkip && onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="ml-auto shrink-0 text-xs font-mono uppercase tracking-wider text-court-300 hover:text-gold-400 py-2 px-3 -mr-1 rounded-sm transition-colors"
              >
                Skip
              </button>
            )}
          </div>
          <div className="dialogue-box-body">
            {typing ? (
              <TypewriterText text={text} speed={typingSpeed} tag="span" onComplete={handleTypeComplete} />
            ) : (
              <span>{text}</span>
            )}
          </div>
          {showContinue && typingDone && onAdvance && (
            <button
              type="button"
              onClick={onAdvance}
              className="dialogue-box-continue dialogue-box-continue-btn"
            >
              ▼ Continue
            </button>
          )}
          {showContinue && typingDone && !onAdvance && (
            <div className="dialogue-box-continue">▼ Continue</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Objection Overlay (Full-Screen) ───

export function ObjectionOverlay({
  trigger,
  side = "prosecution",
  duration = 1000,
  onComplete,
}: {
  trigger: number;
  side?: "prosecution" | "defense";
  duration?: number;
  onComplete?: () => void;
}) {
  const [showing, dispatchOverlay] = useReducer(stampReducer, false);

  useEffect(() => {
    if (trigger === 0) return;
    dispatchOverlay({ type: "SHOW" });
    const timer = setTimeout(() => {
      dispatchOverlay({ type: "HIDE" });
      onComplete?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [trigger, duration, onComplete]);

  if (!showing) return null;

  const flashColor = side === "prosecution" ? "rgba(185, 28, 28, 0.5)" : "rgba(37, 99, 235, 0.5)";
  const textColor = side === "prosecution" ? "text-red-500" : "text-blue-500";
  const borderColor = side === "prosecution" ? "border-red-700" : "border-blue-700";

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute inset-0 objection-flash"
        style={{ background: flashColor }}
      />
      <div className="absolute inset-0 flex items-center justify-center objection-screen-shake">
        <div className={`objection-text ${textColor} ${borderColor}`}>
          <div className={`border-4 ${borderColor} px-8 py-4`}
            style={{ background: side === "prosecution" ? "rgba(185,28,28,0.1)" : "rgba(37,99,235,0.1)" }}>
            <p className="font-serif text-5xl sm:text-6xl font-black tracking-[0.2em]">
              OBJECTION!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Evidence Card ───

export function ExhibitEngagementPrompt({
  engaged,
  side,
}: {
  engaged: boolean;
  side: "prosecution" | "defense";
}) {
  if (engaged) return null;

  const subcopy =
    side === "prosecution"
      ? "Tap a card below — the defense will object, then you can proceed."
      : "Tap a card below to interact with the evidence, then you can proceed.";

  return (
    <div
      className="mb-3 rounded-sm border border-gold-500/70 bg-gold-500/15 px-4 py-3 text-center shadow-[0_0_20px_rgba(245,158,11,0.15)]"
      role="status"
    >
      <p className="text-gold-400 text-xs font-bold uppercase tracking-wide">Object to an exhibit to continue</p>
      <p className="text-court-400 text-xs mt-1.5 font-legal leading-snug">{subcopy}</p>
    </div>
  );
}

export function ExhibitListFrame({
  engaged,
  children,
}: {
  engaged: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`space-y-2 transition-all duration-300 ${
        engaged ? "" : "rounded-sm ring-2 ring-gold-500/45 ring-offset-2 ring-offset-court-950 p-1"
      }`}
    >
      {children}
    </div>
  );
}

export function StageProceedLink({
  engaged,
  href,
  label,
}: {
  engaged: boolean;
  href: string;
  label: string;
}) {
  const lockedMessage = "Object to an exhibit above to unlock";
  const lockedHintId = useId();

  if (engaged) {
    return (
      <Link
        href={href}
        className="group inline-flex items-center gap-2.5 px-8 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press"
      >
        {label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-2 max-w-sm mx-auto">
      <button
        type="button"
        disabled
        aria-describedby={lockedHintId}
        className="inline-flex items-center gap-2 px-8 py-3 bg-court-800/90 border border-court-600 text-court-500 font-semibold rounded-sm text-base cursor-not-allowed select-none disabled:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {label}
      </button>
      <p id={lockedHintId} className="text-gold-400 text-sm font-medium text-center leading-snug">
        {lockedMessage}
      </p>
    </div>
  );
}

interface EvidenceCardProps {
  exhibit: string;
  children: React.ReactNode;
  side?: "prosecution" | "defense";
  index?: number;
  onClick?: () => void;
}

export function EvidenceCard({ exhibit, children, side = "prosecution", index = 0, onClick }: EvidenceCardProps) {
  const accentColor = side === "prosecution" ? "#b91c1c" : "#2563eb";
  const animClass = side === "prosecution" ? "animate-card-left" : "animate-card-right";
  const delay = index * 0.03;

  return (
    <div
      className={`evidence-card ${animClass} ${onClick ? "cursor-pointer" : ""}`}
      style={
        {
          "--card-accent": accentColor,
          animationDelay: `${delay}s`,
        } as React.CSSProperties & Record<string, string>
      }
      onClick={onClick}
    >
      <div className="evidence-card-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5">
          {side === "prosecution" ? (
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" />
          ) : (
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" />
          )}
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: accentColor }}>
          {side === "prosecution" ? `Prosecution Exhibit ${exhibit}` : `Defense Exhibit ${exhibit}`}
        </span>
      </div>
      <div className="p-4">
        <p className="text-court-200 text-sm leading-relaxed font-legal">{children}</p>
      </div>
    </div>
  );
}

// ─── Dramatic Pause ───

export function DramaticPause({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete?: () => void;
}) {
  type DotsAction = { type: 'RESET' } | { type: 'TICK' } | { type: 'DONE' };

function dotsReducer(state: number, action: DotsAction): number {
  switch (action.type) {
    case 'RESET': return 0;
    case 'TICK': return state + 1;
    case 'DONE': return 3;
    default: return state;
  }
}

  const [dots, dotsDispatch] = useReducer(dotsReducer, 0);

  useEffect(() => {
    if (!active) {
      dotsDispatch({ type: 'RESET' });
      return;
    }
    const interval = setInterval(() => {
      dotsDispatch({ type: 'TICK' });
    }, 400);
    return () => clearInterval(interval);
  }, [active, onComplete]);

  // Watch for dots reaching 3 via a separate effect since dispatch doesn't have access to new value
  useEffect(() => {
    if (dots >= 3) {
      onComplete?.();
    }
  }, [dots, onComplete]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-fade-in-up">
        <p className="font-mono text-2xl text-court-400 tracking-[0.5em]">
          {". ".repeat(dots).trim() || "."}
        </p>
      </div>
    </div>
  );
}