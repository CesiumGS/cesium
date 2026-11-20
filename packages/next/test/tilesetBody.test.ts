// Plan 5c, Task 1: a tileset's body (the core's `3DTILES_ellipsoid` reader,
// the precedence of option, declaration and anchor), tile volumes built on
// it, and selection views on the anchor's body. The fake engine of
// test/fakeGpu.ts; a stubbed `fetch` serves tileset.json.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { curvilinearFrame } from "../src/frames/curvilinearFrame.ts";
import { verticalExaggeration } from "../src/georeference/heightCurvilinearMaps.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { EARTH, MOON, type Body } from "../src/scene/Body.ts";
import { Camera } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { selectionViews } from "../src/scene/tileSelection.ts";
import { Tileset3D } from "../src/streaming/Tileset3D.ts";
import {
  TilesetBodyError,
  resolveTilesetBody,
  tilesetBody,
} from "../src/streaming/tilesetBody.ts";
import type { TilesetOptions } from "../src/streaming/tilesetTypes.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const MOON_R = 1_737_400;
const BASE = "https://tiles.test/body/";
const URL_ = `${BASE}tileset.json`;

const moonDeclaration = {
  "3DTILES_ellipsoid": { body: "Moon", radii: [MOON_R, MOON_R, MOON_R] },
};
const earthDeclaration = {
  "3DTILES_ellipsoid": {
    body: "Earth",
    radii: [6378137.0, 6378137.0, 6356752.314245179],
  },
};

describe("tilesetBody: what 3DTILES_ellipsoid declares", () => {
  it("is undefined without the extension", () => {
    expect(tilesetBody(undefined)).toBeUndefined();
    expect(tilesetBody({})).toBeUndefined();
    expect(tilesetBody({ EXT_other: {} })).toBeUndefined();
  });

  it("finds the Earth and the Moon by their radii, within 0.01 m", () => {
    expect(tilesetBody(earthDeclaration)).toBe(EARTH);
    expect(tilesetBody(moonDeclaration)).toBe(MOON);
    const near = (extra: number) => ({
      "3DTILES_ellipsoid": { radii: [MOON_R + extra, MOON_R, MOON_R] },
    });
    expect(tilesetBody(near(0.009))).toBe(MOON);
    expect(() => tilesetBody(near(0.02))).toThrow(TilesetBodyError);
    // The name is optional, and case doesn't matter.
    expect(
      tilesetBody({
        "3DTILES_ellipsoid": { body: "MOON", radii: [MOON_R, MOON_R, MOON_R] },
      }),
    ).toBe(MOON);
  });

  it('is null for "none", whatever else it says', () => {
    expect(tilesetBody({ "3DTILES_ellipsoid": { body: "none" } })).toBeNull();
    expect(tilesetBody({ "3DTILES_ellipsoid": { body: "None" } })).toBeNull();
  });

  it("refuses other radii and a name for another body, naming the field", () => {
    const mars = {
      "3DTILES_ellipsoid": { radii: [3396190, 3396190, 3376200] },
    };
    expect(() => tilesetBody(mars)).toThrow(
      /extensions\.3DTILES_ellipsoid\.radii/,
    );
    const mislabeled = {
      "3DTILES_ellipsoid": { body: "Earth", radii: [MOON_R, MOON_R, MOON_R] },
    };
    try {
      tilesetBody(mislabeled);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TilesetBodyError);
      expect((error as TilesetBodyError).path).toBe(
        "extensions.3DTILES_ellipsoid.body",
      );
      expect((error as TilesetBodyError).reason).toMatch(/radii are the Moon/);
    }
  });

  it("takes the bodies it may find", () => {
    expect(() => tilesetBody(moonDeclaration, [EARTH])).toThrow(
      TilesetBodyError,
    );
    const other: Body = { name: "Moon", ellipsoid: Ellipsoid.MOON };
    expect(tilesetBody(moonDeclaration, [other])).toBe(other);
  });
});

