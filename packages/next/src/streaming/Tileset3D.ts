/**
 * A streamed 3D Tiles tileset in a world. Each frame the engine hands it the
 * views showing that world; selection runs per view over the shared tile
 * tree, and each tile's content is drawn only in the views that selected it
 * (record view masks). Content loads through the worker pool, uploads within
 * a per-frame budget, and is evicted least-recently-used when the cache
 * exceeds its byte budget; a tile touched by any view stays.
 */
import type { Engine } from "../scene/Engine.ts";
import { contentAnchor } from "../scene/earthAnchor.ts";
import type {
  AnchorHandle,
  CastRay,
  ClipBox,
  DrawHandle,
  TransformHandle,
  World,
} from "../scene/World.ts";
import {
  placeModel,
  type ModelPlacement,
  type ModelResourceOptions,
} from "../scene/gltfModel.ts";
import type { CustomShader } from "../scene/CustomShader.ts";
import type { FeatureStyle } from "../scene/FeatureStyle.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Rectangle } from "../globe/quantizedMesh.ts";
import type { TerrainRayTarget, TerrainRayTile } from "../globe/terrainRay.ts";
import { rectanglesOverlap, type TerrainClips } from "../globe/terrainClip.ts";
import {
  StepwiseSelection,
  REQUEST_PURPOSES,
  type CasterRoom,
  type RequestPurpose,
  type SelectionView,
  type TileSelection,
} from "./Stepwise.ts";
import { Emitter } from "../core/Emitter.ts";
import { isCapacityError } from "../scene/CapacityError.ts";
import { BudgetedSelection, type BudgetedOptions } from "./Budgeted.ts";
import {
  fetchTilesetJson,
  loadTilesetJson,
  treeFromJson,
  type Tile,
  type TileGeometry,
  type TileJson,
  type TileTree,
} from "./Tile.ts";
import { transformVolume, volumeObb, type TileVolume } from "./volumes.ts";
import {
  DebugVolumes,
  VOLUME_COLORS,
  type DebugColor,
} from "./debugVolumes.ts";
import * as m4 from "../math/mat4.ts";
import type { DesignPlacement } from "./designPlacement.ts";
import type { RequestSample } from "./RequestScheduler.ts";
import type { GlobeImagery } from "../globe/GlobeImagery.ts";
import { TouchOrder } from "./TouchOrder.ts";
import {
  DRAW_ITEM_SIZE,
  MaterialFlags,
  RECORD_SIZE,
  TRANSFORM_SIZE,
} from "../render/layout.ts";
import {
  accumulate,
  emptyTotals,
  stageStats,
  summarizeContent,
  type ContentTotals,
  type Stage,
  type StageStats,
  type StageTimes,
} from "./pipeline.ts";

/**
 * World pool pressure (World.pressure) past which streaming evicts as if
 * over its byte budget (§13.15).
 */
const CAPACITY_PRESSURE = 0.9;
const DEGREES_TO_RADIANS = Math.PI / 180;
/**
 * Bytes a loaded tile costs besides its content, counted in `Tile.bytes`
 * and so against the byte budget. Per draw: its rows in the world's tables
 * (a draw record, a draw item, five words of indirect arguments, and two
 * transforms: the content root's and the node's), on the GPU and in their
 * CPU copies, about 800 bytes.
 */
const DRAW_OVERHEAD_BYTES =
  2 * (RECORD_SIZE + DRAW_ITEM_SIZE + 20 + 2 * TRANSFORM_SIZE);
/**
 * Per tile: its objects on the heap (the tile, its placement and handles,
 * the map entries that find it), about 2 KB. Without these overheads the
 * ellipsoid's tiles (about 17 KB each) fit the 512 MiB budget by the 30,000,
 * and the transform table reached 90% before the budget did.
 */
const TILE_OVERHEAD_BYTES = 2048;
/** Recent content loads kept for stage percentiles. */
const PIPELINE_WINDOW = 256;
/** Imagery priority offset of loading tiles: after drawn and waiting ones. */
const LOADING_IMAGERY = 1e15;
/** Frames without any view touching an in-flight tile before it is cancelled. */
const CANCEL_AFTER_FRAMES = 30;
/**
 * A 3D Tiles 1.0 tileset's `asset.gltfUpAxis` as its content's axes, read
 * from the root tileset only (as 1.x). The default is Y.
 */
function contentAxes(json: TileJson | undefined): ModelResourceOptions["axes"] {
  const up = json?.asset?.gltfUpAxis?.toUpperCase();
  return up === "Z" ? "none" : up === "X" ? "3d-tiles-x-up" : "3d-tiles";
}

/**
 * World pool pressure (World.pressure) past which shadow casters aren't
 * requested: they yield the pools to what views draw.
 */
const CASTER_PRESSURE = 0.75;
/**
 * The cache has one budget, and casters have no share of it. What views use
 * this tick is never evicted. Casters get what is left after that and after
 * the cold tiles (no view uses them now) that may yet come back, so a view
 * never loses a tile to a caster that it would have kept with casters off.
 * A cold tile may come back until it has gone `COLD_AGE_MS` without a view.
 * After that, casters may take its room.
 *
 * Time, not ticks: a still camera on demand doesn't tick. A view coming back
 * to a tile after a longer absence shows that was too soon, and the age
 * becomes twice that absence, up to `COLD_AGE_MAX_MS`. So the worst a view
 * pays is one return after each longer absence, and stale cold tiles always
 * give way in the end.
 */
const COLD_AGE_MS = 8_000;
const COLD_AGE_MAX_MS = 60_000;
/**
 * Casters waiting for cold tiles to age wake the loop for one tick when the
 * next goes stale, this far apart at least, ms. On a still camera that ends
 * when the last cold tile is stale, within the age.
 */
const COLD_WAKE_MIN_MS = 1_000;
/** Recent casters whose median is what one not yet loaded is assumed to cost. */
const CASTER_BYTES_WINDOW = 31;
/** Loading or waiting to upload for its shadow alone. */
function isCaster(tile: Tile): boolean {
  return tile.purpose === "caster" && tile.viewMask === 0;
}
/** `Tileset3D.extensions` of a tileset.json without any (and of terrain). */
const NO_EXTENSIONS: Readonly<Record<string, unknown>> = Object.freeze({});
/** `Tileset3D.rootJson` of a tileset.json without a root (and of terrain). */
const NO_ROOT_JSON: Tileset3D["rootJson"] = Object.freeze({});
/**
 * A hierarchical content source other than a 3D Tiles tileset.json (plan
 * §3.7): its own root, content loader and placement; selection, requests,
 * cache, view masks and rendering stay shared.
 */
export interface TileSource {
  readonly url: string;
  readonly root: Tile;
  readonly geometricError: number;
  /** The tree new tiles belong to (implicit trees grow as tiles load). */
  tree: TileTree;
  /** Decoded content of one tile. */
  loadTile(tile: Tile, signal: AbortSignal): Promise<GltfAsset>;
  /** Placement of a tile's content. */
  modelOptions(tile: Tile): {
    modelMatrix: Mat4;
    axes?: ModelResourceOptions["axes"];
    underlay?: boolean;
  };
  /** Height of the surface at a longitude and latitude (terrain sources). */
  sampleHeight?(longitude: number, latitude: number): number | undefined;
  /**
   * The surface's height where it is known without loading anything (the
   * ellipsoid: 0); undefined where its data must be loaded to know.
   */
  exactHeight?(longitude: number, latitude: number): number | undefined;
  /** Height of the drawn surface there (terrain sources). */
  surfaceHeight?(longitude: number, latitude: number): number | undefined;
  /** The drawn surface for exact ray queries (terrain sources). */
  rayTarget?(viewMask?: number): TerrainRayTarget;
  /** Called with each rectangle whose heights changed (terrain sources). */
  readonly heightListeners?: Set<(rectangle: Rectangle) => void>;
  /**
   * @internal Where the terrain isn't drawn, or is drawn at an opacity (terrain
   * sources, `Globe.terrain.addRegion`).
   */
  readonly clips?: TerrainClips;
  /** @internal The tile a ray target's patch drew, while loaded. */
  tileOf?(rayTile: TerrainRayTile): Tile | undefined;
  /** A tile's content left the cache. */
  unloadTile?(tile: Tile): void;
  /** A selection policy of its own for `options` (default: the tileset's). */
  createSelection?(options: TilesetOptions): TileSelection | undefined;
}

export interface TilesetOptions extends BudgetedOptions {
  /**
   * Tile selection: "budgeted" (default) adds skip-LOD, visible-only coverage,
   * hold, prefetch and free refinement from the shared cache; "stepwise"
   * reproduces CesiumJS 1.x for parity tests.
   */
  policy?: "stepwise" | "budgeted";
  /** Headers for every request (e.g. ion authorization). */
  headers?: Record<string, string>;
  /** Content cache budget in bytes (1.x cacheBytes default: 512 MiB). */
  cacheBytes?: number;
  /**
   * How far the cache may exceed `cacheBytes` for content the views need
   * before detail is reduced (1.x maximumCacheOverflowBytes: 512 MiB).
   */
  maximumCacheOverflowBytes?: number;
  /**
   * Pins the request window for this tileset's origin. Without it the window
   * adapts per origin, shared by every tileset there (RequestScheduler).
   */
  maximumRequests?: number;
  /** Uploads per frame, to bound main-thread hitches. */
  uploadsPerFrame?: number;
  /**
   * Clamped content may stand on it and ray casts with `collisionOnly`
   * hit it (1.x `enableCollision`, default false).
   */
  enableCollision?: boolean;
  /** Custom shader stages for all its content (1.x `customShader`). */
  customShader?: CustomShader;
  /**
   * A 3D Tiles style (1.x `style`: show and color per feature), as a
   * custom shader; not with `customShader`.
   */
  style?: FeatureStyle;
  /**
   * Float64 transform applied to the whole tileset (1.x `modelMatrix`),
   * e.g. a height offset; can change at runtime (`Tileset3D.modelMatrix`).
   * Tile boxes and spheres follow it for selection, regions do not (as in
   * 1.x); geometric errors keep the load-time scale. 3D Tiles only.
   */
  modelMatrix?: Mat4;
  /**
   * Where its design coordinates are drawn (`Tileset3D.placement`), for a
   * tileset that declares none: the application supplies the placement
   * (the proj entry's `TilesetPlacement`, or its own), since the engine
   * never guesses one.
   */
  placement?: DesignPlacement;
  /**
   * Keeps each loaded tile's triangles on the CPU (`Tile.geometry`) for
   * client-side snapping (`ClientSnapService`), released when the tile
   * unloads. Off by default: other tilesets keep no copy.
   */
  retainGeometry?: boolean;
  /**
   * The anchor its content hangs under (`World.addAnchor`,
   * `World.bodyAnchor`; default the Earth's, so tile transforms are
   * Earth-fixed as tileset.json writes them). Selection reads each view's
   * camera in this anchor (`View.anchorCamera`). Fixed at load.
   */
  anchor?: AnchorHandle;
}

