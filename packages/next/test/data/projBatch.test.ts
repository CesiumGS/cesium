// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
// PROJ batches (frames 5b, Task 10): flat x, y, z through the engineering
// frame, equal to the per-point methods, as bulk work.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { EARTH } from "../../src/scene/Body.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";

const base = `${join(framesDataDirectory(), "proj")}/`;
const GRIDS = ["us_noaa_g2018u0.tif"];

async function frame() {
  return EngineeringFrame.create(
    {
      name: "CA3",
      body: EARTH,
      crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
    },
    await loadProj({ base, grids: GRIDS }),
  );
}

/** Corridor points: 10 miles along a road, with a wiggle across it. */
const corridor = (n: number): Float64Array => {
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    out[i * 3] = 6_000_000 + i * 5;
    out[i * 3 + 1] = 2_000_000 + 30 * Math.sin(i / 40);
    out[i * 3 + 2] = 20 + i * 0.001;
  }
  return out;
};

describe("EngineeringFrame batches", () => {
  it("10,000 corridor points through toBodyFixedBatch equal toBodyFixed point by point, and back", async () => {
    const f = await frame();
    const design = corridor(10_000);
    const progress: number[] = [];
    const fixed = await f.toBodyFixedBatch(design, {
      onProgress: (p) => progress.push(p.done),
    });
    expect(progress.at(-1)).toBe(10_000);
    for (let i = 0; i < 10_000; i += 1) {
      expect(Array.from(fixed.subarray(i * 3, i * 3 + 3))).toEqual(
        Array.from(f.toBodyFixed(design.subarray(i * 3, i * 3 + 3))),
      );
    }
    const back = await f.fromBodyFixedBatch(fixed);
    for (let i = 0; i < 10_000; i += 97) {
      expect(Array.from(back.subarray(i * 3, i * 3 + 3))).toEqual(
        Array.from(f.fromBodyFixed(fixed.subarray(i * 3, i * 3 + 3))),
      );
    }
  }, 60_000);

  it("rejects an abort, a length that is not a multiple of 3, and a non-finite coordinate, naming the index", async () => {
    const f = await frame();
    const controller = new AbortController();
    controller.abort();
    await expect(
      f.toBodyFixedBatch(corridor(10), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(f.toBodyFixedBatch([1, 2, 3, 4])).rejects.toThrow(RangeError);
    const bad = corridor(5);
    bad[7] = Number.NaN;
    await expect(f.toBodyFixedBatch(bad)).rejects.toThrow(
      /coordinate 7 \(point 2\)/,
    );
    await expect(f.fromBodyFixedBatch(bad)).rejects.toThrow(RangeError);
  });
});
