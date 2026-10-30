interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface Slot {
  worker: Worker;
  busy: number;
}

/**
 * A small pool of content workers. Requests go to the least-busy worker;
 * workers start lazily, up to `size`.
 */
export class WorkerPool {
  private readonly slots: Slot[] = [];
  private readonly pending = new Map<number, Pending>();
  private nextId = 0;

  constructor(
    readonly size = Math.max(
      1,
      Math.min(4, (globalThis.navigator?.hardwareConcurrency ?? 4) - 1),
    ),
  ) {}

  /**
   * Runs a request on a worker. Aborting `signal` cancels it there (its
   * fetches abort) and rejects with an AbortError.
   */
  request<T>(
    type: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    const slot = this.pickSlot();
    const id = this.nextId++;
    slot.busy++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      signal?.addEventListener(
        "abort",
        () => {
          if (this.pending.delete(id)) {
            slot.worker.postMessage({ id, type: "cancel" });
            reject(new DOMException("Aborted", "AbortError"));
          }
        },
        { once: true },
      );
      slot.worker.postMessage({ id, type, ...payload });
    }).finally(() => {
      slot.busy--;
    });
  }

  destroy(): void {
    for (const slot of this.slots) {
      slot.worker.terminate();
    }
    for (const pending of this.pending.values()) {
      pending.reject(new Error("Worker pool destroyed."));
    }
    this.slots.length = 0;
    this.pending.clear();
  }

  private pickSlot(): Slot {
    const idle = this.slots.find((s) => s.busy === 0);
    if (idle || this.slots.length >= this.size) {
      return idle ?? this.slots.reduce((a, b) => (b.busy < a.busy ? b : a));
    }
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (
      event: MessageEvent<{
        id: number;
        ok: boolean;
        result?: unknown;
        error?: string;
      }>,
    ) => {
      const pending = this.pending.get(event.data.id);
      this.pending.delete(event.data.id);
      if (event.data.ok) {
        pending?.resolve(event.data.result);
      } else {
        pending?.reject(new Error(event.data.error));
      }
    };
    const slot = { worker, busy: 0 };
    this.slots.push(slot);
    return slot;
  }
}
