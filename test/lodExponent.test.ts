// The error exponent α (`View.lodExponent`, `CurvilinearMap.lodExponent`): selection
// uses the curvilinear map's stretch s as s^α. And the plain height scale, which has no
// profile, gives the direction-aware slopeMax (= its multiplier).
import { fakeEngine } from "./fakeGpu.ts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createFrameCatalog } from "../packages/frames/src/catalog.ts";
import { createFramesResolver } from "../packages/frames/src/resolver.ts";
import { curvilinearFrame } from "../packages/frames/src/curvilinearFrame.ts";
import { verticalExaggeration } from "../packages/core/src/georeference/heightCurvilinearMaps.ts";
import { EARTH } from "../packages/core/src/scene/Body.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import { OffscreenTarget } from "../packages/core/src/scene/renderTarget.ts";
import type { View } from "../packages/core/src/scene/View.ts";
import type { World } from "../packages/core/src/scene/World.ts";
import { selectionViews } from "../packages/core/src/scene/tileSelection.ts";
import {
  DEFAULT_LOD_EXPONENT,
  drawnTile,
  geometryRefines,
  lodExponentOf,
  terrainDrawnError,
  type DrawnTile,
} from "../packages/core/src/streaming/tileCurvilinearMap.ts";
import {
  regionFromJson,
  sphereFromObb,
} from "../packages/core/src/streaming/volumes.ts";
import type { Tile } from "../packages/core/src/streaming/Tile.ts";
import { parseAlpha } from "../packages/ui/src/urlAlpha.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";
import { at } from "./terrainRayFixtures.ts";

const LON = 0.3;
const LAT = 0.2;
const rectangle = {
  west: LON - 0.0005,
  east: LON + 0.0005,
  south: LAT - 0.0005,
  north: LAT + 0.0005,
};
const center = at(LON, LAT, 0);
const sphere = { center: center, radius: 4000 };
const east = [-Math.sin(LON), Math.cos(LON), 0];
const beside = Float64Array.from(
  [0, 1, 2].map((i) => center[i]! + east[i]! * 200_000),
);
const tile = (error: number) =>
  ({ geometricError: error, globe: { rectangle } }) as unknown as Tile;
const drawn = (extra: Partial<DrawnTile>): DrawnTile =>
  ({
    volume: { kind: "sphere", sphere },
    sigmaMax: 10,
    fit: 2,
    ...extra,
  }) as DrawnTile;

describe("the error exponent in terrain error", () => {
  it("α = 1 is today's rule, with and without a profile", () => {
    const a = drawn({ slopeMax: 10 });
    expect(terrainDrawnError(tile(100), a, beside, 100, 1)).toBe(
      terrainDrawnError(tile(100), a, beside),
    );
    const iso = drawn({});
    expect(terrainDrawnError(tile(100), iso, beside, 100, 1)).toBe(
      100 * 10 + 2,
    );
  });
  it("α = 0 is the affine error plus the fit", () => {
    expect(
      terrainDrawnError(tile(100), drawn({ slopeMax: 10 }), beside, 100, 0),
    ).toBe(102);
    expect(terrainDrawnError(tile(100), drawn({}), beside, 100, 0)).toBe(102);
  });
  it("α between is s^α", () => {
    const iso = drawn({});
    expect(terrainDrawnError(tile(100), iso, beside, 100, 0.5)).toBeCloseTo(
      100 * Math.sqrt(10) + 2,
      9,
    );
  });
});

describe("which exponent a view uses", () => {
  it("the route's own wins over the view's; both clamp; default 0.3", () => {
    expect(lodExponentOf({})).toBe(DEFAULT_LOD_EXPONENT);
    expect(DEFAULT_LOD_EXPONENT).toBe(0.3);
    expect(lodExponentOf({ lodExponent: 0.25 })).toBe(0.25);
    expect(
      lodExponentOf({
        lodExponent: 0.25,
        curvilinearMap: { lodExponent: 0.75 },
      }),
    ).toBe(0.75);
    expect(lodExponentOf({ lodExponent: 0.25, curvilinearMap: {} })).toBe(0.25);
    expect(lodExponentOf({ lodExponent: 3 })).toBe(1);
    expect(lodExponentOf({ curvilinearMap: { lodExponent: -1 } })).toBe(0);
  });
});

