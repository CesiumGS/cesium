// First-order Taylor-model bounds of a route over a box (plan 2026-11-12,
// task 5). Natural interval evaluation of a route's value is useless at
// Earth scale (the positions are 6.4e6 m and the box 1e2 to 1e5 m: the
// dependency between a point's own occurrences swells the result ×67 to
// ×2400), so the value is not evaluated over the box. Instead, for a box
// with centre c, F(c + δ) lies in F(c) + J(c)·δ + R, and only the remainder
// R, which is second order, is bounded by an interval evaluation, of the
// Hessian program (or, past a kink, of J) over the box: whatever
// the swell, it multiplies r², not r.
//
// Per edge the model is carried as a point c, a matrix L (the image of the
// box's half axes) and a per-axis remainder ρ, so the image of the box is
// inside c + L·[−1, 1]³ + [−ρ, ρ]:
//   - an affine edge: c' = A c + t, L' = A L, ρ' = |A| ρ;
//   - a smooth edge f, on the input's axis-aligned hull (half-extent
//     s = |L|·1 + ρ about c), with parameters at the value they have or over
//     the range given: L' = J(c) L, ρ' = |J(c)| ρ + ½ Σ |H|ₘₐₓ s s, and
//     the change of the function with a ranged parameter p, ∂f/∂p over the
//     hull and the range, times the range's half-width.
//   A function with a kink (min, max, abs, clamp, select: J jumps or may)
//   has the mean-value form instead of the Hessian's: J's interval over the
//   hull minus J(c), times s. It holds for every Lipschitz map and is twice
//   the Hessian's for a smooth one.
// A route with a step down (a smooth edge undone), a smooth edge with no IR
// or a function with a step (floor, fract) is refused: the caller samples.
//
// The same walk bounds ‖J‖, the oscillation of J and ‖D²F‖ over the box,
// for the chord error of a straight edge of the box under the route
// (`chordErrorBound`): M₂L²/8 for a function whose J is continuous,
// W·L/4 (W, the oscillation of J) for one that is only Lipschitz.
import {
  evaluateInterval,
  type Interval,
  type ParamRange,
} from "./interval.ts";
import type { TransformNode } from "./graph.ts";
import type { IrProgram } from "./ir.ts";
import type { Route } from "./route.ts";
import { adJacobian, stepIr } from "./stepIr.ts";

/** A box of the route's input: its centre and either half axes (column-major 3×3, an oriented box) or a half-extent (axis-aligned). */
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
   * Ranges that parameters of a smooth node may take (by name; a parameter
   * not named is taken at the value it has): a slider's `range`, so the
   * bound holds for every value in it.
   */
  readonly params?: (
    node: TransformNode,
  ) => Readonly<Record<string, ParamRange>> | undefined;
}

export interface TaylorBounds {
  readonly ok: true;
  /** F(c): the image of the box's centre. */
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
  /** Every smooth edge's function has a continuous J (no kink): `hessianNorm` bounds the chord error as proven. */
  readonly continuous: boolean;
}

export interface TaylorRefusal {
  readonly ok: false;
  readonly reason: string;
}

const norm = (m: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < m.length; i++) {
    s += m[i]! * m[i]!;
  }
  return Math.sqrt(s);
};

const reach = (i: Interval): number => Math.max(Math.abs(i.lo), Math.abs(i.hi));

/**
 * The reach (largest |value|) and deviation (largest |value − centre|) of
 * each output of `program` over `hull`, taken over `cells` per axis (a cell's
 * interval is tighter than the hull's: the swell of an interval grows
 * faster than the cell's size). A non-finite interval makes Infinity.
 */