export interface TilesetStats {
  tiles: number;
  loaded: number;
  loading: number;
  /**
   * Bytes of the loaded tiles: their content, and each tile's fixed cost
   * in the world's tables and on the heap (about 3 KB for a one-draw tile).
   */
  bytes: number;
  /** Content cache budget (eviction starts above it). */
  budget: number;
  /** Allowed overflow before the screen-space error is raised. */
  overflow: number;
  /** Current memory-adjusted screen-space error threshold. */
  screenSpaceError: number;
  /** Tiles drawn as mixed-LOD placeholders this frame, over all views. */
  placeholders: number;
  /** Tiles only shadow cascades draw, over all views, in the last update. */
  casters: number;
  /** Their bytes, and the bytes of loaded tiles no view or cascade wants. */
  casterBytes: number;
  coldBytes: number;
  /** What the caster error scale is multiplied by (1: not coarsened). */
  casterScale: number;
  /** Content requests in flight, and the origin's current window. */
  inFlight: number;
  maxInFlight: number;
  /** Whether the window adapts, and the origin's negotiated protocol. */
  adaptive: boolean;
  protocol?: string;
  /** Requests cancelled because no view needed them any more. */
  cancelled: number;
  /** Decoded content waiting for its upload slot. */
  uploadQueue: number;
  /** Cumulative content requests started (L1′ measurements). */
  requestsTotal: number;
  /** Cumulative GPU bytes uploaded (L1′ measurements). */
  bytesTotal: number;
  /** Cumulative content bytes received over the network. */
  bytesReceived: number;
  /**
   * Tiles whose content can't be drawn, unsupported or failed: they still
   * select and refine (as in 1.x's tree), and nothing more is coming for
   * them, so the tileset can settle. Why: `Tileset3D.undrawnReasons`.
   */
  undrawn: number;
  /** Tiles selected per view id in the last update. */
  selected: Map<number, number>;
  /** Cumulative requests by what they were for (`RequestPurpose`). */
  purposes: Record<RequestPurpose, PurposeStats>;
}

/** Cumulative content requests of one purpose. */
export interface PurposeStats {
  /** Requests started. */
  requests: number;
  /** Bytes received over the network. */
  bytes: number;
  /** Loads some view drew before they were evicted (each counted once). */
  drawn: number;
  /** Loads evicted before any view drew them. */
  unused: number;
  /** Requests cancelled because no view needed them any more. */
  cancelled: number;
}

export interface TilesetEvents {
  /** A content request started (its URL and what it is for). */
  request: { url: string; purpose: RequestPurpose };
}

function emptyPurposes(): Record<RequestPurpose, PurposeStats> {
  return Object.fromEntries(
    REQUEST_PURPOSES.map((p) => [
      p,
      { requests: 0, bytes: 0, drawn: 0, unused: 0, cancelled: 0 },
    ]),
  ) as Record<RequestPurpose, PurposeStats>;
}

/** Tile colors by tree depth for `debugColorizeTiles` (linear RGBA). */
const DEPTH_COLORS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.9, 0.2, 0.2, 1],
  [0.95, 0.55, 0.1, 1],
  [0.95, 0.85, 0.1, 1],
  [0.3, 0.8, 0.25, 1],
  [0.1, 0.7, 0.8, 1],
  [0.2, 0.35, 0.95, 1],
  [0.6, 0.3, 0.9, 1],
  [0.9, 0.35, 0.75, 1],
];
const WHITE = [1, 1, 1, 1] as const;

/** Most distinct reasons kept for tiles that draw nothing. */
export const MAX_UNDRAWN_REASONS = 20;

/**
 * A reason a tile draws nothing, without the tile in it: URLs (which can
 * carry a query string) and an inner tile's number come out, so that a
 * thousand failed tiles are one reason, not a thousand.
 */
export function undrawnKind(reason: string): string {
  return reason
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s]*?(?=:\s|[\s;,)]|$)/gi, "<url>")
    .replace(/composite inner tile \d+/g, "composite inner tile");
}

export class Tileset3D implements TileTree {
  readonly warnings = new Set<string>();
  /**
   * Why tiles draw nothing (`TilesetStats.undrawn`): each reason with tile
   * URLs and numbers taken out, and how many tiles. Holds at most
   * `MAX_UNDRAWN_REASONS` reasons.
   */
  readonly undrawnReasons = new Map<string, number>();
  /** Whether loaded tiles keep their triangles (`TilesetOptions.retainGeometry`). */
  readonly retainGeometry: boolean;
  readonly events = new Emitter<TilesetEvents>();
  /**
   * tileset.json's top-level `extensions` (none for terrain), frozen at the
   * top level only: the objects inside are the parsed JSON itself. The
   * engine doesn't read the engineering-frame declaration among them; the
   * proj entry's `tilesetGeoreference(tileset)` does.
   */
  readonly extensions: Readonly<Record<string, unknown>>;
  /**
   * @internal The root tile's `boundingVolume` and `transform` as
   * tileset.json writes them (the parsed JSON itself; neither for terrain),
   * for the proj entry's `tilesetGeoreference`, which derives an area of
   * interest from them.
   */
  readonly rootJson: {
    readonly boundingVolume?: unknown;
    readonly transform?: unknown;
  };
  /**
   * Where the tileset's design coordinates are drawn, and the way back
   * (`DesignPlacement`): set by the proj entry's `georeferenceTileset` from
   * the declaration, or by the application (`TilesetOptions.placement`).
   * Without one, picks on
   * it have no design coordinates. Unrelated to `Tile.placement`, which is a
   * tile's loaded content in the world (a `ModelPlacement`). Changing
   * `modelMatrix` drops it, with a warning: it would no longer describe what
   * is drawn.
   */
  placement?: DesignPlacement;
  /**
   * The selection policy (`setPolicy` replaces it). Its knobs set here
   * (`maximumScreenSpaceError`, ...) select again and wake the engine's
   * loop.
   *
   * It is a proxy on the policy, so that a write through it wakes the
   * loop: reads and writes reach the policy, but its identity is the
   * proxy's. The same proxy comes back until `setPolicy` replaces the
   * policy, so `tileset.selection === tileset.selection` holds, and a
   * changed identity still means a new policy; the policy object itself is
   * never handed out.
   */
  get selection(): TileSelection {
    if (this.watchedPolicy?.policy !== this.policy) {
      this.watchedPolicy = {
        policy: this.policy,
        proxy: new Proxy(this.policy, {
          set: (target, key, value) => {
            (target as unknown as Record<PropertyKey, unknown>)[key] = value;
            this.changed();
            return true;
          },
        }),
      };
    }
    return this.watchedPolicy.proxy;
  }
  private policy: TileSelection;
  private watchedPolicy?: { policy: TileSelection; proxy: TileSelection };
  private readonly options: TilesetOptions;
  /** How its content is turned upright (`asset.gltfUpAxis`). */
  private readonly contentAxes: ModelResourceOptions["axes"];
  readonly stats: TilesetStats = {
    tiles: 0,
    loaded: 0,
    loading: 0,
    bytes: 0,
    budget: 0,
    overflow: 0,
    screenSpaceError: 16,
    placeholders: 0,
    casters: 0,
    casterBytes: 0,
    coldBytes: 0,
    casterScale: 1,
    inFlight: 0,
    maxInFlight: 0,
    adaptive: true,
    cancelled: 0,
    uploadQueue: 0,
    requestsTotal: 0,
    bytesTotal: 0,
    bytesReceived: 0,
    undrawn: 0,
    selected: new Map(),
    purposes: emptyPurposes(),
  };
  /**
   * Clamped content may stand on it and ray casts with `collisionOnly`
   * hit it (1.x `enableCollision`).
   */
  get enableCollision(): boolean {
    return this.collision;
  }
  set enableCollision(value: boolean) {
    if (value === this.collision) {
      return;
    }
    this.collision = value;
    this.changed();
    const visit = (tile: Tile) => {
      for (const draw of tile.placement?.draws ?? []) {
        this.world.setCollision(draw, value);
      }
      tile.children.forEach(visit);
    };
    visit(this.root);
  }
  private collision = false;

  /**
   * The tileset's `modelMatrix` (1.x `Cesium3DTileset.modelMatrix`).
   * Setting it moves loaded content with one transform write and moves
   * the selection volumes of every tile (boxes and spheres; regions are
   * geographic and stay, as in 1.x). 3D Tiles only.
   */
  get modelMatrix(): Mat4 {
    return m4.multiply(m4.mat4(), this.delta, this.loadMatrix);
  }
  set modelMatrix(matrix: Mat4) {
    if (this.source) {
      throw new Error("modelMatrix applies to 3D Tiles, not terrain");
    }
    const current = this.modelMatrix;
    const changed = current.some((x, i) => x !== matrix[i]);
    const delta = m4.multiply(
      m4.mat4(),
      matrix,
      m4.invertAffine(m4.mat4(), this.loadMatrix),
    );
    // The volumes move by the change from the current placement.
    const change = m4.multiply(
      m4.mat4(),
      delta,
      m4.invertAffine(m4.mat4(), this.delta),
    );
    this.delta = delta;
    this.world.setTransform(this.transform, delta);
    for (const tile of this.loaded) {
      for (const g of tile.geometry ?? []) {
        this.world.drawMatrix(g.draw, g.matrix);
      }
    }
    this.moveVolumes(this.root, change);
    this.changed();
    if (changed && this.placement !== undefined) {
      this.placement = undefined;
      this.warnings.add(
        "modelMatrix changed: the tileset's placement no longer describes what is drawn, and was dropped",
      );
    }
  }
  /** Load-time `modelMatrix`, built into tile transforms and volumes. */
  private readonly loadMatrix: Mat4;
  /** `modelMatrix` × loadMatrix⁻¹: the content root transform. */
  private delta: Mat4 = m4.mat4();
  /** Parent transform of all content: moves it with one write. */
  private readonly transform: TransformHandle;
  /**
   * The anchor its content hangs under (`TilesetOptions.anchor`; default
   * the Earth's): what its tiles' transforms and volumes are relative to.
   */
  readonly anchor: AnchorHandle;

  private moveVolumes(tile: Tile, change: Mat4): void {
    tile.volume = transformVolume(tile.volume, change);
    if (tile.contentVolume) {
      tile.contentVolume = transformVolume(tile.contentVolume, change);
    }
    if (tile.requestVolume) {
      tile.requestVolume = transformVolume(tile.requestVolume, change);
    }
    for (const child of tile.children) {
      this.moveVolumes(child, change);
    }
  }

  /**
   * True for a globe (`Engine.addTerrain`, `addEllipsoid`: terrain and the
   * ellipsoid, which are `Globe`s), false for 3D Tiles.
   */
  get isGlobe(): boolean {
    return this.source !== undefined;
  }

