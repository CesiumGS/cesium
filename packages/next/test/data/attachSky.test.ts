// attachSky at "precise" over the frames store `npm run setup` fills: the
// engine's sky inputs from the catalog's precise reference frames equal
// skyState's ephemeris sky inside the data, and the analytic sky outside
// it. `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { attachSky } from "../../src/frames/attachSky.ts";
import { createFrameCatalog } from "../../src/frames/catalog.ts";
import {
  createSkyState,
  skyState,
  type SkyState,
} from "../../src/frames/sky.ts";
import type { Engine } from "../../src/scene/Engine.ts";
import { Clock } from "../../src/time/Clock.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
import { fakeEngine } from "../fakeGpu.ts";

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

const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
};

/** The engine's sky against a SkyState: the largest difference, the Moon's position relative to its distance. */
function skyDifference(engine: Engine, sky: SkyState): number {
  return Math.max(
    maxDiff(engine.icrfToFixed, sky.icrfToFixed),
    maxDiff(engine.sunDirection, sky.sunDirection),
    maxDiff(engine.moonPosition!, sky.moonPosition) /
      Math.hypot(...sky.moonPosition),
    maxDiff(engine.moonAxes!, sky.moonAxes),
  );
}

let engine: Engine;
beforeAll(async () => {
  engine = await fakeEngine();
});

describe("attachSky at precise, over the frames store", () => {
  it("inside the data equals skyState(ms, data) within 1e-11; outside it, the analytic sky", async () => {
    const catalog = createFrameCatalog({ data });
    const clock = new Clock({ time: Date.UTC(2010, 0, 1) });
    const detach = attachSky(engine, {
      catalog,
      clock,
      precision: "precise",
    });
    for (const name of [
      "GCRF",
      "ITRF",
      "HCRS",
      "MOON_ICRF",
      "MOON_ME",
    ] as const) {
      await catalog.ready(name, "precise");
    }
    const expected = createSkyState();
    let worst = 0;
    // Inside: 2000 to 2025, within the EOP table's observed rows.
    for (let k = 0; k < 50; k++) {
      clock.time = Date.UTC(2000, 0, 2) + k * 16_070_400_037;
      skyState(clock.time, data, expected);
      expect(expected.source).toBe("ephemeris");
      worst = Math.max(worst, skyDifference(engine, expected));
    }
    expect(worst).toBeLessThan(1e-11);
    // Outside the packs' 2000 to 2050: the analytic sky, to the bit.
    for (const ms of [Date.UTC(1990, 5, 1), Date.UTC(2060, 0, 1, 6)]) {
      clock.time = ms;
      skyState(ms, undefined, expected);
      expect(skyDifference(engine, expected)).toBe(0);
    }
    detach();
  });
});
