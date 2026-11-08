// Engine.queries over real streamed content (plan 5a Task 18, review round
// 1): the draws target never says "clear" over tiles it hasn't tested, a
// standing view-scoped query answers again when a cached tile is shown
// again, and the terrain target reads a real globe as one view draws it.
// The engine runs on the fake device of test/fakeGpu.ts, its frame loop
// on a requestAnimationFrame queue flushed by hand (as
// test/frameLoopSleep.test.ts); the GPU cast is stubbed per test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TerrainSource,
  type TerrainLoader,
} from "../src/globe/TerrainSource.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import type { QueryAnswer, RayQuery } from "../src/query/queries.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget, type View } from "../src/scene/View.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { Globe } from "../src/globe/Globe.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { at, contains, gridTile } from "./terrainRayFixtures.ts";

const R = 6_378_137;
const URL_ = "https://tiles.test/queries/tileset.json";

function triangle(): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

/** One 20 m tile at the equator and prime meridian, Earth-fixed. */
const TILESET = {
  asset: { version: "1.1" },
  geometricError: 100,
  root: {
    geometricError: 0,
    refine: "REPLACE",
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 0, 0, 1],
    boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
    content: { uri: "tile.gltf" },
  },
};

/** Through the tile, from 100 m above it to 100 m below. */
const THROUGH = { from: [R + 100, 0, 0], to: [R - 100, 0, 0] };
/** Past it, 1 km to the side. */
const BESIDE = { from: [R + 100, 1000, 0], to: [R - 100, 1000, 0] };

