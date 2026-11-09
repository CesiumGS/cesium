import { readSpk, type StateSegment } from "../ephemeris/spk.ts";
import { Frame } from "../frames/Frame.ts";
import { eigenSymmetric } from "../frames/covariance.ts";
import type { FrameAccuracy } from "../frames/frameAccuracy.ts";
import type { Frames } from "../frames/frames.ts";
import { toParentMatrix } from "../frames/matrix.ts";
import { Instant } from "../time/Instant.ts";
import type { LeapSeconds } from "../time/leapSeconds.ts";
import {
  interpolateState,
  windowStart,
  type InterpolationMethod,
} from "./interpolate.ts";
import type { OemSegment } from "./oem.ts";

/**
 * How far to trust a trajectory: "precise" for measured or reconstructed
 * data, "approximate" for a model or a rough fit.
 */
export type TrajectoryAccuracy = "precise" | "approximate";

/** One run of states, in meters and m/s, with the way it is interpolated. */
interface Piece {
  start: number;
  end: number;
  epochs: Float64Array;
  states: Float64Array;
  method: InterpolationMethod;
  windowSize: number;
  /** The segment's covariances, and what turns a variance into m². */
  covariances?: { epochs: Float64Array; values: Float64Array };
  varianceToM2?: number;
}

/** c11, c22, c33 and c44, c55, c66 in a 6×6 covariance's 21-value lower triangle. */
const POSITION_DIAGONAL = [0, 2, 5] as const;
const VELOCITY_DIAGONAL = [9, 14, 20] as const;

/** The unit of OEM covariance values: CCSDS's km, or m when the file says so. */
export type CovarianceUnits = "km" | "m";

type Center = "EARTH" | "MOON" | "SUN" | "SSB";
type Axes = "EME2000" | "ICRF" | "ITRF";

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
/** A trajectory's TDB-versus-TT ambiguity (its `coordinateScale` is "unknown"), as a fraction of the geocentric distance. */
const COORDINATE_SCALE = 2.5e-8;

/** Whether the symmetric 3×3 `c` is positive semi-definite, as a stated covariance must be. */
function positiveSemiDefinite(c: Float64Array): boolean {
  const { values } = eigenSymmetric(c);
  return values[2]! >= -1e-9 * Math.max(Math.abs(values[0]!), 1e-300);
}
const CENTER_IDS: Readonly<Record<number, Center>> = {
  399: "EARTH",
  301: "MOON",
  10: "SUN",
  0: "SSB",
};

const iso = (tdb: number, leap: LeapSeconds): string =>
  Number.isFinite(tdb)
    ? new Date(Instant.fromTdb(tdb).toUtc(leap)).toISOString()
    : String(tdb);

function oemCenter(name: string): Center | undefined {
  switch (name.trim().toUpperCase()) {
    case "EARTH":
      return "EARTH";
    case "MOON":
      return "MOON";
    case "SUN":
      return "SUN";
    case "SOLAR SYSTEM BARYCENTER":
    case "SSB":
      return "SSB";
    default:
      return undefined;
  }
}

function oemAxes(name: string): Axes | undefined {
  const f = name.trim().toUpperCase();
  if (f === "EME2000") {
    return "EME2000";
  }
  if (f === "ICRF" || f === "GCRF") {
    return "ICRF";
  }
  return f.startsWith("ITRF") ? "ITRF" : undefined;
}

/** The built-in frame for a source's origin and axes, or throws naming them. */
function referenceFor(
  frames: Frames,
  center: Center | undefined,
  axes: Axes | undefined,
  described: string,
): Frame {
  const unsupported = (): never => {
    throw new Error(`Trajectory: ${described} is not supported`);
  };
  if (center === undefined || axes === undefined) {
    return unsupported();
  }
  switch (center) {
    case "EARTH":
      return axes === "EME2000"
        ? frames.eme2000
        : axes === "ICRF"
          ? frames.earthIcrf
          : frames.itrf;
    case "MOON":
      if (axes === "ICRF") {
        return frames.moonIcrf;
      }
      if (axes === "EME2000") {
        throw new Error(`Trajectory: ${described} is not supported yet`);
      }
      return unsupported();
    case "SUN":
      return axes === "ICRF" ? frames.hcrs : unsupported();
    case "SSB":
      return axes === "ICRF" ? frames.icrf : unsupported();
  }
}

