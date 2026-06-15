"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

// ─── Sound Effects (Web Audio API) ───

export function useSoundEffects() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playGavelKnock = useCallback(() => {
    try {
      const ctx = getContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(120, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.4, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.15);
      // Add second knock for resonance
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "sine";
      o2.frequency.setValueAtTime(80, ctx.currentTime);
      g2.gain.setValueAtTime(0.15, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start(ctx.currentTime);
      o2.stop(ctx.currentTime + 0.25);
    } catch {}
  }, [getContext]);

  const playStampSlam = useCallback(() => {
    try {
      const ctx = getContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(200, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.2);
      // Noise burst
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      const noise = ctx.createBufferSource();
      const ng = ctx.createGain();
      noise.buffer = buffer;
      ng.gain.setValueAtTime(0.3, ctx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      noise.connect(ng);
      ng.connect(ctx.destination);
      noise.start(ctx.currentTime);
    } catch {}
  }, [getContext]);

  const playPaperRustle = useCallback(() => {
    try {
      const ctx = getContext();
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
      }
      const noise = ctx.createBufferSource();
      const g = ctx.createGain();
      noise.buffer = buffer;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      // Bandpass filter for paper-like sound
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2000, ctx.currentTime);
      filter.Q.setValueAtTime(0.5, ctx.currentTime);
      noise.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      noise.start(ctx.currentTime);
    } catch {}
  }, [getContext]);

  const playSwoosh = useCallback(() => {
    try {
      const ctx = getContext();
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
      }
      const noise = ctx.createBufferSource();
      const g = ctx.createGain();
      noise.buffer = buffer;
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      // Sweep filter
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.15);
      filter.Q.setValueAtTime(1, ctx.currentTime);
      noise.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      noise.start(ctx.currentTime);
    } catch {}
  }, [getContext]);

  const playConfetti = useCallback(() => {
    try {
      const ctx = getContext();
      for (let i = 0; i < 8; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        const freq = 600 + Math.random() * 800;
        o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
        o.frequency.exponentialRampToValueAtTime(freq * 3, ctx.currentTime + i * 0.05 + 0.15);
        g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.15);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.05);
        o.stop(ctx.currentTime + i * 0.05 + 0.15);
      }
    } catch {}
  }, [getContext]);

  const playAmbientHum = useCallback(() => {
    try {
      const ctx = getContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(55, ctx.currentTime);
      o.frequency.linearRampToValueAtTime(58, ctx.currentTime + 2);
      g.gain.setValueAtTime(0.03, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 3);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 3);
    } catch {}
  }, [getContext]);

  return { playGavelKnock, playStampSlam, playPaperRustle, playSwoosh, playConfetti, playAmbientHum };
}

// ─── Ornate Court Seal ───

export function CourtSeal({ className = "w-12 h-12", animated = false }: { className?: string; animated?: boolean }) {
  return (
    <div className={`relative ${animated ? "animate-seal-appear" : ""}`}>
      <svg viewBox="0 0 100 100" fill="none" className={className}>
        {/* Outer ring */}
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        {/* Decorative dots on outer ring */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
          <circle key={angle} cx={50 + 46 * Math.cos((angle * Math.PI) / 180)} cy={50 + 46 * Math.sin((angle * Math.PI) / 180)} r="1" fill="currentColor" opacity="0.4" />
        ))}
        {/* Inner ring */}
        <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        {/* Inner decorative ring */}
        <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="0.3" opacity="0.15" strokeDasharray="2 4" />
        {/* Star in center */}
        <polygon
          points="50,18 55,32 70,32 58,42 62,56 50,48 38,56 42,42 30,32 45,32"
          fill="currentColor"
          opacity="0.8"
        />
        {/* Radiating lines from star */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line
            key={angle}
            x1={50 + 13 * Math.cos((angle * Math.PI) / 180)}
            y1={50 + 13 * Math.sin((angle * Math.PI) / 180)}
            x2={50 + 36 * Math.cos((angle * Math.PI) / 180)}
            y2={50 + 36 * Math.sin((angle * Math.PI) / 180)}
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}
        {/* Crosshatch pattern inside */}
        <line x1="25" y1="25" x2="75" y2="75" stroke="currentColor" strokeWidth="0.3" opacity="0.15" />
        <line x1="25" y1="75" x2="75" y2="25" stroke="currentColor" strokeWidth="0.3" opacity="0.15" />
        {/* Extra detailing */}
        <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
        {/* Small diamond accents */}
        {[0, 90, 180, 270].map((angle) => (
          <polygon
            key={`diamond-${angle}`}
            points={`${50 + 28 * Math.cos((angle * Math.PI) / 180)},${50 + 28 * Math.sin((angle * Math.PI) / 180) - 2} ${50 + 28 * Math.cos((angle * Math.PI) / 180) + 2},${50 + 28 * Math.sin((angle * Math.PI) / 180)} ${50 + 28 * Math.cos((angle * Math.PI) / 180)},${50 + 28 * Math.sin((angle * Math.PI) / 180) + 2} ${50 + 28 * Math.cos((angle * Math.PI) / 180) - 2},${50 + 28 * Math.sin((angle * Math.PI) / 180)}`}
            fill="currentColor"
            opacity="0.5"
          />
        ))}
      </svg>
    </div>
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

