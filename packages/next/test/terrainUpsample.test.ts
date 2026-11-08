// Terrain past its data (engine bug 1, Amsterdam's blurry imagery): Cesium
// World Terrain has no tiles below level 13 over Amsterdam's polders, so
// the globe's budgeted selection stopped there, and the imagery, whose
// level follows the drawn terrain tile, stopped at Bing's level 13 (about
// 12 m a texel) at every range. As 1.x, tiles past the data are upsampled:
// clipped from the nearest tile with data, so their imagery refines.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  interpolateHeight,
  upsampleTerrainTile,
  type Rectangle,
  type TerrainHeights,
  type TileRange,
} from "../src/globe/quantizedMesh.ts";
import {
  LEVEL_ZERO_ERROR,
  TerrainSource,
  skirtDepths,
  rectangle as tileRectangle,
  type TerrainLoader,
} from "../src/globe/TerrainSource.ts";
import { GlobeBudgetedSelection } from "../src/globe/GlobeBudgeted.ts";
import { GlobeStepwiseSelection } from "../src/globe/GlobeStepwise.ts";
import { imageryLevel } from "../src/globe/GlobeImagery.ts";
import type { ImageryProvider } from "../src/globe/ImageryProvider.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import { at, contains, gridTile } from "./terrainRayFixtures.ts";

const PARENT: Rectangle = { west: 0.3, south: 0.2, east: 0.302, north: 0.202 };

/** A plane tilted in both directions: interpolation on it is exact. */
const slope = (lon: number, lat: number) =>
  40 + (lon - 0.3) * 3e5 + (lat - 0.2) * 1e5;

/** The quadrant `q` (south-west, south-east, north-west, north-east). */
function quadrant(r: Rectangle, q: number): Rectangle {
  const mx = (r.west + r.east) / 2;
  const my = (r.south + r.north) / 2;
  return {
    west: q & 1 ? mx : r.west,
    east: q & 1 ? r.east : mx,
    south: q & 2 ? my : r.south,
    north: q & 2 ? r.north : my,
  };
}