  /**
   * The terrain material each tile draws with (shared by content), and
   * its blended twin for tiles under a region that blends, both ways.
   */
  private readonly blendedTwins = new Map<number, number>();
  private readonly ownMaterials = new Map<number, number>();

  /**
   * Whether the globe's terrain is a hole for queries at a longitude and
   * latitude in degrees, as the regions' vertices are, and `height` m above
   * the ellipsoid (default 0): inside a region that isn't ground
   * (`TerrainRegion.ground`).
   */
  terrainClipped(longitude: number, latitude: number, height = 0): boolean {
    return (
      this.source?.clips?.clippedAt(
        longitude * DEGREES_TO_RADIANS,
        latitude * DEGREES_TO_RADIANS,
        height,
      ) ?? false
    );
  }

  /**
   * @internal Whether the draw in slot `index` is this tileset's content
   * now (its loaded tiles').
   */
  ownsDraw(index: number): boolean {
    return this.drawTiles.has(index);
  }

  /**
   * @internal Masks again the loaded tiles that overlap `reach` (a region
   * that joined or left what tiles test, or went on or off the blended
   * path), tells height listeners of the `heights` rectangles whose ground
   * changed, wakes.
   */
  regionsChanged(
    reach: readonly Rectangle[],
    heights: readonly Rectangle[],
  ): void {
    this.terrainRegions = (this.source?.clips?.size ?? 0) > 0;
    if (reach.length > 0) {
      for (const tile of this.loaded) {
        const r = tile.globe?.rectangle;
        if (r && reach.some((b) => rectanglesOverlap(b, r))) {
          this.applyTerrainClip(tile);
        }
      }
    }
    for (const listener of this.source?.heightListeners ?? []) {
      for (const r of heights) {
        listener(r);
      }
    }
    this.changed();
  }

  /** The globe has regions: loading tiles test them. */
  private terrainRegions = false;

  /**
   * Which regions a globe tile's draws test (a bit per region that changes
   * how it draws), and its material: the terrain's own, or its blended
   * twin where a region of opacity above 0 and below 1 reaches the tile.
   */
  private applyTerrainClip(tile: Tile): void {
    const clips = this.source?.clips;
    if (!clips || !tile.placement || !tile.globe) {
      return;
    }
    const mask = clips.maskFor(tile.globe.rectangle);
    const blended = (mask & clips.blendedMask) !== 0;
    for (const draw of tile.placement.draws) {
      this.world.setTerrainClip(draw, mask);
      const current = this.world.drawMaterial(draw);
      if (current === undefined) {
        continue;
      }
      const own = this.ownMaterials.get(current) ?? current;
      let wanted = own;
      if (blended) {
        let twin = this.blendedTwins.get(own);
        if (twin === undefined) {
          twin = this.world.materialWithFlags(own, MaterialFlags.alphaBlend);
          this.blendedTwins.set(own, twin);
          this.ownMaterials.set(twin, own);
        }
        wanted = twin;
      }
      if (wanted !== current) {
        this.world.setDrawMaterial(draw, wanted);
      }
    }
  }

  /**
   * Loads the most detailed content along rays (1.x
   * `MOST_DETAILED_PRELOAD`): every tile whose bounds a ray crosses, down
   * to the leaves (and every tile on the way under ADD refinement),
   * requested ahead of what the views need, external tilesets included.
   * Resolves with those tiles' draws, kept loaded until `release`. The
   * engine's frame loop must be running.
   */
  queryRays(
    rays: readonly CastRay[],
  ): Promise<{ draws: DrawHandle[]; release(): void }> {
    return new Promise((resolve, reject) => {
      this.queries.push({ rays, resolve, reject, pinned: [] });
      this.changed();
    });
  }
  private readonly queries: Array<{
    rays: readonly CastRay[];
    resolve: (result: { draws: DrawHandle[]; release(): void }) => void;
    reject: (error: Error) => void;
    pinned: Tile[];
    done?: boolean;
  }> = [];

  /**
   * Serves ray queries for one frame: wanted tiles go first in `requests`;
   * pinned tiles count as touched (not evicted or cancelled).
   */
  private serveQueries(
    frame: number,
    requests: Map<Tile, number>,
    purposes: Map<Tile, RequestPurpose>,
  ): void {
    for (let q = this.queries.length - 1; q >= 0; q--) {
      const query = this.queries[q]!;
      if (query.done) {
        for (const tile of query.pinned) {
          this.order.touch(tile, frame);
        }
        continue;
      }
      const tiles = new Set<Tile>();
      for (const ray of query.rays) {
        this.tilesAlongRay(this.root, ray, tiles);
      }
      let pending = false;
      for (const tile of tiles) {
        this.order.touch(tile, frame);
        if (tile.state === "unloaded" || tile.state === "loading") {
          pending = true;
          if (tile.state === "unloaded") {
            requests.set(tile, -1);
            purposes.set(tile, "sample");
          }
        }
      }
      if (this.externals.length > 0) {
        pending = true; // children still to be built
      }
      if (!pending) {
        query.done = true;
        query.pinned = [...tiles].filter((t) => t.placement);
        query.resolve({
          draws: query.pinned.flatMap((t) => t.placement!.draws),
          release: () => {
            const at = this.queries.indexOf(query);
            if (at >= 0) {
              this.queries.splice(at, 1);
            }
          },
        });
      }
    }
  }

  /** Tiles a ray needs for its most detailed content. */
  private tilesAlongRay(tile: Tile, ray: CastRay, out: Set<Tile>): void {
    if (!crossesSphere(ray, tile.volume.sphere)) {
      return;
    }
    if (tile.external) {
      if (tile.state !== "ready") {
        out.add(tile); // its tileset JSON, then its children
        return;
      }
    } else if (tile.hasContent) {
      const crossed = tile.children.some((c) =>
        crossesSphere(ray, c.volume.sphere),
      );
      if (tile.refine === "ADD" || !crossed) {
        out.add(tile);
      }
    }
    for (const child of tile.children) {
      this.tilesAlongRay(child, ray, out);
    }
  }

  /** Frame counter value of the last change to what the tileset draws. */
  get changedAt(): number {
    return this.lastChange;
  }

  /** False hides the tileset in every view; it keeps its cache. */
  get show(): boolean {
    return this.shown;
  }
  set show(value: boolean) {
    if (value !== this.shown) {
      this.shown = value;
      this.changed(); // update the views' masks next frame
    }
  }
  private shown = true;
  /**
   * Keeps the current selection, for inspecting it from elsewhere: no
   * selection, requests, uploads or eviction until cleared (1.x
   * `debugFreezeFrame`). The GPU still culls the drawn tiles per view.
   */
  get freezeSelection(): boolean {
    return this.frozen;
  }
  set freezeSelection(value: boolean) {
    if (value !== this.frozen) {
      this.frozen = value;
      this.changed(); // select again as soon as it thaws
    }
  }
  private frozen = false;
  /**
   * Tints each drawn tile by its depth in the tree, to see the levels a
   * selection picked (1.x `debugColorizeTiles`). Off restores white.
   */
  get debugColorizeTiles(): boolean {
    return this.colorize;
  }
  set debugColorizeTiles(value: boolean) {
    if (value !== this.colorize) {
      this.colorize = value;
      for (const tile of this.masked) {
        this.applyDebugColor(tile);
      }
      this.changed();
    }
  }
  private colorize = false;
  /**
   * Tints each drawn tile with the color this returns (linear RGBA; none
   * leaves it white), checked every frame, for inspection tools: tiles
   * one engine draws and another doesn't, say. Wins over
   * `debugColorizeTiles`.
   */
  get debugTileColor(): ((tile: Tile) => DebugColor | undefined) | undefined {
    return this.tileColor;
  }
  set debugTileColor(fn: ((tile: Tile) => DebugColor | undefined) | undefined) {
    this.tileColor = fn;
    this.updateDebug();
    this.changed();
  }
  private tileColor?: (tile: Tile) => DebugColor | undefined;
  private applyDebugColor(tile: Tile): void {
    if (!tile.placement) {
      return;
    }
    const color =
      this.tileColor?.(tile) ??
      (this.colorize
        ? DEPTH_COLORS[tile.depth % DEPTH_COLORS.length]!
        : undefined);
    const current = tile.debugColor;
    if (
      color === current ||
      (color && current && color.every((c, i) => c === current[i]))
    ) {
      return;
    }
    for (const draw of tile.placement.draws) {
      this.world.setColor(draw, color ?? WHITE);
    }
    tile.debugColor = color;
  }
  /**
   * Wireframes of the drawn tiles' bounding volumes, colored as 1.x does:
   * white at final resolution, yellow while finer tiles load (drawn as a
   * placeholder), gray without content of its own.
   */
  get debugShowBoundingVolume(): boolean {
    return this.boundingVolumes !== undefined;
  }
  set debugShowBoundingVolume(value: boolean) {
    if (value !== this.debugShowBoundingVolume) {
      this.boundingVolumes?.clear();
      this.boundingVolumes = value
        ? new DebugVolumes(this.world, this.transform)
        : undefined;
      this.updateDebug();
      this.changed();
    }
  }
  private boundingVolumes?: DebugVolumes;
  /** Wireframes (blue) of the drawn tiles' content volumes, where given. */
  get debugShowContentBoundingVolume(): boolean {
    return this.contentVolumes !== undefined;
  }
  set debugShowContentBoundingVolume(value: boolean) {
    if (value !== this.debugShowContentBoundingVolume) {
      this.contentVolumes?.clear();
      this.contentVolumes = value
        ? new DebugVolumes(this.world, this.transform)
        : undefined;
      this.updateDebug();
      this.changed();
    }
  }
  private contentVolumes?: DebugVolumes;
  /** Debug tints and volumes for what is drawn now (also while frozen). */
  private updateDebug(): void {
    if (this.tileColor) {
      for (const tile of this.masked) {
        this.applyDebugColor(tile);
      }
    }
    if (!this.boundingVolumes && !this.contentVolumes) {
      return;
    }
    const drawn = new Set([...this.masked, ...this.placeholders]);
    type Want = Map<Tile, { volume: TileVolume; color: DebugColor }>;
    const bounding: Want = new Map();
    const content: Want = new Map();
    for (const tile of drawn) {
      bounding.set(tile, {
        volume: tile.volume,
        color:
          tile.placeholderMask !== 0
            ? VOLUME_COLORS.refining
            : tile.renderable
              ? VOLUME_COLORS.final
              : VOLUME_COLORS.empty,
      });
      if (tile.contentVolume) {
        content.set(tile, {
          volume: tile.contentVolume,
          color: VOLUME_COLORS.content,
        });
      }
    }
    this.boundingVolumes?.update(bounding);
    this.contentVolumes?.update(content);
  }
  /** Globe imagery draped on this terrain tileset (`engine.addTerrain`). */
  imagery?: GlobeImagery;
  /** The globe's night lights (`GlobeOptions.lights`), for the same tiles. */
  lights?: GlobeImagery;
  /**
   * Imagery is on its way (`GlobeOptions.imagery` as a promise): tiles load
   * meanwhile but none is shown bare.
   */
  imageryPending = false;
  private readonly imageryReady = (tile: Tile) =>
    !this.imageryPending && (this.imagery?.hasImagery(tile) ?? true);
  private readonly imageryRefines = (tile: Tile) =>
    this.imagery?.refines(tile) ?? false;
  /** Selected tiles per view id after the last update (parity tests). */
  readonly lastSelected = new Map<number, Tile[]>();
  private frame = 0;
  /** A non-3D-Tiles source, when streaming one (`Globe.create`). */
  protected source?: TileSource;
  /** Last frame in which an update changed anything. */
  private lastChange = 0;

