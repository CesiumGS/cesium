// A sphere carried through a route by declared bounds (plan 2026-11-12, task
// 12, fix 2; plan §13.37 "Queries through routes", Bounds): in place of
// sampling the route at 7 to 27 points per tile with its exact height solve,
// each smooth step is evaluated once, at the sphere's centre, and the sphere's
// radius grows by the step's declared Lipschitz constant, an upper bound on
// σ_max of its Jacobian over the sphere (`SmoothSpec.bound`). A sphere B(c, r)
// through a smooth step F is B(F(c), L·r); through an affine step it is
// exact, the radius times the matrix's largest singular value. Sound where
// each bound is, and not tight: the bound is the stretch in the worst
// direction, applied in every. A route with a step that has no bound, or one
// that inverts a warp, has no composed sphere and is sampled instead.
import { singularValues } from "./warpBounds.ts";
import type { Route, Warp } from "../camera/route.ts";
import { transformPoint, type Mat4 } from "../math/mat4.ts";

/** What a composed sphere says of the volume it came from. */
export interface ComposedSphere {
  readonly center: Float64Array;
  readonly radius: number;
  /** An upper bound on σ_max of the route's Jacobian over the sphere: the stretch of a geometric error. */
  readonly sigmaMax: number;
}

/** The values a warp's scale takes while a drawn volume holds: its bucket's ends. */
export interface ScaleSpan {
  readonly low: number;
  readonly high: number;
}

/** The largest singular value of the linear part of a column-major 4×4. */
function stretchOf(m: ArrayLike<number>): number {
  const linear = [
    m[0]!,
    m[1]!,
    m[2]!,
    m[4]!,
    m[5]!,
    m[6]!,
    m[8]!,
    m[9]!,
    m[10]!,
  ];
  return singularValues(linear)[1];
}

/**
 * The sphere (`center`, `radius`) carried through `route`, then the affine
 * `after`, with each scaled warp's scale anywhere in its span (`spans`; a
 * scaled warp without one is taken at 1). Undefined when any step has no
 * declared bound, a warp is crossed backwards, or a value is not finite.
 */
export function composeSphere(
  route: Route,
  after: ArrayLike<number> | undefined,
  spans: ReadonlyMap<Warp, ScaleSpan>,
  center: ArrayLike<number>,
  radius: number,
): ComposedSphere | undefined {
  const c = Float64Array.of(center[0]!, center[1]!, center[2]!);
  const next = new Float64Array(3);
  let r = radius;
  let sigma = 1;
  const affine = (m: ArrayLike<number>) => {
    const s = stretchOf(m);
    transformPoint(c, m as Mat4, c);
    r *= s;
    sigma *= s;
  };
  for (const step of route.steps) {
    if (step.kind === "rigid") {
      affine(step.matrix);
      continue;
    }
    const spec = step.warp.smooth;
    if (step.inverse || spec?.bound === undefined) {
      return undefined;
    }
    const ranges: Record<string, readonly [number, number]> = {};
    for (const [name, value] of Object.entries(spec.params)) {
      ranges[name] = [value, value];
    }
    const lipschitz = spec.bound({ center: c, radius: r }, ranges).lipschitz;
    if (!(lipschitz >= 0 && Number.isFinite(lipschitz))) {
      return undefined;
    }
    // The warp at scale s is p + s (F(p) - p), F at scale 1: its Jacobian
    // (1 - s) I + s J has σ_max at most |1 - s| + |s| L, convex in s, so the
    // ends of the span hold; the centre moves along its displacement with s.
    step.warp.forward([c[0]!, c[1]!, c[2]!], next);
    const span = spans.get(step.warp);
    if (step.warp.scale && span === undefined) {
      return undefined;
    }
    if (!step.warp.scale || span === undefined) {
      c.set(next);
      r *= lipschitz;
      sigma *= lipschitz;
    } else {
      const { low, high } = span;
      const mid = (low + high) / 2;
      const stretch = Math.max(
        Math.abs(1 - low) + Math.abs(low) * lipschitz,
        Math.abs(1 - high) + Math.abs(high) * lipschitz,
      );
      const move = Math.hypot(
        next[0]! - c[0]!,
        next[1]! - c[1]!,
        next[2]! - c[2]!,
      );
      for (let i = 0; i < 3; i++) {
        c[i] = c[i]! + mid * (next[i]! - c[i]!);
      }
      r = r * stretch + ((high - low) / 2) * move;
      sigma *= stretch;
    }
  }
  if (after) {
    affine(after);
  }
  return Number.isFinite(r + sigma + c[0]! + c[1]! + c[2]!)
    ? { center: c, radius: r, sigmaMax: sigma }
    : undefined;
}
