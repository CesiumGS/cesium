// Reads the frames data store `npm run setup` fills (scripts/frameData.mjs).
// Excluded from `vitest run`; `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readPack } from "../../src/ephemeris/pack.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";

interface Entry {
  file: string;
  role: string;
  sha256: string;
  sourceUrl: string;
  sourceSha256?: string;
  credit?: string;
}

const dir = framesDataDirectory();
const readManifest = (): { files: Entry[] } => {
  try {
    return JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  } catch (error) {
    throw new Error(
      `No frames data in ${dir}: run \`npm run setup\` (or set FRAMES_DATA_DIR to where it wrote the store)`,
      { cause: error },
    );
  }
};
const manifest = readManifest();
const entry = (role: string): Entry => {
  const found = manifest.files.find((f) => f.role === role);
  if (!found) {
    throw new Error(`manifest has no ${role} entry`);
  }
  return found;
};
const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
const text = (file: string): string => readFileSync(join(dir, file), "utf8");

describe("frames data store", () => {
  it("lists the four sources and both packs", () => {
    expect(manifest.files.map((f) => f.role).sort()).toEqual([
      "eop",
      "leapSeconds",
      "moon",
      "planets",
    ]);
    expect(entry("eop").credit).toBe("IERS, via CelesTrak");
  });

  it.each(["planets", "moon"])(
    "the %s pack reads and covers 2000-2050",
    (role) => {
      const { manifest: pack, data } = readPack(bytes(entry(role).file));
      expect(pack.sourceSha256).toBe(entry(role).sourceSha256);
      expect(entry(role)).not.toHaveProperty("derivedFrom");
      expect(pack.segments.length).toBeGreaterThan(0);
      expect(data.length).toBeGreaterThan(0);
      const from = Date.parse(pack.span[0]);
      const to = Date.parse(pack.span[1]);
      expect(from).toBeLessThanOrEqual(Date.UTC(2000, 0, 1));
      expect(to).toBeGreaterThanOrEqual(Date.UTC(2051, 0, 1));
    },
  );

  it("the leap-second table gives 37 s now and is not expired", () => {
    const leap = LeapSeconds.fromIers(text(entry("leapSeconds").file));
    expect(leap.taiMinusUtc(Date.now())).toBe(37);
    expect(leap.isExpired(Date.now())).toBe(false);
  });

  it("the EOP table covers today", () => {
    const eop = EarthOrientationParameters.fromCelestrakCsv(
      text(entry("eop").file),
    );
    expect(eop.first).toBeLessThanOrEqual(Date.now());
    expect(eop.last).toBeGreaterThanOrEqual(Date.now());
  });
});
