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
