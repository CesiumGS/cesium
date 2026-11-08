// The Moon (plan §13.14): its position (Meeus's chapter 47, ELP-2000/82's main
// terms) against Meeus's worked example, and its brightness by phase.
import { describe, expect, it } from "vitest";
import {
  lommelSeeliger,
  moonPhaseBrightness,
} from "../src/atmosphere/moonLight.ts";
import { icrfToFixed } from "../src/time/celestial.ts";
import { moonAxes, moonEcliptic, moonPosition } from "../src/time/moon.ts";
import { greenwichSiderealTime, sunDirection } from "../src/time/sun.ts";

const deg = Math.PI / 180;

describe("moonPosition", () => {
  it("matches Meeus's example 47.a (1992 April 12, 0h TD) to its digits", () => {
    const t = (2_448_724.5 - 2_451_545.0) / 36_525;
    const { longitude, latitude, distance } = moonEcliptic(t);
    const turns = ((longitude / deg) % 360) + 360;
    expect(turns % 360).toBeCloseTo(133.162655, 5);
    expect(latitude / deg).toBeCloseTo(-3.229126, 5);
    expect(distance / 1000).toBeCloseTo(368_409.7, 0);
  });

  it("turns the series to the J2000 equator (example 47.a again)", () => {
    // 0h dynamical time is 59 s earlier in UTC (ΔT in 1992); the series
    // takes UTC plus today's 69.184 s, so ask 10.184 s earlier.
    const p = moonPosition(Date.UTC(1992, 3, 11, 23, 59, 1) - 10_184);
    // Forward again: precession to the date (as `icrfToFixed`, without the
    // spin), then the ecliptic of the date by its mean obliquity.
    const m = icrfToFixed(Date.UTC(1992, 3, 11, 23, 59, 1));
    const gmst = greenwichSiderealTime(Date.UTC(1992, 3, 11, 23, 59, 1));
    const c = Math.cos(gmst);
    const s = Math.sin(gmst);
    const fixed = [0, 1, 2].map(
      (i) => m[i * 3]! * p[0]! + m[i * 3 + 1]! * p[1]! + m[i * 3 + 2]! * p[2]!,
    );
    const x = c * fixed[0]! - s * fixed[1]!;
    const yq = s * fixed[0]! + c * fixed[1]!;
    const zq = fixed[2]!;
    const t = (2_448_724.5 - 2_451_545.0) / 36_525;
    const epsilon = ((84381.448 - 46.815 * t) / 3600) * deg;
    const y = Math.cos(epsilon) * yq + Math.sin(epsilon) * zq;
    const z = -Math.sin(epsilon) * yq + Math.cos(epsilon) * zq;
    const distance = Math.hypot(x, y, z);
    // 1 mas in the rotations, the example's rounding.
    expect(Math.atan2(y, x) / deg).toBeCloseTo(133.162655, 3);
    expect(Math.asin(z / distance) / deg).toBeCloseTo(-3.229126, 3);
    expect(distance / 1000).toBeCloseTo(368_409.7, -1);
  });

  it("is opposite the sun at a full moon (2024 April 23, 23:49 UTC)", () => {
    const time = Date.UTC(2024, 3, 23, 23, 49);
    const m = icrfToFixed(time);
    const p = moonPosition(time);
    const fixed = [0, 1, 2].map(
      (i) => m[i * 3]! * p[0]! + m[i * 3 + 1]! * p[1]! + m[i * 3 + 2]! * p[2]!,
    );
    const sun = sunDirection(time, new Float64Array(3));
    const cos =
      (fixed[0]! * sun[0]! + fixed[1]! * sun[1]! + fixed[2]! * sun[2]!) /
      Math.hypot(...fixed);
    // Opposite in longitude; the Moon's latitude (up to 5.1°) keeps it
    // off the exact opposite.
    expect(Math.acos(cos) / deg).toBeGreaterThan(174);
  });
});

describe("moonAxes", () => {
  it("shows Meeus's libration for example 53.a (1992 April 12, 0h TD)", () => {
    const time = Date.UTC(1992, 3, 11, 23, 59, 1);
    const p = moonPosition(time);
    const a = moonAxes(time);
    const length = Math.hypot(p[0]!, p[1]!, p[2]!);
    const toEarth = [0, 1, 2].map((i) => -p[i]! / length);
    const x = [a[0]!, a[1]!, a[2]!];
    const z = [a[3]!, a[4]!, a[5]!];
    const y = [
      z[1]! * x[2]! - z[2]! * x[1]!,
      z[2]! * x[0]! - z[0]! * x[2]!,
      z[0]! * x[1]! - z[1]! * x[0]!,
    ];
    const dot = (u: number[], v: number[]) =>
      u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
    expect(Math.abs(dot(x, z))).toBeLessThan(1e-12);
    // The Earth's selenographic longitude and latitude: the total
    // libration, l = -1.23° and b = +4.20° (optical and physical).
    const longitude = Math.atan2(dot(toEarth, y), dot(toEarth, x)) / deg;
    const latitude = Math.asin(dot(toEarth, z)) / deg;
    expect(Math.abs(longitude - -1.23)).toBeLessThan(0.15);
    expect(Math.abs(latitude - 4.2)).toBeLessThan(0.15);
    // Its pole's position angle on the sky, from north through east: P =
    // 15.08° (the equator of date, 0.04° off J2000's then).
    const toMoon = toEarth.map((c) => -c);
    const east = [-toMoon[1]!, toMoon[0]!, 0];
    const north = [
      -toMoon[2]! * toMoon[0]!,
      -toMoon[2]! * toMoon[1]!,
      1 - toMoon[2]! * toMoon[2]!,
    ];
    const angle = Math.atan2(dot(z, east), dot(z, north)) / deg;
    expect(Math.abs(angle - 15.08)).toBeLessThan(0.2);
  });
});

describe("the Moon's brightness by phase", () => {
  it("is full at 0 and a tenth or so at a half moon (Allen)", () => {
    expect(moonPhaseBrightness(0)).toBe(1);
    const half = moonPhaseBrightness(90 * deg);
    expect(half).toBeGreaterThan(0.08);
    expect(half).toBeLessThan(0.1);
  });

  it("Lommel-Seeliger's disk sums to 1 at full and falls with phase", () => {
    expect(lommelSeeliger(0)).toBe(1);
    // 1 − sin 45° · tan 45° · ln cot 22.5° at a half moon.
    expect(lommelSeeliger(90 * deg)).toBeCloseTo(
      1 - Math.SQRT1_2 * Math.log(1 / Math.tan(22.5 * deg)),
      10,
    );
    expect(lommelSeeliger(120 * deg)).toBeLessThan(lommelSeeliger(90 * deg));
  });
});
