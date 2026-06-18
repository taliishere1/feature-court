"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const RETRY_MS = 100;
const MAX_WAIT_MS = 30_000;

function syncPendoPage(): void {
  window.pendo.pageLoad();
  // autoStart can miss on SPA remounts; explicit start is safe when already recording.
  window.pendo.recording?.start?.();
  window.pendo.flushNow?.();
}

/**
 * Fire pageLoad on every App Router navigation once the SDK is ready.
 * Required for Novus page tagging, funnels, and session replay on SPA routes.
 */
export default function PendoPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    function sendPageLoad(): void {
      if (cancelled) return;
      if (window.pendo?.isReady?.()) {
        syncPendoPage();
        return;
      }
      if (Date.now() - started >= MAX_WAIT_MS) return;
      setTimeout(sendPageLoad, RETRY_MS);
    }

    sendPageLoad();

    return () => {
      cancelled = true;
    };
  }, [pathname, query]);

  useEffect(() => {
    function flushOnExit(): void {
      if (!window.pendo?.isReady?.()) return;
      window.pendo.flushNow?.();
    }

    window.addEventListener("pagehide", flushOnExit);
    return () => window.removeEventListener("pagehide", flushOnExit);
  }, []);

  return null;
}
