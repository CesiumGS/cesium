// Drawing a closed-form warp straight in the vertex stage, with no fit
// (strategy B of the GPU-warp study; shaders/warpFitDirect.slang is the GPU
// side). The warp's shape factors into what depends on where a vertex is, which
// is fixed for a draw, and what the application animates, which is a few
// floats:
//
// - a height lift (vertical exaggeration, a constant lift, a datum shift) is
//   `(k - 1)(h - base) + offset` along the ellipsoid's normal n at the
//   vertex: h and n are functions of the vertex alone;
// - a bump and a scale about a point need the vertex's position relative to
//   the point, `(origin - c) + m`, which the vertex stage forms from the
//   draw's origin and the point (a uniform) with no cancellation.
//
// So a draw carries, once, the float32 cubic polynomials in its local
// coordinates of h and of n (fitted from the float64 foot at the 125
// Chebyshev-Lobatto points, the same solve as the lattice fit: a Taylor
// expansion in all but name, better conditioned over the tile), and the
// displacement is evaluated per vertex from them and the current parameters:
// exact to the polynomials' truncation (millimeters at a 5 km tile, see
// `bakeHeightField`'s error), with no refit when a parameter moves, whatever
// the parameter's change. A parameter that changes the shape in a way that
// doesn't factor (a projection's central meridian) is not this: see the
// study's strategy A and C.
import { PLACEMENT_MONOMIALS, PLACEMENT_TERMS } from "./placement.ts";
import { fitSolveOperator } from "./warpFit.ts";
import {
  ellipsoidFoot,
  splitDf64,
  type GpuWarpForm,
  type Radii,
} from "./warpForms.ts";

/** float4 rows a baked draw takes in the shader's `draws` buffer. */
export const DIRECT_DRAW_ROWS = 29;

const FIT_POINTS = 125;
const NODES = [-1, -Math.SQRT1_2, 0, Math.SQRT1_2, 1];

/** Row layout of a baked draw: its offsets in rows. */
export const DIRECT_ROWS = {
  /** center xyz (model space) and 1 / scale. */
  head: 0,
  /** The model origin's position in the form's frame, hi then lo. */
  originHi: 1,
  originLo: 2,
  /** 20 coefficients of the height h (5 rows), then its constant term's lo part in `.x` and the normal's constant term's lo parts in `.yzw`. */
  height: 3,
  heightLo: 8,
  /** 20 rows of the normal's coefficients (xyz). */
  normal: 9,
} as const;

/** What a bake measured (float64 against its own samples). */
export interface BakeReport {
  /** The worst error of the h polynomial at 9³ check points, m. */
  readonly heightError: number;
  /** The worst error of the normal polynomial there, as an angle in radians. */
  readonly normalError: number;
}

/**
 * Bakes a draw's height and normal polynomials into `out` (`DIRECT_DRAW_ROWS`
 * rows from float index `at`): the draw's local frame is `origin + m`, the
 * polynomial's cube is `center ± scale` in `m`. `check` also measures their
 * error (9³ more feet), for tests and the spike.
 */
export function bakeHeightField(
  radii: Radii,
  origin: ArrayLike<number>,
  center: ArrayLike<number>,
  scale: number,
  out: Float32Array = new Float32Array(DIRECT_DRAW_ROWS * 4),
  at = 0,
  check = false,
): BakeReport | undefined {
  const solve = fitSolveOperator();
  const samples = new Float64Array(FIT_POINTS * 4);
  const p = new Float64Array(3);
  const n = new Float64Array(3);
  const sample = (v: readonly number[], into: Float64Array, offset: number) => {
    for (let a = 0; a < 3; a++) {
      p[a] = origin[a]! + center[a]! + scale * v[a]!;
    }
    into[offset] = ellipsoidFoot(radii, p, n);
    into[offset + 1] = n[0]!;
    into[offset + 2] = n[1]!;
    into[offset + 3] = n[2]!;
  };
  let s = 0;
  for (let k = 0; k < 5; k++) {
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 5; i++) {
        sample([NODES[i]!, NODES[j]!, NODES[k]!], samples, 4 * s++);
      }
    }
  }
  const coefficients = new Float64Array(PLACEMENT_TERMS * 4);
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let q = 0; q < FIT_POINTS; q++) {
        sum += solve[k * FIT_POINTS + q]! * samples[4 * q + c]!;
      }
      coefficients[4 * k + c] = sum;
    }
  }
  for (let a = 0; a < 3; a++) {
    out[at + a] = center[a]!;
    const [hi, lo] = splitDf64(origin[a]!);
    out[at + 4 + a] = hi;
    out[at + 8 + a] = lo;
  }
  out[at + 3] = 1 / scale;
  const [h0hi, h0lo] = splitDf64(coefficients[0]!);
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    out[at + DIRECT_ROWS.height * 4 + k] =
      k === 0 ? h0hi : coefficients[4 * k]!;
    for (let c = 0; c < 3; c++) {
      out[at + (DIRECT_ROWS.normal + k) * 4 + c] = coefficients[4 * k + 1 + c]!;
    }
  }
  out[at + DIRECT_ROWS.heightLo * 4] = h0lo;
  for (let c = 0; c < 3; c++) {
    const [hi, lo] = splitDf64(coefficients[1 + c]!);
    out[at + DIRECT_ROWS.normal * 4 + c] = hi;
    out[at + DIRECT_ROWS.heightLo * 4 + 1 + c] = lo;
  }
  if (!check) {
    return undefined;
  }
  let heightError = 0;
  let normalError = 0;
  const truth = new Float64Array(4);
  const v = [0, 0, 0];
  for (let k = 0; k < 9; k++) {
    for (let j = 0; j < 9; j++) {
      for (let i = 0; i < 9; i++) {
        v[0] = -1 + i / 4;
        v[1] = -1 + j / 4;
        v[2] = -1 + k / 4;
        sample(v, truth, 0);
        const got = heightAndNormal(out, at, v);
        heightError = Math.max(heightError, Math.abs(got[0]! - truth[0]!));
        const dot =
          (got[1]! * truth[1]! + got[2]! * truth[2]! + got[3]! * truth[3]!) /
          Math.hypot(got[1]!, got[2]!, got[3]!);
        normalError = Math.max(normalError, Math.acos(Math.min(1, dot)));
      }
    }
  }
  return { heightError, normalError };
}

