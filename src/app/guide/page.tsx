import Link from "next/link";
import {
  CourtroomBackground,
  CourtSeal,
  ScrollworkBorder,
} from "@/components/court-components";

export default function GuidePage() {
  return (
    <div className="min-h-screen flex flex-col wood-panel relative">
      <CourtroomBackground opacity={0.08} />

      {/* Header */}
      <header className="border-b border-court-800 relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <CourtSeal className="w-5 h-5 text-gold-500" />
            <span className="font-display text-base text-gold-500">FEATURE COURT</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gold-500">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="font-mono text-[10px] text-court-600 uppercase tracking-[0.2em]">Guide</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 relative z-10">
        <div className="max-w-3xl mx-auto animate-page-enter">

          {/* Title */}
          <div className="text-center mb-12">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-500">How It Works</span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-gold-500 mt-2">
              A Guide to the Court
            </h1>
            <p className="text-court-400 text-sm mt-3 max-w-lg mx-auto leading-relaxed">
              Welcome, Your Honor. Every feature that comes before this court follows the same
              solemn process. Here&apos;s how justice is served.
            </p>
          </div>

          {/* Pre-Trial */}
          <ScrollworkBorder>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gold-500">
                    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">Pre-Trial</span>
                  <h2 className="font-serif text-lg font-bold text-court-100">File a Case</h2>
                </div>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-court-400 text-sm leading-relaxed">
                  Start by filing the product decision you&apos;re wrestling with. The court needs four things:
                </p>
                <ul className="space-y-2">
                  {[
                    { label: "The Proposal", desc: "What are you thinking of building? Be specific." },
                    { label: "The Audience", desc: "Who is this for? Users, customers, internal teams?" },
                    { label: "The Timing", desc: "Why now? What makes this the right moment?" },
                    { label: "The Tradeoff", desc: "What are you sacrificing? Time, money, another feature?" },
                  ].map((item) => (
                    <li key={item.label} className="flex items-start gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gold-500 mt-1 shrink-0">
                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div>
                        <span className="text-court-100 text-sm font-medium">{item.label}</span>
                        <span className="text-court-500 text-sm"> &mdash; {item.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollworkBorder>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-court-600">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
          </div>

          {/* Stage 1 of 5 */}
          <ScrollworkBorder>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shrink-0">
                  <span className="font-serif text-sm font-bold text-gold-500">1</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">Stage 1 of 5</span>
                  <h2 className="font-serif text-lg font-bold text-court-100">The Arraignment</h2>
                </div>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-court-400 text-sm leading-relaxed">
                  The bailiff calls the court to order. The charge is read aloud: your proposal
                  stands accused of insufficient evidence, questionable timing, and unacceptable
                  opportunity cost. A gavel strikes. The trial has begun.
                </p>
              </div>
            </div>
          </ScrollworkBorder>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-court-600">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
          </div>

          {/* Stage 2 of 5 */}
          <ScrollworkBorder>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shrink-0">
                  <span className="font-serif text-sm font-bold text-gold-500">2</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">Stage 2 of 5</span>
                  <h2 className="font-serif text-lg font-bold text-court-100">The Prosecution</h2>
                </div>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-court-400 text-sm leading-relaxed">
                  The prosecution makes their case against your feature. They attack the proposal
                  with pointed arguments — questioning user demand, the strategic timing, and
                  whether the tradeoff is worth it. Every product decision has a dark side, and
                  the prosecution is here to expose it.
                </p>
              </div>
            </div>
          </ScrollworkBorder>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-court-600">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
          </div>

          {/* Stage 3 of 5 */}
          <ScrollworkBorder>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shrink-0">
                  <span className="font-serif text-sm font-bold text-gold-500">3</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">Stage 3 of 5</span>
                  <h2 className="font-serif text-lg font-bold text-court-100">The Defense</h2>
                </div>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-court-400 text-sm leading-relaxed">
                  The defense rises to counter. They argue that doing nothing is the real risk,
                  that your audience needs this even if they haven&apos;t asked for it yet, and
                  that the tradeoff is a calculated bet worth taking. The courtroom dynamic shifts.
                </p>
              </div>
            </div>
          </ScrollworkBorder>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-court-600">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
          </div>

          {/* Stage 4 of 5 */}
          <ScrollworkBorder>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shrink-0">
                  <span className="font-serif text-sm font-bold text-gold-500">4</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">Stage 4 of 5</span>
                  <h2 className="font-serif text-lg font-bold text-court-100">Cross-Examination</h2>
                </div>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-court-400 text-sm leading-relaxed">
                  The judge presses deeper. Tough questions cut through the rhetoric, forcing you
                  to confront the real-world implications of your decision. No arguments — just
                  honest answers to uncomfortable questions.
                </p>
              </div>
            </div>
          </ScrollworkBorder>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-court-600">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-court-700 to-transparent" />
          </div>

          {/* Stage 5 of 5 */}
          <ScrollworkBorder>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shrink-0">
                  <span className="font-serif text-sm font-bold text-gold-500">5</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-court-500">Stage 5 of 5</span>
                  <h2 className="font-serif text-lg font-bold text-court-100">The Verdict</h2>
                </div>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-court-400 text-sm leading-relaxed">
                  Now you decide. From the bench, you have four paths:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: "Ship It", desc: "Full speed ahead.", color: "text-stamp-ship", border: "border-stamp-ship/30", bg: "bg-stamp-ship/5" },
                    { label: "Kill It", desc: "Stop. Not the right move.", color: "text-stamp-kill", border: "border-stamp-kill/30", bg: "bg-stamp-kill/5" },
                    { label: "Send Back", desc: "Revise and resubmit.", color: "text-stamp-revise", border: "border-stamp-revise/30", bg: "bg-stamp-revise/5" },
                    { label: "Mistrial", desc: "Need more data.", color: "text-stamp-mistrial", border: "border-stamp-mistrial/30", bg: "bg-stamp-mistrial/5" },
                  ].map((v) => (
                    <div key={v.label} className={`p-3 rounded-sm border ${v.border} ${v.bg}`}>
                      <p className={`font-serif text-sm font-bold ${v.color}`}>{v.label}</p>
                      <p className="text-court-500 text-xs mt-0.5">{v.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-court-400 text-sm leading-relaxed">
                  Whichever you choose, the court delivers a full ruling with real risks,
                  ignored arguments, and a test-first action plan. Your verdict is recorded
                  in the Hall of Verdicts for posterity.
                </p>
              </div>
            </div>
          </ScrollworkBorder>

          {/* CTA */}
          <div className="text-center mt-10 mb-8">
            <div className="parchment p-6 max-w-md mx-auto">
              <p className="text-court-300 font-legal italic text-sm mb-4 leading-relaxed">
                &ldquo;Justice is the constant and perpetual will to allot to every product decision
                its due.&rdquo;
              </p>
              <Link
                href="/file"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-sm animate-button-press"
              >
                File Your First Case
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <div className="mt-3">
                <Link
                  href="/trial/arraignment?sample=0"
                  className="text-court-500 hover:text-court-300 text-xs underline underline-offset-2 transition-colors"
                >
                  Or try a sample case first
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-court-800 px-6 py-4 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-court-600 text-xs">
          <span>FEATURE COURT</span>
          <Link href="/" className="hover:text-court-400 transition-colors">Back to the court</Link>
        </div>
      </footer>
    </div>
  );
}