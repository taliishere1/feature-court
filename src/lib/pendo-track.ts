/** Queue track events until the Pendo Web SDK is ready (official Pendo pattern). */
const RETRY_MS = 500;
const MAX_WAIT_MS = 30_000;

export function pendoTrack(
  name: string,
  data?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;

  const started = Date.now();

  function send(): void {
    if (window.pendo?.isReady?.()) {
      window.pendo.track(name, data);
      window.pendo.flushNow?.();
      return;
    }
    if (Date.now() - started >= MAX_WAIT_MS) return;
    setTimeout(send, RETRY_MS);
  }

  send();
}
