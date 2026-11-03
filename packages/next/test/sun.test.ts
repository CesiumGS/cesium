// The sun's position from a time (plan §13.13) against almanac values, and
// the clock.
import { describe, expect, it } from "vitest";
import { sunDirection, sunTimes } from "../src/time/sun.ts";
import { Clock } from "../src/time/Clock.ts";

const deg = Math.PI / 180;
const direction = (ms: number) => sunDirection(ms, new Float64Array(3));
const declination = (ms: number) => Math.asin(direction(ms)[2]!) / deg;
const subsolarLongitude = (ms: number) => {
  const d = direction(ms);
  return Math.atan2(d[1]!, d[0]!) / deg;
};

describe("sun position", () => {
  it("is a unit vector", () => {
    const d = direction(Date.UTC(2026, 10, 2, 15));
    expect(Math.hypot(d[0]!, d[1]!, d[2]!)).toBeCloseTo(1, 12);
  });

  it("has the solstice's and equinox's declinations", () => {
    // June solstice 2024-06-20 20:51 UTC; March equinox 2024-03-20 03:06.
    expect(declination(Date.UTC(2024, 5, 20, 20, 51))).toBeCloseTo(23.44, 1);
    expect(Math.abs(declination(Date.UTC(2024, 2, 20, 3, 6)))).toBeLessThan(
      0.02,
    );
  });

  it("stands over the longitude the equation of time says", () => {
    // 2024-03-20 12:00 UTC: the equation of time is about −7.5 min, so the
    // sun is over about 1.9° E.
    expect(subsolarLongitude(Date.UTC(2024, 2, 20, 12))).toBeCloseTo(1.9, 0);
    // 2024-11-03 12:00 UTC: about +16.4 min, so over about 4.1° W.
    expect(subsolarLongitude(Date.UTC(2024, 10, 3, 12))).toBeCloseTo(-4.1, 0);
  });

  it("rises and sets in Philadelphia when the almanac says", () => {
    // 2024-06-20, Philadelphia (39.95° N, 75.17° W): sunrise 05:32 EDT
    // (09:32 UTC), sunset 20:32 EDT (00:32 UTC next day), with refraction
    // and the disk's edge; the center without refraction rises about 4
    // minutes later and sets 4 earlier.
    const start = Date.UTC(2024, 5, 20, 4);
    const t = sunTimes(start, -75.17 * deg, 39.95 * deg);
    const minutes = (a: number, b: number) => Math.abs(a - b) / 60_000;
    expect(minutes(t.sunrise!, Date.UTC(2024, 5, 20, 9, 36))).toBeLessThan(3);
    expect(minutes(t.sunset!, Date.UTC(2024, 5, 21, 0, 28))).toBeLessThan(3);
    // Solar noon: 13:02 EDT (17:02 UTC).
    expect(minutes(t.noon, Date.UTC(2024, 5, 20, 17, 2))).toBeLessThan(1.5);
  });
});

describe("clock", () => {
  it("advances at its rate while playing, not while paused", () => {
    const clock = new Clock({ time: 0, rate: 60 });
    clock.tick(0);
    expect(clock.tick(1000)).toBe(false);
    expect(clock.time).toBe(0);
    clock.mode = "playing";
    clock.tick(1000);
    clock.tick(2000);
    expect(clock.time).toBe(60_000);
  });

  it("leaves live when a time is set", () => {
    const clock = new Clock({ mode: "live" });
    clock.time = 0;
    expect(clock.mode).toBe("paused");
  });
});
