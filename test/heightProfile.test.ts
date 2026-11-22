// A vertical exaggeration with a ceiling stays on terrain's exact per-vertex
// height path (task 12, fix 1): the profile in height (camera/heightProfile.ts,
// shaders/heightProfile.slang) agrees with the georeference built-in, terrain
// is drawn by its term with no fit and no compiled route, and a tile's drawn
// heights are bounded in closed form.
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  drawnHeight,
  drawnHeightRange,
  liftedPart,
} from "../packages/core/src/camera/heightProfile.ts";
import { createFrameCatalog } from "../packages/frames/src/catalog.ts";
import { createFramesResolver } from "../packages/frames/src/resolver.ts";
import { curvilinearFrame } from "../packages/frames/src/curvilinearFrame.ts";
import { verticalExaggeration } from "../packages/core/src/georeference/heightCurvilinearMaps.ts";
import {
  verticalExaggerationDescriptor,
  verticalExaggerationEdge,
} from "../packages/core/src/georeference/verticalExaggeration.ts";
import {
  HEIGHT_PROFILE_ATTRIBUTE,
  heightNormalInfo,
} from "../packages/core/src/globe/heightNormal.ts";
import { upsampleTerrainTile } from "../packages/core/src/globe/quantizedMesh.ts";
import { Ellipsoid } from "../packages/core/src/math/ellipsoid.ts";
import * as m4 from "../packages/core/src/math/mat4.ts";
import {
  PlacementTable,
  CURVILINEAR_KIND,
  blockRows,
} from "../packages/core/src/scene/placementTable.ts";
import { attributeHash } from "../packages/core/src/render/layout.ts";
import {
  constantWeight,
  type CurvilinearTerms,
} from "../packages/core/src/scene/curvilinearTerms.ts";
import { EARTH } from "../packages/core/src/scene/Body.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import type { MeshData } from "../packages/core/src/scene/meshes.ts";
import { OffscreenTarget } from "../packages/core/src/scene/renderTarget.ts";
import type { View } from "../packages/core/src/scene/View.ts";
import {
  placeWithTerms,
  weightOf,
} from "../packages/core/src/scene/curvilinearEvaluate.ts";
import type { World } from "../packages/core/src/scene/World.ts";
import { drawTerms } from "../packages/core/src/scene/world/placements.ts";
import type {
  AnchorHandle,
  DrawHandle,
} from "../packages/core/src/scene/world/types.ts";
import {
  regionFromJson,
  sphereFromObb,
} from "../packages/core/src/streaming/volumes.ts";
import { drawnTile } from "../packages/core/src/streaming/tileCurvilinearMap.ts";
import type { Tile } from "../packages/core/src/streaming/Tile.ts";
import type { GltfAsset } from "../packages/core/src/io/gltfTypes.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { loadIr } from "../packages/core/src/transform/lazyIr.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";
import { gridTile } from "./terrainRayFixtures.ts";

const K = 10;
const BASE = 150;
const CEILING = 9000;
const BAND = 1000;

const wgs84 = Ellipsoid.WGS84;

function heightOf(p: ArrayLike<number>): number {
  const c = { longitude: 0, latitude: 0, height: 0 };
  wgs84.cartesianToCartographic(Float64Array.from(p), c);
  return c.height;
}

