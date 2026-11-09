// Terrain clips in a world (globe/terrainClip.ts, World's clip blocks):
// how regions' blocks are budgeted, freed and reused beside mixed-LOD
// placeholders; the placeholders' packed record word; tiles' masks as
// regions come and go; and the queries that treat clipped terrain as a
// hole (height clamping, sampleHeightMostDetailed). CPU only (fakeGpu).
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EARTH } from "../src/scene/Body.ts";
import {
  TerrainRegionError,
  type TerrainRegionShape,
} from "../src/globe/terrainClip.ts";
import {
  CLIP_BLOCK_BITS,
  CLIP_BLOCK_ROWS,
  CLIP_BLOCK_WORD,
  CLIP_BOXES,
  MAX_TERRAIN_CLIPS,
  MAX_TERRAIN_CLIP_BLOCKS,
  PLACEHOLDER_MASK_WORD,
  RECORD_WORDS,
  TERRAIN_CLIP_WORD,
  packClip,
} from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { HeightClamping } from "../src/scene/HeightClamping.ts";
import { createBox } from "../src/scene/meshes.ts";
import type { World } from "../src/scene/World.ts";
import type { CastRay, ClipBox } from "../src/scene/world/types.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = Math.PI / 180;

/** A world's clip-block state, as the tests read it. */
const blocks = (world: World) => ({
  clipBlockCount: world.scene.clipBlockCount,
  clipBuffer: world.clipBuffer,
  recordsU32: world.raster.recordsU32,
});

/** Rows of a region taking `n` clip blocks. */
const rowsOf = (n: number) => new Float32Array(n * CLIP_BLOCK_ROWS * 4);

const BOX: ClipBox = {
  center: [6378137, 0, 0],
  rows: [1, 0, 0, 0, 1, 0, 0, 0, 1],
};

describe("placeholders' clip blocks", () => {
  it("pack a block and box count into one record word, as the shader reads it", () => {
    for (const [block, count] of [
      [1, 1],
      [12345, CLIP_BOXES],
      [2 ** CLIP_BLOCK_BITS - 1, 3],
    ] as const) {
      const packed = packClip(block, count);
      // surface.slang insideClipBoxes: & (2^28 − 1) and >> 28.
      expect(packed & (2 ** CLIP_BLOCK_BITS - 1)).toBe(block);
      expect(packed >>> CLIP_BLOCK_BITS).toBe(count);
    }
    expect(() => packClip(1, CLIP_BOXES + 1)).toThrow(RangeError);
    expect(() => packClip(1, 0)).toThrow(/don't fit/);
    expect(() => packClip(2 ** CLIP_BLOCK_BITS, 1)).toThrow(/below 2\^28/);
  });

  it("write the packed word and mask into the record, and clear both", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const mesh = world.addMesh(createBox());
    const draw = world.addDraw({ mesh });
    const clip = world.allocateClip([BOX, BOX, BOX])!;
    expect(clip.count).toBe(3);
    expect(clip.block).toBeGreaterThanOrEqual(1); // block 0: the directory
    world.setPlaceholder(draw, 0b101, clip);
    const u = blocks(world).recordsU32;
    const o = draw.index * RECORD_WORDS;
    expect(u[o + PLACEHOLDER_MASK_WORD]).toBe(0b101);
    expect(u[o + CLIP_BLOCK_WORD]! & (2 ** CLIP_BLOCK_BITS - 1)).toBe(
      clip.block,
    );
    expect(u[o + CLIP_BLOCK_WORD]! >>> CLIP_BLOCK_BITS).toBe(3);
    // The terrain clip word beside it is untouched.
    expect(u[o + TERRAIN_CLIP_WORD]).toBe(0);
    world.setPlaceholder(draw, 0b101);
    expect(u[o + PLACEHOLDER_MASK_WORD]).toBe(0);
    expect(u[o + CLIP_BLOCK_WORD]).toBe(0);
    world.freeClip(clip);
    expect(world.memory.clipBlocks.used).toBe(0);
    // Too many boxes for a block: none.
    expect(
      world.allocateClip(Array.from({ length: CLIP_BOXES + 1 }, () => BOX)),
    ).toBeUndefined();
  });
});

