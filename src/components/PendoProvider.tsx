"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PENDO_STUB_SNIPPET, buildPendoInitConfig } from "@/lib/pendo";

/**
 * Pendo/Novus app: Feature-court1 (app ID 6679533350748160)
 *
 * Official two-part SPA pattern:
 * 1. Stub loads pendo.js (afterInteractive)
 * 2. initialize() runs in onReady once SDK is available
 * 3. pageLoad() fires on every client-side navigation (required for session replay)
 */
export default function PendoProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);
  const skipRouteEffect = useRef(true);

  const onPendoReady = useCallback(() => {
    if (initialized.current || typeof window === "undefined" || !window.pendo) return;

    window.pendo.initialize(buildPendoInitConfig());
    initialized.current = true;
    window.pendo.pageLoad();
  }, []);

  useEffect(() => {
    if (skipRouteEffect.current) {
      skipRouteEffect.current = false;
      return;
    }
    if (initialized.current && window.pendo?.pageLoad) {
      window.pendo.pageLoad();
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const onPopState = () => {
      if (initialized.current && window.pendo?.pageLoad) {
        window.pendo.pageLoad();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <Script
      id="pendo-stub"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: PENDO_STUB_SNIPPET }}
      onReady={onPendoReady}
    />
  );
}
