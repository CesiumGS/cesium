// The CSG sample's recipes in the real kernels (plan §13.33): a tree of
// primitives and booleans, made in SMLib and in Open CASCADE behind the
// worker's loopback, comes back as one valid, outward-facing form whose
// faces are tagged by the leaf that made them; placements turn and move the
// same way in both kernels (and as the example's preview draws them); and
// Open CASCADE leaves no handle alive.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  defaultBracket,
  facesOfNode,
  facesToLeaves,
  findNode,
  leavesOf,
  recipeOf,
} from "../../examples/csg/tree.ts";
import { outlineOf } from "../../examples/csg/preview.ts";
import { KernelCancelled, KernelClient } from "../../src/brep/kernelClient.ts";
import type { KernelName, SolidRecipe } from "../../src/brep/kernelProtocol.ts";
import { OcctKernel, type OcctModule } from "../../src/brep/occt.ts";
import { SmlibKernel, type SmlibModule } from "../../src/brep/smlib.ts";
import { occtDirectory } from "../../scripts/occtTools.mjs";
import { smlibDirectory } from "../../scripts/smlibTools.mjs";
import { loopback } from "../kernelLoopback.ts";
import { expectSolidForm, inBox } from "./brepSolids.ts";
import { trackHandles } from "./occtHandles.ts";

let oc: OcctModule;
let smlibModule: SmlibModule;

beforeAll(async () => {
  const occt = occtDirectory();
  const smlib = smlibDirectory();
  if (!occt || !smlib) {
    throw new Error(
      "No OCCT or SMLib build: run npm run setup --workspace @cesium/next",
    );
  }
  oc = await (
    (await import(pathToFileURL(join(occt, "replicad_single.js")).href)) as {
      default: () => Promise<OcctModule>;
    }
  ).default();
  smlibModule = await (
    (await import(pathToFileURL(join(smlib, "smlib.mjs")).href)) as {
      default: () => Promise<SmlibModule>;
    }
  ).default();
}, 60_000);

function setup() {
  const handles = trackHandles(oc);
  const client = new KernelClient({
    createWorker: () =>
      loopback({
        loadOcct: async () => new OcctKernel(handles.module),
        loadSmlib: async () => new SmlibKernel(smlibModule),
      }),
  });
  return { client, handles };
}

const KERNELS: KernelName[] = ["smlib", "occt"];

/** A primitive as a one-leaf recipe. */
const leaf = (
  tag: number,
  primitive: Extract<SolidRecipe, { type: "primitive" }>["primitive"],
  placement?: Extract<SolidRecipe, { type: "primitive" }>["placement"],
): SolidRecipe => ({
  type: "primitive",
  tag,
  primitive,
  ...(placement ? { placement } : {}),
});

