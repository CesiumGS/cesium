import { describe, expect, it } from "vitest";
import { meanAlbedo } from "../src/atmosphere/albedo.ts";

/** sRGB to linear, as the sky reads its maps. */
function linear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

describe("meanAlbedo", () => {
  it("is the cosine-weighted mean of the texels' linear luminance", () => {
    const width = 16;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data.set([(i * 37) % 256, (i * 91) % 256, (i * 13) % 256, 255], i * 4);
    }
    let sum = 0;
    let weights = 0;
    for (let y = 0; y < height; y++) {
      const w = Math.cos(((y + 0.5) / height - 0.5) * Math.PI);
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        sum +=
          w *
          (0.2126 * linear(data[i]!) +
            0.7152 * linear(data[i + 1]!) +
            0.0722 * linear(data[i + 2]!));
        weights += w;
      }
    }
    expect(meanAlbedo(data, width, height)).toBeCloseTo(sum / weights, 12);
  });

  it("weights the equator over the poles", () => {
    // White at the pole rows, black elsewhere: well under the rows' share.
    const width = 4;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < width; x++) {
      for (const y of [0, height - 1]) {
        data.set([255, 255, 255, 255], (y * width + x) * 4);
      }
    }
    const mean = meanAlbedo(data, width, height);
    expect(mean).toBeGreaterThan(0);
    expect(mean).toBeLessThan(2 / height);
  });

  it("is 1 for a black map (no scale to set)", () => {
    expect(meanAlbedo(new Uint8ClampedArray(4 * 4 * 4), 4, 4)).toBe(1);
  });
});
