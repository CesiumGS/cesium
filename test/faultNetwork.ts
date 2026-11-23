/**
 * The fault-injection harness (CS-144): a fake `fetch` driven by a script, on
 * a virtual clock, and an adapter that runs the engine's real loader
 * (`parseGltf` through `FetchProvider.default`) on the fake GPU. Test code, not
 * engine code: nothing under `packages/` knows it exists.
 *
 * Plan: docs/superpowers/plans/2026-11-13-streaming-robustness.md, section
 * 13. What a test builds, in order:
 *
 *     const clock = new FakeClock();
 *     const net = new FaultNetwork(clock, 42)
 *       .rule(/tile-1/, [{ status: 503, headers: { "Retry-After": "3" } }, {}])
 *       .rule(/slow/, { ttfbMs: 400, bodyMs: 2000, drop: "mid-body" });
 *     net.install();                      // `fetch` is the script now
 *     await clock.advance(5000);          // timers, stalls and backoff run on it
 *     clock.restore(); net.uninstall();   // in afterEach
 *
 * Every timing is on the virtual clock: no real sleeps, so a run is
 * deterministic and fast. Every random choice (jitter, where a body is cut)
 * comes from the seed, so a seed repeats a run exactly.
 */
import { vi } from "vitest";
import {
  engineFetch,
  FetchProvider,
  type FetchTransport,
} from "../packages/core/src/io/fetchProvider.ts";
import { parseGltf } from "../packages/core/src/io/gltfParse.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";

// ---- The clock ------------------------------------------------------------

/**
 * Virtual time. It fakes the timers, `performance`, `Date` and
 * `AbortSignal.timeout` together, so the scheduler's `performance.now()`, a
 * backoff timer, a stall timer and a timeout signal all read and wait on the
 * same clock. It starts at zero; nothing moves it but `advance`.
 *
 * Only code that looks a timer up when it runs sees the fake one. A timer
 * function captured before the clock was created (`const t = setTimeout`,
 * at a module's top level or in an object built earlier) stays real, so
 * create the clock first in a test.
 */
export class FakeClock {
  private readonly realTimeout: typeof AbortSignal.timeout;

  constructor() {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "performance",
        "Date",
      ],
    });
    vi.setSystemTime(0);
    this.realTimeout = AbortSignal.timeout;
    Object.defineProperty(AbortSignal, "timeout", {
      configurable: true,
      writable: true,
      value: (ms: number): AbortSignal => {
        const controller = new AbortController();
        setTimeout(
          () =>
            controller.abort(
              new DOMException("The operation timed out.", "TimeoutError"),
            ),
          ms,
        );
        return controller.signal;
      },
    });
  }

  /** Milliseconds since the clock started. */
  now(): number {
    return performance.now();
  }

  /** An HTTP date (a `Retry-After` value) `seconds` after now, on this clock. */
  httpDate(seconds: number): string {
    return new Date(Date.now() + seconds * 1000).toUTCString();
  }

  /**
   * Steps the clock by `ms`, running every timer due on the way in time order
   * and letting the promises each one settles run before the next.
   */
  async advance(ms: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(ms);
  }

  /** Runs every pending timer (the next one first), however far off. */
  async runAll(): Promise<void> {
    await vi.runAllTimersAsync();
  }

  /** Timers waiting. A request that stalls leaves none of its own. */
  get pending(): number {
    return vi.getTimerCount();
  }

  /** Back to real timers and the real `AbortSignal.timeout`. */
  restore(): void {
    Object.defineProperty(AbortSignal, "timeout", {
      configurable: true,
      writable: true,
      value: this.realTimeout,
    });
    vi.useRealTimers();
  }
}

