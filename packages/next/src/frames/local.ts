import { mat4 } from "../math/mat4.ts";
import { eastNorthUpToFixedFrame, isOnPolarAxis } from "../math/transforms.ts";
import type { Ellipsoid } from "../math/ellipsoid.ts";
import type { Instant } from "../time/Instant.ts";
import type { World } from "../scene/World.ts";
import type { TransformHandle } from "../scene/world/types.ts";
import { Frame, frameTransform, type FrameOptions } from "./Frame.ts";

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
 * `ellipsoid`: a constant child of `bodyFixed`. "Up" is the geodetic normal
 * at the position's foot on the ellipsoid (the normal through its
 * cartographic latitude). This matches the engineering frame's rigid
 * placement. It differs from the ellipsoid's gradient normal at `position`
 * itself, which `eastNorthUpToFixedFrame` (the engine's helper) keeps so
 * that Earth-only scenes render unchanged, by about 0.13 µrad at 250 m
 * height. `options.accuracy` states the placement's
 * accuracy (1σ); a frame defined at a chosen point is exact by definition.
 */
export function eastNorthUpFrame<N extends string>(
  name: N,
  bodyFixed: Frame,
  ellipsoid: Ellipsoid,
  position: ArrayLike<number>,
  options?: Pick<FrameOptions, "accuracy">,
): Frame<N> {
  const p = Float64Array.from(position);
  const m = eastNorthUpToFixedFrame(p, ellipsoid, mat4());
  // Off the polar axis, up is the normal at the foot, not the gradient at
  // `position`. The foot shares the position's meridian, so the horizontal
  // direction comes from x and y (exact, even a few meters from the pole);
  // the normal gives only how far up it leans.
  const foot = isOnPolarAxis(p[0]!, p[1]!)
    ? undefined
    : ellipsoid.scaleToGeodeticSurface(p, new Float64Array(3));
  if (foot !== undefined) {
    const normal = ellipsoid.geodeticSurfaceNormal(foot, new Float64Array(3))!;
    const horizontal = Math.hypot(normal[0]!, normal[1]!);
    const lon = Math.atan2(p[1]!, p[0]!);
    const sinLon = Math.sin(lon);
    const cosLon = Math.cos(lon);
    const cosLat = horizontal / Math.hypot(horizontal, normal[2]!);
    const sinLat = normal[2]! / Math.hypot(horizontal, normal[2]!);
    m[0] = -sinLon;
    m[1] = cosLon;
    m[4] = -sinLat * cosLon;
    m[5] = -sinLat * sinLon;
    m[6] = cosLat;
    m[8] = cosLat * cosLon;
    m[9] = cosLat * sinLon;
    m[10] = sinLat;
  }
  return Frame.constant(name, bodyFixed, m, options);
}

/**
 * A frame placed by a world transform, as a child of the Earth-fixed
 * frame. Uncached: it reads `world.worldMatrix` on every call, so moving
 * the transform moves the frame even at the same instant (R6). Its
 * `revision` follows the transform: it goes up when the transform's world
 * matrix (its own or a parent's move) differs from the one last seen.
 */
class WorldTransformFrame<N extends string> extends Frame<N> {
  private readonly seen = new Float64Array(16);
  private readonly now = new Float64Array(16);
  private moves = 0;
  private known = false;

  constructor(
    name: N,
    private readonly world: World,
    private readonly handle: TransformHandle,
    earthFixed: Frame,
  ) {
    super(
      name,
      earthFixed,
      (_instant, out) => {
        world.worldMatrix(handle, out as Float64Array<ArrayBuffer>);
      },
      { cache: false },
    );
  }

  override get revision(): number {
    this.world.worldMatrix(this.handle, this.now);
    if (!this.known) {
      this.known = true;
      this.seen.set(this.now);
    } else if (this.now.some((v, i) => v !== this.seen[i])) {
      this.seen.set(this.now);
      this.moves++;
    }
    return this.moves + super.revision;
  }
}

/** A frame placed by a world transform; see `WorldTransformFrame`. */
export function worldTransformFrame<N extends string>(
  name: N,
  world: World,
  handle: TransformHandle,
  earthFixed: Frame,
): Frame<N> {
  return new WorldTransformFrame(name, world, handle, earthFixed);
}
