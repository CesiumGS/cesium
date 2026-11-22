// The fault-injection harness (CS-144), tested on its own: each behavior it
// scripts (latency, status, Retry-After, drops, stalls, aborts), ordering by
// the virtual clock, a seed that repeats, and the adapter onto the engine's
// real request path. Every timing is on the virtual clock.
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// The decoders' wasm modules don't load in Node, and no test here decodes.
vi.mock("../packages/core/src/io/decoders.ts", () => ({}));
import {
  Credential,
  FetchProvider,
} from "../packages/core/src/io/fetchProvider.ts";
import { fetchTilesetJson } from "../packages/core/src/streaming/Tile.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import {
  FakeClock,
  FaultHttpError,
  FaultNetwork,
  faultLoadGltf,
  seededRandom,
  triangleAsset,
} from "./faultNetwork.ts";
import { fakeEngine } from "./fakeGpu.ts";

const URL_ = "https://tiles.test/a.glb";

let clock: FakeClock;
let net: FaultNetwork;

/** Starts a request and tracks whether it has settled, and how. */
function track<T>(promise: Promise<T>) {
  const state: { done: boolean; value?: T; error?: unknown } = { done: false };
  promise.then(
    (value) => {
      state.done = true;
      state.value = value;
    },
    (error: unknown) => {
      state.done = true;
      state.error = error;
    },
  );
  return state;
}

/** The chunks of a response's body, with the time each arrived. */
async function readChunks(response: Response) {
  const reader = response.body!.getReader();
  const chunks: { at: number; length: number }[] = [];
  for (;;) {
    const next = await reader.read();
    if (next.done) {
      return chunks;
    }
    chunks.push({ at: clock.now(), length: next.value.length });
  }
}

function setup(seed?: number) {
  clock = new FakeClock();
  net = new FaultNetwork(clock, seed);
  return net;
}

afterEach(() => {
  net?.uninstall();
  clock?.restore();
  vi.restoreAllMocks();
});

describe("the virtual clock", () => {
  it("starts at zero and moves only when advanced", async () => {
    setup();
    expect(clock.now()).toBe(0);
    expect(Date.now()).toBe(0);
    await clock.advance(250);
    expect(clock.now()).toBe(250);
    expect(Date.now()).toBe(250);
  });

  it("runs timers in time order, whatever order they were set in", async () => {
    setup();
    const order: number[] = [];
    for (const ms of [300, 100, 200]) {
      setTimeout(() => order.push(ms), ms);
    }
    await clock.advance(1000);
    expect(order).toEqual([100, 200, 300]);
  });

  it("an hour of virtual time takes no real time", async () => {
    setup();
    net.rule("", { stall: "ttfb" });
    const controller = new AbortController();
    const state = track(net.fetch(URL_, { signal: controller.signal }));
    const real = process.hrtime.bigint();
    await clock.advance(60 * 60 * 1000);
    expect(Number(process.hrtime.bigint() - real) / 1e6).toBeLessThan(2000);
    expect(state.done).toBe(false);
    controller.abort();
  });
});

describe("latency", () => {
  it("answers after 5 ms unless the behavior says otherwise", async () => {
    setup().rule(URL_, {});
    const state = track(net.fetch(URL_));
    await clock.advance(4);
    expect(state.done).toBe(false);
    await clock.advance(1);
    expect(state.done).toBe(true);
    expect((state.value as Response).status).toBe(200);
  });

  it("holds the headers back for the time to first byte, not a ms less", async () => {
    setup().rule(URL_, { ttfbMs: 400 });
    const state = track(net.fetch(URL_));
    await clock.advance(399);
    expect(state.done).toBe(false);
    await clock.advance(1);
    expect(state.done).toBe(true);
    expect(net.log[0]).toMatchObject({ at: 0, status: 200 });
  });

  it("spreads the body over its time, one chunk per share of it", async () => {
    setup().rule(URL_, { ttfbMs: 10, bodyMs: 400, chunks: 4, size: 100 });
    const response = await (async () => {
      const p = net.fetch(URL_);
      await clock.advance(10);
      return p;
    })();
    const chunks = readChunks(response);
    await clock.advance(400);
    expect(await chunks).toEqual([
      { at: 110, length: 25 },
      { at: 210, length: 25 },
      { at: 310, length: 25 },
      { at: 410, length: 25 },
    ]);
    expect(net.log[0]).toMatchObject({
      outcome: "done",
      bytes: 100,
      end: 410,
    });
  });

  it("adds jitter drawn from the seed", async () => {
    setup(2).rule(URL_, { ttfbMs: 100, jitterMs: 50 });
    let arrivedAt = -1;
    void net.fetch(URL_).then(() => {
      arrivedAt = clock.now();
    });
    await clock.advance(200);
    // The first draw of the seed is the jitter.
    const expected = 100 + seededRandom(2)() * 50;
    expect(arrivedAt).toBeGreaterThanOrEqual(100);
    expect(Math.abs(arrivedAt - expected)).toBeLessThanOrEqual(1);
    expect(arrivedAt).toBeGreaterThan(130);
  });
});

