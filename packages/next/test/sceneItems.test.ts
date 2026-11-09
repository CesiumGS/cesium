// Scene items: a tileset drawn more than once in its world. The same loaded
// tiles, one selection, one cache, one set of bounds. Through the real tileset
// on the fake engine (test/fakeGpu.ts).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import {
  CASTER_MASK_WORD,
  COLOR_WORD,
  MATERIAL_WORDS,
  MaterialFlags,
  NO_PLACEMENT,
  PLACEMENT_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
  VIEW_MASK_WORD,
} from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/View.ts";
import type { DrawHandle, World } from "../src/scene/World.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import type { Tileset3D, TilesetOptions } from "../src/streaming/Tileset3D.ts";
import { pickInFrame } from "../src/engineering/pick.ts";
import { ClientSnapService } from "../src/engineering/snap.ts";
import { FeatureStyle } from "../src/scene/FeatureStyle.ts";
import { untestedSpans } from "../src/query/drawBackend.ts";
import { fakeEngine } from "./fakeGpu.ts";
const world = (w: World): World => w;

const R = 6_378_137;
const BASE = "https://tiles.test/site/";
const URL_ = `${BASE}tileset.json`;
const SECOND = "_SECOND";
/** How far each tile's vertices are from their second position, m. */
const OFF = 500;
/** The tileset.json extension that gives the content its second position. */
const DUAL_EXTENSION = {
  CESIUM_dual_position: { position: SECOND, maxDistance: OFF },
};