/** (h, n) at local coordinates `u` (the cube's [-1, 1]³) from baked float32 rows, in float64: the shader's twin. */
function heightAndNormal(
  rows: Float32Array,
  at: number,
  u: ArrayLike<number>,
): Float64Array {
  const out = new Float64Array(4);
  let h = 0;
  for (let k = 0; k < PLACEMENT_TERMS; k++) {
    const [a, b, c] = PLACEMENT_MONOMIALS[k]!;
    const m = u[0]! ** a * u[1]! ** b * u[2]! ** c;
    h += rows[at + DIRECT_ROWS.height * 4 + k]! * m;
    for (let q = 0; q < 3; q++) {
      out[1 + q] =
        out[1 + q]! + rows[at + (DIRECT_ROWS.normal + k) * 4 + q]! * m;
    }
  }
  out[0] = h + rows[at + DIRECT_ROWS.heightLo * 4]!;
  for (let q = 0; q < 3; q++) {
    out[1 + q] = out[1 + q]! + rows[at + DIRECT_ROWS.heightLo * 4 + 1 + q]!;
  }
  const length = Math.hypot(out[1]!, out[2]!, out[3]!);
  out[1] = out[1]! / length;
  out[2] = out[2]! / length;
  out[3] = out[3]! / length;
  return out;
}

/**
 * The displacement of `form` at model point `m` of a baked draw, in float64
 * from the float32 rows: what the vertex stage computes
 * (`directDisplacement` in warpFitDirect.slang). Forms: the height lift, the
 * bump, the scale about a point.
 */
export function directDisplacement(
  rows: Float32Array,
  at: number,
  form: GpuWarpForm,
  m: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  const invScale = rows[at + 3]!;
  const world = (a: number) => rows[at + 4 + a]! + rows[at + 8 + a]! + m[a]!;
  if (form.kind === "scaleAbout") {
    for (let a = 0; a < 3; a++) {
      out[a] = (form.factors[a]! - 1) * (world(a) - form.center[a]!);
    }
    return out;
  }
  const u = [0, 1, 2].map((a) => (m[a]! - rows[at + a]!) * invScale);
  const hn = heightAndNormal(rows, at, u);
  let lift: number;
  if (form.kind === "heightLift") {
    lift =
      (form.factor - 1) * (hn[0]! - (form.baseHeight ?? 0)) +
      (form.offset ?? 0);
  } else if (form.kind === "heightBump") {
    let r2 = 0;
    for (let a = 0; a < 3; a++) {
      r2 += (world(a) - form.center[a]!) ** 2;
    }
    lift = form.amplitude * Math.exp(-r2 / (2 * form.sigma * form.sigma));
  } else {
    throw new RangeError(
      `directDisplacement: ${form.kind} is not a direct form`,
    );
  }
  out[0] = lift * hn[1]!;
  out[1] = lift * hn[2]!;
  out[2] = lift * hn[3]!;
  return out;
}

/** A closed interval of a parameter's values. */
export type Range = readonly [number, number];

/**
 * The most a height lift moves a vertex whose height is in `heights` while
 * its parameters stay in their ranges (the exact maximum: the lift is
 * piecewise linear in each, so a corner of the box). The draw's drawn bounds
 * hold for the whole animation with this one number.
 */
export function liftBoundOver(
  heights: Range,
  parameters: {
    readonly factor: Range;
    readonly baseHeight?: Range;
    readonly offset?: Range;
  },
): number {
  const bases = parameters.baseHeight ?? [0, 0];
  const offsets = parameters.offset ?? [0, 0];
  let worst = 0;
  for (const h of heights) {
    for (const k of parameters.factor) {
      for (const b of bases) {
        for (const o of offsets) {
          worst = Math.max(worst, Math.abs((k - 1) * (h - b) + o));
        }
      }
    }
  }
  return worst;
}

/** The most a scale about a point moves a vertex within `reach` of `tileCenter` (world), the point anywhere in the ball `region` and each factor in `factors`. */
export function scaleAboutBoundOver(
  tileCenter: ArrayLike<number>,
  reach: number,
  region: { readonly center: ArrayLike<number>; readonly radius: number },
  factors: Range,
): number {
  const distance = Math.hypot(
    tileCenter[0]! - region.center[0]!,
    tileCenter[1]! - region.center[1]!,
    tileCenter[2]! - region.center[2]!,
  );
  const stretch = Math.max(Math.abs(factors[0] - 1), Math.abs(factors[1] - 1));
  return stretch * (distance + region.radius + reach);
}
