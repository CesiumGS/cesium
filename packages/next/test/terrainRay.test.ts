import { afterEach, describe, expect, it, vi } from "vitest";
import { castTerrainRay } from "../src/globe/terrainRay.ts";
import { terrainLineOfSight } from "../src/measure/terrainLineOfSight.ts";
import { terrainQueries } from "../src/query/terrainBackend.ts";
import {
  LEVEL_ZERO_ERROR,
  TerrainSource,
  type TerrainLoader,
} from "../src/globe/TerrainSource.ts";
import { GlobeBudgetedSelection } from "../src/globe/GlobeBudgeted.ts";
import { GlobeStepwiseSelection } from "../src/globe/GlobeStepwise.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import {
  A,
  WGS84,
  at,
  clearanceAt,
  contains,
  distanceToTile,
  gridTile,
  strip,
  stripTarget,
  trueMinimumClearance,
  vertex,
} from "./terrainRayFixtures.ts";

/** `castTerrainRay` for finite endpoints. */
function cast(...args: Parameters<typeof castTerrainRay>) {
  const r = castTerrainRay(...args);
  if (!r) {
    throw new Error("endpoints not finite");
  }
  return r;
}

/** Ray parameter where the chord crosses the meridian `lon` (a plane). */
function tAtLongitude(from: Float64Array, to: Float64Array, lon: number) {
  const dx = to[0]! - from[0]!;
  const dy = to[1]! - from[1]!;
  return (
    (from[0]! * Math.sin(lon) - from[1]! * Math.cos(lon)) /
    (dy * Math.cos(lon) - dx * Math.sin(lon))
  );
}

const D = 1000 / A; // a 2 km tile: ±1 km about (0, 0)
const SQUARE = { west: -D, south: -D, east: D, north: D };
const N = 65; // 31 m cells