describe("Engine.queries on a running engine", () => {
  let engine: Engine;
  let now = 0;
  let queue = new Map<number, FrameRequestCallback>();
  let next = 1;

  beforeEach(async () => {
    now = 1000;
    queue = new Map();
    next = 1;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queue.set(next, cb);
      return next++;
    });
    vi.stubGlobal("cancelAnimationFrame", (h: number) => queue.delete(h));
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? Response.json(TILESET, {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    engine = await fakeEngine();
  });
  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Runs `n` display refreshes, letting loads and answers land between. */
  async function frames(n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      now += 1000 / 60;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) {
        cb(now);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  function scene() {
    const world = engine.createWorld();
    const view = engine.addView({
      target: new OffscreenTarget(640, 360),
      world,
      exposure: { ev100: 15 },
    });
    lookAtTile(view);
    // The GPU cast meets nothing unless a test says so (the fake device
    // reads back zeros).
    const cast = vi
      .spyOn(world, "castRays")
      .mockImplementation(async (rays) => rays.map(() => undefined));
    return { world, view, earth: world.bodyAnchor(EARTH), cast };
  }
  const lookAtTile = (view: View) =>
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -Math.PI / 2, 100);
  const lookAway = (view: View) =>
    view.camera.lookAt(v3.vec3(-R, 0, 0), 0, -Math.PI / 2, 100);

  const ask = (
    view: View,
    anchor: RayQuery["anchor"],
    rays: RayQuery["rays"],
  ): RayQuery => ({ anchor, seconds: 0, rays, targets: ["draws"], view });

  it("says unknown over a tile not loaded, clear or blocked once it is drawn, and clear where no streamed content is", async () => {
    let arrive: ((asset: GltfAsset) => void) | undefined;
    vi.spyOn(engine, "loadGltf").mockImplementation(
      () => new Promise<GltfAsset>((resolve) => (arrive = resolve)),
    );
    const { view, earth, cast } = scene();
    engine.start();
    const tileset = await engine.addTileset(view.world, URL_);
    await frames(30);
    expect(arrive).toBeDefined();
    expect(tileset.stats.loaded).toBe(0);

    // Requested, not loaded: the cast tested nothing there.
    const waiting = await engine.queries.castRays(
      ask(view, earth, [THROUGH, BESIDE]),
    );
    const [over, beside] = waiting.rays;
    expect(over!.verdict).toBe("unknown");
    expect(over!.unknown).toHaveLength(1);
    const span = over!.unknown[0]!;
    expect(span.reason).toBe("notLoaded");
    // The tile's bounding sphere (17.3 m) about the middle of 200 m.
    expect(span.from).toBeCloseTo(0.5 - Math.sqrt(300) / 200, 9);
    expect(span.to).toBeCloseTo(0.5 + Math.sqrt(300) / 200, 9);
    expect(over!.accuracy.note).toMatch(/tiles not drawn yet/);
    expect(waiting.final).toBe(false);
    // No streamed content beside it: clear.
    expect(beside!.verdict).toBe("clear");

    // Loaded and drawn: tested, clear or blocked by the cast.
    arrive!(triangle());
    await frames(60);
    expect(tileset.stats.loaded).toBe(1);
    const drawn = await engine.queries.castRays(ask(view, earth, [THROUGH]));
    expect(drawn.rays[0]).toMatchObject({ verdict: "clear", unknown: [] });
    expect(drawn.final).toBe(true);
    cast.mockImplementation(async (rays) => rays.map(() => 100));
    const hit = await engine.queries.castRays(ask(view, earth, [THROUGH]));
    expect(hit.rays[0]).toMatchObject({
      verdict: "blocked",
      hit: { t: 0.5 },
      unknown: [],
    });

    // Combined with a target that answers nothing here, the unknown
    // spans carry through.
    cast.mockImplementation(async (rays) => rays.map(() => undefined));
    lookAway(view);
    await frames(10);
    const joined = await engine.queries.castRays({
      ...ask(view, earth, [THROUGH]),
      targets: ["terrain", "draws"],
    });
    expect(joined.rays[0]!.verdict).toBe("unknown");
    expect(joined.rays[0]!.unknown.map((s) => s.reason).sort()).toEqual([
      "notLoaded",
      "unsupported",
    ]);
  });

  it("answers a standing view-scoped query again when a cached tile is shown again", async () => {
    vi.spyOn(engine, "loadGltf").mockResolvedValue(triangle());
    const { view, earth, world } = scene();
    engine.start();
    const tileset = await engine.addTileset(view.world, URL_);
    await frames(60);
    expect(tileset.stats.loaded).toBe(1);
    const answers: QueryAnswer[] = [];
    const standing = engine.queries.standing(
      () => ask(view, earth, [THROUGH]),
      (a) => answers.push(a),
    );
    await frames(5);
    expect(answers.map((a) => a.rays[0]!.verdict)).toEqual(["clear"]);

    // Out of view: kept in the cache, drawn by no view, so untested.
    const shown = world.contentRevision;
    lookAway(view);
    await frames(10);
    expect(tileset.stats.loaded).toBe(1);
    expect(world.contentRevision).toBeGreaterThan(shown);
    expect(answers.at(-1)!.rays[0]!.verdict).toBe("unknown");
    expect(answers.at(-1)!.rays[0]!.unknown[0]!.reason).toBe("notLoaded");

    // Shown again from the cache, with no load: answered again, clear.
    const loads = vi.mocked(engine.loadGltf).mock.calls.length;
    lookAtTile(view);
    await frames(10);
    expect(vi.mocked(engine.loadGltf).mock.calls.length).toBe(loads);
    const last = answers.at(-1)!;
    expect(last.rays[0]!.verdict).toBe("clear");
    expect(last.revision).toBeGreaterThan(answers[0]!.revision);
    standing.dispose();
  });

  it("delivers the improved answer of a standing query whose content finished loading while an answer was in flight, with no tick after", async () => {
    let arrive: ((asset: GltfAsset) => void) | undefined;
    vi.spyOn(engine, "loadGltf").mockImplementation(
      () => new Promise<GltfAsset>((resolve) => (arrive = resolve)),
    );
    const { view, earth, cast } = scene();
    engine.start();
    const tileset = await engine.addTileset(view.world, URL_);
    await frames(30);
    expect(arrive).toBeDefined();
    // The first cast answers late, as a GPU engine does: after the tile
    // has loaded and the engine has gone to sleep.
    let release: (() => void) | undefined;
    cast.mockImplementationOnce(
      (rays) =>
        new Promise((resolve) => {
          release = () => resolve(rays.map(() => undefined));
        }),
    );
    const answers: QueryAnswer[] = [];
    const standing = engine.queries.standing(
      () => ask(view, earth, [THROUGH]),
      (a) => answers.push(a),
    );
    await frames(2);
    expect(release).toBeDefined();
    arrive!(triangle());
    await frames(60);
    expect(tileset.stats.loaded).toBe(1);
    expect(queue.size).toBe(0); // asleep: no tick will come
    expect(answers).toHaveLength(0);
    release!();
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    expect(queue.size).toBe(0);
    expect(answers.map((a) => [a.final, a.rays[0]!.verdict])).toEqual([
      [false, "unknown"],
      [true, "clear"],
    ]);
    expect(answers[1]!.revision).toBeGreaterThan(answers[0]!.revision);
    standing.dispose();
  });

  it("rejects a query whose world is removed before the answer, and answers the rest of the batch", async () => {
    const a = engine.createWorld();
    const b = engine.createWorld();
    const gone = a.addAnchor("gone");
    const kept = b.addAnchor("kept");
    const rays = [{ from: [0, 0, 0], to: [10, 0, 0] }];
    const doomed = engine.queries.castRays({
      anchor: gone,
      seconds: 0,
      rays,
      targets: ["terrain", "draws"],
    });
    const healthy = engine.queries.castRays({
      anchor: kept,
      seconds: 0,
      rays,
      targets: ["terrain", "draws"],
    });
    engine.removeWorld(a);
    await expect(doomed).rejects.toThrow(/gone is not an anchor of any world/);
    const answer = await healthy;
    expect(answer.rays[0]!.verdict).toBe("unknown"); // no globe under kept
    engine.removeWorld(b);
  });
});

