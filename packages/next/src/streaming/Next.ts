/**
 * `Next` tile selection (plan §3.7). Shares 1.x's visibility, distance and
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
import type { Tile } from "./Tile.ts";

export interface NextOptions extends Legacy1xOptions {
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
}

/** Request priority bands: base levels, then intermediates, then frontier. */
const BASE = 0;
const INTERMEDIATE = 1e11;
const FRONTIER = 1e12;
/** No renderable ancestor is loaded (or requested) in this region yet. */
const NONE = Number.POSITIVE_INFINITY;

export class NextSelection extends Legacy1xSelection {
  opportunisticRatio: number;
  skipLevels: number;

  constructor(options: NextOptions = {}) {
    super(options);
    this.opportunisticRatio = options.opportunisticRatio ?? 0.25;
    this.skipLevels = options.skipLevels ?? 2;
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
    if (
      this.screenSpaceError(root, view, true, rootError) <=
      this.memoryAdjustedScreenSpaceError
    ) {
      return result;
    }
    const tiles = this.display(root, view, pass, rootError, NONE, 0, result);
    if (tiles) {
      result.selected.push(...tiles);
    }
    return result;
  }

  /**
   * The tiles that draw `tile`'s region in this view, or undefined if the
   * region can't be covered yet (the caller then falls back to an ancestor).
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
  ): Tile[] | undefined {
    result.touched.push(tile);
    const state = tile.viewState(view.id);

    // An external tileset must load before its subtree is known.
    if (tile.external && tile.state !== "ready") {
      this.request(tile, BASE, state.distance, result);
      return undefined;
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
        return undefined;
      }
      if (
        tile.refine === "REPLACE" &&
        this.opportunisticRatio > 0 &&
        state.sse >
          this.memoryAdjustedScreenSpaceError * this.opportunisticRatio
      ) {
        const finer = this.fromCache(tile, view, pass, rootError, result);
        if (finer) {
          return finer;
        }
      }
      return own;
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
        if (isVisible(child.viewState(view.id))) {
          const d = this.display(
            child,
            view,
            pass,
            rootError,
            childLevels,
            childGroup,
            result,
          );
          if (d) {
            parts.push(...d);
          }
        }
      }
      return parts;
    }

    // REPLACE: the visible children must all be coverable.
    const parts: Tile[] = [];
    let complete = true;
    for (const child of tile.children) {
      if (!isVisible(child.viewState(view.id))) {
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
      if (d) {
        parts.push(...d);
      } else {
        complete = false;
      }
    }
    if (complete) {
      return parts;
    }
    // Only real content covers the region; an empty tile can't, so the
    // nearest loaded ancestor keeps drawing.
    if (own !== undefined && own.length > 0) {
      return own;
    }
    return undefined;
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
