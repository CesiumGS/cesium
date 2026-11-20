// The body as an occluder under a curvilinear map (globe/bodyOccluder.ts): the drawn
// terrain's own bounds make the occluder, so it holds for any map that can
// carry points.
import { describe, expect, it } from "vitest";
import { BodyOccluder } from "../src/globe/bodyOccluder.ts";
import { flatTerrainHeights } from "../src/globe/quantizedMesh.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import type { TileCurvilinearMap } from "../src/streaming/tileCurvilinearMap.ts";
import {
  regionFromJson,
  sphereFromObb,
  type TileVolume,
} from "../src/streaming/volumes.ts";

const wgs84 = Ellipsoid.WGS84;

/** A ×10 vertical exaggeration as a map of points, with nothing declared of it. */
function curvilinearMapOf(factor: number): TileCurvilinearMap {
  const map = (p: ArrayLike<number>, scale: number): number[] => {
    const c = wgs84.cartesianToCartographic(
      Float64Array.of(p[0]!, p[1]!, p[2]!),
      { longitude: 0, latitude: 0, height: 0 },
    )!;
    const q = wgs84.cartographicToCartesian(
      { ...c, height: c.height * (1 + scale * (factor - 1)) },
      new Float64Array(3),
    );
    return [q[0]!, q[1]!, q[2]!];
  };
  return {
    version: 1,
    scaleVersion: 0,
    fitVersion: 0,
    bounds(points) {
      const images: number[][] = [];
      for (let i = 0; i < points.length; i += 3) {
        images.push(map([points[i]!, points[i + 1]!, points[i + 2]!], 1));
      }
      const center = [0, 1, 2].map(
        (a) => images.reduce((s, q) => s + q[a]!, 0) / images.length,
      );
      const radius = Math.max(
        ...images.map((q) =>
          Math.hypot(
            q[0]! - center[0]!,
            q[1]! - center[1]!,
            q[2]! - center[2]!,
          ),
        ),
      );
      return {
        center: center as never,
        radius,
        sigmaMin: 1,
        sigmaMax: factor,
        secondDerivative: 0,
      };
    },
    fitError: () => 0,
    images(points) {
      const at = new Float64Array(points.length);
      const delta = new Float64Array(points.length);
      for (let i = 0; i < points.length; i += 3) {
        const p = [points[i]!, points[i + 1]!, points[i + 2]!];
        const a = map(p, 1);
        at.set(a, i);
        delta.set([0, 0, 0], i);
      }
      return { at, delta, span: 0 };
    },
  };
}

function tileOf(west: number, east: number, height: number, level = 12): Tile {
  const region = regionFromJson([west, -0.01, east, 0.01, height, height]);
  const heights = flatTerrainHeights(33);
  heights.minimumHeight = height;
  heights.maximumHeight = height;
  return {
    volume: { kind: "region", region, sphere: sphereFromObb(region.obb) },
    children: [],
    fillFromParent: false,
    globe: {
      level,
      rectangle: { west, south: -0.01, east, north: 0.01 },
      heights,
      refit: { levelError: 10 },
    },
  } as unknown as Tile;
}

function regionVolume(west: number, east: number, lo: number, hi: number) {
  const region = regionFromJson([west, -0.0005, east, 0.0005, lo, hi]);
  return {
    kind: "region",
    region,
    sphere: sphereFromObb(region.obb),
  } as TileVolume;
}

function setup(basin = false, enabled = true) {
  const near = tileOf(-0.02, 0.02, 0);
  const far = tileOf(2, 2.04, basin ? -5000 : 0);
  const world = regionFromJson([-Math.PI, -1.5, Math.PI, 1.5, -1000, 9000]);
  const root = {
    volume: { kind: "region", region: world, sphere: sphereFromObb(world.obb) },
    children: [near, far],
  } as unknown as Tile;
  const occluder = new BodyOccluder({
    root,
    flat: false,
    enabled: () => enabled,
    budgetMs: Infinity,
  });
  const camera = wgs84.cartographicToCartesian(
    { longitude: 0, latitude: 0, height: 10 },
    new Float64Array(3),
  );
  const view = {
    id: 1,
    position: camera,
    curvilinearMap: curvilinearMapOf(10),
  } as unknown as SelectionView;
  occluder.prepare(view);
  return { occluder, view, camera };
}

