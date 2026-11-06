import type { Mat4 } from "../math/mat4.ts";

/**
 * The one bridge between plan 1's rotations and frame transforms (R7).
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
