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

// ─── Interactive Gavel ───

export function InteractiveGavel({ onBang, className = "" }: { onBang?: () => void; className?: string }) {
  const [banging, setBanging] = useState(false);

  function handleClick() {
    setBanging(true);
    onBang?.();
    setTimeout(() => setBanging(false), 600);
  }

  return (
    <button
      onClick={handleClick}
      className={`cursor-pointer bg-transparent border-none p-0 outline-none ${className}`}
      aria-label="Bang the gavel"
    >
      <div className={banging ? "animate-gavel-bang" : ""} style={{ filter: "drop-shadow(0 0 12px rgba(212,175,55,0.25))" }}>
        <svg width="72" height="72" viewBox="0 0 56 56" fill="none" className="text-gold-500 hover:text-gold-400 transition-colors duration-200">
          <rect x="16" y="42" width="24" height="4" rx="1" fill="currentColor" opacity="0.35" />
          <rect x="25" y="22" width="6" height="22" rx="1.5" fill="currentColor" opacity="0.55" />
          <rect x="13" y="6" width="30" height="18" rx="3" fill="currentColor" opacity="0.85" />
          <polygon points="28,8 30.5,13 36,13 31.5,16.5 33,22 28,19 23,22 24.5,16.5 20,13 25.5,13" fill="var(--color-court-950)" opacity="0.9" />
          <line x1="15" y1="18" x2="26" y2="18" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="30" y1="18" x2="41" y2="18" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        </svg>
      </div>
    </button>
  );
}

// ─── Case Docket Header ───

export function CaseDocketHeader({
  caseTitle,
  caseId,
  stageLabel,
  stageNum,
}: {
  caseTitle: string;
  caseId: string;
  stageLabel: string;
  stageNum: number;
}) {
  return (
    <div className="text-center mb-6 animate-fade-in-down">
      <div className="flex items-center justify-center gap-2 mb-3">
        <CourtSeal className="w-6 h-6 text-gold-500" />
        <span className="font-serif text-sm text-court-400 tracking-wide">Feature Court</span>
        <CourtSeal className="w-6 h-6 text-gold-500" />
      </div>
      <div className="docket-badge inline-flex mb-3">
        <span>CIVIL ACTION №</span>
        <span className="text-gold-500">{caseId.slice(0, 8).toUpperCase()}</span>
      </div>
      <h1 className="font-serif text-2xl sm:text-3xl font-bold text-court-100 leading-tight mb-2">
        {caseTitle}
      </h1>
      <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em]">
        <span className="text-gold-500">Stage {stageNum} of 5</span>
        <span className="text-court-600">·</span>
        <span className="text-court-400">{stageLabel}</span>
      </div>
    </div>
  );
}

// ─── Signature Block ───

