/**
 * A streamed 3D Tiles tileset in a world. Each frame the engine hands it the
 * views showing that world; selection runs per view over the shared tile
 * tree, and each tile's content is drawn only in the views that selected it
 * (record view masks). Content loads through the worker pool, uploads within
 * a per-frame budget, and is evicted least-recently-used when the cache
 * exceeds its byte budget; a tile touched by any view stays.
 */
import type { Engine } from "../scene/Engine.ts";
import { EARTH, MOON } from "../scene/Body.ts";
import type {
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
import type { TerrainRayTarget } from "../globe/terrainRay.ts";
import {
  compileTerrainClip,
  packClipShape,
  type TerrainClip,
  type TerrainClipRegion,
  type TerrainClips,
} from "../globe/terrainClip.ts";
import {
  StepwiseSelection,
  REQUEST_PURPOSES,
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
// Types only: the parser loads on demand (`readDeclaration`).
import type { TilesetGeoreference } from "../engineering/georeference.ts";
import type { TilesetPlacement } from "../engineering/placement.ts";
import type { RequestSample } from "./RequestScheduler.ts";
import type { GlobeImagery } from "../globe/GlobeImagery.ts";
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

/** Recent content loads kept for stage percentiles. */
/**
 * World pool pressure (World.pressure) past which streaming evicts as if
 * over its byte budget (§13.15).
 */
const CAPACITY_PRESSURE = 0.9;
const DEGREES_TO_RADIANS = Math.PI / 180;
const PIPELINE_WINDOW = 256;
/** Imagery priority offset of loading tiles: after drawn and waiting ones. */
const LOADING_IMAGERY = 1e15;
/** Frames without any view touching an in-flight tile before it is cancelled. */
const CANCEL_AFTER_FRAMES = 30;
/** `Tileset3D.extensions` of a tileset.json without any (and of terrain). */
const NO_EXTENSIONS: Readonly<Record<string, unknown>> = Object.freeze({});
/**
 * georeference.ts's ENGINEERING_FRAME_EXTENSION and its old name, written
 * out so the parser is imported only for a tileset.json that has one.
 */
const ENGINEERING_FRAME = "BENTLEY_engineering_frame";
const OLD_ENGINEERING_FRAME = "EXT_engineering_frame";
/** CRS extensions read only beside a frame declaration. */
const CRS_ONLY = ["ESRI_crs", "EXT_geospatial_crs_source"];

/** A tileset.json's declaration as read: parsed, or why not. */
type Declaration =
  { readonly georeference: TilesetGeoreference } | { readonly warning: string };

/**
 * Reads a tileset.json's BENTLEY_engineering_frame (or its old name,
 * EXT_engineering_frame), importing the parser only when one is there
 * (other tilesets pay nothing). A malformed declaration, or anything else
 * that goes wrong reading it, is a warning: it never fails the load. What
 * the parser warns about (the old name, in-frame alignments) is added too.
 */
async function readDeclaration(
  json: TileJson,
): Promise<Declaration | undefined> {
  const extensions: unknown = json?.extensions;
  if (typeof extensions !== "object" || extensions === null) {
    return undefined;
  }
  if (!(
    ENGINEERING_FRAME in extensions || OLD_ENGINEERING_FRAME in extensions
  )) {
    // A CRS alone has no placement mode: nothing is guessed, but say so.
    const crs = CRS_ONLY.find((name) => name in extensions);
    return crs === undefined
      ? undefined
      : {
          warning: `tileset.json has ${crs} but no ${ENGINEERING_FRAME} placement; not placed`,
        };
  }
  try {
    const { parseGeoreference } =
      await import("../engineering/georeference.ts");
    const georeference = parseGeoreference(json, { EARTH, MOON });
    return georeference === undefined ? undefined : { georeference };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The parser's own errors name the extension and the field.
    return {
      warning: message.startsWith(`${ENGINEERING_FRAME}:`)
        ? message
        : `${ENGINEERING_FRAME}: unreadable (${message.slice(0, 200)})`,
    };
  }
}

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
  /** @internal Where the terrain isn't drawn (terrain sources, `addTerrainClip`). */
  readonly clips?: TerrainClips;
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
   * tileset that declares none: the application supplies the engineering
   * frame and mode, since the engine never guesses one.
   */
  placement?: TilesetPlacement;
  /**
   * Keeps each loaded tile's triangles on the CPU (`Tile.geometry`) for
   * client-side snapping (`ClientSnapService`), released when the tile
   * unloads. Off by default: other tilesets keep no copy.
   */
  retainGeometry?: boolean;
}

export interface TilesetStats {
  tiles: number;
  loaded: number;
  loading: number;
  bytes: number;
  /** Content cache budget (eviction starts above it). */
  budget: number;
  /** Allowed overflow before the screen-space error is raised. */
  overflow: number;
  /** Current memory-adjusted screen-space error threshold. */
  screenSpaceError: number;
  /** Tiles drawn as mixed-LOD placeholders this frame, over all views. */
  placeholders: number;
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

export class Tileset3D implements TileTree {
  readonly warnings = new Set<string>();
  /** Whether loaded tiles keep their triangles (`TilesetOptions.retainGeometry`). */
  readonly retainGeometry: boolean;
  readonly events = new Emitter<TilesetEvents>();
  /**
   * tileset.json's top-level `extensions` (none for terrain), frozen at the
   * top level only: the objects inside are the parsed JSON itself.
   */
  readonly extensions: Readonly<Record<string, unknown>>;
  /**
   * Its `BENTLEY_engineering_frame` declaration, parsed at load. Undefined when
   * there is none, or when it is malformed: that adds a `warnings` entry
   * naming the field, and never fails the load. Nothing is resolved here;
   * `georeferenceTileset` loads the frame and sets `placement`.
   */
  readonly georeference?: TilesetGeoreference;
  /**
   * Where the tileset's design coordinates are drawn, and the way back
   * (`TilesetPlacement`): set by `georeferenceTileset` from the declaration,
   * or by the application (`TilesetOptions.placement`). Without one, picks on
   * it have no design coordinates. Unrelated to `Tile.placement`, which is a
   * tile's loaded content in the world (a `ModelPlacement`). Changing
   * `modelMatrix` drops it, with a warning: it would no longer describe what
   * is drawn.
   */
  placement?: TilesetPlacement;
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
  readonly stats: TilesetStats = {
    tiles: 0,
    loaded: 0,
    loading: 0,
    bytes: 0,
    budget: 0,
    overflow: 0,
    screenSpaceError: 16,
    placeholders: 0,
    inFlight: 0,
    maxInFlight: 0,
    adaptive: true,
    cancelled: 0,
    uploadQueue: 0,
    requestsTotal: 0,
    bytesTotal: 0,
    bytesReceived: 0,
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

  /** True for terrain and the ellipsoid (a globe source), not 3D Tiles. */
  get terrain(): boolean {
    return this.source !== undefined;
  }

  /**
   * Clips the globe's terrain (terrain and the ellipsoid; not 3D Tiles):
   * inside `region` (a rectangle or a simple polygon, geodetic degrees on
   * the globe's body) the terrain isn't drawn, so content placed there
   * shows instead. Edges are exact per pixel. Returns the clip, for
   * `removeTerrainClip`. Throws a `TerrainClipError`, saying why and what
   * to change, for a region it can't clip: not a simple polygon; reaching
   * within 5° of a pole, or going round one; spanning more than 10° from
   * its middle; more than 1,024 vertices (`MAX_TERRAIN_CLIP_VERTICES`);
   * edges crowded together (more than 32 in one cell of its grid); with
   * the regions it overlaps, more than 128 edges for a fragment to test
   * (`MAX_CLIP_FRAGMENT_EDGES`); past the clip blocks the world sets aside
   * for regions (`WorldOptions.maxClipBlocks`); or past 32 regions in the
   * world (`MAX_TERRAIN_CLIPS`). Also throws on a destroyed globe.
   *
   * Clipped terrain is a hole for every query, as it is on screen: picks
   * (`View.pick`) hit what shows through; `terrainRayTarget` rays
   * (`terrainLineOfSight`) pass through it; `sampleHeight`,
   * `surfaceHeight` and `exactHeight` are undefined there, and so is the
   * terrain's part of `Engine.sampleHeightMostDetailed`. Height clamping
   * follows: content clamped inside a clip stands on the tilesets with
   * collision there (`clampToGround`, `clampTo3DTiles`); with only terrain
   * to stand on (`clampToTerrain`) it keeps the height it has. GPU ray
   * casts (`World.castRays`) don't see clips: a terrain with
   * `enableCollision` is still hit there by them.
   *
   * Costs nothing without regions, or with none on screen. Only the tiles
   * a region touches test it, per fragment, and only against the few edges
   * of their place in the region's grid, so a long corridor strip costs
   * only where it runs. Wakes the frame loop.
   */
  addTerrainClip(region: TerrainClipRegion): TerrainClip {
    const clips = this.source?.clips;
    if (!clips) {
      throw new Error(
        "Tileset3D.addTerrainClip: only a globe (Engine.addTerrain, addEllipsoid) has terrain to clip.",
      );
    }
    if (this.destroyed) {
      throw new Error(
        "Tileset3D.addTerrainClip: the globe was destroyed; add clips to the globe that replaced it.",
      );
    }
    const shape = compileTerrainClip(region, clips.ellipsoid);
    clips.checkBudget(shape);
    const slot = this.world.addTerrainClipRegion(packClipShape(shape));
    const clip: TerrainClip = Object.freeze({ region: frozenRegion(region) });
    const entry = { clip, shape, slot };
    clips.add(entry);
    this.terrainClipsChanged(clips.boundsOf(entry));
    return clip;
  }

  /** Draws the terrain inside `clip` again (`addTerrainClip`). */
  removeTerrainClip(clip: TerrainClip): void {
    const clips = this.source?.clips;
    const entry = clips?.remove(clip);
    if (!clips || !entry) {
      return;
    }
    this.world.removeTerrainClipRegion(entry.slot);
    this.terrainClipsChanged(clips.boundsOf(entry));
  }

  /** The terrain clips in effect, oldest first (`addTerrainClip`). */
  get terrainClips(): readonly TerrainClip[] {
    return this.source?.clips?.entries.map((e) => e.clip) ?? [];
  }

  /**
   * Whether the globe's terrain is clipped (`addTerrainClip`) at a
   * longitude and latitude in degrees, as the regions' vertices are, and
   * `height` m above the ellipsoid (default 0).
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

  /** Masks every loaded tile again, tells height listeners, wakes. */
  private terrainClipsChanged(rectangles: readonly Rectangle[]): void {
    for (const tile of this.loaded) {
      this.applyTerrainClip(tile);
    }
    for (const listener of this.source?.heightListeners ?? []) {
      for (const r of rectangles) {
        listener(r);
      }
    }
    this.changed();
  }

  /** Which clip regions a globe tile's draws test (a bit per region). */
  private applyTerrainClip(tile: Tile): void {
    const clips = this.source?.clips;
    if (!clips || !tile.placement || !tile.globe) {
      return;
    }
    const mask = clips.maskFor(tile.globe.rectangle);
    for (const draw of tile.placement.draws) {
      this.world.setTerrainClip(draw, mask);
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
          tile.touchedFrame = frame;
        }
        continue;
      }
      const tiles = new Set<Tile>();
      for (const ray of query.rays) {
        this.tilesAlongRay(this.root, ray, tiles);
      }
      let pending = false;
      for (const tile of tiles) {
        tile.touchedFrame = frame;
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
  /** Selected tiles per view id after the last update (parity tests). */
  readonly lastSelected = new Map<number, Tile[]>();
  private frame = 0;
  /** A non-3D-Tiles source, when streaming one (fromSource). */
  private source?: TileSource;
  /** Last frame in which an update changed anything. */
  private lastChange = 0;

  /**
   * What the tileset draws changed: it stays `active` for the next updates,
   * and the engine's frame loop (asleep on demand once nothing changes)
   * wakes for them.
   */
  private changed(): void {
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
  private placeholders = new Set<Tile>();
  /** Tiles drawn whole while finer content loads, in some view. */
  private standIns = new Set<Tile>();
  private inFlight = 0;
  /** In flight for anything but prefetch (`prefetchAfterVisible`). */
  private visibleInFlight = 0;
  private destroyed = false;

  private constructor(
    private readonly engine: Engine,
    readonly world: World,
    readonly url: string,
    options: TilesetOptions,
    public root: Tile,
    readonly geometricError: number,
    source?: TileSource,
    tilesetJson?: TileJson,
    declaration?: Declaration,
  ) {
    if (options.customShader && options.style) {
      throw new Error("Tileset3D: give a customShader or a style, not both.");
    }
    this.options = options;
    this.collision = options.enableCollision ?? false;
    this.retainGeometry = options.retainGeometry ?? false;
    this.loadMatrix = m4.copy(m4.mat4(), options.modelMatrix ?? m4.mat4());
    this.transform = world.addTransform(m4.mat4());
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
    if (declaration !== undefined) {
      if ("georeference" in declaration) {
        this.georeference = declaration.georeference;
        for (const warning of declaration.georeference.warnings) {
          this.warnings.add(warning);
        }
      } else {
        this.warnings.add(declaration.warning);
      }
    }
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
    const declaration = await readDeclaration(json);
    const tileset = new Tileset3D(
      engine,
      world,
      url,
      options,
      root,
      geometricError,
      undefined,
      json,
      declaration,
    );
    warnings.forEach((w) => tileset.warnings.add(w));
    tileset.stats.tiles = countTiles(root);
    // Tiles keep a reference to the tree they were built for; point them here.
    retarget(root, tileset);
    return tileset;
  }

  /** Streams a non-3D-Tiles source (terrain) through the same machinery. */
  static fromSource(
    engine: Engine,
    world: World,
    source: TileSource,
    options: TilesetOptions = {},
  ): Tileset3D {
    const tileset = new Tileset3D(
      engine,
      world,
      source.url,
      options,
      source.root,
      source.geometricError,
      source,
    );
    tileset.source = source;
    source.tree = tileset;
    tileset.stats.tiles = countTiles(source.root);
    retarget(source.root, tileset);
    return tileset;
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

  /** True when nothing is loading or waiting to upload. */
  get idle(): boolean {
    return (
      this.inFlight === 0 &&
      this.ready.length === 0 &&
      this.externals.length === 0
    );
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
        this.warnings.add(
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
    return this.inFlight > 0 || this.settling;
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
    this.policy.imageryReady =
      this.imagery || this.imageryPending ? this.imageryReady : undefined;
    this.policy.expectedLoadSeconds = this.loadEstimateMs / 1000;
    const waiting = new Set<Tile>();
    for (const view of views) {
      const result = this.policy.select(this.root, this.geometricError, view);
      const bit = (1 << view.id) >>> 0;
      for (const tile of result.selected) {
        tile.viewMask = (tile.viewMask | bit) >>> 0;
        nowMasked.add(tile);
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
        tile.touchedFrame = frame;
      }
      for (const tile of result.waiting ?? []) {
        waiting.add(tile);
      }
      for (const tile of result.requested) {
        tile.touchedFrame = frame;
        // Nearest first across views (1.x orders by distance for REPLACE);
        // a policy may supply its own priority.
        const priority =
          result.priority?.get(tile) ?? tile.viewState(view.id).distance;
        const previous = requests.get(tile);
        if (previous === undefined || priority < previous) {
          // The most urgent view's purpose.
          requests.set(tile, priority);
          purposes.set(tile, this.policy.purpose?.(priority) ?? "view");
        }
      }
      this.lastSelected.set(view.id, result.selected);
      this.stats.selected.set(view.id, result.selected.length);
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
    const now = performance.now();
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
        controller.abort();
        this.engine.requests.cancelled(tile.contentOrigin);
        this.stats.cancelled++;
        if (tile.purpose) {
          this.stats.purposes[tile.purpose].cancelled++;
        }
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
    this.stats.loading = this.inFlight + this.ready.length;
    this.stats.inFlight = this.inFlight;
    this.stats.uploadQueue = this.ready.length;
  }

  private request(
    requests: Map<Tile, number>,
    purposes: Map<Tile, RequestPurpose>,
  ): void {
    const order = [...requests.entries()].sort(
      (a, b) => a[1] - b[1] || a[0].depth - b[0].depth,
    );
    const full = new Set<string>();
    // Prefetch after everything visible (`prefetchAfterVisible`).
    let visibleWaiting =
      this.policy.prefetchAfterVisible === true && this.visibleInFlight > 0;
    for (const [tile] of order) {
      if (tile.state !== "unloaded") {
        continue;
      }
      const prefetch = purposes.get(tile) === "prefetch";
      if (prefetch && visibleWaiting) {
        continue;
      }
      const origin = tile.contentOrigin;
      if (full.has(origin)) {
        visibleWaiting ||=
          !prefetch && this.policy.prefetchAfterVisible === true;
        continue;
      }
      this.useOrigin(origin);
      if (!this.engine.requests.tryAcquire(origin)) {
        full.add(origin);
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
      const purpose = purposes.get(tile) ?? "view";
      tile.purpose = purpose;
      const visible = purpose !== "prefetch";
      if (visible) {
        this.visibleInFlight++;
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
          if (visible) {
            this.visibleInFlight--;
          }
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
        this.warnings.add(`${message} (drawn empty)`);
        return undefined;
      }
      tile.state = "failed";
      this.warnings.add(`content failed: ${message}`);
      return undefined;
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
      if (this.stats.bytes > limit) {
        exceeded = true;
        break;
      }
      // The engine-wide budget for this frame (one upload always goes).
      if (budget.uploads > 0 && budget.bytes <= 0) {
        break;
      }
      const { tile, asset, arrivedAt } = this.ready.shift()!;
      asset.warnings.forEach((w) => this.warnings.add(w));
      // Before the upload, whose source data is released after placing.
      const summary = summarizeContent(asset);
      const uploadStart = performance.now();
      try {
        const placing = this.source?.modelOptions(tile);
        // The source kept until the placement succeeds: a capacity failure
        // anywhere leaves the asset whole for the retry.
        const model = this.engine.uploadModel(this.world, asset, {
          axes: placing?.axes ?? "3d-tiles",
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
        if (this.source?.clips?.size) {
          this.applyTerrainClip(tile);
        }
        tile.bytes = model.bytes;
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
        for (let t = tile.parent; t; t = t.parent) {
          t.residentBelow++;
        }
        this.stats.loaded++;
        this.stats.bytes += tile.bytes;
        this.stats.bytesTotal += model.bytes;
      } catch (error) {
        if (isCapacityError(error)) {
          // A pool is full, not the content bad (§13.15): the upload took
          // nothing, so the tile waits at the front of the queue while
          // eviction frees room and the error threshold rises, as for bytes.
          this.ready.unshift({ tile, asset, arrivedAt });
          this.capacityFull = error.pool;
          this.capacityFailed = true;
          exceeded = true;
          break;
        }
        tile.state = "failed";
        this.warnings.add(
          `upload failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    const selection = this.policy;
    if (this.stats.bytes < this.cacheBytes) {
      selection.memoryAdjustedScreenSpaceError = Math.max(
        selection.memoryAdjustedScreenSpaceError / 1.02,
        selection.maximumScreenSpaceError,
      );
    } else if (exceeded && this.ready.length > 0) {
      selection.memoryAdjustedScreenSpaceError *= 1.02;
    }
    this.stats.screenSpaceError = selection.memoryAdjustedScreenSpaceError;
  }

  /** Least-recently-touched first, never a tile touched this frame. */
  private evict(frame: number): void {
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
    const candidates = [...this.loaded]
      .filter((t) => t.touchedFrame < frame)
      .sort((a, b) => a.touchedFrame - b.touchedFrame);
    // Spread over frames, as uploads are: after a camera jump everything
    // shown before becomes evictable at once, and freeing it all in one
    // frame (textures and buffers by the hundred) stalls that frame. Past
    // the hard limit (budget + overflow), whatever is needed goes now.
    let allowance = Math.max(
      2 * this.engine.uploadBytesPerFrame,
      this.stats.bytes - (this.cacheBytes + this.overflowBytes),
    );
    for (const tile of candidates) {
      if (this.stats.bytes <= this.cacheBytes || allowance <= 0) {
        break;
      }
      allowance -= tile.bytes;
      this.unload(tile);
    }
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
    const candidates = [...this.loaded]
      .filter((t) => t.touchedFrame < frame)
      .sort((a, b) => a.touchedFrame - b.touchedFrame);
    const count = Math.min(candidates.length, this.uploadsPerFrame);
    for (let k = 0; k < count; k++) {
      this.unload(candidates[k]!);
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
    this.stats.bytes -= tile.bytes;
    this.stats.loaded--;
    if (tile.summary) {
      accumulate(this.resident, tile.summary, -1);
      tile.summary = undefined;
    }
    tile.bytes = 0;
    tile.state = "unloaded";
    tile.appliedMask = -1;
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

  /** Unloads all content. The tileset can't be used afterwards. */
  destroy(): void {
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
    for (const clip of this.terrainClips) {
      this.removeTerrainClip(clip);
    }
    this.world.removeTransform(this.transform);
    this.destroyed = true;
  }
}

/** A frozen copy of a clip region, as its handle keeps it. */
function frozenRegion(region: TerrainClipRegion): TerrainClipRegion {
  if (region.rectangle) {
    const { west, south, east, north } = region.rectangle;
    return Object.freeze({
      rectangle: Object.freeze({ west, south, east, north }),
    });
  }
  return Object.freeze({
    polygon: Object.freeze(
      region.polygon.map(({ longitude, latitude }) =>
        Object.freeze({ longitude, latitude }),
      ),
    ),
  });
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
