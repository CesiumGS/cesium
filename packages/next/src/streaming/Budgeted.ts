/**
 * `Budgeted` tile selection (formerly `Next`) (plan §3.7). Shares 1.x's visibility, distance and
 * dynamic screen-space error (proven at 100% L1 parity) but replaces the
 * refinement rules:
 *
 * - **Skip-LOD.** The view's frontier (the tiles whose SSE meets the
 *   threshold) is requested directly; intermediate levels are skipped. A
 *   coarse base level is requested only where nothing is loaded yet. A
 *   loaded ancestor stays on screen until every visible frontier tile under
 *   it has loaded, so refinement never opens holes.
 * - **Visible-only coverage.** A REPLACE tile is replaced once its visible
 *   children are covered; off-screen children are not waited for.
 * - **Free detail from the shared cache.** Where finer content is already
 *   resident (another view loaded it, or the camera zoomed out), it is drawn
 *   instead of the coarser frontier tile, down to `opportunisticRatio` of the
 *   threshold, at no download cost.
 * - A tileset without a top-level geometricError uses its root's (1.x
 *   computes NaN and never skips the root).
 */
import {
  Legacy1xSelection,
  isVisible,
  type Legacy1xOptions,
  type SelectionResult,
  type SelectionView,
} from "./Legacy1x.ts";
import { CLIP_BOXES } from "../render/layout.ts";
import type { Tile } from "./Tile.ts";
import { OUTSIDE, volumeIntersectPlane } from "./volumes.ts";

export interface BudgetedOptions extends Legacy1xOptions {
  /**
   * Levels that may be skipped between a loaded ancestor and the frontier
   * before an intermediate level is loaded too (default 2), so regions
   * improve in steps instead of all at once.
   */
  skipLevels?: number;
  /**
   * Draw cached finer content while its SSE is above this fraction of the
   * threshold (0 disables; default 0.25: up to two levels finer).
   */
  opportunisticRatio?: number;
  /**
   * Content just outside the view (`SelectionView.prefetchPlanes`) loads at
   * this multiple of the SSE threshold (default 2: about a quarter of the
   * bytes of full detail), so rotating and panning reveal loaded content.
   * 0 disables prefetching.
   */
  prefetchErrorScale?: number;
  /**
   * Mixed LOD: while a region refines, draw the finer content that has
   * arrived and let the coarse tile fill only the volumes still missing.
   * "auto" (default) mixes where a tile's children partition its volume
   * (photogrammetry, terrain-like quadtrees and octrees), and otherwise
   * swaps whole regions at once (design models, whose children overlap and
   * whose coarse tiles drop whole elements).
   */
  mixedLod?: "auto" | "always" | "never";
}

/** Request priority bands: base levels, then intermediates, then frontier. */
const BASE = 0;
const INTERMEDIATE = 1e11;
const FRONTIER = 1e12;
/** Content outside the view, after everything visible. */
const PREFETCH = 1e13;
/** No renderable ancestor is loaded (or requested) in this region yet. */
const NONE = Number.POSITIVE_INFINITY;

/**
 * The tiles drawing a region, and whether they cover all of it. Incomplete
 * covers still carry the finer content that has arrived.
 */
interface Cover {
  tiles: Tile[];
  complete: boolean;
  /** Incomplete covers: the tiles whose regions have no content yet. */
  holes: readonly Tile[];
}

const NO_HOLES: readonly Tile[] = [];

export class BudgetedSelection extends Legacy1xSelection {
  opportunisticRatio: number;
  skipLevels: number;
  prefetchErrorScale: number;
  mixedLod: "auto" | "always" | "never";

  constructor(options: BudgetedOptions = {}) {
    super(options);
    this.opportunisticRatio = options.opportunisticRatio ?? 0.25;
    this.skipLevels = options.skipLevels ?? 2;
    this.prefetchErrorScale = options.prefetchErrorScale ?? 2;
    this.mixedLod = options.mixedLod ?? "auto";
  }

  override select(
    root: Tile,
    rootGeometricError: number,
    view: SelectionView,
  ): SelectionResult {
    const pass = ++this.pass;
    const result: SelectionResult = {
      selected: [],
      requested: [],
      touched: [],
      priority: new Map(),
      placeholders: new Map(),
    };
    const rootError = Number.isFinite(rootGeometricError)
      ? rootGeometricError
      : root.geometricError;
    this.density = this.dynamicScreenSpaceError
      ? this.computeDensity(root, view)
      : 0;
    this.updateTile(root, view, pass, rootError);
    if (!isVisible(root.viewState(view.id))) {
      return result;
    }
    // The tileset's own geometric error says when the whole tileset is too
    // small to draw. Without one (iTwin exports) the root's stands in only
    // for refining it: the tileset is never hidden, as in 1.x.
    if (
      Number.isFinite(rootGeometricError) &&
      this.screenSpaceError(root, view, true, rootError) <=
        this.memoryAdjustedScreenSpaceError
    ) {
      return result;
    }
    const cover = this.display(root, view, pass, rootError, NONE, 0, result);
    result.selected.push(...cover.tiles);
    return result;
  }

