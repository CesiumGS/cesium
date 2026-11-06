import { frameTransform } from "../frames/Frame.ts";
import type { Frames } from "../frames/frames.ts";
import { transformPoint } from "../math/mat4.ts";
import { EARTH, MOON, type Body } from "../scene/Body.ts";
import { Instant } from "../time/Instant.ts";
import type { LightTimeSolution } from "./lightTime.ts";

/** How far in from each end the test starts, m: a surface point doesn't block itself. */
const INSET = 1;
const DEFAULT_BODIES: readonly Body[] = [EARTH, MOON];

/**
 * Whether the segment `p0`–`p1` passes through an ellipsoid centered at the
 * origin of the frame the points are in, with semi-axes `radii` along its
 * axes. The segment is first shortened by `inset` meters at each end (a
 * segment shorter than `2 · inset` is clear), then scaled to a unit sphere
 * for a segment–sphere test.
 */
export function segmentBlocked(
  p0: ArrayLike<number>,
  p1: ArrayLike<number>,
  radii: ArrayLike<number>,
  inset: number,
): boolean {
  const dx = p1[0]! - p0[0]!;
  const dy = p1[1]! - p0[1]!;
  const dz = p1[2]! - p0[2]!;
  const length = Math.hypot(dx, dy, dz);
  if (length <= 2 * inset) {
    return false;
  }
  const k = inset / length;
  // The shortened segment, scaled so the ellipsoid is the unit sphere.
  const ax = (p0[0]! + dx * k) / radii[0]!;
  const ay = (p0[1]! + dy * k) / radii[1]!;
  const az = (p0[2]! + dz * k) / radii[2]!;
  const bx = (p1[0]! - dx * k) / radii[0]!;
  const by = (p1[1]! - dy * k) / radii[1]!;
  const bz = (p1[2]! - dz * k) / radii[2]!;
  const ex = bx - ax;
  const ey = by - ay;
  const ez = bz - az;
  // The closest point of the segment to the origin.
  const t = Math.min(
    1,
    Math.max(0, -(ax * ex + ay * ey + az * ez) / (ex * ex + ey * ey + ez * ez)),
  );
  const cx = ax + ex * t;
  const cy = ay + ey * t;
  const cz = az + ez * t;
  return cx * cx + cy * cy + cz * cz < 1;
}

const matrix = new Float64Array(16);
const center = new Float64Array(3);
const origin = new Float64Array(3);
const p0 = new Float64Array(3);
const p1 = new Float64Array(3);

/**
 * Whether the signal's path is clear of `bodies` (default the Earth and the
 * Moon), and the first of them, in the order given, that blocks it. Each body
 * is placed and oriented when the light passes its point of closest approach
 * on the path, `emission + (s / ρ) · lightTime`, found from the body's center
 * (one refinement from its place at reception); the path's endpoints are
 * moved into the body's fixed frame at that time. Throws for a body with no
 * fixed frame.
 */
export function lineOfSight(
  solution: LightTimeSolution,
  frames: Frames,
  bodies: readonly Body[] = DEFAULT_BODIES,
): { clear: boolean; blockedBy?: Body } {
  const { transmitterPosition: tx, receiverPosition: rx } = solution;
  const dx = rx[0]! - tx[0]!;
  const dy = rx[1]! - tx[1]!;
  const dz = rx[2]! - tx[2]!;
  const rho = Math.hypot(dx, dy, dz);
  const emission = solution.emission.tdb();

  /** The fraction of the path at closest approach to the body's center at `instant`. */
  const closest = (fixed: Body, instant: Instant): number => {
    if (rho === 0) {
      return 0;
    }
    frameTransform(frames.bodyFixed(fixed), frames.icrf, instant, matrix);
    transformPoint(center, matrix, origin);
    const s =
      ((center[0]! - tx[0]!) * dx +
        (center[1]! - tx[1]!) * dy +
        (center[2]! - tx[2]!) * dz) /
      rho;
    return Math.min(rho, Math.max(0, s)) / rho;
  };

  for (const body of bodies) {
    const fixed = frames.bodyFixed(body);
    const first = closest(body, solution.reception);
    const refined = closest(
      body,
      Instant.fromTdb(emission + first * solution.lightTime),
    );
    const at = Instant.fromTdb(emission + refined * solution.lightTime);
    frameTransform(frames.icrf, fixed, at, matrix);
    transformPoint(p0, matrix, tx);
    transformPoint(p1, matrix, rx);
    if (segmentBlocked(p0, p1, body.ellipsoid.radii, INSET)) {
      return { clear: false, blockedBy: body };
    }
  }
  return { clear: true };
}
