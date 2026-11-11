// The b-rep section on real solids (src/brep/section.ts, plan §13.26 caps):
// NIST's STEP models through Open CASCADE (CTC-05 is a real CAD part of 208
// faces, with tolerances) and SMLib's solids (every face Bézier patches).
// Run with `npm run test:data`. The cap areas of the STEP models are checked
// against the signed area of a fine tessellation's section (the mesh path's
// cut); the SMLib sphere, torus and cone against their analytic sections.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BrepForm } from "../../src/brep/form.ts";
import {
  OcctKernel,
  type OcctModule,
  type OcctSolid,
} from "../../src/brep/occt.ts";
import { sectionBrep } from "../../src/brep/section.ts";
import {
  fromPlane,
  planeFrame,
  toPlane,
} from "../../src/brep/sectionCurves.ts";
import {
  SmlibKernel,
  type SmlibModule,
  type SmlibSolid,
} from "../../src/brep/smlib.ts";
import { validateBrep } from "../../src/brep/validate.ts";
import { brepGeometry } from "../../src/geometry/brep.ts";
import { occtDirectory } from "../../scripts/occtTools.mjs";
import { smlibDirectory } from "../../scripts/smlibTools.mjs";
import {
  STEP_SAMPLES,
  stepSamplesDirectory,
} from "../../scripts/stepSamples.mjs";

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

/** The vertices' box. */
function box(form: BrepForm): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const v = form.vertexPosition;
  for (let i = 0; i < v.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, v[i + k]!);
      max[k] = Math.max(max[k]!, v[i + k]!);
    }
  }
  return { min, max };
}

/**
 * The section's area by rays, which shares nothing with the section: along
 * each of `rows` lines of the plane across the caps' box, the exact ray hits
 * of `brepGeometry` (stepped past each one) bound the stretches inside the
 * solid, and the lengths are summed over the rows (midpoint rule across).
 */
function rayParityArea(
  form: BrepForm,
  point: number[],
  normal: number[],
  caps: BrepForm,
  rows = 400,
): number {
  const exact = brepGeometry(form);
  const frame = planeFrame(point, normal);
  const lo = [Infinity, Infinity];
  const hi = [-Infinity, -Infinity];
  // The control points of the caps' edges: their hulls hold the curves (a circle has one vertex).
  const c = caps.curves3.points;
  for (let i = 0; i < c.length; i += 4) {
    const w = c[i + 3]!;
    const p = toPlane(frame, [c[i]! / w, c[i + 1]! / w, c[i + 2]! / w]);
    for (let k = 0; k < 2; k++) {
      lo[k] = Math.min(lo[k]!, p[k]!);
      hi[k] = Math.max(hi[k]!, p[k]!);
    }
  }
  const margin = 0.1 * (hi[0]! - lo[0]!) + 1e-6;
  const u0 = lo[0]! - margin;
  const u1 = hi[0]! + margin;
  const hv = (hi[1]! - lo[1]!) / rows;
  let area = 0;
  for (let j = 0; j < rows; j++) {
    const y = lo[1]! + (j + 0.5) * hv;
    const from = Float64Array.from(fromPlane(frame, [u0, y]));
    const to = Float64Array.from(fromPlane(frame, [u1, y]));
    const ts: number[] = [];
    let t = 0;
    for (let k = 0; k < 200; k++) {
      const answer = exact.rayHit({ from, to }, { tMin: t });
      if (answer.verdict !== "hit") {
        break;
      }
      ts.push(answer.hit.t);
      t = answer.hit.t + 1e-9;
    }
    for (let k = 0; k + 1 < ts.length; k += 2) {
      area += (ts[k + 1]! - ts[k]!) * (u1 - u0) * hv;
    }
  }
  return area;
}

