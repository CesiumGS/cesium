// A globe's terrain regions (Globe.terrain.addRegion): the one region type
// with an opacity from 0 to 1, `ground` and `pickThrough`. What is tested
// here is the API's behaviour as a whole: the types, the defaults, a sweep
// of the opacity through 0 and through 1 (no recompile, no material churn),
// `ground` through a fade, invisible ground, a cut's queries, overlapping
// regions and "everywhere". CPU only (fakeGpu); the shader's opacity rules
// are in test/terrainTranslucency.test.ts.
import { describe, expect, it, vi } from "vitest";
import type { Globe } from "../src/globe/Globe.ts";
import { TerrainRegionError } from "../src/globe/terrainClip.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { RECORD_WORDS, TERRAIN_CLIP_WORD } from "../src/render/layout.ts";
import { createBox } from "../src/scene/meshes.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { fakeEngine } from "./fakeGpu.ts";

// Counts every polygon compile the globe makes.
const compiles = vi.hoisted(() => ({ count: 0 }));
vi.mock("../src/globe/terrainClip.ts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/globe/terrainClip.ts")>();
  return {
    ...actual,
    compileTerrainClip: (
      ...args: Parameters<typeof actual.compileTerrainClip>
    ) => {
      compiles.count++;
      return actual.compileTerrainClip(...args);
    },
  };
});

const R = Math.PI / 180;

const SITE = {
  rectangle: { west: 7.42, south: 46.92, east: 7.44, north: 46.94 },
};
/** Inside SITE, and a point outside it. */
const IN = { longitude: 7.43, latitude: 46.93 };
const OUT = { longitude: 7.6, latitude: 46.93 };

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
  loaded.add(tile(7.4, under));
  loaded.add(tile(8.4, beside));
  const u = world.raster.recordsU32;
  const mask = (draw: DrawHandle) =>
    u[draw.index * RECORD_WORDS + TERRAIN_CLIP_WORD];
  const done = () => {
    loaded.clear();
    engine.removeTileset(globe);
  };
  return { engine, world, globe, own, under, beside, mask, done };
}

/** What the globe answers at a point, as clamping, rays and heights ask. */
function asks(globe: Globe, p: { longitude: number; latitude: number }) {
  const point = Ellipsoid.WGS84.cartographicToCartesian(
    { longitude: p.longitude * R, latitude: p.latitude * R, height: 0 },
    new Float64Array(3),
  );
  const target = globe.terrainRayTarget();
  return {
    hole: globe.terrainClipped(p.longitude, p.latitude),
    height: globe.exactHeight(p.longitude * R, p.latitude * R),
    sample: globe.sampleHeight(p.longitude * R, p.latitude * R),
    rayClipped: target?.clipped?.(point),
  };
}

describe("the region API's types", () => {
  it("gives `terrain` to a globe and not to a plain tileset", async () => {
    const { globe, done } = await globeWithTiles();
    expect(globe.terrain.regions).toEqual([]);
    // A plain tileset has no `terrain`: a compile error, and absent.
    const plain = (t: Tileset3D) => {
      // @ts-expect-error `terrain` is on Globe, not on Tileset3D.
      return t.terrain;
    };
    expect(plain).toBeTypeOf("function");
    const base = Object.getPrototypeOf(Object.getPrototypeOf(globe));
    expect("terrain" in base).toBe(false);
    done();
  });

  it("names the shape, and defaults a bare region to a cut", async () => {
    const { globe, done } = await globeWithTiles();
    const hole = globe.terrain.addRegion(SITE);
    expect(hole.shape).toEqual(SITE);
    expect(hole.opacity).toBe(0);
    expect(hole.ground).toBe(false);
    expect(hole.pickThrough).toBe(false);
    const glass = globe.terrain.addRegion(SITE, {
      opacity: 0.4,
      pickThrough: true,
    });
    expect(glass.ground).toBe(true);
    expect(glass.pickThrough).toBe(true);
    const all = globe.terrain.addRegion("everywhere", { opacity: 0.5 });
    expect(all.shape).toBe("everywhere");
    expect(globe.terrain.regions).toEqual([hole, glass, all]); // oldest first
    glass.remove();
    expect(globe.terrain.regions).toEqual([hole, all]);
    done();
  });

  it("refuses a shape it doesn't know", async () => {
    const { globe, done } = await globeWithTiles();
    expect(() =>
      globe.terrain.addRegion("nowhere" as unknown as "everywhere"),
    ).toThrow(TerrainRegionError);
    done();
  });
});

