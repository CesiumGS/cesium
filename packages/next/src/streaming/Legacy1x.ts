/**
 * `Legacy1x` tile selection: CesiumJS 1.x's default (non-skip-LOD) base
 * traversal, reproduced for fair comparisons and selection parity tests
 * (plan §12). Runs once per view over a shared tile tree; per-view state
 * lives in `Tile.views[viewId]`.
 *
 * Sources: Cesium3DTilesetBaseTraversal.js, Cesium3DTilesetTraversal.js,
 * Cesium3DTile.js (updateVisibility, getScreenSpaceError), and
 * Cesium3DTileset.js (dynamic screen-space error).
 */
import * as v3 from "../math/vec3.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import { Ellipsoid, type Cartographic } from "../math/ellipsoid.ts";
import type { Tile, TileViewState } from "./Tile.ts";
import {
  OUTSIDE,
  INSIDE,
  volumeDistance,
  volumeIntersectPlane,
  type TileVolume,
} from "./volumes.ts";

/** What a policy needs to know about a view for one selection pass. */
export interface SelectionView {
  /** View id: index into `Tile.views` and bit in record view masks. */
  id: number;
  position: Vec3;
  direction: Vec3;
  cartographic: Cartographic;
  /** Culling planes, world space: (nx, ny, nz, d) per plane, inward normals. */
  planes: Float64Array;
  /** 2 tan(fovy / 2). */
  sseDenominator: number;
  /** Drawing-buffer height divided by the pixel ratio (1.x `pixelRatio`). */
  height: number;
}

export interface SelectionResult {
  /** Tiles to draw in this view (renderable, content ready). */
  selected: Tile[];
  /** Tiles whose content should load, nearest-first order not implied. */
  requested: Tile[];
  /** Tiles the traversal touched this pass (kept in cache). */
  touched: Tile[];
}

// 1.x CullingVolume plane masks.
const MASK_OUTSIDE = 0xffffffff;
const MASK_INSIDE = 0;
const MASK_INDETERMINATE = 0x7fffffff;

const ellipsoid = Ellipsoid.WGS84;

export interface Legacy1xOptions {
  maximumScreenSpaceError?: number;
  dynamicScreenSpaceError?: boolean;
  dynamicScreenSpaceErrorDensity?: number;
  dynamicScreenSpaceErrorFactor?: number;
  dynamicScreenSpaceErrorHeightFalloff?: number;
  cullWithChildrenBounds?: boolean;
}

export class Legacy1xSelection {
  maximumScreenSpaceError: number;
  /** Raised above `maximumScreenSpaceError` by the cache when over budget. */
  memoryAdjustedScreenSpaceError: number;
  dynamicScreenSpaceError: boolean;
  dynamicScreenSpaceErrorDensity: number;
  dynamicScreenSpaceErrorFactor: number;
  dynamicScreenSpaceErrorHeightFalloff: number;
  cullWithChildrenBounds: boolean;
  private pass = 0;
  private density = 0;

  constructor(options: Legacy1xOptions = {}) {
    this.maximumScreenSpaceError = options.maximumScreenSpaceError ?? 16;
    this.memoryAdjustedScreenSpaceError = this.maximumScreenSpaceError;
    this.dynamicScreenSpaceError = options.dynamicScreenSpaceError ?? true;
    this.dynamicScreenSpaceErrorDensity =
      options.dynamicScreenSpaceErrorDensity ?? 2.0e-4;
    this.dynamicScreenSpaceErrorFactor =
      options.dynamicScreenSpaceErrorFactor ?? 24.0;
    this.dynamicScreenSpaceErrorHeightFalloff =
      options.dynamicScreenSpaceErrorHeightFalloff ?? 0.25;
    this.cullWithChildrenBounds = options.cullWithChildrenBounds ?? true;
  }

  /**
   * One selection pass for one view. `rootGeometricError` is the tileset's
   * top-level geometric error (1.x `_scaledGeometricError`).
   */
  select(
    root: Tile,
    rootGeometricError: number,
    view: SelectionView,
  ): SelectionResult {
    const pass = ++this.pass;
    const result: SelectionResult = {
      selected: [],
      requested: [],
      touched: [],
    };
    this.density = this.dynamicScreenSpaceError
      ? this.computeDensity(root, view)
      : 0;

    this.updateTile(root, view, pass, rootGeometricError);
    const rootState = root.viewState(view.id);
    if (!isVisible(rootState)) {
      return result;
    }
    if (
      this.screenSpaceError(root, view, true, rootGeometricError) <=
      this.memoryAdjustedScreenSpaceError
    ) {
      return result;
    }
    this.executeTraversal(root, view, pass, rootGeometricError, result);
    return result;
  }

