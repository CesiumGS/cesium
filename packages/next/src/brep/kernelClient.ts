// The page's side of the kernel worker (overall plan §13.33): typed calls
// that become the messages of kernelProtocol.ts, with stage callbacks for a
// loading overlay. Provisional; the CSG sample reshapes it.
//
// A client owns one Web Worker, made on its first call, and its calls run
// there one at a time. A new `importStep` or `boolean` supersedes any still
// pending on the client: the old one's promise rejects with `KernelCancelled`
// and the worker is told to stop it at its next stage. Use a client per
// kernel to run two at once (SMLib's context isn't thread-safe, and Open
// CASCADE's is heavy: one worker each).
import type {
  BooleanOperation,
  KernelForm,
  KernelName,
  KernelReply,
  KernelRequest,
  Primitive,
  SolidRecipe,
  StepPart,
} from "./kernelProtocol.ts";

/** What a client needs of a worker: a Web Worker has it. */
export interface KernelWorkerLike {
  postMessage(message: KernelRequest, transfer?: ArrayBuffer[]): void;
  terminate(): void;
  addEventListener(
    type: "message",
    listener: (event: { data: KernelReply }) => void,
  ): void;
  addEventListener(
    type: "error" | "messageerror",
    listener: (event: { message?: string }) => void,
  ): void;
}

export interface KernelClientOptions {
  /** Makes the worker (default: `kernelWorker.ts` as a module Web Worker). */
  createWorker?: () => KernelWorkerLike;
}

/** A call that a newer one replaced, or that `dispose` ended. */
export class KernelCancelled extends Error {
  constructor(reason = "the request was superseded") {
    super(reason);
    this.name = "KernelCancelled";
  }
}

/** Called as a request moves to its next stage (the worker is not blocking this thread). */
export type KernelStageListener = (stage: string) => void;

export interface CallOptions {
  onStage?: KernelStageListener;
  /** Ask for `validateBrep`'s findings with the forms (default false). */
  validate?: boolean;
  /** Ask for `prepareGpuPatches`' result with the forms, to pass to `World.addBrep` as `prepared` (default false). */
  prepare?: boolean;
}

export interface ImportResult {
  forms: KernelForm[];
  loadMs: number;
  importMs: number;
  convertMs: number;
}

export interface RegisterStepResult {
  part: StepPart;
  loadMs: number;
  importMs: number;
  convertMs: number;
}

export interface BooleanResult {
  result: KernelForm;
  loadMs: number;
  booleanMs: number;
  convertMs: number;
}

export interface EvaluateResult {
  result: KernelForm;
  loadMs: number;
  /** Primitives, placements and booleans, in the kernel. */
  kernelMs: number;
  booleans: number;
  convertMs: number;
}

interface Pending {
  readonly supersedable: boolean;
  readonly onStage: KernelStageListener | undefined;
  resolve(reply: KernelReply): void;
  reject(error: Error): void;
}

export class KernelClient {
  private worker: KernelWorkerLike | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private disposed = false;

  constructor(private readonly options: KernelClientOptions = {}) {}

  /** Loads a kernel in the worker (the first call that needs it does so too). */
  async load(
    kernel: KernelName,
    options: Pick<CallOptions, "onStage"> & { url?: string } = {},
  ): Promise<{ ms: number }> {
    const reply = await this.send(
      (id) => ({
        type: "load",
        id,
        kernel,
        ...(options.url ? { url: options.url } : {}),
      }),
      { supersedable: false, onStage: options.onStage },
    );
    return { ms: reply.type === "loaded" ? reply.ms : 0 };
  }

  /**
   * Imports a STEP file with Open CASCADE: one form per solid, in metres. The
   * bytes' buffer moves to the worker (a view of part of a larger buffer is
   * copied first), so `bytes` is detached afterwards.
   */
  async importStep(
    bytes: Uint8Array,
    options: CallOptions = {},
  ): Promise<ImportResult> {
    const whole =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength;
    const moved = whole ? bytes : bytes.slice();
    const reply = await this.send(
      (id) => ({
        type: "importStep",
        id,
        bytes: moved,
        validate: options.validate ?? false,
        prepare: options.prepare ?? false,
      }),
      { supersedable: true, onStage: options.onStage },
      [moved.buffer as ArrayBuffer],
    );
    if (reply.type !== "imported") {
      throw new Error(`unexpected reply ${reply.type}`);
    }
    const { forms, loadMs, importMs, convertMs } = reply;
    return { forms, loadMs, importMs, convertMs };
  }

  /**
   * Imports a STEP file with Open CASCADE and keeps its solid in the worker
   * under `key`, for `evaluate`'s recipes' `step` leaves (a file of several
   * solids is fused; the part is centred on its bounds). Not superseded by
   * evaluations. The bytes' buffer moves to the worker, as `importStep`'s.
   */
  async registerStep(
    key: number,
    bytes: Uint8Array,
    options: Pick<CallOptions, "onStage"> = {},
  ): Promise<RegisterStepResult> {
    const whole =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength;
    const moved = whole ? bytes : bytes.slice();
    const reply = await this.send(
      (id) => ({ type: "registerStep", id, key, bytes: moved }),
      { supersedable: false, onStage: options.onStage },
      [moved.buffer as ArrayBuffer],
    );
    if (reply.type !== "stepRegistered") {
      throw new Error(`unexpected reply ${reply.type}`);
    }
    const { part, loadMs, importMs, convertMs } = reply;
    return { part, loadMs, importMs, convertMs };
  }