describe("terrain clip regions' blocks", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });

  it("hold 32 regions at their limit without pressing on streaming", () => {
    const world = engine.createWorld();
    const before = world.pressure().fraction;
    for (let i = 0; i < MAX_TERRAIN_CLIPS; i++) {
      world.addTerrainClipRegion(rowsOf(MAX_TERRAIN_CLIP_BLOCKS));
    }
    const { terrainClipBlocks, clipBlocks } = world.memory;
    expect(terrainClipBlocks.used).toBe(
      MAX_TERRAIN_CLIPS * MAX_TERRAIN_CLIP_BLOCKS,
    );
    expect(terrainClipBlocks.used).toBeLessThanOrEqual(
      terrainClipBlocks.capacity,
    );
    // Placeholders keep the rest: 16,384 − 1 − 3,840.
    expect(clipBlocks.capacity).toBe(12543);
    // Set aside, the regions' blocks are no pool for eviction to relieve.
    expect(world.pressure().fraction).toBe(before);
    // The buffer grew past its first 256 blocks to hold them.
    expect(blocks(world).clipBuffer.size).toBeGreaterThanOrEqual(
      (1 + MAX_TERRAIN_CLIPS * MAX_TERRAIN_CLIP_BLOCKS) * CLIP_BLOCK_ROWS * 16,
    );
    expect(() => world.addTerrainClipRegion(rowsOf(1))).toThrow(
      /at most 32 terrain regions per world/,
    );
  });

  it("refuses a region past the blocks set aside, saying what to do", () => {
    // 401 blocks: a quarter of the 400 past the directory is 100.
    const world = engine.createWorld({ maxClipBlocks: 401 });
    expect(world.memory.terrainClipBlocks.capacity).toBe(100);
    world.addTerrainClipRegion(rowsOf(60));
    expect(() => world.addTerrainClipRegion(rowsOf(41))).toThrow(
      TerrainRegionError,
    );
    expect(() => world.addTerrainClipRegion(rowsOf(41))).toThrow(
      /would take 101 clip blocks, more than the 100 set aside .*maxClipBlocks.*simplify the polygon, or remove a region/,
    );
    expect(() => world.addTerrainClipRegion(rowsOf(40))).not.toThrow();
    expect(() =>
      world.addTerrainClipRegion(rowsOf(MAX_TERRAIN_CLIP_BLOCKS + 1)),
    ).toThrow(/more than the 120 a region may; simplify the polygon, or split/);
    // Placeholders still get theirs: 300.
    expect(world.memory.clipBlocks.capacity).toBe(300);
    const placeholders = Array.from({ length: 300 }, () =>
      world.allocateClip([BOX]),
    );
    expect(placeholders.every((p) => p !== undefined)).toBe(true);
    expect(world.allocateClip([BOX])).toBeUndefined();
    expect(world.pressure()).toEqual({ fraction: 1, pool: "clip blocks" });
  });

  it("frees a region's blocks and directory row, and reuses them", () => {
    const world = engine.createWorld();
    const writes: Array<[GPUBuffer, number, ArrayBufferView]> = [];
    const device = engine.gpu.device as unknown as { queue: GPUQueue };
    const queue = device.queue;
    device.queue = new Proxy(queue, {
      get: (t, key) =>
        key === "writeBuffer"
          ? (buffer: GPUBuffer, offset: number, data: ArrayBufferView) => {
              writes.push([buffer, offset, data]);
            }
          : (t as unknown as Record<PropertyKey, unknown>)[key],
    });
    try {
      const a = world.addTerrainClipRegion(rowsOf(10));
      const directory = (slot: number) => {
        const calls = writes.filter(
          ([buffer, offset]) =>
            buffer === blocks(world).clipBuffer && offset === slot * 16,
        );
        return [...new Uint32Array(calls.at(-1)![2].buffer)];
      };
      const first = directory(a)[0]!;
      expect(first).toBe(CLIP_BLOCK_ROWS); // block 1
      const b = world.addTerrainClipRegion(rowsOf(5));
      expect(directory(b)[0]).toBe(11 * CLIP_BLOCK_ROWS);
      world.removeTerrainClipRegion(a);
      expect(directory(a)).toEqual([0, 0, 0, 0]);
      expect(world.memory.terrainClipBlocks.used).toBe(5);
      // The same size again: the freed run, at its first row.
      const c = world.addTerrainClipRegion(rowsOf(10));
      expect(c).toBe(a);
      expect(directory(c)[0]).toBe(first);
      // The top region freed lowers the blocks in use.
      const top = blocks(world).clipBlockCount;
      world.removeTerrainClipRegion(b);
      expect(blocks(world).clipBlockCount).toBe(top - 5);
    } finally {
      device.queue = queue;
    }
  });

  it("never fills up over many removes and adds among placeholders", () => {
    // An editor moving footprints: remove then add, sizes varying, while
    // placeholders come and go. Each kind reuses its own free blocks, and
    // regions slide together when their free runs are too broken up.
    const world = engine.createWorld({ maxClipBlocks: 2001 });
    const budget = world.memory.terrainClipBlocks.capacity; // 500
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const regions: Array<{ slot: number; size: number }> = [];
    const placeholders: Array<NonNullable<ReturnType<World["allocateClip"]>>> =
      [];
    let held = 0;
    let highest = 0;
    let mostPlaceholders = 0;
    for (let cycle = 0; cycle < 3000; cycle++) {
      if (regions.length > 0 && (regions.length >= 12 || random() < 0.5)) {
        const [r] = regions.splice(Math.floor(random() * regions.length), 1);
        world.removeTerrainClipRegion(r!.slot);
        held -= r!.size;
      }
      const size = 1 + Math.floor(random() * 60);
      if (held + size <= budget) {
        regions.push({ slot: world.addTerrainClipRegion(rowsOf(size)), size });
        held += size;
      }
      // Placeholders: a burst of new ones, a burst freed, 300 at most.
      for (
        let k = Math.floor(random() * 40);
        k > 0 && placeholders.length < 300;
        k--
      ) {
        const p = world.allocateClip([BOX]);
        if (p) {
          placeholders.push(p);
        }
      }
      for (
        let k = Math.floor(random() * 40);
        k > 0 && placeholders.length;
        k--
      ) {
        const [p] = placeholders.splice(
          Math.floor(random() * placeholders.length),
          1,
        );
        world.freeClip(p!);
      }
      expect(world.memory.terrainClipBlocks.used).toBe(held);
      expect(world.memory.clipBlocks.used).toBe(placeholders.length);
      highest = Math.max(highest, blocks(world).clipBlockCount);
      mostPlaceholders = Math.max(mostPlaceholders, placeholders.length);
    }
    // Well below the pool, though both kinds churned 3,000 times: what
    // is held at most, with room for what the free runs break up (about
    // 1,100 blocks here, and as many over ten times the cycles).
    expect(mostPlaceholders).toBe(300);
    expect(highest).toBeLessThanOrEqual(1 + 2 * (300 + budget));
  });

  it("slides regions together when their free runs are too broken up", () => {
    // 120 blocks past the directory: 30 for regions, 90 placeholders.
    const world = engine.createWorld({ maxClipBlocks: 121 });
    const [a, , c] = [10, 10, 10].map((n) =>
      world.addTerrainClipRegion(rowsOf(n)),
    );
    for (let i = 0; i < 90; i++) {
      expect(world.allocateClip([BOX])).toBeDefined();
    }
    expect(blocks(world).clipBlockCount).toBe(121);
    // Two runs of 10 free, apart: a region of 20 fits only once the one
    // between them moves down.
    world.removeTerrainClipRegion(a!);
    world.removeTerrainClipRegion(c!);
    expect(() => world.addTerrainClipRegion(rowsOf(20))).not.toThrow();
    expect(world.memory.terrainClipBlocks.used).toBe(30);
    expect(blocks(world).clipBlockCount).toBe(121);
  });

  it("frees a globe's regions and blocks when it goes", () => {
    const world = engine.createWorld();
    const globe = engine.addEllipsoid(world);
    globe.terrain.addRegion({
      rectangle: { west: 7.4, south: 46.9, east: 7.45, north: 46.95 },
    });
    expect(world.memory.terrainClipBlocks.used).toBeGreaterThan(0);
    engine.removeTileset(globe);
    expect(world.memory.terrainClipBlocks.used).toBe(0);
    // A destroyed globe takes no new region (its slot would never free).
    expect(() =>
      globe.terrain.addRegion({
        rectangle: { west: 7.4, south: 46.9, east: 7.45, north: 46.95 },
      }),
    ).toThrow(/destroyed/);
    expect(world.memory.terrainClipBlocks.used).toBe(0);
  });

  it("refuses an overlap past a fragment's edge budget at addRegion", () => {
    const world = engine.createWorld();
    const globe = engine.addEllipsoid(world);
    // Rings of 16 edges, as many on one spot as the budget allows.
    const ring = (lon: number): TerrainRegionShape => ({
      polygon: Array.from({ length: 16 }, (_, k) => ({
        longitude: lon + 0.01 * Math.cos((2 * Math.PI * k) / 16),
        latitude: 46 + 0.01 * Math.sin((2 * Math.PI * k) / 16),
      })),
    });
    let added = 0;
    let refused: unknown;
    for (; added < MAX_TERRAIN_CLIPS; added++) {
      try {
        globe.terrain.addRegion(ring(7 + added * 0.0001));
      } catch (error) {
        refused = error;
        break;
      }
    }
    expect(refused).toBeInstanceOf(TerrainRegionError);
    expect((refused as Error).message).toMatch(/at most 128/);
    // Refused before taking a slot or blocks.
    expect(globe.terrain.regions.length).toBe(added);
    expect(() => globe.terrain.addRegion(ring(9))).not.toThrow();
    engine.removeTileset(globe);
  });
});