// ------------------------------------------------------------------ globe

const EMPTY_ASSET = {
  meshes: [],
  materials: [],
  textures: [],
  images: [],
  draws: [],
  featureTables: [],
  warnings: [],
} as unknown as GltfAsset;

/** A terrain source whose tiles "load" flat 9×9 meshes at 50 m. */
async function terrain(levels: number): Promise<TerrainSource> {
  const available = Array.from({ length: levels }, (_, l) => [
    { startX: 0, startY: 0, endX: 2 ** (l + 1) - 1, endY: 2 ** l - 1 },
  ]);
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          format: "quantized-mesh-1.0",
          tiles: ["{z}/{x}/{y}.terrain"],
          available,
        }),
      ),
  );
  const loader: TerrainLoader = async (request) => ({
    asset: EMPTY_ASSET,
    info: {
      minimumHeight: 50,
      maximumHeight: 50,
      sphere: { center: [0, 0, 0], radius: 1 },
      quadrants: [
        [50, 50],
        [50, 50],
        [50, 50],
        [50, 50],
      ],
      heights: gridTile(request.rect, 9, () => 50).heights,
    },
  });
  return TerrainSource.create(
    "https://terrain.test/layer.json",
    undefined,
    loader,
    {
      warnings: new Set(),
    },
  );
}

describe("Engine.queries through a real globe, as one view draws it", () => {
  let engine: Engine;
  beforeEach(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("traces the tiles view A draws; for view B nothing is drawn there", async () => {
    const LON = 0.3;
    const LAT = 0.2;
    const source = await terrain(14);
    let tile = source.root.children.find((t) =>
      contains(t.globe!.rectangle, LON, LAT),
    )!;
    const path: Tile[] = [tile];
    while (tile.globe!.level < 12) {
      source.expand(tile);
      tile = tile.children.find((t) => contains(t.globe!.rectangle, LON, LAT))!;
      path.push(tile);
    }
    await source.loadTile(tile, new AbortController().signal);
    tile.state = "ready";

    const world = engine.createWorld();
    const globe = Globe.create(engine, world, source, {});
    engine.tilesets.push(globe);
    const view = (target: OffscreenTarget) =>
      engine.addView({ target, world, exposure: { ev100: 15 } });
    const a = view(new OffscreenTarget(64, 48));
    const b = view(new OffscreenTarget(64, 48));
    tile.viewMask = engine.viewBit(a);
    try {
      // Straight down through the 50 m surface.
      const down = { from: at(LON, LAT, 500), to: at(LON, LAT, -500) };
      const query = (v: View): RayQuery => ({
        anchor: globe.anchor,
        seconds: 0,
        rays: [down],
        targets: ["terrain"],
        view: v,
      });
      const seen = await engine.queries.castRays(query(a));
      expect(seen.rays[0]!.verdict).toBe("blocked");
      expect(seen.rays[0]!.hit!.t).toBeCloseTo(450 / 1000, 3);
      expect(seen.rays[0]!.accuracy.note).toMatch(/level 12/);
      const unseen = await engine.queries.castRays(query(b));
      expect(unseen.rays[0]!.verdict).toBe("unknown");
      expect(unseen.rays[0]!.unknown.map((s) => s.reason)).toEqual([
        "notLoaded",
      ]);
    } finally {
      engine.tilesets.splice(engine.tilesets.indexOf(globe), 1);
      globe.destroy();
    }
  });
});
