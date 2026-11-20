// A box carried through a route by declared bounds (plan 2026-11-12, task
// 12, fix 2; docs/design/transform-graph.md "Queries through routes", Bounds): in place of
// sampling the route at 7 to 27 points per tile with its exact height solve,
// each curvilinear step is evaluated once, at the box's center. A parallelepiped
// (center c, half axes the columns of A) through a curvilinear step F with the
// declared bound (`CurvilinearSpec.bound`: J = R_out J' R_inᵀ, |J'| ≤ M entrywise
// over the region) is, by the mean value theorem, inside the box about F(c)
// whose half extent along R_out's axis i is Σ_j M_ij w_j, w_j = Σ_k |(R_inᵀA)_jk|
// the region's half extent along R_in's axis j. Through an affine step the
// box maps exactly (A ← L A). Sound where each bound is, and tight where
// the stretch is along the box's own axes, which a tile's flat box is
// (a sphere stretched by 10 along one axis is 10 times too big). A route
// with a step that has no bound, or that inverts a curvilinear map, has no composed box
// and is sampled instead.
import { singularValues } from "./curvilinearBounds.ts";
import type { Route, CurvilinearMap } from "../camera/route.ts";
import { transformPoint, type Mat4 } from "../math/mat4.ts";

/** What a composed box says of the volume it came from. */
export interface ComposedBox {
  readonly center: Float64Array;
  /** Half axes, the columns (column-major 3×3). */
  readonly axes: Float64Array;
  /** An upper bound on σ_max of the route's Jacobian over the box: the stretch of a geometric error. */
  readonly sigmaMax: number;
}

/** The values a curvilinear map's scale takes while a drawn volume holds: its bucket's ends. */
export interface ScaleSpan {
  readonly low: number;
  readonly high: number;
}

/** The panels of the Riemann sum over scaled regions (below). */
const PANELS = 4;

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

/** ‖M‖₂ ≤ √(‖M‖₁ ‖M‖∞) for a nonnegative column-major 3×3: the stretch it allows. */
function normOf(m: ArrayLike<number>): number {
  let rows = 0;
  let columns = 0;
  for (let i = 0; i < 3; i++) {
    rows = Math.max(rows, m[i]! + m[3 + i]! + m[6 + i]!);
    columns = Math.max(columns, m[i * 3]! + m[i * 3 + 1]! + m[i * 3 + 2]!);
  }
  return Math.sqrt(rows * columns);
}

/**
 * The box (`center`, `axes`) carried through `route`, then the affine
 * `after`, with each scaled curvilinear map's scale anywhere in its span (`spans`).
 * Undefined when any step has no declared bound, a curvilinear map is crossed
 * backwards, geographic coordinates don't line up between steps, or a value
 * is not finite.
 */
