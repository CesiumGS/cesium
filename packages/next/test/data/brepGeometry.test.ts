// The b-rep adapter on kernel forms from the setup store (plan §13.33): NIST's
// STEP models through Open CASCADE (analytic faces, trimmed, with real
// tolerances; CTC-05 is a real CAD part of 208 faces) and SMLib's solids (every
// face Bézier patches). Rays and closest points are checked against a dense
// tessellation, and CTC-05's cost per query is measured and bounded.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BrepForm } from "../../src/brep/form.ts";
import { formBounds } from "../../src/brep/formBounds.ts";
import {
  OcctKernel,
  type OcctModule,
  type OcctSolid,
} from "../../src/brep/occt.ts";
import {
  SmlibKernel,
  type SmlibModule,
  type SmlibSolid,
} from "../../src/brep/smlib.ts";
import { brepGeometry } from "../../src/geometry/brep.ts";
import { occtDirectory } from "../../scripts/occtTools.mjs";
import { smlibDirectory } from "../../scripts/smlibTools.mjs";
import {
  STEP_SAMPLES,
  stepSamplesDirectory,
} from "../../scripts/stepSamples.mjs";
import { checkAgainstMesh, random } from "../geometryBrepOracle.ts";

const occt = occtDirectory();
const smlib = smlibDirectory();
const samples = stepSamplesDirectory();
let occtKernel: OcctKernel;
let smlibKernel: SmlibKernel;
const owned: Array<OcctSolid | SmlibSolid> = [];

beforeAll(async () => {
  if (!occt || !samples || !smlib) {
    throw new Error(
      "No OCCT build, SMLib build or STEP samples: run npm run setup --workspace @cesium/next",
    );
  }
  const o = (await import(
    pathToFileURL(join(occt, "replicad_single.js")).href
  )) as {
    default: () => Promise<OcctModule>;
  };
  occtKernel = new OcctKernel(await o.default());
  const s = (await import(pathToFileURL(join(smlib, "smlib.mjs")).href)) as {
    default: () => Promise<SmlibModule>;
  };
  smlibKernel = new SmlibKernel(await s.default());
}, 60_000);

afterAll(() => {
  owned.splice(0).forEach((solid) => solid.delete());
});

function stepForm(file: string): BrepForm {
  const solids = occtKernel.importStep(
    new Uint8Array(readFileSync(join(samples!, file))),
  );
  owned.push(...solids);
  return occtKernel.toForm(solids[0]!).form;
}

/** The mean of `run` over `count` calls, in ms. */
function mean(count: number, run: (i: number) => void): number {
  const start = performance.now();
  for (let i = 0; i < count; i++) {
    run(i);
  }
  return (performance.now() - start) / count;
}

