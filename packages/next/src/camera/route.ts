// Routes through the frame graph, rigid edges and warps (plan §13.26, the
// second review). A warp is a non-rigid edge: a map from one frame to
// another, exact in float64, which the engine fits per tile for the GPU. A
// route is the path from a content frame to a base (ISO 19111's
// concatenated coordinate operation, PROJ's pipeline): rigid steps and warp
// steps in order. "True" coordinates are any frame reached without crossing
// a presentation warp.
import type { FrameKey } from "./frameResolver.ts";

/**
 * A non-rigid edge of the frame graph: points in `from` (metres, its axes)
 * map to `to` by `forward`. A coordinate operation is a warp (where content
 * is); so is an application's vertical exaggeration (`presentation`: where
 * it's drawn, never where it is).
 */
export interface Warp {
  readonly from: FrameKey;
  readonly to: FrameKey;
  /** Changes how content is drawn, never where it is (exaggeration, not a reprojection). */
  readonly presentation: boolean;
  /** Goes up whenever `forward` changes; the fits of every route through it are redone. */
  readonly revision: number;
  /** Where the warp is defined, in `from`, as a CRS's area of use; everywhere when absent. */
  readonly domain?: {
    readonly center: ArrayLike<number>;
    readonly radius: number;
  };
  /** Its stated accuracy against what it models, m: a worst-case `bound` and a statistical `sigma` (1σ). Exact when absent. */
  readonly accuracy?: {
    readonly bound?: number;
    readonly sigma?: number;
    readonly note?: string;
  };
  /** Words for reports (a PROJ pipeline, "vertical exaggeration × 10"). */
  readonly description?: string;
  /**
   * `p` in `from` to `out` in `to`. With `jacobian` (9 numbers), also writes
   * ∂out/∂p there, column-major. Must be injective on its domain.
   */
  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array;
  /** `q` in `to` back to `from`. When absent, the engine solves by Newton (`warpInverse`). */
  inverse?(q: ArrayLike<number>, out: Float64Array): Float64Array;
}

/** One step of a route: a rigid transform (column-major 4×4, p_next = m · p) or a warp, either way. */
export type RouteStep =
  | { readonly kind: "rigid"; readonly matrix: Float64Array }
  | { readonly kind: "warp"; readonly warp: Warp; readonly inverse: boolean };

/** The path from `frame` to `base` at `seconds`: its steps in order, with adjacent rigid steps composed. */
export interface Route {
  readonly frame: FrameKey;
  readonly base: FrameKey;
  readonly seconds: number;
  /** At least one step; a route with no warp is one rigid step. */
  readonly steps: readonly RouteStep[];
  /** Whether it crosses a presentation warp: its answers say where content is drawn, not where it is. */
  readonly presentation: boolean;
  /** The resolver's `routeRevision(frame, base)`, which counts its warps' revisions too. */
  readonly revision: number;
}

/** Thrown by `FrameResolver.resolve` for a route that crosses a warp: it has no 4×4. Use `route`. */
export class NonRigidRouteError extends Error {
  readonly frame: string;
  readonly base: string;

  constructor(frame: string, base: string) {
    super(
      `${frame} to ${base}: the route crosses a warp, so it has no 4×4; use the resolver's route()`,
    );
    this.name = "NonRigidRouteError";
    this.frame = frame;
    this.base = base;
  }
}

/** Whether the route is rigid: one rigid step. */
export function routeIsRigid(route: Route): boolean {
  return route.steps.every((s) => s.kind === "rigid");
}

/** A point of `route.frame` carried to `route.base`, in float64. */
export function routeForward(
  route: Route,
  p: ArrayLike<number>,
  out = new Float64Array(3),
): Float64Array {
  const at = new Float64Array([p[0]!, p[1]!, p[2]!]);
  for (const step of route.steps) {
    if (step.kind === "rigid") {
      transformPoint(step.matrix, at, at);
    } else if (step.inverse) {
      warpInverse(step.warp, at, at);
    } else {
      step.warp.forward(at.slice(), at);
    }
  }
  out.set(at);
  return out;
}