describe("the body as an occluder", () => {
  it("hides a tile beyond the drawn horizon and keeps one just over it, by drawn heights", () => {
    const { occluder, view } = setup();
    // Volumes are as drawn: 1000 m peaks ×10 stand 10 km, visible out to about 0.058 rad.
    const beyond = regionVolume(0.2, 0.2005, 0, 10000);
    const over = regionVolume(0.04, 0.0405, 0, 10000);
    const under = regionVolume(0.0, 0.0005, 0, 10000);
    expect(occluder.hidden(beyond, view)).toBe(true);
    expect(occluder.hidden(over, view)).toBe(false);
    expect(occluder.hidden(under, view)).toBe(false);
    // Without the exaggeration these peaks (1000 m, visible to 0.02 rad) would be hidden at 0.04.
    const tall = regionVolume(0.04, 0.0405, 9000, 10000);
    expect(occluder.hidden(tall, view)).toBe(false);
  });

  it("is not shrunk by a deep basin far from the camera", () => {
    const flat = setup(false);
    const basin = setup(true);
    expect(basin.occluder.scaleFor(basin.view)).toBeCloseTo(
      flat.occluder.scaleFor(flat.view)!,
      9,
    );
    const volume = regionVolume(0.2, 0.2005, 0, 10000);
    expect(basin.occluder.hidden(volume, basin.view)).toBe(true);
  });

  it("is off while the globe has regions, or without a map, or with the camera under the surface", () => {
    const off = setup(false, false);
    expect(
      off.occluder.hidden(regionVolume(0.2, 0.2005, 0, 10000), off.view),
    ).toBe(false);
    const { occluder, view } = setup();
    const unmapped = {
      ...view,
      curvilinearMap: { ...view.curvilinearMap!, images: undefined },
    };
    occluder.prepare(unmapped as SelectionView);
    expect(
      occluder.hidden(
        regionVolume(0.2, 0.2005, 0, 10000),
        unmapped as SelectionView,
      ),
    ).toBe(false);
    const under = {
      ...view,
      id: 2,
      position: wgs84.cartographicToCartesian(
        { longitude: 0, latitude: 0, height: -3000 },
        new Float64Array(3),
      ),
    } as SelectionView;
    occluder.prepare(under);
    expect(occluder.hidden(regionVolume(0.2, 0.2005, 0, 10000), under)).toBe(
      false,
    );
  });

  it("never lies above a fine tile that dips below its coarse ancestor's mesh by up to the ancestor's error", () => {
    const error = 500;
    const ancestor = tileOf(-0.02, 0.02, 0, 8);
    (ancestor.globe as { refit?: unknown }).refit = { levelError: error };
    const child = tileOf(-0.01, 0.0, 0, 9);
    (child.globe as { heights?: unknown }).heights = undefined;
    (child as { parent?: Tile }).parent = ancestor;
    const fill = (): Tile =>
      ({ ...tileOf(0, 0.01, 0, 9), fillFromParent: true }) as Tile;
    (ancestor as { children: Tile[] }).children = [
      child,
      fill(),
      fill(),
      fill(),
    ];
    const world = regionFromJson([-Math.PI, -1.5, Math.PI, 1.5, -1000, 9000]);
    const root = {
      volume: {
        kind: "region",
        region: world,
        sphere: sphereFromObb(world.obb),
      },
      children: [ancestor],
    } as unknown as Tile;
    (ancestor as { parent?: Tile }).parent = root;
    const occluder = new BodyOccluder({
      root,
      flat: false,
      enabled: () => true,
      budgetMs: Infinity,
    });
    const camera = wgs84.cartographicToCartesian(
      { longitude: 0, latitude: 0, height: 10 },
      new Float64Array(3),
    );
    const view = {
      id: 1,
      position: camera,
      curvilinearMap: curvilinearMapOf(10),
    } as unknown as SelectionView;
    occluder.prepare(view);
    const s = occluder.scaleFor(view)!;
    // The fine surface at -error m, drawn ×10: its scaled norm is no less than s.
    const dipped = wgs84.cartographicToCartesian(
      { longitude: 0, latitude: 0, height: -error * 10 },
      new Float64Array(3),
    );
    const norm = Math.hypot(
      dipped[0]! / wgs84.radii[0]!,
      dipped[1]! / wgs84.radii[1]!,
      dipped[2]! / wgs84.radii[2]!,
    );
    expect(s).toBeLessThanOrEqual(norm);
  });

  it("is not zeroed by an unloaded subtree once its root-level ancestor is loaded", () => {
    const top = tileOf(-0.02, 0.02, 0, 0);
    (top.globe as { refit?: unknown }).refit = { levelError: 100 };
    const kids = [0, 1, 2, 3].map((i) => {
      const k = tileOf(-0.02 + i * 0.01, -0.01 + i * 0.01, 0, 1);
      (k.globe as { heights?: unknown }).heights = undefined;
      (k as { parent?: Tile }).parent = top;
      return k;
    });
    (top as { children: Tile[] }).children = kids;
    const world = regionFromJson([-Math.PI, -1.5, Math.PI, 1.5, -1000, 9000]);
    const root = {
      volume: {
        kind: "region",
        region: world,
        sphere: sphereFromObb(world.obb),
      },
      children: [top],
    } as unknown as Tile;
    (top as { parent?: Tile }).parent = root;
    const occluder = new BodyOccluder({
      root,
      flat: false,
      enabled: () => true,
      budgetMs: Infinity,
    });
    const view = {
      id: 1,
      position: wgs84.cartographicToCartesian(
        { longitude: 0, latitude: 0, height: 10 },
        new Float64Array(3),
      ),
      curvilinearMap: curvilinearMapOf(10),
    } as unknown as SelectionView;
    occluder.prepare(view);
    expect(occluder.scaleFor(view)).toBeGreaterThan(0);
  });

  it("finds the largest sound radius: it satisfies the condition and no larger one within the tolerance does", () => {
    // A level-12 tile under the camera at the surface, and a deep basin
    // (-5000 m, drawn -50 km) beside it, within the camera's reach.
    const near = tileOf(-0.02, 0.02, 0);
    const basin = tileOf(0.02, 0.06, -5000);
    const world = regionFromJson([-Math.PI, -1.5, Math.PI, 1.5, -1000, 9000]);
    const root = {
      volume: {
        kind: "region",
        region: world,
        sphere: sphereFromObb(world.obb),
      },
      children: [near, basin],
    } as unknown as Tile;
    const occluder = new BodyOccluder({
      root,
      flat: false,
      enabled: () => true,
      budgetMs: Infinity,
    });
    const view = {
      id: 1,
      position: wgs84.cartographicToCartesian(
        { longitude: 0, latitude: 0, height: 10 },
        new Float64Array(3),
      ),
      curvilinearMap: curvilinearMapOf(10),
    } as unknown as SelectionView;
    occluder.prepare(view);
    const s = occluder.scaleFor(view)!;
    const floor = (6378137 - 50000) / 6378137;
    // The basin lies in the cap of every radius above its own floor, so the
    // radius can't pass it: sound (at most the basin's floor), and maximal.
    expect(s).toBeLessThanOrEqual(floor + 1e-9);
    expect(s).toBeGreaterThan(floor - 3e-4);
  });

  it("offers its shape for a depth pyramid", () => {
    const { occluder, view } = setup();
    const shape = occluder.shape(view)!;
    expect(shape.radii[0]).toBeLessThanOrEqual(6378137);
    expect(shape.radii[0]).toBeGreaterThan(6378137 * 0.999);
  });
});