  // ------------------------------------------------------------- traversal

  private executeTraversal(
    root: Tile,
    view: SelectionView,
    pass: number,
    rootError: number,
    result: SelectionResult,
  ): void {
    const stack: Tile[] = [root];
    while (stack.length > 0) {
      const tile = stack.pop()!;
      const state = tile.viewState(view.id);
      const parent = tile.parent;
      const parentRefines = !parent || parent.viewState(view.id).refines;
      let refines = false;
      if (this.canTraverse(tile, state)) {
        refines =
          this.updateAndPushChildren(
            tile,
            stack,
            view,
            pass,
            rootError,
            result,
          ) && parentRefines;
      }
      state.refines = refines;
      const stoppedRefining = !refines && parentRefines;

      if (!tile.renderable) {
        // Empty or external-tileset content (1.x !hasRenderableContent).
        loadTile(tile, result);
        if (stoppedRefining) {
          this.selectDesiredTile(tile, view, result);
        }
      } else if (tile.refine === "ADD") {
        this.selectDesiredTile(tile, view, result);
        loadTile(tile, result);
      } else {
        loadTile(tile, result);
        if (stoppedRefining) {
          this.selectDesiredTile(tile, view, result);
        }
      }
      result.touched.push(tile);
    }
  }

  private canTraverse(tile: Tile, state: TileViewState): boolean {
    if (tile.children.length === 0) {
      return false;
    }
    if (tile.external) {
      // Loaded external tileset: its root is our only child.
      return true;
    }
    return state.sse > this.memoryAdjustedScreenSpaceError;
  }

  private updateAndPushChildren(
    tile: Tile,
    stack: Tile[],
    view: SelectionView,
    pass: number,
    rootError: number,
    result: SelectionResult,
  ): boolean {
    const children = tile.children;
    for (const child of children) {
      this.updateTile(child, view, pass, rootError);
    }
    // Farthest first in the array: the nearest child is popped first.
    const sorted = [...children].sort((a, b) => {
      const sa = a.viewState(view.id);
      const sb = b.viewState(view.id);
      return sb.distance === 0 && sa.distance === 0
        ? sb.centerZDepth - sa.centerZDepth
        : sb.distance - sa.distance;
    });
    const checkRefines = tile.refine === "REPLACE" && tile.renderable;
    let refines = true;
    let anyChildrenVisible = false;
    for (const child of sorted) {
      const state = child.viewState(view.id);
      if (isVisible(state)) {
        stack.push(child);
        anyChildrenVisible = true;
      } else if (checkRefines) {
        // 1.x: loadTile + touchTile for invisible children of REPLACE parents.
        loadTile(child, result);
        result.touched.push(child);
      }
      if (checkRefines) {
        let childRefines: boolean;
        if (!state.inRequestVolume) {
          childRefines = false;
        } else if (!child.renderable) {
          childRefines = this.executeEmptyTraversal(
            child,
            view,
            pass,
            rootError,
            result,
          );
        } else {
          childRefines = child.contentAvailable;
        }
        refines = refines && childRefines;
      }
    }
    if (!anyChildrenVisible) {
      refines = false;
    }
    return refines;
  }

  /** 1.x executeEmptyTraversal: are the empty subtree's first contents loaded? */
  private executeEmptyTraversal(
    root: Tile,
    view: SelectionView,
    pass: number,
    rootError: number,
    result: SelectionResult,
  ): boolean {
    let allDescendantsLoaded = true;
    const stack: Tile[] = [root];
    while (stack.length > 0) {
      const tile = stack.pop()!;
      const state = tile.viewState(view.id);
      // Uses the SSE from before this tile's update, as 1.x does.
      const traverse = !tile.renderable && this.canTraverse(tile, state);
      const blocksRefinement = !traverse;
      if (blocksRefinement && !tile.contentAvailable) {
        allDescendantsLoaded = false;
      }
      this.updateTile(tile, view, pass, rootError);
      if (!isVisible(state)) {
        loadTile(tile, result);
        result.touched.push(tile);
      }
      if (traverse) {
        for (const child of tile.children) {
          stack.push(child);
        }
      }
    }
    return root.empty || allDescendantsLoaded;
  }

  private selectDesiredTile(
    tile: Tile,
    view: SelectionView,
    result: SelectionResult,
  ): void {
    if (!tile.contentAvailable) {
      return;
    }
    // 1.x selectTile: skip if the content bounding volume is out of view.
    const state = tile.viewState(view.id);
    if (tile.contentVolume && state.planeMask !== MASK_INSIDE) {
      for (let p = 0; p < view.planes.length / 4; p++) {
        if (
          volumeIntersectPlane(
            tile.contentVolume,
            view.planes.subarray(p * 4, p * 4 + 3),
            view.planes[p * 4 + 3]!,
          ) === OUTSIDE
        ) {
          return;
        }
      }
    }
    result.selected.push(tile);
  }

