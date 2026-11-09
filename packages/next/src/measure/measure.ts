import { frameTransform, type Frame } from "../frames/Frame.ts";
import type { Frames } from "../frames/frames.ts";
import { convertPoint, framePoint, type FramePoint } from "../frames/local.ts";
import { rotationPart } from "../frames/matrix.ts";
import {
  type DesignPoint,
  type EngineeringFrame,
} from "../engineering/EngineeringFrame.ts";
import { runBulk, type BulkOptions } from "../core/bulk.ts";
import { gridFactors } from "../engineering/factors.ts";
import type { CoordinateOperation } from "../frames/coordinates.ts";
import { cartographic } from "../math/ellipsoid.ts";
import { mat4 } from "../math/mat4.ts";
import { vec3 } from "../math/vec3.ts";
import type { Body } from "../scene/Body.ts";
import { Instant } from "../time/Instant.ts";
import type { StationOffset } from "../engineering/alignment.ts";
import {
  accuracyOf,
  type AccuracyStatement,
  type WarningCode,
} from "./accuracy.ts";
import { downlinkWithSolution, uplink, type Leg } from "./doppler.ts";
import { lineOfSight } from "./lineOfSight.ts";
import type { ShapiroBody } from "./lightTime.ts";
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
  /**
   * The name of one of the engineering frame's alignments, for the result's
   * `alignment` stations and offsets. Used only when both points are design
   * points in the same frame; throws when the frame has no such alignment.
   */
  readonly alignment?: string;
}

/** A point for `measure`: in a frame, or in an engineering frame's design coordinates. */
export type MeasurePoint = FramePoint | DesignPoint<CoordinateOperation>;

/** What both ends being design points in one engineering frame adds (R7, R9). */
export interface DesignMeasurement {
  /** The design CRS's horizontal unit name and metres per unit (from PROJ). */
  readonly unitName: string;
  readonly metersPerUnit: number;
  /**
   * The distance between the design coordinates, in design (horizontal)
   * units: what a CAD tool reports. The 3D distance takes the design height
   * difference in its own unit (the vertical unit, else the horizontal) and
   * converts it to horizontal units by metersPerHeightUnit / metersPerUnit.
   */
  readonly distance: number;
  /** The distance of design E, N alone, in design units. */
  readonly horizontalDistance: number;
  /** b - a in design coordinates (E, N in the horizontal unit, U in the height unit). */
  readonly delta: Float64Array;
  /** Grid factors (k x R/(R+h)) at each end and their mean for the line (R7). */
  readonly combinedFactor: { a: number; b: number; mean: number };
  /** The projected CRS's grid convergence at each end, radians (the site rotation is not included). */
  readonly convergence: { a: number; b: number };
  /**
   * The frame's site scale s (1 without a site): the ground (true) distance
   * is about distance x siteScale x metersPerUnit / combinedFactor.mean.
   */
  readonly siteScale: number;
}

/** Stations and offsets of the two design points on a named alignment. */
export interface AlignmentMeasurement {
  readonly name: string;
  readonly a: StationOffset;
  readonly b: StationOffset;
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
  /** Present when both points are design points in the same engineering frame. */
  readonly design?: DesignMeasurement;
  /** Present with `design` when `options.alignment` names one of the frame's alignments. */
  readonly alignment?: AlignmentMeasurement;
  /** What the inputs support claiming about this measurement. */
  readonly accuracy: AccuracyStatement;
}

/** Closer than this, m, two points coincide: directions are undefined. */
const COINCIDENT = 1e-3;
const scratch = mat4();
/** The most samples `measureSpan` will run. */
const MAX_SAMPLES = 1_000_000;

const isDesign = (p: MeasurePoint): p is DesignPoint<CoordinateOperation> =>
  "engineeringFrame" in p;

/** A design point as a point in its body's body-fixed frame. */
function resolvePoint(p: MeasurePoint, frames: Frames): FramePoint {
  return isDesign(p)
    ? framePoint(
        frames.bodyFixed(p.engineeringFrame.body),
        p.engineeringFrame.toBodyFixed(p.design),
      )
    : p;
}

/** A span's grid factors, by engineering frame and design coordinates (the point's own array). */
type FactorCache = Map<
  EngineeringFrame<CoordinateOperation>,
  Map<ArrayLike<number>, ReturnType<typeof gridFactors>>
>;

