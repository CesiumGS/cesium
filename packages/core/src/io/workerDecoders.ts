/**
 * Decoders a source kind registers, on the worker's side (CS-847): each is a
 * module loaded by URL into every worker of the pool, whose default export
 * decodes one job type (`Decoder`). `WorkerPool.loadDecoder` sends
 * `{ type: DECODER_LOAD, jobType, url }` to each worker before any job of
 * that type; a job of a loaded type then runs here, as the built-in types
 * run in worker.ts.
 *
 * This module imports nothing but types and uses only erasable TypeScript,
 * so a test can run it on a Node worker thread as the content worker runs it.
 */
import type { Decoder, DecoderContext } from "../source/types.ts";

/** The message that loads a decoder into a worker. */
export const DECODER_LOAD = "decoder:load";

/** A decoder's load, as the pool sends it. */
export interface DecoderLoadMessage {
  readonly type: typeof DECODER_LOAD;
  readonly jobType: string;
  readonly url: string;
}

/** A job, as `Jobs` posts it. */
interface JobMessageIn {
  readonly id: number;
  readonly type: string;
  readonly [field: string]: unknown;
}

/** How a worker replies (`JobReply`), with what it hands over. */
export type PostReply = (
  reply: { id: number; ok: boolean; result?: unknown; error?: string },
  transfer: Transferable[],
) => void;

/**
 * The decoders loaded into one worker, and the jobs they run. `load`
 * imports a module; `fetchFor` makes a job's requests (the page's provider,
 * through workerFetch.ts; absent on a thread with no page).
 */
export class WorkerDecoders {
  private readonly loading = new Map<string, Promise<Decoder>>();
  private readonly load: (url: string) => Promise<unknown>;
  private readonly fetchFor:
    ((id: number, signal: AbortSignal) => DecoderContext["fetch"]) | undefined;

  constructor(
    load: (url: string) => Promise<unknown> = (url) =>
      import(/* @vite-ignore */ url),
    fetchFor?: (id: number, signal: AbortSignal) => DecoderContext["fetch"],
  ) {
    // Plain fields, not parameter properties: Node's type stripping runs this file.
    this.load = load;
    this.fetchFor = fetchFor;
  }

  /** Whether `message` is a decoder's load; it starts loading if so. */
  handleLoad(message: { readonly type: string }): boolean {
    if (message.type !== DECODER_LOAD) {
      return false;
    }
    const { jobType, url } = message as DecoderLoadMessage;
    if (!this.loading.has(jobType)) {
      const loaded = this.load(url).then((module) => {
        const decode = (module as { default?: unknown }).default;
        if (typeof decode !== "function") {
          throw new Error(
            `decoder "${jobType}": its module's default export isn't a function.`,
          );
        }
        return decode as Decoder;
      });
      // A failed load fails each job of its type, not the worker.
      loaded.catch(() => {});
      this.loading.set(jobType, loaded);
    }
    return true;
  }

  /** Whether a decoder for `type` was loaded (or is loading) here. */
  has(type: string): boolean {
    return this.loading.has(type);
  }

  /** Runs job `message` with its type's decoder and replies. */
  async run(
    message: JobMessageIn,
    signal: AbortSignal,
    post: PostReply,
  ): Promise<void> {
    const { id, type, ...payload } = message;
    try {
      const decode = await this.loading.get(type)!;
      signal.throwIfAborted();
      const request = this.fetchFor?.(id, signal);
      const out = await decode(payload, {
        signal,
        ...(request ? { fetch: request } : {}),
      });
      post({ id, ok: true, result: out.result }, [...(out.transfer ?? [])]);
    } catch (error) {
      post(
        {
          id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        [],
      );
    }
  }
}
