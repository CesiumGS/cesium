// Translucent terrain (Tileset3D.addTerrainTranslucency, setTerrainOpacity):
// the skirts' marking, the world's region slots with an opacity, the
// tiles' masks and blended material, the queries that keep translucent
// terrain as ground, the shader's opacity and skirt rules, and the CPU
// ray that lets picks stop at it. CPU only (fakeGpu).
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { flatTerrainTile } from "../src/globe/quantizedMesh.ts";
import { compileTerrainClip, packClipShape } from "../src/globe/terrainClip.ts";
import { castTerrainRay } from "../src/globe/terrainRay.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import {
  ALL_VIEWS,
  BATCH_WORD,
  CLIP_BLOCK_ROWS,
  MATERIAL_INDEX_WORD,
  MaterialFlags,
  RECORD_WORDS,
  TERRAIN_CLIP_WORD,
} from "../src/render/layout.ts";
import { createBox } from "../src/scene/meshes.ts";
import type { DrawHandle } from "../src/scene/World.ts";
import type { Globe } from "../src/globe/Globe.ts";
import { fakeEngine } from "./fakeGpu.ts";
import {
  shaderClippedOut,
  shaderOpacity,
  shaderTerrainAlpha,
  type ShaderRegion,
} from "./terrainClipShader.ts";
import { at, gridTile, stripTarget } from "./terrainRayFixtures.ts";

const R = Math.PI / 180;

describe("a terrain tile's skirts", () => {
  const rect = { west: 7.4 * R, south: 46.9 * R, east: 7.5 * R, north: 47 * R };
  const { asset } = flatTerrainTile(rect, 50, 9);
  const mesh = asset.meshes[0]!;
  const start = mesh.skirtStart!;
  const triangles = [...mesh.indices];
  const surface = 8 * 8 * 2;

  it("start after the surface's vertices", () => {
    expect(start).toBe(81);
    expect(mesh.positions.length / 3).toBeGreaterThan(start);
    for (let t = 0; t < surface * 3; t++) {
      expect(triangles[t]!).toBeLessThan(start);
    }
  });

  it("list a skirt vertex first in every skirt triangle (the provoking vertex)", () => {
    const skirts = triangles.length / 3 - surface;
    expect(skirts).toBe(4 * 8 * 2);
    for (let t = surface; t < triangles.length / 3; t++) {
      const [a, b, c] = triangles.slice(3 * t, 3 * t + 3);
      expect(a!).toBeGreaterThanOrEqual(start);
      // And at least one surface vertex: it hangs from the edge.
      expect([b!, c!].some((i) => i < start)).toBe(true);
    }
  });

  it("still face outward (the rotation kept their winding)", () => {
    const p = mesh.positions;
    const v = (i: number) => [p[3 * i]!, p[3 * i + 1]!, p[3 * i + 2]!];
    // The tile's middle, in the mesh's own (centre-relative) coordinates.
    const middle = [0, 0, 0];
    for (let i = 0; i < start; i++) {
      for (let k = 0; k < 3; k++) {
        middle[k] = middle[k]! + v(i)[k]! / start;
      }
    }
    for (let t = surface; t < triangles.length / 3; t++) {
      const [a, b, c] = triangles.slice(3 * t, 3 * t + 3).map(v);
      const u = [0, 1, 2].map((k) => b![k]! - a![k]!);
      const w = [0, 1, 2].map((k) => c![k]! - a![k]!);
      const n = [
        u[1]! * w[2]! - u[2]! * w[1]!,
        u[2]! * w[0]! - u[0]! * w[2]!,
        u[0]! * w[1]! - u[1]! * w[0]!,
      ];
      const out = [0, 1, 2].map(
        (k) => (a![k]! + b![k]! + c![k]!) / 3 - middle[k]!,
      );
      expect(
        n[0]! * out[0]! + n[1]! * out[1]! + n[2]! * out[2]!,
      ).toBeGreaterThan(0);
    }
  });

  it("reach the draw's record", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const { positions, normals, uvs, indices } = mesh;
    const handle = world.addMesh({
      positions,
      normals,
      uvs,
      indices,
      skirtStart: start,
    });
    expect(handle.skirtStart).toBe(start);
    const draw = world.addDraw({ mesh: handle });
    const u = (world as unknown as { recordsU32: Uint32Array }).recordsU32;
    const o = draw.index * RECORD_WORDS;
    const layout = await import("../src/render/generated/layouts.ts");
    expect(u[o + layout.DrawRecordLayout.skirtStart / 4]).toBe(start);
    const box = world.addDraw({ mesh: world.addMesh(createBox()) });
    expect(
      u[box.index * RECORD_WORDS + layout.DrawRecordLayout.skirtStart / 4],
    ).toBe(0xffffffff);
  });
});

