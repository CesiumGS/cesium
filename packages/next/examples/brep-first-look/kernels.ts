import type { BrepForm } from "../../src/index.ts";
import { OcctKernel, type OcctSolid } from "../../src/brep/occt.ts";
import { SmlibKernel } from "../../src/brep/smlib.ts";

/**
 * The kernels behind the example's second and third scenes. The CSG spike's
 * (plan §13.33): the same three booleans made live by SMLib and by Open
 * CASCADE in WebAssembly, each converted to the engine's one render form.
 * Each input's faces are tagged first, so every face of a result says which
 * input it came from. The STEP scene imports NIST's parts through the same
 * Open CASCADE module, loaded once for both. The modules load only when a
 * scene needs them, from the dev server's /smlib/ and /occt/ (npm run setup
 * fetches and builds them), on the main thread: the CSG sample will run them
 * in a worker.
 */

/** The primitives both kernels make the same way, m. */
interface Primitives<S> {
  box(origin: ArrayLike<number>, size: ArrayLike<number>): S;
  cylinder(base: ArrayLike<number>, radius: number, height: number): S;
  sphere(centre: ArrayLike<number>, radius: number): S;
}

export type Operation = "difference" | "union" | "intersection";

/** A boolean of two primitives, named for the panel. */
interface Recipe {
  name: string;
  operation: Operation;
  a: string;
  b: string;
  make<S>(k: Primitives<S>): [S, S];
  /** How big the result is drawn. */
  scale: number;
}

export const RECIPES: readonly Recipe[] = [
  {
    name: "Box minus a cylinder",
    operation: "difference",
    a: "the box",
    b: "the cylinder",
    make: (k) => [
      k.box([-1, -1, 0], [2, 2, 1]),
      k.cylinder([0, 0, -0.5], 0.5, 2),
    ],
    scale: 0.9,
  },
  {
    name: "Box and sphere, united",
    operation: "union",
    a: "the box",
    b: "the sphere",
    make: (k) => [
      k.box([-0.8, -0.8, 0], [1.6, 1.6, 1.6]),
      k.sphere([0.8, 0.8, 1.6], 0.7),
    ],
    scale: 0.8,
  },
  {
    name: "Box and sphere, intersected",
    operation: "intersection",
    a: "the box",
    b: "the sphere",
    make: (k) => [
      k.box([-0.8, -0.8, 0], [1.6, 1.6, 1.6]),
      k.sphere([0, 0, 0.8], 1.05),
    ],
    scale: 1.1,
  },
];

export type KernelName = "SMLib" | "Open CASCADE";
export const KERNELS: readonly KernelName[] = ["SMLib", "Open CASCADE"];

/** The one Open CASCADE module, loaded on first use and shared by the scenes. */
let occtLoad: Promise<OcctKernel> | undefined;
function loadOcct(): Promise<OcctKernel> {
  occtLoad ??= OcctKernel.load().catch((error: unknown) => {
    occtLoad = undefined;
    throw error;
  });
  return occtLoad;
}

/** One recipe made by one kernel. */
export interface KernelResult {
  kernel: KernelName;
  recipe: Recipe;
  form?: BrepForm;
  /** Per face: the input it came from. */
  faceSources?: string[];
  booleanMs?: number;
  convertMs?: number;
  /** Why it failed, when it did. */
  problem?: string;
}

export interface KernelLoad {
  kernel: KernelName;
  ms?: number;
  problem?: string;
}

/** One kernel behind the same calls: make a recipe, tag, boolean, convert. */
interface Runner {
  run(recipe: Recipe): Omit<KernelResult, "kernel" | "recipe">;
}

function sources(tags: Int32Array, recipe: Recipe): string[] {
  return Array.from(tags, (tag) =>
    tag === 1 ? recipe.a : tag === 2 ? recipe.b : "neither input",
  );
}

function smlibRunner(kernel: SmlibKernel): Runner {
  return {
    run(recipe) {
      const [a, b] = recipe.make(kernel);
      kernel.tag(a, 1);
      kernel.tag(b, 2);
      let start = performance.now();
      const result = kernel.boolean(recipe.operation, a, b);
      const booleanMs = performance.now() - start;
      start = performance.now();
      try {
        const brep = kernel.toForm(result);
        return {
          form: brep.form,
          faceSources: sources(brep.faceTags, recipe),
          booleanMs,
          convertMs: performance.now() - start,
        };
      } finally {
        result.delete();
      }
    },
  };
}

function occtRunner(kernel: OcctKernel): Runner {
  return {
    run(recipe) {
      const [a, b] = recipe.make(kernel);
      let result: OcctSolid | undefined;
      try {
        let start = performance.now();
        result = kernel.boolean(
          recipe.operation,
          kernel.tag(a, 1),
          kernel.tag(b, 2),
        );
        const booleanMs = performance.now() - start;
        start = performance.now();
        const brep = kernel.toForm(result);
        return {
          form: brep.form,
          faceSources: sources(brep.faceTags, recipe),
          booleanMs,
          convertMs: performance.now() - start,
        };
      } finally {
        // OCCT's solids are the caller's to free; the form is its own copy.
        result?.delete();
        b.delete();
        a.delete();
      }
    },
  };
}