describe("resolveTilesetBody: the option, the declaration, the anchor", () => {
  it("is the Earth with none of them", () => {
    expect(resolveTilesetBody({})).toBe(EARTH);
  });
  it("takes the first given, in that order", () => {
    expect(resolveTilesetBody({ option: MOON })).toBe(MOON);
    expect(resolveTilesetBody({ declared: MOON })).toBe(MOON);
    expect(resolveTilesetBody({ anchor: MOON })).toBe(MOON);
    expect(resolveTilesetBody({ option: null })).toBeNull();
    expect(resolveTilesetBody({ declared: null })).toBeNull();
  });
  it("accepts several that agree, and refuses ones that differ, naming both", () => {
    expect(
      resolveTilesetBody({ option: MOON, declared: MOON, anchor: MOON }),
    ).toBe(MOON);
    expect(() => resolveTilesetBody({ option: EARTH, declared: MOON })).toThrow(
      /3DTILES_ellipsoid.*Moon.*TilesetOptions\.body.*Earth/,
    );
    expect(() => resolveTilesetBody({ declared: MOON, anchor: EARTH })).toThrow(
      /TilesetOptions\.anchor.*Earth.*3DTILES_ellipsoid.*Moon/,
    );
    expect(() => resolveTilesetBody({ option: null, anchor: EARTH })).toThrow(
      /no body/,
    );
  });
});

/** A one-tile tileset whose root sits on the Moon's surface at (0°, 0°). */
function tilesetJson(
  extensions?: Record<string, unknown>,
  boundingVolume: unknown = {
    box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10],
  },
  children: unknown[] = [],
) {
  return {
    asset: { version: "1.1" },
    geometricError: 100,
    root: {
      geometricError: 10,
      refine: "REPLACE",
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, MOON_R, 0, 0, 1],
      boundingVolume,
      ...(children.length ? { children } : {}),
    },
    ...(extensions ? { extensions } : {}),
  };
}

const regionVolume = { region: [-0.01, -0.01, 0.01, 0.01, 0, 100] };

let engine: Engine;
const views: View[] = [];
const worlds: World[] = [];
beforeAll(async () => {
  engine = await fakeEngine();
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const view of views.splice(0)) {
    engine.removeView(view);
  }
  for (const world of worlds.splice(0)) {
    engine.removeWorld(world);
  }
});

function newWorld(): World {
  const world = engine.createWorld();
  worlds.push(world);
  return world;
}

async function load(
  json: unknown,
  options: TilesetOptions = {},
  world = newWorld(),
) {
  vi.stubGlobal("fetch", async (input: string | URL) =>
    String(input) === URL_
      ? new Response(JSON.stringify(json), {
          headers: { "Content-Type": "application/json" },
        })
      : new Response("not found", { status: 404 }),
  );
  return { tileset: await Tileset3D.load(engine, world, URL_, options), world };
}