describe("status and headers", () => {
  it("answers a scripted status with its body and headers", async () => {
    setup().rule(URL_, {
      status: 503,
      body: "busy",
      headers: { "X-Reason": "overload" },
    });
    const state = track(net.fetch(URL_));
    await clock.advance(5);
    const response = state.value as Response;
    expect(response.status).toBe(503);
    expect(response.ok).toBe(false);
    expect(response.headers.get("x-reason")).toBe("overload");
    const text = response.text();
    await clock.advance(1);
    expect(await text).toBe("busy");
  });

  it("answers 404 where no rule matches, and logs it", async () => {
    setup().rule("other", {});
    const state = track(net.fetch("https://tiles.test/nothing.glb"));
    await clock.advance(5);
    expect((state.value as Response).status).toBe(404);
    expect(net.log[0]).toMatchObject({ status: 404, attempt: 1 });
  });

  it("answers 204 with no body", async () => {
    setup().rule(URL_, { status: 204 });
    const state = track(net.fetch(URL_));
    await clock.advance(5);
    const response = state.value as Response;
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(net.log[0]!.outcome).toBe("done");
  });

  it("states a Content-Length that matches the body", async () => {
    setup().rule(URL_, { size: 300 });
    const state = track(net.fetch(URL_));
    await clock.advance(5);
    expect((state.value as Response).headers.get("content-length")).toBe("300");
  });

  it("the first matching rule wins, by string, pattern or function", async () => {
    setup()
      .rule(/tile-1/, { status: 201 })
      .rule((url) => url.endsWith(".json"), { status: 202 })
      .rule("tiles.test", { status: 203 });
    const statuses: number[] = [];
    for (const url of [
      "https://tiles.test/tile-1.glb",
      "https://tiles.test/a.json",
      "https://tiles.test/b.glb",
    ]) {
      const p = net.fetch(url);
      await clock.advance(5);
      statuses.push((await p).status);
    }
    expect(statuses).toEqual([201, 202, 203]);
  });
});

describe("Retry-After", () => {
  it("passes the header through in seconds and as an HTTP date", async () => {
    setup()
      .rule("seconds", { status: 429, headers: { "Retry-After": "3" } })
      .rule("date", {
        status: 503,
        headers: { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" },
      });
    const values: (string | null)[] = [];
    for (const url of ["https://t.test/seconds", "https://t.test/date"]) {
      const p = net.fetch(url);
      await clock.advance(5);
      values.push((await p).headers.get("retry-after"));
    }
    expect(values).toEqual(["3", "Wed, 21 Oct 2026 07:28:00 GMT"]);
  });

  it("a behavior list answers the attempts in turn and repeats its last", async () => {
    setup().rule(URL_, [
      { status: 503, headers: { "Retry-After": "3" } },
      { status: 429 },
      {},
    ]);
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const p = net.fetch(URL_);
      await clock.advance(5);
      statuses.push((await p).status);
    }
    expect(statuses).toEqual([503, 429, 200, 200, 200]);
    expect(net.log.map((e) => e.attempt)).toEqual([1, 2, 3, 4, 5]);
  });

  it("a function sees the attempt number, counted per URL", async () => {
    const seen: number[] = [];
    setup().rule("tiles.test", (attempt) => {
      seen.push(attempt);
      return attempt < 3 ? { status: 503 } : {};
    });
    for (const url of [URL_, URL_, "https://tiles.test/b.glb", URL_]) {
      const p = net.fetch(url);
      await clock.advance(5);
      await p;
    }
    expect(seen).toEqual([1, 2, 1, 3]);
  });
});