export function StageProgress({ current }: { current: number }) {
  return (
    <div className="w-full max-w-xl mx-auto mb-10">
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
                  <div className="w-14 sm:w-16 h-px bg-court-700" />
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

export function InteractiveGavel({ onStrike, className = "" }: { onStrike?: () => void; className?: string }) {
  const [striking, setStriking] = useState(false);

  const handleClick = () => {
    setStriking(true);
    onStrike?.();
    setTimeout(() => setStriking(false), 600);
  };

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

export function SignatureBlock({ date, interactive = false, onSign }: { date?: string; interactive?: boolean; onSign?: () => void }) {
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

  return (
    <div className="mt-6 pt-4 border-t border-court-700">
      <p className="font-legal text-court-500 text-xs italic mb-4">
        So ordered this day, {today}.
      </p>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          {interactive ? (
            <button
              onClick={handleSign}
              disabled={signed}
              className={`block text-left w-full cursor-pointer ${signed ? "" : "group"}`}
            >
              {signed ? (
                <svg viewBox="0 0 200 40" className="w-40 h-8 text-gold-400 animate-signature-draw">
                  <path
                    d="M10 30 Q30 10 50 25 Q70 5 90 20 Q110 8 130 22 Q150 10 170 25 Q180 18 190 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.6"
                    strokeDasharray="300"
                    strokeDashoffset="300"
                  />
                </svg>
              ) : (
                <div className="border border-dashed border-court-600 rounded-sm px-4 py-2 group-hover:border-gold-500/50 group-hover:bg-gold-500/5 transition-all duration-200">
                  <span className="font-mono text-[10px] text-court-500 group-hover:text-gold-500 uppercase tracking-[0.15em] transition-colors">
                    Click to sign
                  </span>
                </div>
              )}
            </button>
          ) : (
            <svg viewBox="0 0 200 40" className="w-40 h-8 text-court-400 animate-signature-draw">
              <path
                d="M10 30 Q30 10 50 25 Q70 5 90 20 Q110 8 130 22 Q150 10 170 25 Q180 18 190 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
                strokeDasharray="300"
                strokeDashoffset="300"
              />
            </svg>
          )}
        </div>
        <div className="text-right">
          <p className="font-serif text-court-200 text-sm">Your Honor</p>
          <p className="font-mono text-[9px] text-court-600 uppercase tracking-[0.15em]">Presiding Judge</p>
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
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    setDisplayed("");
    setStarted(false);
    completedRef.current = false;
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay, text]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
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

// ─── Ambient Court Hum ───

export function AmbientCourtHum() {
  const { playAmbientHum } = useSoundEffects();
  useEffect(() => {
    playAmbientHum();
    const interval = setInterval(() => {
      playAmbientHum();
    }, 5000);
    return () => clearInterval(interval);
  }, [playAmbientHum]);
  return null;
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
  const rotation = offset ? (Math.random() - 0.5) * 6 : 0;

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
          transform: `translate(${(Math.random() - 0.5) * 2}px, ${(Math.random() - 0.5) * 2}px)`,
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
  const [gavelCount, setGavelCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGavelCount((c) => (c < 3 ? c + 1 : c));
    }, 400);
    setTimeout(() => clearInterval(interval), 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center wood-panel">
      <div className="flex flex-col items-center gap-6 animate-page-enter">
        <CourtSeal className="w-12 h-12 text-gold-500" animated />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-8 rounded-full bg-gold-500/60 transition-all duration-300 ${
                gavelCount > i ? "opacity-100 scale-y-100" : "opacity-30 scale-y-50"
              }`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        <div className="font-serif text-court-400 text-lg animate-pulse">{message}</div>
        {/* Bailiff quote cycling */}
        <div className="font-legal text-court-500 text-sm italic max-w-md text-center animate-fade-in-up">
          {gavelCount === 0 && "All riiise..."}
          {gavelCount === 1 && "The Honorable Court is now in session..."}
          {gavelCount === 2 && "May the evidence be presented fairly..."}
          {gavelCount >= 3 && "Proceed, counselor..."}
        </div>
      </div>
    </div>
  );
}

// ─── Objection Stamp ───

export function ObjectionStamp({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (active) {
      setShowing(true);
      const timer = setTimeout(() => {
        setShowing(false);
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

export function ProsecutorPortrait({ reaction = "neutral", size = "full" }: { reaction?: PortraitReaction; size?: "full" | "thumb" }) {
  const w = size === "full" ? 180 : 48;
  const h = size === "full" ? 200 : 52;
  const s = size === "full" ? 1 : 0.26;
  const color = "#b91c1c";
  return (
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
  );
}

export function DefensePortrait({ reaction = "neutral", size = "full" }: { reaction?: PortraitReaction; size?: "full" | "thumb" }) {
  const w = size === "full" ? 180 : 48;
  const h = size === "full" ? 200 : 52;
  const color = "#2563eb";
  return (
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
  );
}

export function BailiffPortrait({ reaction = "neutral", size = "full" }: { reaction?: PortraitReaction; size?: "full" | "thumb" }) {
  const w = size === "full" ? 180 : 48;
  const h = size === "full" ? 200 : 52;
  const color = "#a67c00";
  return (
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
  );
}

export function JudgePortrait({ reaction = "neutral" }: { reaction?: PortraitReaction }) {
  const color = "#6b7280";
  return (
    <svg width={180} height={200} viewBox="0 0 84 96" className="shrink-0">
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
  );
}

// ─── Dialogue Box ───

interface DialogueBoxProps {
  portrait: React.ReactNode;
  name: string;
  text: string;
  color?: string;
  typingSpeed?: number;
  onComplete?: () => void;
  showContinue?: boolean;
}

export function DialogueBox({
  portrait,
  name,
  text,
  color = "#d4af37",
  typingSpeed = 25,
  onComplete,
  showContinue = true,
}: DialogueBoxProps) {
  const [typing, setTyping] = useState(false);
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    setTypingDone(false);
    if (text) {
      setTyping(true);
    }
  }, [text]);

  const handleTypeComplete = useCallback(() => {
    setTypingDone(true);
    onComplete?.();
  }, [onComplete]);

  return (
    <div className="dialogue-box">
      <div className="dialogue-box-inner">
        <div className="dialogue-box-top">
          <div className="w-8 h-8 rounded-full border border-court-600 flex items-center justify-center overflow-hidden shrink-0"
            style={{ borderColor: `${color}40` }}>
            {portrait}
          </div>
          <span className="dialogue-box-name" style={{ color }}>{name}</span>
        </div>
        <div className="dialogue-box-body">
          {typing && (
            <TypewriterText text={text} speed={typingSpeed} tag="span" onComplete={handleTypeComplete} />
          )}
        </div>
        {showContinue && typingDone && (
          <div className="dialogue-box-continue">▼ Continue</div>
        )}
      </div>
    </div>
  );
}

// ─── Objection Overlay (Full-Screen) ───

export function ObjectionOverlay({
  active,
  side = "prosecution",
  onComplete,
}: {
  active: boolean;
  side?: "prosecution" | "defense";
  onComplete?: () => void;
}) {
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (active) {
      setShowing(true);
      const timer = setTimeout(() => {
        setShowing(false);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

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
              {side === "prosecution" ? "OBJECTION!" : "HOLD IT!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Evidence Card ───

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
  const delay = index * 0.15;

  return (
    <div
      className={`evidence-card ${animClass} ${onClick ? "cursor-pointer" : ""}`}
      style={
        {
          "--card-accent": accentColor,
          animationDelay: `${delay}s`,
        } as React.CSSProperties
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
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!active) {
      setDots(0);
      return;
    }
    const interval = setInterval(() => {
      setDots((d) => {
        if (d >= 3) {
          clearInterval(interval);
          onComplete?.();
          return 3;
        }
        return d + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [active, onComplete]);

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