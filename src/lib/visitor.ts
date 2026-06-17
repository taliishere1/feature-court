"use client";

import { supabase } from "./supabase";

const SESSION_KEY = "fc-session-visitor-id";

/**
 * Returns the anonymous visitor ID for this browser session.
 * A new UUID is generated each session (sessionStorage clears on tab close).
 * The ID is inserted into the visitors table in Supabase the first time it's used.
 */
export function getSessionVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
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
