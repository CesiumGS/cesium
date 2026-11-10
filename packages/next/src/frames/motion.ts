import { frameTransform, type Frame } from "./Frame.ts";
import type { FramePoint } from "./local.ts";
import { Instant } from "../time/Instant.ts";

/** The central difference's half-step, TDB seconds (frames 3, R3). */
const H = 0.5;

const matrix = new Float64Array(16);
// Scratch per nesting level: a two-vector frame's velocity vector takes a
// derivative inside another derivative's sampler.
interface Scratch {
  ahead: Float64Array;
  behind: Float64Array;
  here: Float64Array;
  far: Float64Array;
}
const levels: Scratch[] = [];
let depth = 0;
/** The instant each active difference is centred on, by depth. */
const centers: Instant[] = [];

/**
 * The instant the innermost difference in progress is centred on, when
 * `instant` is one of its samples (within its step), or undefined. A frame
 * that changes by jumps uses it to sample one piece across the step, so a
 * jump isn't read as speed.
 */
export function differenceCenter(instant: Instant): Instant | undefined {
  const center = depth > 0 ? centers[depth - 1] : undefined;
  return center !== undefined &&
    Math.abs(center.tdb() - instant.tdb()) <= H * (1 + 1e-12)
    ? center
    : undefined;
}
const scratchFor = (level: number): Scratch =>
  (levels[level] ??= {
    ahead: new Float64Array(3),
    behind: new Float64Array(3),
    here: new Float64Array(3),
    far: new Float64Array(3),
  });
const MAX_DIMENSION = 3;

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

/**
 * Writes the derivative at `t0` of the quadratic through (t0, f0),
 * (t1, f1), (t2, f2) to `out`: the three-point one-sided stencil
 * (−3 f(t) + 4 f(t ± h) − f(t ± 2h)) / (±2h), in Lagrange form so the
 * instants' actual TDB spacing is used. Exact for constant acceleration,
 * where the two-point form misses by a·h/2.
 */
function oneSided(
  t0: number,
  t1: number,
  t2: number,
  f0: Float64Array,
  f1: Float64Array,
  f2: Float64Array,
  dimension: number,
  out: Float64Array,
): void {
  const w0 = (2 * t0 - t1 - t2) / ((t0 - t1) * (t0 - t2));
  const w1 = (t0 - t2) / ((t1 - t0) * (t1 - t2));
  const w2 = (t0 - t1) / ((t2 - t0) * (t2 - t1));
  for (let k = 0; k < dimension; k++) {
    out[k] = w0 * f0[k]! + w1 * f1[k]! + w2 * f2[k]!;
  }
}

/**
 * Writes `sample(instant, out)` to `out` and returns `undefined`, or returns
 * what it threw when that is a data-edge miss (an Error beyond the data,
 * ephemeris or EOP table). A TypeError or ReferenceError is a programming
 * error, not an edge, so it propagates rather than becoming a quiet
 * one-sided difference.
 */
function trySample(
  sample: Sampler,
  instant: Instant,
  out: Float64Array,
): { error: unknown } | undefined {
  try {
    sample(instant, out);
    return undefined;
  } catch (error) {
    if (error instanceof TypeError || error instanceof ReferenceError) {
      throw error;
    }
    return { error };
  }
}

/** A function of time of up to three components, written to `out`; it throws beyond its data. */
export type Sampler = (instant: Instant, out: Float64Array) => void;

/**
 * The time derivative at `instant` of the vector `sample` (up to three
 * components) written to `out`: the central difference over h = 0.5 s
 * (frames 3, R3), divided by the two instants' actual TDB difference (TDB
 * seconds at today's epochs are 1.2e-7 s apart, so `instant ± h` may not
 * land exactly).
 *
 * Where one side misses, as within h of a trajectory's data edge, it takes
 * the three-point one-sided stencil on the other side, through t, t ± h and
 * t ± 2h, second order like the central difference. Only if t ± 2h misses
 * too does it fall back to the two-point difference with the instant
 * itself. Where both sides miss, it rethrows the error from t + h. A
 * TypeError or ReferenceError always propagates. `velocityIn` and range rate
 * share this.
 */
export function derivative(
  sample: Sampler,
  instant: Instant,
  dimension: number,
  out: Float64Array,
): Float64Array {
  centers[depth] = instant;
  const scratch = scratchFor(depth++);
  try {
    return differentiate(sample, instant, dimension, out, scratch);
  } finally {
    depth--;
  }
}

