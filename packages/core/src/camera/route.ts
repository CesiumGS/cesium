// Routes through the frame tree, affine edges and curvilinear edges (docs/design/transform-graph.md).
// A curvilinear map is a curvilinear edge: a map from a frame's own coordinates up to its
// parent's, exact in float64, which the engine compiles or fits for the GPU.
// A route is the path from a content frame to a base (ISO 19111's
// concatenated coordinate operation, PROJ's pipeline): affine steps and curvilinear map
// steps in order, a curvilinear step forward where the route goes up through the
// edge and inverse where it goes down. What is placed in a frame has that
// frame's coordinates, true or not as the application decides, and is drawn
// through the edges between it and the camera's root.
import { invertAffine } from "../math/mat4.ts";
import type { Params, CurvilinearSpec, ViewId } from "../transform/graph.ts";
import type { FrameKey, FrameResolver } from "./frameResolver.ts";

/** A number that is read live and moves a curvilinear map's strength; a `PlacementParameter` has this shape. */
export interface CurvilinearScale {
  readonly value: number;
  /** The values it will take, when it declares them (a `PlacementParameter`'s `range`): its draws' bounds then hold over all of it. */
  readonly range?: readonly [number, number];
}

/**
 * The marker of a curvilinear map that scales heights above a reference ellipsoid
 * (docs/design/geometry-through-placement-review.md, increment 4): `forward(p) = p + (factor − 1)·h·n̂`, with `h`
 * the geodetic height of `p` above the ellipsoid and `n̂` its normal there,
 * so a point keeps its longitude and latitude and its height becomes
 * `factor · h`. At curvilinear map scale `s` (`CurvilinearMap.scale`) the factor in force is
 * `1 + s·(factor − 1)`. Terrain, whose vertices are (u, v, h) on that
 * ellipsoid, is exaggerated exactly from it: a vertex attribute `h·n̂`
 * times a weight, with no fit.
 *
 * With a `profile` (a ceiling) it is a height profile instead of a scale: a
 * point at height h goes to h + (factor − 1)·G(h), G the part of the height
 * that is lifted (src/camera/heightProfile.ts): h − baseHeight below the
 * blend, a constant above the ceiling. The displacement along n̂ is
 * D(h) = (factor − 1)·G(h), dh'/dh replaces `factor` where a derivative is
 * meant, and terrain carries (n̂, h) instead of `h·n̂`
 * (`HEIGHT_PROFILE_ATTRIBUTE`). Without one, behavior is as above.
 */
export interface HeightScale {
  readonly kind: "heightScale";
  /** The reference ellipsoid's radii (x, y, z), m: a sphere's all equal. */
  readonly radii: readonly [number, number, number];
  /** What `forward` multiplies heights by (at curvilinear map scale 1). */
  readonly factor: number;
  /** The height that stays put, m above the ellipsoid (default 0): terrain is exact only for 0, without a `profile`. */
  readonly baseHeight?: number;
  /**
   * The ceiling, m above the ellipsoid, above which the lift is constant,
   * and the width `band` below it over which it blends into the constant
   * (the georeference built-in's, `verticalExaggerationEdge`). Absent: heights
   * are scaled at any height.
   */
  readonly profile?: { readonly ceiling: number; readonly band: number };
}

/**
 * A curvilinear edge of the frame tree: points in `from` (the node's own
 * coordinates, meters, its axes) map to `to` (its parent) by `forward`, the
 * direction of the transform graph (src/transform): a curvilinear frame over some
 * content is a node whose forward is the deformation, so what is placed in it
 * keeps its true coordinates and is drawn through the edge. A coordinate
 * operation is the same kind of edge.
 */
