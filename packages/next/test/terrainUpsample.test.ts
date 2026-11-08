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
} from "../src/globe/quantizedMesh.ts";
import {
  LEVEL_ZERO_ERROR,
  TerrainSource,
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
): Promise<TerrainSource> {
  const available = Array.from({ length: levels }, (_, l) => [
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
    // Skirts as deep as its data tile's: the cracks they hide are that
    // tile's.
    expect(requests[0]!.skirtHeight).toBe((LEVEL_ZERO_ERROR / 4) * 5);

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