describe("sectionBrep on NIST's STEP models through Open CASCADE", () => {
  it("CTC-05: caps through it in each axis close and validate, and the middle ones match ray parity", () => {
    const form = stepForm("nist_ctc_05_asme1_rd.stp");
    expect(form.faceSurface.length).toBe(208);
    const { min, max } = box(form);
    const centre = [0, 1, 2].map((k) => (min[k]! + max[k]!) / 2);
    const results: string[] = [];
    for (const axis of [0, 1, 2]) {
      for (const share of [0.3, 0.5, 0.7]) {
        const point = [...centre];
        point[axis] = min[axis]! + share * (max[axis]! - min[axis]!);
        const normal = [0, 0, 0];
        normal[axis] = 1;
        const start = performance.now();
        const result = sectionBrep(form, [{ point, normal }]);
        const ms = performance.now() - start;
        expect(result.report.openChains, `axis ${axis} at ${share}`).toEqual(
          [],
        );
        expect(result.report.strayLoops).toBe(0);
        if (!result.form) {
          continue;
        }
        expect(validateBrep(result.form), `axis ${axis} at ${share}`).toEqual(
          [],
        );
        const area = result.faces.reduce((s, f) => s + f.area, 0);
        let line = `axis ${axis} ${share}: ${result.faces.length} caps, ${area.toExponential(4)} m², ${ms.toFixed(0)} ms, fit ${result.report.fitError.toExponential(1)}`;
        if (share === 0.5) {
          const oracle = rayParityArea(form, point, normal, result.form);
          line += `, ray parity ${oracle.toExponential(4)}`;
          // 400 rows over the caps' box: the rows' own error is a fraction of a percent.
          expect(Math.abs(area - oracle)).toBeLessThan(0.01 * oracle);
        }
        results.push(line);
      }
    }
    process.stderr.write(`CTC-05 sections:\n  ${results.join("\n  ")}\n`);
    expect(results.length).toBeGreaterThan(4);
  }, 300_000);

  it("CTC-05: an aslant plane through it closes as well, and matches ray parity", () => {
    const form = stepForm("nist_ctc_05_asme1_rd.stp");
    const { min, max } = box(form);
    const point = [0, 1, 2].map((k) => (min[k]! + max[k]!) / 2);
    const normal = [0.3, 0.5, 0.81];
    const result = sectionBrep(form, [{ point, normal }]);
    expect(result.report.openChains).toEqual([]);
    expect(result.form).toBeDefined();
    expect(validateBrep(result.form!)).toEqual([]);
    const area = result.faces.reduce((s, f) => s + f.area, 0);
    const oracle = rayParityArea(form, point, normal, result.form!);
    expect(Math.abs(area - oracle)).toBeLessThan(0.01 * oracle);
  }, 300_000);

  it.each(STEP_SAMPLES.map(({ file }) => file))(
    "%s: a plane through its middle closes and validates",
    (file) => {
      const form = stepForm(file);
      const { min, max } = box(form);
      const point = [0, 1, 2].map((k) => (min[k]! + max[k]!) / 2);
      const result = sectionBrep(form, [{ point, normal: [0, 0, 1] }]);
      expect(result.report.openChains).toEqual([]);
      expect(result.report.strayLoops).toBe(0);
      if (result.form) {
        expect(validateBrep(result.form)).toEqual([]);
        const area = result.faces.reduce((s, f) => s + f.area, 0);
        const oracle = rayParityArea(form, point, [0, 0, 1], result.form);
        expect(Math.abs(area - oracle)).toBeLessThan(0.01 * oracle);
      }
    },
    300_000,
  );
});

describe("sectionBrep on SMLib's solids (Bézier patches)", () => {
  it("a sphere: the section is the circle, within the tolerance", () => {
    const solid = smlibKernel.sphere([0.5, -1, 2], 1.5);
    owned.push(solid);
    const { form } = smlibKernel.toForm(solid);
    const h = 0.4;
    const result = sectionBrep(
      form,
      [{ point: [0.5, -1, 2 + h], normal: [0, 0, 1] }],
      { tolerance: 1e-6 },
    );
    expect(result.report.openChains).toEqual([]);
    expect(result.faces).toHaveLength(1);
    // Patches stand within their surface error of the sphere.
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI * (1.5 * 1.5 - h * h), 4);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("a torus: an annulus square to the axis, and a tilted section that closes", () => {
    const solid = smlibKernel.torus([0, 0, 0], 2, 0.5);
    owned.push(solid);
    const { form } = smlibKernel.toForm(solid);
    const h = 0.2;
    const flat = sectionBrep(form, [{ point: [0, 0, h], normal: [0, 0, 1] }], {
      tolerance: 1e-6,
    });
    expect(flat.report.openChains).toEqual([]);
    const k = Math.sqrt(0.25 - h * h);
    expect(flat.faces.reduce((s, f) => s + f.area, 0)).toBeCloseTo(
      4 * Math.PI * 2 * k,
      3,
    );
    expect(validateBrep(flat.form!)).toEqual([]);
    const tilted = sectionBrep(
      form,
      [{ point: [0, 0, 0.1], normal: [0.1, 0, 1] }],
      { tolerance: 1e-6 },
    );
    expect(tilted.report.openChains).toEqual([]);
    expect(tilted.faces.length).toBeGreaterThan(0);
    expect(validateBrep(tilted.form!)).toEqual([]);
  });

  it("a cone frustum: a circle at a height", () => {
    const solid = smlibKernel.cone([0, 0, 0], 1, 0.4, 1.5);
    owned.push(solid);
    const { form } = smlibKernel.toForm(solid);
    const z = 0.6;
    const rho = 1 + ((0.4 - 1) * z) / 1.5;
    const result = sectionBrep(
      form,
      [{ point: [0, 0, z], normal: [0, 0, 1] }],
      { tolerance: 1e-6 },
    );
    expect(result.report.openChains).toEqual([]);
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI * rho * rho, 4);
  });

  it("a box minus a cylinder: the square with a hole", () => {
    const box1 = smlibKernel.box([0, 0, 0], [2, 2, 1]);
    const hole = smlibKernel.cylinder([1, 1, -0.5], 0.5, 2);
    const cut = smlibKernel.boolean("difference", box1, hole);
    owned.push(box1, hole, cut);
    const { form } = smlibKernel.toForm(cut);
    const result = sectionBrep(
      form,
      [{ point: [0, 0, 0.5], normal: [0, 0, 1] }],
      { tolerance: 1e-6 },
    );
    expect(result.report.openChains).toEqual([]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.holes).toBe(1);
    expect(result.faces[0]!.area).toBeCloseTo(4 - Math.PI * 0.25, 4);
  });
});
