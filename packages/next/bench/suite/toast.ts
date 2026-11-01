/**
 * Toasts: short confirmations any Dyno view can show ("Saved", "Copied");
 * the shell (app.tsx) draws them.
 */
export function toast(message: string, tone: "good" | "bad" = "good"): void {
  dispatchEvent(new CustomEvent("dyno:toast", { detail: { message, tone } }));
}