describe("Tileset3D: its body, anchor and volumes", () => {
  it("is on the Earth, under the Earth's anchor, by default", async () => {
    const { tileset, world } = await load(tilesetJson());
    expect(tileset.body).toBe(EARTH);
    expect(tileset.anchor).toBe(world.bodyAnchor(EARTH));
  });

  it("a tileset declaring the Moon hangs under the Moon's anchor", async () => {
    const { tileset, world } = await load(tilesetJson(moonDeclaration));
    expect(tileset.body).toBe(MOON);
    expect(tileset.anchor).toBe(world.bodyAnchor(MOON));
    expect(tileset.anchor).not.toBe(world.bodyAnchor(EARTH));
  });

  it("builds region volumes on the Moon's sphere", async () => {
    const { tileset } = await load(tilesetJson(moonDeclaration, regionVolume));
    const volume = tileset.root.volume;
    expect(volume.kind).toBe("region");
    if (volume.kind === "region") {
      expect(Math.hypot(...volume.region.southwestCorner)).toBeCloseTo(
        MOON_R,
        6,
      );
    }
  });

  it("the body option, or an anchor of a body, alone says the body", async () => {
    const world = newWorld();
    const { tileset } = await load(
      tilesetJson(undefined, regionVolume),
      { anchor: world.bodyAnchor(MOON) },
      world,
    );
    expect(tileset.body).toBe(MOON);
    const volume = tileset.root.volume;
    expect(
      volume.kind === "region" && volume.region.southwestCorner,
    ).toBeTruthy();
    if (volume.kind === "region") {
      expect(Math.hypot(...volume.region.southwestCorner)).toBeCloseTo(
        MOON_R,
        6,
      );
    }
    const viaOption = await load(tilesetJson(), { body: MOON });
    expect(viaOption.tileset.body).toBe(MOON);
    expect(viaOption.tileset.anchor).toBe(viaOption.world.bodyAnchor(MOON));
  });

  it("refuses a body option or an anchor that disagrees with 3DTILES_ellipsoid, naming both", async () => {
    // Review Focus 4.
    const moonJson = tilesetJson(moonDeclaration);
    await expect(load(moonJson, { body: EARTH })).rejects.toThrow(
      /3DTILES_ellipsoid.*body|body.*3DTILES_ellipsoid/,
    );
    const world = newWorld();
    const rejected = load(moonJson, { anchor: world.bodyAnchor(EARTH) }, world);
    await expect(rejected).rejects.toThrow(TilesetBodyError);
    await expect(rejected).rejects.toThrow(/anchor/);
    await expect(rejected).rejects.toThrow(/3DTILES_ellipsoid/);
  });

  it("refuses an unknown body at load", async () => {
    await expect(
      load(
        tilesetJson({
          "3DTILES_ellipsoid": { radii: [3396190, 3396190, 3376200] },
        }),
      ),
    ).rejects.toThrow(/3DTILES_ellipsoid\.radii/);
  });

  it("refuses region volumes in a tileset with no body, naming the tile", async () => {
    // Review Focus 4: 3DTILES_ellipsoid body "none".
    const none = { "3DTILES_ellipsoid": { body: "none" } };
    await expect(load(tilesetJson(none, regionVolume))).rejects.toThrow(
      /root\.boundingVolume\.region/,
    );
    const child = {
      geometricError: 0,
      boundingVolume: { box: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] },
    };
    const deep = {
      geometricError: 0,
      boundingVolume: { box: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] },
      children: [child, { ...child, boundingVolume: regionVolume }],
    };
    await expect(
      load(
        tilesetJson(none, { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] }, [
          deep,
        ]),
      ),
    ).rejects.toThrow(
      /root\.children\[0\]\.children\[1\]\.boundingVolume\.region/,
    );
    // Boxes and spheres are fine; the tileset has no body.
    const { tileset } = await load(
      tilesetJson(none, { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] }),
    );
    expect(tileset.body).toBeUndefined();
    expect(tileset.bodyless).toBe(true);
    // Under the Earth's anchor by default.
    expect(tileset.anchor).toBe(tileset.world.bodyAnchor(EARTH));
  });
});

/** The pose of an eye `height` m above the Moon's surface at (0°, 0°). */
function moonPose(height: number): Camera {
  const camera = new Camera();
  camera.position.set([MOON_R + height, 0, 0]);
  camera.direction.set([-1, 0, 0]);
  camera.orient(Float64Array.of(0, 0, 1));
  return camera;
}

