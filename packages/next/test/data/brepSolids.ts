// Checks a kernel's solid, converted to the render form, against the exact
// solid it should be (plan §13.33, the CSG spike): the form validates, and
// every face's outside really is outside. Shared by the SMLib and OCCT tests.
import { expect } from "vitest";
import type { BrepForm } from "../../src/brep/form.ts";
import { tessellateBrep } from "../../src/brep/tessellate.ts";
import { validateBrep } from "../../src/brep/validate.ts";

/** Whether a point is inside the exact solid. */
export type Inside = (x: number, y: number, z: number) => boolean;

/** How far off a face its outside and inside are probed, m. */
const PROBE = 1e-3;

/**
 * For every face, the share of its triangles whose centre, moved PROBE along
 * the face's normal, is outside the solid, and moved against it, inside.
 */
export function outwardShares(form: BrepForm, inside: Inside): number[] {
  const mesh = tessellateBrep(form, { tolerance: 1e-5 });
  const { positions, normals, indices, featureIds } = mesh.faces;
  const o = mesh.origin;
  const passed: number[] = [];
  const total: number[] = [];
  for (let t = 0; t < indices.length; t += 3) {
    const c = [0, 0, 0];
    const n = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const v = indices[t + k]!;
      for (let a = 0; a < 3; a++) {
        c[a]! += (positions[v * 3 + a]! + o[a]!) / 3;
        n[a]! += normals[v * 3 + a]!;
      }
    }
    const length = Math.hypot(n[0]!, n[1]!, n[2]!);
    const face = featureIds[indices[t]!]!;
    const at = (s: number) =>
      inside(
        c[0]! + (s * PROBE * n[0]!) / length,
        c[1]! + (s * PROBE * n[1]!) / length,
        c[2]! + (s * PROBE * n[2]!) / length,
      );
    total[face] = (total[face] ?? 0) + 1;
    passed[face] = (passed[face] ?? 0) + (!at(1) && at(-1) ? 1 : 0);
  }
  return total.map((count, face) => (passed[face] ?? 0) / count);
}

/** The form validates and, on every face, over 95% of its triangles face out. */
export function expectSolidForm(form: BrepForm, inside: Inside): void {
  expect(validateBrep(form)).toEqual([]);
  const shares = outwardShares(form, inside);
  expect(shares.length).toBe(form.faceSurface.length);
  for (const share of shares) {
    expect(share).toBeGreaterThan(0.95);
  }
}

export const inBox =
  (min: readonly number[], max: readonly number[]): Inside =>
  (x, y, z) =>
    x > min[0]! &&
    x < max[0]! &&
    y > min[1]! &&
    y < max[1]! &&
    z > min[2]! &&
    z < max[2]!;