export interface CurvilinearMap {
  /**
   * Declares the curvilinear map a vertical exaggeration (`HeightScale`): the engine may
   * then take it exactly, in height, where content carries heights, instead
   * of fitting it. Absent for any other curvilinear map.
   */
  readonly heightScale?: HeightScale;
  /**
   * The error policy for content drawn through this curvilinear map, in [0, 1]: terrain
   * and tile selection use the curvilinear map's stretch s as s^α (default 0.3 where no
   * node or view says, `DEFAULT_LOD_EXPONENT`). 1 is exact in the drawn frame: a tile is refined
   * until its error is small as drawn. 0 measures the error in the content's
   * own frame, as if affine, so a curvilinear map that stretches draws coarser tiles
   * and its transitions show s times larger. A view's `lodExponent` is used
   * where no curvilinear map on the route sets this; the curvilinear map's value wins where set.
   */
  readonly lodExponent?: number;
  readonly from: FrameKey;
  readonly to: FrameKey;
  /** Goes up whenever `forward` changes; the fits of every route through it are redone. */
  readonly revision: number;
  /** Where the curvilinear map is defined, in `from`, as a CRS's area of use; everywhere when absent. */
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
   * How much of the curvilinear map applies, read live (a `PlacementParameter` is one,
   * and a slider writes one float): `forward` is the curvilinear map at 1, and at `s`
   * the curvilinear map is `p + s·(forward(p) − p)`. Absent, always 1. Use
   * `curvilinearForward` and `curvilinearInverse`, which honor it.
   */
  readonly scale?: CurvilinearScale;
  /**
   * The curvilinear map as a transform-graph curvilinear step (src/transform): its function
   * as restricted JS (`source`) with `params` read live and, for a curvilinear map with
   * a `scale`, the `identity` values the scale interpolates from. A draw
   * whose route crosses only curvilinear maps that have one is drawn by the compiled
   * route (scene/world/routes.ts), with no fit; absent, or refused by the
   * compiler, the curvilinear map is fitted as ever. Set by the helpers over the built-in
   * transforms; it must be the same map as `forward` where content is.
   */
  readonly curvilinear?: CurvilinearSpec;
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
   * engine solves by Newton (`curvilinearInverse`). Call `curvilinearInverse`, not this,
   * to invert the curvilinear map as it is drawn: it takes the `scale` in force.
   */
  inverse?(q: ArrayLike<number>, out: Float64Array): Float64Array;
}

/**
 * A `CurvilinearMap` without its ends, for a curvilinear frame (`curvilinearFrame`, in the frames
 * module): `from` is the new frame and `to` its parent. What the helpers
 * (`verticalExaggeration`, `scaleAbout`, `fromFunction`, …) return.
 */
export type CurvilinearFrameSpec = Omit<CurvilinearMap, "from" | "to"> & {
  /**
   * Called once with each frame built on this spec: how a helper's
   * `changed()` finds the frames to `invalidate()`.
   */
  readonly attach?: (frame: { invalidate(): void }) => void;
};

/** One step of a route: an affine transform (column-major 4×4, p_next = m · p) or a curvilinear map, either way. */
export type RouteStep =
  | { readonly kind: "affine"; readonly matrix: Float64Array }
  | {
      readonly kind: "curvilinear";
      readonly curvilinearMap: CurvilinearMap;
      readonly inverse: boolean;
    };

/** The path from `frame` to `base` at `seconds`: its steps in order, with adjacent affine steps composed. */
export interface Route {
  readonly frame: FrameKey;
  readonly base: FrameKey;
  readonly seconds: number;
  /** At least one step; a route with no curvilinear map is one affine step. */
  readonly steps: readonly RouteStep[];
  /** The resolver's `routeRevision(frame, base)`, which counts its curvilinear maps' revisions too. */
  readonly revision: number;
}

/** Thrown by `FrameResolver.resolve` for a route that crosses a curvilinear edge: it has no 4×4. Use `route`. */
export class NonAffineRouteError extends Error {
  readonly frame: string;
  readonly base: string;

  constructor(frame: string, base: string) {
    super(
      `${frame} to ${base}: the route crosses a curvilinear edge, so it has no 4×4; use the resolver's route()`,
    );
    this.name = "NonAffineRouteError";
    this.frame = frame;
    this.base = base;
  }
}

/** Whether the route is affine: one affine step. */
export function routeIsAffine(route: Route): boolean {
  return route.steps.every((s) => s.kind === "affine");
}

/**
 * `resolver`'s route from `frame` to `base`: its own `route`, or for a
 * resolver without one, a single affine step from `resolve` (which then has
 * no curvilinear maps to cross).
 */
