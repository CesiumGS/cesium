import { Frame } from "../frames/Frame.ts";
import type { Frames } from "../frames/frames.ts";
import { convertPoint, type FramePoint } from "../frames/local.ts";
import type { Instant } from "../time/Instant.ts";
import { Trajectory } from "../trajectory/Trajectory.ts";
import { EARTH_ROTATION_RATE } from "./constants.ts";

/** One contribution to a measurement's uncertainty. */
export interface AccuracyTerm {
  source:
    | "ephemeris"
    | "earthOrientation"
    | "trajectory"
    | "coordinateScale"
    | "relativity"
    | "lightTime";
  /** 1σ in meters, or `undefined` when its size is not known. */
  meters: number | undefined;
  note: string;
}

/** What a measurement claims to know, term by term. */
export interface AccuracyStatement {
  /** The root sum square of the terms; `undefined` if any term is (R7). */
  meters: number | undefined;
  terms: AccuracyTerm[];
  warnings: string[];
}

const ARCSEC_TO_RAD = Math.PI / (180 * 3600);
const MS_PER_DAY = 86_400_000;
/** DE440's Earth-Moon fit to lunar laser ranging, m (Park et al. 2021). */
const EPHEMERIS_M = 0.01;
/** Measured UT1 - UTC, s (spec section 4). */
const UT1_MEASURED_S = 35e-6;
/** Measured polar motion, arcsec: 0.1 mas, a conservative call. */
const POLAR_MEASURED_ARCSEC = 1e-4;
/** A trajectory's TDB-versus-TT ambiguity (its `coordinateScale` is "unknown"), as a fraction of the geocentric distance (R7). */
const COORDINATE_SCALE = 2.5e-8;
/** The selenocentric relativistic terms left unapplied at the lunar surface, m (R2). */
const RELATIVITY_MOON_M = 0.03;
const LIGHT_TIME_M = 0.001;

/** `frame` and its ancestors, nearest first. */
function chain(frame: Frame): Frame[] {
  const out: Frame[] = [];
  for (let f: Frame | undefined = frame; f; f = f.parent) {
    out.push(f);
  }
  return out;
}

const isUnder = (frame: Frame, ancestor: Frame): boolean =>
  chain(frame).includes(ancestor);

/** The frame where the two chains first meet. */
function commonAncestor(a: Frame, b: Frame): Frame | undefined {
  const above = new Set(chain(a));
  return chain(b).find((f) => above.has(f));
}

/** The trajectory whose frame is `frame` or its nearest ancestor (a local frame on an object). */
function trajectoryOf(frame: Frame): Trajectory | undefined {
  for (const f of chain(frame)) {
    const t = Trajectory.of(f);
    if (t) {
      return t;
    }
  }
  return undefined;
}

const rss = (...v: number[]): number => Math.hypot(...v);

/**
 * The Earth-orientation term for an end under ITRF: UT1 error turns the
 * Earth by `σ_t · ω` radians about the spin axis (moving the point by
 * `ρ` times that), and polar motion tilts the axis by `σ_p` (moving it by
 * `|r| · σ_p`). Measured values give 35 µs and 0.1 mas. A predicted sample
 * grows with its age `d` in days past the table's last observed row, by IERS
 * Bulletin A: polar 0.00068 · d^0.80 arcsec, UT1 0.00025 · d^0.75 s (R7).
 */
function earthOrientationTerm(
  end: "a" | "b",
  point: FramePoint,
  instant: Instant,
  frames: Frames,
): AccuracyTerm {
  const { eop, leapSeconds } = frames.data;
  const sample = eop.atInstant(instant, leapSeconds);
  if (sample.degraded) {
    const iso = (ms: number): string => new Date(ms).toISOString();
    return {
      source: "earthOrientation",
      meters: undefined,
      note: `End ${end}: the instant is outside the EOP table (${iso(eop.first)} to ${iso(eop.last)}), so Earth orientation is not known`,
    };
  }
  const p = convertPoint(point, frames.itrf, instant).position;
  const rho = Math.hypot(p[0]!, p[1]!);
  const norm = Math.hypot(p[0]!, p[1]!, p[2]!);
  let sigmaT = UT1_MEASURED_S;
  let sigmaP = POLAR_MEASURED_ARCSEC * ARCSEC_TO_RAD;
  let note = `End ${end}: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)`;
  if (sample.predicted) {
    const days = Math.max(
      0,
      (instant.toUtc(leapSeconds) - eop.lastObserved) / MS_PER_DAY,
    );
    // A predicted sample is never better than a measured one: its window
    // can reach back before the last observed row, where d is 0.
    sigmaT = Math.max(sigmaT, 0.00025 * days ** 0.75);
    sigmaP = Math.max(sigmaP, 0.00068 * days ** 0.8 * ARCSEC_TO_RAD);
    note = `End ${end}: predicted Earth orientation, ${days.toFixed(1)} days past the last observed row (IERS Bulletin A)`;
  }
  return {
    source: "earthOrientation",
    meters: rss(sigmaT * EARTH_ROTATION_RATE * rho, sigmaP * norm),
    note,
  };
}