describe("drops", () => {
  it("drops before any response, with a network error, after the time to first byte", async () => {
    setup().rule(URL_, { ttfbMs: 30, drop: "before" });
    const state = track(net.fetch(URL_));
    await clock.advance(29);
    expect(state.done).toBe(false);
    await clock.advance(1);
    expect(state.error).toBeInstanceOf(TypeError);
    expect(net.log[0]).toMatchObject({
      outcome: "dropped:before",
      end: 30,
    });
    expect(net.log[0]!.status).toBeUndefined();
  });

  it("drops mid-body: the headers arrive, some chunks, then the stream errors", async () => {
    setup().rule(URL_, {
      ttfbMs: 10,
      bodyMs: 400,
      chunks: 4,
      size: 100,
      drop: "mid-body",
      faultAfterChunk: 2,
    });
    const p = net.fetch(URL_);
    await clock.advance(10);
    const response = await p;
    expect(response.headers.get("content-length")).toBe("100");
    const reader = response.body!.getReader();
    const got: number[] = [];
    let failure: unknown;
    const reading = (async () => {
      try {
        for (;;) {
          const next = await reader.read();
          if (next.done) {
            return;
          }
          got.push(next.value.length);
        }
      } catch (error) {
        failure = error;
      }
    })();
    await clock.advance(400);
    await reading;
    expect(got).toEqual([25, 25]);
    expect(failure).toBeInstanceOf(TypeError);
    expect(net.log[0]).toMatchObject({
      outcome: "dropped:mid-body",
      bytes: 50,
      status: 200,
    });
  });

  it("a mid-body drop always delivers at least one chunk and not all of them", async () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const n = setup(seed).rule(URL_, {
        bodyMs: 80,
        chunks: 5,
        size: 100,
        drop: "mid-body",
      });
      const p = n.fetch(URL_);
      await clock.advance(5);
      const response = await p;
      const read = response.arrayBuffer().catch(() => undefined);
      await clock.advance(80);
      await read;
      expect(n.log[0]!.bytes).toBeGreaterThanOrEqual(20);
      expect(n.log[0]!.bytes).toBeLessThanOrEqual(80);
      expect(n.log[0]!.outcome).toBe("dropped:mid-body");
      clock.restore();
    }
  });
});

describe("stalls", () => {
  it("stalls before the headers until aborted, with the abort's reason", async () => {
    setup().rule(URL_, { stall: "ttfb" });
    const controller = new AbortController();
    const state = track(net.fetch(URL_, { signal: controller.signal }));
    await clock.advance(10 * 60 * 1000);
    expect(state.done).toBe(false);
    const reason = new DOMException("took too long", "TimeoutError");
    controller.abort(reason);
    await clock.advance(0);
    expect(state.error).toBe(reason);
    expect(net.log[0]).toMatchObject({
      outcome: "aborted:ttfb",
      end: 10 * 60 * 1000,
    });
  });

  it("stalls mid-body: the headers and some chunks arrive, then nothing", async () => {
    setup().rule(URL_, {
      ttfbMs: 10,
      bodyMs: 400,
      chunks: 4,
      size: 100,
      stall: "mid-body",
      faultAfterChunk: 1,
    });
    const controller = new AbortController();
    const p = net.fetch(URL_, { signal: controller.signal });
    await clock.advance(10);
    const response = await p;
    const reader = response.body!.getReader();
    const first = track(reader.read());
    await clock.advance(100);
    expect(first.done).toBe(true);
    const second = track(reader.read());
    await clock.advance(60 * 1000);
    expect(second.done).toBe(false);
    const reason = new DOMException("stalled", "TimeoutError");
    controller.abort(reason);
    await clock.advance(0);
    expect(second.error).toBe(reason);
    expect(net.log[0]).toMatchObject({
      outcome: "aborted:mid-body",
      bytes: 25,
    });
  });

  it("a stall timer on the same clock fires at its time and ends the request", async () => {
    // What fetchBytes (CS-145) will do: arm a timer, abort with a
    // TimeoutError. Here: the timer and the stall run on one clock.
    setup().rule(URL_, { stall: "ttfb" });
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException("ttfb", "TimeoutError")),
      15_000,
    );
    const state = track(net.fetch(URL_, { signal: controller.signal }));
    await clock.advance(14_999);
    expect(state.done).toBe(false);
    await clock.advance(1);
    expect((state.error as DOMException).name).toBe("TimeoutError");
    expect(net.log[0]!.end).toBe(15_000);
  });
});

