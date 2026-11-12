// The update path's caches against the real kernels (the speed-ups of
// scripts/benchCsgUpdate.mjs): what is reused from the last update is what
// would have been made again, bit for bit; a tree edited a little at a time
// is as good a solid as the same tree made whole; and nothing is left alive.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { SCENES, bracket } from "../../spikes/csgRecipes.ts";
import { KernelClient } from "../../src/brep/kernelClient.ts";
import type { KernelName } from "../../src/brep/kernelProtocol.ts";
import {
  ExtractCache,
  OcctKernel,
  type OcctModule,
} from "../../src/brep/occt.ts";
import {
  createPrepareCache,
  prepareGpuPatches,
} from "../../src/brep/gpuPatches.ts";
import { SmlibKernel, type SmlibModule } from "../../src/brep/smlib.ts";
import { validateBrep } from "../../src/brep/validate.ts";
import { occtDirectory } from "../../scripts/occtTools.mjs";
import { smlibDirectory } from "../../scripts/smlibTools.mjs";
import { stepSamplesDirectory } from "../../scripts/stepSamples.mjs";
import { loopback } from "../kernelLoopback.ts";
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

const sample = () =>
  new Uint8Array(
    readFileSync(join(stepSamplesDirectory()!, "nist_ftc_06_asme1_rd.stp")),
  );

describe("the faces and edges Open CASCADE's conversion reuses", () => {
  it("make the form a conversion of everything would, for a part cut by a cylinder that moves", () => {
    const handles = trackHandles(oc);
    const kernel = new OcctKernel(handles.module);
    const [part] = kernel.importStep(sample());
    const cache = new ExtractCache();
    kernel.tag(part!, 1);
    const reused: number[] = [];
    for (let i = 0; i < 4; i++) {
      const cutter = kernel.place(
        kernel.cylinder([0.002 * i, 0, -0.1], 0.02, 0.2),
        { rotate: [90, 0, 0] },
      );
      kernel.tag(cutter, 2);
      const solid = kernel.boolean("difference", part!, cutter);
      const whole = kernel.toForm(solid);
      const partial = kernel.toForm(solid, { cache });
      expect(partial.form).toEqual(whole.form);
      expect(partial.faceTags).toEqual(whole.faceTags);
      reused.push(cache.reused);
      solid.delete();
      cutter.delete();
    }
    // The first conversion has nothing to reuse; the rest all but the cylinder's few faces.
    expect(reused[0]).toBe(0);
    expect(reused[3]).toBeGreaterThan(130);
    part!.delete();
    cache.release();
    expect(handles.describe()).toEqual([]);
  }, 120_000);

  it("reuse nothing for a different solid, and free what they hold", () => {
    const handles = trackHandles(oc);
    const kernel = new OcctKernel(handles.module);
    const cache = new ExtractCache();
    const a = kernel.box([0, 0, 0], [1, 1, 1]);
    kernel.toForm(a, { cache });
    const b = kernel.sphere([0, 0, 0], 1);
    kernel.toForm(b, { cache });
    expect(cache.reused).toBe(0);
    // The same box twice: the second finds all six faces.
    kernel.toForm(a, { cache });
    kernel.toForm(a, { cache });
    expect(cache.reused).toBe(6);
    a.delete();
    b.delete();
    cache.release();
    expect(handles.describe()).toEqual([]);
  });
});

describe("the faces the GPU preparation reuses", () => {
  it("are prepared as a preparation of everything would, whether or not the face moved in the list", () => {
    const kernel = new OcctKernel(oc);
    const [part] = kernel.importStep(sample());
    const cache = createPrepareCache();
    const extract = new ExtractCache();
    let origin: Float64Array | undefined;
    for (let i = 0; i < 3; i++) {
      const cutter = kernel.place(
        kernel.cylinder([0.002 * i, 0, -0.1], 0.02, 0.2),
        { rotate: [90, 0, 0] },
      );
      const solid = kernel.boolean("difference", part!, cutter);
      const { form } = kernel.toForm(solid, { cache: extract });
      origin ??= prepareGpuPatches(form).origin;
      const partial = prepareGpuPatches(form, { origin, cache });
      const whole = prepareGpuPatches(form, { origin });
      expect(partial).toEqual(whole);
      if (i > 0) {
        expect(cache.reused).toBeGreaterThan(130);
      }
      solid.delete();
      cutter.delete();
    }
    // Another origin reuses nothing.
    const other = kernel.box([0, 0, 0], [1, 1, 1]);
    const { form } = kernel.toForm(other);
    prepareGpuPatches(form, { origin: Float64Array.of(5, 5, 5), cache });
    expect(cache.reused).toBe(0);
    other.delete();
    part!.delete();
    extract.release();
  }, 120_000);
});

