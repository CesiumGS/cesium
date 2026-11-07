/**
 * The 3D Tiles tile tree: explicit tilesets and external tilesets, with
 * bounding volumes in Earth-fixed coordinates (see volumes.ts). Content
 * state lives here too; selection policies only read the tree.
 */
import type { ClipHandle } from "../scene/World.ts";
import type { GlobeTile } from "../globe/TerrainSource.ts";
import type { ContentSummary } from "./pipeline.ts";
import type { RequestPurpose } from "./Stepwise.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import { resolveUri } from "../io/ion.ts";
import type { ModelPlacement } from "../scene/gltfModel.ts";
import {
  compactVolume,
  volumeFromJson,
  volumeObb,
  type Occludee,
  type TileVolume,
} from "./volumes.ts";

export type Refine = "ADD" | "REPLACE";

export type ContentState = "unloaded" | "loading" | "ready" | "failed";

/** Per-view traversal state, written by a selection policy each frame. */
export interface TileViewState {
  /** Traversal pass that last updated this state. */
  updated: number;
  visible: boolean;
  inRequestVolume: boolean;
  /** Frustum plane mask (1.x CullingVolume semantics). */
  planeMask: number;
  distance: number;
  centerZDepth: number;
  sse: number;
  refines: boolean;
}

/** A scheme or a protocol-relative URI: not relative to its base's origin. */
const ABSOLUTE_URI = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
/** Each content base URL's origin (a tileset and its external tilesets). */
const baseOrigins = new Map<string, string>();

function originOf(url: string): string {
  try {
    return new URL(url, globalThis.location?.href).origin;
  } catch {
    return "";
  }
}

export class Tile {
  readonly children: Tile[] = [];
  readonly depth: number;
  /** Geometric error scaled by the transform's maximum scale. */
  readonly geometricError: number;
  readonly refine: Refine;
  readonly transform: Mat4;
  /**
   * Bounding volumes as written in the tileset JSON. Each is built on first
   * use: a built region held about 1 KB (corners, edge normals, box and
   * sphere), and most of a large tileset's tiles are never visited (NYC
   * knows 36k tiles and loads about 200, r39).
   */
  private readonly volumeJson: VolumeJson;
  private contentVolumeJson?: VolumeJson;
  private requestVolumeJson?: VolumeJson;
  private builtVolume?: TileVolume;
  private builtContentVolume?: TileVolume;
  private builtRequestVolume?: TileVolume;
  /** The geometric error as written (`headerKey`). */
  private readonly jsonGeometricError?: number;
  /**
   * The content's URI as written in the tileset JSON; undefined for empty
   * tiles. Kept relative: resolved, every tile carried its own copy of the
   * tileset URL's query (ion's signed query: about 1.2 KB a tile, 45 MB of
   * NYC's 217 MB heap, r38).
   */
  private readonly contentUri?: string;
  /** Content is an external tileset (loaded into `children` on demand). */
  readonly external: boolean;
  /** `childrenWithinParent` and `childrenPartition`, once computed. */
  private withinParent?: boolean;
  private partition?: boolean;
  /**
   * No content of its own and none below: its parent's content draws its
   * region (terrain quadrants without data, which 1.x upsamples).
   */
  fillFromParent = false;
  /** Horizon-occlusion point of `volume` (`aboveHorizon`). */
  occludee?: Occludee & { volume: TileVolume };
  /** Terrain tiles: quadtree address and 1.x globe selection state. */
  globe?: GlobeTile;