  /**
   * What the tileset draws changed: it stays `active` for the next updates,
   * and the engine's frame loop (asleep on demand once nothing changes)
   * wakes for them.
   */
  protected changed(): void {
    this.lastChange = this.frame;
    this.engine.wake();
  }
  private readonly cacheBytes: number;
  /** The world pool an upload last found full (`CapacityError.pool`). */
  private capacityFull?: string;
  /** Frames to wait before retrying uploads after a capacity failure. */
  private capacityWait = 0;
  /** `capacityFull` came from a failed upload, not only from pressure. */
  private capacityFailed = false;
  private readonly overflowBytes: number;
  private readonly fixedWindow?: number;
  /** The root's origin, and every origin this tileset requested from. */
  private readonly origin: string;
  private readonly origins = new Set<string>();
  private readonly loading = new Map<Tile, AbortController>();
  private readonly uploadsPerFrame: number;
  private readonly headers?: Record<string, string>;
  private readonly loaded = new Set<Tile>();
  /** The loaded tiles, least recently touched first (what eviction walks). */
  private readonly order = new TouchOrder<Tile>();
  private readonly ready: Array<{
    tile: Tile;
    asset: GltfAsset;
    arrivedAt: number;
  }> = [];
  /** Unloaded tiles wanted by some view, since when (queue time). */
  private readonly wanted = new Map<Tile, number>();
  private readonly recent: StageTimes[] = [];
  /**
   * Median request-to-drawable time of recent loads, ms (until measured,
   * a typical CDN load).
   */
  private loadEstimateMs = 500;
  /** What resident content holds, summed over loaded tiles. */
  readonly resident: ContentTotals = emptyTotals();
  /** Load milestones (performance.now()): created, first content, idle. */
  readonly createdAt = performance.now();
  firstContentAt?: number;
  settledAt?: number;
  private masked = new Set<Tile>();
  /** Tiles with a caster mask (`CasterSelection.casters`). */
  private casters = new Set<Tile>();
  /** Bytes of what views used in the last update. */
  private viewBytes = 0;
  /** How long a cold tile may yet come back, ms (`COLD_AGE_MS`). */
  private coldAgeMs = COLD_AGE_MS;
  /** The last update selected shadow casters. */
  private casting = false;
  /** `World.contentRevision` after the last update. */
  private revisionSeen = 0;
  /** The timer that wakes the loop for cold tiles going stale. */
  private casterTimer: ReturnType<typeof setTimeout> | undefined;
  /** That timer fired, and the next update is due. */
  private casterWake = false;
  /** Bytes of recent casters (`CASTER_BYTES_WINDOW`), and their median. */
  private readonly recentCasterBytes: number[] = [];
  private casterBytesEstimate = 0;
  /** Whether casters may load this tick (`CasterRoom.load`). */
  private casterLoad = true;
  /** A view's tile found a pool full: casters wait until it has uploaded. */
  private viewCapacityWait = false;
  /** Bytes of loaded tiles that are `castsOnly`, drawn by cascades or not. */
  private casterResident = 0;
  private placeholders = new Set<Tile>();
  /** Tiles drawn whole while finer content loads, in some view. */
  private standIns = new Set<Tile>();
  private inFlight = 0;
  private destroyed = false;

  protected constructor(
    private readonly engine: Engine,
    readonly world: World,
    readonly url: string,
    options: TilesetOptions,
    public root: Tile,
    readonly geometricError: number,
    source?: TileSource,
    tilesetJson?: TileJson,
  ) {
    if (options.customShader && options.style) {
      throw new Error("Tileset3D: give a customShader or a style, not both.");
    }
    this.options = options;
    this.contentAxes = contentAxes(tilesetJson);
    this.collision = options.enableCollision ?? false;
    this.retainGeometry = options.retainGeometry ?? false;
    this.loadMatrix = m4.copy(m4.mat4(), options.modelMatrix ?? m4.mat4());
    this.anchor = contentAnchor(world, options.anchor, "Tileset3D");
    this.transform = world.addTransform(m4.mat4(), this.anchor);
    this.policy = createSelection(options, source);
    this.cacheBytes = options.cacheBytes ?? 512 * 1024 * 1024;
    this.overflowBytes = options.maximumCacheOverflowBytes ?? 512 * 1024 * 1024;
    if (options.maximumRequests !== undefined) {
      this.fixedWindow = options.maximumRequests;
    }
    this.origin = this.originOf(url);
    this.useOrigin(this.origin);
    this.uploadsPerFrame = options.uploadsPerFrame ?? 8;
    this.headers = options.headers;
    this.stats.budget = this.cacheBytes;
    this.stats.overflow = this.overflowBytes;
    this.stats.adaptive = this.fixedWindow === undefined;
    const extensions: unknown = tilesetJson?.extensions;
    this.extensions =
      typeof extensions === "object" &&
      extensions !== null &&
      !Array.isArray(extensions)
        ? Object.freeze({ ...extensions })
        : NO_EXTENSIONS;
    const rootJson: unknown = tilesetJson?.root;
    this.rootJson =
      typeof rootJson === "object" && rootJson !== null
        ? Object.freeze({
            boundingVolume: (rootJson as Record<string, unknown>)
              .boundingVolume,
            transform: (rootJson as Record<string, unknown>).transform,
          })
        : NO_ROOT_JSON;
    if (options.placement !== undefined) {
      this.placement = options.placement;
    }
  }

  /**
   * The tile whose loaded content `draw` is (from `World.feature`'s draw),
   * or undefined: another tileset's draw, or one whose tile has unloaded
   * (its slot's generation then no longer matches).
   */
  tileOfDraw(draw: DrawHandle): Tile | undefined {
    const entry = this.drawTiles.get(draw.index);
    return entry?.generation === draw.generation ? entry.tile : undefined;
  }
  /** Loaded tiles by draw slot: kept with placing and unloading content. */
  private readonly drawTiles = new Map<
    number,
    { readonly generation: number; readonly tile: Tile }
  >();

  static async load(
    engine: Engine,
    world: World,
    url: string,
    options: TilesetOptions = {},
  ): Promise<Tileset3D> {
    const warnings = new Set<string>();
    const { root, geometricError, json } = await loadTilesetJson(
      url,
      options.headers,
      undefined,
      { warnings },
      options.modelMatrix,
    );
    const tileset = new Tileset3D(
      engine,
      world,
      url,
      options,
      root,
      geometricError,
      undefined,
      json,
    );
    warnings.forEach((w) => tileset.warnings.add(w));
    tileset.stats.tiles = countTiles(root);
    // Tiles keep a reference to the tree they were built for; point them here.
    retarget(root, tileset);
    return tileset;
  }

  /**
   * Points a non-3D-Tiles source's tiles (terrain) at this tileset, which
   * streams them through the same machinery (`Globe.create`).
   */
  protected attachSource(source: TileSource): void {
    this.source = source;
    source.tree = this;
    this.stats.tiles = countTiles(source.root);
    retarget(source.root, this);
  }

  /**
   * Switches the selection policy in place: loaded content, the cache and
   * requests stay; the next update selects under the new rules. The
   * current maximum screen-space error carries over.
   */
  setPolicy(policy: "stepwise" | "budgeted"): void {
    const options = {
      ...this.options,
      policy,
      maximumScreenSpaceError: this.policy.maximumScreenSpaceError,
    };
    this.policy = createSelection(options, this.source);
    // Per-tile selection state belongs to the old policy, whose pass
    // numbers the new one would mistake for its own.
    const reset = (tile: Tile) => {
      tile.views.length = 0;
      if (tile.globe) {
        tile.globe.selection.length = 0;
      }
      for (const child of tile.children) {
        reset(child);
      }
    };
    reset(this.root);
    this.changed();
  }

  /**
   * Height of the surface (meters above the ellipsoid) at a longitude and
   * latitude in radians, for terrain and the ellipsoid: from the finest
   * loaded tile, so it sharpens as tiles load. Undefined for 3D Tiles and
   * where nothing is loaded yet.
   */
  sampleHeight(longitude: number, latitude: number): number | undefined {
    return this.source?.sampleHeight?.(longitude, latitude);
  }

  /** Height known without loading anything (the ellipsoid: 0), if any. */
  exactHeight(longitude: number, latitude: number): number | undefined {
    return this.source?.exactHeight?.(longitude, latitude);
  }

  /**
   * Height of the drawn surface (the triangle under the point in the
   * finest loaded tile, as 1.x `Globe.getHeight`): what clamped content
   * stands on. Terrain and the ellipsoid; undefined elsewhere.
   */
  surfaceHeight(longitude: number, latitude: number): number | undefined {
    return this.source?.surfaceHeight?.(longitude, latitude);
  }

  /**
   * The terrain as drawn in the views of `viewMask` (default all; a view's
   * bit is `Engine.viewBit`), read-only, for exact ray queries
   * (`terrainLineOfSight`). Undefined for 3D Tiles: they keep no CPU
   * triangles and are ray cast on the GPU (§13.10, `World.castRays`).
   */
  terrainRayTarget(viewMask?: number): TerrainRayTarget | undefined {
    return this.source?.rayTarget?.(viewMask);
  }

  /**
   * Calls `listener` with each rectangle (radians) whose surface heights
   * changed as terrain tiles load and unload; returns a remover. Never
   * called for 3D Tiles.
   */
  onHeightsChanged(listener: (rectangle: Rectangle) => void): () => void {
    const listeners = this.source?.heightListeners;
    listeners?.add(listener);
    return () => listeners?.delete(listener);
  }

  /** Counts tiles an implicit tree created (TileTree). */
  tilesAdded(count: number): void {
    this.stats.tiles += count;
  }

  /**
   * True when nothing a view needs is loading or waiting to upload. Shadow
   * casters off screen aren't counted (`casterIdle`): a still view is
   * settled while they load, and answers made then are final.
   */
  get idle(): boolean {
    if (this.externals.length > 0) {
      return false;
    }
    for (const tile of this.loading.keys()) {
      if (!isCaster(tile)) {
        return false;
      }
    }
    return this.ready.every((r) => isCaster(r.tile));
  }