describe("the world's region slots with an opacity", () => {
  /** The directory rows the world writes, by slot. */
  const spy = async () => {
    const engine = await fakeEngine();
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
    const clipBuffer = () =>
      (world as unknown as { clipBuffer: GPUBuffer }).clipBuffer;
    const row = (slot: number) => {
      const calls = writes.filter(
        ([buffer, offset]) => buffer === clipBuffer() && offset === slot * 16,
      );
      const data = calls.at(-1)![2];
      return {
        first: new Uint32Array(data.buffer)[0],
        opacity: new Float32Array(data.buffer)[1],
        everywhere: new Uint32Array(data.buffer)[2],
      };
    };
    /** The ground word of a slot's last directory row. */
    const groundWord = (slot: number) =>
      new Uint32Array(
        writes
          .filter(
            ([buffer, offset]) =>
              buffer === clipBuffer() && offset === slot * 16,
          )
          .at(-1)![2].buffer,
      )[3];
    return { world, row, groundWord, restore: () => (device.queue = queue) };
  };
  const rows = (n: number) => new Float32Array(n * CLIP_BLOCK_ROWS * 4);

  it("write a clip's opacity as 0 and a translucent region's as its own", async () => {
    const { world, row, restore } = await spy();
    try {
      const clip = world.addTerrainClipRegion(rows(2));
      expect(row(clip)).toEqual({
        first: CLIP_BLOCK_ROWS,
        opacity: 0,
        everywhere: 0,
      });
      const glass = world.addTerrainClipRegion(rows(1), 0.35);
      expect(row(glass).first).toBe(3 * CLIP_BLOCK_ROWS);
      expect(row(glass).opacity).toBeCloseTo(0.35, 6);
      world.setTerrainClipOpacity(glass, 0.5);
      expect(row(glass).opacity).toBe(0.5);
      expect(world.memory.terrainClipBlocks.used).toBe(3);
    } finally {
      restore();
    }
  });

  it("hold everywhere with no rows, taking no blocks", async () => {
    const { world, row, restore } = await spy();
    try {
      const all = world.addTerrainClipRegion(new Float32Array(0), 0.4);
      expect(row(all).everywhere).toBe(1);
      expect(row(all).opacity).toBeCloseTo(0.4, 6);
      expect(world.memory.terrainClipBlocks.used).toBe(0);
      const clip = world.addTerrainClipRegion(rows(1));
      world.removeTerrainClipRegion(all);
      expect(world.memory.terrainClipBlocks.used).toBe(1);
      world.removeTerrainClipRegion(clip);
      expect(world.memory.terrainClipBlocks.used).toBe(0);
    } finally {
      restore();
    }
  });

  it("wake the views when an opacity changes, the first time and each time after", async () => {
    const { world, restore } = await spy();
    try {
      const glass = world.addTerrainClipRegion(rows(1), 0.4);
      world.changedViews = 0;
      world.setTerrainClipOpacity(glass, 0.6);
      expect(world.changedViews).toBe(ALL_VIEWS);
      // Nothing else marks a record: only the views the world names are
      // redrawn, so a second change would otherwise be lost.
      world.changedViews = 0;
      world.setTerrainClipOpacity(glass, 0.5);
      expect(world.changedViews).toBe(ALL_VIEWS);
      world.changedViews = 0;
      world.setTerrainClipOpacity(glass, 0.5); // no change, no wake
      expect(world.changedViews).toBe(0);
      const all = world.addTerrainClipRegion(new Float32Array(0), 0.4);
      world.changedViews = 0;
      world.setTerrainClipOpacity(all, 0.6);
      expect(world.changedViews).toBe(ALL_VIEWS);
    } finally {
      restore();
    }
  });

  it("write ground in the directory row's w, by default unless the opacity is 0, and wake what depends on a change", async () => {
    const { world, groundWord: word, restore } = await spy();
    try {
      const cut = world.addTerrainClipRegion(rows(1));
      const glass = world.addTerrainClipRegion(rows(1), 0.5);
      const ghost = world.addTerrainClipRegion(rows(1), 0, true);
      expect([word(cut), word(glass), word(ghost)]).toEqual([0, 1, 1]);
      const before = world.contentRevision;
      world.changedViews = 0;
      world.setTerrainClipGround(glass, false);
      expect(word(glass)).toBe(0);
      expect(world.contentRevision).toBeGreaterThan(before);
      expect(world.changedViews).toBe(ALL_VIEWS);
      // No change, no wake.
      world.changedViews = 0;
      world.setTerrainClipGround(glass, false);
      expect(world.changedViews).toBe(0);
    } finally {
      restore();
    }
  });

  it("accept 0 and 1 for any region, everywhere too, and refuse an opacity out of range", async () => {
    const { world, row, restore } = await spy();
    try {
      for (const opacity of [0, 0.5, 1]) {
        expect(() =>
          world.addTerrainClipRegion(rows(1), opacity),
        ).not.toThrow();
        expect(() =>
          world.addTerrainClipRegion(new Float32Array(0), opacity),
        ).not.toThrow();
      }
      for (const opacity of [-0.1, 1.1, Number.NaN, Infinity]) {
        expect(() => world.addTerrainClipRegion(rows(1), opacity)).toThrow(
          RangeError,
        );
        expect(() =>
          world.addTerrainClipRegion(new Float32Array(0), opacity),
        ).toThrow(RangeError);
      }
      // Any opacity moves to any other, through 0 and 1: a cut becomes
      // glass, and glass a cut, in the one directory row.
      const slot = world.addTerrainClipRegion(rows(1));
      for (const opacity of [0.5, 1, 0.25, 0, 1]) {
        world.setTerrainClipOpacity(slot, opacity);
        expect(row(slot).opacity).toBe(opacity);
      }
      expect(() => world.setTerrainClipOpacity(slot, 1.5)).toThrow(RangeError);
    } finally {
      restore();
    }
  });
});

describe("a draw's material, changed in place", () => {
  it("moves it to its new material's batch and into the translucent passes", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const opaque = world.addMaterial({ baseColor: [0.6, 0.6, 0.6, 1] });
    const mesh = world.addMesh(createBox());
    const draw = world.addDraw({ mesh, material: opaque });
    expect(world.translucentRange([0, 0, 10])).toBeUndefined();
    const blended = world.materialWithFlags(opaque, MaterialFlags.alphaBlend);
    expect(blended).not.toBe(opaque);
    // Shared by content: the same twin again, one more reference.
    expect(world.materialWithFlags(opaque, MaterialFlags.alphaBlend)).toBe(
      blended,
    );
    world.removeMaterial(blended);
    world.setDrawMaterial(draw, blended);
    expect(world.drawMaterial(draw)).toBe(blended);
    expect(world.translucentRange([0, 0, 10])).toBeDefined();
    world.setDrawMaterial(draw, opaque);
    expect(world.drawMaterial(draw)).toBe(opaque);
    expect(world.translucentRange([0, 0, 10])).toBeUndefined();
    expect(() => world.setDrawMaterial(draw, 9999)).toThrow(RangeError);
  });
});