describe("castTerrainRay", () => {
  it("catches a one-cell ridge wherever it sits, with the hit on a triangle", () => {
    for (let k = 3; k < N - 4; k += 5) {
      for (const [la, lb] of [
        [0, 0],
        [0.31 * D, -0.47 * D],
        [-0.6 * D, 0.2 * D],
      ]) {
        // Vertex columns k and k + 1 stand 800 m: a plateau one cell wide.
        const tile = gridTile(SQUARE, N, (lon) => {
          const i = Math.round(((lon + D) / (2 * D)) * (N - 1));
          return i === k || i === k + 1 ? 800 : 0;
        });
        const from = at(-0.93 * D, la!, 500);
        const to = at(0.91 * D, lb!, 500);
        const r = cast(from, to, stripTarget([{ rectangle: SQUARE, tile }]));
        expect(r.hit, `ridge ${k}`).toBeDefined();
        expect(distanceToTile(r.hit!.point, tile)).toBeLessThan(1e-6);
        // On the ridge's near (west) slope: between columns k - 1 and k.
        const c = WGS84.cartesianToCartographic(r.hit!.point, {
          longitude: 0,
          latitude: 0,
          height: 0,
        })!;
        const column = ((c.longitude + D) / (2 * D)) * (N - 1);
        expect(column).toBeGreaterThan(k - 1 - 1e-6);
        expect(column).toBeLessThan(k + 1e-6);
        expect(r.minClearance!.meters).toBeLessThan(0);
      }
    }
  });

  it("catches a knife-edge ridge (one vertex column) the old 30 m march could straddle", () => {
    const n = 257; // 7.8 m cells
    for (let k = 10; k < n - 10; k += 23) {
      const tile = gridTile(SQUARE, n, (lon) =>
        Math.round(((lon + D) / (2 * D)) * (n - 1)) === k ? 520 : 0,
      );
      const r = cast(
        at(-0.97 * D, 0.13 * D, 500),
        at(0.95 * D, -0.21 * D, 500),
        stripTarget([{ rectangle: SQUARE, tile }]),
      );
      expect(r.hit, `ridge ${k}`).toBeDefined();
      expect(distanceToTile(r.hit!.point, tile)).toBeLessThan(1e-6);
    }
  });

  it("counts a gap with no tile and a coarse stand-in as unknown, by length", () => {
    const HALF = 20000 / A;
    const W = 3000 / A;
    const rects = strip(-HALF, HALF, 8, -W, W);
    const tiles = rects.map((r) => gridTile(r, 17, () => 0));
    const target = stripTarget(
      rects.map((rectangle, i) =>
        i === 2
          ? { rectangle, unknown: "not drawn" as const }
          : i === 5
            ? { rectangle, unknown: "not refined" as const }
            : { rectangle, tile: tiles[i]! },
      ),
    );
    const from = at(-0.99 * HALF, 0.4 * W, 2000);
    const to = at(0.97 * HALF, -0.3 * W, 2000);
    const r = cast(from, to, target);
    const t = (lon: number) => tAtLongitude(from, to, lon);
    expect(r.hit).toBeUndefined();
    expect(r.unknown.notDrawn).toBeCloseTo(
      (t(rects[2]!.east) - t(rects[2]!.west)) * r.length,
      6,
    );
    expect(r.unknown.notRefined).toBeCloseTo(
      (t(rects[5]!.east) - t(rects[5]!.west)) * r.length,
      6,
    );
  });

  it("reports the true lowest clearance over the triangles for a clear ray", () => {
    const HALF = 6000 / A;
    const W = 2500 / A;
    const sigma = 900 / A;
    const hill = (lon: number, lat: number) =>
      300 *
        Math.exp(-((lon - 0.1 * HALF) ** 2 + lat * lat) / (2 * sigma * sigma)) +
      40 * Math.sin(lon * A * 0.004);
    const rects = strip(-HALF, HALF, 3, -W, W);
    const n = 33;
    const tiles = rects.map((r) => gridTile(r, n, hill));
    const target = stripTarget(
      rects.map((rectangle, i) => ({ rectangle, tile: tiles[i]! })),
    );
    for (const [la, lb, h] of [
      [0.2 * W, -0.35 * W, 420],
      [-0.5 * W, 0.6 * W, 380],
      [0, 0, 520],
    ]) {
      const from = at(-0.95 * HALF, la!, h!);
      const to = at(0.93 * HALF, lb!, h! - 30);
      const r = cast(from, to, target);
      const truth = trueMinimumClearance(from, to, tiles, n);
      expect(r.hit).toBeUndefined();
      expect(truth.meters).toBeGreaterThan(0);
      expect(Math.abs(r.minClearance!.meters - truth.meters)).toBeLessThan(
        1e-6,
      );
      // And the clearance stated is the one at its point along the ray.
      const p = new Float64Array(3);
      for (let i = 0; i < 3; i++) {
        p[i] = from[i]! + (to[i]! - from[i]!) * r.minClearance!.t;
      }
      expect(
        Math.abs(clearanceAt(p, tiles, n)! - r.minClearance!.meters),
      ).toBeLessThan(1e-6);
    }
  });

  it("stays exact on coarse tiles at high latitude (9 km cells at 60° N)", () => {
    // A level-6 tile: 2.8° square, where a straight edge's footprint bows
    // most from the straight (u, v) edge.
    const size = Math.PI / 64;
    const rectangle = {
      west: 0.2,
      east: 0.2 + size,
      south: 1.03,
      north: 1.03 + size,
    };
    const n = 33;
    const mid = 0.2 + size / 2;
    const ridge = (lon: number, lat: number) =>
      600 * Math.exp(-((((lon - mid) * Math.cos(lat) * A) / 15000) ** 2)) +
      200 * Math.sin(lat * 400);
    const tile = gridTile(rectangle, n, ridge, 6);
    const target = stripTarget([{ rectangle, tile }]);
    const from = at(0.2 + 0.1 * size, 1.03 + 0.35 * size, 900);
    const blocked = cast(
      from,
      at(0.2 + 0.9 * size, 1.03 + 0.62 * size, 500),
      target,
    );
    expect(blocked.hit).toBeDefined();
    expect(distanceToTile(blocked.hit!.point, tile)).toBeLessThan(1e-6);
    // 150 km at 3 km ends: the chord sags 440 m, lowest over the ridge.
    const high = at(0.2 + 0.1 * size, 1.03 + 0.35 * size, 3000);
    const to = at(0.2 + 0.9 * size, 1.03 + 0.62 * size, 3000);
    const clear = cast(high, to, target);
    expect(clear.hit).toBeUndefined();
    const truth = trueMinimumClearance(high, to, [tile], n);
    expect(truth.t).toBeGreaterThan(0.2);
    expect(truth.t).toBeLessThan(0.8);
    expect(Math.abs(clear.minClearance!.meters - truth.meters)).toBeLessThan(
      1e-6,
    );
  });

  it("finds a hit where a coarse triangle's 3D edge bows past its (u, v) cell", () => {
    // Level 4, 5×5 vertices: cells 2.8° wide. A straight east-west edge at
    // latitude φ bows about Δλ²·sin 2φ / 16 ≈ 950 m poleward of the (u, v)
    // grid line; just north of the line the surface there is the southern
    // triangle's.
    const size = Math.PI / 16;
    const rectangle = {
      west: 0.1,
      east: 0.1 + size,
      south: 0.8,
      north: 0.8 + size,
    };
    const tile = gridTile(rectangle, 5, () => 0, 4);
    const line = 0.8 + size / 2; // a vertex row
    const lon = 0.1 + size * 0.375; // mid-edge
    const north = line + 0.6e-4; // ~380 m north of the line
    const r = cast(
      at(lon, north, 1000),
      at(lon, north, -3000),
      stripTarget([{ rectangle, tile }]),
    );
    expect(r.hit).toBeDefined();
    expect(distanceToTile(r.hit!.point, tile)).toBeLessThan(1e-6);
  });

  it("gets the earth's curvature from the Earth-fixed triangles", () => {
    const HALF = 20000 / A;
    const W = 2000 / A;
    const rects = strip(-HALF * 1.01, HALF * 1.01, 32, -W, W);
    const n = 17;
    const target = stripTarget(
      rects.map((rectangle) => ({
        rectangle,
        tile: gridTile(rectangle, n, () => 0),
      })),
    );
    const H = 500;
    const r = cast(at(-HALF, 0, H), at(HALF, 0, H), target);
    // On the equator the section is a circle of radius a: the chord's lowest
    // point is (a + H)·cos θ − a above it. The drawn chords sag below the
    // ellipsoid by at most cell²/(8a).
    const expected = (A + H) * Math.cos(HALF) - A;
    const cell = ((rects[0]!.east - rects[0]!.west) * A) / (n - 1);
    expect(r.minClearance!.meters).toBeGreaterThanOrEqual(expected - 1e-6);
    expect(r.minClearance!.meters).toBeLessThan(
      expected + (cell * cell) / (8 * A) + 1e-6,
    );
    expect(expected).toBeLessThan(H - 30); // 31 m of drop over 40 km
  });

  it("blocks a ray through a hill on its near face", () => {
    const sigma = 300 / A;
    const tile = gridTile(
      SQUARE,
      N,
      (lon, lat) =>
        300 * Math.exp(-(lon * lon + lat * lat) / (2 * sigma * sigma)),
    );
    const r = cast(
      at(-0.9 * D, 0.05 * D, 100),
      at(0.9 * D, 0, 100),
      stripTarget([{ rectangle: SQUARE, tile }]),
    );
    const c = WGS84.cartesianToCartographic(r.hit!.point, {
      longitude: 0,
      latitude: 0,
      height: 0,
    })!;
    expect(c.longitude).toBeLessThan(0);
    expect(c.longitude).toBeGreaterThan(-3 * sigma);
    expect(distanceToTile(r.hit!.point, tile)).toBeLessThan(1e-6);
  });

  it("doesn't block an observer standing on a vertex by its own ground", () => {
    const tile = gridTile(SQUARE, 9, () => 0);
    const k = 4 * 9 + 2;
    const r = cast(
      vertex(tile, k),
      at(0.8 * D, 0.1 * D, 200),
      stripTarget([{ rectangle: SQUARE, tile }]),
    );
    expect(r.hit).toBeUndefined();
    expect(Math.abs(r.minClearance!.meters)).toBeLessThan(1e-6);
  });

  it("states the levels crossed and the largest geometric error among them", () => {
    const HALF = 4000 / A;
    const W = 1000 / A;
    const [west, east] = strip(-HALF, HALF, 2, -W, W) as [
      { west: number; south: number; east: number; north: number },
      { west: number; south: number; east: number; north: number },
    ];
    const target = stripTarget([
      { rectangle: west, tile: gridTile(west, 9, () => 0, 14) },
      { rectangle: east, tile: gridTile(east, 9, () => 0, 11) },
    ]);
    const r = cast(at(-0.9 * HALF, 0, 300), at(0.9 * HALF, 0, 300), target);
    expect(r.known).toEqual({
      minLevel: 11,
      maxLevel: 14,
      geometricError: LEVEL_ZERO_ERROR / 2 ** 11,
    });
    const westOnly = cast(
      at(-0.9 * HALF, 0, 300),
      at(-0.1 * HALF, 0, 300),
      target,
    );
    expect(westOnly.known!.geometricError).toBe(LEVEL_ZERO_ERROR / 2 ** 14);
  });

  it("crosses the antimeridian", () => {
    const W = 1000 / A;
    const w = 2000 / A;
    const left = { west: Math.PI - w, east: Math.PI, south: -W, north: W };
    const right = { west: -Math.PI, east: -Math.PI + w, south: -W, north: W };
    const ridge = (lon: number) =>
      Math.abs(lon + Math.PI - 0.5 * w) < 0.2 * w ? 900 : 0;
    const target = stripTarget([
      { rectangle: left, tile: gridTile(left, 17, () => 0) },
      { rectangle: right, tile: gridTile(right, 17, ridge) },
    ]);
    const r = cast(
      at(Math.PI - 0.8 * w, 0, 400),
      at(-Math.PI + 0.8 * w, 0, 400),
      target,
    );
    expect(r.hit).toBeDefined();
    expect(r.unknown.notDrawn + r.unknown.notRefined).toBe(0);
  });

  it("never misses a ridge beyond the pole, whatever meridian the ray follows", () => {
    // Four polar quads. West of the prime meridian, vertex row 15 (latitude
    // 1.564) stands 1500 m: a ridge just past the pole for rays starting
    // east of it. From latitude 1.552 at 1300–1500 m they sag below it.
    const quads = [-Math.PI, -Math.PI / 2, 0, Math.PI / 2].map((west) => ({
      west,
      east: west + Math.PI / 2,
      south: 1.45,
      north: Math.PI / 2,
    }));
    const row = (lat: number) =>
      Math.round(((lat - 1.45) / (Math.PI / 2 - 1.45)) * 16);
    const target = stripTarget(
      quads.map((rectangle) => ({
        rectangle,
        tile: gridTile(
          rectangle,
          17,
          (lon, lat) => (rectangle.west < 0 && row(lat) === 15 ? 1500 : 0),
          3,
        ),
      })),
    );
    let tried = 0;
    for (const lon of [
      Math.PI / 2,
      Math.PI / 4,
      0.3,
      1.2,
      (3 * Math.PI) / 4,
      Math.PI - 0.1,
    ]) {
      for (let k = 0; k < 5; k++) {
        const h = 1300 + 50 * k;
        const r = cast(at(lon, 1.552, h), at(lon + Math.PI, 1.552, h), target);
        expect(r.hit, `lon ${lon}, ${h} m`).toBeDefined();
        // Past the pole: on the far, western side.
        const c = WGS84.cartesianToCartographic(r.hit!.point, {
          longitude: 0,
          latitude: 0,
          height: 0,
        })!;
        expect(c.longitude).toBeLessThan(0);
        expect(r.unknown.notDrawn + r.unknown.notRefined).toBe(0);
        tried++;
      }
    }
    expect(tried).toBe(30);
  });

  it("traces only the part of a ground-to-space segment that terrain can reach", async () => {
    // A dish 10 m up at (0, 0) to a point about 2,000 km up, 60° high.
    const W = 0.001;
    const rects = strip(-0.0005, 0.0025, 6, -W, W);
    const tiles = rects.map((rectangle) => ({
      rectangle,
      tile: gridTile(rectangle, 9, () => 0),
    }));
    const from = at(0, 0, 10);
    // East is +y at longitude 0, up is +x.
    const to = Float64Array.of(
      from[0]! + 2.3e6 * Math.sin(Math.PI / 3),
      from[1]! + 2.3e6 * Math.cos(Math.PI / 3),
      from[2]!,
    );
    const target = stripTarget(tiles);
    const r = cast(from, to, target);
    expect(r.band![0]).toBe(0);
    expect(r.band![1]).toBeLessThan(0.01);
    expect(r.above).toBeGreaterThan(0.99 * r.length);
    expect(r.unknown.notDrawn).toBe(0);
    const sight = await terrainLineOfSight(from, to, terrainQueries(target));
    expect(sight.clear).toBe(true);
    expect(sight.unknownFraction).toBe(0);
    expect(sight.accuracy.note).toMatch(
      /of the path is above 9100 m, clear there/,
    );
    // A gap in the band is unknown, but only for its own length.
    const holed = stripTarget(
      tiles.map((t, i) =>
        i === 2 ? { rectangle: t.rectangle, unknown: "not drawn" as const } : t,
      ),
    );
    const g = cast(from, to, holed);
    expect(g.unknown.notDrawn).toBeGreaterThan(0);
    expect(g.unknown.notDrawn / g.length).toBeLessThan(0.01);
    // Wholly above the band: clear without asking.
    const quiet = stripTarget([]);
    const high = cast(at(0, 0, 20000), at(0.01, 0, 30000), quiet);
    expect(high.band).toBeUndefined();
    expect(quiet.calls).toBe(0);
  });

  it("rejects a patch that lies outside its tile", () => {
    const tile = gridTile(SQUARE, 5, () => 0);
    const wide = { ...SQUARE, east: 2 * D };
    expect(() =>
      cast(at(0, 0, 100), at(1.5 * D, 0, 100), {
        ellipsoid: WGS84,
        patchAt: () => ({ rectangle: wide, tile }),
      }),
    ).toThrow(/outside its tile/);
  });

  it("takes well under a frame for a 40 km ray over loaded level-14 tiles", () => {
    // Level-14 tiles (about 1.2 km) of 65×65 vertices: 8,192 triangles
    // each, more than Cesium World Terrain's at that level.
    const size = Math.PI / 2 ** 14;
    const lat0 = 0.6; // 34° N: off the equator's symmetries
    const lon0 = -2.0;
    const tiles: {
      rectangle: typeof SQUARE;
      tile: ReturnType<typeof gridTile>;
    }[] = [];
    const rough = (lon: number, lat: number) =>
      400 +
      120 * Math.sin(lon * A * 0.003) * Math.cos(lat * A * 0.0021) +
      25 * Math.sin(lon * A * 0.031 + lat * A * 0.017);
    for (let i = 0; i < 44; i++) {
      for (let j = -2; j <= 2; j++) {
        const rectangle = {
          west: lon0 + i * size,
          east: lon0 + (i + 1) * size,
          south: lat0 + j * size,
          north: lat0 + (j + 1) * size,
        };
        tiles.push({ rectangle, tile: gridTile(rectangle, 65, rough) });
      }
    }
    const target = stripTarget(tiles);
    const from = at(lon0 + 1.5 * size, lat0 + 0.3 * size, 700);
    const along = 40000 / (A * Math.cos(lat0));
    const to = at(lon0 + 1.5 * size + along, lat0 + 0.9 * size, 760);
    const length = Math.hypot(
      to[0]! - from[0]!,
      to[1]! - from[1]!,
      to[2]! - from[2]!,
    );
    expect(length).toBeGreaterThan(39900);
    let start = performance.now();
    const cold = cast(from, to, target);
    const coldMs = performance.now() - start;
    const times: number[] = [];
    for (let k = 0; k < 20; k++) {
      start = performance.now();
      cast(from, to, target);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const warm = times[10]!;
    expect(cold.unknown.notDrawn).toBe(0);
    // Reported, not gated (the final review): a loaded runner or coverage
    // slows any wall clock. Only a sanity ceiling, far above the figures.
    console.log(
      `40 km cast: ${coldMs.toFixed(1)} ms cold (with compiling the traversal), ${warm.toFixed(2)} ms warm (median of 20)`,
    );
    expect(coldMs).toBeLessThan(5000);
    expect(warm).toBeLessThan(5000);
  });

  it("returns unknown for non-finite input", () => {
    const target = stripTarget([
      { rectangle: SQUARE, tile: gridTile(SQUARE, 5, () => 0) },
    ]);
    expect(castTerrainRay([NaN, 0, 0], at(0, 0, 0), target)).toBeUndefined();
    expect(
      castTerrainRay(at(0, 0, 0), [Infinity, 0, 0], target),
    ).toBeUndefined();
  });
});

// ------------------------------------------------------------------ globe

const EMPTY_ASSET = {
  meshes: [],
  materials: [],
  textures: [],
  images: [],
  draws: [],
  featureTables: [],
  warnings: [],
} as unknown as GltfAsset;

/** A terrain source whose tiles "load" flat 9×9 meshes at 50 m. */
async function terrain(
  levels: number,
  metadata = false,
): Promise<TerrainSource> {
  const available = Array.from({ length: levels }, (_, l) => [
    { startX: 0, startY: 0, endX: 2 ** (l + 1) - 1, endY: 2 ** l - 1 },
  ]);
  // With the metadata extension, levels past `available` are listed by
  // metadata tiles; the fake loader sends none, so they stay pending.
  const extra = metadata
    ? { extensions: ["metadata"], metadataAvailability: 10 }
    : {};
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          format: "quantized-mesh-1.0",
          tiles: ["{z}/{x}/{y}.terrain"],
          available,
          ...extra,
        }),
      ),
  );
  const loader: TerrainLoader = async (request) => ({
    asset: EMPTY_ASSET,
    info: {
      minimumHeight: 50,
      maximumHeight: 50,
      sphere: { center: [0, 0, 0], radius: 1 },
      quadrants: [
        [50, 50],
        [50, 50],
        [50, 50],
        [50, 50],
      ],
      heights: gridTile(request.rect, 9, () => 50).heights,
    },
  });
  return TerrainSource.create(
    "https://terrain.test/layer.json",
    undefined,
    loader,
    {
      warnings: new Set(),
    },
  );
}

