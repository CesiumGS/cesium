// Translucent terrain (Tileset3D.addTerrainTranslucency, setTerrainOpacity):
// the skirts' marking, the world's region slots with an opacity, the
// tiles' masks and blended material, the queries that keep translucent
// terrain as ground, the shader's opacity and skirt rules, and the CPU
// ray that lets picks stop at it. CPU only (fakeGpu).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { flatTerrainTile } from "../src/globe/quantizedMesh.ts";
import { TerrainClipError } from "../src/globe/terrainClip.ts";
import {
  CLIP_BLOCK_ROWS,
  MaterialFlags,
  RECORD_WORDS,
  TERRAIN_CLIP_WORD,
} from "../src/render/layout.ts";
import { createBox } from "../src/scene/meshes.ts";
import type { DrawHandle } from "../src/scene/World.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { fakeEngine } from "./fakeGpu.ts";
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
    return { world, row, restore: () => (device.queue = queue) };
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

  it("refuse an opacity out of range, a clip everywhere, and a change of kind", async () => {
    const { world, restore } = await spy();
    try {
      expect(() => world.addTerrainClipRegion(rows(1), 1)).toThrow(RangeError);
      expect(() => world.addTerrainClipRegion(rows(1), -0.1)).toThrow(
        RangeError,
      );
      expect(() => world.addTerrainClipRegion(rows(1), Number.NaN)).toThrow(
        RangeError,
      );
      expect(() => world.addTerrainClipRegion(new Float32Array(0))).toThrow(
        RangeError,
      );
      const clip = world.addTerrainClipRegion(rows(1));
      expect(() => world.setTerrainClipOpacity(clip, 0.5)).toThrow(
        TerrainClipError,
      );
      const glass = world.addTerrainClipRegion(rows(1), 0.5);
      expect(() => world.setTerrainClipOpacity(glass, 0)).toThrow(
        TerrainClipError,
      );
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

describe("a globe's translucent regions", () => {
  it("mask the tiles they touch and give those the blended twin, and only those", async () => {
    const { world, globe, own, under, beside, mask, done } =
      await globeWithTiles();
    const glass = globe.addTerrainTranslucency(SITE, { opacity: 0.35 });
    expect(glass.opacity).toBe(0.35);
    expect(glass.pickThrough).toBe(false);
    expect(mask(under)).toBe(1);
    const twin = world.drawMaterial(under)!;
    expect(twin).not.toBe(own);
    expect(world.drawMaterial(beside)).toBe(own);
    expect(mask(beside)).toBe(0);
    expect(globe.terrainTranslucencies).toEqual([glass]);
    expect(globe.terrainClips).toEqual([]);
    globe.removeTerrainTranslucency(glass);
    expect(mask(under)).toBe(0);
    expect(world.drawMaterial(under)).toBe(own);
    done();
  });

  it("make the whole globe translucent, and opaque again at 1", async () => {
    const { world, globe, own, under, beside, mask, done } =
      await globeWithTiles();
    expect(globe.terrainOpacity).toBe(1);
    globe.setTerrainOpacity(0.4);
    expect(globe.terrainOpacity).toBe(0.4);
    expect(mask(under)).toBe(1);
    expect(mask(beside)).toBe(1);
    expect(world.drawMaterial(beside)).not.toBe(own);
    globe.setTerrainOpacity(0.6);
    expect(globe.terrainOpacity).toBe(0.6);
    globe.setTerrainOpacity(1);
    expect(mask(beside)).toBe(0);
    expect(world.drawMaterial(beside)).toBe(own);
    expect(world.drawMaterial(under)).toBe(own);
    expect(() => globe.setTerrainOpacity(0)).toThrow(RangeError);
    done();
  });

  it("leave a clip's tiles on their own material (clips alone change nothing but the mask)", async () => {
    const { world, globe, own, under, mask, done } = await globeWithTiles();
    globe.addTerrainClip(SITE);
    expect(mask(under)).toBe(1);
    expect(world.drawMaterial(under)).toBe(own);
    done();
  });

  it("refuse an opacity outside (0, 1)", async () => {
    const { globe, done } = await globeWithTiles();
    for (const opacity of [0, 1, -1, Number.NaN]) {
      expect(() => globe.addTerrainTranslucency(SITE, { opacity })).toThrow(
        RangeError,
      );
    }
    done();
  });

  it("are ground for queries: only clips are holes", async () => {
    const { globe, done } = await globeWithTiles();
    globe.addTerrainTranslucency(SITE, { opacity: 0.35 });
    expect(globe.terrainClipped(7.43, 46.93)).toBe(false);
    globe.addTerrainClip({
      rectangle: { west: 7.425, south: 46.925, east: 7.435, north: 46.935 },
    });
    expect(globe.terrainClipped(7.43, 46.93)).toBe(true);
    expect(globe.terrainClipped(7.422, 46.922)).toBe(false);
    done();
  });

  it("free their slots and the twin when the globe goes", async () => {
    const { engine, world, globe, own } = await globeWithTiles();
    globe.addTerrainTranslucency(SITE, { opacity: 0.35 });
    globe.setTerrainOpacity(0.5);
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
  const down = (globe: Tileset3D, lon: number, lat: number) => {
    const origin = at(lon * R, lat * R, 2100);
    const ground = at(lon * R, lat * R, 0);
    // Not unit (2 m long): the distance comes back in its units.
    const direction = [0, 1, 2].map((k) => (ground[k]! - origin[k]!) / 1050);
    return globe.translucentTerrainHit(origin, direction);
  };

  it("finds the translucent ground under the camera, and its tile's draw", async () => {
    const { globe, under, done } = await setUp();
    expect(down(globe, 7.43, 46.93)).toBeUndefined(); // no translucency yet
    globe.addTerrainTranslucency(SITE, { opacity: 0.35 });
    const hit = down(globe, 7.43, 46.93)!;
    expect(hit.distance).toBeCloseTo(1000, 1);
    expect(hit.draw).toBe(under);
    done();
  });

  it("leaves opaque ground to the GPU's pick", async () => {
    const { globe, done } = await setUp();
    globe.addTerrainTranslucency(SITE, { opacity: 0.35 });
    expect(down(globe, 7.45, 46.93)).toBeUndefined();
    done();
  });

  it("goes through with pickThrough, and through clips", async () => {
    const { globe, done } = await setUp();
    globe.addTerrainTranslucency(SITE, { opacity: 0.35, pickThrough: true });
    expect(down(globe, 7.43, 46.93)).toBeUndefined();
    done();
    const second = await setUp();
    second.globe.addTerrainTranslucency(SITE, { opacity: 0.35 });
    second.globe.addTerrainClip({
      rectangle: { west: 7.425, south: 46.925, east: 7.435, north: 46.935 },
    });
    // Through the clip's hole the flat ground below is clipped too: nothing.
    expect(down(second.globe, 7.43, 46.93)).toBeUndefined();
    second.done();
  });

  it("stops at the whole globe's translucency unless it lets picks through", async () => {
    const { globe, done } = await setUp();
    globe.setTerrainOpacity(0.5);
    expect(down(globe, 7.45, 46.93)?.distance).toBeCloseTo(1000, 1);
    globe.setTerrainOpacity(0.5, { pickThrough: true });
    expect(down(globe, 7.45, 46.93)).toBeUndefined();
    // A region that stops picks still does, inside the see-through globe.
    globe.addTerrainTranslucency(SITE, { opacity: 0.3 });
    expect(down(globe, 7.43, 46.93)?.distance).toBeCloseTo(1000, 1);
    done();
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
      /if \(alpha >= opacity \|\| \(clipsOnly && alpha > 0\.0\)\)/,
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
      /if \(opacity < 1\.0 && \(in\.ids\.z & SKIRT_BIT\) != 0u\) \{\s+return 0\.0;/,
    );
    // Clips only (no translucency) where the pass doesn't see it.
    expect(f).toMatch(
      /terrainOpacity\(r\.terrainClip, in\.relPosition, !terrainSeen\)/,
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
