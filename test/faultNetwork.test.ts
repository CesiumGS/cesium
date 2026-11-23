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
  FaultNetwork,
  faultLoadGltf,
  seededRandom,
  triangleGlb,
  type FaultLoad,
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

  it("fakes AbortSignal.timeout on the clock, and restore puts the real one back", async () => {
    const real = AbortSignal.timeout;
    setup();
    expect(AbortSignal.timeout).not.toBe(real);
    const signal = AbortSignal.timeout(15_000);
    await clock.advance(14_999);
    expect(signal.aborted).toBe(false);
    await clock.advance(1);
    expect(signal.aborted).toBe(true);
    expect((signal.reason as DOMException).name).toBe("TimeoutError");
    // A timeout signal ends a stalled request at its time on the clock.
    net.rule(URL_, { stall: "ttfb" });
    const state = track(net.fetch(URL_, { signal: AbortSignal.timeout(500) }));
    await clock.advance(499);
    expect(state.done).toBe(false);
    await clock.advance(1);
    expect((state.error as DOMException).name).toBe("TimeoutError");
    clock.restore();
    expect(AbortSignal.timeout).toBe(real);
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

  it("gives each chunk a whole number of ms, the remainder to the last", async () => {
    setup().rule(URL_, { ttfbMs: 0, bodyMs: 10, chunks: 4, size: 40 });
    const p = net.fetch(URL_);
    await clock.advance(0);
    const response = await p;
    const chunks = readChunks(response);
    await clock.advance(10);
    expect((await chunks).map((c) => c.at)).toEqual([2, 4, 6, 10]);
    expect(net.log[0]!.chunkAt).toEqual([2, 4, 6, 10]);
  });

  it("rounds a fractional time to whole ms", async () => {
    setup().rule(URL_, { ttfbMs: 10.4, bodyMs: 100.6, chunks: 2, size: 10 });
    const p = net.fetch(URL_);
    await clock.advance(10);
    await p;
    await clock.advance(101);
    expect(net.log[0]).toMatchObject({ end: 111, status: 200 });
    expect(net.log[0]!.chunkAt).toEqual([60, 111]);
  });

  it("adds jitter drawn from the seed", async () => {
    setup(2).rule(URL_, { ttfbMs: 100, jitterMs: 50 });
    let arrivedAt = -1;
    void net.fetch(URL_).then(() => {
      arrivedAt = clock.now();
    });
    await clock.advance(200);
    // The first draw of the seed is the jitter, in whole ms.
    const expected = 100 + Math.round(seededRandom(2)() * 50);
    expect(arrivedAt).toBe(expected);
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

  it("answers 204, 205 and 304 with no body", async () => {
    setup();
    for (const status of [204, 205, 304]) {
      net.rule(`status-${status}`, { status });
      const p = net.fetch(`https://tiles.test/status-${status}`);
      await clock.advance(5);
      const response = await p;
      expect(response.status).toBe(status);
      expect(response.body).toBeNull();
    }
    expect(net.log.map((e) => e.outcome)).toEqual(["done", "done", "done"]);
  });

  it("refuses a status no fetch resolves with (below 200, above 599) as a script error", async () => {
    setup();
    // `new Response` throws for these; so does the harness, at once and plainly.
    expect(() => new Response(null, { status: 101 })).toThrow(RangeError);
    expect(() => new Response(null, { status: 600 })).toThrow(RangeError);
    for (const status of [101, 199, 600]) {
      net.rule(`status-${status}`, { status });
      const state = track(net.fetch(`https://tiles.test/status-${status}`));
      await clock.advance(5);
      expect(state.error).toBeInstanceOf(RangeError);
    }
    expect(net.log.map((e) => e.outcome)).toEqual([
      "script-error",
      "script-error",
      "script-error",
    ]);
    // The boundaries themselves are responses.
    for (const status of [200, 599]) {
      net.rule(`ok-${status}`, { status });
      const p = net.fetch(`https://tiles.test/ok-${status}`);
      await clock.advance(5);
      expect((await p).status).toBe(status);
    }
  });

  it("a response knows the URL it answered", async () => {
    setup().rule("", {});
    const p = net.fetch("https://tiles.test/a.glb?token=1");
    await clock.advance(5);
    expect((await p).url).toBe("https://tiles.test/a.glb?token=1");
  });

  it("has no empty chunk when the body is shorter than its chunk count", async () => {
    setup().rule(URL_, { ttfbMs: 0, bodyMs: 40, chunks: 8, size: 3 });
    const p = net.fetch(URL_);
    await clock.advance(0);
    const response = await p;
    const chunks = readChunks(response);
    await clock.advance(40);
    expect((await chunks).map((c) => c.length)).toEqual([1, 1, 1]);
    expect(net.log[0]).toMatchObject({ bytes: 3, outcome: "done" });
  });

  it("an empty body closes on the clock with no chunk", async () => {
    setup().rule(URL_, { ttfbMs: 0, bodyMs: 30, body: "" });
    const p = net.fetch(URL_);
    await clock.advance(0);
    const response = await p;
    const text = response.text();
    await clock.advance(29);
    expect(net.log[0]!.outcome).toBe("pending");
    await clock.advance(1);
    expect(await text).toBe("");
    expect(net.log[0]).toMatchObject({ outcome: "done", end: 30, bytes: 0 });
  });

  it("a mid-body fault with fewer than two bytes is a script error", async () => {
    setup().rule(URL_, { drop: "mid-body", size: 1 });
    const state = track(net.fetch(URL_));
    await clock.advance(5);
    expect(state.error).toBeInstanceOf(RangeError);
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
    setup();
    await clock.advance(1000);
    // The date is made on the clock: N seconds after now, not a fixed day.
    const date = clock.httpDate(30);
    expect(date).toBe("Thu, 01 Jan 1970 00:00:31 GMT");
    net
      .rule("seconds", { status: 429, headers: { "Retry-After": "3" } })
      .rule("date", { status: 503, headers: { "Retry-After": date } });
    const values: (string | null)[] = [];
    for (const url of ["https://t.test/seconds", "https://t.test/date"]) {
      const p = net.fetch(url);
      await clock.advance(5);
      values.push((await p).headers.get("retry-after"));
    }
    expect(values).toEqual(["3", date]);
    // What a client does with it: the seconds left, by the same clock.
    expect(Date.parse(date) - Date.now()).toBe(30_000 - 10);
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

describe("attempt counts", () => {
  it("count a tile's requests without the query, so a renewal's token is the next attempt", async () => {
    setup().rule("tiles.test", (attempt) =>
      attempt === 1 ? { status: 401 } : {},
    );
    const credential = new Credential(
      {
        headers: { Authorization: "Bearer fake-old" },
        query: { token: "old" },
      },
      {
        refresh: async () => ({
          headers: { Authorization: "Bearer fake-new" },
          query: { token: "new" },
        }),
      },
    );
    const provider = new FetchProvider({ transport: net.transport });
    const state = track(
      provider.fetch(URL_, { kind: "content", headers: credential.headers }),
    );
    await clock.advance(20);
    expect(state.done).toBe(true);
    expect((state.value as Response).status).toBe(200);
    expect(
      net.log.map((e) => [e.attempt, e.status, new URL(e.url).search]),
    ).toEqual([
      [1, 401, "?token=old"],
      [2, 200, "?token=new"],
    ]);
  });

  it("keep another tile's count apart", async () => {
    const seen: number[] = [];
    setup().rule("tiles.test", (attempt) => {
      seen.push(attempt);
      return {};
    });
    for (const url of [
      "https://tiles.test/a.glb?x=1",
      "https://tiles.test/b.glb?x=1",
      "https://tiles.test/a.glb#part",
      "https://tiles.test/a.glb?x=2",
    ]) {
      const p = net.fetch(url);
      await clock.advance(5);
      await p;
    }
    expect(seen).toEqual([1, 1, 2, 3]);
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

  it("an abort after the last chunk is delivered but before it is read changes nothing", async () => {
    setup().rule(URL_, { ttfbMs: 10, bodyMs: 400, chunks: 4, size: 100 });
    const controller = new AbortController();
    const p = net.fetch(URL_, { signal: controller.signal });
    await clock.advance(10);
    const response = await p;
    await clock.advance(400);
    expect(net.log[0]!.outcome).toBe("done");
    controller.abort();
    // The whole body is still there to read.
    expect((await response.arrayBuffer()).byteLength).toBe(100);
    expect(net.log[0]).toMatchObject({ outcome: "done", end: 410, bytes: 100 });
  });

  it("an abort after the body is read changes nothing", async () => {
    setup().rule(URL_, { ttfbMs: 10, bodyMs: 400, chunks: 4, size: 100 });
    const controller = new AbortController();
    const p = net.fetch(URL_, { signal: controller.signal });
    await clock.advance(10);
    const response = await p;
    const read = response.arrayBuffer();
    await clock.advance(400);
    expect((await read).byteLength).toBe(100);
    controller.abort();
    await clock.advance(1000);
    expect(net.log[0]).toMatchObject({ outcome: "done", end: 410, bytes: 100 });
  });

  it("an abort after a drop or a cancel changes nothing either", async () => {
    setup()
      .rule("drop", { bodyMs: 100, chunks: 4, size: 100, drop: "mid-body" })
      .rule("cancel", { bodyMs: 100, chunks: 4, size: 100 });
    const a = new AbortController();
    const b = new AbortController();
    const dropped = net.fetch("https://t.test/drop", { signal: a.signal });
    const canceled = net.fetch("https://t.test/cancel", { signal: b.signal });
    await clock.advance(5);
    const dropBody = (await dropped).arrayBuffer().catch(() => undefined);
    await (await canceled).body!.cancel();
    await clock.advance(200);
    await dropBody;
    const before = net.log.map((e) => [e.outcome, e.end]);
    a.abort();
    b.abort();
    await clock.advance(1);
    expect(net.log.map((e) => [e.outcome, e.end])).toEqual(before);
    expect(before.map(([outcome]) => outcome)).toEqual([
      "dropped:mid-body",
      "canceled:mid-body",
    ]);
  });

  it("a cancel between two chunks counts no more bytes and enqueues nothing", async () => {
    setup().rule(URL_, { ttfbMs: 10, bodyMs: 400, chunks: 4, size: 100 });
    const p = net.fetch(URL_);
    await clock.advance(10);
    const response = await p;
    // 150 ms in: chunk 2 is 60 ms off.
    await clock.advance(150);
    expect(net.log[0]).toMatchObject({ bytes: 25, outcome: "pending" });
    await response.body!.cancel();
    expect(clock.pending).toBe(0);
    await clock.advance(1000);
    expect(net.log[0]).toMatchObject({
      outcome: "canceled:mid-body",
      end: 160,
      bytes: 25,
    });
    expect(net.log[0]!.chunkAt).toEqual([110]);
  });

  it("a cancel before the first chunk counts no bytes", async () => {
    setup().rule(URL_, { bodyMs: 400, chunks: 4, size: 100 });
    const p = net.fetch(URL_);
    await clock.advance(5);
    const response = await p;
    await response.body!.cancel();
    await clock.advance(1000);
    expect(net.log[0]).toMatchObject({
      outcome: "canceled:mid-body",
      bytes: 0,
    });
    expect(net.log[0]!.chunkAt).toEqual([]);
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

describe("body time is the network's, not the reader's", () => {
  const body = { ttfbMs: 10, bodyMs: 400, chunks: 4, size: 100 };

  /** The response, with the clock at its headers (10 ms). */
  async function headers() {
    const p = net.fetch(URL_);
    await clock.advance(10);
    return p;
  }

  it("an unread body completes on the clock, and is all there when read later", async () => {
    setup().rule(URL_, body);
    const response = await headers();
    await clock.advance(399);
    expect(net.log[0]).toMatchObject({ outcome: "pending", bytes: 75 });
    await clock.advance(1);
    // Nobody has read a byte: the entry has ended at the last chunk's time.
    expect(net.log[0]).toMatchObject({ outcome: "done", end: 410, bytes: 100 });
    expect(net.log[0]!.chunkAt).toEqual([110, 210, 310, 410]);
    expect(clock.pending).toBe(0);
    expect((await response.arrayBuffer()).byteLength).toBe(100);
  });

  it("a slow reader sees the network's chunk times, not its own", async () => {
    setup().rule(URL_, body);
    const response = await headers();
    const reader = response.body!.getReader();
    // Reads one chunk, then thinks for 300 ms, each time.
    const readAt: number[] = [];
    const reading = (async () => {
      for (;;) {
        const next = await reader.read();
        if (next.done) {
          return;
        }
        readAt.push(clock.now());
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    })();
    await clock.advance(2000);
    await reading;
    expect(net.log[0]!.chunkAt).toEqual([110, 210, 310, 410]);
    expect(net.log[0]).toMatchObject({ outcome: "done", end: 410 });
    // It took the chunks when it asked, long after they had arrived.
    expect(readAt).toEqual([110, 410, 710, 1010]);
  });

  it("a mid-body drop fires at its time whether or not the reader is reading", async () => {
    setup().rule(URL_, { ...body, drop: "mid-body", faultAfterChunk: 2 });
    const response = await headers();
    // The next chunk was due at 310: the drop is then, with no read made.
    await clock.advance(299);
    expect(net.log[0]!.outcome).toBe("pending");
    await clock.advance(1);
    expect(net.log[0]).toMatchObject({
      outcome: "dropped:mid-body",
      end: 310,
      bytes: 50,
    });
    await expect(response.arrayBuffer()).rejects.toBeInstanceOf(TypeError);
  });

  it("a stall begins at its time whether or not the reader is reading", async () => {
    setup().rule(URL_, { ...body, stall: "mid-body", faultAfterChunk: 2 });
    const controller = new AbortController();
    const p = net.fetch(URL_, { signal: controller.signal });
    await clock.advance(10);
    await p;
    await clock.advance(10_000);
    // Two chunks arrived, then nothing: still pending, nothing left on the clock.
    expect(net.log[0]).toMatchObject({ outcome: "pending", bytes: 50 });
    expect(clock.pending).toBe(0);
    controller.abort();
    expect(net.log[0]).toMatchObject({
      outcome: "aborted:mid-body",
      end: 10_010,
    });
  });

  it("a body that ends short of its Content-Length is a network error, after its last chunk", async () => {
    setup().rule(URL_, { ...body, headers: { "Content-Length": "200" } });
    const response = await headers();
    await clock.advance(400);
    expect(net.log[0]).toMatchObject({
      outcome: "dropped:mid-body",
      end: 410,
      bytes: 100,
    });
    await expect(response.arrayBuffer()).rejects.toBeInstanceOf(TypeError);
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

  it("a rule's other fields don't shift later random draws, and the seed decides them", async () => {
    // Every request draws the same two numbers whatever it does, so editing
    // one rule doesn't change the jitter of another. Rule "a" draws too
    // (`jitterMs`); "b" is what the draws are read from: its arrival time.
    const arrival = async (seed: number, aStatus: number) => {
      const n = setup(seed)
        .rule("a", { ttfbMs: 0, jitterMs: 500, status: aStatus })
        .rule("b", { ttfbMs: 0, jitterMs: 1000 });
      void n.fetch("https://t.test/a");
      let arrivedAt = -1;
      void n.fetch("https://t.test/b").then(() => {
        arrivedAt = clock.now();
      });
      await clock.advance(2000);
      clock.restore();
      return arrivedAt;
    };
    const base = await arrival(5, 200);
    // A different status for "a": the same draws for "b".
    expect(await arrival(5, 503)).toBe(base);
    expect(await arrival(5, 200)).toBe(base);
    // A different seed: other draws. This is what makes the test able to fail.
    expect(base).toBeGreaterThan(0);
    for (const seed of [6, 7, 8]) {
      expect(await arrival(seed, 200)).not.toBe(base);
    }
  });
});

describe("the adapter on the real request path", () => {
  let engine: Engine;
  let load: FaultLoad | undefined;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => {
    load?.restore();
    load = undefined;
  });
  afterAll(() => vi.restoreAllMocks());

  /** Installs the adapter over the current network. */
  function adapt(options?: Parameters<typeof faultLoadGltf>[2]) {
    load = faultLoadGltf(engine, net, options);
    return load;
  }

  it("loads the asset the engine's own parser makes, through the provider, with the source's headers", async () => {
    setup().rule(URL_, {
      ttfbMs: 40,
      bodyMs: 100,
      body: triangleGlb(1000),
    });
    adapt();
    const started = track(
      engine.loadGltf(URL_, { headers: { Authorization: "Bearer fake-1" } }),
    );
    await clock.advance(139);
    expect(started.done).toBe(false);
    await clock.advance(1);
    const asset = started.value as Awaited<ReturnType<Engine["loadGltf"]>>;
    expect(asset.draws).toHaveLength(1);
    expect(asset.meshes[0]!.positions).toHaveLength(9);
    expect(asset.timing).toMatchObject({
      format: "glb",
      bytes: triangleGlb(1000).length,
      networkMs: 140,
    });
    expect(net.log[0]!.headers["authorization"]).toBe("Bearer fake-1");
  });

  it("goes through FetchProvider.default, as every engine request does, and restore puts it back", async () => {
    const before = FetchProvider.default;
    const calls: string[] = [];
    setup().rule(URL_, { body: triangleGlb() });
    const provider = new FetchProvider({
      transport: net.transport,
      onRequest: (request) => {
        calls.push(request.kind);
      },
    });
    const handle = adapt({ provider });
    expect(FetchProvider.default).toBe(provider);
    expect(handle.provider).toBe(provider);
    const state = track(engine.loadGltf(URL_));
    await clock.advance(10);
    expect(state.error).toBeUndefined();
    expect(state.done).toBe(true);
    // The loader asks for a tile's content, as the engine does.
    expect(calls).toEqual(["content"]);
    handle.restore();
    expect(FetchProvider.default).toBe(before);
  });

  it("a status other than success fails with the engine's own error", async () => {
    setup().rule(URL_, { status: 503, headers: { "Retry-After": "3" } });
    adapt();
    const state = track(engine.loadGltf(URL_));
    await clock.advance(5);
    // `gltfParse.ts` words it; the message holds the status, never the URL.
    expect(state.error).toBeInstanceOf(Error);
    expect((state.error as Error).message).toBe("content request failed (503)");
    expect((state.error as Error).message).not.toContain("tiles.test");
    expect(net.log[0]).toMatchObject({ status: 503, attempt: 1 });
  });

  it("a drop mid-body and a short body reach the engine as network errors", async () => {
    setup().rule(URL_, [
      { drop: "mid-body", bodyMs: 40, body: triangleGlb(1000) },
      // A body that ends short of the Content-Length it stated.
      {
        bodyMs: 40,
        body: triangleGlb(1000),
        headers: { "Content-Length": "2000" },
      },
    ]);
    adapt();
    const dropped = track(engine.loadGltf(URL_));
    await clock.advance(50);
    expect(dropped.error).toBeInstanceOf(TypeError);
    const short = track(engine.loadGltf(URL_));
    await clock.advance(50);
    expect(short.error).toBeInstanceOf(TypeError);
    expect(net.log.map((e) => e.outcome)).toEqual([
      "dropped:mid-body",
      "dropped:mid-body",
    ]);
  });

  it("a body that isn't a glTF fails in the engine's parser, not the harness", async () => {
    setup().rule(URL_, { size: 64 });
    adapt();
    const state = track(engine.loadGltf(URL_));
    await clock.advance(10);
    expect(state.error).toBeDefined();
    expect(state.error).not.toBeInstanceOf(TypeError);
  });

  it("a cancel is an AbortError and a stall ends only when aborted", async () => {
    setup().rule(URL_, {
      stall: "mid-body",
      bodyMs: 40,
      body: triangleGlb(1000),
    });
    adapt();
    const controller = new AbortController();
    const state = track(engine.loadGltf(URL_, { signal: controller.signal }));
    await clock.advance(30 * 1000);
    expect(state.done).toBe(false);
    controller.abort();
    await clock.advance(0);
    expect((state.error as DOMException).name).toBe("AbortError");
  });

  it("drives the provider's renewal: a 401 refreshes the credential, once, and retries", async () => {
    setup().rule(URL_, (attempt) =>
      attempt === 1 ? { status: 401 } : { body: triangleGlb() },
    );
    const credential = new Credential(
      { headers: { Authorization: "Bearer fake-old" } },
      {
        refresh: async () => ({
          headers: { Authorization: "Bearer fake-new" },
        }),
      },
    );
    adapt();
    const state = track(engine.loadGltf(URL_, { headers: credential.headers }));
    await clock.advance(20);
    expect(state.error).toBeUndefined();
    expect(state.done).toBe(true);
    expect(net.log.map((e) => [e.status, e.headers["authorization"]])).toEqual([
      [401, "Bearer fake-old"],
      [200, "Bearer fake-new"],
    ]);
  });

  it("install() makes the engine's own fetches (a tileset's JSON) go through the script", async () => {
    setup().rule("tileset.json", {
      ttfbMs: 25,
      body: JSON.stringify({ asset: { version: "1.1" } }),
    });
    const original = globalThis.fetch;
    net.install();
    expect(globalThis.fetch).toBe(net.fetch);
    const state = track(
      fetchTilesetJson("https://tiles.test/tileset.json", undefined),
    );
    await clock.advance(24);
    expect(state.done).toBe(false);
    await clock.advance(1);
    expect(state.value).toEqual({ asset: { version: "1.1" } });
    expect(net.log).toHaveLength(1);
    net.uninstall();
    // The saved `fetch` is back, not whatever `unstubAllGlobals` would find.
    expect(globalThis.fetch).toBe(original);
  });
});