function oemPiece(
  seg: OemSegment,
  fallback: { method: InterpolationMethod; degree: number } | undefined,
  units: CovarianceUnits,
): Piece {
  const named = `OEM segment of "${seg.objectName}" starting ${seg.start.tdb()} TDB s`;
  let method: InterpolationMethod;
  let degree: number;
  const hasMethod = seg.interpolation !== undefined;
  const hasDegree = seg.interpolationDegree !== undefined;
  if (hasMethod !== hasDegree) {
    throw new Error(
      `Trajectory: ${named} gives ${hasMethod ? "INTERPOLATION but no INTERPOLATION_DEGREE" : "INTERPOLATION_DEGREE but no INTERPOLATION"}`,
    );
  }
  if (hasMethod) {
    const m = seg.interpolation!.trim().toLowerCase();
    if (m !== "lagrange" && m !== "hermite") {
      throw new Error(
        `Trajectory: ${named} has interpolation "${seg.interpolation}", which is not supported`,
      );
    }
    method = m;
    degree = seg.interpolationDegree!;
  } else if (fallback) {
    ({ method, degree } = fallback);
  } else {
    throw new Error(
      `Trajectory: ${named} gives no INTERPOLATION and INTERPOLATION_DEGREE; pass the interpolation option`,
    );
  }
  let windowSize: number;
  if (method === "hermite") {
    if (!Number.isInteger(degree) || degree < 1 || degree % 2 === 0) {
      throw new Error(
        `Trajectory: ${named}: a Hermite degree must be odd, got ${degree}`,
      );
    }
    windowSize = (degree + 1) / 2;
  } else {
    if (!Number.isInteger(degree) || degree < 1) {
      throw new Error(`Trajectory: ${named}: bad Lagrange degree ${degree}`);
    }
    windowSize = degree + 1;
  }
  const count = seg.epochs.length;
  if (windowSize > count) {
    throw new Error(
      `Trajectory: ${named}: ${method} degree ${degree} needs ${windowSize} states, the segment has ${count}`,
    );
  }
  return {
    // Outside the useable range the data is not to be used (CCSDS 502.0-B-3),
    // though the interpolation window may still reach those states.
    start: Math.max(seg.epochs[0]!, seg.useableStart?.tdb() ?? -Infinity),
    end: Math.min(seg.epochs[count - 1]!, seg.useableStop?.tdb() ?? Infinity),
    epochs: seg.epochs,
    states: seg.states,
    method,
    windowSize,
    ...(seg.covariances
      ? {
          covariances: seg.covariances,
          varianceToM2: units === "km" ? 1e6 : 1,
        }
      : {}),
  };
}

function spkPiece(seg: StateSegment): Piece {
  return {
    // Never beyond the stored epochs, whatever the summary says (R3).
    start: Math.max(seg.start, seg.epochs[0]!),
    end: Math.min(seg.end, seg.epochs[seg.epochs.length - 1]!),
    epochs: seg.epochs,
    states: seg.states.map((v) => v * 1000),
    method: seg.method,
    windowSize: seg.windowSize,
  };
}

/** Sorted, with overlapping and touching intervals merged. */
function mergeSpans(pieces: readonly Piece[]): [number, number][] {
  const sorted = pieces
    .map((p): [number, number] => [p.start, p.end])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) {
      last[1] = Math.max(last[1], span[1]);
    } else {
      merged.push(span);
    }
  }
  return merged;
}