  state: ContentState = "unloaded";
  /**
   * Loaded descendants (`Tileset3D.loaded`), so selection finds resident
   * finer content under a tile without walking its whole subtree.
   */
  residentBelow = 0;
  placement?: ModelPlacement;
  /** Debug tint currently on the draws (linear RGBA; none is white). */
  debugColor?: readonly number[];
  /** Bytes of the loaded content (geometry + textures). */
  bytes = 0;
  /** Data credit of the loaded content (glTF asset.copyright). */
  copyright?: string;
  /** Frame in which any view last touched (needed) the tile. */
  touchedFrame = -1;
  /** Union of view bits selecting the tile this frame. */
  viewMask = 0;
  /** View mask currently written to the content's draw records. */
  appliedMask = -1;
  /** Views drawing this tile as a mixed-LOD placeholder this frame. */
  placeholderMask = 0;
  /** The volumes it fills as a placeholder, over all views this frame. */
  holes?: Set<Tile>;
  /**
   * Views drawing this tile whole in place of finer content still loading
   * (not refined: coarser than the view wants there) this frame.
   */
  standInMask = 0;
  /** Placeholder mask and holes currently written to the draw records. */
  appliedPlaceholderMask = 0;
  appliedHoles?: Set<Tile>;
  /** GPU clip boxes of `appliedHoles`. */
  clip?: ClipHandle;
  /**
   * What its content was requested for; cleared once a view draws it, so
   * each load counts as drawn at most once.
   */
  purpose?: RequestPurpose;
  /** Pipeline timestamps: first wanted, and its fetch started. */
  wantedAt = 0;
  fetchStartAt = 0;
  /** What the loaded content holds (diagnostics). */
  summary?: ContentSummary;
  readonly views: TileViewState[] = [];

  constructor(
    readonly parent: Tile | undefined,
    json: TileJson,
    readonly baseUrl: string,
    parentTransform: Mat4,
    inheritedRefine: Refine,
    public tileset: TileTree,
  ) {
    this.depth = parent ? parent.depth + 1 : 0;
    this.transform = json.transform
      ? m4.multiply(
          m4.mat4(),
          parentTransform,
          Float64Array.from(json.transform),
        )
      : parentTransform;
    const refine = json.refine?.toUpperCase();
    this.refine =
      refine === "ADD" || refine === "REPLACE" ? refine : inheritedRefine;
    const t = this.transform;
    const scale = Math.max(
      Math.hypot(t[0]!, t[1]!, t[2]!),
      Math.hypot(t[4]!, t[5]!, t[6]!),
      Math.hypot(t[8]!, t[9]!, t[10]!),
    );
    this.jsonGeometricError = json.geometricError;
    const error = json.geometricError ?? parent?.geometricError ?? 0;
    this.geometricError = error * scale;
    const bv: VolumeJson | undefined = json.boundingVolume;
    if (!bv?.box && !bv?.region && !bv?.sphere) {
      throw new Error("tile has no supported bounding volume");
    }
    this.volumeJson = bv;
    const content = json.content ?? json.contents?.[0];
    if (json.contents && json.contents.length > 1) {
      tileset.warnings.add(
        "multiple contents per tile: only the first is drawn",
      );
    }
    const uri: string | undefined = content?.uri ?? content?.url;
    if (uri) {
      this.contentUri = uri;
      this.contentVolumeJson = content?.boundingVolume;
    }
    this.external = !!uri && /\.json(\?|$)/i.test(uri);
    this.requestVolumeJson = json.viewerRequestVolume;
    if (json.implicitTiling) {
      tileset.warnings.add("implicit tiling not supported yet");
    }
    this.state = uri ? "unloaded" : "ready";
    for (const child of json.children ?? []) {
      this.children.push(
        new Tile(this, child, baseUrl, this.transform, this.refine, tileset),
      );
    }
    // Children added later (an external tileset's root, terrain's
    // quadrants) leave these as they are at construction.
    if (this.children.length === 0) {
      this.withinParent = this.partition = false;
    }
  }

  /** Tightened by implicit trees once content loads (terrain heights). */
  get volume(): TileVolume {
    return (this.builtVolume ??= compactVolume(
      volumeFromJson(this.volumeJson, this.transform)!,
    ));
  }

  set volume(volume: TileVolume) {
    this.builtVolume = volume;
  }

  get contentVolume(): TileVolume | undefined {
    if (this.contentVolumeJson) {
      this.builtContentVolume = volumeFromJson(
        this.contentVolumeJson,
        this.transform,
      );
      this.contentVolumeJson = undefined;
    }
    return this.builtContentVolume;
  }

  set contentVolume(volume: TileVolume | undefined) {
    this.contentVolumeJson = undefined;
    this.builtContentVolume = volume;
  }

