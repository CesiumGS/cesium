// NIST's STEP test models through Open CASCADE (plan §13.33, the b-rep example's
// "STEP file" scene): the files `npm run setup` keeps in the store are the
// pinned ones, each imports in metres, converts to a render form, faces
// outward, and has the faces, kinds and size it is known to have. Three
// validate clean; CTC-05, a real CAD part, has tolerance-level problems, which
// are recorded below and held to a documented bound rather than hidden.
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { SurfaceKind } from "../../src/brep/form.ts";
import {
  OcctKernel,
  type OcctModule,
  type OcctSolid,
} from "../../src/brep/occt.ts";
import { tessellateBrep } from "../../src/brep/tessellate.ts";
import { formBounds } from "../../src/brep/formBounds.ts";
import { validateBrep } from "../../src/brep/validate.ts";
import { occtDirectory } from "../../scripts/occtTools.mjs";
import {
  STEP_SAMPLES,
  ensureStepSamples,
  stepSamplesDirectory,
  verifyStepSamples,
} from "../../scripts/stepSamples.mjs";
import { STEP_SAMPLES as EXAMPLE_SAMPLES } from "../../examples/brep-first-look/kernels.ts";

const directory = occtDirectory();
const samples = stepSamplesDirectory();
let kernel: OcctKernel;

beforeAll(async () => {
  if (!directory) {
    throw new Error(
      "No OCCT build: run npm run setup --workspace @cesium/next",
    );
  }
  if (!samples) {
    throw new Error(
      "No NIST STEP samples: run npm run setup --workspace @cesium/next (or node scripts/stepSamples.mjs)",
    );
  }
  const imported = (await import(
    pathToFileURL(join(directory, "replicad_single.js")).href
  )) as { default: () => Promise<OcctModule> };
  kernel = new OcctKernel(await imported.default());
}, 30_000);

const owned: OcctSolid[] = [];
afterEach(() => {
  owned.splice(0).forEach((solid) => solid.delete());
});

/** What each file is known to hold, from the first import (OCCT 8, 2026-11-10). */
const EXPECTED: Record<
  string,
  {
    faces: number;
    kinds: Partial<Record<SurfaceKind, number>>;
    /** Extent along x, y and z, m. */
    size: [number, number, number];
    /** Validation problems: the file's own tolerance-level ones. */
    problems: number;
  }
> = {
  "nist_ftc_11_asme1_rb.stp": {
    faces: 6,
    kinds: {
      [SurfaceKind.Plane]: 2,
      [SurfaceKind.Cylinder]: 2,
      [SurfaceKind.Torus]: 2,
    },
    size: [0.063, 0.063, 0.003],
    problems: 0,
  },
  "nist_ftc_06_asme1_rd.stp": {
    faces: 144,
    kinds: {
      [SurfaceKind.Plane]: 71,
      [SurfaceKind.Cylinder]: 58,
      [SurfaceKind.Cone]: 4,
      [SurfaceKind.Sphere]: 5,
      [SurfaceKind.Torus]: 6,
    },
    size: [0.3048, 0.0978, 0.2476],
    problems: 0,
  },
  "nist_ftc_10_asme1_rb.stp": {
    faces: 214,
    kinds: {
      [SurfaceKind.Plane]: 53,
      [SurfaceKind.Cylinder]: 103,
      [SurfaceKind.Cone]: 8,
      [SurfaceKind.Sphere]: 10,
      [SurfaceKind.Torus]: 39,
      [SurfaceKind.Bezier]: 1,
    },
    size: [0.158, 0.031, 0.075],
    problems: 0,
  },
  "nist_ctc_05_asme1_rd.stp": {
    faces: 208,
    kinds: {
      [SurfaceKind.Plane]: 62,
      [SurfaceKind.Cylinder]: 100,
      [SurfaceKind.Cone]: 26,
      [SurfaceKind.Sphere]: 4,
      [SurfaceKind.Torus]: 7,
      [SurfaceKind.Bezier]: 9,
    },
    size: [0.5271, 0.5588, 0.4826],
    // Open loops and uses off their edge, each by less than 20 µm on a part
    // 0.5 m across: the largest is 18.2 µm, in loop 111 (edge tolerance
    // 0.6 µm); the rest are under 0.5 µm, against edge tolerances of 0.1 to
    // 0.4 µm. OCCT calls the solid valid (BRepCheck_Analyzer).
    problems: 33,
  },
};

/** The largest gap a validation problem may report in a real CAD file, m. */
const CAD_GAP = 2e-5;

/** The enclosed volume of a tessellation, m³ (the divergence theorem over its triangles). */
function meshVolume(form: Parameters<typeof tessellateBrep>[0]): number {
  const { positions, indices } = tessellateBrep(form, {
    tolerance: 1e-4,
  }).faces;
  let six = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => indices[t + k]! * 3);
    const at = (i: number) => [
      positions[i]!,
      positions[i + 1]!,
      positions[i + 2]!,
    ];
    const [p, q, r] = [at(a!), at(b!), at(c!)] as [
      number[],
      number[],
      number[],
    ];
    six +=
      p[0]! * (q[1]! * r[2]! - q[2]! * r[1]!) -
      p[1]! * (q[0]! * r[2]! - q[2]! * r[0]!) +
      p[2]! * (q[0]! * r[1]! - q[1]! * r[0]!);
  }
  return six / 6;
}

