// What a view keeps of its anchors' placements between ticks (`viewAnchors.ts`).
// Scene data.
import { MAX_ANCHORS } from "../render/layout.ts";
import type { AnchorHandle } from "./world/types.ts";
import type { World } from "./World.ts";

/** @internal One per view, made once with it. */
export class ViewAnchorState {
  // ------------------------------------------------------- anchor placements

  /** Render space ← anchor, by slot (16 float64 each); slot 0: no anchor. */
  readonly placements = new Float64Array(MAX_ANCHORS * 16);
  /**
   * The anchor each slot's placement was set for; a slot whose anchor was
   * removed (and the slot reused) reads as the identity again.
   */
  readonly placementOwners: Array<AnchorHandle | undefined> = [];
  /** Slots whose placement is not the identity. */
  readonly placed = new Uint8Array(MAX_ANCHORS);
  anchorRevision_ = 0;
  /** The world and its `anchorRemovals` the placements were last checked against. */
  anchorsWorld: World | undefined;
  anchorsRemovals = 0;
}
