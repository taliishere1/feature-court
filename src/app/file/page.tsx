"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSoundEffects } from "@/components/court-components";

export default function FileCasePage() {
  const router = useRouter();
  const { playGavelKnock, playPaperRustle } = useSoundEffects();
  const [form, setForm] = useState({
    proposal: "",
    audience: "",
    whyNow: "",
    tradeoff: "",
    gutCall: "unsure" as "ship" | "kill" | "unsure",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    playGavelKnock();

    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, gutCall: form.gutCall === "unsure" ? undefined : form.gutCall }),
      });
      if (!res.ok) throw new Error("Failed to create trial");
      const data = await res.json();
      router.push(`/trial/arraignment?id=${data.id}`);
    } catch {
      alert("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col wood-panel">
      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-court-400 group-hover:text-court-200 transition-colors">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="font-display text-base text-gold-500">FEATURE COURT</span>
          </Link>
          <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.25em]">Form No. FC-001</span>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 relative z-10">
        <div className="max-w-xl mx-auto animate-page-enter">
          {/* Letterhead with ceremonial border */}
          <div className="text-center border-b border-court-700 pb-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div>
                <h2 className="font-display text-lg text-gold-500 tracking-tight">FEATURE COURT</h2>
                <p className="text-[9px] text-court-600 font-mono uppercase tracking-[0.2em]">District of Product Decisions</p>
              </div>
            </div>
            <div className="ceremonial-border inline-block px-6 py-1">
              <p className="font-mono text-[10px] text-gold-500 uppercase tracking-[0.25em]">Case Intake Form</p>
            </div>
            <p className="text-[9px] text-court-500 font-mono mt-1">Submit for Trial · All fields required</p>
          </div>

          <div className="parchment-ruled p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="animate-fade-in-up stagger-1">
                <label className="flex items-center gap-2 text-court-200 font-serif text-base font-semibold mb-1.5">
                  <span className="text-gold-500 font-mono text-[10px]">§1</span>
                  The proposal
                </label>
                <p className="text-court-500 text-[10px] mb-2 font-mono uppercase tracking-[0.15em]">What are you proposing to do?</p>
                <input
                  type="text"
                  required
                  value={form.proposal}
                  onChange={(e) => { setForm({ ...form, proposal: e.target.value }); playPaperRustle(); }}
                  placeholder='e.g. "Build a mobile app", "Cut the comments feature"'
                  className="w-full bg-transparent border border-court-700 rounded-sm px-4 py-3 text-court-100 placeholder:text-court-600/40 focus:outline-none focus:border-gold-500/60 transition-colors text-sm font-legal tracking-wide"
                />
              </div>

              <div className="animate-fade-in-up stagger-2">
                <label className="flex items-center gap-2 text-court-200 font-serif text-base font-semibold mb-1.5">
                  <span className="text-gold-500 font-mono text-[10px]">§2</span>
                  Who it serves
                </label>
                <p className="text-court-500 text-[10px] mb-2 font-mono uppercase tracking-[0.15em]">Who does this serve?</p>
                <input
                  type="text"
                  required
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  placeholder="e.g. Power users, new signups, enterprise accounts"
                  className="w-full bg-transparent border border-court-700 rounded-sm px-4 py-3 text-court-100 placeholder:text-court-600/40 focus:outline-none focus:border-gold-500/60 transition-colors text-sm font-legal tracking-wide"
                />
              </div>

              <div className="animate-fade-in-up stagger-3">
                <label className="flex items-center gap-2 text-court-200 font-serif text-base font-semibold mb-1.5">
                  <span className="text-gold-500 font-mono text-[10px]">§3</span>
                  Why now
                </label>
                <p className="text-court-500 text-[10px] mb-2 font-mono uppercase tracking-[0.15em]">Why is this the right time?</p>
                <input
                  type="text"
                  required
                  value={form.whyNow}
                  onChange={(e) => setForm({ ...form, whyNow: e.target.value })}
                  placeholder="e.g. Competitors are moving, user feedback is loud"
                  className="w-full bg-transparent border border-court-700 rounded-sm px-4 py-3 text-court-100 placeholder:text-court-600/40 focus:outline-none focus:border-gold-500/60 transition-colors text-sm font-legal tracking-wide"
                />
              </div>

              <div className="animate-fade-in-up stagger-4">
                <label className="flex items-center gap-2 text-court-200 font-serif text-base font-semibold mb-1.5">
                  <span className="text-gold-500 font-mono text-[10px]">§4</span>
                  What you&apos;d give up
                </label>
                <p className="text-court-500 text-[10px] mb-2 font-mono uppercase tracking-[0.15em]">What&apos;s the cost or tradeoff?</p>
                <input
                  type="text"
                  required
                  value={form.tradeoff}
                  onChange={(e) => setForm({ ...form, tradeoff: e.target.value })}
                  placeholder="e.g. 6 months of engineering, delay the roadmap"
                  className="w-full bg-transparent border border-court-700 rounded-sm px-4 py-3 text-court-100 placeholder:text-court-600/40 focus:outline-none focus:border-gold-500/60 transition-colors text-sm font-legal tracking-wide"
                />
              </div>

              <div className="animate-fade-in-up stagger-5 pt-2">
                <label className="flex items-center gap-2 text-court-200 font-serif text-base font-semibold mb-1.5">
                  <span className="text-gold-500 font-mono text-[10px]">§5</span>
                  Your gut call
                  <span className="text-court-500 font-sans text-[10px] font-normal">(sealed from the court)</span>
                </label>
                <div className="flex gap-2">
                  {(["ship", "kill", "unsure"] as const).map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setForm({ ...form, gutCall: option })}
                      className={`flex-1 px-3 py-2.5 rounded-sm border text-xs font-medium transition-all duration-200 ${
                        form.gutCall === option
                          ? "bg-gold-500/15 border-gold-500/60 text-gold-300"
                          : "bg-transparent border-court-700 text-court-400 hover:border-court-500 hover:text-court-200"
                      }`}
                    >
                      {option === "ship" ? "Ship it" : option === "kill" ? "Kill it" : "Unsure"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-court-700 pt-4"></div>

              <div className="text-center animate-fade-in-up stagger-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="group inline-flex items-center gap-2.5 px-10 py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-court-700 disabled:text-court-500 text-court-950 font-semibold rounded-sm transition-all duration-200 text-base animate-button-press"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Summoning the court...
                    </>
                  ) : (
                    <>
                      Submit for trial
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-court-600 text-[10px] font-mono mt-6 uppercase tracking-wider">
            By submitting, you consent to judgment by a jury of your peers.
          </p>
        </div>
      </main>
    </div>
  );
}