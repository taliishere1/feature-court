"use client";

import { useEffect } from "react";

export default function PendoInitializer() {
  useEffect(() => {
    // Generate a stable anonymous visitor ID so Pendo can track sessions
    let visitorId = localStorage.getItem("fc-visitor-id");
    if (!visitorId) {
      visitorId = "anon-" + crypto.randomUUID().slice(0, 8);
      localStorage.setItem("fc-visitor-id", visitorId);
    }

    // Generate a stable anonymous account ID for the single-player app
    let accountId = localStorage.getItem("fc-account-id");
    if (!accountId) {
      accountId = "feature-court-" + crypto.randomUUID().slice(0, 8);
      localStorage.setItem("fc-account-id", accountId);
    }

    pendo.initialize({
      visitor: {
        id: visitorId,
      },
      account: {
        id: accountId,
      },
    });
  }, []);

  return null;
}