/** Each trajectory's frame, so a frame can be traced back to its trajectory. */
const byFrame = new WeakMap<Frame, Trajectory>();

/** What is known of the time scale of a trajectory's coordinates. */
export type CoordinateScale = "tdb" | "unknown";

/**
 * An object's path through space, from OEM or SPK data. `state` gives its
 * position and velocity in `reference`, in meters and m/s, only where the
 * data covers the instant: it never extrapolates (R3). `frame` places the
 * object in the frame tree: a child of `reference` translated to the object,
 * with `reference`'s axes.
 */
export class Trajectory<N extends string = string> {
  readonly name: N;
  readonly accuracy: TrajectoryAccuracy;
  /** The frame the states are in. */
  readonly reference: Frame;
  /** A child of `reference` whose origin is the object, with `reference`'s axes. */
  readonly frame: Frame<N>;
  /** Covered intervals, TDB seconds, sorted and merged. */
  readonly spans: readonly (readonly [number, number])[];
  /** Pieces in precedence order: the last that covers an instant wins (R4). */
  private readonly pieces: readonly Piece[];
  private readonly scratch = new Float64Array(6);
  /** Where the data came from. */
  readonly source: "oem" | "spk";
  /**
   * Whether the data's coordinates are known to be TDB-compatible ("tdb") or
   * their scale is not stated ("unknown", the default). OEM files don't say
   * which, and an SPK converted from one inherits that.
   */
  readonly coordinateScale: CoordinateScale;
  private readonly sigma: number | undefined;

  private constructor(
    name: N,
    accuracy: TrajectoryAccuracy,
    reference: Frame,
    allPieces: readonly Piece[],
    private readonly leap: LeapSeconds,
    source: "oem" | "spk",
    positionSigma: number | undefined,
    coordinateScale: CoordinateScale,
  ) {
    if (coordinateScale !== "tdb" && coordinateScale !== "unknown") {
      throw new Error(
        `Trajectory "${name}": coordinateScale must be "tdb" or "unknown", got ${String(coordinateScale)}`,
      );
    }
    this.coordinateScale = coordinateScale;
    if (
      positionSigma !== undefined &&
      !(Number.isFinite(positionSigma) && positionSigma >= 0)
    ) {
      throw new Error(
        `Trajectory "${name}": positionSigma must be a finite number of meters, 0 or more, got ${positionSigma}`,
      );
    }
    this.source = source;
    this.sigma = positionSigma;
    this.name = name;
    this.accuracy = accuracy;
    this.reference = reference;
    // A piece whose clamped range is empty (a useable range or summary wholly
    // outside the epochs) covers nothing: it must not appear in `spans`.
    const pieces = allPieces.filter((p) => p.start <= p.end);
    if (pieces.length === 0) {
      throw new Error(
        `Trajectory "${name}": none of its data covers any time (every useable range lies outside the stored epochs)`,
      );
    }
    this.pieces = pieces;
    this.spans = mergeSpans(pieces);
    this.frame = new Frame(
      name,
      reference,
      (instant, out) => {
        this.state(instant, this.scratch);
        toParentMatrix(IDENTITY, this.scratch, out);
      },
      { accuracy: (instant) => this.frameAccuracy(instant) },
    );
    byFrame.set(this.frame, this);
  }

  /** The trajectory whose `frame` is `frame`, or `undefined` for any other frame. */
  static of(frame: Frame): Trajectory | undefined {
    return byFrame.get(frame);
  }

  /** Whether the data covers `instant`. */
  contains(instant: Instant): boolean {
    return this.find(instant.tdb()) !== undefined;
  }

