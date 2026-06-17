"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Fire pageLoad on every App Router navigation — required for replay eligibility. */
export default function PendoPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.pendo?.pageLoad?.();
  }, [pathname, searchParams]);

  return null;
}