/**
 * What a distance or direction between `a` and `b` at `instant` can claim,
 * from the inputs alone (R7): a term whose size is not known makes `meters`
 * undefined, never small. `signal` adds the light-time solver's own term.
 */
export function accuracyOf(
  a: FramePoint,
  b: FramePoint,
  instant: Instant,
  frames: Frames,
  options: { signal: boolean },
): AccuracyStatement {
  const terms: AccuracyTerm[] = [];
  const warnings: string[] = [];

  if (commonAncestor(a.frame, b.frame) === frames.icrf) {
    // 0.01 m is DE440's Earth-Moon fit, so it is claimed only when both ends
    // are in the Earth or Moon subtrees; anything else (a Sun- or
    // barycentre-centred point) has no stated absolute accuracy here.
    const inEarthMoon = (f: Frame): boolean =>
      isUnder(f, frames.gcrf) ||
      isUnder(f, frames.earthIcrf) ||
      isUnder(f, frames.moonIcrf);
    if (inEarthMoon(a.frame) && inEarthMoon(b.frame)) {
      terms.push({
        source: "ephemeris",
        meters: EPHEMERIS_M,
        note: "DE440 Earth-Moon fit to lunar laser ranging (Park et al. 2021)",
      });
    } else {
      terms.push({
        source: "ephemeris",
        meters: undefined,
        note: "heliocentric or barycentric geometry: DE440's absolute accuracy is not stated here",
      });
    }
  }

  const ends: [string, FramePoint][] = [
    ["a", a],
    ["b", b],
  ];
  for (const [end, point] of ends) {
    if (isUnder(point.frame, frames.itrf)) {
      terms.push(
        earthOrientationTerm(end as "a" | "b", point, instant, frames),
      );
    }
    const trajectory = trajectoryOf(point.frame);
    if (trajectory) {
      const sigma = trajectory.positionSigma(instant);
      terms.push({
        source: "trajectory",
        meters: sigma,
        note:
          sigma === undefined
            ? `End ${end}: Trajectory "${trajectory.name}": no position sigma (no covariance, no positionSigma option)${trajectory.accuracy === "approximate" ? "; its accuracy is approximate" : ""}`
            : `End ${end}: Trajectory "${trajectory.name}": position sigma${trajectory.accuracy === "approximate" ? " (approximate trajectory)" : ""}`,
      });
      if (
        trajectory.coordinateScale === "unknown" &&
        isUnder(trajectory.reference, frames.earthIcrf)
      ) {
        const r = convertPoint(point, frames.earthIcrf, instant).position;
        terms.push({
          source: "coordinateScale",
          meters: COORDINATE_SCALE * Math.hypot(r[0]!, r[1]!, r[2]!),
          note: `End ${end}: Trajectory "${trajectory.name}": the scale of its coordinates (TDB or TT) is not stated, taken as TDB-compatible: 2.5e-8 of the geocentric distance`,
        });
      }
    }
    if (isUnder(point.frame, frames.moonIcrf)) {
      terms.push({
        source: "relativity",
        meters: RELATIVITY_MOON_M,
        note: `End ${end}: selenocentric relativistic terms, stated and not applied`,
      });
    }
  }

  if (options.signal) {
    terms.push({
      source: "lightTime",
      meters: LIGHT_TIME_M,
      note: "Light-time iteration tolerance",
    });
  }

  const { leapSeconds } = frames.data;
  if (leapSeconds.isExpired(instant.toUtc(leapSeconds))) {
    warnings.push(
      "The leap-second table has expired: if this instant was given in UTC, a leap second may have been missed",
    );
  }

  const known = terms.every((t) => t.meters !== undefined);
  return {
    meters: known ? rss(...terms.map((t) => t.meters!)) : undefined,
    terms,
    warnings,
  };
}
