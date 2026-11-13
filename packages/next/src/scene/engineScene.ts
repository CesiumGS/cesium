// An engine's scene data: its views' cameras, tick timing and what tilesets
// select for, whichever renderer draws them. The rasterizer's half is
// `EngineRaster`.
import { MORPH_SECONDS, transitionSeconds } from "../streaming/tileMorph.ts";
import { WorkerPool } from "../io/WorkerPool.ts";
import { Camera } from "./Camera.ts";
import { createAnchorEyes } from "./anchorEyes.ts";
import { createShadowCascades } from "./shadows.ts";
import type { View } from "./View.ts";
import type { ViewMotion } from "./tileSelection.ts";
import type { TerrainLoader } from "../globe/TerrainSource.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { TerrainTileInfo } from "../globe/quantizedMesh.ts";
import type { World } from "./World.ts";
import type { AnchorHandle } from "./world/types.ts";
import type { SelectionView } from "../streaming/Stepwise.ts";

/** One per engine, made once with it, and filled by its constructor. */
export class EngineScene {
  readonly workers = new WorkerPool();
  /** Stable per-view bit index (0–31) for record view masks. */
  readonly viewIds = new Map<View, number>();
  readonly viewMotion = new Map<View, ViewMotion>();
  readonly aheadCamera = new Camera();
  /**
   * Counts the loop's ticks (after their listeners) and renders: a body
   * camera computed in an earlier one is computed again, so a camera
   * written in place without `version++` is never drawn stale.
   */
  cameraTick = 0;
  /** The view being written's anchor table, float64 (`writeView`). */
  readonly anchorEyes = createAnchorEyes();
  /** When the engine was created (`performance.now()`): views' `time`. */
  readonly startTime = performance.now();
  /** When the last render began (`performance.now()` ms; 0: none yet). */
  lastRenderAt = 0;
  /**
   * The smoothed interval between rendered frames, ms (0: not yet known):
   * what `transitionSeconds` stretches the transitions by.
   */
  frameIntervalMs = 0;
  /**
   * How long a geomorph or an imagery cross-fade takes now, seconds
   * (`transitionSeconds`): computed once per render, written into the view
   * block, and read by the tilesets for when their transitions end.
   */
  transitionSeconds = MORPH_SECONDS;
  renderRequested = true;

  /**
   * A render begins at `nowMs` (`performance.now()`): updates the smoothed
   * interval between renders (a gap of a second or more is an idle loop, not
   * the cadence) and with it the transitions' duration, once for the render.
   */
  beginRender(nowMs: number): void {
    const gap = nowMs - this.lastRenderAt;
    if (this.lastRenderAt > 0 && gap < 1000) {
      this.frameIntervalMs =
        this.frameIntervalMs === 0
          ? gap
          : this.frameIntervalMs * 0.8 + gap * 0.2;
    }
    this.lastRenderAt = nowMs;
    this.transitionSeconds = transitionSeconds(this.frameIntervalMs);
  }

  readonly terrainLoader = (
    request: Parameters<TerrainLoader>[0],
    signal: AbortSignal,
  ) =>
    this.workers.request<{ asset: GltfAsset; info: TerrainTileInfo }>(
      "terrain",
      request,
      signal,
    );
  /** `selectionFor`'s inputs of the current update, by world and anchor. */
  readonly selections = new Map<World, Map<AnchorHandle, SelectionView[]>>();
  /** The prefetch camera re-expressed in such an anchor. */
  readonly selectionAhead = new Camera();
  /** `selectionCasters`' fit (the tick's own is `cascades`). */
  readonly selectionCascades = createShadowCascades();
  lastUpdateAt = 0;
  /** Time since the previous update, ms (60 Hz until measured). */
  lastUpdateInterval = 1000 / 60;
  budgetFilled = false;
  readonly frameIntervals = new Float64Array(31);
  frameIntervalCount = 0;
  /**
   * What is left of this tick's budget: upload bytes, and main-
   * thread time for building external tilesets' tile trees (at least one
   * of each happens per tick).
   */
  readonly uploadBudget = {
    /** Scale of the per-tick limits this tick (uploadScale). */
    scale: 1,
    bytes: 0,
    uploads: 0,
    ms: 0,
    /** CPU left for uploads this tick, ms (Infinity at 1x or less). */
    uploadMs: Infinity,
    trees: 0,
  };
  /** Content was still waiting to upload when the last update ended. */
  uploadsWaiting = false;
  tilesetRotation = 0;
}
