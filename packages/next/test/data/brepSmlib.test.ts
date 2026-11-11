// SMLib's solids as render forms (plan §13.33, the CSG spike): the build in
// the store (npm run setup) converts primitives and booleans, and each form
// validates, faces outward, and keeps the tags of the faces it came from.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { SurfaceKind, type BrepForm } from "../../src/brep/form.ts";
import {
  SmlibKernel,
  type SmlibBrep,
  type SmlibModule,
  type SmlibSolid,
} from "../../src/brep/smlib.ts";
import { tessellateBrep } from "../../src/brep/tessellate.ts";
import { smlibDirectory } from "../../scripts/smlibTools.mjs";
import {
  distanceToIdentity,
  expectPatchesOnIdentity,
  expectSolidForm,
  type Inside,
} from "./brepSolids.ts";

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

/** The surface of a face, and its z axis (x × y) and radius. */
function surfaceOf(form: BrepForm, face: number) {
  const s = form.faceSurface[face]!;
  const f = form.surfaceFrame;
  const o = Array.from(f.subarray(s * 9, s * 9 + 3));
  const x = Array.from(f.subarray(s * 9 + 3, s * 9 + 6));
  const y = Array.from(f.subarray(s * 9 + 6, s * 9 + 9));
  const z = [
    x[1]! * y[2]! - x[2]! * y[1]!,
    x[2]! * y[0]! - x[0]! * y[2]!,
    x[0]! * y[1]! - x[1]! * y[0]!,
  ];
  return {
    surface: s,
    origin: o,
    z,
    a: form.surfaceParams[s * 2]!,
    b: form.surfaceParams[s * 2 + 1]!,
    identity: form.surfaceIdentity[s]!,
  };
}