describe("NIST STEP samples", () => {
  it("are the files the example lists, pinned and intact in the store", () => {
    expect(EXAMPLE_SAMPLES.map((s) => s.file)).toEqual(
      STEP_SAMPLES.map((s) => s.file),
    );
    expect(Object.keys(EXPECTED)).toEqual(STEP_SAMPLES.map((s) => s.file));
    verifyStepSamples(samples!);
    expect(readFileSync(join(samples!, "NOTICE.txt"), "utf8")).toContain(
      "10.18434/mds2-1452",
    );
  });

  it.each(STEP_SAMPLES.map(({ file }) => file))(
    "%s imports in metres, converts, and has its faces, kinds and size",
    (file) => {
      const expected = EXPECTED[file]!;
      const solids = kernel.importStep(
        new Uint8Array(readFileSync(join(samples!, file))),
      );
      owned.push(...solids);
      expect(solids.length).toBe(1);
      const solid = solids[0]!;
      expect(kernel.isValid(solid)).toBe(true);
      const { form } = kernel.toForm(solid);
      expect(form.faceSurface.length).toBe(expected.faces);
      const kinds: Record<number, number> = {};
      for (const surface of form.faceSurface) {
        const kind = form.surfaceIdentity[surface]!;
        kinds[kind] = (kinds[kind] ?? 0) + 1;
      }
      expect(kinds).toEqual(expected.kinds);

      // The file is in millimetres: metres here means a part of centimetres.
      const mesh = tessellateBrep(form, { tolerance: 5e-5 });
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      mesh.faces.positions.forEach((v, i) => {
        const p = v + mesh.origin[i % 3]!;
        min[i % 3] = Math.min(min[i % 3]!, p);
        max[i % 3] = Math.max(max[i % 3]!, p);
      });
      expected.size.forEach((extent, k) => {
        expect(max[k]! - min[k]!).toBeGreaterThan(extent - 5e-4);
        expect(max[k]! - min[k]!).toBeLessThan(extent + 5e-4);
      });

      // formBounds, from the form alone: holds the tessellation, to a share of the part's size.
      const bounds = formBounds(form);
      const longest = Math.max(...[0, 1, 2].map((k) => max[k]! - min[k]!));
      for (let k = 0; k < 3; k++) {
        expect(bounds.min[k]!).toBeLessThanOrEqual(min[k]! + 1e-6);
        expect(bounds.max[k]!).toBeGreaterThanOrEqual(max[k]! - 1e-6);
        expect(bounds.min[k]!).toBeGreaterThan(min[k]! - 0.05 * longest);
        expect(bounds.max[k]!).toBeLessThan(max[k]! + 0.05 * longest);
      }

      // Faces point outward as a whole: the mesh's volume is the solid's.
      const volume = kernel.volume(solid);
      expect(volume).toBeGreaterThan(0);
      const ratio = meshVolume(form) / volume;
      expect(ratio).toBeGreaterThan(0.97);
      expect(ratio).toBeLessThan(1.03);

      const problems = validateBrep(form);
      expect(problems.length).toBe(expected.problems);
      for (const problem of problems) {
        expect(["openLoop", "pcurveOffEdge"]).toContain(problem.kind);
        const gaps = [...problem.message.matchAll(/(\d[\d.e+-]*) m\b/g)].map(
          (m) => Number(m[1]),
        );
        expect(gaps.length).toBeGreaterThan(0);
        for (const gap of gaps) {
          expect(gap).toBeLessThan(CAD_GAP);
        }
      }
    },
  );
});

describe("NIST STEP samples' integrity check", () => {
  let copy: string;
  beforeAll(() => {
    copy = mkdtempSync(join(tmpdir(), "step-samples-"));
  });
  afterAll(() => {
    rmSync(copy, { recursive: true, force: true });
  });
  /** A fresh copy of the store, to damage. */
  const reset = () => {
    for (const { file } of STEP_SAMPLES) {
      copyFileSync(join(samples!, file), join(copy, file));
    }
    copyFileSync(join(samples!, "NOTICE.txt"), join(copy, "NOTICE.txt"));
  };

  it("rejects a file with one byte changed, naming it and both hashes", () => {
    reset();
    const target = STEP_SAMPLES[1]!;
    const bytes = readFileSync(join(copy, target.file));
    bytes[bytes.length >> 1] = bytes[bytes.length >> 1]! ^ 1;
    writeFileSync(join(copy, target.file), bytes);
    expect(() => verifyStepSamples(copy)).toThrow(
      new RegExp(`${target.file}: SHA-256 mismatch.*${target.sha256}`),
    );
  });

  it("rejects a truncated file and a missing one", () => {
    reset();
    const [first, second] = STEP_SAMPLES as [
      (typeof STEP_SAMPLES)[number],
      (typeof STEP_SAMPLES)[number],
    ];
    writeFileSync(
      join(copy, first.file),
      readFileSync(join(copy, first.file)).subarray(0, 100),
    );
    expect(() => verifyStepSamples(copy)).toThrow(
      new RegExp(`${first.file}: 100 bytes, expected ${first.bytes}`),
    );
    reset();
    rmSync(join(copy, second.file));
    expect(() => verifyStepSamples(copy)).toThrow(
      new RegExp(`${second.file}: missing`),
    );
  });

  it("makes ensureStepSamples fail on a store with a corrupted file, not refetch it", async () => {
    reset();
    const target = STEP_SAMPLES[0]!;
    const bytes = readFileSync(join(copy, target.file));
    bytes[0] = bytes[0]! ^ 1;
    writeFileSync(join(copy, target.file), bytes);
    await expect(
      ensureStepSamples(() => undefined, {
        store: copy,
        fetch: () => Promise.reject(new Error("must not fetch")),
      }),
    ).rejects.toThrow(/SHA-256 mismatch/);
  });
});
