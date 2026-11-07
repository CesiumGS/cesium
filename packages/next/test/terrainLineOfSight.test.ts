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
  it("clears a sharp hill sampled off-peak within the step's error", () => {
    const H = 500;
    const sigma = 400 / A;
    const sharp = (lon: number, lat: number): number =>
      PEAK * Math.exp(-(lon * lon + lat * lat) / (2 * sigma * sigma));
    // Shift the ends 11 m so the peak falls between samples.
    const shift = 11 / A;
    const result = terrainLineOfSight(
      at(-HALF + shift, 0, H),
      at(HALF + shift, 0, H),
      sharp,
      { step: 30 },
    );
    // Hand geometry: the chord's lowest point over the peak is near the
    // midpoint, (a+H)·cosθ from the center, less the summit.
    const expected = (A + H) * Math.cos(HALF) - A - PEAK;
    expect(result.clear).toBe(true);
    expect(result.unknownFraction).toBe(0);
    expect(result.blockedAt).toBeUndefined();
    expect(result.stepError).toBeGreaterThan(1);
    expect(Math.abs(result.minClearance! - expected)).toBeLessThan(
      result.stepError,
    );
    expect(result.accuracy.note).toContain("narrower than the step");
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

  it("never reports clear over a narrow tall ridge, wherever it sits", () => {
    for (let offset = 0; offset < 60; offset += 3) {
      const centre = (offset - 30) / A;
      const ridge = (lon: number): number =>
        Math.abs(lon - centre) < 50 / A ? 800 : 0;
      const r = terrainLineOfSight(at(-HALF, 0, 500), at(HALF, 0, 500), ridge, {
        step: 30,
      });
      expect(r.clear).toBe(false);
    }
  });

  it("never reports clear over a 100 m unloaded hole, wherever it sits", () => {
    for (let offset = 0; offset < 60; offset += 3) {
      const centre = (offset - 30) / A;
      const holed = (lon: number): number | undefined =>
        Math.abs(lon - centre) < 50 / A ? undefined : 0;
      const r = terrainLineOfSight(
        at(-HALF, 0, 2000),
        at(HALF, 0, 2000),
        holed,
        { step: 30 },
      );
      expect(r.clear).toBeUndefined();
      expect(r.unknownFraction).toBeGreaterThan(0);
    }
  });

  it("treats a single unknown sample as unknown", () => {
    let calls = 0;
    const r = terrainLineOfSight(
      at(-HALF, 0, 2000),
      at(HALF, 0, 2000),
      () => (++calls === 200 ? undefined : 0),
      { step: 30 },
    );
    expect(r.clear).toBeUndefined();
    expect(r.unknownFraction).toBeGreaterThan(0);
  });

  it("is unknown, not clear, when the path is too long to sample at step", () => {
    const r = terrainLineOfSight(
      at(-HALF, 0, 2000),
      at(HALF, 0, 2000),
      () => 0,
      { step: 0.1 },
    );
    expect(r.clear).toBeUndefined();
    expect(r.step).toBeGreaterThan(0.1);
    expect(r.accuracy.note).toContain("too long to sample at 0.1 m");
  });

  it("returns unknown for non-finite input without hanging", () => {
    const r = terrainLineOfSight([NaN, 0, 0], at(HALF, 0, 0), () => 0);
    expect(r.clear).toBeUndefined();
    expect(r.unknownFraction).toBe(1);
    const inf = terrainLineOfSight(at(0, 0, 0), at(HALF, 0, 0), () => 0, {
      step: Infinity,
    });
    expect(inf.clear).toBeUndefined();
    expect(inf.unknownFraction).toBe(1);
    const far = terrainLineOfSight(at(0, 0, 0), [Infinity, 0, 0], () => 0);
    expect(far.clear).toBeUndefined();
  });

  it("counts unknown terrain under a zero-length path", () => {
    const p = at(0, 0, 10);
    const unknown = terrainLineOfSight(p, p, () => undefined);
    expect(unknown.clear).toBeUndefined();
    expect(unknown.unknownFraction).toBe(1);
    expect(terrainLineOfSight(p, p, () => 0).clear).toBe(true);
  });
});
