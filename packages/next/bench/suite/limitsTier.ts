import type { LimitsTier } from "../../src/gpu/limits.ts";

/**
 * The page's `?limits=` (before the `#`), read when this module first loads:
 * Dyno's hash router rewrites the URL at startup, dropping it. app.tsx
 * imports this module first so it is read before that.
 */
const fromPage = (() => {
  try {
    const value = new URLSearchParams(location.search).get("limits");
    if (value === "minimum" || value === "adapter" || value === "base") {
      sessionStorage.setItem("dyno.limits", value);
      return value;
    }
    const kept = sessionStorage.getItem("dyno.limits");
    return kept === "minimum" || kept === "adapter" ? kept : "base";
  } catch {
    return "base";
  }
})() as LimitsTier;

/**
 * The device limits tier Dyno's 2.0 engines are created with: the page's
 * `?limits=`, e.g. `/?limits=minimum#/viewer` to see on this machine what
 * the smallest WebGPU device would (CESIUM2_WEBGPU_PLAN.md §13.15). It is
 * kept for the browser tab's session; `?limits=base` goes back. Default
 * `base`.
 */
export function limitsTier(): LimitsTier {
  return fromPage;
}

/**
 * Reloads Dyno on `tier` (kept for the tab's session): the device is
 * created again with those limits, every engine on the page with it.
 */
export function reloadWithLimits(tier: string): void {
  try {
    sessionStorage.setItem("dyno.limits", tier);
  } catch {
    // Without storage the page's parameter alone carries it.
  }
  const url = new URL(location.href);
  url.searchParams.set("limits", tier);
  location.assign(url.toString());
}