function intervalReaches(
  program: IrProgram,
  hull: { min: number[]; max: number[] },
  ranges: Readonly<Record<string, ParamRange>>,
  cells: number,
  centre?: readonly number[],
): { reach: number[]; deviation: number[] } {
  const n = program.outputs.length;
  const reachOut = new Array<number>(n).fill(0);
  const deviationOut = new Array<number>(n).fill(0);
  const size = [0, 1, 2].map((a) => (hull.max[a]! - hull.min[a]!) / cells);
  const cell = { min: [0, 0, 0], max: [0, 0, 0] };
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      for (let k = 0; k < cells; k++) {
        const at = [i, j, k];
        for (let a = 0; a < 3; a++) {
          cell.min[a] = hull.min[a]! + at[a]! * size[a]!;
          cell.max[a] = cell.min[a]! + size[a]!;
        }
        evaluateInterval(program, cell, ranges).forEach((value, o) => {
          const r = Number.isFinite(value.lo + value.hi)
            ? reach(value)
            : Infinity;
          reachOut[o] = Math.max(reachOut[o]!, r);
          const d =
            centre && Number.isFinite(value.lo + value.hi)
              ? Math.max(
                  Math.abs(value.lo - centre[o]!),
                  Math.abs(value.hi - centre[o]!),
                )
              : r;
          deviationOut[o] = Math.max(deviationOut[o]!, d);
        });
      }
    }
  }
  return { reach: reachOut, deviation: deviationOut };
}

/** `A·B` for column-major 3×3s. */
function multiply(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(9);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      out[c * 3 + r] =
        a[r]! * b[c * 3]! +
        a[3 + r]! * b[c * 3 + 1]! +
        a[6 + r]! * b[c * 3 + 2]!;
    }
  }
  return out;
}

