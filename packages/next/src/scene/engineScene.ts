// An engine's scene data: its views' cameras, tick timing and what tilesets
// select for, whichever renderer draws them. The rasterizer's half is
// `EngineRaster`.
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

/** @internal One per engine, made once with it, and filled by its constructor. */
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
  renderRequested = true;

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
  /** `selectionCasters`' fit (the frame's own is `cascades`). */
  readonly selectionCascades = createShadowCascades();
  lastUpdateAt = 0;
  /** Time since the previous update, ms (60 Hz until measured). */
  lastUpdateInterval = 1000 / 60;
  budgetFilled = false;
  readonly frameIntervals = new Float64Array(31);
  frameIntervalCount = 0;
  /**
   * What is left of this frame's budget: upload bytes, and main-
   * thread time for building external tilesets' tile trees (at least one
   * of each happens per frame).
   */
  readonly uploadBudget = { bytes: 0, uploads: 0, ms: 0, trees: 0 };
  tilesetRotation = 0;
}