describe("setDrawMaterial's batches", () => {
  interface Batch {
    index: number;
    key: string;
    items: number;
    shown: number;
    material: number;
  }
  const internals = (world: unknown) =>
    world as unknown as {
      drawBatches: Array<Batch | undefined>;
      batches: Map<string, Batch>;
      freeBatches: Batch[];
      pointDraws: Map<number, { batch: Batch; params: GPUBuffer }>;
    };

  it("moves a draw's counts to the new batch: items, and shown unless hidden", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const opaque = world.addMaterial({ baseColor: [0.6, 0.6, 0.6, 1] });
    const blended = world.materialWithFlags(opaque, MaterialFlags.alphaBlend);
    const mesh = world.addMesh(createBox());
    const a = world.addDraw({ mesh, material: opaque });
    const b = world.addDraw({ mesh, material: opaque });
    const hidden = world.addDraw({ mesh, material: opaque });
    world.setViewMask(hidden, 0);
    const w = internals(world);
    const first = w.drawBatches[a.index]!;
    expect(w.drawBatches[hidden.index]).toBe(first);
    expect([first.items, first.shown]).toEqual([3, 2]);

    world.setDrawMaterial(a, blended);
    const twin = w.drawBatches[a.index]!;
    expect(twin).not.toBe(first);
    expect(twin.material).toBe(blended);
    expect([first.items, first.shown]).toEqual([2, 1]);
    expect([twin.items, twin.shown]).toEqual([1, 1]);

    // A hidden draw is an item but not shown, in either batch.
    world.setDrawMaterial(hidden, blended);
    expect(w.drawBatches[hidden.index]).toBe(twin);
    expect([first.items, first.shown]).toEqual([1, 1]);
    expect([twin.items, twin.shown]).toEqual([2, 1]);

    // The last draw out frees the old batch for reuse.
    world.setDrawMaterial(b, blended);
    expect([twin.items, twin.shown]).toEqual([3, 2]);
    expect(first.items).toBe(0);
    expect(first.key).toBe("");
    expect(w.batches.has(twin.key)).toBe(true);
    expect([...w.batches.values()]).not.toContain(first);
    expect(w.freeBatches).toContain(first);
    // Its record follows: the batch's index and the material's.
    const u = (world as unknown as { recordsU32: Uint32Array }).recordsU32;
    expect(u[a.index * RECORD_WORDS + BATCH_WORD]).toBe(twin.index);
    expect(world.drawMaterial(b)).toBe(blended);
    // And back.
    world.setDrawMaterial(a, opaque);
    expect(w.drawBatches[a.index]!.material).toBe(opaque);
    expect([twin.items, twin.shown]).toEqual([2, 1]);
  });

  it("moves a draw's view mask change with it: a draw shown later counts in its current batch", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const opaque = world.addMaterial({ baseColor: [0.6, 0.6, 0.6, 1] });
    const blended = world.materialWithFlags(opaque, MaterialFlags.alphaBlend);
    const mesh = world.addMesh(createBox());
    const draw = world.addDraw({ mesh, material: opaque });
    world.setDrawMaterial(draw, blended);
    const w = internals(world);
    const twin = w.drawBatches[draw.index]!;
    world.setViewMask(draw, 0);
    expect(twin.shown).toBe(0);
    world.setViewMask(draw, ALL_VIEWS);
    expect(twin.shown).toBe(1);
    world.removeDraw(draw);
    expect([twin.items, twin.shown]).toEqual([0, 0]);
  });

  it("points a point set's cull at the new batch", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const opaque = world.addMaterial({ baseColor: [1, 1, 1, 1] });
    const blended = world.materialWithFlags(opaque, MaterialFlags.alphaBlend);
    const mesh = world.addPointMesh(4, { stride: 1 });
    const draw = world.addDraw({
      mesh,
      material: opaque,
      billboard: { size: 8 },
    });
    const w = internals(world);
    const params = w.pointDraws.get(draw.index)!.params;
    const writes: Uint32Array[] = [];
    const device = engine.gpu.device as unknown as { queue: GPUQueue };
    const queue = device.queue;
    device.queue = new Proxy(queue, {
      get: (t, key) =>
        key === "writeBuffer"
          ? (buffer: GPUBuffer, _offset: number, data: ArrayBufferView) => {
              if (buffer === params) {
                writes.push(new Uint32Array(data.buffer.slice(0)));
              }
            }
          : (t as unknown as Record<PropertyKey, unknown>)[key],
    });
    try {
      world.setDrawMaterial(draw, blended);
    } finally {
      device.queue = queue;
    }
    const batch = w.drawBatches[draw.index]!;
    expect(w.pointDraws.get(draw.index)!.batch).toBe(batch);
    // pointCull.slang's params: word 3 the record, word 5 the batch.
    expect(writes.at(-1)![3]).toBe(draw.index);
    expect(writes.at(-1)![5]).toBe(batch.index);
  });

  it("changes the material word in the record and nothing else of it", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const opaque = world.addMaterial({ baseColor: [0.6, 0.6, 0.6, 1] });
    const blended = world.materialWithFlags(opaque, MaterialFlags.alphaBlend);
    const mesh = world.addMesh(createBox());
    const draw = world.addDraw({ mesh, material: opaque });
    const u = (world as unknown as { recordsU32: Uint32Array }).recordsU32;
    const o = draw.index * RECORD_WORDS;
    const before = Array.from(u.subarray(o, o + RECORD_WORDS));
    world.setDrawMaterial(draw, blended);
    const after = Array.from(u.subarray(o, o + RECORD_WORDS));
    const changed = after
      .map((v, i) => (v !== before[i] ? i : -1))
      .filter((i) => i >= 0);
    // The batch (slot in the draw arguments) and the material.
    expect(changed.sort()).toEqual([BATCH_WORD, MATERIAL_INDEX_WORD].sort());
    expect(after[MATERIAL_INDEX_WORD]).toBe(blended);
    expect(() => world.removeDraw(draw)).not.toThrow();
    expect(() => world.setDrawMaterial(draw, opaque)).toThrow(/removed/);
  });
});

