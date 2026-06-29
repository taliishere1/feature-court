"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pendoAnalyticsUrl } from "@/lib/pendo-analytics";

const RETRY_MS = 100;
const MAX_WAIT_MS = 30_000;

function ensurePendoUrl(): void {
  const url = pendoAnalyticsUrl();
  window.pendo.location?.setUrl?.(() => url);
}

function syncPendoPage(): void {
  ensurePendoUrl();
  window.pendo.pageLoad();
  window.pendo.recording?.start?.();
}

/**
 * Fire pageLoad on every App Router navigation once the SDK is ready.
 * Required for Novus page tagging, funnels, and session replay on SPA routes.
 */
export default function PendoPageTracker() {
  const pathname = usePathname();

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
  }, [pathname]);

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
