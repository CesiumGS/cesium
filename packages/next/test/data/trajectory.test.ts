// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { convertPoint, framePoint } from "../../src/frames/local.ts";
import { parseOem } from "../../src/trajectory/oem.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";
import type { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
import { SAMPLE } from "../syntheticFrames.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import fixture from "../fixtures/frames/trajectories.json";

const OEM = "EM2_FODNAVBET_revF_PUBLIC.oem";
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
const leap = LeapSeconds.builtIn();
const frames = createFrames({
  leapSeconds: leap,
  eop: { atInstant: () => SAMPLE } as unknown as EarthOrientationParameters,
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
} satisfies FrameData);

const options = { accuracy: "precise" } as const;
const orion = (j2000: "icrf" | "eme2000"): Trajectory<"orion"> =>
  Trajectory.fromSpk([bytes(MAIN), bytes(GAPFILL)], -24, frames, {
    name: "orion",
    j2000,
    ...options,
  });

const maxDiff = (
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  from: number,
  to: number,
): number => {
  let m = 0;
  for (let i = from; i < to; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
};
const posDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  maxDiff(a, b, 0, 3);
const velDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  maxDiff(a, b, 3, 6);
// SPICE's kilometers to meters.
const meters = (v: readonly number[]): number[] => v.map((x) => x * 1000);

describe("Artemis II SPK against SPICE (spkgeo)", () => {
  const trajectory = orion("icrf");

  it("has 40 instants: every segment end, plus ones near each window edge", () => {
    expect(fixture.orion).toHaveLength(40);
    const kinds = new Set(fixture.orion.map((r) => r.kind));
    expect([...kinds].sort()).toEqual([
      "afterStart",
      "beforeEnd",
      "endpoint",
      "epoch",
      "spread",
    ]);
    expect(trajectory.reference).toBe(frames.earthIcrf);
  });

  it("matches at every row, positions to 1 mm and velocities to 1e-6 m/s", () => {
    let worstPos = 0;
    let worstVel = 0;
    const got = new Float64Array(6);
    for (const r of fixture.orion) {
      trajectory.state(Instant.fromTdb(r.tdb), got);
      const want = meters(r.state);
      const p = posDiff(got, want);
      const v = velDiff(got, want);
      worstPos = Math.max(worstPos, p);
      worstVel = Math.max(worstVel, v);
      expect(p, `${r.kind} at ${r.tdb}`).toBeLessThan(1e-3);
      expect(v, `${r.kind} at ${r.tdb}`).toBeLessThan(1e-6);
    }
    console.log(
      `Artemis SPK vs spkgeo: worst position ${worstPos} m, worst velocity ${worstVel} m/s`,
    );
  });
});

describe("DSN stations against SPICE (spkgeo in ITRF93)", () => {
  it.each([
    ["DSS-14", 399014],
    ["DSS-43", 399043],
  ])("%s matches within 1 mm, in the ITRF frame", (name, id) => {
    const station = Trajectory.fromSpk([bytes(STATIONS)], id, frames, {
      name,
      j2000: "icrf",
      ...options,
    });
    expect(station.reference).toBe(frames.itrf);
    const rows = fixture.stations[String(id) as "399014" | "399043"];
    expect(rows).toHaveLength(3);
    let worst = 0;
    for (const r of rows) {
      const got = station.state(Instant.fromTdb(r.tdb));
      worst = Math.max(worst, posDiff(got, meters(r.state)));
    }
    console.log(`${name} vs spkgeo: worst position ${worst} m`);
    expect(worst).toBeLessThan(1e-3);
  });
});

describe("Orion in MOON_ME (spkpos)", () => {
  it("matches SPICE within 1 mm when the SPK is read as ICRF", () => {
    const trajectory = orion("icrf");
    expect(fixture.moonMe).toHaveLength(10);
    let worst = 0;
    for (const r of fixture.moonMe) {
      const t = Instant.fromTdb(r.tdb);
      const p = convertPoint(
        framePoint(trajectory.reference, trajectory.state(t), t),
        frames.moonMe,
      );
      worst = Math.max(worst, posDiff(p.position, meters(r.position)));
    }
    console.log(`Orion in MOON_ME vs spkpos: worst position ${worst} m`);
    expect(worst).toBeLessThan(1e-3);
  });
});

describe("OEM against SPK", () => {
  it("agree within 0.5 m inside the OEM's segments when both are read as EME2000", () => {
    const oem = parseOem(readFileSync(join(dir, OEM), "utf8"), leap);
    expect(oem.segments).toHaveLength(6);
    const fromOem = Trajectory.fromOem(oem, frames, {
      name: "orion",
      interpolation: { method: "hermite", degree: 11 },
      ...options,
    });
    const fromSpk = orion("eme2000");
    expect(fromOem.reference).toBe(fromSpk.reference);
    let worst = 0;
    let count = 0;
    for (const seg of oem.segments) {
      const first = seg.epochs[0]!;
      const last = seg.epochs[seg.epochs.length - 1]!;
      for (let t = first; t <= last; t += 600) {
        const at = Instant.fromTdb(t);
        if (!fromOem.contains(at) || !fromSpk.contains(at)) {
          continue;
        }
        count++;
        worst = Math.max(worst, posDiff(fromOem.state(at), fromSpk.state(at)));
      }
    }
    console.log(
      `OEM vs SPK (EME2000, hermite 11): max position difference ${worst} m over ${count} instants`,
    );
    expect(count).toBeGreaterThan(1000);
    expect(worst).toBeLessThan(0.5);
  });

  it("the frame bias between ICRF and EME2000 reads is 20 to 80 m in MOON_ME at the flyby", () => {
    const flyby = Instant.fromIso("2026-04-06T23:00:00", "UTC", leap);
    const inMoonMe = (j2000: "icrf" | "eme2000"): Float64Array => {
      const trajectory = orion(j2000);
      return convertPoint(
        framePoint(trajectory.reference, trajectory.state(flyby), flyby),
        frames.moonMe,
      ).position;
    };
    const a = inMoonMe("icrf");
    const b = inMoonMe("eme2000");
    const bias = Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
    console.log(`Frame bias at the flyby, in MOON_ME: ${bias} m`);
    expect(bias).toBeGreaterThan(20);
    expect(bias).toBeLessThan(80);
  });
});

describe("OEM covariance", () => {
  it("gives Artemis's first position sigma, read as m^2 (R7)", () => {
    const oem = parseOem(readFileSync(join(dir, OEM), "utf8"), leap);
    const traj = Trajectory.fromOem(oem, frames, {
      ...options,
      name: "orion",
      covarianceUnits: "m",
      interpolation: { method: "hermite", degree: 11 },
    });
    const first = Instant.fromIso("2026-04-02T01:58:21.397", "UTC", leap);
    const sigma = traj.positionSigma(first)!;
    console.log(`Artemis positionSigma at first covariance: ${sigma} m`);
    const own = Math.sqrt(2505.73549 + 16.2246271 + 13.268218);
    expect(own).toBeCloseTo(50.35, 2);
    // positionSigma takes the larger of this epoch's sigma (50.35 m) and the
    // next epoch's (F6, conservative between epochs): 51.07 m.
    expect(sigma).toBeGreaterThan(50.35);
    expect(Math.abs(sigma - 51.07)).toBeLessThan(0.01);
  });
});
