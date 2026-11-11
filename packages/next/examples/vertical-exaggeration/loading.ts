import type { WarpStats } from "@cesium/next";

/** What the page knows of its content as it loads. */
export interface LoadingState {
  /** The world's warp counts (`World.warpStats`). */
  readonly stats: WarpStats;
  /** The tileset of buildings: not asked for yet, asked for, drawing something, or failed. */
  readonly buildings: "waiting" | "loading" | "drawn" | "failed";
}

/**
 * What the view is waiting for, in words for the overlay; undefined once the
 * terrain is drawn, the buildings are drawn (or won't be), and no fit is
 * pending. Terrain counts as drawn from its first exact draw.
 */
export function loadingStage(state: LoadingState): string | undefined {
  const { stats, buildings } = state;
  const waiting = stats.pending + stats.draws.pending;
  if (stats.draws.exact === 0) {
    return "Loading terrain…";
  }
  if (buildings === "waiting" || buildings === "loading") {
    return "Loading Cesium OSM Buildings…";
  }
  if (waiting > 0) {
    return `Fitting ${waiting.toLocaleString("en-US")} ${waiting === 1 ? "tile" : "tiles"} to the exaggeration…`;
  }
  return undefined;
}

/**
 * The overlay's lifetime: it is shown until `loadingStage` has said nothing
 * for `settle` checks in a row, then never again (a camera that moves loads
 * more tiles, which the view is not held for).
 */
export function createLoading(settle = 2): {
  /** The stage to show, or undefined once done. */
  update(state: LoadingState): string | undefined;
  readonly done: boolean;
} {
  let quiet = 0;
  let done = false;
  let last = "Loading terrain…";
  return {
    update(state) {
      if (done) {
        return undefined;
      }
      const stage = loadingStage(state);
      if (stage === undefined) {
        if (++quiet >= settle) {
          done = true;
          return undefined;
        }
        return last;
      }
      quiet = 0;
      last = stage;
      return stage;
    },
    get done() {
      return done;
    },
  };
}
