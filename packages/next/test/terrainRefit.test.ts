// A terrain tile's geometric error, refitted bottom-up from decoded meshes
// (`terrainRefit.ts`, wired in `TerrainSource.loaded`).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LEVEL_ZERO_ERROR,
  TerrainSource,
  type TerrainLoader,
} from "../src/globe/TerrainSource.ts";
import type { Rectangle, TerrainHeights } from "../src/globe/quantizedMesh.ts";
import { deviationFromParent, parentBound } from "../src/globe/terrainRefit.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { gridTile } from "./terrainRayFixtures.ts";

const EMPTY_ASSET = {
  meshes: [],
  materials: [],
  textures: [],
  images: [],
  draws: [],
  featureTables: [],
  warnings: [],
} as unknown as GltfAsset;

type Surface = (lon: number, lat: number) => number;

/** Levels 0 to `levels` over the whole earth, each mesh sampling `surface`. */
async function source(
  surface: Surface,
  levels: number,
  options: { predictive?: boolean } = {},
): Promise<TerrainSource> {
  const available = Array.from({ length: levels + 1 }, (_, l) => [
    { startX: 0, startY: 0, endX: 2 ** (l + 1) - 1, endY: 2 ** l - 1 },
  ]);
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          format: "quantized-mesh-1.0",
          tiles: ["{z}/{x}/{y}.terrain"],
          available,
        }),
      ),
  );
  const loader: TerrainLoader = async (request) => {
    const tile = gridTile(request.rect, 9, surface);
    return {
      asset: EMPTY_ASSET,
      info: {
        minimumHeight: tile.heights.minimumHeight,
        maximumHeight: tile.heights.maximumHeight,
        sphere: { center: [0, 0, 0], radius: 1 },
        quadrants: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
        heights: tile.heights,
      },
    };
  };
  const terrain = await TerrainSource.create(
    "https://terrain.test/layer.json",
    undefined,
    loader,
    { warnings: new Set() },
  );
  terrain.predictiveErrors = options.predictive === true;
  return terrain;
}

const signal = new AbortController().signal;

/** Loads the tile at `depth` containing (lon, lat), and its siblings' tree. */
async function loadPath(
  terrain: TerrainSource,
  depth: number,
  lon: number,
  lat: number,
): Promise<Tile[]> {
  const path: Tile[] = [];
  let tile = terrain.root.children.find(
    (t) => lon >= t.globe!.rectangle.west && lon <= t.globe!.rectangle.east,
  )!;
  for (let level = 0; level <= depth; level++) {
    await terrain.loadTile(tile, signal);
    path.push(tile);
    // Its four children, so its own bound can form.
    if (level < depth) {
      const next = tile.children.find((c) => {
        const r = c.globe!.rectangle;
        return (
          lon >= r.west && lon <= r.east && lat >= r.south && lat <= r.north
        );
      })!;
      for (const child of tile.children) {
        if (child !== next) {
          await terrain.loadTile(child, signal);
        }
      }
      tile = next;
    }
  }
  return path;
}

afterEach(() => vi.unstubAllGlobals());

