import { frameTransform, type Frame } from "../frames/Frame.ts";
import type { FramePoint } from "../frames/local.ts";
import { Instant } from "../time/Instant.ts";

/** The central difference's half-step, TDB seconds (frames 3, R3). */
const H = 0.5;

const matrix = new Float64Array(16);
const ahead = new Float64Array(3);
const behind = new Float64Array(3);

function fixedOnly(point: FramePoint, instant: Instant, caller: string): void {
  if (point.instant && point.instant.tt !== instant.tt) {
    throw new Error(
      `${caller}: the point carries its own instant and is only valid then; use a point fixed in its frame`,
    );
  }
}

/**
 * The position (m) in `frame` at `instant` of `point`, fixed in its own
 * frame. Throws for a point that carries a different instant of its own,
 * and wherever the frame tree throws (outside a trajectory's data or the
 * ephemeris, past the EOP predictions).
 */
export function positionIn(
  point: FramePoint,
  frame: Frame,
  instant: Instant,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  fixedOnly(point, instant, "positionIn");
  const m = frameTransform(point.frame, frame, instant, matrix);
  const x = point.position[0]!,
    y = point.position[1]!,
    z = point.position[2]!;
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
  return out;
}

/** Writes `positionIn` to `out`, returning what it threw, if anything. */
function tryPosition(
  point: FramePoint,
  frame: Frame,
  instant: Instant,
  out: Float64Array,
): { error: unknown } | undefined {
  try {
    positionIn(point, frame, instant, out);
    return undefined;
  } catch (error) {
    return { error };
  }
}

/**
 * The velocity (m/s) relative to `frame` at `instant` of `point`, fixed in
 * its own frame: the central difference of `positionIn` over h = 0.5 s
 * (frames 3, R3), divided by the two instants' actual TDB difference (TDB
 * seconds at today's epochs are 1.2e-7 s apart, so `instant ± h` may not
 * land exactly). Where one side throws, as within h of a trajectory's data
 * edge, it takes the one-sided difference between the other side and the
 * instant itself; where both throw, it rethrows the error from t + h.
 */
export function velocityIn(
  point: FramePoint,
  frame: Frame,
  instant: Instant,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  fixedOnly(point, instant, "velocityIn");
  const t = instant.tdb();
  let later = Instant.fromTdb(t + H);
  let earlier = Instant.fromTdb(t - H);
  const laterFailed = tryPosition(point, frame, later, ahead);
  const earlierFailed = tryPosition(point, frame, earlier, behind);
  if (laterFailed && earlierFailed) {
    throw laterFailed.error;
  }
  if (laterFailed) {
    later = instant;
    positionIn(point, frame, instant, ahead);
  } else if (earlierFailed) {
    earlier = instant;
    positionIn(point, frame, instant, behind);
  }
  const dt = later.tdb() - earlier.tdb();
  out[0] = (ahead[0]! - behind[0]!) / dt;
  out[1] = (ahead[1]! - behind[1]!) / dt;
  out[2] = (ahead[2]! - behind[2]!) / dt;
  return out;
}
