// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMRAT,
  Ephemeris,
  MOON_PA_TO_ME,
} from "../../src/ephemeris/Ephemeris.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
import { moonAxes } from "../../src/time/moon.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import ephemerisRows from "../fixtures/frames/ephemeris.json";
import moonRows from "../fixtures/frames/moon.json";
import utcRows from "../fixtures/frames/utc.json";

type State = number[];
const rows = ephemerisRows as {
  tdb: number;
  boundary: boolean;
  sun: State;
  emb: State;
  moonWrtEmb: State;
  earthWrtEmb: State;
}[];
const moonFixture = moonRows as {
  tdb: number;
  euler: number[];
  pa: number[];
  me: number[];
  paToMe: number[];
}[];

const dir = framesDataDirectory();
const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
const eph = Ephemeris.fromPacks(
  bytes("planets-de440-2000-2050.pack"),
  bytes("moon-pa-de440-2000-2050.pack"),
);

/**
 * An Instant whose TDB is the fixture's: at 1e9 s the TT spacing is 2.4e-7 s,
 * which the Moon's Euler angle (2.7e-6 rad/s) turns into 6e-13 rad, most of
 * the 1e-12 budget, so fromTdb lands on the nearest TT, not just near it.
 */
const atTdb = (tdb: number): Instant => Instant.fromTdb(tdb);

