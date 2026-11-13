// Terrain geomorphing (`View.lodTransitions`): a tile carries its nearest drawn
// ancestor's surface height at each vertex, begins to morph in when first drawn over a
// coarser tile, and the loop ticks only while one morphs.
import { readFileSync } from "node:fs";
import { fakeEngine } from "./fakeGpu.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decodeQuantizedMesh,
  type Rectangle,
  type TerrainHeights,
} from "../src/globe/quantizedMesh.ts";
import { HEIGHT_MORPH_ATTRIBUTE } from "../src/globe/heightNormal.ts";
import { TerrainSource } from "../src/globe/TerrainSource.ts";
import { parentSurfaceHeights } from "../src/globe/terrainRefit.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import {
  attributeHash,
  MORPH_WORD,
  RECORD_WORDS,
} from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import {
  endMorphs,
  MORPH_SECONDS,
  MORPH_FRAMES,
  MORPH_MAX_SECONDS,
  transitionSeconds,
  morphFactor,
  startMorphs,
  type MorphHost,
} from "../src/streaming/tileMorph.ts";
import { gridTile } from "./terrainRayFixtures.ts";

const PARENT: Rectangle = { west: 0.3, south: 0.2, east: 0.302, north: 0.202 };
const plane = (lon: number, lat: number) =>
  100 + (lon - 0.3) * 4e5 + (lat - 0.2) * 1.5e5;

/** A quantized-mesh tile holding `heights` (triangles, then four empty edge lists), as the decoder reads one. */
function encode(heights: TerrainHeights, edges: number[][] = [[], [], [], []]) {
  const { u, v, h, triangles } = heights;
  // High-water-mark coding needs new vertices in order: renumber by first use.
  const renumber = new Map<number, number>();
  for (const i of triangles) {
    if (!renumber.has(i)) {
      renumber.set(i, renumber.size);
    }
  }
  const n = renumber.size;
  const zig = (values: ArrayLike<number>, order: number[]) => {
    const out = new Uint16Array(n);
    let last = 0;
    order.forEach((old, k) => {
      const d = values[old]! - last;
      out[k] = ((d << 1) ^ (d >> 15)) & 0xffff;
      last = values[old]!;
    });
    return out;
  };
  const order = [...renumber.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([old]) => old);
  const pairs = edges.map((e) => e.map((i) => renumber.get(i)!));
  const size =
    88 + 4 + n * 6 + 4 + triangles.length * 2 + 16 + pairs.flat().length * 2;
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  view.setFloat32(24, heights.minimumHeight, true);
  view.setFloat32(28, heights.maximumHeight, true);
  view.setFloat64(64, 1e7, true); // the bounding sphere's radius
  let pos = 88;
  view.setUint32(pos, n, true);
  pos += 4;
  for (const values of [zig(u, order), zig(v, order), zig(h, order)]) {
    for (const x of values) {
      view.setUint16(pos, x, true);
      pos += 2;
    }
  }
  if (pos % 2 !== 0) {
    pos++;
  }
  view.setUint32(pos, triangles.length / 3, true);
  pos += 4;
  let highest = 0;
  for (const i of triangles) {
    const k = renumber.get(i)!;
    view.setUint16(pos, highest - k, true);
    pos += 2;
    if (k === highest) {
      highest++;
    }
  }
  for (const e of pairs) {
    view.setUint32(pos, e.length, true);
    pos += 4;
    for (const i of e) {
      view.setUint16(pos, i, true);
      pos += 2;
    }
  }
  return { buffer, renumber };
}

