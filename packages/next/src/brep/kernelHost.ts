// The kernel worker's brain (overall plan §13.33): runs the requests of
// kernelProtocol.ts against SMLib and Open CASCADE, one at a time, in
// whatever scope it is created in. `kernelWorker.ts` makes one in a Web
// Worker; tests make one in-process. Provisional.
//
// Cancelling: a request waits its turn in a queue, and a running one reports
// its stages and yields to the message loop at each, where a `cancel` for it
// is seen and it stops, freeing what it holds. A kernel call itself (a
// boolean, a STEP import) can't be interrupted, so a cancel waits for the
// call that is running.
import { formBounds } from "./formBounds.ts";
import type { BrepForm } from "./form.ts";
import { prepareGpuPatches, type GpuPatches } from "./gpuPatches.ts";
import {
  transferable,
  type BooleanOperation,
  type FormWork,
  type KernelForm,
  type KernelName,
  type KernelReply,
  type KernelRequest,
  type Primitive,
} from "./kernelProtocol.ts";
import { OcctKernel, type OcctSolid } from "./occt.ts";
import { SmlibKernel, type SmlibSolid } from "./smlib.ts";
import { validateBrep, type BrepProblem } from "./validate.ts";

/** The primitives both kernels make the same way. */
interface Primitives<S> {
  box(origin: ArrayLike<number>, size: ArrayLike<number>): S;
  cylinder(base: ArrayLike<number>, radius: number, height: number): S;
  sphere(centre: ArrayLike<number>, radius: number): S;
  torus(centre: ArrayLike<number>, major: number, minor: number): S;
}

function makePrimitive<S>(kernel: Primitives<S>, p: Primitive): S {
  switch (p.kind) {
    case "box":
      return kernel.box(p.origin, p.size);
    case "cylinder":
      return kernel.cylinder(p.base, p.radius, p.height);
    case "sphere":
      return kernel.sphere(p.centre, p.radius);
    case "torus":
      return kernel.torus(p.centre, p.major, p.minor);
  }
}

/** Thrown at a stage when the request was cancelled. */
class Cancelled extends Error {}

export interface KernelHostOptions {
  /** Sends a reply, moving `transfer`'s buffers with it. */
  post(reply: KernelReply, transfer: ArrayBuffer[]): void;
  /** Loads a kernel from a URL (default: the dev server's build). Tests pass their own. */
  loadSmlib?: (url?: string) => Promise<SmlibKernel>;
  loadOcct?: (url?: string) => Promise<OcctKernel>;
}

const NAMES: Record<KernelName, string> = {
  smlib: "SMLib",
  occt: "Open CASCADE",
};

