/**
 * The 3D Tiles tile tree: explicit tilesets and external tilesets, with
 * bounding volumes in Earth-fixed coordinates (see volumes.ts). Content
 * state lives here too; selection policies only read the tree.
 */
import type { ClipHandle } from "../scene/World.ts";
import type { ContentSummary } from "./pipeline.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import { resolveUri } from "../io/ion.ts";
import type { ModelInstance } from "../scene/gltfModel.ts";
import { volumeFromJson, volumeObb, type TileVolume } from "./volumes.ts";

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

export class Tile {
  readonly children: Tile[] = [];
  readonly depth: number;
  /** Geometric error scaled by the transform's maximum scale. */
  readonly geometricError: number;
  readonly refine: Refine;
  readonly transform: Mat4;
  readonly volume: TileVolume;
  readonly contentVolume?: TileVolume;
  readonly requestVolume?: TileVolume;
  /** Absolute content URL; undefined for empty tiles. */
  readonly contentUrl?: string;
  /** Content is an external tileset (loaded into `children` on demand). */
  readonly external: boolean;
  /**
   * The tile's identity in its tileset JSON (bounding volume and geometric
   * error as written), independent of URLs and child order; used to compare
   * selections across engines and sessions.
   */
  readonly headerKey: string;
  /** 1.x Cesium3DTileOptimizations: children's volumes lie within ours. */
  childrenWithinParent = false;
  /**
   * The children's boxes split this tile's volume (within it, overlapping
   * little): a coarse placeholder can then be clipped to missing children.
   */
  childrenPartition = false;

  state: ContentState = "unloaded";
  instance?: ModelInstance;
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
  /** Placeholder mask and holes currently written to the draw records. */
  appliedPlaceholderMask = 0;
  appliedHoles?: Set<Tile>;
  /** GPU clip boxes of `appliedHoles`. */
  clip?: ClipHandle;
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
    this.headerKey = tileHeaderKey(json);
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
    const error = json.geometricError ?? parent?.geometricError ?? 0;
    this.geometricError = error * scale;
    const volume = volumeFromJson(json.boundingVolume, t);
    if (!volume) {
      throw new Error("tile has no supported bounding volume");
    }
    this.volume = volume;
    const content = json.content ?? json.contents?.[0];
    if (json.contents && json.contents.length > 1) {
      tileset.warnings.add(
        "multiple contents per tile: only the first is drawn",
      );
    }
    const uri: string | undefined = content?.uri ?? content?.url;
    if (uri) {
      this.contentUrl = resolveUri(uri, baseUrl);
      this.contentVolume = content?.boundingVolume
        ? volumeFromJson(content.boundingVolume, t)
        : undefined;
    }
    this.external = !!uri && /\.json(\?|$)/i.test(uri);
    if (json.viewerRequestVolume) {
      this.requestVolume = volumeFromJson(json.viewerRequestVolume, t);
    }
    if (json.implicitTiling) {
      tileset.warnings.add("implicit tiling not supported yet");
    }
    this.state = uri ? "unloaded" : "ready";
    for (const child of json.children ?? []) {
      this.children.push(
        new Tile(this, child, baseUrl, this.transform, this.refine, tileset),
      );
    }
    this.childrenWithinParent = checkChildrenWithinParent(this);
    this.childrenPartition =
      this.childrenWithinParent && checkChildrenPartition(this);
  }

  /** Empty: no content at all (1.x hasEmptyContent). */
  get empty(): boolean {
    return this.contentUrl === undefined;
  }

  /**
   * 1.x hasRenderableContent: any content, except an external tileset once
   * loaded (before that it is requested like any content).
   */
  get renderable(): boolean {
    return (
      this.contentUrl !== undefined &&
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
): Promise<{ root: Tile; geometricError: number; json: TileJson }> {
  const response = await fetch(url, headers ? { headers } : undefined);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`);
  }
  const json: TileJson = await response.json();
  const up = json.asset?.gltfUpAxis;
  if (up && up.toUpperCase() !== "Y") {
    tree.warnings.add(`gltfUpAxis ${up} not supported (treated as Y)`);
  }
  const root = new Tile(
    parent,
    json.root,
    url,
    parent ? parent.transform : m4.mat4(),
    parent ? parent.refine : "REPLACE",
    tree,
  );
  if (json.geometricError === undefined) {
    // Required by the spec but omitted by some publishers. 1.x then computes
    // NaN for the root's early-out SSE and always traverses the root (a 1.x
    // bug that happens to work); Legacy1x reproduces it.
    tree.warnings.add(
      "tileset has no top-level geometricError: the root is never skipped (as in 1.x)",
    );
  }
  return { root, geometricError: json.geometricError ?? Number.NaN, json };
}
