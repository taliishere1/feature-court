export const RATE_LIMIT_COOLDOWN_MS = 60_000;

export const RATE_LIMIT_MESSAGE =
  "Too many requests. Please wait a moment and try again.";

export type EdgeFunctionErrorInfo = {
  message: string;
  isRateLimited: boolean;
};

/** Extract a user-facing message and whether the failure was a 429 rate limit. */
export async function parseEdgeFunctionError(
  error: unknown,
  response?: Response
): Promise<EdgeFunctionErrorInfo> {
  const res =
    response ?? (error as { context?: Response } | null)?.context ?? undefined;
  const status = res?.status;

  let message =
    error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";

  if (res) {
    try {
      const body = await res.clone().json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Response body wasn't JSON — keep the default message.
    }
  }

  const isRateLimited =
    status === 429 || message.toLowerCase().includes("too many requests");

  return {
    message: isRateLimited ? RATE_LIMIT_MESSAGE : message,
    isRateLimited,
  };
}
