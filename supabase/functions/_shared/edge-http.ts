import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const RL_WINDOW_MS = 60_000;
const RL_MAX_PER_WINDOW = 10;
const rlBuckets = new Map<string, number[]>();

/** Per-IP burst limit in isolate memory. Fail-open on errors. */
export function isRateLimited(req: Request): boolean {
  try {
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const now = Date.now();
    const recent = (rlBuckets.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
    if (recent.length >= RL_MAX_PER_WINDOW) {
      rlBuckets.set(ip, recent);
      return true;
    }
    recent.push(now);
    rlBuckets.set(ip, recent);
    return false;
  } catch {
    return false;
  }
}

export function getPublishableKey(): string {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.default) return parsed.default as string;
      const first = Object.values(parsed)[0];
      if (typeof first === "string") return first;
    } catch {
      // fall through
    }
  }
  return (
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    ""
  );
}

export function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  return createClient(url, getPublishableKey());
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export const MAX_INTAKE_FIELD_LENGTH = 500;
export const MAX_VISITOR_ID_LENGTH = 64;

export interface IntakeFields {
  proposal: string;
  audience: string;
  whyNow: string;
  tradeoff: string;
  gutCall?: "ship" | "kill" | "unsure";
}

/** Returns an error message when invalid, otherwise null. Trims fields in place. */
export function validateIntake(intake: IntakeFields): string | null {
  const fields: Array<keyof Pick<IntakeFields, "proposal" | "audience" | "whyNow" | "tradeoff">> = [
    "proposal",
    "audience",
    "whyNow",
    "tradeoff",
  ];
  for (const key of fields) {
    const raw = intake[key];
    if (typeof raw !== "string" || !raw.trim()) {
      return "Missing required fields";
    }
    const trimmed = raw.trim();
    if (trimmed.length > MAX_INTAKE_FIELD_LENGTH) {
      return `Field ${key} is too long`;
    }
    intake[key] = trimmed;
  }
  if (intake.gutCall && !["ship", "kill", "unsure"].includes(intake.gutCall)) {
    return "Invalid gutCall";
  }
  return null;
}

/** Accepts anon-{uuid} visitor IDs from the client; rejects malformed values. */
export function normalizeVisitorId(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (value.length > MAX_VISITOR_ID_LENGTH) return null;
  if (!/^anon-[0-9a-f-]{36}$/i.test(value)) return null;
  return value;
}