describe("aborts", () => {
  it("an already aborted signal ends the request at once, with its reason", async () => {
    setup().rule(URL_, {});
    const controller = new AbortController();
    controller.abort();
    await expect(
      net.fetch(URL_, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(net.log[0]).toMatchObject({ outcome: "aborted:ttfb", end: 0 });
  });

  it("an abort before the headers rejects the fetch, and no response ever comes", async () => {
    setup().rule(URL_, { ttfbMs: 100 });
    const controller = new AbortController();
    const state = track(net.fetch(URL_, { signal: controller.signal }));
    await clock.advance(40);
    controller.abort();
    await clock.advance(0);
    expect((state.error as DOMException).name).toBe("AbortError");
    await clock.advance(1000);
    expect(net.log[0]).toMatchObject({ outcome: "aborted:ttfb", end: 40 });
    expect(clock.pending).toBe(0);
  });

  it("an abort mid-body errors the stream and stops the chunks", async () => {
    setup().rule(URL_, { ttfbMs: 10, bodyMs: 400, chunks: 4, size: 100 });
    const controller = new AbortController();
    const p = net.fetch(URL_, { signal: controller.signal });
    await clock.advance(10);
    const response = await p;
    const reading = response.arrayBuffer().then(
      () => undefined,
      (error: unknown) => error,
    );
    await clock.advance(150);
    controller.abort();
    const error = (await reading) as DOMException;
    expect(error.name).toBe("AbortError");
    await clock.advance(1000);
    expect(net.log[0]).toMatchObject({
      outcome: "aborted:mid-body",
      bytes: 25,
    });
  });

  it("tells a cancel (AbortError) from a timeout (TimeoutError) by the reason it carries", async () => {
    setup().rule(URL_, { stall: "ttfb" });
    const a = new AbortController();
    const b = new AbortController();
    const canceled = track(net.fetch(URL_, { signal: a.signal }));
    const timedOut = track(net.fetch(URL_, { signal: b.signal }));
    a.abort();
    b.abort(new DOMException("ttfb", "TimeoutError"));
    await clock.advance(0);
    expect((canceled.error as DOMException).name).toBe("AbortError");
    expect((timedOut.error as DOMException).name).toBe("TimeoutError");
  });

  it("canceling the body's stream is logged and stops the chunks", async () => {
    setup().rule(URL_, { bodyMs: 400, chunks: 4, size: 100 });
    const p = net.fetch(URL_);
    await clock.advance(5);
    const response = await p;
    const reader = response.body!.getReader();
    const first = reader.read();
    await clock.advance(100);
    await first;
    await reader.cancel();
    await clock.advance(1000);
    expect(net.log[0]).toMatchObject({
      outcome: "canceled:mid-body",
      bytes: 25,
    });
  });
});

describe("ordering by the clock", () => {
  it("answers requests in the order of their times, not the order they were made", async () => {
    setup()
      .rule("slow", { ttfbMs: 300 })
      .rule("mid", { ttfbMs: 100 })
      .rule("fast", { ttfbMs: 20 });
    const arrived: string[] = [];
    const at = () => clock.now();
    for (const name of ["slow", "mid", "fast"]) {
      void net.fetch(`https://t.test/${name}`).then(() => {
        arrived.push(`${name}@${at()}`);
      });
    }
    await clock.advance(1000);
    expect(arrived).toEqual(["fast@20", "mid@100", "slow@300"]);
  });

  it("a request made later starts later on the clock", async () => {
    setup().rule("", { ttfbMs: 50 });
    void net.fetch("https://t.test/one");
    await clock.advance(120);
    void net.fetch("https://t.test/two");
    await clock.advance(200);
    expect(net.log.map((e) => [e.at, e.status])).toEqual([
      [0, 200],
      [120, 200],
    ]);
  });

  it("requests that are due at the same time are answered in the order they were made", async () => {
    setup().rule("", { ttfbMs: 25 });
    const arrived: string[] = [];
    for (const name of ["a", "b", "c"]) {
      void net.fetch(`https://t.test/${name}`).then(() => arrived.push(name));
    }
    await clock.advance(25);
    expect(arrived).toEqual(["a", "b", "c"]);
  });

  it("interleaves the chunks of two bodies by time", async () => {
    setup()
      .rule("a", { ttfbMs: 0, bodyMs: 200, chunks: 2, size: 10 })
      .rule("b", { ttfbMs: 0, bodyMs: 100, chunks: 2, size: 10 });
    const events: string[] = [];
    const at = () => clock.now();
    for (const name of ["a", "b"]) {
      void net.fetch(`https://t.test/${name}`).then(async (response) => {
        const reader = response.body!.getReader();
        for (;;) {
          const next = await reader.read();
          if (next.done) {
            return;
          }
          events.push(`${name}@${at()}`);
        }
      });
    }
    await clock.advance(500);
    expect(events).toEqual(["b@50", "a@100", "b@100", "a@200"]);
  });
});

describe("a seed that repeats", () => {
  /** A script with every random choice in it, run to the end. */
  async function run(seed: number) {
    const n = setup(seed)
      .rule("jitter", { ttfbMs: 20, jitterMs: 200, bodyMs: 60, size: 40 })
      .rule("cut", { bodyMs: 100, chunks: 6, size: 60, drop: "mid-body" });
    const jobs: Promise<unknown>[] = [];
    for (const url of [
      "https://t.test/jitter-1",
      "https://t.test/cut-1",
      "https://t.test/jitter-2",
      "https://t.test/cut-2",
    ]) {
      jobs.push(
        n
          .fetch(url)
          .then((r) => r.arrayBuffer())
          .catch(() => undefined),
      );
    }
    await clock.advance(2000);
    await Promise.all(jobs);
    const log = n.log.map(({ url, at, end, outcome, bytes }) => ({
      url,
      at,
      end,
      outcome,
      bytes,
    }));
    clock.restore();
    return log;
  }

  it("the same seed repeats a run exactly", async () => {
    const first = await run(2024);
    const second = await run(2024);
    expect(second).toEqual(first);
    expect(first.map((e) => e.end)).not.toContain(undefined);
  });

  it("another seed gives another run", async () => {
    const a = await run(1);
    const b = await run(2);
    expect(b).not.toEqual(a);
  });

  it("the generator repeats and stays in [0, 1)", () => {
    const one = seededRandom(9);
    const two = seededRandom(9);
    const seq = Array.from({ length: 1000 }, () => one());
    expect(Array.from({ length: 1000 }, () => two())).toEqual(seq);
    expect(Math.min(...seq)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seq)).toBeLessThan(1);
    expect(new Set(seq).size).toBeGreaterThan(990);
  });

  it("adding a rule's unused fields doesn't shift later random draws", async () => {
    // Every request draws the same two numbers whatever it does, so
    // editing one rule doesn't change the jitter of another.
    const draw = async (extra: boolean) => {
      const n = setup(5)
        .rule("a", extra ? { status: 503 } : {})
        .rule("b", {
          ttfbMs: 0,
          jitterMs: 1000,
        });
      void n.fetch("https://t.test/a");
      const p = n.fetch("https://t.test/b");
      await clock.advance(1000);
      await p;
      const at = n.log[1]!.at;
      clock.restore();
      return at;
    };
    expect(await draw(true)).toBe(await draw(false));
  });
});

describe("the adapter on the real request path", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  afterAll(() => vi.restoreAllMocks());

  it("loads the asset through the provider, with the source's headers", async () => {
    setup().rule(URL_, { ttfbMs: 40, bodyMs: 100, size: 200 });
    faultLoadGltf(engine, net);
    const started = track(
      engine.loadGltf(URL_, { headers: { Authorization: "Bearer fake-1" } }),
    );
    await clock.advance(139);
    expect(started.done).toBe(false);
    await clock.advance(1);
    const asset = started.value as Awaited<ReturnType<Engine["loadGltf"]>>;
    expect(asset.draws).toHaveLength(triangleAsset().draws.length);
    expect(asset.timing).toMatchObject({ bytes: 200, networkMs: 140 });
    expect(net.log[0]!.headers["authorization"]).toBe("Bearer fake-1");
  });

  it("a status other than success fails with its status and Retry-After", async () => {
    setup().rule(URL_, {
      status: 503,
      headers: { "Retry-After": "3" },
    });
    faultLoadGltf(engine, net);
    const state = track(engine.loadGltf(URL_));
    await clock.advance(5);
    expect(state.error).toBeInstanceOf(FaultHttpError);
    expect(state.error).toMatchObject({ status: 503, retryAfter: "3" });
    // The message names the kind of request and the status, never the URL.
    expect((state.error as Error).message).not.toContain("tiles.test");
  });

  it("a drop mid-body and a short body are network failures", async () => {
    setup().rule(URL_, [
      { drop: "mid-body", bodyMs: 40, size: 80 },
      // A body that ends short of the Content-Length it stated.
      {
        size: 80,
        headers: { "Content-Length": "200" },
      },
    ]);
    faultLoadGltf(engine, net);
    const dropped = track(engine.loadGltf(URL_));
    await clock.advance(50);
    expect(dropped.error).toBeInstanceOf(TypeError);
    const short = track(engine.loadGltf(URL_));
    await clock.advance(10);
    expect(short.error).toBeInstanceOf(TypeError);
  });

  it("a cancel is an AbortError and a stall ends only when aborted", async () => {
    setup().rule(URL_, { stall: "mid-body", bodyMs: 40, size: 80 });
    faultLoadGltf(engine, net);
    const controller = new AbortController();
    const state = track(engine.loadGltf(URL_, { signal: controller.signal }));
    await clock.advance(30 * 1000);
    expect(state.done).toBe(false);
    controller.abort();
    await clock.advance(0);
    expect((state.error as DOMException).name).toBe("AbortError");
  });

  it("drives the provider's renewal: a 401 refreshes the credential, once, and retries", async () => {
    setup().rule(URL_, (attempt) => (attempt === 1 ? { status: 401 } : {}));
    const credential = new Credential(
      { headers: { Authorization: "Bearer fake-old" } },
      {
        refresh: async () => ({
          headers: { Authorization: "Bearer fake-new" },
        }),
      },
    );
    faultLoadGltf(engine, net);
    const state = track(engine.loadGltf(URL_, { headers: credential.headers }));
    await clock.advance(20);
    expect(state.error).toBeUndefined();
    expect(state.done).toBe(true);
    expect(net.log.map((e) => [e.status, e.headers["authorization"]])).toEqual([
      [401, "Bearer fake-old"],
      [200, "Bearer fake-new"],
    ]);
  });

  it("takes the body reader and the provider as options (what CS-145 plugs into)", async () => {
    setup().rule(URL_, {});
    const calls: string[] = [];
    const provider = new FetchProvider({
      transport: net.transport,
      onRequest: (request) => {
        calls.push(request.kind);
      },
    });
    faultLoadGltf(engine, net, {
      provider,
      bytes: async (url, init) => {
        const response = await init.provider.fetch(url, { kind: "asset" });
        return new Uint8Array(await response.arrayBuffer());
      },
    });
    const state = track(engine.loadGltf(URL_));
    await clock.advance(10);
    expect(state.done).toBe(true);
    expect(calls).toEqual(["asset"]);
  });

  it("install() makes the engine's own fetches (a tileset's JSON) go through the script", async () => {
    setup().rule("tileset.json", {
      ttfbMs: 25,
      body: JSON.stringify({ asset: { version: "1.1" } }),
    });
    net.install();
    const state = track(
      fetchTilesetJson("https://tiles.test/tileset.json", undefined),
    );
    await clock.advance(24);
    expect(state.done).toBe(false);
    await clock.advance(1);
    expect(state.value).toEqual({ asset: { version: "1.1" } });
    expect(net.log).toHaveLength(1);
    net.uninstall();
    expect(globalThis.fetch).not.toBe(net.fetch);
  });
});
