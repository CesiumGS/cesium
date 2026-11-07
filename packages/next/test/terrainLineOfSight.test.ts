import { describe, expect, it } from "vitest";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { terrainLineOfSight } from "../src/measure/terrainLineOfSight.ts";

const WGS84 = Ellipsoid.WGS84;
const A = WGS84.radii[0]!;
const PEAK = 300;
const SIGMA = 3000 / A; // radians of arc

/** A Gaussian hill at the origin of longitude and latitude. */
const hill = (lon: number, lat: number): number =>
  PEAK * Math.exp(-(lon * lon + lat * lat) / (2 * SIGMA * SIGMA));

function at(lonRad: number, latRad: number, height: number): Float64Array {
  return WGS84.cartographicToCartesian(
    { longitude: lonRad, latitude: latRad, height },
    new Float64Array(3),
  );
}

const HALF = 20000 / A; // 20 km either side of the hill

describe("terrainLineOfSight", () => {
  it("clears a hill with the chord's sag as the clearance", () => {
    const H = 500;
    const result = terrainLineOfSight(at(-HALF, 0, H), at(HALF, 0, H), hill, {
      step: 30,
    });
    // Hand geometry: the chord's midpoint sits (a+H)·cosθ from the center.
    const expected = (A + H) * Math.cos(HALF) - A - PEAK;
    expect(result.clear).toBe(true);
    expect(result.unknownFraction).toBe(0);
    expect(result.blockedAt).toBeUndefined();
    expect(result.minClearance).toBeCloseTo(expected, 0);
    expect(Math.abs(result.minClearance! - expected)).toBeLessThan(1);
  });

  it("is blocked by a ray through the hill's face", () => {
    const result = terrainLineOfSight(
      at(-HALF, 0, 100),
      at(HALF, 0, 100),
      hill,
      { step: 30 },
    );
    expect(result.clear).toBe(false);
    expect(result.minClearance).toBeLessThan(0);
    const c = WGS84.cartesianToCartographic(result.blockedAt!, {
      longitude: 0,
      latitude: 0,
      height: 0,
    })!;
    // On the near (west) face: left of the summit, inside 3σ.
    expect(c.longitude).toBeLessThan(0);
    expect(c.longitude).toBeGreaterThan(-3 * SIGMA);
  });

  it("never calls a path clear over unloaded terrain (30% unknown)", () => {
    const unloaded = (lon: number, lat: number): number | undefined =>
      lon > -0.15 * (2 * HALF) + 0 * lat && lon < 0.15 * (2 * HALF)
        ? undefined
        : 0;
    const result = terrainLineOfSight(
      at(-HALF, 0, 2000),
      at(HALF, 0, 2000),
      unloaded,
      { step: 30 },
    );
    expect(result.clear).toBeUndefined();
    expect(result.unknownFraction).toBeGreaterThan(0.28);
    expect(result.unknownFraction).toBeLessThan(0.32);
    expect(result.accuracy.note).toMatch(/unknown/i);
  });

  it("still reports a block when part of the path is unknown", () => {
    const result = terrainLineOfSight(
      at(-HALF, 0, 100),
      at(HALF, 0, 100),
      (lon, lat) => (lon > 0.5 * HALF ? undefined : hill(lon, lat)),
    );
    expect(result.clear).toBe(false);
    expect(result.unknownFraction).toBeGreaterThan(0);
  });

  it("states the terrain accuracy it was given", () => {
    const result = terrainLineOfSight(
      at(-HALF, 0, 500),
      at(HALF, 0, 500),
      hill,
      { terrainAccuracy: 12.5 },
    );
    expect(result.accuracy.meters).toBe(12.5);
    expect(result.accuracy.note).toContain("12.5");
  });

  it("samples a ray kilometres above the terrain sparsely", () => {
    const high = terrainLineOfSight(
      at(-HALF, 0, 5000),
      at(HALF, 0, 5000),
      hill,
      { step: 30 },
    );
    const low = terrainLineOfSight(at(-HALF, 0, 500), at(HALF, 0, 500), hill, {
      step: 30,
    });
    expect(high.clear).toBe(true);
    expect(high.minClearance!).toBeGreaterThan(4000);
    expect(high.samples).toBeLessThan(40_000 / 30 / 4);
    expect(high.samples).toBeLessThan(low.samples);
  });
});
