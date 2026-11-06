import { describe, expect, it } from "vitest";
import { parseOem } from "../src/trajectory/oem.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";

const leap = LeapSeconds.builtIn();

describe("Instant.fromIso", () => {
  it("reads a calendar UTC epoch to the millisecond", () => {
    const i = Instant.fromIso("2026-04-02T01:58:21.397", "UTC", leap);
    expect(i.toUtc(leap)).toBe(Date.UTC(2026, 3, 2, 1, 58, 21, 397));
  });

  it("accepts a trailing Z", () => {
    const a = Instant.fromIso("2026-04-02T01:58:21.397Z", "UTC", leap);
    const b = Instant.fromIso("2026-04-02T01:58:21.397", "UTC", leap);
    expect(a.tt).toBe(b.tt);
  });

  it("takes years 0 to 99 as written, not as 1900 to 1999", () => {
    const tt = (iso: string) => Instant.fromIso(iso, "TT", leap).tt;
    const y50 = tt("0050-01-01T12:00:00");
    expect(y50).toBeLessThan(tt("0100-01-01T00:00:00"));
    expect(y50).not.toBe(tt("1950-01-01T12:00:00"));
    // 0050 is not a leap year, 0052 is (Gregorian): 365 + 366 days.
    expect(tt("0052-01-01T12:00:00") - y50).toBe(2 * 365 * 86400);
    expect(tt("0053-01-01T12:00:00") - tt("0052-01-01T12:00:00")).toBe(
      366 * 86400,
    );
    expect(() => tt("0050-366T00:00:00")).toThrow(/Invalid day of year/);
    expect(() => tt("0050-02-29T00:00:00")).toThrow(/Invalid date/);
  });

  it("reads the day-of-year form", () => {
    const a = Instant.fromIso("2026-092T01:58:21.397", "UTC", leap);
    const b = Instant.fromIso("2026-04-02T01:58:21.397", "UTC", leap);
    expect(a.tt).toBe(b.tt);
  });

  it("places 23:59:60.5 inside an inserted leap second", () => {
    const before = Instant.fromIso("2016-12-31T23:59:59", "UTC", leap);
    const inside = Instant.fromIso("2016-12-31T23:59:60.5", "UTC", leap);
    const after = Instant.fromIso("2017-01-01T00:00:00", "UTC", leap);
    expect(inside.tt - before.tt).toBeCloseTo(1.5, 9);
    expect(after.tt - inside.tt).toBeCloseTo(0.5, 9);
  });

  it("rejects second 60 on a day with no leap second", () => {
    expect(() => Instant.fromIso("2015-12-31T23:59:60", "UTC", leap)).toThrow(
      /leap/i,
    );
    expect(() => Instant.fromIso("2016-12-31T12:00:60", "UTC", leap)).toThrow(
      /leap/i,
    );
  });

  it("rejects second 60 in a non-UTC scale", () => {
    expect(() => Instant.fromIso("2016-12-31T23:59:60", "TAI", leap)).toThrow();
  });

  it("reads TT and TDB at J2000", () => {
    expect(Instant.fromIso("2000-01-01T12:00:00", "TT", leap).tt).toBe(0);
    expect(
      Math.abs(Instant.fromIso("2000-01-01T12:00:00", "TDB", leap).tdb()),
    ).toBeLessThan(1e-9);
  });

  it("reads TAI so that J2000 is 32.184 s before 12:00 TAI", () => {
    expect(
      Math.abs(Instant.fromIso("2000-01-01T11:59:27.816", "TAI", leap).tt),
    ).toBeLessThan(1e-9);
  });

  it("keeps every fraction digit", () => {
    const a = Instant.fromIso("2026-04-02T01:58:21.0000004", "UTC", leap);
    const b = Instant.fromIso("2026-04-02T01:58:21", "UTC", leap);
    // TT is ~8e8 s here, where a float64 step is 1.2e-7 s: the 0.4 us is kept
    // to that resolution, not to the brief's 1e-9.
    expect(a.tt - b.tt).toBeGreaterThan(0);
    expect(Math.abs(a.tt - b.tt - 4e-7)).toBeLessThan(1.2e-7);
  });

  it("rejects malformed text", () => {
    expect(() => Instant.fromIso("2026-04-02", "UTC", leap)).toThrow();
    expect(() => Instant.fromIso("2026-13-02T00:00:00", "UTC", leap)).toThrow();
    expect(() => Instant.fromIso("2026-00-15T00:00:00", "UTC", leap)).toThrow(
      /month/,
    );
    expect(() => Instant.fromIso("2026-04-02T25:00:00", "UTC", leap)).toThrow();
  });
});

