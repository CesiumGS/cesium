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
 * - **Free detail from the shared cache** (off by default since r38):
 *   where finer content is already resident (another view loaded it, or the
 *   camera zoomed out), it can be drawn instead of the coarser frontier
 *   tile, down to `opportunisticRatio` of the threshold, at no download
 *   cost. It makes a still view depend on where the camera has been
 *   (Rainier's hazy patch; Google's settled views finer after an orbit:
 *   selection parity 0.066 vs 0.024 without, quality in motion 0.046 vs
 *   0.020), and costs draws. Zooming out, resident finer content still
 *   stands in while the coarser tile loads.
 * - A tileset without a top-level geometricError uses its root's (1.x
 *   computes NaN and never skips the root).
 */
import {
  StepwiseSelection,
  isVisible,
  type StepwiseOptions,
  type RequestPurpose,
  type SelectionResult,
  type SelectionView,
} from "./Stepwise.ts";
import { CLIP_BOXES } from "../render/layout.ts";
import type { Tile, TileViewState } from "./Tile.ts";
import { OUTSIDE, aboveHorizon, volumeIntersectPlane } from "./volumes.ts";

export interface BudgetedOptions extends StepwiseOptions {
  /**
   * Levels that may be skipped between a loaded ancestor and the frontier
   * before an intermediate level is loaded too (default 2), so regions
   * improve in steps instead of all at once.
   */
  skipLevels?: number;
  /**
   * Draw cached finer content while its SSE is above this fraction of the
   * threshold (0 disables, the default; 0.25: up to two levels finer).
   */
  opportunisticRatio?: number;
  /**
   * Content the camera is about to reveal (`SelectionView.prefetchPlanes`)
   * loads at this multiple of the SSE threshold (default 2: about a quarter
   * of the bytes of full detail), so rotating and panning reveal loaded
   * content. 0 disables prefetching.
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
  /**
   * Loading in motion by benefit: while the camera moves, a tile whose
   * time on screen (the field of view over how fast it crosses it) is
   * shorter than this many typical load times is not requested; what is
   * drawn stays until it slows. 1.x's `cullRequestsWhileMoving` is a
   * cruder form (60 frames' travel against the tile's diameter). 0 loads
   * everything in motion. Default 1.
   */
  motionBenefit?: number;
}

/** Request priority bands: base levels, then intermediates, then frontier. */
const BASE = 0;
const INTERMEDIATE = 1e11;
const FRONTIER = 1e12;
/** Content outside the view, after everything visible. */
const PREFETCH = 1e13;
/** No renderable ancestor is loaded (or requested) in this region yet. */
const NONE = Number.POSITIVE_INFINITY;
/** Levels below a missing frontier tile searched for resident content. */
const RESIDENT_DEPTH = 4;

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

export class BudgetedSelection extends StepwiseSelection {
  opportunisticRatio: number;
  skipLevels: number;
  prefetchErrorScale: number;
  mixedLod: "auto" | "always" | "never";
  motionBenefit: number;
  /** Set by the tileset each update (`TileSelection`). */
  expectedLoadSeconds?: number;
  /**
   * Cull against the ellipsoid's horizon. Off for views that look through
   * or under the surface (underground content, a see-through globe).
   */
  horizonCulling = true;
  readonly prefetchAfterVisible = true;

  constructor(options: BudgetedOptions = {}) {
    super(options);
    this.opportunisticRatio = options.opportunisticRatio ?? 0;
    this.skipLevels = options.skipLevels ?? 2;
    this.prefetchErrorScale = options.prefetchErrorScale ?? 2;
    this.mixedLod = options.mixedLod ?? "auto";
    this.motionBenefit = options.motionBenefit ?? 1;
  }

