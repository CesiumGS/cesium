// The sky pack `npm run sky -- build` made on this machine: its counts and
// its brightest stars against published figures. `SKY_DATA=1 npx vitest run
// test/data/skyPack.test.ts` runs it. Holds no pack data.
//
// The calibration used HYG's magnitudes, so these counts and magnitudes
// check the build; they are not independent proof.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseManifest,
  readBackground,
  readPoints,
} from "../../src/atmosphere/skyPack.ts";
import {
  MAGNITUDE_ZERO_ILLUMINANCE,
  STAR_FLOATS,
} from "../../src/atmosphere/stars.ts";
import { chosenPackDirectory } from "../../scripts/skyStore.mjs";

const dir = chosenPackDirectory();
const buffer = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};

describe("the local sky pack", () => {
  const manifest = parseManifest(
    JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")),
  );
  const points = readPoints(buffer(manifest.points.file), manifest);
  const mags = Array.from(
    { length: manifest.points.count },
    (_, i) =>
      -2.5 *
      Math.log10(points[i * STAR_FLOATS + 3]! / MAGNITUDE_ZERO_ILLUMINANCE),
  );

  it("is not distributable and lists its sources", () => {
    expect(manifest.distributable).toBe(false);
    expect(manifest.sources.length).toBeGreaterThan(0);
  });

  it("holds 450,000 to 700,000 stars, brightest first", () => {
    expect(manifest.points.count).toBeGreaterThan(450_000);
    expect(manifest.points.count).toBeLessThan(700_000);
    expect(mags.every((m, i) => i === 0 || m >= mags[i - 1]! - 1e-6)).toBe(
      true,
    );
  });

  it("counts stars as the sky does (Allen's table)", () => {
    const brighter = (m: number) => mags.filter((x) => x < m).length;
    expect(Math.abs(brighter(8) / 41_000 - 1)).toBeLessThan(0.15);
    expect(Math.abs(brighter(9) / 120_000 - 1)).toBeLessThan(0.15);
  });

  it("puts Sirius, Canopus and Arcturus within 0.15 magnitudes", () => {
    expect(mags[0]).toBeCloseTo(-1.46, 1);
    expect(Math.abs(mags[1]! + 0.74)).toBeLessThan(0.15);
    expect(Math.abs(mags[2]! + 0.05)).toBeLessThan(0.15);
  });

  it("has a mean background between 0.5 and 2.5 x 10^-4 cd/m2", () => {
    expect(manifest.background.meanLuminance).toBeGreaterThan(0.5e-4);
    expect(manifest.background.meanLuminance).toBeLessThan(2.5e-4);
    const faces = readBackground(buffer(manifest.background.file), manifest);
    expect(faces).toHaveLength(6);
    expect(faces[0]).toHaveLength(manifest.background.levels);
  });
});