describe("the profile in height", () => {
  it("agrees with the built-in's forward in float64: below the band, in it, above the ceiling, and below the ellipsoid", () => {
    const descriptor = verticalExaggerationDescriptor();
    const params = {
      factor: K,
      ceiling: CEILING,
      baseHeight: BASE,
      band: BAND,
    };
    const out = new Float64Array(3);
    for (const h of [-400, 0, 150, 7000, 8000, 8500, 9000, 9500, 20000]) {
      const p = wgs84.cartographicToCartesian(
        { longitude: 0.3, latitude: 0.2, height: h },
        new Float64Array(3),
      );
      descriptor.forward(p, params, out);
      const [h2, slope] = drawnHeight(h, K, BASE, CEILING, BAND);
      expect(heightOf(out)).toBeCloseTo(h2, 6);
      // The map moves a point along its normal and nowhere else.
      const [g, dg] = liftedPart(h, BASE, CEILING, BAND);
      expect(h2).toBeCloseTo(h + (K - 1) * g, 9);
      expect(slope).toBeCloseTo(1 + (K - 1) * dg, 12);
    }
    // The built-in's own spec is the same profile (one edge, the same factor).
    expect(
      verticalExaggerationEdge({
        factor: K,
        ceiling: CEILING,
        baseHeight: BASE,
        band: BAND,
      }).spec,
    ).toBeDefined();
  });

  it("is declared by the curvilinear map with its ceiling and band, and is nondecreasing in height", () => {
    const curvilinearMap = verticalExaggeration({
      factor: K,
      baseHeight: BASE,
      ceiling: CEILING,
    });
    expect(curvilinearMap.heightScale).toMatchObject({
      kind: "heightScale",
      factor: K,
      baseHeight: BASE,
      profile: { ceiling: CEILING, band: 0.2 * (CEILING - BASE) },
    });
    expect(verticalExaggeration({ factor: K }).heightScale?.profile).toBe(
      undefined,
    );
    let last = -Infinity;
    for (let h = -500; h < 15000; h += 25) {
      const [h2] = drawnHeight(h, K, BASE, CEILING, BAND);
      expect(h2).toBeGreaterThanOrEqual(last);
      last = h2;
    }
  });

  it("maps a tile's heights to [g(hMin), g(hMax)] and holds every sampled height, at any factor in a bucket", () => {
    const [lo, hi] = drawnHeightRange(-300, 9700, K, K, BASE, CEILING, BAND);
    expect(lo).toBeCloseTo(drawnHeight(-300, K, BASE, CEILING, BAND)[0], 9);
    expect(hi).toBeCloseTo(drawnHeight(9700, K, BASE, CEILING, BAND)[0], 9);
    const [a, b] = drawnHeightRange(-300, 9700, 2, K, BASE, CEILING, BAND);
    for (let h = -300; h <= 9700; h += 3.7) {
      for (const k of [2, 3.3, 6, K]) {
        const [d] = drawnHeight(h, k, BASE, CEILING, BAND);
        expect(d).toBeGreaterThanOrEqual(a - 1e-9);
        expect(d).toBeLessThanOrEqual(b + 1e-9);
      }
    }
  });
});

let engine: Engine;
const views: View[] = [];
const worlds: World[] = [];