describe("a sweep of the opacity through 0 and through 1", () => {
  it("compiles the polygon once, swaps materials only at 0 and 1, and never throws", async () => {
    const { world, globe, own, under, beside, mask, done } =
      await globeWithTiles();
    const region = globe.terrain.addRegion(SITE, { opacity: 0 });
    // Its shape compiled once, here; nothing after may add to it.
    const compiled = compiles.count;
    expect(compiled).toBeGreaterThan(0); // the counter sees compiles
    const add = vi.spyOn(world, "addTerrainClipRegion");
    const swap = vi.spyOn(world, "setDrawMaterial");
    const ground = region.ground;
    const materials = new Set<number | undefined>();
    const steps = 1000;
    const sweep = (values: number[]) => {
      for (const v of values) {
        expect(() => {
          region.opacity = v;
        }).not.toThrow();
        expect(region.opacity).toBe(v);
        // `ground` is the region's, not the opacity's.
        expect(region.ground).toBe(ground);
        materials.add(world.drawMaterial(under));
        // Only the tile under it ever tests it; the one beside never does.
        expect(mask(beside)).toBe(0);
        expect(world.drawMaterial(beside)).toBe(own);
        // 0: the opaque path (its own material); between: blended; 1: out.
        if (v === 0) {
          expect(mask(under)).toBe(1);
          expect(world.drawMaterial(under)).toBe(own);
        } else if (v < 1) {
          expect(mask(under)).toBe(1);
          expect(world.drawMaterial(under)).not.toBe(own);
        } else {
          expect(mask(under)).toBe(0);
          expect(world.drawMaterial(under)).toBe(own);
        }
      }
    };
    const up = Array.from({ length: steps + 1 }, (_, i) => i / steps);
    sweep(up); // through 0 (start) to 1
    sweep([...up].reverse()); // and back through 1 to 0
    sweep(up);
    expect(compiles.count).toBe(compiled);
    expect(add).not.toHaveBeenCalled();
    // The tile's material changed at the crossings only: 0 to above 0 and
    // 1 to below, and back, over two and a half sweeps.
    expect(swap.mock.calls.length).toBe(6);
    expect(materials.size).toBe(2); // its own, and one blended twin
    expect(region.ground).toBe(ground);
    done();
  });

  it("costs an idle region at 1 only its slot: no tile tests it", async () => {
    const { world, globe, own, under, mask, done } = await globeWithTiles();
    const region = globe.terrain.addRegion(SITE, { opacity: 1 });
    expect(mask(under)).toBe(0);
    expect(world.drawMaterial(under)).toBe(own);
    // A region at 1 is ground, and a hole for nothing, drawn nothing.
    expect(asks(globe, IN).hole).toBe(false);
    region.opacity = 0.99;
    expect(mask(under)).toBe(1);
    expect(world.drawMaterial(under)).not.toBe(own);
    region.opacity = 1;
    expect(mask(under)).toBe(0);
    expect(world.drawMaterial(under)).toBe(own);
    done();
  });

  it("accepts exactly 0 and 1 and refuses outside them, at add and at set", async () => {
    const { globe, done } = await globeWithTiles();
    for (const opacity of [0, 1]) {
      expect(() => globe.terrain.addRegion(SITE, { opacity })).not.toThrow();
    }
    const region = globe.terrain.addRegion(SITE, { opacity: 0.5 });
    for (const opacity of [
      -Number.EPSILON,
      1 + Number.EPSILON,
      -1,
      2,
      Number.NaN,
    ]) {
      expect(() => globe.terrain.addRegion(SITE, { opacity })).toThrow(
        RangeError,
      );
      expect(() => {
        region.opacity = opacity;
      }).toThrow(RangeError);
    }
    expect(region.opacity).toBe(0.5);
    region.opacity = 0;
    region.opacity = 1;
    expect(region.opacity).toBe(1);
    done();
  });
});

