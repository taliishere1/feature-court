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

    pendo.initialize({
      visitor: {
        id: visitorId,
      },
    });
  }, []);

  return null;
}