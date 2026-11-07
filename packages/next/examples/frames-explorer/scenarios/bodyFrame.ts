// A moving body's frame from its track (Task 7): the drone's and the
// ship's. The app defines it with the library's public `Frame`
// constructor, a position and a rotation in its parent:
//
//  - x forward, along the track's horizontal velocity (the heading, an
//    azimuth from north in the local east-north-up frame);
//  - y to the left, z up (forward, left, up: right-handed);
//  - then pitched about y (nose up positive) and rolled about the pitched x
//    (the right side down positive), from `attitude`, or level.
//
// The track gives position and velocity in the parent (Earth-fixed, ITRF)
// at a TDB time. Light imports only: the page places the triads with it
// every frame and the worker evaluates the scenario with the same code.
import { Frame } from "../../../src/frames/Frame.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";

/** Where a body is, in its parent's coordinates (m, m/s), at a TDB time (s past J2000). */
export interface BodyTrack {
  at(tdb: number): { position: ArrayLike<number>; velocity: ArrayLike<number> };
}

/** Pitch (nose up) and roll (right side down), radians. */
export interface BodyAttitude {
  pitch: number;
  roll: number;
}

type V3 = [number, number, number];

const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const unit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};
const mix = (a: V3, ka: number, b: V3, kb: number): V3 => [
  ka * a[0] + kb * b[0],
  ka * a[1] + kb * b[1],
  ka * a[2] + kb * b[2],
];

/**
 * East, north and up at `position` (Earth-fixed m) on `ellipsoid`: up is
 * the geodetic normal at the point's foot on the ellipsoid (its geodetic
 * latitude and longitude), not the normal of the scaled ellipsoid through
 * the point, which tilts from it by about e²·h·sin 2φ / (2N), N the prime
 * vertical's radius (0.13 µrad at 250 m here, 0.5 µrad at 1 km): the hand
 * check caught it.
 */
export function enuAxes(
  position: ArrayLike<number>,
  ellipsoid: Ellipsoid = Ellipsoid.WGS84,
): { east: V3; north: V3; up: V3 } {
  const p = Float64Array.from(position);
  const foot = ellipsoid.scaleToGeodeticSurface(p, new Float64Array(3));
  const n = ellipsoid.geodeticSurfaceNormal(foot ?? p, new Float64Array(3));
  const up: V3 = n ? [n[0]!, n[1]!, n[2]!] : [0, 0, 1];
  // Off the polar axis east is square to the meridian; on it, x's east.
  const h = Math.hypot(up[0], up[1]);
  const east: V3 = h > 1e-12 ? [-up[1] / h, up[0] / h, 0] : [0, 1, 0];
  return { east, north: cross(up, east), up };
}

/**
 * The heading of `velocity` at `position`: its horizontal part's azimuth,
 * radians clockwise from north. North where it has no horizontal part (a
 * body standing still, or climbing straight up).
 */
export function headingOf(
  position: ArrayLike<number>,
  velocity: ArrayLike<number>,
  ellipsoid: Ellipsoid = Ellipsoid.WGS84,
): number {
  const { east, north } = enuAxes(position, ellipsoid);
  const e = dot(velocity, east);
  const n = dot(velocity, north);
  return Math.hypot(e, n) > 0 ? Math.atan2(e, n) : 0;
}

/**
 * The body's axes in its parent (x forward, y left, z up), heading from
 * the velocity, then pitched and rolled.
 */
export function bodyAxes(
  position: ArrayLike<number>,
  velocity: ArrayLike<number>,
  attitude: BodyAttitude = { pitch: 0, roll: 0 },
  ellipsoid: Ellipsoid = Ellipsoid.WGS84,
): { x: V3; y: V3; z: V3; heading: number } {
  const { east, north, up } = enuAxes(position, ellipsoid);
  const heading = headingOf(position, velocity, ellipsoid);
  const x0 = mix(east, Math.sin(heading), north, Math.cos(heading));
  const y0 = cross(up, x0);
  // Pitch about y: nose up is x toward z.
  const cp = Math.cos(attitude.pitch);
  const sp = Math.sin(attitude.pitch);
  const x1 = unit(mix(x0, cp, up, sp));
  const z1 = unit(mix(x0, -sp, up, cp));
  // Roll about the pitched x: right side down is y toward z.
  const cr = Math.cos(attitude.roll);
  const sr = Math.sin(attitude.roll);
  const y2 = unit(mix(y0, cr, z1, sr));
  const z2 = unit(mix(y0, -sr, z1, cr));
  return { x: x1, y: y2, z: z2, heading };
}

/**
 * A body's frame under `parent` from its track: the track's position, and
 * the rotation `bodyAxes` gives, from the horizontal velocity's heading and
 * `attitude`'s pitch and roll (level without it). It depends on the
 * instant alone, so the frame keeps the library's one-entry cache.
 */
export function trackFrame<N extends string>(
  name: N,
  parent: Frame,
  track: BodyTrack,
  attitude?: (tdb: number) => BodyAttitude,
  ellipsoid: Ellipsoid = Ellipsoid.WGS84,
): Frame<N> {
  return new Frame(name, parent, (instant, out) => {
    const tdb = instant.tdb();
    const { position, velocity } = track.at(tdb);
    const { x, y, z } = bodyAxes(
      position,
      velocity,
      attitude?.(tdb),
      ellipsoid,
    );
    // prettier-ignore
    out.set([
      x[0], x[1], x[2], 0,
      y[0], y[1], y[2], 0,
      z[0], z[1], z[2], 0,
      position[0]!, position[1]!, position[2]!, 1,
    ]);
  });
}

/** A rotation about the body's y axis by `angle` (radians): a camera tilted down by it looks along the new x. */
export function tiltDown(angle: number, offset: V3 = [0, 0, 0]): Float64Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // x → (c, 0, −s): down for a positive angle; z → (s, 0, c).
  // prettier-ignore
  return Float64Array.of(
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    offset[0], offset[1], offset[2], 1,
  );
}
