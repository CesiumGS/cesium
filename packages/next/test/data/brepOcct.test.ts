// Open CASCADE's solids as render forms (plan §13.33, the CSG spike's second
// kernel): the build in the store (npm run setup) converts primitives and
// booleans; each form validates, faces outward, keeps OCCT's analytic
// surfaces as the form's analytic kinds, and keeps the tags of the faces it
// came from through each boolean's history.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { SurfaceKind } from "../../src/brep/form.ts";
import {
  OcctKernel,
  type OcctBrep,
  type OcctModule,
  type OcctSolid,
} from "../../src/brep/occt.ts";
import { occtDirectory } from "../../scripts/occtTools.mjs";
import { expectSolidForm, inBox, type Inside } from "./brepSolids.ts";

const directory = occtDirectory();
let kernel: OcctKernel;

beforeAll(async () => {
  if (!directory) {
    throw new Error(
      "No OCCT build: run npm run setup --workspace @cesium/next",
    );
  }
  const imported = (await import(
    pathToFileURL(join(directory, "replicad_single.js")).href
  )) as { default: () => Promise<OcctModule> };
  kernel = new OcctKernel(await imported.default());
}, 30_000);

function expectSolid(solid: OcctSolid, inside: Inside): OcctBrep {
  const brep = kernel.toForm(solid);
  expectSolidForm(brep.form, inside);
  return brep;
}

/** How many faces have each surface kind. */
function kinds(brep: OcctBrep): Record<number, number> {
  const out: Record<number, number> = {};
  for (const surface of brep.form.faceSurface) {
    const kind = brep.form.surfaceKind[surface]!;
    out[kind] = (out[kind] ?? 0) + 1;
  }
  return out;
}

describe("OCCT to BrepForm", () => {
  it("converts a box to six planes", () => {
    const brep = expectSolid(
      kernel.box([0, 0, 0], [2, 3, 1]),
      inBox([0, 0, 0], [2, 3, 1]),
    );
    expect(kinds(brep)).toEqual({ [SurfaceKind.Plane]: 6 });
  });

  it("converts a cylinder, its side an analytic cylinder closed by a seam", () => {
    const brep = expectSolid(
      kernel.cylinder([1, 2, 0], 0.5, 2),
      (x, y, z) => Math.hypot(x - 1, y - 2) < 0.5 && z > 0 && z < 2,
    );
    expect(kinds(brep)).toEqual({
      [SurfaceKind.Plane]: 2,
      [SurfaceKind.Cylinder]: 1,
    });
  });

  it("converts a sphere and a torus to their analytic kinds", () => {
    const sphere = expectSolid(
      kernel.sphere([0, 0, 1], 1.5),
      (x, y, z) => Math.hypot(x, y, z - 1) < 1.5,
    );
    expect(kinds(sphere)).toEqual({ [SurfaceKind.Sphere]: 1 });
    const torus = expectSolid(
      kernel.torus([0, 0, 0], 2, 0.5),
      (x, y, z) => Math.hypot(Math.hypot(x, y) - 2, z) < 0.5,
    );
    expect(kinds(torus)).toEqual({ [SurfaceKind.Torus]: 1 });
  });

  it("converts a box minus a cylinder, its faces tagged with the input they came from", () => {
    const box = kernel.tag(kernel.box([0, 0, 0], [2, 2, 1]), 1);
    const hole = kernel.tag(kernel.cylinder([1, 1, -0.5], 0.5, 2), 2);
    const cut = kernel.boolean("difference", box, hole);
    expect(kernel.isValid(cut)).toBe(true);
    expect(kernel.volume(cut)).toBeCloseTo(4 - Math.PI * 0.25, 6);
    const brep = expectSolid(
      cut,
      (x, y, z) =>
        inBox([0, 0, 0], [2, 2, 1])(x, y, z) && Math.hypot(x - 1, y - 1) > 0.5,
    );
    expect(kinds(brep)).toEqual({
      [SurfaceKind.Plane]: 6,
      [SurfaceKind.Cylinder]: 1,
    });
    const tags = Array.from(brep.faceTags);
    expect(tags.filter((t) => t === 1).length).toBe(6);
    expect(tags.filter((t) => t === 2).length).toBe(1);
    const loops = Array.from(
      { length: brep.form.faceSurface.length },
      (_, f) => brep.form.faceLoops[f * 2 + 1]!,
    );
    expect(loops.filter((n) => n === 2).length).toBe(2);
  });

  it("converts a union and an intersection of a box and a sphere", () => {
    const box = inBox([0, 0, 0], [2, 2, 2]);
    const ball: Inside = (x, y, z) => Math.hypot(x - 2, y - 2, z - 2) < 1.2;
    for (const operation of ["union", "intersection"] as const) {
      const result = kernel.boolean(
        operation,
        kernel.tag(kernel.box([0, 0, 0], [2, 2, 2]), 1),
        kernel.tag(kernel.sphere([2, 2, 2], 1.2), 2),
      );
      const brep = expectSolid(result, (x, y, z) =>
        operation === "union"
          ? box(x, y, z) || ball(x, y, z)
          : box(x, y, z) && ball(x, y, z),
      );
      expect(new Set(brep.faceTags)).toEqual(new Set([1, 2]));
    }
  });
  it("carries its degree-8 intersection curves as cubics, the error in the edges' tolerance", () => {
    // A box and a sphere through all six of its faces: OCCT makes the
    // sphere-plane intersections B-splines of degree 8, not circles.
    const result = kernel.boolean(
      "intersection",
      kernel.tag(kernel.box([-0.8, -0.8, 0], [1.6, 1.6, 1.6]), 1),
      kernel.tag(kernel.sphere([0, 0, 0.8], 1.05), 2),
    );
    expect(kernel.isValid(result)).toBe(true);
    const brep = expectSolid(
      result,
      (x, y, z) =>
        inBox([-0.8, -0.8, 0], [0.8, 0.8, 1.6])(x, y, z) &&
        Math.hypot(x, y, z - 0.8) < 1.05,
    );
    expect(kinds(brep)).toEqual({
      [SurfaceKind.Plane]: 6,
      [SurfaceKind.Sphere]: 1,
    });
    expect(Math.max(...brep.form.edgeTolerance)).toBeLessThan(1e-5);
  });
});
