import { frameTransform, type Frame } from "../frames/Frame.ts";
import type { Frames } from "../frames/frames.ts";
import { convertPoint, type FramePoint } from "../frames/local.ts";
import { rotationPart } from "../frames/matrix.ts";
import { mat4 } from "../math/mat4.ts";
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

/**
 * Measures between `a` and `b` at `instant`: straight-line distance, the
 * difference vector, the distance over a shared body, both signal legs, line
 * of sight and an accuracy statement.
 *
 * Points carrying their own instant must match `instant` and get geometry
 * only (frames 3, R9). Coincident points (closer than 1 mm) get distance
 * and delta only, with a warning: their directions don't exist. Throws
 * wherever a frame transform or a trajectory does, and never extrapolates.
 */
export function measure(
  a: FramePoint,
  b: FramePoint,
  instant: Instant,
  frames: Frames,
  options: MeasureOptions = {},
): Measurement {
  const deltaFrame = options.deltaFrame ?? a.frame;
  const pa = convertPoint(a, a.frame, instant).position;
  const pb = convertPoint(b, a.frame, instant).position;
  const dx = pb[0]! - pa[0]!;
  const dy = pb[1]! - pa[1]!;
  const dz = pb[2]! - pa[2]!;
  const separation = Math.hypot(dx, dy, dz);
  const coincident = separation < COINCIDENT;

  const r = rotationPart(frameTransform(a.frame, deltaFrame, instant, scratch));
  const delta = Float64Array.from([
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
      const s = surfaceDistance(
        body.ellipsoid,
        convertPoint(a, fixed, instant).position,
        convertPoint(b, fixed, instant).position,
      );
      overBody = {
        body,
        distance: s.distance,
        heightDifference: s.heightDifference,
      };
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
 * records its message and the span continues.
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
  const from = start.tdb();
  const length = stop.tdb() - from;
  if (!(step > 0)) {
    throw new Error(`measureSpan: step must be positive, got ${step}`);
  }
  if (length < 0) {
    throw new Error("measureSpan: stop is before start");
  }
  const count = Math.floor(length / step + 1e-9) + 1;
  const samples = [];
  for (let i = 0; i < count; i++) {
    const instant = i === 0 ? start : Instant.fromTdb(from + i * step);
    try {
      samples.push({
        instant,
        measurement: measure(a, b, instant, frames, options),
      });
    } catch (e) {
      samples.push({
        instant,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return samples;
}
