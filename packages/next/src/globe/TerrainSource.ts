/**
 * Quantized-mesh terrain (Cesium World Terrain and compatible `layer.json`
 * servers) as a `TileSource`: an implicit geographic quadtree whose tiles
 * are ordinary `Tile`s, so terrain streams through the same selection,
 * request scheduler, cache, view masks and on-demand rendering as 3D Tiles.
 *
 * - Tiling: geographic (EPSG:4326), two tiles at level 0, TMS rows counted
 *   from the south, as `layer.json` availability and tile URLs use them.
 * - A tile's children are created when it loads, or earlier when the
 *   `Legacy1x` globe selection refines it and their availability is known
 *   (from `layer.json` and the metadata extension's descendant ranges).
 *   All four are created when any is available; the others fill from
 *   their parent (1.x upsamples them). Until then a tile is a leaf.
 * - Bounds: a tile's own height range once loaded, else its nearest loaded
 *   ancestor's.
 * - Geometric error per level as 1.x: level 0 is
 *   `R·2π·0.25 / (65·2)`, halving per level. Skirts hang five times the
 *   level's error below each edge.
 */
import { Tile, type TileJson, type TileTree } from "../streaming/Tile.ts";
import { volumeFromJson } from "../streaming/volumes.ts";
import type { TileSelection } from "../streaming/Legacy1x.ts";
import type { TilesetOptions } from "../streaming/Tileset3D.ts";
import * as m4 from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import * as v3 from "../math/vec3.ts";
import {
  containingTriangle,
  interpolateHeight,
  type Rectangle,
  type TerrainHeights,
  type TerrainTileInfo,
  type TileRange,
} from "./quantizedMesh.ts";
import { GlobeLegacy1xSelection } from "./GlobeLegacy1x.ts";
import { GlobeBudgetedSelection } from "./GlobeBudgeted.ts";

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

const IDENTITY = m4.mat4();

/** 1.x heightmap-equivalent level-0 error: R·2π·0.25 / (65·2). */
export const LEVEL_ZERO_ERROR = (6378137 * 2 * Math.PI * 0.25) / (65 * 2);
/** 1.x EllipsoidTerrainProvider's level-0 error: R·2π·0.25 / (64·2). */
export const ELLIPSOID_LEVEL_ZERO_ERROR =
  (6378137 * 2 * Math.PI * 0.25) / (64 * 2);

interface Address {
  level: number;
  x: number;
  /** Rows from the south (TMS), as tile URLs count them. */
  y: number;
}

/** Per terrain tile (`Tile.globe`). */
export interface GlobeTile extends Address {
  rectangle: Rectangle;
  /** Own height range and occludee point, once loaded. */
  own?: {
    minimumHeight: number;
    maximumHeight: number;
    occludee?: Vec3;
    /** Height ranges of its quadrants (SW, SE, NW, NE), for upsampling. */
    quadrants?: [number, number][];
  };
  /** Its metadata extension (descendant availability) has arrived. */
  metadata: boolean;
  /** Its surface for height queries, while its content is loaded. */
  heights?: TerrainHeights;
  /**
   * A quadrant without data that 1.x would have upsampled by now: it was
   * queued for loading (culled quadrants never are).
   */
  upsampled?: boolean;
  /** Children created (or known to be none). */
  expanded: boolean;
  /** Globe `Legacy1x` selection result per view id, and its pass. */
  selection: { pass: number; result: number }[];
  /** Bounds cached by the globe selection. */
  bounds?: unknown;
}

export class TerrainSource {
  readonly root: Tile;
  readonly geometricError: number;
  /** Available tile ranges per level (TMS). */
  private readonly ranges: TileRange[][] = [];
  /** Levels `layer.json` lists availability for. */
  private readonly layerLevels: number;
  /** Levels per metadata tile (0: availability is all in layer.json). */
  private readonly metadataAvailability: number;
  private readonly templates: string[];
  private readonly extensions: string;
  /** Flat tiles built in the worker, every tile available (no data). */
  private readonly flat: boolean;
  private readonly levelZeroError: number;

