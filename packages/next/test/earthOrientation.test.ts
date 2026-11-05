import { describe, expect, it } from "vitest";
import { icrfToFixed } from "../src/time/celestial.ts";
import { celestialToTerrestrial } from "../src/time/earthOrientation.ts";
import { EarthOrientationParameters, type EopSample } from "../src/time/eop.ts";
import { era00 } from "../src/time/erfa/rotation.ts";
import { s06 } from "../src/time/erfa/s06.ts";
import { xy06 } from "../src/time/erfa/xy06.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import earth from "./fixtures/frames/earth.json";
import earthLeap from "./fixtures/frames/earthLeap.json";

// An excerpt of IERS Leap_Second.dat (Bulletin C): 1972 (10 s) to 2017 (37 s).
const LEAP_DAT = `#  Value of TAI-UTC in second valid beginning at the date given
#  File expires on 28 June 2027
#
#    MJD        Date        TAI-UTC (s)
#           day month year
#                               s
#    ---    --------------   ------
#
 41317.0    1  1 1972       10
 41499.0    1  7 1972       11
 41683.0    1  1 1973       12
 42048.0    1  1 1974       13
 42413.0    1  1 1975       14
 42778.0    1  1 1976       15
 43144.0    1  1 1977       16
 43509.0    1  1 1978       17
 43874.0    1  1 1979       18
 44239.0    1  1 1980       19
 44786.0    1  7 1981       20
 45151.0    1  7 1982       21
 45516.0    1  7 1983       22
 46247.0    1  7 1985       23
 47161.0    1  1 1988       24
 47892.0    1  1 1990       25
 48257.0    1  1 1991       26
 48804.0    1  7 1992       27
 49169.0    1  7 1993       28
 49534.0    1  7 1994       29
 50083.0    1  1 1996       30
 50630.0    1  7 1997       31
 51179.0    1  1 1999       32
 53736.0    1  1 2006       33
 54832.0    1  1 2009       34
 56109.0    1  7 2012       35
 57204.0    1  7 2015       36
 57754.0    1  1 2017       37
`;

const leap = LeapSeconds.fromIers(LEAP_DAT);

type Row = (typeof earth)[number];

// Leap rows carry TT because UTC ms cannot name 23:59:60.5; the rest are
// built from UTC, like a Clock would.
const instantOf = (r: Row): Instant =>
  r.utcMs === null ? Instant.fromTt(r.tt!) : Instant.fromUtc(r.utcMs, leap);

/** TAI-UTC at the row's instant, read at its TAI (exact inside a leap second). */
const datOf = (r: Row): number =>
  leap.taiMinusUtcAtTai(946_728_000_000 + instantOf(r).tai() * 1000);

const sample = (r: Row): EopSample => ({
  ut1MinusUtc: r.dut1,
  ut1MinusTai: r.dut1 - datOf(r),
  xp: r.xp,
  yp: r.yp,
  dX: r.dx,
  dY: r.dy,
  predicted: false,
  degraded: false,
});