  /** True when no shadow caster is loading or waiting to upload. */
  get casterIdle(): boolean {
    return this.inFlight === 0 && this.ready.length === 0;
  }

  /** External tileset JSON waiting for its tile tree to be built. */
  private readonly externals: Array<{ tile: Tile; json: TileJson }> = [];

  /** Builds waiting external tilesets' trees within the frame's budget. */
  private buildExternals(): void {
    const budget = this.engine.uploadBudget;
    while (this.externals.length > 0) {
      if (budget.trees > 0 && budget.ms <= 0) {
        break;
      }
      const { tile, json } = this.externals.shift()!;
      const start = performance.now();
      try {
        const { root } = treeFromJson(json, tile.contentUrl!, tile, this);
        // Built in the load-time frame: move it to the current one.
        if (!isIdentity(this.delta)) {
          this.moveVolumes(root, this.delta);
        }
        tile.children.push(root);
        tile.state = "ready";
        this.stats.tiles += countTiles(root);
      } catch (error) {
        tile.state = "failed";
        this.undrawnTile(
          `tileset JSON failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      budget.ms -= performance.now() - start;
      budget.trees++;
      this.changed();
    }
  }

  /**
   * Needs `update()` even with every camera still: loading, waiting for a
   * request slot, changed in the last few frames (an upload can enable
   * further refinement), or the memory-adjusted SSE still moving toward its
   * target.
   */
  get active(): boolean {
    return (
      this.inFlight > 0 ||
      this.settling ||
      // Another tileset's selection decides where its casters may stand.
      (this.casting && this.world.contentRevision !== this.revisionSeen)
    );
  }

  /**
   * Needs the engine's loop to keep ticking: `active`, except for loads in
   * flight alone (their completion wakes the loop, `changed`), and with
   * height queries. Content waiting to upload, trees to build, tiles
   * waiting for a request slot, height queries, a recent change, imagery,
   * or the memory-adjusted SSE still moving.
   */
  get needsFrames(): boolean {
    return this.queries.length > 0 || this.settling;
  }

  /** What both `active` and `needsFrames` wait on: work an update does now. */
  private get settling(): boolean {
    return (
      this.ready.length > 0 ||
      this.externals.length > 0 ||
      // Wanted tiles still waiting for a request slot (the origin's window,
      // shared with other tilesets, may be full).
      this.wanted.size > 0 ||
      this.frame - this.lastChange < 3 ||
      this.casterWake ||
      this.imagery?.busy === true ||
      this.imageryPending ||
      this.policy.memoryAdjustedScreenSpaceError !==
        this.policy.maximumScreenSpaceError
    );
  }

  /**
   * Where recent content loads spent their time: p50 and p95 per stage over
   * the last loads (queued for a request slot, network, worker wait, decode,
   * waiting for an upload slot, upload).
   */
  pipeline(): { samples: number; stages: Record<Stage, StageStats> } {
    return { samples: this.recent.length, stages: stageStats(this.recent) };
  }

  /** One frame: select per view, apply view masks, request, upload, evict. */
  update(allViews: SelectionView[]): void {
    this.casterWake = false;
    if (this.destroyed) {
      return;
    }
    if (this.frozen) {
      this.updateDebug();
      return;
    }
    const frame = ++this.frame;
    // Hidden: no view selects anything (drawn tiles leave every view).
    const views = this.show ? allViews : [];
    if (allViews.length === 0) {
      // No view yet (e.g. its world isn't shown yet): stay active, so the
      // first selection runs as soon as a view appears.
      this.lastChange = frame;
    }
    const before =
      this.stats.requestsTotal +
      this.stats.bytesTotal +
      this.stats.loaded +
      this.world.version;
    const requests = new Map<Tile, number>();
    const purposes = new Map<Tile, RequestPurpose>();
    const nowMasked = new Set<Tile>();
    for (const tile of this.masked) {
      tile.viewMask = 0;
    }
    const nowPlaceholders = new Set<Tile>();
    for (const tile of this.placeholders) {
      tile.placeholderMask = 0;
      tile.holes = undefined;
    }
    const nowStandIns = new Set<Tile>();
    for (const tile of this.standIns) {
      tile.standInMask = 0;
    }
    const nowCasters = new Set<Tile>();
    for (const tile of this.casters) {
      tile.casterMask = 0;
    }
    this.policy.imageryReady =
      this.imagery || this.imageryPending ? this.imageryReady : undefined;
    this.policy.imageryRefines = this.imagery ? this.imageryRefines : undefined;
    this.policy.expectedLoadSeconds = this.loadEstimateMs / 1000;
    const now = performance.now();
    let viewBytes = 0;
    // What a view uses this tick stays, and is the view's: counted once.
    const useInView = (tile: Tile): void => {
      if (tile.touchedFrame < frame) {
        viewBytes += tile.bytes;
        tile.viewedAt = now;
      }
      this.order.touch(tile, frame);
    };
    // A view drawing or asking for a tile after longer than the age: cold
    // tiles do come back.
    const cameBack = (tile: Tile): void => {
      const away = now - tile.viewedAt;
      if (
        tile.touchedFrame < frame - 1 &&
        tile.viewedAt > 0 &&
        away > this.coldAgeMs
      ) {
        this.coldAgeMs = Math.min(COLD_AGE_MAX_MS, 2 * away);
      }
    };
    const addRequest = (
      tile: Tile,
      priority: number,
      purpose: RequestPurpose,
    ): void => {
      const previous = requests.get(tile);
      if (previous === undefined || priority < previous) {
        // The most urgent view's purpose.
        requests.set(tile, priority);
        purposes.set(tile, purpose);
      }
    };
    const waiting = new Set<Tile>();
    for (const view of views) {
      const result = this.policy.select(this.root, this.geometricError, view);
      const bit = (1 << view.id) >>> 0;
      for (const tile of result.selected) {
        tile.viewMask = (tile.viewMask | bit) >>> 0;
        nowMasked.add(tile);
        cameBack(tile);
        useInView(tile);
        this.markCastsOnly(tile, false);
      }
      for (const [tile, holes] of result.placeholders ?? []) {
        tile.placeholderMask = (tile.placeholderMask | bit) >>> 0;
        tile.holes ??= new Set();
        for (const hole of holes) {
          tile.holes.add(hole);
        }
        nowPlaceholders.add(tile);
      }
      for (const tile of result.standIns ?? []) {
        tile.standInMask = (tile.standInMask | bit) >>> 0;
        nowStandIns.add(tile);
      }
      for (const tile of result.touched) {
        useInView(tile);
      }
      for (const tile of result.waiting ?? []) {
        waiting.add(tile);
      }
      for (const tile of result.requested) {
        cameBack(tile);
        useInView(tile);
        // Nearest first across views (1.x orders by distance for REPLACE);
        // a policy may supply its own priority.
        const priority =
          result.priority?.get(tile) ?? tile.viewState(view.id).distance;
        addRequest(tile, priority, this.policy.purpose?.(priority) ?? "view");
      }
      this.lastSelected.set(view.id, result.selected);
      this.stats.selected.set(view.id, result.selected.length);
    }
    this.viewBytes = viewBytes;
    // Shadow casters, now that the bytes views use are known.
    const room = this.casterRoom(views, frame, now);
    if (room) {
      for (const view of views) {
        const found = this.policy.selectCasters!(
          this.root,
          this.geometricError,
          view,
          this.lastSelected.get(view.id)!,
          room,
        );
        const bit = (1 << view.id) >>> 0;
        for (const tile of found.casters) {
          tile.casterMask = (tile.casterMask | bit) >>> 0;
          nowCasters.add(tile);
        }
        for (const [tile, priority] of found.wanted) {
          // Kept from cancelling while it loads, as a view's tile is.
          this.order.touch(tile, frame);
          if (tile.state === "unloaded") {
            addRequest(tile, priority, "caster");
          }
        }
      }
    }
    // View masks: only tiles whose mask changed touch their draw records.
    for (const tile of new Set([...this.masked, ...nowMasked])) {
      this.applyDebugColor(tile);
      if (tile.placement && tile.appliedMask !== tile.viewMask) {
        if (tile.viewMask !== 0 && tile.purpose) {
          this.stats.purposes[tile.purpose].drawn++;
          tile.purpose = undefined;
        }
        for (const draw of tile.placement.draws) {
          this.world.setViewMask(draw, tile.viewMask);
        }
        tile.appliedMask = tile.viewMask;
      }
    }
    this.masked = nowMasked;
    // Off-screen casters: as for view masks, and the tint's callback sees
    // them too (it may hide a tile, and a hidden draw doesn't cast).
    for (const tile of new Set([...this.casters, ...nowCasters])) {
      this.applyDebugColor(tile);
      if (tile.placement && tile.appliedCasterMask !== tile.casterMask) {
        if (tile.casterMask !== 0 && tile.purpose === "caster") {
          this.stats.purposes.caster.drawn++;
          tile.purpose = undefined;
        }
        for (const draw of tile.placement.draws) {
          this.world.setCasterMask(draw, tile.casterMask);
        }
        tile.appliedCasterMask = tile.casterMask;
      }
    }
    this.casters = nowCasters;
    this.stats.casters = nowCasters.size;
    this.stats.casterScale = room?.scale ?? 1;
    if (
      room &&
      room.nextStale < Infinity &&
      (room.denied > 0 || room.scale > 1)
    ) {
      this.wakeForStale(Math.max(room.nextStale - now, COLD_WAKE_MIN_MS));
    }
    // Mixed-LOD placeholders: clipped to their holes (unioned over views)
    // in the views where finer content draws beside them.
    for (const tile of new Set([...this.placeholders, ...nowPlaceholders])) {
      if (
        tile.placement &&
        (tile.appliedPlaceholderMask !== tile.placeholderMask ||
          !sameTiles(tile.appliedHoles, tile.holes))
      ) {
        if (tile.clip) {
          this.world.freeClip(tile.clip);
          tile.clip = undefined;
        }
        if (tile.placeholderMask !== 0 && tile.holes) {
          tile.clip = this.world.allocateClip(
            [...tile.holes].map((hole) => clipBox(hole, tile.geometricError)),
          );
        }
        for (const draw of tile.placement.draws) {
          this.world.setPlaceholder(draw, tile.placeholderMask, tile.clip);
        }
        tile.appliedPlaceholderMask = tile.placeholderMask;
        tile.appliedHoles = tile.holes;
      }
    }
    this.placeholders = nowPlaceholders;
    this.standIns = nowStandIns;
    this.updateDebug();
    this.stats.placeholders = nowPlaceholders.size;

    // Queue time: since a still-unloaded tile was first wanted.
    for (const tile of requests.keys()) {
      if (tile.state === "unloaded" && !this.wanted.has(tile)) {
        this.wanted.set(tile, now);
      }
    }
    for (const tile of this.wanted.keys()) {
      if (!requests.has(tile)) {
        this.wanted.delete(tile);
      }
    }
    // Cancel requests no view has touched for a while (1.x cancels those
    // not touched this frame; a short grace absorbs jitter).
    for (const [tile, controller] of this.loading) {
      if (
        !controller.signal.aborted &&
        tile.touchedFrame < frame - CANCEL_AFTER_FRAMES
      ) {
        this.cancelLoad(tile, controller);
      }
    }
    this.serveQueries(frame, requests, purposes);
    this.request(requests, purposes);
    this.engine.requests.backlog(this.origin, this.ready.length);
    const window = this.engine.requests.stats(this.origin);
    if (window) {
      this.stats.maxInFlight = window.window;
      this.stats.adaptive = window.adaptive;
      if (window.protocol) {
        this.stats.protocol = window.protocol;
      }
    }
    this.buildExternals();
    this.upload();
    if (this.imagery) {
      // Imagery for the terrain tiles drawn in any view (placeholders too)
      // and those waiting for it to draw, nearest first.
      const wanted = new Map<Tile, number>();
      for (const tile of new Set([
        ...nowMasked,
        ...nowPlaceholders,
        ...waiting,
      ])) {
        let priority = Infinity;
        for (const view of views) {
          priority = Math.min(priority, tile.viewState(view.id).distance);
        }
        wanted.set(tile, priority);
      }
      // Then tiles still loading (not prefetch or height samples): their
      // imagery needs only their rectangle, so it loads alongside the
      // terrain as in 1.x. After it arrived, the first view's imagery came
      // 0.4 s after its terrain (Rainier, r38).
      for (const tile of this.loading.keys()) {
        if (
          tile.globe &&
          !wanted.has(tile) &&
          tile.purpose !== undefined &&
          tile.purpose !== "prefetch" &&
          tile.purpose !== "sample"
        ) {
          let priority = Infinity;
          for (const view of views) {
            priority = Math.min(priority, tile.viewState(view.id).distance);
          }
          wanted.set(tile, LOADING_IMAGERY + priority);
        }
      }
      this.imagery.update(wanted);
      this.lights?.update(wanted);
    }
    this.evict(frame);
    if (
      this.stats.requestsTotal +
        this.stats.bytesTotal +
        this.stats.loaded +
        this.world.version !==
      before
    ) {
      this.lastChange = frame;
    }
    if (
      this.settledAt === undefined &&
      this.firstContentAt !== undefined &&
      this.idle
    ) {
      this.settledAt = performance.now();
    }
    this.stats.casterBytes = this.casterResident;
    this.stats.coldBytes = Math.max(
      0,
      this.stats.bytes - this.viewBytes - this.casterResident,
    );
    this.stats.loading = this.inFlight + this.ready.length;
    this.stats.inFlight = this.inFlight;
    this.stats.uploadQueue = this.ready.length;
    this.revisionSeen = this.world.contentRevision;
  }

  /**
   * What shadow casters may use this tick, or undefined when none are
   * selected: the cache less what views use and less the cold tiles that may
   * yet come back (`COLD_AGE_MS`). Free room always counts, so does the room
   * of stale cold tiles, which eviction then takes.
   */
  private casterRoom(
    views: readonly SelectionView[],
    frame: number,
    now: number,
  ): (CasterRoom & { nextStale: number }) | undefined {
    // A tileset that has drawn nothing yet but content this engine can't draw
    // (point clouds today: `deferredReason`) has no casters to load.
    this.casting =
      this.policy.castsShadows === true &&
      views.some((view) => view.casterPlanes !== undefined) &&
      (this.stats.undrawn === 0 || this.stats.loaded > 0);
    if (!this.casting) {
      return undefined;
    }
    const heldSince = now - this.coldAgeMs;
    let held = 0;
    let nextStale = Infinity;
    for (const tile of this.loaded) {
      if (tile.castsOnly || tile.touchedFrame === frame) {
        continue;
      }
      // Just left the views, as far as a tick can tell.
      if (tile.touchedFrame === frame - 1) {
        tile.viewedAt = now;
      }
      if (tile.viewedAt > heldSince) {
        held += tile.bytes;
        nextStale = Math.min(nextStale, tile.viewedAt + this.coldAgeMs);
      }
    }
    const { fraction } = this.world.pressure();
    this.casterLoad = fraction <= CASTER_PRESSURE && !this.viewCapacityWait;
    return {
      bytes: Math.max(0, this.cacheBytes - this.viewBytes - held),
      load: this.casterLoad,
      estimate: this.casterBytesEstimate,
      pressure: fraction,
      heldSince,
      receivers: (view, selected) => {
        const lists: Array<readonly Tile[]> = [selected];
        for (const tileset of this.engine.tilesets) {
          if (
            tileset !== this &&
            tileset.world === this.world &&
            tileset.show
          ) {
            const tiles = tileset.lastSelected.get(view.id);
            if (tiles && tiles.length > 0) {
              if (tileset.anchor !== this.anchor) {
                return undefined;
              }
              lists.push(tiles);
            }
          }
        }
        return lists;
      },
      counted: new Set(),
      denied: 0,
      scale: 1,
      nextStale,
    };
  }

  /** One tick when the next cold tile goes stale: the loop may be asleep. */
  private wakeForStale(delayMs: number): void {
    this.casterTimer ??= setTimeout(() => {
      this.casterTimer = undefined;
      this.casterWake = true;
      this.engine.wake();
    }, delayMs);
  }

  private cancelLoad(tile: Tile, controller: AbortController): void {
    controller.abort();
    this.engine.requests.cancelled(tile.contentOrigin);
    this.stats.cancelled++;
    if (tile.purpose) {
      this.stats.purposes[tile.purpose].cancelled++;
    }
  }

  /**
   * A view's request found the origin's window, which tilesets share, full:
   * cancels one shadow caster in flight there, whose slot comes back for it.
   */
  private yieldToView(origin: string): void {
    for (const tileset of this.engine.tilesets) {
      for (const [tile, controller] of tileset.loading) {
        if (
          !controller.signal.aborted &&
          tile.contentOrigin === origin &&
          isCaster(tile)
        ) {
          tileset.cancelLoad(tile, controller);
          return;
        }
      }
    }
  }

  private request(
    requests: Map<Tile, number>,
    purposes: Map<Tile, RequestPurpose>,
  ): void {
    const order = [...requests.entries()].sort(
      (a, b) => a[1] - b[1] || a[0].depth - b[0].depth,
    );
    // A caster in flight that a view now wants is the view's from here on.
    for (const tile of requests.keys()) {
      const purpose = purposes.get(tile);
      if (tile.state === "loading" && isCaster(tile) && purpose !== "caster") {
        tile.purpose = purpose;
      }
    }
    const full = new Set<string>();
    // Prefetch after everything visible (`prefetchAfterVisible`).
    let visibleWaiting = false;
    if (this.policy.prefetchAfterVisible === true) {
      for (const tile of this.loading.keys()) {
        if (tile.purpose !== "prefetch" && tile.purpose !== "caster") {
          visibleWaiting = true;
          break;
        }
      }
    }
    for (const [tile] of order) {
      if (tile.state !== "unloaded") {
        continue;
      }
      // Shadow casters wait with prefetch: never ahead of what views draw.
      const purpose = purposes.get(tile) ?? "view";
      const prefetch = purpose === "prefetch" || purpose === "caster";
      if (prefetch && visibleWaiting) {
        continue;
      }
      const origin = tile.contentOrigin;
      if (full.has(origin)) {
        if (!prefetch) {
          this.yieldToView(origin);
        }
        visibleWaiting ||=
          !prefetch && this.policy.prefetchAfterVisible === true;
        continue;
      }
      this.useOrigin(origin);
      if (!this.engine.requests.tryAcquire(origin)) {
        full.add(origin);
        if (!prefetch) {
          this.yieldToView(origin);
        }
        visibleWaiting ||=
          !prefetch && this.policy.prefetchAfterVisible === true;
        continue;
      }
      tile.state = "loading";
      tile.fetchStartAt = performance.now();
      tile.wantedAt = this.wanted.get(tile) ?? tile.fetchStartAt;
      this.wanted.delete(tile);
      this.inFlight++;
      this.stats.requestsTotal++;
      tile.purpose = purpose;
      if (!prefetch) {
        visibleWaiting ||= this.policy.prefetchAfterVisible === true;
      }
      this.stats.purposes[purpose].requests++;
      this.events.emit("request", { url: tile.contentUrl!, purpose });
      const controller = new AbortController();
      this.loading.set(tile, controller);
      void this.loadContent(tile, controller.signal)
        .then((sample) => this.engine.requests.release(origin, sample))
        .finally(() => {
          this.inFlight--;
          this.loading.delete(tile);
          // Any completion is a change, also one without content to upload
          // (an external tileset's children need selecting, a failure needs
          // reporting): stay active for the next updates.
          this.changed();
        });
    }
  }

  private async loadContent(
    tile: Tile,
    signal: AbortSignal,
  ): Promise<RequestSample | undefined> {
    try {
      if (tile.external) {
        // Fetched and parsed here; its tile tree is built in update(),
        // within the frame's budget (several large files finishing at once
        // stalled frames).
        const json = await fetchTilesetJson(
          tile.contentUrl!,
          this.headers,
          signal,
        );
        if (!this.destroyed) {
          this.externals.push({ tile, json });
        }
        tile.purpose = undefined; // structure, never drawn itself
        return undefined;
      }
      const asset = this.source
        ? await this.source.loadTile(tile, signal)
        : await this.engine.loadGltf(tile.contentUrl!, {
            ...(this.headers ? { headers: this.headers } : {}),
            signal,
          });
      if (this.destroyed) {
        closeImages(asset);
        return undefined;
      }
      this.stats.bytesReceived += asset.timing?.bytes ?? 0;
      if (tile.purpose) {
        this.stats.purposes[tile.purpose].bytes += asset.timing?.bytes ?? 0;
      }
      this.ready.push({ tile, asset, arrivedAt: performance.now() });
      return asset.timing
        ? {
            bytes: asset.timing.bytes,
            ...(asset.timing.protocol
              ? { protocol: asset.timing.protocol }
              : {}),
          }
        : undefined;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        tile.state = "unloaded"; // cancelled: request again when needed
        return undefined;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (/unsupported tile format/.test(message)) {
        // Loaded but drawing nothing: selection and refinement behave as in
        // 1.x, which does decode these formats.
        tile.state = "ready";
        this.undrawnTile(`${message} (drawn empty)`);
        return undefined;
      }
      tile.state = "failed";
      this.undrawnTile(`content failed: ${message}`);
      return undefined;
    }
  }

  /** One more tile that draws nothing, and why (`TilesetStats.undrawn`). */
  undrawnTile(reason: string): void {
    this.stats.undrawn++;
    const kind = undrawnKind(reason);
    if (
      this.undrawnReasons.has(kind) ||
      this.undrawnReasons.size < MAX_UNDRAWN_REASONS
    ) {
      this.undrawnReasons.set(kind, (this.undrawnReasons.get(kind) ?? 0) + 1);
      this.warnings.add(kind);
    }
  }

  /**
   * Uploads decoded content within the per-frame cap, then adjusts the
   * screen-space error for memory as 1.x processTiles does: uploads stop
   * while the cache exceeds budget + overflow, the threshold rises ×1.02 per
   * frame while content is still waiting, and relaxes back below budget.
   */
  private upload(): void {
    const limit = this.cacheBytes + this.overflowBytes;
    let exceeded = false;
    const budget = this.engine.uploadBudget;
    // After a capacity failure that eviction couldn't relieve, wait before
    // retrying: each attempt creates (and rolls back) its textures.
    if (this.capacityWait > 0) {
      this.capacityWait--;
      exceeded = this.ready.length > 0;
    }
    for (
      let n = 0;
      n < this.uploadsPerFrame && this.ready.length > 0 && !exceeded;
      n++
    ) {
      // Casters don't hold back what views need: they leave first.
      if (this.stats.bytes - this.casterResident > limit) {
        exceeded = true;
        break;
      }
      // The engine-wide budget for this frame (one upload always goes).
      if (budget.uploads > 0 && budget.bytes <= 0) {
        break;
      }
      // Views' content first, in any tileset: the engine's budget is shared.
      const next = this.ready.findIndex((r) => !isCaster(r.tile));
      if (
        next < 0 &&
        this.engine.tilesets.some((t) => t.ready.some((r) => !isCaster(r.tile)))
      ) {
        break;
      }
      const { tile, asset, arrivedAt } = this.ready.splice(
        Math.max(next, 0),
        1,
      )[0]!;
      // A caster decoded while casters can't load, or that nothing wants
      // any more, is dropped, not uploaded. One over the byte budget isn't:
      // admission decided, and eviction makes the room.
      const caster = isCaster(tile);
      const pressure = caster ? this.world.pressure().fraction : 0;
      if (
        caster &&
        (!this.casterLoad ||
          pressure > CASTER_PRESSURE ||
          tile.touchedFrame < this.frame)
      ) {
        this.dropCaster(tile, asset);
        n--;
        continue;
      }
      asset.warnings.forEach((w) => this.warnings.add(w));
      // Before the upload, whose source data is released after placing.
      const summary = summarizeContent(asset);
      const uploadStart = performance.now();
      try {
        const placing = this.source?.modelOptions(tile);
        // The source kept until the placement succeeds: a capacity failure
        // anywhere leaves the asset whole for the retry.
        const model = this.engine.uploadModel(this.world, asset, {
          axes: placing?.axes ?? this.contentAxes,
          releaseSourceData: false,
        });
        let placement: ModelPlacement;
        try {
          const shader =
            this.options.customShader ?? this.options.style?.shader;
          placement = placeModel(model, {
            modelMatrix: placing?.modelMatrix ?? tile.transform,
            ...(placing?.underlay ? { underlay: true } : {}),
            parent: this.transform,
            viewMask: 0,
            collision: this.collision,
            ...(shader ? { shader } : {}),
          });
        } catch (error) {
          model.release();
          throw error;
        }
        model.releaseSourceData();
        // The placement holds the model: freed when the tile unloads.
        model.release();
        tile.placement = placement;
        for (const draw of placement.draws) {
          this.drawTiles.set(draw.index, {
            generation: draw.generation,
            tile,
          });
        }
        if (this.terrainRegions) {
          this.applyTerrainClip(tile);
        }
        tile.bytes =
          model.bytes +
          TILE_OVERHEAD_BYTES +
          placement.draws.length * DRAW_OVERHEAD_BYTES;
        if (this.retainGeometry) {
          tile.geometry = this.retain(asset, placement);
          // A mesh drawn by several nodes is kept, and counted, once.
          const arrays = new Set<Float32Array | Uint32Array>();
          for (const g of tile.geometry) {
            arrays.add(g.positions).add(g.indices);
          }
          for (const a of arrays) {
            tile.bytes += a.byteLength;
          }
        }
        tile.lastBytes = tile.bytes;
        if (caster) {
          this.noteCasterBytes(tile.bytes);
          // It stays while it may, and doesn't come back at this pressure.
          tile.noFitAt =
            this.world.pressure().fraction > CASTER_PRESSURE
              ? pressure
              : Infinity;
        } else {
          this.viewCapacityWait = false;
        }
        budget.bytes -= model.bytes;
        budget.uploads++;
        const uploaded = performance.now();
        const network = asset.timing?.networkMs ?? 0;
        const decode = asset.timing?.decodeMs ?? 0;
        this.recent.push({
          queued: tile.fetchStartAt - tile.wantedAt,
          network,
          worker: Math.max(0, arrivedAt - tile.fetchStartAt - network - decode),
          decode,
          uploadWait: uploadStart - arrivedAt,
          upload: uploaded - uploadStart,
        });
        if (this.recent.length > PIPELINE_WINDOW) {
          this.recent.shift();
        }
        const totals = this.recent
          .slice(-32)
          .map(
            (r) =>
              r.queued +
              r.network +
              r.worker +
              r.decode +
              r.uploadWait +
              r.upload,
          )
          .sort((a, b) => a - b);
        this.loadEstimateMs = totals[totals.length >> 1]!;
        tile.summary = summary;
        accumulate(this.resident, summary, 1);
        this.firstContentAt ??= uploaded;
        tile.copyright = asset.copyright;
        tile.appliedMask = 0;
        tile.state = "ready";
        this.loaded.add(tile);
        this.order.add(tile);
        this.markCastsOnly(tile, tile.purpose === "caster");
        for (let t = tile.parent; t; t = t.parent) {
          t.residentBelow++;
        }
        this.stats.loaded++;
        this.stats.bytes += tile.bytes;
        this.stats.bytesTotal += model.bytes;
      } catch (error) {
        if (isCapacityError(error) && caster) {
          // Casters yield: no wait, no eviction, nothing held in the queue,
          // and no second try until the pools have more room.
          tile.noFitAt = pressure;
          this.dropCaster(tile, asset);
          continue;
        }
        if (isCapacityError(error)) {
          // A pool is full, not the content bad (§13.15): the upload took
          // nothing, so the tile waits at the front of the queue while
          // eviction frees room and the error threshold rises, as for bytes.
          this.ready.unshift({ tile, asset, arrivedAt });
          this.viewCapacityWait = true;
          this.capacityFull = error.pool;
          this.capacityFailed = true;
          exceeded = true;
          break;
        }
        tile.state = "failed";
        this.viewCapacityWait &&= caster;
        this.undrawnTile(
          `upload failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      // Placed: the one point that announces it (a hook's own error is
      // not the upload's).
      if (tile.state === "ready" && tile.placement) {
        this.world.acceleration.tilePlaced(this, tile, tile.placement.draws);
      }
    }
    const selection = this.policy;
    if (this.stats.bytes - this.casterResident < this.cacheBytes) {
      selection.memoryAdjustedScreenSpaceError = Math.max(
        selection.memoryAdjustedScreenSpaceError / 1.02,
        selection.maximumScreenSpaceError,
      );
    } else if (exceeded) {
      selection.memoryAdjustedScreenSpaceError *= 1.02;
    }
    this.stats.screenSpaceError = selection.memoryAdjustedScreenSpaceError;
  }

  /**
   * Over the byte budget. Casters that don't cast this tick go first. Then
   * cold tiles, least recently touched first: as they would with casters off
   * while what views use and the cold tiles alone pass the budget, and
   * otherwise only those gone stale (`COLD_AGE_MS`), for casters that took
   * their room. A caster still casting goes when admission stops admitting it,
   * on the next tick, as what is left shrinks.
   */
  private evict(frame: number): void {
    // This frame's touches and loads, in the order eviction walks.
    this.order.seal(frame);
    // A world pool at capacity (an upload's CapacityError), or nearly so
    // (World.pressure), evicts as being over the byte budget does, until
    // uploads fit again.
    if (this.capacityFull === undefined) {
      const { fraction, pool } = this.world.pressure();
      if (fraction >= CAPACITY_PRESSURE) {
        this.capacityFull = pool;
      }
    }
    if (this.capacityFull !== undefined) {
      this.evictForCapacity(frame);
      return;
    }
    // Eviction starts at the budget; the overflow is for content in use.
    if (this.stats.bytes <= this.cacheBytes) {
      return;
    }
    // Spread over frames, as uploads are: after a camera jump everything
    // shown before becomes evictable at once, and freeing it all in one
    // frame (textures and buffers by the hundred) stalls that frame. Past
    // the hard limit (budget + overflow), whatever is needed goes now.
    let allowance = Math.max(
      2 * this.engine.uploadBytesPerFrame,
      this.stats.bytes - (this.cacheBytes + this.overflowBytes),
    );
    const evict = (tile: Tile): void => {
      allowance -= tile.bytes;
      this.unload(tile);
    };
    if (this.casterResident > 0) {
      for (const tile of this.order.coldest(frame)) {
        if (this.stats.bytes <= this.cacheBytes || allowance <= 0) {
          return;
        }
        if (tile.castsOnly && tile.casterMask === 0) {
          evict(tile);
        }
      }
    }
    const heldSince = performance.now() - this.coldAgeMs;
    for (const tile of this.order.coldest(frame)) {
      if (this.stats.bytes <= this.cacheBytes || allowance <= 0) {
        return;
      }
      if (tile.castsOnly) {
        continue;
      }
      if (
        this.stats.bytes - this.casterResident > this.cacheBytes ||
        (tile.casterMask === 0 && tile.viewedAt <= heldSince)
      ) {
        evict(tile);
      }
    }
  }

  /** Drops decoded content of a caster that isn't wanted after all. */
  private dropCaster(tile: Tile, asset: GltfAsset): void {
    closeImages(asset);
    tile.state = "unloaded";
    this.stats.purposes.caster.unused++;
    tile.purpose = undefined;
  }

  /** Counts a loaded tile in or out of the caster class (`castsOnly`). */
  private markCastsOnly(tile: Tile, value: boolean): void {
    if (tile.castsOnly !== value && tile.state === "ready") {
      tile.castsOnly = value;
      this.casterResident += value ? tile.bytes : -tile.bytes;
    }
  }

  /**
   * One more caster's bytes for `casterBytesEstimate`. The median of casters
   * alone: one huge tile, or a view's, doesn't keep small ones out, and a
   * wrong guess corrects itself when the tile loads.
   */
  private noteCasterBytes(bytes: number): void {
    const recent = this.recentCasterBytes;
    recent.push(bytes);
    if (recent.length > CASTER_BYTES_WINDOW) {
      recent.shift();
    }
    this.casterBytesEstimate = [...recent].sort((a, b) => a - b)[
      recent.length >> 1
    ]!;
  }

  /**
   * Frees room in a full world pool: the least recently touched tiles not
   * touched this frame, a few per frame (as for bytes, so a frame doesn't
   * stall on frees). The pool's warning is kept for the session's stats.
   */
  private evictForCapacity(frame: number): void {
    this.warnings.add(
      `capacity: world ${this.capacityFull} ${this.capacityFailed ? "full" : "nearly full"}, evicting`,
    );
    this.capacityFull = undefined;
    let count = 0;
    // Casters first, casting or not: they yield the pools.
    for (const castsOnly of [true, false]) {
      for (const tile of this.order.coldest(frame)) {
        if (count >= this.uploadsPerFrame) {
          break;
        }
        if (tile.castsOnly === castsOnly) {
          this.unload(tile);
          count++;
        }
      }
    }
    // After a failed upload with nothing to free here (everything is in
    // view, or another tileset holds the pool): retry in half a second,
    // while the error threshold rises. Pressure alone doesn't hold uploads.
    this.capacityWait = this.capacityFailed && count === 0 ? 30 : 0;
    this.capacityFailed = false;
  }

  /**
   * A placed asset's triangles for `Tile.geometry`: per draw (placing
   * keeps the asset's draw order), skipping lines and instanced draws.
   * Views into a larger buffer are copied so they don't keep it alive; draws
   * of one mesh share its arrays.
   */
  private retain(asset: GltfAsset, placement: ModelPlacement): TileGeometry[] {
    const kept: TileGeometry[] = [];
    if (asset.instances !== undefined) {
      return kept;
    }
    const meshes = new Map<
      number,
      { positions: Float32Array; indices: Uint32Array }
    >();
    asset.draws.forEach((d, i) => {
      const mesh = asset.meshes[d.mesh];
      const draw = placement.draws[i];
      const matrix = draw && this.world.drawMatrix(draw);
      if (
        mesh === undefined ||
        matrix === undefined ||
        d.instances !== undefined ||
        // A composite's i3dm, as a lone one above.
        (d.part !== undefined && asset.parts?.[d.part]?.instances) ||
        (mesh.topology ?? "triangle-list") !== "triangle-list"
      ) {
        return;
      }
      const own = <T extends Float32Array | Uint32Array>(a: T): T =>
        a.byteLength === a.buffer.byteLength ? a : (a.slice() as T);
      let arrays = meshes.get(d.mesh);
      if (arrays === undefined) {
        arrays = { positions: own(mesh.positions), indices: own(mesh.indices) };
        meshes.set(d.mesh, arrays);
      }
      kept.push({ draw: draw!, ...arrays, matrix });
    });
    return kept;
  }

  private unload(tile: Tile): void {
    if (tile.placement) {
      this.world.acceleration.tileUnloaded(this, tile);
    }
    this.source?.unloadTile?.(tile);
    if (tile.purpose) {
      this.stats.purposes[tile.purpose].unused++;
      tile.purpose = undefined;
    }
    if (tile.placement) {
      for (const draw of tile.placement.draws) {
        if (this.drawTiles.get(draw.index)?.tile === tile) {
          this.drawTiles.delete(draw.index);
        }
      }
      tile.placement.remove();
      tile.placement = undefined;
    }
    tile.geometry = undefined;
    this.markCastsOnly(tile, false);
    this.stats.bytes -= tile.bytes;
    this.stats.loaded--;
    if (tile.summary) {
      accumulate(this.resident, tile.summary, -1);
      tile.summary = undefined;
    }
    tile.bytes = 0;
    tile.state = "unloaded";
    tile.appliedMask = -1;
    tile.casterMask = tile.appliedCasterMask = 0;
    this.casters.delete(tile);
    tile.debugColor = undefined;
    tile.appliedPlaceholderMask = 0;
    tile.placeholderMask = 0;
    tile.standInMask = 0;
    this.standIns.delete(tile);
    tile.holes = tile.appliedHoles = undefined;
    if (tile.clip) {
      this.world.freeClip(tile.clip);
      tile.clip = undefined;
    }
    this.placeholders.delete(tile);
    this.order.remove(tile);
    if (this.loaded.delete(tile)) {
      for (let t = tile.parent; t; t = t.parent) {
        t.residentBelow--;
      }
    }
    this.masked.delete(tile);
  }

  /**
   * Data credits of the content currently selected in any view, and of the
   * imagery draped on it, most frequent first (as 1.x orders credits). Each
   * copyright string may list several credits separated by semicolons.
   */
  credits(): string[] {
    const counts = new Map<string, number>();
    const shown = new Set([...this.lastSelected.values()].flat());
    this.imagery?.credits(shown, counts);
    this.lights?.credits(shown, counts);
    for (const tiles of this.lastSelected.values()) {
      for (const tile of tiles) {
        for (const credit of (tile.copyright ?? "").split(";")) {
          const text = credit.trim();
          if (text) {
            counts.set(text, (counts.get(text) ?? 0) + 1);
          }
        }
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([text]) => text);
  }

  private originOf(url: string): string {
    try {
      return new URL(url, globalThis.location?.href).origin;
    } catch {
      return "";
    }
  }

  private useOrigin(origin: string): void {
    if (!this.origins.has(origin)) {
      this.origins.add(origin);
      this.engine.requests.register(origin, this.fixedWindow);
    }
  }

  /** True once `destroy` has run (1.x `isDestroyed`). */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Frees the regions' world slots; a globe has them (`Globe`).
   * @internal
   */
  protected releaseRegions(): void {
    for (const entry of [...(this.source?.clips?.entries ?? [])]) {
      this.source!.clips!.remove(entry.clip);
      if (entry.slot >= 0) {
        this.world.removeTerrainClipRegion(entry.slot);
      }
    }
  }

  /** Unloads all content. The tileset can't be used afterwards. */
  destroy(): void {
    clearTimeout(this.casterTimer);
    for (const controller of this.loading.values()) {
      controller.abort();
    }
    this.imagery?.destroy();
    this.imagery = undefined;
    this.lights?.destroy();
    this.lights = undefined;
    for (const origin of this.origins) {
      this.engine.requests.unregister(origin);
    }
    this.origins.clear();
    for (const tile of [...this.loaded]) {
      this.unload(tile);
    }
    for (const { asset } of this.ready) {
      closeImages(asset);
    }
    this.ready.length = 0;
    this.boundingVolumes?.clear();
    this.contentVolumes?.clear();
    this.releaseRegions();
    // Every tile is unloaded: no draw uses a blended twin now.
    for (const twin of this.blendedTwins.values()) {
      this.world.removeMaterial(twin);
    }
    this.blendedTwins.clear();
    this.ownMaterials.clear();
    this.world.removeTransform(this.transform);
    this.destroyed = true;
  }
}

function retarget(tile: Tile, tree: TileTree): void {
  tile.tileset = tree;
  for (const child of tile.children) {
    retarget(child, tree);
  }
}

/** The source's own policy (terrain's globe Stepwise), else 3D Tiles'. */
function createSelection(
  options: TilesetOptions,
  source: TileSource | undefined,
): TileSelection {
  return (
    source?.createSelection?.(options) ??
    (options.policy === "stepwise"
      ? new StepwiseSelection(options)
      : new BudgetedSelection(options))
  );
}

function countTiles(tile: Tile): number {
  return 1 + tile.children.reduce((n, c) => n + countTiles(c), 0);
}

function closeImages(asset: GltfAsset): void {
  for (const image of asset.images) {
    if (image instanceof ImageBitmap) {
      image.close();
    }
  }
}

function sameTiles(a?: Set<Tile>, b?: Set<Tile>): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b || a.size !== b.size) {
    return false;
  }
  for (const t of a) {
    if (!b.has(t)) {
      return false;
    }
  }
  return true;
}

/**
 * A hole's bounding box as a clip box, grown vertically by `margin`: the
 * placeholder's geometric error bounds how far its surface may lie above or
 * below the finer content's box. Sideways it stays tight, so it doesn't
 * spill over finer neighbors.
 */
function clipBox(tile: Tile, margin: number): ClipBox {
  const box = volumeObb(tile.volume);
  const sphere = tile.volume.sphere;
  const center = box ? box.center : sphere.center;
  const h = box
    ? box.halfAxes
    : Float64Array.of(
        sphere.radius,
        0,
        0,
        0,
        sphere.radius,
        0,
        0,
        0,
        sphere.radius,
      );
  const up = [center[0]!, center[1]!, center[2]!];
  const upLength = Math.hypot(up[0]!, up[1]!, up[2]!) || 1;
  const axes = [0, 3, 6].map((o) => [h[o]!, h[o + 1]!, h[o + 2]!]);
  const rows = new Float64Array(9);
  axes.forEach((a, i) => {
    let length = Math.hypot(a[0]!, a[1]!, a[2]!);
    let u = a;
    if (length < 1e-9) {
      // Flat box: the normal of the other two axes.
      const [p, q] = axes.filter((_, j) => j !== i) as [number[], number[]];
      u = [
        p[1]! * q[2]! - p[2]! * q[1]!,
        p[2]! * q[0]! - p[0]! * q[2]!,
        p[0]! * q[1]! - p[1]! * q[0]!,
      ];
      length = 0;
    }
    const ul = Math.hypot(u[0]!, u[1]!, u[2]!) || 1;
    const dir = u.map((x) => x / ul);
    const vertical = Math.abs(
      (dir[0]! * up[0]! + dir[1]! * up[1]! + dir[2]! * up[2]!) / upLength,
    );
    const grown = length + margin * vertical + 1e-3 * length + 0.01;
    for (let k = 0; k < 3; k++) {
      rows[i * 3 + k] = dir[k]! / grown;
    }
  });
  return { center, rows };
}

function isIdentity(m: Mat4): boolean {
  for (let i = 0; i < 16; i++) {
    if (m[i] !== (i % 5 === 0 ? 1 : 0)) {
      return false;
    }
  }
  return true;
}

/** Whether a ray segment passes through a sphere. */
function crossesSphere(
  ray: CastRay,
  sphere: { center: ArrayLike<number>; radius: number },
): boolean {
  const dx = sphere.center[0]! - ray.origin[0]!;
  const dy = sphere.center[1]! - ray.origin[1]!;
  const dz = sphere.center[2]! - ray.origin[2]!;
  const along =
    dx * ray.direction[0]! + dy * ray.direction[1]! + dz * ray.direction[2]!;
  const r = sphere.radius;
  if (along < -r || along > ray.maxDistance + r) {
    return false;
  }
  return dx * dx + dy * dy + dz * dz - along * along <= r * r;
}
