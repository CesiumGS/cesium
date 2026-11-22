/**
 * The fault-injection harness (CS-144): a fake `fetch` driven by a script, on
 * a virtual clock, and an adapter that runs the engine's real request path
 * (`FetchProvider`, then the tile code) on the fake GPU. Test code, not
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
import * as m4 from "../packages/core/src/math/mat4.ts";
import {
  FetchProvider,
  type FetchTransport,
} from "../packages/core/src/io/fetchProvider.ts";
import type { GltfAsset } from "../packages/core/src/io/gltfTypes.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";

// ---- The clock ------------------------------------------------------------

/**
 * Virtual time. It fakes the timers, `performance` and `Date` together, so the
 * scheduler's `performance.now()`, a backoff timer and a stall timer all read
 * and wait on the same clock. It starts at zero; nothing moves it but
 * `advance`.
 */
export class FakeClock {
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
  }

  /** Milliseconds since the clock started. */
  now(): number {
    return performance.now();
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

  /** Back to real timers. */
  restore(): void {
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
  /** Time to first byte, ms. Default 5. */
  ttfbMs?: number;
  /** Added to the time to first byte: a random 0 to this, from the seed. */
  jitterMs?: number;
  /** Body time, ms, spread evenly over the chunks. Default 0. */
  bodyMs?: number;
  /** The status. Default 200. */
  status?: number;
  /** Response headers, e.g. `"Retry-After": "3"`. */
  headers?: Record<string, string>;
  /** The body. Default: `size` bytes, 64 unless set. */
  body?: Uint8Array | string;
  /** The default body's length, bytes. */
  size?: number;
  /** How many chunks the body arrives in. Default 4 (at least 2 for a mid-body fault). */
  chunks?: number;
  /**
   * Fails with a network error: after the time to first byte and before any
   * response, or part way through the body (the stream errors after at
   * least one chunk, at a chunk the seed picks unless `faultAfterChunk`).
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
 * was in), `canceled:mid-body` (the caller canceled the body's stream).
 */
export interface LoggedRequest {
  readonly url: string;
  /** 1 for the first request to this URL, 2 for the next, and so on. */
  readonly attempt: number;
  /** When it was made, ms on the clock. */
  readonly at: number;
  /** When it ended, ms on the clock; absent while pending. */
  end?: number;
  outcome: string;
  /** The status sent; absent when nothing was (a drop or stall before the headers). */
  status?: number;
  /** Body bytes delivered. */
  bytes: number;
  /** What the request carried, names lowercased. */
  readonly headers: Readonly<Record<string, string>>;
}

const NO_BODY_STATUSES = new Set([101, 204, 205, 304]);

/** A fetch that fails the way a browser's does: a `TypeError`. */
function networkError(): TypeError {
  return new TypeError("network error");
}

export class FaultNetwork {
  private readonly rules: { match: Matcher; behavior: BehaviorSource }[] = [];
  private readonly attempts = new Map<string, number>();
  private readonly entries: LoggedRequest[] = [];
  private readonly random: () => number;
  private installed = false;

  constructor(
    readonly clock: FakeClock,
    readonly seed = 1,
  ) {
    this.random = seededRandom(seed);
  }

  /**
   * The script: the first matching rule wins. A behavior list answers the
   * attempts in turn and repeats its last; a function sees the attempt number
   * (1 for the first request to a URL). A request no rule matches gets a 404.
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

  /** Makes the global `fetch` this network (`vi.stubGlobal`). */
  install(): void {
    vi.stubGlobal("fetch", this.fetch);
    this.installed = true;
  }

  /** Puts the global `fetch` back, if `install` changed it. */
  uninstall(): void {
    if (this.installed) {
      vi.unstubAllGlobals();
      this.installed = false;
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
    const attempt = (this.attempts.get(url) ?? 0) + 1;
    this.attempts.set(url, attempt);
    const entry: LoggedRequest = {
      url,
      attempt,
      at: this.clock.now(),
      outcome: "pending",
      bytes: 0,
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
    const jitter = this.random() * (behavior.jitterMs ?? 0);
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
      await sleep((behavior.ttfbMs ?? 5) + jitter, signal);
    } catch (reason) {
      finish("aborted:ttfb");
      throw reason;
    }
    if (behavior.drop === "before") {
      finish("dropped:before");
      throw networkError();
    }

    const status = behavior.status ?? 200;
    entry.status = status;
    const body = bodyBytes(behavior);
    const responseHeaders = new Headers(behavior.headers);
    if (!responseHeaders.has("content-length")) {
      responseHeaders.set("content-length", String(body.length));
    }
    if (NO_BODY_STATUSES.has(status)) {
      finish("done");
      return new Response(null, { status, headers: responseHeaders });
    }

    const chunks = Math.max(
      behavior.drop === "mid-body" || behavior.stall === "mid-body" ? 2 : 1,
      Math.min(behavior.chunks ?? 4, Math.max(1, body.length)),
    );
    const fault: "drop" | "stall" | undefined =
      behavior.drop === "mid-body"
        ? "drop"
        : behavior.stall === "mid-body"
          ? "stall"
          : undefined;
    const faultAfter = Math.min(
      chunks - 1,
      Math.max(
        1,
        behavior.faultAfterChunk ?? 1 + Math.floor(cutDraw * (chunks - 1)),
      ),
    );
    const perChunkMs = (behavior.bodyMs ?? 0) / chunks;
    const size = Math.ceil(body.length / chunks);
    let delivered = 0;
    const stream = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          // Like a real response body, it errors with the abort's reason.
          signal?.addEventListener(
            "abort",
            () => {
              finish("aborted:mid-body");
              controller.error(signal.reason);
            },
            { once: true },
          );
        },
        pull: async (controller) => {
          if (entry.outcome !== "pending") {
            return;
          }
          if (fault && delivered === faultAfter) {
            if (fault === "drop") {
              await sleep(perChunkMs, signal);
              finish("dropped:mid-body");
              controller.error(networkError());
            } else {
              await waitForAbort(signal);
            }
            return;
          }
          await sleep(perChunkMs, signal);
          const from = delivered * size;
          const chunk = body.slice(from, from + size);
          delivered++;
          entry.bytes += chunk.length;
          controller.enqueue(chunk);
          if (delivered === chunks) {
            finish("done");
            controller.close();
          }
        },
        cancel: () => {
          finish("canceled:mid-body");
        },
      },
      { highWaterMark: 0 },
    );
    return new Response(stream, { status, headers: responseHeaders });
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

/** The smallest asset a tile can draw: one triangle, one draw. */
export function triangleAsset(): GltfAsset {
  const mesh = {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
  };
  return {
    meshes: [mesh],
    materials: [],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

/** What the adapter reads a body with: bytes, or a failure thrown. */
export type FaultBytes = (
  url: string,
  init: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    provider: FetchProvider;
  },
) => Promise<Uint8Array>;

/** An HTTP status that isn't a success, as the stand-in reader throws it. */
export class FaultHttpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null,
  ) {
    super(`asset, ${status}`);
  }
}

/**
 * The stand-in body reader: the response's chunks one by one (so a stall or a
 * mid-body drop meets a real chunk loop), a non-2xx status thrown as a
 * `FaultHttpError`, a body that ends short of its `Content-Length` as a
 * network `TypeError`. CS-145 replaces it with `fetchBytes` through the
 * `bytes` option; the message never holds the URL.
 */
export const readBytes: FaultBytes = async (url, init) => {
  const response = await init.provider.fetch(url, {
    kind: "asset",
    ...(init.headers ? { headers: init.headers } : {}),
    ...(init.signal ? { signal: init.signal } : {}),
  });
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    throw new FaultHttpError(
      response.status,
      response.headers.get("retry-after"),
    );
  }
  const stated = Number(response.headers.get("content-length") ?? NaN);
  const parts: Uint8Array[] = [];
  let length = 0;
  const reader = response.body?.getReader();
  for (;;) {
    const next = await reader?.read();
    if (!next || next.done) {
      break;
    }
    parts.push(next.value);
    length += next.value.length;
  }
  if (Number.isFinite(stated) && length < stated) {
    throw networkError();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
};

export interface FaultLoadOptions {
  /** The asset a successful load returns. Default `triangleAsset()`. */
  asset?: () => GltfAsset;
  /** How a body is read. Default `readBytes`. */
  bytes?: FaultBytes;
  /** The provider the request goes through. Default: one over `net.transport`. */
  provider?: FetchProvider;
}

/**
 * Replaces `engine.loadGltf` (as tests already `vi.spyOn` it) with a request
 * over the network's script: through `FetchProvider` (origin rules, hooks,
 * credentials, the 401 renewal), then a body read, then the usual asset. The
 * real timers, scheduler and tile code run; only the decode is faked. The
 * same wrapper stands in for a terrain or imagery request on the fake GPU.
 * Restore with `vi.restoreAllMocks()`.
 */
export function faultLoadGltf(
  engine: Engine,
  net: FaultNetwork,
  options: FaultLoadOptions = {},
): ReturnType<typeof vi.spyOn> {
  const provider =
    options.provider ?? new FetchProvider({ transport: net.transport });
  const read = options.bytes ?? readBytes;
  const make = options.asset ?? triangleAsset;
  return vi
    .spyOn(engine, "loadGltf")
    .mockImplementation(async (url, loadOptions = {}) => {
      const started = net.clock.now();
      const bytes = await read(String(url), {
        ...(loadOptions.headers ? { headers: loadOptions.headers } : {}),
        ...(loadOptions.signal ? { signal: loadOptions.signal } : {}),
        provider,
      });
      return {
        ...make(),
        timing: {
          format: "glb",
          networkMs: net.clock.now() - started,
          bytes: bytes.length,
          decodeMs: 0,
          images: {},
        },
      };
    });
}
