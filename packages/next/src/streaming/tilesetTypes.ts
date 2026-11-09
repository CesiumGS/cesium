// The types of a tileset's options, its source and its statistics.
import type { Rectangle } from "../globe/quantizedMesh.ts";
import type { TerrainClips } from "../globe/terrainClip.ts";
import type { TerrainRayTarget, TerrainRayTile } from "../globe/terrainRay.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { Attribution } from "../io/ion.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { CustomShader } from "../scene/CustomShader.ts";
import type { FeatureStyle } from "../scene/FeatureStyle.ts";
import type { AnchorHandle } from "../scene/world/types.ts";
import type { ModelResourceOptions } from "../scene/gltfModel.ts";
import type { BudgetedOptions } from "./Budgeted.ts";
import type { TileSelection, RequestPurpose } from "./Stepwise.ts";
import type { Tile, TileTree } from "./Tile.ts";
import type { DesignPlacement } from "./designPlacement.ts";

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
   * What the content requires on screen, as its source states it (ion's
   * attributions, say): `Tileset3D.attributions`. Whatever loads a tileset
   * from a source that has them passes them here. A viewer shows them while
   * an item of the tileset is in its world (`World.add`), so adding a tileset
   * never loses its credit. The non-collapsible ones must stay on screen.
   */
  attributions?: readonly Attribution[];
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