  /**
   * Position (m) and velocity (m/s) in `reference` at `instant`. Throws
   * outside `spans`, listing them as ISO UTC.
   */
  state(
    instant: Instant,
    out: Float64Array = new Float64Array(6),
  ): Float64Array {
    const t = instant.tdb();
    const piece = this.find(t);
    if (!piece) {
      const covered = this.spans.map(
        ([a, b]) => `${iso(a, this.leap)} to ${iso(b, this.leap)}`,
      );
      throw new Error(
        `Trajectory "${this.name}": ${iso(t, this.leap)} is outside its data (covered: ${covered.join("; ")})`,
      );
    }
    const first = windowStart(piece.epochs, t, piece.windowSize);
    return interpolateState(
      piece.method,
      piece.epochs,
      piece.states,
      first,
      piece.windowSize,
      t,
      out,
    );
  }

  /**
   * The 1σ RSS position uncertainty in meters at `instant`: from the
   * covariance epochs in the segment `state` would use, `sqrt(c11 + c22 +
   * c33)`, the larger of the latest epoch at or before the instant and the
   * next one (conservative between epochs); failing that, the `positionSigma` option; failing
   * both, or outside the data, `undefined`. This is an accuracy query, so it
   * never throws.
   */
  positionSigma(instant: Instant): number | undefined {
    if (!this.find(instant.tdb())) {
      return undefined;
    }
    return this.covarianceSigma(instant, POSITION_DIAGONAL) ?? this.sigma;
  }

  /**
   * The 1σ RSS velocity uncertainty in m/s at `instant`, from the same
   * covariance epochs as `positionSigma` (`sqrt(c44 + c55 + c66)`, the
   * larger of the two epochs around it); `undefined` where the segment has
   * no covariance, or outside the data. Never throws.
   */
  velocitySigma(instant: Instant): number | undefined {
    return this.covarianceSigma(instant, VELOCITY_DIAGONAL);
  }

  /**
   * The position block of the 6×6 covariance at `instant`: row-major 3×3, m²,
   * in the reference's axes, from the same covariance epoch as
   * `positionSigma` (the one of the latest at or before the instant and the
   * next with the larger trace); `undefined` where the segment has no
   * covariance, or outside the data. Never throws.
   */
  positionCovariance(instant: Instant): Float64Array | undefined {
    const t = instant.tdb();
    const piece = this.find(t);
    const cov = piece?.covariances;
    if (!piece || !cov) {
      return undefined;
    }
    let lo = 0;
    let hi = cov.epochs.length - 1;
    let at = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cov.epochs[mid]! <= t) {
        at = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (at < 0) {
      return undefined;
    }
    const v = cov.values;
    const k = piece.varianceToM2!;
    const block = (e: number): Float64Array => {
      const o = e * 21;
      // The lower triangle's first six values: c11, c21 c22, c31 c32 c33.
      return Float64Array.from(
        [
          v[o]!,
          v[o + 1]!,
          v[o + 3]!,
          v[o + 1]!,
          v[o + 2]!,
          v[o + 4]!,
          v[o + 3]!,
          v[o + 4]!,
          v[o + 5]!,
        ],
        (x) => x * k,
      );
    };
    const trace = (c: Float64Array): number => c[0]! + c[4]! + c[8]!;
    const here = block(at);
    if (at + 1 < cov.epochs.length) {
      const next = block(at + 1);
      return trace(next) > trace(here) ? next : here;
    }
    return here;
  }

