import type { WarpStats } from "@cesium/next";
import {
  createRefinement,
  type RefinementSource,
  type RefinementView,
} from "../refinement.ts";

/** What the page knows of its content as it loads. */
export interface LoadingState {
  /** The world's warp counts (`World.warpStats`). */
  readonly stats: WarpStats;
  /** The tileset of buildings: not asked for yet, asked for, drawing something, or failed. */
  readonly buildings: "waiting" | "loading" | "drawn" | "failed";
  /** Tiles still in flight or waiting for their upload, in the globe and the buildings. */
  readonly tiles?: number;
}

/** Whether anything is on screen: terrain by its exact term, a draw that has its warp, or the buildings. */
export function hasDrawn(state: LoadingState): boolean {
  const { draws } = state.stats;
  return (
    draws.exact > 0 ||
    draws.fitted + draws.stale > 0 ||
    state.buildings === "drawn"
  );
}

/**
 * What the first draw waits for, in words for the card; undefined once
 * something is on screen. Everything after that is refinement (a chip), not a
 * gate: the view is live.
 */
export function loadingStage(state: LoadingState): string | undefined {
  return hasDrawn(state) ? undefined : "Loading terrain…";
}

/** The refinement sources of a state: tiles still arriving, fits still pending. */
export function refinementSources(
  state: LoadingState,
): readonly RefinementSource[] {
  return [
    { one: "tile", many: "tiles", count: () => state.tiles ?? 0 },
    {
      one: "fit",
      many: "fits",
      count: () => state.stats.pending + state.stats.draws.pending,
    },
  ];
}

/**
 * The card's and the chip's lifetimes: the card goes for good at the first
 * draw; the chip counts what is still refining, comes and goes with it, and
 * is held `hold` checks past the last so that it doesn't flicker.
 */
export function createLoading(hold = 3): {
  update(state: LoadingState): RefinementView;
} {
  const refinement = createRefinement({ hold });
  return {
    update(state) {
      return refinement.update({
        drawn: hasDrawn(state),
        waitingFor: "Loading terrain…",
        sources: refinementSources(state),
      });
    },
  };
}
