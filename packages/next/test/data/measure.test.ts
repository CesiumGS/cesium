// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrames } from "../../src/frames/frames.ts";
import {
  eastNorthUpFrame,
  framePoint,
  type FramePoint,
} from "../../src/frames/local.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import { measure, measureSpan } from "../../src/measure/measure.ts";
import { MOON } from "../../src/scene/Body.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
import { parseOem } from "../../src/trajectory/oem.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import fixture from "../fixtures/frames/dsnnow.json";

const OEM = "EM2_FODNAVBET_revF_PUBLIC.oem";
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
  eop: EarthOrientationParameters.fromCelestrakCsv(
    readFileSync(join(dir, "EOP-All.csv"), "utf8"),
  ),
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
} satisfies FrameData);

// Artemis II's BET covariance is in m², not CCSDS's km² (frames 3, R7).
const orion = Trajectory.fromOem(
  parseOem(readFileSync(join(dir, OEM), "utf8"), leap),
  frames,
  {
    name: "orion",
    accuracy: "precise",
    interpolation: { method: "hermite", degree: 11 },
    covarianceUnits: "m",
  },
);
const orionPoint = framePoint(orion.frame, [0, 0, 0]);

const stationTrajectories = new Map<string, Trajectory<string>>();
const stationTrajectory = (dish: string): Trajectory<string> => {
  let trajectory = stationTrajectories.get(dish);
  if (!trajectory) {
    // DSSnn is NAIF id 3990nn.
    trajectory = Trajectory.fromSpk(
      [bytes(STATIONS)],
      399000 + Number(dish.slice(3)),
      frames,
      { name: dish, accuracy: "precise", j2000: "icrf" },
    );
    if (trajectory.reference !== frames.itrf) {
      throw new Error(`${dish}'s SPK is not in ITRF93`);
    }
    stationTrajectories.set(dish, trajectory);
  }
  return trajectory;
};

/** A DSN antenna as the origin of an east-north-up frame at its SPK position. */
const stationAt = (dish: string, instant: Instant): FramePoint => {
  const s = stationTrajectory(dish).state(instant);
  const enu = eastNorthUpFrame(
    `${dish}-enu`,
    frames.itrf,
    Ellipsoid.WGS84,
    s.subarray(0, 3),
  );
  return framePoint(enu, [0, 0, 0]);
};

describe("ranges against DSN Now (archived snapshots), a sanity check", () => {
  it("has at least 8 rows", () => {
    expect(fixture.rows.length).toBeGreaterThanOrEqual(8);
    expect(fixture.credit).toBe(
      "NASA/JPL-Caltech DSN Now, via the Internet Archive",
    );
  });

  // DSN Now shows one range per spacecraft: the same figure at every dish
  // (upleg = downleg), rounded to 1000 km. It differs from NASA's reconstructed
  // BET by up to 6% per dish (27% against the geocenter), which neither the
  // station, the geocenter nor a time lag explains; it likely comes from DSN's
  // predicts. So it is a sanity check
  // (catches km/m mix-ups and a wrong body), not an accuracy reference: the
  // SPICE and occultation checks carry the validation.
  it("is within 30% on every row's up and down range and round-trip light time", () => {
    const worst = { down: 0, up: 0, rtlt: 0 };
    for (const row of fixture.rows) {
      const t = Instant.fromUtc(row.timeUTC, leap);
      const m = measure(stationAt(row.dish, t), orionPoint, t, frames);
      const { downlink, uplink } = m.signal!;
      const ours = {
        down: downlink.range / 1000,
        up: uplink.range / 1000,
        rtlt: downlink.lightTime + uplink.lightTime,
      };
      const published = {
        down: row.downlegRange,
        up: row.uplegRange,
        rtlt: row.rtlt,
      };
      const rel = (k: "down" | "up" | "rtlt"): number =>
        Math.abs(ours[k] / published[k] - 1);
      for (const k of ["down", "up", "rtlt"] as const) {
        worst[k] = Math.max(worst[k], rel(k));
      }
      console.log(
        `${row.snapshot} ${row.dish}: down ${ours.down} vs ${published.down} km (${Math.abs(ours.down - published.down)}, ${rel("down")}), up ${ours.up} vs ${published.up} km (${Math.abs(ours.up - published.up)}, ${rel("up")}), rtlt ${ours.rtlt} vs ${published.rtlt} s (${Math.abs(ours.rtlt - published.rtlt)}, ${rel("rtlt")})`,
      );
      expect(rel("down"), `${row.snapshot} ${row.dish} downleg`).toBeLessThan(
        0.3,
      );
      expect(rel("up"), `${row.snapshot} ${row.dish} upleg`).toBeLessThan(0.3);
      expect(rel("rtlt"), `${row.snapshot} ${row.dish} rtlt`).toBeLessThan(0.3);
    }
    console.log(
      `worst relative difference over ${fixture.rows.length} rows: downleg ${worst.down}, upleg ${worst.up}, round trip ${worst.rtlt}`,
    );
  });
});

