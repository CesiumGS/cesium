// What tile selection asks of the depth pyramid, and what it is told (plan
// Task 12, fix 7: occlusion feedback to selection). The GPU side is
// render/view/occlusionPass.ts; the per-view bookkeeping, scene/occlusionFeedback.ts.
//
// A tile that the view's own drawn depth hides, for `OCCLUDED_TICKS` results in
// a row, stops refining (`Budgeted`). It is never taken out of what is drawn:
// a stale result can delay a refinement by a tick or two, and never opens a
// hole.
import type { Tile, TileViewState } from "./Tile.ts";
import type { TileVolume } from "./volumes.ts";

/** Boxes a view asks about in one tick. */
export const MAX_QUERIES = 8192;
/** Floats a query takes: a centre and three half-axes, camera-relative. */
export const QUERY_FLOATS = 12;
/** Results in a row, each a tick's, before an occluded tile stops refining. */
export const OCCLUDED_TICKS = 2;
/**
 * Ticks a result stays good for. A tile no tick asked about (it left the
 * view's walk) is unknown again after this, and so counts as visible.
 */
export const RESULT_MAX_AGE = 8;
/**
 * Which occlusion feedback a benchmark result was measured with
 * (`RunMetrics.occlusionFeedback`): absent, none; 1, tile boxes against the
 * tick's own depth pyramid, two results in a row. Requests, bytes and draws
 * shift with it where there is relief, so results of the two aren't compared
 * blindly.
 */
export const OCCLUSION_FEEDBACK_VERSION = 1;

/** What a policy sees of a view's occlusion feedback (`SelectionView.occlusion`). */
export interface ViewOcclusion {
  /**
   * Asks, for the next results, whether `volume` (the tile's, as selection
   * tests it) is hidden by what the view draws. Boxes past `MAX_QUERIES`
   * aren't asked about, and stay unknown.
   */
  query(tile: Tile, volume: TileVolume): void;
  /**
   * Whether the tile has been hidden for `OCCLUDED_TICKS` results in a row,
   * lately; false for unknown.
   */
  occluded(state: TileViewState): boolean;
}
