import type { BrepForm } from "../../src/index.ts";
import type { BrepProblem } from "../../src/brep/validate.ts";
import {
  KernelClient,
  type KernelClientOptions,
} from "../../src/brep/kernelClient.ts";
import type {
  BooleanOperation,
  KernelForm,
  KernelName as WorkerKernel,
  Primitive,
} from "../../src/brep/kernelProtocol.ts";
import type { FormBounds } from "../../src/brep/formBounds.ts";
import type { GpuPatches } from "../../src/brep/gpuPatches.ts";

/**
 * The kernels behind the example's second and third scenes. The CSG spike's
 * (plan §13.33): the same three booleans made live by SMLib and by Open
 * CASCADE in WebAssembly, each converted to the engine's one render form.
 * Each input's faces are tagged first, so every face of a result says which
 * input it came from. The STEP scene imports NIST's parts through the same
 * Open CASCADE module, loaded once for both. The modules load only when a
 * scene needs them, from the dev server's /smlib/ and /occt/ (npm run setup
 * fetches and builds them), and run in Web Workers (`KernelClient`, one per
 * kernel, so the two work at once): the page only receives forms, with their
 * bounds and problems already worked out.
 */

export type Operation = BooleanOperation;

/** A boolean of two primitives, named for the panel. */
interface Recipe {
  name: string;
  operation: Operation;
  a: string;
  b: string;
  /** The inputs, m: the first is tagged 1 and the second 2. */
  inputs: readonly [Primitive, Primitive];
  /** How big the result is drawn. */
  scale: number;
}

export const RECIPES: readonly Recipe[] = [
  {
    name: "Box minus a cylinder",
    operation: "difference",
    a: "the box",
    b: "the cylinder",
    inputs: [
      { kind: "box", origin: [-1, -1, 0], size: [2, 2, 1] },
      { kind: "cylinder", base: [0, 0, -0.5], radius: 0.5, height: 2 },
    ],
    scale: 0.9,
  },
  {
    name: "Box and sphere, united",
    operation: "union",
    a: "the box",
    b: "the sphere",
    inputs: [
      { kind: "box", origin: [-0.8, -0.8, 0], size: [1.6, 1.6, 1.6] },
      { kind: "sphere", centre: [0.8, 0.8, 1.6], radius: 0.7 },
    ],
    scale: 0.8,
  },
  {
    name: "Box and sphere, intersected",
    operation: "intersection",
    a: "the box",
    b: "the sphere",
    inputs: [
      { kind: "box", origin: [-0.8, -0.8, 0], size: [1.6, 1.6, 1.6] },
      { kind: "sphere", centre: [0, 0, 0.8], radius: 1.05 },
    ],
    scale: 1.1,
  },
];

export type KernelName = "SMLib" | "Open CASCADE";
export const KERNELS: readonly KernelName[] = ["SMLib", "Open CASCADE"];
const WORKER_KERNEL: Record<KernelName, WorkerKernel> = {
  SMLib: "smlib",
  "Open CASCADE": "occt",
};

