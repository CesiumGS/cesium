// What a tileset's streaming functions share: its options as resolved, its tiles'
// state, its caches and queues. Content data, with no GPU types.
import { TouchOrder } from "./TouchOrder.ts";
import { COLD_AGE_MS } from "./tilesetCasters.ts";
import type { TileSelection } from "./Stepwise.ts";
import type { TilesetOptions, TileSource } from "./tilesetTypes.ts";
import type { ModelResourceOptions } from "../scene/gltfModel.ts";
import * as m4 from "../math/mat4.ts";
import type { Mat4 } from "../math/mat4.ts";
import type {
  TransformHandle,
  CastRay,
  DrawHandle,
} from "../scene/world/types.ts";
import type { Tile, TileJson } from "./Tile.ts";
import type { DebugColor, DebugVolumes } from "./debugVolumes.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { StageTimes } from "./pipeline.ts";
import type { SceneItem } from "../scene/SceneItem.ts";
import type { DesignPlacement } from "./designPlacement.ts";

/** One per tileset, made once with it, and filled by its constructor. */
export class TilesetState {
  /**
   * The root tile's `boundingVolume` and `transform` as
   * tileset.json writes them (the parsed JSON itself; neither for terrain),
   * for the proj entry's `tilesetGeoreference`, which derives an area of
   * interest from them.
   */
  rootJson!: {
    readonly boundingVolume?: unknown;
    readonly transform?: unknown;
  };
  policy!: TileSelection;
  options!: TilesetOptions;
  /** How its content is turned upright (`asset.gltfUpAxis`). */
  contentAxes!: ModelResourceOptions["axes"];
  collision = false;
  /** `modelMatrix` × loadMatrix⁻¹: the content root transform. */
  delta: Mat4 = m4.mat4();
  /** Parent transform of all content: moves it with one write. */
  transform!: TransformHandle;

  /**
   * The terrain material each tile draws with (shared by content), and
   * its blended twin for tiles under a region that blends, both ways.
   */
  readonly blendedTwins = new Map<number, number>();
  readonly ownMaterials = new Map<number, number>();

  /** The globe has regions: loading tiles test them. */
  terrainRegions = false;
  readonly queries: Array<{
    rays: readonly CastRay[];
    resolve: (result: { draws: DrawHandle[]; release(): void }) => void;
    reject: (error: Error) => void;
    pinned: Tile[];
    done?: boolean;
  }> = [];
  frozen = false;
  colorize = false;
  tileColor?: (tile: Tile) => DebugColor | undefined;
  boundingVolumes?: DebugVolumes;
  contentVolumes?: DebugVolumes;
  frame = 0;
  /** A non-3D-Tiles source, when streaming one (`Globe.create`). */
  source?: TileSource;
  /** Last tick in which an update changed anything. */
  lastChange = 0;
  cacheBytes!: number;
  /** The world pool an upload last found full (`CapacityError.pool`). */
  capacityFull?: string;
  /** Ticks to wait before retrying uploads after a capacity failure. */
  capacityWait = 0;
  /** `capacityFull` came from a failed upload, not only from pressure. */
  capacityFailed = false;
  overflowBytes!: number;
  /** The root's origin, and every origin this tileset requested from. */
  origin!: string;
  readonly loading = new Map<Tile, AbortController>();
  uploadsPerFrame!: number;
  headers?: Record<string, string>;
  readonly loaded = new Set<Tile>();
  /** The loaded tiles, least recently touched first (what eviction walks). */
  readonly order = new TouchOrder<Tile>();
  readonly ready: Array<{
    tile: Tile;
    asset: GltfAsset;
    arrivedAt: number;
  }> = [];
  /** Unloaded tiles wanted by some view, since when (queue time). */
  readonly wanted = new Map<Tile, number>();
  readonly recent: StageTimes[] = [];
  /**
   * Median request-to-drawable time of recent loads, ms (until measured,
   * a typical CDN load).
   */
  loadEstimateMs = 500;
  masked = new Set<Tile>();
  /** Tiles with a caster mask (`CasterSelection.casters`). */
  casters = new Set<Tile>();
  /** Bytes of what views used in the last update. */
  viewBytes = 0;
  /** How long a cold tile may yet come back, ms (`COLD_AGE_MS`). */
  coldAgeMs = COLD_AGE_MS;
  /** The last update selected shadow casters. */
  casting = false;
  /** `World.contentRevision` after the last update. */
  revisionSeen = 0;
  /** The timer that wakes the loop for cold tiles going stale. */
  casterTimer: ReturnType<typeof setTimeout> | undefined;
  /** That timer fired, and the next update is due. */
  casterWake = false;
  /** Bytes of recent casters (`CASTER_BYTES_WINDOW`), and their median. */
  readonly recentCasterBytes: number[] = [];
  casterBytesEstimate = 0;
  /** Whether casters may load this tick (`CasterRoom.load`). */
  casterLoad = true;
  /** A view's tile found a pool full: casters wait until it has uploaded. */
  viewCapacityWait = false;
  /** Bytes of loaded tiles that are `castsOnly`, drawn by cascades or not. */
  casterResident = 0;
  placeholders = new Set<Tile>();
  /** Tiles drawn whole while finer content loads, in some view. */
  standIns = new Set<Tile>();
  inFlight = 0;
  destroyed = false;

  /** Loaded tiles by draw slot: kept with placing and unloading content. */
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
   * Where the second position's points are drawn, for picks and
   * snaps on an item at placement 1, as `placement` is for the positions at
   * placement 0. `georeferenceTileset` sets it for a tileset with a second
   * position. Without one, a hit at placement 1 has no content coordinates.
   * Changing `modelMatrix` drops it.
   */
  secondPlacement?: DesignPlacement;

  /** The item drawing the tiles' own draws, if any. */
  baseItem: SceneItem | undefined;
  readonly itemList: SceneItem[] = [];

  /** External tileset JSON waiting for its tile tree to be built. */
  readonly externals: Array<{ tile: Tile; json: TileJson }> = [];
}