  // ------------------------------------------------------------- per-tile update

  /** 1.x updateTile → updateTileVisibility for one view and pass. */
  private updateTile(
    tile: Tile,
    view: SelectionView,
    pass: number,
    rootError: number,
  ): void {
    const state = tile.viewState(view.id);
    // As 1.x: the raw visibility (updateVisibility) is computed once per pass,
    // but the traversal-level refinements below run on every update. A
    // parent's children-bounds check may already have computed this tile's
    // raw visibility; skipping the steps below then would leave it visible.
    this.updateVisibility(tile, state, view, pass);
    if (!isVisible(state)) {
      return;
    }
    // External tileset: visible only if its root is.
    if (tile.external && tile.children.length > 0) {
      const child = tile.children[0]!;
      this.updateTile(child, view, pass, rootError);
      state.visible = child.viewState(view.id).visible;
      return;
    }
    // meetsScreenSpaceErrorEarly: children of ADD tiles.
    const parent = tile.parent;
    if (parent && parent.refine === "ADD" && !parent.external) {
      if (
        this.screenSpaceError(tile, view, true, rootError) <=
        this.memoryAdjustedScreenSpaceError
      ) {
        state.visible = false;
        return;
      }
    }
    // Children-bounds culling.
    if (
      this.cullWithChildrenBounds &&
      tile.refine === "REPLACE" &&
      tile.childrenWithinParent &&
      tile.children.length > 0
    ) {
      let anyVisible = false;
      for (const child of tile.children) {
        const cs = child.viewState(view.id);
        this.updateVisibility(child, cs, view, pass);
        if (isVisible(cs)) {
          anyVisible = true;
        }
      }
      if (!anyVisible) {
        state.visible = false;
      }
    }
  }

  /** 1.x Cesium3DTile.updateVisibility. */
  private updateVisibility(
    tile: Tile,
    state: TileViewState,
    view: SelectionView,
    pass: number,
  ): void {
    if (state.updated === pass) {
      return;
    }
    state.updated = pass;
    const parentMask = tile.parent
      ? tile.parent.viewState(view.id).planeMask
      : MASK_INDETERMINATE;
    state.distance = volumeDistance(
      tile.volume,
      view.position,
      view.cartographic,
    );
    const center = volumeCenter(tile.volume);
    state.centerZDepth =
      (center[0]! - view.position[0]!) * view.direction[0]! +
      (center[1]! - view.position[1]!) * view.direction[1]! +
      (center[2]! - view.position[2]!) * view.direction[2]!;
    state.sse = this.screenSpaceError(tile, view, false, 0);
    state.planeMask = planeMask(tile.volume, view.planes, parentMask);
    state.visible = state.planeMask !== MASK_OUTSIDE;
    state.inRequestVolume =
      !tile.requestVolume ||
      volumeDistance(tile.requestVolume, view.position, view.cartographic) ===
        0;
  }

  /** 1.x getScreenSpaceError (perspective). */
  private screenSpaceError(
    tile: Tile,
    view: SelectionView,
    useParentGeometricError: boolean,
    rootError: number,
  ): number {
    const error = useParentGeometricError
      ? tile.parent
        ? tile.parent.geometricError
        : rootError
      : tile.geometricError;
    if (error === 0) {
      return 0;
    }
    // Distance is the one stored by updateVisibility for this tile.
    const distance = Math.max(tile.viewState(view.id).distance, 1e-7);
    let sse = (error * view.height) / (distance * view.sseDenominator);
    if (this.dynamicScreenSpaceError) {
      const fog = 1 - Math.exp(-((distance * this.density) ** 2));
      sse -= fog * this.dynamicScreenSpaceErrorFactor;
    }
    return sse;
  }