describe("brepGeometry on NIST's STEP models through Open CASCADE", () => {
  it.each(STEP_SAMPLES.map(({ file }) => file))(
    "%s: closest points and rays agree with a dense tessellation",
    (file) => {
      const form = stepForm(file);
      const exact = brepGeometry(form, { modelTolerance: 1e-7 });
      const found = checkAgainstMesh(form, exact, {
        points: 60,
        rays: 100,
        seed: 21,
      });
      // The trim polygon's sag can put a point just off a trim edge outside it.
      expect(found.outside / (found.points + found.hits)).toBeLessThan(0.03);
      expect(found.missed / found.rays).toBeLessThan(0.03);
      expect(found.agree / found.rays).toBeGreaterThan(0.8);
      expect(found.hits).toBeGreaterThan(found.rays / 10);
    },
    120_000,
  );

  it("CTC-05: the cost of each query", () => {
    const form = stepForm("nist_ctc_05_asme1_rd.stp");
    expect(form.faceSurface.length).toBe(208);
    const exact = brepGeometry(form);
    const box = formBounds(form);
    const diagonal = Math.hypot(
      box.max[0] - box.min[0],
      box.max[1] - box.min[1],
      box.max[2] - box.min[2],
    );
    const next = random(5);
    const centre = [0, 1, 2].map((k) => (box.min[k]! + box.max[k]!) / 2);
    const inside = () =>
      [0, 1, 2].map((k) => box.min[k]! + next() * (box.max[k]! - box.min[k]!));
    const around = () =>
      inside().map((x, k) => x + (next() - 0.5) * 0.4 * (centre[k]! - x));

    // The first query builds the hierarchy.
    const first = performance.now();
    exact.closestPoint(centre);
    const build = performance.now() - first;

    const rays = Array.from({ length: 200 }, () => {
      const dir = [next() - 0.5, next() - 0.5, next() - 0.5];
      const length = Math.hypot(...dir);
      const from = centre.map((c, k) => c + (dir[k]! / length) * diagonal);
      const target = inside();
      return {
        from: Float64Array.from(from),
        to: Float64Array.from(from.map((f, k) => f + 2 * (target[k]! - f))),
      };
    });
    const points = Array.from({ length: 200 }, around);
    const refinable = points.map((p) =>
      exact.closestPoint(p, { kinds: ["face"] })!,
    );

    const timings = {
      build,
      ray: mean(rays.length, (i) => exact.rayHit(rays[i]!)),
      rayAnyHit: mean(rays.length, (i) =>
        exact.rayHit(rays[i]!, { anyHit: true }),
      ),
      closestAll: mean(points.length, (i) => exact.closestPoint(points[i]!)),
      closestFace: mean(points.length, (i) =>
        exact.closestPoint(points[i]!, { kinds: ["face"] }),
      ),
      closestEdge: mean(points.length, (i) =>
        exact.closestPoint(points[i]!, { kinds: ["edge"] }),
      ),
      refinePick: mean(refinable.length, (i) =>
        exact.refinePick(refinable[i]!.entity.index, { point: points[i]! }),
      ),
      segment: mean(20, (i) =>
        exact.segmentDistance(points[i]!, points[i + 20]!),
      ),
    };
    process.stderr.write(
      `CTC-05 per query, ms: ${Object.entries(timings)
        .map(([k, v]) => `${k} ${v.toFixed(3)}`)
        .join(", ")}\n`,
    );
    // Bounds on the cost, with room for a busy machine.
    expect(timings.build).toBeLessThan(3000);
    expect(timings.ray).toBeLessThan(10);
    expect(timings.closestAll).toBeLessThan(20);
    expect(timings.closestFace).toBeLessThan(20);
    expect(timings.refinePick).toBeLessThan(20);
    expect(timings.segment).toBeLessThan(500);
  });

  it("CTC-05: every answer names its route and states its terms, in metres", () => {
    const form = stepForm("nist_ctc_05_asme1_rd.stp");
    const exact = brepGeometry(form);
    const box = formBounds(form);
    const next = random(8);
    const routes = new Set<string>();
    for (let i = 0; i < 150; i++) {
      const p = [0, 1, 2].map(
        (k) => box.min[k]! + next() * (box.max[k]! - box.min[k]!),
      );
      const a = exact.closestPoint(p)!;
      routes.add(a.accuracy.route!);
      expect(a.accuracy.exact).toBe(true);
      expect(a.accuracy.note).toContain(a.accuracy.route!);
      expect(a.accuracy.note).toContain("model 0.10 µm");
      // CAD tolerances: a model of half a metre is good to well under a millimetre.
      expect(a.accuracy.meters).toBeLessThan(1e-3);
      expect(a.accuracy.meters).toBeGreaterThan(1e-7);
    }
    // Planes, cylinders, and edges all came up.
    expect([...routes].some((r) => r.includes("plane"))).toBe(true);
    expect([...routes].some((r) => r.includes("cylinder"))).toBe(true);
    expect([...routes].some((r) => r.includes("edge"))).toBe(true);
  });
});

describe("brepGeometry on SMLib's solids (Bézier patches)", () => {
  it("a sphere: rays cross at the radius, closest points are at it, to float64", () => {
    const solid = smlibKernel.sphere([0.5, -1, 2], 1.5);
    owned.push(solid);
    const { form } = smlibKernel.toForm(solid);
    const exact = brepGeometry(form);
    const next = random(2);
    for (let i = 0; i < 60; i++) {
      const dir = [next() - 0.5, next() - 0.5, next() - 0.5];
      const length = Math.hypot(...dir);
      const centre = [0.5, -1, 2];
      const from = centre.map((c, k) => c + (dir[k]! / length) * 6);
      const a = exact.rayHit({
        from: Float64Array.from(from),
        to: Float64Array.from(centre),
      });
      expect(a.verdict).toBe("hit");
      if (a.verdict === "hit") {
        expect(
          Math.hypot(
            a.hit.position[0]! - 0.5,
            a.hit.position[1]! + 1,
            a.hit.position[2]! - 2,
          ),
        ).toBeCloseTo(1.5, 6);
        expect(a.hit.accuracy.route).toBe("Newton on Bézier patch");
      }
      const p = from.map((x, k) => x + (next() - 0.5) * 2 + 0 * k);
      const c = exact.closestPoint(p, { kinds: ["face"] })!;
      expect(c.distance).toBeCloseTo(
        Math.abs(Math.hypot(p[0]! - 0.5, p[1]! + 1, p[2]! - 2) - 1.5),
        6,
      );
    }
  });

  it("a box united with a sphere: agrees with a dense tessellation", () => {
    const box = smlibKernel.box([0, 0, 0], [2, 2, 2]);
    const ball = smlibKernel.sphere([2, 2, 2], 1.2);
    const union = smlibKernel.boolean("union", box, ball);
    owned.push(box, ball, union);
    const { form } = smlibKernel.toForm(union);
    const exact = brepGeometry(form);
    const found = checkAgainstMesh(form, exact, {
      points: 60,
      rays: 100,
      seed: 4,
    });
    expect(found.outside / (found.points + found.hits)).toBeLessThan(0.03);
    expect(found.missed / found.rays).toBeLessThan(0.03);
    expect(found.agree / found.rays).toBeGreaterThan(0.8);
    expect(found.hits).toBeGreaterThan(found.rays / 10);
  });
});
