/**
 * Quantized-mesh terrain (Cesium World Terrain and compatible `layer.json`
 * servers) as a `TileSource`: an implicit geographic quadtree whose tiles
 * are ordinary `Tile`s, so terrain streams through the same selection,
 * request scheduler, cache, view masks and on-demand rendering as 3D Tiles.
 *
 * - Tiling: geographic (EPSG:4326), two tiles at level 0, TMS rows counted
 *   from the south, as `layer.json` availability and tile URLs use them.
 * - A tile's children are created when it loads, or earlier when the
 *   `Stepwise` globe selection refines it and their availability is known
 *   (from `layer.json` and the metadata extension's descendant ranges).
 *   All four are created when any is available; the others fill from
 *   their parent (1.x upsamples them). Until then a tile is a leaf.
 * - Below the last level with data, the globe's `Budgeted` selection
 *   upsamples a loaded leaf (`upsampleContent`): four children whose
 *   content is the mesh of the nearest tile with data, clipped to them in
 *   a worker, so their imagery refines. `Stepwise` keeps 1.x parity's
 *   placeholders (`upsample`).
 * - Bounds: a tile's own height range once loaded, else its nearest loaded
 *   ancestor's.
 * - Geometric error per level as 1.x: level 0 is
 *   `R·2π·0.25 / (65·2)`, halving per level. Skirts hang five times the
 *   level's error below each edge.
 */
import { Tile, type TileJson, type TileTree } from "../streaming/Tile.ts";
import { volumeFromJson } from "../streaming/volumes.ts";
import type { TileSelection } from "../streaming/Stepwise.ts";
import type { TilesetOptions } from "../streaming/Tileset3D.ts";
import * as m4 from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import * as v3 from "../math/vec3.ts";
import {
  containingTriangle,
  flatTerrainHeights,
  interpolateHeight,
  type Rectangle,
  type TerrainHeights,
  type TerrainTileInfo,
  type TileRange,
} from "./quantizedMesh.ts";
import { GlobeStepwiseSelection } from "./GlobeStepwise.ts";
import { GlobeBudgetedSelection } from "./GlobeBudgeted.ts";
import { TerrainClips } from "./terrainClip.ts";
import type {
  TerrainRayPatch,
  TerrainRayTarget,
  TerrainRayTile,
} from "./terrainRay.ts";

/** The ellipsoid's drawn tiles' vertices and triangles (shared, read-only). */
let flatHeights: TerrainHeights | undefined;

