import { describe, expect, it } from "vitest";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";

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

describe("LeapSeconds", () => {
  it("reads TAI-UTC from a TAI time, including inside a leap second", () => {
    // TAI on the UTC-ms scale: UTC ms plus 1000 * TAI-UTC.
    const b = Date.UTC(2017, 0, 1);
    expect(leap.taiMinusUtcAtTai(b + 36_000 - 1)).toBe(36);
    // 23:59:60.5 is TAI 36.5 s past the boundary: still the old offset.
    expect(leap.taiMinusUtcAtTai(b + 36_500)).toBe(36);
    expect(leap.taiMinusUtcAtTai(b + 37_000)).toBe(37);
    expect(leap.taiMinusUtcAtTai(Date.UTC(1972, 0, 1) + 10_000)).toBe(10);
  });

  it("steps TAI-UTC at each leap second", () => {
    expect(leap.taiMinusUtc(Date.UTC(2016, 0, 1))).toBe(36);
    expect(leap.taiMinusUtc(Date.UTC(2017, 0, 1))).toBe(37);
    expect(leap.taiMinusUtc(Date.UTC(2016, 11, 31, 23, 59, 59))).toBe(36);
    expect(leap.taiMinusUtc(Date.UTC(1972, 0, 1))).toBe(10);
  });

  it("reports expiry from the file header", () => {
    expect(leap.expires).toBe(Date.UTC(2027, 5, 28));
    expect(leap.isExpired(Date.UTC(2027, 5, 29))).toBe(true);
    expect(leap.isExpired(Date.UTC(2026, 0, 1))).toBe(false);
  });
});

describe("Instant", () => {
  it("is zero at J2000 TT", () => {
    const t = Instant.fromUtc(Date.UTC(2000, 0, 1, 11, 58, 55, 816), leap);
    expect(Math.abs(t.tt)).toBeLessThan(1e-9);
  });

  it("counts the 2016 leap second", () => {
    const after = Instant.fromUtc(Date.UTC(2017, 0, 1), leap).tt;
    const before = Instant.fromUtc(Date.UTC(2016, 11, 31, 23, 59, 59), leap).tt;
    expect(Math.abs(after - before - 2)).toBeLessThan(1e-9);
  });

  it("round-trips UTC exactly", () => {
    for (const ms of [
      Date.UTC(2049, 11, 31, 23, 59, 59, 999),
      Date.UTC(2026, 3, 6, 22, 44, 0),
    ]) {
      expect(Instant.fromUtc(ms, leap).toUtc(leap)).toBe(ms);
    }
  });

  it("derives TAI and a two-part Julian date from TT", () => {
    const t = Instant.fromTt(123456.789);
    expect(t.tai()).toBe(t.tt - 32.184);
    expect(t.jdTt()).toEqual([2451545.0, t.tt / 86400]);
  });
});
