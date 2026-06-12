"use client";

import { useEffect, useState, useRef } from "react";

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
      </svg>
    </div>
  );
}

// ─── Wax Seal ───

export function WaxSeal({ ruling, animated = true }: { ruling?: string; animated?: boolean }) {
  const colorMap: Record<string, string> = {
    ship: "#1a6b3c",
    kill: "#8b1a1a",
    revise: "#6b5a1a",
    mistrial: "#4a3d6b",
  };
  const fill = ruling ? colorMap[ruling] || "#8b1a1a" : "#8b1a1a";

  return (
    <div className={`${animated ? "animate-stamp-impact" : ""} inline-block`}>
      <svg viewBox="0 0 60 60" width="60" height="60">
        <defs>
          <filter id="waxTexture">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
          </filter>
          <radialGradient id={`waxGrad-${ruling || "default"}`} cx="40%" cy="35%">
            <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
            <stop offset="60%" stopColor={fill} stopOpacity="0.7" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.5" />
          </radialGradient>
        </defs>
        {/* Wax blob */}
        <ellipse cx="30" cy="30" rx="28" ry="26" fill={`url(#waxGrad-${ruling || "default"})`} />
        {/* Raised rim */}
        <ellipse cx="30" cy="30" rx="22" ry="20" fill="none" stroke={fill} strokeWidth="0.5" opacity="0.4" />
        {/* Embossed FC emblem */}
        <text x="30" y="34" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="14" fontWeight="bold" fontFamily="serif">FC</text>
        {/* Rough edge - decorative dots */}
        {Array.from({ length: 18 }).map((_, i) => {
          const angle = (i * 20 * Math.PI) / 180;
          return (
            <circle
              key={i}
              cx={30 + 26 * Math.cos(angle)}
              cy={30 + 24 * Math.sin(angle)}
              r="1.5"
              fill={fill}
              opacity="0.3"
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
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-mono transition-all duration-500 ${
                  stage.num <= current
                    ? "bg-gold-500/20 border-gold-500 text-gold-400"
                    : "border-court-700 text-court-600"
                }`}
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
                className={`text-[9px] font-mono uppercase tracking-wider mt-1 transition-colors duration-500 ${
                  stage.num === current ? "text-gold-500" : "text-court-600"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={`w-8 sm:w-12 h-px mx-1 sm:mx-2 transition-colors duration-500 ${
                  stage.num < current ? "bg-gold-500/40" : "bg-court-700"
                }`}
              />
            )}
          </div>
        ))}
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
}: {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  tag?: "p" | "h1" | "h2" | "h3" | "span" | "div";
}) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [started, text, speed]);

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
      <div className="absolute -top-3 -left-3 w-10 h-10 pointer-events-none">
        <svg viewBox="0 0 40 40" className="w-full h-full text-gold-500/30" fill="none">
          <path d="M0 40V0h40" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 35V5h30" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="0.5" />
          <path d="M0 20 Q10 15 20 0" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        </svg>
      </div>
      {/* Corner scrollwork - top right */}
      <div className="absolute -top-3 -right-3 w-10 h-10 pointer-events-none rotate-90">
        <svg viewBox="0 0 40 40" className="w-full h-full text-gold-500/30" fill="none">
          <path d="M0 40V0h40" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 35V5h30" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </div>
      {/* Corner scrollwork - bottom left */}
      <div className="absolute -bottom-3 -left-3 w-10 h-10 pointer-events-none -rotate-90">
        <svg viewBox="0 0 40 40" className="w-full h-full text-gold-500/30" fill="none">
          <path d="M0 40V0h40" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 35V5h30" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
        </svg>
      </div>
      {/* Corner scrollwork - bottom right */}
      <div className="absolute -bottom-3 -right-3 w-10 h-10 pointer-events-none rotate-180">
        <svg viewBox="0 0 40 40" className="w-full h-full text-gold-500/30" fill="none">
          <path d="M0 40V0h40" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 35V5h30" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
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
      p.className = "particle";
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