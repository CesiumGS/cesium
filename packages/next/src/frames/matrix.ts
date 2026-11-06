import type { Mat4 } from "../math/mat4.ts";

/**
 * The one bridge between plan 1's rotations and frame transforms (R7).
 * Edges may now be affine, not only rigid, but only the GCRF edge is; it
 * writes its own `Mat4` (nothing there is row-major).
 *
 * `parentToChild` is a row-major 3x3 with `child = R · parent`, as ERFA
 * writes rotations. `origin` is the child's origin in the parent, in
 * meters. Writes the column-major `Mat4` `M` with
 * `p_parent = Rᵀ · p_child + origin`.
 */
export function toParentMatrix(
  parentToChild: ArrayLike<number>,
  origin: ArrayLike<number> | undefined,
  out: Mat4,
): Mat4 {
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      // Rᵀ[row][col] = R[col][row], stored at column-major col * 4 + row.
      out[col * 4 + row] = parentToChild[col * 3 + row]!;
    }
    out[col * 4 + 3] = 0;
  }
  out[12] = origin ? origin[0]! : 0;
  out[13] = origin ? origin[1]! : 0;
  out[14] = origin ? origin[2]! : 0;
  out[15] = 1;
  return out;
}

const cofactor = new Float64Array(9);

/**
 * The rotation part of a frame transform's linear part: its polar factor,
 * a row-major 3x3 `R` with `v_to = R · v_from` for directions (the
 * transform's own sense, the transpose of `toParentMatrix`'s
 * `parentToChild` for a child-to-parent edge). The GCRF edge scales and
 * shears positions by up to 2.5e-8 (eq. 11.19), which is no rotation and
 * does not apply to directions. Newton's iteration R ← ½(R + R⁻ᵀ) from the
 * linear part: each step squares the departure from orthogonality, so
 * three take 2.5e-8 below float64 rounding, and a rigid transform's rotation
 * comes back unchanged.
 */
export function rotationPart(
  m: ArrayLike<number>,
  out: Float64Array = new Float64Array(9),
): Float64Array {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      out[3 * row + col] = m[4 * col + row]!;
    }
  }
  const r = out;
  for (let step = 0; step < 3; step++) {
    cofactor[0] = r[4]! * r[8]! - r[5]! * r[7]!;
    cofactor[1] = r[5]! * r[6]! - r[3]! * r[8]!;
    cofactor[2] = r[3]! * r[7]! - r[4]! * r[6]!;
    cofactor[3] = r[2]! * r[7]! - r[1]! * r[8]!;
    cofactor[4] = r[0]! * r[8]! - r[2]! * r[6]!;
    cofactor[5] = r[1]! * r[6]! - r[0]! * r[7]!;
    cofactor[6] = r[1]! * r[5]! - r[2]! * r[4]!;
    cofactor[7] = r[2]! * r[3]! - r[0]! * r[5]!;
    cofactor[8] = r[0]! * r[4]! - r[1]! * r[3]!;
    const det = r[0]! * cofactor[0] + r[1]! * cofactor[1] + r[2]! * cofactor[2];
    // R⁻ᵀ is the cofactor matrix over the determinant.
    for (let n = 0; n < 9; n++) {
      r[n] = 0.5 * (r[n]! + cofactor[n]! / det);
    }
  }
  return r;
}