  get requestVolume(): TileVolume | undefined {
    if (this.requestVolumeJson) {
      this.builtRequestVolume = volumeFromJson(
        this.requestVolumeJson,
        this.transform,
      );
      this.requestVolumeJson = undefined;
    }
    return this.builtRequestVolume;
  }

  set requestVolume(volume: TileVolume | undefined) {
    this.requestVolumeJson = undefined;
    this.builtRequestVolume = volume;
  }

  /**
   * The tile's identity in its tileset JSON (bounding volume and geometric
   * error as written), independent of URLs and child order; used to compare
   * selections across engines and sessions.
   */
  get headerKey(): string {
    return tileHeaderKey({
      boundingVolume: this.volumeJson,
      geometricError: this.jsonGeometricError,
    });
  }

  /** 1.x Cesium3DTileOptimizations: children's volumes lie within ours. */
  get childrenWithinParent(): boolean {
    return (this.withinParent ??= checkChildrenWithinParent(this));
  }

  /**
   * The children's boxes split this tile's volume (within it, overlapping
   * little): a coarse placeholder can then be clipped to missing children.
   */
  get childrenPartition(): boolean {
    return (this.partition ??=
      this.childrenWithinParent && checkChildrenPartition(this));
  }

  set childrenPartition(value: boolean) {
    this.partition = value;
  }

  /** Absolute content URL (resolved on use); undefined for empty tiles. */
  get contentUrl(): string | undefined {
    return this.contentUri === undefined
      ? undefined
      : resolveUri(this.contentUri, this.baseUrl);
  }

  /**
   * The content's origin, for per-origin request slots. A relative URI
   * (nearly all) shares its base's, looked up without parsing: request
   * order runs over every wanted tile each frame, and two URL parses per
   * tile there took 0.5 s of AEC's load (r38).
   */
  get contentOrigin(): string {
    const uri = this.contentUri;
    if (uri === undefined) {
      return "";
    }
    if (!ABSOLUTE_URI.test(uri)) {
      let origin = baseOrigins.get(this.baseUrl);
      if (origin === undefined) {
        origin = originOf(this.baseUrl);
        baseOrigins.set(this.baseUrl, origin);
      }
      return origin;
    }
    return originOf(resolveUri(uri, this.baseUrl));
  }

  /** Whether the tile has content (a URI). */
  get hasContent(): boolean {
    return this.contentUri !== undefined;
  }

  /** Empty: no content at all (1.x hasEmptyContent). */
  get empty(): boolean {
    return this.contentUri === undefined;
  }

  /**
   * 1.x hasRenderableContent: any content, except an external tileset once
   * loaded (before that it is requested like any content).
   */
  get renderable(): boolean {
    return (
      this.contentUri !== undefined &&
      !(this.external && this.state === "ready")
    );
  }

  /** 1.x contentAvailable: renderable content that is loaded. */
  get contentAvailable(): boolean {
    return this.renderable && this.state === "ready";
  }

  viewState(viewId: number): TileViewState {
    let s = this.views[viewId];
    if (!s) {
      s = {
        updated: -1,
        visible: false,
        inRequestVolume: true,
        planeMask: 0,
        distance: 0,
        centerZDepth: 0,
        sse: 0,
        refines: false,
      };
      this.views[viewId] = s;
    }
    return s;
  }
}