  /** 1.x updateDynamicScreenSpaceError, from the root content volume. */
  private computeDensity(root: Tile, view: SelectionView): number {
    const volume = root.contentVolume ?? root.volume;
    let up: Vec3;
    let direction: Vec3 = view.direction;
    let height: number;
    let minimumHeight: number;
    let maximumHeight: number;
    if (volume.kind === "region") {
      up = v3.normalize(v3.vec3(), view.position);
      height = view.cartographic.height;
      minimumHeight = volume.region.minimumHeight;
      maximumHeight = volume.region.maximumHeight;
    } else {
      const inverse = invertAffine(root.transform);
      const center =
        volume.kind === "box" ? volume.obb.center : volume.sphere.center;
      const centerLocal = transformPoint(inverse, center);
      if (v3.length(centerLocal) > ellipsoid.minimumRadius) {
        const carto = ellipsoid.cartesianToCartographic(centerLocal, {
          longitude: 0,
          latitude: 0,
          height: 0,
        });
        up = v3.normalize(v3.vec3(), view.position);
        height = view.cartographic.height;
        minimumHeight = 0;
        maximumHeight = (carto?.height ?? 0) * 2;
      } else {
        const positionLocal = transformPoint(inverse, view.position);
        up = v3.vec3(0, 0, 1);
        direction = v3.normalize(
          v3.vec3(),
          transformVector(inverse, view.direction),
        );
        height = positionLocal[2]!;
        if (volume.kind === "box") {
          const h = volume.obb.halfAxes;
          const half = Math.hypot(h[6]!, h[7]!, h[8]!);
          minimumHeight = centerLocal[2]! - half;
          maximumHeight = centerLocal[2]! + half;
        } else {
          minimumHeight = centerLocal[2]! - volume.sphere.radius;
          maximumHeight = centerLocal[2]! + volume.sphere.radius;
        }
      }
    }
    const heightClose =
      minimumHeight +
      (maximumHeight - minimumHeight) *
        this.dynamicScreenSpaceErrorHeightFalloff;
    const t = Math.min(
      Math.max((height - heightClose) / (maximumHeight - heightClose), 0),
      1,
    );
    const horizonFactor = (1 - Math.abs(v3.dot(direction, up))) * (1 - t);
    return this.dynamicScreenSpaceErrorDensity * horizonFactor;
  }
}

function isVisible(state: TileViewState): boolean {
  return state.visible && state.inRequestVolume;
}

/** 1.x loadTile: request unloaded renderable (or external) content. */
function loadTile(tile: Tile, result: SelectionResult): void {
  if (!tile.empty && tile.state === "unloaded") {
    result.requested.push(tile);
  }
}

function volumeCenter(v: TileVolume): Vec3 {
  switch (v.kind) {
    case "box":
      return v.obb.center;
    case "sphere":
      return v.sphere.center;
    case "region":
      return v.region.obb.center;
  }
}

/** 1.x CullingVolume.computeVisibilityWithPlaneMask. */
function planeMask(
  volume: TileVolume,
  planes: Float64Array,
  parentMask: number,
): number {
  if (parentMask === MASK_OUTSIDE || parentMask === MASK_INSIDE) {
    return parentMask;
  }
  let mask = MASK_INSIDE;
  const count = planes.length / 4;
  for (let k = 0; k < count; k++) {
    const flag = k < 31 ? 1 << k : 0;
    if (k < 31 && (parentMask & flag) === 0) {
      continue;
    }
    const r = volumeIntersectPlane(
      volume,
      planes.subarray(k * 4, k * 4 + 3),
      planes[k * 4 + 3]!,
    );
    if (r === OUTSIDE) {
      return MASK_OUTSIDE;
    } else if (r !== INSIDE) {
      mask |= flag;
    }
  }
  return mask >>> 0;
}

function invertAffine(m: Mat4): Mat4 {
  // Inverse of [R | t]: [R⁻¹ | −R⁻¹ t] (general 3×3 inverse).
  const a = m[0]!,
    b = m[4]!,
    c = m[8]!;
  const d = m[1]!,
    e = m[5]!,
    f = m[9]!;
  const g = m[2]!,
    h = m[6]!,
    i = m[10]!;
  const A = e * i - f * h,
    B = -(d * i - f * g),
    C = d * h - e * g;
  const det = a * A + b * B + c * C;
  const inv = new Float64Array(16);
  inv[0] = A / det;
  inv[1] = B / det;
  inv[2] = C / det;
  inv[4] = -(b * i - c * h) / det;
  inv[5] = (a * i - c * g) / det;
  inv[6] = -(a * h - b * g) / det;
  inv[8] = (b * f - c * e) / det;
  inv[9] = -(a * f - c * d) / det;
  inv[10] = (a * e - b * d) / det;
  const tx = m[12]!,
    ty = m[13]!,
    tz = m[14]!;
  inv[12] = -(inv[0]! * tx + inv[4]! * ty + inv[8]! * tz);
  inv[13] = -(inv[1]! * tx + inv[5]! * ty + inv[9]! * tz);
  inv[14] = -(inv[2]! * tx + inv[6]! * ty + inv[10]! * tz);
  inv[15] = 1;
  return inv;
}

function transformPoint(m: Mat4, p: Vec3): Vec3 {
  return v3.vec3(
    m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]! + m[12]!,
    m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]! + m[13]!,
    m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]! + m[14]!,
  );
}

function transformVector(m: Mat4, p: Vec3): Vec3 {
  return v3.vec3(
    m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]!,
    m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]!,
    m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]!,
  );
}
