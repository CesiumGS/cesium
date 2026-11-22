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

/**
 * The content worker's own job types (worker.ts), and its messages: no
 * decoder takes one, so a kind can't take over another's jobs.
 */
export const BUILT_IN_JOB_TYPES: ReadonlySet<string> = new Set([
  "cancel",
  DECODER_LOAD,
  "gltf",
  "image",
  "terrain",
  "terrainDeviation",
  "stars",
  "glareKernel",
  "skyPack",
]);

/**
 * Why a decoder can't take job type `type`, or undefined when it can: a
 * decoder's type is namespaced (`<namespace>:<name>`, as "csv:rows"), and
 * never a built-in one (`BUILT_IN_JOB_TYPES`).
 */
export function decoderTypeRefusal(type: unknown): string | undefined {
  if (typeof type !== "string" || !/^[\w.-]+:[\w./-]+$/.test(type)) {
    return 'a decoder\'s job type is namespaced: <namespace>:<name>, as "csv:rows"';
  }
  if (BUILT_IN_JOB_TYPES.has(type)) {
    return `"${type}" is one of the content worker's own job types`;
  }
  return undefined;
}

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

/** A decoder type's module, and its load (undefined after a failed one: the next job loads it again). */
interface Loading {
  readonly url: string;
  decoder: Promise<Decoder> | undefined;
}

/**
 * The decoders loaded into one worker, and the jobs they run. `load`
 * imports a module; `fetchFor` makes a job's requests (the page's provider,
 * through workerFetch.ts; absent on a thread with no page).
 */
export class WorkerDecoders {
  private readonly loading = new Map<string, Loading>();
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

  /**
   * Whether `message` is a decoder's load; it starts loading if so. A
   * load for a type a decoder can't take (`decoderTypeRefusal`) is
   * ignored: the pool refuses it first, so only a forged message has one.
   */
  handleLoad(message: { readonly type: string }): boolean {
    if (message.type !== DECODER_LOAD) {
      return false;
    }
    const { jobType, url } = message as DecoderLoadMessage;
    if (
      decoderTypeRefusal(jobType) === undefined &&
      !this.loading.has(jobType)
    ) {
      const entry: Loading = { url, decoder: undefined };
      this.loading.set(jobType, entry);
      this.start(jobType, entry);
    }
    return true;
  }

  /** Whether a decoder for `type` was loaded (or is loading) here. */
  has(type: string): boolean {
    return this.loading.has(type);
  }

  /**
   * Runs job `message` with its type's decoder and replies once. Aborting
   * `signal` replies with an error at once, whether or not the decoder
   * stops, so a decoder that never resolves frees its worker's slot
   * (`Jobs`' CPU limit) when its job is canceled.
   */
  async run(
    message: JobMessageIn,
    signal: AbortSignal,
    post: PostReply,
  ): Promise<void> {
    const { id, type, ...payload } = message;
    let replied = false;
    const reply: PostReply = (r, transfer) => {
      if (!replied) {
        replied = true;
        post(r, transfer);
      }
    };
    let onAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(new Error("canceled"));
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
    aborted.catch(() => {});
    try {
      const entry = this.loading.get(type)!;
      const decoder = entry.decoder ?? this.start(type, entry);
      const decode = await Promise.race([decoder, aborted]);
      const fetch = this.fetchFor?.(id, signal);
      const out = await Promise.race([
        decode(payload, { signal, ...(fetch ? { fetch } : {}) }),
        aborted,
      ]);
      reply({ id, ok: true, result: out.result }, [...(out.transfer ?? [])]);
    } catch (error) {
      reply(
        {
          id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        [],
      );
    } finally {
      signal.removeEventListener("abort", onAbort!);
    }
  }

  /** Loads `type`'s module; a failed load fails each job of its type, not the worker, and the next job loads it again. */
  private start(type: string, entry: Loading): Promise<Decoder> {
    const decoder = this.load(entry.url).then((module) => {
      const decode = (module as { default?: unknown }).default;
      if (typeof decode !== "function") {
        throw new Error(
          `decoder "${type}": its module's default export isn't a function.`,
        );
      }
      return decode as Decoder;
    });
    decoder.catch(() => {
      if (entry.decoder === decoder) {
        entry.decoder = undefined;
      }
    });
    entry.decoder = decoder;
    return decoder;
  }
}
