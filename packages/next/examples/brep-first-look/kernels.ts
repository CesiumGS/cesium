import type { BrepForm } from "../../src/index.ts";
import { OcctKernel } from "../../src/brep/occt.ts";
import { SmlibKernel } from "../../src/brep/smlib.ts";

/**
 * The CSG spike's two kernels (plan §13.33): the same three booleans made
 * live by SMLib and by Open CASCADE in WebAssembly, each converted to the
 * engine's one render form. Each input's faces are tagged first, so every
 * face of a result says which input it came from. The modules load only when
 * the Kernels scene is first shown, from the dev server's /smlib/ and /occt/
 * (npm run setup fetches and builds them), on the main thread: the CSG
 * sample will run them in a worker.
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
      let start = performance.now();
      const result = kernel.boolean(
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
    "Open CASCADE": async () => occtRunner(await OcctKernel.load()),
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
