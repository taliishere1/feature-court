"use client";

import { supabase } from "./supabase";

// Must match the key used in PENDO_INSTALL_SNIPPET in pendo.ts
const SESSION_KEY = "fc-session-visitor-id";

/**
 * Returns the anonymous visitor ID for this browser session.
 * The Pendo install snippet creates this ID first (in <head>), so by the time
 * React runs this function the key already exists in sessionStorage.
 * Falls back to generating one if called before the snippet runs (e.g. SSR guard).
 */
export function getSessionVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = "anon-" + crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Registers the session visitor ID in Supabase.
 * Safe to call multiple times — uses upsert so duplicates are ignored.
 */
export async function registerVisitor(): Promise<string> {
  const id = getSessionVisitorId();
  if (!id || !supabase) return id;
  await supabase.from("visitors").upsert({ id }, { onConflict: "id", ignoreDuplicates: true });
  return id;
}
