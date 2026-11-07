import { Frame } from "../frames/Frame.ts";
import { DE440_EARTH_MOON_METERS, type Frames } from "../frames/frames.ts";
import { convertPoint, type FramePoint } from "../frames/local.ts";
import type { Instant } from "../time/Instant.ts";
import { Trajectory } from "../trajectory/Trajectory.ts";
import type {
  DesignPointObtained,
  EngineeringFrame,
  SnapKind,
} from "../engineering/EngineeringFrame.ts";
import type { BetterCandidate } from "../engineering/crs.ts";
import { earthOrientationSigma } from "../frames/orientationSigma.ts";
import { EARTH_ROTATION_RATE } from "./constants.ts";

export {
  earthOrientationSigma,
  type EarthOrientationSigma,
} from "../frames/orientationSigma.ts";

/** One contribution to a measurement's uncertainty. */
export interface AccuracyTerm {
  source:
    | "ephemeris"
    | "earthOrientation"
    | "trajectory"
    | "coordinateScale"
    | "relativity"
    | "lightTime"
    | "projection"
    | "pick"
    | "geoidFallback";
  /** 1σ in meters, or `undefined` when its size is not known. */
  meters: number | undefined;
  note: string;
}

/**
 * What a statement's warning is about, for a reader that filters them:
 * `own-instant-no-signal` and `coincident` concern only the signal (light
 * time, line of sight), `no-footprint` only `overBody`, `alignment-unused`
 * only the design result; `leap-seconds-expired` may affect the instant.
 * `coarser-operation` (an engineering frame's operation is not PROJ's best,
 * whose grids aren't loaded) and `geoid-fallback` (a frame reads its heights
 * in a global geoid model's place) concern a design end's position.
 */
export type WarningCode =
  | "own-instant-no-signal"
  | "coincident"
  | "no-footprint"
  | "alignment-unused"
  | "leap-seconds-expired"
  | "coarser-operation"
  | "geoid-fallback";

/** What a measurement claims to know, term by term. */
export interface AccuracyStatement {
  /** The root sum square of the terms; `undefined` if any term is (R7). */
  meters: number | undefined;
  terms: AccuracyTerm[];
  warnings: string[];
  /**
   * Each warning's code, in step with `warnings` (same order and length)
   * when set. Optional: a statement built elsewhere may leave it out.
   */
  warningCodes?: WarningCode[];
  /**
   * More about a warning, by its code, for a reader that wants it: for
   * `coarser-operation`, PROJ's names for the operations it lists (one
   * line per frame). The warnings themselves stay short.
   */
  warningDetails?: Partial<Record<WarningCode, string>>;
}

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
  const sigma = earthOrientationSigma(frames, instant);
  if (sigma.degraded) {
    return {
      source: "earthOrientation",
      meters: undefined,
      note: `End ${end}: the instant is outside the EOP table (${sigma.span}), so Earth orientation is not known`,
    };
  }
  const p = convertPoint(point, frames.itrf, instant).position;
  const rho = Math.hypot(p[0]!, p[1]!);
  const norm = Math.hypot(p[0]!, p[1]!, p[2]!);
  const { ut1Seconds: sigmaT, polarRadians: sigmaP } = sigma;
  const note = sigma.predicted
    ? `End ${end}: predicted Earth orientation, ${sigma.ageDays.toFixed(1)} days past the last observed row (IERS Bulletin A)`
    : `End ${end}: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)`;
  return {
    source: "earthOrientation",
    meters: rss(sigmaT * EARTH_ROTATION_RATE * rho, sigmaP * norm),
    note,
  };
}

/** Metres for a note, never in e-notation: "2.15 m", "0.0000001 m". */
const metres = (v: number): string =>
  `${v.toLocaleString("en-US", { maximumSignificantDigits: 4 })} m`;

