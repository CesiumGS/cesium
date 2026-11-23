// The content-source seam's core (CS-847, docs/design/content-source-seam.md):
// kinds by module reference with decoders on the pool's workers, Engine.open
// and World.add, the shared budget (the Mount Rainier case), push applied in
// the apply phase on a fake stepped clock, the edit layer, and CS-831's
// change sets. The sample source (test/fixtures/sources/sampleKind.ts) is in
// memory: no network, no timer.
import { Worker as NodeWorker } from "node:worker_threads";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FetchProvider } from "../packages/core/src/io/fetchProvider.ts";
import { CPU_PER_WORKER, Jobs } from "../packages/core/src/io/Jobs.ts";
import { WorkerPool } from "../packages/core/src/io/WorkerPool.ts";
import {
  BUILT_IN_JOB_TYPES,
  DECODER_LOAD,
  WorkerDecoders,
  decoderTypeRefusal,
  type DecoderLoadMessage,
} from "../packages/core/src/io/workerDecoders.ts";
import {
  FLAGS_WORD,
  RECORD_WORDS,
  RecordFlags,
} from "../packages/core/src/render/layout.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import { stableIdOf } from "../packages/core/src/scene/identity.ts";
import { createBox } from "../packages/core/src/scene/meshes.ts";
import { OffscreenTarget } from "../packages/core/src/scene/renderTarget.ts";
import type { World } from "../packages/core/src/scene/World.ts";
import { BudgetArbiter } from "../packages/core/src/source/budget.ts";
import type {
  ContentWorld,
  SourceContent,
} from "../packages/core/src/source/content.ts";
import {
  CHANGE_SET_FORMAT,
  CHANGE_SET_VERSION,
  READ_ONLY,
  changeSetFromJson,
  changeSetToJson,
  isReadOnly,
  type ChangeSet,
} from "../packages/core/src/source/editing.ts";
import { EditLayer } from "../packages/core/src/source/editLayer.ts";
import {
  MAX_BUFFERED_SAMPLES,
  MAX_QUEUED_CHANGES,
  SourceRuntime,
} from "../packages/core/src/source/runtime.ts";
import { ContentRows } from "../packages/core/src/source/sinks.ts";
import type { SourceClock } from "../packages/core/src/source/types.ts";
import { SUM, SampleSource } from "./fixtures/sources/sampleKind.ts";
import { fakeEngine } from "./fakeGpu.ts";

const SAMPLE = new URL("./fixtures/sources/sampleKind.ts", import.meta.url);
const THREAD = new URL("./fixtures/sources/decoderThread.mjs", import.meta.url);

const sourceOf = (content: SourceContent) =>
  content.contentSource as unknown as SampleSource;

/** A source's clock: scene time `seconds`, and wall time apart (the same unless given). */
function sourceClock(
  seconds: number,
  stepped = false,
  wallSeconds = seconds,
): SourceClock {
  return {
    seconds,
    epoch: "1970-01-01T00:00:00Z",
    timeScale: "UTC",
    wallSeconds,
    stepped,
  };
}

/** A world that records what content sets on its draws. */
function stubWorld() {
  let next = 1;
  const visible = new Map<number, boolean>();
  const world = {
    addMesh: () => ({ id: next++ }),
    addDraw: () => ({ index: next++, generation: 0 }),
    removeDraw: (h: { index: number }) => visible.delete(h.index),
    setVisible: (h: { index: number }, v: boolean) => visible.set(h.index, v),
    setViewMask: () => {},
  };
  return { world: world as unknown as ContentWorld, visible };
}

/** A runtime over a fake pool, a test's clock and a stub world. */
function runtime(
  options: {
    slots?: number;
    clock?: () => SourceClock;
    phased?: boolean;
    fetch?: FetchProvider;
  } = {},
) {
  /** What the jobs posted to the (fake) worker, in order. */
  const posted: { id: number; type: string }[] = [];
  const jobs = new Jobs({
    size: 1,
    post: (_worker, message) => posted.push(message),
  });
  jobs.phased = options.phased ?? false;
  const reports: string[] = [];
  const rt = new SourceRuntime({
    pool: {
      jobs,
      submit: (spec) => jobs.submit(spec),
      loadDecoder: () => {},
    },
    fetch: () => options.fetch ?? FetchProvider.default,
    clock: options.clock ?? (() => sourceClock(0)),
    budget: { slotsPerOrigin: options.slots ?? 16 },
    report: (message) => reports.push(message),
  });
  rt.registerKind({ id: "sample", module: SAMPLE });
  const { world, visible } = stubWorld();
  const place = (content: SourceContent) =>
    content.addItem(world, { key: content.id }, {}, () => {});
  return { rt, jobs, posted, reports, world, visible, place };
}

