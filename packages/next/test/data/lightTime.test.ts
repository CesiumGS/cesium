// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { frameTransform } from "../../src/frames/Frame.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { framePoint, type FramePoint } from "../../src/frames/local.ts";
import { rotationPart } from "../../src/frames/matrix.ts";
import { C } from "../../src/measure/constants.ts";
import {
  apparentDirection,
  solveLightTime,
} from "../../src/measure/lightTime.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import fixture from "../fixtures/frames/signal.json";

const MAIN = "art002_rec_260402_260410_jsc_bet_revf.bsp";
const GAPFILL = "art002_rec_260402_260410_jsc_bet_revf_gapfill.bsp";
const STATIONS = "earthstns_itrf93_260814.bsp";

const dir = framesDataDirectory();
const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
const frames = createFrames({
  leapSeconds: LeapSeconds.builtIn(),
  eop: EarthOrientationParameters.fromCelestrakCsv(
    readFileSync(join(dir, "EOP-All.csv"), "utf8"),
  ),
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
} satisfies FrameData);

// Plan 2 R1: SPICE reads the Artemis SPK's J2000 as ICRF.
const orion = Trajectory.fromSpk([bytes(MAIN), bytes(GAPFILL)], -24, frames, {
  name: "orion",
  accuracy: "precise",
  j2000: "icrf",
});
const orionPoint = framePoint(orion.frame, [0, 0, 0]);
const earthCenter = framePoint(frames.earthIcrf, [0, 0, 0]);
const moonCenter = framePoint(frames.moonIcrf, [0, 0, 0]);
// DSS-43 barely moves in ITRF: its position at the first row, fixed there.
const dss43 = (() => {
  const station = Trajectory.fromSpk([bytes(STATIONS)], 399043, frames, {
    name: "DSS-43",
    accuracy: "precise",
    j2000: "icrf",
  });
  if (station.reference !== frames.itrf) {
    throw new Error("DSS-43's SPK is not in ITRF93");
  }
  const s = station.state(Instant.fromTdb(fixture.rows[0]!.tdb));
  return framePoint(frames.itrf, s.subarray(0, 3));
})();

type Correction = "CN" | "XCN" | "CN+S" | "XCN+S";
type Link = Record<Correction, { position: number[]; lt: number }>;

const norm = (v: ArrayLike<number>): number => Math.hypot(v[0]!, v[1]!, v[2]!);
/** The angle between two 3-vectors, radians, accurate near 0 (not acos). */
const angle = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  const cx = a[1]! * b[2]! - a[2]! * b[1]!;
  const cy = a[2]! * b[0]! - a[0]! * b[2]!;
  const cz = a[0]! * b[1]! - a[1]! * b[0]!;
  const dot = a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  return Math.atan2(Math.hypot(cx, cy, cz), dot);
};
/** `R · v` for a row-major 3 × 3. */
const apply = (r: ArrayLike<number>, v: ArrayLike<number>): number[] =>
  [0, 1, 2].map(
    (i) => r[3 * i]! * v[0]! + r[3 * i + 1]! * v[1]! + r[3 * i + 2]! * v[2]!,
  );

interface Case {
  name: string;
  observer: FramePoint;
  target: FramePoint;
  link: (row: (typeof fixture.rows)[number]) => Link;
  lightTimeTolerance: number;
  /** Radians, for a target `range` meters away. */
  directionTolerance: (range: number) => number;
}

const cases: Case[] = [
  {
    name: "Earth center → Orion",
    observer: earthCenter,
    target: orionPoint,
    link: (r) => r.orion,
    lightTimeTolerance: 1e-3,
    directionTolerance: () => 1e-10,
  },
  {
    name: "Earth center → Moon",
    observer: earthCenter,
    target: moonCenter,
    link: (r) => r.moon,
    lightTimeTolerance: 1e-3,
    directionTolerance: () => 1e-10,
  },
  {
    name: "DSS-43 → Orion",
    observer: dss43,
    target: orionPoint,
    link: (r) => r.dss43,
    lightTimeTolerance: 0.5,
    // The 0.5 m position budget as an angle: SPICE's own Earth orientation
    // file places the station about 0.25 m away from ours, which is a large
    // angle when Orion is near the Earth.
    directionTolerance: (range) => 0.5 / range,
  },
];