  private constructor(
    readonly url: string,
    private readonly headers: Record<string, string> | undefined,
    private readonly load: TerrainLoader,
    layer: TileJson,
    public tree: TileTree,
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
    this.flat = layer.ellipsoid === true;
    this.levelZeroError = this.flat
      ? ELLIPSOID_LEVEL_ZERO_ERROR
      : LEVEL_ZERO_ERROR;
    const available = (layer.available as TileRange[][] | undefined) ?? [];
    available.forEach((r, level) => this.addRanges(level, r));
    this.layerLevels = available.length;
    this.metadataAvailability = ext.includes("metadata")
      ? Number(layer.metadataAvailability ?? 0)
      : 0;
    // A content-less root over the globe (it always refines) with the two
    // level-0 tiles as children.
    this.geometricError = this.levelZeroError * 2;
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
      this.addChild(this.root, { level: 0, x, y: 0 }, -1000, 9000, true);
    }
    this.root.childrenPartition = true;
  }

  /**
   * The selection policy for terrain: 1.x's globe traversal for "legacy1x",
   * else `Budgeted` with the globe's fog in place of 3D Tiles' dynamic SSE.
   */
  createSelection(options: TilesetOptions): TileSelection {
    return options.policy === "legacy1x"
      ? new GlobeLegacy1xSelection(this, options)
      : new GlobeBudgetedSelection(options);
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

  /**
   * The ellipsoid without terrain data (1.x `EllipsoidTerrainProvider`):
   * flat tiles at height 0, built in the worker, refined like terrain.
   */
  static ellipsoid(load: TerrainLoader, tree: TileTree): TerrainSource {
    return new TerrainSource(
      "ellipsoid:",
      undefined,
      load,
      { tiles: ["{z}/{x}/{y}"], ellipsoid: true },
      tree,
    );
  }

  /**
   * Terrain height (meters above the ellipsoid) at a longitude and latitude
   * in radians, from the finest loaded tile there (1.x's globe samples the
   * same way); 0 for the ellipsoid; undefined where nothing is loaded.
   */
  /** The ellipsoid's height is 0 everywhere; terrain's must be loaded. */
  exactHeight(): number | undefined {
    return this.flat ? 0 : undefined;
  }

  sampleHeight(longitude: number, latitude: number): number | undefined {
    if (this.flat) {
      return 0;
    }
    const finest = this.finestTile(longitude, latitude);
    if (!finest) {
      return undefined;
    }
    const r = finest.rectangle;
    return interpolateHeight(
      finest.heights!,
      (longitude - r.west) / (r.east - r.west),
      (latitude - r.south) / (r.north - r.south),
    );
  }

  /**
   * Height of the drawn surface at a longitude and latitude in radians: a
   * ray along the geodetic normal against the finest loaded tile's
   * triangle there, flat in Earth-fixed space as it is drawn (1.x
   * Globe.getHeight). On coarse tiles this lies up to hundreds of meters
   * below `sampleHeight`; clamped content stands on it, not in the air.
   */
  surfaceHeight(longitude: number, latitude: number): number | undefined {
    if (this.flat) {
      return 0;
    }
    const finest = this.finestTile(longitude, latitude);
    if (!finest) {
      return undefined;
    }
    const r = finest.rectangle;
    const t = finest.heights!;
    const triangle = containingTriangle(
      t,
      (longitude - r.west) / (r.east - r.west),
      (latitude - r.south) / (r.north - r.south),
    );
    if (!triangle) {
      return undefined;
    }
    const ellipsoid = Ellipsoid.WGS84;
    const range = t.maximumHeight - t.minimumHeight;
    const [a, b, c] = triangle.map((i) =>
      ellipsoid.cartographicToCartesian(
        {
          longitude: r.west + (t.u[i]! / 32767) * (r.east - r.west),
          latitude: r.south + (t.v[i]! / 32767) * (r.north - r.south),
          height: t.minimumHeight + (t.h[i]! / 32767) * range,
        },
        v3.vec3(),
      ),
    ) as [Float64Array, Float64Array, Float64Array];
    // The point on the ellipsoid and its normal; the height is where the
    // normal line meets the triangle's plane.
    const carto = { longitude, latitude, height: 0 };
    const origin = ellipsoid.cartographicToCartesian(carto, v3.vec3());
    const up = ellipsoid.geodeticSurfaceNormalCartographic(carto, v3.vec3());
    const normal = v3.cross(
      v3.vec3(),
      v3.sub(v3.vec3(), b, a),
      v3.sub(v3.vec3(), c, a),
    );
    const denominator = v3.dot(normal, up);
    if (Math.abs(denominator) < 1e-12) {
      return undefined;
    }
    return v3.dot(normal, v3.sub(v3.vec3(), a, origin)) / denominator;
  }

  /** The finest tile with height data at a point. */
  private finestTile(
    longitude: number,
    latitude: number,
  ): GlobeTile | undefined {
    let tile = this.root.children.find((t) =>
      rectangleContains(t.globe!.rectangle, longitude, latitude),
    );
    let finest: GlobeTile | undefined;
    while (tile) {
      if (tile.globe!.heights) {
        finest = tile.globe;
      }
      tile = tile.children.find(
        (t) =>
          !t.fillFromParent &&
          rectangleContains(t.globe!.rectangle, longitude, latitude),
      );
    }
    return finest;
  }

  /** Content left the cache: its height data goes too. */
  unloadTile(tile: Tile): void {
    if (tile.globe?.heights) {
      tile.globe.heights = undefined;
      this.heightsChanged(tile.globe.rectangle);
    }
  }

  /** Called with the rectangle (radians) whose heights changed. */
  readonly heightListeners = new Set<(rectangle: Rectangle) => void>();

  private heightsChanged(rectangle: Rectangle): void {
    for (const listener of this.heightListeners) {
      listener(rectangle);
    }
  }

  /**
   * Terrain is Earth-fixed: no transform, no axis change. The bare
   * ellipsoid stands in for ground, so it never hides content (data below
   * it, such as coasts below the ellipsoid, draws over it); real terrain
   * occludes as any surface does.
   */
  modelOptions(): {
    modelMatrix: Float64Array;
    axes: "none";
    underlay: boolean;
  } {
    return { modelMatrix: IDENTITY, axes: "none", underlay: this.flat };
  }

  /** Content for one terrain tile; grows the tree under it. */
  async loadTile(tile: Tile, signal: AbortSignal): Promise<GltfAsset> {
    const a = tile.globe!;
    const { asset, info } = await this.load(
      {
        url: tile.contentUrl!,
        ...(this.headers ? { headers: this.headers } : {}),
        rect: rectangle(a),
        skirtHeight: (this.levelZeroError / 2 ** a.level) * 5,
      },
      signal,
    );
    this.loaded(tile, a, info);
    return asset;
  }

  private loaded(tile: Tile, g: GlobeTile, info: TerrainTileInfo): void {
    if (info.available) {
      info.available.forEach((r, i) => this.addRanges(g.level + 1 + i, r));
      g.metadata = true;
    }
    if (info.heights) {
      g.heights = info.heights;
      this.heightsChanged(g.rectangle);
    }
    g.own = {
      minimumHeight: info.minimumHeight,
      maximumHeight: info.maximumHeight,
      ...(info.occludee ? { occludee: Float64Array.from(info.occludee) } : {}),
      quadrants: info.quadrants,
    };
    tile.volume = regionVolume(
      g.rectangle,
      info.minimumHeight,
      info.maximumHeight,
    );
    if (!g.expanded) {
      this.createChildren(tile, g);
      return;
    }
    // Children created before this tile loaded took a coarser ancestor's
    // heights.
    for (const child of tile.children) {
      if (!child.globe!.own) {
        child.volume = regionVolume(
          child.globe!.rectangle,
          info.minimumHeight,
          info.maximumHeight,
        );
      }
    }
  }

  /**
   * Creates `tile`'s children when their availability is known (1.x
   * canRefine); false while it waits for a metadata tile to load.
   */
  expand(tile: Tile): boolean {
    const g = tile.globe!;
    if (g.expanded) {
      return true;
    }
    if (!this.availabilityKnown(tile, g.level + 1)) {
      return false;
    }
    this.createChildren(tile, g);
    return true;
  }

  private availabilityKnown(tile: Tile, level: number): boolean {
    const per = this.metadataAvailability;
    if (per === 0 || level < this.layerLevels) {
      return true;
    }
    // Listed by the tile at the last multiple of `per` above `level`.
    const source = Math.floor((level - 1) / per) * per;
    let t: Tile | undefined = tile;
    while (t?.globe && t.globe.level > source) {
      t = t.parent;
    }
    return t?.globe?.level === source && t.globe.metadata;
  }

  /**
   * Gives a leaf four children without data, drawn from its content, as 1.x
   * upsamples below the last level with data (globe `Legacy1x` only).
   */
  upsample(tile: Tile): boolean {
    const g = tile.globe!;
    if (tile.children.length === 0 && g.expanded) {
      this.createChildren(tile, g, false);
    }
    return tile.children.length > 0;
  }

  private createChildren(tile: Tile, g: GlobeTile, data = true): void {
    g.expanded = true;
    // South-west, south-east, north-west, north-east.
    const quadrants = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ].map(([dx, dy]) => ({
      level: g.level + 1,
      x: g.x * 2 + dx!,
      y: g.y * 2 + dy!,
    }));
    const available = quadrants.map((q) => data && this.available(q));
    if (data && !available.some(Boolean)) {
      return;
    }
    // Heights of the nearest loaded tile on the path.
    let h: GlobeTile["own"];
    for (let t: Tile | undefined = tile; t?.globe && !h; t = t.parent) {
      h = t.globe.own;
    }
    quadrants.forEach((q, i) =>
      this.addChild(
        tile,
        q,
        h?.minimumHeight ?? -1000,
        h?.maximumHeight ?? 9000,
        available[i]!,
      ),
    );
    tile.childrenPartition = true;
    this.tree.tilesAdded?.(tile.children.length);
  }

  private available(a: Address): boolean {
    if (this.flat) {
      return true;
    }
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
    available: boolean,
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
      geometricError: this.levelZeroError / 2 ** a.level,
      refine: "REPLACE",
      ...(available ? { content: { uri: this.tileUrl(a) } } : {}),
    };
    const tile = new Tile(
      parent,
      json,
      this.url,
      m4.mat4(),
      "REPLACE",
      this.tree,
    );
    tile.globe = {
      ...a,
      rectangle: r,
      metadata: false,
      // Nothing below a quadrant without data.
      expanded: !available,
      selection: [],
    };
    tile.fillFromParent = !available;
    parent.children.push(tile);
  }

  private tileUrl(a: Address): string {
    if (this.flat) {
      return `ellipsoid:${a.level}/${a.x}/${a.y}`;
    }
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

function regionVolume(
  r: Rectangle,
  minimumHeight: number,
  maximumHeight: number,
) {
  return volumeFromJson(
    {
      region: [r.west, r.south, r.east, r.north, minimumHeight, maximumHeight],
    },
    IDENTITY,
  )!;
}

function rectangleContains(
  r: Rectangle,
  longitude: number,
  latitude: number,
): boolean {
  return (
    longitude >= r.west &&
    longitude <= r.east &&
    latitude >= r.south &&
    latitude <= r.north
  );
}

/** A TMS tile's extent in radians (geographic tiling). */
export function rectangle(a: Address): Rectangle {
  const size = Math.PI / 2 ** a.level;
  const west = -Math.PI + a.x * size;
  const south = -Math.PI / 2 + a.y * size;
  return { west, south, east: west + size, north: south + size };
}