describe("&alpha=", () => {
  it("parses and clamps", () => {
    expect(parseAlpha(null)).toBeUndefined();
    expect(parseAlpha("")).toBeUndefined();
    expect(parseAlpha("x")).toBeUndefined();
    expect(parseAlpha("0.5")).toBe(0.5);
    expect(parseAlpha("2")).toBe(1);
    expect(parseAlpha("-1")).toBe(0);
  });
});

let engine: Engine;
const views: View[] = [];
const worlds: World[] = [];
beforeAll(async () => {
  engine = await fakeEngine();
});
afterEach(() => {
  for (const view of views.splice(0)) {
    engine.removeView(view);
  }
  for (const world of worlds.splice(0)) {
    engine.removeWorld(world);
  }
  vi.restoreAllMocks();
});

function exaggerated(factor: number, scaleValue?: number) {
  const world = engine.createWorld({ maxDraws: 8 });
  worlds.push(world);
  const parameter =
    scaleValue === undefined
      ? undefined
      : world.createPlacementParameter(scaleValue, { range: [0, 1] });
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF");
  const frame = curvilinearFrame(
    "exaggerated",
    itrf,
    verticalExaggeration({
      factor,
      ...(parameter && { scale: parameter }),
    }),
  );
  catalog.add(frame);
  const resolver = createFramesResolver(catalog);
  const earth = world.bodyAnchor(EARTH);
  resolver.bindAnchor(earth, frame);
  engine.cameras.setResolver(world, resolver);
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  views.push(view);
  engine.cameras.setRig(view, {
    position: { frame: itrf },
    orientation: { kind: "free" },
  });
  engine.cameras.update();
  world.curvilinearMaps.frame(
    [{ id: engine.scene.viewIds.get(view)!, routes: view.anchorRoutes() }],
    Infinity,
    (m) => {
      throw new Error(m);
    },
  );
  const step = () => {
    engine.cameras.update();
    world.curvilinearMaps.frame(
      [{ id: engine.scene.viewIds.get(view)!, routes: view.anchorRoutes() }],
      Infinity,
      (m) => {
        throw new Error(m);
      },
    );
  };
  return { world, view, earth, parameter, step };
}

describe("the plain height scale's slopeMax", () => {
  it.each([1, 4, 10])("is the multiplier (×%i) with no profile", (k) => {
    const { world, earth } = exaggerated(k);
    const curvilinearMap = world.tileCurvilinearMap(earth)!;
    expect(curvilinearMap.heightRange).toBeDefined();
    const region = regionFromJson([
      LON - 0.001,
      LAT - 0.001,
      LON + 0.001,
      LAT + 0.001,
      -100,
      3000,
    ]);
    const t = {
      volume: { kind: "region", region, sphere: sphereFromObb(region.obb) },
    } as unknown as Tile;
    const d = drawnTile(t, curvilinearMap);
    expect(d.slopeMax).toBeCloseTo(k, 9);
    const range = curvilinearMap.heightRange!(-100, 3000);
    expect(range.max).toBeCloseTo(3000 * k, 6);
    expect(range.min).toBeCloseTo(-100 * k, 6);
  });
});

describe("the view's exponent reaches selection", () => {
  it("is in the selection view only when not the default, and clamps", () => {
    const { view, world, earth } = exaggerated(2);
    const sel = () =>
      selectionViews(engine as never, world, earth)[0] as
        { lodExponent?: number } | undefined;
    expect(view.lodExponent).toBe(DEFAULT_LOD_EXPONENT);
    expect(sel()?.lodExponent).toBeUndefined();
    view.lodExponent = 0.4;
    expect(sel()?.lodExponent).toBe(0.4);
    view.lodExponent = 7;
    expect(view.lodExponent).toBe(1);
  });
});