/** A globe with two loaded tiles: one under the site, one 1° east. */
async function globeWithTiles() {
  const engine = await fakeEngine();
  const world = engine.createWorld();
  const globe = engine.addEllipsoid(world);
  const own = world.addMaterial({ baseColor: [0.62, 0.62, 0.6, 1] });
  const mesh = world.addMesh(createBox());
  const under = world.addDraw({ mesh, material: own });
  const beside = world.addDraw({ mesh, material: own });
  const tile = (west: number, draw: DrawHandle) => ({
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
  const loaded = (globe as unknown as { loaded: Set<unknown> }).loaded;
  const underTile = tile(7.4, under);
  loaded.add(underTile);
  loaded.add(tile(8.4, beside));
  const u = (world as unknown as { recordsU32: Uint32Array }).recordsU32;
  const mask = (draw: DrawHandle) =>
    u[draw.index * RECORD_WORDS + TERRAIN_CLIP_WORD];
  const done = () => {
    loaded.clear();
    engine.removeTileset(globe);
  };
  return { engine, world, globe, own, under, beside, underTile, mask, done };
}

const SITE = {
  rectangle: { west: 7.42, south: 46.92, east: 7.44, north: 46.94 },
};

describe("a globe's regions that blend", () => {
  it("mask the tiles they touch and give those the blended twin, and only those", async () => {
    const { world, globe, own, under, beside, mask, done } =
      await globeWithTiles();
    const glass = globe.terrain.addRegion(SITE, { opacity: 0.35 });
    expect(glass.opacity).toBe(0.35);
    expect(glass.pickThrough).toBe(false);
    expect(mask(under)).toBe(1);
    const twin = world.drawMaterial(under)!;
    expect(twin).not.toBe(own);
    expect(world.drawMaterial(beside)).toBe(own);
    expect(mask(beside)).toBe(0);
    expect(globe.terrain.regions).toEqual([glass]);
    glass.remove();
    expect(globe.terrain.regions).toEqual([]);
    expect(mask(under)).toBe(0);
    expect(world.drawMaterial(under)).toBe(own);
    done();
  });

  it("make the whole globe translucent, and draw as before at 1", async () => {
    const { world, globe, own, under, beside, mask, done } =
      await globeWithTiles();
    const all = globe.terrain.addRegion("everywhere", { opacity: 0.4 });
    expect(all.shape).toBe("everywhere");
    expect(all.opacity).toBe(0.4);
    expect(mask(under)).toBe(1);
    expect(mask(beside)).toBe(1);
    expect(world.drawMaterial(beside)).not.toBe(own);
    all.opacity = 0.6;
    expect(all.opacity).toBe(0.6);
    all.opacity = 1;
    expect(all.opacity).toBe(1);
    expect(mask(beside)).toBe(0);
    expect(world.drawMaterial(beside)).toBe(own);
    expect(world.drawMaterial(under)).toBe(own);
    // It stays in the list, holding no slot, and can come back.
    expect(globe.terrain.regions).toEqual([all]);
    all.opacity = 0.5;
    expect(mask(beside)).toBe(1);
    expect(world.drawMaterial(beside)).not.toBe(own);
    done();
  });

  it("leave a clip's tiles on their own material (clips alone change nothing but the mask)", async () => {
    const { world, globe, own, under, mask, done } = await globeWithTiles();
    globe.terrain.addRegion(SITE);
    expect(mask(under)).toBe(1);
    expect(world.drawMaterial(under)).toBe(own);
    done();
  });

  it("accept an opacity of 0 and of 1, and refuse one outside", async () => {
    const { globe, done } = await globeWithTiles();
    for (const opacity of [0, 0.5, 1]) {
      expect(() => globe.terrain.addRegion(SITE, { opacity })).not.toThrow();
    }
    for (const opacity of [-0.01, 1.01, -1, 2, Number.NaN, Infinity]) {
      expect(() => globe.terrain.addRegion(SITE, { opacity })).toThrow(
        RangeError,
      );
      expect(() => globe.terrain.addRegion("everywhere", { opacity })).toThrow(
        RangeError,
      );
    }
    // Nothing was added by a refusal.
    expect(globe.terrain.regions.map((r) => r.opacity)).toEqual([0, 0.5, 1]);
    done();
  });

  it("are ground for queries, unless they are cuts or say otherwise", async () => {
    const { globe, done } = await globeWithTiles();
    const glass = globe.terrain.addRegion(SITE, { opacity: 0.35 });
    expect(glass.ground).toBe(true);
    expect(globe.terrainClipped(7.43, 46.93)).toBe(false);
    const cut = globe.terrain.addRegion({
      rectangle: { west: 7.425, south: 46.925, east: 7.435, north: 46.935 },
    });
    expect(cut.ground).toBe(false);
    expect(globe.terrainClipped(7.43, 46.93)).toBe(true);
    expect(globe.terrainClipped(7.422, 46.922)).toBe(false);
    glass.ground = false;
    expect(globe.terrainClipped(7.422, 46.922)).toBe(true);
    done();
  });

  it("free their slots and the twin when the globe goes", async () => {
    const { engine, world, globe, own } = await globeWithTiles();
    globe.terrain.addRegion(SITE, { opacity: 0.35 });
    globe.terrain.addRegion("everywhere", { opacity: 0.5 });
    (globe as unknown as { loaded: Set<unknown> }).loaded.clear();
    engine.removeTileset(globe);
    // All 32 slots are free again.
    for (let i = 0; i < 32; i++) {
      world.addTerrainClipRegion(new Float32Array(0), 0.5);
    }
    // The twin's slot is free: the next new material may take it.
    const refs = (world as unknown as { materialReferences: number[] })
      .materialReferences;
    expect(refs[own]).toBe(1);
  });
});

describe("picks on translucent terrain (the CPU ray)", () => {
  // Flat ground 100 m up around the site; the camera 2,000 m over it.
  const rect = {
    west: 7.3 * R,
    south: 46.8 * R,
    east: 7.6 * R,
    north: 47.1 * R,
  };
  const setUp = async () => {
    const t = await globeWithTiles();
    const source = (t.globe as unknown as { source: Record<string, unknown> })
      .source;
    const tile = gridTile(rect, 17, () => 100);
    source.rayTarget = () => stripTarget([{ rectangle: rect, tile }]);
    source.tileOf = (rayTile: unknown) =>
      rayTile === tile ? t.underTile : undefined;
    return t;
  };
  const down = (globe: Globe, lon: number, lat: number) => {
    const origin = at(lon * R, lat * R, 2100);
    const ground = at(lon * R, lat * R, 0);
    // Not unit (2 m long): the distance comes back in its units.
    const direction = [0, 1, 2].map((k) => (ground[k]! - origin[k]!) / 1050);
    return globe.stoppingTerrainHit(origin, direction);
  };

  it("finds the translucent ground under the camera, and its tile's draw", async () => {
    const { globe, under, done } = await setUp();
    expect(down(globe, 7.43, 46.93)).toBeUndefined(); // no region yet
    globe.terrain.addRegion(SITE, { opacity: 0.35 });
    const hit = down(globe, 7.43, 46.93)!;
    expect(hit.distance).toBeCloseTo(1000, 1);
    expect(hit.draw).toBe(under);
    done();
  });

  it("leaves opaque ground to the GPU's pick", async () => {
    const { globe, done } = await setUp();
    globe.terrain.addRegion(SITE, { opacity: 0.35 });
    expect(down(globe, 7.45, 46.93)).toBeUndefined();
    done();
  });

  it("goes through with pickThrough, and through cuts", async () => {
    const { globe, done } = await setUp();
    globe.terrain.addRegion(SITE, { opacity: 0.35, pickThrough: true });
    expect(down(globe, 7.43, 46.93)).toBeUndefined();
    done();
    const second = await setUp();
    second.globe.terrain.addRegion(SITE, { opacity: 0.35 });
    second.globe.terrain.addRegion({
      rectangle: { west: 7.425, south: 46.925, east: 7.435, north: 46.935 },
    });
    // Through the cut's hole the flat ground below is cut too: nothing.
    expect(down(second.globe, 7.43, 46.93)).toBeUndefined();
    second.done();
  });

  it("stops at the whole globe's region unless it lets picks through", async () => {
    const { globe, done } = await setUp();
    const all = globe.terrain.addRegion("everywhere", { opacity: 0.5 });
    expect(down(globe, 7.45, 46.93)?.distance).toBeCloseTo(1000, 1);
    all.pickThrough = true;
    expect(down(globe, 7.45, 46.93)).toBeUndefined();
    // A region that stops picks still does, inside the see-through globe.
    globe.terrain.addRegion(SITE, { opacity: 0.3 });
    expect(down(globe, 7.43, 46.93)?.distance).toBeCloseTo(1000, 1);
    done();
  });

  it("stops at invisible ground (opacity 0, ground true), and not at a cut", async () => {
    const { globe, under, done } = await setUp();
    const invisible = globe.terrain.addRegion(SITE, {
      opacity: 0,
      ground: true,
    });
    const hit = down(globe, 7.43, 46.93)!;
    expect(hit.distance).toBeCloseTo(1000, 1);
    expect(hit.draw).toBe(under);
    invisible.pickThrough = true;
    expect(down(globe, 7.43, 46.93)).toBeUndefined();
    invisible.remove();
    globe.terrain.addRegion(SITE); // a cut: a hole for picks, always
    expect(down(globe, 7.43, 46.93)).toBeUndefined();
    done();
  });

  it("goes through a region that isn't ground, whatever its opacity", async () => {
    const { globe, done } = await setUp();
    globe.terrain.addRegion(SITE, { opacity: 0.35, ground: false });
    expect(down(globe, 7.43, 46.93)).toBeUndefined();
    done();
  });
});

describe("picks from under the ground", () => {
  // Flat ground 100 m up over nine degrees; the camera 30 m under it, in the
  // region.
  const rect = {
    west: 3 * R,
    south: 44 * R,
    east: 12 * R,
    north: 49 * R,
  };
  const lon = 7.43;
  const lat = 46.93;
  /** Meters east and up from the camera, as a point. */
  const offset = (east: number, up: number) =>
    at(lon * R + east / (6_378_137 * Math.cos(lat * R)), lat * R, 70 + up);
  /** The tile, and the rest of the globe not drawn. */
  const target = (tile: ReturnType<typeof gridTile>) =>
    stripTarget([
      { rectangle: rect, tile },
      {
        rectangle: {
          west: -Math.PI,
          south: -Math.PI / 2,
          east: Math.PI,
          north: Math.PI / 2,
        },
      },
    ]);
  const setUp = async () => {
    const t = await globeWithTiles();
    const source = (t.globe as unknown as { source: Record<string, unknown> })
      .source;
    const tile = gridTile(rect, 161, () => 100);
    source.rayTarget = () => target(tile);
    source.tileOf = (rayTile: unknown) =>
      rayTile === tile ? t.underTile : undefined;
    return { ...t, tile };
  };
  const cast = (
    globe: Globe,
    east: number,
    up: number,
  ): { distance: number } | undefined => {
    const origin = offset(0, 0);
    const to = offset(east, up);
    const length = Math.hypot(...[0, 1, 2].map((k) => to[k]! - origin[k]!));
    return globe.stoppingTerrainHit(
      origin,
      [0, 1, 2].map((k) => (to[k]! - origin[k]!) / length),
    );
  };

  /** The ray due east along the tangent plane, level. */
  const level = (globe: Globe) => {
    const east = [-Math.sin(lon * R), Math.cos(lon * R), 0];
    return globe.stoppingTerrainHit(offset(0, 0), east);
  };

  it("castTerrainRay's surface is a crossing, where its hit counts a sample below the surface", async () => {
    const { tile } = await setUp();
    // Level for 200 m: no surface on the ray, though `hit` may find one.
    const flat = castTerrainRay(offset(0, 0), offset(200, 0), target(tile))!;
    expect(flat.surface).toBeUndefined();
    const up = castTerrainRay(offset(0, 0), offset(0, 60), target(tile))!;
    // (the grid's chords sag below the 100 m by up to half a meter)
    expect(Math.abs(up.surface!.t * 60 - 30)).toBeLessThan(1.5);
    // The measured fault: the lower hit is the first sample under the
    // surface, well short of the 30 m to the ground.
    expect(up.hit).toBeDefined();
    expect(up.hit!.t).toBeLessThanOrEqual(up.surface!.t);
  });

  it("stop where the ray crosses the ground above, not near the camera", async () => {
    const { globe, under, done } = await setUp();
    globe.terrain.addRegion(
      { rectangle: { west: 3, south: 44, east: 12, north: 49 } },
      { opacity: 0.4 },
    );
    // Straight up: the ground is 30 m over the camera.
    const straight = cast(globe, 0, 60)!;
    expect(Math.abs(straight.distance - 30)).toBeLessThan(1.5);
    // Up at about 47 degrees: 30 m up needs 28 m along, 41 m of ray.
    const slanted = cast(globe, 28, 30)!;
    expect(Math.abs(slanted.distance - Math.hypot(28, 30))).toBeLessThan(2);
    expect(slanted.distance).toBeGreaterThan(40);
    // Level, east: the ground curves up to the ray's height 20 km away
    // (the horizon's drop), nowhere nearer.
    expect(level(globe)!.distance).toBeGreaterThan(15_000);
    expect(level(globe)!.distance).toBeLessThan(25_000);
    // Down: away from the ground.
    expect(cast(globe, 0, -60)).toBeUndefined();
    void under;
    done();
  });

  it("do the same under the whole globe's region, and a ray looking down stops short of the far side", async () => {
    const { globe, done } = await setUp();
    globe.terrain.addRegion("everywhere", { opacity: 0.5 });
    expect(Math.abs(cast(globe, 0, 60)!.distance - 30)).toBeLessThan(1.5);
    expect(cast(globe, 28, 30)!.distance).toBeGreaterThan(40);
    expect(level(globe)!.distance).toBeGreaterThan(15_000);
    expect(level(globe)!.distance).toBeLessThan(25_000);
    // Looking straight down the stub target would throw at the far side's
    // missing patch: the ray ends under the lowest terrain, on this side.
    expect(() => cast(globe, 0, -60)).not.toThrow();
    expect(cast(globe, 0, -60)).toBeUndefined();
    done();
  });
});

describe("a region's opacity, ground and pickThrough, changed in place", () => {
  it("changes the opacity and pickThrough without a recompile or a material swap", async () => {
    const { world, globe, under, done } = await globeWithTiles();
    const glass = globe.terrain.addRegion(SITE, { opacity: 0.35 });
    const twin = world.drawMaterial(under);
    const add = vi.spyOn(world, "addTerrainClipRegion");
    const swap = vi.spyOn(world, "setDrawMaterial");
    const set = vi.spyOn(world, "setTerrainClipOpacity");
    world.changedViews = 0;
    glass.opacity = 0.6;
    expect(glass.opacity).toBe(0.6);
    expect(glass.pickThrough).toBe(false);
    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0]![1]).toBe(0.6);
    expect(add).not.toHaveBeenCalled();
    expect(swap).not.toHaveBeenCalled();
    expect(world.drawMaterial(under)).toBe(twin);
    // An on-demand loop redraws: the second change, as much as the first.
    expect(world.changedViews).toBe(ALL_VIEWS);
    world.changedViews = 0;
    glass.opacity = 0.8;
    glass.pickThrough = true;
    expect(glass.opacity).toBe(0.8);
    expect(glass.pickThrough).toBe(true);
    expect(world.changedViews).toBe(ALL_VIEWS);
    glass.pickThrough = false;
    expect(glass.opacity).toBe(0.8);
    expect(glass.pickThrough).toBe(false);
    expect(globe.terrain.regions).toEqual([glass]);
    // Removing it still works through the same handle.
    glass.remove();
    expect(globe.terrain.regions).toEqual([]);
    expect(glass.removed).toBe(true);
    done();
  });

  it("refuses an opacity outside 0 to 1 and ignores a removed region", async () => {
    const { globe, done } = await globeWithTiles();
    const glass = globe.terrain.addRegion(SITE, { opacity: 0.35 });
    for (const opacity of [-0.1, 1.1, Number.NaN]) {
      expect(() => {
        glass.opacity = opacity;
      }).toThrow(RangeError);
    }
    expect(glass.opacity).toBe(0.35);
    glass.remove();
    expect(() => {
      glass.opacity = 0.5;
    }).not.toThrow();
    expect(glass.opacity).toBe(0.35);
    done();
  });

  it("changes where picks stop, with pickThrough", async () => {
    const t = await globeWithTiles();
    const source = (t.globe as unknown as { source: Record<string, unknown> })
      .source;
    const rect = {
      west: 7.3 * R,
      south: 46.8 * R,
      east: 7.6 * R,
      north: 47.1 * R,
    };
    const tile = gridTile(rect, 17, () => 100);
    source.rayTarget = () => stripTarget([{ rectangle: rect, tile }]);
    source.tileOf = () => t.underTile;
    const glass = t.globe.terrain.addRegion(SITE, { opacity: 0.35 });
    const origin = at(7.43 * R, 46.93 * R, 2100);
    const ground = at(7.43 * R, 46.93 * R, 0);
    const direction = [0, 1, 2].map((k) => (ground[k]! - origin[k]!) / 2100);
    expect(t.globe.stoppingTerrainHit(origin, direction)).toBeDefined();
    glass.pickThrough = true;
    expect(t.globe.stoppingTerrainHit(origin, direction)).toBeUndefined();
    t.done();
  });

  it("refuses to add a region to a destroyed globe, naming what to do", async () => {
    const { engine, globe } = await globeWithTiles();
    const glass = globe.terrain.addRegion(SITE, { opacity: 0.5 });
    (globe as unknown as { loaded: Set<unknown> }).loaded.clear();
    engine.removeTileset(globe);
    expect(() => globe.terrain.addRegion(SITE)).toThrow(
      /destroyed; add regions to the globe that replaced it/,
    );
    // Its regions went with it.
    expect(glass.removed).toBe(true);
    expect(globe.terrain.regions).toEqual([]);
  });

  it("wakes the views for the whole globe's opacity, the second change as much as the first", async () => {
    const { world, globe, done } = await globeWithTiles();
    const all = globe.terrain.addRegion("everywhere", { opacity: 0.4 });
    world.changedViews = 0;
    all.opacity = 0.6;
    expect(world.changedViews).toBe(ALL_VIEWS);
    world.changedViews = 0;
    all.opacity = 0.7;
    expect(world.changedViews).toBe(ALL_VIEWS);
    done();
  });
});

