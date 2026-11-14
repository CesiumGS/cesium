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
import { Jobs, type JobMessage } from "../src/io/Jobs.ts";
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
  options: {
    predictive?: boolean;
    /** Measure the deviation in the loader, as the worker does. */
    inLoader?: boolean;
    budget?: number;
    requests?: { hasParent: boolean }[];
  } = {},
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
    options.requests?.push({ hasParent: request.refit !== undefined });
    const deviation =
      options.inLoader && request.refit
        ? deviationFromParent(
            tile.heights,
            request.refit.heights,
            request.refit.qx,
            request.refit.qy,
          )
        : undefined;
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
        ...(deviation !== undefined ? { deviation } : {}),
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
  // Measured as loaded, whatever the machine's speed (the budget has its own test).
  terrain.refitBudgetMs = options.budget ?? Infinity;
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

  it("takes the deviation a loader measured: the same errors as measuring here", async () => {
    const surface: Surface = (lon, lat) =>
      800 * Math.sin(lon * 3e3) * Math.cos(lat * 2e3) + 3000 * lon;
    const requests: { hasParent: boolean }[] = [];
    const here = await source(surface, 10);
    const there = await source(surface, 10, { inLoader: true, requests });
    const a = await loadPath(here, DEPTH, LON, LAT);
    const b = await loadPath(there, DEPTH, LON, LAT);
    // Every tile below the first level asked for its parent's surface.
    expect(requests.filter((r) => r.hasParent).length).toBeGreaterThan(DEPTH);
    for (let level = 0; level <= DEPTH; level++) {
      expect(b[level]!.geometricError).toBe(a[level]!.geometricError);
      expect(b[level]!.globe!.refit.deviation).toBe(
        a[level]!.globe!.refit.deviation,
      );
    }
  });

  it("spends a bounded time on the page, queueing the rest", async () => {
    vi.useFakeTimers();
    try {
      const terrain = await source((lon, lat) => 400 + 3000 * lon + lat, 10, {
        budget: 2,
      });
      // Every tile's first measure "takes" the whole budget.
      let now = 0;
      const clock = vi.spyOn(performance, "now").mockImplementation(() => {
        now += 5;
        return now;
      });
      const path = await loadPath(terrain, 3, LON, LAT);
      const measured = () =>
        path.filter((t) => t.globe!.refit.deviation !== undefined).length;
      const first = measured();
      expect(first).toBeLessThan(path.length - 1);
      await vi.advanceTimersByTimeAsync(2000);
      expect(measured()).toBeGreaterThan(first);
      clock.mockRestore();
    } finally {
      vi.useRealTimers();
    }
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

/**
 * The source's decodes and leftover deviations as jobs (`TerrainSource.jobs`)
 * on a fake worker: it runs the source's own loader for "terrain" and
 * `deviationFromParent` for "terrainDeviation", replying when the test
 * delivers (or at once, in a microtask, with `auto`).
 */
function withJobs(terrain: TerrainSource, auto = false) {
  const load = (terrain as unknown as { load: TerrainLoader }).load;
  const held: JobMessage[] = [];
  const run = async (m: JobMessage) => {
    const result =
      m.type === "terrain"
        ? await load(m as unknown as Parameters<TerrainLoader>[0], signal)
        : deviationFromParent(
            m.child as TerrainHeights,
            m.parent as TerrainHeights,
            m.qx as number,
            m.qy as number,
          );
    jobs.reply({ id: m.id, ok: true, result });
  };
  const jobs = new Jobs({
    size: 2,
    post: (_worker, message) => {
      if (message.type === "cancel") {
        return;
      }
      if (auto) {
        queueMicrotask(() => void run(message));
      } else {
        held.push(message);
      }
    },
  });
  terrain.jobs = jobs;
  /** Replies to the held messages `pick` chooses. */
  const deliver = async (pick: (m: JobMessage) => boolean) => {
    for (const m of held.filter(pick)) {
      held.splice(held.indexOf(m), 1);
      await run(m);
    }
  };
  return { jobs, held, deliver };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the refit as jobs (TerrainSource.jobs)", () => {
  const LON = 0.3;
  const LAT = 0.2;
  const surface: Surface = (lon, lat) =>
    800 * Math.sin(lon * 3e3) * Math.cos(lat * 2e3) + 3000 * lon;

  it("gives the same errors as measuring on the page", async () => {
    const here = await source(surface, 10);
    const there = await source(surface, 10);
    withJobs(there, true);
    const a = await loadPath(here, 6, LON, LAT);
    const b = await loadPath(there, 6, LON, LAT);
    await settle();
    for (let level = 0; level <= 6; level++) {
      expect(b[level]!.globe!.refit.deviation).toBe(
        a[level]!.globe!.refit.deviation,
      );
      expect(b[level]!.geometricError).toBe(a[level]!.geometricError);
    }
  });

  it("measures a child that decoded first after its parent's decode, in the apply phase", async () => {
    const terrain = await source(surface, 10);
    const { jobs } = withJobs(terrain, true);
    const path = await loadPath(terrain, 3, LON, LAT);
    await settle();
    const parent = path[3]!;
    const child = parent.children[0]!;
    // The parent's surface left the cache; it reloads, and its child's
    // decode wins the race.
    terrain.unloadTile(parent);
    const manual = withJobs(terrain);
    manual.jobs.phased = true;
    const parentLoad = terrain.loadTile(parent, signal);
    const childLoad = terrain.loadTile(child, signal);
    expect(parent.globe!.decoding?.state).toBe("running");
    await manual.deliver(
      (m) => m.type === "terrain" && (m.url as string) === child.contentUrl,
    );
    manual.jobs.apply(Infinity);
    await childLoad;
    const refit = child.globe!.refitJob!;
    expect(refit.state).toBe("waiting");
    expect(manual.held.some((m) => m.type === "terrainDeviation")).toBe(false);
    // The parent decodes and applies: the child's measure is posted with
    // its surface, and applies in a later phase.
    await manual.deliver((m) => m.type === "terrain");
    manual.jobs.apply(Infinity);
    await parentLoad;
    expect(refit.state).toBe("running");
    const posted = manual.held.find((m) => m.type === "terrainDeviation")!;
    expect(posted.parent).toBe(parent.globe!.heights);
    await manual.deliver((m) => m.type === "terrainDeviation");
    expect(child.globe!.refit.deviation).toBeUndefined();
    manual.jobs.apply(Infinity);
    expect(child.globe!.refit.deviation).toBe(
      deviationFromParent(child.globe!.heights!, parent.globe!.heights!, 0, 0),
    );
    expect(child.globe!.refitJob).toBeUndefined();
    expect(jobs.stats.running).toBe(0);
  });

  it("cancels a child's measure with its parent's decode, and when its surface leaves", async () => {
    const terrain = await source(surface, 10);
    withJobs(terrain, true);
    const path = await loadPath(terrain, 3, LON, LAT);
    await settle();
    const parent = path[3]!;
    const [first, second] = parent.children;
    terrain.unloadTile(parent);
    const manual = withJobs(terrain);
    manual.jobs.phased = true;
    const parentAbort = new AbortController();
    const parentLoad = terrain.loadTile(parent, parentAbort.signal);
    const loads = [first!, second!].map((c) => terrain.loadTile(c, signal));
    await manual.deliver(
      (m) =>
        m.type === "terrain" &&
        [first!.contentUrl, second!.contentUrl].includes(m.url as string),
    );
    manual.jobs.apply(Infinity);
    await Promise.all(loads);
    const a = first!.globe!.refitJob!;
    const b = second!.globe!.refitJob!;
    expect([a.state, b.state]).toEqual(["waiting", "waiting"]);
    // The first child is evicted: its measure goes.
    terrain.unloadTile(first!);
    expect(a.state).toBe("cancelled");
    // The parent is deselected mid-decode: the second child's measure goes with it.
    parentAbort.abort();
    await expect(parentLoad).rejects.toThrow(/Aborted/);
    expect(b.state).toBe("cancelled");
    await settle();
    expect(second!.globe!.refitJob).toBeUndefined();
    expect(manual.held.some((m) => m.type === "terrainDeviation")).toBe(false);
  });
});
