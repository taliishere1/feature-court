"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Next.js App Router navigates client-side without full page loads.
 * Pendo requires pageLoad() on each route change for analytics and session replay.
 */
export default function PendoPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== "undefined" && window.pendo?.pageLoad) {
      window.pendo.pageLoad();
    }
  }, [pathname, searchParams]);

  return null;
}
