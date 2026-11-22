// A stand-in pick result (`View.pick`) for tests that fake a view's picks.
import type { CameraRecord } from "../packages/core/src/scene/Camera.ts";
import type { FrameKey } from "../packages/core/src/camera/frameResolver.ts";
import type { PickResult } from "../packages/core/src/scene/View.ts";

const RECORD: CameraRecord = {
  width: 1,
  height: 1,
  fx: 1,
  fy: 1,
  cx: 0.5,
  cy: 0.5,
  skew: 0,
  pose: {
    position: new Float64Array(3),
    direction: Float64Array.of(0, 0, -1),
    up: Float64Array.of(0, 1, 0),
    right: Float64Array.of(1, 0, 0),
    referenceFrame: { name: "test" } as unknown as FrameKey,
    seconds: 0,
  },
  distortion: { model: "none", coefficients: [] },
} as unknown as CameraRecord;

/** A pick of a host-keyed draw, its ID `id`, drawn by `draw` if given. */
export function standInPick(id: bigint, draw?: PickResult["draw"]): PickResult {
  return {
    ...(draw && { draw }),
    id,
    key: { kind: "host", item: "", key: `stand-in ${id}` },
    scope: "global",
    labels: {},
    name: undefined,
    basis: "surface",
    camera: RECORD,
    time: { seconds: 0 },
  };
}
