// Open CASCADE's solids as render forms (plan §13.33, the CSG spike's second
// kernel): the build in the store (npm run setup) converts primitives and
// booleans; each form validates, faces outward, keeps OCCT's analytic
// surfaces as the form's analytic kinds, and keeps the tags of the faces it
// came from through each boolean's history. Its embind handles are all freed,
// and STEP files go in and out.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SurfaceKind } from "../../src/brep/form.ts";
import {
  OcctKernel,
  type OcctBrep,
  type OcctModule,
  type OcctSolid,
} from "../../src/brep/occt.ts";
import { occtDirectory } from "../../scripts/occtTools.mjs";
import { expectSolidForm, inBox, type Inside } from "./brepSolids.ts";
import { trackHandles } from "./occtHandles.ts";

const directory = occtDirectory();
let oc: OcctModule;
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
  oc = await imported.default();
  kernel = new OcctKernel(oc);
}, 30_000);

/** The solids a test made, deleted when it ends. */
const owned: OcctSolid[] = [];
afterEach(() => {
  owned.splice(0).forEach((solid) => solid.delete());
});
function own(solid: OcctSolid): OcctSolid {
  owned.push(solid);
  return solid;
}

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
      own(kernel.box([0, 0, 0], [2, 3, 1])),
      inBox([0, 0, 0], [2, 3, 1]),
    );
    expect(kinds(brep)).toEqual({ [SurfaceKind.Plane]: 6 });
  });

  it("converts a cylinder, its side an analytic cylinder closed by a seam", () => {
    const brep = expectSolid(
      own(kernel.cylinder([1, 2, 0], 0.5, 2)),
      (x, y, z) => Math.hypot(x - 1, y - 2) < 0.5 && z > 0 && z < 2,
    );
    expect(kinds(brep)).toEqual({
      [SurfaceKind.Plane]: 2,
      [SurfaceKind.Cylinder]: 1,
    });
  });

  it("converts a sphere and a torus to their analytic kinds", () => {
    const sphere = expectSolid(
      own(kernel.sphere([0, 0, 1], 1.5)),
      (x, y, z) => Math.hypot(x, y, z - 1) < 1.5,
    );
    expect(kinds(sphere)).toEqual({ [SurfaceKind.Sphere]: 1 });
    const torus = expectSolid(
      own(kernel.torus([0, 0, 0], 2, 0.5)),
      (x, y, z) => Math.hypot(Math.hypot(x, y) - 2, z) < 0.5,
    );
    expect(kinds(torus)).toEqual({ [SurfaceKind.Torus]: 1 });
  });

  it("converts a box minus a cylinder, its faces tagged with the input they came from", () => {
    const box = own(kernel.tag(kernel.box([0, 0, 0], [2, 2, 1]), 1));
    const hole = own(kernel.tag(kernel.cylinder([1, 1, -0.5], 0.5, 2), 2));
    const cut = own(kernel.boolean("difference", box, hole));
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
      const result = own(
        kernel.boolean(
          operation,
          own(kernel.tag(kernel.box([0, 0, 0], [2, 2, 2]), 1)),
          own(kernel.tag(kernel.sphere([2, 2, 2], 1.2), 2)),
        ),
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
    const result = own(
      kernel.boolean(
        "intersection",
        own(kernel.tag(kernel.box([-0.8, -0.8, 0], [1.6, 1.6, 1.6]), 1)),
        own(kernel.tag(kernel.sphere([0, 0, 0.8], 1.05), 2)),
      ),
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

describe("OCCT handles", () => {
  /** A boolean's operands, made and tagged; `curved` is a box through a sphere, with degree-8 curves. */
  function operands(k: OcctKernel, curved: boolean) {
    return curved
      ? {
          operation: "intersection" as const,
          a: k.tag(k.box([-0.8, -0.8, 0], [1.6, 1.6, 1.6]), 1),
          b: k.tag(k.sphere([0, 0, 0.8], 1.05), 2),
        }
      : {
          operation: "difference" as const,
          a: k.tag(k.box([0, 0, 0], [2, 2, 1]), 1),
          b: k.tag(k.cylinder([1, 1, -0.5], 0.5, 2), 2),
        };
  }

  /** Makes, checks and converts a boolean, then frees all its solids. */
  function churn(k: OcctKernel, curved = false): void {
    const { operation, a, b } = operands(k, curved);
    const result = k.boolean(operation, a, b);
    try {
      k.toForm(result);
      k.isValid(result);
      k.volume(result);
      k.faceCount(result);
    } finally {
      for (const solid of [result, b, a]) {
        solid.delete();
      }
    }
  }

  // A forgotten handle isn't freed until the garbage collector reaches it,
  // so counting live handles is what shows a leak: this code once left 442
  // alive after one boolean and conversion.
  it("leaves none alive after a boolean's solids are deleted", () => {
    const tracker = trackHandles(oc);
    const tracked = new OcctKernel(tracker.module);
    const { operation, a, b } = operands(tracked, false);
    const cut = tracked.boolean(operation, a, b);
    tracked.toForm(cut);
    // The solids and their tagged faces: the only handles that outlive a call.
    expect(tracker.live()).toBeGreaterThan(0);
    for (const solid of [cut, b, a]) {
      solid.delete();
    }
    expect(tracker.describe()).toEqual([]);
    churn(tracked, true);
    expect(tracker.describe()).toEqual([]);
  });

  it("keeps the WASM heap from growing over 200 conversions", () => {
    for (let i = 0; i < 10; i++) {
      churn(kernel);
    }
    churn(kernel, true);
    const before = oc.wasmMemory.buffer.byteLength;
    for (let i = 0; i < 200; i++) {
      churn(kernel);
    }
    for (let i = 0; i < 10; i++) {
      churn(kernel, true);
    }
    const grown = oc.wasmMemory.buffer.byteLength - before;
    expect(grown).toBeLessThanOrEqual(4 * 1024 * 1024);
  }, 120_000);

  it("deletes a solid once", () => {
    const solid = kernel.tag(kernel.box([0, 0, 0], [1, 1, 1]), 1);
    solid.delete();
    expect(() => solid.delete()).not.toThrow();
  });
});

describe("OCCT STEP files", () => {
  /** Exports a solid, imports and converts it. */
  function roundTrip(solid: OcctSolid, inside: Inside) {
    const imported = kernel.importStep(kernel.exportStep(solid));
    imported.forEach(own);
    expect(imported.length).toBe(1);
    const back = imported[0]!;
    const brep = expectSolid(back, inside);
    expect(kernel.isValid(back)).toBe(true);
    return { solid: back, brep };
  }

  it("round-trips a box minus a cylinder in metres, faces and volume kept", () => {
    const cut = own(
      kernel.boolean(
        "difference",
        own(kernel.box([0, 0, 0], [2, 2, 1])),
        own(kernel.cylinder([1, 1, -0.5], 0.5, 2)),
      ),
    );
    const { solid, brep } = roundTrip(
      cut,
      (x, y, z) =>
        inBox([0, 0, 0], [2, 2, 1])(x, y, z) && Math.hypot(x - 1, y - 1) > 0.5,
    );
    expect(kernel.volume(solid)).toBeCloseTo(kernel.volume(cut), 9);
    expect(kernel.faceCount(solid)).toBe(kernel.faceCount(cut));
    expect(kinds(brep)).toEqual(kinds(kernel.toForm(cut)));
    expect(kinds(brep)).toEqual({
      [SurfaceKind.Plane]: 6,
      [SurfaceKind.Cylinder]: 1,
    });
  });

  it("round-trips a box united with a sphere on its corner", () => {
    const box = inBox([0, 0, 0], [2, 2, 2]);
    const ball: Inside = (x, y, z) => Math.hypot(x, y, z) < 1.2;
    const union = own(
      kernel.boolean(
        "union",
        own(kernel.box([0, 0, 0], [2, 2, 2])),
        own(kernel.sphere([0, 0, 0], 1.2)),
      ),
    );
    const { solid, brep } = roundTrip(
      union,
      (x, y, z) => box(x, y, z) || ball(x, y, z),
    );
    expect(kernel.volume(solid)).toBeCloseTo(kernel.volume(union), 9);
    expect(kinds(brep)).toEqual(kinds(kernel.toForm(union)));
    expect(kinds(brep)[SurfaceKind.Sphere]).toBe(1);
  });

  // OCCT 8's STEP reader returns the complementary patch (the corner's 1/8
  // of the ball, not the 7/8 outside) for this sphere face, whose loop runs
  // along the sphere's seam both ways. The sphere on the box's origin corner,
  // and the other primitives and booleans here, round-trip.
  it.fails("round-trips a sphere face with its seam in the loop", () => {
    const union = own(
      kernel.boolean(
        "union",
        own(kernel.box([0, 0, 0], [2, 2, 2])),
        own(kernel.sphere([2, 2, 2], 1.2)),
      ),
    );
    const [back] = kernel.importStep(kernel.exportStep(union));
    own(back!);
    expect(kernel.volume(back!)).toBeCloseTo(kernel.volume(union), 9);
  });

  it("imports every solid of a file", () => {
    const bytes = kernel.exportStep([
      own(kernel.box([0, 0, 0], [1, 1, 1])),
      own(kernel.sphere([5, 0, 0], 1)),
    ]);
    const solids = kernel.importStep(bytes);
    solids.forEach(own);
    expect(solids.map((s) => kernel.volume(s)).sort((a, b) => a - b)).toEqual([
      expect.closeTo(1, 9),
      expect.closeTo((4 / 3) * Math.PI, 9),
    ]);
  });

  it("frees what it makes, and throws on bytes that aren't STEP", () => {
    const tracker = trackHandles(oc);
    const tracked = new OcctKernel(tracker.module);
    const bytes = tracked.exportStep(own(kernel.box([0, 0, 0], [1, 1, 1])));
    expect(new TextDecoder().decode(bytes.subarray(0, 13))).toBe(
      "ISO-10303-21;",
    );
    expect(tracker.describe()).toEqual([]);
    const solids = tracked.importStep(bytes);
    expect(solids.length).toBe(1);
    solids.forEach((s) => s.delete());
    expect(tracker.describe()).toEqual([]);
    expect(() =>
      tracked.importStep(new TextEncoder().encode("not a STEP file")),
    ).toThrow(/STEP/);
    expect(tracker.describe()).toEqual([]);
  });
});