describe("light time and apparent directions against SPICE (spkpos, shapiro: [])", () => {
  it("has 12 rows across the Artemis span, seven within 5 s of a segment edge", () => {
    expect(fixture.rows).toHaveLength(12);
    expect(fixture.rows.filter((r) => r.kind !== "spread")).toHaveLength(7);
  });

  it.each(cases)("$name", (c) => {
    const worst = { cn: 0, xcn: 0, cns: 0, xcns: 0, transverse: 0 };
    for (const row of fixture.rows) {
      const t = Instant.fromTdb(row.tdb);
      const want = c.link(row);
      // CN / CN+S: the observer receives at t.
      const received = solveLightTime(
        c.observer,
        c.target,
        t,
        "reception",
        frames,
        [],
      );
      // XCN / XCN+S: the observer transmits at t.
      const sent = solveLightTime(
        c.target,
        c.observer,
        t,
        "emission",
        frames,
        [],
      );
      const cn = Math.abs(received.lightTime - want.CN.lt) * C;
      const xcn = Math.abs(sent.lightTime - want.XCN.lt) * C;
      // Back to ICRF axes by the same rotation part, without eq. 11.19's
      // scale and shear.
      const toIcrf = rotationPart(
        frameTransform(c.observer.frame, frames.icrf, t),
      );
      const cns = angle(
        apply(
          toIcrf,
          apparentDirection(received, "receiver", c.observer, frames),
        ),
        want["CN+S"].position,
      );
      const xcns = angle(
        apply(
          toIcrf,
          apparentDirection(sent, "transmitter", c.observer, frames),
        ),
        want["XCN+S"].position,
      );
      worst.cn = Math.max(worst.cn, cn);
      worst.xcn = Math.max(worst.xcn, xcn);
      worst.cns = Math.max(worst.cns, cns);
      worst.xcns = Math.max(worst.xcns, xcns);
      const range = want.CN.lt * C;
      const xrange = want.XCN.lt * C;
      worst.transverse = Math.max(worst.transverse, cns * range, xcns * xrange);
      expect(cns, `CN+S at ${row.tdb}`).toBeLessThan(
        c.directionTolerance(range),
      );
      expect(xcns, `XCN+S at ${row.tdb}`).toBeLessThan(
        c.directionTolerance(xrange),
      );
      expect(want["CN+S"].lt).toBe(want.CN.lt);
      expect(norm(want.CN.position)).toBeGreaterThan(0);
    }
    console.log(
      `${c.name} vs SPICE: worst c·lt CN ${worst.cn} m, XCN ${worst.xcn} m; direction CN+S ${worst.cns} rad, XCN+S ${worst.xcns} rad; worst angle × range ${worst.transverse} m`,
    );
    expect(worst.cn).toBeLessThan(c.lightTimeTolerance);
    expect(worst.xcn).toBeLessThan(c.lightTimeTolerance);
  });

  it("adds 0.1 to 50 ns of Shapiro delay (Sun, Earth, Moon) from the Earth's center to Orion", () => {
    let low = Infinity;
    let high = 0;
    for (const row of fixture.rows) {
      const t = Instant.fromTdb(row.tdb);
      const plain = solveLightTime(
        earthCenter,
        orionPoint,
        t,
        "reception",
        frames,
        [],
      );
      const full = solveLightTime(
        earthCenter,
        orionPoint,
        t,
        "reception",
        frames,
      );
      const delay = full.lightTime - plain.lightTime;
      low = Math.min(low, delay);
      high = Math.max(high, delay);
      expect(delay, `at ${row.tdb}`).toBeGreaterThan(0.1e-9);
      expect(delay, `at ${row.tdb}`).toBeLessThan(50e-9);
    }
    console.log(
      `Shapiro delay, Earth center → Orion: ${low * 1e9} to ${high * 1e9} ns`,
    );
  });
});