// km to m; the fixture's kilometers are jplephem's.
const meters = (v: State): number[] => v.map((x) => x * 1000);
const maxDiff = (
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  from = 0,
  to = 6,
) => {
  let m = 0;
  for (let i = from; i < to; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
};
const posDiff = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  maxDiff(a, b, 0, 3);
const velDiff = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  maxDiff(a, b, 3, 6);

const add = (a: State, b: State, k = 1): number[] =>
  a.map((x, i) => (x + k * b[i]!) * 1000);

describe("Ephemeris positions (jplephem on de440s.bsp)", () => {
  it("covers 2000-2050 with 40 fixture instants including a record boundary", () => {
    expect(rows).toHaveLength(40);
    expect(rows.filter((r) => r.boundary)).toHaveLength(1);
    expect(eph.span[0]).toBeLessThanOrEqual(rows[0]!.tdb);
    expect(eph.span[1]).toBeGreaterThanOrEqual(rows[39]!.tdb);
  });

  it.each([
    [
      "sun",
      (e: Ephemeris, i: Instant) => e.sun(i),
      (r: (typeof rows)[0]) => meters(r.sun),
    ],
    [
      "earthMoonBarycenter",
      (e: Ephemeris, i: Instant) => e.earthMoonBarycenter(i),
      (r: (typeof rows)[0]) => meters(r.emb),
    ],
    [
      "moonFromEarth",
      (e: Ephemeris, i: Instant) => e.moonFromEarth(i),
      (r: (typeof rows)[0]) => add(r.moonWrtEmb, r.earthWrtEmb, -1),
    ],
    [
      "earth",
      (e: Ephemeris, i: Instant) => e.earth(i),
      (r: (typeof rows)[0]) => add(r.emb, r.earthWrtEmb),
    ],
    [
      "moon",
      (e: Ephemeris, i: Instant) => e.moon(i),
      (r: (typeof rows)[0]) => add(r.emb, r.moonWrtEmb),
    ],
  ] as const)("%s within 1 mm and 1e-6 m/s", (_name, get, expected) => {
    for (const r of rows) {
      const got = get(eph, atTdb(r.tdb));
      const want = expected(r);
      expect(posDiff(got, want)).toBeLessThan(1e-3);
      expect(velDiff(got, want)).toBeLessThan(1e-6);
    }
  });

  it("matches at 2049-12-31 and exactly on a record boundary", () => {
    // 2049-12-31T00:00 TDB is 1577793600 s past J2000.
    const late = rows.reduce((a, b) =>
      Math.abs(b.tdb - 1577793600) < Math.abs(a.tdb - 1577793600) ? b : a,
    );
    expect(late.tdb).toBe(1577793600);
    expect(posDiff(eph.sun(atTdb(late.tdb)), meters(late.sun))).toBeLessThan(
      1e-3,
    );
    const edge = rows.find((r) => r.boundary)!;
    expect(
      posDiff(eph.moon(atTdb(edge.tdb)), add(edge.emb, edge.moonWrtEmb)),
    ).toBeLessThan(1e-3);
  });

  it("is continuous across a record boundary to under 1 mm", () => {
    const edge = rows.find((r) => r.boundary)!.tdb;
    const before = atTdb(edge - 1);
    const after = atTdb(edge + 1);
    // Compare the Moon relative to the Earth (about 1 km/s) at the instants'
    // own TDB, 2 s apart, after removing the motion between them.
    const dt = after.tdb() - before.tdb();
    const a = eph.moonFromEarth(before);
    const b = eph.moonFromEarth(after);
    const mid = eph.moonFromEarth(atTdb(edge));
    for (let i = 0; i < 3; i++) {
      // Second order in the velocity change over the span: a*dt^2/8 is below 1 mm.
      const predicted = a[i]! + ((a[i + 3]! + b[i + 3]!) / 2) * dt;
      expect(Math.abs(b[i]! - predicted)).toBeLessThan(1e-3);
      expect(Math.abs(mid[i]! - (a[i]! + b[i]!) / 2)).toBeLessThan(1);
    }
  });

  it("the Earth agrees with DE440's own 399 segment to 1 mm (EMRAT check)", () => {
    let worst = 0;
    for (const r of rows) {
      const got = eph.earth(atTdb(r.tdb));
      worst = Math.max(worst, posDiff(got, add(r.emb, r.earthWrtEmb)));
    }
    expect(EMRAT).toBeCloseTo(81.30056822, 7);
    expect(worst).toBeLessThan(1e-3);
  });
});

describe("UTC to ephemeris, end to end", () => {
  it("Instant.fromUtc then the ephemeris matches jplephem at pyerfa's TDB to 1 cm", () => {
    // Built from UTC like a Clock would, not from TDB: this checks fromUtc
    // and tdb() together with the packs. The Earth's 30 km/s around the SSB
    // turns a 3e-7 s TDB error into 1 cm.
    const leap = LeapSeconds.fromIers(
      readFileSync(join(dir, "Leap_Second.dat"), "utf8"),
    );
    let worst = 0;
    for (const r of utcRows) {
      const t = Instant.fromUtc(r.utcMs, leap);
      worst = Math.max(
        worst,
        posDiff(eph.sun(t), meters(r.sun)),
        posDiff(eph.earth(t), meters(r.earth)),
        posDiff(eph.moonFromEarth(t), meters(r.moonFromEarth)),
      );
    }
    expect(worst).toBeLessThan(1e-2);
  });
});

describe("Ephemeris span", () => {
  it("throws, naming the span, before and after the packs", () => {
    const after = Instant.fromTt((2051.5 - 2000) * 365.25 * 86400);
    expect(() => eph.sun(after)).toThrow(
      /ephemeris: 2051-\d\d-\d\dT[\d:]+Z is outside the loaded span (?:1999-12-31|2000-01-01)T[\d:]+Z–2050-12-31T[\d:]+Z \(npm run setup -- --frames-span\)/,
    );
    const before = Instant.fromTt(-1e9);
    expect(() => eph.moonPrincipalAxes(before)).toThrow(
      /outside the loaded span/,
    );
    expect(() => eph.earth(after)).toThrow(/outside the loaded span/);
  });
});

describe("lunar orientation (SPICE pxform)", () => {
  it("MOON_PA_TO_ME matches SPICE to 1e-12", () => {
    expect(maxDiff(MOON_PA_TO_ME, moonFixture[0]!.paToMe, 0, 9)).toBeLessThan(
      1e-12,
    );
  });

  it("Euler angles match SPICE's PCK evaluation to 1e-12 rad", () => {
    for (const r of moonFixture) {
      const e = eph.moonEulerAngles(atTdb(r.tdb));
      expect(maxDiff(e, r.euler, 0, 3)).toBeLessThan(1e-12);
    }
  });

  it("PA and ME matrices match SPICE to 1e-12", () => {
    const pa = new Float64Array(9);
    const me = new Float64Array(9);
    for (const r of moonFixture) {
      const t = atTdb(r.tdb);
      expect(maxDiff(eph.moonPrincipalAxes(t, pa), r.pa, 0, 9)).toBeLessThan(
        1e-12,
      );
      expect(maxDiff(eph.moonMeanEarth(t, me), r.me, 0, 9)).toBeLessThan(1e-12);
    }
  });

  it("the ME z-axis is within 0.02 degrees of the IAU 2009 pole at 2026-01-01", () => {
    const ms = Date.UTC(2026, 0, 1);
    const tt = (ms - 946_728_000_000) / 1000 + 69.184;
    const me = eph.moonMeanEarth(Instant.fromTt(tt));
    const z = [me[6]!, me[7]!, me[8]!]; // ME z in ICRF is the third row of M
    const pole = moonAxes(ms).subarray(3, 6); // the IAU north pole in ICRF
    const dot = z[0]! * pole[0]! + z[1]! * pole[1]! + z[2]! * pole[2]!;
    expect((Math.acos(Math.min(1, dot)) * 180) / Math.PI).toBeLessThan(0.02);
  });

  it("the ME x-axis points within 10 degrees of the Earth", () => {
    const t = Instant.fromTt(
      (Date.UTC(2026, 0, 1) - 946_728_000_000) / 1000 + 69.184,
    );
    const me = eph.moonMeanEarth(t);
    const x = [me[0]!, me[1]!, me[2]!]; // ME x in ICRF is the first row
    const toEarth = eph
      .moonFromEarth(t)
      .slice(0, 3)
      .map((v) => -v);
    const norm = Math.hypot(...toEarth);
    const dot =
      (x[0]! * toEarth[0]! + x[1]! * toEarth[1]! + x[2]! * toEarth[2]!) / norm;
    expect((Math.acos(dot) * 180) / Math.PI).toBeLessThan(10);
  });
});
