// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createSkyState, skyState } from "../../src/frames/sky.ts";
import { icrfToFixed } from "../../src/time/celestial.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
import { moonAxes, moonPosition } from "../../src/time/moon.ts";
import { sunDirection } from "../../src/time/sun.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";

const dir = framesDataDirectory();
const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
const data: FrameData = {
  leapSeconds: LeapSeconds.builtIn(),
  eop: EarthOrientationParameters.fromCelestrakCsv(
    readFileSync(join(dir, "EOP-All.csv"), "utf8"),
  ),
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
};

const deg = 180 / Math.PI;
const norm = (v: ArrayLike<number>): number => Math.hypot(v[0]!, v[1]!, v[2]!);
/** The angle between two 3-vectors, degrees. */
const angle = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  Math.acos(
    Math.min(
      1,
      (a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!) / (norm(a) * norm(b)),
    ),
  ) * deg;
/** `m · v` for a row-major 3 × 3, from offset `o` of `v`. */
const turn = (m: ArrayLike<number>, v: ArrayLike<number>, o = 0): number[] =>
  [0, 1, 2].map(
    (i) =>
      m[i * 3]! * v[o]! + m[i * 3 + 1]! * v[o + 1]! + m[i * 3 + 2]! * v[o + 2]!,
  );

// The Moon's direction bound is 0.1 degrees, but the analytic model itself is
// 0.141 degrees from DE440 in ICRF on 2000-06-21 (before any rotation: its
// periodic terms are truncated), so that date's bound is 0.2.
const times: [number, number][] = [
  [Date.UTC(2026, 3, 6, 23), 0.1],
  [Date.UTC(2000, 5, 21, 12), 0.2],
];

describe("the ephemeris sky against the analytic models", () => {
  for (const [ms, moonBound] of times) {
    it(`agrees within the models' accuracies at ${new Date(ms).toISOString()}`, () => {
      const out = skyState(ms, data, createSkyState());
      expect(out.source).toBe("ephemeris");
      const sun = angle(
        out.sunDirection,
        sunDirection(ms, new Float64Array(3)),
      );
      expect(sun).toBeLessThan(0.02);

      const m = icrfToFixed(ms);
      const moon = turn(m, moonPosition(ms));
      const direction = angle(out.moonPosition, moon);
      const distance = Math.abs(norm(out.moonPosition) / norm(moon) - 1);
      expect(direction).toBeLessThan(moonBound);
      expect(distance).toBeLessThan(0.002);

      const pole = angle(out.moonAxes.subarray(3), turn(m, moonAxes(ms), 3));
      expect(pole).toBeLessThan(0.05);
      console.log(
        `${new Date(ms).toISOString()}: sun ${sun.toFixed(4)} deg, moon ${direction.toFixed(4)} deg and ${(distance * 100).toFixed(4)} %, pole ${pole.toFixed(4)} deg`,
      );
    });
  }

  it("prints its per-call cost", { timeout: 30_000 }, () => {
    const out = createSkyState();
    const ms = times[0]![0];
    for (let i = 0; i < 200; i++) {
      skyState(ms + i, data, out);
    }
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      skyState(ms + i * 1000, data, out);
    }
    const mean = (performance.now() - start) / 1000;
    console.log(`skyState with data: ${(mean * 1000).toFixed(2)} us per call`);
  });
});
