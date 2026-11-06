import { parseDaf, type DafFile } from "./daf.ts";

/** One type-2 (Chebyshev, position only) segment of an SPK or binary PCK. */
export interface Type2Segment {
  type: 2;
  /** SPK: target body NAIF id. PCK: the body-frame class id (e.g. 31008 for MOON_PA). */
  target: number;
  /** SPK: center body NAIF id. PCK segments have no center; this is 0. */
  center: number;
  /** NAIF id of the reference frame (SPK) or the frame the angles refer to (PCK). */
  frame: number;
  /** First covered instant, TDB seconds past J2000. */
  start: number;
  /** Last covered instant, TDB seconds past J2000. */
  end: number;
  /** TDB seconds past J2000 at the start of the first record. */
  init: number;
  /** Seconds covered by each record. */
  intervalLength: number;
  /** Doubles per record: 2 + 3 * (coefficients per axis). */
  recordSize: number;
  /** Number of records. */
  count: number;
  /**
   * The segment's records back to back, each `[MID, RADIUS, c0..cn for x, y, z]`.
   * A view into the file buffer. For a PCK the three axes are Euler angles in radians.
   */
  coefficients(): Float64Array;
}

/**
 * A discrete-state SPK segment (types 8, 9, 12, 13): states at epochs, with
 * the interpolation SPICE uses for that type. Copied out of the file buffer.
 */
export interface StateSegment {
  type: 8 | 9 | 12 | 13;
  target: number;
  center: number;
  frame: number;
  name: string;
  /** First covered instant, TDB seconds past J2000. */
  start: number;
  /** Last covered instant, TDB seconds past J2000. */
  end: number;
  /** TDB seconds past J2000. Types 8 and 12 are expanded from their start and step. */
  epochs: Float64Array;
  /** Six values per epoch (x, y, z, vx, vy, vz), in km and km/s as stored. */
  states: Float64Array;
  /** Degree + 1 for types 8 and 9; the stored value + 1 for types 12 and 13. */
  windowSize: number;
  method: "lagrange" | "hermite";
}

const STATE_TYPES = new Set([8, 9, 12, 13]);

/** Read every segment of a little-endian SPK: type 2 and the discrete-state types 8, 9, 12 and 13. */
export function readSpk(buffer: ArrayBuffer): {
  segments: (Type2Segment | StateSegment)[];
} {
  const { kind, segments } = readSegments(buffer, true);
  if (kind !== "SPK") {
    throw new Error("SPK: not an SPK file");
  }
  return { segments };
}

/**
 * Read every segment of a little-endian SPK or binary PCK. Only type-2
 * segments are supported; any other type throws.
 */
export function readDaf(buffer: ArrayBuffer): {
  kind: "SPK" | "PCK";
  segments: Type2Segment[];
} {
  return readSegments(buffer, false) as {
    kind: "SPK" | "PCK";
    segments: Type2Segment[];
  };
}

function readSegments(
  buffer: ArrayBuffer,
  states: boolean,
): { kind: "SPK" | "PCK"; segments: (Type2Segment | StateSegment)[] } {
  const daf = parseDaf(buffer);
  // The old "NAIF/DAF" id carries no kind: ND=2, NI=6 is an SPK, ND=2, NI=5 a PCK.
  const kind =
    daf.id === "NAIF/DAF"
      ? daf.ni === 6
        ? "SPK"
        : "PCK"
      : daf.id === "DAF/SPK"
        ? "SPK"
        : "PCK";
  const spk = kind === "SPK";
  // SPK: target, center, frame, type, initial, final. PCK: target, frame, type, initial, final.
  const expectedNi = spk ? 6 : 5;
  if (daf.nd !== 2 || daf.ni !== expectedNi) {
    throw new Error(
      `DAF: ${kind} summaries must have ND=2, NI=${expectedNi} (got ND=${daf.nd}, NI=${daf.ni})`,
    );
  }

  const segments = daf.summaries.map((summary): Type2Segment | StateSegment => {
    const [start, end] = summary.doubles as [number, number];
    const i = summary.ints;
    const target = i[0]!;
    const center = spk ? i[1]! : 0;
    const frame = spk ? i[2]! : i[1]!;
    const type = spk ? i[3]! : i[2]!;
    const initial = spk ? i[4]! : i[3]!;
    const final = spk ? i[5]! : i[4]!;
    if (states && spk && STATE_TYPES.has(type)) {
      return readStateSegment(daf, summary.name, {
        type: type as StateSegment["type"],
        target,
        center,
        frame,
        start,
        end,
        initial,
        final,
      });
    }
    if (type !== 2) {
      throw new Error(
        states
          ? `SPK: segment type ${type} is not supported (types 2, 8, 9, 12, 13 only)`
          : `SPK: segment type ${type} is not supported (type 2 only)`,
      );
    }
    const length = final - initial + 1;
    if (length < 5) {
      throw new Error("SPK: type-2 segment is too short for its trailer");
    }
    const trailer = daf.doublesAt(final - 3, 4);
    const init = trailer[0]!;
    const intervalLength = trailer[1]!;
    const recordSize = trailer[2]!;
    const count = trailer[3]!;
    if (!(intervalLength > 0) || !Number.isFinite(intervalLength)) {
      throw new Error(
        `SPK: type-2 segment intervalLength must be positive (got ${intervalLength})`,
      );
    }
    if (
      !Number.isInteger(recordSize) ||
      !Number.isInteger(count) ||
      recordSize < 5 ||
      (recordSize - 2) % 3 !== 0 ||
      count < 1 ||
      count * recordSize !== length - 4
    ) {
      throw new Error(
        "SPK: type-2 segment trailer is inconsistent with its address range",
      );
    }
    return {
      type: 2,
      target,
      center,
      frame,
      start,
      end,
      init,
      intervalLength,
      recordSize,
      count,
      coefficients: () => daf.doublesAt(initial, count * recordSize),
    };
  });
  return { kind, segments };
}

