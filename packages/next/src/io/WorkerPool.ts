// The content worker's built URL (`?worker&url`: Vite compiles it as a
// worker and gives where it lands, relative to this module in the library
// build).
import workerUrl from "./worker.ts?worker&url";

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

  /**
   * Starts every worker now, so their modules load while the app resolves
   * endpoints: started on the first request, the first tiles waited for
   * them (r38).
   */
  warm(): void {
    while (this.slots.length < this.size) {
      this.spawn();
    }
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
    return this.spawn();
  }

  private spawn(): Slot {
    const worker = new Worker(workerScript(), { type: "module" });
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

let script: string | undefined;

function workerScript(): string {
  script ??= workerStart(new URL(workerUrl, import.meta.url));
  return script;
}

/**
 * Where a worker at `url` starts. Browsers start a worker only from the
 * page's own origin, so with the library served from another one (a CDN)
 * workers start from a same-origin blob that imports the real script
 * (which then needs CORS, as the library's other files do); its own
 * imports and wasm resolve against its real URL.
 */
export function workerStart(url: URL): string {
  const origin = globalThis.location?.origin;
  return origin === undefined || url.origin === origin
    ? url.href
    : URL.createObjectURL(
        new Blob([`import ${JSON.stringify(url.href)};\n`], {
          type: "text/javascript",
        }),
      );
}