export function SignatureBlock({ ruling }: { ruling?: string }) {
  const [drawn, setDrawn] = useState(false);
  const color = ruling === "ship" ? "#1a6b3c" : ruling === "kill" ? "#8b1a1a" : ruling === "revise" ? "#6b5a1a" : "#4a3d6b";

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="signature-container text-center pt-4 border-t border-court-700 mt-6">
      <svg viewBox="0 0 200 50" className="w-48 h-12 mx-auto" fill="none">
        <path
          d="M10 35 Q30 10 50 30 Q60 40 70 25 Q80 10 90 35 Q100 40 110 20 Q120 5 130 30 Q140 45 150 15 Q160 -5 170 25 Q175 35 180 20 Q185 10 190 30"
          stroke={color || "#8b1a1a"}
          strokeWidth="1.5"
          strokeLinecap="round"
          className={drawn ? "signature-svg animate" : "signature-svg"}
          opacity="0.6"
        />
      </svg>
      <p className="text-court-600 text-[10px] font-mono uppercase tracking-[0.15em] mt-1">Signature of the Court</p>
      <p className="text-court-600 text-[9px] font-mono mt-0.5">
        So ordered this {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

// ─── Confetti Burst ───

export function ConfettiBurst({ active = false, count = 40 }: { active?: boolean; count?: number }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; color: string; delay: number; size: number; drift: number }[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }
    const colors = ["#d4af37", "#f0d974", "#b8942f", "#e6c84a", "#8b6f3e", "#ffffff"];
    const newPieces = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      size: 4 + Math.random() * 6,
      drift: (Math.random() - 0.5) * 100,
    }));
    setPieces(newPieces);
  }, [active, count]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "1px",
            animationDelay: `${p.delay}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Dramatic Loading ───

const BAILIFF_LINES = [
  "All riiise... the court is now in session.",
  "Order in the court! The judge is approaching the bench.",
  "The court will come to order. All persons having business... draw near.",
  "Hear ye, hear ye. The court is assembling.",
  "The bench is being prepared. Justice is loading...",
];

export function DramaticLoading({ stage = 0 }: { stage?: number }) {
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    setLineIdx(stage % BAILIFF_LINES.length);
  }, [stage]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 wood-panel">
      <CourtSeal className="w-12 h-12 text-gold-500" animated />
      <div className="flex flex-col items-center gap-3">
        <div className="animate-gavel-bang">
          <svg width="32" height="32" viewBox="0 0 56 56" fill="none" className="text-gold-500/60">
            <rect x="16" y="42" width="24" height="4" rx="1" fill="currentColor" opacity="0.35" />
            <rect x="25" y="22" width="6" height="22" rx="1.5" fill="currentColor" opacity="0.55" />
            <rect x="13" y="6" width="30" height="18" rx="3" fill="currentColor" opacity="0.85" />
            <polygon points="28,8 30.5,13 36,13 31.5,16.5 33,22 28,19 23,22 24.5,16.5 20,13 25.5,13" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <p className="text-court-400 font-serif text-base animate-pulse">
          {BAILIFF_LINES[lineIdx]}
        </p>
      </div>
    </div>
  );
}

// ─── Toast Notification ───

export function ToastNotification({
  message,
  visible,
  icon,
}: {
  message: string;
  visible: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`toast ${visible ? "show" : ""}`}>
      {icon || (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold-500">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      <span>{message}</span>
    </div>
  );
}

// ─── Ruling Preview Card ───

export function RulingPreviewCard({
  label,
  description,
  preview,
  color,
  isSelected,
  onClick,
}: {
  label: string;
  description: string;
  preview: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-sm transition-all duration-300 hover-lift ${
        isSelected
          ? "border-gold-500 bg-gold-500/10 shadow-[0_0_20px_rgba(212,175,55,0.12)]"
          : "border-court-700 bg-court-900/50 hover:border-court-500"
      }`}
      style={{ borderWidth: "1px", borderStyle: "solid" }}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-2.5">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-gold-500" : "border-court-500"}`}>
            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-seal-appear" />}
          </div>
          <span className={`font-serif text-lg font-bold transition-colors ${isSelected ? "gold-foil" : "text-court-200"}`}>
            {label}
          </span>
        </div>
        <p className="text-court-500 text-xs ml-8 leading-relaxed mb-2">{description}</p>
        <div
          className="ml-8 mt-2 pt-2 border-t border-court-800 text-[11px] italic font-legal leading-relaxed"
          style={{ color }}
        >
          &ldquo;{preview.slice(0, 80)}{preview.length > 80 ? "..." : ""}&rdquo;
        </div>
      </div>
      {isSelected && (
        <div className="h-0.5 bg-gradient-to-r from-gold-500 to-transparent" />
      )}
    </button>
  );
}

// ─── Legal Paper ───

export function LegalPaper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`parchment ruled-paper p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
}

// ─── Bailiff Announcement ───

export function BailiffAnnouncement({ text, visible = true }: { text: string; visible?: boolean }) {
  return (
    <div
      className={`text-center transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className="inline-flex items-center gap-2 text-court-400 text-xs font-mono uppercase tracking-widest">
        <span className="inline-block w-2 h-2 rounded-full bg-gold-500/60 animate-pulse" />
        {text}
        <span className="inline-block w-2 h-2 rounded-full bg-gold-500/60 animate-pulse" />
      </div>
    </div>
  );
}