describe("tiles' masks as regions come and go", () => {
  it("recomputes every loaded tile's mask on add and on remove", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const globe = engine.addEllipsoid(world);
    const mesh = world.addMesh(createBox());
    const under = world.addDraw({ mesh });
    const beside = world.addDraw({ mesh });
    // Two loaded globe tiles: one under the site, one 1° east of it.
    const tile = (west: number, draw: typeof under) => ({
      placement: { draws: [draw] },
      globe: {
        rectangle: {
          west: west * R,
          south: 46.9 * R,
          east: (west + 0.1) * R,
          north: 47 * R,
        },
      },
    });
    const loaded = globe.state.loaded as unknown as Set<unknown>;
    loaded.add(tile(7.4, under));
    loaded.add(tile(8.4, beside));
    const u = blocks(world).recordsU32;
    const mask = (draw: typeof under) =>
      u[draw.index * RECORD_WORDS + TERRAIN_CLIP_WORD];
    const site = globe.terrain.addRegion({
      rectangle: { west: 7.42, south: 46.92, east: 7.44, north: 46.94 },
    });
    expect(mask(under)).toBe(1); // slot 0
    expect(mask(beside)).toBe(0);
    const east = globe.terrain.addRegion({
      rectangle: { west: 8.45, south: 46.92, east: 8.46, north: 46.94 },
    });
    expect(mask(under)).toBe(0b01);
    expect(mask(beside)).toBe(0b10);
    site.remove();
    expect(mask(under)).toBe(0);
    expect(mask(beside)).toBe(0b10);
    east.remove();
    expect(mask(beside)).toBe(0);
    loaded.clear();
    engine.removeTileset(globe);
  });
});

