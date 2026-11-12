// The page's side of the section worker: a `SectionRunner` that sections in a
// Web Worker, so caps that follow a moving clip cost the page's thread
// nothing but the messages. Provisional.
//
// One worker, made on the first call. A form is sent the first time it is
// sectioned and kept there until `forget` or `dispose`; the worker runs
// requests in order, so a caller keeps one in flight (as `BrepCaps` does).
import type { BrepForm } from "./form.ts";
import {
  type SectionMessage,
  type SectionOutcome,
  type SectionReply,
  type SectionRequest,
  type SectionRunner,
} from "./sectionHost.ts";

/** What a client needs of a worker: a Web Worker has it. */
export interface SectionWorkerLike {
  postMessage(message: SectionMessage, transfer?: ArrayBuffer[]): void;
  terminate(): void;
  addEventListener(
    type: "message",
    listener: (event: { data: SectionReply }) => void,
  ): void;
  addEventListener(
    type: "error" | "messageerror",
    listener: (event: { message?: string }) => void,
  ): void;
}

export interface SectionClientOptions {
  /** Makes the worker (default: `sectionWorker.ts` as a module Web Worker). */
  createWorker?: () => SectionWorkerLike;
}

interface Pending {
  resolve(outcome: SectionOutcome): void;
  reject(error: Error): void;
}

export class SectionClient implements SectionRunner {
  private worker: SectionWorkerLike | undefined;
  private nextId = 1;
  private nextKey = 1;
  private keys = new WeakMap<BrepForm, number>();
  private readonly pending = new Map<number, Pending>();
  private disposed = false;

  constructor(private readonly options: SectionClientOptions = {}) {}

  run(request: SectionRequest): Promise<SectionOutcome> {
    if (this.disposed) {
      return Promise.reject(new Error("the section worker was ended"));
    }
    return new Promise<SectionOutcome>((resolve, reject) => {
      try {
        const worker = this.connect();
        let key = this.keys.get(request.form);
        if (key === undefined) {
          key = this.nextKey++;
          this.keys.set(request.form, key);
          worker.postMessage({ type: "form", key, form: request.form });
        }
        const id = this.nextId++;
        this.pending.set(id, { resolve, reject });
        worker.postMessage({
          type: "section",
          id,
          key,
          planes: request.planes.map((plane) => ({
            point: Array.from(plane.point),
            normal: Array.from(plane.normal),
            ...(plane.limits
              ? {
                  limits: plane.limits.map((limit) => ({
                    point: Array.from(limit.point),
                    normal: Array.from(limit.normal),
                  })),
                }
              : {}),
            ...(plane.id !== undefined ? { id: plane.id } : {}),
          })),
          ...(request.options ? { options: request.options } : {}),
          ...(request.prepare ? { prepare: request.prepare } : {}),
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /** Drops the worker's copy of a form (it is sent again if sectioned again). */
  forget(form: BrepForm): void {
    const key = this.keys.get(form);
    if (key !== undefined) {
      this.keys.delete(form);
      this.worker?.postMessage({ type: "forget", key });
    }
  }

  /** Ends the worker; requests still waiting reject. */
  dispose(): void {
    this.disposed = true;
    this.worker?.terminate();
    this.worker = undefined;
    this.failAll(new Error("the section worker was ended"));
  }

  private connect(): SectionWorkerLike {
    if (this.worker) {
      return this.worker;
    }
    const worker =
      this.options.createWorker?.() ??
      (new Worker(new URL("./sectionWorker.ts", import.meta.url), {
        type: "module",
      }) as unknown as SectionWorkerLike);
    worker.addEventListener("message", (event) => this.receive(event.data));
    worker.addEventListener("error", (event) => {
      this.failAll(
        new Error(
          `the section worker failed: ${event.message ?? "no message"}`,
        ),
      );
      this.worker?.terminate();
      this.worker = undefined;
      // A new worker doesn't have the forms.
      this.keys = new WeakMap();
    });
    worker.addEventListener("messageerror", () =>
      this.failAll(new Error("the section worker sent a message that failed")),
    );
    this.worker = worker;
    return worker;
  }

  private receive(reply: SectionReply): void {
    const call = this.pending.get(reply.id);
    if (!call) {
      return;
    }
    this.pending.delete(reply.id);
    if (reply.type === "error") {
      call.reject(new Error(reply.message));
    } else {
      call.resolve(reply.outcome);
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
