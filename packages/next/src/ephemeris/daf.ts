/**
 * Minimal reader for NAIF DAF (Double precision Array File) containers,
 * little-endian `LTL-IEEE` only. Layout follows NAIF's DAF Required Reading.
 *
 * Records are 1024 bytes and numbered from 1. Addresses are 1-based, in doubles.
 */

const RECORD_BYTES = 1024;
const RECORD_DOUBLES = RECORD_BYTES / 8;

/** One segment descriptor from a DAF summary record. */
export interface DafSummary {
  /** The ND double-precision summary components. */
  doubles: number[];
  /** The NI integer summary components. */
  ints: number[];
  /** The segment name from the paired name record, trailing blanks trimmed. */
  name: string;
}

export interface DafFile {
  /** The file record's ID word, e.g. "DAF/SPK". */
  id: string;
  nd: number;
  ni: number;
  summaries: DafSummary[];
  /** `count` doubles starting at the 1-based double address `address`, as a view. */
  doublesAt(address: number, count: number): Float64Array;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let s = "";
  for (let i = start; i < end; i++) {
    s += String.fromCharCode(bytes[i]!);
  }
  return s;
}

/** Parse the file record and walk every summary record. Does not interpret segment types. */
export function parseDaf(buffer: ArrayBuffer): DafFile {
  if (buffer.byteLength < RECORD_BYTES) {
    throw new Error("DAF: file is shorter than its file record");
  }
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const id = ascii(bytes, 0, 8);
  if (id !== "DAF/SPK " && id !== "DAF/PCK ") {
    throw new Error(`DAF: unrecognized file id "${id.trimEnd()}"`);
  }
  const format = ascii(bytes, 88, 96).trimEnd();
  if (format !== "LTL-IEEE") {
    throw new Error("DAF: only little-endian (LTL-IEEE) files are supported");
  }
  const nd = view.getInt32(8, true);
  const ni = view.getInt32(12, true);
  const forward = view.getInt32(76, true);
  const summarySize = nd + Math.ceil(ni / 2); // doubles
  // NAIF's bounds (DAF Required Reading): ND <= 124, 2 <= NI <= 250, and a
  // summary fits a record. Checked before the walk, which divides by the size.
  if (
    nd < 0 ||
    nd > 124 ||
    ni < 2 ||
    ni > 250 ||
    summarySize < 1 ||
    summarySize > RECORD_DOUBLES - 3
  ) {
    throw new Error(`DAF: bad summary format (ND=${nd}, NI=${ni})`);
  }
  const perRecord = Math.floor((RECORD_DOUBLES - 3) / summarySize);

  const summaries: DafSummary[] = [];
  const visited = new Set<number>();
  for (let record = forward; record !== 0;) {
    const base = (record - 1) * RECORD_BYTES;
    if (
      record < 1 ||
      base + 2 * RECORD_BYTES > buffer.byteLength ||
      visited.has(record)
    ) {
      throw new Error("DAF: corrupt summary record chain");
    }
    visited.add(record);
    const next = view.getFloat64(base, true);
    if (!Number.isInteger(next) || next < 0) {
      throw new Error("DAF: corrupt summary record chain");
    }
    const count = view.getFloat64(base + 16, true);
    if (!Number.isInteger(count) || count < 0 || count > perRecord) {
      throw new Error("DAF: corrupt summary record");
    }
    for (let i = 0; i < count; i++) {
      const at = base + (3 + i * summarySize) * 8;
      const doubles: number[] = [];
      for (let k = 0; k < nd; k++) {
        doubles.push(view.getFloat64(at + k * 8, true));
      }
      const ints: number[] = [];
      for (let k = 0; k < ni; k++) {
        ints.push(view.getInt32(at + nd * 8 + k * 4, true));
      }
      const nameAt = base + RECORD_BYTES + i * summarySize * 8;
      const name = ascii(bytes, nameAt, nameAt + summarySize * 8).trimEnd();
      summaries.push({ doubles, ints, name });
    }
    record = next;
  }

  return {
    id: id.trimEnd(),
    nd,
    ni,
    summaries,
    doublesAt(address: number, count: number): Float64Array {
      const offset = (address - 1) * 8;
      if (address < 1 || count < 0 || offset + count * 8 > buffer.byteLength) {
        throw new Error("DAF: segment data lies outside the file");
      }
      return new Float64Array(buffer, offset, count);
    },
  };
}