/** A tileset as height clamping uses it. */
function fakeTileset(
  world: World,
  options: {
    terrain: boolean;
    collision: boolean;
    url: string;
    clipped?: (lon: number, lat: number) => boolean;
    ground?: number;
    draws?: number[];
  },
) {
  const listeners: Array<(r: unknown) => void> = [];
  const clipped = (lon: number, lat: number) =>
    options.clipped?.(lon, lat) ?? false;
  return {
    world,
    // Under the Earth's anchor, as tilesets are by default (plan 5a).
    anchor: world.bodyAnchor(EARTH),
    url: options.url,
    show: true,
    enableCollision: options.collision,
    isGlobe: options.terrain,
    changedAt: 0,
    listeners,
    onHeightsChanged: (l: (r: unknown) => void) => listeners.push(l),
    // Degrees, as Tileset3D.terrainClipped takes them.
    terrainClipped: (lon: number, lat: number) => clipped(lon, lat),
    surfaceHeight: (lon: number, lat: number) =>
      options.terrain && !clipped(lon / R, lat / R)
        ? options.ground
        : undefined,
    exactHeight: (lon: number, lat: number) =>
      options.terrain && !clipped(lon / R, lat / R)
        ? options.ground
        : undefined,
    ownsDraw: (index: number) => options.draws?.includes(index) ?? false,
  };
}

/** A world as height clamping uses it: casts, its Earth anchor and one transform. */
function fakeWorld(castRays: World["castRays"]) {
  const matrix = new Float64Array(16);
  matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
  const earth = { index: 0, generation: 0, name: "Earth", slot: 1 };
  return {
    id: 1,
    bodyAnchor: () => earth,
    castRays,
    transformAlive: () => true,
    localMatrix: () => Float64Array.from(matrix),
    setTransform: (_t: unknown, m: Float64Array) => matrix.set(m),
    matrix,
  } as unknown as World & { matrix: Float64Array };
}

