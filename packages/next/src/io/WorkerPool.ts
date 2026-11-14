// The content worker's built URL (`?worker&url`: Vite compiles it as a
// worker and gives where it lands, relative to this module in the library
// build).
import workerUrl from "./worker.ts?worker&url";

import { Jobs, type Job, type JobReply, type JobSpec } from "./Jobs.ts";

/**
 * A small pool of content workers, started lazily up to `size`, with the
 * job system in front of them (`Jobs`, docs/design/job-system.md): `submit` takes a job
 * with a priority, dependencies, cancellation and a main-thread step for
 * the engine's apply phase; `request` is a job with none of these.
 */
export class WorkerPool {
  private readonly workers: Worker[] = [];
  readonly jobs: Jobs;

  constructor(
    readonly size = Math.max(
      1,
      Math.min(4, (globalThis.navigator?.hardwareConcurrency ?? 4) - 1),
    ),
  ) {
    this.jobs = new Jobs({
      size,
      post: (worker, message, transfer) =>
        this.worker(worker).postMessage(message, transfer),
    });
  }

  /**
   * Runs a request on a worker. Aborting `signal` cancels it there (its
   * fetches abort) and rejects with an AbortError. It may fetch, so it
   * isn't held to the jobs' per-worker CPU limit.
   */
  request<T>(
    type: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    return this.jobs.submit<T>({
      type,
      payload,
      io: true,
      ...(signal ? { signal } : {}),
    }).promise;
  }

  /** Submits a job (`Jobs.submit`). */
  submit<R, A = R>(spec: JobSpec<R, A>): Job<A> {
    return this.jobs.submit(spec);
  }

  /**
   * Starts every worker now, so their modules load while the app resolves
   * endpoints: started on the first request, the first tiles waited for
   * them (r38).
   */
  warm(): void {
    for (let i = 0; i < this.size; i++) {
      this.worker(i);
    }
  }

  destroy(): void {
    this.jobs.destroy();
    for (const worker of this.workers) {
      worker?.terminate();
    }
    this.workers.length = 0;
  }

  private worker(index: number): Worker {
    let worker = this.workers[index];
    if (!worker) {
      worker = new Worker(workerScript(), { type: "module" });
      worker.onmessage = (event: MessageEvent<JobReply>) =>
        this.jobs.reply(event.data);
      this.workers[index] = worker;
    }
    return worker;
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
