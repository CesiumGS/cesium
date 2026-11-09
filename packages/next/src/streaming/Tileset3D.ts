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
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Rectangle } from "../globe/quantizedMesh.ts";
import type { TerrainRayTarget } from "../globe/terrainRay.ts";
import { rectanglesOverlap } from "../globe/terrainClip.ts";
import {
  StepwiseSelection,
  REQUEST_PURPOSES,
  type RequestPurpose,
  type SelectionView,
  type TileSelection,
} from "./Stepwise.ts";
import { Emitter } from "../core/Emitter.ts";
import { isCapacityError } from "../scene/CapacityError.ts";
import { BudgetedSelection } from "./Budgeted.ts";
import {
  fetchTilesetJson,
  loadTilesetJson,
  treeFromJson,
  type Tile,
  type TileGeometry,
  type TileJson,
  type TileTree,
} from "./Tile.ts";
import { transformVolume, volumeObb } from "./volumes.ts";
import { DebugVolumes, type DebugColor } from "./debugVolumes.ts";
import * as m4 from "../math/mat4.ts";
import type { DesignPlacement } from "./designPlacement.ts";
import {
  SceneItem,
  checkItemOptions,
  type SceneItemHost,
  type SceneItemOptions,
} from "../scene/SceneItem.ts";
import type { Attribution } from "../io/ion.ts";
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
import type {
  PurposeStats,
  TilesetEvents,
  TilesetOptions,
  TilesetStats,
  TileSource,
} from "./tilesetTypes.ts";
import { readDualPosition, type DualDeclaration } from "./dualPosition.ts";
import { applyDebugColor, updateDebug } from "./tilesetDebug.ts";
import { serveQueries } from "./tilesetQueries.ts";
import { evict, evictForCapacity, unload } from "./tilesetEviction.ts";
import {
  COLD_AGE_MS,
  isCaster,
  COLD_AGE_MAX_MS,
  casterRoom,
  wakeForStale,
  COLD_WAKE_MIN_MS,
  closeImages,
  CASTER_PRESSURE,
  dropCaster,
  noteCasterBytes,
  markCastsOnly,
} from "./tilesetCasters.ts";
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
/** `Tileset3D.extensions` of a tileset.json without any (and of terrain). */
const NO_EXTENSIONS: Readonly<Record<string, unknown>> = Object.freeze({});
/** `Tileset3D.rootJson` of a tileset.json without a root (and of terrain). */
const NO_ROOT_JSON: Tileset3D["rootJson"] = Object.freeze({});

const NO_ITEMS: readonly SceneItem[] = Object.freeze([]);