/** "±1.14 m each", "±2.15 m and ±5 m", "no stated accuracy": the candidates' figures. */
function statedText(candidates: readonly BetterCandidate[]): string {
  const stated = [
    ...new Set(
      candidates.flatMap((c) =>
        c.accuracy !== undefined ? [`±${metres(c.accuracy)}`] : [],
      ),
    ),
  ];
  const unstated = candidates.some((c) => c.accuracy === undefined);
  if (stated.length === 0) {
    return "no stated accuracy";
  }
  const list =
    stated.length === 1
      ? `${stated[0]}${candidates.length > 1 && !unstated ? " each" : ""}`
      : `${stated.slice(0, -1).join(", ")} and ${stated.at(-1)}`;
  return `a stated ${list}${unstated ? " or none" : ""}`;
}

/**
 * The better candidates as facts, briefly: how many, PROJ's stated figures
 * and the grids they need, each grid once. "PROJ lists 2 operations with a
 * stated ±1.14 m each that need a.tif, b.tif, not loaded".
 */
function candidatesFact(candidates: readonly BetterCandidate[]): string {
  const n = candidates.length;
  const grids = [...new Set(candidates.flatMap((c) => c.missingGrids))];
  return `PROJ lists ${n === 1 ? "an operation" : `${n} operations`} with ${statedText(candidates)} that need${n === 1 ? "s" : ""} ${grids.join(", ")}, not loaded`;
}

/**
 * The projection term for a design end (R9): PROJ's stated accuracy for the
 * frame's recorded operation. A ballpark operation, or one PROJ gives no
 * accuracy for, is not known (`meters` undefined), never small. The note
 * (amended R9) names the optional grids the operation runs without, the
 * better candidates PROJ lists (their figures and grids, briefly), and a
 * geoid fallback, whose datum swap this figure leaves out (the
 * `geoidFallback` term). End b in end a's frame says those once: "as end a".
 */
function projectionTerm(
  end: string,
  frame: EngineeringFrame,
  asEndA: boolean,
): AccuracyTerm {
  const { operation, fallback } = frame;
  const grids =
    operation.grids.length > 0 ? operation.grids.join(", ") : "no grids";
  const known = !operation.ballpark && operation.accuracy !== undefined;
  const matched =
    known && operation.matchedCandidate !== undefined
      ? `; pinned: the accuracy PROJ states for the candidate it matches, "${operation.matchedCandidate}"`
      : "";
  const parts = [
    `End ${end}: engineering frame "${frame.definition.name}": PROJ operation (${grids})${operation.ballpark ? ", a ballpark operation" : ""}${known ? "" : "; its accuracy is not known"}${matched}`,
  ];
  if (fallback !== undefined) {
    parts.push(
      `this is the ${fallback.model} fallback CRS's operation: its figure leaves out the gap between ${fallback.model} and EPSG:${fallback.replacedVertical} (the geoidFallback term)`,
    );
  }
  const missing = operation.missingOptionalGrids;
  if (missing.length > 0) {
    parts.push(
      `it runs without the optional grid${missing.length === 1 ? "" : "s"} ${missing.join(", ")}, which ${missing.length === 1 ? "isn't" : "aren't"} loaded`,
    );
  }
  if (operation.betterCandidates.length > 0) {
    parts.push(candidatesFact(operation.betterCandidates));
  }
  return {
    source: "projection",
    meters: known ? operation.accuracy : undefined,
    note:
      asEndA && parts.length > 1
        ? `${parts[0]}; the rest as end a`
        : parts.join("; "),
  };
}

/**
 * The geoid-fallback term for a design end of a frame that took one: the
 * gap between the model and the replaced datum, as `fallbackSigma` states
 * it, else not known (Review Focus 5): never PROJ's figure for the model.
 */
function fallbackTerm(end: string, frame: EngineeringFrame): AccuracyTerm {
  const fallback = frame.fallback!;
  const why = `End ${end}: engineering frame "${frame.definition.name}": ${fallback.model} heights stand in for EPSG:${fallback.replacedVertical} (missing ${fallback.missingGrids.join(", ")})`;
  return {
    source: "geoidFallback",
    meters: fallback.sigma,
    note:
      fallback.sigma !== undefined
        ? `${why}: the fallbackSigma the app gave`
        : `${why}: the gap between them is not known (no fallbackSigma)`,
  };
}

const SNAPPED_TO: Readonly<Record<SnapKind, string>> = {
  point: "a point",
  segment: "a segment",
  arc: "an arc",
  surface: "a surface",
};

