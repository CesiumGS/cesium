// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { FrameSky } from "../../src/frames/frameSky.ts";
import { createSkyState, skyState } from "../../src/frames/sky.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
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

const MS = Date.UTC(2026, 3, 6, 23);
const expected = (d: FrameData | undefined) =>
  skyState(MS, d, createSkyState());

describe("FrameSky with DE440", () => {
  it("switches to the data, back to analytic, and to the data again", () => {
    const sky = new FrameSky();
    const before = expected(undefined);
    expect(Array.from(sky.at(MS).moonPosition)).toEqual(
      Array.from(before.moonPosition),
    );
    // Same time asked again after setData: the memo must not serve the old sky.
    sky.setData(data);
    const withData = expected(data);
    const got = sky.at(MS);
    expect(got.source).toBe("ephemeris");
    expect(Array.from(got.moonPosition)).toEqual(
      Array.from(withData.moonPosition),
    );
    expect(Array.from(got.sunDirection)).toEqual(
      Array.from(withData.sunDirection),
    );
    expect(Array.from(got.moonAxes)).toEqual(Array.from(withData.moonAxes));
    expect(Array.from(got.icrfToFixed)).toEqual(
      Array.from(withData.icrfToFixed),
    );
    // The two Moons differ by hundreds of km.
    const d = Math.hypot(
      got.moonPosition[0]! - before.moonPosition[0]!,
      got.moonPosition[1]! - before.moonPosition[1]!,
      got.moonPosition[2]! - before.moonPosition[2]!,
    );
    expect(d).toBeGreaterThan(100e3);
    sky.setData(undefined);
    expect(sky.at(MS).source).toBe("analytic");
    expect(Array.from(sky.at(MS).moonPosition)).toEqual(
      Array.from(before.moonPosition),
    );
  });
});