function factorsOf(
  frame: EngineeringFrame<CoordinateOperation>,
  design: ArrayLike<number>,
  cache: FactorCache | undefined,
): ReturnType<typeof gridFactors> {
  if (cache === undefined) {
    return gridFactors(frame, design);
  }
  let byPoint = cache.get(frame);
  if (byPoint === undefined) {
    byPoint = new Map();
    cache.set(frame, byPoint);
  }
  let factors = byPoint.get(design);
  if (factors === undefined) {
    factors = gridFactors(frame, design);
    byPoint.set(design, factors);
  }
  return factors;
}

/** The design result and alignment for two design points in one frame. */
function designResult(
  a: DesignPoint<CoordinateOperation>,
  b: DesignPoint<CoordinateOperation>,
  options: MeasureOptions,
  cache?: FactorCache,
): { design: DesignMeasurement; alignment?: AlignmentMeasurement } {
  const frame: EngineeringFrame<CoordinateOperation> = a.engineeringFrame;
  const { units } = frame;
  const delta = Float64Array.from([
    b.design[0]! - a.design[0]!,
    b.design[1]! - a.design[1]!,
    b.design[2]! - a.design[2]!,
  ]);
  const horizontalDistance = Math.hypot(delta[0]!, delta[1]!);
  const vertical =
    (delta[2]! * frame.metersPerHeightUnit) / units.metersPerUnit;
  const fa = factorsOf(frame, a.design, cache);
  const fb = factorsOf(frame, b.design, cache);
  const design: DesignMeasurement = {
    unitName: units.horizontalUnitName,
    metersPerUnit: units.metersPerUnit,
    distance: Math.hypot(horizontalDistance, vertical),
    horizontalDistance,
    delta,
    combinedFactor: {
      a: fa.combinedFactor,
      b: fb.combinedFactor,
      mean: (fa.combinedFactor + fb.combinedFactor) / 2,
    },
    convergence: { a: fa.convergence, b: fb.convergence },
    siteScale: frame.definition.site?.scale ?? 1,
  };
  if (options.alignment === undefined) {
    return { design };
  }
  const alignment = frame.alignments.find((x) => x.name === options.alignment);
  if (alignment === undefined) {
    throw new Error(
      `measure: engineering frame "${frame.definition.name}" has no alignment named "${options.alignment}"`,
    );
  }
  return {
    design,
    alignment: {
      name: alignment.name,
      a: alignment.stationOffset(a.design),
      b: alignment.stationOffset(b.design),
    },
  };
}

