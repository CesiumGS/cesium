// Stop 5's orbit (examples/frames-explorer/orbit.ts) on DE440 through the
// frames: up the Moon's prograde orbit normal at the Artemis II flyby,
// checked by hand against the ecliptic pole and the Moon's inclination.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { moonOrbitNormal } from "../../examples/frames-explorer/orbit.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import { frameTransform } from "../../src/frames/Frame.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

const dir = framesDataDirectory();
const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
const leapSeconds = LeapSeconds.builtIn();
const frames = createFrames({
  leapSeconds,
  eop: EarthOrientationParameters.fromCelestrakCsv(
    readFileSync(join(dir, "EOP-All.csv"), "utf8"),
  ),
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
});
const FLYBY = Date.parse("2026-04-06T23:00:00Z");
/** The Moon from the Earth's centre in GCRF, `ms` from the flyby (as main.ts reads it). */
const moonAt = (ms: number) => {
  const m = frameTransform(
    frames.moonIcrf,
    frames.gcrf,
    Instant.fromUtc(FLYBY + ms, leapSeconds),
  );
  return [m[12]!, m[13]!, m[14]!];
};
const dot = (a: number[], b: number[]) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const deg = Math.PI / 180;

describe("stop 5's orbit normal at the flyby (DE440)", () => {
  const n = moonOrbitNormal(moonAt);

  it("is a unit vector", () => {
    expect(Math.hypot(...n)).toBeCloseTo(1, 12);
  });

  it("is prograde: the Moon moves counter-clockwise seen from it", () => {
    // By hand: an hour later the Moon is ahead, (r × Δr) along the normal.
    const r = moonAt(0);
    const later = moonAt(3.6e6);
    const dr = later.map((v, i) => v - r[i]!);
    const h = [
      r[1]! * dr[2]! - r[2]! * dr[1]!,
      r[2]! * dr[0]! - r[0]! * dr[2]!,
      r[0]! * dr[1]! - r[1]! * dr[0]!,
    ];
    expect(dot(h, n)).toBeGreaterThan(0);
    // North of the equator, as the ecliptic's pole is.
    expect(n[2]!).toBeGreaterThan(0.85);
  });

  it("stands about 5.1° from the ecliptic's pole: the Moon's inclination (4.99° to 5.30°)", () => {
    // The ecliptic pole of J2000 in GCRF: (0, -sin ε, cos ε), ε = 23.4393°.
    const e = 23.4392911 * deg;
    const pole = [0, -Math.sin(e), Math.cos(e)];
    const angle = Math.acos(dot(n, pole)) / deg;
    expect(angle).toBeGreaterThan(4.9);
    expect(angle).toBeLessThan(5.4);
  });
});