describe("a terrain tile's parent heights", () => {
  const parent = gridTile(PARENT, 9, plane, 10).heights;
  const rect: Rectangle = {
    west: 0.301,
    east: 0.302,
    south: 0.2,
    north: 0.201,
  };
  // The child's own surface: the plane and a ridge, so it differs from the parent's.
  const ridge = (lon: number, lat: number) =>
    plane(lon, lat) + 6 * Math.sin(1e5 * (lon - 0.301));
  const child = gridTile(rect, 7, ridge, 11).heights;

  it("match a CPU interpolation of the parent over the child's quadrant", () => {
    const heights = parentSurfaceHeights(child.u, child.v, {
      heights: parent,
      scale: 2,
      qx: 1,
      qy: 0,
    });
    for (let i = 0; i < child.u.length; i++) {
      const lon = rect.west + (child.u[i]! / 32767) * (rect.east - rect.west);
      const lat =
        rect.south + (child.v[i]! / 32767) * (rect.north - rect.south);
      // The plane is exact on any triangulation; the 15-bit heights round it.
      expect(heights[i]).toBeCloseTo(plane(lon, lat), 1);
    }
  });

  it("ride the decoded mesh as (n, parent height - own height), skirts with their vertex", () => {
    const edges = [0, 1, 2, 3].map(() => [] as number[]);
    const n = 7;
    for (let k = 0; k < n; k++) {
      edges[0]!.push(k * n); // west
      edges[1]!.push(k); // south
      edges[2]!.push(k * n + n - 1); // east
      edges[3]!.push((n - 1) * n + k); // north
    }
    const { buffer, renumber } = encode(child, edges);
    const asked = decodeQuantizedMesh(buffer, rect, 25, {
      morph: { heights: parent, scale: 2, qx: 1, qy: 0 },
    });
    const plain = decodeQuantizedMesh(buffer, rect, 25);
    expect(asked.info.morphs).toBe(true);
    expect(plain.info.morphs).toBeUndefined();
    expect(plain.asset.meshes[0]!.attributes).toBeUndefined();
    const mesh = asked.asset.meshes[0]!;
    const attribute = mesh.attributes![HEIGHT_MORPH_ATTRIBUTE]!;
    expect(attribute.components).toBe(4);
    const data = attribute.data;
    const total = mesh.positions.length / 3;
    expect(data.length).toBe(total * 4);
    const heights = parentSurfaceHeights(child.u, child.v, {
      heights: parent,
      scale: 2,
      qx: 1,
      qy: 0,
    });
    const range = child.maximumHeight - child.minimumHeight;
    // Vertex k of the decoded mesh is the child's vertex `old` with renumber.get(old) === k.
    for (const [old, k] of renumber) {
      const expected =
        heights[old]! - (child.minimumHeight + (child.h[old]! / 32767) * range);
      expect(data[k * 4 + 3]).toBeCloseTo(expected, 2);
      expect(
        Math.hypot(data[k * 4]!, data[k * 4 + 1]!, data[k * 4 + 2]!),
      ).toBeCloseTo(1, 5);
    }
    // Each skirt vertex (after the surface's) moves as the vertex it hangs
    // from: edges in order west, south, east, north, each sorted along it.
    const surface = renumber.size;
    expect(total).toBe(surface + 4 * n);
    const along = [child.v, child.u, child.v, child.u];
    let skirt = surface;
    edges.forEach((edge, e) => {
      const sorted = [...edge].sort((a, b) => along[e]![a]! - along[e]![b]!);
      for (const old of sorted) {
        const from = renumber.get(old)! * 4;
        for (let c = 0; c < 4; c++) {
          expect(data[skirt * 4 + c]).toBe(data[from + c]);
        }
        skirt++;
      }
    });
    expect(skirt).toBe(total);
  });
});

describe("a tile's heights from a drawn ancestor several levels up", () => {
  const ancestor = gridTile(PARENT, 9, plane, 10).heights;
  const cellOf = (scale: number, qx: number, qy: number): Rectangle => {
    const w = (PARENT.east - PARENT.west) / scale;
    const h = (PARENT.north - PARENT.south) / scale;
    return {
      west: PARENT.west + qx * w,
      east: PARENT.west + (qx + 1) * w,
      south: PARENT.south + qy * h,
      north: PARENT.south + (qy + 1) * h,
    };
  };

  it.each([
    [4, 2, 1], // two levels below
    [8, 5, 6], // three levels below
    [8, 0, 7],
  ])(
    "at scale %i, cell (%i, %i), equal the ancestor's surface at the vertices",
    (scale, qx, qy) => {
      const rect = cellOf(scale, qx, qy);
      const child = gridTile(rect, 5, plane, 12).heights;
      const heights = parentSurfaceHeights(child.u, child.v, {
        heights: ancestor,
        scale,
        qx,
        qy,
      });
      for (let i = 0; i < child.u.length; i++) {
        const lon = rect.west + (child.u[i]! / 32767) * (rect.east - rect.west);
        const lat =
          rect.south + (child.v[i]! / 32767) * (rect.north - rect.south);
        expect(heights[i]).toBeCloseTo(plane(lon, lat), 1);
      }
    },
  );

  it("are NaN for a placement outside the ancestor", () => {
    const u = new Uint16Array([100, 20000]);
    const v = new Uint16Array([100, 20000]);
    for (const [scale, qx, qy] of [
      [4, 4, 0],
      [4, 0, -1],
      [3.5, 0, 0],
      [1, 0, 0],
      [4, 0.5, 0],
    ] as const) {
      const out = parentSurfaceHeights(u, v, {
        heights: ancestor,
        scale,
        qx,
        qy,
      });
      expect(Array.from(out).every(Number.isNaN)).toBe(true);
    }
  });
});

