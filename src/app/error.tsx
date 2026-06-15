"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center wood-panel antialiased">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto text-gold-500 mb-4">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <h1 className="font-display text-2xl font-bold text-gold-500 mb-2">Court Adjourned</h1>
            <p className="text-court-400 font-legal text-sm leading-relaxed">
              Something went wrong in the courtroom. The proceedings have been interrupted.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-court-950 font-semibold rounded-sm transition-all duration-200 text-sm"
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-6 py-2.5 border border-court-600 hover:border-court-400 text-court-300 hover:text-court-100 rounded-sm transition-all duration-200 text-sm"
            >
              Return to the court
            </Link>
          </div>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-6 text-left">
              <summary className="text-court-600 text-xs font-mono cursor-pointer hover:text-court-400">
                Error details
              </summary>
              <pre className="mt-2 text-court-500 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32 p-3 bg-court-900/50 rounded-sm border border-court-800">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}