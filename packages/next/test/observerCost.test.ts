// The observer's cost page (sky and observer plan, Task 16): its stars and its rules.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAGNITUDE_ZERO_ILLUMINANCE,
  STAR_FLOATS,
  magnitudeOfRank,
} from "../src/atmosphere/stars.ts";
import { installGpuGlobals } from "./fakeGpu.ts";

// The page imports the engine, which reads WebGPU's constants as it loads.
installGpuGlobals();
const { median, syntheticStars } = await import("../bench/observerCost.ts");

const source = readFileSync(
  new URL("../bench/observerCost.ts", import.meta.url),
  "utf8",
);

/** Stars brighter than a magnitude, by illuminance. */
const brighterThan = (points: Float32Array, count: number, mag: number) => {
  const limit = MAGNITUDE_ZERO_ILLUMINANCE * 10 ** (-0.4 * mag);
  let n = 0;
  for (let i = 0; i < count; i++) {
    if (points[i * STAR_FLOATS + 3]! > limit) {
      n++;
    }
  }
  return n;
};

describe("syntheticStars", () => {
  const field = syntheticStars(20_000, 7);

  it("is the same for one seed, and not for another", () => {
    const again = syntheticStars(20_000, 7);
    expect(Array.from(again.points.subarray(0, 4000))).toEqual(
      Array.from(field.points.subarray(0, 4000)),
    );
    const other = syntheticStars(20_000, 8);
    expect(other.points[0]).not.toBe(field.points[0]);
  });

  it("is brightest first", () => {
    let last = Infinity;
    for (let i = 0; i < field.count; i++) {
      const lux = field.points[i * STAR_FLOATS + 3]!;
      expect(lux).toBeLessThanOrEqual(last);
      last = lux;
    }
  });

  it("has the sky's count brighter than magnitude 6, within 15% of 4,800", () => {
    const six = brighterThan(field.points, field.count, 6);
    expect(Math.abs(six - 4800) / 4800).toBeLessThan(0.15);
    expect(magnitudeOfRank(4800)).toBeCloseTo(6, 1);
  });

  it("has only finite values, and unit directions", () => {
    for (let i = 0; i < field.count * STAR_FLOATS; i++) {
      expect(Number.isFinite(field.points[i]!)).toBe(true);
    }
    for (let i = 0; i < field.count; i += 97) {
      const b = i * STAR_FLOATS;
      const length = Math.hypot(
        field.points[b]!,
        field.points[b + 1]!,
        field.points[b + 2]!,
      );
      expect(length).toBeCloseTo(1, 5);
    }
    expect(field.backgroundLevels).toHaveLength(6);
  });

  it("puts most stars in a band", () => {
    // Galactic latitude from the pole's dot product: a third are uniform, so
    // well over a third lie within 20 degrees of the plane (uniform: 34%).
    const pole = [
      Math.cos((27.12825 * Math.PI) / 180) *
        Math.cos((192.85948 * Math.PI) / 180),
      Math.cos((27.12825 * Math.PI) / 180) *
        Math.sin((192.85948 * Math.PI) / 180),
      Math.sin((27.12825 * Math.PI) / 180),
    ];
    let near = 0;
    for (let i = 0; i < field.count; i++) {
      const b = i * STAR_FLOATS;
      const dot =
        field.points[b]! * pole[0]! +
        field.points[b + 1]! * pole[1]! +
        field.points[b + 2]! * pole[2]!;
      if (Math.abs(dot) < Math.sin((20 * Math.PI) / 180)) {
        near++;
      }
    }
    expect(near / field.count).toBeGreaterThan(0.6);
  });
});

describe("the results", () => {
  it("takes a median that ignores a non-finite value", () => {
    expect(median([3, 1, Number.NaN, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNaN();
  });

  it("names a row for each method, and the adapter, in its JSON's type", () => {
    for (const method of [
      "indirect draw",
      "CPU path",
      '"quads"',
      '"strips"',
      "tier ",
      "the point limit",
    ]) {
      expect(source).toContain(method);
    }
    expect(source).toMatch(/adapter:\s*\{/);
    expect(source).toContain("architecture");
    expect(source).toContain("description");
    expect(source).toContain("deviceLost");
  });
});

describe("the page's data", () => {
  it("names no binary file", () => {
    expect(source).not.toMatch(/\.bin\b/);
  });

  it("asks for a pack only when the page's query says so", () => {
    const uses = [...source.matchAll(/sky-pack/g)].map((m) => m.index!);
    expect(uses.length).toBeGreaterThan(0);
    for (const at of uses) {
      const before = source.slice(Math.max(0, at - 400), at);
      expect(before).toMatch(/if \(local\)/);
    }
    expect(source).toContain('params.get("pack") === "local"');
  });
});