describe("TerrainSource picks the ancestor a tile morphs from", () => {
  const heightsOf = (name: string) => ({ name }) as unknown as TerrainHeights;
  const node = (
    parent: Tile | undefined,
    level: number,
    x: number,
    y: number,
    options: {
      heights?: string;
      drawn?: boolean;
      upsampled?: boolean;
    } = {},
  ): Tile =>
    ({
      parent,
      drawnOnce: options.drawn,
      globe: {
        level,
        x,
        y,
        heights: options.heights ? heightsOf(options.heights) : undefined,
        upsampledFrom: options.upsampled ? {} : undefined,
      },
    }) as unknown as Tile;
  const request = (tile: Tile, upsampled = false) => {
    const source = Object.create(TerrainSource.prototype) as {
      flat: boolean;
      wantsMorph: () => boolean;
      morphRequest: (
        t: Tile,
        a: unknown,
        u: boolean,
      ) => {
        morph?: {
          heights: { name: string };
          scale: number;
          qx: number;
          qy: number;
        };
      };
    };
    source.flat = false;
    source.wantsMorph = () => true;
    return source.morphRequest(tile, tile.globe, upsampled);
  };

  it("takes the nearest drawn ancestor, skipping undrawn levels, with the tile's place in it", () => {
    const l3 = node(undefined, 3, 2, 1, { heights: "l3", drawn: true });
    const l4 = node(l3, 4, 5, 3, { heights: "l4" });
    const l5 = node(l4, 5, 10, 7, { heights: "l5" });
    const l6 = node(l5, 6, 21, 15, { heights: "l6" });
    const l7 = node(l6, 7, 43, 30);
    expect(request(l7).morph).toEqual({
      heights: heightsOf("l3"),
      scale: 16,
      qx: 43 - 16 * 2,
      qy: 30 - 16 * 1,
    });
    // Drawn parent: a plain quadrant.
    l6.drawnOnce = true;
    expect(request(l7).morph).toMatchObject({ scale: 2, qx: 1, qy: 0 });
  });

  it("passes over a drawn ancestor that has no heights or is upsampled", () => {
    const l2 = node(undefined, 2, 1, 1, { heights: "l2", drawn: true });
    const l3 = node(l2, 3, 3, 2, { drawn: true }); // heights gone
    const l4 = node(l3, 4, 6, 4, {
      heights: "l4",
      drawn: true,
      upsampled: true,
    });
    const l5 = node(l4, 5, 12, 9);
    expect(request(l5).morph).toMatchObject({
      heights: heightsOf("l2"),
      scale: 8,
    });
  });

  it("falls back to the nearest ancestor with heights when none was drawn, else none", () => {
    const l3 = node(undefined, 3, 2, 1, { heights: "l3" });
    const l4 = node(l3, 4, 5, 3, { heights: "l4" });
    const l5 = node(l4, 5, 10, 7);
    expect(request(l5).morph).toMatchObject({
      heights: heightsOf("l4"),
      scale: 2,
    });
    const bare = node(node(undefined, 1, 0, 0), 2, 0, 0);
    expect(request(bare).morph).toBeUndefined();
    expect(request(l5, true).morph).toBeUndefined();
  });
});

