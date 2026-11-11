import {
  KernelClient,
  type KernelClientOptions,
} from "../../src/brep/kernelClient.ts";
import type { BrepForm } from "../../src/brep/form.ts";
import type { FormBounds } from "../../src/brep/formBounds.ts";
import type { GpuPatches } from "../../src/brep/gpuPatches.ts";
import type { KernelName, SolidRecipe } from "../../src/brep/kernelProtocol.ts";
import type { BrepProblem } from "../../src/brep/validate.ts";

/**
 * Re-evaluating the tree as it is edited (plan §13.33, editing): the
 * kernels' workers, one per kernel so a switch costs no reload, and the
 * rate at which edits become evaluations.
 */

/** A recipe made by a kernel, with what the worker measured of it. */
export interface Evaluated {
  kernel: KernelName;
  form: BrepForm;
  /** Per face, the id of the leaf that made it (-1: the kernel gave none). */
  faceTags: Int32Array;
  bounds: FormBounds;
  /** Absent for a preview, which skips the check. */
  problems?: readonly BrepProblem[];
  /** For `World.addBrep`'s `prepared`: the worker did the preparing. */
  patches?: GpuPatches;
  /** A final evaluation, checked; false for one made while a parameter was still dragged. */
  final: boolean;
  booleans: number;
  timings: {
    /** Loading the kernel's module, when this request did. */
    loadMs: number;
    /** Primitives, placements and booleans in the kernel. */
    kernelMs: number;
    /** The kernel's solid to the render form. */
    convertMs: number;
    validateMs?: number;
    prepareMs?: number;
    /** From the request to its reply on this thread. */
    roundTripMs: number;
  };
}

export const KERNEL_NAMES: Record<KernelName, string> = {
  smlib: "SMLib",
  occt: "Open CASCADE",
};

/** The two kernels' workers for one visit to the example. */
export class KernelSession {
  private readonly clients: Record<KernelName, KernelClient>;
  private readonly loaded = new Set<KernelName>();

  constructor(options?: KernelClientOptions) {
    this.clients = {
      smlib: new KernelClient(options),
      occt: new KernelClient(options),
    };
  }

  isLoaded(kernel: KernelName): boolean {
    return this.loaded.has(kernel);
  }

  /** Loads a kernel's module in its worker. */
  async load(kernel: KernelName, onStage?: (stage: string) => void) {
    const { ms } = await this.clients[kernel].load(
      kernel,
      onStage ? { onStage } : {},
    );
    this.loaded.add(kernel);
    return ms;
  }

  /**
   * Evaluates a recipe in a kernel. A newer call on the same kernel
   * supersedes this one (it rejects with `KernelCancelled`). A final
   * evaluation is also checked (`validateBrep`); a preview isn't.
   */
  async evaluate(
    kernel: KernelName,
    recipe: SolidRecipe,
    options: { final: boolean; onStage?: (stage: string) => void },
  ): Promise<Evaluated> {
    const start = performance.now();
    const made = await this.clients[kernel].evaluate(kernel, recipe, {
      validate: options.final,
      prepare: true,
      ...(options.onStage ? { onStage: options.onStage } : {}),
    });
    this.loaded.add(kernel);
    const { form, bounds, problems, patches, faceTags } = made.result;
    return {
      kernel,
      form,
      faceTags: faceTags ?? new Int32Array(form.faceSurface.length).fill(-1),
      bounds,
      ...(problems ? { problems } : {}),
      ...(patches ? { patches } : {}),
      final: options.final,
      booleans: made.booleans,
      timings: {
        loadMs: made.loadMs,
        kernelMs: made.kernelMs,
        convertMs: made.convertMs,
        ...(made.result.validateMs !== undefined
          ? { validateMs: made.result.validateMs }
          : {}),
        ...(made.result.prepareMs !== undefined
          ? { prepareMs: made.result.prepareMs }
          : {}),
        roundTripMs: performance.now() - start,
      },
    };
  }

  dispose(): void {
    for (const client of Object.values(this.clients)) {
      client.dispose();
    }
  }
}

export interface SchedulerOptions {
  /** Starts an evaluation of the tree as it is now; `final` when the edit is over. */
  run(final: boolean): void;
  /** While a parameter is dragged: at most one evaluation this often, ms (default 120). */
  throttleMs?: number;
  /** After a typed or discrete edit: this long with no further edit, ms (default 200). */
  debounceMs?: number;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

/**
 * Turns edits into evaluations at a rate a kernel can keep up with. A drag
 * (`drag`) runs the first at once and then at most one per `throttleMs`,
 * always ending on the latest state; each is a preview, since the solid is
 * about to change again. A discrete edit (`edit`: a typed number, a toggle)
 * waits for `debounceMs` of quiet and is final; so is `commit`, a drag's
 * release, which runs at once. The kernel's client supersedes an evaluation
 * still pending when the next starts, so a slow kernel skips states, never
 * queues them.
 */
export class EvaluationScheduler {
  private timer: unknown;
  private lastRun = -Infinity;
  private readonly throttleMs: number;
  private readonly debounceMs: number;
  private readonly now: () => number;
  private readonly setTimer: (callback: () => void, ms: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;

  constructor(private readonly options: SchedulerOptions) {
    this.throttleMs = options.throttleMs ?? 120;
    this.debounceMs = options.debounceMs ?? 200;
    this.now = options.now ?? (() => performance.now());
    this.setTimer = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
    this.clearTimer =
      options.clearTimer ??
      ((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>));
  }

  /** The parameter moved while still held. */
  drag(): void {
    if (this.timer !== undefined) {
      // The trailing run, already due, reads the latest state.
      return;
    }
    const wait = this.lastRun + this.throttleMs - this.now();
    if (wait <= 0) {
      this.start(false);
      return;
    }
    this.timer = this.setTimer(() => {
      this.timer = undefined;
      this.start(false);
    }, wait);
  }

  /** A discrete edit: final once it has been quiet. */
  edit(): void {
    this.stop();
    this.timer = this.setTimer(() => {
      this.timer = undefined;
      this.start(true);
    }, this.debounceMs);
  }

  /** The edit is over (a drag's release, a field committed): final, now. */
  commit(): void {
    this.stop();
    this.start(true);
  }

  /** Drops what is waiting. */
  stop(): void {
    if (this.timer !== undefined) {
      this.clearTimer(this.timer);
      this.timer = undefined;
    }
  }

  private start(final: boolean): void {
    this.lastRun = this.now();
    this.options.run(final);
  }
}