/** What a worker worked out of a form besides the form, by form. */
const measures = new WeakMap<BrepForm, KernelForm>();
/** A form's box, from the worker that made it (or undefined: ask `formBounds`). */
export function boundsFromKernel(form: BrepForm): FormBounds | undefined {
  return measures.get(form)?.bounds;
}
/** A form's `validateBrep` findings, from the worker that made it (or undefined: run it). */
export function problemsFromKernel(
  form: BrepForm,
): readonly BrepProblem[] | undefined {
  return measures.get(form)?.problems;
}
/** A form's GPU patches, prepared by the worker that made it (or undefined: `addBrep` prepares them). */
export function patchesFromKernel(form: BrepForm): GpuPatches | undefined {
  return measures.get(form)?.patches;
}
function remember(part: KernelForm): BrepForm {
  measures.set(part.form, part);
  return part.form;
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

/** Called as a load moves to its next stage. The kernels run in workers, so it isn't waited for. */
export type StageReporter = (stage: string) => void | Promise<void>;

function sources(tags: Int32Array, recipe: Recipe): string[] {
  return Array.from(tags, (tag) =>
    tag === 1 ? recipe.a : tag === 2 ? recipe.b : "neither input",
  );
}

/**
 * The kernels' workers for one visit to the example: one per kernel, made
 * when first needed and ended by `dispose`. Open CASCADE's serves the STEP
 * scene and the Two kernels scene both.
 */
export class KernelSession {
  private readonly clients: Record<KernelName, KernelClient>;

  constructor(options?: KernelClientOptions) {
    this.clients = {
      SMLib: new KernelClient(options),
      "Open CASCADE": new KernelClient(options),
    };
  }

  dispose(): void {
    for (const client of Object.values(this.clients)) {
      client.dispose();
    }
  }

  /** Loads both kernels and makes every recipe in each, the two kernels at once. Never throws: failures are in the results. */
  async runKernels(stage: StageReporter = () => undefined): Promise<{
    loads: KernelLoad[];
    results: KernelResult[];
  }> {
    const loads: KernelLoad[] = [];
    const results: KernelResult[] = [];
    void stage("Loading SMLib and Open CASCADE…");
    await Promise.all(
      KERNELS.map(async (kernel) => {
        const client = this.clients[kernel];
        const start = performance.now();
        try {
          await client.load(WORKER_KERNEL[kernel]);
          loads.push({ kernel, ms: performance.now() - start });
        } catch (error) {
          loads.push({
            kernel,
            problem: `didn't load (${String(error)}); npm run setup fetches it, and the dev server serves it`,
          });
          for (const recipe of RECIPES) {
            results.push({ kernel, recipe, problem: "not loaded" });
          }
          return;
        }
        for (const recipe of RECIPES) {
          void stage(`${kernel}: ${recipe.name}…`);
          try {
            const made = await client.boolean(
              WORKER_KERNEL[kernel],
              {
                operation: recipe.operation,
                a: recipe.inputs[0],
                b: recipe.inputs[1],
              },
              { validate: true, prepare: true },
            );
            results.push({
              kernel,
              recipe,
              form: remember(made.result),
              faceSources: sources(made.result.faceTags!, recipe),
              booleanMs: made.booleanMs,
              convertMs: made.convertMs,
            });
          } catch (error) {
            results.push({ kernel, recipe, problem: String(error) });
          }
        }
      }),
    );
    loads.sort((a, b) => KERNELS.indexOf(a.kernel) - KERNELS.indexOf(b.kernel));
    return { loads, results };
  }

  /**
   * Fetches a NIST model from /step-samples/ and imports it with Open
   * CASCADE in its worker (the module loads on first use): the file's solids
   * come back as render forms, in metres whatever the file's units, already
   * measured and checked.
   */
  async loadStep(
    file: string,
    stage: StageReporter = () => undefined,
  ): Promise<StepLoad> {
    void stage(`Fetching ${file}…`);
    const start = performance.now();
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
    const size = bytes.length;
    try {
      const imported = await this.clients["Open CASCADE"].importStep(bytes, {
        onStage: (text) => void stage(text),
        validate: true,
        prepare: true,
      });
      return {
        file,
        bytes: size,
        forms: imported.forms.map(remember),
        fetchMs,
        loadMs: imported.loadMs,
        importMs: imported.importMs,
        convertMs: imported.convertMs,
      };
    } catch (error) {
      return { problem: `${file}: ${String(error)}` };
    }
  }
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
  /** Loading the Open CASCADE module: 0 once it was loaded. */
  loadMs: number;
  importMs: number;
  /** All the solids, together. */
  convertMs: number;
}

/** A STEP import, or why there isn't one. Never throws. */
export type StepLoad = StepImport | { problem: string };