/** Expands and returns the tiles on the path to `level` at a point. */
function path(
  source: TerrainSource,
  lon: number,
  lat: number,
  level: number,
): Tile[] {
  const tiles: Tile[] = [];
  let tile = source.root.children.find((t) =>
    contains(t.globe!.rectangle, lon, lat),
  )!;
  for (;;) {
    tiles.push(tile);
    if (tile.globe!.level === level) {
      return tiles;
    }
    source.expand(tile);
    tile = tile.children.find((t) => contains(t.globe!.rectangle, lon, lat))!;
  }
}

async function load(source: TerrainSource, tile: Tile): Promise<void> {
  await source.loadTile(tile, new AbortController().signal);
  tile.state = "ready";
}

describe("TerrainSource.rayTarget", () => {
  afterEach(() => vi.unstubAllGlobals());
  const LON = 0.3;
  const LAT = 0.2;

  it("is unknown where nothing is drawn, over the deepest tile there", async () => {
    const source = await terrain(6);
    const tiles = path(source, LON, LAT, 3);
    const patch = source.rayTarget().patchAt(LON, LAT);
    expect(patch.tile).toBeUndefined();
    expect(patch.unknown).toBe("not drawn");
    expect(patch.rectangle).toEqual(tiles[3]!.globe!.rectangle);
  });

  it("gives the deepest drawn tile, its level and geometric error", async () => {
    const source = await terrain(6);
    const [, , t2] = path(source, LON, LAT, 2);
    await load(source, t2!);
    t2!.viewMask = 1;
    const patch = source.rayTarget().patchAt(LON, LAT);
    expect(patch.tile!.level).toBe(2);
    expect(patch.tile!.geometricError).toBe(LEVEL_ZERO_ERROR / 4);
    expect(patch.tile!.heights).toBe(t2!.globe!.heights);
    expect(patch.tile!.rectangle).toEqual(t2!.globe!.rectangle);
    expect(contains(patch.rectangle, LON, LAT)).toBe(true);

    // A finer drawn tile wins where it is.
    const child = t2!.children.find((c) =>
      contains(c.globe!.rectangle, LON, LAT),
    )!;
    await load(source, child);
    child.viewMask = 1;
    expect(source.rayTarget().patchAt(LON, LAT).tile!.level).toBe(3);
    // Loaded but drawn in no view of the mask: not drawn.
    child.viewMask = 2;
    expect(source.rayTarget(1).patchAt(LON, LAT).tile!.level).toBe(2);
    expect(source.rayTarget(2).patchAt(LON, LAT).tile!.level).toBe(3);
    // Drawn but its content gone: not drawn.
    source.unloadTile(child);
    child.state = "unloaded";
    expect(source.rayTarget(2).patchAt(LON, LAT).unknown).toBe("not drawn");
  });

  it("is unknown under a stand-in or placeholder for loading tiles, known for quadrants without data", async () => {
    const source = await terrain(6);
    const [, t1] = path(source, LON, LAT, 1);
    await load(source, t1!);
    t1!.viewMask = 1;
    const [inside, other] = [
      t1!.children.find((c) => contains(c.globe!.rectangle, LON, LAT))!,
      t1!.children.find((c) => !contains(c.globe!.rectangle, LON, LAT))!,
    ];
    // Drawn whole in place of finer tiles still loading (not refined).
    t1!.standInMask = 1;
    expect(source.rayTarget().patchAt(LON, LAT).unknown).toBe("not refined");
    // A quadrant without data: this tile is the finest there is.
    inside.fillFromParent = true;
    expect(source.rayTarget().patchAt(LON, LAT).tile!.level).toBe(1);
    inside.fillFromParent = false;
    t1!.standInMask = 0;

    // Mixed LOD: drawn only in its holes, beside finer content.
    await load(source, other);
    other.viewMask = 1;
    t1!.placeholderMask = 1;
    t1!.holes = new Set([inside]);
    expect(source.rayTarget().patchAt(LON, LAT).unknown).toBe("not refined");
    const o = other.globe!.rectangle;
    expect(
      source.rayTarget().patchAt((o.west + o.east) / 2, (o.south + o.north) / 2)
        .tile!.level,
    ).toBe(2);
    inside.fillFromParent = true;
    expect(source.rayTarget().patchAt(LON, LAT).tile!.level).toBe(1);
  });

  it("gives the ellipsoid's drawn flat tiles", () => {
    const source = TerrainSource.ellipsoid(
      async () => {
        throw new Error("unused");
      },
      { warnings: new Set() },
    );
    const tile = source.root.children.find((t) =>
      contains(t.globe!.rectangle, LON, LAT),
    )!;
    tile.state = "ready";
    tile.viewMask = 1;
    const patch = source.rayTarget().patchAt(LON, LAT);
    expect(patch.tile!.heights.triangles.length).toBe(15 * 15 * 6);
    expect(patch.tile!.heights.maximumHeight).toBe(0);
    // A ray between two points 1 km up, 50 km apart, clears it.
    const r = cast(
      at(LON, LAT, 1000),
      at(LON + 50000 / A, LAT, 1000),
      source.rayTarget(),
    );
    expect(r.hit).toBeUndefined();
    expect(r.unknown.notDrawn).toBe(0);
  });
});