describe("the shader's opacity rules (surface.slang terrainOpacity and terrainAlpha, in float32)", () => {
  const wgs84 = Ellipsoid.WGS84;
  const camera = at(7.43 * R, 46.93 * R, 2100);
  const point = (lon: number, lat: number) => at(lon * R, lat * R, 100);
  const region = (
    rectangle: { west: number; south: number; east: number; north: number },
    opacity: number,
  ): ShaderRegion => ({
    opacity,
    rows: packClipShape(compileTerrainClip({ rectangle }, wgs84)),
  });
  const A = region({ west: 7.42, south: 46.92, east: 7.44, north: 46.94 }, 0.5);
  const B = region({ west: 7.43, south: 46.93, east: 7.45, north: 46.95 }, 0.3);
  const clip = region(
    { west: 7.435, south: 46.925, east: 7.437, north: 46.927 },
    0,
  );
  const globeWide: ShaderRegion = { opacity: 0.8, everywhere: true };
  const inA = point(7.425, 46.93);
  const inBoth = point(7.435, 46.935);
  const inClip = point(7.436, 46.926);
  const nowhere = point(7.5, 46.99);
  const o = (
    regions: ShaderRegion[],
    mask: number,
    p: Float64Array,
    clipsOnly = false,
  ) => shaderOpacity(regions, mask, camera, p, clipsOnly);

  it("is 1 with no mask or where no region of the mask holds the point", () => {
    expect(o([A, B], 0, inA)).toBe(1);
    expect(o([A, B], 0b11, nowhere)).toBe(1);
    // A region outside the mask is not tested.
    expect(o([A, B], 0b10, inA)).toBe(1);
  });

  it("takes the least opacity where regions overlap, in either slot order", () => {
    expect(o([A], 1, inA)).toBeCloseTo(0.5, 6);
    expect(o([A, B], 0b11, inBoth)).toBeCloseTo(0.3, 6);
    expect(o([B, A], 0b11, inBoth)).toBeCloseTo(0.3, 6);
    // The whole globe's 0.8 doesn't raise a region's 0.5, and fills the rest.
    expect(o([A, globeWide], 0b11, inA)).toBeCloseTo(0.5, 6);
    expect(o([globeWide, A], 0b11, inA)).toBeCloseTo(0.5, 6);
    expect(o([A, globeWide], 0b11, nowhere)).toBeCloseTo(0.8, 6);
    expect(o([A, globeWide], 0b01, nowhere)).toBe(1);
  });

  it("lets a clip win over every opacity, wherever its slot is", () => {
    expect(o([A, B, clip], 0b111, inClip)).toBe(0);
    expect(o([clip, A, B, globeWide], 0b1111, inClip)).toBe(0);
    expect(o([globeWide, B, A, clip], 0b1111, inClip)).toBe(0);
    // Outside the clip the translucent regions still apply.
    expect(o([A, B, clip], 0b111, inA)).toBeCloseTo(0.5, 6);
  });

  it("sees clips only when asked (height captures, the shadows' cut-out test)", () => {
    expect(o([A, B, clip], 0b111, inBoth, true)).toBe(1);
    expect(o([A, globeWide, clip], 0b111, inA, true)).toBe(1);
    expect(o([A, B, clip], 0b111, inClip, true)).toBe(0);
  });

  it("honours `ground` in height captures, whatever the opacity: all four combinations", () => {
    const at = (opacity: number, ground: boolean): ShaderRegion => ({
      ...A,
      opacity,
      ground,
    });
    const cases: Array<[number, boolean]> = [
      [0, false], // a cut: not drawn, not ground
      [0, true], // invisible ground: not drawn, ground
      [0.5, false], // glass that isn't ground
      [0.5, true], // glass that is
    ];
    for (const [opacity, ground] of cases) {
      const r = [at(opacity, ground)];
      const label = `opacity ${opacity}, ground ${ground}`;
      // Drawn passes: by opacity. Left out only at 0.
      expect(shaderClippedOut(r, 1, camera, inA), label).toBe(opacity === 0);
      expect(shaderOpacity(r, 1, camera, inA, false), label).toBeCloseTo(
        opacity,
        6,
      );
      // Height captures: by ground. Left out only where it isn't ground.
      expect(shaderClippedOut(r, 1, camera, inA, false), label).toBe(!ground);
      expect(
        shaderTerrainAlpha(r, 1, camera, inA, { terrainSeen: false }),
        label,
      ).toBe(ground ? 1 : 0);
      // Outside the region nothing is left out.
      expect(shaderClippedOut(r, 1, camera, nowhere, false), label).toBe(false);
    }
    // Overlapping: any hole wins in a capture, over ground that is not.
    expect(
      shaderClippedOut(
        [at(0.5, true), at(0.5, false)],
        0b11,
        camera,
        inA,
        false,
      ),
    ).toBe(true);
    // The whole globe, ground or not.
    const all = (ground: boolean): ShaderRegion => ({
      opacity: 0.5,
      ground,
      everywhere: true,
    });
    expect(shaderClippedOut([all(false)], 1, camera, nowhere, false)).toBe(
      true,
    );
    expect(shaderClippedOut([all(true)], 1, camera, nowhere, false)).toBe(
      false,
    );
  });

  it("hides skirts wherever the terrain is less than opaque, and not where it draws opaque", () => {
    const alpha = (
      regions: ShaderRegion[],
      mask: number,
      p: Float64Array,
      skirt: boolean,
      terrainSeen = true,
    ) => shaderTerrainAlpha(regions, mask, camera, p, { skirt, terrainSeen });
    expect(alpha([A], 1, inA, false)).toBeCloseTo(0.5, 6);
    expect(alpha([A], 1, inA, true)).toBe(0);
    // Outside the region its skirts draw as ever.
    expect(alpha([A], 1, nowhere, true)).toBe(1);
    // A tile with no mask draws as it always did.
    expect(alpha([A], 0, inA, true)).toBe(1);
    // Near 1 the surface is opaque (OPAQUE_ALPHA, 0.999): its skirts stay.
    const nearly: ShaderRegion = { opacity: 0.9995, everywhere: true };
    expect(alpha([nearly], 1, inA, true)).toBeCloseTo(0.9995, 6);
    const lower: ShaderRegion = { opacity: 0.998, everywhere: true };
    expect(alpha([lower], 1, inA, true)).toBe(0);
    // A height capture sees clips only: the ground stays ground, with its
    // skirts, and a clip is a hole.
    expect(alpha([A], 1, inA, true, false)).toBe(1);
    expect(alpha([A, clip], 0b11, inClip, false, false)).toBe(0);
  });

  it("shares the edge budget across regions, as the shader does", () => {
    // Regions of the mask are tested lowest slot first, each taking its
    // cell's edges from the 128 a fragment may test; none left, none tested.
    // A rectangle's cell holds at most 4 edges, far under the budget.
    expect(o([A, B, clip], 0b111, inBoth)).toBeCloseTo(0.3, 6);
  });
});

