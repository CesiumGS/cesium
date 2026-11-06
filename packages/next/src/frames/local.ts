import { mat4 } from "../math/mat4.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type { Ellipsoid } from "../math/ellipsoid.ts";
import type { Instant } from "../time/Instant.ts";
import type { TransformHandle, World } from "../scene/World.ts";
import { Frame, frameTransform } from "./Frame.ts";

/**
 * A position tagged with the frame it is expressed in, in meters. A point
 * on a moving object carries the `instant` it is valid at.
 */
export interface FramePoint<N extends string = string> {
  readonly frame: Frame<N>;
  readonly position: Float64Array;
  readonly instant?: Instant;
}

/** Tags a copy of `position` with `frame` (and optionally an instant). */
export function framePoint<N extends string>(
  frame: Frame<N>,
  position: ArrayLike<number>,
  instant?: Instant,
): FramePoint<N> {
  const copy = Float64Array.from(position);
  return instant
    ? { frame, position: copy, instant }
    : { frame, position: copy };
}

const scratch = mat4();

/**
 * Re-expresses `point` in frame `to`. The instant defaults to the point's
 * own; giving a different one throws, since a moving point's position is
 * only valid at its instant. Throws when there is no instant at all.
 */
export function convertPoint<M extends string>(
  point: FramePoint,
  to: Frame<M>,
  instant?: Instant,
): FramePoint<M> {
  if (point.instant && instant && point.instant.tt !== instant.tt) {
    throw new Error(
      "convertPoint: the point is valid at another instant than the one asked for",
    );
  }
  const at = instant ?? point.instant;
  if (!at) {
    throw new Error("convertPoint: no instant, on the point or as an argument");
  }
  const m = frameTransform(point.frame, to, at, scratch);
  const x = point.position[0]!,
    y = point.position[1]!,
    z = point.position[2]!;
  return framePoint(
    to,
    [
      m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
      m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
      m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
    ],
    at,
  );
}

/**
 * The east-north-up frame at `position` (meters, in `bodyFixed`) on
 * `ellipsoid`: a constant child of `bodyFixed`.
 */
export function eastNorthUpFrame<N extends string>(
  name: N,
  bodyFixed: Frame,
  ellipsoid: Ellipsoid,
  position: ArrayLike<number>,
): Frame<N> {
  const m = eastNorthUpToFixedFrame(
    Float64Array.from(position),
    ellipsoid,
    mat4(),
  );
  return Frame.constant(name, bodyFixed, m);
}

/**
 * A frame placed by a world transform, as a child of the Earth-fixed
 * frame. Uncached: it reads `world.worldMatrix` on every call, so moving
 * the transform moves the frame even at the same instant (R6).
 */
export function worldTransformFrame<N extends string>(
  name: N,
  world: World,
  handle: TransformHandle,
  earthFixed: Frame,
): Frame<N> {
  return new Frame(
    name,
    earthFixed,
    (_instant, out) => {
      world.worldMatrix(handle, out as Float64Array<ArrayBuffer>);
    },
    { cache: false },
  );
}
