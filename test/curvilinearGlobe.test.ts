// The globe, anchored content and instances across a curvilinear map (docs/design/geometry-through-placement-review.md,
// increment 4; docs/design/transform-graph.md). The acceptance test's world: the Earth's content sits
// in a node under ITRF that exaggerates heights ten times (`verticalExaggeration`,
// so no Jacobian is written by hand), the camera stays on ITRF, and a globe's terrain tile, a tileset, a model with
// instances and a billboard all draw, with nothing set per item. Checked on
// the CPU against the route's own float64 map, as curvilinearWorld.test.ts does;
// the GPU side is spikes/curvilinearGlobe.html.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { routeForward, type Route } from "../packages/next/src/camera/route.ts";
import { createFrameCatalog } from "../packages/next/src/frames/catalog.ts";
import { verticalExaggeration } from "../packages/next/src/georeference/heightCurvilinearMaps.ts";
import { createFramesResolver } from "../packages/next/src/frames/resolver.ts";
import { curvilinearFrame } from "../packages/next/src/frames/curvilinearFrame.ts";
import { GlobeBudgetedSelection } from "../packages/next/src/globe/GlobeBudgeted.ts";
import { GlobeStepwiseSelection } from "../packages/next/src/globe/GlobeStepwise.ts";
import {
  HEIGHT_NORMAL_ATTRIBUTE,
  heightNormalInfo,
} from "../packages/next/src/globe/heightNormal.ts";
import {
  flatTerrainTile,
  upsampleTerrainTile,
} from "../packages/next/src/globe/quantizedMesh.ts";
import {
  TerrainSource,
  type TerrainLoader,
} from "../packages/next/src/globe/TerrainSource.ts";
import type { GltfAsset } from "../packages/next/src/io/gltfTypes.ts";
import { Ellipsoid } from "../packages/next/src/math/ellipsoid.ts";
import * as m4 from "../packages/next/src/math/mat4.ts";
import { readInstanceMatrix } from "../packages/next/src/render/layout.ts";
import { EARTH } from "../packages/next/src/scene/Body.ts";
import type { Engine } from "../packages/next/src/scene/Engine.ts";
import {
  createBillboard,
  type MeshData,
} from "../packages/next/src/scene/meshes.ts";
import { OffscreenTarget } from "../packages/next/src/scene/renderTarget.ts";
import type { PlacementParameter } from "../packages/next/src/scene/placement.ts";
import type { View } from "../packages/next/src/scene/View.ts";
import {
  affineLattice,
  anchorCorrector,
  anchorLattice,
  correctedInstance,
  invert3,
  linearPart,
  polarRotation,
} from "../packages/next/src/scene/curvilinearAnchor.ts";
import {
  placeWithTerms,
  weightOf,
} from "../packages/next/src/scene/curvilinearEvaluate.ts";
import type { World } from "../packages/next/src/scene/World.ts";
import { drawTerms } from "../packages/next/src/scene/world/placements.ts";
import type {
  AnchorHandle,
  DrawHandle,
} from "../packages/next/src/scene/world/types.ts";
import type { SelectionView } from "../packages/next/src/streaming/Stepwise.ts";
import type { Tile } from "../packages/next/src/streaming/Tile.ts";
import { drawnTile } from "../packages/next/src/streaming/tileCurvilinearMap.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";
import { fittedOnly } from "./fittedOnly.ts";
import { at as ecef, contains, gridTile } from "./terrainRayFixtures.ts";

const R = 6371e3;
const K = 10;
const URL_ = "https://tiles.test/anchored/tileset.json";
const TILE_ORIGIN = [R + 3000, 0, 0];
const UP = [0.6, 0.7, Math.sqrt(1 - 0.36 - 0.49)] as const;
const ORIGIN = Float64Array.from(UP, (u) => u * (R + 3000));

const TILESET = {
  asset: { version: "1.1" },
  geometricError: 100,
  root: {
    geometricError: 640,
    refine: "REPLACE",
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...TILE_ORIGIN, 1],
    boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
    content: { uri: "tile.gltf" },
  },
};

function triangle(): GltfAsset {
  return {
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
  };
}

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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

interface Setup {
  world: World;
  view: View;
  earth: AnchorHandle;
  scale: PlacementParameter;
  fits: { count: number };
  route(): Route;
  step(budget?: number): boolean;
}

