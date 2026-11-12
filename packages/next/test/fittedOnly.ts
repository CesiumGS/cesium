import type { WarpSpec } from "../src/frames/warpFrame.ts";

/**
 * A helper's warp without its smooth spec: the engine fits it, as it does a
 * warp the compiler can't take, rather than drawing it by the compiled route.
 * For the tests of the fits (scene/warpFit.ts), which are about that path.
 */
export function fittedOnly<T extends WarpSpec>(warp: T): T {
  return new Proxy(warp, {
    get: (target, key) =>
      key === "smooth" ? undefined : Reflect.get(target, key, target),
  });
}