/** The faces' surface identities, by kind. */
function identities(form: BrepForm): Record<number, number> {
  const out: Record<number, number> = {};
  for (let f = 0; f < form.faceSurface.length; f++) {
    const id = form.surfaceIdentity[form.faceSurface[f]!]!;
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

/** The sampled worst distance of a mesh's triangle points to their faces' identities, m. */
function worstFromIdentity(form: BrepForm, tolerance: number) {
  const mesh = tessellateBrep(form, { tolerance });
  const { positions, indices, featureIds } = mesh.faces;
  const o = mesh.origin;
  const at = (i: number) => [
    positions[i * 3]! + o[0]!,
    positions[i * 3 + 1]! + o[1]!,
    positions[i * 3 + 2]! + o[2]!,
  ];
  let worst = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const v = [at(indices[t]!), at(indices[t + 1]!), at(indices[t + 2]!)];
    const surface = form.faceSurface[featureIds[indices[t]!]!]!;
    for (const w of [
      [1 / 3, 1 / 3, 1 / 3],
      [0.5, 0.5, 0],
      [0, 0.5, 0.5],
      [0.5, 0, 0.5],
      [0.75, 0.25, 0],
      [0.25, 0.25, 0.5],
    ]) {
      const q = [0, 1, 2].map(
        (k) => w[0]! * v[0]![k]! + w[1]! * v[1]![k]! + w[2]! * v[2]![k]!,
      );
      worst = Math.max(worst, distanceToIdentity(form, surface, q));
    }
  }
  return { mesh, worst };
}

describe("SMLib surface identities", () => {
  it("names a box's six planes, and puts its patches on them", () => {
    const box = kernel.box([0, 0, 0], [2, 3, 1]);
    try {
      const { form } = kernel.toForm(box);
      expect(Array.from(form.surfaceKind)).toEqual(new Array(6).fill(5));
      expect(identities(form)).toEqual({ [SurfaceKind.Plane]: 6 });
      expect(Array.from(form.surfaceError)).toEqual(new Array(6).fill(0));
      expect(expectPatchesOnIdentity(form)).toBe(6);
    } finally {
      box.delete();
    }
  });

  it("names the cylinder of a box minus a cylinder, with its radius and axis", () => {
    const box = kernel.box([0, 0, 0], [2, 2, 1]);
    const hole = kernel.cylinder([1, 1, -0.5], 0.5, 2);
    const cut = kernel.boolean("difference", box, hole);
    try {
      const { form } = kernel.toForm(cut);
      expect(identities(form)).toEqual({
        [SurfaceKind.Plane]: 6,
        [SurfaceKind.Cylinder]: 1,
      });
      const face = Array.from({ length: form.faceSurface.length }, (_, f) =>
        surfaceOf(form, f),
      ).find((s) => s.identity === SurfaceKind.Cylinder)!;
      expect(form.surfaceKind[face.surface]).toBe(SurfaceKind.Bezier);
      expect(face.a).toBeCloseTo(0.5, 9);
      // The axis is z, through (1, 1): the frame's origin lies on it.
      expect(Math.abs(face.z[2]!)).toBeCloseTo(1, 9);
      expect(Math.hypot(face.z[0]!, face.z[1]!)).toBeLessThan(1e-9);
      expect(face.origin[0]).toBeCloseTo(1, 9);
      expect(face.origin[1]).toBeCloseTo(1, 9);
      expect(expectPatchesOnIdentity(form)).toBe(7);
    } finally {
      cut.delete();
    }
  });

  it("names a sphere, with its centre and radius", () => {
    const sphere = kernel.sphere([0.5, -1, 1], 1.5);
    try {
      const { form } = kernel.toForm(sphere);
      const face = surfaceOf(form, 0);
      expect(face.identity).toBe(SurfaceKind.Sphere);
      expect(face.a).toBeCloseTo(1.5, 9);
      expect(face.origin[0]).toBeCloseTo(0.5, 9);
      expect(face.origin[1]).toBeCloseTo(-1, 9);
      expect(face.origin[2]).toBeCloseTo(1, 9);
      expect(expectPatchesOnIdentity(form)).toBe(1);
    } finally {
      sphere.delete();
    }
  });

  it("names a torus and a cone frustum, in the form's conventions", () => {
    const torus = kernel.torus([0, 0, 0], 2, 0.5);
    const cone = kernel.cone([0, 0, 0], 1, 0.4, 1.5);
    try {
      const t = surfaceOf(kernel.toForm(torus).form, 0);
      expect(t.identity).toBe(SurfaceKind.Torus);
      expect([t.a, t.b]).toEqual([2, 0.5]);
      expect(Math.abs(t.z[2]!)).toBeCloseTo(1, 9);
      const form = kernel.toForm(cone).form;
      const sides = Array.from({ length: form.faceSurface.length }, (_, f) =>
        surfaceOf(form, f),
      ).filter((s) => s.identity === SurfaceKind.Cone);
      expect(sides.length).toBe(1);
      // Radius 1 at the base, narrowing 0.6 over 1.5 m, whichever way the frame's z points.
      expect(Math.abs(Math.tan(sides[0]!.b))).toBeCloseTo(0.4, 9);
      expect(expectPatchesOnIdentity(form)).toBe(3);
      expect(expectPatchesOnIdentity(kernel.toForm(torus).form)).toBe(1);
    } finally {
      torus.delete();
      cone.delete();
    }
  });
});

describe("SMLib faces on the tessellator's error bound", () => {
  it("meshes a sphere within the stated error, at 1 mm, and well under the net bound's grid cap", () => {
    const sphere = kernel.sphere([0, 0, 1], 1.5);
    try {
      const { form } = kernel.toForm(sphere);
      const { mesh, worst } = worstFromIdentity(form, 1e-3);
      expect(mesh.error).toBe(1e-3);
      expect(worst).toBeLessThanOrEqual(mesh.error + 1e-6);
      expect(worst).toBeGreaterThan(0.5e-3);
      // Without the identity, the net bound stays at the grid cap (32768 triangles).
      expect(mesh.faces.indices.length / 3).toBeLessThan(20_000);
    } finally {
      sphere.delete();
    }
  });

  it("meshes a box's cylinder face in one cell along its axis", () => {
    const box = kernel.box([0, 0, 0], [2, 2, 1]);
    const hole = kernel.cylinder([1, 1, -0.5], 0.5, 2);
    const cut = kernel.boolean("difference", box, hole);
    try {
      const { form } = kernel.toForm(cut);
      const { mesh, worst } = worstFromIdentity(form, 1e-3);
      expect(mesh.error).toBe(1e-3);
      expect(worst).toBeLessThanOrEqual(mesh.error + 1e-6);
      const wall = Array.from({ length: form.faceSurface.length }, (_, f) => f)
        .filter(
          (f) =>
            form.surfaceIdentity[form.faceSurface[f]!] === SurfaceKind.Cylinder,
        )
        .map(
          (f) =>
            Array.from(mesh.faces.featureIds).filter((id) => id === f).length,
        );
      // Vertices: (cells + 1) × 2 around a circle of 0.5 m at 1 mm is about 50 cells.
      expect(wall[0]).toBeLessThan(2 * 70);
    } finally {
      cut.delete();
    }
  });

  it("holds on a torus and a cone, which take the net bound and the identity", () => {
    const torus = kernel.torus([0, 0, 0], 2, 0.5);
    const cone = kernel.cone([0, 0, 0], 1, 0.4, 1.5);
    try {
      for (const solid of [torus, cone]) {
        const { form } = kernel.toForm(solid);
        const { mesh, worst } = worstFromIdentity(form, 5e-3);
        expect(worst).toBeLessThanOrEqual(mesh.error + 1e-6);
      }
    } finally {
      torus.delete();
      cone.delete();
    }
  });
});