describe("upsampled tiles carry no stretch", () => {
  const mk = (extra: object, children: object[] = []) =>
    ({ geometricError: 100, globe: {}, children, ...extra }) as unknown as Tile;
  it("geometryRefines is false for upsampled tiles and for tiles whose children all are", () => {
    expect(geometryRefines(mk({}))).toBe(true);
    expect(geometryRefines(mk({}, [{ fillFromParent: true }, {}]))).toBe(true);
    expect(geometryRefines(mk({ fillFromParent: true }))).toBe(false);
    expect(geometryRefines(mk({ globe: { upsampledFrom: {} } }))).toBe(false);
    expect(
      geometryRefines(
        mk({}, [{ fillFromParent: true }, { fillFromParent: true }]),
      ),
    ).toBe(false);
    expect(geometryRefines({ globe: undefined } as unknown as Tile)).toBe(true);
  });
  it("an upsampled tile's error under ×10 is its affine error; a data tile keeps the stretch", () => {
    const d = drawn({ slopeMax: 10 });
    const up = mk({ fillFromParent: true });
    const alpha = geometryRefines(up) ? 1 : 0;
    expect(terrainDrawnError(up, d, beside, 100, alpha)).toBe(100 + 2);
    const data = mk({});
    expect(
      terrainDrawnError(data, d, beside, 100, geometryRefines(data) ? 1 : 0),
    ).toBeGreaterThan(900);
  });
});

describe("the closed-form range takes the scale's exact value", () => {
  it("is exact at the current multiplier, and the drawn volume is made again for a move inside a bucket", () => {
    const { world, earth, parameter, step } = exaggerated(10, 0.9);
    const curvilinearMap = world.tileCurvilinearMap(earth)!;
    const region = regionFromJson([
      LON - 0.001,
      LAT - 0.001,
      LON + 0.001,
      LAT + 0.001,
      1796,
      1819,
    ]);
    const t = {
      volume: { kind: "region", region, sphere: sphereFromObb(region.obb) },
    } as unknown as Tile;
    const k1 = 1 + 0.9 * 9;
    expect(curvilinearMap.heightRange!(1796, 1819).min).toBeCloseTo(
      1796 * k1,
      6,
    );
    expect(drawnTile(t, curvilinearMap).slopeMax).toBeCloseTo(k1, 9);
    const version = curvilinearMap.scaleVersion;
    parameter!.value = 0.9005;
    step();
    const again = world.tileCurvilinearMap(earth)!;
    const k2 = 1 + 0.9005 * 9;
    expect(again.scaleVersion).toBeGreaterThan(version!);
    expect(again.heightRange!(1796, 1819).min).toBeCloseTo(1796 * k2, 6);
    expect(drawnTile(t, again).slopeMax).toBeCloseTo(k2, 9);
  });
});

describe("distance ignores skirts, culling keeps them", () => {
  it("a height-scaled terrain tile's surface volume is inside its cull volume and smaller by the skirt reach", () => {
    const { world, earth } = exaggerated(10);
    const curvilinearMap = world.tileCurvilinearMap(earth)!;
    const region = regionFromJson([
      LON - 0.001,
      LAT - 0.001,
      LON + 0.001,
      LAT + 0.001,
      1796,
      1819,
    ]);
    const t = {
      volume: { kind: "region", region, sphere: sphereFromObb(region.obb) },
      globe: { refit: { levelError: 20 }, rectangle },
    } as unknown as Tile;
    const d = drawnTile(t, curvilinearMap);
    const cull = (d.volume as { sphere: { radius: number } }).sphere;
    const surface = (d.surface as { sphere: { radius: number } }).sphere;
    // Skirts reach 5 × 20 m below, stretched by slopeMax (10).
    expect(cull.radius - surface.radius).toBeCloseTo(10 * 100, 6);
  });
});