/** A world whose Earth content sits in `exaggerated`, ×10 under ITRF on the WGS84 ellipsoid, with the strength a ranged slider. */
function setup(): Setup {
  const world = engine.createWorld({ maxDraws: 64 });
  worlds.push(world);
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF");
  const scale = world.createPlacementParameter(1, { range: [0, 1] });
  const exaggeration = fittedOnly(verticalExaggeration({ factor: K, scale }));
  const exaggerated = curvilinearFrame("exaggerated", itrf, exaggeration);
  catalog.add(exaggerated);
  const resolver = createFramesResolver(catalog);
  const earth = world.bodyAnchor(EARTH);
  resolver.bindAnchor(earth, exaggerated);
  engine.cameras.setResolver(world, resolver);
  // Exact, as-drawn selection (α = 1), which these tests check, not the default.
  const view = engine.addView({
    target: new OffscreenTarget(64, 48),
    world,
    lodExponent: 1,
  });
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
    scale,
    fits,
    route: () => view.anchorRoute(earth)!,
    step(budget = Infinity) {
      engine.cameras.update();
      return world.curvilinearMaps.frame(
        [{ id: engine.scene.viewIds.get(view)!, routes: view.anchorRoutes() }],
        budget,
        (message) => {
          throw new Error(message);
        },
      );
    },
  };
  s.step();
  return s;
}

/** Where the draw's terms (and its matrix) put its mesh vertex `i`. */
function drawn(
  s: Setup,
  draw: DrawHandle,
  mesh: MeshData,
  i: number,
): Float64Array {
  const terms = drawTerms(s.world, draw)!;
  const v = [0, 1, 2].map((a) => mesh.positions[i * 3 + a]!);
  const attributes = mesh.attributes;
  const out = new Float64Array(3);
  placeWithTerms(
    terms,
    v,
    (semantic) => {
      const a = attributes?.[semantic];
      return a ? [0, 1, 2].map((k) => a.data[i * 3 + k]!) : undefined;
    },
    out,
  );
  return m4.transformPoint(
    new Float64Array(3),
    s.world.drawMatrix(draw)!,
    out as unknown as Float64Array,
  );
}

const distance = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** A tile of terrain over (0.3, 0.2) with heights 100 to 3,000 m, as the worker would decode it for a curvilinear globe. */
function terrainAsset(): GltfAsset {
  const rect = { west: 0.3, south: 0.2, east: 0.3004, north: 0.2004 };
  const { heights } = gridTile(
    rect,
    9,
    (lon, lat) => 100 + 2900 * (0.5 + 0.5 * Math.sin(lon * 9000 + lat * 5000)),
  );
  return upsampleTerrainTile(heights, rect, rect, 50, { heightNormal: true })
    .asset;
}

function meshOf(asset: GltfAsset): MeshData {
  const m = asset.meshes[0]!;
  return {
    positions: m.positions,
    normals: m.normals!,
    uvs: m.uvs!,
    indices: m.indices,
    skirtStart: m.skirtStart!,
    attributes: m.attributes!,
  };
}

describe("a terrain tile's height term", () => {
  it("is held until the next frame after its upload, then drawn exact with no fit", () => {
    const s = setup();
    const asset = terrainAsset();
    const center = asset.draws[0]!.matrix;
    const tiles = [0, 1, 2].map(() => {
      const draw = s.world.addDraw({
        mesh: s.world.addMesh(meshOf(asset)),
        parent: s.earth,
        origin: Float64Array.of(center[12]!, center[13]!, center[14]!),
      });
      s.world.setDrawGeometricError(draw, 5);
      s.world.setDrawHeightNormal(draw, heightNormalInfo(asset)!);
      return draw;
    });
    expect(tiles.map((d) => s.world.curvilinearMaps.status(d)?.state)).toEqual([
      "pending",
      "pending",
      "pending",
    ]);
    // Even with no time for fits, exact tiles need none.
    expect(s.step(0)).toBe(false);
    expect(tiles.map((d) => s.world.curvilinearMaps.status(d))).toEqual(
      tiles.map(() =>
        expect.objectContaining({ state: "fitted", exact: true }),
      ),
    );
    expect(s.fits.count).toBe(0);
  });

  it("is what the worker makes: h·n̂ with the vertex on the ellipsoid without it", () => {
    const asset = terrainAsset();
    const mesh = meshOf(asset);
    const center = asset.draws[0]!.matrix;
    const attribute = mesh.attributes![HEIGHT_NORMAL_ATTRIBUTE]!;
    expect(attribute.components).toBe(3);
    const carto = { longitude: 0, latitude: 0, height: 0 };
    let tallest = 0;
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const foot = [0, 1, 2].map(
        (a) =>
          center[12 + a]! +
          mesh.positions[i * 3 + a]! -
          attribute.data[i * 3 + a]!,
      );
      Ellipsoid.WGS84.cartesianToCartographic(
        foot as unknown as Float64Array,
        carto,
      );
      expect(Math.abs(carto.height)).toBeLessThan(1e-2);
      tallest = Math.max(
        tallest,
        Math.hypot(...[0, 1, 2].map((a) => attribute.data[i * 3 + a]!)),
      );
    }
    expect(heightNormalInfo(asset)!.maxDistance).toBeCloseTo(tallest, 3);
    // Without the request the tile is as it was.
    const plain = flatTerrainTile(
      { west: 0, south: 0, east: 0.1, north: 0.1 },
      50,
      5,
    );
    expect(heightNormalInfo(plain.asset)).toBeUndefined();
    const asked = flatTerrainTile(
      { west: 0, south: 0, east: 0.1, north: 0.1 },
      50,
      5,
      { heightNormal: true },
    );
    expect(heightNormalInfo(asked.asset)).toBeDefined();
  });
});