describe("a tile's error refitted from its children", () => {
  const LON = 0.3;
  const LAT = 0.2;
  const DEPTH = 9;
  const levelError = (level: number) => LEVEL_ZERO_ERROR / 2 ** level;

  it("falls to the child's error over a surface the meshes agree on", async () => {
    // A plane: every mesh is the same surface, up to quantization.
    const terrain = await source(
      (lon, lat) => 400 + 3000 * lon + 2000 * lat,
      10,
    );
    const path = await loadPath(terrain, DEPTH, LON, LAT);
    for (let level = 1; level < DEPTH; level++) {
      const tile = path[level]!;
      const bound = tile.geometricError;
      // Its children's level estimate, plus a quantization sliver.
      expect(bound).toBeLessThan(levelError(level));
      expect(bound).toBeGreaterThan(levelError(level + 1) - 1e-9);
      expect(bound).toBeLessThan(levelError(level + 1) + 1);
    }
  });

  it("keeps the level estimate over a surface rougher than it", async () => {
    // Heights that change by 3 km between samples, where level 9's
    // estimate is 150 m.
    const rough: Surface = (lon, lat) =>
      3000 * Math.sin(lon * 4e5) * Math.cos(lat * 3e5);
    const terrain = await source(rough, 10);
    const path = await loadPath(terrain, DEPTH, LON, LAT);
    const tile = path[DEPTH - 1]!;
    expect(tile.globe!.refit.soundError).toBeUndefined();
    expect(tile.geometricError).toBe(levelError(DEPTH - 1));
  });

  it("never rises above the level estimate", async () => {
    const terrain = await source(
      (lon, lat) => 800 * Math.sin(lon * 3e3) * Math.cos(lat * 2e3),
      10,
    );
    const path = await loadPath(terrain, DEPTH, LON, LAT);
    for (let level = 0; level <= DEPTH; level++) {
      expect(path[level]!.geometricError).toBeLessThanOrEqual(
        levelError(level) * (1 + 1e-12),
      );
    }
  });

  it("is a bound on a finer surface: no measured deviation exceeds it", () => {
    // The truth is a continuous surface; each mesh samples it on a 9 by 9
    // grid. A parent's measured distance from the truth must stay within the
    // bound its children give it.
    const truth: Surface = (lon, lat) =>
      120 * Math.sin(lon * 9e3) * Math.cos(lat * 7e3) +
      25 * Math.sin(lon * 7e4 + lat * 5e4);
    const rect: Rectangle = {
      west: 0.3,
      south: 0.2,
      east: 0.3 + 0.004,
      north: 0.2 + 0.004,
    };
    const quadrants = (r: Rectangle): Rectangle[] => {
      const mx = (r.west + r.east) / 2;
      const my = (r.south + r.north) / 2;
      return [
        { west: r.west, south: r.south, east: mx, north: my },
        { west: mx, south: r.south, east: r.east, north: my },
        { west: r.west, south: my, east: mx, north: r.north },
        { west: mx, south: my, east: r.east, north: r.north },
      ];
    };
    /** Largest |mesh - truth| over a dense sample of the rectangle. */
    const distance = (mesh: TerrainHeights, r: Rectangle): number => {
      let worst = 0;
      for (let j = 0; j <= 60; j++) {
        for (let i = 0; i <= 60; i++) {
          const lon = r.west + ((r.east - r.west) * i) / 60;
          const lat = r.south + ((r.north - r.south) * j) / 60;
          const h = heightIn(
            mesh,
            (lon - r.west) / (r.east - r.west),
            (lat - r.south) / (r.north - r.south),
          );
          worst = Math.max(worst, Math.abs(h - truth(lon, lat)));
        }
      }
      return worst;
    };
    const parent = gridTile(rect, 9, truth).heights;
    const kids = quadrants(rect).map((r, q) => ({
      mesh: gridTile(r, 9, truth).heights,
      r,
      q,
    }));
    const own = kids.map((k) => distance(k.mesh, k.r));
    const deviations = kids.map((k) =>
      deviationFromParent(k.mesh, parent, k.q % 2, Math.floor(k.q / 2)),
    );
    const bound = parentBound(
      kids.map((_, i) => ({ deviation: deviations[i]!, error: own[i]! })),
    );
    const actual = distance(parent, rect);
    expect(actual).toBeLessThanOrEqual(bound * 1.001);
    // And the bound is not vacuous: the same order as the truth.
    expect(bound).toBeLessThan(actual * 3);
  });

  it("measures the gap at an edge crossing that no vertex shows", () => {
    // Parent: one square, split along its main diagonal, 0 on the diagonal
    // and 1,000 m at the other two corners. Child (south-west quadrant):
    // split along the other diagonal, matching the parent at all four of its
    // vertices (0, 500, 500, 0 m), so no vertex differs. The two diagonals
    // cross at the quadrant's centre, where the child is 500 m and the
    // parent 0.
    const Q = 32767;
    const parent: TerrainHeights = {
      u: new Uint16Array([0, Q, 0, Q]),
      v: new Uint16Array([0, 0, Q, Q]),
      h: new Uint16Array([0, Q, Q, 0]),
      triangles: new Uint32Array([0, 1, 3, 0, 3, 2]),
      minimumHeight: 0,
      maximumHeight: 1000,
    };
    const child: TerrainHeights = {
      u: new Uint16Array([0, Q, 0, Q]),
      v: new Uint16Array([0, 0, Q, Q]),
      h: new Uint16Array([0, Q, Q, 0]),
      triangles: new Uint32Array([0, 1, 2, 1, 3, 2]),
      minimumHeight: 0,
      maximumHeight: 500,
    };
    expect(deviationFromParent(child, parent, 0, 0)).toBeCloseTo(500, 0);
  });

  it("gives up on a hostile mesh, quickly, keeping the level estimate", () => {
    const good = gridTile(
      { west: 0.3, south: 0.2, east: 0.304, north: 0.204 },
      9,
      () => 5,
    ).heights;
    const n = 60000;
    // Every triangle spans the whole tile: a uniform grid would bin each into
    // every cell.
    const hostile = {
      u: new Uint16Array([0, 32767, 0, 32767]),
      v: new Uint16Array([0, 0, 32767, 32767]),
      h: new Uint16Array(4),
      triangles: new Uint32Array(n * 3).map((_, i) => [0, 1, 3][i % 3]!),
      minimumHeight: 0,
      maximumHeight: 1,
    } satisfies TerrainHeights;
    const t0 = performance.now();
    expect(deviationFromParent(hostile, good, 0, 0)).toBe(Infinity);
    expect(deviationFromParent(good, hostile, 0, 0)).toBe(Infinity);
    expect(performance.now() - t0).toBeLessThan(200);
    // An index past the vertices, and arrays of different lengths.
    const wild = {
      ...good,
      triangles: new Uint32Array([0, 1, 99999]),
    };
    expect(deviationFromParent(wild, good, 0, 0)).toBe(Infinity);
    const ragged = { ...good, h: good.h.slice(1) };
    expect(deviationFromParent(ragged, good, 0, 0)).toBe(Infinity);
    // Degenerate triangles are skipped, not divided by.
    const flat = {
      ...good,
      triangles: new Uint32Array([0, 0, 0, ...good.triangles]),
    };
    expect(Number.isFinite(deviationFromParent(good, flat, 0, 0))).toBe(true);
  });

  it("predicts a smooth tile's error low, and only when asked", async () => {
    const plane: Surface = (lon, lat) => 400 + 3000 * lon + 2000 * lat;
    const off = await source(plane, 10);
    const on = await source(plane, 10, { predictive: true });
    // The deepest tile has no children loaded: only a prediction can lower it.
    const a = (await loadPath(off, DEPTH, LON, LAT))[DEPTH]!;
    const b = (await loadPath(on, DEPTH, LON, LAT))[DEPTH]!;
    expect(a.geometricError).toBe(levelError(DEPTH));
    expect(b.geometricError).toBeLessThan(1);
  });
});