describe("ground", () => {
  it("is fixed by the opacity at add, and no later opacity changes it", async () => {
    const { globe, done } = await globeWithTiles();
    const cut = globe.terrain.addRegion(SITE);
    const glass = globe.terrain.addRegion(SITE, { opacity: 0.3 });
    for (const v of [0.2, 0.9, 1, 0.5, 0, 0.7]) {
      cut.opacity = v;
      glass.opacity = v;
      expect(cut.ground).toBe(false);
      expect(glass.ground).toBe(true);
    }
    // Said outright, it holds either way round.
    const ghost = globe.terrain.addRegion(SITE, { opacity: 0, ground: true });
    const hollow = globe.terrain.addRegion(SITE, {
      opacity: 0.6,
      ground: false,
    });
    expect(ghost.ground).toBe(true);
    expect(hollow.ground).toBe(false);
    for (const v of [1, 0, 0.5]) {
      ghost.opacity = v;
      hollow.opacity = v;
      expect(ghost.ground).toBe(true);
      expect(hollow.ground).toBe(false);
    }
    done();
  });

  it("can be set, telling height listeners where ground changed", async () => {
    const { globe, done } = await globeWithTiles();
    const listener = vi.fn();
    (
      globe as unknown as {
        source: { heightListeners: Set<(r: unknown) => void> };
      }
    ).source.heightListeners.add(listener);
    const glass = globe.terrain.addRegion(SITE, { opacity: 0.5 });
    expect(listener).not.toHaveBeenCalled(); // ground: nothing changed
    glass.ground = false;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(asks(globe, IN).hole).toBe(true);
    glass.ground = false; // no change, no call
    expect(listener).toHaveBeenCalledTimes(1);
    glass.ground = true;
    expect(listener).toHaveBeenCalledTimes(2);
    expect(asks(globe, IN).hole).toBe(false);
    done();
  });

  it("makes invisible ground: not drawn, and still ground for every query", async () => {
    const { globe, mask, under, world, own, done } = await globeWithTiles();
    const region = globe.terrain.addRegion(SITE, { opacity: 0, ground: true });
    // Drawn as a cut (the opaque path discards inside it)...
    expect(mask(under)).toBe(1);
    expect(world.drawMaterial(under)).toBe(own);
    // ...but ground: heights, rays and clamping see the terrain there.
    const inside = asks(globe, IN);
    expect(inside.hole).toBe(false);
    expect(inside.height).toBe(0);
    expect(inside.sample).toBe(0);
    expect(inside.rayClipped).toBe(false);
    // A cut at the same place is a hole for all of them.
    region.remove();
    globe.terrain.addRegion(SITE);
    const cut = asks(globe, IN);
    expect(cut.hole).toBe(true);
    expect(cut.height).toBeUndefined();
    expect(cut.sample).toBeUndefined();
    expect(cut.rayClipped).toBe(true);
    done();
  });
});

describe("a cut's queries", () => {
  it("match the clip they replace: a hole for heights, rays and clamping, ground outside", async () => {
    const { globe, done } = await globeWithTiles();
    const hole = globe.terrain.addRegion(SITE, { opacity: 0 });
    const bare = asks(globe, IN);
    expect(bare).toEqual({
      hole: true,
      height: undefined,
      sample: undefined,
      rayClipped: true,
    });
    expect(asks(globe, OUT)).toEqual({
      hole: false,
      height: 0,
      sample: 0,
      rayClipped: false,
    });
    // Glass over the same place isn't one, and a glass that isn't ground is.
    hole.opacity = 0.4;
    expect(asks(globe, IN)).toEqual({
      hole: true,
      height: undefined,
      sample: undefined,
      rayClipped: true,
    }); // ground stayed false
    hole.remove();
    expect(asks(globe, IN).hole).toBe(false);
    done();
  });

  it("treats a glass that isn't ground as a hole at any opacity, even 1", async () => {
    const { globe, done } = await globeWithTiles();
    const glass = globe.terrain.addRegion(SITE, {
      opacity: 0.4,
      ground: false,
    });
    for (const v of [0.4, 0, 1]) {
      glass.opacity = v;
      expect(asks(globe, IN).hole).toBe(true);
    }
    done();
  });
});