export function composeBox(
  route: Route,
  after: ArrayLike<number> | undefined,
  spans: ReadonlyMap<CurvilinearMap, ScaleSpan>,
  center: ArrayLike<number>,
  axes: ArrayLike<number>,
): ComposedBox | undefined {
  let c = Float64Array.of(center[0]!, center[1]!, center[2]!);
  let a = Float64Array.from(axes);
  let sigma = 1;
  let geographic = false;
  const affine = (m: ArrayLike<number>) => {
    transformPoint(c, m as Mat4, c);
    for (let k = 0; k < 3; k++) {
      const x = a[k * 3]!;
      const y = a[k * 3 + 1]!;
      const z = a[k * 3 + 2]!;
      a[k * 3] = m[0]! * x + m[4]! * y + m[8]! * z;
      a[k * 3 + 1] = m[1]! * x + m[5]! * y + m[9]! * z;
      a[k * 3 + 2] = m[2]! * x + m[6]! * y + m[10]! * z;
    }
    sigma *= stretchOf(m);
  };
  for (const step of route.steps) {
    if (step.kind === "rigid") {
      if (geographic) {
        return undefined;
      }
      affine(step.matrix);
      continue;
    }
    const spec = step.curvilinearMap.curvilinear;
    if (step.inverse || spec?.bound === undefined) {
      return undefined;
    }
    if (geographic !== (spec.geographic?.in === true)) {
      return undefined;
    }
    const span = spans.get(step.curvilinearMap);
    const scaled = step.curvilinearMap.scale !== undefined;
    if (scaled && (span === undefined || geographic || spec.geographic?.out)) {
      return undefined;
    }
    geographic = spec.geographic?.out === true;
    const ranges: Record<string, readonly [number, number]> = {};
    for (const [name, value] of Object.entries(spec.params)) {
      ranges[name] = [value, value];
    }
    // F(x) - F(c) = ∫₀¹ J(c + s (x - c)) ds (x - c), and the point at s is
    // in the region scaled by s about its center, whose bound is no larger
    // than the full region's (it grows with the region): the integral is at
    // most the upper Riemann sum of the bound over scaled regions, which
    // takes the part of J that grows with the distance from the center (a
    // normal's tilt) at its mean, not its peak.
    let basisIn: ArrayLike<number> = a;
    let basisOut: ArrayLike<number> = a;
    let m = new Float64Array(9);
    const scaledAxes = new Float64Array(9);
    for (let i = 1; i <= PANELS; i++) {
      for (let k = 0; k < 9; k++) {
        scaledAxes[k] = (a[k]! * i) / PANELS;
      }
      const part = spec.bound({ center: c, axes: scaledAxes }, ranges);
      basisIn = part.basisIn;
      basisOut = part.basisOut;
      for (let k = 0; k < 9; k++) {
        m[k] = m[k]! + part.absJ[k]! / PANELS;
      }
    }
    if (!m.every(Number.isFinite)) {
      return undefined;
    }
    // The curvilinear map at scale s is p + s (F(p) - p), F at scale 1: its Jacobian
    // (1 - s) I + s J, in the bound's bases (1 - s) Q + s J' with
    // Q = R_outᵀ R_in. An entry's magnitude is convex in s: the ends hold.
    // The center moves along its displacement with s.
    const next = new Float64Array(3);
    step.curvilinearMap.forward([c[0]!, c[1]!, c[2]!], next);
    let drift: number[] | undefined;
    let span2: ScaleSpan | undefined;
    if (scaled) {
      span2 = span!;
      const q = new Float64Array(9);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          q[j * 3 + i] =
            basisOut[i * 3]! * basisIn[j * 3]! +
            basisOut[i * 3 + 1]! * basisIn[j * 3 + 1]! +
            basisOut[i * 3 + 2]! * basisIn[j * 3 + 2]!;
        }
      }
      const scaledM = new Float64Array(9);
      for (const s of [span2.low, span2.high]) {
        for (let k = 0; k < 9; k++) {
          scaledM[k] = Math.max(
            scaledM[k]!,
            Math.abs(1 - s) * Math.abs(q[k]!) + Math.abs(s) * m[k]!,
          );
        }
      }
      m = scaledM;
      const mid = (span2.low + span2.high) / 2;
      const move = [next[0]! - c[0]!, next[1]! - c[1]!, next[2]! - c[2]!];
      drift = [0, 1, 2].map(
        (i) =>
          ((span2!.high - span2!.low) / 2) *
          Math.abs(
            basisOut[i * 3]! * move[0]! +
              basisOut[i * 3 + 1]! * move[1]! +
              basisOut[i * 3 + 2]! * move[2]!,
          ),
      );
      for (let i = 0; i < 3; i++) {
        next[i] = c[i]! + mid * move[i]!;
      }
    }
    // The region's half extent along each of the input basis's axes.
    const w = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        w[j]! += Math.abs(
          basisIn[j * 3]! * a[k * 3]! +
            basisIn[j * 3 + 1]! * a[k * 3 + 1]! +
            basisIn[j * 3 + 2]! * a[k * 3 + 2]!,
        );
      }
    }
    const out = new Float64Array(9);
    for (let i = 0; i < 3; i++) {
      const e =
        m[i]! * w[0]! +
        m[3 + i]! * w[1]! +
        m[6 + i]! * w[2]! +
        (drift ? drift[i]! : 0);
      for (let r = 0; r < 3; r++) {
        out[i * 3 + r] = e * basisOut[i * 3 + r]!;
      }
    }
    sigma *= normOf(m);
    c = next;
    a = out;
  }
  if (geographic) {
    return undefined;
  }
  if (after) {
    affine(after);
  }
  return Number.isFinite(sigma + c[0]! + c[1]! + c[2]!) &&
    a.every(Number.isFinite)
    ? { center: c, axes: a, sigmaMax: sigma }
    : undefined;
}
