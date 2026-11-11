// Routes through the frame graph, rigid edges and warps (plan §13.26, the
// second review). A warp is a non-rigid edge: a map from one frame to
// another, exact in float64, which the engine fits per tile for the GPU. A
// route is the path from a content frame to a base (ISO 19111's
// concatenated coordinate operation, PROJ's pipeline): rigid steps and warp
// steps in order. "True" coordinates are any frame reached without crossing
// a presentation warp.
import type { FrameKey, FrameResolver } from "./frameResolver.ts";

/** A number that is read live and moves a warp's strength; a `PlacementParameter` has this shape. */
export interface WarpScale {
  readonly value: number;
  /** The values it will take, when it declares them (a `PlacementParameter`'s `range`): its draws' bounds then hold over all of it. */
  readonly range?: readonly [number, number];
}

/**
 * The marker of a warp that scales heights above a reference ellipsoid
 * (plan §13.26, increment 4): `forward(p) = p + (factor − 1)·h·n̂`, with `h`
 * the geodetic height of `p` above the ellipsoid and `n̂` its normal there,
 * so a point keeps its longitude and latitude and its height becomes
 * `factor · h`. At warp scale `s` (`Warp.scale`) the factor in force is
 * `1 + s·(factor − 1)`. Terrain, whose vertices are (u, v, h) on that
 * ellipsoid, is exaggerated exactly from it: a vertex attribute `h·n̂`
 * times a weight, with no fit.
 */
export interface HeightScale {
  readonly kind: "heightScale";
  /** The reference ellipsoid's radii (x, y, z), m: a sphere's all equal. */
  readonly radii: readonly [number, number, number];
  /** What `forward` multiplies heights by (at warp scale 1). */
  readonly factor: number;
  /** The height that stays put, m above the ellipsoid (default 0): terrain is exact only for 0. */
  readonly baseHeight?: number;
}

/**
 * A non-rigid edge of the frame graph: points in `from` (metres, its axes)
 * map to `to` by `forward`. A coordinate operation is a warp (where content
 * is); so is an application's vertical exaggeration (`presentation`: where
 * it's drawn, never where it is).
 */
export interface Warp {
  /**
   * Declares the warp a vertical exaggeration (`HeightScale`): the engine may
   * then take it exactly, in height, where content carries heights, instead
   * of fitting it. Absent for any other warp.
   */
  readonly heightScale?: HeightScale;
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
   * How much of the warp applies, read live (a `PlacementParameter` is one,
   * and a slider writes one float): `forward` is the warp at 1, and at `s`
   * the warp is `p + s·(forward(p) − p)`. Absent, always 1. Use
   * `warpForward` and `warpInverse`, which honour it.
   */
  readonly scale?: WarpScale;
  /**
   * `p` in `from` to `out` in `to`, at scale 1. With `jacobian` (9 numbers),
   * also writes ∂out/∂p there, column-major. Must be injective on its domain.
   */
  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array;
  /**
   * `q` in `to` back to `from`, at scale 1 (as `forward`). When absent, the
   * engine solves by Newton (`warpInverse`). Call `warpInverse`, not this,
   * to invert the warp as it is drawn: it takes the `scale` in force.
   */
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

/**
 * Thrown where a question needs true coordinates (a ray query) and its route
 * crosses a presentation warp: the frames say where content is drawn, not
 * where it is.
 */
export class PresentationRouteError extends Error {
  readonly frame: string;
  readonly base: string;

  constructor(frame: string, base: string) {
    super(
      `${frame} to ${base}: the route crosses a presentation warp (a drawn frame, as a vertical exaggeration), and this asks for true coordinates; name a frame reached without crossing it`,
    );
    this.name = "PresentationRouteError";
    this.frame = frame;
    this.base = base;
  }
}

/** Whether the route is rigid: one rigid step. */
export function routeIsRigid(route: Route): boolean {
  return route.steps.every((s) => s.kind === "rigid");
}

/**
 * `resolver`'s route from `frame` to `base`: its own `route`, or for a
 * resolver without one, a single rigid step from `resolve` (which then has
 * no warps to cross).
 */
export function resolveRoute(
  resolver: FrameResolver,
  frame: FrameKey,
  base: FrameKey,
  seconds: number,
): Route {
  if (resolver.route) {
    return resolver.route(frame, base, seconds);
  }
  return {
    frame,
    base,
    seconds,
    steps: [
      {
        kind: "rigid",
        matrix: resolver.resolve(frame, base, seconds, new Float64Array(16)),
      },
    ],
    presentation: false,
    revision: resolver.routeRevision(frame, base),
  };
}

const forwardAt = new Float64Array(3);
const forwardFrom = new Float64Array(3);
let forwarding = false;

/** A point of `route.frame` carried to `route.base`, in float64, each warp at the scale it has now (`warpForward`). */
export function routeForward(
  route: Route,
  p: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  // The scratch is shared unless a warp's own `forward` came back here.
  const shared = !forwarding;
  const at = shared ? forwardAt : new Float64Array(3);
  const from = shared ? forwardFrom : new Float64Array(3);
  at[0] = p[0]!;
  at[1] = p[1]!;
  at[2] = p[2]!;
  forwarding = true;
  try {
    for (const step of route.steps) {
      if (step.kind === "rigid") {
        transformPoint(step.matrix, at, at);
      } else if (step.inverse) {
        warpInverse(step.warp, at, at);
      } else {
        from.set(at);
        warpForward(step.warp, from, at);
      }
    }
  } finally {
    forwarding = !shared;
  }
  out.set(at);
  return out;
}

/** A point of `route.base` carried back to `route.frame`, in float64: each step undone, last first, each warp at the scale it has now (`warpInverse`). */
export function routeInverse(
  route: Route,
  q: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  const at = new Float64Array([q[0]!, q[1]!, q[2]!]);
  const inv = new Float64Array(16);
  for (let i = route.steps.length - 1; i >= 0; i--) {
    const step = route.steps[i]!;
    if (step.kind === "rigid") {
      invertRigid(step.matrix, inv);
      transformPoint(inv, at, at);
    } else if (step.inverse) {
      warpForward(step.warp, at.slice(), at);
    } else {
      warpInverse(step.warp, at, at);
    }
  }
  out.set(at);
  return out;
}

/** A warp's scale now: 1 without one. Throws for a value that isn't finite. */
export function warpScaleOf(warp: Warp): number {
  const s = warp.scale?.value ?? 1;
  if (!Number.isFinite(s)) {
    throw new RangeError(
      `warp ${warp.description ?? `${warp.from.name} to ${warp.to.name}`}: its scale is ${s}; it takes a finite number`,
    );
  }
  return s;
}

/**
 * `p` carried by the warp at its scale: `p + s·(forward(p) − p)` (`forward`
 * itself at 1, the identity at 0). With `jacobian`, ∂out/∂p likewise,
 * `I + s(J − I)`. `p` may be `out`.
 */
export function warpForward(
  warp: Warp,
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const s = warpScaleOf(warp);
  if (s === 1) {
    return warp.forward(p, out, jacobian);
  }
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  if (s === 0) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    jacobian?.set([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    return out;
  }
  warp.forward([x, y, z], out, jacobian);
  out[0] = x + s * (out[0]! - x);
  out[1] = y + s * (out[1]! - y);
  out[2] = z + s * (out[2]! - z);
  if (jacobian) {
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        const i = c * 3 + r;
        const id = r === c ? 1 : 0;
        jacobian[i] = id + s * (jacobian[i]! - id);
      }
    }
  }
  return out;
}

