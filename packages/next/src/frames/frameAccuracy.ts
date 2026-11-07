// A frame's stated accuracy (plan 4b, Task 7b: "the library composes; the
// app only declares"). `pointAccuracy` (pointAccuracy.ts) composes it.
//
// Every figure is 1σ. Confidence levels, correlated terms and per-direction
// error ellipsoids are plan 5 (CESIUM2_WEBGPU_PLAN.md §13.14).

/**
 * A frame's edge to its parent, as accurate as it is stated to be (1σ):
 *
 * - `meters`, a position error: the whole frame may sit this far from where
 *   its edge puts it (a survey, a link's length tolerance);
 * - `radians`, a rotation error about the frame's own origin (an encoder,
 *   the Earth's orientation): a point `d` metres from that origin moves by
 *   up to `radians × d`;
 * - `byDefinition`, the edge is a convention with no error to state (an
 *   adopted constant, a frame defined at a chosen point); `meters` and
 *   `radians` are then absent.
 *
 * With none of the three the accuracy is not stated, and `note` says why.
 * `note` always says where the figure comes from. A figure is never 0, NaN
 * or negative (the constructor throws, naming the frame).
 */
export interface FrameAccuracy {
  meters?: number;
  radians?: number;
  byDefinition?: true;
  note: string;
}

/** A frame built without an accuracy: not stated. */
export const NOT_STATED: FrameAccuracy = {
  note: "not stated: the frame was built without an accuracy",
};

/** Whether `a` states no size at all (not stated, not known). */
export const isUnstated = (a: FrameAccuracy): boolean =>
  a.byDefinition !== true && a.meters === undefined && a.radians === undefined;

/**
 * `a` checked: each figure finite and positive, and `byDefinition` alone.
 * Throws a `RangeError` naming `frame` otherwise.
 */
export function checkedAccuracy(
  frame: string,
  a: FrameAccuracy,
): FrameAccuracy {
  for (const key of ["meters", "radians"] as const) {
    const v = a[key];
    if (v !== undefined && !(Number.isFinite(v) && v > 0)) {
      throw new RangeError(
        `Frame "${frame}": accuracy.${key} must be a finite positive number (1σ), not ${v}; state an exact edge with byDefinition`,
      );
    }
  }
  if (
    a.byDefinition === true &&
    (a.meters !== undefined || a.radians !== undefined)
  ) {
    throw new RangeError(
      `Frame "${frame}": an accuracy that is exact by definition states no meters or radians`,
    );
  }
  return a;
}
