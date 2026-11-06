import { describe, expect, it } from "vitest";
import { chebyshev } from "../src/ephemeris/chebyshev.ts";
import { parseDaf } from "../src/ephemeris/daf.ts";
import { readDaf } from "../src/ephemeris/spk.ts";
import { writeSpk, type SpkWriterSegment } from "./spkWriter.ts";

// Four records of 100 s; each axis is a known cubic in absolute time,
// re-expressed as Chebyshev coefficients on every record's own interval.
const INIT = -200;
const LEN = 100;
const COUNT = 4;
const NCOEF = 4; // cubic
const RSIZE = 2 + 3 * NCOEF;
const POLY: readonly (readonly number[])[] = [
  [1000, 2.5, -0.01, 3e-5], // x(t) = sum a_k t^k, km
  [-500, 0.75, 0.002, -1e-5],
  [20, -1.25, 0.0005, 2e-6],
];

const evalPoly = (a: readonly number[], t: number): number =>
  a.reduce((s, c, k) => s + c * t ** k, 0);
const evalDeriv = (a: readonly number[], t: number): number =>
  a.reduce((s, c, k) => (k === 0 ? s : s + k * c * t ** (k - 1)), 0);

/** Chebyshev coefficients of a cubic on [mid - r, mid + r], via the monomial basis in u = (t - mid) / r. */
function chebCoefficients(
  a: readonly number[],
  mid: number,
  r: number,
): number[] {
  // Shift to u: p(t) = sum b_j u^j with b = coefficients of a(mid + r u).
  const b = [0, 0, 0, 0];
  const binom = [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [1, 2, 1, 0],
    [1, 3, 3, 1],
  ];
  for (let k = 0; k < 4; k++) {
    for (let j = 0; j <= k; j++) {
      b[j]! += a[k]! * binom[k]![j]! * mid ** (k - j) * r ** j;
    }
  }
  // u^2 = (T0 + T2) / 2, u^3 = (3 T1 + T3) / 4.
  return [b[0]! + b[2]! / 2, b[1]! + (3 * b[3]!) / 4, b[2]! / 2, b[3]! / 4];
}

function makeRecords(): Float64Array {
  const out = new Float64Array(COUNT * RSIZE);
  for (let i = 0; i < COUNT; i++) {
    const mid = INIT + (i + 0.5) * LEN;
    const r = LEN / 2;
    out.set([mid, r], i * RSIZE);
    POLY.forEach((a, axis) =>
      out.set(chebCoefficients(a, mid, r), i * RSIZE + 2 + axis * NCOEF),
    );
  }
  return out;
}

const segment = (over: Partial<SpkWriterSegment> = {}): SpkWriterSegment => ({
  target: 301,
  center: 3,
  frame: 1,
  init: INIT,
  intervalLength: LEN,
  recordSize: RSIZE,
  records: makeRecords(),
  ...over,
});

describe("readDaf", () => {
  it("reads an SPK segment's ids, span and record layout", () => {
    const { kind, segments } = readDaf(
      writeSpk({ kind: "SPK", segments: [segment()] }),
    );
    expect(kind).toBe("SPK");
    expect(segments).toHaveLength(1);
    const s = segments[0]!;
    expect([s.target, s.center, s.frame]).toEqual([301, 3, 1]);
    expect([s.start, s.end]).toEqual([INIT, INIT + COUNT * LEN]);
    expect([s.init, s.intervalLength, s.recordSize, s.count]).toEqual([
      INIT,
      LEN,
      RSIZE,
      COUNT,
    ]);
    expect(Array.from(s.coefficients())).toEqual(Array.from(makeRecords()));
  });

  it("reads a binary PCK segment, with center 0", () => {
    const { kind, segments } = readDaf(
      writeSpk({
        kind: "PCK",
        segments: [segment({ target: 31008, frame: 1 })],
      }),
    );
    expect(kind).toBe("PCK");
    const s = segments[0]!;
    expect([s.target, s.center, s.frame, s.count]).toEqual([
      31008,
      0,
      1,
      COUNT,
    ]);
  });

  it("follows the summary-record list past the first record", () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      segment({ target: 1000 + i }),
    );
    const { segments } = readDaf(writeSpk({ kind: "SPK", segments: many }));
    expect(segments.map((s) => s.target)).toEqual(many.map((s) => s.target));
    expect(segments[59]!.coefficients()[0]).toBe(INIT + 0.5 * LEN);
  });

  it("throws for big-endian files", () => {
    const buf = writeSpk({
      kind: "SPK",
      format: "BIG-IEEE",
      segments: [segment()],
    });
    expect(() => readDaf(buf)).toThrow(
      "DAF: only little-endian (LTL-IEEE) files are supported",
    );
  });

  it("throws for segment types other than 2", () => {
    const buf = writeSpk({ kind: "SPK", segments: [segment({ type: 3 })] });
    expect(() => readDaf(buf)).toThrow(
      "SPK: segment type 3 is not supported (type 2 only)",
    );
  });

  it("throws for an unrecognized file id", () => {
    const buf = writeSpk({
      kind: "SPK",
      idWord: "NOT/DAF ",
      segments: [segment()],
    });
    expect(() => readDaf(buf)).toThrow('DAF: unrecognized file id "NOT/DAF"');
  });

  it("reads the pre-1995 NAIF/DAF id, telling SPK from PCK by the summary size", () => {
    const spk = writeSpk({
      kind: "SPK",
      idWord: "NAIF/DAF",
      segments: [segment()],
    });
    expect(readDaf(spk).kind).toBe("SPK");
    const pck = writeSpk({
      kind: "PCK",
      idWord: "NAIF/DAF",
      segments: [segment()],
    });
    expect(readDaf(pck).kind).toBe("PCK");
  });
});