function differentiate(
  sample: Sampler,
  instant: Instant,
  dimension: number,
  out: Float64Array,
  { ahead, behind, here, far }: Scratch,
): Float64Array {
  if (dimension > MAX_DIMENSION) {
    throw new RangeError(`derivative: at most ${MAX_DIMENSION} components`);
  }
  const t = instant.tdb();
  const later = Instant.fromTdb(t + H);
  const earlier = Instant.fromTdb(t - H);
  const laterMissed = trySample(sample, later, ahead);
  const earlierMissed = trySample(sample, earlier, behind);
  if (laterMissed && earlierMissed) {
    throw laterMissed.error;
  }
  if (!laterMissed && !earlierMissed) {
    const dt = later.tdb() - earlier.tdb();
    for (let k = 0; k < dimension; k++) {
      out[k] = (ahead[k]! - behind[k]!) / dt;
    }
    return out;
  }
  // One side missed: the other side's near point is in `near`.
  const sign = laterMissed ? -1 : 1;
  const nearInstant = laterMissed ? earlier : later;
  const near = laterMissed ? behind : ahead;
  sample(instant, here);
  const farInstant = Instant.fromTdb(t + sign * 2 * H);
  if (!trySample(sample, farInstant, far)) {
    oneSided(
      t,
      nearInstant.tdb(),
      farInstant.tdb(),
      here,
      near,
      far,
      dimension,
      out,
    );
    return out;
  }
  const dt = nearInstant.tdb() - t;
  for (let k = 0; k < dimension; k++) {
    out[k] = (near[k]! - here[k]!) / dt;
  }
  return out;
}

/**
 * The velocity (m/s) relative to `frame` at `instant` of `point`, fixed in
 * its own frame: the `derivative` of `positionIn` (central over h = 0.5 s,
 * one-sided within h of a trajectory's data edge; frames 3, R3).
 */
export function velocityIn(
  point: FramePoint,
  frame: Frame,
  instant: Instant,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  fixedOnly(point, instant, "velocityIn");
  return derivative(
    (i, o) => {
      positionIn(point, frame, i, o);
    },
    instant,
    3,
    out,
  );
}

const rotation = new Float64Array(16);
const column = new Float64Array(16);
const rate = [new Float64Array(3), new Float64Array(3), new Float64Array(3)];

/**
 * The velocity (m/s, in `base`'s axes) of `frame`'s origin relative to
 * `base` at `instant`: the `derivative` of the origin's position (central
 * over 0.5 s, one-sided within 0.5 s of a data edge).
 */
export function frameVelocity(
  frame: Frame,
  base: Frame,
  instant: Instant,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  return derivative(
    (i, o) => {
      const m = frameTransform(frame, base, i, matrix);
      o[0] = m[12]!;
      o[1] = m[13]!;
      o[2] = m[14]!;
    },
    instant,
    3,
    out,
  );
}

/**
 * The angular velocity (rad/s, in `base`'s axes) of `frame`'s axes relative
 * to `base` at `instant`, from the skew part of Ṙ Rᵀ, with R the rotation
 * part of `frameTransform(frame, base, ·)` and Ṙ its `derivative` (central
 * over 0.5 s TDB, one-sided at a data edge).
 */
export function angularVelocity(
  frame: Frame,
  base: Frame,
  instant: Instant,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  for (let c = 0; c < 3; c++) {
    derivative(
      (i, o) => {
        const m = frameTransform(frame, base, i, column);
        o[0] = m[c * 4]!;
        o[1] = m[c * 4 + 1]!;
        o[2] = m[c * 4 + 2]!;
      },
      instant,
      3,
      rate[c]!,
    );
  }
  const r = frameTransform(frame, base, instant, rotation);
  // Ω[i][j] = Σ_k Ṙ[i][k] R[j][k]; Ṙ[i][k] is rate[k][i], R[j][k] is r[k*4+j].
  const omega = (i: number, j: number): number => {
    let sum = 0;
    for (let k = 0; k < 3; k++) {
      sum += rate[k]![i]! * r[k * 4 + j]!;
    }
    return sum;
  };
  out[0] = (omega(2, 1) - omega(1, 2)) / 2;
  out[1] = (omega(0, 2) - omega(2, 0)) / 2;
  out[2] = (omega(1, 0) - omega(0, 1)) / 2;
  return out;
}