/** The pick term for a design end that was picked or snapped. */
function pickTerm(end: string, obtained: DesignPointObtained): AccuracyTerm {
  return {
    source: "pick",
    meters: obtained.tolerance,
    note:
      obtained.how === "pick"
        ? `End ${end}: the design point was picked: the pick's tolerance`
        : `End ${end}: the design point was snapped to ${obtained.kind !== undefined ? SNAPPED_TO[obtained.kind] : "geometry"}: the snap's tolerance`,
  };
}

/**
 * The warnings a design end's frame carries, as facts: better candidates PROJ
 * lists (`coarser-operation`, with PROJ's names for them as its detail) and a
 * geoid fallback.
 */
function frameWarnings(
  frame: EngineeringFrame,
): { code: WarningCode; text: string; detail?: string }[] {
  const out: { code: WarningCode; text: string; detail?: string }[] = [];
  const { operation, fallback } = frame;
  const name = `Engineering frame "${frame.definition.name}"`;
  const better = operation.betterCandidates;
  if (better.length > 0) {
    const used =
      !operation.ballpark && operation.accuracy !== undefined
        ? `states ±${metres(operation.accuracy)}`
        : "states no accuracy";
    out.push({
      code: "coarser-operation",
      text: `${name}: ${candidatesFact(better)}; this frame's operation ${used}.`,
      detail: `${name}: PROJ's names for them: ${better
        .map(
          (c) =>
            `"${c.name}" (${c.accuracy !== undefined ? `±${metres(c.accuracy)}` : "no stated accuracy"})`,
        )
        .join("; ")}.`,
    });
  }
  if (fallback !== undefined) {
    out.push({
      code: "geoid-fallback",
      text: `${name} reads its design heights as ${fallback.model} heights in place of EPSG:${fallback.replacedVertical} (missing ${fallback.missingGrids.join(", ")}): ${fallback.sigma !== undefined ? `the gap between them is the ${metres(fallback.sigma)} the app gave (fallbackSigma).` : "the gap between them is not known, so the accuracy is not bounded (no fallbackSigma)."}`,
    });
  }
  return out;
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
  options: {
    signal: boolean;
    /** The engineering frame of an end given as a design point (R9). */
    design?: { a?: EngineeringFrame; b?: EngineeringFrame };
    /** How an end given as a design point was picked or snapped (its `pick` term). */
    obtained?: { a?: DesignPointObtained; b?: DesignPointObtained };
  },
): AccuracyStatement {
  const terms: AccuracyTerm[] = [];
  const warnings: string[] = [];
  const warningCodes: WarningCode[] = [];
  const warningDetails: Partial<Record<WarningCode, string>> = {};

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
        meters: DE440_EARTH_MOON_METERS,
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
    const engineering = options.design?.[end as "a" | "b"];
    if (engineering) {
      // One frame's notes and warnings once, though both ends are in it.
      const asEndA = end === "b" && engineering === options.design?.a;
      terms.push(projectionTerm(end, engineering, asEndA));
      if (engineering.fallback !== undefined) {
        terms.push(fallbackTerm(end, engineering));
      }
      if (!asEndA) {
        for (const w of frameWarnings(engineering)) {
          warnings.push(w.text);
          warningCodes.push(w.code);
          if (w.detail !== undefined) {
            const before = warningDetails[w.code];
            warningDetails[w.code] =
              before === undefined ? w.detail : `${before} ${w.detail}`;
          }
        }
      }
    }
    const obtained = options.obtained?.[end as "a" | "b"];
    if (obtained) {
      terms.push(pickTerm(end, obtained));
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
          note: `End ${end}: Trajectory "${trajectory.name}": the scale of its coordinates (TDB or TT) is not stated, taken as TDB-compatible: 2.5 × 10⁻⁸ of the geocentric distance`,
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
    warningCodes.push("leap-seconds-expired");
  }

  const known = terms.every((t) => t.meters !== undefined);
  return {
    meters: known ? rss(...terms.map((t) => t.meters!)) : undefined,
    terms,
    warnings,
    warningCodes,
    ...(Object.keys(warningDetails).length > 0 && { warningDetails }),
  };
}
