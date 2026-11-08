// The meter's highlight guard (meter.slang): the reading is no lower than the
// 98th percentile less HIGHLIGHT_GUARD_STOPS, so a small bright crescent in a
// dark image isn't blown out. The fake GPU runs no shaders, so the rule is
// ported here (histogram, 65th to 98th band, guard) and the shader source is
// checked to hold the constants.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const LOW = -24;
const BINS = 144;
const BIN_STOPS = 48 / 144;
const BAND = [0.65, 0.98] as const;
const HIGHLIGHT_GUARD_STOPS = 4;

const binOf = (l: number) =>
  Math.min(
    Math.max(Math.trunc((Math.log2(Math.max(l, 1e-7)) - LOW) / BIN_STOPS), 0),
    BINS - 1,
  );

/** The mean log2 luminance over the band, and the guarded reading. */
function read(pixels: number[]): { band: number; guarded: number } {
  const counts = new Array<number>(BINS).fill(0);
  for (const l of pixels) {
    counts[binOf(l)]!++;
  }
  const total = pixels.length;
  let under = 0;
  let sum = 0;
  let weight = 0;
  let peak = LOW;
  for (let b = 0; b < BINS; b++) {
    const count = counts[b]!;
    const center = LOW + (b + 0.5) * BIN_STOPS;
    const inBand = Math.max(
      Math.min(under + count, total * BAND[1]) -
        Math.max(under, total * BAND[0]),
      0,
    );
    sum += center * inBand;
    weight += inBand;
    if (under <= total * BAND[1] && total * BAND[1] < under + count) {
      peak = center;
    }
    under += count;
  }
  const guardedSum = Math.max(sum, (peak - HIGHLIGHT_GUARD_STOPS) * weight);
  return { band: sum / weight, guarded: guardedSum / weight };
}

describe("the meter's highlight guard", () => {
  it("lifts a small bright crescent in a dark image", () => {
    // 22% a sunlit crescent (5000 cd/m2), the rest night sky and ground.
    const image = [
      ...new Array<number>(780).fill(1e-3),
      ...new Array<number>(220).fill(5000),
    ];
    const { band, guarded } = read(image);
    expect(band).toBeLessThan(Math.log2(5000) - HIGHLIGHT_GUARD_STOPS);
    expect(guarded).toBeCloseTo(Math.log2(5000) - HIGHLIGHT_GUARD_STOPS, 0);
    expect(guarded).toBeGreaterThan(band + 4);
  });

  it("leaves a daylight scene as it was", () => {
    // Sunlit ground, shade and sky, all within 4 stops of the top.
    const day: number[] = [];
    for (let i = 0; i < 1000; i++) {
      day.push(2000 + (8000 * ((i * 7919) % 1000)) / 1000);
    }
    const { band, guarded } = read(day);
    expect(guarded).toBe(band);
  });

  it("is deterministic, whatever the order of the pixels", () => {
    const image = [
      ...new Array<number>(700).fill(1e-3),
      ...new Array<number>(300).fill(4000),
    ];
    expect(read([...image].reverse())).toEqual(read(image));
  });

  it("reads an empty image as no reading", () => {
    expect(Number.isNaN(read([]).guarded)).toBe(true);
  });

  it("is in the shader, bounded by constants", () => {
    const slang = readFileSync(
      new URL("../src/shaders/meter.slang", import.meta.url),
      "utf8",
    );
    expect(slang).toContain("static const float HIGHLIGHT_GUARD_STOPS = 4.0;");
    expect(slang).toContain("static const float2 BAND = float2(0.65, 0.98);");
    expect(slang).toContain("peak - HIGHLIGHT_GUARD_STOPS");
  });
});
