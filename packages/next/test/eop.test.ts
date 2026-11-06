import { describe, expect, it } from "vitest";
import { EarthOrientationParameters } from "../src/time/eop.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";

const ARCSEC = Math.PI / (180 * 3600);
const msOf = (mjd: number) => (mjd - 40587) * 86_400_000;

// Six rows spanning the 2016-12-31 leap second (DAT 36 -> 37). UT1-UTC steps
// by about -1 s across it; UT1-TAI is smooth.
const HEADER = "DATE,MJD,X,Y,UT1-UTC,LOD,DPSI,DEPS,DX,DY,DAT,DATA_TYPE";
const ROWS = [
  "2016-12-29,57751,0.10,0.30,-0.1100,0.5,0,0,0.0001,-0.0002,36,O",
  "2016-12-30,57752,0.11,0.31,-0.1110,0.5,0,0,0.0002,-0.0003,36,O",
  "2016-12-31,57753,0.13,0.34,-0.1125,0.5,0,0,0.0004,-0.0004,36,O",
  "2017-01-01,57754,0.16,0.36,0.8860,0.5,0,0,0.0005,-0.0006,37,O",
  "2017-01-02,57755,0.20,0.37,0.8840,0.5,0,0,0.0007,-0.0007,37,P",
  "2017-01-03,57756,0.25,0.39,0.8815,0.5,0,0,0.0010,-0.0009,37,P",
];
const CSV = `${[HEADER, ...ROWS].join("\n")}\n`;
const mjds = [57751, 57752, 57753, 57754, 57755, 57756];
const X = [0.1, 0.11, 0.13, 0.16, 0.2, 0.25];
const U = [-0.11, -0.111, -0.1125, 0.886, 0.884, 0.8815];
const DAT = [36, 36, 36, 37, 37, 37];
const leap = LeapSeconds.fromIers(`#  File expires on 28 June 2027
 57204.0    1  7 2015       36
 57754.0    1  1 2017       37
`);

function lagrange(xs: number[], ys: number[], x: number): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    let w = ys[i]!;
    for (let j = 0; j < xs.length; j++) {
      if (j !== i) {
        w *= (x - xs[j]!) / (xs[i]! - xs[j]!);
      }
    }
    s += w;
  }
  return s;
}