/** A point of `route.base` carried back to `route.frame`, in float64: each step undone, last first. */
export function routeInverse(
  route: Route,
  q: ArrayLike<number>,
  out = new Float64Array(3),
): Float64Array {
  const at = new Float64Array([q[0]!, q[1]!, q[2]!]);
  const inv = new Float64Array(16);
  for (let i = route.steps.length - 1; i >= 0; i--) {
    const step = route.steps[i]!;
    if (step.kind === "rigid") {
      invertRigid(step.matrix, inv);
      transformPoint(inv, at, at);
    } else if (step.inverse) {
      step.warp.forward(at.slice(), at);
    } else {
      warpInverse(step.warp, at, at);
    }
  }
  out.set(at);
  return out;
}

/**
 * `q` in the warp's `to` back to its `from`: its own `inverse` when it has
 * one, else Newton from `q` with its Jacobian, to `tolerance` metres.
 * Throws when it doesn't converge (the warp isn't injective near `q`).
 */
export function warpInverse(
  warp: Warp,
  q: ArrayLike<number>,
  out = new Float64Array(3),
  { tolerance = 1e-9, iterations = 32 } = {},
): Float64Array {
  if (warp.inverse) {
    return warp.inverse(q, out);
  }
  const target = [q[0]!, q[1]!, q[2]!];
  const p = new Float64Array(target);
  const f = new Float64Array(3);
  const j = new Float64Array(9);
  for (let k = 0; k < iterations; k++) {
    warp.forward(p, f, j);
    const r = [f[0]! - target[0]!, f[1]! - target[1]!, f[2]! - target[2]!];
    const step = solve3(j, r);
    p[0] = p[0]! - step[0]!;
    p[1] = p[1]! - step[1]!;
    p[2] = p[2]! - step[2]!;
    if (Math.hypot(r[0]!, r[1]!, r[2]!) <= tolerance) {
      out.set(p);
      return out;
    }
  }
  throw new Error(
    `warpInverse: ${warp.description ?? `${warp.from.name} to ${warp.to.name}`} did not converge`,
  );
}

function transformPoint(m: Float64Array, p: Float64Array, out: Float64Array) {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
}

/** The inverse of a rigid 4×4 (rotation and translation; no scale). */
function invertRigid(m: Float64Array, out: Float64Array) {
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      out[c * 4 + r] = m[r * 4 + c]!;
    }
  }
  for (let r = 0; r < 3; r++) {
    out[12 + r] = -(
      out[r]! * m[12]! +
      out[4 + r]! * m[13]! +
      out[8 + r]! * m[14]!
    );
  }
  out[3] = 0;
  out[7] = 0;
  out[11] = 0;
  out[15] = 1;
}

/** x with J·x = r, J column-major 3×3 (Cramer's rule). */
function solve3(j: Float64Array, r: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = Array.from(j);
  // Columns: (a, b, c), (d, e, f), (g, h, i).
  const det =
    a! * (e! * i! - f! * h!) -
    d! * (b! * i! - c! * h!) +
    g! * (b! * f! - c! * e!);
  if (!(Math.abs(det) > 0)) {
    throw new Error("warpInverse: the warp's Jacobian is singular");
  }
  const col = (x: number[], y: number[], z: number[]) =>
    x[0]! * (y[1]! * z[2]! - y[2]! * z[1]!) -
    y[0]! * (x[1]! * z[2]! - x[2]! * z[1]!) +
    z[0]! * (x[1]! * y[2]! - x[2]! * y[1]!);
  const c0 = [a!, b!, c!];
  const c1 = [d!, e!, f!];
  const c2 = [g!, h!, i!];
  return [col(r, c1, c2) / det, col(c0, r, c2) / det, col(c0, c1, r) / det];
}
