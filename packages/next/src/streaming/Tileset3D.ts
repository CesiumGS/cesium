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
import type { World } from "../scene/World.ts";
import type {
  AnchorHandle,
  CastRay,
  DrawHandle,
} from "../scene/world/types.ts";
import type { ModelResourceOptions } from "../scene/gltfModel.ts";
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
import { BudgetedSelection } from "./Budgeted.ts";
import {
  loadTilesetJson,
  type Tile,
  type TileJson,
  type TileTree,
} from "./Tile.ts";
import { transformVolume } from "./volumes.ts";
import { DebugVolumes, type DebugColor } from "./debugVolumes.ts";
import * as m4 from "../math/mat4.ts";
import type { Georeference } from "../georeference/georeference.ts";
import {
  SceneItem,
  checkItemOptions,
  type SceneItemHost,
  type SceneItemOptions,
} from "../scene/SceneItem.ts";
import type { Attribution } from "../io/ion.ts";
import type { GlobeImagery } from "../globe/GlobeImagery.ts";
import {
  emptyTotals,
  stageStats,
  type ContentTotals,
  type Stage,
  type StageStats,
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
import { evict, evictForCapacity, unload } from "./tilesetEviction.ts";
import { isCaster, closeImages, markCastsOnly } from "./tilesetCasters.ts";
import { applySurface, applyTerrainClip } from "./tilesetUpload.ts";
import { undrawnTile } from "./tilesetLoad.ts";
import { countTiles, update } from "./tilesetUpdate.ts";
import { TilesetState } from "./tilesetState.ts";
const DEGREES_TO_RADIANS = Math.PI / 180;
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
/** `TilesetState.rootJson` of a tileset.json without a root (and of terrain). */
const NO_ROOT_JSON: TilesetState["rootJson"] = Object.freeze({});

const NO_ITEMS: readonly SceneItem[] = Object.freeze([]);

function emptyPurposes(): Record<RequestPurpose, PurposeStats> {
  return Object.fromEntries(
    REQUEST_PURPOSES.map((p) => [
      p,
      { requests: 0, bytes: 0, drawn: 0, unused: 0, cancelled: 0 },
    ]),
  ) as Record<RequestPurpose, PurposeStats>;
}

export class Tileset3D implements TileTree {
  /** @internal What the streaming functions share (`tilesetUpdate.ts` and its neighbours). */
  readonly state: TilesetState = new TilesetState();
  /** @internal How far items can move a vertex (`TileTree.volumePad`). */
  volumePad = 0;
  /** @internal An item moves vertices (`TileTree.movesVertices`). */
  movesVertices = false;
  /** @internal */
  readonly imageryReady = (tile: Tile) =>
    !this.imageryPending && (this.imagery?.hasImagery(tile) ?? true);
  /** @internal */
  readonly imageryRefines = (tile: Tile) =>
    this.imagery?.refines(tile) ?? false;

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
   * Where the tileset's design coordinates are drawn, and the way back
   * (`Georeference`): set by the proj entry's `georeferenceTileset` from
   * the declaration, or by the application (`TilesetOptions.placement`).
   * Without one, picks on
   * it have no design coordinates. Unrelated to `Tile.placement`, which is a
   * tile's loaded content in the world (a `ModelPlacement`). Changing
   * `modelMatrix` drops it, with a warning: it would no longer describe what
   * is drawn.
   */
  placement?: Georeference;
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
    if (this.watchedPolicy?.policy !== this.state.policy) {
      this.watchedPolicy = {
        policy: this.state.policy,
        proxy: new Proxy(this.state.policy, {
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
  private watchedPolicy?: { policy: TileSelection; proxy: TileSelection };
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
    return this.state.collision;
  }
  set enableCollision(value: boolean) {
    if (value === this.state.collision) {
      return;
    }
    this.state.collision = value;
    this.changed();
    if (this.state.source) {
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

  /** @internal The item that stands for the surface may have changed. */
  surfaceChanged(): void {
    for (const tile of this.state.loaded) {
      if (tile.placement) {
        applySurface(this, tile);
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
    return m4.multiply(m4.mat4(), this.state.delta, this.loadMatrix);
  }
  set modelMatrix(matrix: Mat4) {
    if (this.state.source) {
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
      m4.invertAffine(m4.mat4(), this.state.delta),
    );
    this.state.delta = delta;
    if (this.world_ !== undefined) {
      this.world_.setTransform(this.state.transform, delta);
    }
    for (const tile of this.state.loaded) {
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
      this.state.secondPlacement = undefined;
    }
  }
  /**
   * What the content requires on screen (`TilesetOptions.attributions`). A
   * viewer credits them while an item of this tileset is in its world.
   */
  readonly attributions: readonly Attribution[];
  /** Load-time `modelMatrix`, built into tile transforms and volumes. */
  private readonly loadMatrix: Mat4;
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

  /** @internal */
  moveVolumes(tile: Tile, change: Mat4): void {
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
    return this.state.source !== undefined;
  }

  /**
   * Whether the globe's terrain is a hole for queries at a longitude and
   * latitude in degrees, as the regions' vertices are, and `height` m above
   * the ellipsoid (default 0): inside a region that isn't ground
   * (`TerrainRegion.ground`).
   */
  terrainClipped(longitude: number, latitude: number, height = 0): boolean {
    return (
      this.state.source?.clips?.clippedAt(
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
    return this.state.drawTiles.has(index);
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
    this.state.terrainRegions = (this.state.source?.clips?.size ?? 0) > 0;
    if (reach.length > 0) {
      for (const tile of this.state.loaded) {
        const r = tile.globe?.rectangle;
        if (r && reach.some((b) => rectanglesOverlap(b, r))) {
          applyTerrainClip(this, tile);
        }
      }
    }
    for (const listener of this.state.source?.heightListeners ?? []) {
      for (const r of heights) {
        listener(r);
      }
    }
    this.changed();
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
      this.state.queries.push({ rays, resolve, reject, pinned: [] });
      this.changed();
    });
  }

  /** Frame counter value of the last change to what the tileset draws. */
  get changedAt(): number {
    return this.state.lastChange;
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
    return this.state.frozen;
  }
  set freezeSelection(value: boolean) {
    if (value !== this.state.frozen) {
      this.state.frozen = value;
      this.changed(); // select again as soon as it thaws
    }
  }
  /**
   * Tints each drawn tile by its depth in the tree, to see the levels a
   * selection picked (1.x `debugColorizeTiles`). Off restores white.
   */
  get debugColorizeTiles(): boolean {
    return this.state.colorize;
  }
  set debugColorizeTiles(value: boolean) {
    if (value !== this.state.colorize) {
      this.state.colorize = value;
      for (const tile of this.state.masked) {
        applyDebugColor(this, tile);
      }
      this.changed();
    }
  }
  /**
   * Tints each drawn tile with the color this returns (linear RGBA; none
   * leaves it white), checked every frame, for inspection tools: tiles
   * one engine draws and another doesn't, say. Wins over
   * `debugColorizeTiles`.
   */
  get debugTileColor(): ((tile: Tile) => DebugColor | undefined) | undefined {
    return this.state.tileColor;
  }
  set debugTileColor(fn: ((tile: Tile) => DebugColor | undefined) | undefined) {
    this.state.tileColor = fn;
    updateDebug(this);
    this.changed();
  }
  /**
   * Wireframes of the drawn tiles' bounding volumes, colored as 1.x does:
   * white at final resolution, yellow while finer tiles load (drawn as a
   * placeholder), gray without content of its own.
   */
  get debugShowBoundingVolume(): boolean {
    return this.state.boundingVolumes !== undefined;
  }
  set debugShowBoundingVolume(value: boolean) {
    if (value !== this.debugShowBoundingVolume) {
      this.state.boundingVolumes?.clear();
      this.state.boundingVolumes = value
        ? new DebugVolumes(this.world, this.state.transform)
        : undefined;
      updateDebug(this);
      this.changed();
    }
  }
  /** Wireframes (blue) of the drawn tiles' content volumes, where given. */
  get debugShowContentBoundingVolume(): boolean {
    return this.state.contentVolumes !== undefined;
  }
  set debugShowContentBoundingVolume(value: boolean) {
    if (value !== this.debugShowContentBoundingVolume) {
      this.state.contentVolumes?.clear();
      this.state.contentVolumes = value
        ? new DebugVolumes(this.world, this.state.transform)
        : undefined;
      updateDebug(this);
      this.changed();
    }
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
  /** Selected tiles per view id after the last update (parity tests). */
  readonly lastSelected = new Map<number, Tile[]>();

  /**
   * @internal What the tileset draws changed: it stays `active` for the next updates,
   * and the engine's frame loop (asleep on demand once nothing changes)
   * wakes for them.
   */
  changed(): void {
    this.state.lastChange = this.state.frame;
    this.engine.wake();
  }
  private readonly fixedWindow?: number;
  private readonly origins = new Set<string>();
  /** What resident content holds, summed over loaded tiles. */
  readonly resident: ContentTotals = emptyTotals();
  /** Load milestones (performance.now()): created, first content, idle. */
  readonly createdAt = performance.now();
  firstContentAt?: number;
  settledAt?: number;

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
    this.state.options = options;
    this.state.contentAxes = contentAxes(tilesetJson);
    this.state.collision = options.enableCollision ?? false;
    this.retainGeometry = options.retainGeometry ?? false;
    this.loadMatrix = m4.copy(m4.mat4(), options.modelMatrix ?? m4.mat4());
    if (world !== undefined) {
      this.bindWorld(world);
    }
    this.state.policy = createSelection(options, source);
    this.state.cacheBytes = options.cacheBytes ?? 512 * 1024 * 1024;
    this.state.overflowBytes =
      options.maximumCacheOverflowBytes ?? 512 * 1024 * 1024;
    if (options.maximumRequests !== undefined) {
      this.fixedWindow = options.maximumRequests;
    }
    this.state.origin = this.originOf(url);
    this.useOrigin(this.state.origin);
    this.state.uploadsPerFrame = options.uploadsPerFrame ?? 8;
    this.state.headers = options.headers;
    this.stats.budget = this.state.cacheBytes;
    this.stats.overflow = this.state.overflowBytes;
    this.stats.adaptive = this.fixedWindow === undefined;
    const extensions: unknown = tilesetJson?.extensions;
    this.extensions =
      typeof extensions === "object" &&
      extensions !== null &&
      !Array.isArray(extensions)
        ? Object.freeze({ ...extensions })
        : NO_EXTENSIONS;
    const rootJson: unknown = tilesetJson?.root;
    this.state.rootJson =
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
      georeference: () => this.placement,
      secondPlacement: () => this.state.secondPlacement,
      loadedTiles: () => this.state.loaded,
      baseItem: () => this.state.baseItem,
    };
    this.itemHost = {
      tileset: this,
      get world() {
        return now.world();
      },
      get dualPosition() {
        return now.dualPosition();
      },
      get georeference() {
        return now.georeference();
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
        this.state.drawTiles.set(draw.index, {
          generation: draw.generation,
          tile,
          item,
          source,
        });
      },
      forgetDraw: (draw, tile) => {
        if (this.state.drawTiles.get(draw.index)?.tile === tile) {
          this.state.drawTiles.delete(draw.index);
        }
      },
      tileBytes: (tile, delta) => {
        tile.bytes += delta;
        this.stats.bytes += delta;
        if (tile.castsOnly) {
          this.state.casterResident += delta;
        }
      },
      changed: () => this.changed(),
      warn: (message) => {
        this.warnings.add(message);
      },
      surfaceChanged: () => this.surfaceChanged(),
      removed: (item) => {
        const at = this.state.itemList.indexOf(item);
        if (at >= 0) {
          this.state.itemList.splice(at, 1);
        }
        if (this.state.baseItem === item) {
          this.state.baseItem = undefined;
          item.holdsBase = false;
        }
        this.world.itemRemoved(item);
      },
    };
    // A globe's surface isn't an item: its tiles draw as they load, always.
    if (source) {
      this.state.baseItem = new SceneItem(this.itemHost, {}, true);
      this.state.itemList.push(this.state.baseItem);
    }
  }

  /** The world it draws in, from here on (`World.add`). */
  private bindWorld(world: World): void {
    this.world_ = world;
    this.anchor_ = contentAnchor(world, this.state.options.anchor, "Tileset3D");
    this.state.transform = world.addTransform(this.state.delta, this.anchor);
  }

  /**
   * The tile whose loaded content `draw` is (from `World.feature`'s draw),
   * or undefined: another tileset's draw, or one whose tile has unloaded
   * (its slot's generation then no longer matches).
   */
  tileOfDraw(draw: DrawHandle): Tile | undefined {
    const entry = this.state.drawTiles.get(draw.index);
    return entry?.generation === draw.generation ? entry.tile : undefined;
  }

  /** @internal Which of its items drew `draw`, while the tile is loaded. */
  itemOfDraw(draw: DrawHandle): SceneItem | undefined {
    const entry = this.state.drawTiles.get(draw.index);
    return entry?.generation === draw.generation
      ? (entry.item ?? this.state.baseItem)
      : undefined;
  }

  /**
   * @internal The tile's own draw that `draw` draws again (itself for the
   * tile's own): what a tile's retained geometry is listed under.
   */
  sourceOfDraw(draw: DrawHandle): DrawHandle | undefined {
    const entry = this.state.drawTiles.get(draw.index);
    return entry?.generation === draw.generation
      ? (entry.source ?? draw)
      : undefined;
  }

  /**
   * The items drawing this tileset (`World.add`), in the order added. The one
   * `Engine.addTileset` adds is `items[0]`. Empty: it selects nothing and does
   * no work per tick, and its loaded tiles stay cached until normal eviction.
   * A globe's surface isn't an item, so a globe's is empty.
   */
  get items(): readonly SceneItem[] {
    return this.state.source ? NO_ITEMS : this.state.itemList;
  }

  /** @internal `World.add`. */
  addItem(world: World, options: SceneItemOptions): SceneItem {
    if (this.state.destroyed) {
      throw new Error("World.add: the tileset was destroyed.");
    }
    if (this.state.source) {
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
      this.state.baseItem === undefined,
    );
    const placed: Tile[] = [];
    try {
      for (const tile of this.state.loaded) {
        if (tile.placement) {
          item.place(tile, tile.placement);
          placed.push(tile);
        }
      }
    } catch (error) {
      // A tile whose draws half-made are in `loaded` too: free every one.
      item.discard(this.state.loaded);
      throw error;
    }
    for (const tile of placed) {
      const bytes = item.bytes(tile);
      tile.bytes += bytes;
      this.stats.bytes += bytes;
      if (tile.castsOnly) {
        this.state.casterResident += bytes;
      }
    }
    if (item.holdsBase) {
      this.state.baseItem = item;
      // The tile's own draws, hidden when the last base item left: a tile that
      // stays selected has masks that don't change, so `update` won't write
      // them. A plain item's `place` writes nothing, so it happens here.
      for (const tile of placed) {
        item.applyViewMask(tile);
        item.applyCasterMask(tile);
      }
    }
    this.state.itemList.push(item);
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
  /** @internal The views some item draws the tile in (`TileTree.shownViews`). */
  shownViews(tile: Tile): number {
    let views = 0;
    for (const item of this.state.itemList) {
      views |= item.shownIn(tile);
    }
    return views >>> 0;
  }
  /** What an item needs of this tileset. */
  private readonly itemHost: SceneItemHost;

  /**
   * @internal Bounds cover what every item draws, and a placement that moves vertices
   * swaps tiles whole: both follow the items' placements and parameters, read
   * here, before selection.
   */
  updateVolumePad(): void {
    let pad = 0;
    let moves = false;
    for (const item of this.state.itemList) {
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
    this.state.source = source;
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
      ...this.state.options,
      policy,
      maximumScreenSpaceError: this.state.policy.maximumScreenSpaceError,
    };
    this.state.policy = createSelection(options, this.state.source);
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
    return this.state.source?.sampleHeight?.(longitude, latitude);
  }

  /** Height known without loading anything (the ellipsoid: 0), if any. */
  exactHeight(longitude: number, latitude: number): number | undefined {
    return this.state.source?.exactHeight?.(longitude, latitude);
  }

  /**
   * Height of the drawn surface (the triangle under the point in the
   * finest loaded tile, as 1.x `Globe.getHeight`): what clamped content
   * stands on. Terrain and the ellipsoid; undefined elsewhere.
   */
  surfaceHeight(longitude: number, latitude: number): number | undefined {
    return this.state.source?.surfaceHeight?.(longitude, latitude);
  }

  /**
   * The terrain as drawn in the views of `viewMask` (default all; a view's
   * bit is `Engine.viewBit`), read-only, for exact ray queries
   * (`terrainLineOfSight`). Undefined for 3D Tiles: they keep no CPU
   * triangles and are ray cast on the GPU (§13.10, `World.castRays`).
   */
  terrainRayTarget(viewMask?: number): TerrainRayTarget | undefined {
    return this.state.source?.rayTarget?.(viewMask);
  }

  /**
   * Calls `listener` with each rectangle (radians) whose surface heights
   * changed as terrain tiles load and unload; returns a remover. Never
   * called for 3D Tiles.
   */
  onHeightsChanged(listener: (rectangle: Rectangle) => void): () => void {
    const listeners = this.state.source?.heightListeners;
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
    if (this.state.externals.some((e) => !isCaster(e.tile))) {
      return false;
    }
    for (const tile of this.state.loading.keys()) {
      if (!isCaster(tile)) {
        return false;
      }
    }
    return this.state.ready.every((r) => isCaster(r.tile));
  }

  /** True when no shadow caster is loading or waiting to upload. */
  get casterIdle(): boolean {
    return this.state.inFlight === 0 && this.state.ready.length === 0;
  }

  /**
   * Needs `update()` even with every camera still: loading, waiting for a
   * request slot, changed in the last few frames (an upload can enable
   * further refinement), or the memory-adjusted SSE still moving toward its
   * target.
   */
  get active(): boolean {
    return (
      this.state.inFlight > 0 ||
      this.settling ||
      // Another tileset's selection decides where its casters may stand.
      (this.state.casting &&
        this.world.contentRevision !== this.state.revisionSeen)
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
    return this.state.queries.length > 0 || this.settling;
  }

  /** What both `active` and `needsFrames` wait on: work an update does now. */
  private get settling(): boolean {
    return (
      this.state.ready.length > 0 ||
      this.state.externals.length > 0 ||
      // Wanted tiles still waiting for a request slot (the origin's window,
      // shared with other tilesets, may be full).
      this.state.wanted.size > 0 ||
      this.state.frame - this.state.lastChange < 3 ||
      this.state.casterWake ||
      this.imagery?.busy === true ||
      this.imageryPending ||
      this.state.policy.memoryAdjustedScreenSpaceError !==
        this.state.policy.maximumScreenSpaceError
    );
  }

  /**
   * Where recent content loads spent their time: p50 and p95 per stage over
   * the last loads (queued for a request slot, network, worker wait, decode,
   * waiting for an upload slot, upload).
   */
  pipeline(): { samples: number; stages: Record<Stage, StageStats> } {
    return {
      samples: this.state.recent.length,
      stages: stageStats(this.state.recent),
    };
  }

  /** One frame: select per view, apply view masks, request, upload, evict. */
  update(allViews: SelectionView[]): void {
    update(this, allViews);
  }

  /** One more tile that draws nothing, and why (`TilesetStats.undrawn`). */
  undrawnTile(reason: string): void {
    undrawnTile(this, reason);
  }

  /**
   * @internal Over the byte budget. Casters that don't cast this tick go first. Then
   * cold tiles, least recently touched first: as they would with casters off
   * while what views use and the cold tiles alone pass the budget, and
   * otherwise only those gone stale (`COLD_AGE_MS`), for casters that took
   * their room. A caster still casting goes when admission stops admitting it,
   * on the next tick, as what is left shrinks.
   */
  evict(frame: number): void {
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

  /** @internal */
  useOrigin(origin: string): void {
    if (!this.origins.has(origin)) {
      this.origins.add(origin);
      this.engine.requests.register(origin, this.fixedWindow);
    }
  }

  /** True once `destroy` has run (1.x `isDestroyed`). */
  isDestroyed(): boolean {
    return this.state.destroyed;
  }

  /**
   * Frees the regions' world slots; a globe has them (`Globe`).
   * @internal
   */
  protected releaseRegions(): void {
    for (const entry of [...(this.state.source?.clips?.entries ?? [])]) {
      this.state.source!.clips!.remove(entry.clip);
      if (entry.slot >= 0) {
        this.world.removeTerrainClipRegion(entry.slot);
      }
    }
  }

  /** Unloads all content. The tileset can't be used afterwards. */
  destroy(): void {
    clearTimeout(this.state.casterTimer);
    for (const controller of this.state.loading.values()) {
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
    for (const tile of [...this.state.loaded]) {
      unload(this, tile);
    }
    for (const { asset } of this.state.ready) {
      closeImages(asset);
    }
    this.state.ready.length = 0;
    this.state.boundingVolumes?.clear();
    this.state.contentVolumes?.clear();
    this.releaseRegions();
    // Every tile is unloaded: no draw uses a blended twin now.
    for (const twin of this.state.blendedTwins.values()) {
      this.world.removeMaterial(twin);
    }
    this.state.blendedTwins.clear();
    this.state.ownMaterials.clear();
    for (const item of this.state.itemList) {
      item.destroyed();
      this.world_?.itemRemoved(item);
    }
    this.world_?.removeTransform(this.state.transform);
    this.state.destroyed = true;
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