describe("DAF hardening", () => {
  const file = (): ArrayBuffer =>
    writeSpk({ kind: "SPK", segments: [segment()] });
  const withInt = (offset: number, value: number): ArrayBuffer => {
    const buf = file();
    new DataView(buf).setInt32(offset, value, true);
    return buf;
  };

  it("rejects ND = NI = 0, and terminates", () => {
    const buf = file();
    const view = new DataView(buf);
    view.setInt32(8, 0, true);
    view.setInt32(12, 0, true);
    expect(() => parseDaf(buf)).toThrow(
      /DAF: bad summary format \(ND=0, NI=0\)/,
    );
  });

  it.each([
    ["ND", -1, 8],
    ["ND", 125, 8],
    ["NI", 1, 12],
    ["NI", 251, 12],
  ])("rejects %s = %i", (_name, value, offset) => {
    expect(() => parseDaf(withInt(offset, value))).toThrow(
      /DAF: bad summary format/,
    );
  });

  it.each([2.5, -2, NaN])(
    "rejects a summary record whose NEXT is %s",
    (next) => {
      const buf = file();
      new DataView(buf).setFloat64(1024, next, true); // record 2's NEXT
      expect(() => parseDaf(buf)).toThrow("DAF: corrupt summary record chain");
    },
  );

  it.each([0, -100])(
    "rejects a type-2 segment with intervalLength %i",
    (len) => {
      const buf = writeSpk({
        kind: "SPK",
        segments: [segment({ intervalLength: len })],
      });
      expect(() => readDaf(buf)).toThrow(/SPK: type-2 segment intervalLength/);
    },
  );
});

describe("chebyshev", () => {
  const { segments } = readDaf(
    writeSpk({ kind: "SPK", segments: [segment()] }),
  );
  const s = segments[0]!;
  const out = new Float64Array(6);

  it("reproduces the cubic and its derivative", () => {
    for (let t = INIT; t <= INIT + COUNT * LEN; t += 7.3) {
      chebyshev(
        s.coefficients(),
        s.recordSize,
        s.init,
        s.intervalLength,
        t,
        out,
      );
      POLY.forEach((a, axis) => {
        expect(Math.abs(out[axis]! - evalPoly(a, t))).toBeLessThan(1e-9);
        expect(Math.abs(out[3 + axis]! - evalDeriv(a, t))).toBeLessThan(1e-12);
      });
    }
  });

  it("takes the later record at an exact boundary, and is continuous across it", () => {
    const boundary = INIT + 2 * LEN;
    const records = s.coefficients();
    chebyshev(records, s.recordSize, s.init, s.intervalLength, boundary, out);
    const at = Array.from(out);
    // The later record (index 2) evaluated at its own start equals the full result.
    const mid = records[2 * RSIZE]!;
    const r = records[2 * RSIZE + 1]!;
    expect((boundary - mid) / r).toBe(-1);
    const before = new Float64Array(6);
    chebyshev(
      records,
      s.recordSize,
      s.init,
      s.intervalLength,
      boundary - 1e-9,
      before,
    );
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(at[k]! - before[k]!)).toBeLessThan(1e-6);
    }
    // Index choice: tamper with the earlier record so a wrong pick is visible.
    const tampered = records.slice();
    tampered[1 * RSIZE + 2]! += 1000; // record 1, x c0
    chebyshev(tampered, s.recordSize, s.init, s.intervalLength, boundary, out);
    expect(out[0]).toBe(at[0]);
  });

  it("clamps times outside the segment to the first and last records", () => {
    const records = s.coefficients();
    chebyshev(records, s.recordSize, s.init, s.intervalLength, INIT - 10, out);
    expect(Number.isFinite(out[0])).toBe(true);
    const end = INIT + COUNT * LEN;
    chebyshev(records, s.recordSize, s.init, s.intervalLength, end, out);
    expect(Math.abs(out[0]! - evalPoly(POLY[0]!, end))).toBeLessThan(1e-9);
  });
});
