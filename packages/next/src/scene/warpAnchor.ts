// Content warped at its anchor (plan §13.26, increment 4, `warpAt:
// "anchor"`): what must keep its shape (a vehicle, a symbol, a billboard)
// moves rigidly by the route evaluated at one point, its origin, in float64.
//
// What is kept of the route there: its translation, and its rotation, the
// orthogonal factor R of the polar decomposition of the warp's Jacobian
// (relative to the route's rigid part, which already places the anchor).
// Its scale and shear are dropped: a vertical exaggeration leaves a car as
// tall as it was (R = I), and a reprojection turns it with the grid's
// convergence but doesn't scale it. With the warp at identity the result is
// the identity, so a route with no warp draws as it did.
import type { Route } from "../camera/route.ts";
import { invertAffine, mat4 } from "../math/mat4.ts";
import { PLACEMENT_TERMS } from "./placement.ts";
import { routeMap } from "./warpBounds.ts";
import type { CubicLattice } from "./warpTerms.ts";

/** A 3×3, column-major. */
type Mat3 = Float64Array;

/**
 * Where a route's warp is evaluated for a draw (or an item's draws):
 *
 * - `"vertex"` (the default): at every vertex, by a fit of the route over the
 *   draw's tile. Content stretches with the warp, which is what a
 *   reprojection means.
 * - `"anchor"`: once, at the draw's origin, in float64. The draw moves
 *   rigidly by the route there (its translation, and the rotation of its
 *   Jacobian, with no scale or shear), keeping its shape: a vehicle, a
 *   symbol, a billboard.
 *
 * Billboards and instanced draws are always `"anchor"` (a billboard's shape is
 * on screen, and an instance's matrix comes after the mesh's vertices).
 */
export type WarpAt = "vertex" | "anchor";

