// A `View.pickPosition` answer for fakes (CS-814): the position with the
// camera record the pick would have used.
import { Camera } from "../packages/next/src/scene/Camera.ts";
import type { PickPositionResult } from "../packages/next/src/scene/View.ts";

/**
 * `position` (undefined: over the sky) with `camera`'s record for a
 * `width` × `height` CSS-pixel image (default: a centered camera's, 1 × 1).
 */
export function positionHit(
  position: Float64Array | undefined,
  camera: Camera = new Camera(),
  width = 1,
  height = 1,
): PickPositionResult | undefined {
  return (
    position && {
      position,
      cameraRecord: camera.record(width, height, { name: "fake" }, 0),
    }
  );
}