describe("overlapping regions", () => {
  it("test every one a tile touches, and the least opacity wins on screen", async () => {
    const { world, globe, own, under, mask, done } = await globeWithTiles();
    const a = globe.terrain.addRegion(SITE, { opacity: 0.6 });
    const b = globe.terrain.addRegion(
      { rectangle: { west: 7.43, south: 46.93, east: 7.45, north: 46.95 } },
      { opacity: 0.2 },
    );
    expect(mask(under)).toBe(0b11);
    expect(world.drawMaterial(under)).not.toBe(own);
    // The least opacity is the shader's rule (surface.slang terrainOpacity);
    // here, the directory holds each region's own opacity.
    const regions = world.scene.terrainClipRuns;
    expect(regions.map((r) => r!.opacity)).toEqual([0.6, 0.2]);
    b.opacity = 1;
    expect(mask(under)).toBe(0b01);
    a.opacity = 1;
    expect(mask(under)).toBe(0);
    expect(world.drawMaterial(under)).toBe(own);
    done();
  });

  it("make the overlap a hole when any region there isn't ground, and ground again once it is gone", async () => {
    const { globe, done } = await globeWithTiles();
    const glass = globe.terrain.addRegion(SITE, { opacity: 0.5 });
    const cut = globe.terrain.addRegion({
      rectangle: { west: 7.425, south: 46.925, east: 7.435, north: 46.935 },
    });
    expect(asks(globe, IN).hole).toBe(true); // in both
    expect(asks(globe, { longitude: 7.422, latitude: 46.922 }).hole).toBe(
      false,
    );
    cut.remove();
    expect(asks(globe, IN).hole).toBe(false);
    glass.remove();
    done();
  });
});

describe("everywhere", () => {
  it("takes a slot only while its opacity is below 1", async () => {
    const { world, globe, done } = await globeWithTiles();
    const slots = () =>
      world.scene.terrainClipRuns.filter((run) => run !== undefined).length;
    const all = globe.terrain.addRegion("everywhere", { opacity: 0.5 });
    expect(slots()).toBe(1);
    all.opacity = 1;
    expect(slots()).toBe(0);
    all.opacity = 0.2;
    expect(slots()).toBe(1);
    all.remove();
    expect(slots()).toBe(0);
    // At 1 from the start: none.
    globe.terrain.addRegion("everywhere", { opacity: 1 });
    expect(slots()).toBe(0);
    done();
  });

  it("fills the 32 slots, refuses a 33rd below 1, and still adds one at 1", async () => {
    const { globe, done } = await globeWithTiles();
    for (let i = 0; i < 32; i++) {
      globe.terrain.addRegion("everywhere", { opacity: 0.5 });
    }
    expect(() =>
      globe.terrain.addRegion("everywhere", { opacity: 0.5 }),
    ).toThrow(/at most 32 terrain regions per world/);
    const idle = globe.terrain.addRegion("everywhere", { opacity: 1 });
    // No room to leave 1: the region stays at 1, and the error says why.
    expect(() => {
      idle.opacity = 0.5;
    }).toThrow(TerrainRegionError);
    expect(idle.opacity).toBe(1);
    done();
  });

  it("covers every tile, hides the terrain at 0 and is ground only if it says so", async () => {
    const { world, globe, own, under, beside, mask, done } =
      await globeWithTiles();
    const all = globe.terrain.addRegion("everywhere"); // a cut of the globe
    expect(all.ground).toBe(false);
    expect(mask(under)).toBe(1);
    expect(mask(beside)).toBe(1);
    expect(world.drawMaterial(beside)).toBe(own);
    expect(asks(globe, IN).hole).toBe(true);
    expect(asks(globe, OUT).hole).toBe(true);
    all.remove();
    const glass = globe.terrain.addRegion("everywhere", { opacity: 0.5 });
    expect(asks(globe, OUT).hole).toBe(false);
    expect(mask(beside)).toBe(1);
    expect(world.drawMaterial(beside)).not.toBe(own);
    glass.opacity = 1;
    expect(mask(beside)).toBe(0);
    expect(world.drawMaterial(beside)).toBe(own);
    done();
  });
});

describe("a destroyed globe", () => {
  it("throws on addRegion, naming what to do, and its regions are removed", async () => {
    const { engine, globe } = await globeWithTiles();
    const region = globe.terrain.addRegion(SITE, { opacity: 0.5 });
    (globe as unknown as { loaded: Set<unknown> }).loaded.clear();
    engine.removeTileset(globe);
    expect(() => globe.terrain.addRegion(SITE)).toThrow(
      /destroyed; add regions to the globe that replaced it/,
    );
    expect(region.removed).toBe(true);
    expect(globe.terrain.regions).toEqual([]);
  });
});