  /**
   * What the trajectory's reference frame states (plan 5b's call 21): the
   * position covariance, else `positionSigma`, as 1σ; a coordinate-scale
   * figure of 2.5 × 10⁻⁸ of the geocentric distance as a second figure
   * where the scale is "unknown" and the reference is under EARTH_ICRF. A
   * zero sigma is exact by definition. Not stated without either, or
   * outside the data.
   */
  private frameAccuracy(instant: Instant): FrameAccuracy {
    const approximate =
      this.accuracy === "approximate" ? " (approximate trajectory)" : "";
    const notStated = (why: string): FrameAccuracy => ({
      note: `Trajectory "${this.name}": ${why}${this.accuracy === "approximate" ? "; its accuracy is approximate" : ""}`,
    });
    if (!this.contains(instant)) {
      return notStated("not known outside its data");
    }
    const sigma = this.positionSigma(instant);
    if (sigma === undefined) {
      return notStated(
        "no position sigma (no covariance, no positionSigma option)",
      );
    }
    if (sigma === 0) {
      return {
        byDefinition: true,
        note: `Trajectory "${this.name}": exact by definition (a position sigma of 0)`,
      };
    }
    const covariance = this.positionCovariance(instant);
    const figure: FrameAccuracy =
      covariance !== undefined && positiveSemiDefinite(covariance)
        ? {
            meters: sigma,
            covariance,
            term: "trajectory",
            note: `Trajectory "${this.name}": position covariance${approximate}`,
          }
        : {
            meters: sigma,
            term: "trajectory",
            note: `Trajectory "${this.name}": position sigma${approximate}`,
          };
    let reference: Frame | undefined = this.reference;
    while (reference !== undefined && reference.name !== "EARTH_ICRF") {
      reference = reference.parent;
    }
    if (this.coordinateScale !== "unknown" || reference === undefined) {
      return figure;
    }
    const s = this.state(instant);
    return {
      ...figure,
      parts: [
        {
          meters: COORDINATE_SCALE * Math.hypot(s[0]!, s[1]!, s[2]!),
          term: "coordinate scale",
          note: `Trajectory "${this.name}": the scale of its coordinates (TDB or TT) is not stated, taken as TDB-compatible: 2.5 × 10⁻⁸ of the geocentric distance`,
        },
      ],
    };
  }

  /** `sqrt` of the summed diagonal terms `diagonal` (indices into a 21-value lower triangle) at `instant`. */
  private covarianceSigma(
    instant: Instant,
    diagonal: readonly number[],
  ): number | undefined {
    const t = instant.tdb();
    const piece = this.find(t);
    const cov = piece?.covariances;
    if (!piece || !cov) {
      return undefined;
    }
    // Binary search: the last epoch <= t.
    let lo = 0;
    let hi = cov.epochs.length - 1;
    let at = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cov.epochs[mid]! <= t) {
        at = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (at < 0) {
      return undefined;
    }
    // The lower triangle, row by row: c11, c21 c22, c31 c32 c33, … Between
    // two epochs the larger of the two sigmas is the conservative one.
    const v = cov.values;
    const variance = (e: number): number =>
      diagonal.reduce((sum, i) => sum + v[e * 21 + i]!, 0);
    const next = at + 1 < cov.epochs.length ? variance(at + 1) : 0;
    return Math.sqrt(Math.max(variance(at), next) * piece.varianceToM2!);
  }

