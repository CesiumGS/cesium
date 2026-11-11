// Checks a kernel's solid, converted to the render form, against the exact
// solid it should be (plan §13.33, the CSG spike): the form validates, and
// every face's outside really is outside. Shared by the SMLib and OCCT tests.
import { expect } from "vitest";
import { evaluateSurface } from "../../src/brep/evaluate.ts";
import { SurfaceKind, type BrepForm } from "../../src/brep/form.ts";
import { formBounds } from "../../src/brep/formBounds.ts";
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

/** formBounds holds a fine tessellation of the form, to within 3% of its size beyond it. */
export function expectBoundsHold(form: BrepForm): void {
  const mesh = tessellateBrep(form, { tolerance: 1e-4 });
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  mesh.faces.positions.forEach((v, i) => {
    const p = v + mesh.origin[i % 3]!;
    min[i % 3] = Math.min(min[i % 3]!, p);
    max[i % 3] = Math.max(max[i % 3]!, p);
  });
  const bounds = formBounds(form);
  const longest = Math.max(...[0, 1, 2].map((k) => max[k]! - min[k]!));
  // The tessellator keeps a trimmed face's triangles whose centre is inside
  // the trim, so its mesh may overhang a trim by up to a triangle.
  const overhang = 0.03 * longest;
  for (let k = 0; k < 3; k++) {
    expect(bounds.min[k]!).toBeLessThanOrEqual(min[k]! + overhang);
    expect(bounds.max[k]!).toBeGreaterThanOrEqual(max[k]! - overhang);
    expect(bounds.min[k]!).toBeGreaterThan(min[k]! - 0.03 * longest - 1e-4);
    expect(bounds.max[k]!).toBeLessThan(max[k]! + 0.03 * longest + 1e-4);
  }
}

/** The form validates and, on every face, over 95% of its triangles face out. */
export function expectSolidForm(form: BrepForm, inside: Inside): void {
  expect(validateBrep(form)).toEqual([]);
  expectBoundsHold(form);
  const shares = outwardShares(form, inside);
  expect(shares.length).toBe(form.faceSurface.length);
  for (const share of shares) {
    expect(share).toBeGreaterThan(0.95);
  }
}

/**
 * How far a point is from a surface's analytic identity (form.ts's
 * parameterizations), m. NaN when the identity is free-form.
 */
export function distanceToIdentity(
  form: BrepForm,
  surface: number,
  p: ArrayLike<number>,
): number {
  const kind = form.surfaceIdentity[surface]! as SurfaceKind;
  const f = form.surfaceFrame;
  const a = form.surfaceParams[surface * 2]!;
  const b = form.surfaceParams[surface * 2 + 1]!;
  const at = (k: number) => [
    f[surface * 9 + k]!,
    f[surface * 9 + k + 1]!,
    f[surface * 9 + k + 2]!,
  ];
  const [o, x, y] = [at(0), at(3), at(6)] as [number[], number[], number[]];
  const z = [
    x[1]! * y[2]! - x[2]! * y[1]!,
    x[2]! * y[0]! - x[0]! * y[2]!,
    x[0]! * y[1]! - x[1]! * y[0]!,
  ];
  const d = [p[0]! - o[0]!, p[1]! - o[1]!, p[2]! - o[2]!];
  const dot = (u: number[], v: number[]) =>
    u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
  const [px, py, pz] = [dot(d, x), dot(d, y), dot(d, z)] as [
    number,
    number,
    number,
  ];
  switch (kind) {
    case SurfaceKind.Plane:
      return Math.abs(pz);
    case SurfaceKind.Cylinder:
      return Math.abs(Math.hypot(px, py) - a);
    case SurfaceKind.Cone:
      return (
        Math.abs(Math.hypot(px, py) - (a + pz * Math.tan(b))) * Math.cos(b)
      );
    case SurfaceKind.Sphere:
      return Math.abs(Math.hypot(px, py, pz) - a);
    case SurfaceKind.Torus:
      return Math.abs(Math.hypot(Math.hypot(px, py) - a, pz) - b);
    default:
      return NaN;
  }
}

/**
 * Samples every patch of every Bézier surface that has an analytic identity,
 * on a 5 × 5 grid of its own (u, v), and expects each point on the identity
 * within `tolerance`. Returns how many surfaces had an identity.
 */
export function expectPatchesOnIdentity(
  form: BrepForm,
  tolerance = 1e-6,
): number {
  let identified = 0;
  for (let s = 0; s < form.surfaceKind.length; s++) {
    if (
      form.surfaceKind[s] !== SurfaceKind.Bezier ||
      form.surfaceIdentity[s] === SurfaceKind.Bezier
    ) {
      continue;
    }
    identified++;
    const first = form.surfacePatches[s * 2]!;
    const count = form.surfacePatches[s * 2 + 1]!;
    for (let patch = first; patch < first + count; patch++) {
      const [u0, u1, v0, v1] = form.patchDomain.subarray(
        patch * 4,
        patch * 4 + 4,
      );
      for (let i = 0; i <= 4; i++) {
        for (let j = 0; j <= 4; j++) {
          const u = u0! + ((u1! - u0!) * i) / 4;
          const v = v0! + ((v1! - v0!) * j) / 4;
          const point = evaluateSurface(form, s, u, v).position;
          expect(distanceToIdentity(form, s, point)).toBeLessThan(tolerance);
        }
      }
    }
  }
  return identified;
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