describe("globe selections mark stand-ins", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A view 2 km above (0.3, 0.2), looking down. */
  function view(): SelectionView {
    const position = at(0.3, 0.2, 2000);
    const length = Math.hypot(position[0]!, position[1]!, position[2]!);
    return {
      id: 0,
      position,
      direction: position.map((x) => -x / length) as Float64Array,
      cartographic: { longitude: 0.3, latitude: 0.2, height: 2000 },
      planes: new Float64Array(0),
      sseDenominator: 2 * Math.tan(Math.PI / 6),
      height: 1000,
    };
  }

  for (const policy of ["budgeted", "stepwise"] as const) {
    it(`${policy}: a loaded tile drawn while its children load`, async () => {
      const source = await terrain(4);
      const level0 = source.root.children.find((t) =>
        contains(t.globe!.rectangle, 0.3, 0.2),
      )!;
      await load(source, level0);
      const selection =
        policy === "budgeted"
          ? new GlobeBudgetedSelection(source, {})
          : new GlobeStepwiseSelection(source, {});
      const result = selection.select(
        source.root,
        source.geometricError,
        view(),
      );
      expect(result.selected).toContain(level0);
      expect(result.standIns).toContain(level0);
      for (const tile of result.standIns!) {
        expect(result.selected).toContain(tile);
      }
    });

    it(`${policy}: a loaded tile drawn while its children's availability loads`, async () => {
      const source = await terrain(1, true);
      const level0 = source.root.children.find((t) =>
        contains(t.globe!.rectangle, 0.3, 0.2),
      )!;
      await load(source, level0);
      // Its metadata (its children's availability) hasn't come: loading
      // leaves it unexpanded rather than childless.
      expect(level0.globe!.expanded).toBe(false);
      expect(level0.children).toHaveLength(0);
      const selection =
        policy === "budgeted"
          ? new GlobeBudgetedSelection(source, {})
          : new GlobeStepwiseSelection(source, {});
      const result = selection.select(
        source.root,
        source.geometricError,
        view(),
      );
      expect(result.selected).toContain(level0);
      expect(result.standIns).toContain(level0);
      // As the tileset marks it: the ray target calls it not refined.
      level0.viewMask = 1;
      level0.standInMask = 1;
      expect(source.rayTarget().patchAt(0.3, 0.2).unknown).toBe("not refined");
    });
  }
});