export function resolveRoute(
  resolver: FrameResolver,
  frame: FrameKey,
  base: FrameKey,
  seconds: number,
  view?: ViewId,
): Route {
  if (resolver.route) {
    return resolver.route(frame, base, seconds, view);
  }
  return {
    frame,
    base,
    seconds,
    steps: [
      {
        kind: "affine",
        matrix: resolver.resolve(frame, base, seconds, new Float64Array(16)),
      },
    ],
    revision: resolver.routeRevision(frame, base),
  };
}

const forwardAt = new Float64Array(3);
const forwardFrom = new Float64Array(3);
let forwarding = false;

/** A point of `route.frame` carried to `route.base`, in float64, each curvilinear map at the scale it has now (`curvilinearForward`). */
export function routeForward(
  route: Route,
  p: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  // The scratch is shared unless a curvilinear map's own `forward` came back here.
  const shared = !forwarding;
  const at = shared ? forwardAt : new Float64Array(3);
  const from = shared ? forwardFrom : new Float64Array(3);
  at[0] = p[0]!;
  at[1] = p[1]!;
  at[2] = p[2]!;
  forwarding = true;
  try {
    for (const step of route.steps) {
      if (step.kind === "affine") {
        transformPoint(step.matrix, at, at);
      } else if (step.inverse) {
        curvilinearInverse(step.curvilinearMap, at, at);
      } else {
        from.set(at);
        curvilinearForward(step.curvilinearMap, from, at);
      }
    }
  } finally {
    forwarding = !shared;
  }
  out.set(at);
  return out;
}

/**
 * A point of `route.base` carried back to `route.frame`, in float64: each step undone, last first, each curvilinear map at the scale it has now (`curvilinearInverse`).
 * An affine step is inverted as a general affine matrix, so one that scales unevenly or shears comes back exact; a singular one (a zero scale) throws.
 */
export function routeInverse(
  route: Route,
  q: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  const at = new Float64Array([q[0]!, q[1]!, q[2]!]);
  const inv = new Float64Array(16);
  for (let i = route.steps.length - 1; i >= 0; i--) {
    const step = route.steps[i]!;
    if (step.kind === "affine") {
      invertAffineStep(step.matrix, inv, i);
      transformPoint(inv, at, at);
    } else if (step.inverse) {
      curvilinearForward(step.curvilinearMap, at.slice(), at);
    } else {
      curvilinearInverse(step.curvilinearMap, at, at);
    }
  }
  out.set(at);
  return out;
}

/** A curvilinear map's scale now: 1 without one. Throws for a value that isn't finite. */
export function curvilinearScaleOf(curvilinearMap: CurvilinearMap): number {
  const s = curvilinearMap.scale?.value ?? 1;
  if (!Number.isFinite(s)) {
    throw new RangeError(
      `curvilinear map ${curvilinearMap.description ?? `${curvilinearMap.from.name} to ${curvilinearMap.to.name}`}: its scale is ${s}; it takes a finite number`,
    );
  }
  return s;
}

/**
 * The parameter values a curvilinear map's curvilinear step has now: the spec's, at the
 * curvilinear map's scale (each parameter named in `identity` at
 * `identity + s · (value − identity)`, the curvilinear map's `p + s · (f(p) − p)`).
 */
export function curvilinearValuesOf(curvilinearMap: CurvilinearMap): Params {
  const spec = curvilinearMap.curvilinear!;
  const values: Record<string, number> = { ...spec.params };
  if (curvilinearMap.scale) {
    const s = curvilinearScaleOf(curvilinearMap);
    for (const [name, identity] of Object.entries(spec.identity ?? {})) {
      if (name in values) {
        values[name] = identity + s * (values[name]! - identity);
      }
    }
  }
  return values;
}

/**
 * `p` carried by the curvilinear map at its scale: `p + s·(forward(p) − p)` (`forward`
 * itself at 1, the identity at 0). With `jacobian`, ∂out/∂p likewise,
 * `I + s(J − I)`. `p` may be `out`.
 */