describe.each<KernelName>(["occt", "smlib"])(
  "%s: a tree edited a little at a time",
  (kernel) => {
    const setup = () => {
      const handles = trackHandles(oc);
      const client = new KernelClient({
        createWorker: () =>
          loopback({
            loadOcct: async () => new OcctKernel(handles.module),
            loadSmlib: async () => new SmlibKernel(smlibModule),
          }),
      });
      return { client, handles };
    };

    /** What does not depend on the order the faces and the folds come in. */
    const summary = (
      made: Awaited<ReturnType<KernelClient["evaluate"]>>["result"],
    ) => {
      const tags = new Map<number, number>();
      for (const tag of made.faceTags!) {
        tags.set(tag, (tags.get(tag) ?? 0) + 1);
      }
      return {
        faces: made.form.faceSurface.length,
        tags: [...tags].sort((a, b) => a[0] - b[0]),
        bounds: made.bounds,
        spans: made.patches!.spans.length,
      };
    };

    it("is the solid the same tree made whole is (the bracket, one hole dragged)", async () => {
      const cached = setup();
      for (let i = 1; i <= 4; i++) {
        const recipe = bracket(0.01 * i);
        const edited = await cached.client.evaluate(kernel, recipe, {
          validate: true,
          prepare: true,
        });
        // A worker of its own, which has made nothing before.
        const fresh = setup();
        const whole = await fresh.client.evaluate(kernel, recipe, {
          validate: true,
          prepare: true,
        });
        fresh.client.dispose();
        expect(fresh.handles.describe()).toEqual([]);
        const a = summary(edited.result);
        const b = summary(whole.result);
        expect(a.faces).toBe(b.faces);
        expect(a.tags).toEqual(b.tags);
        expect(a.spans).toBe(b.spans);
        for (let k = 0; k < 3; k++) {
          expect(a.bounds.min[k]!).toBeCloseTo(b.bounds.min[k]!, 3);
          expect(a.bounds.max[k]!).toBeCloseTo(b.bounds.max[k]!, 3);
        }
        expect(edited.result.problems).toEqual([]);
        expect(validateBrep(edited.result.form)).toEqual([]);
      }
      cached.client.dispose();
      expect(cached.handles.describe()).toEqual([]);
    }, 120_000);

    it("drags other leaves, and puts the dragged one back, with the same result as whole", async () => {
      const cached = setup();
      const order = [0.0, 0.02, 0.0, -0.03, 0.0];
      for (const dx of order) {
        const recipe = bracket(dx);
        const edited = await cached.client.evaluate(kernel, recipe, {
          validate: true,
          prepare: true,
        });
        expect(edited.result.problems).toEqual([]);
        expect(summary(edited.result).faces).toBe(
          summary(
            (
              await (async () => {
                const fresh = setup();
                const made = await fresh.client.evaluate(kernel, recipe, {
                  prepare: true,
                });
                fresh.client.dispose();
                return made;
              })()
            ).result,
          ).faces,
        );
      }
      cached.client.dispose();
      expect(cached.handles.describe()).toEqual([]);
    }, 120_000);
  },
);

describe("occt: a STEP part cut by a cylinder that moves", () => {
  it("reuses the part's faces in the extraction and the preparation, and leaves nothing alive", async () => {
    const handles = trackHandles(oc);
    const client = new KernelClient({
      createWorker: () =>
        loopback({ loadOcct: async () => new OcctKernel(handles.module) }),
    });
    await client.registerStep(1, sample());
    const scene = SCENES.ftc06!;
    const reuse: number[] = [];
    const prepared: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const made = await client.evaluate("occt", scene.recipe(i * scene.drag), {
        validate: true,
        prepare: true,
      });
      // Whatever the validator finds (this cut leaves 0.1 µm gaps in two loops), a worker of its own finds too.
      const fresh = new KernelClient({
        createWorker: () =>
          loopback({ loadOcct: async () => new OcctKernel(handles.module) }),
      });
      await fresh.registerStep(1, sample());
      const whole = await fresh.evaluate("occt", scene.recipe(i * scene.drag), {
        validate: true,
      });
      fresh.dispose();
      expect(made.result.problems).toEqual(whole.result.problems);
      reuse.push(made.extractReused);
      prepared.push(made.result.facesReused ?? 0);
    }
    expect(reuse[0]).toBe(0);
    expect(reuse[2]).toBeGreaterThan(130);
    expect(prepared[2]).toBeGreaterThan(130);
    client.dispose();
    expect(handles.describe()).toEqual([]);
  }, 120_000);
});

describe("the solid cache leaves no solid alive", () => {
  it("frees the cached solids of a part's leaf when the part is released", async () => {
    const handles = trackHandles(oc);
    const client = new KernelClient({
      createWorker: () =>
        loopback({ loadOcct: async () => new OcctKernel(handles.module) }),
    });
    await client.registerStep(1, sample());
    await client.evaluate("occt", SCENES.ftc06!.recipe(0.002));
    const alive = handles.live();
    await client.releaseStep(1);
    expect(handles.live()).toBeLessThan(alive);
    client.dispose();
    expect(handles.describe()).toEqual([]);
  }, 120_000);
});