function readStateSegment(
  daf: DafFile,
  name: string,
  s: {
    type: StateSegment["type"];
    target: number;
    center: number;
    frame: number;
    start: number;
    end: number;
    initial: number;
    final: number;
  },
): StateSegment {
  const { type, initial, final } = s;
  if (initial < 1 || final < initial) {
    throw new Error(`SPK: type-${type} segment has a bad address range`);
  }
  // Fails if the segment runs past the file, before anything is sized by n.
  daf.doublesAt(initial, final - initial + 1);
  const equal = type === 8 || type === 12;
  const trailerSize = equal ? 4 : 2;
  const length = final - initial + 1;
  const bad = (): Error =>
    new Error(
      `SPK: type-${type} segment trailer is inconsistent with its address range`,
    );
  if (length < trailerSize) {
    throw bad();
  }
  const trailer = daf.doublesAt(final - trailerSize + 1, trailerSize);
  const n = trailer[trailerSize - 1]!;
  const stored = trailer[trailerSize - 2]!;
  if (
    !Number.isInteger(n) ||
    n < 1 ||
    !Number.isInteger(stored) ||
    stored < 0
  ) {
    throw bad();
  }
  // States, then (types 9, 13) the epochs and a directory of every 100th, then the trailer.
  const expected = equal ? 6 * n + 4 : 7 * n + Math.floor((n - 1) / 100) + 2;
  if (length !== expected) {
    throw bad();
  }
  const windowSize = stored + 1;
  // SPICE's limits: Lagrange degree 27 (window 28), Hermite window 16.
  const maxWindow = type === 8 || type === 9 ? 28 : 16;
  if (windowSize > maxWindow) {
    throw new Error(
      `SPK: type-${type} segment window of ${windowSize} states exceeds the limit of ${maxWindow}`,
    );
  }
  if (windowSize > n) {
    throw new Error(
      `SPK: type-${type} segment window of ${windowSize} states exceeds its ${n} states`,
    );
  }
  const epochs = new Float64Array(n);
  if (equal) {
    const first = trailer[0]!;
    const step = trailer[1]!;
    if (!(step > 0) || !Number.isFinite(step) || !Number.isFinite(first)) {
      throw new Error(
        `SPK: type-${type} segment step must be positive (got ${step})`,
      );
    }
    for (let k = 0; k < n; k++) {
      epochs[k] = first + k * step;
    }
  } else {
    epochs.set(daf.doublesAt(initial + 6 * n, n));
    for (let k = 1; k < n; k++) {
      if (!(epochs[k]! > epochs[k - 1]!)) {
        throw new Error(
          `SPK: type-${type} segment epochs must strictly increase (epoch ${k})`,
        );
      }
    }
  }
  if (!Number.isFinite(s.start) || !Number.isFinite(s.end)) {
    throw new Error(
      `SPK: segment "${name}" (target ${s.target}) has a non-finite summary time (start ${s.start}, end ${s.end})`,
    );
  }
  return {
    type,
    target: s.target,
    center: s.center,
    frame: s.frame,
    name,
    start: s.start,
    end: s.end,
    epochs,
    states: new Float64Array(daf.doublesAt(initial, 6 * n)),
    windowSize,
    method: type === 8 || type === 9 ? "lagrange" : "hermite",
  };
}