describe("kinds by module reference, and decoders on the pool's workers", () => {
  let pool: WorkerPool | undefined;
  afterEach(() => pool?.destroy());

  it("registers a kind and a decoder from a test module, opens a source, and decodes on every worker", async () => {
    // Two Node threads that run the content worker's decoder host.
    pool = new WorkerPool(2, () => {
      const thread = new NodeWorker(THREAD);
      const adapter = {
        onmessage: null as ((event: { data: unknown }) => void) | null,
        postMessage: (message: unknown, transfer?: Transferable[]) =>
          thread.postMessage(message, transfer as never),
        terminate: () => void thread.terminate(),
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      thread.on("message", (data) => adapter.onmessage?.({ data }));
      return adapter as unknown as Worker;
    });
    const rt = new SourceRuntime({
      pool,
      fetch: () => FetchProvider.default,
      clock: () => sourceClock(0),
    });
    rt.registerKind({ id: "sample", module: SAMPLE });
    const content = await rt.open({ url: "https://data.test/city.sample" });
    expect(content.kind).toBe("sample");
    expect(pool.hasDecoder("test:sum")).toBe(true);
    // Two jobs at once go to two workers; each loaded the decoder before its job.
    const [a, b] = await Promise.all([
      sourceOf(content).sum(Float64Array.of(1, 2, 3)),
      sourceOf(content).sum(Float64Array.of(10, 20)),
    ]);
    expect(a.sum).toBe(6);
    expect(b.sum).toBe(30);
    expect([...a.doubled]).toEqual([2, 4, 6]);
    expect(a.thread).not.toBe(0); // not the main thread
    expect(new Set([a.thread, b.thread]).size).toBe(2);
  }, 30_000);

  it("loads a decoder into workers already started, and into each one that starts later, before its first job", () => {
    const posted: { worker: number; type: unknown }[] = [];
    pool = new WorkerPool(3, (index) => {
      const fake = {
        onmessage: null,
        postMessage: (message: { type?: unknown }) =>
          posted.push({ worker: index, type: message.type }),
        terminate: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      return fake as unknown as Worker;
    });
    // Starts worker 0; never answered, so canceled when the pool goes.
    pool.submit({ type: "x", payload: {} }).promise.catch(() => {});
    pool.loadDecoder("test:sum", "https://example.test/sum.js");
    pool.loadDecoder("test:sum", "https://example.test/sum.js"); // once
    expect(() =>
      pool!.loadDecoder("test:sum", "https://example.test/other.js"),
    ).toThrow(/another module/);
    pool.warm(); // workers 1 and 2 start: the decoder first
    expect(posted).toEqual([
      { worker: 0, type: "x" },
      { worker: 0, type: "decoder:load" },
      { worker: 1, type: "decoder:load" },
      { worker: 2, type: "decoder:load" },
    ]);
  });

  it("refuses a job type its kind didn't declare, and a kind module whose kind has another ID", async () => {
    const { rt, place } = runtime();
    const content = await rt.open({ url: "https://data.test/a.sample" });
    place(content);
    expect(() =>
      sourceOf(content).host.jobs.submit({ type: "terrain", payload: {} }),
    ).toThrow(/isn't one of the "sample" kind's decoders/);
    rt.registerKind({ id: "other", module: SAMPLE });
    await expect(rt.kinds.kind("other")).rejects.toThrow(
      /registered as "other" holds the kind "sample"/,
    );
    expect(() =>
      rt.registerKind({ id: "sample", module: "https://elsewhere.test/k.js" }),
    ).toThrow(/another module/);
  });
});

describe("Engine.open and World.add", () => {
  let engine: Engine;
  let world: World;
  beforeEach(async () => {
    engine = await fakeEngine();
    world = engine.createWorld();
    engine.addView({ target: new OffscreenTarget(64, 48), world });
    engine.sources.registerKind({ id: "sample", module: SAMPLE });
  });
  afterEach(() => engine.destroy());

  it("resolves a plain URL, picks the kind by what it accepts, and places any content; the sample writes every sink on the fake device", async () => {
    const content = await engine.open(
      { url: "https://data.test/city.sample" },
      { id: "city" },
    );
    expect(content.kind).toBe("sample");
    expect(content.asset.url.href).toBe("https://data.test/city.sample");
    // Its first item's key is its content ID, unless the host names one.
    const item = world.add(content);
    expect(item.key).toBe("city");
    expect(content.items).toEqual([item]);
    engine.sources.tick(); // it wants "a"; the budget grants it
    engine.sources.tick(); // it writes "a"
    const source = sourceOf(content);
    expect(source.ticks.map((t) => t.keys)).toEqual([[], ["a"]]);
    expect(source.ticks[0]!.views).toBe(1);
    // Every sink holds its output.
    expect(content.drawCount).toBe(1);
    expect(content.rows.images.has("a")).toBe(true);
    expect(content.rows.features.get("a")!.ids.length).toBe(2);
    expect(content.rows.points.get("a")!.ids.length).toBe(3);
    expect(content.rows.custom.get("test:splats")!.get("a")!.ids.length).toBe(
      1,
    );
    // Credits ride with content.
    expect(content.credits().map((c) => c.html)).toEqual([
      "Sample data",
      "Roads",
      "Image a",
    ]);
    // Feature IDs from the source's own names (CS-815): the same in another run.
    const road = stableIdOf({
      kind: "named",
      item: content.id,
      source: content.source,
      name: "road-1",
    });
    expect(content.featureId("road-1")).toBe(road);
    expect(content.keyOf(road)).toBe("road-1");
    expect(content.rows.features.get("a")!.ids[1]).toBe(road);
    expect(content.feature(road)).toEqual({
      properties: { lanes: 4, name: "Side" },
      geometry: {
        crs: "EPSG:4979",
        type: "LineString",
        coordinates: [
          [1, 1, 0],
          [2, 2, 0],
        ],
      },
    });
    // The draw's ID is the one the world's identity table gives it.
    const drawId = stableIdOf({
      kind: "draw",
      item: item.key,
      source: content.source,
      content: "a/box",
    });
    expect(world.identity.identify(drawId)).toBeDefined();
    // Tilesets still go through World.add as before; content of another world doesn't.
    expect(() => engine.createWorld().add(content)).toThrow(/another world/);
  });

  it("refuses a URL no kind accepts, and a relative URL without a page", async () => {
    await expect(
      engine.open({ url: "https://data.test/x.json" }),
    ).rejects.toThrow(
      /no registered kind accepts https:\/\/data\.test\/x\.json/,
    );
    await expect(engine.open({ url: "city.sample" })).rejects.toThrow(
      /neither absolute nor relative to a page/,
    );
  });

  it("host.changed wakes the engine, and the change applies in the apply phase", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const frame = async () => {
      const due = frames.splice(0);
      for (const cb of due) {
        cb(performance.now());
      }
      await Promise.resolve();
    };
    try {
      const content = await engine.open({
        url: "https://data.test/city.sample",
      });
      world.add(content);
      engine.renderMode = "onDemand";
      engine.start();
      for (let i = 0; i < 4 && content.drawCount === 0; i++) {
        await frame();
      }
      expect(content.rows.points.has("a")).toBe(true);
      // Asleep: nothing asks for a frame.
      while (frames.length > 0) {
        await frame();
      }
      sourceOf(content).push({ kind: "invalidate", keys: ["a"] });
      // Not applied at the push: it waits for the apply phase, and the engine woke.
      expect(content.rows.points.has("a")).toBe(true);
      expect(frames.length).toBe(1);
      await frame();
      expect(content.rows.points.has("a")).toBe(false);
      // Its source saw the invalidation on its next update and selects again.
      await frame();
      await frame();
      expect(sourceOf(content).ticks.some((t) => t.invalidated === 1)).toBe(
        true,
      );
    } finally {
      engine.stop();
      vi.unstubAllGlobals();
    }
  });
});

describe("the budget arbiter", () => {
  it("serves one source's now wants before another's prefetch on one origin, whatever the update order (Mount Rainier)", async () => {
    const { rt, place } = runtime({ slots: 2 });
    const origin = "https://assets.ion.test";
    // Buildings open, and update, first: in update order they'd take the window.
    const buildings = await rt.open({
      url: "https://assets.ion.test/osm.sample",
      options: { keys: ["b0", "b1", "b2", "b3"], class: "prefetch", origin },
    });
    const terrain = await rt.open({
      url: "https://assets.ion.test/terrain.sample",
      options: { keys: ["t0", "t1", "t2"], class: "now", origin },
    });
    place(buildings);
    place(terrain);
    const grants = () => [
      sourceOf(terrain).ticks.at(-1)!.keys,
      sourceOf(buildings).ticks.at(-1)!.keys,
    ];
    rt.tick(); // both want; the window takes terrain's first two
    rt.tick(); // they arrive; terrain's last takes a slot, and prefetch gets the one left
    expect(grants()).toEqual([["t0", "t1"], []]);
    rt.tick();
    expect(grants()).toEqual([["t2"], ["b0"]]);
    rt.tick();
    expect(grants()).toEqual([[], ["b1", "b2"]]);
    expect(rt.budget.inFlight(origin)).toBe(1);
  });

  it("grants within one byte budget for every source, and frees on settle and release", () => {
    const arbiter = new BudgetArbiter({ bytes: 1000, slotsPerOrigin: 8 });
    const a = arbiter.client();
    const b = arbiter.client();
    const want = (key: string, bytes: number) => ({
      key,
      class: "refine" as const,
      benefit: 1,
      cost: { bytes },
      origin: "https://x.test",
    });
    a.want(want("a1", 600));
    b.want(want("b1", 300));
    b.want(want("b2", 300));
    // More benefit per byte first: b1 and b2 (600 bytes), then a1 doesn't fit.
    expect(arbiter.arbitrate()).toBe(2);
    expect(arbiter.takeGrant(a).keys).toEqual([]);
    expect(arbiter.takeGrant(b).keys).toEqual(["b1", "b2"]);
    b.settle("b1", 200); // it holds less than it asked
    b.release("b2"); // canceled before it arrived
    expect(b.resident).toBe(200);
    a.want(want("a1", 600));
    expect(arbiter.arbitrate()).toBe(1); // 200 + 600 fits in 1000
    expect(arbiter.takeGrant(a).keys).toEqual(["a1"]);
    a.settle("a1");
    expect(arbiter.resident).toBe(800);
    b.want(want("b3", 300));
    expect(arbiter.arbitrate()).toBe(0); // over the budget
  });

  it("ages a waiting want within its class, and refuses wants it can't read", () => {
    const arbiter = new BudgetArbiter({ slotsPerOrigin: 1, agingTicks: 1 });
    const c = arbiter.client();
    const origin = "https://x.test";
    const ask = () => {
      c.want({
        key: "old",
        class: "refine",
        benefit: 1,
        cost: { bytes: 100 },
        origin,
      });
      c.want({
        key: "new",
        class: "refine",
        benefit: 1.5,
        cost: { bytes: 100 },
        origin,
      });
    };
    ask();
    arbiter.arbitrate();
    expect(arbiter.takeGrant(c).keys).toEqual(["new"]);
    c.release("new");
    ask(); // "old" waited a tick: 1 × 2 beats 1.5 × 1
    arbiter.arbitrate();
    expect(arbiter.takeGrant(c).keys).toEqual(["old"]);
    expect(() =>
      c.want({
        key: "k",
        class: "soon" as never,
        benefit: 1,
        cost: { bytes: 1 },
        origin,
      }),
    ).toThrow(/class "soon"/);
    expect(() =>
      c.want({
        key: "k",
        class: "now",
        benefit: Number.NaN,
        cost: { bytes: 1 },
        origin,
      }),
    ).toThrow(/benefit is NaN/);
  });
});

describe("push on a stepped clock", () => {
  /** One run: load, push samples and an invalidation, step the clock 0 to 4 s. */
  async function run() {
    let seconds = 0;
    const { rt, jobs, place } = runtime({
      phased: true,
      clock: () => sourceClock(seconds, true),
    });
    const content = await rt.open({ url: "https://feed.test/cars.sample" });
    place(content);
    const step = () => {
      rt.tick();
      jobs.apply(Infinity);
    };
    step();
    step(); // "a" loaded
    const source = sourceOf(content);
    // Out of order, and before their times: they wait for the clock.
    source.push({
      kind: "samples",
      samples: {
        times: Float64Array.of(2.5, 0.5, 1.5, 1, 1.5),
        names: ["car-0", "car-0", "car-0", "car-1", "car-2"],
        positions: Float64Array.of(3, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2),
      },
    });
    const rows: number[][] = [];
    const ids = [...content.rows.points.get("a")!.ids];
    for (seconds = 0; seconds <= 3; seconds++) {
      step();
      rows.push([...content.rows.points.get("a")!.batch.positions]);
    }
    expect(rt.bufferedSamples).toBe(0);
    source.push({ kind: "invalidate", keys: ["a"] });
    const before = content.rows.points.has("a");
    jobs.apply(Infinity);
    return { rows, ids, before, after: content.rows.points.has("a"), source };
  }

  it("applies samples at their times, and two runs give the same rows", async () => {
    const first = await run();
    const second = await run();
    expect(first.rows).toEqual([
      [0, 0, 0, 0, 0, 0, 0, 0, 0], // t = 0: nothing due
      [1, 0, 0, 0, 1, 0, 0, 0, 0], // t = 1: 0.5 and 1
      [2, 0, 0, 0, 1, 0, 0, 0, 2], // t = 2: 1.5's
      [3, 0, 0, 0, 1, 0, 0, 0, 2], // t = 3: 2.5
    ]);
    expect(second.rows).toEqual(first.rows);
    expect(second.ids).toEqual(first.ids);
    // The invalidation applied in the apply phase, not at its push.
    expect(first.before).toBe(true);
    expect(first.after).toBe(false);
  });

  it("in real time applies samples as they arrive, and ignores a kind it doesn't know", async () => {
    const { rt, place, reports } = runtime();
    const content = await rt.open({ url: "https://feed.test/cars.sample" });
    place(content);
    rt.tick();
    rt.tick();
    const source = sourceOf(content);
    source.push({
      kind: "samples",
      samples: {
        times: Float64Array.of(99),
        names: ["car-1"],
        positions: Float64Array.of(7, 8, 9),
      },
    });
    expect([
      ...content.rows.points.get("a")!.batch.positions.subarray(3, 6),
    ]).toEqual([7, 8, 9]);
    source.push({ kind: "presence", peers: [] } as never);
    source.push({
      kind: "samples",
      samples: { times: Float64Array.of(1, 2), names: ["car-1"] },
    });
    expect(reports).toEqual([
      "the \"sample\" source's samples threw: times, names, positions and values don't agree in length; dropped.",
    ]);
  });
});

describe("a source polling its own server (CS-863)", () => {
  const flush = async () => {
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  };

  it("checks its server's version on its declared interval, under the budget, and turns a change into a push; the engine never polls", async () => {
    let version = "1";
    const asked: string[] = [];
    const provider = new FetchProvider({
      transport: (url) => {
        asked.push(url);
        return Promise.resolve(new Response(version));
      },
    });
    let seconds = 0;
    const { rt, jobs, place } = runtime({
      clock: () => sourceClock(seconds, true),
      fetch: provider,
      phased: true,
    });
    const content = await rt.open({
      url: "https://features.test/parcels.sample",
      options: { polls: 2, keys: [] },
    });
    expect(content.capabilities.polls).toEqual({ intervalSeconds: 2 });
    place(content);
    await flush();
    expect(asked).toEqual([]); // nothing ticks it: nothing asks
    for (seconds = 0; seconds <= 6; seconds++) {
      rt.tick();
      jobs.apply(Infinity);
      await flush();
      if (seconds === 3) {
        version = "2"; // someone else edits upstream
      }
    }
    const source = sourceOf(content);
    // Wanted at 0 and 3 (its interval since its last check), granted the next tick.
    expect(source.ticks.map((t) => t.keys)).toEqual([
      [],
      ["version"],
      [],
      [],
      ["version"],
      [],
      [],
    ]);
    expect(asked).toEqual([
      "https://features.test/version",
      "https://features.test/version",
    ]);
    expect(source.version).toBe("2");
    // The change came in as a push, applied in the apply phase, seen next update.
    expect(source.ticks.map((t) => t.invalidated)).toEqual([
      0, 0, 0, 0, 0, 0, 1,
    ]);
  });

  it("refuses an interval under a second, polling without pushes, and a push from a source that declares none", async () => {
    const { rt, place, reports } = runtime();
    await expect(
      rt.open({ url: "https://x.test/a.sample", options: { polls: 0.1 } }),
    ).rejects.toThrow(/at least 1 s/);
    await expect(
      rt.open({
        url: "https://x.test/b.sample",
        options: { polls: 5, silent: true },
      }),
    ).rejects.toThrow(/polls but doesn't push/);
    const silent = await rt.open({
      url: "https://x.test/c.sample",
      options: { silent: true },
    });
    place(silent);
    sourceOf(silent).push({ kind: "invalidate" });
    expect(reports).toEqual([
      'the "sample" source\'s push threw: it declares pushes: false; dropped.',
    ]);
  });
});

describe("the edit layer (CS-865)", () => {
  it("hides, replaces and inserts by stable ID, over rows and draws, and holds through a reload", async () => {
    const { rt, place, visible } = runtime();
    const content = await rt.open({ url: "https://data.test/city.sample" });
    const item = place(content);
    rt.tick();
    rt.tick();
    const id = (name: string) =>
      stableIdOf({
        kind: "named",
        item: content.id,
        source: content.source,
        name,
      });
    const drawId = stableIdOf({
      kind: "draw",
      item: item.identity.key,
      source: content.source,
      content: "a/box",
    });
    const shown = () => [...content.features()].map((f) => f.id);
    expect(shown()).toHaveLength(2 + 3 + 1 + 1); // roads, cars, splat, the box

    content.edits.hide(id("road-0"));
    content.edits.replace(id("car-1"), { properties: { speed: 30 } });
    const added = stableIdOf({
      kind: "host",
      item: content.id,
      key: "new-pin",
    });
    content.edits.insert(added, {
      geometry: { crs: "EPSG:4979", type: "Point", coordinates: [1, 2, 3] },
    });
    content.edits.hide(drawId);
    expect(content.feature(id("road-0"))).toBeUndefined();
    expect(content.feature(id("car-1"))).toEqual({ properties: { speed: 30 } });
    expect(content.feature(added)?.geometry?.coordinates).toEqual([1, 2, 3]);
    expect(shown()).not.toContain(id("road-0"));
    expect(shown()).toContain(added);
    expect([...visible.values()]).toEqual([false]); // the box's draw

    // A reload: the source drops "a" and writes it again, with a new draw.
    sourceOf(content).push({ kind: "invalidate", keys: ["a"] });
    expect(content.rows.features.has("a")).toBe(false);
    rt.tick(); // sees the invalidation, wants "a"
    rt.tick(); // writes it
    expect(content.rows.features.has("a")).toBe(true);
    expect(content.feature(id("road-0"))).toBeUndefined();
    expect(content.feature(id("car-1"))).toEqual({ properties: { speed: 30 } });
    expect([...visible.values()].at(-1)).toBe(false); // the new draw starts hidden

    content.edits.clear(drawId);
    content.edits.clear(id("road-0"));
    expect([...visible.values()].at(-1)).toBe(true);
    expect(content.feature(id("road-0"))?.properties).toEqual({
      lanes: 2,
      name: "Main",
    });
  });

  it("hides a draw in the world on the fake device, through World.setVisible", async () => {
    const engine = await fakeEngine();
    try {
      const world = engine.createWorld();
      engine.sources.registerKind({ id: "sample", module: SAMPLE });
      const content = await engine.open({
        url: "https://data.test/city.sample",
      });
      const item = world.add(content);
      engine.sources.tick();
      engine.sources.tick();
      const drawId = stableIdOf({
        kind: "draw",
        item: item.identity.key,
        source: content.source,
        content: "a/box",
      });
      const index = world.identity.identify(drawId)!.draw!.index;
      const hidden = () =>
        (world.draws.recordsU32[index * RECORD_WORDS + FLAGS_WORD]! &
          RecordFlags.hidden) !==
        0;
      expect(hidden()).toBe(false);
      content.edits.hide(drawId);
      expect(hidden()).toBe(true);
      item.show = false;
      content.edits.clear(drawId);
      expect(hidden()).toBe(true); // its item hides it
      item.show = true;
      expect(hidden()).toBe(false);
    } finally {
      engine.destroy();
    }
  });

  it("applies a feed's change set under this client's edits, and drops a malformed one", async () => {
    const { rt, place, reports } = runtime();
    const content = await rt.open(
      { url: "https://data.test/city.sample" },
      { id: "city" },
    );
    place(content);
    rt.tick();
    rt.tick();
    const road0 = content.featureId("road-0");
    const road1 = content.featureId("road-1");
    // The source's rows: a feed's update patches what they hold.
    expect(content.feature(road0)?.properties).toEqual({
      lanes: 2,
      name: "Main",
    });
    const changes: ChangeSet = {
      id: "cs-1",
      source: "city",
      base: "1",
      // By the source's own keys (CS-952 A): the feed knows no feature IDs,
      // or gives one beside its key.
      ops: [
        {
          op: "update",
          key: "road-0",
          patch: { properties: { lanes: 6, name: null } },
        },
        { op: "delete", key: "road-1", id: road1 },
      ],
    };
    sourceOf(content).push({ kind: "features", changes });
    expect(content.feature(road0)?.properties).toEqual({ lanes: 6 });
    expect(content.feature(road1)).toBeUndefined();
    content.edits.replace(road0, { properties: { lanes: 1 } });
    expect(content.feature(road0)?.properties).toEqual({ lanes: 1 }); // mine over theirs
    sourceOf(content).push({
      kind: "features",
      changes: { id: "", source: "city", ops: [] },
    });
    // An ID that isn't its key's (made for other content) is refused whole.
    sourceOf(content).push({
      kind: "features",
      changes: {
        id: "cs-3",
        source: "city",
        ops: [
          { op: "delete", key: "car-0" },
          { op: "delete", key: "car-1", id: road1 },
        ],
      },
    });
    expect(content.feature(content.featureId("car-0"))).toBeDefined();
    expect(reports).toEqual([
      'the "sample" source\'s features change threw: change set: its id is a non-empty string.',
      "the \"sample\" source's features change threw: change set: op 1: its id isn't its key's feature ID in this content.",
    ]);
  });
});

describe("CS-831's types: write capabilities and change sets", () => {
  it("READ_ONLY is frozen and read-only; a writable source names every row and has a writer", async () => {
    expect(Object.isFrozen(READ_ONLY)).toBe(true);
    expect(isReadOnly(READ_ONLY)).toBe(true);
    expect(isReadOnly({ ...READ_ONLY, live: true })).toBe(true);
    expect(isReadOnly({ ...READ_ONLY, update: true })).toBe(false);
    const { rt, place, reports } = runtime();
    const named = await rt.open({
      url: "https://data.test/w.sample",
      options: { writable: true },
    });
    expect(named.contentSource.writer).toBeDefined();
    place(named);
    const unnamed = await rt.open({
      url: "https://data.test/u.sample",
      options: { writable: true, unnamed: true },
    });
    place(unnamed);
    rt.tick();
    rt.tick();
    expect(named.rows.features.has("a")).toBe(true);
    expect(unnamed.rows.features.has("a")).toBe(false);
    expect(reports).toEqual([
      expect.stringContaining("a writable source names every row"),
    ]);
  });

  it("serializes as JSON with a format name and version 0.2.0, each feature by its key with its ID beside it in decimal, and reads it back", () => {
    const id = (1n << 63n) + 5n;
    const changes: ChangeSet = {
      id: "cs-2",
      source: "city",
      base: "41",
      ops: [
        {
          op: "insert",
          key: "new-pin",
          id,
          feature: {
            geometry: {
              crs: "EPSG:4979",
              type: "Point",
              coordinates: [1, 2, 3],
            },
          },
        },
        {
          op: "update",
          key: "road-7",
          id: 7n,
          base: "e1",
          patch: { properties: { lanes: 3, old: null } },
          before: { properties: { lanes: 2 } },
          overwrite: true,
        },
        // From a server that knows only its own keys: no ID beside it.
        { op: "delete", key: "road-9", before: { properties: { a: 1 } } },
      ],
      meta: { author: "a person", time: "2026-11-22T00:00:00Z", note: "n" },
    };
    const text = changeSetToJson(changes);
    const json = JSON.parse(text) as Record<string, unknown>;
    expect(json.format).toBe(CHANGE_SET_FORMAT);
    expect(json.version).toBe(CHANGE_SET_VERSION);
    expect(CHANGE_SET_VERSION).toBe("0.2.0");
    const ops = (json.changeSet as { ops: { key: string; id?: string }[] }).ops;
    expect(ops[0]).toMatchObject({ key: "new-pin", id: id.toString() });
    expect(ops[2]!.key).toBe("road-9");
    expect(ops[2]).not.toHaveProperty("id");
    expect(changeSetFromJson(text)).toEqual(changes);
  });

  it("refuses another format, a version other than 0.2.x, a missing key, a bad ID or op, and what passes its limits, naming no value", () => {
    const wrap = (changeSet: unknown, extra: Record<string, unknown> = {}) =>
      JSON.stringify({
        format: CHANGE_SET_FORMAT,
        version: "0.2.1",
        changeSet,
        ...extra,
      });
    const ok = { id: "x", source: "s", ops: [] };
    expect(() =>
      changeSetFromJson(JSON.stringify({ format: "geojson" })),
    ).toThrow(/format/);
    expect(changeSetFromJson(wrap(ok)).ops).toEqual([]);
    for (const version of ["1.0.0", "0.1.0", "0.3.0"]) {
      expect(() => changeSetFromJson(wrap(ok, { version }))).toThrow(
        /isn't one this reads \(0\.2\.0: its minor version, 0\.2\.x\)/,
      );
    }
    // 0.1.0's shape: an ID and no key.
    expect(() =>
      changeSetFromJson(wrap({ ...ok, ops: [{ op: "delete", id: "3" }] })),
    ).toThrow(/op 0: its key is the source's key/);
    expect(() =>
      changeSetFromJson(
        wrap({ ...ok, ops: [{ op: "delete", key: "a", id: "0" }] }),
      ),
    ).toThrow(/op 0: its id is a feature ID in decimal/);
    expect(() =>
      changeSetFromJson(wrap({ ...ok, ops: [{ op: "move", key: "a" }] })),
    ).toThrow(/op 0: its op is/);
    expect(() =>
      changeSetFromJson(
        wrap({
          ...ok,
          ops: [
            {
              op: "insert",
              key: "a",
              feature: { geometry: { type: "Point" } },
            },
          ],
        }),
      ),
    ).toThrow(/names its CRS/);
    expect(() =>
      changeSetFromJson(
        wrap({
          ...ok,
          ops: [
            { op: "delete", key: "a" },
            { op: "delete", key: "b" },
          ],
        }),
        {
          ops: 1,
        },
      ),
    ).toThrow(/more than its limit/);
    try {
      changeSetFromJson(
        wrap({
          ...ok,
          ops: [
            { op: "update", key: "a", patch: { properties: "secret-value" } },
          ],
        }),
      );
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain("secret-value");
    }
  });
});

// The first review's fixes (CS-847's fix round).

describe("decoders can't take the built-in job types, and a hung one frees its slot on cancel", () => {
  it("refuses each built-in job type and an unnamespaced one, in the pool and in the worker", () => {
    const pool = new WorkerPool(1, () => ({}) as Worker);
    try {
      for (const type of BUILT_IN_JOB_TYPES) {
        expect(() =>
          pool.loadDecoder(type, "https://example.test/take.js"),
        ).toThrow(/WorkerPool\.loadDecoder: /);
        expect(pool.hasDecoder(type)).toBe(false);
      }
      for (const type of ["gltf", "terrain", "image", "stars", "skyPack"]) {
        expect(BUILT_IN_JOB_TYPES.has(type)).toBe(true);
      }
      expect(() =>
        pool.loadDecoder("csv", "https://example.test/c.js"),
      ).toThrow(/namespaced/);
      expect(decoderTypeRefusal("csv:rows")).toBeUndefined();
    } finally {
      pool.destroy();
    }
    // A forged load in the worker takes no built-in type either.
    const decoders = new WorkerDecoders(() => Promise.resolve({}));
    for (const type of BUILT_IN_JOB_TYPES) {
      decoders.handleLoad({
        type: DECODER_LOAD,
        jobType: type,
        url: "https://example.test/take.js",
      } as DecoderLoadMessage);
      expect(decoders.has(type)).toBe(false);
    }
  });

  it("replies at once when a job whose decoder never resolves is canceled, so the next job gets the slot", async () => {
    const decoders = new WorkerDecoders((url) =>
      Promise.resolve({
        default: url.endsWith("hang.js")
          ? () => new Promise(() => {}) // never resolves
          : () => Promise.resolve({ result: "quick" }),
      }),
    );
    for (const name of ["hang", "quick"]) {
      decoders.handleLoad({
        type: DECODER_LOAD,
        jobType: `test:${name}`,
        url: `https://example.test/${name}.js`,
      } as DecoderLoadMessage);
    }
    // One worker, as worker.ts runs jobs: a controller per job, cancel aborts it.
    const controllers = new Map<number, AbortController>();
    const jobs: Jobs = new Jobs({
      size: 1,
      post: (_worker, message) => {
        if (message.type === "cancel") {
          controllers.get(message.id)?.abort();
          return;
        }
        const controller = new AbortController();
        controllers.set(message.id, controller);
        void decoders.run(message, controller.signal, (reply) =>
          queueMicrotask(() => jobs.reply(reply)),
        );
      },
    });
    const hung = Array.from({ length: CPU_PER_WORKER }, () =>
      jobs.submit({ type: "test:hang", payload: {} }),
    );
    for (const job of hung) {
      job.promise.catch(() => {});
    }
    const quick = jobs.submit<string>({ type: "test:quick", payload: {} });
    const settle = async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    };
    await settle();
    expect(quick.state).toBe("queued"); // every CPU slot held by a hung decode
    for (const job of hung) {
      job.cancel();
    }
    await expect(quick.promise).resolves.toBe("quick");
    expect(jobs.stats.running).toBe(0);
  });

  it("loads a decoder again after a failed load, as kinds do", async () => {
    let attempts = 0;
    const decoders = new WorkerDecoders(() =>
      ++attempts === 1
        ? Promise.reject(new Error("network blip"))
        : Promise.resolve({ default: () => Promise.resolve({ result: 7 }) }),
    );
    decoders.handleLoad({
      type: DECODER_LOAD,
      jobType: "test:retry",
      url: "https://example.test/retry.js",
    } as DecoderLoadMessage);
    const replies: { ok: boolean; result?: unknown }[] = [];
    const post = (reply: { ok: boolean; result?: unknown }) =>
      replies.push(reply);
    const signal = new AbortController().signal;
    await decoders.run({ id: 1, type: "test:retry" }, signal, post);
    await decoders.run({ id: 2, type: "test:retry" }, signal, post);
    expect(replies.map((r) => r.ok)).toEqual([false, true]);
    expect(replies[1]!.result).toBe(7);
    expect(attempts).toBe(2);
  });
});

describe("destroyed worlds and destroyed content", () => {
  let engine: Engine;
  beforeEach(async () => {
    engine = await fakeEngine();
    engine.sources.registerKind({ id: "sample", module: SAMPLE });
  });
  afterEach(() => engine.destroy());

  it("refuses content in a destroyed world, and removeWorld destroys the content placed in it", async () => {
    const kept = engine.createWorld();
    const gone = engine.createWorld();
    const here = await engine.open({ url: "https://data.test/here.sample" });
    const there = await engine.open({ url: "https://data.test/there.sample" });
    const late = await engine.open({ url: "https://data.test/late.sample" });
    kept.add(here);
    gone.add(there);
    engine.sources.tick();
    engine.sources.tick();
    expect(there.drawCount).toBe(1);
    engine.removeWorld(gone);
    expect(there.destroyed).toBe(true);
    expect(there.drawCount).toBe(0);
    expect(sourceOf(there).destroyed).toBe(true);
    expect(here.destroyed).toBe(false);
    expect(engine.sources.contents).not.toContain(there);
    expect(() => gone.add(late)).toThrow(/the world is destroyed/);
    // Nothing updates it any more.
    const ticks = sourceOf(there).ticks.length;
    engine.sources.tick();
    expect(sourceOf(there).ticks.length).toBe(ticks);
  });

  it("makes no new runtime after the engine is destroyed", async () => {
    const other = await fakeEngine();
    other.destroy();
    expect(() => other.sources).toThrow(/the engine is destroyed/);
  });
});

describe("once its content is destroyed, a source's sinks, jobs and pushes go nowhere", () => {
  it("cancels a decode job still running, so its apply never draws; and the sinks throw", async () => {
    const { rt, jobs, posted, place, reports } = runtime();
    const content = await rt.open({ url: "https://data.test/city.sample" });
    place(content);
    const host = sourceOf(content).host;
    let applied = false;
    const job = host.jobs.submit({
      type: SUM,
      payload: { values: Float64Array.of(1) },
      apply: () => {
        applied = true;
        host.sinks.draws.addDraw({
          mesh: { id: 1 } as never,
          id: "late/box",
          origin: Float64Array.of(0, 0, 0),
        });
      },
    });
    const canceled = job.promise.catch((error: Error) => error.name);
    const sent = posted.find((m) => m.type === SUM)!;
    content.destroy();
    expect(posted.at(-1)).toEqual({ id: sent.id, type: "cancel" });
    // The worker's answer arrives after: nothing applies.
    jobs.reply({ id: sent.id, ok: true, result: { sum: 1 } });
    expect(applied).toBe(false);
    expect(await canceled).toBe("AbortError");
    expect(content.drawCount).toBe(0);
    // Its sinks throw, and so does submitting another job.
    const points = {
      key: "b",
      crs: "EPSG:4978",
      count: 1,
      positions: new Float64Array(3),
    };
    expect(() => host.sinks.points.put(points)).toThrow(/content is destroyed/);
    expect(() =>
      host.sinks.draws.addDraw({
        mesh: { id: 1 } as never,
        id: "b/box",
        origin: Float64Array.of(0, 0, 0),
      }),
    ).toThrow(/DrawSink\.addDraw: the content is destroyed/);
    expect(() => host.sinks.draws.addMesh({} as never)).toThrow(
      /DrawSink\.addMesh: the content is destroyed/,
    );
    expect(() => host.jobs.submit({ type: SUM, payload: {} })).toThrow(
      /content is destroyed/,
    );
    // Releases pass, and a push is dropped without a word.
    host.sinks.points.remove("a");
    host.changed({ kind: "invalidate" });
    expect(reports).toEqual([]);
  });
});

describe("a grant is never lost when a source's update throws", () => {
  it("releases what it was granted and didn't settle, so the next tick wants and gets it", async () => {
    const { rt, place, reports } = runtime({ slots: 1 });
    const content = await rt.open({ url: "https://data.test/city.sample" });
    place(content);
    const source = sourceOf(content);
    rt.tick(); // it wants "a"; granted
    source.throwOnUpdate = 1;
    rt.tick(); // its grant arrives, and its update throws
    expect(reports).toEqual([
      "the \"sample\" source's update threw: the sample's update failed",
    ]);
    expect(rt.budget.inFlight("https://data.test")).toBe(0);
    rt.tick(); // it wants "a" again; granted again
    rt.tick(); // it writes "a"
    expect(source.ticks.map((t) => t.keys)).toEqual([[], ["a"], [], ["a"]]);
    expect(content.rows.features.has("a")).toBe(true);
  });
});

describe("the budget refuses what it can't read", () => {
  it("refuses a settle of NaN, a negative or an infinite size: reported, counted at its want's bytes, and loading goes on", () => {
    const reports: string[] = [];
    const arbiter = new BudgetArbiter({ bytes: 1000 }, (m) => reports.push(m));
    const c = arbiter.client();
    const origin = "https://x.test";
    const load = (key: string, settled: number) => {
      c.want({ key, class: "now", benefit: 1, cost: { bytes: 100 }, origin });
      expect(arbiter.arbitrate()).toBe(1);
      arbiter.takeGrant(c);
      c.settle(key, settled);
    };
    load("nan", Number.NaN);
    load("negative", -500);
    load("infinite", Number.POSITIVE_INFINITY);
    expect(arbiter.resident).toBe(300);
    expect(c.resident).toBe(300);
    expect(arbiter.inFlight(origin)).toBe(0);
    expect(reports).toHaveLength(3);
    expect(reports[0]).toMatch(
      /settled at NaN bytes; it takes a finite number from 0/,
    );
    expect(reports[1]).toMatch(/settled at -500 bytes/);
    expect(reports[2]).toMatch(/settled at Infinity bytes/);
    load("fine", 50); // loading goes on, within the budget
    expect(arbiter.resident).toBe(350);
    // A class that is an Object member, and a decode time it can't read.
    const ask = (want: object) => () =>
      c.want({
        key: "k",
        class: "now",
        benefit: 1,
        cost: { bytes: 1 },
        origin,
        ...want,
      });
    expect(ask({ class: "toString" })).toThrow(/class "toString"/);
    expect(ask({ cost: { bytes: 1, decodeMs: Number.NaN } })).toThrow(
      /cost\.decodeMs is NaN/,
    );
  });

  it("grants no prefetch on any origin while a now want waits for bytes", () => {
    const arbiter = new BudgetArbiter({ bytes: 3000, slotsPerOrigin: 8 });
    const a = arbiter.client();
    const b = arbiter.client();
    const want = (
      key: string,
      wantClass: "now" | "prefetch",
      bytes: number,
      origin: string,
    ) => ({ key, class: wantClass, benefit: 1, cost: { bytes }, origin });
    a.want(want("held", "now", 1000, "https://a.test"));
    arbiter.arbitrate();
    arbiter.takeGrant(a);
    a.settle("held");
    // A's 2500-byte want doesn't fit beside what's held; B's 500-byte prefetch would.
    for (let tick = 0; tick < 3; tick++) {
      a.want(want("big", "now", 2500, "https://a.test"));
      b.want(want("extra", "prefetch", 500, "https://b.test"));
      expect(arbiter.arbitrate()).toBe(0);
      expect(arbiter.takeGrant(b).keys).toEqual([]);
    }
    a.release("held");
    a.want(want("big", "now", 2500, "https://a.test"));
    b.want(want("extra", "prefetch", 500, "https://b.test"));
    expect(arbiter.arbitrate()).toBe(2); // 2500 + 500 fits in 3000 now
    expect(arbiter.takeGrant(a).keys).toEqual(["big"]);
    expect(arbiter.takeGrant(b).keys).toEqual(["extra"]);
  });
});

describe("pushes under bounds and the apply phase's budget", () => {
  it("applies queued changes under the phase's budget, the rest in the next phase", async () => {
    const { rt, jobs, place } = runtime({ phased: true });
    const content = await rt.open({
      url: "https://data.test/city.sample",
      options: { keys: ["a", "b", "c"] },
    });
    place(content);
    rt.tick();
    jobs.apply(Infinity);
    rt.tick();
    jobs.apply(Infinity);
    expect([...content.rows.features.keys()]).toEqual(["a", "b", "c"]);
    for (const key of ["a", "b", "c"]) {
      sourceOf(content).push({ kind: "invalidate", keys: [key] });
    }
    jobs.apply(0); // a spent budget: one change, at least
    expect([...content.rows.features.keys()]).toEqual(["b", "c"]);
    jobs.apply(0);
    jobs.apply(0);
    expect([...content.rows.features.keys()]).toEqual([]);
  });

  it("collapses a source's queue past its bound into one invalidation of everything, and bounds buffered samples", async () => {
    const { rt, jobs, place, reports } = runtime({ phased: true });
    const content = await rt.open({ url: "https://feed.test/cars.sample" });
    place(content);
    rt.tick();
    jobs.apply(Infinity);
    rt.tick();
    jobs.apply(Infinity);
    const source = sourceOf(content);
    for (let i = 0; i <= MAX_QUEUED_CHANGES; i++) {
      source.push({ kind: "invalidate", keys: ["none"] });
    }
    expect(reports).toEqual([
      expect.stringContaining(
        `more than ${MAX_QUEUED_CHANGES} changes queued between ticks`,
      ),
    ]);
    jobs.apply(Infinity);
    expect(content.rows.points.has("a")).toBe(false); // everything reloads
    const many = MAX_BUFFERED_SAMPLES + 1;
    source.push({
      kind: "samples",
      samples: {
        times: new Float64Array(many).fill(1e9),
        names: Array.from({ length: many }, () => "car-0"),
      },
    });
    expect(rt.bufferedSamples).toBe(0);
    expect(reports.at(-1)).toMatch(
      /samples would wait for their times; dropped/,
    );
  });

  it("drops a sample with no finite time, checks values' lengths, and isolates each sample's apply", async () => {
    const { rt, place, reports } = runtime();
    const content = await rt.open({ url: "https://feed.test/cars.sample" });
    place(content);
    rt.tick();
    rt.tick();
    const source = sourceOf(content);
    source.push({
      kind: "samples",
      samples: {
        times: Float64Array.of(1, 2),
        names: ["car-0", "car-1"],
        values: { speed: Float64Array.of(5) },
      },
    });
    expect(reports.at(-1)).toMatch(/don't agree in length; dropped/);
    const apply = vi.spyOn(content.rows, "applySamples");
    apply.mockImplementationOnce(() => {
      throw new Error("one sample failed");
    });
    source.push({
      kind: "samples",
      samples: {
        times: Float64Array.of(1, Number.NaN, 2),
        names: ["car-0", "car-1", "car-2"],
        values: { speed: Float64Array.of(10, 20, 30) },
      },
    });
    expect(reports.slice(-2)).toEqual([
      'the "sample" source\'s samples threw: 1 of 3 have no finite time; those dropped.',
      'the "sample" source\'s sample threw: one sample failed',
    ]);
    // The first sample's apply threw; the third applied all the same.
    expect([...content.rows.points.get("a")!.batch.properties!.speed!]).toEqual(
      [0, 0, 30],
    );
    apply.mockRestore();
  });
});

describe("open: cleanup, one ID per content, and messages without payloads", () => {
  it("destroys a source its kind opened when the content refuses it", async () => {
    const { rt } = runtime();
    const before = SampleSource.made.length;
    await expect(
      rt.open({ url: "https://x.test/a.sample", options: { polls: 0.1 } }),
    ).rejects.toThrow(/at least 1 s/);
    expect(SampleSource.made.length).toBe(before + 1);
    expect(SampleSource.made.at(-1)!.destroyed).toBe(true);
  });

  it("gives a second content of one URL an ordinal, reported; refuses a second explicit id", async () => {
    const { rt, reports } = runtime();
    const first = await rt.open({ url: "https://data.test/city.sample" });
    const second = await rt.open({ url: "https://data.test/city.sample" });
    expect(first.id).toBe("https://data.test/city.sample");
    expect(second.id).toBe("https://data.test/city.sample#2");
    expect(reports).toEqual([
      expect.stringContaining("is open or drawn already; without an id"),
    ]);
    await rt.open({ url: "https://data.test/a.sample" }, { id: "mine" });
    await expect(
      rt.open({ url: "https://data.test/b.sample" }, { id: "mine" }),
    ).rejects.toThrow(/the id "mine" is open already/);
    // Their rows' IDs differ.
    const road = (content: SourceContent) =>
      stableIdOf({
        kind: "named",
        item: content.id,
        source: content.source,
        name: "road-0",
      });
    expect(road(first)).not.toBe(road(second));
  });

  it("names a data URI by its hash, never its payload, when no kind accepts it", async () => {
    const { rt } = runtime();
    const error = await rt
      .open({ url: "data:text/plain,secret-payload" })
      .catch((e: Error) => e.message);
    expect(error).toMatch(
      /no registered kind accepts data:text\/plain;murmur3-128=/,
    );
    expect(error).not.toContain("secret-payload");
  });
});

describe("what the sinks, the edit layer and the change sets refuse", () => {
  it("refuses offsets that don't increase from 0, and holes outside their feature", () => {
    const { features } = new ContentRows({ content: "i", source: "s" }).sinks();
    const lines = (offsets: number[], holes?: number[][]) => ({
      key: "k",
      geometry: "polygon" as const,
      crs: "EPSG:4979",
      count: 2,
      positions: new Float64Array(offsets.at(-1)! * 3),
      offsets: Uint32Array.from(offsets),
      ...(holes ? { holes: holes.map((h) => Uint32Array.from(h)) } : {}),
    });
    expect(() => features.put(lines([0, 3, 3]))).toThrow(/offsets increase/);
    expect(() => features.put(lines([1, 3, 6]))).toThrow(/start at 0/);
    expect(() => features.put(lines([0, 4, 8], [[2], [9]]))).toThrow(
      /holes start inside it/,
    );
    expect(() => features.put(lines([0, 4, 8], [[0], []]))).toThrow(
      /holes start inside it/,
    );
    expect(() => features.put(lines([0, 4, 8], [[2]]))).toThrow(
      /holes has 1 entries/,
    );
    features.put(lines([0, 4, 8], [[2], []]));
  });

  it("the edit layer refuses negative IDs and IDs wider than 64 bits", () => {
    const layer = new EditLayer();
    expect(() => layer.hide(-1n)).toThrow(/unsigned 64-bit/);
    expect(() => layer.hide(1n << 64n)).toThrow(/unsigned 64-bit/);
    layer.hide((1n << 64n) - 1n);
    expect(layer.size).toBe(1);
  });

  it("checks the op count before reading ops, refuses unknown fields and bad meta, numbers JSON can't carry, and echoes no version", () => {
    const wrap = (changeSet: unknown, extra: Record<string, unknown> = {}) =>
      JSON.stringify({
        format: CHANGE_SET_FORMAT,
        version: "0.2.0",
        changeSet,
        ...extra,
      });
    const ok = { id: "x", source: "s", ops: [] };
    // Two ops that aren't even objects: the count is refused first.
    expect(() =>
      changeSetFromJson(wrap({ ...ok, ops: [1, 2] }), { ops: 1 }),
    ).toThrow(/2 ops, more than its limit/);
    expect(() =>
      changeSetFromJson(wrap(ok, { version: "1.0.0-secret-tag" })),
    ).toThrow(/version isn't one this reads/);
    try {
      changeSetFromJson(wrap(ok, { version: "9.secret-tag" }));
    } catch (error) {
      expect(String(error)).not.toContain("secret-tag");
    }
    expect(() => changeSetFromJson(wrap({ ...ok, extra: 1 }))).toThrow(
      /a field it doesn't know/,
    );
    expect(() => changeSetFromJson(wrap(ok, { more: 1 }))).toThrow(
      /the envelope has a field it doesn't know/,
    );
    expect(() =>
      changeSetFromJson(wrap({ ...ok, meta: { author: "a", mood: "x" } })),
    ).toThrow(/its meta has a field it doesn't know/);
    expect(() => changeSetFromJson(wrap({ ...ok, meta: { time: 5 } }))).toThrow(
      /meta's time is a string/,
    );
    expect(() =>
      changeSetFromJson(
        wrap({ ...ok, ops: [{ op: "delete", key: "a", why: "no" }] }),
      ),
    ).toThrow(/op 0 has a field it doesn't know/);
    // -0 in the text: JSON reads it, and can't write it back.
    const negativeZero = wrap({
      ...ok,
      ops: [{ op: "insert", key: "a", feature: { properties: { h: 0 } } }],
    }).replace('"h":0', '"h":-0');
    expect(() => changeSetFromJson(negativeZero)).toThrow(
      /a number JSON can't carry/,
    );
    // NaN and the infinities in memory would serialize as null.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        changeSetToJson({
          ...ok,
          ops: [
            { op: "insert", key: "a", feature: { properties: { h: bad } } },
          ],
        }),
      ).toThrow(/a number JSON can't carry/);
    }
  });
});

describe("a want larger than the whole budget", () => {
  it("is refused and reported once, and doesn't stop another origin's prefetch", () => {
    const reports: string[] = [];
    const arbiter = new BudgetArbiter({ bytes: 3000, slotsPerOrigin: 8 }, (m) =>
      reports.push(m),
    );
    const a = arbiter.client();
    const b = arbiter.client();
    for (let tick = 0; tick < 3; tick++) {
      a.want({
        key: "huge",
        class: "now",
        benefit: 1,
        cost: { bytes: 5000 },
        origin: "https://a.test",
      });
      b.want({
        key: `extra-${tick}`,
        class: "prefetch",
        benefit: 1,
        cost: { bytes: 500 },
        origin: "https://b.test",
      });
      expect(arbiter.arbitrate()).toBe(1);
      expect(arbiter.takeGrant(a).keys).toEqual([]);
      expect(arbiter.takeGrant(b).keys).toEqual([`extra-${tick}`]);
    }
    expect(reports).toEqual([
      'BudgetClient.want: "huge" asks 5000 bytes, more than the whole budget of 3000; refused.',
    ]);
    // Wanted again after a tick without it: news again.
    arbiter.arbitrate();
    a.want({
      key: "huge",
      class: "now",
      benefit: 1,
      cost: { bytes: 5000 },
      origin: "https://a.test",
    });
    arbiter.arbitrate();
    expect(reports).toHaveLength(2);
  });

  it("reports a settle for a key that isn't in flight, so a load done twice is seen", () => {
    const reports: string[] = [];
    const arbiter = new BudgetArbiter({ bytes: 3000 }, (m) => reports.push(m));
    const c = arbiter.client();
    c.settle("never");
    expect(reports).toEqual([
      'BudgetClient.settle: "never" isn\'t in flight (never granted, settled already or released); ignored.',
    ]);
    expect(arbiter.resident).toBe(0);
    c.want({
      key: "k",
      class: "now",
      benefit: 1,
      cost: { bytes: 10 },
      origin: "https://x.test",
    });
    arbiter.arbitrate();
    arbiter.returnGrant(c, arbiter.takeGrant(c).keys); // its update threw
    c.settle("k"); // the source settles it all the same: ignored, and said
    expect(reports).toHaveLength(2);
    expect(arbiter.resident).toBe(0);
  });
});

describe("a throwing update, destroy or open loses nothing and stops nothing", () => {
  it("gives an update that throws its invalidations again on the next update", async () => {
    const { rt, jobs, place } = runtime({ phased: true });
    const content = await rt.open({ url: "https://data.test/city.sample" });
    place(content);
    rt.tick();
    rt.tick(); // "a" loaded
    const source = sourceOf(content);
    source.push({ kind: "invalidate", keys: ["a"] });
    jobs.apply(Infinity);
    source.throwOnUpdate = 1;
    rt.tick(); // it sees the invalidation, and throws
    rt.tick(); // it sees it again
    expect(source.ticks.slice(-2).map((t) => t.invalidated)).toEqual([1, 1]);
    rt.tick();
    expect(source.ticks.at(-1)!.invalidated).toBe(0);
  });

  it("closes every source when one's destroy throws, and reports it", async () => {
    const { rt, jobs, place, reports } = runtime({ phased: true });
    const first = await rt.open({ url: "https://data.test/one.sample" });
    const second = await rt.open({ url: "https://data.test/two.sample" });
    place(first);
    place(second);
    sourceOf(first).destroy = () => {
      throw new Error("the sample's destroy failed");
    };
    sourceOf(second).push({ kind: "invalidate" });
    expect(() => rt.destroy()).not.toThrow();
    expect(reports).toEqual([
      "the \"sample\" source's destroy threw: the sample's destroy failed",
    ]);
    expect(first.destroyed).toBe(true);
    expect(second.destroyed).toBe(true);
    expect(sourceOf(second).destroyed).toBe(true);
    expect(rt.contents).toEqual([]);
    jobs.apply(Infinity); // the queue was cleared: nothing applies
    expect(reports).toHaveLength(1);
  });

  it("destroys the content when its kind's open throws: its jobs are canceled and its sinks close", async () => {
    const { rt, posted } = runtime();
    await expect(
      rt.open({
        url: "https://data.test/bad.sample",
        options: { throwOnOpen: true },
      }),
    ).rejects.toThrow(/the sample's open failed/);
    const source = SampleSource.made.at(-1)!;
    const sent = posted.find((m) => m.type === SUM)!;
    expect(posted.at(-1)).toEqual({ id: sent.id, type: "cancel" });
    expect(() =>
      source.host.sinks.points.put({
        key: "b",
        crs: "EPSG:4978",
        count: 1,
        positions: new Float64Array(3),
      }),
    ).toThrow(/content is destroyed/);
    expect(rt.contents).toEqual([]);
  });
});

describe("the bounds keep others' edits and say what they drop", () => {
  const set = (n: number, key: string): ChangeSet => ({
    id: `cs-${n}`,
    source: "city",
    ops: [{ op: "delete", key }],
  });

  it("keeps queued change sets through a collapse, and reports dropped change sets plainly, once", async () => {
    const { rt, jobs, place, reports } = runtime({ phased: true });
    const content = await rt.open(
      { url: "https://data.test/city.sample" },
      { id: "city" },
    );
    place(content);
    rt.tick();
    jobs.apply(Infinity);
    rt.tick();
    jobs.apply(Infinity);
    const road0 = stableIdOf({
      kind: "named",
      item: "city",
      source: content.source,
      name: "road-0",
    });
    const source = sourceOf(content);
    source.push({ kind: "features", changes: set(0, "road-0") });
    for (let i = 0; i < MAX_QUEUED_CHANGES; i++) {
      source.push({ kind: "invalidate", keys: ["none"] });
    }
    expect(reports).toEqual([expect.stringContaining("its change sets stay")]);
    jobs.apply(Infinity);
    // The change set applied, and everything reloads.
    expect(content.feature(road0)).toBeUndefined();
    expect(content.feed.get(road0)?.kind).toBe("hide");
    expect(content.rows.points.has("a")).toBe(false);
    // Change sets alone past the bound: the rest are dropped, said once.
    reports.length = 0;
    for (let i = 1; i <= MAX_QUEUED_CHANGES + 5; i++) {
      source.push({ kind: "features", changes: set(i, "road-0") });
    }
    expect(reports).toEqual([
      expect.stringContaining(
        "others' edits are dropped until its queue drains, and a reload doesn't bring them back",
      ),
    ]);
  });

  it("reports samples dropped at the bound once per run of drops", async () => {
    const { rt, place, reports } = runtime({
      clock: () => sourceClock(0, true),
    });
    const content = await rt.open({ url: "https://feed.test/cars.sample" });
    place(content);
    const source = sourceOf(content);
    const push = (count: number) =>
      source.push({
        kind: "samples",
        samples: {
          times: new Float64Array(count).fill(10),
          names: Array.from({ length: count }, () => "car-0"),
        },
      });
    push(MAX_BUFFERED_SAMPLES - 1);
    push(2);
    push(2);
    push(2);
    expect(reports).toHaveLength(1);
    push(1); // fits: the run ends
    push(2);
    expect(reports).toHaveLength(2);
    expect(rt.bufferedSamples).toBe(MAX_BUFFERED_SAMPLES);
  });
});

describe("content and tileset items take one ordinal rule", () => {
  let engine: Engine;
  let world: World;
  const URL_ = "https://data.test/site.sample";
  beforeEach(async () => {
    engine = await fakeEngine();
    world = engine.createWorld();
    engine.sources.registerKind({ id: "sample", module: SAMPLE });
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            asset: { version: "1.1" },
            geometricError: 10,
            root: {
              geometricError: 10,
              boundingVolume: { sphere: [0, 0, 0, 10] },
            },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    engine.destroy();
  });

  it("gives content opened after a tileset item of its URL an ordinal", async () => {
    const tileset = await engine.loadTileset(URL_);
    const tilesetItem = world.add(tileset);
    expect(tilesetItem.identity.key).toBe(URL_);
    const content = await engine.open({ url: URL_ });
    expect(content.id).toBe(`${URL_}#2`);
    const item = world.add(content);
    expect(item.identity.key).toBe(`${URL_}#2`);
  });

  it("gives a tileset item added after content of its URL an ordinal, even while the content isn't placed", async () => {
    const content = await engine.open({ url: URL_ });
    expect(content.id).toBe(URL_);
    const tileset = await engine.loadTileset(URL_);
    expect(world.add(tileset).identity.key).toBe(`${URL_}#2`);
    const item = world.add(content);
    expect(item.identity.key).toBe(URL_);
    // Removed and placed again, it keeps its key: no tileset item took it.
    item.remove();
    expect(world.add(tileset).identity.key).toBe(`${URL_}#3`);
    expect(world.add(content).identity.key).toBe(URL_);
  });

  it("keeps a draw added while no item places it, and places it with the IDs it had when placed again", async () => {
    const content = await engine.open({ url: URL_ }, { id: "site" });
    const item = world.add(content);
    engine.sources.tick();
    engine.sources.tick();
    item.remove();
    const { sinks } = sourceOf(content).host;
    sinks.draws.addDraw({
      mesh: sinks.draws.addMesh(createBox()),
      id: "late/box",
      origin: Float64Array.of(0, 0, 0),
    });
    const late = stableIdOf({
      kind: "draw",
      item: "site",
      source: content.source,
      content: "late/box",
    });
    // No item places it: nothing of it is in the world.
    expect(world.identity.identify(late)).toBeUndefined();
    expect(content.drawCount).toBe(2);
    expect(world.add(content).key).toBe("site");
    expect(world.identity.identify(late)).toBeDefined();
  });
});

describe("two IDs, change sets by the source's keys, and the scene clock (CS-957 A, CS-952 A, CS-960 A)", () => {
  let engine: Engine;
  let world: World;
  beforeEach(async () => {
    engine = await fakeEngine();
    world = engine.createWorld();
    engine.addView({ target: new OffscreenTarget(64, 48), world });
    engine.sources.registerKind({ id: "sample", module: SAMPLE });
  });
  afterEach(() => engine.destroy());

  it("places one content twice: the same feature IDs in its rows and edits, and two instance IDs for its draws", async () => {
    const content = await engine.open(
      { url: "https://data.test/city.sample" },
      { id: "city" },
    );
    const west = world.add(content);
    const east = world.add(content); // no id: an ordinal after the content ID
    expect([west.key, east.key]).toEqual(["city", "city#2"]);
    expect(content.items).toEqual([west, east]);
    engine.sources.tick();
    engine.sources.tick();

    // Rows: one feature ID per feature, made from the content and the
    // source's key, never from an item.
    const road1 = content.featureId("road-1");
    expect(content.rows.features.get("a")!.ids[1]).toBe(road1);
    expect(road1).not.toBe(
      stableIdOf({
        kind: "named",
        item: east.key,
        source: content.source,
        name: "road-1",
      }),
    );

    // Draws: the source wrote one; each item has its own, with its instance ID.
    expect(content.drawCount).toBe(1);
    const instanceOf = (key: string) =>
      stableIdOf({
        kind: "draw",
        item: key,
        source: content.source,
        content: "a/box",
      });
    const [westBox, eastBox] = [instanceOf(west.key), instanceOf(east.key)];
    expect(westBox).not.toBe(eastBox);
    const westDraw = world.identity.identify(westBox)!.draw!.index;
    const eastDraw = world.identity.identify(eastBox)!.draw!.index;
    expect(westDraw).not.toBe(eastDraw);
    const hidden = (index: number) =>
      (world.draws.recordsU32[index * RECORD_WORDS + FLAGS_WORD]! &
        RecordFlags.hidden) !==
      0;

    // Edits name the feature ID: one edit, every item. The box's feature
    // ID is made with the content ID (the first item's instance ID until CS-961).
    const box = stableIdOf({
      kind: "draw",
      item: content.id,
      source: content.source,
      content: "a/box",
    });
    expect([...content.features()].map((f) => f.id)).toContain(box);
    content.edits.hide(box);
    expect([hidden(westDraw), hidden(eastDraw)]).toEqual([true, true]);
    content.edits.clear(box);
    content.edits.hide(road1);
    expect(content.feature(road1)).toBeUndefined();

    // An item's own state is its own; removing one leaves the other's IDs.
    east.show = false;
    expect([hidden(westDraw), hidden(eastDraw)]).toEqual([false, true]);
    west.remove();
    expect(world.identity.identify(westBox)).toBeUndefined();
    expect(world.identity.identify(eastBox)).toBeDefined();
    expect(content.featureId("road-1")).toBe(road1);
    expect(content.feature(road1)).toBeUndefined(); // the edit stays
    // A key an item holds, or another open content's ID, is refused.
    const other = await engine.open(
      { url: "https://data.test/other.sample" },
      { id: "other" },
    );
    expect(() => world.add(content, { id: "city#2" })).toThrow(
      /has the key "city#2"/,
    );
    expect(() => world.add(content, { id: "other" })).toThrow(
      /another open content has the key "other"/,
    );
    expect(world.add(other).key).toBe("other");
  });

  it("round-trips a change set through a source that knows only its own keys", async () => {
    const content = await engine.open(
      { url: "https://data.test/city.sample", options: { writable: true } },
      { id: "city" },
    );
    world.add(content);
    engine.sources.tick();
    engine.sources.tick();
    const source = sourceOf(content);
    const writer = content.contentSource.writer!;

    // The client edits by feature ID, and its change set names each
    // feature by the source's key, with the ID beside it.
    const road1 = content.featureId("road-1");
    const mine = content.resolve({
      id: "cs-mine",
      source: content.id,
      ops: [
        {
          op: "update",
          key: content.keyOf(road1)!,
          patch: { properties: { lanes: 5 } },
        },
        {
          op: "insert",
          key: "provisional-1",
          feature: { properties: { lanes: 1, name: "New" } },
        },
      ],
    });
    expect(mine.ops.map((op) => [op.key, op.id])).toEqual([
      ["road-1", road1],
      ["provisional-1", content.featureId("provisional-1")],
    ]);
    // The server reads it by key, and answers in its own keys.
    const result = await writer.commit(mine, {});
    expect(result).toEqual({
      ok: true,
      version: "2",
      keys: { "provisional-1": "road-2" },
    });
    expect(source.server.get("road-1")!.feature.properties).toEqual({
      lanes: 5,
      name: "Side",
    });
    expect(JSON.stringify([...source.server])).not.toContain(String(road1));
    expect(await writer.read!(["road-1", "gone"], {})).toEqual([
      {
        key: "road-1",
        version: "2",
        feature: { properties: { lanes: 5, name: "Side" } },
      },
      { key: "gone" },
    ]);

    // Its feed: JSON the server wrote with its own keys and no IDs. The
    // engine resolves each by key, so this client's feature IDs match.
    const theirs = JSON.stringify({
      format: CHANGE_SET_FORMAT,
      version: CHANGE_SET_VERSION,
      changeSet: {
        id: "cs-server-3",
        source: "city",
        ops: [
          { op: "update", key: "road-0", patch: { properties: { lanes: 8 } } },
          {
            op: "insert",
            key: "road-2",
            feature: { properties: { lanes: 1, name: "New" } },
          },
        ],
      },
    });
    source.push({ kind: "features", changes: changeSetFromJson(theirs) });
    await Promise.resolve();
    engine.scene.workers.jobs.apply(Infinity);
    expect(content.feature(content.featureId("road-0"))?.properties).toEqual({
      lanes: 8,
      name: "Main",
    });
    const inserted = content.featureId(
      (result as { keys: Record<string, string> }).keys["provisional-1"]!,
    );
    expect(content.feature(inserted)?.properties?.name).toBe("New");
    expect(content.keyOf(inserted)).toBe("road-2");
    // Back out as JSON: the keys, with this client's IDs beside them.
    const out = JSON.parse(
      changeSetToJson(content.resolve(changeSetFromJson(theirs))),
    ) as { changeSet: { ops: { key: string; id: string }[] } };
    expect(out.changeSet.ops[0]).toMatchObject({
      key: "road-0",
      id: String(content.featureId("road-0")),
    });
  });

  it("gives sources the world's scene time, far from wall time, with its epoch and time scale, and wall time apart", async () => {
    // 2026-11-22T00:00:00Z: the scene's time, while the engine started just now.
    const scene = Date.UTC(2026, 10, 22) / 1000;
    let seconds = scene;
    const sceneClock = {
      get seconds() {
        return seconds;
      },
      rate: 1,
      paused: true,
      change: "jump" as const,
      watch: () => () => {},
    };
    const content = await engine.open(
      {
        url: "https://data.test/craft.sample",
        options: { keys: [], track: { start: scene, speed: 2 } },
      },
      { id: "craft" },
    );
    world.add(content);
    const source = sourceOf(content);
    // No scene clock yet: scene time 0, as picks read it.
    expect(source.host.clock.seconds).toBe(0);
    engine.cameras.setClock(world, sceneClock);
    const x = () => content.rows.points.get("track")!.batch.positions[0];

    seconds = scene + 100;
    engine.sources.tick();
    const clock = source.host.clock;
    expect(clock).toMatchObject({
      seconds: scene + 100,
      epoch: "1970-01-01T00:00:00Z",
      timeScale: "UTC",
      stepped: false,
    });
    expect(Math.abs(clock.wallSeconds - engine.time)).toBeLessThan(5);
    expect(clock.seconds - clock.wallSeconds).toBeGreaterThan(1e9);
    expect(x()).toBe(200); // where the craft is at the scene time
    // The scene's time jumps back an hour; wall time runs on.
    seconds = scene - 3600;
    engine.sources.tick();
    expect(x()).toBe(-7200);
    // A view's camera record is at scene time, as a pick's is.
    let recorded: number | undefined;
    const update = source.update.bind(source);
    source.update = (tick) => {
      recorded = tick.views[0]!.camera().pose.seconds;
      expect(tick.clock.seconds).toBe(seconds);
      update(tick);
    };
    engine.sources.tick();
    expect(recorded).toBe(scene - 3600);
  });
});