/** Decodes one tile in a worker: fetch, quantized-mesh decode, skirts. */
export type TerrainLoader = (
  request: {
    url: string;
    headers?: Record<string, string>;
    rect: Rectangle;
    /** Meters; an upsampled tile's per edge: west, south, east, north. */
    skirtHeight: number | readonly number[];
    /**
     * A tile below the last level with data: clipped from the nearest tile
     * with data, over `rect`, from its `heights`, or, once they have left
     * the cache, from its content at `url`.
     */
    upsample?: {
      rect: Rectangle;
      heights?: TerrainHeights;
      url?: string;
    };
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
   * queued for loading (culled quadrants never are). Globe `Stepwise`.
   */
  upsampled?: boolean;
  /**
   * Below the last level with data (globe `Budgeted`): its content is the
   * mesh of this tile, the nearest with data above, clipped to it
   * (`upsampleContent`).
   */
  upsampledFrom?: Tile;
  /** Children created (or known to be none). */
  expanded: boolean;
  /** Globe `Stepwise` selection result per view id, and its pass. */
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
  /** The ellipsoid: every tile exists, generated rather than fetched. */
  readonly flat: boolean;
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
   * The selection policy for terrain: 1.x's globe traversal for "stepwise",
   * else `Budgeted` with the globe's fog in place of 3D Tiles' dynamic SSE.
   */
  createSelection(options: TilesetOptions): TileSelection {
    return options.policy === "stepwise"
      ? new GlobeStepwiseSelection(this, options)
      : new GlobeBudgetedSelection(this, options);
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
  /**
   * The ellipsoid's height is 0 everywhere; terrain's must be loaded.
   * Inside a clip region there is none (`clips`).
   */
  exactHeight(longitude = 0, latitude = 0): number | undefined {
    return this.flat && !this.clips.clippedAt(longitude, latitude)
      ? 0
      : undefined;
  }

  sampleHeight(longitude: number, latitude: number): number | undefined {
    if (this.flat) {
      return this.clips.clippedAt(longitude, latitude) ? undefined : 0;
    }
    const finest = this.finestTile(longitude, latitude);
    if (!finest) {
      return undefined;
    }
    const r = finest.rectangle;
    const height = interpolateHeight(
      finest.heights!,
      (longitude - r.west) / (r.east - r.west),
      (latitude - r.south) / (r.north - r.south),
    );
    return this.clips.clippedAt(longitude, latitude, height)
      ? undefined
      : height;
  }

  /**
   * @internal Regions where the terrain isn't drawn (`Tileset3D.addTerrainClip`):
   * height queries find none there and ray queries pass through.
   */
  readonly clips = new TerrainClips();

  /**
   * Height of the drawn surface at a longitude and latitude in radians: a
   * ray along the geodetic normal against the finest loaded tile's
   * triangle there, flat in Earth-fixed space as it is drawn (1.x
   * Globe.getHeight). On coarse tiles this lies up to hundreds of meters
   * below `sampleHeight`; clamped content stands on it, not in the air.
   */
  surfaceHeight(longitude: number, latitude: number): number | undefined {
    const height = this.drawnHeight(longitude, latitude);
    return height !== undefined &&
      this.clips.clippedAt(longitude, latitude, height)
      ? undefined
      : height;
  }

  private drawnHeight(longitude: number, latitude: number): number | undefined {
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

  /**
   * The terrain as drawn in the views of `viewMask` (default all), for exact
   * ray queries (`castTerrainRay`, `terrainLineOfSight`). It reads the tiles'
   * state at each call and writes nothing.
   *
   * At a point, the deepest tile on its quadtree path that some view of the
   * mask selected and whose content is loaded is what the screen draws
   * there. It is unknown ("not refined") where that tile only stands in for
   * finer terrain still loading: drawn whole while its region refines or
   * while its children's availability loads (`Tile.standInMask`), or as a
   * mixed-LOD placeholder in a hole whose tile has data. A quadrant without
   * data is drawn by the tile above, the finest there is, so it is known.
   * Where no such tile exists it is unknown ("not drawn"). The answer holds
   * over the deepest tile on the path, which has no children and lies
   * inside the drawn tile (the patch contract). Clip regions (`clips`) are
   * holes: rays pass through them.
   */
  rayTarget(viewMask = 0xffffffff): TerrainRayTarget {
    const mask = viewMask >>> 0;
    const clips = this.clips;
    return {
      ellipsoid: Ellipsoid.WGS84,
      patchAt: (longitude, latitude) =>
        this.rayPatch(longitude, latitude, mask),
      clipped: (p) => clips.clippedPoint(p),
    };
  }

  private readonly rayTiles = new WeakMap<Tile, TerrainRayTile>();

  private rayPatch(
    longitude: number,
    latitude: number,
    mask: number,
  ): TerrainRayPatch {
    let tile = this.root.children.find((t) =>
      rectangleContains(t.globe!.rectangle, longitude, latitude),
    );
    if (!tile) {
      return {
        rectangle: {
          west: -Math.PI,
          south: -Math.PI / 2,
          east: Math.PI,
          north: Math.PI / 2,
        },
        unknown: "not drawn",
      };
    }
    const path: Tile[] = [];
    let drawn = -1;
    while (tile) {
      path.push(tile);
      if (
        (tile.viewMask & mask) !== 0 &&
        tile.state === "ready" &&
        (tile.globe!.heights !== undefined || this.flat)
      ) {
        drawn = path.length - 1;
      }
      tile = tile.children.find((t) =>
        rectangleContains(t.globe!.rectangle, longitude, latitude),
      );
    }
    const rectangle = path[path.length - 1]!.globe!.rectangle;
    if (drawn < 0) {
      return { rectangle, unknown: "not drawn" };
    }
    const shown = path[drawn]!;
    const below = path.slice(drawn + 1);
    // A stand-in hides finer data unless the quadrant here has none (or is
    // upsampled from the shown tile: it holds no finer data); with no
    // children yet, their availability is still loading.
    const noFiner = (t: Tile) =>
      t.fillFromParent || t.globe!.upsampledFrom !== undefined;
    const standIn =
      (shown.standInMask & shown.viewMask & mask) !== 0 &&
      (below.length > 0 ? !noFiner(below[0]!) : !shown.globe!.expanded);
    const holes = shown.holes;
    const inHole =
      (shown.placeholderMask & mask) !== 0 &&
      holes !== undefined &&
      below.some((t) => holes.has(t) && !noFiner(t));
    if (standIn || inHole) {
      return { rectangle, unknown: "not refined" };
    }
    return { rectangle, tile: this.rayTile(shown) };
  }

  /** A drawn tile as a ray reads it, kept while its heights are. */
  private rayTile(tile: Tile): TerrainRayTile {
    const g = tile.globe!;
    const cached = this.rayTiles.get(tile);
    if (cached && (g.heights ? cached.heights === g.heights : this.flat)) {
      return cached;
    }
    // An upsampled tile's surface is its data tile's, as accurate as that
    // tile's level: its own finer error would over-claim.
    const data = g.upsampledFrom ?? tile;
    const ray: TerrainRayTile = {
      rectangle: g.rectangle,
      // The ellipsoid keeps no heights: its tiles are all the same grid. A
      // wrapper of its own per tile keys the ray's per-tile cache.
      heights: g.heights ?? { ...(flatHeights ??= flatTerrainHeights()) },
      level: data.globe!.level,
      geometricError: data.geometricError,
    };
    this.rayTiles.set(tile, ray);
    return ray;
  }

  /** Content left the cache: its height data goes too. */
  unloadTile(tile: Tile): void {
    if (tile.globe?.heights) {
      tile.globe.heights = undefined;
      if (!tile.globe.upsampledFrom) {
        this.heightsChanged(tile.globe.rectangle);
      }
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
    const data = a.upsampledFrom;
    const skirt = (level: number) => (this.levelZeroError / 2 ** level) * 5;
    // An upsampled tile's edges on its data tile's boundary hide that
    // tile's cracks, so they hang its skirt. Its inner edges come from one
    // clip of one mesh, so they hang only what their own level's error
    // asks (1.x halves them for each level).
    const skirtHeight = data
      ? skirtDepths(a, data.globe!, skirt(data.globe!.level), skirt(a.level))
      : skirt(a.level);
    const { asset, info } = await this.load(
      {
        url: tile.contentUrl!,
        ...(this.headers ? { headers: this.headers } : {}),
        rect: rectangle(a),
        skirtHeight,
        ...(data
          ? {
              upsample: {
                rect: data.globe!.rectangle,
                ...(data.globe!.heights
                  ? { heights: data.globe!.heights }
                  : { url: data.contentUrl! }),
              },
            }
          : {}),
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
      // An upsampled tile's surface is its data tile's, to within that
      // tile's stated error: no listener fires. (`surfaceHeight` rises by up
      // to 0.16 m on a two-triangle level 13 tile, as the clip's points lie
      // on the ellipsoid's arc and the data tile's triangles are chords.)
      if (!g.upsampledFrom) {
        this.heightsChanged(g.rectangle);
      }
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
      // Only once its children's availability is known: created sooner, a
      // tile whose metadata tile hasn't loaded would have none and pass
      // for the finest there is. Unexpanded, it is a stand-in until then.
      if (this.availabilityKnown(tile, g.level + 1)) {
        this.createChildren(tile, g);
      }
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
   * upsamples below the last level with data (globe `Stepwise` only).
   */
  upsample(tile: Tile): boolean {
    const g = tile.globe!;
    if (tile.children.length === 0 && g.expanded) {
      this.createChildren(tile, g, false);
    }
    return tile.children.length > 0;
  }

  /**
   * Gives a loaded tile below the last level with data children whose
   * content is its mesh clipped to each (1.x upsamples them), so they draw
   * with imagery of their own level (globe `Budgeted`). A leaf gets four.
   * A tile with some data below it (a patchy edge of the data's range) has
   * its quadrants without data upsampled the same way, in place of the
   * stand-ins that took the nearest ancestor's imagery. False where there
   * is nothing to upsample: the ellipsoid (it has every level), a tile not
   * loaded yet, or one whose children are all drawn from data or already
   * upsampled.
   */
  upsampleContent(tile: Tile): boolean {
    const g = tile.globe!;
    if (this.flat || !g.expanded || !g.heights || !g.own?.quadrants) {
      return false;
    }
    const leaf = tile.children.length === 0;
    if (!leaf && !tile.children.some((c) => c.fillFromParent)) {
      return false;
    }
    const data = g.upsampledFrom ?? tile;
    const quadrants = g.own.quadrants;
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ].forEach(([dx, dy], i) => {
      const a = { level: g.level + 1, x: g.x * 2 + dx!, y: g.y * 2 + dy! };
      const at = leaf
        ? -1
        : tile.children.findIndex(
            (c) => c.fillFromParent && c.globe!.x === a.x && c.globe!.y === a.y,
          );
      if (!leaf && at < 0) {
        return;
      }
      const [minimumHeight, maximumHeight] = quadrants[i]!;
      this.addChild(tile, a, minimumHeight, maximumHeight, true, data);
      if (!leaf) {
        // The new tile takes the stand-in's place.
        const child = tile.children.pop()!;
        tile.children[at] = child;
      }
    });
    tile.childrenPartition = true;
    if (leaf) {
      this.tree.tilesAdded?.(tile.children.length);
    }
    return true;
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
    upsampledFrom?: Tile,
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
      ...(available
        ? {
            content: {
              uri: upsampledFrom
                ? `upsample:${a.level}/${a.x}/${a.y}`
                : this.tileUrl(a),
            },
          }
        : {}),
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
      // Nothing below a quadrant without data, nor data below one
      // upsampled.
      expanded: !available || upsampledFrom !== undefined,
      selection: [],
      ...(upsampledFrom ? { upsampledFrom } : {}),
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

/**
 * An upsampled tile's skirt depth on each edge (west, south, east, north):
 * `outer` where the edge lies on its data tile's boundary, `inner` where it
 * lies inside it.
 */
export function skirtDepths(
  a: Address,
  data: Address,
  outer: number,
  inner: number,
): number[] {
  const span = 2 ** (a.level - data.level);
  const x0 = data.x * span;
  const y0 = data.y * span;
  return [
    a.x === x0 ? outer : inner,
    a.y === y0 ? outer : inner,
    a.x === x0 + span - 1 ? outer : inner,
    a.y === y0 + span - 1 ? outer : inner,
  ];
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
