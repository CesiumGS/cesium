// The atmosphere model's photometric scale and the reference's frame
// (plan §4.2): CPU, double precision.
import { describe, expect, it } from "vitest";
import {
  EARTH,
  directSunIlluminance,
  singleScattering,
  solarIlluminanceOutside,
} from "../src/atmosphere/model.ts";
import { toZUp } from "../src/atmosphere/AtmosphereReference.ts";

const ground: [number, number, number] = [0, 0, EARTH.bottomRadius + 1];
const sunAt = (zenithDegrees: number): [number, number, number] => {
  const z = (zenithDegrees * Math.PI) / 180;
  return [Math.sin(z), 0, Math.cos(z)];
};

describe("atmosphere model", () => {
  it("has the solar illuminance constant outside the atmosphere", () => {
    // About 128-133 klx in the literature; ASTM G-173 integrates to 132.5.
    const lux = solarIlluminanceOutside();
    expect(lux).toBeGreaterThan(128_000);
    expect(lux).toBeLessThan(135_000);
  });

  it("attenuates the sun at sea level as a clear atmosphere does", () => {
    const zenith = directSunIlluminance(EARTH, ground, sunAt(0));
    // A very clean atmosphere (aerosol optical depth about 0.005).
    expect(zenith.y).toBeGreaterThan(105_000);
    expect(zenith.y).toBeLessThan(120_000);
    const low = directSunIlluminance(EARTH, ground, sunAt(88));
    expect(low.y).toBeLessThan(zenith.y / 5);
    // Reddened near the horizon.
    expect(low.rgb[0]).toBeGreaterThan(low.rgb[1]);
    expect(low.rgb[1]).toBeGreaterThan(low.rgb[2]);
    // Below the horizon: nothing.
    expect(directSunIlluminance(EARTH, ground, sunAt(95)).y).toBe(0);
  });

  it("scatters a blue zenith sky", () => {
    const sky = singleScattering(EARTH, ground, [0, 0, 1], sunAt(45));
    expect(sky.rgb[2]).toBeGreaterThan(sky.rgb[1]);
    expect(sky.rgb[1]).toBeGreaterThan(sky.rgb[0]);
    expect(sky.y).toBeGreaterThan(500);
    expect(sky.y).toBeLessThan(3000);
  });
});

describe("reference frame", () => {
  it("rotates the observer to +z and keeps angles", () => {
    const up: [number, number, number] = [0.6, -0.48, 0.64];
    const n = Math.hypot(...up);
    const u = up.map((v) => v / n) as [number, number, number];
    const rotate = toZUp(u);
    const z = rotate(u);
    expect(z[0]).toBeCloseTo(0, 12);
    expect(z[1]).toBeCloseTo(0, 12);
    expect(z[2]).toBeCloseTo(1, 12);
    const a: [number, number, number] = [0.2, 0.3, -0.9];
    const b: [number, number, number] = [-0.7, 0.1, 0.4];
    const ra = rotate(a);
    const rb = rotate(b);
    const dot = (p: number[], q: number[]) =>
      p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]!;
    expect(dot(ra, rb)).toBeCloseTo(dot(a, b), 12);
    expect(dot(ra, ra)).toBeCloseTo(dot(a, a), 12);
  });
});