/** Lets the message loop run, so a waiting `cancel` is delivered. */
const yieldNow = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export class KernelHost {
  private readonly queue: KernelRequest[] = [];
  private readonly cancelled = new Set<number>();
  private running = false;
  private smlib: Promise<SmlibKernel> | undefined;
  private occt: Promise<OcctKernel> | undefined;

  constructor(private readonly options: KernelHostOptions) {}

  /** Takes a request from the page. */
  receive(request: KernelRequest): void {
    if (request.type === "cancel") {
      this.cancelled.add(request.id);
      return;
    }
    this.queue.push(request);
    void this.pump();
  }

  private async pump(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      while (this.queue.length > 0) {
        // A cancel sent just after its request arrives before it starts.
        await yieldNow();
        const request = this.queue.shift()!;
        if (request.type === "cancel") {
          continue;
        }
        try {
          if (this.cancelled.has(request.id)) {
            throw new Cancelled();
          }
          await this.run(request);
        } catch (error) {
          this.options.post(
            error instanceof Cancelled
              ? { type: "cancelled", id: request.id }
              : { type: "error", id: request.id, message: String(error) },
            [],
          );
        } finally {
          this.cancelled.delete(request.id);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Names the stage to the page, and lets a cancel in. */
  private async stage(id: number, stage: string): Promise<void> {
    this.options.post({ type: "stage", id, stage }, []);
    await yieldNow();
    if (this.cancelled.has(id)) {
      throw new Cancelled();
    }
  }

  private loadSmlib(url?: string): Promise<SmlibKernel> {
    this.smlib ??= (this.options.loadSmlib ?? ((u) => SmlibKernel.load(u)))(
      url,
    ).catch((error: unknown) => {
      this.smlib = undefined;
      throw error;
    });
    return this.smlib;
  }

  private loadOcct(url?: string): Promise<OcctKernel> {
    this.occt ??= (this.options.loadOcct ?? ((u) => OcctKernel.load(u)))(
      url,
    ).catch((error: unknown) => {
      this.occt = undefined;
      throw error;
    });
    return this.occt;
  }

  /** Loads a kernel, naming the stage when it isn't loaded yet; the time that took, 0 if it was. */
  private async ensure(
    id: number,
    kernel: KernelName,
    url?: string,
  ): Promise<number> {
    const loaded = kernel === "smlib" ? this.smlib : this.occt;
    if (loaded) {
      await loaded;
      return 0;
    }
    await this.stage(id, `Loading ${NAMES[kernel]}…`);
    const start = performance.now();
    await (kernel === "smlib" ? this.loadSmlib(url) : this.loadOcct(url));
    return performance.now() - start;
  }

  private async run(
    request: Exclude<KernelRequest, { type: "cancel" }>,
  ): Promise<void> {
    const { id } = request;
    switch (request.type) {
      case "load": {
        const ms = await this.ensure(id, request.kernel, request.url);
        this.options.post(
          { type: "loaded", id, kernel: request.kernel, ms },
          [],
        );
        return;
      }
      case "importStep":
        return this.importStep(id, request.bytes, request);
      case "boolean":
        return this.boolean(
          id,
          request.kernel,
          request.operation,
          request.a,
          request.b,
          request,
        );
    }
  }

  /**
   * The forms with what the page would otherwise work out: their bounds
   * always, and the checks and the GPU's patches when `work` asks. Each takes
   * a stage, where a cancel can stop it.
   */
  private async measured(
    id: number,
    forms: readonly BrepForm[],
    work: FormWork,
    faceTags?: Int32Array,
  ): Promise<KernelForm[]> {
    const parts = forms.map((form) => ({ form, bounds: formBounds(form) }));
    let problems: BrepProblem[][] | undefined;
    if (work.validate) {
      await this.stage(id, "Checking the form…");
      problems = forms.map((form) => validateBrep(form));
    }
    let patches: GpuPatches[] | undefined;
    if (work.prepare) {
      await this.stage(id, "Preparing faces for the GPU…");
      patches = forms.map((form) => prepareGpuPatches(form));
    }
    return parts.map((part, i) => ({
      ...part,
      ...(problems ? { problems: problems[i]! } : {}),
      ...(patches ? { patches: patches[i]! } : {}),
      ...(faceTags ? { faceTags } : {}),
    }));
  }

  private async importStep(
    id: number,
    bytes: Uint8Array,
    work: FormWork,
  ): Promise<void> {
    const loadMs = await this.ensure(id, "occt");
    const kernel = await this.loadOcct();
    let solids: OcctSolid[] = [];
    try {
      await this.stage(id, "Importing STEP…");
      let start = performance.now();
      solids = kernel.importStep(bytes);
      const importMs = performance.now() - start;
      await this.stage(
        id,
        `Converting ${solids.length} ${solids.length === 1 ? "solid" : "solids"} to B-reps…`,
      );
      start = performance.now();
      const forms = solids.map((solid) => kernel.toForm(solid).form);
      const convertMs = performance.now() - start;
      await this.stage(id, "Measuring the part…");
      const results = await this.measured(id, forms, work);
      const { forms: moved, buffers } = transferable(results);
      this.options.post(
        { type: "imported", id, forms: moved, loadMs, importMs, convertMs },
        buffers,
      );
    } finally {
      // The forms are their own copy; the solids are the host's to free.
      solids.forEach((solid) => solid.delete());
    }
  }

  private async boolean(
    id: number,
    kernel: KernelName,
    operation: BooleanOperation,
    a: Primitive,
    b: Primitive,
    work: FormWork,
  ): Promise<void> {
    const loadMs = await this.ensure(id, kernel);
    await this.stage(id, `${NAMES[kernel]}: ${operation}…`);
    const made =
      kernel === "smlib"
        ? await this.smlibBoolean(operation, a, b)
        : await this.occtBoolean(operation, a, b);
    const [result] = await this.measured(id, [made.form], work, made.faceTags);
    const { forms, buffers } = transferable([result!]);
    this.options.post(
      {
        type: "boolean",
        id,
        result: forms[0]!,
        loadMs,
        booleanMs: made.booleanMs,
        convertMs: made.convertMs,
      },
      buffers,
    );
  }

  private async smlibBoolean(
    operation: BooleanOperation,
    specA: Primitive,
    specB: Primitive,
  ) {
    const kernel = await this.loadSmlib();
    const a: SmlibSolid = makePrimitive(kernel, specA);
    let b: SmlibSolid | undefined;
    try {
      b = makePrimitive(kernel, specB);
      kernel.tag(a, 1);
      kernel.tag(b, 2);
      let start = performance.now();
      // The boolean changes `a` in place and consumes `b`.
      const result = kernel.boolean(operation, a, b);
      const booleanMs = performance.now() - start;
      start = performance.now();
      const brep = kernel.toForm(result);
      return {
        form: brep.form,
        faceTags: brep.faceTags,
        booleanMs,
        convertMs: performance.now() - start,
      };
    } finally {
      a.delete();
      b?.delete();
    }
  }

  private async occtBoolean(
    operation: BooleanOperation,
    specA: Primitive,
    specB: Primitive,
  ) {
    const kernel = await this.loadOcct();
    const a: OcctSolid = makePrimitive(kernel, specA);
    let b: OcctSolid | undefined;
    let result: OcctSolid | undefined;
    try {
      b = makePrimitive(kernel, specB);
      let start = performance.now();
      result = kernel.boolean(operation, kernel.tag(a, 1), kernel.tag(b, 2));
      const booleanMs = performance.now() - start;
      start = performance.now();
      const brep = kernel.toForm(result);
      return {
        form: brep.form,
        faceTags: brep.faceTags,
        booleanMs,
        convertMs: performance.now() - start,
      };
    } finally {
      // OCCT's solids are the caller's to free; the form is its own copy.
      result?.delete();
      b?.delete();
      a.delete();
    }
  }
}