  /**
   * 1.x visibility plus the ellipsoid's horizon (1.x culls only the globe
   * this way): content past the horizon is neither drawn nor fetched.
   */
  protected override updateVisibility(
    tile: Tile,
    state: TileViewState,
    view: SelectionView,
    pass: number,
  ): void {
    if (state.updated === pass) {
      return;
    }
    super.updateVisibility(tile, state, view, pass);
    if (
      state.visible &&
      this.horizonCulling &&
      !aboveHorizon(tile, view.position)
    ) {
      state.visible = false;
    }
  }

  /** The band a request's priority falls in. */
  purpose(priority: number): RequestPurpose {
    return priority < INTERMEDIATE
      ? "base"
      : priority < FRONTIER
        ? "intermediate"
        : priority < PREFETCH
          ? "view"
          : "prefetch";
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
    if (result.standIns) {
      // Only those still drawn: an ancestor may have held instead.
      const selected = new Set(result.selected);
      result.standIns = result.standIns.filter((t) => selected.has(t));
    }
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
    const own: Tile[] | undefined = this.drawable(tile, result)
      ? [tile]
      : tile.renderable
        ? undefined
        : []; // empty, or an external tileset already expanded
    // An expanded external tileset always refines (its root is its only
    // child); an empty tile only when its error is visible, as in 1.x: an
    // empty tile that meets the SSE means nothing below needs drawing.
    const refine =
      tile.children.length > 0 &&
      ((tile.external && !tile.renderable) ||
        state.sse > this.memoryAdjustedScreenSpaceError);

    if (!refine) {
      // Frontier tile.
      if (own === undefined) {
        if (this.worthLoading(tile, view)) {
          this.request(tile, FRONTIER + group, state.distance * 1e-3, result);
        }
        // Zooming out: finer content still resident keeps drawing until
        // this tile arrives.
        const finer =
          tile.refine === "REPLACE"
            ? this.fromCache(tile, view, pass, rootError, result)
            : undefined;
        if (finer) {
          return { tiles: finer, complete: true, holes: NO_HOLES };
        }
        // Not all of it: the finer content that is here still draws where
        // it covers (zooming out past levels skipped on the way in, the
        // region showed nothing until this tile arrived).
        const partial: Tile[] = [];
        if (tile.refine === "REPLACE" && tile.residentBelow > 0) {
          this.resident(tile, view, pass, rootError, result, partial, 0);
        }
        return { tiles: partial, complete: false, holes: [tile] };
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
      if (
        own.length > 0 &&
        state.sse > this.memoryAdjustedScreenSpaceError &&
        this.refinementPending(tile)
      ) {
        // The view wants it refined, but what lies below isn't known yet.
        (result.standIns ??= []).push(tile);
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
    } else if (levels > this.skipLevels && this.worthLoading(tile, view)) {
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
    let visible = 0;
    for (const child of tile.children) {
      if (!isVisible(child.viewState(view.id))) {
        this.prefetch(child, view, pass, rootError, result);
        continue;
      }
      visible++;
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
      // root. Only while most of the region is covered: zooming out, much
      // of it is newly visible, and holding left it empty where this tile
      // draws all of it (AEC zoom-out, throttled, FLIP avg against the
      // target: always holding 0.046, up to half missing 0.035, up to a
      // quarter 0.045; Stepwise 0.028).
      if (
        parts.length > 0 &&
        missing.length * 2 <= visible &&
        !drawnLastFrame(tile, view) &&
        parts.some((t) => drawnLastFrame(t, view))
      ) {
        return { tiles: parts, complete: false, holes };
      }
      // Drawn whole while its region refines: a stand-in.
      (result.standIns ??= []).push(tile);
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
      !insidePlanes(tile, planes) ||
      (this.horizonCulling && !aboveHorizon(tile, view.position))
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
      ((tile.external && !tile.renderable) ||
        state.sse >
          this.memoryAdjustedScreenSpaceError * this.prefetchErrorScale);
    // Content about to be revealed is worth it only if it then stays on
    // screen long enough (a flight prefetched 12 MB a second ahead of
    // thousands of km/s).
    if (
      tile.renderable &&
      (!refine || tile.refine === "ADD") &&
      this.worthLoading(tile, view)
    ) {
      this.request(tile, PREFETCH, state.distance, result);
    }
    if (refine) {
      for (const child of tile.children) {
        this.updateTile(child, view, pass, rootError);
        this.prefetch(child, view, pass, rootError, result);
      }
    }
  }

  /**
   * Whether the tile stays on screen long enough to be worth loading now
   * (`motionBenefit`): the field of view over how fast the tile moves
   * across it, its apparent motion from the camera's translation (only
   * across the line of sight: a tile straight ahead of a camera flying
   * toward it stays in view) less the camera's turning, as vectors. Adding
   * the two as speeds (r38, first version) made an orbit's near content,
   * which the turning holds still on screen, look fast: Google's quality
   * in motion fell to twice 1.x's.
   */
  private worthLoading(tile: Tile, view: SelectionView): boolean {
    const motion = view.motion;
    const load = this.expectedLoadSeconds;
    if (!motion || this.motionBenefit <= 0 || !load) {
      return true;
    }
    const c = tile.volume.sphere.center;
    const dx = c[0]! - view.position[0]!;
    const dy = c[1]! - view.position[1]!;
    const dz = c[2]! - view.position[2]!;
    const d = Math.max(Math.hypot(dx, dy, dz), tile.volume.sphere.radius, 1);
    const r = Math.max(Math.hypot(dx, dy, dz), 1e-6);
    const ux = dx / r;
    const uy = dy / r;
    const uz = dz / r;
    const v = motion.velocity;
    const along = v[0]! * ux + v[1]! * uy + v[2]! * uz;
    // The direction to the tile changes at −v⊥ / d (world); the camera's
    // frame turns at ω, moving a fixed direction u by −ω × u in it.
    const w = motion.angular;
    const sx = -(v[0]! - along * ux) / d - (w[1]! * uz - w[2]! * uy);
    const sy = -(v[1]! - along * uy) / d - (w[2]! * ux - w[0]! * uz);
    const sz = -(v[2]! - along * uz) / d - (w[0]! * uy - w[1]! * ux);
    const sweep = Math.hypot(sx, sy, sz); // rad/s across the view
    if (sweep <= 0) {
      return true;
    }
    const fov = 2 * Math.atan(view.sseDenominator / 2);
    return fov / sweep >= this.motionBenefit * load;
  }

  /** Loaded content that can draw now (terrain also waits for imagery). */
  /**
   * Whether finer content may exist below a tile whose children aren't
   * known yet (terrain waiting on availability); none for 3D Tiles.
   */
  protected refinementPending(_tile: Tile): boolean {
    return false;
  }

  protected drawable(tile: Tile, _result: SelectionResult): boolean {
    return tile.contentAvailable;
  }

  /**
   * Whatever resident content lies under `tile`'s visible children, the
   * coarsest drawable on each path, at most `RESIDENT_DEPTH` levels down.
   */
  private resident(
    tile: Tile,
    view: SelectionView,
    pass: number,
    rootError: number,
    result: SelectionResult,
    out: Tile[],
    depth: number,
  ): void {
    for (const child of tile.children) {
      if (child.state !== "ready" && child.residentBelow === 0) {
        continue;
      }
      this.updateTile(child, view, pass, rootError);
      if (!isVisible(child.viewState(view.id))) {
        continue;
      }
      result.touched.push(child);
      if (this.drawable(child, result)) {
        out.push(child);
      } else if (depth < RESIDENT_DEPTH && child.residentBelow > 0) {
        this.resident(child, view, pass, rootError, result, out, depth + 1);
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
      if (this.drawable(child, result)) {
        result.touched.push(child);
        const finer =
          child.refine === "REPLACE" &&
          this.opportunisticRatio > 0 &&
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
