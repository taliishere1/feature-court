"use client";

import { supabase } from "./supabase";

// Must match VISITOR_STORAGE_KEY in pendo.ts
const VISITOR_KEY = "fc-visitor-id";
const LEGACY_SESSION_KEY = "fc-session-visitor-id";

/**
 * Returns the anonymous visitor ID for this browser.
 * Persists in localStorage so returning users keep their record across tabs and sessions.
 * Pendo reads the same key in its install snippet.
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    // One-time migration from the old sessionStorage key
    id = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (id) sessionStorage.removeItem(LEGACY_SESSION_KEY);
  }
  if (!id) {
    id = "anon-" + crypto.randomUUID();
  }
  localStorage.setItem(VISITOR_KEY, id);
  return id;
}

/** @deprecated Use getVisitorId */
export const getSessionVisitorId = getVisitorId;

/**
 * Registers the visitor ID in Supabase.
 * Safe to call multiple times — upsert ignores duplicates.
 */
export async function registerVisitor(): Promise<string> {
  const id = getVisitorId();
  if (!id || !supabase) return id;
  await supabase.from("visitors").upsert({ id }, { onConflict: "id", ignoreDuplicates: true });
  return id;
}
