// First-order Taylor-model bounds of a route over a box (plan 2026-11-12,
// task 5). Natural interval evaluation of a route's value is useless at
// Earth scale (the positions are 6.4e6 m and the box 1e2 to 1e5 m: the
// dependency between a point's own occurrences swells the result ×67 to
// ×2400), so the value is not evaluated over the box. Instead, for a box
// with center c, F(c + δ) lies in F(c) + J(c)·δ + R, and only the remainder
// R, which is second order, is bounded by an interval evaluation, of the
// Hessian program (or, past a kink, of J) over the box: whatever
// the swell, it multiplies r², not r.
//
// Per edge the model is carried as a point c, a matrix L (the image of the
// box's half axes) and a per-axis remainder ρ, so the image of the box is
// inside c + L·[−1, 1]³ + [−ρ, ρ]:
//   - an affine edge: c' = A c + t, L' = A L, ρ' = |A| ρ;
//   - a curvilinear edge f, on the input's axis-aligned hull (half-extent
//     s = |L|·1 + ρ about c), with parameters at the value they have or over
//     the range given: L' = J(c) L, ρ' = |J(c)| ρ + ½ Σ |H|ₘₐₓ s s, and
//     the change of the function with a ranged parameter p, ∂f/∂p over the
//     hull and the range, times the range's half-width.
//   A function with a kink (min, max, abs, clamp, select: J jumps or may)
//   has the mean-value form instead of the Hessian's: J's interval over the
//   hull minus J(c), times s. It holds for every Lipschitz map and is twice
//   the Hessian's for a curvilinear one.
// A route with a step down (a curvilinear edge undone), a curvilinear edge with no IR
// or a function with a step (floor, fract) is refused: the caller samples.
//
// The same walk bounds ‖J‖, the oscillation of J and ‖D²F‖ over the box,
// for the chord error of a straight edge of the box under the route
// (`chordErrorBound`): M₂L²/8 for a function whose J is continuous,
// W·L/4 (W, the oscillation of J) for one that is only Lipschitz.
import {
  mapIr,
  taylorChain,
  type MapIr,
  type TaylorLink,
} from "../ir/taylor.ts";
import type { Program } from "../ir/types.ts";
import type { TransformNode } from "./graph.ts";
import type { ParamRange } from "./interval.ts";
import type { Route } from "./route.ts";
import { stepIr } from "./stepIr.ts";

export interface BoundsBox {
  readonly center: ArrayLike<number>;
  readonly halfAxes?: ArrayLike<number>;
  readonly halfExtent?: ArrayLike<number>;
}

export interface TaylorOptions {
  /**
   * Cells per axis the box's hull is cut into for the derivatives' interval
   * evaluation (default 1; the cost is cells³ evaluations): a cell's
   * intervals swell far less than the hull's.
   */
  readonly cells?: number;
  /**
   * Ranges that parameters of a curvilinear node may take (by name; a parameter
   * not named is taken at the value it has): a slider's `range`, so the
   * bound holds for every value in it.
   */
  readonly params?: (
    node: TransformNode,
  ) => Readonly<Record<string, ParamRange>> | undefined;
}

export interface TaylorBounds {
  readonly ok: true;
  /** F(c): the image of the box's center. */
  readonly center: Float64Array;
  /** J(c)·(half axes), column-major: the image of each half axis. */
  readonly linear: Float64Array;
  /** The remainder's bound per axis: the image is within `center + linear·[−1, 1]³ ± remainder`. */
  readonly remainder: Float64Array;
  /** The half-extent of the image's axis-aligned hull about `center`. */
  readonly halfExtent: Float64Array;
  /** A sphere about `center` that holds the image. */
  readonly radius: number;
  /** A bound on ‖J‖ (Frobenius) over the box. */
  readonly jacobianNorm: number;
  /** A bound on how much J varies over the box: ‖J(x) − J(y)‖ ≤ this. */
  readonly oscillation: number;
  /** A bound on the second derivative (‖D²F[u, u]‖ ≤ this·|u|²), from the Hessian. */
  readonly hessianNorm: number;
  /** Every curvilinear edge's function has a continuous J (no kink): `hessianNorm` bounds the chord error as proven. */
  readonly continuous: boolean;
}

export interface TaylorRefusal {
  readonly ok: false;
  readonly reason: string;
}

/** Each step's map on Cesium IR (`mapIr`), made once per program. */
const maps = new WeakMap<Program, MapIr>();

function mapOf(value: Program): MapIr {
  let found = maps.get(value);
  if (!found) {
    found = mapIr(value);
    maps.set(value, found);
  }
  return found;
}

/**
 * The bound of F over `box` as a first-order Taylor model, or why it can't
 * be made: the route's edges as a chain of links, each curvilinear step's
 * map on Cesium IR, bounded by Cesium IR's Taylor chain (`taylorChain`).
 */
export function taylorBounds(
  route: Route,
  box: BoundsBox,
  options: TaylorOptions = {},
): TaylorBounds | TaylorRefusal {
  if (!box.halfAxes && !box.halfExtent) {
    throw new RangeError("taylorBounds: a box has halfAxes or halfExtent");
  }
  const links: TaylorLink[] = [];
  let refused = false;
  const center = route.walk(box.center, (edge) => {
    if (refused) {
      return;
    }
    if (edge.kind === "affine") {
      links.push({
        kind: "affine",
        jacobian: Float64Array.from(edge.jacobian),
      });
      return;
    }
    const name = edge.node.name;
    const refuse = (reason: string) => {
      links.push({ kind: "refuse", reason });
      refused = true;
    };
    if (edge.down) {
      refuse(
        `"${name}" is undone by the route: a Taylor model needs the function's own derivatives`,
      );
      return;
    }
    const ir = stepIr(edge.spec!);
    if (!ir) {
      refuse(`"${name}" has no restricted-JS source for the IR`);
      return;
    }
    const given = options.params?.(edge.node);
    links.push({
      kind: "map",
      name,
      map: mapOf(ir.value),
      input: Float64Array.from(edge.input),
      params: { ...edge.params! },
      ...(given && { ranges: given }),
    });
  });
  const chain = taylorChain(box, links, {
    ...(options.cells !== undefined && { cells: options.cells }),
  });
  return chain.ok ? { ...chain, center } : chain;
}

/**
 * How far a straight edge of length `length` (in the route's input units)
 * inside the box is from the straight edge between the images of its ends,
 * at most, in the route's output units: M₂·L²/8 where J is continuous
 * (`continuous`) or `assumeSmooth` says to take it so, else W·L/4, which
 * holds for every Lipschitz map. Error falls as 1/n² under n-fold subdivision
 * in the first form, 1/n in the second.
 */
export function chordErrorBound(
  bounds: TaylorBounds,
  length: number,
  assumeSmooth = false,
): number {
  return bounds.continuous || assumeSmooth
    ? (bounds.hessianNorm * length * length) / 8
    : (bounds.oscillation * length) / 4;
}