describe("the published occultation, April 6 2026 (R10)", () => {
  const at = (hhmm: string): Instant =>
    Instant.fromIso(`2026-04-06T${hhmm}:00`, "UTC", leap);
  const losTime = at("22:44");
  const aosTime = at("23:25");
  const complexes = [
    { complex: "Goldstone", dish: "DSS14" },
    { complex: "Canberra", dish: "DSS43" },
    { complex: "Madrid", dish: "DSS63" },
  ];
  const clock = (i: Instant): string =>
    new Date(i.toUtc(leap)).toISOString().slice(11, 19);

  it(
    "has the Moon block each visible complex within 2 minutes of 22:44 and clear within 2 minutes of 23:25",
    { timeout: 120_000 },
    () => {
      let checked = 0;
      for (const { complex, dish } of complexes) {
        const station = stationAt(dish, losTime);
        const up = measure(station, orionPoint, losTime, frames);
        const elevation =
          Math.asin(up.signal!.downlink.receiverDirection[2]!) *
          (180 / Math.PI);
        if (elevation <= 10) {
          console.log(
            `${complex} (${dish}): Orion ${elevation.toFixed(1)} deg at 22:44, not checked`,
          );
          continue;
        }
        const samples = measureSpan(
          station,
          orionPoint,
          at("22:20"),
          at("23:50"),
          10,
          frames,
        );
        const errors = samples.filter((s) => s.error);
        expect(errors.map((s) => s.error)).toEqual([]);
        const blocked = (s: (typeof samples)[number]): boolean =>
          s.measurement!.lineOfSight!.blockedBy === MOON;
        const first = samples.findIndex(blocked);
        expect(
          first,
          `${complex} is never blocked by the Moon`,
        ).toBeGreaterThan(-1);
        const clear = samples.findIndex((s, i) => i > first && !blocked(s));
        expect(clear, `${complex} never clears`).toBeGreaterThan(-1);
        const los = samples[first]!.instant;
        const aos = samples[clear]!.instant;
        const losOffset = los.tdb() - losTime.tdb();
        const aosOffset = aos.tdb() - aosTime.tdb();
        console.log(
          `${complex} (${dish}, Orion ${elevation.toFixed(1)} deg at 22:44): first blocked ${clock(los)} (${losOffset} s from 22:44:00), first clear ${clock(aos)} (${aosOffset} s from 23:25:00)`,
        );
        expect(Math.abs(losOffset), `${complex} LOS`).toBeLessThanOrEqual(120);
        expect(Math.abs(aosOffset), `${complex} AOS`).toBeLessThanOrEqual(120);
        checked++;
      }
      expect(checked).toBeGreaterThan(0);
    },
  );
});

describe("accuracy of a station ← Orion measurement", () => {
  it("is no better than Orion's own covariance sigma", () => {
    const t = Instant.fromIso("2026-04-06T15:08:26", "UTC", leap);
    const m = measure(stationAt("DSS26", t), orionPoint, t, frames);
    const sigma = orion.positionSigma(t);
    console.log(
      `DSS26 ← Orion: accuracy ${m.accuracy.meters} m (Orion sigma ${sigma} m)`,
      JSON.stringify(m.accuracy.terms),
      m.accuracy.warnings,
    );
    expect(sigma).toBeDefined();
    expect(m.accuracy.meters).toBeDefined();
    expect(m.accuracy.meters!).toBeGreaterThanOrEqual(sigma!);
  });
});
