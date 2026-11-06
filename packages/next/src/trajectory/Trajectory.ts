import { readSpk, type StateSegment } from "../ephemeris/spk.ts";
import { Frame } from "../frames/Frame.ts";
import type { Frames } from "../frames/frames.ts";
import { toParentMatrix } from "../frames/matrix.ts";
import { Instant } from "../time/Instant.ts";
import { LeapSeconds } from "../time/leapSeconds.ts";
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
}

type Center = "EARTH" | "MOON" | "SUN" | "SSB";
type Axes = "EME2000" | "ICRF" | "ITRF";

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const CENTER_IDS: Readonly<Record<number, Center>> = {
  399: "EARTH",
  301: "MOON",
  10: "SUN",
  0: "SSB",
};

const iso = (tdb: number): string =>
  new Date(Instant.fromTdb(tdb).toUtc(LeapSeconds.builtIn())).toISOString();

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
          ? frames.gcrf
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

  private constructor(
    name: N,
    accuracy: TrajectoryAccuracy,
    reference: Frame,
    pieces: readonly Piece[],
  ) {
    this.name = name;
    this.accuracy = accuracy;
    this.reference = reference;
    this.pieces = pieces;
    this.spans = mergeSpans(pieces);
    this.frame = new Frame(name, reference, (instant, out) => {
      this.state(instant, this.scratch);
      toParentMatrix(IDENTITY, this.scratch, out);
    });
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
      const covered = this.spans.map(([a, b]) => `${iso(a)} to ${iso(b)}`);
      throw new Error(
        `Trajectory "${this.name}": ${iso(t)} is outside its data (covered: ${covered.join("; ")})`,
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
    const pieces = segments.map((s) => oemPiece(s, options.interpolation));
    return new Trajectory(options.name, options.accuracy, reference, pieces);
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
    );
  }
}

const objectKey = (s: OemSegment): string => `${s.objectName} (${s.objectId})`;

function objectList(segments: readonly OemSegment[]): string {
  return [...new Set(segments.map(objectKey))].join(", ");
}