/** A seeded generator (mulberry32): the same seed gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- The script -----------------------------------------------------------

/** What one response does. Fields compose. */
export interface Behavior {
  /** Time to first byte, ms (whole). Default 5. */
  ttfbMs?: number;
  /**
   * Added to the time to first byte: a whole number of ms from 0 to this,
   * drawn from the seed.
   */
  jitterMs?: number;
  /**
   * Body time, ms, from the headers to the last chunk, spread evenly over the
   * chunks in whole ms (the remainder goes to the last). Default 0. The
   * chunks arrive on the clock from the moment the headers are sent,
   * whether or not anyone reads them.
   */
  bodyMs?: number;
  /** The status. Default 200. */
  status?: number;
  /** Response headers, e.g. `"Retry-After": "3"`. */
  headers?: Record<string, string>;
  /** The body. Default: `size` bytes, 64 unless set. */
  body?: Uint8Array | string;
  /** The default body's length, bytes. */
  size?: number;
  /**
   * How many chunks the body arrives in. Default 4, and never more than the
   * body has bytes (no empty chunk). A mid-body fault needs at least 2.
   */
  chunks?: number;
  /**
   * Fails with a network error: after the time to first byte and before any
   * response, or part way through the body (the stream errors after at
   * least one chunk, at a chunk the seed picks unless `faultAfterChunk`, at
   * the time the next chunk was due). A body whose `Content-Length` header
   * states more bytes than it has ends the same way, after its last chunk.
   * As with any stream error, chunks the reader hasn't read are lost.
   */
  drop?: "before" | "mid-body";
  /**
   * Stops answering: before the headers, or part way through the body. The
   * request ends only when it is aborted, with the abort's reason.
   */
  stall?: "ttfb" | "mid-body";
  /** For a mid-body fault: the chunks delivered first (1 to `chunks - 1`). */
  faultAfterChunk?: number;
}

type BehaviorSource = Behavior | Behavior[] | ((attempt: number) => Behavior);
type Matcher = string | RegExp | ((url: string) => boolean);

/**
 * One request, as the network saw it.
 *
 * `outcome` is one of: `pending` (not over), `done` (every byte delivered,
 * or a response with no body), `dropped:before`, `dropped:mid-body`,
 * `aborted:ttfb` and `aborted:mid-body` (the caller's signal, in the phase it
 * was in), `canceled:mid-body` (the caller canceled the body's stream), and
 * `script-error` (the behavior can't be a response: a bug in the test).
 * A signal aborted after `done` changes nothing.
 */
export interface LoggedRequest {
  readonly url: string;
  /**
   * 1 for the first request to this URL, 2 for the next, and so on. The URL
   * is counted without its query and fragment: a renewal that adds a token
   * to the query is the same tile's next attempt.
   */
  readonly attempt: number;
  /** When it was made, ms on the clock. */
  readonly at: number;
  /** When it ended, ms on the clock; absent while pending. */
  end?: number;
  outcome: string;
  /** The status sent; absent when nothing was (a drop or stall before the headers). */
  status?: number;
  /** Body bytes put on the stream, as the network delivered them. */
  bytes: number;
  /** When each chunk arrived, ms on the clock (the network's time, not a reader's). */
  readonly chunkAt: number[];
  /** What the request carried, names lowercased. */
  readonly headers: Readonly<Record<string, string>>;
}

/** Statuses whose response has no body (`new Response` refuses one with it). */
const NO_BODY_STATUSES = new Set([204, 205, 304]);

/** A fetch that fails the way a browser's does: a `TypeError`. */
function networkError(): TypeError {
  return new TypeError("network error");
}

/** A URL without its query and fragment: what an attempt count is keyed by. */
function attemptKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.href;
  } catch {
    return url;
  }
}

/** Whole milliseconds, never negative. */
function wholeMs(ms: number | undefined): number {
  return Math.max(0, Math.round(ms ?? 0));
}

export class FaultNetwork {
  private readonly rules: { match: Matcher; behavior: BehaviorSource }[] = [];
  private readonly attempts = new Map<string, number>();
  private readonly entries: LoggedRequest[] = [];
  private readonly random: () => number;
  private saved: typeof fetch | undefined;

  constructor(
    readonly clock: FakeClock,
    readonly seed = 1,
  ) {
    this.random = seededRandom(seed);
  }

  /**
   * The script: the first matching rule wins (a rule sees the full URL). A
   * behavior list answers the attempts in turn and repeats its last; a
   * function sees the attempt number (1 for the first request to a URL,
   * counted without its query). A request no rule matches gets a 404.
   */
  rule(match: Matcher, behavior: BehaviorSource): this {
    this.rules.push({ match, behavior });
    return this;
  }

  /** Every request, in the order it was made. */
  get log(): ReadonlyArray<LoggedRequest> {
    return this.entries;
  }

