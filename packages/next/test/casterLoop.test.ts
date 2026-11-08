// Shadow casters on the on-demand loop, as an application runs them: a still
// camera stops ticking, so what must happen on one has to wake the loop, and
// what mustn't loop has to let it sleep. The real tileset, selection, loop and
// request scheduler on the fake GPU. Requests take a few simulated ticks at
// 60 Hz, and tile sizes are set by hand: the trees and bytes are synthetic.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget, type View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import type { Tileset3D, TilesetOptions } from "../src/streaming/Tileset3D.ts";
import { fakeEngine } from "./fakeGpu.ts";

// Long runs of simulated ticks, some on and off.
vi.setConfig({ testTimeout: 30_000 });

const R = 6_378_137;
const MiB = 1_048_576;
const TICK_MS = 1000 / 60;

function slab(name: string, draws = 1): GltfAsset & { name: string } {
  const h = 5;
  return {
    name,
    meshes: [
      {
        positions: new Float32Array([0, -h, -h, 0, h, -h, 0, h, h, 0, -h, h]),
        normals: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: Array.from({ length: draws }, () => ({
      mesh: 0,
      material: -1,
      matrix: m4.mat4(),
    })),
    featureTables: [],
    warnings: [],
  };
}

interface Json {
  geometricError: number;
  refine: "ADD" | "REPLACE";
  boundingVolume: { box: number[] };
  content?: { uri: string };
  children?: Json[];
}

/** A box at (x up, y east, z north) of the Earth's surface at longitude 0, latitude 0. */
const box = (
  x: number,
  y: number,
  z: number,
  half: readonly [number, number, number],
  error: number,
  uri?: string,
  children?: Json[],
  refine: "ADD" | "REPLACE" = "ADD",
): Json => ({
  geometricError: error,
  refine,
  boundingVolume: {
    box: [R + x, y, z, half[0], 0, 0, 0, half[1], 0, 0, 0, half[2]],
  },
  ...(uri ? { content: { uri } } : {}),
  ...(children ? { children } : {}),
});

/** A quadtree of REPLACE tiles, 12 km across and 80 m tall by default. */
function city(depth = 6, half = 6000, top = 80): Json {
  let n = 0;
  const node = (
    y: number,
    z: number,
    h: number,
    level: number,
    error: number,
  ): Json =>
    box(
      top / 2,
      y,
      z,
      [top / 2, h, h],
      level === depth ? 0 : error,
      `t${n++}.glb`,
      level === depth
        ? undefined
        : [-1, 1].flatMap((a) =>
            [-1, 1].map((b) =>
              node(
                y + (a * h) / 2,
                z + (b * h) / 2,
                h / 2,
                level + 1,
                error / 2,
              ),
            ),
          ),
      "REPLACE",
    );
  return node(0, 0, half, 0, 1024);
}

const floor = () => box(0, 0, 20, [1, 10, 10], 0, "floor.glb");
const roof = (i = 0) =>
  box(15 + i, 0, -5 - i, [1, 5, 5], 0, i === 0 ? "roof.glb" : `roof${i}.glb`);
/** An ADD root holding `children`, big enough for all of them. */
const group = (children: Json[]) =>
  box(0, 0, 0, [5000, 5000, 5000], 1000, undefined, children);

interface Internals {
  frame: number;
  cacheBytes: number;
  coldAgeMs: number;
  ready: unknown[];
  inFlight: number;
}

interface SceneOptions {
  root: Json;
  bytes: (name: string) => number;
  options?: TilesetOptions;
  /** Simulated ticks a request takes. */
  latency?: number;
  views?: number;
  size?: [number, number];
  world?: { maxDraws: number; maxTransforms?: number };
  drawsOf?: (name: string) => number;
}

describe("casters on the on-demand loop", () => {
  let now = 1000;
  let queue = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;
  let engine: Engine;
  const pending: Array<{
    left: number;
    resolve: () => void;
  }> = [];
  const fetched = new Map<string, number>();
  let bytesOf: (name: string) => number = () => 0;
  let drawsOf: (name: string) => number = () => 1;
  let latency = 6;
  const documents = new Map<string, unknown>();

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    now = 1000;
    queue = new Map();
    pending.length = 0;
    fetched.clear();
    documents.clear();
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const handle = nextHandle++;
      queue.set(handle, cb);
      return handle;
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      queue.delete(handle);
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("fetch", async (input: string | URL) => {
      const json = documents.get(String(input));
      return json
        ? new Response(JSON.stringify(json), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 });
    });
    engine = await fakeEngine();
    vi.spyOn(engine, "loadGltf").mockImplementation(async (url, options) => {
      const name = String(url).split("/").pop()!;
      fetched.set(name, (fetched.get(name) ?? 0) + 1);
      await new Promise<void>((resolve, reject) => {
        const p = { left: latency, resolve };
        pending.push(p);
        options?.signal?.addEventListener("abort", () => {
          pending.splice(pending.indexOf(p), 1);
          reject(new DOMException("aborted", "AbortError"));
        });
      });
      return slab(name, drawsOf(name));
    });
    const upload = engine.uploadModel.bind(engine);
    vi.spyOn(engine, "uploadModel").mockImplementation((world, asset, o) => {
      const model = upload(world, asset, o);
      const name = (asset as GltfAsset & { name?: string }).name;
      if (name !== undefined) {
        Object.defineProperty(model, "bytes", {
          value: bytesOf(name),
          configurable: true,
          writable: true,
        });
      }
      return model;
    });
    engine.renderMode = "onDemand";
    engine.start();
  });

  afterEach(() => {
    engine.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function tick(): Promise<void> {
    now += TICK_MS;
    vi.advanceTimersByTime(TICK_MS);
    for (const p of pending.slice()) {
      if (--p.left <= 0) {
        pending.splice(pending.indexOf(p), 1);
        p.resolve();
      }
    }
    await new Promise((resolve) => setImmediate(resolve));
    const due = [...queue.values()];
    queue.clear();
    for (const cb of due) {
      cb(now);
    }
    await new Promise((resolve) => setImmediate(resolve));
  }

  async function ticks(count: number, each?: () => void): Promise<void> {
    for (let i = 0; i < count; i++) {
      each?.();
      await tick();
    }
  }

  /** Nothing is asking for the next animation frame, or loading. */
  const asleep = () => queue.size === 0 && pending.length === 0;

  async function addTileset(
    world: World,
    name: string,
    root: Json,
    options: TilesetOptions = {},
  ): Promise<Tileset3D> {
    const url = `https://tiles.test/${name}/tileset.json`;
    documents.set(url, {
      asset: { version: "1.1" },
      geometricError: 1e5,
      root,
    });
    return engine.addTileset(world, url, options);
  }

  async function scene(o: SceneOptions) {
    bytesOf = o.bytes;
    drawsOf = o.drawsOf ?? (() => 1);
    latency = o.latency ?? 6;
    const world = engine.createWorld(o.world ?? {});
    const tileset = await addTileset(world, "a", o.root, o.options);
    const views: View[] = [];
    for (let i = 0; i < (o.views ?? 1); i++) {
      views.push(
        engine.addView({
          target: new OffscreenTarget(...(o.size ?? [1920, 1080])),
          world,
          shadows: true,
          exposure: { ev100: 15 },
        }),
      );
    }
    v3.normalize(engine.sunDirection, v3.vec3(1, 0.3, -1));
    const look = (
      view: View,
      x: number,
      y: number,
      z: number,
      heading: number,
      pitchDeg: number,
    ) => {
      const p = (pitchDeg * Math.PI) / 180;
      const h = (heading * Math.PI) / 180;
      view.camera.position.set([R + x, y, z]);
      view.camera.direction.set([
        Math.sin(p),
        Math.cos(p) * Math.sin(h),
        Math.cos(p) * Math.cos(h),
      ]);
      view.camera.orient(Float64Array.of(1, 0, 0));
      view.camera.version++;
      engine.wake();
    };
    const stats = tileset.stats;
    return {
      world,
      tileset,
      views,
      view: views[0]!,
      look,
      stats,
      internals: tileset as unknown as Internals,
      tiles: tileset.root.children as Tile[],
      /** Requests that views made: the reloads, against casters off. */
      viewRequests: () =>
        stats.purposes.base.requests +
        stats.purposes.intermediate.requests +
        stats.purposes.view.requests,
      remove() {
        for (const view of views) {
          engine.removeView(view);
        }
        engine.removeTileset(tileset);
      },
    };
  }

  const tileBytes = (size: number) => () => size * MiB;

  /** Runs until the loop sleeps, or `limit` ticks; ticks taken, or -1. */
  async function untilAsleep(limit: number): Promise<number> {
    for (let i = 0; i < limit; i++) {
      await tick();
      if (i > 3 && asleep()) {
        return i;
      }
    }
    return -1;
  }

  describe("what a view touches counts, and casters don't loop", () => {
    it("a still view at 90% of the cache, on a tree with ancestors, requests a bounded number and sleeps", async () => {
      const s = await scene({ root: city(), bytes: tileBytes(1.5) });
      s.look(s.view, 150, 0, 0, 0, -15);
      await ticks(600);
      expect(asleep()).toBe(true);
      // 168 casters are wanted at these sizes; a loop was 1,461 in 600 ticks.
      const { requests, unused } = s.stats.purposes.caster;
      expect(requests).toBeLessThan(30);
      expect(unused).toBeLessThan(20);
      const frame = s.internals.frame;
      await ticks(600);
      expect(s.internals.frame).toBe(frame);
      expect(s.stats.purposes.caster.requests).toBe(requests);
      expect(s.stats.bytes).toBeLessThanOrEqual(512 * MiB);
      s.remove();
    });

    it("stops after a flight over a full cache, and the requests stop with it", async () => {
      const s = await scene({ root: city(), bytes: tileBytes(1.5) });
      let z = -4000;
      s.look(s.view, 150, 0, z, 0, -15);
      await ticks(200);
      await ticks(300, () => {
        z += 3.3;
        s.look(s.view, 150, 0, z, 0, -15);
      });
      const { requests } = s.stats.purposes.caster;
      expect(await untilAsleep(600)).toBeGreaterThanOrEqual(0);
      expect(s.stats.purposes.caster.requests - requests).toBeLessThan(50);
      s.remove();
    });

    it.each([
      [2, 0.6],
      [4, 0.45],
    ])(
      "%i views near the limit share one budget, and sleep",
      async (n, size) => {
        const s = await scene({
          root: city(),
          bytes: tileBytes(size),
          views: n,
        });
        s.views.forEach((view, i) => {
          s.look(view, 150, (i - (n - 1) / 2) * 4000, -1000, 0, -15);
        });
        await ticks(600);
        expect(asleep()).toBe(true);
        // One budget: not one per view, and casters still get what there is.
        expect(s.stats.purposes.caster.requests).toBeLessThan(250);
        expect(s.stats.casters).toBeGreaterThan(0);
        expect(s.stats.bytes).toBeLessThanOrEqual(512 * MiB);
        s.remove();
      },
      30_000,
    );

    it("a turn into a cache full of cold tiles requests no more than the casters that fit", async () => {
      const s = await scene({ root: city(), bytes: tileBytes(0.75) });
      s.look(s.view, 150, 0, 0, 0, -15);
      await ticks(300);
      const before = s.stats.purposes.caster.requests;
      s.look(s.view, 150, 0, 0, 180, -15);
      await ticks(3);
      expect(await untilAsleep(300)).toBeGreaterThanOrEqual(0);
      // 168 casters are wanted. A loop was 3,330.
      expect(s.stats.purposes.caster.requests - before).toBeLessThan(170);
      s.remove();
    });

    it("uploads a caster over the budget and lets eviction make room, with no drop for it", async () => {
      const s = await scene({
        root: group([floor(), roof()]),
        bytes: (name) => (name === "floor.glb" ? 400 : 60) * MiB,
        latency: 2,
        size: [640, 480],
      });
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(100);
      expect(s.tiles[1]!.state).toBe("ready");
      expect(s.tiles[1]!.casterMask).not.toBe(0);
      expect(s.stats.purposes.caster.unused).toBe(0);
      s.remove();
    });
  });

  describe("cold tiles", () => {
    /** Floor at y = 0, cold floors at 4000 and 8000 m east, and a roof. */
    async function coldScene() {
      const a = box(0, 4000, 20, [1, 10, 10], 0, "coldA.glb");
      const b = box(0, 8000, 20, [1, 10, 10], 0, "coldB.glb");
      const s = await scene({
        root: box(0, 4000, 0, [5000, 9000, 5000], 1000, undefined, [
          floor(),
          a,
          b,
          roof(),
        ]),
        bytes: (name) => (name === "roof.glb" ? 20 : 100) * MiB,
        latency: 2,
        size: [640, 480],
        options: { cacheBytes: 310 * MiB },
      });
      return s;
    }

    it("casters get no room from a cold tile a view may come back to, and take it once the tile is stale", async () => {
      const s = await coldScene();
      const [, coldA, coldB, roofTile] = s.tiles as [Tile, Tile, Tile, Tile];
      s.look(s.view, 2, 4000, 0, 0, 0);
      await ticks(30);
      s.look(s.view, 2, 8000, 0, 0, 0);
      await ticks(30);
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(60);
      // 300 MiB in use of 310: the roof is 20. It isn't let in.
      expect(asleep()).toBe(true);
      expect(roofTile.state).toBe("unloaded");
      expect(coldA.state).toBe("ready");
      expect(coldB.state).toBe("ready");
      // A still camera: the loop wakes itself when they go stale, a tick here
      // and there, and then sleeps for good.
      const frame = s.internals.frame;
      await ticks(Math.ceil(9_000 / TICK_MS));
      expect(roofTile.state).toBe("ready");
      expect(roofTile.casterMask).not.toBe(0);
      expect(s.stats.bytes).toBeLessThanOrEqual(310 * MiB);
      // The older one went for it, and only that.
      expect(coldA.state).toBe("unloaded");
      expect(coldB.state).toBe("ready");
      expect(s.internals.frame - frame).toBeLessThan(60);
      expect(await untilAsleep(120)).toBeGreaterThanOrEqual(0);
      const after = s.internals.frame;
      await ticks(1000);
      expect(s.internals.frame).toBe(after);
      s.remove();
    });

    it("a tile the view comes back to after longer than the age protects cold tiles for twice that", async () => {
      const s = await coldScene();
      s.look(s.view, 2, 4000, 0, 0, 0);
      await ticks(30);
      s.look(s.view, 2, 0, 0, 0, 0);
      const start = s.internals.coldAgeMs;
      await ticks(Math.ceil(10_000 / TICK_MS));
      // Back after 10 s: the age was 8 s.
      s.look(s.view, 2, 4000, 0, 0, 0);
      await ticks(10);
      expect(start).toBe(8_000);
      expect(s.internals.coldAgeMs).toBeGreaterThan(19_000);
      expect(s.internals.coldAgeMs).toBeLessThan(21_000);
      // Coming back within it changes nothing.
      const age = s.internals.coldAgeMs;
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(Math.ceil(10_000 / TICK_MS));
      s.look(s.view, 2, 4000, 0, 0, 0);
      await ticks(10);
      expect(s.internals.coldAgeMs).toBe(age);
      s.remove();
    });

    it("many stale cold tiles give way, and the shadows recover", async () => {
      // The re-review's case: 16 flips, a new place, a third. It held 377 MiB
      // of cold tiles nobody asked for against 7 casters of 168.
      const s = await scene({ root: city(), bytes: tileBytes(0.75) });
      let h = 0;
      for (let c = 0; c < 16; c++) {
        h = h === 0 ? 180 : 0;
        s.look(s.view, 150, 0, 0, h, -15);
        await ticks(300);
      }
      s.look(s.view, 150, 0, 3000, 0, -15);
      await ticks(600);
      s.look(s.view, 150, 3000, 3000, 0, -15);
      await ticks(300);
      expect(s.stats.casters).toBeLessThan(50);
      await ticks(Math.ceil(s.internals.coldAgeMs / TICK_MS) + 120);
      expect(s.stats.casters).toBeGreaterThan(140);
      expect(s.stats.casterScale).toBe(1);
      expect(asleep()).toBe(true);
      s.remove();
    });

    it("a loop waiting on cold tiles only ticks now and then", async () => {
      const s = await coldScene();
      s.look(s.view, 2, 4000, 0, 0, 0);
      await ticks(30);
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(60);
      const frame = s.internals.frame;
      await ticks(Math.ceil(7_000 / TICK_MS));
      expect(s.internals.frame - frame).toBeLessThan(10);
      s.remove();
    });
  });

  describe("free room always counts", () => {
    it("admits casters with room free, whatever else has been refused", async () => {
      const s = await scene({ root: city(), bytes: tileBytes(1) });
      s.look(s.view, 150, 0, 0, 0, -15);
      await ticks(600);
      // 97 of 168 before, with 81 MiB free.
      expect(s.stats.casters).toBe(168);
      expect(s.stats.casterScale).toBe(1);
      expect(asleep()).toBe(true);
      s.remove();
    });

    it("one huge view tile doesn't keep small casters out", async () => {
      const s = await scene({
        root: group([floor(), roof()]),
        bytes: (name) => (name === "floor.glb" ? 350 : 1) * MiB,
        latency: 2,
        size: [640, 480],
      });
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(100);
      expect(s.tiles[1]!.state).toBe("ready");
      expect(s.tiles[1]!.casterMask).not.toBe(0);
      s.remove();
    });

    it("loads a large caster when there is room", async () => {
      const s = await scene({
        root: group([floor(), roof()]),
        bytes: (name) => (name === "floor.glb" ? 100 : 50) * MiB,
        latency: 2,
        size: [640, 480],
      });
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(100);
      expect(s.tiles[1]!.casterMask).not.toBe(0);
      s.remove();
    });

    it("a caster that doesn't fit stays out, and the loop sleeps", async () => {
      const s = await scene({
        root: group([floor(), roof()]),
        bytes: (name) => (name === "floor.glb" ? 400 : 200) * MiB,
        latency: 2,
        size: [640, 480],
      });
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(200);
      expect(asleep()).toBe(true);
      expect(s.tiles[1]!.casterMask).toBe(0);
      expect(s.stats.bytes).toBeLessThanOrEqual(512 * MiB);
      expect(fetched.get("roof.glb") ?? 0).toBeLessThanOrEqual(1);
      s.remove();
    });
  });

  describe("the coarsening", () => {
    it("is 1 on a still camera with room, and asleep", async () => {
      const s = await scene({ root: city(), bytes: tileBytes(0.75) });
      s.look(s.view, 150, 0, 0, 0, -15);
      await ticks(600);
      expect(asleep()).toBe(true);
      expect(s.stats.casterScale).toBe(1);
      expect(s.stats.casters).toBe(168);
      s.remove();
    });

    it("coarsens to fit, and comes back down on a still camera when room appears", async () => {
      const s = await scene({ root: city(), bytes: tileBytes(0.75) });
      s.look(s.view, 150, 0, 0, 0, -15);
      await ticks(300);
      s.look(s.view, 150, 0, 0, 180, -15);
      await ticks(120);
      // The cold half of the cache may come back: casters coarsen into the rest.
      expect(s.stats.casterScale).toBeGreaterThan(1);
      expect(asleep()).toBe(true);
      const frame = s.internals.frame;
      // Nothing moves. When the cold tiles are stale the loop wakes for it.
      await ticks(Math.ceil(10_000 / TICK_MS));
      expect(s.stats.casterScale).toBe(1);
      expect(s.stats.casters).toBeGreaterThan(100);
      expect(s.internals.frame - frame).toBeLessThan(150);
      expect(await untilAsleep(120)).toBeGreaterThanOrEqual(0);
      s.remove();
    });

    it("doesn't stay coarse in continuous mode either", async () => {
      engine.renderMode = "continuous";
      const s = await scene({ root: city(), bytes: tileBytes(0.75) });
      s.look(s.view, 150, 0, 0, 0, -15);
      await ticks(1000);
      expect(s.stats.casterScale).toBe(1);
      expect(s.stats.casterBytes).toBeGreaterThan(100 * MiB);
      s.remove();
    });
  });

  describe("small world pools", () => {
    it("a view's tile that needs slots casters hold draws, and casters stop until it has", async () => {
      const roofs = [0, 1, 2, 3, 4].map(roof);
      const side = box(0, 60, 20, [1, 10, 10], 0, "side.glb");
      const s = await scene({
        root: group([floor(), ...roofs, side]),
        bytes: tileBytes(1),
        latency: 2,
        size: [640, 480],
        world: { maxDraws: 8, maxTransforms: 64 },
        drawsOf: (name) => (name === "side.glb" ? 3 : 1),
      });
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(60);
      expect(s.world.pressure().fraction).toBe(0.75);
      const sideTile = s.tiles[s.tiles.length - 1]!;
      s.look(s.view, 2, 0, 0, (Math.atan2(60, 20) * 180) / Math.PI, 0);
      await ticks(12);
      expect(sideTile.viewMask).not.toBe(0);
      expect(await untilAsleep(120)).toBeGreaterThanOrEqual(0);
      s.remove();
    });

    it("a caster a pool can't hold isn't fetched again until the pool has changed", async () => {
      const s = await scene({
        root: group([floor(), roof()]),
        bytes: tileBytes(1),
        latency: 2,
        size: [640, 480],
        world: { maxDraws: 16, maxTransforms: 64 },
        drawsOf: (name) => (name === "roof.glb" ? 20 : 1),
      });
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(400);
      expect(fetched.get("roof.glb")).toBe(1);
      expect(asleep()).toBe(true);
      const roofTile = s.tiles[1]!;
      expect(roofTile.noFitAt).toBeCloseTo(1 / 16);
      s.remove();
    });

    it("casters don't pass the limit in one tick and get evicted together", async () => {
      const roofs = [0, 1, 2, 3, 4, 5].map(roof);
      const s = await scene({
        root: group([floor(), ...roofs]),
        bytes: tileBytes(1),
        latency: 2,
        size: [640, 480],
        world: { maxDraws: 6, maxTransforms: 64 },
      });
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(600);
      expect(asleep()).toBe(true);
      expect(s.stats.purposes.caster.requests).toBeLessThanOrEqual(6);
      expect(s.world.pressure().fraction).toBeLessThan(0.9);
      s.remove();
    });
  });

  describe("a view always comes first", () => {
    it("a caster in flight that the view now wants is the view's", async () => {
      const s = await scene({
        root: group([floor(), roof()]),
        bytes: tileBytes(10),
        latency: 40,
        size: [640, 480],
      });
      s.look(s.view, 2, 0, 0, 0, 0);
      const roofTile = s.tiles[1]!;
      for (let i = 0; i < 200 && roofTile.state !== "loading"; i++) {
        await tick();
      }
      expect(roofTile.purpose).toBe("caster");
      expect(s.tileset.idle).toBe(true);
      // Turn to the roof.
      s.look(s.view, 2, 0, 0, 180, 70);
      await ticks(2);
      expect(roofTile.state).toBe("loading");
      expect(roofTile.purpose).not.toBe("caster");
      expect(s.tileset.idle).toBe(false);
      await ticks(50);
      expect(roofTile.viewMask).not.toBe(0);
      expect(fetched.get("roof.glb")).toBe(1);
      s.remove();
    });

    it("cancels a caster per view request waiting for a slot", async () => {
      const s = await scene({
        root: city(),
        bytes: tileBytes(0.25),
        latency: 120,
      });
      s.look(s.view, 150, 0, 0, 0, -15);
      for (let i = 0; i < 3000; i++) {
        await tick();
        if (s.tileset.idle && s.internals.inFlight > 4) {
          break;
        }
      }
      expect(s.internals.inFlight).toBeGreaterThan(4);
      const cancelled = s.stats.cancelled;
      s.look(s.view, 150, 0, 0, 180, -15);
      await ticks(3);
      // All at once, not one a tick.
      expect(s.stats.cancelled - cancelled).toBeGreaterThan(4);
      s.remove();
    });

    it("keeps a slow caster loading: a request longer than the cancel's grace isn't cancelled", async () => {
      const s = await scene({
        root: group([floor(), roof()]),
        bytes: tileBytes(1),
        latency: 60,
        size: [640, 480],
      });
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(300);
      expect(s.stats.cancelled).toBe(0);
      expect(fetched.get("roof.glb")).toBe(1);
      expect(s.tiles[1]!.casterMask).not.toBe(0);
      s.remove();
    });
  });

  it("a tileset of content it can't draw, such as point clouds, loads no casters", async () => {
    const s = await scene({
      root: group([floor(), roof(), roof(1), roof(2)]),
      bytes: tileBytes(1),
      latency: 2,
      size: [640, 480],
    });
    vi.mocked(engine.loadGltf).mockImplementation(async (url) => {
      const name = String(url).split("/").pop()!;
      fetched.set(name, (fetched.get(name) ?? 0) + 1);
      throw new Error("unsupported tile format: pnts (deferred)");
    });
    s.look(s.view, 2, 0, 0, 0, 0);
    await ticks(100);
    expect(fetched.get("floor.glb")).toBe(1);
    expect(s.stats.purposes.caster.requests).toBe(0);
    expect(asleep()).toBe(true);
    s.remove();
  });

  describe("receivers", () => {
    /** Tower and floor in separate tilesets of one world, in a chosen order. */
    async function twoTilesets(options: TilesetOptions = {}) {
      const s = await scene({
        root: group([floor()]),
        bytes: tileBytes(1),
        latency: 2,
        size: [640, 480],
      });
      const b = await addTileset(s.world, "b", group([roof()]), options);
      return { ...s, b, tower: b.root.children[0] as Tile };
    }

    it("a tower with nothing on screen shadows another tileset in view", async () => {
      const s = await twoTilesets();
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(60);
      expect(s.tower.state).toBe("ready");
      expect(s.tower.casterMask).not.toBe(0);
      expect(s.b.stats.selected.get(0) ?? 0).toBe(0);
      expect(asleep()).toBe(true);
      engine.removeTileset(s.b);
      s.remove();
    });

    it("a tower beside what is in view, in the light's direction, doesn't", async () => {
      const s = await scene({
        root: group([floor()]),
        bytes: tileBytes(1),
        latency: 2,
        size: [640, 480],
      });
      const b = await addTileset(
        s.world,
        "b",
        group([box(15, 1000, -5, [1, 5, 5], 0, "beside.glb")]),
      );
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(60);
      expect((b.root.children[0] as Tile).state).toBe("unloaded");
      engine.removeTileset(b);
      s.remove();
    });

    it("doesn't sleep past a receiver that arrives after the caster's tileset went idle", async () => {
      const s = await scene({
        root: group([box(0, 0, 20, [1, 10, 10], 0, "floor.glb")]),
        bytes: tileBytes(1),
        latency: 30,
        size: [640, 480],
      });
      // Its only tile is out of sight, and it has no receiver of its own.
      const b = await addTileset(s.world, "b", group([roof()]));
      const tower = b.root.children[0] as Tile;
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(10);
      expect(tower.state).toBe("unloaded");
      await ticks(200);
      expect(asleep()).toBe(true);
      expect(tower.state).toBe("ready");
      expect(tower.casterMask).not.toBe(0);
      engine.removeTileset(b);
      s.remove();
    });

    it("a tower off screen shadows the globe in view, which casts nothing itself", async () => {
      const s = await scene({
        root: group([roof()]),
        bytes: tileBytes(1),
        latency: 2,
        size: [640, 480],
      });
      const tower = s.tiles[0]!;
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(30);
      expect(tower.state).toBe("unloaded");
      // No workers here to build terrain: the globe's selection, by hand.
      const globe = engine.addEllipsoid(s.world);
      vi.spyOn(globe, "update").mockImplementation(() => {});
      globe.lastSelected.set(0, [globe.root]);
      s.look(s.view, 2, 0, 0, 0, 1);
      await ticks(30);
      expect(tower.state).toBe("ready");
      expect(tower.casterMask).not.toBe(0);
      expect(globe.selection.castsShadows).toBe(false);
      engine.removeTileset(globe);
      s.remove();
    });

    it("a receiver under another anchor leaves the cascades alone to decide", async () => {
      const s = await scene({
        root: group([roof()]),
        bytes: tileBytes(1),
        latency: 2,
        size: [640, 480],
      });
      const anchor = s.world.addAnchor("site");
      const other = await addTileset(s.world, "b", group([floor()]), {
        anchor,
      });
      vi.spyOn(other, "update").mockImplementation(() => {});
      other.lastSelected.set(0, other.root.children as Tile[]);
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(30);
      expect(s.tiles[0]!.state).toBe("ready");
      engine.removeTileset(other);
      s.remove();
    });

    it("a hidden tileset is no receiver", async () => {
      const s = await twoTilesets();
      s.tileset.show = false;
      s.look(s.view, 2, 0, 0, 0, 0);
      await ticks(60);
      expect(s.tower.state).toBe("unloaded");
      engine.removeTileset(s.b);
      s.remove();
    });
  });

  describe("the promise: casters only ever yield to what a view needs", () => {
    interface Figures {
      viewRequests: number;
      /** Ticks to the view's settling, per step of the case. */
      settle: number[];
      selected: number[];
      threshold: number;
    }

    /** One case on either setting: `steps` move the camera, `settle` follows. */
    async function run(
      casterErrorScale: number,
      size: number,
      steps: Array<(s: Awaited<ReturnType<typeof scene>>) => void>,
      hold: number,
      moving?: (s: Awaited<ReturnType<typeof scene>>, i: number) => void,
    ): Promise<Figures> {
      const s = await scene({
        root: city(),
        bytes: tileBytes(size),
        options: { casterErrorScale },
      });
      const figures: Figures = {
        viewRequests: 0,
        settle: [],
        selected: [],
        threshold: 0,
      };
      for (const step of steps) {
        step(s);
        let settled = -1;
        for (let i = 0; i < hold; i++) {
          moving?.(s, i);
          await tick();
          if (settled < 0 && i > 3 && s.tileset.idle) {
            settled = i;
          }
        }
        figures.settle.push(settled);
        figures.selected.push(s.tileset.lastSelected.get(0)!.length);
      }
      figures.viewRequests = s.viewRequests();
      figures.threshold = s.stats.screenSpaceError;
      s.remove();
      return figures;
    }

    const heading = (h: number) => (s: Awaited<ReturnType<typeof scene>>) =>
      s.look(s.view, 150, 0, 0, h, -15);
    const flips = (n: number) =>
      Array.from({ length: n }, (_, i) => heading(i % 2 === 0 ? 180 : 0));

    const cases: Array<
      [
        string,
        number,
        Array<(s: Awaited<ReturnType<typeof scene>>) => void>,
        number,
      ]
    > = [
      ["still, with room", 0.5, [heading(0)], 400],
      ["still, the view at 90% of the cache", 1.5, [heading(0)], 400],
      ["rotating, all fits", 0.5, flips(6), 300],
      ["rotating, casters don't fit", 0.75, flips(8), 300],
      ["rotating, the cache full", 0.6, flips(8), 300],
      ["a turn, cold tiles and casters", 0.75, [heading(0), heading(90)], 300],
    ];

    it.each(cases)(
      "%s",
      async (_, size, steps, hold) => {
        const on = await run(2, size, steps, hold);
        const off = await run(0, size, steps, hold);
        // Reloads: casters that happen to be there can only save the view some.
        expect(on.viewRequests).toBeLessThanOrEqual(off.viewRequests);
        // Settling, tick for tick but for the slots casters give back: one tick.
        on.settle.forEach((ticksOn, i) => {
          expect(ticksOn).toBeLessThanOrEqual(off.settle[i]! + 1);
        });
        expect(on.selected).toEqual(off.selected);
        expect(on.threshold).toBe(off.threshold);
      },
      30_000,
    );

    it("in forward flight", async () => {
      let z = -4000;
      const fly = (s: Awaited<ReturnType<typeof scene>>) => {
        z += 3.3;
        s.look(s.view, 150, 0, z, 0, -15);
      };
      const flight = [
        (s: Awaited<ReturnType<typeof scene>>) =>
          s.look(s.view, 150, 0, z, 0, -15),
      ];
      const on = await run(2, 0.75, flight, 500, fly);
      z = -4000;
      const off = await run(0, 0.75, flight, 500, fly);
      expect(on.viewRequests).toBeLessThanOrEqual(off.viewRequests);
      expect(on.selected).toEqual(off.selected);
      expect(on.threshold).toBe(off.threshold);
    });

    it("with the view alone over the cache: casters don't load, and the view matches", async () => {
      const on = await run(2, 5, [heading(0)], 500);
      const off = await run(0, 5, [heading(0)], 500);
      expect(on.viewRequests).toBeLessThanOrEqual(off.viewRequests);
      expect(on.selected).toEqual(off.selected);
      expect(on.threshold).toBe(off.threshold);
    });

    it("casters off is the view alone: nothing requested, nothing awake", async () => {
      const s = await scene({
        root: city(),
        bytes: tileBytes(0.75),
        options: { casterErrorScale: 0 },
      });
      s.look(s.view, 150, 0, 0, 0, -15);
      await ticks(400);
      expect(asleep()).toBe(true);
      expect(s.stats.purposes.caster.requests).toBe(0);
      s.remove();
    });
  });
});