/** The bound of F over `box` as a first-order Taylor model, or why it can't be made. */
export function taylorBounds(
  route: Route,
  box: BoundsBox,
  options: TaylorOptions = {},
): TaylorBounds | TaylorRefusal {
  const c = box.center;
  let linear: Float64Array;
  if (box.halfAxes) {
    linear = Float64Array.from(box.halfAxes);
  } else if (box.halfExtent) {
    linear = Float64Array.of(
      box.halfExtent[0]!,
      0,
      0,
      0,
      box.halfExtent[1]!,
      0,
      0,
      0,
      box.halfExtent[2]!,
    );
  } else {
    throw new RangeError("taylorBounds: a box has halfAxes or halfExtent");
  }
  const rho = new Float64Array(3);
  let jacobianNorm = 1;
  let oscillation = 0;
  let hessianNorm = 0;
  let continuous = true;
  let refusal: string | undefined;

  const center = route.walk(c, (edge) => {
    if (refusal !== undefined) {
      return;
    }
    if (edge.kind === "affine") {
      const a = Float64Array.from(edge.jacobian);
      linear = multiply(a, linear);
      const absRho = Float64Array.of(
        Math.abs(a[0]!) * rho[0]! +
          Math.abs(a[3]!) * rho[1]! +
          Math.abs(a[6]!) * rho[2]!,
        Math.abs(a[1]!) * rho[0]! +
          Math.abs(a[4]!) * rho[1]! +
          Math.abs(a[7]!) * rho[2]!,
        Math.abs(a[2]!) * rho[0]! +
          Math.abs(a[5]!) * rho[1]! +
          Math.abs(a[8]!) * rho[2]!,
      );
      rho.set(absRho);
      const f = norm(a);
      jacobianNorm *= f;
      oscillation *= f;
      hessianNorm *= f;
      return;
    }
    const name = edge.node.name;
    if (edge.down) {
      refusal = `"${name}" is undone by the route: a Taylor model needs the function's own derivatives`;
      return;
    }
    const spec = edge.spec!;
    const ir = stepIr(spec);
    if (!ir) {
      refusal = `"${name}" has no restricted-JS source for the IR`;
      return;
    }
    if (ir.discontinuous) {
      refusal = `"${name}" has a step (floor, ceil or fract): no derivative bound holds`;
      return;
    }
    const held = edge.params!;
    const ranges: Record<string, ParamRange> = { ...held };
    const given = options.params?.(edge.node);
    const widths: Array<[string, number]> = [];
    for (const [p, range] of Object.entries(given ?? {})) {
      if (!(p in held)) {
        throw new Error(`taylorBounds: "${name}" has no parameter "${p}"`);
      }
      const [lo, hi] =
        typeof range === "number"
          ? [range, range]
          : Array.isArray(range)
            ? [range[0]!, range[1]!]
            : [(range as Interval).lo, (range as Interval).hi];
      ranges[p] = [lo, hi];
      const half = Math.max(Math.abs(hi - held[p]!), Math.abs(held[p]! - lo));
      if (half > 0) {
        widths.push([p, half]);
      }
    }
    const input = edge.input;
    const s = [0, 1, 2].map(
      (j) =>
        Math.abs(linear[j]!) +
        Math.abs(linear[3 + j]!) +
        Math.abs(linear[6 + j]!) +
        rho[j]!,
    );
    const hull = {
      min: [0, 1, 2].map((j) => input[j]! - s[j]!),
      max: [0, 1, 2].map((j) => input[j]! + s[j]!),
    };
    const j = adJacobian(spec, input, held, new Float64Array(9))!;
    const centreJ = Array.from(
      { length: 9 },
      (_, k) => j[3 * (k % 3) + Math.floor(k / 3)]!,
    );
    const cells = options.cells ?? 1;
    const jOver = intervalReaches(ir.jacobian, hull, ranges, cells, centreJ);
    const hOver = intervalReaches(ir.hessian(), hull, ranges, cells);
    if (
      jOver.reach.some((x) => !Number.isFinite(x)) ||
      hOver.reach.some((x) => !Number.isFinite(x))
    ) {
      refusal = `"${name}": its derivatives are not bounded over the box (a division or root through zero)`;
      return;
    }
    // J's reach, and its distance from J(c), per entry (row-major in the program).
    const jReach = jOver.reach;
    const jWidth = jOver.deviation;
    const hMax = hOver.reach;
    const step = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      let second = 0;
      if (ir.kinked) {
        for (let k = 0; k < 3; k++) {
          second += jWidth[3 * i + k]! * s[k]!;
        }
      } else {
        for (let a = 0; a < 3; a++) {
          for (let b = 0; b < 3; b++) {
            second += 0.5 * hMax[9 * i + 3 * a + b]! * s[a]! * s[b]!;
          }
        }
      }
      step[i] = second;
    }
    if (widths.length > 0) {
      const names = widths.map(([p]) => p);
      const dp = intervalReaches(
        ir.parameters(names),
        hull,
        ranges,
        cells,
      ).reach;
      widths.forEach(([, half], n) => {
        for (let i = 0; i < 3; i++) {
          step[i] = step[i]! + half * dp[3 * n + i]!;
        }
      });
    }
    const nextRho = Float64Array.of(
      Math.abs(j[0]!) * rho[0]! +
        Math.abs(j[3]!) * rho[1]! +
        Math.abs(j[6]!) * rho[2]! +
        step[0]!,
      Math.abs(j[1]!) * rho[0]! +
        Math.abs(j[4]!) * rho[1]! +
        Math.abs(j[7]!) * rho[2]! +
        step[1]!,
      Math.abs(j[2]!) * rho[0]! +
        Math.abs(j[5]!) * rho[1]! +
        Math.abs(j[8]!) * rho[2]! +
        step[2]!,
    );
    rho.set(nextRho);
    linear = multiply(j, linear);
    const jf = norm(jReach);
    const wf = norm(jWidth);
    const mf = norm(hMax);
    // D²(f∘g) = f''(g')² + f'g''; osc(J_f∘g · J_g) ≤ W_f·‖J_g‖ + ‖J_f‖·W_g.
    hessianNorm = mf * jacobianNorm * jacobianNorm + jf * hessianNorm;
    oscillation = wf * jacobianNorm + jf * oscillation;
    jacobianNorm *= jf;
    continuous &&= !ir.kinked;
  });
  if (refusal !== undefined) {
    return { ok: false, reason: refusal };
  }
  let reachCorner = 0;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        reachCorner = Math.max(
          reachCorner,
          Math.hypot(
            sx * linear[0]! + sy * linear[3]! + sz * linear[6]!,
            sx * linear[1]! + sy * linear[4]! + sz * linear[7]!,
            sx * linear[2]! + sy * linear[5]! + sz * linear[8]!,
          ),
        );
      }
    }
  }
  const halfExtent = Float64Array.of(
    Math.abs(linear[0]!) +
      Math.abs(linear[3]!) +
      Math.abs(linear[6]!) +
      rho[0]!,
    Math.abs(linear[1]!) +
      Math.abs(linear[4]!) +
      Math.abs(linear[7]!) +
      rho[1]!,
    Math.abs(linear[2]!) +
      Math.abs(linear[5]!) +
      Math.abs(linear[8]!) +
      rho[2]!,
  );
  return {
    ok: true,
    center,
    linear,
    remainder: rho,
    halfExtent,
    radius: reachCorner + Math.hypot(rho[0]!, rho[1]!, rho[2]!),
    jacobianNorm,
    oscillation,
    hessianNorm,
    continuous,
  };
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