  /** The requests whose URL contains `part` (or matches it). */
  requestsFor(part: string | RegExp): LoggedRequest[] {
    return this.entries.filter((e) =>
      typeof part === "string" ? e.url.includes(part) : part.test(e.url),
    );
  }

  /** The fake `fetch`. It honors `init.signal` and `init.headers`. */
  readonly fetch: typeof fetch = (input, init) =>
    this.handle(input, init as RequestInit | undefined);

  /** The same function as a `FetchProvider` transport. */
  readonly transport: FetchTransport = (url, init) => this.fetch(url, init);

  /** Makes the global `fetch` this network. */
  install(): void {
    if (this.saved === undefined) {
      this.saved = globalThis.fetch;
    }
    globalThis.fetch = this.fetch;
  }

  /** Puts back the `fetch` that `install` replaced. */
  uninstall(): void {
    if (this.saved !== undefined) {
      globalThis.fetch = this.saved;
      this.saved = undefined;
    }
  }

  // ---- One request --------------------------------------------------------

  private behaviorFor(url: string, attempt: number): Behavior | undefined {
    const rule = this.rules.find(({ match }) =>
      typeof match === "string"
        ? url.includes(match)
        : typeof match === "function"
          ? match(url)
          : match.test(url),
    );
    if (!rule) {
      return undefined;
    }
    const source = rule.behavior;
    if (typeof source === "function") {
      return source(attempt);
    }
    if (Array.isArray(source)) {
      return source[Math.min(attempt, source.length) - 1] ?? {};
    }
    return source;
  }

