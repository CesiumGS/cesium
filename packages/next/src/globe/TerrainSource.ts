/**
 * Quantized-mesh terrain (Cesium World Terrain and compatible `layer.json`
 * servers) as a `TileSource`: an implicit geographic quadtree whose tiles
 * are ordinary `Tile`s, so terrain streams through the same selection,
 * request scheduler, cache, view masks and on-demand rendering as 3D Tiles.
 *
 * - Tiling: geographic (EPSG:4326), two tiles at level 0, TMS rows counted
 *   from the south, as `layer.json` availability and tile URLs use them.
 * - A tile's children are created when it loads, from availability in
 *   `layer.json` and in the tile's metadata extension (descendant ranges);
 *   until then a tile is a leaf. Children start with their parent's height
 *   range.
 * - Geometric error per level as 1.x: level 0 is
 *   `R·2π·0.25 / (65·2)`, halving per level. Skirts hang five times the
 *   level's error below each edge.
 */
import { Tile, type TileJson, type TileTree } from "../streaming/Tile.ts";
import * as m4 from "../math/mat4.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { Rectangle, TerrainTileInfo, TileRange } from "./quantizedMesh.ts";

/** Decodes one tile in a worker: fetch, quantized-mesh decode, skirts. */
export type TerrainLoader = (
  request: {
    url: string;
    headers?: Record<string, string>;
    rect: Rectangle;
    skirtHeight: number;
  },
  signal: AbortSignal,
) => Promise<{ asset: GltfAsset; info: TerrainTileInfo }>;

/** 1.x heightmap-equivalent level-0 error: R·2π·0.25 / (65·2). */
export const LEVEL_ZERO_ERROR = (6378137 * 2 * Math.PI * 0.25) / (65 * 2);

interface Address {
  level: number;
  x: number;
  y: number;
}

export class TerrainSource {
  readonly root: Tile;
  readonly geometricError: number;
  private readonly address = new WeakMap<Tile, Address>();
  /** Available tile ranges per level (TMS). */
  private readonly ranges: TileRange[][] = [];
  private readonly templates: string[];
  private readonly extensions: string;

  private constructor(
    readonly url: string,
    private readonly headers: Record<string, string> | undefined,
    private readonly load: TerrainLoader,
    layer: TileJson,
    private readonly tree: TileTree,
  ) {
    this.templates = (layer.tiles as string[]).map((t) =>
      t.replace("{version}", String(layer.version ?? "1.0.0")),
    );
    const ext: string[] = [];
    if (layer.extensions?.includes("octvertexnormals")) {
      ext.push("octvertexnormals");
    }
    if (layer.extensions?.includes("metadata")) {
      ext.push("metadata");
    }
    this.extensions = ext.join("-");
    (layer.available as TileRange[][] | undefined)?.forEach((r, level) =>
      this.addRanges(level, r),
    );
    // A content-less root over the globe (it always refines) with the two
    // level-0 tiles as children.
    this.geometricError = LEVEL_ZERO_ERROR * 2;
    this.root = new Tile(
      undefined,
      {
        boundingVolume: {
          region: [-Math.PI, -Math.PI / 2, Math.PI, Math.PI / 2, -1000, 9000],
        },
        geometricError: this.geometricError,
        refine: "REPLACE",
      },
      url,
      m4.mat4(),
      "REPLACE",
      tree,
    );
    for (let x = 0; x < 2; x++) {
      this.addChild(this.root, { level: 0, x, y: 0 }, -1000, 9000);
    }
    this.root.childrenPartition = true;
  }

  /** Reads `layer.json` (quantized-mesh only). */
  static async create(
    layerUrl: string,
    headers: Record<string, string> | undefined,
    load: TerrainLoader,
    tree: TileTree,
  ): Promise<TerrainSource> {
    const response = await fetch(layerUrl, headers ? { headers } : undefined);
    if (!response.ok) {
      throw new Error(`terrain layer.json: ${response.status}`);
    }
    const layer = await response.json();
    if (!String(layer.format ?? "").startsWith("quantized-mesh-1.")) {
      throw new Error(`terrain format "${layer.format}" is not supported`);
    }
    if (layer.projection && layer.projection !== "EPSG:4326") {
      throw new Error(
        `terrain projection ${layer.projection} is not supported`,
      );
    }
    return new TerrainSource(layerUrl, headers, load, layer, tree);
  }

  /** Content for one terrain tile; grows the tree under it. */
  async loadTile(tile: Tile, signal: AbortSignal): Promise<GltfAsset> {
    const a = this.address.get(tile)!;
    const { asset, info } = await this.load(
      {
        url: tile.contentUrl!,
        ...(this.headers ? { headers: this.headers } : {}),
        rect: rectangle(a),
        skirtHeight: (LEVEL_ZERO_ERROR / 2 ** a.level) * 5,
      },
      signal,
    );
    this.loaded(tile, a, info);
    return asset;
  }

  private loaded(tile: Tile, a: Address, info: TerrainTileInfo): void {
    info.available?.forEach((r, i) => this.addRanges(a.level + 1 + i, r));
    if (tile.children.length > 0) {
      return;
    }
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const child = { level: a.level + 1, x: a.x * 2 + dx, y: a.y * 2 + dy };
      if (this.available(child)) {
        this.addChild(tile, child, info.minimumHeight, info.maximumHeight);
      }
    }
    tile.childrenPartition = tile.children.length > 0;
    this.tree.tilesAdded?.(tile.children.length);
  }

  private available(a: Address): boolean {
    return (this.ranges[a.level] ?? []).some(
      (r) =>
        a.x >= r.startX && a.x <= r.endX && a.y >= r.startY && a.y <= r.endY,
    );
  }

  private addRanges(level: number, ranges: TileRange[]): void {
    (this.ranges[level] ??= []).push(...ranges);
  }

  private addChild(
    parent: Tile,
    a: Address,
    minimumHeight: number,
    maximumHeight: number,
  ): void {
    const r = rectangle(a);
    const json: TileJson = {
      boundingVolume: {
        region: [
          r.west,
          r.south,
          r.east,
          r.north,
          minimumHeight,
          maximumHeight,
        ],
      },
      geometricError: LEVEL_ZERO_ERROR / 2 ** a.level,
      refine: "REPLACE",
      content: { uri: this.tileUrl(a) },
    };
    const tile = new Tile(
      parent,
      json,
      this.url,
      m4.mat4(),
      "REPLACE",
      this.tree,
    );
    this.address.set(tile, a);
    parent.children.push(tile);
  }

  private tileUrl(a: Address): string {
    const template =
      this.templates[(a.x + a.y + a.level) % this.templates.length]!;
    const path = template
      .replace("{z}", String(a.level))
      .replace("{x}", String(a.x))
      .replace("{y}", String(a.y));
    const url = new URL(path, this.url);
    if (this.extensions) {
      url.searchParams.set("extensions", this.extensions);
    }
    return url.toString();
  }
}

/** A TMS tile's extent in radians (geographic tiling). */
export function rectangle(a: Address): Rectangle {
  const size = Math.PI / 2 ** a.level;
  const west = -Math.PI + a.x * size;
  const south = -Math.PI / 2 + a.y * size;
  return { west, south, east: west + size, north: south + size };
}