function emptyPurposes(): Record<RequestPurpose, PurposeStats> {
  return Object.fromEntries(
    REQUEST_PURPOSES.map((p) => [
      p,
      { requests: 0, bytes: 0, drawn: 0, unused: 0, cancelled: 0 },
    ]),
  ) as Record<RequestPurpose, PurposeStats>;
}

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
  /** @internal */
  policy: TileSelection;
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
    if (this.source) {
      const visit = (tile: Tile) => {
        for (const draw of tile.placement?.draws ?? []) {
          this.world.setCollision(draw, value);
        }
        tile.children.forEach(visit);
      };
      visit(this.root);
      return;
    }
    this.surfaceChanged();
  }
  private collision = false;

  /**
   * Collision and ground follow what is in the scene: on each tile, the first
   * opaque item (in the order added) that is drawn and not refused stands
   * for the tileset, at its own placement; with none, the first translucent
   * one does. Its draws are ground and take `enableCollision`; every other
   * item's draws, and the tile's own draws when no item holds them, are
   * neither. A globe's surface is no item and keeps its own.
   */
  private applySurface(tile: Tile): void {
    if (this.source) {
      return;
    }
    let chosen: SceneItem | undefined;
    let best = 0;
    for (const item of this.itemList) {
      const rank = item.surfaceRank(tile);
      if (rank > best) {
        chosen = item;
        best = rank;
      }
    }
    for (const item of this.itemList) {
      item.setSurface(tile, item === chosen, this.collision);
    }
    if (this.baseItem === undefined) {
      for (const draw of tile.placement?.draws ?? []) {
        this.world.setGround(draw, false);
        this.world.setCollision(draw, false);
      }
    }
  }

  /** @internal The item that stands for the surface may have changed. */
  surfaceChanged(): void {
    for (const tile of this.loaded) {
      if (tile.placement) {
        this.applySurface(tile);
      }
    }
  }

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
    if (this.world_ !== undefined) {
      this.world_.setTransform(this.transform, delta);
    }
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
    if (changed) {
      this.secondPlacement = undefined;
    }
  }
  /**
   * What the content requires on screen (`TilesetOptions.attributions`). A
   * viewer credits them while an item of this tileset is in its world.
   */
  readonly attributions: readonly Attribution[];
  /** Load-time `modelMatrix`, built into tile transforms and volumes. */
  private readonly loadMatrix: Mat4;
  /** `modelMatrix` × loadMatrix⁻¹: the content root transform. */
  private delta: Mat4 = m4.mat4();
  /** Parent transform of all content: moves it with one write. */
  private transform!: TransformHandle;
  /**
   * The anchor its content hangs under (`TilesetOptions.anchor`; default
   * the Earth's): what its tiles' transforms and volumes are relative to.
   * Reading it before the tileset has a world (`World.add`) throws.
   */
  get anchor(): AnchorHandle {
    if (this.anchor_ === undefined) {
      throw new Error(
        "Tileset3D.anchor: the tileset has no world yet; add it with world.add first.",
      );
    }
    return this.anchor_;
  }
  private anchor_: AnchorHandle | undefined;

  /**
   * The world it draws in: the first it is added to (`World.add`), or the one
   * it was loaded for. Reading it before then throws.
   */
  get world(): World {
    if (this.world_ === undefined) {
      throw new Error(
        "This tileset isn't in a world yet: world.add(tileset) draws it there.",
      );
    }
    return this.world_;
  }
  private world_: World | undefined;

  private moveVolumes(tile: Tile, change: Mat4): void {
    tile.volume = transformVolume(tile.ownVolume, change);
    if (tile.ownContentVolume) {
      tile.contentVolume = transformVolume(tile.ownContentVolume, change);
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
  /** @internal */
  readonly queries: Array<{
    rays: readonly CastRay[];
    resolve: (result: { draws: DrawHandle[]; release(): void }) => void;
    reject: (error: Error) => void;
    pinned: Tile[];
    done?: boolean;
  }> = [];

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
        applyDebugColor(this, tile);
      }
      this.changed();
    }
  }
  /** @internal */
  colorize = false;
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
    updateDebug(this);
    this.changed();
  }
  /** @internal */
  tileColor?: (tile: Tile) => DebugColor | undefined;
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
      updateDebug(this);
      this.changed();
    }
  }
  /** @internal */
  boundingVolumes?: DebugVolumes;
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
      updateDebug(this);
      this.changed();
    }
  }
  /** @internal */
  contentVolumes?: DebugVolumes;
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
  /** @internal A non-3D-Tiles source, when streaming one (`Globe.create`). */
  source?: TileSource;
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
  /** @internal */
  readonly cacheBytes: number;
  /** @internal The world pool an upload last found full (`CapacityError.pool`). */
  capacityFull?: string;
  /** @internal Frames to wait before retrying uploads after a capacity failure. */
  capacityWait = 0;
  /** @internal `capacityFull` came from a failed upload, not only from pressure. */
  capacityFailed = false;
  /** @internal */
  readonly overflowBytes: number;
  private readonly fixedWindow?: number;
  /** The root's origin, and every origin this tileset requested from. */
  private readonly origin: string;
  private readonly origins = new Set<string>();
  private readonly loading = new Map<Tile, AbortController>();
  /** @internal */
  readonly uploadsPerFrame: number;
  private readonly headers?: Record<string, string>;
  /** @internal */
  readonly loaded = new Set<Tile>();
  /** @internal The loaded tiles, least recently touched first (what eviction walks). */
  readonly order = new TouchOrder<Tile>();
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
  /** @internal */
  masked = new Set<Tile>();
  /** @internal Tiles with a caster mask (`CasterSelection.casters`). */
  casters = new Set<Tile>();
  /** @internal Bytes of what views used in the last update. */
  viewBytes = 0;
  /** @internal How long a cold tile may yet come back, ms (`COLD_AGE_MS`). */
  coldAgeMs = COLD_AGE_MS;
  /** @internal The last update selected shadow casters. */
  casting = false;
  /** `World.contentRevision` after the last update. */
  private revisionSeen = 0;
  /** @internal The timer that wakes the loop for cold tiles going stale. */
  casterTimer: ReturnType<typeof setTimeout> | undefined;
  /** @internal That timer fired, and the next update is due. */
  casterWake = false;
  /** @internal Bytes of recent casters (`CASTER_BYTES_WINDOW`), and their median. */
  readonly recentCasterBytes: number[] = [];
  /** @internal */
  casterBytesEstimate = 0;
  /** @internal Whether casters may load this tick (`CasterRoom.load`). */
  casterLoad = true;
  /** @internal A view's tile found a pool full: casters wait until it has uploaded. */
  viewCapacityWait = false;
  /** @internal Bytes of loaded tiles that are `castsOnly`, drawn by cascades or not. */
  casterResident = 0;
  /** @internal */
  placeholders = new Set<Tile>();
  /** @internal Tiles drawn whole while finer content loads, in some view. */
  standIns = new Set<Tile>();
  private inFlight = 0;
  private destroyed = false;

  protected constructor(
    /** @internal */ readonly engine: Engine,
    world: World | undefined,
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
    if (world !== undefined) {
      this.bindWorld(world);
    }
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
    this.attributions = Object.freeze([...(options.attributions ?? [])]);
    this.dualPosition_ = readDualPosition(this.extensions, (message) =>
      this.warnings.add(message),
    );
    if (options.placement !== undefined) {
      this.placement = options.placement;
    }
    const now = {
      world: () => this.world,
      dualPosition: () => this.dualPosition_,
      designPlacement: () => this.placement,
      secondPlacement: () => this.secondPlacement,
      loadedTiles: () => this.loaded,
      baseItem: () => this.baseItem,
    };
    this.itemHost = {
      tileset: this,
      get world() {
        return now.world();
      },
      get dualPosition() {
        return now.dualPosition();
      },
      get designPlacement() {
        return now.designPlacement();
      },
      get secondPlacement() {
        return now.secondPlacement();
      },
      contentShader: options.customShader ?? options.style?.shader,
      get loadedTiles() {
        return now.loadedTiles();
      },
      get baseItem() {
        return now.baseItem();
      },
      noteDraw: (tile, draw, item, source) => {
        this.drawTiles.set(draw.index, {
          generation: draw.generation,
          tile,
          item,
          source,
        });
      },
      forgetDraw: (draw, tile) => {
        if (this.drawTiles.get(draw.index)?.tile === tile) {
          this.drawTiles.delete(draw.index);
        }
      },
      tileBytes: (tile, delta) => {
        tile.bytes += delta;
        this.stats.bytes += delta;
        if (tile.castsOnly) {
          this.casterResident += delta;
        }
      },
      changed: () => this.changed(),
      warn: (message) => {
        this.warnings.add(message);
      },
      surfaceChanged: () => this.surfaceChanged(),
      removed: (item) => {
        const at = this.itemList.indexOf(item);
        if (at >= 0) {
          this.itemList.splice(at, 1);
        }
        if (this.baseItem === item) {
          this.baseItem = undefined;
          item.holdsBase = false;
        }
        this.world.itemRemoved(item);
      },
    };
    // A globe's surface isn't an item: its tiles draw as they load, always.
    if (source) {
      this.baseItem = new SceneItem(this.itemHost, {}, true);
      this.itemList.push(this.baseItem);
    }
  }

  /** The world it draws in, from here on (`World.add`). */
  private bindWorld(world: World): void {
    this.world_ = world;
    this.anchor_ = contentAnchor(world, this.options.anchor, "Tileset3D");
    this.transform = world.addTransform(this.delta, this.anchor);
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

  /** @internal Which of its items drew `draw`, while the tile is loaded. */
  itemOfDraw(draw: DrawHandle): SceneItem | undefined {
    const entry = this.drawTiles.get(draw.index);
    return entry?.generation === draw.generation
      ? (entry.item ?? this.baseItem)
      : undefined;
  }

  /**
   * @internal The tile's own draw that `draw` draws again (itself for the
   * tile's own): what a tile's retained geometry is listed under.
   */
  sourceOfDraw(draw: DrawHandle): DrawHandle | undefined {
    const entry = this.drawTiles.get(draw.index);
    return entry?.generation === draw.generation
      ? (entry.source ?? draw)
      : undefined;
  }

  /** @internal Loaded tiles by draw slot: kept with placing and unloading content. */
  readonly drawTiles = new Map<
    number,
    {
      readonly generation: number;
      readonly tile: Tile;
      /** Another item's draw of the tile, and the tile's own draw. */
      readonly item?: SceneItem;
      readonly source?: DrawHandle;
    }
  >();

  /**
   * The items drawing this tileset (`World.add`), in the order added. The one
   * `Engine.addTileset` adds is `items[0]`. Empty: it selects nothing and does
   * no work per tick, and its loaded tiles stay cached until normal eviction.
   * A globe's surface isn't an item, so a globe's is empty.
   */
  get items(): readonly SceneItem[] {
    return this.source ? NO_ITEMS : this.itemList;
  }

  /** @internal `World.add`. */
  addItem(world: World, options: SceneItemOptions): SceneItem {
    if (this.destroyed) {
      throw new Error("World.add: the tileset was destroyed.");
    }
    if (this.source) {
      throw new Error(
        "World.add: a globe's surface isn't an item; it stays as it is.",
      );
    }
    if (this.world_ !== undefined && this.world_ !== world) {
      throw new Error(
        "World.add: this tileset belongs to another world. A tileset belongs to one world: load it again for this one.",
      );
    }
    checkItemOptions(options, this.dualPosition_ !== undefined);
    if (this.world_ === undefined) {
      this.bindWorld(world);
      this.engine.adoptTileset(this);
    }
    const item = new SceneItem(
      this.itemHost,
      options,
      this.baseItem === undefined,
    );
    const placed: Tile[] = [];
    try {
      for (const tile of this.loaded) {
        if (tile.placement) {
          item.place(tile, tile.placement);
          placed.push(tile);
        }
      }
    } catch (error) {
      // A tile whose draws half-made are in `loaded` too: free every one.
      item.discard(this.loaded);
      throw error;
    }
    for (const tile of placed) {
      const bytes = item.bytes(tile);
      tile.bytes += bytes;
      this.stats.bytes += bytes;
      if (tile.castsOnly) {
        this.casterResident += bytes;
      }
    }
    if (item.holdsBase) {
      this.baseItem = item;
      // The tile's own draws, hidden when the last base item left: a tile that
      // stays selected has masks that don't change, so `update` won't write
      // them. A plain item's `place` writes nothing, so it happens here.
      for (const tile of placed) {
        item.applyViewMask(tile);
        item.applyCasterMask(tile);
      }
    }
    this.itemList.push(item);
    this.surfaceChanged();
    this.changed();
    return item;
  }

  /**
   * @internal The tiles' second position, read at load from the tileset's
   * `CESIUM_dual_position` extension (`DUAL_POSITION_EXTENSION`): each mesh's
   * named attribute (3 components, model space) and `maxDistance`, how far any
   * vertex is from it, in model units. All tiles' bounds grow by that much, so
   * a tile drawn away from where it was written is still selected. A tile whose
   * mesh lacks the attribute isn't drawn by an item that moves it, and the
   * tileset warns. While a tileset has one, tiles swap whole
   * (`BudgetedOptions.mixedLod`). An item chooses between the positions by its
   * `placement`.
   */
  get dualPosition(): DualDeclaration | undefined {
    return this.dualPosition_;
  }
  private readonly dualPosition_: DualDeclaration | undefined;

  /**
   * @internal Where the second position's points are drawn, for picks and
   * snaps on an item at placement 1, as `placement` is for the positions at
   * placement 0. `georeferenceTileset` sets it for a tileset with a second
   * position. Without one, a hit at placement 1 has no content coordinates.
   * Changing `modelMatrix` drops it.
   */
  secondPlacement?: DesignPlacement;

  /** @internal How far items can move a vertex (`TileTree.volumePad`). */
  volumePad = 0;
  /** @internal The views some item draws the tile in (`TileTree.shownViews`). */
  shownViews(tile: Tile): number {
    let views = 0;
    for (const item of this.itemList) {
      views |= item.shownIn(tile);
    }
    return views >>> 0;
  }
  /** @internal An item moves vertices (`TileTree.movesVertices`). */
  movesVertices = false;
  /** What an item needs of this tileset. */
  private readonly itemHost: SceneItemHost;
  /** @internal The item drawing the tiles' own draws, if any. */
  baseItem: SceneItem | undefined;
  /** @internal */
  readonly itemList: SceneItem[] = [];

  /**
   * Bounds cover what every item draws, and a placement that moves vertices
   * swaps tiles whole: both follow the items' placements and parameters, read
   * here, before selection.
   */
  private updateVolumePad(): void {
    let pad = 0;
    let moves = false;
    for (const item of this.itemList) {
      pad = Math.max(pad, item.reach);
      moves ||= item.moves;
    }
    this.volumePad = pad;
    this.movesVertices = moves;
  }

  static async load(
    engine: Engine,
    world: World | undefined,
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
    if (world !== undefined) {
      world.add(tileset);
    }
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
    if (this.externals.some((e) => !isCaster(e.tile))) {
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

  /** @internal External tileset JSON waiting for its tile tree to be built. */
  readonly externals: Array<{ tile: Tile; json: TileJson }> = [];

  /** Builds waiting external tilesets' trees within the frame's budget. */
  private buildExternals(): void {
    const budget = this.engine.uploadBudget;
    while (this.externals.length > 0) {
      if (budget.trees > 0 && budget.ms <= 0) {
        break;
      }
      // What views wait for first, as for uploads.
      const next = this.externals.findIndex((e) => !isCaster(e.tile));
      const { tile, json } = this.externals.splice(Math.max(next, 0), 1)[0]!;
      tile.purpose = undefined; // structure, never drawn itself
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
      updateDebug(this);
      return;
    }
    const frame = ++this.frame;
    this.updateVolumePad();
    // Hidden, or no item draws it in a view: that view selects nothing (drawn
    // tiles leave it), and it asks for no ticks of its own.
    // Only the views some item can draw in (`SceneItem.viewMask`): a view no
    // item shows would otherwise fetch tiles that are never drawn, and its
    // bytes could evict tiles the shown views need.
    let wanted = 0;
    for (const item of this.itemList) {
      wanted |= item.views;
    }
    const views = this.show
      ? allViews.filter((view) => ((wanted >>> view.id) & 1) !== 0)
      : [];
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
    // A view that left has no selection: other tilesets' casters look for
    // their receivers in this list, and credits read it.
    for (const id of this.lastSelected.keys()) {
      if (!views.some((view) => view.id === id)) {
        this.lastSelected.delete(id);
        this.stats.selected.delete(id);
      }
    }
    this.viewBytes = viewBytes;
    // Shadow casters, now that the bytes views use are known: only for the
    // views some item can cast in. Elsewhere a caster would be fetched and
    // counted, and its records would cast nothing.
    let castingIn = 0;
    for (const item of this.itemList) {
      castingIn |= item.castViews;
    }
    const casterViews = views.filter(
      (view) => ((castingIn >>> view.id) & 1) !== 0,
    );
    const room = casterRoom(this, casterViews, frame, now);
    if (room) {
      for (const view of casterViews) {
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
      applyDebugColor(this, tile);
      if (tile.placement && tile.appliedMask !== tile.viewMask) {
        if (tile.viewMask !== 0 && tile.purpose) {
          this.stats.purposes[tile.purpose].drawn++;
          tile.purpose = undefined;
        }
        tile.appliedMask = tile.viewMask;
        for (const item of this.itemList) {
          item.applyViewMask(tile);
        }
      }
    }
    this.masked = nowMasked;
    // Off-screen casters: as for view masks, and the tint's callback sees
    // them too (it may hide a tile, and a hidden draw doesn't cast).
    for (const tile of new Set([...this.casters, ...nowCasters])) {
      applyDebugColor(this, tile);
      if (tile.placement && tile.appliedCasterMask !== tile.casterMask) {
        if (tile.casterMask !== 0 && tile.purpose === "caster") {
          this.stats.purposes.caster.drawn++;
          tile.purpose = undefined;
        }
        tile.appliedCasterMask = tile.casterMask;
        for (const item of this.itemList) {
          item.applyCasterMask(tile);
        }
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
      wakeForStale(this, Math.max(room.nextStale - now, COLD_WAKE_MIN_MS));
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
        for (const item of this.itemList) {
          item.applyPlaceholder(tile);
        }
        tile.appliedPlaceholderMask = tile.placeholderMask;
        tile.appliedHoles = tile.holes;
      }
    }
    this.placeholders = nowPlaceholders;
    this.standIns = nowStandIns;
    updateDebug(this);
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
    serveQueries(this, frame, requests, purposes);
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
    // Casters wait as well for what a view has here and hasn't placed: its
    // next requests are a tick away, and a gap isn't the end of them.
    const casterWaiting =
      this.ready.some((r) => !isCaster(r.tile)) ||
      this.externals.some((e) => !isCaster(e.tile));
    for (const [tile] of order) {
      if (tile.state !== "unloaded") {
        continue;
      }
      // Shadow casters wait with prefetch: never ahead of what views draw.
      const purpose = purposes.get(tile) ?? "view";
      const prefetch = purpose === "prefetch" || purpose === "caster";
      if (
        prefetch &&
        (visibleWaiting || (casterWaiting && purpose === "caster"))
      ) {
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
        dropCaster(this, tile, asset);
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
        let placement: ModelPlacement | undefined;
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
          for (const item of this.itemList) {
            item.place(tile, placement);
          }
        } catch (error) {
          for (const item of this.itemList) {
            item.unplace(tile);
          }
          placement?.remove();
          model.release();
          throw error;
        }
        model.releaseSourceData();
        // The placement holds the model: freed when the tile unloads.
        model.release();
        tile.placement = placement;
        this.applySurface(tile);
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
        for (const item of this.itemList) {
          tile.bytes += item.bytes(tile);
        }
        if (this.retainGeometry) {
          tile.geometry = this.retain(asset, placement);
          // A mesh drawn by several nodes is kept, and counted, once.
          const arrays = new Set<Float32Array | Uint32Array>();
          for (const g of tile.geometry) {
            arrays.add(g.positions).add(g.indices);
            for (const a of Object.values(g.attributes ?? {})) {
              arrays.add(a);
            }
          }
          for (const a of arrays) {
            tile.bytes += a.byteLength;
          }
        }
        tile.lastBytes = tile.bytes;
        if (caster) {
          noteCasterBytes(this, tile.bytes);
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
          dropCaster(this, tile, asset);
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
    evict(this, frame);
  }

  /** @internal Counts a loaded tile in or out of the caster class (`castsOnly`). */
  markCastsOnly(tile: Tile, value: boolean): void {
    markCastsOnly(this, tile, value);
  }

  /**
   * @internal Frees room in a full world pool: the least recently touched tiles not
   * touched this frame, a few per frame (as for bytes, so a frame doesn't
   * stall on frees). The pool's warning is kept for the session's stats.
   */
  evictForCapacity(frame: number): void {
    evictForCapacity(this, frame);
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
      {
        positions: Float32Array;
        indices: Uint32Array;
        attributes?: Record<string, Float32Array>;
      }
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
        // Second positions, for a dual position (`TileGeometry`).
        for (const [name, a] of Object.entries(mesh.attributes ?? {})) {
          if (a.components === 3 && a.data instanceof Float32Array) {
            (arrays.attributes ??= {})[name] = own(a.data);
          }
        }
        meshes.set(d.mesh, arrays);
      }
      kept.push({ draw: draw!, ...arrays, matrix });
    });
    return kept;
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
      unload(this, tile);
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
    for (const item of this.itemList) {
      item.destroyed();
      this.world_?.itemRemoved(item);
    }
    this.world_?.removeTransform(this.transform);
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
  const box = volumeObb(tile.ownVolume);
  const sphere = tile.ownVolume.sphere;
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