/** Height at normalized (u, v) in a regular grid mesh, by its triangles. */
function heightIn(t: TerrainHeights, u: number, v: number): number {
  const qu = u * 32767;
  const qv = v * 32767;
  for (let i = 0; i + 2 < t.triangles.length; i += 3) {
    const [a, b, c] = [
      t.triangles[i]!,
      t.triangles[i + 1]!,
      t.triangles[i + 2]!,
    ];
    const d =
      (t.v[b]! - t.v[c]!) * (t.u[a]! - t.u[c]!) +
      (t.u[c]! - t.u[b]!) * (t.v[a]! - t.v[c]!);
    const l1 =
      ((t.v[b]! - t.v[c]!) * (qu - t.u[c]!) +
        (t.u[c]! - t.u[b]!) * (qv - t.v[c]!)) /
      d;
    const l2 =
      ((t.v[c]! - t.v[a]!) * (qu - t.u[c]!) +
        (t.u[a]! - t.u[c]!) * (qv - t.v[c]!)) /
      d;
    const l3 = 1 - l1 - l2;
    if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) {
      const q = l1 * t.h[a]! + l2 * t.h[b]! + l3 * t.h[c]!;
      return (
        t.minimumHeight + (q / 32767) * (t.maximumHeight - t.minimumHeight)
      );
    }
  }
  throw new Error("outside the mesh");
}
