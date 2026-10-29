import { describe, expect, it } from "vitest";
import { flip } from "../parity/flip.ts";

// The full implementation was checked against NVIDIA's reference test pair
// (images/reference.png vs images/test.png in NVlabs/flip): mean 0.159691 vs
// the expected 0.159693. These tests pin basic properties without the images.

function solid(
  width: number,
  height: number,
  rgb: [number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data.set([...rgb, 255], i * 4);
  }
  return data;
}

describe("LDR-FLIP", () => {
  it("is zero for identical images", () => {
    const image = solid(32, 24, [120, 80, 200]);
    expect(flip(image, image, 32, 24).mean).toBe(0);
  });

  it("is near its maximum for black vs white", () => {
    const result = flip(
      solid(32, 24, [0, 0, 0]),
      solid(32, 24, [255, 255, 255]),
      32,
      24,
    );
    expect(result.mean).toBeGreaterThan(0.9);
    expect(result.max).toBeLessThanOrEqual(1);
  });

  it("grows with the size of a color difference", () => {
    const base = solid(32, 24, [100, 100, 100]);
    const near = flip(base, solid(32, 24, [104, 100, 100]), 32, 24).mean;
    const far = flip(base, solid(32, 24, [160, 100, 100]), 32, 24).mean;
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });
});