beforeAll(async () => {
  engine = await fakeEngine();
  // The first compiled route loads Cesium IR (CS-794); a plain tile here expects its route in one step.
  await loadIr();
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

interface Setup {
  world: World;
  view: View;
  earth: AnchorHandle;
  fits: { count: number };
  step(): void;
}

/** A world whose Earth content is exaggerated ×10 with a ceiling (and the built-in's compiled route available). */
function setup(): Setup {
  const world = engine.createWorld({ maxDraws: 64 });
  worlds.push(world);
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF");
  const exaggerated = curvilinearFrame(
    "exaggerated",
    itrf,
    verticalExaggeration({
      factor: K,
      baseHeight: BASE,
      ceiling: CEILING,
      band: BAND,
    }),
  );
  catalog.add(exaggerated);
  const resolver = createFramesResolver(catalog);
  const earth = world.bodyAnchor(EARTH);
  resolver.bindAnchor(earth, exaggerated);
  engine.cameras.setResolver(world, resolver);
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  views.push(view);
  engine.cameras.setRig(view, {
    position: { frame: itrf },
    orientation: { kind: "free" },
  });
  const fits = { count: 0 };
  const run = world.curvilinearMaps.cache.run.bind(world.curvilinearMaps.cache);
  vi.spyOn(world.curvilinearMaps.cache, "run").mockImplementation(
    (budget, now) => {
      const n = run(budget, now);
      fits.count += n;
      return n;
    },
  );
  const s: Setup = {
    world,
    view,
    earth,
    fits,
    step() {
      engine.cameras.update();
      world.curvilinearMaps.frame(
        [{ id: engine.scene.viewIds.get(view)!, routes: view.anchorRoutes() }],
        Infinity,
        (message) => {
          throw new Error(message);
        },
      );
    },
  };
  s.step();
  return s;
}

const RECT = { west: 0.3, south: 0.2, east: 0.3004, north: 0.2004 };

/** A tile of terrain from 400 m below the ellipsoid to 10,000 m (through the band and past the ceiling), as the worker makes it under a profile. */
function terrain(): { asset: GltfAsset; mesh: MeshData } {
  const { heights } = gridTile(
    RECT,
    9,
    (lon, lat) =>
      -400 + 10400 * (0.5 + 0.5 * Math.sin(lon * 9000 + lat * 5000)),
  );
  const { asset } = upsampleTerrainTile(heights, RECT, RECT, 50, {
    heightNormal: "profile",
  });
  const m = asset.meshes[0]!;
  return {
    asset,
    mesh: {
      positions: m.positions,
      normals: m.normals!,
      uvs: m.uvs!,
      indices: m.indices,
      skirtStart: m.skirtStart!,
      attributes: m.attributes!,
    },
  };
}

describe("a profile term's block", () => {
  it("is laid out as placement.slang reads it: the kind, the attribute's hash, and a body row of base, ceiling and band", () => {
    const device = {
      createBuffer: () => ({ destroy() {} }),
      queue: { writeBuffer() {} },
    } as unknown as GPUDevice;
    const table = new PlacementTable(device, () => {});
    const terms: CurvilinearTerms = [
      {
        term: {
          kind: "attribute",
          semantic: HEIGHT_PROFILE_ATTRIBUTE,
          absolute: false,
          maxDistance: 1,
          profile: { base: BASE, ceiling: CEILING, band: BAND },
        },
        weight: constantWeight(K - 1),
      },
    ];
    expect(blockRows(terms)).toBe(1 + 3 + 1);
    const at = table.add(terms, () => 0);
    const block = table.words(at, blockRows(terms));
    expect(block.u32[0]).toBe(1);
    expect(block.u32[4]).toBe(CURVILINEAR_KIND.profile);
    expect(block.f32[5]).toBe(K - 1);
    expect(block.u32[6]).toBe(attributeHash(HEIGHT_PROFILE_ATTRIBUTE));
    expect(block.u32[7]).toBe(4);
    expect(Array.from(block.f32.subarray(16, 19))).toEqual([
      BASE,
      CEILING,
      BAND,
    ]);
    const slang = readFileSync(
      new URL("../packages/core/src/shaders/placement.slang", import.meta.url),
      "utf8",
    );
    expect(slang).toMatch(
      new RegExp(
        String.raw`CURVILINEAR_PROFILE\s*=\s*${CURVILINEAR_KIND.profile}u`,
      ),
    );
  });
});

describe("terrain under a ceiling", () => {
  it("carries (n̂, h) and is drawn at the profile's heights with no fit and no compiled route", () => {
    const s = setup();
    const { asset, mesh } = terrain();
    const attribute = mesh.attributes![HEIGHT_PROFILE_ATTRIBUTE]!;
    expect(attribute.components).toBe(4);
    const info = heightNormalInfo(asset)!;
    expect(info.profile).toBe(true);
    const center = asset.draws[0]!.matrix;
    const origin = Float64Array.of(center[12]!, center[13]!, center[14]!);
    const tile = s.world.addDraw({
      mesh: s.world.addMesh(mesh),
      parent: s.earth,
      origin,
    });
    s.world.setDrawGeometricError(tile, 5);
    s.world.setDrawHeightNormal(tile, info);
    // Content that carries no heights still takes the built-in's compiled route.
    const plain = s.world.addDraw({
      mesh: s.world.addMesh({
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
      }),
      parent: s.earth,
      origin,
    });
    s.step();
    expect(s.world.curvilinearMaps.status(tile)).toMatchObject({
      state: "fitted",
      exact: true,
    });
    expect(s.fits.count).toBe(0);
    expect(s.world.curvilinearMaps.routes.has(tile.index)).toBe(false);
    expect(s.world.curvilinearMaps.routes.has(plain.index)).toBe(true);

    const terms = drawTerms(s.world, tile as DrawHandle)!;
    expect(terms).toHaveLength(1);
    const { term, weight } = terms[0]!;
    expect(term).toMatchObject({
      kind: "attribute",
      semantic: HEIGHT_PROFILE_ATTRIBUTE,
      profile: { base: BASE, ceiling: CEILING, band: BAND },
    });
    expect(weightOf(weight)).toBeCloseTo(K - 1, 9);
    // Every vertex, the ones below the ellipsoid and above the ceiling too,
    // is at the profile's height (float32 vertices: centimeters).
    let below = 0;
    let above = 0;
    const out = new Float64Array(3);
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const v = [0, 1, 2].map((a) => mesh.positions[i * 3 + a]!);
      placeWithTerms(
        terms,
        v,
        (semantic) =>
          semantic === HEIGHT_PROFILE_ATTRIBUTE
            ? [0, 1, 2, 3].map((k) => attribute.data[i * 4 + k]!)
            : undefined,
        out,
      );
      const place = (p: ArrayLike<number>) =>
        m4.transformPoint(
          new Float64Array(3),
          s.world.drawMatrix(tile)!,
          Float64Array.from(p),
        );
      const trueHeight = heightOf(place(v));
      const at = place(out);
      expect(heightOf(at)).toBeCloseTo(
        drawnHeight(trueHeight, K, BASE, CEILING, BAND)[0],
        1,
      );
      below += trueHeight < 0 ? 1 : 0;
      above += trueHeight > CEILING ? 1 : 0;
    }
    expect(below).toBeGreaterThan(0);
    expect(above).toBeGreaterThan(0);
    expect(s.fits.count).toBe(0);
  });

  it("is selected on a closed-form drawn volume that holds its region's drawn heights, with no sampled bounds", () => {
    const s = setup();
    const curvilinearMap = s.world.tileCurvilinearMap(s.earth)!;
    expect(curvilinearMap.heightRange).toBeDefined();
    const bounds = vi.spyOn(curvilinearMap, "bounds");
    const [hMin, hMax] = [-400, 10000];
    const region = regionFromJson([
      RECT.west,
      RECT.south,
      RECT.east,
      RECT.north,
      hMin,
      hMax,
    ]);
    const tile = {
      volume: { kind: "region", region, sphere: sphereFromObb(region.obb) },
    } as unknown as Tile;
    const drawn = drawnTile(tile, curvilinearMap);
    expect(bounds).not.toHaveBeenCalled();
    const sphere = (
      drawn.volume as { sphere: { center: ArrayLike<number>; radius: number } }
    ).sphere;
    // Densely sampled points of the region, drawn through the profile, are inside.
    let worst = 0;
    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j <= 8; j++) {
        for (let k = 0; k <= 40; k++) {
          const h = hMin + ((hMax - hMin) * k) / 40;
          const p = wgs84.cartographicToCartesian(
            {
              longitude: RECT.west + ((RECT.east - RECT.west) * i) / 8,
              latitude: RECT.south + ((RECT.north - RECT.south) * j) / 8,
              height: h,
            },
            new Float64Array(3),
          );
          const [h2] = drawnHeight(h, K, BASE, CEILING, BAND);
          const n = wgs84.geodeticSurfaceNormal(p, new Float64Array(3))!;
          const q = [0, 1, 2].map((a) => p[a]! + (h2 - h) * n[a]!);
          worst = Math.max(
            worst,
            Math.hypot(
              q[0]! - sphere.center[0]!,
              q[1]! - sphere.center[1]!,
              q[2]! - sphere.center[2]!,
            ),
          );
        }
      }
    }
    expect(worst).toBeLessThanOrEqual(sphere.radius);
    // And the tile's height range is the profile's, not a box of samples.
    const range = curvilinearMap.heightRange!(hMin, hMax);
    expect(range.min).toBeCloseTo(
      drawnHeight(hMin, K, BASE, CEILING, BAND)[0],
      9,
    );
    expect(range.max).toBeCloseTo(
      drawnHeight(hMax, K, BASE, CEILING, BAND)[0],
      9,
    );
    expect(drawn.sigmaMax).toBeGreaterThanOrEqual(1);
    // The vertical stretch is the profile's own dh'/dh, never past k.
    expect(range.slopeMax).toBeGreaterThanOrEqual(1);
    expect(range.slopeMax).toBeLessThanOrEqual(K + 1e-9);
    expect(drawn.slopeMax).toBe(range.slopeMax);
  });
});
