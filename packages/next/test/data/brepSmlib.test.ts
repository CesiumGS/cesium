// SMLib's solids as render forms (plan §13.33, the CSG spike): the build in
// the store (npm run setup) converts primitives and booleans, and each form
// validates, faces outward, and keeps the tags of the faces it came from.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  SmlibKernel,
  type SmlibBrep,
  type SmlibModule,
  type SmlibSolid,
} from "../../src/brep/smlib.ts";
import { smlibDirectory } from "../../scripts/smlibTools.mjs";
import { expectSolidForm, type Inside } from "./brepSolids.ts";

const directory = smlibDirectory();
let kernel: SmlibKernel;

beforeAll(async () => {
  if (!directory) {
    throw new Error(
      "No SMLib build: run npm run setup --workspace @cesium/next",
    );
  }
  const imported = (await import(
    pathToFileURL(join(directory, "smlib.mjs")).href
  )) as { default: () => Promise<SmlibModule> };
  kernel = new SmlibKernel(await imported.default());
});

/** Converts, then checks validity and outward faces against `inside`. */
function expectSolid(solid: SmlibSolid, inside: Inside): SmlibBrep {
  const brep = kernel.toForm(solid);
  expect(Array.from(brep.faceSideUnknown)).not.toContain(1);
  expectSolidForm(brep.form, inside);
  return brep;
}

describe("SMLib to BrepForm", () => {
  it("converts a box", () => {
    const box = kernel.box([0, 0, 0], [2, 3, 1]);
    try {
      const brep = expectSolid(
        box,
        (x, y, z) => x > 0 && x < 2 && y > 0 && y < 3 && z > 0 && z < 1,
      );
      expect(brep.form.faceSurface.length).toBe(6);
    } finally {
      box.delete();
    }
  });

  it("converts a cylinder, its side closed by a seam", () => {
    const cylinder = kernel.cylinder([1, 2, 0], 0.5, 2);
    try {
      expectSolid(
        cylinder,
        (x, y, z) => Math.hypot(x - 1, y - 2) < 0.5 && z > 0 && z < 2,
      );
    } finally {
      cylinder.delete();
    }
  });

  it("converts a sphere, its poles zero-length edges", () => {
    const sphere = kernel.sphere([0, 0, 1], 1.5);
    try {
      expectSolid(sphere, (x, y, z) => Math.hypot(x, y, z - 1) < 1.5);
    } finally {
      sphere.delete();
    }
  });

  it("converts a torus and a cone frustum", () => {
    const torus = kernel.torus([0, 0, 0], 2, 0.5);
    const cone = kernel.cone([0, 0, 0], 1, 0.4, 1.5);
    try {
      expectSolid(
        torus,
        (x, y, z) => Math.hypot(Math.hypot(x, y) - 2, z) < 0.5,
      );
      expectSolid(
        cone,
        (x, y, z) =>
          z > 0 && z < 1.5 && Math.hypot(x, y) < 1 + ((0.4 - 1) * z) / 1.5,
      );
    } finally {
      torus.delete();
      cone.delete();
    }
  });

  it("converts a box minus a cylinder, its faces tagged with the input they came from", () => {
    const box = kernel.box([0, 0, 0], [2, 2, 1]);
    const hole = kernel.cylinder([1, 1, -0.5], 0.5, 2);
    kernel.tag(box, 1);
    kernel.tag(hole, 2);
    const cut = kernel.boolean("difference", box, hole);
    try {
      expect(hole.pointer).toBe(0);
      expect(kernel.isManifoldSolid(cut)).toBe(true);
      expect(kernel.volume(cut)).toBeCloseTo(4 - Math.PI * 0.25, 6);
      const brep = expectSolid(
        cut,
        (x, y, z) =>
          x > 0 &&
          x < 2 &&
          y > 0 &&
          y < 2 &&
          z > 0 &&
          z < 1 &&
          Math.hypot(x - 1, y - 1) > 0.5,
      );
      const tags = Array.from(brep.faceTags);
      expect(tags.length).toBe(7);
      expect(tags.filter((t) => t === 1).length).toBe(6);
      expect(tags.filter((t) => t === 2).length).toBe(1);
      // The top and bottom keep the hole as an inner loop.
      const loops = Array.from(
        { length: brep.form.faceSurface.length },
        (_, f) => brep.form.faceLoops[f * 2 + 1]!,
      );
      expect(loops.filter((n) => n === 2).length).toBe(2);
    } finally {
      cut.delete();
    }
  });

  it("converts a union and an intersection of a box and a sphere", () => {
    const inBox = (x: number, y: number, z: number) =>
      x > 0 && x < 2 && y > 0 && y < 2 && z > 0 && z < 2;
    const inBall = (x: number, y: number, z: number) =>
      Math.hypot(x - 2, y - 2, z - 2) < 1.2;
    for (const operation of ["union", "intersection"] as const) {
      const box = kernel.box([0, 0, 0], [2, 2, 2]);
      const ball = kernel.sphere([2, 2, 2], 1.2);
      kernel.tag(box, 1);
      kernel.tag(ball, 2);
      const result = kernel.boolean(operation, box, ball);
      try {
        const brep = expectSolid(result, (x, y, z) =>
          operation === "union"
            ? inBox(x, y, z) || inBall(x, y, z)
            : inBox(x, y, z) && inBall(x, y, z),
        );
        const tags = new Set(brep.faceTags);
        expect(tags).toEqual(new Set([1, 2]));
      } finally {
        result.delete();
      }
    }
  });
});