  private find(t: number): Piece | undefined {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i]!;
      if (t >= p.start && t <= p.end) {
        return p;
      }
    }
    return undefined;
  }

  /**
   * From the segments of an OEM. A segment uses its header's interpolation;
   * without one it uses `options.interpolation`, and without that this
   * throws (R5). `options.object` picks one object when the OEM holds
   * several. Later segments win where they overlap.
   */
  static fromOem<N extends string>(
    oem: { segments: OemSegment[] },
    frames: Frames,
    options: {
      name: N;
      accuracy: TrajectoryAccuracy;
      object?: string;
      interpolation?: { method: InterpolationMethod; degree: number };
      /** 1σ RSS position, m, where a segment has no covariance. */
      positionSigma?: number;
      /**
       * Whether the coordinates are known to be TDB-compatible; default
       * "unknown", which adds the coordinate-scale term to an accuracy
       * statement for data referenced to the Earth-centred inertial frames.
       */
      coordinateScale?: CoordinateScale;
      /**
       * The unit of the OEM's covariance values (R7). CCSDS says km, km² for
       * position variances, and that is the default. NASA's Artemis II BET
       * file writes m²: pass "m" for it.
       */
      covarianceUnits?: CovarianceUnits;
    },
  ): Trajectory<N> {
    let segments = oem.segments;
    if (options.object !== undefined) {
      segments = segments.filter(
        (s) => s.objectName === options.object || s.objectId === options.object,
      );
      if (segments.length === 0) {
        throw new Error(
          `Trajectory: the OEM has no object "${options.object}" (it has ${objectList(oem.segments)})`,
        );
      }
    } else if (new Set(segments.map(objectKey)).size > 1) {
      throw new Error(
        `Trajectory: the OEM has several objects (${objectList(segments)}); pass the object option`,
      );
    }
    if (segments.length === 0) {
      throw new Error("Trajectory: the OEM has no segments");
    }
    const references = segments.map((s) =>
      referenceFor(
        frames,
        oemCenter(s.centerName),
        oemAxes(s.refFrame),
        `center "${s.centerName}" in frame "${s.refFrame}"`,
      ),
    );
    const reference = references[0]!;
    if (references.some((r) => r !== reference)) {
      throw new Error(
        "Trajectory: all OEM segments must map to one reference frame",
      );
    }
    const pieces = segments.map((s) =>
      oemPiece(s, options.interpolation, options.covarianceUnits ?? "km"),
    );
    return new Trajectory(
      options.name,
      options.accuracy,
      reference,
      pieces,
      frames.data.leapSeconds,
      "oem",
      options.positionSigma,
      options.coordinateScale ?? "unknown",
    );
  }

  /**
   * From the segments of SPK `files` for NAIF id `target`. Later files win
   * over earlier ones, and later segments over earlier ones in a file (R4).
   * `j2000` says what axes the SPK's frame 1 holds: NAIF's conversion of an
   * EME2000 OEM labels them J2000, while DE440's are ICRF (R1).
   */
  static fromSpk<N extends string>(
    files: ArrayBuffer[],
    target: number,
    frames: Frames,
    options: {
      name: N;
      accuracy: TrajectoryAccuracy;
      j2000: "icrf" | "eme2000";
      /** 1σ RSS position, m. */
      positionSigma?: number;
      /**
       * Whether the coordinates are known to be TDB-compatible; default
       * "unknown", which adds the coordinate-scale term to an accuracy
       * statement for data referenced to the Earth-centred inertial frames.
       */
      coordinateScale?: CoordinateScale;
    },
  ): Trajectory<N> {
    const segments: StateSegment[] = [];
    for (const file of files) {
      for (const seg of readSpk(file).segments) {
        if (seg.target !== target) {
          continue;
        }
        if (seg.type === 2) {
          throw new Error(
            `Trajectory: SPK target ${target} has a type 2 segment; only types 8, 9, 12 and 13 are supported`,
          );
        }
        segments.push(seg);
      }
    }
    if (segments.length === 0) {
      throw new Error(
        `Trajectory: the SPK files have no segment for target ${target}`,
      );
    }
    const references = segments.map((s) => {
      let axes: Axes | undefined;
      if (s.frame === 1) {
        axes = options.j2000 === "eme2000" ? "EME2000" : "ICRF";
      } else if (s.frame === 13000) {
        axes = "ITRF";
      }
      return referenceFor(
        frames,
        CENTER_IDS[s.center],
        axes,
        `center ${s.center}, frame ${s.frame}`,
      );
    });
    const reference = references[0]!;
    if (references.some((r) => r !== reference)) {
      throw new Error(
        `Trajectory: all SPK segments of target ${target} must map to one reference frame`,
      );
    }
    return new Trajectory(
      options.name,
      options.accuracy,
      reference,
      segments.map(spkPiece),
      frames.data.leapSeconds,
      "spk",
      options.positionSigma,
      options.coordinateScale ?? "unknown",
    );
  }
}

const objectKey = (s: OemSegment): string => `${s.objectName} (${s.objectId})`;

function objectList(segments: readonly OemSegment[]): string {
  return [...new Set(segments.map(objectKey))].join(", ");
}
