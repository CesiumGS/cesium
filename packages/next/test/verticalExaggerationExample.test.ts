// The "Vertical exaggeration" example (plan §13.26's acceptance test, increment
// 7), its frame and rig as the example builds them: a world whose rig sits on
// the application's frame, a terrain tile and a billboard drawn under it, and
// the questions the page asks (a pick's way back through the map, the measure
// module) answered in true coordinates while k goes from 1 to 10. Checked on
// the CPU against the route's own float64 map, as warpGlobe.test.ts does; the
// example's page is examples/vertical-exaggeration (run in a browser).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createExaggeration,
  FRAME_NAME,
  MAX_EXAGGERATION,
  scaleOf,
  type Exaggeration,
} from "../examples/vertical-exaggeration/exaggeration.ts";
import { watchFits } from "../examples/vertical-exaggeration/fits.ts";
import {
  PLACES,
  positionOf,
} from "../examples/vertical-exaggeration/places.ts";
import {
  readMeasurement,
  readPick,
} from "../examples/vertical-exaggeration/readings.ts";
import { routeForward, routeInverse, type Route } from "../src/camera/route.ts";
import {
  createFrameCatalog,
  type FrameCatalog,
} from "../src/frames/catalog.ts";
import { Frame } from "../src/frames/Frame.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { isWarpFrame } from "../src/frames/warpFrame.ts";
import { heightNormalInfo } from "../src/globe/heightNormal.ts";
import { upsampleTerrainTile } from "../src/globe/quantizedMesh.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import * as m4 from "../src/math/mat4.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBillboard, type MeshData } from "../src/scene/meshes.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import { placeWithTerms } from "../src/scene/warpEvaluate.ts";
import type { World } from "../src/scene/World.ts";
import { drawTerms } from "../src/scene/world/placements.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";
import { Instant } from "../src/time/Instant.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";
import { gridTile } from "./terrainRayFixtures.ts";

// The example imports the engine's entry point, which reads WebGPU's globals
// as it loads: they come first.
await vi.hoisted(async () => {
  const { installGpuGlobals } = await import("./fakeGpu.ts");
  installGpuGlobals();
});

const KS = Array.from({ length: MAX_EXAGGERATION }, (_, i) => i + 1);
const WGS84 = Ellipsoid.WGS84;

/** Zermatt's valley floor and the Matterhorn's summit, true heights above the ellipsoid, m. */
const VALLEY = positionOf(
  PLACES.find((p) => p.id === "zermatt")!,
  1660,
);
const SUMMIT = positionOf(
  PLACES.find((p) => p.id === "matterhorn")!,
  4478,
);
const DOM = positionOf(
  PLACES.find((p) => p.id === "dom")!,
  4545,
);

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
});

interface Setup {
  world: World;
  view: View;
  earth: AnchorHandle;
  exaggeration: Exaggeration;
  catalog: FrameCatalog;
  itrf: Frame;
  fits: ReturnType<typeof watchFits>;
  route(): Route;
  step(): boolean;
}

