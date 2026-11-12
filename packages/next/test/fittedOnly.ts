import type { SmoothFrameSpec } from "../src/camera/route.ts";

/**
 * A helper's spec without its smooth spec: the engine fits it, as it does a
 * warp the compiler can't take (a function outside the IR's subset, which
 * `fromFunction` keeps as a fit), rather than drawing it by the compiled
 * route. For the tests of the fits (scene/warpFit.ts), which are about that
 * path.
 */
export function fittedOnly<T extends SmoothFrameSpec>(warp: T): T {
  return new Proxy(warp, {
    get: (target, key) =>
      key === "smooth" ? undefined : Reflect.get(target, key, target),
  });
}