describe("the acceptance world", () => {
  it("draws terrain, a tileset, a model with instances and a billboard under ×10 heights", async () => {
    const s = setup();
    const { world, earth } = s;
    const route = s.route();
    expect(route.steps.map((x) => x.kind)).toEqual(["curvilinear"]);
    const errors: unknown[] = [];

    // Terrain: exact in height, with no fit.
    const asset = terrainAsset();
    const terrain = meshOf(asset);
    const center = asset.draws[0]!.matrix;
    const tile = world.addDraw({
      mesh: world.addMesh(terrain),
      parent: earth,
      origin: Float64Array.of(center[12]!, center[13]!, center[14]!),
    });
    world.setDrawGeometricError(tile, 5);
    world.setDrawHeightNormal(tile, heightNormalInfo(asset)!);
    // A tile without the attribute is fitted like any.
    const plainMesh: MeshData = {
      positions: terrain.positions,
      normals: terrain.normals,
      indices: terrain.indices,
    };
    const fitted = world.addDraw({
      mesh: world.addMesh(plainMesh),
      parent: earth,
      origin: Float64Array.of(center[12]!, center[13]!, center[14]!),
    });
    world.setDrawGeometricError(fitted, 5);

    // A tileset (vertex), its tile's origin 3 km up.
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(TILESET), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
    const tileset = await engine.addTileset(world, URL_);
    const selection: SelectionView = {
      id: 0,
      position: new Float64Array([R + 4000, 0, 0]),
      direction: new Float64Array([-1, 0, 0]),
      cartographic: { longitude: 0, latitude: 0, height: 4000 },
      planes: new Float64Array(0),
      sseDenominator: 2 * Math.tan(Math.PI / 6),
      lodExponent: 1, // exact, as-drawn selection, which these tests check
      height: 4000,
    };
    for (let i = 0; i < 100 && tileset.root.state !== "ready"; i++) {
      tileset.update([selection]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(tileset.root.state).toBe("ready");
    const tileDraws = tileset.root.placement!.draws;

    // A model with instances.
    const quad: MeshData = {
      positions: Float32Array.of(-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0),
      indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
    };
    const base = [0, 0, 0, 100, 0, 0, 0, 100, 250];
    const matrices = new Float32Array(48);
    for (let k = 0; k < 3; k++) {
      matrices.set(m4.mat4(), k * 16);
      matrices.set(base.slice(k * 3, k * 3 + 3), k * 16 + 12);
    }
    const model = world.addDraw({
      mesh: world.addMesh(quad),
      parent: earth,
      origin: ORIGIN,
      instances: { matrices },
    });

    // A billboard.
    const billboard = world.addDraw({
      mesh: world.addMesh(createBillboard()),
      parent: earth,
      origin: ORIGIN.map((v) => v * 1.0001) as unknown as Float64Array,
      billboard: { size: 24 },
    });

    // Everything is held until it is drawn curvilinear, then every kind draws.
    expect(world.curvilinearMaps.status(tile)?.state).toBe("pending");
    expect(world.curvilinearMaps.status(model)?.state).toBe("pending");
    expect(s.step()).toBe(false);
    for (const draw of [tile, fitted, ...tileDraws, model, billboard]) {
      expect(
        world.curvilinearMaps.status(draw)?.state,
        `draw ${draw.index}`,
      ).toBe("fitted");
    }
    expect(errors).toEqual([]);

    // Terrain: exact, and the vertices are where the route puts them.
    const fitsBefore = s.fits.count;
    expect(world.curvilinearMaps.status(tile)).toMatchObject({
      exact: true,
      at: "vertex",
    });
    const terms = drawTerms(world, tile)!;
    expect(terms).toHaveLength(1);
    expect(terms[0]!.term.kind).toBe("attribute");
    expect(weightOf(terms[0]!.weight)).toBeCloseTo(K - 1, 12);
    const matrix = world.drawMatrix(tile)!;
    const where = (i: number) =>
      m4.transformPoint(
        new Float64Array(3),
        matrix,
        Float64Array.of(...[0, 1, 2].map((a) => terrain.positions[i * 3 + a]!)),
      );
    let worst = 0;
    for (let i = 0; i < terrain.positions.length / 3; i++) {
      worst = Math.max(
        worst,
        distance(drawn(s, tile, terrain, i), routeForward(route, where(i))),
      );
    }
    expect(worst).toBeLessThan(2e-3);
    expect(world.curvilinearMaps.status(fitted)).toMatchObject({
      exact: false,
      at: "vertex",
    });
    expect(drawTerms(world, fitted)!.at(-1)!.term.kind).toBe("cubic");

    // The slider writes one float: no refit of a fitted or exact draw, and
    // the terrain follows it. (An anchored draw is evaluated again: its
    // rotation isn't linear in the scale, which is one route evaluation.)
    const write = vi.spyOn(world.raster.placementTable, "setParameter");
    const fitsAtSlider = s.fits.count;
    const fittedBefore = drawTerms(world, fitted)!.at(-1)!.term;
    s.scale.value = 0.4;
    expect(write).toHaveBeenCalledTimes(1);
    s.step();
    expect(s.fits.count - fitsAtSlider).toBe(1); // the billboard's
    expect(drawTerms(world, fitted)!.at(-1)!.term).toBe(fittedBefore);
    expect(weightOf(drawTerms(world, tile)!.at(-1)!.weight)).toBeCloseTo(
      0.4 * (K - 1),
      12,
    );
    const scaled = s.route();
    worst = 0;
    for (let i = 0; i < terrain.positions.length / 3; i++) {
      worst = Math.max(
        worst,
        distance(drawn(s, tile, terrain, i), routeForward(scaled, where(i))),
      );
    }
    expect(worst).toBeLessThan(2e-3);
    expect(fitsBefore).toBeGreaterThanOrEqual(0);
    s.scale.value = 1;
    s.step();

    // The tileset's tile: fitted per vertex, within its error.
    for (const draw of tileDraws) {
      expect(world.curvilinearMaps.status(draw)).toMatchObject({
        at: "vertex",
        exact: false,
      });
    }

    // Instances: each origin goes through the route, in float64, whole.
    const wd = world.drawMatrix(model)!;
    const first = world.instanceFirst(model);
    const m = new Float64Array(16);
    const instanceError = (now: Route): number => {
      let e = 0;
      for (let k = 0; k < 3; k++) {
        readInstanceMatrix(world.draws.instances.f32, first + k, m);
        const f = m4.transformPoint(
          new Float64Array(3),
          wd,
          Float64Array.of(base[k * 3]!, base[k * 3 + 1]!, base[k * 3 + 2]!),
        );
        const got = m4.transformPoint(
          new Float64Array(3),
          wd,
          Float64Array.of(m[12]!, m[13]!, m[14]!),
        );
        e = Math.max(e, distance(got, routeForward(now, f)));
        // Its shape is kept: the exaggeration doesn't turn it.
        for (const [a, b] of [
          [0, 1],
          [5, 1],
          [10, 1],
        ] as const) {
          e = Math.max(e, Math.abs(m[a]! - b) * 1e3);
        }
      }
      return e;
    };
    expect(instanceError(s.route())).toBeLessThan(0.02);
    // It moves more than 20 km: not at its anchor's affine place.
    readInstanceMatrix(world.draws.instances.f32, first + 2, m);
    expect(Math.hypot(m[12]!, m[13]!, m[14]!)).toBeGreaterThan(1000);
    // A scale change moves them again, and an instance written by the application is moved at once.
    s.scale.value = 0.5;
    s.step();
    expect(instanceError(s.route())).toBeLessThan(0.02);
    world.setInstance(model, 1, {
      matrix: Float32Array.of(
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        40,
        60,
        80,
        1,
      ),
    });
    readInstanceMatrix(world.draws.instances.f32, first + 1, m);
    const f1 = m4.transformPoint(
      new Float64Array(3),
      wd,
      Float64Array.of(40, 60, 80),
    );
    const got1 = m4.transformPoint(
      new Float64Array(3),
      wd,
      Float64Array.of(m[12]!, m[13]!, m[14]!),
    );
    expect(distance(got1, routeForward(s.route(), f1))).toBeLessThan(0.02);
    s.scale.value = 1;
    s.step();

    // The billboard: its anchor goes through the route, forced to "anchor".
    expect(world.curvilinearMaps.status(billboard)).toMatchObject({
      at: "anchor",
      exact: false,
    });
    const bterms = drawTerms(world, billboard)!;
    expect(bterms).toHaveLength(1);
    expect(bterms[0]!.term.kind).toBe("cubic");
    const bm = world.drawMatrix(billboard)!;
    const out = new Float64Array(3);
    placeWithTerms(bterms, [0, 0, 0], undefined, out);
    const at = m4.transformPoint(
      new Float64Array(3),
      bm,
      out as unknown as Float64Array,
    );
    expect(
      distance(
        at,
        routeForward(s.route(), Float64Array.of(bm[12]!, bm[13]!, bm[14]!)),
      ),
    ).toBeLessThan(1e-6);
    // A placement of its own is still refused.
    expect(() =>
      world.setPlacement(billboard, {
        kind: "dual",
        semantic: "_X",
        t: s.scale,
        maxDistance: 1,
      }),
    ).toThrow(/billboard/);
  });
});

describe("curvilinearAt", () => {
  it("moves a tileset item's tiles rigidly about their origin when the item asks, and back when it stops", async () => {
    const s = setup();
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(TILESET), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
    const tileset = await engine.addTileset(s.world, URL_);
    const selection: SelectionView = {
      id: 0,
      position: new Float64Array([R + 4000, 0, 0]),
      direction: new Float64Array([-1, 0, 0]),
      cartographic: { longitude: 0, latitude: 0, height: 4000 },
      planes: new Float64Array(0),
      sseDenominator: 2 * Math.tan(Math.PI / 6),
      lodExponent: 1, // exact, as-drawn selection, which these tests check
      height: 4000,
    };
    for (let i = 0; i < 100 && tileset.root.state !== "ready"; i++) {
      tileset.update([selection]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(tileset.root.state).toBe("ready");
    try {
      const item = tileset.items[0]!;
      expect(item.curvilinearAt).toBe("vertex");
      item.curvilinearAt = "anchor";
      expect(() => (item.curvilinearAt = "middle" as never)).toThrow(/anchor/);
      s.step();
      const draws = tileset.root.placement!.draws;
      const triangleMesh: MeshData = {
        positions: Float32Array.of(0, 0, 0, 1, 0, 0, 0, 1, 0),
        indices: Uint32Array.of(0, 1, 2),
      };
      const origin = s.world.worldMatrix(tileset.root.placement!.transform);
      const moved = routeForward(
        s.route(),
        Float64Array.of(origin[12]!, origin[13]!, origin[14]!),
      );
      for (const draw of draws) {
        expect(s.world.curvilinearMaps.status(draw)).toMatchObject({
          at: "anchor",
        });
        const matrix = s.world.drawMatrix(draw)!;
        for (let i = 0; i < 3; i++) {
          const at = m4.transformPoint(
            new Float64Array(3),
            matrix,
            Float64Array.of(
              ...[0, 1, 2].map((a) => triangleMesh.positions[i * 3 + a]!),
            ),
          );
          const want = [0, 1, 2].map(
            (a) => moved[a]! + at[a]! - origin[12 + a]!,
          );
          expect(distance(drawn(s, draw, triangleMesh, i), want)).toBeLessThan(
            1e-4,
          );
        }
      }
      item.curvilinearAt = "vertex";
      s.step();
      for (const draw of draws) {
        expect(s.world.curvilinearMaps.status(draw)).toMatchObject({
          at: "vertex",
        });
      }
    } finally {
      engine.removeTileset(tileset);
    }
  });

  it("keeps an anchored draw's shape and puts its origin where the route does; a draw's own default stretches", () => {
    const s = setup();
    const { world, earth } = s;
    const tall: MeshData = {
      positions: Float32Array.of(-500, 0, 0, 500, 0, 0, 0, 0, 2000, 0, 500, 0),
      indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
    };
    const mesh = world.addMesh(tall);
    const anchored = world.addDraw({
      mesh,
      parent: earth,
      origin: ORIGIN,
      curvilinearAt: "anchor",
    });
    const stretched = world.addDraw({ mesh, parent: earth, origin: ORIGIN });
    expect(world.drawCurvilinearAt(anchored)).toEqual({
      choice: "anchor",
      effective: "anchor",
    });
    expect(world.drawCurvilinearAt(stretched)).toEqual({
      choice: "vertex",
      effective: "vertex",
    });
    expect(s.step()).toBe(false);
    const route = s.route();
    const matrix = world.drawMatrix(anchored)!;
    const o = Float64Array.of(matrix[12]!, matrix[13]!, matrix[14]!);
    const moved = routeForward(route, o);
    const a = [0, 1, 2, 3].map((i) => drawn(s, anchored, tall, i));
    const v = [0, 1, 2, 3].map((i) => drawn(s, stretched, tall, i));
    // Rigid: the same distances as the mesh's, and the origin where the route puts it.
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const own = distance(
          [0, 1, 2].map((k) => tall.positions[i * 3 + k]!),
          [0, 1, 2].map((k) => tall.positions[j * 3 + k]!),
        );
        expect(distance(a[i]!, a[j]!)).toBeCloseTo(own, 6);
      }
      const want = [0, 1, 2].map((k) => moved[k]! + tall.positions[i * 3 + k]!);
      // Upright on the curved Earth: the exaggeration doesn't rotate it.
      expect(distance(a[i]!, want)).toBeLessThan(1e-4);
    }
    // The stretched one follows the route vertex by vertex, within its fit.
    const placed = m4.transformPoint(
      new Float64Array(3),
      world.drawMatrix(stretched)!,
      Float64Array.of(0, 0, 2000),
    );
    expect(distance(v[2]!, routeForward(route, placed))).toBeLessThan(0.01);
    expect(distance(v[2]!, a[2]!)).toBeGreaterThan(1000);
    expect(world.curvilinearMaps.status(anchored)?.at).toBe("anchor");
    // Choosing again refits the draw.
    world.setCurvilinearAt(stretched, "anchor");
    expect(s.step()).toBe(false);
    expect(world.curvilinearMaps.status(stretched)?.at).toBe("anchor");
    const b = [0, 1, 2, 3].map((i) => drawn(s, stretched, tall, i));
    expect(distance(b[2]!, b[0]!)).toBeCloseTo(distance(a[2]!, a[0]!), 6);
    expect(() => world.setCurvilinearAt(stretched, "middle" as never)).toThrow(
      /anchor/,
    );
  });
});

describe("the anchor's math", () => {
  it("takes the rotation of a Jacobian and drops its stretch", () => {
    const angle = 0.5;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    // Rotation about z, then a stretch of 3 along x.
    const stretch = Float64Array.of(3, 0, 0, 0, 1, 0, 0, 0, 1);
    const rotation = Float64Array.of(c, sn, 0, -sn, c, 0, 0, 0, 1);
    const j = new Float64Array(9);
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        j[col * 3 + row] =
          rotation[row]! * stretch[col * 3]! +
          rotation[3 + row]! * stretch[col * 3 + 1]! +
          rotation[6 + row]! * stretch[col * 3 + 2]!;
      }
    }
    const r = polarRotation(j);
    for (let i = 0; i < 9; i++) {
      expect(r[i]).toBeCloseTo(rotation[i]!, 10);
    }
    // A mirror or a singular map has no rotation: the identity.
    expect(Array.from(polarRotation([1, 0, 0, 0, 1, 0, 0, 0, -1]))).toEqual([
      1, 0, 0, 0, 1, 0, 0, 0, 1,
    ]);
    expect(invert3([1, 0, 0, 1, 0, 0, 0, 0, 1])).toBeUndefined();
  });

  it("turns a draw about its origin, and moves an instance's matrix, by a route that rotates", () => {
    // forward: rotate 30° about z, then lift by 1,000 m.
    const angle = Math.PI / 6;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    const route: Route = {
      frame: { name: "a" },
      base: { name: "b" },
      seconds: 0,
      revision: 1,
      steps: [
        {
          kind: "curvilinear",
          inverse: false,
          curvilinearMap: {
            from: { name: "a" },
            to: { name: "b" },
            revision: 1,
            forward(p, out, jacobian) {
              out[0] = c * p[0]! - sn * p[1]!;
              out[1] = sn * p[0]! + c * p[1]!;
              out[2] = p[2]! + 1000;
              jacobian?.set([c, sn, 0, -sn, c, 0, 0, 0, 1]);
              return out;
            },
          },
        },
      ],
    };
    const origin = Float64Array.of(5000, 2000, 300);
    const correction = anchorCorrector(route, m4.mat4())(origin)!;
    expect(correction.shift[2]).toBeCloseTo(1000, 9);
    // A draw with a translated, scaled-by-2 model.
    const model = m4.mat4();
    model[0] = model[5] = model[10] = 2;
    model[12] = 5000;
    model[13] = 2000;
    model[14] = 300;
    const lattice = anchorLattice(
      correction,
      model,
      origin,
      { center: [0, 0, 0], scale: 100 },
      "test",
    )!;
    expect(lattice.errorBound).toBe(0);
    const out = new Float64Array(3);
    for (const p of [
      [0, 0, 0],
      [10, 0, 0],
      [0, 10, 5],
      [-30, 20, 40],
    ]) {
      placeWithTerms(
        [{ term: lattice, weight: { scale: 1, factors: [] } }],
        p,
        undefined,
        out,
      );
      const got = m4.transformPoint(
        new Float64Array(3),
        model,
        out as unknown as Float64Array,
      );
      // Drawn at route(origin) plus the rotation of (f − origin).
      const f = m4.transformPoint(
        new Float64Array(3),
        model,
        Float64Array.from(p),
      );
      const d = [f[0]! - origin[0]!, f[1]! - origin[1]!, f[2]! - origin[2]!];
      const moved = routeForward(route, origin);
      const want = [
        moved[0]! + c * d[0]! - sn * d[1]!,
        moved[1]! + sn * d[0]! + c * d[1]!,
        moved[2]! + d[2]!,
      ];
      expect(distance(got, want)).toBeLessThan(1e-9);
    }
    // An instance matrix, relative to the draw's transform.
    const l = linearPart(model);
    const li = invert3(l)!;
    const base = m4.mat4();
    base[12] = 7;
    base[13] = 3;
    base[14] = 1;
    const moved = correctedInstance(
      base,
      l,
      li,
      correction,
      new Float64Array(16),
    );
    const world = m4.multiply(m4.mat4(), model, moved);
    const f = m4.transformPoint(
      new Float64Array(3),
      model,
      Float64Array.of(7, 3, 1),
    );
    const g = anchorCorrector(route, m4.mat4())(f)!;
    const wm = m4.multiply(
      m4.mat4(),
      model,
      correctedInstance(base, l, li, g, new Float64Array(16)),
    );
    expect(
      distance([wm[12]!, wm[13]!, wm[14]!], routeForward(route, f)),
    ).toBeLessThan(1e-9);
    expect(Math.hypot(world[0]!, world[1]!, world[2]!)).toBeCloseTo(2, 9);
    expect(
      affineLattice([1, 2, 3], new Float64Array(9), [0, 0, 0], 1, "x").cells,
    ).toBe(1);
  });
});