export function curvilinearForward(
  curvilinearMap: CurvilinearMap,
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const s = curvilinearScaleOf(curvilinearMap);
  if (s === 1) {
    return curvilinearMap.forward(p, out, jacobian);
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
  curvilinearMap.forward([x, y, z], out, jacobian);
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

/** `route` with every curvilinear map's scale taken at `scaleOf` (undefined: scale 1, no scale). */
function mapScales(
  route: Route,
  scaleOf: (curvilinearMap: CurvilinearMap) => CurvilinearScale | undefined,
): Route {
  if (
    !route.steps.some((s) => s.kind === "curvilinear" && s.curvilinearMap.scale)
  ) {
    return route;
  }
  return {
    ...route,
    steps: route.steps.map((step) => {
      if (step.kind === "affine" || !step.curvilinearMap.scale) {
        return step;
      }
      const w = step.curvilinearMap;
      const scale = scaleOf(w);
      const fixed: CurvilinearMap = {
        from: w.from,
        to: w.to,
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
      return {
        kind: "curvilinear",
        curvilinearMap: fixed,
        inverse: step.inverse,
      };
    }),
  };
}

/** `route` with every curvilinear map at scale 1: what its scaled curvilinear maps fit as unit displacements. */
export function withoutScales(route: Route): Route {
  return mapScales(route, () => undefined);
}

/** `route` with each curvilinear map's scale fixed at its value now: a snapshot a fit can run on later. */
export function withFrozenScales(route: Route): Route {
  return mapScales(route, (w) => ({ value: curvilinearScaleOf(w) }));
}

/** `route` with each scaled curvilinear map's scale fixed at `valueOf(curvilinearMap)`: the ends of an interval of a slider, to bound what it draws. */
export function withScalesAt(
  route: Route,
  valueOf: (curvilinearMap: CurvilinearMap) => number,
): Route {
  return mapScales(route, (w) => ({ value: valueOf(w) }));
}

/**
 * `q` in the curvilinear map's `to` back to its `from`: its own `inverse` when it has
 * one (at scale 1), else Newton from `q` with its Jacobian at its scale, to
 * `tolerance` meters. Throws when it doesn't converge (the curvilinear map isn't
 * injective near `q`).
 */
export function curvilinearInverse(
  curvilinearMap: CurvilinearMap,
  q: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
  { tolerance = 1e-9, iterations = 32 } = {},
): Float64Array {
  const scale = curvilinearScaleOf(curvilinearMap);
  if (scale === 1 && curvilinearMap.inverse) {
    return curvilinearMap.inverse(q, out);
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
    curvilinearForward(curvilinearMap, p, f, j);
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
    `curvilinearInverse: ${curvilinearMap.description ?? `${curvilinearMap.from.name} to ${curvilinearMap.to.name}`} did not converge`,
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

/**
 * The inverse of an affine step's 4×4 (column-major, last row 0 0 0 1), which
 * may scale unevenly and shear, not only rotate and translate. Throws for a
 * matrix that is not finite or whose 3×3 is singular (a zero scale, or axes
 * that are dependent), where an inverse would be NaN or meaningless.
 */
function invertAffineStep(m: Float64Array, out: Float64Array, index: number) {
  for (let i = 0; i < 16; i++) {
    if (!Number.isFinite(m[i]!)) {
      throw new Error(
        `routeInverse: step ${index} has a matrix that is not finite`,
      );
    }
  }
  // The determinant against the product of the axes' lengths: 1 for orthogonal
  // axes, 0 for dependent ones, whatever the units.
  const det =
    m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) -
    m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) +
    m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!);
  const axes =
    Math.hypot(m[0]!, m[1]!, m[2]!) *
    Math.hypot(m[4]!, m[5]!, m[6]!) *
    Math.hypot(m[8]!, m[9]!, m[10]!);
  if (!(Math.abs(det) > 1e-12 * axes)) {
    throw new Error(
      `routeInverse: step ${index} is a singular affine transform (its 3×3 has determinant ${det}), so it has no inverse`,
    );
  }
  invertAffine(out, m);
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
    throw new Error(
      "curvilinearInverse: the curvilinear map's Jacobian is singular",
    );
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
