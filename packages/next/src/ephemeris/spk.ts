import { parseDaf } from "./daf.ts";

/** One type-2 (Chebyshev, position only) segment of an SPK or binary PCK. */
export interface Type2Segment {
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
 * Read every segment of a little-endian SPK or binary PCK. Only type-2
 * segments are supported; any other type throws.
 */
export function readDaf(buffer: ArrayBuffer): {
  kind: "SPK" | "PCK";
  segments: Type2Segment[];
} {
  const daf = parseDaf(buffer);
  const kind = daf.id === "DAF/SPK" ? "SPK" : "PCK";
  const spk = kind === "SPK";
  // SPK: target, center, frame, type, initial, final. PCK: target, frame, type, initial, final.
  const expectedNi = spk ? 6 : 5;
  if (daf.nd !== 2 || daf.ni !== expectedNi) {
    throw new Error(
      `DAF: ${kind} summaries must have ND=2, NI=${expectedNi} (got ND=${daf.nd}, NI=${daf.ni})`,
    );
  }

  const segments = daf.summaries.map((summary): Type2Segment => {
    const [start, end] = summary.doubles as [number, number];
    const i = summary.ints;
    const target = i[0]!;
    const center = spk ? i[1]! : 0;
    const frame = spk ? i[2]! : i[1]!;
    const type = spk ? i[3]! : i[2]!;
    const initial = spk ? i[4]! : i[3]!;
    const final = spk ? i[5]! : i[4]!;
    if (type !== 2) {
      throw new Error(
        `SPK: segment type ${type} is not supported (type 2 only)`,
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