describe("the globe across a curvilinear map", () => {
  async function ellipsoidSource(): Promise<TerrainSource> {
    const loader: TerrainLoader = async (request) => {
      const { asset, info } = flatTerrainTile(
        request.rect,
        request.skirtHeight,
        5,
      );
      return { asset, info };
    };
    return TerrainSource.ellipsoid(loader, { warnings: new Set() });
  }

  const view = (
    curvilinearMap?: SelectionView["curvilinearMap"],
    oblique = false,
  ): SelectionView => {
    const position = ecef(0.3, 0.2, 2_000_000);
    const length = Math.hypot(position[0]!, position[1]!, position[2]!);
    let direction = position.map((x) => -x / length) as Float64Array;
    let cartographic = { longitude: 0.3, latitude: 0.2, height: 2_000_000 };
    if (oblique) {
      // Off to the east at the same height, looking at the ground below the
      // top-down point: a vertical error is seen across, not along, the view.
      const target = ecef(0.3, 0.2, 0);
      const side = ecef(0.3 + 0.3, 0.2, 2_000_000);
      position.set(side);
      const d = position.map((x, i) => target[i]! - x);
      const n = Math.hypot(d[0]!, d[1]!, d[2]!);
      direction = d.map((x) => x / n) as unknown as Float64Array;
      cartographic = { longitude: 0.6, latitude: 0.2, height: 2_000_000 };
    }
    return {
      id: 0,
      position,
      direction,
      cartographic,
      planes: new Float64Array(0),
      sseDenominator: 2 * Math.tan(Math.PI / 6),
      lodExponent: 1, // exact, as-drawn selection, which these tests check
      height: 1000,
      ...(curvilinearMap && { curvilinearMap }),
    };
  };

  async function settle(
    source: TerrainSource,
    selection: GlobeBudgetedSelection | GlobeStepwiseSelection,
    curvilinearMap?: SelectionView["curvilinearMap"],
    oblique = false,
  ): Promise<Tile[]> {
    let selected: Tile[] = [];
    for (let pass = 0; pass < 60; pass++) {
      const result = selection.select(
        source.root,
        source.geometricError,
        view(curvilinearMap, oblique),
      );
      selected = result.selected;
      const pending = result.requested.filter((t) => t.state === "unloaded");
      if (pending.length === 0) {
        break;
      }
      for (const tile of pending) {
        await source.loadTile(tile, new AbortController().signal);
        tile.state = "ready";
      }
    }
    return selected;
  }

  it("is selected on drawn volumes: finer at ×10, with no horizon cull, and its drawn bounds hold its curvilinear vertices", async () => {
    const s = setup();
    const curvilinearMap = s.world.tileCurvilinearMap(s.earth)!;
    expect(curvilinearMap).toBeDefined();
    const levels = async (
      policy: "budgeted" | "stepwise",
      w?: typeof curvilinearMap,
      oblique = false,
    ) => {
      const source = await ellipsoidSource();
      const selection =
        policy === "budgeted"
          ? new GlobeBudgetedSelection(source, {})
          : new GlobeStepwiseSelection(source, {});
      const selected = await settle(source, selection, w, oblique);
      return {
        source,
        selected,
        deepest: Math.max(...selected.map((t) => t.globe!.level)),
      };
    };
    for (const policy of ["budgeted", "stepwise"] as const) {
      // A height scale's error is vertical (`terrainDrawnError`): seen along
      // the view, top-down, it is nearly invisible, so only an oblique view
      // refines further at ×10.
      const plain = await levels(policy, undefined, true);
      const exaggerated = await levels(policy, curvilinearMap, true);
      expect(exaggerated.deepest, policy).toBeGreaterThan(plain.deepest);
    }
    // Bounds: every vertex of a loaded tile, curvilinear by the route, is inside its drawn sphere.
    const { source, selected } = await levels("budgeted", curvilinearMap);
    const route = s.route();
    const tile = selected.find((t) => contains(t.globe!.rectangle, 0.3, 0.2))!;
    expect(tile).toBeDefined();
    const drawnVolume = drawnTile(tile, curvilinearMap).volume;
    expect(drawnVolume.kind).toBe("sphere");
    const sphere = (
      drawnVolume as { sphere: { center: ArrayLike<number>; radius: number } }
    ).sphere;
    const content = await source.loadTile(tile, new AbortController().signal);
    const mesh = content.meshes[0]!;
    const c = content.draws[0]!.matrix;
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const p = [0, 1, 2].map((k) => c[12 + k]! + mesh.positions[i * 3 + k]!);
      expect(
        distance(routeForward(route, Float64Array.from(p)), sphere.center),
      ).toBeLessThanOrEqual(sphere.radius * (1 + 1e-6));
    }
    // σ_max over the tile is the exaggeration's, so its error stretches ×10.
    expect(drawnTile(tile, curvilinearMap).sigmaMax).toBeGreaterThan(9);
  });

  it("asks its source for h·n̂ only while its anchor's route is a height scale on its own ellipsoid", async () => {
    const s = setup();
    const globe = engine.addEllipsoid(s.world);
    const source = (globe as unknown as { state: { source: TerrainSource } })
      .state.source;
    expect(source.wantsHeightNormal!()).toBe(true);
    expect(
      s.world.curvilinearMaps.heightScaleAt(globe.anchor.slot)?.factor,
    ).toBe(K);
    engine.removeTileset(globe);
    // A sphere that isn't the globe's ellipsoid is fitted.
    const world = engine.createWorld({ maxDraws: 8 });
    worlds.push(world);
    const other = engine.addEllipsoid(world);
    const otherSource = (
      other as unknown as { state: { source: TerrainSource } }
    ).state.source;
    expect(otherSource.wantsHeightNormal!()).toBe(false);
    engine.removeTileset(other);
  });
});
