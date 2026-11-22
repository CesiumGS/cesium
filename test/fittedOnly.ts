import type { CurvilinearFrameSpec } from "../packages/next/src/camera/route.ts";

/**
 * A helper's spec without its curvilinear spec: the engine fits it, as it does a
 * curvilinear map the compiler can't take (a function outside the IR's subset, which
 * `fromFunction` keeps as a fit), rather than drawing it by the compiled
 * route. For the tests of the fits (scene/curvilinearFit.ts), which are about that
 * path.
 */
export function fittedOnly<T extends CurvilinearFrameSpec>(
  curvilinearMap: T,
): T {
  return new Proxy(curvilinearMap, {
    get: (target, key) =>
      key === "curvilinear" ? undefined : Reflect.get(target, key, target),
  });
}
