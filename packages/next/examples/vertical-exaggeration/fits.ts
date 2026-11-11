import type { World } from "@cesium/next";

/** What the world's warp fits have done. */
export interface FitCounts {
  /** Per-vertex fits made since this watch began: one for each tile or draw as it first appears. */
  readonly run: number;
  /** Per-vertex fits asked again for something already fitted, because its route changed. The slider adds none. */
  readonly refits: number;
  /** Anchored draws (billboards, instances) placed again by a route or slider change: one route evaluation each, not a fit. */
  readonly replaced: number;
  /** Fits asked for and not yet run. */
  readonly queued: number;
  /** Stops counting. */
  stop(): void;
}

/**
 * Counts the fits the world makes, and those it is asked to redo. The engine
 * has no counter of its own, so this wraps the fit cache's `request` (its
 * keys say whether a draw is fitted per vertex or anchored), as the engine's
 * tests wrap its `run`; the one place this example reaches past the public
 * API.
 */
export function watchFits(world: World): FitCounts {
  const cache = world.warps.cache;
  const request = cache.request.bind(cache);
  const revisions = new Map<string, number>();
  let made = 0;
  let redone = 0;
  let placed = 0;
  cache.request = (key, root, revision, job) => {
    const anchored = key.endsWith(":anchor");
    const id = `${root}\u0000${key}`;
    const before = revisions.get(id);
    if (before !== undefined && before !== revision) {
      if (anchored) {
        placed++;
      } else {
        redone++;
      }
    }
    revisions.set(id, revision);
    return request(
      key,
      root,
      revision,
      anchored
        ? job
        : () => {
            made++;
            return job();
          },
    );
  };
  return {
    get run() {
      return made;
    },
    get refits() {
      return redone;
    },
    get replaced() {
      return placed;
    },
    get queued() {
      return world.warps.pending;
    },
    stop() {
      cache.request = request;
    },
  };
}