  private async handle(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
  ): Promise<Response> {
    const request = input instanceof Request ? input : undefined;
    const url = request?.url ?? String(input);
    const signal = init?.signal ?? request?.signal ?? undefined;
    const headers: Record<string, string> = {};
    new Headers(init?.headers ?? request?.headers).forEach((value, name) => {
      headers[name] = value;
    });
    const key = attemptKey(url);
    const attempt = (this.attempts.get(key) ?? 0) + 1;
    this.attempts.set(key, attempt);
    const entry: LoggedRequest = {
      url,
      attempt,
      at: this.clock.now(),
      outcome: "pending",
      bytes: 0,
      chunkAt: [],
      headers,
    };
    this.entries.push(entry);
    const finish = (outcome: string) => {
      if (entry.outcome === "pending") {
        entry.outcome = outcome;
        entry.end = this.clock.now();
      }
    };

    const behavior = this.behaviorFor(url, attempt) ?? { status: 404 };
    // Draw the random numbers in a fixed order, whatever the behavior does,
    // so a seed means the same thing however a rule is edited.
    const jitter = Math.round(this.random() * (behavior.jitterMs ?? 0));
    const cutDraw = this.random();

    if (signal?.aborted) {
      finish("aborted:ttfb");
      throw signal.reason;
    }
    // Wait for the time to first byte, or the abort.
    if (behavior.stall === "ttfb") {
      await waitForAbort(signal);
      finish("aborted:ttfb");
      throw signal!.reason;
    }
    try {
      await sleep(wholeMs(behavior.ttfbMs ?? 5) + jitter, signal);
    } catch (reason) {
      finish("aborted:ttfb");
      throw reason;
    }
    if (behavior.drop === "before") {
      finish("dropped:before");
      throw networkError();
    }

    const status = behavior.status ?? 200;
    if (!Number.isInteger(status) || status < 200 || status > 599) {
      // `fetch` never resolves with an informational status, and
      // `new Response` refuses one.
      finish("script-error");
      throw new RangeError(
        `a response status is 200 to 599, not ${status} (a script error)`,
      );
    }
    entry.status = status;
    const body = bodyBytes(behavior);
    const stated = Number(
      new Headers(behavior.headers).get("content-length") ?? body.length,
    );
    const responseHeaders = new Headers(behavior.headers);
    if (!responseHeaders.has("content-length")) {
      responseHeaders.set("content-length", String(body.length));
    }
    const respond = (stream: ReadableStream<Uint8Array> | null): Response => {
      const response = new Response(stream, {
        status,
        headers: responseHeaders,
      });
      // A real response knows the URL it answered; a constructed one doesn't.
      Object.defineProperty(response, "url", { value: url });
      return response;
    };
    if (NO_BODY_STATUSES.has(status)) {
      finish("done");
      return respond(null);
    }

    const fault: "drop" | "stall" | undefined =
      behavior.drop === "mid-body"
        ? "drop"
        : behavior.stall === "mid-body"
          ? "stall"
          : undefined;
    if (fault && body.length < 2) {
      finish("script-error");
      throw new RangeError(
        "a mid-body fault needs a body of at least 2 bytes (a script error)",
      );
    }
    const chunks = Math.min(
      Math.max(1, behavior.chunks ?? 4),
      Math.max(1, body.length),
    );
    if (fault && chunks < 2) {
      finish("script-error");
      throw new RangeError(
        "a mid-body fault needs at least 2 chunks (a script error)",
      );
    }
    const faultAfter = Math.min(
      chunks - 1,
      Math.max(
        1,
        behavior.faultAfterChunk ?? 1 + Math.floor(cutDraw * (chunks - 1)),
      ),
    );

    // The whole body's schedule, in whole ms from the headers: chunk `i`
    // arrives at `times[i]`. Each share is the same, the last takes the
    // remainder, so "spread evenly" holds exactly.
    const bodyMs = wholeMs(behavior.bodyMs);
    const share = Math.floor(bodyMs / chunks);
    const times = Array.from({ length: chunks }, (_, i) =>
      i === chunks - 1 ? bodyMs : share * (i + 1),
    );
    // `chunks` is at most the body's length, so no chunk is empty.
    const cuts = Array.from({ length: chunks + 1 }, (_, i) =>
      Math.floor((i * body.length) / chunks),
    );

    const timers: ReturnType<typeof setTimeout>[] = [];
    let onAbort: (() => void) | undefined;
    // Ends the body's life on the network side: no timer left, no listener.
    const settle = () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.length = 0;
      if (onAbort) {
        signal?.removeEventListener("abort", onAbort);
        onAbort = undefined;
      }
    };

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        // Like a real response body, it errors with the abort's reason.
        // The listener lives only while the body does: once every byte has
        // been delivered, a later abort changes nothing.
        if (signal) {
          onAbort = () => {
            onAbort = undefined;
            if (entry.outcome === "pending") {
              finish("aborted:mid-body");
              settle();
              controller.error(signal.reason);
            }
          };
          signal.addEventListener("abort", onAbort, { once: true });
        }
        // Every arrival is on the clock from now, the moment the headers
        // are sent, read or not.
        const at = (ms: number, act: () => void) => {
          if (entry.outcome !== "pending") {
            return;
          }
          if (ms <= 0) {
            // Due at the headers: no timer, so it has arrived with them.
            act();
            return;
          }
          timers.push(
            setTimeout(() => {
              if (entry.outcome === "pending") {
                act();
              }
            }, ms),
          );
        };
        const deliver = (i: number) => {
          const chunk = body.slice(cuts[i]!, cuts[i + 1]!);
          entry.bytes += chunk.length;
          entry.chunkAt.push(this.clock.now());
          controller.enqueue(chunk);
        };
        const last = body.length === 0 ? 0 : fault ? faultAfter : chunks;
        for (let i = 0; i < last; i++) {
          at(times[i]!, () => {
            deliver(i);
            if (i === chunks - 1) {
              if (stated > body.length) {
                // The connection closed before the stated length.
                finish("dropped:mid-body");
                settle();
                controller.error(networkError());
              } else {
                finish("done");
                settle();
                controller.close();
              }
            }
          });
        }
        if (fault === "drop") {
          // The time the next chunk was due.
          at(times[faultAfter]!, () => {
            finish("dropped:mid-body");
            settle();
            controller.error(networkError());
          });
        }
        if (body.length === 0) {
          at(bodyMs, () => {
            finish("done");
            settle();
            controller.close();
          });
        }
      },
      cancel: () => {
        finish("canceled:mid-body");
        settle();
      },
    });
    return respond(stream);
  }
}

function bodyBytes(behavior: Behavior): Uint8Array {
  if (typeof behavior.body === "string") {
    return new TextEncoder().encode(behavior.body);
  }
  if (behavior.body) {
    return behavior.body;
  }
  const bytes = new Uint8Array(behavior.size ?? 64);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = i & 255;
  }
  return bytes;
}