describe("height clamping under terrain clips", () => {
  const site = (lon: number, lat: number) =>
    Math.abs(lon - 7.43) < 0.01 && Math.abs(lat - 46.93) < 0.01;

  it("casts for collision tilesets only, leaving the globes' draws out", async () => {
    // A collision tileset's floor at 1,000 m, under the ray's origin.
    const cast = vi.fn(async (rays: readonly CastRay[], _options?: object) =>
      rays.map(
        (ray) =>
          Ellipsoid.WGS84.cartesianToCartographic(
            Float64Array.from(ray.origin),
            { longitude: 0, latitude: 0, height: 0 },
          )!.height - 1000,
      ),
    );
    const world = fakeWorld(cast as unknown as World["castRays"]);
    let clipping = false;
    const globe = fakeTileset(world, {
      terrain: true,
      collision: true,
      url: "globe",
      ground: 1500,
      draws: [3, 4],
      clipped: (lon, lat) => clipping && site(lon, lat),
    });
    const tiles = fakeTileset(world, {
      terrain: false,
      collision: false,
      url: "tiles",
    });
    const sets = [globe, tiles] as unknown as Tileset3D[];
    const clamping = new HeightClamping(
      () => sets,
      () => 1,
      async () => [1500],
    );
    const clamp = clamping.add(
      world,
      { index: 0, generation: 0 },
      {
        heightReference: "clampToGround",
        longitude: 7.43 * R,
        latitude: 46.93 * R,
        height: 0,
      },
    );
    // Only the globe has collision: nothing to cast against.
    for (let i = 0; i < 12; i++) {
      clamping.update();
      await Promise.resolve();
    }
    expect(cast).not.toHaveBeenCalled();
    expect(clamp.height).toBe(1500);
    // A collision tileset comes: the cast leaves the globe's draws out.
    tiles.enableCollision = true;
    for (let i = 0; i < 12; i++) {
      clamping.update();
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(cast).toHaveBeenCalled();
    const options = cast.mock.calls[0]![1] as unknown as {
      collisionOnly: boolean;
      exclude: (draw: number) => boolean;
    };
    expect(options.collisionOnly).toBe(true);
    expect(options.exclude(3)).toBe(true);
    expect(options.exclude(4)).toBe(true);
    expect(options.exclude(5)).toBe(false);
    // Outside a clip, the higher ground: the terrain.
    expect(clamp.height).toBe(1500);
    // Clipped: it re-clamps through the globe's height listener and
    // stands on the collision tileset's floor below.
    clipping = true;
    for (const l of globe.listeners) {
      l({ west: 7.4 * R, south: 46.9 * R, east: 7.45 * R, north: 46.95 * R });
    }
    clamping.update();
    expect(clamp.height).toBeCloseTo(1000, 6);
    // And back on the terrain when the clip goes.
    clipping = false;
    for (const l of globe.listeners) {
      l({ west: 7.4 * R, south: 46.9 * R, east: 7.45 * R, north: 46.95 * R });
    }
    clamping.update();
    expect(clamp.height).toBe(1500);
  });

  it("settles where it is with only clipped terrain to stand on", async () => {
    const world = fakeWorld((async () => []) as unknown as World["castRays"]);
    const globe = fakeTileset(world, {
      terrain: true,
      collision: false,
      url: "globe",
      ground: 1500,
      clipped: site,
    });
    const sample = vi.fn(async () => [1500]);
    const clamping = new HeightClamping(
      () => [globe] as unknown as Tileset3D[],
      () => 1,
      sample,
    );
    const clamp = clamping.add(
      world,
      { index: 0, generation: 0 },
      {
        heightReference: "clampToTerrain",
        longitude: 7.43 * R,
        latitude: 46.93 * R,
        height: 250,
      },
    );
    clamping.update();
    clamping.update();
    await clamp.whenSettled();
    expect(clamp.settled).toBe(true);
    expect(clamp.height).toBe(250);
    expect(sample).not.toHaveBeenCalled();
  });
});

describe("sampleHeightMostDetailed under terrain clips", () => {
  it("drops the globe's hits inside a clip, keeping those outside", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const globe = engine.addEllipsoid(world);
    globe.terrain.addRegion({
      rectangle: { west: 7.4, south: 46.9, east: 7.45, north: 46.95 },
    });
    vi.spyOn(globe, "queryRays").mockResolvedValue({
      draws: [],
      release: () => {},
    } as unknown as Awaited<ReturnType<Tileset3D["queryRays"]>>);
    // Every ray hits 10 km down: the ground at 0 m.
    vi.spyOn(world, "castRays").mockImplementation(async (rays) =>
      rays.map(() => 10000),
    );
    const heights = await engine.sampleHeightMostDetailed(
      world,
      [
        { longitude: 7.43 * R, latitude: 46.93 * R },
        { longitude: 7.5 * R, latitude: 46.93 * R },
      ],
      { tilesets: [globe] },
    );
    expect(heights).toEqual([undefined, 0]);
    engine.removeTileset(globe);
  });
});