describe.each(KERNELS)("%s: placements", (kernel) => {
  const bounds = async (recipe: SolidRecipe) => {
    const { client, handles } = setup();
    const made = await client.evaluate(kernel, recipe);
    client.dispose();
    expect(handles.describe()).toEqual([]);
    return made.result.bounds;
  };
  // `formBounds` holds the form within a few mm on curved faces.
  const near = (actual: readonly number[], expected: number[]) =>
    expected.forEach((e, i) =>
      expect(Math.abs(actual[i]! - e)).toBeLessThan(3e-3),
    );

  it("turns about x by a right-handed angle, then moves", async () => {
    // A cylinder up z from the origin, turned +90° about x, lies along -y.
    const b = await bounds(
      leaf(
        1,
        { kind: "cylinder", base: [0, 0, 0], radius: 0.25, height: 1 },
        { rotate: [90, 0, 0], translate: [1, 2, 3] },
      ),
    );
    near(b.min, [0.75, 1, 2.75]);
    near(b.max, [1.25, 2, 3.25]);
  }, 60_000);

  it("turns about y, and about z, in that order after x", async () => {
    const y = await bounds(
      leaf(
        1,
        { kind: "cylinder", base: [0, 0, 0], radius: 0.25, height: 1 },
        { rotate: [0, 90, 0] },
      ),
    );
    near(y.min, [0, -0.25, -0.25]);
    near(y.max, [1, 0.25, 0.25]);
    // A box turned 90° about z: (x, y) goes to (-y, x).
    const z = await bounds(
      leaf(
        1,
        { kind: "box", origin: [1, 0, 0], size: [1, 2, 3] },
        { rotate: [0, 0, 90] },
      ),
    );
    near(z.min, [-2, 1, 0]);
    near(z.max, [0, 2, 3]);
    // x then z: a box [0,1] × [0,2] × [0,3] turned 90° about x becomes
    // [0,1] × [-3,0] × [0,2]; then 90° about z takes (x, y) to (-y, x).
    const xz = await bounds(
      leaf(
        1,
        { kind: "box", origin: [0, 0, 0], size: [1, 2, 3] },
        { rotate: [90, 0, 90] },
      ),
    );
    near(xz.min, [0, 0, 0]);
    near(xz.max, [3, 1, 2]);
  }, 60_000);

  it("is where the example's preview outline says", async () => {
    const tree = defaultBracket();
    for (const name of ["Fillet cutter", "Upright hole", "Countersink A"]) {
      const node = leavesOf(tree.root).find((l) => l.name === name)!;
      const outline = outlineOf(node);
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      outline.positions.forEach((v, i) => {
        lo[i % 3] = Math.min(lo[i % 3]!, v);
        hi[i % 3] = Math.max(hi[i % 3]!, v);
      });
      const b = await bounds(recipeOf(node)!);
      // The outline passes through the extreme circles, not the solid's corners, so compare along the axis the outline reaches.
      for (let a = 0; a < 3; a++) {
        expect(lo[a]!).toBeGreaterThanOrEqual(b.min[a]! - 1e-4);
        expect(hi[a]!).toBeLessThanOrEqual(b.max[a]! + 1e-4);
        expect(lo[a]!).toBeLessThanOrEqual(b.min[a]! + 0.05);
        expect(hi[a]!).toBeGreaterThanOrEqual(b.max[a]! - 0.05);
      }
    }
  }, 60_000);
});

describe.each(KERNELS)("%s: primitives", (kernel) => {
  it.each([
    ["a cone", 0.6, 0],
    ["a frustum", 0.6, 0.25],
  ])(
    "makes %s that is a valid, outward solid",
    async (_, r0, r1) => {
      const { client, handles } = setup();
      const made = await client.evaluate(
        kernel,
        leaf(1, {
          kind: "cone",
          base: [0, 0, 0],
          radiusBase: r0,
          radiusTop: r1,
          height: 1,
        }),
        { validate: true },
      );
      expect(made.result.problems).toEqual([]);
      expectSolidForm(made.result.form, (x, y, z) => {
        const radius = r0 + (r1 - r0) * z;
        return z >= 0 && z <= 1 && Math.hypot(x, y) <= radius;
      });
      client.dispose();
      expect(handles.describe()).toEqual([]);
    },
    60_000,
  );
});