/** `route` with every warp's scale taken at `scaleOf` (undefined: scale 1, no scale). */
function mapScales(
  route: Route,
  scaleOf: (warp: Warp) => WarpScale | undefined,
): Route {
  if (!route.steps.some((s) => s.kind === "warp" && s.warp.scale)) {
    return route;
  }
  return {
    ...route,
    steps: route.steps.map((step) => {
      if (step.kind === "rigid" || !step.warp.scale) {
        return step;
      }
      const w = step.warp;
      const scale = scaleOf(w);
      const fixed: Warp = {
        from: w.from,
        to: w.to,
        presentation: w.presentation,
        revision: w.revision,
        ...(w.heightScale !== undefined && { heightScale: w.heightScale }),
        ...(w.domain !== undefined && { domain: w.domain }),
        ...(w.accuracy !== undefined && { accuracy: w.accuracy }),
        ...(w.description !== undefined && { description: w.description }),
        ...(scale !== undefined && { scale }),
        forward: (p, out, jacobian) => w.forward(p, out, jacobian),
        ...(w.inverse !== undefined && {
          inverse: (q: ArrayLike<number>, out: Float64Array) =>
            w.inverse!(q, out),
        }),
      };
      return { kind: "warp", warp: fixed, inverse: step.inverse };
    }),
  };
}

/** `route` with every warp at scale 1: what its scaled warps fit as unit displacements. */
export function withoutScales(route: Route): Route {
  return mapScales(route, () => undefined);
}

/** `route` with each warp's scale fixed at its value now: a snapshot a fit can run on later. */
export function withFrozenScales(route: Route): Route {
  return mapScales(route, (w) => ({ value: warpScaleOf(w) }));
}

/** `route` with each scaled warp's scale fixed at `valueOf(warp)`: the ends of an interval of a slider, to bound what it draws. */
export function withScalesAt(
  route: Route,
  valueOf: (warp: Warp) => number,
): Route {
  return mapScales(route, (w) => ({ value: valueOf(w) }));
}

/**
 * `q` in the warp's `to` back to its `from`: its own `inverse` when it has
 * one (at scale 1), else Newton from `q` with its Jacobian at its scale, to
 * `tolerance` metres. Throws when it doesn't converge (the warp isn't
 * injective near `q`).
 */
export function warpInverse(
  warp: Warp,
  q: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
  { tolerance = 1e-9, iterations = 32 } = {},
): Float64Array {
  const scale = warpScaleOf(warp);
  if (scale === 1 && warp.inverse) {
    return warp.inverse(q, out);
  }
  const target = [q[0]!, q[1]!, q[2]!];
  if (scale === 0) {
    out.set(target);
    return out;
  }
  const p = new Float64Array(target);
  const f = new Float64Array(3);
  const j = new Float64Array(9);
  for (let k = 0; k < iterations; k++) {
    warpForward(warp, p, f, j);
    const r = [f[0]! - target[0]!, f[1]! - target[1]!, f[2]! - target[2]!];
    const step = solve3(j, r);
    p[0] = p[0]! - step[0]!;
    p[1] = p[1]! - step[1]!;
    p[2] = p[2]! - step[2]!;
    // At Earth scale the residual stalls at a few ulps (~1e-9 m): a step
    // below the rounding of `p` is as converged as float64 gets.
    const floor =
      64 * Number.EPSILON * Math.max(1, Math.hypot(p[0], p[1], p[2]));
    if (
      Math.hypot(r[0]!, r[1]!, r[2]!) <= tolerance ||
      Math.hypot(step[0]!, step[1]!, step[2]!) <= floor
    ) {
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