describe("EarthOrientationParameters", () => {
  const eop = EarthOrientationParameters.fromCelestrakCsv(CSV);

  it("reports first and last in UTC ms", () => {
    expect(eop.first).toBe(msOf(57751));
    expect(eop.last).toBe(msOf(57756));
  });

  it("reports lastObserved as the last row whose DATA_TYPE is not P", () => {
    expect(eop.lastObserved).toBe(msOf(57754));
    const allObserved = EarthOrientationParameters.fromCelestrakCsv(
      `${[HEADER, ...ROWS.slice(0, 4)].join("\n")}\n`,
    );
    expect(allObserved.lastObserved).toBe(allObserved.last);
  });

  it("returns a row exactly at its midnight, in radians and seconds", () => {
    const s = eop.at(msOf(57752));
    expect(s.ut1MinusUtc).toBe(-0.111);
    expect(s.xp).toBeCloseTo(0.11 * ARCSEC, 18);
    expect(s.yp).toBeCloseTo(0.31 * ARCSEC, 18);
    expect(s.dX).toBeCloseTo(0.0002 * ARCSEC, 18);
    expect(s.dY).toBeCloseTo(-0.0003 * ARCSEC, 18);
    expect(s.predicted).toBe(false);
    expect(s.degraded).toBe(false);
  });

  it("uses 4-point Lagrange halfway between rows", () => {
    const s = eop.at(msOf(57752.5));
    expect(
      Math.abs(
        s.xp / ARCSEC - lagrange(mjds.slice(0, 4), X.slice(0, 4), 57752.5),
      ),
    ).toBeLessThan(1e-12);
  });

  it("interpolates UT1-TAI across the leap second", () => {
    const tai = U.map((u, i) => u - DAT[i]!);
    const expected = lagrange(mjds.slice(1, 5), tai.slice(1, 5), 57753.5) + 36;
    const s = eop.at(msOf(57753.5));
    expect(Math.abs(s.ut1MinusUtc - expected)).toBeLessThan(1e-12);
    // Naive UT1-UTC interpolation would be off by a large fraction of a second.
    const naive = lagrange(mjds.slice(1, 5), U.slice(1, 5), 57753.5);
    expect(Math.abs(naive - s.ut1MinusUtc)).toBeGreaterThan(0.1);
  });

  it("shifts the window inward at both table edges", () => {
    const Y = [0.3, 0.31, 0.34, 0.36, 0.37, 0.39];
    // First interval: window is rows 0..3.
    const a = eop.at(msOf(57751.5));
    expect(
      Math.abs(
        a.xp / ARCSEC - lagrange(mjds.slice(0, 4), X.slice(0, 4), 57751.5),
      ),
    ).toBeLessThan(1e-12);
    expect(
      Math.abs(
        a.yp / ARCSEC - lagrange(mjds.slice(0, 4), Y.slice(0, 4), 57751.5),
      ),
    ).toBeLessThan(1e-12);
    // Last interval: window is rows n-4..n-1 (2..5).
    const b = eop.at(msOf(57755.5));
    expect(
      Math.abs(b.xp / ARCSEC - lagrange(mjds.slice(2), X.slice(2), 57755.5)),
    ).toBeLessThan(1e-12);
    expect(
      Math.abs(b.yp / ARCSEC - lagrange(mjds.slice(2), Y.slice(2), 57755.5)),
    ).toBeLessThan(1e-12);
    expect(b.degraded).toBe(false);
  });

  it("interpolates every field, not just xp, away from the leap second", () => {
    const Y = [0.3, 0.31, 0.34, 0.36];
    const DX = [0.0001, 0.0002, 0.0004, 0.0005];
    const DY = [-0.0002, -0.0003, -0.0004, -0.0006];
    const m = mjds.slice(0, 4);
    const s = eop.at(msOf(57752.5));
    expect(Math.abs(s.yp / ARCSEC - lagrange(m, Y, 57752.5))).toBeLessThan(
      1e-12,
    );
    expect(Math.abs(s.dX / ARCSEC - lagrange(m, DX, 57752.5))).toBeLessThan(
      1e-12,
    );
    expect(Math.abs(s.dY / ARCSEC - lagrange(m, DY, 57752.5))).toBeLessThan(
      1e-12,
    );
    const tai = U.map((u, i) => u - DAT[i]!);
    const expectedUt = lagrange(m, tai.slice(0, 4), 57752.5) + 36;
    expect(Math.abs(s.ut1MinusUtc - expectedUt)).toBeLessThan(1e-12);
  });

  it("flags an interpolated sample predicted when any window row is", () => {
    // Interval 57753..57754: window is rows 1..4, and row 4 is predicted.
    expect(eop.at(msOf(57753.5)).predicted).toBe(true);
    expect(eop.at(msOf(57752.5)).predicted).toBe(false);
    const small = EarthOrientationParameters.fromCelestrakCsv(
      `${[HEADER, ...ROWS.slice(0, 4)].join("\n")}\n`,
    );
    expect(small.at(msOf(57752.5)).predicted).toBe(false);
    expect(small.at(msOf(57753.5)).predicted).toBe(false);
  });

  it("returns NaN fields, degraded, for a NaN instant", () => {
    const s = eop.at(NaN);
    expect(s.degraded).toBe(true);
    expect(s.xp).toBeNaN();
    expect(s.ut1MinusUtc).toBeNaN();
    expect(s.ut1MinusTai).toBeNaN();
  });

  it("is not degraded at the last row", () => {
    expect(eop.at(msOf(57756)).degraded).toBe(false);
  });

  it("flags predicted rows", () => {
    expect(eop.at(msOf(57755)).predicted).toBe(true);
    expect(eop.at(msOf(57753)).predicted).toBe(false);
  });

  it("degrades past the last row, holding its values", () => {
    const s = eop.at(msOf(57760));
    expect(s.degraded).toBe(true);
    expect(s.predicted).toBe(true);
    expect(s.xp).toBeCloseTo(0.25 * ARCSEC, 18);
    expect(s.ut1MinusUtc).toBeCloseTo(0.8815, 14);
    expect(s.ut1MinusTai).toBeCloseTo(0.8815 - 37, 14);
  });

  it("degrades to zeros before the first row", () => {
    const s = eop.at(msOf(57700));
    // Zero corrections: UT1 = UTC, so UT1 - TAI is minus the first row's DAT.
    expect(s).toEqual({
      ut1MinusUtc: 0,
      ut1MinusTai: -36,
      xp: 0,
      yp: 0,
      dX: 0,
      dY: 0,
      predicted: false,
      degraded: true,
    });
  });

  it("gives UT1 - TAI at a row and interpolated across the leap second", () => {
    expect(eop.at(msOf(57754)).ut1MinusTai).toBe(0.886 - 37);
    const tai = U.map((u, i) => u - DAT[i]!);
    const s = eop.at(msOf(57753.5));
    expect(
      Math.abs(
        s.ut1MinusTai - lagrange(mjds.slice(1, 5), tai.slice(1, 5), 57753.5),
      ),
    ).toBeLessThan(1e-12);
    expect(Math.abs(s.ut1MinusUtc - s.ut1MinusTai - 36)).toBeLessThan(1e-12);
  });

  describe("atInstant", () => {
    // TT of 2017-01-01T00:00:00 UTC; the inserted second 23:59:60 is the 1 s before.
    const newYear = Instant.fromUtc(msOf(57754), leap).tt;

    it("agrees with at() on the instant's UTC away from a leap second", () => {
      for (const mjd of [57751.25, 57752.5, 57754.75, 57755.9]) {
        const a = eop.atInstant(Instant.fromUtc(msOf(mjd), leap), leap);
        const b = eop.at(msOf(mjd));
        expect(a.predicted).toBe(b.predicted);
        expect(a.degraded).toBe(b.degraded);
        for (const k of [
          "ut1MinusUtc",
          "ut1MinusTai",
          "xp",
          "yp",
          "dX",
          "dY",
        ] as const) {
          expect(Math.abs(a[k] - b[k])).toBeLessThan(1e-12);
        }
      }
    });

    it("reads the pre-leap day inside the inserted second", () => {
      const before = eop.at(msOf(57754) - 1);
      for (const back of [1, 0.5, 0.001]) {
        const s = eop.atInstant(Instant.fromTt(newYear - back), leap);
        // UT1 - UTC is the old day's (about -0.11 s here), consistent with
        // TAI - UTC = 36 inside the leap; the new day's would be +0.89.
        expect(Math.abs(s.ut1MinusUtc - before.ut1MinusUtc)).toBeLessThan(1e-9);
        expect(Math.abs(s.ut1MinusUtc - s.ut1MinusTai - 36)).toBeLessThan(
          1e-12,
        );
      }
    });

    it("keeps UT1 - TAI continuous through the leap second", () => {
      let previous = eop.atInstant(
        Instant.fromTt(newYear - 2),
        leap,
      ).ut1MinusTai;
      for (let k = -19; k <= 20; k++) {
        const s = eop.atInstant(Instant.fromTt(newYear + k * 0.1), leap);
        // About 1 ms/day drift: well under 1 us between samples 0.1 s apart.
        expect(Math.abs(s.ut1MinusTai - previous)).toBeLessThan(1e-6);
        previous = s.ut1MinusTai;
      }
    });

    it("degrades to zero corrections (UT1 = UTC) before the table", () => {
      // The table starts after the leap, so its first DAT (37) is not the
      // instant's (36): UT1 - TAI must come from the leap-second table.
      const late = EarthOrientationParameters.fromCelestrakCsv(
        `${[HEADER, ...ROWS.slice(3)].join("\n")}\n`,
      );
      const s = late.atInstant(Instant.fromUtc(msOf(57700), leap), leap);
      expect(s.degraded).toBe(true);
      expect(s.ut1MinusUtc).toBe(0);
      expect(s.ut1MinusTai).toBe(-36);
      expect(late.at(msOf(57700)).ut1MinusTai).toBe(-37);
    });
  });

  it("parses by header name, so column order is irrelevant", () => {
    const cols = HEADER.split(",");
    const order = [11, 5, 3, 0, 10, 9, 1, 2, 4, 8, 7, 6];
    const shuffled = [
      order.map((i) => cols[i]).join(","),
      ...ROWS.map((r) => {
        const f = r.split(",");
        return order.map((i) => f[i]).join(",");
      }),
    ].join("\n");
    const other = EarthOrientationParameters.fromCelestrakCsv(shuffled);
    for (const mjd of [57751, 57752.5, 57754.25, 57756, 57757]) {
      expect(other.at(msOf(mjd))).toEqual(eop.at(msOf(mjd)));
    }
  });

  describe("parse errors", () => {
    const parse = (rows: string[], header = HEADER) =>
      EarthOrientationParameters.fromCelestrakCsv(
        `${[header, ...rows].join("\n")}\n`,
      );

    it("throws on a missing column", () => {
      expect(() => parse(ROWS, HEADER.replace("DAT,", "DATX,"))).toThrow(
        /missing column DAT/,
      );
    });

    it("throws on a bad number, naming row and column", () => {
      const bad = ROWS.map((r, i) => (i === 2 ? r.replace("0.13", "abc") : r));
      expect(() => parse(bad)).toThrow(/row 4 has a bad X: abc/);
    });

    it("throws when there are no data rows", () => {
      expect(() => parse([])).toThrow(/no data rows/);
    });

    it("throws on a blank UT1-UTC, naming row and column", () => {
      const bad = ROWS.map((r, i) => (i === 1 ? r.replace("-0.1110", "") : r));
      expect(() => parse(bad)).toThrow(/row 3 has a blank UT1-UTC/);
    });

    it("treats blank DX and DY as zero", () => {
      const blank = ROWS.map((r, i) =>
        i === 1 ? r.replace("0.0002,-0.0003", ",") : r,
      );
      const s = parse(blank).at(msOf(57752));
      expect(s.dX).toBe(0);
      expect(s.dY).toBe(0);
    });

    it("throws on a row shorter than the header", () => {
      const bad = ROWS.map((r, i) =>
        i === 3 ? r.split(",").slice(0, 8).join(",") : r,
      );
      expect(() => parse(bad)).toThrow(/row 5 has 8 cells, expected 12/);
    });

    it("throws on duplicate MJDs", () => {
      expect(() => parse([...ROWS, ROWS[5]!])).toThrow(/duplicate/);
    });
  });
});