const OEM = `CCSDS_OEM_VERS = 2.0
COMMENT made by a test
CREATION_DATE = 2026-04-01T00:00:00
ORIGINATOR = TEST

META_START
COMMENT first segment
OBJECT_NAME = ORION
OBJECT_ID = 2026-001A
CENTER_NAME = EARTH
REF_FRAME = EME2000
TIME_SYSTEM = UTC
START_TIME = 2026-04-02T00:00:00.000
USEABLE_START_TIME = 2026-04-02T00:00:10.000
USEABLE_STOP_TIME = 2026-04-02T00:00:50.000
STOP_TIME = 2026-04-02T00:01:00.000
INTERPOLATION = HERMITE
INTERPOLATION_DEGREE = 7
META_STOP

COMMENT data
2026-04-02T00:00:00.000 1.0 2.0 3.0 0.1 0.2 0.3
2026-04-02T00:00:30.000 1.5 2.5 3.5 0.1 0.2 0.3 0.001 0.002 0.003
2026-04-02T00:01:00.000 2.0 3.0 4.0 0.1 0.2 0.3

COVARIANCE_START
EPOCH = 2026-04-02T00:00:00.000
COV_REF_FRAME = EME2000
1.0
0.0 1.0
COVARIANCE_STOP

META_START
OBJECT_NAME = ORION
OBJECT_ID = 2026-001A
CENTER_NAME = EARTH
REF_FRAME = EME2000
TIME_SYSTEM = TT
START_TIME = 2026-092T00:02:00
STOP_TIME = 2026-092T00:03:00
META_STOP
2026-092T00:02:00 10 20 30 1 2 3
2026-092T00:03:00 11 21 31 1 2 3
`;

function oem(mutate: (s: string) => string): string {
  return mutate(OEM);
}

