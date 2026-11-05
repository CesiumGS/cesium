/** Writes synthetic type-2 SPK / binary PCK files in the DAF layout, for tests. */

export interface SpkWriterSegment {
  target: number;
  /** SPK only; ignored for PCK. */
  center?: number;
  frame: number;
  /** Segment data type, default 2. Only the type field is changed; the data is always type-2 shaped. */
  type?: number;
  /** TDB s past J2000 of the first record's start. */
  init: number;
  intervalLength: number;
  /** Doubles per record: 2 + 3 * (coefficients per axis). */
  recordSize: number;
  /** Flat records, each [MID, RADIUS, x coefficients, y coefficients, z coefficients]. */
  records: Float64Array;
}

export interface SpkWriterOptions {
  kind: "SPK" | "PCK";
  /** File-record format string, default "LTL-IEEE". The data is still written little-endian. */
  format?: string;
  /** Overrides the file record's ID word, default from `kind`. */
  idWord?: string;
  segments: SpkWriterSegment[];
}

const RECORD = 1024;
const DOUBLES = RECORD / 8;

export function writeSpk(options: SpkWriterOptions): ArrayBuffer {
  const spk = options.kind === "SPK";
  const nd = 2;
  const ni = spk ? 6 : 5;
  const ss = nd + Math.ceil(ni / 2);
  const perRecord = Math.floor((DOUBLES - 3) / ss);
  const n = options.segments.length;
  const groups = Math.max(1, Math.ceil(n / perRecord));

  // Record 1: file record. Then a (summary, name) record pair per group.
  const dataStartRecord = 1 + groups * 2 + 1;
  let nextAddress = (dataStartRecord - 1) * DOUBLES + 1; // 1-based, in doubles
  const placed = options.segments.map((s) => {
    const count = s.records.length / s.recordSize;
    const initial = nextAddress;
    const final = initial + s.records.length + 4 - 1;
    nextAddress = final + 1;
    return { s, count, initial, final };
  });

  const totalDoubles = nextAddress - 1;
  const totalRecords = Math.ceil(totalDoubles / DOUBLES);
  const buffer = new ArrayBuffer(totalRecords * RECORD);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const ascii = (offset: number, text: string): void => {
    bytes.fill(0x20, offset, offset + text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[offset + i] = text.charCodeAt(i);
    }
  };

  ascii(0, options.idWord ?? (spk ? "DAF/SPK " : "DAF/PCK "));
  view.setInt32(8, nd, true);
  view.setInt32(12, ni, true);
  ascii(16, "synthetic test file");
  view.setInt32(76, 2, true); // FWARD
  view.setInt32(80, 1 + (groups - 1) * 2 + 1, true); // BWARD
  view.setInt32(84, dataStartRecord + totalRecords, true); // FREE (unused)
  ascii(88, options.format ?? "LTL-IEEE");

  for (let g = 0; g < groups; g++) {
    const summaryRecord = 2 + g * 2; // 1-based record number
    const base = (summaryRecord - 1) * RECORD;
    const members = placed.slice(g * perRecord, (g + 1) * perRecord);
    view.setFloat64(base, g + 1 < groups ? summaryRecord + 2 : 0, true);
    view.setFloat64(base + 8, g > 0 ? summaryRecord - 2 : 0, true);
    view.setFloat64(base + 16, members.length, true);
    const nameBase = summaryRecord * RECORD; // the following record
    members.forEach(({ s, count, initial, final }, i) => {
      const at = base + (3 + i * ss) * 8;
      view.setFloat64(at, s.init, true);
      view.setFloat64(at + 8, s.init + count * s.intervalLength, true);
      const ints = spk
        ? [s.target, s.center ?? 0, s.frame, s.type ?? 2, initial, final]
        : [s.target, s.frame, s.type ?? 2, initial, final];
      ints.forEach((v, k) => view.setInt32(at + nd * 8 + k * 4, v, true));
      ascii(
        nameBase + i * ss * 8,
        `SEGMENT ${g * perRecord + i}`.padEnd(ss * 8),
      );
    });
  }

  for (const { s, count, initial } of placed) {
    const at = (initial - 1) * 8;
    s.records.forEach((v, i) => view.setFloat64(at + i * 8, v, true));
    const trailer = at + s.records.length * 8;
    [s.init, s.intervalLength, s.recordSize, count].forEach((v, i) =>
      view.setFloat64(trailer + i * 8, v, true),
    );
  }
  return buffer;
}
