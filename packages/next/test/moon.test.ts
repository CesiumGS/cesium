// The Moon (plan §13.14): its position (Simon et al. 1994, as 1.x) against
// Meeus's worked example, and its brightness by phase.
import { describe, expect, it } from "vitest";
import { icrfToFixed } from "../src/time/celestial.ts";
import {
  lommelSeeliger,
  moonPhaseBrightness,
  moonAxes,
  moonPosition,
} from "../src/time/moon.ts";
import { sunDirection } from "../src/time/sun.ts";

const deg = Math.PI / 180;

describe("moonPosition", () => {
  it("matches Meeus's example 47.a (1992 April 12, 0h TD)", () => {
    // 0h dynamical time is 59 s earlier in UTC (ΔT in 1992).
    const p = moonPosition(Date.UTC(1992, 3, 11, 23, 59, 1));
    // The ecliptic of J2000, then precessed to the date's equinox (5029″
    // per century in longitude; the example's λ is of date, before
    // nutation).
    const ce = Math.cos(23.4392911 * deg);
    const se = Math.sin(23.4392911 * deg);
    const x = p[0]!;
    const y = ce * p[1]! + se * p[2]!;
    const z = -se * p[1]! + ce * p[2]!;
    const distance = Math.hypot(x, y, z);
    const t = (2_448_724.5 - 2_451_545.0) / 36_525;
    const longitude = Math.atan2(y, x) / deg + (5029.0966 * t) / 3600;
    const latitude = Math.asin(z / distance) / deg;
    expect(Math.abs(longitude - 133.162655)).toBeLessThan(0.05);
    expect(Math.abs(latitude - -3.229126)).toBeLessThan(0.05);
    expect(Math.abs(distance / 1000 / 368_409.7 - 1)).toBeLessThan(1e-3);
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