/** Throws a clear error for a non-finite instant, coordinate or frequency. */
function checkInputs(
  who: string,
  a: MeasurePoint,
  b: MeasurePoint,
  options: MeasureOptions,
): void {
  for (const [name, point] of [
    ["a", a],
    ["b", b],
  ] as const) {
    const [field, values] = isDesign(point)
      ? (["design", point.design] as const)
      : (["position", point.position] as const);
    for (let i = 0; i < 3; i++) {
      if (!Number.isFinite(values[i])) {
        throw new Error(
          `${who}: point ${name} has a non-finite coordinate (${field}[${i}] is ${values[i]})`,
        );
      }
    }
    // A literal design point skips designPoint's checks: a NaN tolerance
    // would make a NaN statement, neither a number nor undefined.
    const tolerance = isDesign(point) ? point.obtained?.tolerance : undefined;
    if (
      tolerance !== undefined &&
      !(Number.isFinite(tolerance) && tolerance >= 0)
    ) {
      throw new Error(
        `${who}: point ${name}'s obtained.tolerance must be a finite number of metres, not negative, got ${tolerance}`,
      );
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
  pointA: MeasurePoint,
  pointB: MeasurePoint,
  instant: Instant,
  frames: Frames,
  options: MeasureOptions = {},
): Measurement {
  return measureWith(pointA, pointB, instant, frames, options, undefined);
}

function measureWith(
  pointA: MeasurePoint,
  pointB: MeasurePoint,
  instant: Instant,
  frames: Frames,
  options: MeasureOptions,
  cache: FactorCache | undefined,
): Measurement {
  checkTdb("measure", "instant", instant);
  checkInputs("measure", pointA, pointB, options);
  const a = resolvePoint(pointA, frames);
  const b = resolvePoint(pointB, frames);
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
  const warningCodes: WarningCode[] = [];
  const warn = (code: WarningCode, text: string) => {
    warnings.push(text);
    warningCodes.push(code);
  };
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
        warn(
          "no-footprint",
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
    warn(
      "coincident",
      "the points coincide (closer than 1 mm), so the signal and line of sight are undefined",
    );
  } else if (a.instant || b.instant) {
    for (const [name, point] of [
      ["a", a],
      ["b", b],
    ] as const) {
      if (point.instant) {
        warn(
          "own-instant-no-signal",
          `${name} carries its own instant, so it can't be placed at the signal's emission or reception times: geometry only, no signal`,
        );
      }
    }
  } else if (options.signal !== false) {
    const leg = {
      ...(options.shapiro && { shapiro: options.shapiro }),
      ...(options.frequency !== undefined && { frequency: options.frequency }),
    };
    // The downlink's light time is solved once, for both the signal and the
    // line of sight.
    const down = downlinkWithSolution(a, b, instant, frames, leg);
    signal = {
      downlink: down.leg,
      uplink: uplink(a, b, instant, frames, leg),
    };
    sight = lineOfSight(down.solution, frames, options.bodies);
  }

  const designs =
    isDesign(pointA) &&
    isDesign(pointB) &&
    pointA.engineeringFrame === pointB.engineeringFrame
      ? designResult(pointA, pointB, options, cache)
      : undefined;
  if (options.alignment !== undefined && !designs) {
    warn(
      "alignment-unused",
      `alignment "${options.alignment}" was not used: it needs two design points in the same engineering frame`,
    );
  }
  const accuracy = accuracyOf(a, b, instant, frames, {
    signal: signal !== undefined,
    design: {
      ...(isDesign(pointA) && { a: pointA.engineeringFrame }),
      ...(isDesign(pointB) && { b: pointB.engineeringFrame }),
    },
    obtained: {
      ...(isDesign(pointA) && pointA.obtained && { a: pointA.obtained }),
      ...(isDesign(pointB) && pointB.obtained && { b: pointB.obtained }),
    },
  });
  accuracy.warnings.push(...warnings);
  accuracy.warningCodes = [...(accuracy.warningCodes ?? []), ...warningCodes];
  return {
    instant,
    distance: coincident ? 0 : separation,
    delta,
    deltaFrame,
    ...(overBody && { overBody }),
    ...(signal && { signal }),
    ...(sight && { lineOfSight: sight }),
    ...(designs && { design: designs.design }),
    ...(designs?.alignment && { alignment: designs.alignment }),
    accuracy,
  };
}

/**
 * Runs `measure` from `start` to `stop` inclusive every `step` seconds of
 * TDB, as bulk work (plan 5b's call 36): in slices, with the `signal` and
 * `onProgress` of `BulkOptions` under `options.bulk` (`MeasureOptions.signal`
 * is already taken: it says whether to compute the signal). A sample that
 * throws (a light path outside a trajectory's data, say) records its message
 * and the span continues; a TypeError or ReferenceError rejects. Rejects for
 * a non-finite start, stop, step, coordinate or frequency, and for more than
 * 1,000,000 samples. Two design ends' grid factors are computed once for the
 * span.
 */
export async function measureSpan(
  a: MeasurePoint,
  b: MeasurePoint,
  start: Instant,
  stop: Instant,
  step: number,
  frames: Frames,
  options: MeasureOptions & { readonly bulk?: BulkOptions } = {},
): Promise<
  Array<{ instant: Instant; measurement?: Measurement; error?: string }>
> {
  const { bulk, ...measureOptions } = options;
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
  checkInputs("measureSpan", a, b, measureOptions);
  const count = Math.floor(length / step + 1e-9) + 1;
  if (count > MAX_SAMPLES) {
    throw new Error(
      `measureSpan: ${count} samples exceeds the limit of ${MAX_SAMPLES}; use a longer step`,
    );
  }
  const cache: FactorCache = new Map();
  return runBulk(
    count,
    (i) => {
      const instant = i === 0 ? start : Instant.fromTdb(from + i * step);
      try {
        return {
          instant,
          measurement: measureWith(
            a,
            b,
            instant,
            frames,
            measureOptions,
            cache,
          ),
        };
      } catch (e) {
        // A programming error is not a sample's failure (as in motion.ts).
        if (e instanceof TypeError || e instanceof ReferenceError) {
          throw e;
        }
        return {
          instant,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    },
    bulk,
  );
}