  /** Frees the part `registerStep` kept under `key`. */
  async releaseStep(key: number): Promise<void> {
    const reply = await this.send((id) => ({ type: "releaseStep", id, key }), {
      supersedable: false,
      onStage: undefined,
    });
    if (reply.type !== "stepReleased") {
      throw new Error(`unexpected reply ${reply.type}`);
    }
  }

  /** A boolean of two primitives (the first tagged 1, the second 2) in a kernel, converted to the render form. */
  async boolean(
    kernel: KernelName,
    job: { operation: BooleanOperation; a: Primitive; b: Primitive },
    options: CallOptions = {},
  ): Promise<BooleanResult> {
    const reply = await this.send(
      (id) => ({
        type: "boolean",
        id,
        kernel,
        ...job,
        validate: options.validate ?? false,
        prepare: options.prepare ?? false,
      }),
      { supersedable: true, onStage: options.onStage },
    );
    if (reply.type !== "boolean") {
      throw new Error(`unexpected reply ${reply.type}`);
    }
    const { result, loadMs, booleanMs, convertMs } = reply;
    return { result, loadMs, booleanMs, convertMs };
  }

  /**
   * A tree of primitives and booleans made in a kernel and converted to the
   * render form: its `faceTags` are the recipe's leaf tags, so each face says
   * which leaf made it. Supersedes the call still pending on this client.
   */
  async evaluate(
    kernel: KernelName,
    recipe: SolidRecipe,
    options: CallOptions = {},
  ): Promise<EvaluateResult> {
    const reply = await this.send(
      (id) => ({
        type: "evaluate",
        id,
        kernel,
        recipe,
        validate: options.validate ?? false,
        prepare: options.prepare ?? false,
      }),
      { supersedable: true, onStage: options.onStage },
    );
    if (reply.type !== "evaluated") {
      throw new Error(`unexpected reply ${reply.type}`);
    }
    const { result, loadMs, kernelMs, booleans, convertMs } = reply;
    return { result, loadMs, kernelMs, booleans, convertMs };
  }

  /** Ends the worker; pending calls reject with `KernelCancelled`. */
  dispose(): void {
    this.disposed = true;
    this.worker?.terminate();
    this.worker = undefined;
    this.failAll(new KernelCancelled("the kernel worker was ended"));
  }

  private connect(): KernelWorkerLike {
    if (this.worker) {
      return this.worker;
    }
    const worker =
      this.options.createWorker?.() ??
      (new Worker(new URL("./kernelWorker.ts", import.meta.url), {
        type: "module",
      }) as unknown as KernelWorkerLike);
    worker.addEventListener("message", (event) => this.receive(event.data));
    // A worker that fails (its script, an uncaught error) fails everything waiting on it.
    worker.addEventListener("error", (event) => {
      this.failAll(
        new Error(`the kernel worker failed: ${event.message ?? "no message"}`),
      );
      this.worker?.terminate();
      this.worker = undefined;
    });
    worker.addEventListener("messageerror", () =>
      this.failAll(new Error("the kernel worker sent a message that failed")),
    );
    this.worker = worker;
    return worker;
  }

  private send(
    make: (id: number) => KernelRequest,
    options: Pick<Pending, "supersedable" | "onStage">,
    transfer: ArrayBuffer[] = [],
  ): Promise<KernelReply> {
    if (this.disposed) {
      return Promise.reject(new KernelCancelled("the kernel worker was ended"));
    }
    const worker = this.connect();
    const id = this.nextId++;
    if (options.supersedable) {
      for (const [other, call] of this.pending) {
        if (call.supersedable) {
          this.pending.delete(other);
          worker.postMessage({ type: "cancel", id: other });
          call.reject(new KernelCancelled());
        }
      }
    }
    return new Promise<KernelReply>((resolve, reject) => {
      this.pending.set(id, { ...options, resolve, reject });
      try {
        worker.postMessage(make(id), transfer);
      } catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private receive(reply: KernelReply): void {
    const call = this.pending.get(reply.id);
    if (!call) {
      // Superseded: its reply (a result, a cancel) is dropped.
      return;
    }
    switch (reply.type) {
      case "stage":
        call.onStage?.(reply.stage);
        return;
      case "error":
        this.pending.delete(reply.id);
        call.reject(new Error(reply.message));
        return;
      case "cancelled":
        this.pending.delete(reply.id);
        call.reject(new KernelCancelled());
        return;
      default:
        this.pending.delete(reply.id);
        call.resolve(reply);
    }
  }

  private failAll(error: Error): void {
    const calls = [...this.pending.values()];
    this.pending.clear();
    for (const call of calls) {
      call.reject(error);
    }
  }
}