/** Loads both kernels and makes every recipe in each. Never throws: failures are in the results. */
export async function runKernels(): Promise<{
  loads: KernelLoad[];
  results: KernelResult[];
}> {
  const loaders: Record<KernelName, () => Promise<Runner>> = {
    SMLib: async () => smlibRunner(await SmlibKernel.load()),
    "Open CASCADE": async () => occtRunner(await loadOcct()),
  };
  const loads: KernelLoad[] = [];
  const results: KernelResult[] = [];
  // Both modules download at once; each then runs on its own.
  const loaded = await Promise.all(
    KERNELS.map(async (kernel) => {
      const start = performance.now();
      try {
        const runner = await loaders[kernel]();
        loads.push({ kernel, ms: performance.now() - start });
        return runner;
      } catch (error) {
        loads.push({
          kernel,
          problem: `didn't load (${String(error)}); npm run setup fetches it, and the dev server serves it`,
        });
        return undefined;
      }
    }),
  );
  for (const recipe of RECIPES) {
    KERNELS.forEach((kernel, k) => {
      const runner = loaded[k];
      if (!runner) {
        results.push({ kernel, recipe, problem: "not loaded" });
        return;
      }
      try {
        results.push({ kernel, recipe, ...runner.run(recipe) });
      } catch (error) {
        results.push({ kernel, recipe, problem: String(error) });
      }
    });
  }
  loads.sort((a, b) => KERNELS.indexOf(a.kernel) - KERNELS.indexOf(b.kernel));
  return { loads, results };
}

/** One of NIST's test models in the store (scripts/stepSamples.mjs pins the same files). */
export interface StepSample {
  /** As NIST names it. */
  name: string;
  /** What it is, in a few words. */
  description: string;
  /** The file in /step-samples/. */
  file: string;
}

export const STEP_SAMPLES: readonly StepSample[] = [
  {
    name: "FTC-11",
    description:
      "Fully-toleranced test case 11: a thin 63 mm ring with rounded edges. Six faces, the simplest.",
    file: "nist_ftc_11_asme1_rb.stp",
  },
  {
    name: "FTC-06",
    description:
      "Fully-toleranced test case 6: a block with a notched top and small holes, with planes, cylinders, cones, spheres and tori.",
    file: "nist_ftc_06_asme1_rd.stp",
  },
  {
    name: "FTC-10",
    description:
      "Fully-toleranced test case 10: a plate with a rectangular pocket, slots and mounting lugs, rich in tori.",
    file: "nist_ftc_10_asme1_rb.stp",
  },
  {
    name: "CTC-05",
    description:
      "Combined test case 5: a flanged base with bolt holes and a stepped post, with nine B-spline faces.",
    file: "nist_ctc_05_asme1_rd.stp",
  },
];

/** A STEP file read through Open CASCADE: one render form per solid. */
export interface StepImport {
  file: string;
  /** The file's size, bytes. */
  bytes: number;
  forms: BrepForm[];
  fetchMs: number;
  importMs: number;
  /** All the solids, together. */
  convertMs: number;
}

/** A STEP import, or why there isn't one. Never throws. */
export type StepLoad = StepImport | { problem: string };

/**
 * Fetches a NIST model from /step-samples/ and imports it with Open CASCADE:
 * the module loads on first use, the file's solids are converted to render
 * forms (in metres, whatever the file's units) and then freed, as the forms
 * are their own copy.
 */
export async function loadStep(file: string): Promise<StepLoad> {
  let start = performance.now();
  let bytes: Uint8Array;
  try {
    const response = await fetch(`/step-samples/${file}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    bytes = new Uint8Array(await response.arrayBuffer());
    // A server with no such folder answers with its home page.
    const magic = "ISO-10303-21";
    if (new TextDecoder().decode(bytes.subarray(0, magic.length)) !== magic) {
      throw new Error("not a STEP file");
    }
  } catch (error) {
    return {
      problem: `${file} didn't load (${String(error)}); npm run setup fetches NIST's models, and the dev server serves them`,
    };
  }
  const fetchMs = performance.now() - start;
  let kernel: OcctKernel;
  try {
    kernel = await loadOcct();
  } catch (error) {
    return {
      problem: `Open CASCADE didn't load (${String(error)}); npm run setup fetches it, and the dev server serves it`,
    };
  }
  let solids: OcctSolid[] = [];
  try {
    start = performance.now();
    solids = kernel.importStep(bytes);
    const importMs = performance.now() - start;
    start = performance.now();
    const forms = solids.map((solid) => kernel.toForm(solid).form);
    return {
      file,
      bytes: bytes.length,
      forms,
      fetchMs,
      importMs,
      convertMs: performance.now() - start,
    };
  } catch (error) {
    return { problem: `${file}: ${String(error)}` };
  } finally {
    solids.forEach((solid) => solid.delete());
  }
}
