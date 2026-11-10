import { describe, expect, it } from "vitest";
import {
  boxBrep,
  cappedCylinderBrep,
  coneFrustumBrep,
  filletedBlockBrep,
  plateBrep,
  sphereBrep,
  torusBrep,
  trimmedNurbsBrep,
} from "../examples/brep-first-look/fixtures.ts";
import {
  MAX_ITERATIONS,
  edgeLength,
  faceArea,
  nearestOnFace,
  nearestVertexUv,
} from "../examples/brep-first-look/exact.ts";
import { tessellateBrep } from "../src/brep/tessellate.ts";
import { validateBrep } from "../src/brep/validate.ts";

const shapes = {
  box: boxBrep,
  cappedCylinder: cappedCylinderBrep,
  trimmedNurbs: trimmedNurbsBrep,
  sphere: sphereBrep,
  torus: torusBrep,
  coneFrustum: coneFrustumBrep,
  plate: plateBrep,
  filletedBlock: filletedBlockBrep,
};

describe("the gallery's B-rep fixtures", () => {
  for (const [name, make] of Object.entries(shapes)) {
    it(`${name} validates with no problems`, () => {
      expect(validateBrep(make())).toEqual([]);
    });
    it(`${name} tessellates into triangles`, () => {
      const mesh = tessellateBrep(make(), { tolerance: 0.01 });
      expect(mesh.faces.indices.length).toBeGreaterThan(0);
      expect(mesh.faces.positions.every(Number.isFinite)).toBe(true);
      expect(mesh.faces.normals.every(Number.isFinite)).toBe(true);
    });
  }
});

describe("the exact point of a pick", () => {
  it("finds the sphere's nearest point from a point near it", () => {
    const form = sphereBrep();
    const mesh = tessellateBrep(form, { tolerance: 0.01 });
    // A point 2 mm outside the sphere, away from the poles and the seam.
    const d = [0.5, 0.6, Math.sqrt(1 - 0.25 - 0.36)];
    const p = d.map((x) => x * 1.002);
    const start = nearestVertexUv(mesh, 0, p)!;
    const exact = nearestOnFace(form, 0, p, start)!;
    expect(exact.distance).toBeCloseTo(0.002, 9);
    for (let k = 0; k < 3; k++) {
      expect(exact.position[k]).toBeCloseTo(d[k]!, 9);
      expect(exact.normal![k]).toBeCloseTo(d[k]!, 9);
    }
    expect(exact.iterations).toBeLessThanOrEqual(MAX_ITERATIONS);
  });

  it("stays inside the face's domain", () => {
    const form = boxBrep();
    const exact = nearestOnFace(form, 0, [-5, -5, 0], [0.5, 0.5])!;
    expect(exact.u).toBe(0);
    expect(exact.v).toBe(0);
  });

  it("sums a face's triangles for its area, and an edge's lines for its length", () => {
    const form = boxBrep();
    const mesh = tessellateBrep(form, { tolerance: 0.01 });
    // Face 0 is the 2 x 3 m bottom; its first edge is 2 m or 3 m or 4 m long.
    expect(faceArea(mesh, 0)).toBeCloseTo(6, 6);
    expect(
      [2, 3, 4].some((l) => Math.abs(edgeLength(mesh, 0) - l) < 1e-5),
    ).toBe(true);
    const sphere = tessellateBrep(sphereBrep(), { tolerance: 0.001 });
    expect(Math.abs(faceArea(sphere, 0) / (4 * Math.PI) - 1)).toBeLessThan(
      1e-2,
    );
  });
});
