import { describe, expect, it } from "vitest";
import { EarthOrientationParameters } from "../src/time/eop.ts";

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

  it("returns a row exactly at its midnight, in radians and seconds", () => {
    const s = eop.at(msOf(57752));
    expect(s.ut1MinusUtc).toBeCloseTo(-0.111, 14);
    expect(s.xp).toBeCloseTo(0.11 * ARCSEC, 18);
    expect(s.yp).toBeCloseTo(0.31 * ARCSEC, 18);
    expect(s.dX).toBeCloseTo(0.0002 * ARCSEC, 18);
    expect(s.dY).toBeCloseTo(-0.0003 * ARCSEC, 18);
    expect(s.predicted).toBe(false);
    expect(s.degraded).toBe(false);
  });

  it("uses 4-point Lagrange halfway between rows", () => {
    const s = eop.at(msOf(57752.5));
    expect(s.xp / ARCSEC).toBeCloseTo(
      lagrange(mjds.slice(0, 4), X.slice(0, 4), 57752.5),
      12,
    );
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
  });

  it("degrades to zeros before the first row", () => {
    const s = eop.at(msOf(57700));
    expect(s).toEqual({
      ut1MinusUtc: 0,
      xp: 0,
      yp: 0,
      dX: 0,
      dY: 0,
      predicted: false,
      degraded: true,
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
});