describe("selection views on the anchor's body", () => {
  function setup() {
    const world = newWorld();
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    views.push(view);
    return { world, view };
  }

  it("the Earth anchor's selection view is on WGS 84, as before", () => {
    const { world, view } = setup();
    const earth = world.bodyAnchor(EARTH);
    const eye = new Camera();
    eye.position.set([1_253_000.37, -4_733_000.81, 4_074_000.06]);
    eye.direction.set([-0.19, 0.72, -0.62]);
    eye.orient(Float64Array.of(0, 0, 1));
    view.setCameraFromAnchor(earth, eye);
    const [sel] = selectionViews(engine as never, world, earth);
    expect(sel!.ellipsoid).toBe(Ellipsoid.WGS84);
    expect(sel!.noBody).toBeUndefined();
    expect(sel!.cartographic).toEqual(
      Ellipsoid.WGS84.cartesianToCartographic(sel!.position, {
        longitude: 0,
        latitude: 0,
        height: 0,
      }),
    );
  });

  it("the Moon anchor's selection view is on the Moon's ellipsoid", () => {
    const { world, view } = setup();
    const moon = world.bodyAnchor(MOON);
    view.setCameraFromAnchor(moon, moonPose(10_000));
    const [sel] = selectionViews(engine as never, world, moon);
    expect(sel!.ellipsoid).toBe(Ellipsoid.MOON);
    expect(sel!.cartographic.height).toBeCloseTo(
      Math.hypot(...sel!.position) - MOON_R,
      6,
    );
    expect(sel!.cartographic.height).toBeCloseTo(10_000, 3);
    expect(sel!.cartographic.latitude).toBeCloseTo(0, 9);
  });

  it("an anchor with no body gets no horizon culling", () => {
    const { world, view } = setup();
    const site = world.addAnchor("site");
    view.setCameraFromAnchor(site, moonPose(10_000));
    const [sel] = selectionViews(engine as never, world, site);
    expect(sel!.noBody).toBe(true);
    expect(sel!.ellipsoid).toBeUndefined();
    expect(sel!.cartographic).toEqual({
      longitude: 0,
      latitude: 0,
      height: Math.hypot(...sel!.position),
    });
  });

  it("a ×10 lift over Earth content leaves the Moon's selection view as it was", () => {
    // Review Focus 6: the Moon's route stays rigid.
    const world = newWorld();
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const itrf = catalog.get("ITRF");
    const lifted = curvilinearFrame(
      "lifted",
      itrf,
      verticalExaggeration({ factor: 10 }),
    );
    catalog.add(lifted);
    const resolver = createFramesResolver(catalog);
    const earth = world.bodyAnchor(EARTH);
    const moon = world.bodyAnchor(MOON);
    resolver.bindAnchor(earth, lifted);
    engine.cameras.setResolver(world, resolver);
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    views.push(view);
    engine.cameras.setRig(view, {
      position: { frame: itrf },
      orientation: { kind: "free" },
    });
    engine.cameras.update();
    const id = engine.scene.viewIds.get(view)!;
    world.curvilinearMaps.frame(
      [{ id, routes: view.anchorRoutes() }],
      Infinity,
      (m) => {
        throw new Error(m);
      },
    );
    // The Earth's anchor is across the lift: selected on drawn volumes, and
    // never horizon-culled. The Moon's is rigid: today's selection, horizon
    // culling on its own ellipsoid.
    expect(world.tileCurvilinearMap(earth, id)).toBeDefined();
    expect(world.tileCurvilinearMap(moon, id)).toBeUndefined();
    const eye = new Camera();
    eye.position.set([6_378_137 + 2000, 0, 0]);
    eye.direction.set([-1, 0, 0]);
    eye.orient(Float64Array.of(0, 0, 1));
    view.setCameraFromAnchor(earth, eye);
    const [selection] = selectionViews(engine as never, world, moon);
    expect(selection!.ellipsoid).toBe(Ellipsoid.MOON);
    expect(selection!.noBody).toBeUndefined();
    const [earths] = selectionViews(engine as never, world, earth);
    expect(earths!.ellipsoid).toBe(Ellipsoid.WGS84);
    // The Earth's cartographic is the true eye's, in the content's own frame.
    expect(earths!.cartographic).toEqual(
      Ellipsoid.WGS84.cartesianToCartographic(earths!.position, {
        longitude: 0,
        latitude: 0,
        height: 0,
      }),
    );
  });
});
