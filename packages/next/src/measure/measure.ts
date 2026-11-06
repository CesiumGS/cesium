import { frameTransform, type Frame } from "../frames/Frame.ts";
import type { Frames } from "../frames/frames.ts";
import { convertPoint, type FramePoint } from "../frames/local.ts";
import { rotationPart } from "../frames/matrix.ts";
import { cartographic } from "../math/ellipsoid.ts";
import { mat4 } from "../math/mat4.ts";
import { vec3 } from "../math/vec3.ts";
import type { Body } from "../scene/Body.ts";
import { Instant } from "../time/Instant.ts";
import { accuracyOf, type AccuracyStatement } from "./accuracy.ts";
import { downlink, uplink, type Leg } from "./doppler.ts";
import { lineOfSight } from "./lineOfSight.ts";
import { solveLightTime, type ShapiroBody } from "./lightTime.ts";
import { surfaceDistance } from "./surface.ts";

/** Options for `measure` and `measureSpan`. */
export interface MeasureOptions {
  /** The frame whose axes `delta` is expressed in; default `a.frame`. */
  readonly deltaFrame?: Frame;
  /** The transmitted frequency, Hz, for the legs' `dopplerShift`. */
  readonly frequency?: number;
  /** Bodies whose Shapiro delay the light time adds; default the Sun, Earth and Moon. */
  readonly shapiro?: readonly ShapiroBody[];
  /** Whether to compute the signal legs and line of sight; default true. */
  readonly signal?: boolean;
  /** Bodies that may block the line of sight; default the Earth and the Moon. */
  readonly bodies?: readonly Body[];
}

/** The result of `measure`: what lies between two points at one instant. */
export interface Measurement {
  /** The instant the measurement is for. */
  readonly instant: Instant;
  /** The straight-line distance between the points at `instant`, m, in `a`'s frame. */
  readonly distance: number;
  /** The vector b − a in `deltaFrame`'s axes, m (a vector: only the rotation applies). */
  readonly delta: Float64Array;
  /** The frame whose axes `delta` is in. */
  readonly deltaFrame: Frame;
  /**
   * Present when both points are in frames of the same body: the geodesic
   * distance between their footprints on its ellipsoid, m, and the height of
   * b above the ellipsoid minus that of a, m.
   */
  readonly overBody?: {
    readonly body: Body;
    readonly distance: number;
    readonly heightDifference: number;
  };
  /**
   * The downlink (b to a, received at a at `instant`) and the uplink (a to
   * b, transmitted from a at `instant`). Undefined when `signal` is false,
   * the points coincide or either carries its own instant.
   */
  readonly signal?: { readonly downlink: Leg; readonly uplink: Leg };
  /** Whether the downlink's path is clear of the bodies, and what blocks it; present with `signal`. */
  readonly lineOfSight?: { readonly clear: boolean; readonly blockedBy?: Body };
  /** What the inputs support claiming about this measurement. */
  readonly accuracy: AccuracyStatement;
}

/** Closer than this, m, two points coincide: directions are undefined. */
const COINCIDENT = 1e-3;
const scratch = mat4();
/** The most samples `measureSpan` will run. */
const MAX_SAMPLES = 1_000_000;

/** Throws a clear error for a non-finite instant, coordinate or frequency. */
function checkInputs(
  who: string,
  a: FramePoint,
  b: FramePoint,
  options: MeasureOptions,
): void {
  for (const [name, point] of [
    ["a", a],
    ["b", b],
  ] as const) {
    for (let i = 0; i < 3; i++) {
      if (!Number.isFinite(point.position[i])) {
        throw new Error(
          `${who}: point ${name} has a non-finite coordinate (position[${i}] is ${point.position[i]})`,
        );
      }
    }
  }
  if (options.frequency !== undefined && !Number.isFinite(options.frequency)) {
    throw new Error(
      `${who}: frequency must be a finite number of Hz, got ${options.frequency}`,
    );
  }
}

function checkTdb(who: string, name: string, instant: Instant): number {
  const t = instant.tdb();
  if (!Number.isFinite(t)) {
    throw new Error(`${who}: ${name} is not a finite instant (TDB ${t})`);
  }
  return t;
}

/**
 * Measures between `a` and `b` at `instant`: straight-line distance, the
 * difference vector, the distance over a shared body, both signal legs, line
 * of sight and an accuracy statement.
 *
 * Points carrying their own instant must match `instant` and get geometry
 * only (frames 3, R9). Coincident points (closer than 1 mm) get distance 0
 * and a zero delta only, with a warning: their directions don't exist. A
 * point at a body's center has no footprint, so `overBody` is left out with a
 * warning. Throws for a non-finite instant, coordinate or frequency, and
 * wherever a frame transform or a trajectory does, and never extrapolates.
 */