/** Shared by all tiles of one tileset (and its external tilesets). */
export interface TileTree {
  readonly warnings: Set<string>;
  /** Implicit trees (terrain) report tiles they create as they grow. */
  tilesAdded?(count: number): void;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- tileset JSON is untyped */
export type TileJson = any;

/** A `boundingVolume` as written in tileset JSON. */
interface VolumeJson {
  box?: number[];
  sphere?: number[];
  region?: number[];
}

/** See `Tile.headerKey`; also applied to 1.x tile headers in parity tests. */
export function tileHeaderKey(header: TileJson): string {
  return `${JSON.stringify(header.boundingVolume)}|${header.geometricError}`;
}

/**
 * The children's boxes add up to little more than the parent's (≤ 1.25×), so
 * they overlap little. Element-based subdivisions (design models) overlap
 * heavily and fail.
 */
function checkChildrenPartition(tile: Tile): boolean {
  const volume = (box: { halfAxes: Float64Array }) => {
    const h = box.halfAxes;
    return (
      8 *
      Math.abs(
        h[0]! * (h[4]! * h[8]! - h[5]! * h[7]!) -
          h[3]! * (h[1]! * h[8]! - h[2]! * h[7]!) +
          h[6]! * (h[1]! * h[5]! - h[2]! * h[4]!),
      )
    );
  };
  const parentBox = volumeObb(tile.volume)!;
  let sum = 0;
  for (const child of tile.children) {
    sum += volume(volumeObb(child.volume)!);
  }
  return sum <= 1.25 * volume(parentBox);
}

/** 1.x `Cesium3DTileOptimizations.checkChildrenWithinParent`. */
function checkChildrenWithinParent(tile: Tile): boolean {
  const parentBox = volumeObb(tile.volume);
  if (!parentBox || tile.children.length === 0) {
    return false;
  }
  const axis = v3.vec3();
  for (const child of tile.children) {
    const childBox = volumeObb(child.volume);
    if (!childBox) {
      return false;
    }
    v3.sub(axis, childBox.center, parentBox.center);
    const length = v3.length(axis);
    v3.scale(axis, axis, 1 / length);
    const project = (h: Float64Array) =>
      Math.abs(h[0]! * axis[0]!) +
      Math.abs(h[1]! * axis[1]!) +
      Math.abs(h[2]! * axis[2]!) +
      Math.abs(h[3]! * axis[0]!) +
      Math.abs(h[4]! * axis[1]!) +
      Math.abs(h[5]! * axis[2]!) +
      Math.abs(h[6]! * axis[0]!) +
      Math.abs(h[7]! * axis[1]!) +
      Math.abs(h[8]! * axis[2]!);
    if (project(parentBox.halfAxes) <= project(childBox.halfAxes) + length) {
      return false;
    }
  }
  return true;
}

/** Loads a tileset JSON into a tile tree rooted under `parent` (or as a root). */
export async function loadTilesetJson(
  url: string,
  headers: Record<string, string> | undefined,
  parent: Tile | undefined,
  tree: TileTree,
  rootTransform?: Mat4,
): Promise<{ root: Tile; geometricError: number; json: TileJson }> {
  const json = await fetchTilesetJson(url, headers);
  return { ...treeFromJson(json, url, parent, tree, rootTransform), json };
}

/** A tileset JSON, fetched and parsed. */
export async function fetchTilesetJson(
  url: string,
  headers: Record<string, string> | undefined,
  signal?: AbortSignal,
): Promise<TileJson> {
  const response = await fetch(url, {
    ...(headers ? { headers } : {}),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`);
  }
  return response.json();
}

/**
 * The tile tree of a parsed tileset JSON, under `parent` (an external
 * tileset) or as a root, placed by `rootTransform` (a tileset's
 * `modelMatrix`). Costs milliseconds for large files, so streaming builds
 * them within a per-frame budget.
 */
export function treeFromJson(
  json: TileJson,
  url: string,
  parent: Tile | undefined,
  tree: TileTree,
  rootTransform?: Mat4,
): { root: Tile; geometricError: number } {
  const up = json.asset?.gltfUpAxis;
  if (up && up.toUpperCase() !== "Y") {
    tree.warnings.add(`gltfUpAxis ${up} not supported (treated as Y)`);
  }
  const root = new Tile(
    parent,
    json.root,
    url,
    parent ? parent.transform : (rootTransform ?? m4.mat4()),
    parent ? parent.refine : "REPLACE",
    tree,
  );
  if (json.geometricError === undefined) {
    // Required by the spec but omitted by some publishers. 1.x then computes
    // NaN for the root's early-out SSE and always traverses the root (a 1.x
    // bug that happens to work); Stepwise reproduces it.
    tree.warnings.add(
      "tileset has no top-level geometricError: the root is never skipped (as in 1.x)",
    );
  }
  return { root, geometricError: json.geometricError ?? Number.NaN };
}
