// How off-screen shadow casters share the cache and the world's pools with
// what views draw: through the real tileset on the fake engine, in
// continuous mode. `casterLoop.test.ts` runs them on the on-demand loop.
import { upload } from "../src/streaming/tilesetUpload.ts";
import { unload } from "../src/streaming/tilesetEviction.ts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import type { TilesetOptions } from "../src/streaming/tilesetTypes.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const URL_ = "https://tiles.test/budget/tileset.json";

function slab(half: number): GltfAsset {
  const h = half;
  return {
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
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

interface TileJson {
  geometricError: number;
  refine: "REPLACE";
  boundingVolume: { box: number[] };
  transform?: number[];
  content?: { uri: string };
  children?: TileJson[];
}

const tile = (
  uri: string,
  at: readonly number[],
  half: readonly number[],
  geometricError = 0,
  children: TileJson[] = [],
): TileJson => ({
  geometricError,
  refine: "REPLACE",
  boundingVolume: {
    box: [0, 0, 0, half[0]!, 0, 0, 0, half[1]!, 0, 0, 0, half[2]!],
  },
  transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, at[0]!, at[1]!, at[2]!, 1],
  content: { uri },
  children,
});

/** The floor 20 m north of a camera at (R + 2, y, 0), for y of 0, 4000, 8000. */
const floorAt = (y: number, name = "floor") =>
  tile(`${name}${y}.gltf`, [R, y, 20], [1, 10, 10]);
/** A roof up-sun of the camera at y = 0 (the sun is high in the south). */
const roofAt = (i: number) =>
  tile(`roof${i}.gltf`, [R + 15 + i, 0, -5 - i], [1, 5, 5]);

const json = (children: readonly TileJson[]) => ({
  asset: { version: "1.1" },
  geometricError: 1000,
  root: {
    geometricError: 1000,
    refine: "ADD",
    boundingVolume: { box: [R, 4000, 0, 5000, 0, 0, 0, 9000, 0, 0, 0, 5000] },
    children,
  },
});

interface Internals {
  cacheBytes: number;
  casterLoad: boolean;
  ready: Array<{ tile: Tile; asset: GltfAsset; arrivedAt: number }>;
}

describe("casters share the cache", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => slab(5));
  });
  afterEach(() => vi.unstubAllGlobals());

  async function scene(
    children: readonly TileJson[],
    options: TilesetOptions = {},
    worldOptions: { maxDraws: number; maxTransforms?: number } = {
      maxDraws: 64,
    },
  ) {
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(json(children)), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    const world = engine.createWorld(worldOptions);
    const tileset = await engine.addTileset(world, URL_, options);
    const view = engine.addView({
      target: new OffscreenTarget(64, 48),
      world,
      shadows: true,
    });
    v3.normalize(engine.sunDirection, v3.vec3(1, 0, -1));
    const frames = async (count: number) => {
      for (let i = 0; i < count; i++) {
        engine.renderFrame();
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    };
    /** The camera 2 m up at east offset `y`, looking north. */
    const look = (y: number, north = 0) => {
      view.camera.position.set([R + 2, y, north]);
      view.camera.direction.set([0, 0, 1]);
      view.camera.orient(Float64Array.of(1, 0, 0));
      view.camera.version++;
    };
    look(0);
    return {
      world,
      tileset,
      view,
      frames,
      look,
      internals: tileset as unknown as Internals,
      tiles: tileset.root.children as Tile[],
      remove() {
        engine.removeView(view);
        engine.removeTileset(tileset);
      },
    };
  }
  /** Whether the loop could sleep: nothing needs another tick. */
  const asleep = (t: Tileset3D) => !t.needsFrames;

  it("a still view with a cold tile and casters settles, casters resident, requests bounded", async () => {
    const s = await scene([
      floorAt(0),
      floorAt(4000),
      roofAt(0),
      roofAt(1),
      roofAt(2),
      roofAt(3),
    ]);
    try {
      // The cold tile: seen first, then left.
      s.look(4000);
      await s.frames(12);
      s.look(0);
      await s.frames(12);
      const [floor, cold, ...roofs] = s.tiles;
      const b = floor!.bytes;
      expect(cold!.state).toBe("ready");
      // Room for the floor, the cold tile and one caster, no more.
      s.internals.cacheBytes = Math.round(3.5 * b);
      const before = s.tileset.stats.requestsTotal;
      await s.frames(300);
      const resident = roofs.filter((r) => r.state === "ready").length;
      expect(resident).toBeGreaterThanOrEqual(1);
      expect(floor!.viewMask).not.toBe(0);
      // Bounded: each caster at most once, nothing loops.
      expect(s.tileset.stats.requestsTotal - before).toBeLessThanOrEqual(4);
      expect(s.tileset.stats.bytes).toBeLessThanOrEqual(s.internals.cacheBytes);
      expect(asleep(s.tileset)).toBe(true);
      expect(s.tileset.stats.casterBytes).toBeGreaterThan(0);
    } finally {
      s.remove();
    }
  });

  it("a caster larger than its room doesn't load and evict again and again", async () => {
    // The floor and the roof are the same size; the budget is 0.8 times both.
    const s = await scene([floorAt(0), roofAt(0)]);
    try {
      await s.frames(12);
      const [floor, roof] = s.tiles as [Tile, Tile];
      expect(roof.state).toBe("ready");
      s.internals.cacheBytes = Math.round((floor.bytes + roof.bytes) * 0.8);
      const before = s.tileset.stats.purposes.caster.requests;
      await s.frames(120);
      expect(
        s.tileset.stats.purposes.caster.requests - before,
      ).toBeLessThanOrEqual(1);
      expect(roof.state).toBe("unloaded");
      expect(floor.state).toBe("ready");
      expect(asleep(s.tileset)).toBe(true);
    } finally {
      s.remove();
    }
  });

  it("casters yield a world pool to what the view needs", async () => {
    // Six draw slots: five casters and the floor fill them. The camera
    // turns to a tile at its side.
    const roofs = [0, 1, 2, 3, 4].map(roofAt);
    const side = tile("side.gltf", [R, 60, 20], [1, 5, 5]);
    const s = await scene(
      [floorAt(0), ...roofs, side],
      {},
      { maxDraws: 6, maxTransforms: 64 },
    );
    try {
      await s.frames(20);
      const sideTile = s.tiles[s.tiles.length - 1]!;
      const a = Math.atan2(60, 20);
      s.view.camera.direction.set([0, Math.sin(a), Math.cos(a)]);
      s.view.camera.orient(Float64Array.of(1, 0, 0));
      s.view.camera.version++;
      await s.frames(120);
      expect(sideTile.state).toBe("ready");
      expect(sideTile.viewMask).not.toBe(0);
      expect(s.tileset.stats.uploadQueue).toBe(0);
      expect(s.world.pressure().fraction).toBeLessThanOrEqual(0.9);
    } finally {
      s.remove();
    }
  });

  it("settles on a still view while a caster is still loading, and a view isn't waiting for it", async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    vi.mocked(engine.loadGltf).mockImplementation(async (url) => {
      if (String(url).includes("roof")) {
        await held;
      }
      return slab(5);
    });
    const s = await scene([floorAt(0), roofAt(0)]);
    try {
      await s.frames(20);
      const [floor, roof] = s.tiles as [Tile, Tile];
      expect(floor.state).toBe("ready");
      expect(roof.state).toBe("loading");
      expect(s.tileset.idle).toBe(true);
      expect(s.tileset.casterIdle).toBe(false);
      expect(s.tileset.settledAt).toBeDefined();
      expect(asleep(s.tileset)).toBe(true);
      release();
      await s.frames(10);
      expect(roof.state).toBe("ready");
      expect(s.tileset.casterIdle).toBe(true);
    } finally {
      release();
      vi.mocked(engine.loadGltf).mockImplementation(async () => slab(5));
      s.remove();
    }
  });

  it("uploads a view's tile before a caster decoded earlier, and drops a decoded caster under pressure", async () => {
    const s = await scene([floorAt(0), roofAt(0)]);
    try {
      await s.frames(12);
      const [floor, roof] = s.tiles as [Tile, Tile];
      // Unload both and queue the caster's decoded asset first.
      unload(s.tileset, floor);
      unload(s.tileset, roof);
      roof.purpose = "caster";
      floor.purpose = "view";
      floor.viewMask = 1;
      const queue = s.internals.ready;
      queue.length = 0;
      queue.push(
        { tile: roof, asset: slab(5), arrivedAt: 0 },
        { tile: floor, asset: slab(5), arrivedAt: 0 },
      );
      (s.tileset as unknown as { uploadsPerFrame: number }).uploadsPerFrame = 1;
      upload(s.tileset);
      expect(floor.state).toBe("ready");
      expect(roof.state).not.toBe("ready");
      expect(queue.length).toBe(1);
      // Over a pool's pressure, a decoded caster is dropped, not kept.
      roof.touchedFrame = (s.tileset as unknown as { frame: number }).frame;
      s.internals.casterLoad = false;
      upload(s.tileset);
      expect(queue.length).toBe(0);
      expect(roof.state).toBe("unloaded");
    } finally {
      s.remove();
    }
  });
});