describe("the morph's clock", () => {
  /** A tile with `parent`, drawn in views by `mask`. */
  function tile(
    parent: Tile | undefined,
    options: { morphs?: boolean; mask?: number } = {},
  ): Tile {
    return {
      parent,
      globe: { morphs: options.morphs ?? true },
      placement: { draws: [{ index: 1 }, { index: 2 }] },
      viewMask: options.mask ?? 1,
    } as unknown as Tile;
  }
  function host() {
    const written: Array<[number, number]> = [];
    const set = {
      engine: { scene: { startTime: 1000 } },
      world: {
        setDrawMorph: (draw: { index: number }, seconds: number) =>
          written.push([draw.index, seconds]),
      },
      state: { morphs: new Map<Tile, number>() },
    } as unknown as MorphHost;
    return { set, written };
  }
  const morphing: SelectionView = { id: 0, morph: true } as SelectionView;
  const popping: SelectionView = { id: 0 } as SelectionView;

  it("eases from 0 to 1 over MORPH_SECONDS, as the vertex stage computes it", () => {
    expect(morphFactor(2, 2)).toBe(0);
    expect(morphFactor(2, 2 + MORPH_SECONDS / 2)).toBeCloseTo(0.5, 6);
    expect(morphFactor(2, 2 + MORPH_SECONDS)).toBe(1);
    expect(morphFactor(2, 9)).toBe(1);
    expect(morphFactor(2, 1)).toBe(0);
  });

  it("starts a tile first drawn over a drawn ancestor, and not the first tiles", () => {
    const { set, written } = host();
    const root = tile(undefined);
    startMorphs(set, [morphing], [root], 2000);
    expect(written).toEqual([]); // nothing was drawn before it
    const child = tile(root);
    startMorphs(set, [morphing], [child], 2500);
    // Seconds on the engine's clock: (2500 - 1000) / 1000, both draws.
    expect(written).toEqual([
      [1, 1.5],
      [2, 1.5],
    ]);
    expect(set.state.morphs.get(child)).toBeCloseTo(
      2500 + MORPH_SECONDS * 1000,
    );
    // Drawn again, it doesn't begin again.
    startMorphs(set, [morphing], [child], 2600);
    expect(written).toHaveLength(2);
  });

  it("counts a grandparent's surface too, and skips a tile with no parent heights", () => {
    const { set, written } = host();
    const root = tile(undefined);
    startMorphs(set, [morphing], [root], 2000);
    const middle = tile(root, { morphs: false }); // never drawn
    const leaf = tile(middle);
    startMorphs(set, [morphing], [leaf, middle], 2100);
    expect(written.map((w) => w[0])).toEqual([1, 2]); // the leaf alone
    expect(set.state.morphs.has(middle)).toBe(false);
  });

  it("pop: a view not morphing writes nothing and starts nothing", () => {
    const { set, written } = host();
    const root = tile(undefined);
    startMorphs(set, [popping], [root], 2000);
    const child = tile(root);
    startMorphs(set, [popping], [child], 2100);
    expect(written).toEqual([]);
    expect(set.state.morphs.size).toBe(0);
    // A view that morphs but isn't one the tile is drawn in doesn't either.
    const other = tile(root, { mask: 2 });
    startMorphs(set, [morphing], [other], 2200);
    expect(written).toEqual([]);
  });

  it("ends each morph at its time and clears the draw's word; false once none is left", () => {
    const { set, written } = host();
    const root = tile(undefined);
    startMorphs(set, [morphing], [root], 2000);
    const child = tile(root);
    startMorphs(set, [morphing], [child], 2000);
    written.length = 0;
    expect(endMorphs(set, 2000 + MORPH_SECONDS * 1000 - 1)).toBe(true);
    expect(written).toEqual([]);
    expect(endMorphs(set, 2000 + MORPH_SECONDS * 1000)).toBe(false);
    expect(written).toEqual([
      [1, 0],
      [2, 0],
    ]);
    expect(set.state.morphs.size).toBe(0);
  });
});