/** Resolves after `ms` on the clock; rejects with the signal's reason if aborted first. */
function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  signal?.throwIfAborted();
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Resolves when the signal aborts; never without one. */
function waitForAbort(signal: AbortSignal | undefined): Promise<void> {
  if (!signal) {
    return new Promise<void>(() => {});
  }
  if (signal.aborted) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

// ---- The adapter ----------------------------------------------------------

/**
 * A valid GLB with one triangle and one draw: the smallest content the real
 * parser (`parseGltf`) turns into an asset. `minBytes` pads its binary chunk
 * so the file is at least that long, for a test that needs a body of a size.
 */
export function triangleGlb(minBytes = 0): Uint8Array {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const indices = new Uint16Array([0, 1, 2]);
  const used = positions.byteLength + 8; // indices: 6 bytes, padded to 8
  const json = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: used }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
      { buffer: 0, byteOffset: positions.byteLength, byteLength: 6 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
      { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
  const pad4 = (n: number) => Math.ceil(n / 4) * 4;
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonBytes = new Uint8Array(pad4(text.length)).fill(0x20);
  jsonBytes.set(text);
  const fixed = 12 + 8 + jsonBytes.length + 8;
  const bin = new Uint8Array(pad4(Math.max(used, minBytes - fixed)));
  bin.set(new Uint8Array(positions.buffer), 0);
  bin.set(new Uint8Array(indices.buffer), positions.byteLength);
  const out = new Uint8Array(fixed + bin.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, out.length, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  out.set(jsonBytes, 20);
  view.setUint32(20 + jsonBytes.length, bin.length, true);
  view.setUint32(24 + jsonBytes.length, 0x004e4942, true); // "BIN"
  out.set(bin, 28 + jsonBytes.length);
  return out;
}

export interface FaultLoadOptions {
  /**
   * The provider the request goes through; it becomes `FetchProvider.default`
   * until `restore`. Default: one over `net.transport`.
   */
  provider?: FetchProvider;
}

/** What `faultLoadGltf` installed. */
export interface FaultLoad {
  readonly spy: ReturnType<typeof vi.spyOn>;
  readonly provider: FetchProvider;
  /** Puts back `engine.loadGltf` and the previous `FetchProvider.default`. */
  restore(): void;
}

/**
 * Replaces `engine.loadGltf` (as tests already `vi.spyOn` it) with the
 * engine's real loader run in process: `parseGltf`, which requests the
 * content through `engineFetch` with `kind: "content"` and so through
 * `FetchProvider.default` (set to the provider under test): origin rules,
 * hooks, credentials, the 401 renewal, then `net`'s script. The response is
 * read and turned into an asset by the engine's own code, so its status
 * check and its errors are the engine's, whatever they become (CS-145 puts
 * the fetch layer there). Nothing is mocked but where the loader runs: a
 * worker on the page, here this thread (the decoders' wasm is the test's to
 * mock, as `decoders.ts` is in the harness's test).
 *
 * `loadGltf`'s `headers` go with every request of the load, as the page does
 * for a worker's (the job's headers, through the provider). `restore` it in
 * `afterEach`; `vi.restoreAllMocks()` alone leaves the provider in place.
 */
export function faultLoadGltf(
  engine: Engine,
  net: FaultNetwork,
  options: FaultLoadOptions = {},
): FaultLoad {
  const provider =
    options.provider ?? new FetchProvider({ transport: net.transport });
  const previous = FetchProvider.default;
  FetchProvider.default = provider;
  const spy = vi
    .spyOn(engine, "loadGltf")
    .mockImplementation(async (url, loadOptions = {}) => {
      const { headers, signal } = loadOptions;
      const { asset } = await parseGltf(
        new URL(url, globalThis.location?.href).href,
        engine.ctx.paths.textureTranscode,
        headers
          ? (target, fetchSignal) =>
              engineFetch(target, {
                kind: "content",
                headers,
                signal: fetchSignal,
              })
          : undefined,
        signal,
      );
      return asset;
    });
  return {
    spy,
    provider,
    restore() {
      spy.mockRestore();
      FetchProvider.default = previous;
    },
  };
}