/** A square slab of `half` metres, its second position `OFF` m to the north. */
function slab(half: number, withSecond = true): GltfAsset {
  const h = half;
  const positions = new Float32Array([0, -h, -h, 0, h, -h, 0, h, h, 0, -h, h]);
  const second = positions.slice();
  // The content's axes are the tile's: the tileset's gltfUpAxis is Z.
  for (let i = 2; i < second.length; i += 3) {
    second[i] = second[i]! + OFF;
  }
  return {
    meshes: [
      {
        positions,
        normals: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        ...(withSecond && {
          attributes: { [SECOND]: { data: second, components: 3 } },
        }),
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

const tilesetJson = (children: unknown[], second: boolean) => ({
  asset: { version: "1.1", gltfUpAxis: "Z" },
  ...(second && { extensions: DUAL_EXTENSION }),
  geometricError: 1000,
  root: {
    geometricError: 1000,
    refine: "ADD",
    boundingVolume: {
      box: [R, 0, 0, 5000, 0, 0, 0, 5000, 0, 0, 0, 5000],
    },
    children,
  },
});

const tile = (uri: string, at: readonly number[], half = 10) => ({
  geometricError: 0,
  refine: "REPLACE",
  boundingVolume: { box: [0, 0, 0, 1, 0, 0, 0, half, 0, 0, 0, half] },
  transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, at[0]!, at[1]!, at[2]!, 1],
  content: { uri },
});

describe("scene items", () => {
  let engine: Engine;
  let contents: Record<string, () => GltfAsset>;
  beforeAll(async () => {
    engine = await fakeEngine();
    vi.spyOn(engine, "loadGltf").mockImplementation(async (url) => {
      const name = String(url).slice(BASE.length);
      const make = contents[name];
      if (make === undefined) {
        throw new Error(`no content ${name}`);
      }
      return make();
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function serve(children: unknown[], second = false) {
    contents = {
      "a.gltf": () => slab(10),
      "bare.gltf": () => slab(10, false),
      ...contents,
    };
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(tilesetJson(children, second)), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
  }

  const frames = async (count = 12) => {
    for (let i = 0; i < count; i++) {
      engine.renderFrame();
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  };

  /** A view 50 m short of the tile, looking north. */
  function aimed(world: World) {
    const view = engine.addView({
      target: new OffscreenTarget(64, 48),
      world,
    });
    view.camera.position.set([R + 2, 0, 0]);
    view.camera.direction.set([0, 0, 1]);
    view.camera.orient(Float64Array.of(1, 0, 0));
    view.camera.version++;
    return view;
  }

  /** A world and one tile, by `Engine.addTileset`: one item, the default. */
  async function scene(
    children: unknown[] = [tile("a.gltf", [R, 0, 50])],
    options: TilesetOptions = {},
    second = false,
  ) {
    serve(children, second);
    const world: World = engine.createWorld({ maxDraws: 64 });
    const tileset = await engine.addTileset(world, URL_, options);
    const view = aimed(world);
    await frames();
    return helpers(world, tileset, view);
  }

  function helpers(
    world: World,
    tileset: Tileset3D,
    view: ReturnType<typeof aimed>,
  ) {
    const u = () =>
      (world as unknown as { recordsU32: ArrayLike<number> }).recordsU32;
    const f = () =>
      (world as unknown as { recordsF32: ArrayLike<number> }).recordsF32;
    const record = (draw: DrawHandle) => {
      const o = draw.index * RECORD_WORDS;
      return {
        viewMask: u()[o + VIEW_MASK_WORD]!,
        casterMask: u()[o + CASTER_MASK_WORD]!,
        placement: u()[o + PLACEMENT_WORD]!,
        radius: f()[o + RADIUS_WORD]!,
        color: [0, 1, 2, 3].map((k) => f()[o + COLOR_WORD + k]!),
      };
    };
    const materialFlags = (draw: DrawHandle) =>
      (world as unknown as { materialsU32: ArrayLike<number> }).materialsU32[
        world.drawMaterial(draw)! * MATERIAL_WORDS + 12
      ]!;
    return {
      world,
      tileset,
      view,
      record,
      materialFlags,
      bit: engine.viewBit(view),
      first: () => tileset.root.children[0] as Tile,
      remove() {
        engine.removeView(view);
        if (!tileset.isDestroyed()) {
          engine.removeTileset(tileset);
        }
      },
    };
  }

  it("Engine.addTileset adds one default item, tileset.items[0], which changes nothing", async () => {
    const s = await scene();
    const draw = s.first().placement!.draws[0]!;
    expect(s.tileset.items.length).toBe(1);
    expect(s.world.items).toEqual(s.tileset.items);
    const item = s.tileset.items[0]!;
    expect(item.tileset).toBe(s.tileset);
    expect(item.anchor).toBe(s.tileset.anchor);
    expect(s.first().items).toBeUndefined();
    expect(s.record(draw).placement).toBe(NO_PLACEMENT);
    expect(s.record(draw).color).toEqual([1, 1, 1, 1]);
    expect(s.tileset.itemOfDraw(draw)).toBe(item);
    expect(s.world.itemOfDraw(draw)).toBe(item);
    s.remove();
    expect(s.world.items).toEqual([]);
    expect(item.removed).toBe(true);
  });

  it("loadTileset draws nothing, fetches no content and takes no ticks until world.add", async () => {
    serve([tile("a.gltf", [R, 0, 50])], true);
    const loads = vi.mocked(engine.loadGltf).mock.calls.length;
    const site = await engine.loadTileset(URL_);
    expect(site.items).toEqual([]);
    expect(() => site.world).toThrow(/world\.add/);
    const world = engine.createWorld({ maxDraws: 64 });
    const view = aimed(world);
    await frames();
    expect(engine.tilesets.includes(site)).toBe(false);
    expect(vi.mocked(engine.loadGltf).mock.calls.length).toBe(loads);
    const rigid = world.add(site, { placement: 0 });
    const ghost = world.add(site, {
      placement: 1,
      opacity: 0.4,
      tint: [0, 1, 1],
    });
    expect(site.world).toBe(world);
    expect(world.items).toEqual([rigid, ghost]);
    expect(site.items).toEqual([rigid, ghost]);
    await frames();
    // One tile, fetched once, for both items.
    expect(vi.mocked(engine.loadGltf).mock.calls.length).toBe(loads + 1);
    expect(site.stats.loaded).toBe(1);
    ghost.placement = 0.5;
    expect(ghost.placement).toBe(0.5);
    ghost.remove();
    expect(world.items).toEqual([rigid]);
    engine.removeView(view);
    engine.removeTileset(site);
  });

  it("a loaded tileset never added can be removed, and refuses to be added after", async () => {
    serve([tile("a.gltf", [R, 0, 50])]);
    const site = await engine.loadTileset(URL_);
    engine.removeTileset(site);
    expect(site.isDestroyed()).toBe(true);
    const world = engine.createWorld({ maxDraws: 8 });
    expect(() => world.add(site)).toThrow(/destroyed/);
  });

  it("a tileset with no items selects nothing and sleeps; its tiles stay cached; adding draws them again unfetched", async () => {
    const s = await scene();
    const item = s.tileset.items[0]!;
    const loads = vi.mocked(engine.loadGltf).mock.calls.length;
    const t = s.first();
    const draw = t.placement!.draws[0]!;
    item.remove();
    expect(item.removed).toBe(true);
    item.remove(); // idempotent
    expect(s.tileset.items).toEqual([]);
    await frames(6);
    expect(t.viewMask).toBe(0);
    expect(s.record(draw).viewMask).toBe(0);
    // Still cached: normal eviction decides, not the item.
    expect(t.state).toBe("ready");
    expect(s.tileset.stats.loaded).toBe(1);
    expect(s.tileset.active).toBe(false);
    expect(s.tileset.needsFrames).toBe(false);
    // Back, from the cache.
    const again = s.world.add(s.tileset);
    await frames(3);
    expect(vi.mocked(engine.loadGltf).mock.calls.length).toBe(loads);
    expect(s.record(draw).viewMask & s.bit).not.toBe(0);
    expect(s.tileset.itemOfDraw(draw)).toBe(again);
    s.remove();
  });

  it("removing the first item hands back the tile's own draws as loaded; the others keep drawing", async () => {
    const s = await scene([tile("a.gltf", [R, 0, 50])], {}, true);
    const first = s.tileset.items[0]!;
    const second = s.world.add(s.tileset, { placement: 1, opacity: 0.5 });
    await frames(2);
    const own = s.first().placement!.draws[0]!;
    const twin = s.first().items!.get(second)!.draws[0]!;
    first.opacity = 0.5;
    first.remove();
    await frames(2);
    expect(s.record(own).viewMask).toBe(0);
    expect(s.record(own).placement).toBe(NO_PLACEMENT);
    expect(s.record(own).color).toEqual([1, 1, 1, 1]);
    expect(s.materialFlags(own) & MaterialFlags.blendedOnly).toBe(0);
    expect(s.record(twin).viewMask & s.bit).not.toBe(0);
    // The next item added draws the tile's own draws.
    const third = s.world.add(s.tileset, { placement: 0 });
    await frames(2);
    expect(s.tileset.itemOfDraw(own)).toBe(third);
    expect(s.record(own).viewMask & s.bit).not.toBe(0);
    s.remove();
  });

  it("refuses a tileset of another world, a globe's, and a placement it can't draw", async () => {
    const s = await scene();
    const other = engine.createWorld({ maxDraws: 8 });
    expect(() => other.add(s.tileset)).toThrow(/another world/);
    expect(() => s.world.add(s.tileset, { placement: 0.5 })).toThrow(
      /no second position/,
    );
    expect(() => s.world.add(s.tileset, { opacity: -1 })).toThrow(/opacity/);
    expect(() => s.world.add(s.tileset, { tint: [1, Number.NaN, 0] })).toThrow(
      /tint/,
    );
    expect(s.tileset.items.length).toBe(1);
    expect(() =>
      s.world.add(
        Object.assign(Object.create(s.tileset) as Tileset3D, {
          source: {},
        }),
      ),
    ).toThrow(/globe/);
    s.remove();
    expect(() => s.world.add(s.tileset)).toThrow(/destroyed/);
  });

  it("refuses an item's non-finite placement, and a refused add binds nothing", async () => {
    const s = await scene([tile("a.gltf", [R, 0, 50])], {}, true);
    const item = s.tileset.items[0]!;
    expect(() => (item.placement = Number.NaN)).toThrow(RangeError);
    expect(item.placement).toBe(0);
    s.remove();
    serve([tile("a.gltf", [R, 0, 50])], true);
    const site = await engine.loadTileset(URL_);
    const world = engine.createWorld({ maxDraws: 8 });
    expect(() => world.add(site, { placement: Number.NaN })).toThrow(
      RangeError,
    );
    // Not bound: another world may still take it.
    expect(() => site.world).toThrow(/world\.add/);
    expect(world.items).toEqual([]);
    engine.createWorld({ maxDraws: 8 }).add(site).remove();
    engine.removeTileset(site);
  });

  it("a declaration the engine can't read is ignored, and the tileset warns", async () => {
    serve([tile("a.gltf", [R, 0, 50])], true);
    const text = (await (await fetch(URL_)).text()).replace(
      /"maxDistance":\d+/,
      '"maxDistance":-1',
    );
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(text, { headers: { "Content-Type": "application/json" } }),
    );
    const site = await engine.loadTileset(URL_);
    expect([...site.warnings].join()).toMatch(/CESIUM_dual_position/);
    const world = engine.createWorld({ maxDraws: 8 });
    expect(() => world.add(site, { placement: 1 })).toThrow(
      /no second position/,
    );
    engine.removeTileset(site);
  });

  it("draws the same loaded tile again: same mesh and transform, its own record, nothing loaded twice", async () => {
    const s = await scene([tile("a.gltf", [R, 0, 50])], {}, true);
    const loads = vi.mocked(engine.loadGltf).mock.calls.length;
    const bytes = s.tileset.stats.bytes;
    const before = s.first().bytes;
    const item = s.world.add(s.tileset, {
      placement: 1,
      tint: [0, 1, 1],
      opacity: 0.3,
    });
    const own = s.first().placement!.draws[0]!;
    const twin = s.first().items!.get(item)!.draws[0]!;
    expect(twin.index).not.toBe(own.index);
    expect(s.world.drawMatrix(twin)).toEqual(s.world.drawMatrix(own));
    await frames(3);
    // Nothing more fetched: one selection, one cache.
    expect(vi.mocked(engine.loadGltf).mock.calls.length).toBe(loads);
    expect(s.tileset.stats.loaded).toBe(1);
    // About a record and an item more, on a tile's bytes and the cache's.
    expect(s.first().bytes - before).toBeGreaterThan(0);
    expect(s.first().bytes - before).toBeLessThan(1024);
    expect(s.tileset.stats.bytes - bytes).toBe(s.first().bytes - before);
    // Its appearance is its own record's.
    expect(s.record(twin).color[1]).toBe(1);
    expect(s.record(twin).color[3]).toBeCloseTo(0.3);
    expect(s.record(own).color).toEqual([1, 1, 1, 1]);
    expect(s.record(twin).placement).not.toBe(NO_PLACEMENT);
    // Which item drew which draw; the tile is the one tile.
    expect(s.tileset.itemOfDraw(twin)).toBe(item);
    expect(s.tileset.tileOfDraw(twin)).toBe(s.first());
    expect(s.tileset.sourceOfDraw(twin)).toEqual(own);
    // Removing it frees its draw and bytes, and leaves the tile.
    item.remove();
    expect(item.removed).toBe(true);
    expect(s.world.hasDraw(twin)).toBe(false);
    expect(s.first().bytes).toBe(before);
    s.remove();
  });

  it("a tile that loads later gets every item's draws, and removing the tileset frees them", async () => {
    serve([tile("a.gltf", [R, 0, 50])], true);
    const site = await engine.loadTileset(URL_);
    const world = engine.createWorld({ maxDraws: 64 });
    const a = world.add(site, { placement: 0 });
    const b = world.add(site, { placement: 1 });
    const view = aimed(world);
    await frames();
    const t = site.root.children[0] as Tile;
    const twin = t.items!.get(b)!.draws[0]!;
    const bit = engine.viewBit(view);
    const s = helpers(world, site, view);
    expect(s.record(twin).viewMask & bit).not.toBe(0);
    site.show = false;
    await frames(2);
    expect(s.record(twin).viewMask).toBe(0);
    site.show = true;
    await frames(2);
    expect(s.record(twin).viewMask & bit).not.toBe(0);
    engine.removeTileset(site);
    expect(world.hasDraw(twin)).toBe(false);
    expect(a.removed && b.removed).toBe(true);
    expect(world.items).toEqual([]);
    engine.removeView(view);
  });

  it("view masks and show: an item's are its own, and selection's views still decide", async () => {
    const s = await scene();
    const item = s.world.add(s.tileset, { viewMask: 0 });
    await frames(2);
    const own = s.first().placement!.draws[0]!;
    const twin = s.first().items!.get(item)!.draws[0]!;
    expect(s.record(own).viewMask & s.bit).not.toBe(0);
    expect(s.record(twin).viewMask).toBe(0);
    item.viewMask = s.bit;
    expect(s.record(twin).viewMask & s.bit).not.toBe(0);
    item.show = false;
    expect(s.record(twin).viewMask).toBe(0);
    item.show = true;
    expect(s.record(twin).viewMask & s.bit).not.toBe(0);
    const base = s.tileset.items[0]!;
    base.viewMask = 0;
    expect(s.record(own).viewMask).toBe(0);
    expect(s.record(twin).viewMask & s.bit).not.toBe(0);
    s.remove();
  });

  it("each item is culled by its own placement's bounds", async () => {
    const s = await scene([tile("a.gltf", [R, 0, 50])], {}, true);
    const own = s.first().placement!.draws[0]!;
    const moved = s.world.add(s.tileset, { placement: 1 });
    const still = s.world.add(s.tileset, { placement: 0 });
    const twin = s.first().items!.get(moved)!.draws[0]!;
    const other = s.first().items!.get(still)!.draws[0]!;
    const base = s.record(own).radius - OFF;
    expect(s.record(twin).radius).toBeCloseTo(base + OFF);
    // Past the end, its bounds grow with |t|, and no other's do.
    moved.placement = -9;
    expect(s.record(twin).radius).toBeCloseTo(base + 9 * OFF);
    expect(s.record(other).radius).toBeCloseTo(base + OFF);
    expect(s.record(own).radius).toBeCloseTo(base + OFF);
    s.remove();
  });

  it("a tile drawn away from where it was written stays selected (the rigid copy cut off)", async () => {
    // The tile's box is 200 m behind the camera, out of the view. Its second
    // position is 500 m on from there: in the view. Without growing the
    // volumes the tile isn't selected, and its copy never shows.
    contents = { "far.gltf": () => slab(10) };
    const plain = await scene([tile("far.gltf", [R, 0, -200])]);
    expect(plain.first().viewMask).toBe(0);
    plain.remove();
    const s = await scene([tile("far.gltf", [R, 0, -200])], {}, true);
    const t = s.first();
    await frames(4);
    expect(t.viewMask & s.bit).not.toBe(0);
    expect(s.tileset.volumePad).toBe(OFF);
    // Past the end, every tile's bounds grow with the farthest item's.
    const far = s.world.add(s.tileset, { placement: 3 });
    await frames(2);
    expect(s.tileset.volumePad).toBe(3 * OFF);
    expect(t.volume.sphere.radius).toBeGreaterThan(3 * OFF);
    far.remove();
    await frames(2);
    expect(s.tileset.volumePad).toBe(OFF);
    // The own volume, for what isn't about drawing, is as written.
    expect(t.ownVolume.sphere.radius).toBeLessThan(20);
    // A hidden item pads nothing: its last placement is no reason to look
    // that far.
    s.tileset.items[0]!.show = false;
    await frames(4);
    expect(s.tileset.volumePad).toBe(0);
    expect(t.volume).toBe(t.ownVolume);
    s.remove();
  });

  it("a second position makes tiles swap whole, never as clipped placeholders", async () => {
    const plain = await scene();
    expect(plain.tileset.movesVertices).toBe(false);
    plain.remove();
    const s = await scene([tile("a.gltf", [R, 0, 50])], {}, true);
    expect(s.tileset.movesVertices).toBe(true);
    s.tileset.items[0]!.show = false;
    await frames(1);
    expect(s.tileset.movesVertices).toBe(false);
    s.remove();
  });

  it("opacity: below 1 only the translucent passes draw it, at 1 the opaque ones again, at 0 nothing", async () => {
    const s = await scene();
    const item = s.world.add(s.tileset, { opacity: 0.4 });
    await frames(2);
    const own = s.first().placement!.draws[0]!;
    const twin = s.first().items!.get(item)!.draws[0]!;
    const blended = MaterialFlags.alphaBlend | MaterialFlags.blendedOnly;
    expect(s.materialFlags(twin) & blended).toBe(blended);
    expect(s.materialFlags(own) & blended).toBe(0);
    expect(s.record(twin).viewMask & s.bit).not.toBe(0);
    // Interned: no new material row for each tile's twin.
    const a = s.world.drawMaterial(twin);
    const other = s.world.add(s.tileset, { opacity: 0.2 });
    expect(s.world.drawMaterial(s.first().items!.get(other)!.draws[0]!)).toBe(
      a,
    );
    // Back to opaque: the content's own material, and its reference freed.
    item.opacity = 1;
    expect(s.materialFlags(twin) & blended).toBe(0);
    expect(s.world.drawMaterial(twin)).toBe(s.world.drawMaterial(own));
    // At 0 it isn't drawn; coming back draws it again.
    item.opacity = 0;
    expect(s.record(twin).viewMask).toBe(0);
    item.opacity = 0.5;
    expect(s.record(twin).viewMask & s.bit).not.toBe(0);
    expect(() => (item.opacity = 1.5)).toThrow(RangeError);
    expect(() => (item.opacity = Number.NaN)).toThrow(RangeError);
    s.remove();
  });

  it("the opaque, shadow and prepass bundles leave a translucent item out", async () => {
    const s = await scene();
    const item = s.world.add(s.tileset, { opacity: 0.3 });
    await frames(2);
    const twin = s.first().items!.get(item)!.draws[0]!;
    const internals = s.world as unknown as {
      drawBatches: Array<{ material: number; shown: number } | undefined>;
      recordBundle(kind: string): GPURenderBundle;
      drawArguments: { drawBatch(...args: unknown[]): void };
    };
    expect(internals.drawBatches[twin.index]!.shown).toBe(1);
    // A blended surface all the same: the view runs its translucent passes.
    expect(s.world.translucentRange([R, 0, 0], s.bit)).toBeDefined();
    const spy = vi.spyOn(internals.drawArguments, "drawBatch");
    for (const kind of ["opaque", "shadow", "prepass", "depth", "height"]) {
      spy.mockClear();
      internals.recordBundle(kind);
      // The tile's own draw only.
      expect(spy.mock.calls.length, kind).toBe(1);
    }
    spy.mockRestore();
    s.remove();
  });

  it("shadows: an opaque item casts from off screen, a translucent one doesn't", async () => {
    const s = await scene();
    const opaque = s.world.add(s.tileset);
    const glass = s.world.add(s.tileset, { opacity: 0.3 });
    const t = s.first();
    const own = t.placement!.draws[0]!;
    const solid = t.items!.get(opaque)!.draws[0]!;
    const blended = t.items!.get(glass)!.draws[0]!;
    // What the tileset does for a tile selected for a view's cascades alone.
    t.appliedCasterMask = s.bit;
    for (const item of s.tileset.items) {
      item.applyCasterMask(t);
    }
    expect(s.record(own).casterMask).toBe(s.bit);
    expect(s.record(solid).casterMask).toBe(s.bit);
    expect(s.record(blended).casterMask).toBe(0);
    const batches = s.world as unknown as {
      drawBatches: Array<{ casters: number }>;
    };
    expect(batches.drawBatches[solid.index]!.casters).toBeGreaterThan(0);
    expect(batches.drawBatches[blended.index]!.casters).toBe(0);
    // Turned opaque it casts, turned translucent it stops, and the batch's
    // count moves with its record.
    glass.opacity = 1;
    expect(s.record(blended).casterMask).toBe(s.bit);
    opaque.opacity = 0.5;
    expect(s.record(solid).casterMask).toBe(0);
    // Its view mask and show say the same for shadows as for views.
    glass.viewMask = 0;
    expect(s.record(blended).casterMask).toBe(0);
    t.appliedCasterMask = 0;
    s.remove();
  });

  it("a tile without the attribute isn't drawn by an item that moves it, and the tileset says so", async () => {
    contents = { "bare.gltf": () => slab(10, false) };
    const s = await scene([tile("bare.gltf", [R, 0, 50])], {}, true);
    const own = s.first().placement!.draws[0]!;
    expect(s.record(own).viewMask).toBe(0);
    expect([...s.tileset.warnings].join()).toMatch(/_SECOND/);
    s.remove();
  });

  it("the design placement: the tileset's at placement 0, its second at 1, none between", async () => {
    const s = await scene([tile("a.gltf", [R, 0, 50])], {}, true);
    const rigid = { mode: "rigid" } as never;
    const reprojected = { mode: "reprojected" } as never;
    s.tileset.placement = rigid;
    s.tileset.secondPlacement = reprojected;
    const item = s.world.add(s.tileset, { placement: 0 });
    expect(item.designPlacement).toBe(rigid);
    item.placement = 1;
    expect(item.designPlacement).toBe(reprojected);
    item.placement = 0.5;
    expect(item.designPlacement).toBeUndefined();
    item.placement = -9;
    expect(item.designPlacement).toBeUndefined();
    // A moved tileset's placements no longer describe what is drawn.
    const moved = m4.mat4();
    moved[12] = 1;
    s.tileset.modelMatrix = moved;
    expect(s.tileset.secondPlacement).toBeUndefined();
    s.remove();
  });

  it("a pick and a snap report the item they hit", async () => {
    const s = await scene(
      [tile("a.gltf", [R, 0, 50])],
      { retainGeometry: true },
      true,
    );
    const placed = s.world.add(s.tileset, { placement: 1 });
    const twin = s.first().items!.get(placed)!.draws[0]!;
    const here = Float64Array.from([R, 0, 50 + OFF]);
    const pose = {
      position: Float64Array.from([R + 200, 0, 50 + OFF]),
      direction: Float64Array.from([-1, 0, 0]),
      up: Float64Array.from([0, 0, 1]),
      right: Float64Array.from([0, 1, 0]),
      fovy: 1,
      near: 0.1,
      width: 100,
      height: 100,
    };
    const fake = {
      body: s.view.body,
      camera: { ...pose, version: 1, fovy: () => 1 },
      target: { kind: "offscreen", width: 100 },
      pixelRect: () => ({ width: 100, height: 100 }),
      world: s.world,
      pick: async () => undefined,
      pickPosition: async () => undefined,
      pickPoint: async () => ({
        view: s.view,
        position: here,
        root: s.world.root,
        anchor: undefined,
        anchorPosition: here,
        draw: twin,
        feature: { featureId: 7, name: undefined },
        item: placed,
        seconds: 0,
        camera: pose,
      }),
    };
    const framed = await pickInFrame(fake as never, 50, 50, [s.tileset]);
    expect(framed?.pick.tileset).toBe(s.tileset);
    expect(framed?.pick.item).toBe(placed);
    expect(framed?.tile).toBe(s.first());
    const service = new ClientSnapService([s.tileset]);
    const snapped = await service.snap({
      view: fake as never,
      x: 50,
      y: 50,
      aperture: 200,
    });
    expect(snapped?.item).toBe(placed);
    // On the vertices as this item draws them: at placement 1, the second
    // position's, not the position's.
    expect(snapped?.kind).toBe("point");
    expect(Math.abs(snapped!.snapPoint[2]! - (50 + OFF))).toBeLessThanOrEqual(
      10.001,
    );
    s.remove();
  });

  describe("fixes from the review", () => {
    const live = (world: World) => {
      const w = world as unknown as { freeSlots: number[] };
      return world.recordCount - w.freeSlots.length;
    };

    it("a setter on a removed item does nothing, and no draw outlives removeTileset", async () => {
      const s = await scene([tile("a.gltf", [R, 0, 50])], {}, true);
      const g = s.world.add(s.tileset, { placement: 1, opacity: 0.3 });
      await frames(2);
      const before = live(s.world);
      g.remove();
      const after = live(s.world);
      expect(after).toBe(before - 1);
      g.tint = [1, 0, 0];
      g.opacity = 0.5;
      g.shader = undefined;
      g.viewMask = 1;
      g.show = false;
      g.placement = 0.5;
      expect(g.placement).toBe(0.5);
      expect(g.tint).toEqual([1, 0, 0]);
      expect(live(s.world)).toBe(after);
      // The base item too.
      const base = s.tileset.items[0]!;
      base.remove();
      base.opacity = 0.5;
      expect(live(s.world)).toBe(after);
      engine.removeView(s.view);
      engine.removeTileset(s.tileset);
      expect(live(s.world)).toBe(0);
    });

    it("a full material table in world.add throws a CapacityError and leaves nothing behind", async () => {
      serve([tile("a.gltf", [R, 0, 50])]);
      let failed = false;
      for (const maxMaterials of [1, 2, 3, 4]) {
        const world = engine.createWorld({ maxDraws: 16, maxMaterials });
        const site = await engine.addTileset(world, URL_);
        const view = aimed(world);
        await frames();
        const draws = live(world);
        const bytes = site.stats.bytes;
        try {
          world.add(site, { opacity: 0.5 });
        } catch (error) {
          failed = true;
          expect((error as Error).name).toBe("CapacityError");
          expect(live(world)).toBe(draws);
          expect(site.stats.bytes).toBe(bytes);
          expect(site.items.length).toBe(1);
          expect((site.root.children[0] as Tile).items).toBeUndefined();
        }
        engine.removeView(view);
        engine.removeTileset(site);
        expect(live(world)).toBe(0);
        if (failed) {
          break;
        }
      }
      expect(failed).toBe(true);
    });

    it("an item that's hidden makes a ray query's span unknown, as a hidden tileset does", async () => {
      const s = await scene([tile("a.gltf", [R, 0, 50])]);
      const from = [R - 20, 0, 50];
      const to = [R + 20, 0, 50];
      const spans = () => untestedSpans([s.tileset.root], from, to, s.bit);
      expect(spans()).toEqual([]);
      s.tileset.items[0]!.show = false;
      expect(spans().length).toBeGreaterThan(0);
      s.tileset.items[0]!.show = true;
      expect(spans()).toEqual([]);
      s.tileset.items[0]!.viewMask = 0;
      expect(spans().length).toBeGreaterThan(0);
      s.remove();
    });

    it("a view no item shows selects and fetches nothing for it", async () => {
      contents = { "b.gltf": () => slab(10) };
      serve([tile("a.gltf", [R, 0, 50]), tile("b.gltf", [R, 0, -5000], 10)]);
      const world = engine.createWorld({ maxDraws: 64 });
      const site = await engine.addTileset(world, URL_);
      const first = aimed(world);
      const second = engine.addView({
        target: new OffscreenTarget(64, 48),
        world,
      });
      second.camera.position.set([R + 2, 0, -5000 + 50]);
      second.camera.direction.set([0, 0, -1]);
      second.camera.orient(Float64Array.of(1, 0, 0));
      second.camera.version++;
      site.items[0]!.viewMask = engine.viewBit(first);
      await frames();
      const a = site.root.children[0] as Tile;
      const b = site.root.children[1] as Tile;
      expect(a.viewMask & engine.viewBit(first)).not.toBe(0);
      expect(b.state === "ready").toBe(false);
      expect(vi.mocked(engine.loadGltf).mock.calls.at(-1)?.[0]).not.toMatch(
        /b\.gltf/,
      );
      // Shown in both views, the second view's tile loads.
      site.items[0]!.viewMask = 0xffffffff;
      await frames();
      expect(b.state).toBe("ready");
      engine.removeView(first);
      engine.removeView(second);
      engine.removeTileset(site);
    });

    it("an item's own shader, and a FeatureStyle's, replaces the tileset's for that item", async () => {
      const s = await scene([tile("a.gltf", [R, 0, 50])], {}, true);
      const style = new FeatureStyle({ color: "color('red')" });
      const item = s.world.add(s.tileset, {
        placement: 1,
        shader: style.shader,
      });
      await frames(2);
      const own = s.first().placement!.draws[0]!;
      const twin = s.first().items!.get(item)!.draws[0]!;
      const shaderOf = (draw: DrawHandle) =>
        (
          world(s.world) as unknown as {
            drawBatches: { shader?: unknown }[];
          }
        ).drawBatches[draw.index]!.shader;
      expect(shaderOf(twin)).toBe(style.shader);
      expect(shaderOf(own)).toBeUndefined();
      item.shader = undefined;
      expect(shaderOf(twin)).toBeUndefined();
      s.remove();
    });

    it("a twin keeps its source's draw name", async () => {
      const s = await scene([tile("a.gltf", [R, 0, 50])], {}, true);
      const item = s.world.add(s.tileset, { placement: 1 });
      await frames(2);
      const own = s.first().placement!.draws[0]!;
      const twin = s.first().items!.get(item)!.draws[0]!;
      const names = (s.world as unknown as { names: (string | undefined)[] })
        .names;
      expect(names[twin.index]).toBe(names[own.index]);
      s.remove();
    });
  });
});