describe("the shader's twins", () => {
  const slang = readFileSync(
    new URL("../src/shaders/surface.slang", import.meta.url),
    "utf8",
  );
  it("MORPH_HASH is the TypeScript constant, and the duration comes from the view block", () => {
    expect(slang).toContain(
      `static const uint MORPH_HASH = ${attributeHash(HEIGHT_MORPH_ATTRIBUTE)}u;`,
    );
    // No duration constant of its own: it reads `view.transition.x`.
    expect(slang).not.toMatch(
      /static const float (MORPH|IMAGERY_FADE)_SECONDS/,
    );
    expect(slang).toContain("(view.time.x - r.morph) / max(view.transition.x");
    expect(slang).toContain(
      "(view.time.x - r.imageryFade) / max(view.transition.x",
    );
  });

  it("transitionSeconds: 0.3 s, or 8 frames if longer, at most 1 s", () => {
    expect(transitionSeconds(0)).toBe(MORPH_SECONDS);
    expect(transitionSeconds(Number.NaN)).toBe(MORPH_SECONDS);
    expect(transitionSeconds(16)).toBe(MORPH_SECONDS); // 8 × 16 ms = 0.128 s
    expect(transitionSeconds(100)).toBeCloseTo(0.8, 9);
    expect(transitionSeconds(150)).toBe(MORPH_MAX_SECONDS);
    expect(MORPH_FRAMES).toBe(8);
    // A morph lasts its duration: half way at half of it.
    expect(morphFactor(2, 2.4, 0.8)).toBeCloseTo(0.5, 6);
  });
});

describe("the engine side", () => {
  let engine: Engine;
  let now = 0;
  let queue = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;
  const BASE = "https://tiles.test/morph/";
  const R = 6_378_137;
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
  const triangle = (): GltfAsset => ({
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
  });

  beforeEach(async () => {
    now = 1000;
    queue = new Map();
    nextHandle = 1;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const handle = nextHandle++;
      queue.set(handle, cb);
      return handle;
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      queue.delete(handle);
    });
    engine = await fakeEngine();
  });
  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function frames(n: number): Promise<number> {
    let callbacks = 0;
    for (let i = 0; i < n; i++) {
      now += 1000 / 60;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) {
        callbacks++;
        cb(now);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    return callbacks;
  }

  it("names a morph wake reason", async () => {
    const { TICK_REASONS } = await import("../src/scene/Engine.ts");
    expect(TICK_REASONS).toContain("morph");
  });

  it("a view morphs by default and 'pop' is a setting", () => {
    const view = engine.addView({
      target: new OffscreenTarget(64, 48),
      world: engine.createWorld(),
    });
    expect(view.lodTransitions).toBe("morph");
    view.lodTransitions = "pop";
    expect(view.lodTransitions).toBe("pop");
  });

  it("writes a draw's morph start through the constants seam", () => {
    const world = engine.createWorld({
      maxDraws: 4,
      vertexBytes: 1 << 16,
      indexBytes: 1 << 16,
    });
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    expect(view).toBeDefined();
    const mesh = world.addMesh({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2]),
    } as never);
    const draw = world.addDraw({ mesh });
    const word = () =>
      world.raster.recordsF32[draw.index * RECORD_WORDS + MORPH_WORD]!;
    expect(word()).toBe(0);
    world.setDrawMorph(draw, 1.5);
    expect(word()).toBe(1.5);
    world.setDrawMorph(draw, 0);
    expect(word()).toBe(0);
  });

  it("keeps ticking while a tile morphs, then sleeps", async () => {
    vi.spyOn(engine, "loadGltf").mockResolvedValue(triangle());
    vi.stubGlobal("fetch", async () =>
      Response.json(TILESET, {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const view = engine.addView({
      target: new OffscreenTarget(640, 360),
      world: engine.createWorld(),
      observer: { exposure: { ev100: 15 } },
    });
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -Math.PI / 2, 100);
    const { TICK_REASONS } = await import("../src/scene/Engine.ts");
    engine.start();
    await frames(30);
    const tileset = await engine.addTileset(view.world, `${BASE}tileset.json`);
    await frames(120);
    expect(tileset.stats.loaded).toBe(1);
    expect(queue.size).toBe(0);
    expect(tileset.morphing).toBe(false);
    // A tile begins to morph: the loop runs on, with the reason, for its time.
    const tile = [...tileset.state.masked][0]!;
    tileset.state.morphs.set(tile, now + MORPH_SECONDS * 1000);
    engine.wake();
    let reasons = 0;
    let ticks = 0;
    while (tileset.morphing && ticks < 120) {
      await frames(1);
      reasons |= engine.stats.tickReasons;
      ticks++;
    }
    expect(ticks).toBeGreaterThan(10);
    expect(ticks).toBeLessThan(40);
    expect(reasons & (1 << TICK_REASONS.indexOf("morph"))).not.toBe(0);
    // Done: settled again.
    await frames(5);
    expect(await frames(600)).toBe(0);
    expect(engine.stats.idle).toBe(true);
  });
});