  /**
   * The tiles that draw `tile`'s region in this view. An incomplete cover
   * keeps whatever finer content has arrived; the nearest loaded ancestor
   * decides whether it or that content draws (see "hold" below).
   * `levels` counts renderable levels since the nearest loaded (or requested)
   * ancestor: NONE when there is none.
   */
  private display(
    tile: Tile,
    view: SelectionView,
    pass: number,
    rootError: number,
    levels: number,
    group: number,
    result: SelectionResult,
  ): Cover {
    result.touched.push(tile);
    const state = tile.viewState(view.id);

    // A quadrant without data (terrain): the nearest loaded ancestor fills
    // it, clipped to it.
    if (tile.fillFromParent) {
      return { tiles: [], complete: false, holes: [tile] };
    }
    // An external tileset must load before its subtree is known.
    if (tile.external && tile.state !== "ready") {
      this.request(tile, BASE, state.distance, result);
      return { tiles: [], complete: false, holes: [tile] };
    }
    const own: Tile[] | undefined = tile.contentAvailable
      ? [tile]
      : tile.renderable
        ? undefined
        : []; // empty, or an external tileset already expanded
    // Tiles without content of their own (empty, expanded external tilesets)
    // always refine: there is nothing to show at their level.
    const refine =
      tile.children.length > 0 &&
      (!tile.renderable || state.sse > this.memoryAdjustedScreenSpaceError);

    if (!refine) {
      // Frontier tile.
      if (own === undefined) {
        this.request(tile, FRONTIER + group, state.distance * 1e-3, result);
        // Zooming out: finer content still resident keeps drawing until
        // this tile arrives.
        const finer =
          tile.refine === "REPLACE"
            ? this.fromCache(tile, view, pass, rootError, result)
            : undefined;
        return finer
          ? { tiles: finer, complete: true, holes: NO_HOLES }
          : { tiles: [], complete: false, holes: [tile] };
      }
      if (
        tile.refine === "REPLACE" &&
        this.opportunisticRatio > 0 &&
        state.sse >
          this.memoryAdjustedScreenSpaceError * this.opportunisticRatio
      ) {
        const finer = this.fromCache(tile, view, pass, rootError, result);
        if (finer) {
          return { tiles: finer, complete: true, holes: NO_HOLES };
        }
      }
      return { tiles: own, complete: true, holes: NO_HOLES };
    }

    for (const child of tile.children) {
      this.updateTile(child, view, pass, rootError);
    }
    // Levels for the children: reset below loaded content; an unloaded tile
    // that is due as a base or intermediate level is requested now and
    // counts as loaded for its subtree.
    // Frontier requests are grouped by the region they will replace (the
    // nearest loaded or requested ancestor), nearest region first, so regions
    // complete and swap in one after another instead of all at the end.
    let childLevels: number;
    let childGroup = group;
    if (own !== undefined && own.length > 0) {
      childLevels = 1;
      childGroup = state.distance;
    } else if (!tile.renderable) {
      childLevels = levels;
    } else if (levels === NONE) {
      this.request(tile, BASE, state.distance, result);
      childLevels = 1;
      childGroup = state.distance;
    } else if (levels > this.skipLevels) {
      this.request(tile, INTERMEDIATE, state.distance, result);
      childLevels = 1;
      childGroup = state.distance;
    } else {
      childLevels = levels + 1;
    }

    if (tile.refine === "ADD") {
      const parts: Tile[] = [];
      if (own) {
        parts.push(...own);
      } else if (childLevels !== 1) {
        this.request(tile, FRONTIER + group, state.distance * 1e-3, result);
      }
      for (const child of tile.children) {
        if (!isVisible(child.viewState(view.id))) {
          this.prefetch(child, view, pass, rootError, result);
        } else {
          const d = this.display(
            child,
            view,
            pass,
            rootError,
            childLevels,
            childGroup,
            result,
          );
          parts.push(...d.tiles);
        }
      }
      // ADD content draws in addition to its children; the region is
      // complete once this level's own content is present.
      return own !== undefined
        ? { tiles: parts, complete: true, holes: NO_HOLES }
        : { tiles: parts, complete: false, holes: [tile] };
    }

    // REPLACE: the visible children must all be coverable.
    const parts: Tile[] = [];
    const holes: Tile[] = [];
    const missing: Tile[] = [];
    let complete = true;
    for (const child of tile.children) {
      if (!isVisible(child.viewState(view.id))) {
        this.prefetch(child, view, pass, rootError, result);
        continue;
      }
      const d = this.display(
        child,
        view,
        pass,
        rootError,
        childLevels,
        childGroup,
        result,
      );
      parts.push(...d.tiles);
      if (!d.complete) {
        complete = false;
        holes.push(...d.holes);
        missing.push(child);
      }
    }
    if (complete) {
      return { tiles: parts, complete: true, holes: NO_HOLES };
    }
    // Only real content covers the region; an empty tile can't, so the
    // nearest loaded ancestor fills it.
    if (own !== undefined && own.length > 0) {
      // Mixed LOD: the arrived finer content draws, and this tile fills only
      // the missing volumes, at its true depth (clipped per fragment). The
      // finest holes when few enough, else the missing children.
      if (parts.length > 0 && this.mixes(tile)) {
        const clip =
          holes.length <= CLIP_BOXES
            ? holes
            : missing.length <= CLIP_BOXES
              ? missing
              : undefined;
        if (clip) {
          result.placeholders!.set(tile, clip);
          return {
            tiles: [tile, ...parts],
            complete: true,
            holes: NO_HOLES,
          };
        }
      }
      // Otherwise hold what this view drew last frame. A coarse tile stays until its
      // region is complete (one swap, no mixed levels). Finer tiles already
      // drawn stay while a newly visible neighbor loads: its gap waits
      // (prefetch usually fills it first) instead of the whole region
      // collapsing to this tile, which with skipped levels can be near the
      // root.
      if (
        parts.length > 0 &&
        !drawnLastFrame(tile, view) &&
        parts.some((t) => drawnLastFrame(t, view))
      ) {
        return { tiles: parts, complete: false, holes };
      }
      return { tiles: own, complete: true, holes: NO_HOLES };
    }
    return {
      tiles: parts,
      complete: false,
      holes: parts.length === 0 ? [tile] : holes,
    };
  }

