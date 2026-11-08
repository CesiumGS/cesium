// The frames resolver over the frames store `npm run setup` fills: a route
// through GCRF's precise edge (IERS eq. 11.19, which scales positions by
// about 1.5e-8) comes back rigid for rendering, keeping the measured
// translation. `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrameCatalog } from "../../src/frames/catalog.ts";
import { frameTransform } from "../../src/frames/Frame.ts";
import { createFramesResolver } from "../../src/frames/resolver.ts";
import { rigidMatrixError } from "../../src/math/transforms.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

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

describe("the frames resolver over the frames store", () => {
  it("a route through GCRF's precise edge comes back rigid, with the measured translation", async () => {
    const catalog = createFrameCatalog({ data });
    const resolver = createFramesResolver(catalog, { precision: "precise" });
    const moon = catalog.get("MOON_ME");
    const gcrf = catalog.get("GCRF");
    resolver.routeRevision(moon, gcrf);
    await catalog.ready("GCRF", "precise");
    await catalog.ready("MOON_ME", "precise");
    const seconds = Date.UTC(2024, 6, 1) / 1000;
    const measured = frameTransform(moon, gcrf, resolver.instant(seconds));
    expect(rigidMatrixError(measured)).toBeDefined();
    const m = resolver.resolve(moon, gcrf, seconds, new Float64Array(16));
    expect(rigidMatrixError(m, 1e-14)).toBeUndefined();
    for (let i = 12; i < 15; i++) {
      expect(m[i]).toBe(measured[i]);
    }
    // The rotation moves by no more than the scale it drops.
    for (let i = 0; i < 11; i++) {
      expect(Math.abs(m[i]! - measured[i]!)).toBeLessThan(1e-7);
    }
  });
});
