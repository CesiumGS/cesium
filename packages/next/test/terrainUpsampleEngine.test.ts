// Terrain past its data, end to end (engine bug 1): a Tileset3D over a
// real TerrainSource whose layer.json ends at level 5, with a real
// GlobeImagery, refines past level 5 while the imagery has finer levels
// and stops at its provider's last. The unit tests set `imageryRefines`
// by hand; this one runs the wiring in `Tileset3D.update`
// (policy.imageryRefines = GlobeImagery.refines).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TerrainSource,
  type TerrainLoader,
} from "../src/globe/TerrainSource.ts";
import { imageryLevel, type GlobeImagery } from "../src/globe/GlobeImagery.ts";
import type { ImageryProvider } from "../src/globe/ImageryProvider.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { layer, provider } from "./sliceFakes.ts";
import { at, gridTile } from "./terrainRayFixtures.ts";

const EMPTY_ASSET = {
  meshes: [],
  materials: [],
  textures: [],
  images: [],
  draws: [],
  featureTables: [],
  warnings: [],
} as unknown as GltfAsset;

const LON = 0.3;
const LAT = 0.2;

/** A view 300 m above (LON, LAT), looking down, with no frustum planes. */
function view(): SelectionView {
  const position = at(LON, LAT, 300);
  const length = Math.hypot(position[0]!, position[1]!, position[2]!);
  return {
    id: 0,
    position,
    direction: position.map((x) => -x / length) as Float64Array,
    cartographic: { longitude: LON, latitude: LAT, height: 300 },
    planes: new Float64Array(0),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 1000,
  };
}

describe("a globe over terrain that ends at level 5, through Tileset3D", () => {
  let engine: Engine;
  beforeEach(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Levels 0 to 5 over the whole earth; the stubbed layer.json. */
  async function source(): Promise<TerrainSource> {
    const available = Array.from({ length: 6 }, (_, l) => [
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
      { warnings: new Set() },
    );
  }

  /** The deepest level the tileset has made a tile for, after `updates`. */
  async function deepest(
    imageryMaximum: number,
  ): Promise<{ level: number; upsampled: boolean; imagery: number }> {
    const terrain = await source();
    const world = engine.createWorld();
    const globe = Tileset3D.fromSource(engine, world, terrain, {
      policy: "budgeted",
    });
    // The real layer, for `refines`; nothing it draws is under test.
    const limited: ImageryProvider = {
      ...provider,
      maximumLevel: imageryMaximum,
    };
    const imagery = layer(world, undefined, limited);
    Object.assign(imagery, {
      hasImagery: () => true,
      update: () => {},
      credits: () => {},
      destroy: () => {},
    });
    Object.defineProperty(imagery, "busy", { get: () => false });
    globe.imagery = imagery as GlobeImagery;
    engine.tilesets.push(globe);
    try {
      for (let i = 0; i < 80; i++) {
        globe.update([view()]);
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      let deepestTile: Tile | undefined;
      let upsampled = false;
      const walk = (tile: Tile) => {
        if (tile.globe) {
          if (!deepestTile || tile.globe.level > deepestTile.globe!.level) {
            deepestTile = tile;
          }
          upsampled ||= tile.globe.upsampledFrom !== undefined;
        }
        tile.children.forEach(walk);
      };
      walk(terrain.root);
      return {
        level: deepestTile!.globe!.level,
        upsampled,
        imagery: imageryLevel(limited, deepestTile!),
      };
    } finally {
      engine.tilesets.splice(engine.tilesets.indexOf(globe), 1);
      globe.destroy();
    }
  }

  it("refines past level 5, up to its imagery's last level", async () => {
    const result = await deepest(21);
    expect(result.upsampled).toBe(true);
    expect(result.level).toBeGreaterThan(8);
  });

  it("stops at the level where its imagery's provider ends", async () => {
    const result = await deepest(7);
    expect(result.upsampled).toBe(true);
    // The deepest tile draws with the provider's last level, no finer.
    expect(result.imagery).toBe(7);
    expect(result.level).toBeGreaterThan(5);
  });
});