describe("parseOem", () => {
  const parsed = parseOem(OEM, leap);

  it("reads the version and segments", () => {
    expect(parsed.version).toBe("2.0");
    expect(parsed.segments).toHaveLength(2);
  });

  it("keeps the metadata strings", () => {
    const s = parsed.segments[0]!;
    expect(s.objectName).toBe("ORION");
    expect(s.objectId).toBe("2026-001A");
    expect(s.centerName).toBe("EARTH");
    expect(s.refFrame).toBe("EME2000");
    expect(s.timeSystem).toBe("UTC");
    expect(s.interpolation).toBe("HERMITE");
    expect(s.interpolationDegree).toBe(7);
    expect(parsed.segments[1]!.timeSystem).toBe("TT");
    expect(parsed.segments[1]!.interpolation).toBeUndefined();
    expect(parsed.segments[1]!.interpolationDegree).toBeUndefined();
  });

  it("reads times as instants", () => {
    const s = parsed.segments[0]!;
    expect(s.start.tt).toBe(
      Instant.fromIso("2026-04-02T00:00:00.000", "UTC", leap).tt,
    );
    expect(s.stop.tt).toBe(
      Instant.fromIso("2026-04-02T00:01:00.000", "UTC", leap).tt,
    );
    expect(s.useableStart?.tt).toBe(
      Instant.fromIso("2026-04-02T00:00:10.000", "UTC", leap).tt,
    );
    expect(s.useableStop?.tt).toBe(
      Instant.fromIso("2026-04-02T00:00:50.000", "UTC", leap).tt,
    );
    expect(parsed.segments[1]!.useableStart).toBeUndefined();
  });

  it("scales km to m and drops accelerations", () => {
    const s = parsed.segments[0]!;
    expect(s.states).toBeInstanceOf(Float64Array);
    expect(Array.from(s.states)).toEqual([
      1000, 2000, 3000, 100, 200, 300, 1500, 2500, 3500, 100, 200, 300, 2000,
      3000, 4000, 100, 200, 300,
    ]);
  });

  it("stores epochs as TDB seconds", () => {
    const s = parsed.segments[0]!;
    expect(s.epochs).toBeInstanceOf(Float64Array);
    expect(s.epochs).toHaveLength(3);
    const times = [
      "2026-04-02T00:00:00.000",
      "2026-04-02T00:00:30.000",
      "2026-04-02T00:01:00.000",
    ];
    times.forEach((t, k) => {
      expect(s.epochs[k]).toBe(Instant.fromIso(t, "UTC", leap).tdb());
    });
    const t = parsed.segments[1]!;
    expect(t.epochs[0]).toBe(
      Instant.fromIso("2026-04-02T00:02:00", "TT", leap).tdb(),
    );
  });

  it("parses the Artemis header form", () => {
    const text = `CCSDS_OEM_VERS = 3.0
META_START
OBJECT_NAME = EM2
OBJECT_ID = -1024
CENTER_NAME = EARTH
REF_FRAME = EME2000
TIME_SYSTEM = UTC
START_TIME = 2026-04-02T01:58:21.397
STOP_TIME = 2026-04-02T01:59:21.397
META_STOP
2026-04-02T01:58:21.397 -24548.846108 1.0 2.0 3.0 4.0 5.0
`;
    const r = parseOem(text, leap);
    expect(r.version).toBe("3.0");
    expect(r.segments[0]!.interpolation).toBeUndefined();
    expect(r.segments[0]!.interpolationDegree).toBeUndefined();
    expect(r.segments[0]!.states[0]).toBeCloseTo(-24548846.108, 6);
  });

  it("accepts CRLF line endings", () => {
    expect(parseOem(OEM.replace(/\n/g, "\r\n"), leap).segments).toHaveLength(2);
  });

  it("throws on the XML form", () => {
    expect(() => parseOem(`<?xml version="1.0"?>\n<oem/>`, leap)).toThrow(
      /line 1.*XML/i,
    );
  });

  it("throws on a data line with the wrong field count", () => {
    expect(() =>
      parseOem(
        oem((s) =>
          s.replace("1.5 2.5 3.5 0.1 0.2 0.3 0.001 0.002 0.003", "1 2"),
        ),
        leap,
      ),
    ).toThrow(/line \d+/);
    expect(() =>
      parseOem(
        oem((s) => s.replace("2.0 3.0 4.0 0.1 0.2 0.3", "2 3 4 1 2 3 4 5")),
        leap,
      ),
    ).toThrow(/line \d+/);
  });

  it("throws on a missing META_STOP", () => {
    expect(() =>
      parseOem(
        oem((s) => s.replace("META_STOP\n\nCOMMENT data", "COMMENT data")),
        leap,
      ),
    ).toThrow(/line \d+.*META_STOP/);
  });

  it("throws on epochs that do not increase", () => {
    expect(() =>
      parseOem(
        oem((s) =>
          s.replace(
            "2026-04-02T00:00:30.000 1.5",
            "2026-04-02T00:00:00.000 1.5",
          ),
        ),
        leap,
      ),
    ).toThrow(/line \d+.*increase/);
  });

  it("throws on an epoch outside START_TIME..STOP_TIME", () => {
    expect(() =>
      parseOem(
        oem((s) =>
          s.replace(
            "2026-04-02T00:01:00.000 2.0",
            "2026-04-02T00:01:01.000 2.0",
          ),
        ),
        leap,
      ),
    ).toThrow(/line \d+.*outside/);
    expect(() =>
      parseOem(
        oem((s) =>
          s.replace(
            "2026-04-02T00:00:00.000 1.0",
            "2026-04-01T23:59:59.000 1.0",
          ),
        ),
        leap,
      ),
    ).toThrow(/line \d+.*outside/);
  });

  it("throws on an unsupported TIME_SYSTEM", () => {
    expect(() =>
      parseOem(
        oem((s) => s.replace("TIME_SYSTEM = UTC", "TIME_SYSTEM = GPS")),
        leap,
      ),
    ).toThrow(/line \d+.*GPS/);
  });

  it("throws on a data line outside a segment", () => {
    expect(() =>
      parseOem("CCSDS_OEM_VERS = 2.0\n2026-04-02T00:00:00 1 2 3 4 5 6\n", leap),
    ).toThrow(/line 2/);
  });
});