describe("upsampleTerrainTile", () => {
  // Five grid lines: the midlines cross cells, so triangles are clipped.
  const parent = gridTile(PARENT, 5, slope).heights;

  for (let q = 0; q < 4; q++) {
    it(`clips quadrant ${q} to the parent's surface, edge to edge`, () => {
      const rect = quadrant(PARENT, q);
      const { info } = upsampleTerrainTile(parent, PARENT, rect, 10);
      const t = info.heights!;
      expect(t.triangles.length).toBeGreaterThan(0);
      const range = t.maximumHeight - t.minimumHeight;
      // Every vertex lies on the parent's surface.
      for (let i = 0; i < t.u.length; i++) {
        const lon = rect.west + (t.u[i]! / 32767) * (rect.east - rect.west);
        const lat = rect.south + (t.v[i]! / 32767) * (rect.north - rect.south);
        const height = t.minimumHeight + (t.h[i]! / 32767) * range;
        const expected = interpolateHeight(
          parent,
          (lon - PARENT.west) / (PARENT.east - PARENT.west),
          (lat - PARENT.south) / (PARENT.north - PARENT.south),
        )!;
        expect(Math.abs(height - expected)).toBeLessThan(0.05);
      }
      // The triangles cover the quadrant exactly once.
      let area = 0;
      for (let k = 0; k < t.triangles.length; k += 3) {
        const a = t.triangles[k]!;
        const b = t.triangles[k + 1]!;
        const c = t.triangles[k + 2]!;
        area += Math.abs(
          (t.u[b]! - t.u[a]!) * (t.v[c]! - t.v[a]!) -
            (t.u[c]! - t.u[a]!) * (t.v[b]! - t.v[a]!),
        );
      }
      expect(area / 2 / (32767 * 32767)).toBeCloseTo(1, 6);
      // Its height range is the parent's quadrant's (1.x's bounds).
      expect(t.minimumHeight).toBeCloseTo(
        Math.min(
          ...[0, 1].flatMap((i) =>
            [0, 1].map((j) =>
              slope(i ? rect.east : rect.west, j ? rect.north : rect.south),
            ),
          ),
        ),
        1,
      );
    });
  }

  it("keeps skirts on all four edges and the parent's normals", () => {
    const withNormals = {
      ...parent,
      // Straight up in oct encoding (0, 0, 1): the center of the square.
      normals: new Uint8Array(parent.u.length * 2).fill(128),
    };
    const { asset, info } = upsampleTerrainTile(
      withNormals,
      PARENT,
      quadrant(PARENT, 3),
      10,
    );
    const mesh = asset.meshes[0]!;
    const vertices = info.heights!.u.length;
    // Skirt vertices follow the surface's: some on every edge.
    expect(mesh.positions.length / 3).toBeGreaterThan(vertices + 4);
    for (let i = 0; i < vertices; i++) {
      expect(mesh.normals![i * 3 + 2]!).toBeGreaterThan(0.99);
    }
    expect(info.sphere.radius).toBeGreaterThan(0);
  });

  it("hangs each edge's own skirt depth", () => {
    const depths = [10, 20, 30, 40];
    const { asset, info } = upsampleTerrainTile(
      parent,
      PARENT,
      quadrant(PARENT, 0),
      depths,
    );
    const mesh = asset.meshes[0]!;
    const vertices = info.heights!.u.length;
    const radius = (i: number, positions: ArrayLike<number>) =>
      Math.hypot(
        positions[i * 3]!,
        positions[i * 3 + 1]!,
        positions[i * 3 + 2]!,
      );
    // A skirt vertex hangs straight below the surface vertex at its (u, v):
    // the drop is the difference of their distances from the tile's center
    // along the local vertical, which, over 5 m, a few meters from
    // the center, is within a few percent of the depth.
    const surface = new Map<string, number>();
    for (let i = 0; i < vertices; i++) {
      surface.set(`${mesh.uvs![i * 2]}:${mesh.uvs![i * 2 + 1]}`, i);
    }
    const drops: number[][] = [[], [], [], []];
    for (let i = vertices; i < mesh.positions.length / 3; i++) {
      const key = `${mesh.uvs![i * 2]}:${mesh.uvs![i * 2 + 1]}`;
      const top = surface.get(key)!;
      const dx = mesh.positions[i * 3]! - mesh.positions[top * 3]!;
      const dy = mesh.positions[i * 3 + 1]! - mesh.positions[top * 3 + 1]!;
      const dz = mesh.positions[i * 3 + 2]! - mesh.positions[top * 3 + 2]!;
      const u = mesh.uvs![i * 2]!;
      const v = mesh.uvs![i * 2 + 1]!;
      // A corner belongs to two edges: not read.
      if ((u === 0 || u === 1) && (v === 0 || v === 1)) {
        continue;
      }
      const edge = u === 0 ? 0 : v === 0 ? 1 : u === 1 ? 2 : 3;
      drops[edge]!.push(Math.hypot(dx, dy, dz));
    }
    void radius;
    drops.forEach((list, e) => {
      expect(list.length).toBeGreaterThan(0);
      for (const drop of list) {
        expect(drop).toBeCloseTo(depths[e]!, 3);
      }
    });
  });

  it("neighbors made from one parent share their edge's vertices and heights", () => {
    // An irregular mesh: jittered interior vertices on a 7 x 7 grid.
    let seed = 7;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const n = 7;
    const base = gridTile(
      PARENT,
      n,
      (lon, lat) => 40 + 30 * Math.sin(lon * 4e5) * Math.cos(lat * 3e5),
    ).heights;
    const u = Uint16Array.from(base.u);
    const v = Uint16Array.from(base.v);
    const cell = 32767 / (n - 1);
    for (let j = 1; j < n - 1; j++) {
      for (let i = 1; i < n - 1; i++) {
        u[j * n + i] = Math.round(
          u[j * n + i]! + (random() - 0.5) * 0.4 * cell,
        );
        v[j * n + i] = Math.round(
          v[j * n + i]! + (random() - 0.5) * 0.4 * cell,
        );
      }
    }
    const irregular: TerrainHeights = { ...base, u, v };
    const clip = (q: number) =>
      upsampleTerrainTile(irregular, PARENT, quadrant(PARENT, q), 10).info
        .heights!;
    /** The (position along the edge, height) pairs on one edge. */
    const edge = (
      t: TerrainHeights,
      side: "east" | "west" | "north" | "south",
    ) => {
      const range = t.maximumHeight - t.minimumHeight;
      const on = side === "east" || side === "west" ? t.u : t.v;
      const along = side === "east" || side === "west" ? t.v : t.u;
      const target = side === "east" || side === "north" ? 32767 : 0;
      const points: [number, number][] = [];
      for (let i = 0; i < on.length; i++) {
        if (on[i] === target) {
          points.push([along[i]!, t.minimumHeight + (t.h[i]! / 32767) * range]);
        }
      }
      return points.sort((p, q) => p[0] - q[0]);
    };
    // The same places along the edge, at the same heights to within each
    // tile's own height quantum.
    const same = (a: [number, number][], b: [number, number][]): void => {
      expect(a.map((p) => p[0])).toEqual(b.map((p) => p[0]));
      a.forEach((p, i) => expect(p[1]).toBeCloseTo(b[i]![1], 1));
    };
    // South-west | south-east, and south-west over north-west, and the
    // other pair of each.
    same(edge(clip(0), "east"), edge(clip(1), "west"));
    same(edge(clip(2), "east"), edge(clip(3), "west"));
    same(edge(clip(0), "north"), edge(clip(2), "south"));
    same(edge(clip(1), "north"), edge(clip(3), "south"));
    expect(edge(clip(0), "east").length).toBeGreaterThan(2);
  });
});