export function measure(
  a: FramePoint,
  b: FramePoint,
  instant: Instant,
  frames: Frames,
  options: MeasureOptions = {},
): Measurement {
  checkTdb("measure", "instant", instant);
  checkInputs("measure", a, b, options);
  const deltaFrame = options.deltaFrame ?? a.frame;
  const pa = convertPoint(a, a.frame, instant).position;
  const pb = convertPoint(b, a.frame, instant).position;
  const dx = pb[0]! - pa[0]!;
  const dy = pb[1]! - pa[1]!;
  const dz = pb[2]! - pa[2]!;
  const separation = Math.hypot(dx, dy, dz);
  const coincident = separation < COINCIDENT;

  const r = rotationPart(frameTransform(a.frame, deltaFrame, instant, scratch));
  // Coincident points have no direction: the sub-mm vector is noise.
  const delta = coincident
    ? new Float64Array(3)
    : Float64Array.from([
        r[0]! * dx + r[1]! * dy + r[2]! * dz,
        r[3]! * dx + r[4]! * dy + r[5]! * dz,
        r[6]! * dx + r[7]! * dy + r[8]! * dz,
      ]);

  const warnings: string[] = [];
  let overBody: Measurement["overBody"];
  const body = frames.bodyOf(a.frame);
  if (body !== undefined && body === frames.bodyOf(b.frame)) {
    if (coincident) {
      overBody = { body, distance: 0, heightDifference: 0 };
    } else {
      const fixed = frames.bodyFixed(body);
      const fa = convertPoint(a, fixed, instant).position;
      const fb = convertPoint(b, fixed, instant).position;
      const footprint = (p: ArrayLike<number>) =>
        body.ellipsoid.cartesianToCartographic(
          vec3(p[0]!, p[1]!, p[2]!),
          cartographic(),
        );
      if (footprint(fa) === undefined || footprint(fb) === undefined) {
        warnings.push(
          "a point is at the body's center, which has no geodetic footprint, so overBody is left out",
        );
      } else {
        const s = surfaceDistance(body.ellipsoid, fa, fb);
        overBody = {
          body,
          distance: s.distance,
          heightDifference: s.heightDifference,
        };
      }
    }
  }

  let signal: Measurement["signal"];
  let sight: Measurement["lineOfSight"];
  if (coincident) {
    warnings.push(
      "the points coincide (closer than 1 mm), so the signal and line of sight are undefined",
    );
  } else if (a.instant || b.instant) {
    for (const [name, point] of [
      ["a", a],
      ["b", b],
    ] as const) {
      if (point.instant) {
        warnings.push(
          `${name} carries its own instant, so it can't be placed at the signal's emission or reception times: geometry only, no signal`,
        );
      }
    }
  } else if (options.signal !== false) {
    const leg = {
      ...(options.shapiro && { shapiro: options.shapiro }),
      ...(options.frequency !== undefined && { frequency: options.frequency }),
    };
    signal = {
      downlink: downlink(a, b, instant, frames, leg),
      uplink: uplink(a, b, instant, frames, leg),
    };
    sight = lineOfSight(
      solveLightTime(a, b, instant, "reception", frames, options.shapiro),
      frames,
      options.bodies,
    );
  }

  const accuracy = accuracyOf(a, b, instant, frames, {
    signal: signal !== undefined,
  });
  accuracy.warnings.push(...warnings);
  return {
    instant,
    distance: coincident ? 0 : separation,
    delta,
    deltaFrame,
    ...(overBody && { overBody }),
    ...(signal && { signal }),
    ...(sight && { lineOfSight: sight }),
    accuracy,
  };
}

/**
 * Runs `measure` from `start` to `stop` inclusive every `step` seconds of
 * TDB. A sample that throws (a light path outside a trajectory's data, say)
 * records its message and the span continues; a TypeError or ReferenceError
 * propagates. Throws for a non-finite start, stop, step, coordinate or
 * frequency, and for more than 1,000,000 samples.
 */
export function measureSpan(
  a: FramePoint,
  b: FramePoint,
  start: Instant,
  stop: Instant,
  step: number,
  frames: Frames,
  options: MeasureOptions = {},
): Array<{ instant: Instant; measurement?: Measurement; error?: string }> {
  const from = checkTdb("measureSpan", "start", start);
  const length = checkTdb("measureSpan", "stop", stop) - from;
  if (!(Number.isFinite(step) && step > 0)) {
    throw new Error(
      `measureSpan: step must be a finite positive number of seconds, got ${step}`,
    );
  }
  if (length < 0) {
    throw new Error("measureSpan: stop is before start");
  }
  checkInputs("measureSpan", a, b, options);
  const count = Math.floor(length / step + 1e-9) + 1;
  if (count > MAX_SAMPLES) {
    throw new Error(
      `measureSpan: ${count} samples exceeds the limit of ${MAX_SAMPLES}; use a longer step`,
    );
  }
  const samples = [];
  for (let i = 0; i < count; i++) {
    const instant = i === 0 ? start : Instant.fromTdb(from + i * step);
    try {
      samples.push({
        instant,
        measurement: measure(a, b, instant, frames, options),
      });
    } catch (e) {
      // A programming error is not a sample's failure (as in motion.ts).
      if (e instanceof TypeError || e instanceof ReferenceError) {
        throw e;
      }
      samples.push({
        instant,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return samples;
}