describe("the shader's translucency", () => {
  const slang = readFileSync(
    new URL("../src/shaders/surface.slang", import.meta.url),
    "utf8",
  );
  const wgsl = readFileSync(
    new URL("../src/shaders/generated/surface.wgsl", import.meta.url),
    "utf8",
  );
  const body = (code: string, name: string) => {
    const start = code.indexOf(name);
    expect(start, name).toBeGreaterThanOrEqual(0);
    return code.slice(start, code.indexOf("\n}\n", start));
  };

  it("marks skirt vertices in ids.z's top bit and masks it from the instance", () => {
    expect(slang).toMatch(/static const uint SKIRT_BIT = 0x80000000u;/);
    expect(slang).toMatch(
      /out\.ids\.z = instance \| \(vertexIndex >= r\.skirtStart \? SKIRT_BIT : 0u\);/,
    );
    expect(slang).toMatch(/f\.instanceIndex = in\.ids\.z & ~SKIRT_BIT;/);
  });

  it("takes the least opacity, skips regions that can't lower it, and stops at a clip", () => {
    const f = body(slang, "float terrainOpacity(");
    expect(f).toMatch(
      /if \(alpha >= opacity \|\| \(which == REGIONS_CUTS && alpha > 0\.0\)\)/,
    );
    // Height captures read `ground` from the directory row's w.
    expect(f).toMatch(
      /which == REGIONS_HOLES\) \{\s+if \(entry\.w != 0u\) \{\s+continue; \/\/ ground/,
    );
    expect(body(slang, "bool clippedOut(")).toMatch(
      /terrainSeen \? REGIONS_CUTS : REGIONS_HOLES/,
    );
    expect(f).toMatch(
      /opacity = alpha;\s+if \(opacity <= 0\.0\) \{\s+return 0\.0;/,
    );
    expect(f).toMatch(
      /if \(entry\.z != 0u\) \{\s+opacity = alpha; \/\/ everywhere/,
    );
  });

  it("hides skirts wherever the terrain is less than opaque", () => {
    const f = body(slang, "float terrainAlpha(");
    expect(f).toMatch(
      /if \(opacity < OPAQUE_ALPHA && \(in\.ids\.z & SKIRT_BIT\) != 0u\) \{\s+return 0\.0;/,
    );
    // Holes only (what isn't ground) where the pass doesn't see opacity.
    expect(f).toMatch(
      /terrainOpacity\(\s*r\.terrainClip,\s*in\.relPosition,\s*terrainSeen \? REGIONS_SEEN : REGIONS_HOLES,?\s*\)/,
    );
  });

  it("multiplies the alpha in every pass that reads it, and height captures keep it ground", () => {
    expect(body(slang, "float materialAlpha(")).toMatch(
      /return custom\.alpha \* terrainAlpha\(r, in\);/,
    );
    expect(slang).toMatch(
      /baseColor = float4\(custom\.baseColor, custom\.alpha \* terrain\);/,
    );
    expect(body(slang, "void heightFs(")).toMatch(
      /terrainSeen = false;\s+cutOut\(in\);/,
    );
    expect(wgsl).toMatch(/fn heightFs\(/);
    const pipelines = readFileSync(
      new URL("../src/scene/RenderContext.ts", import.meta.url),
      "utf8",
    );
    expect(pipelines).toMatch(/\? bias\s+\? "shadowFs"\s+: "heightFs"/);
  });
});