describe("skirtDepths", () => {
  const data = { level: 2, x: 1, y: 1 };
  it("keeps the data tile's depth where an edge lies on its boundary", () => {
    // A child at its south-west corner: west and south are the data tile's.
    expect(skirtDepths({ level: 3, x: 2, y: 2 }, data, 9, 1)).toEqual([
      9, 9, 1, 1,
    ]);
    // Two levels down, at its east edge, one row up from the south.
    expect(skirtDepths({ level: 4, x: 7, y: 5 }, data, 9, 1)).toEqual([
      1, 1, 9, 1,
    ]);
    // The data tile itself.
    expect(skirtDepths(data, data, 9, 1)).toEqual([9, 9, 9, 9]);
  });
});

// ------------------------------------------------------------------ source

const EMPTY_ASSET = {
  meshes: [],
  materials: [],
  textures: [],
  images: [],
  draws: [],
  featureTables: [],
  warnings: [],
} as unknown as GltfAsset;

/** Data at levels 0 to `levels - 1` only, as CWT's polders end at 13. */
async function terrain(
  levels: number,
  requests: Parameters<TerrainLoader>[0][] = [],
  /** Replaces the whole-earth ranges at one level (a patchy edge). */
  patch?: { level: number; range: TileRange },
): Promise<TerrainSource> {
  const available = Array.from({ length: levels }, (_, l) => [
    patch?.level === l
      ? patch.range
      : { startX: 0, startY: 0, endX: 2 ** (l + 1) - 1, endY: 2 ** l - 1 },
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
    requests.push(request);
    return {
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
    };
  };
  return TerrainSource.create(
    "https://terrain.test/layer.json",
    undefined,
    loader,
    { warnings: new Set() },
  );
}

async function load(source: TerrainSource, tile: Tile): Promise<void> {
  await source.loadTile(tile, new AbortController().signal);
  tile.state = "ready";
}

/** The tile at `level` over (0.3, 0.2), expanding on the way. */
function tileAt(source: TerrainSource, level: number): Tile {
  let tile = source.root.children.find((t) =>
    contains(t.globe!.rectangle, 0.3, 0.2),
  )!;
  while (tile.globe!.level < level) {
    source.expand(tile);
    tile = tile.children.find((t) => contains(t.globe!.rectangle, 0.3, 0.2))!;
  }
  return tile;
}

/** A view 300 m above (0.3, 0.2), looking down. */
function view(): SelectionView {
  const position = at(0.3, 0.2, 300);
  const length = Math.hypot(position[0]!, position[1]!, position[2]!);
  return {
    id: 0,
    position,
    direction: position.map((x) => -x / length) as Float64Array,
    cartographic: { longitude: 0.3, latitude: 0.2, height: 300 },
    planes: new Float64Array(0),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 1000,
  };
}

/** Selects until nothing more is requested, loading what was. */
async function settle(
  source: TerrainSource,
  selection: GlobeBudgetedSelection | GlobeStepwiseSelection,
): Promise<Tile[]> {
  let selected: Tile[] = [];
  for (let pass = 0; pass < 40; pass++) {
    const result = selection.select(source.root, source.geometricError, view());
    selected = result.selected;
    const pending = result.requested.filter((t) => t.state === "unloaded");
    if (pending.length === 0) {
      break;
    }
    for (const tile of pending) {
      await load(source, tile);
    }
  }
  return selected;
}

describe("imageryLevel", () => {
  // Bing's tiling at Amsterdam: the level of the last terrain tile there
  // (13) is the imagery's, about 12 m a texel.
  const provider = {
    tilingScheme: "webMercator",
    tileSize: 256,
    minimumLevel: 1,
    maximumLevel: 21,
  } as ImageryProvider;
  const at = (level: number) =>
    ({
      geometricError: LEVEL_ZERO_ERROR / 2 ** level,
      globe: {
        rectangle: {
          west: 0.08,
          south: 0.914,
          east: 0.08 + Math.PI / 2 ** level,
          north: 0.914 + Math.PI / 2 ** level,
        },
      },
    }) as unknown as Tile;

  it("follows the terrain tile, one for one, to the provider's last", () => {
    expect(imageryLevel(provider, at(13))).toBe(13);
    expect(imageryLevel(provider, at(14))).toBe(14);
    expect(imageryLevel(provider, at(19))).toBe(19);
    expect(imageryLevel(provider, at(23))).toBe(21);
  });
});

describe("terrain past its data", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("budgeted: refines below the last level with data while imagery refines", async () => {
    const source = await terrain(6);
    const selection = new GlobeBudgetedSelection(source, {});
    selection.imageryRefines = () => true;
    const selected = await settle(source, selection);
    const deepest = Math.max(...selected.map((t) => t.globe!.level));
    // 300 m up, level 5's error (2.4 km) is far above 2 px.
    expect(deepest).toBeGreaterThan(8);
    // The tiles past level 5 are clipped from level 5's mesh.
    const leaf = selected.find((t) => t.globe!.level === deepest)!;
    expect(leaf.globe!.upsampledFrom!.globe!.level).toBe(5);
    expect(leaf.fillFromParent).toBe(false);
  });

  it("budgeted: stops where the imagery has no finer level", async () => {
    const source = await terrain(6);
    const selection = new GlobeBudgetedSelection(source, {});
    selection.imageryRefines = (tile) => tile.globe!.level < 7;
    const selected = await settle(source, selection);
    expect(Math.max(...selected.map((t) => t.globe!.level))).toBe(7);
  });

  it("budgeted: no imagery, nothing to upsample for", async () => {
    const source = await terrain(6);
    const selected = await settle(source, new GlobeBudgetedSelection(source));
    expect(Math.max(...selected.map((t) => t.globe!.level))).toBe(5);
  });

  it("stepwise: unchanged, 1.x's placeholders (globe parity)", async () => {
    const source = await terrain(6);
    const selection = new GlobeStepwiseSelection(source, {});
    const selected = await settle(source, selection);
    expect(Math.max(...selected.map((t) => t.globe!.level))).toBe(5);
    expect(selected.some((t) => t.globe!.upsampledFrom)).toBe(false);
  });

  it("an upsampled tile loads from its data tile's heights, or its URL once they are gone", async () => {
    const requests: Parameters<TerrainLoader>[0][] = [];
    const source = await terrain(3, requests);
    const data = tileAt(source, 2);
    await load(source, data);
    expect(source.upsampleContent(data)).toBe(true);
    const child = data.children[0]!;
    const grandchild =
      (await load(source, child),
      source.upsampleContent(child),
      child.children[3]!);
    expect(child.globe!.upsampledFrom).toBe(data);
    expect(grandchild.globe!.upsampledFrom).toBe(data);
    expect(child.contentUrl).toMatch(/^upsample:/);

    requests.length = 0;
    await load(source, grandchild);
    expect(requests[0]!.rect).toEqual(tileRectangle(grandchild.globe!));
    expect(requests[0]!.upsample!.rect).toEqual(data.globe!.rectangle);
    expect(requests[0]!.upsample!.heights).toBe(data.globe!.heights);
    // Inside its data tile on every edge: only what its own level asks.
    expect(requests[0]!.skirtHeight).toEqual(
      Array(4).fill((LEVEL_ZERO_ERROR / 16) * 5),
    );

    source.unloadTile(data);
    requests.length = 0;
    await load(source, grandchild);
    expect(requests[0]!.upsample!.heights).toBeUndefined();
    expect(requests[0]!.upsample!.url).toBe(data.contentUrl);
  });

  it("rays read an upsampled tile at its data tile's level and error", async () => {
    const source = await terrain(3);
    const data = tileAt(source, 2);
    await load(source, data);
    source.upsampleContent(data);
    const child = data.children.find((t) =>
      contains(t.globe!.rectangle, 0.3, 0.2),
    )!;
    await load(source, child);
    child.viewMask = 1;
    const patch = source.rayTarget().patchAt(0.3, 0.2);
    expect(patch.tile!.heights).toBe(child.globe!.heights);
    expect(patch.tile!.level).toBe(2);
    expect(patch.tile!.geometricError).toBe(data.geometricError);
  });

  it("an upsampled tile's heights move nothing: no listener fires, its data tile's surface is read", async () => {
    const source = await terrain(3);
    const data = tileAt(source, 2);
    await load(source, data);
    let fired = 0;
    source.heightListeners.add(() => fired++);
    source.upsampleContent(data);
    const child = data.children.find((t) =>
      contains(t.globe!.rectangle, 0.3, 0.2),
    )!;
    await load(source, child);
    expect(child.globe!.heights).toBeDefined();
    expect(fired).toBe(0);
    expect(source.sampleHeight(0.3, 0.2)).toBeCloseTo(50, 6);
    source.unloadTile(child);
    expect(child.globe!.heights).toBeUndefined();
    expect(fired).toBe(0);
    // Its data tile's heights do move the surface.
    source.unloadTile(data);
    expect(fired).toBe(1);
  });

  it("rays: a quadrant upsampled from the drawn tile holds no finer data", async () => {
    const source = await terrain(3);
    const data = tileAt(source, 2);
    await load(source, data);
    data.viewMask = 1;
    // As Budgeted reports it while the region refines.
    data.standInMask = 1;
    expect(source.upsampleContent(data)).toBe(true);
    const patch = source.rayTarget().patchAt(0.3, 0.2);
    expect(patch.unknown).toBeUndefined();
    expect(patch.tile!.level).toBe(2);
  });

  it("budgeted: a quadrant without data, beside quadrants with, upsamples too", async () => {
    // Level 4 everywhere; at level 5 only the quadrant east or west of the
    // one over the camera. The other three quadrants of that level-4 tile
    // have no data.
    const level = 5;
    const x = Math.floor((0.3 + Math.PI) / (Math.PI / 2 ** level));
    const y = Math.floor((0.2 + Math.PI / 2) / (Math.PI / 2 ** level));
    const source = await terrain(level + 1, [], {
      level,
      range: { startX: x ^ 1, startY: y, endX: x ^ 1, endY: y },
    });
    const selection = new GlobeBudgetedSelection(source, {});
    selection.imageryRefines = () => true;
    const selected = await settle(source, selection);
    const under = selected.filter((t) =>
      contains(t.globe!.rectangle, 0.3, 0.2),
    );
    expect(under).toHaveLength(1);
    // Not the level 4 tile standing in for it: a tile of its own level,
    // clipped from that tile, many levels finer.
    expect(under[0]!.globe!.upsampledFrom).toBeDefined();
    expect(under[0]!.fillFromParent).toBe(false);
    expect(under[0]!.globe!.level).toBeGreaterThan(8);
  });

  it("the ellipsoid has every level: nothing is upsampled", () => {
    const source = TerrainSource.ellipsoid(
      async () => {
        throw new Error("unused");
      },
      { warnings: new Set() },
    );
    const tile = source.root.children[0]!;
    tile.state = "ready";
    expect(source.upsampleContent(tile)).toBe(false);
  });
});