describe("Earth orientation (IAU 2006/2000A)", () => {
  it("xy06 matches pyerfa to 1e-12 rad", () => {
    let worst = 0;
    for (const r of earth) {
      const [x, y] = xy06(r.tt1, r.tt2);
      worst = Math.max(worst, Math.abs(x - r.x), Math.abs(y - r.y));
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it("s06 matches pyerfa to 1e-13 rad", () => {
    let worst = 0;
    for (const r of earth) {
      worst = Math.max(worst, Math.abs(s06(r.tt1, r.tt2, r.x, r.y) - r.s));
    }
    expect(worst).toBeLessThan(1e-13);
  });

  it("era00 matches pyerfa to 1e-13 rad", () => {
    let worst = 0;
    for (const r of earth) {
      worst = Math.max(worst, Math.abs(era00(r.ut11, r.ut12) - r.era));
    }
    expect(worst).toBeLessThan(1e-13);
  });

  it("celestialToTerrestrial matches the pyerfa matrix to 1e-11", () => {
    let worst = 0;
    for (const r of earth) {
      const m = celestialToTerrestrial(instantOf(r), sample(r));
      for (let i = 0; i < 9; i++) {
        worst = Math.max(worst, Math.abs(m[i]! - r.matrix[i]!));
      }
    }
    expect(worst).toBeLessThan(1e-11);
  });

  it("keeps the Earth rotation continuous across the 2016 leap second", () => {
    // UT1-UTC steps by +1 s as TAI-UTC does, so UT1 advances with TT. A wrong
    // leap-second row would put a 1 s (7.3e-5 rad) jump in the rotation.
    const rows = earth.filter((r) => "label" in r);
    expect(rows).toHaveLength(4);
    const matrices = rows.map((r) =>
      celestialToTerrestrial(instantOf(r), sample(r)),
    );
    for (let i = 1; i < rows.length; i++) {
      // Relative rotation angle from the trace of m_i * m_(i-1)^T.
      const a = matrices[i - 1]!;
      const b = matrices[i]!;
      let trace = 0;
      for (let k = 0; k < 9; k++) {
        trace += a[k]! * b[k]!;
      }
      const angle = Math.acos(Math.min(1, (trace - 1) / 2));
      const elapsed = rows[i]!.tt! - rows[i - 1]!.tt!;
      // Sidereal rate (rad/s) times the UT1 elapsed, which equals TT elapsed.
      expect(Math.abs(angle - 7.292115e-5 * elapsed)).toBeLessThan(1e-8);
    }
  });

  describe("inside the 2016 leap second, with EOP looked up from real rows", () => {
    // The store's EOP-All.csv rows 2016-12-29..2017-01-03, DAT 36 -> 37.
    const eop = EarthOrientationParameters.fromCelestrakCsv(earthLeap.csv);

    it("reads the pre-leap UT1-UTC (about -0.41 s, not +0.59 s)", () => {
      for (const r of earthLeap.rows) {
        const s = eop.atInstant(Instant.fromTt(r.tt), leap);
        expect(Math.abs(s.ut1MinusUtc - r.dut1)).toBeLessThan(1e-6);
      }
    });

    it("matches pyerfa's chain at 23:59:60.000, .500 and .999 to 1e-11", () => {
      let worst = 0;
      for (const r of earthLeap.rows) {
        const t = Instant.fromTt(r.tt);
        const m = celestialToTerrestrial(t, eop.atInstant(t, leap));
        for (let i = 0; i < 9; i++) {
          worst = Math.max(worst, Math.abs(m[i]! - r.matrix[i]!));
        }
      }
      expect(worst).toBeLessThan(1e-11);
    });

    it("advances the rotation through the leap second, not repeating 00:00:00", () => {
      // The matrix at 23:59:60.000 TAI must differ from the one at 00:00:00,
      // 1 s later, by the sidereal rate times 1 s.
      const at = (tt: number) => {
        const t = Instant.fromTt(tt);
        return celestialToTerrestrial(t, eop.atInstant(t, leap));
      };
      const start = earthLeap.rows[0]!.tt;
      const a = at(start);
      const b = at(start + 1);
      let trace = 0;
      for (let k = 0; k < 9; k++) {
        trace += a[k]! * b[k]!;
      }
      const angle = Math.acos(Math.min(1, (trace - 1) / 2));
      expect(Math.abs(angle - 7.292115e-5)).toBeLessThan(1e-8);
    });
  });

  it("is a rotation", () => {
    for (const r of earth) {
      const m = celestialToTerrestrial(instantOf(r), sample(r));
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          let dot = 0;
          for (let k = 0; k < 3; k++) {
            dot += m[3 * i + k]! * m[3 * j + k]!;
          }
          expect(Math.abs(dot - (i === j ? 1 : 0))).toBeLessThan(1e-14);
        }
      }
      const det =
        m[0]! * (m[4]! * m[8]! - m[5]! * m[7]!) -
        m[1]! * (m[3]! * m[8]! - m[5]! * m[6]!) +
        m[2]! * (m[3]! * m[7]! - m[4]! * m[6]!);
      expect(Math.abs(det - 1)).toBeLessThan(1e-14);
    }
  });

  it("writes into the output array when given one", () => {
    const r = earth[0]!;
    const out = new Float64Array(9);
    const m = celestialToTerrestrial(instantOf(r), sample(r), out);
    expect(m).toBe(out);
  });

  it("stays within 0.01 degrees of the simplified icrfToFixed in 2026", () => {
    const utcMs = Date.UTC(2026, 0, 1);
    // Zero corrections: UT1 = UTC, so UT1 - TAI is minus TAI-UTC (37 s).
    const none: EopSample = {
      ut1MinusUtc: 0,
      ut1MinusTai: -37,
      xp: 0,
      yp: 0,
      dX: 0,
      dY: 0,
      predicted: false,
      degraded: false,
    };
    const m = celestialToTerrestrial(Instant.fromUtc(utcMs, leap), none);
    const n = icrfToFixed(utcMs);
    // Angle of the relative rotation m * n^T, from its trace.
    let trace = 0;
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 3; k++) {
        trace += m[3 * i + k]! * n[3 * i + k]!;
      }
    }
    const angle = Math.acos(Math.min(1, (trace - 1) / 2)) * (180 / Math.PI);
    expect(angle).toBeLessThan(0.01);
  });
});
