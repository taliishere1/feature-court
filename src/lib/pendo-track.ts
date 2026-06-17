/** Queue track events until the Pendo Web SDK is ready (official Pendo pattern). */
export function pendoTrack(
  name: string,
  data?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;

  function send(): void {
    if (window.pendo?.isReady?.()) {
      window.pendo.track(name, data);
      return;
    }
    setTimeout(send, 500);
  }

  send();
}
