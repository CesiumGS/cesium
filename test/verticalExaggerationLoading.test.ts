// The vertical-exaggeration page's loading card and refinement chip: the card
// names what the first draw waits for and goes at that draw; after it the view
// only refines, and a chip counts what is left.
import { describe, expect, it } from "vitest";
import {
  createLoading,
  hasDrawn,
  loadingStage,
  type LoadingState,
} from "../examples/vertical-exaggeration/loading.ts";
import type { CurvilinearStats } from "../packages/next/src/scene/world/worldCurvilinearMaps.ts";

function state(
  over: {
    exact?: number;
    pending?: number;
    waiting?: number;
    fitted?: number;
    tiles?: number;
  },
  buildings: LoadingState["buildings"],
): LoadingState {
  const stats: CurvilinearStats = {
    fitsRun: 0,
    refits: 0,
    placed: 0,
    replaced: 0,
    moved: 0,
    pending: over.pending ?? 0,
    draws: {
      total: 0,
      fitted: over.fitted ?? 0,
      stale: 0,
      pending: over.waiting ?? 0,
      exact: over.exact ?? 0,
      routed: 0,
    },
    variants: { groups: 0, draws: 0 },
  };
  return { stats, buildings, tiles: over.tiles ?? 0 };
}

describe("loadingStage", () => {
  it("names the terrain until something draws, then nothing", () => {
    expect(loadingStage(state({}, "loading"))).toBe("Loading terrain…");
    expect(loadingStage(state({ pending: 3, tiles: 9 }, "waiting"))).toBe(
      "Loading terrain…",
    );
    expect(loadingStage(state({ exact: 1 }, "loading"))).toBeUndefined();
    expect(loadingStage(state({ fitted: 2 }, "waiting"))).toBeUndefined();
    expect(loadingStage(state({}, "drawn"))).toBeUndefined();
  });

  it("does not hold the card for buildings, fits or tiles still arriving", () => {
    expect(
      hasDrawn(
        state({ exact: 5, pending: 2, waiting: 1, tiles: 12 }, "loading"),
      ),
    ).toBe(true);
  });
});

describe("createLoading", () => {
  it("drops the card at the first draw and shows what still refines in a chip", () => {
    const loading = createLoading(2);
    const first = loading.update(state({ tiles: 4 }, "loading"));
    expect(first.card).toBe("Loading terrain…");
    expect(first.chip).toBeUndefined();
    const drawn = loading.update(
      state({ exact: 1, pending: 2, waiting: 1, tiles: 12 }, "loading"),
    );
    expect(drawn.card).toBeUndefined();
    expect(drawn.chip).toBe("Refining · 12 tiles, 3 fits");
    expect(drawn.converged).toBe(false);
    expect(
      loading.update(state({ exact: 1, tiles: 1, pending: 1 }, "drawn")).chip,
    ).toBe("Refining · 1 tile, 1 fit");
  });

  it("holds the chip a check or two past the last work, then converges", () => {
    const loading = createLoading(2);
    loading.update(state({ exact: 1, tiles: 3 }, "drawn"));
    expect(loading.update(state({ exact: 1 }, "drawn")).chip).toBeDefined();
    expect(loading.update(state({ exact: 1 }, "drawn")).chip).toBeDefined();
    const done = loading.update(state({ exact: 1 }, "drawn"));
    expect(done.chip).toBeUndefined();
    expect(done.converged).toBe(true);
  });

  it("never brings the card back, and the chip returns when a moving camera loads more", () => {
    const loading = createLoading(1);
    loading.update(state({ exact: 1 }, "drawn"));
    loading.update(state({ exact: 1 }, "drawn"));
    loading.update(state({ exact: 1 }, "drawn"));
    const more = loading.update(state({ exact: 0, tiles: 7 }, "drawn"));
    expect(more.card).toBeUndefined();
    expect(more.chip).toBe("Refining · 7 tiles");
  });
});