/** The example's world: its frame on a catalog's ITRF, the rig on it, and nothing set on any item. */
function setup(factor = 4): Setup {
  const world = engine.createWorld({ maxDraws: 64 });
  worlds.push(world);
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const scale = world.createPlacementParameter(scaleOf(factor), {
    range: [0, 1],
  });
  const exaggeration = createExaggeration(catalog, scale);
  engine.cameras.setResolver(world, createFramesResolver(catalog));
  const earth = world.bodyAnchor(EARTH);
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  views.push(view);
  engine.cameras.setRig(view, {
    position: { frame: exaggeration.frame as Frame },
    orientation: { kind: "free" },
  });
  const fits = watchFits(world);
  const s: Setup = {
    world,
    view,
    earth,
    exaggeration,
    catalog,
    itrf: catalog.get("ITRF"),
    fits,
    route: () => view.anchorRoute(earth)!,
    step() {
      engine.cameras.update();
      return world.warps.frame(
        engine.cameras.root(view),
        view.anchorRoutes(),
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

/** A tile of terrain over the Alps' latitude, heights 1,600 to 4,500 m, as the worker decodes it for a warped globe. */
function terrainAsset(): GltfAsset {
  const rect = { west: 0.1336, south: 0.8031, east: 0.134, north: 0.8035 };
  const { heights } = gridTile(
    rect,
    9,
    (lon, lat) => 1600 + 2900 * (0.5 + 0.5 * Math.sin(lon * 9000 + lat * 5000)),
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

/** Where the draw's terms (and its matrix) put its mesh vertex `i`, in ITRF as drawn. */
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

const height = (p: ArrayLike<number>) =>
  WGS84.cartesianToCartographic(Float64Array.of(p[0]!, p[1]!, p[2]!), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!.height;

const apart = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

const instant = Instant.fromTdb(0);

describe("the example's frame and rig", () => {
  it("is one warp frame over ITRF with a height-scale warp, and the Earth is drawn through it", () => {
    const s = setup();
    expect(s.exaggeration.frame.name).toBe(FRAME_NAME);
    expect(isWarpFrame(s.exaggeration.frame)).toBe(true);
    expect(s.exaggeration.frame.warp.heightScale).toMatchObject({
      kind: "heightScale",
      factor: MAX_EXAGGERATION,
    });
    expect(s.exaggeration.frame.warp.presentation).toBe(true);
    expect(s.route().steps.map((x) => x.kind)).toEqual(["warp"]);
    expect(s.route().presentation).toBe(true);
    expect(engine.cameras.root(s.view)).toBe(s.exaggeration.frame);
    expect(s.exaggeration.factor).toBeCloseTo(4, 12);
  });

  it("writes one float for the slider: ×1 at its start, ×10 at its end", () => {
    const s = setup(1);
    expect(s.exaggeration.factor).toBe(1);
    s.exaggeration.factor = 10;
    expect(s.world.createPlacementParameter(0).value).toBe(0);
    expect(s.exaggeration.factor).toBeCloseTo(10, 12);
    s.exaggeration.factor = 2.5;
    expect(s.exaggeration.factor).toBeCloseTo(2.5, 12);
  });
});

describe("heights across k = 1 to 10", () => {
  it("draws a terrain tile at k times its true heights, with no fit, and reads them back true", () => {
    const s = setup(1);
    const asset = terrainAsset();
    const mesh = meshOf(asset);
    const center = asset.draws[0]!.matrix;
    const tile = s.world.addDraw({
      mesh: s.world.addMesh(mesh),
      parent: s.earth,
      origin: Float64Array.of(center[12]!, center[13]!, center[14]!),
    });
    s.world.setDrawGeometricError(tile, 5);
    s.world.setDrawHeightNormal(tile, heightNormalInfo(asset)!);
    s.step();
    expect(s.world.warps.status(tile)).toMatchObject({
      state: "fitted",
      exact: true,
    });
    const vertices = [0, 7, 31, 55, 80].filter(
      (i) => i < mesh.positions.length / 3,
    );
    const trueHeights = vertices.map((i) =>
      height(
        [0, 1, 2].map((a) => center[12 + a]! + mesh.positions[i * 3 + a]!),
      ),
    );
    const fitsBefore = s.fits.run;
    for (const k of KS) {
      s.exaggeration.factor = k;
      s.step();
      vertices.forEach((i, n) => {
        const at = drawn(s, tile, mesh, i);
        // Drawn k times as tall: float32 vertices, so about a centimetre.
        expect(height(at)).toBeCloseTo(k * trueHeights[n]!, 1);
        // The way back through the map is the vertex's true place.
        const back = s.exaggeration.truth(at);
        expect(height(back)).toBeCloseTo(trueHeights[n]!, 1);
      });
    }
    expect(s.fits.run).toBe(fitsBefore);
    expect(s.fits.refits).toBe(0);
  });

  it("reads true heights through the pick path, whatever k, with drawn heights at k times them", () => {
    const s = setup(1);
    for (const k of KS) {
      s.exaggeration.factor = k;
      s.step();
      for (const [point, trueHeight] of [
        [VALLEY, 1660],
        [SUMMIT, 4478],
        [DOM, 4545],
      ] as const) {
        // Where the engine's own route draws the point: what a pick reads.
        const atPick = routeForward(s.route(), point);
        expect(height(atPick)).toBeCloseTo(k * trueHeight, 6);
        // The application's helper draws it in the same place.
        expect(apart(s.exaggeration.drawn(point), atPick)).toBeLessThan(1e-6);
        // The pick's way back: the true point, in ITRF.
        const read = readPick(s.exaggeration, s.itrf, atPick);
        expect(read.frame).toBe("ITRF");
        expect(read.true.height).toBeCloseTo(trueHeight, 6);
        expect(apart(read.point, point)).toBeLessThan(1e-6);
        expect(read.drawnHeight).toBeCloseTo(k * trueHeight, 6);
        // The engine's route agrees with the way back.
        expect(apart(routeInverse(s.route(), atPick), read.point)).toBeLessThan(
          1e-6,
        );
      }
    }
  });

  it("reads a pick at the multiplier it was drawn at, if the slider has moved since", () => {
    const s = setup(7);
    s.step();
    const atPick = routeForward(s.route(), SUMMIT);
    s.exaggeration.factor = 2;
    s.step();
    const late = readPick(s.exaggeration, s.itrf, atPick);
    expect(late.true.height).not.toBeCloseTo(4478, 0);
    const read = readPick(s.exaggeration, s.itrf, atPick, 7);
    expect(read.true.height).toBeCloseTo(4478, 6);
  });

  it("measures the same true heights and distances at every k, with the drawn ones beside them", async () => {
    const s = setup(1);
    // The same frames the page's measure module reads: the catalog's tree.
    const frames = await s.catalog.tree();
    expect(frames.itrf).toBe(s.itrf);
    let first: ReturnType<typeof readMeasurement> | undefined;
    for (const k of KS) {
      s.exaggeration.factor = k;
      s.step();
      // Both ends as picks: drawn by the route, taken back through the map.
      const a = readPick(
        s.exaggeration,
        s.itrf,
        routeForward(s.route(), VALLEY),
      ).point;
      const b = readPick(
        s.exaggeration,
        s.itrf,
        routeForward(s.route(), SUMMIT),
      ).point;
      const m = readMeasurement(s.exaggeration, s.itrf, frames, a, b, instant);
      first ??= m;
      expect(m.frame).toBe("ITRF");
      expect(m.heightDifference).toBeCloseTo(4478 - 1660, 6);
      expect(m.heightDifference).toBeCloseTo(first.heightDifference, 6);
      expect(m.distance).toBeCloseTo(first.distance, 6);
      expect(m.groundDistance).toBeCloseTo(first.groundDistance, 6);
      expect(m.drawnHeightDifference).toBeCloseTo(k * (4478 - 1660), 5);
      // Stretched along the vertical only: never shorter, longer once k > 1.
      expect(m.drawnDistance).toBeGreaterThanOrEqual(m.distance - 1e-6);
      if (k > 1) {
        expect(m.drawnDistance).toBeGreaterThan(m.distance);
      } else {
        expect(m.drawnDistance).toBeCloseTo(m.distance, 6);
      }
    }
  });

  it("draws a billboard and fits a plain tile once, and moving the slider asks for no refit", () => {
    const s = setup(1);
    const asset = terrainAsset();
    const mesh = meshOf(asset);
    const center = asset.draws[0]!.matrix;
    // A tile without the height attribute is fitted, once.
    const plain = s.world.addDraw({
      mesh: s.world.addMesh({
        positions: mesh.positions,
        normals: mesh.normals,
        indices: mesh.indices,
      }),
      parent: s.earth,
      origin: Float64Array.of(center[12]!, center[13]!, center[14]!),
    });
    s.world.setDrawGeometricError(plain, 5);
    const pin = s.world.addDraw({
      mesh: s.world.addMesh(createBillboard("bottom")),
      parent: s.earth,
      origin: SUMMIT,
      billboard: { size: 30 },
    });
    s.step();
    expect(s.world.warps.status(plain)?.state).toBe("fitted");
    expect(s.world.warps.status(pin)?.state).toBe("fitted");
    const revision = s.route().revision;
    const run = s.fits.run;
    expect(run).toBeGreaterThan(0);
    for (const k of KS) {
      s.exaggeration.factor = k;
      s.step();
      expect(s.world.warps.status(plain)?.state).toBe("fitted");
    }
    s.exaggeration.factor = 3;
    s.step();
    expect(s.route().revision).toBe(revision);
    // Fitted draws are not fitted again; the billboard is placed again at
    // each tick (one route evaluation), which is not a fit.
    expect(s.fits.run).toBe(run);
    expect(s.fits.refits).toBe(0);
    expect(s.fits.replaced).toBeGreaterThan(0);
    expect(s.fits.queued).toBe(0);
    // Changing the warp itself is the other thing: its route is refitted.
    s.exaggeration.warp.factor = 20;
    s.step();
    expect(s.route().revision).toBeGreaterThan(revision);
    expect(s.fits.refits).toBeGreaterThan(0);
    expect(s.exaggeration.factor).toBeCloseTo(1 + scaleOf(3) * 19, 9);
  });
});