const IDENTITY: readonly number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** What a route does at one point, kept rigid (see the file's comment). */
export interface AnchorCorrection {
  /** `A⁻¹·route(f₀) − f₀`: where the origin goes, in the anchor's coordinates (`A` is the route's rigid part). */
  readonly shift: Float64Array;
  /** The rotation about the origin, in the anchor's coordinates. */
  readonly rotation: Mat3;
}

/** The inverse of a column-major 3×3, or undefined when it is singular. */
export function invert3(m: ArrayLike<number>): Mat3 | undefined {
  const [a, b, c, d, e, f, g, h, i] = Array.from(m);
  const co0 = e! * i! - f! * h!;
  const co1 = f! * g! - d! * i!;
  const co2 = d! * h! - e! * g!;
  const det = a! * co0 + b! * co1 + c! * co2;
  if (!(Math.abs(det) > 0) || !Number.isFinite(det)) {
    return undefined;
  }
  const s = 1 / det;
  // Column-major inverse: out[col][row] = cofactor(row, col) / det.
  return Float64Array.of(
    co0 * s,
    (c! * h! - b! * i!) * s,
    (b! * f! - c! * e!) * s,
    co1 * s,
    (a! * i! - c! * g!) * s,
    (c! * d! - a! * f!) * s,
    co2 * s,
    (b! * g! - a! * h!) * s,
    (a! * e! - b! * d!) * s,
  );
}

/** `a · b` for column-major 3×3s. */
export function multiply3(a: ArrayLike<number>, b: ArrayLike<number>): Mat3 {
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

/** The linear part of a column-major 4×4, as a 3×3. */
export function linearPart(m: ArrayLike<number>): Mat3 {
  return Float64Array.of(
    m[0]!,
    m[1]!,
    m[2]!,
    m[4]!,
    m[5]!,
    m[6]!,
    m[8]!,
    m[9]!,
    m[10]!,
  );
}

/**
 * The rotation nearest `k` (the orthogonal factor of its polar
 * decomposition, by Newton's iteration `R ← (R + R⁻ᵀ)/2`), or the identity
 * for a `k` that is singular, mirrors or isn't finite.
 */
export function polarRotation(k: ArrayLike<number>): Mat3 {
  let r = Float64Array.from(k);
  for (let iteration = 0; iteration < 40; iteration++) {
    const inverse = invert3(r);
    if (!inverse) {
      return Float64Array.from(IDENTITY);
    }
    let change = 0;
    const next = new Float64Array(9);
    for (let c = 0; c < 3; c++) {
      for (let row = 0; row < 3; row++) {
        // R⁻ᵀ[c][row] is R⁻¹[row][c].
        next[c * 3 + row] = 0.5 * (r[c * 3 + row]! + inverse[row * 3 + c]!);
        change = Math.max(
          change,
          Math.abs(next[c * 3 + row]! - r[c * 3 + row]!),
        );
      }
    }
    r = next;
    if (change < 1e-15) {
      break;
    }
  }
  const det =
    r[0]! * (r[4]! * r[8]! - r[5]! * r[7]!) -
    r[3]! * (r[1]! * r[8]! - r[2]! * r[7]!) +
    r[6]! * (r[1]! * r[5]! - r[2]! * r[4]!);
  return det > 0 && r.every(Number.isFinite) ? r : Float64Array.from(IDENTITY);
}

/**
 * What `route` does at points of its frame, kept rigid: for `origin`, the
 * shift of the origin and the rotation about it, in the coordinates the
 * route's rigid part places (`affine`) the anchor in. The corrector is made
 * once and called per point (an instance's). Undefined where the route isn't
 * finite.
 */
export function anchorCorrector(
  route: Route,
  affine: ArrayLike<number>,
): (origin: ArrayLike<number>) => AnchorCorrection | undefined {
  const map = routeMap(route, invertAffine(mat4(), affine));
  const at = new Float64Array(3);
  const jacobian = new Float64Array(9);
  return (origin) => {
    map(origin, at, jacobian);
    const shift = Float64Array.of(
      at[0]! - origin[0]!,
      at[1]! - origin[1]!,
      at[2]! - origin[2]!,
    );
    if (!shift.every(Number.isFinite) || !jacobian.every(Number.isFinite)) {
      return undefined;
    }
    return { shift, rotation: polarRotation(jacobian) };
  };
}

/**
 * The cubic lattice (one cell, exact) of `D(p) = c + B·p` over the sphere
 * (`center`, `scale`) in model coordinates: the lattice term the GPU
 * evaluates for an affine displacement.
 */
export function affineLattice(
  c: ArrayLike<number>,
  b: ArrayLike<number>,
  center: ArrayLike<number>,
  scale: number,
  operation: string,
): CubicLattice {
  const coefficients = new Float64Array(PLACEMENT_TERMS * 3);
  for (let axis = 0; axis < 3; axis++) {
    coefficients[axis] =
      c[axis]! +
      b[axis]! * center[0]! +
      b[3 + axis]! * center[1]! +
      b[6 + axis]! * center[2]!;
    // Monomials 1 to 3 are u's x, y and z; p = center + scale·u.
    for (let k = 0; k < 3; k++) {
      coefficients[(1 + k) * 3 + axis] = scale * b[k * 3 + axis]!;
    }
  }
  return {
    kind: "cubic",
    center: [center[0]!, center[1]!, center[2]!],
    scale,
    cells: 1,
    coefficients,
    errorBound: 0,
    estimate: false,
    operation,
  };
}

/**
 * The lattice that moves a draw rigidly by `correction` about `origin`.
 * `matrix` takes the draw's model coordinates to the anchor's (its model's
 * linear part `L` and translation `t`): the displacement in model
 * coordinates is `D(p) = L⁻¹·R·L·p − p + L⁻¹(δ + (I − R)(f₀ − t))`, so that
 * the draw is drawn at `f₀ + δ + R·(f − f₀)` for each of its points `f`.
 */
export function anchorLattice(
  correction: AnchorCorrection,
  matrix: ArrayLike<number>,
  origin: ArrayLike<number>,
  tile: { center: ArrayLike<number>; scale: number },
  operation: string,
): CubicLattice | undefined {
  const l = linearPart(matrix);
  const inverse = invert3(l);
  if (!inverse) {
    return undefined;
  }
  const { shift, rotation: r } = correction;
  const b = multiply3(inverse, multiply3(r, l));
  for (let i = 0; i < 9; i++) {
    b[i] = b[i]! - IDENTITY[i]!;
  }
  // δ + (I − R)(f₀ − t), in the anchor's coordinates, then to the model's.
  const d = [
    origin[0]! - matrix[12]!,
    origin[1]! - matrix[13]!,
    origin[2]! - matrix[14]!,
  ];
  const w = [0, 0, 0];
  for (let row = 0; row < 3; row++) {
    w[row] =
      shift[row]! +
      d[row]! -
      (r[row]! * d[0]! + r[3 + row]! * d[1]! + r[6 + row]! * d[2]!);
  }
  const c = Float64Array.of(
    inverse[0]! * w[0]! + inverse[3]! * w[1]! + inverse[6]! * w[2]!,
    inverse[1]! * w[0]! + inverse[4]! * w[1]! + inverse[7]! * w[2]!,
    inverse[2]! * w[0]! + inverse[5]! * w[1]! + inverse[8]! * w[2]!,
  );
  return affineLattice(c, b, tile.center, tile.scale, operation);
}

/**
 * An instance's matrix `base` (column-major 4×4, relative to the draw's
 * transform, whose linear part is `l` with inverse `lInverse`) moved by
 * `correction` at its origin: `Inst′ = [Rₗ·Inst_lin | t + δₗ]` with
 * `δₗ = L⁻¹δ` and `Rₗ = L⁻¹RL`, so the instance is drawn at its origin's
 * image, turned by R. Written to `out`.
 */
export function correctedInstance(
  base: ArrayLike<number>,
  l: ArrayLike<number>,
  lInverse: ArrayLike<number>,
  correction: AnchorCorrection,
  out: Float64Array,
): Float64Array {
  const rl = multiply3(lInverse, multiply3(correction.rotation, l));
  const { shift } = correction;
  for (let c = 0; c < 3; c++) {
    for (let row = 0; row < 3; row++) {
      out[c * 4 + row] =
        rl[row]! * base[c * 4]! +
        rl[3 + row]! * base[c * 4 + 1]! +
        rl[6 + row]! * base[c * 4 + 2]!;
    }
    out[c * 4 + 3] = 0;
  }
  for (let row = 0; row < 3; row++) {
    out[12 + row] =
      base[12 + row]! +
      lInverse[row]! * shift[0]! +
      lInverse[3 + row]! * shift[1]! +
      lInverse[6 + row]! * shift[2]!;
  }
  out[15] = 1;
  return out;
}