  private mixes(tile: Tile): boolean {
    return (
      this.mixedLod === "always" ||
      (this.mixedLod === "auto" && tile.childrenPartition)
    );
  }

  /**
   * Requests what `tile` would display if it came into view, when it lies in
   * the guard band around the frustum: at the lowest priority and
   * `prefetchErrorScale` times coarser, so it is cheap and never delays
   * visible content.
   */
  private prefetch(
    tile: Tile,
    view: SelectionView,
    pass: number,
    rootError: number,
    result: SelectionResult,
  ): void {
    const planes = view.prefetchPlanes;
    if (
      !planes ||
      this.prefetchErrorScale <= 0 ||
      !insidePlanes(tile, planes)
    ) {
      return;
    }
    result.touched.push(tile);
    const state = tile.viewState(view.id);
    if (tile.external && tile.state !== "ready") {
      this.request(tile, PREFETCH, state.distance, result);
      return;
    }
    const refine =
      tile.children.length > 0 &&
      (!tile.renderable ||
        state.sse >
          this.memoryAdjustedScreenSpaceError * this.prefetchErrorScale);
    if (tile.renderable && (!refine || tile.refine === "ADD")) {
      this.request(tile, PREFETCH, state.distance, result);
    }
    if (refine) {
      for (const child of tile.children) {
        this.updateTile(child, view, pass, rootError);
        this.prefetch(child, view, pass, rootError, result);
      }
    }
  }

  /** Finer resident content covering `tile`'s visible children, if any. */
  private fromCache(
    tile: Tile,
    view: SelectionView,
    pass: number,
    rootError: number,
    result: SelectionResult,
  ): Tile[] | undefined {
    if (tile.children.length === 0) {
      return undefined;
    }
    const parts: Tile[] = [];
    let any = false;
    for (const child of tile.children) {
      this.updateTile(child, view, pass, rootError);
      const state = child.viewState(view.id);
      if (!isVisible(state)) {
        continue;
      }
      if (child.contentAvailable) {
        result.touched.push(child);
        const finer =
          child.refine === "REPLACE" &&
          state.sse >
            this.memoryAdjustedScreenSpaceError * this.opportunisticRatio
            ? this.fromCache(child, view, pass, rootError, result)
            : undefined;
        parts.push(...(finer ?? [child]));
        any = true;
      } else if (!child.renderable) {
        result.touched.push(child);
      } else {
        return undefined;
      }
    }
    return any ? parts : undefined;
  }

  private request(
    tile: Tile,
    band: number,
    distance: number,
    result: SelectionResult,
  ): void {
    if (tile.state !== "unloaded") {
      return;
    }
    const previous = result.priority!.get(tile);
    const priority = band + distance;
    if (previous === undefined) {
      result.requested.push(tile);
      result.priority!.set(tile, priority);
    } else if (priority < previous) {
      result.priority!.set(tile, priority);
    }
  }
}

/** Whether this view drew the tile's content in the previous frame. */
function drawnLastFrame(tile: Tile, view: SelectionView): boolean {
  return tile.appliedMask !== -1 && (tile.appliedMask & (1 << view.id)) !== 0;
}

/** Whether the tile's volume reaches inside all of `planes`. */
function insidePlanes(tile: Tile, planes: Float64Array): boolean {
  for (let k = 0; k < planes.length; k += 4) {
    const r = volumeIntersectPlane(
      tile.volume,
      planes.subarray(k, k + 3),
      planes[k + 3]!,
    );
    if (r === OUTSIDE) {
      return false;
    }
  }
  return true;
}
