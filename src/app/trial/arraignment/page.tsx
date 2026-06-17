"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrialData } from "@/lib/types";
import { SAMPLE_CASES } from "@/lib/types";
import { StageProgress, CourtroomBackground, CourtSeal, BailiffPortrait, DialogueBox } from "@/components/court-components";
import { supabase } from "@/lib/supabase";

function migrateCrossExamination(data: unknown): Array<{ question: string; choices: Array<{ label: string; text: string; bailiff_reaction: string }> }> {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
    return (data as string[]).map((q) => ({
      question: q,
      choices: [
        { label: "Yes", text: "Yes. The evidence supports moving forward.", bailiff_reaction: "Decisive. The court respects conviction." },
        { label: "No", text: "No. There are too many open questions.", bailiff_reaction: "Caution has its place in these chambers." },
        { label: "I need more data", text: "I need more data before I can answer that.", bailiff_reaction: "Prudence over haste. Noted." },
      ],
    }));
  }
  return (data || []) as Array<{ question: string; choices: Array<{ label: string; text: string; bailiff_reaction: string }> }>;
}

function rowToTrialData(row: Record<string, unknown>): TrialData {
  return {
    id: row.id as string,
    intake: row.intake as TrialData["intake"],
    charge: row.charge as string,
    case_title: row.case_title as string,
    prosecution: row.prosecution as TrialData["prosecution"],
    defense: row.defense as TrialData["defense"],
    cross_examination: migrateCrossExamination(row.cross_examination as unknown),
    verdicts: row.verdicts as TrialData["verdicts"],
    createdAt: new Date(row.created_at as string).getTime(),
    isSample: (row.is_sample as boolean) || undefined,
    ruling: row.ruling as TrialData["ruling"] | undefined,
    generationStep: row.generation_step as number | undefined,
  };
}

const PROGRESS_STEPS = [
  { message: "The court is assembling...", sub: "Preparing the docket" },
  { message: "Reading the charge...", sub: "Bailiff Sprint is reviewing the filing" },
  { message: "Briefing the prosecution...", sub: "Prosecutor Mary T. Bug is preparing her case" },
  { message: "Preparing the defense...", sub: "Defense Attorney Edward \"Edge\" Case is building a response" },
  { message: "Drafting cross-examination...", sub: "Preparing questions for the witness" },
  { message: "Weighing the verdicts...", sub: "The bench is considering possible outcomes" },
];

function ArraignmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [showCharge, setShowCharge] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  const bailiffDialogues = [
    "All rise for the Honorable Judge Ship Itwell...",
    "The court is now in session. The Honorable Judge Ship Itwell presiding.",
  ];

  useEffect(() => {
    const id = searchParams.get("id");
    const sampleIdx = searchParams.get("sample");

    let cancelled = false;

    // Poll the trial row until the charge is ready, with a hard cap so a stalled
    // generation (DB write race, edge function crash, silent OpenAI failure)
    // surfaces an error + retry escape hatch instead of spinning forever.
    const MAX_RETRIES = 30; // 30 * 2s = 60s timeout
    const POLL_INTERVAL_MS = 2000;

    async function readTrial(trialId: string) {
      let retries = 0;
      while (!cancelled && retries < MAX_RETRIES) {
        try {
          const { data: trialData, error: readError } = await supabase!
            .from("trials")
            .select("*")
            .eq("id", trialId)
            .single();
          if (cancelled) return;

          if (readError || !trialData) throw new Error("Trial not found");

          const converted = rowToTrialData(trialData);
          setGenerationStep(converted.generationStep ?? 0);
          setTrial(converted);

          const step = converted.generationStep ?? 0;
          const isReady = step >= 5 || (converted.charge && converted.charge.length > 0 && converted.case_title && converted.case_title.length > 0);
          if (isReady) {
            setLoading(false);
            return;
          }
        } catch {
          // retry on transient errors
        }
        retries++;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) {
        // Timed out (or the row never became ready) — give the user a way out.
        setError(true);
        setLoading(false);
      }
    }

    async function init() {
      if (!supabase) {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
        return;
      }

      if (sampleIdx !== null) {
        const idx = parseInt(sampleIdx);
        const intake = SAMPLE_CASES[idx] || SAMPLE_CASES[0];
        try {
          // Create the trial via the charge-section edge function (it generates
          // the charge + opening scene and inserts the row).
          const { data, error: fnError } = await supabase.functions.invoke("charge-section", {
            body: { intake, isSample: true },
          });
          if (cancelled) return;
          if (fnError || !data?.trial_id) throw new Error("Failed to open the sample case");

          const newId = data.trial_id as string;

          if (typeof window !== "undefined" && window.pendo) {
            window.pendo.track("sample_case_started", {
              sample_index: idx,
              sample_proposal: intake.proposal,
              trial_id: newId,
            });
          }

          // Update URL with the new trial ID without navigation
          router.replace(`/trial/arraignment?id=${newId}`, { scroll: false });
          await readTrial(newId);
        } catch {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
        }
      } else if (id) {
        await readTrial(id);
      } else {
        setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [searchParams, router, retryKey]);

  // Reveal on load
  useEffect(() => {
    if (!loading && trial) {
      const t = setTimeout(() => setRevealed(true), 500);
      return () => clearTimeout(t);
    }
  }, [loading, trial]);

  const handleDialogueComplete = useCallback(() => {
    if (dialogueIndex < bailiffDialogues.length - 1) {
      setShowContinue(true);
    } else {
      setShowCharge(true);
    }
  }, [dialogueIndex, bailiffDialogues.length]);

  const advanceDialogue = useCallback(() => {
    if (dialogueIndex < bailiffDialogues.length - 1) {
      setDialogueIndex((i) => i + 1);
      setShowContinue(false);
    }
  }, [dialogueIndex, bailiffDialogues.length]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (showContinue) advanceDialogue();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showContinue, advanceDialogue]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 wood-panel">
        <p className="text-court-400 font-serif">The court was unable to assemble this case.</p>
        <p className="text-court-600 text-sm font-legal">Generation exceeded the time limit. You can retry or start a new case.</p>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-sm animate-button-press"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Retry
          </button>
          <Link
            href="/file"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gold-500/40 hover:border-gold-500 text-gold-400 hover:text-gold-300 font-semibold rounded-sm transition-all duration-200 text-sm"
          >
            File a new case
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    const step = Math.min(generationStep, 5);
    const progress = PROGRESS_STEPS[step] || PROGRESS_STEPS[0];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 wood-panel">
        <div className="font-serif text-court-400 text-lg animate-pulse">{progress.message}</div>
        <div className="font-legal text-court-500 text-sm italic animate-fade-in-up">{progress.sub}</div>
        {/* Mini step indicator */}
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                s <= step
                  ? "bg-gold-500 shadow-[0_0_6px_rgba(212,175,55,0.5)]"
                  : "bg-court-700"
              }`}
            />
          ))}
        </div>
        <div className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">
          Step {step} of 5
        </div>
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 wood-panel">
        <p className="text-court-400 font-serif">No case found.</p>
        <Link href="/" className="text-gold-500 hover:text-gold-400 underline">Return to the court</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col wood-panel relative">
      <CourtroomBackground opacity={0.1} />

      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-base text-gold-500">
            <CourtSeal className="w-5 h-5 text-gold-500" />
            FEATURE COURT
          </Link>
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.25em]">
            Docket No. {trial.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </header>

      <main className="flex-1 px-6 pt-4 pb-48 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">
          <div className="text-center mb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-court-500">Stage 1 of 5</span>
          </div>

          <StageProgress current={1} />

          {/* Charge reveal */}
          <div className={`text-center mb-6 transition-all duration-700 ${showCharge ? "opacity-100" : "opacity-0"}`}>
            <div className="animate-dramatic-zoom">
              <div className="parchment p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-gold-500">The Charge</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-court-100 leading-tight mb-4">
                  {trial.case_title}
                </h1>
                <div className="border-t border-gold-500/20 mb-3"></div>
                <p className="text-court-300 text-base leading-relaxed font-legal tracking-wide italic drop-cap">
                  &ldquo;{trial.charge}&rdquo;
                </p>
              </div>

              {/* Case summary */}
              <div className="parchment-ruled p-6 mt-6 text-left max-w-lg mx-auto">
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gold-500">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">Filing Summary</span>
                </div>
                <div className="space-y-1.5 relative z-10">
                  <SummaryRow label="Proposal" value={trial.intake.proposal} />
                  <SummaryRow label="Serves" value={trial.intake.audience} />
                  <SummaryRow label="Timing" value={trial.intake.whyNow} />
                  <SummaryRow label="Cost" value={trial.intake.tradeoff} />
                </div>
              </div>

              {/* Proceed CTA */}
              <div className="text-center mt-8">
                <Link
                  href={`/trial/prosecution?id=${trial.id}`}
                  className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press"
                >
                  Hear the prosecution
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dialogue box - bailiff */}
      {revealed && !showCharge && (
        <DialogueBox
          portrait={<BailiffPortrait size="thumb" reaction="neutral" />}
          name="Bailiff Sprint"
          text={bailiffDialogues[dialogueIndex]}
          color="#a67c00"
          typingSpeed={25}
          onComplete={handleDialogueComplete}
          showContinue={showContinue}
        />
      )}

      {/* Click to advance overlay */}
      {showContinue && (
        <div
          className="fixed inset-0 z-30 cursor-pointer"
          onClick={advanceDialogue}
        />
      )}
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