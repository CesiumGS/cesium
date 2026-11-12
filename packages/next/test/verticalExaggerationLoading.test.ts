// The vertical-exaggeration page's loading card: what it says while the view waits, and when it goes for good.
import { describe, expect, it } from "vitest";
import {
  createLoading,
  loadingStage,
  type LoadingState,
} from "../examples/vertical-exaggeration/loading.ts";
import type { WarpStats } from "../src/scene/world/warps.ts";

function state(
  over: {
    exact?: number;
    pending?: number;
    waiting?: number;
  },
  buildings: LoadingState["buildings"],
): LoadingState {
  const stats: WarpStats = {
    fitsRun: 0,
    refits: 0,
    placed: 0,
    replaced: 0,
    moved: 0,
    pending: over.pending ?? 0,
    draws: {
      total: 0,
      fitted: 0,
      stale: 0,
      pending: over.waiting ?? 0,
      exact: over.exact ?? 0,
      routed: 0,
    },
  };
  return { stats, buildings };
}

describe("loadingStage", () => {
  it("names the terrain, then the buildings, then the fits left", () => {
    expect(loadingStage(state({}, "loading"))).toBe("Loading terrain…");
    expect(loadingStage(state({ pending: 3 }, "waiting"))).toBe(
      "Loading terrain…",
    );
    expect(loadingStage(state({ exact: 1 }, "loading"))).toBe(
      "Loading Cesium OSM Buildings…",
    );
    expect(
      loadingStage(state({ exact: 5, pending: 2, waiting: 1 }, "drawn")),
    ).toBe("Fitting 3 tiles to the exaggeration…");
    expect(loadingStage(state({ exact: 5, pending: 1 }, "failed"))).toBe(
      "Fitting 1 tile to the exaggeration…",
    );
  });

  it("is silent once the terrain and buildings are drawn and nothing is pending", () => {
    expect(loadingStage(state({ exact: 5 }, "drawn"))).toBeUndefined();
    // Buildings that failed aren't waited for.
    expect(loadingStage(state({ exact: 5 }, "failed"))).toBeUndefined();
  });
});

describe("createLoading", () => {
  it("holds its last stage for a quiet check or two, then is done for good", () => {
    const loading = createLoading(2);
    expect(loading.update(state({}, "loading"))).toBe("Loading terrain…");
    expect(loading.update(state({ exact: 1, pending: 4 }, "drawn"))).toBe(
      "Fitting 4 tiles to the exaggeration…",
    );
    // One quiet check: still shown.
    expect(loading.update(state({ exact: 1 }, "drawn"))).toBe(
      "Fitting 4 tiles to the exaggeration…",
    );
    expect(loading.done).toBe(false);
    // A fit queued again resets it.
    expect(loading.update(state({ exact: 1, pending: 1 }, "drawn"))).toBe(
      "Fitting 1 tile to the exaggeration…",
    );
    expect(loading.update(state({ exact: 1 }, "drawn"))).toBeDefined();
    expect(loading.update(state({ exact: 1 }, "drawn"))).toBeUndefined();
    expect(loading.done).toBe(true);
    // Never again: a camera that moves loads more tiles.
    expect(loading.update(state({ exact: 1, pending: 9 }, "drawn"))).toBe(
      undefined,
    );
  });
});