describe.each(KERNELS)("%s: the default bracket", (kernel) => {
  it("comes back valid, tagged by leaf, and frees what it made", async () => {
    const { client, handles } = setup();
    const tree = defaultBracket();
    const stages: string[] = [];
    const made = await client.evaluate(kernel, recipeOf(tree.root)!, {
      validate: true,
      prepare: true,
      onStage: (s) => stages.push(s),
    });
    const { form, problems, faceTags, patches } = made.result;
    expect(problems).toEqual([]);
    expect(patches!.faces.length).toBe(form.faceSurface.length);
    expect(faceTags!.length).toBe(form.faceSurface.length);
    // Seven booleans: the union of three, the fillet, and five cuts.
    expect(made.booleans).toBe(8);
    expect(stages.filter((s) => s.includes("difference")).length).toBe(6);
    expect(made.kernelMs).toBeGreaterThan(0);

    // Every face names a leaf, and the leaves the result still shows are all
    // of them but the ones fully inside others (none here).
    const leaves = facesToLeaves(tree, faceTags!);
    expect(leaves.every((l) => l !== undefined)).toBe(true);
    const shown = new Set(leaves.map((l) => l!.name));
    expect(shown).toEqual(new Set(leavesOf(tree.root).map((l) => l.name)));

    // The fillet's cutter leaves one face, concave and tagged as the cutter;
    // each hole's wall is one face of its own leaf.
    const byName = (name: string) =>
      leaves.filter((l) => l!.name === name).length;
    expect(byName("Fillet cutter")).toBe(1);
    expect(byName("Upright hole")).toBeGreaterThanOrEqual(1);
    expect(byName("Hole A")).toBeGreaterThanOrEqual(1);
    expect(byName("Countersink A")).toBe(1);

    // A node's faces are those of the leaves under it.
    const body = findNode(tree, 2)!;
    expect(body.name).toBe("Body");
    const bodyFaces = facesOfNode(body, faceTags!);
    expect(bodyFaces.length).toBeGreaterThan(8);
    expect(facesOfNode(tree.root, faceTags!).length).toBe(
      form.faceSurface.length,
    );

    // The bracket is 2.4 by 1.5 (from y = -0.8) by 1.3.
    const { min, max } = made.result.bounds;
    expect(min[0]!).toBeCloseTo(-1.2, 3);
    expect(max[0]!).toBeCloseTo(1.2, 3);
    expect(min[1]!).toBeCloseTo(-0.8, 3);
    expect(max[1]!).toBeCloseTo(0.7, 3);
    expect(min[2]!).toBeCloseTo(0, 3);
    expect(max[2]!).toBeCloseTo(1.3, 3);

    client.dispose();
    expect(handles.describe()).toEqual([]);
  }, 120_000);

  it("keeps a union's tags apart through an intersection", async () => {
    const { client, handles } = setup();
    const made = await client.evaluate(kernel, {
      type: "boolean",
      operation: "intersection",
      operands: [
        leaf(7, { kind: "box", origin: [-1, -1, -1], size: [2, 2, 2] }),
        leaf(9, { kind: "sphere", centre: [0, 0, 0], radius: 1.25 }),
      ],
    });
    const tags = new Set(made.result.faceTags);
    expect(tags).toEqual(new Set([7, 9]));
    expectSolidForm(made.result.form, (x, y, z) => {
      return (
        inBox([-1, -1, -1], [1, 1, 1])(x, y, z) && Math.hypot(x, y, z) <= 1.25
      );
    });
    client.dispose();
    expect(handles.describe()).toEqual([]);
  }, 60_000);

  it("reports a failing recipe, and frees what it held", async () => {
    const { client, handles } = setup();
    await expect(
      client.evaluate(kernel, {
        type: "boolean",
        operation: "union",
        operands: [],
      }),
    ).rejects.toThrow(/no operands/);
    await expect(
      client.evaluate(kernel, {
        type: "boolean",
        operation: "union",
        operands: [
          leaf(1, { kind: "sphere", centre: [0, 0, 0], radius: 1 }),
          leaf(1, { kind: "sphere", centre: [0, 0, 0], radius: 1 }),
        ],
      }),
    ).rejects.toThrow(/isn't unique/);
    client.dispose();
    expect(handles.describe()).toEqual([]);
  }, 60_000);

  it("frees what a superseded evaluation held", async () => {
    const { client, handles } = setup();
    await client.load(kernel);
    const recipe = recipeOf(defaultBracket().root)!;
    const first = client.evaluate(kernel, recipe);
    const second = client.evaluate(kernel, recipe);
    await expect(first).rejects.toBeInstanceOf(KernelCancelled);
    await second;
    client.dispose();
    expect(handles.describe()).toEqual([]);
  }, 120_000);
});
