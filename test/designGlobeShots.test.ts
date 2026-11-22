// "Fly along" over the corridor's cuts (UX review S11): the camera keeps
// clear of the side slopes' tops near it, rising and falling smoothly.
import { describe, expect, it } from "vitest";
import { cutRise } from "../examples/design-globe/shots.ts";
import { DAYLIGHT } from "../examples/design-globe/corridorDaylight.ts";

const FT_US = 1200 / 3937;

describe("Fly along's height over the cuts", () => {
  it("reaches the deepest cut's top at its station, and changes smoothly along the road", () => {
    const [station, left, right] = DAYLIGHT.reduce((a, b) =>
      Math.max(b[1], b[2]) > Math.max(a[1], a[2]) ? b : a,
    );
    expect(cutRise(station)).toBeCloseTo(Math.max(left, right) * FT_US, 6);
    let last = cutRise(DAYLIGHT[0]![0]);
    let steepest = 0;
    for (let s = DAYLIGHT[0]![0]; s <= DAYLIGHT.at(-1)![0]; s += 25) {
      const r = cutRise(s);
      expect(r).toBeGreaterThanOrEqual(0);
      steepest = Math.max(steepest, Math.abs(r - last));
      last = r;
    }
    // No jump: under 2 m of camera height per 25 ftUS of station.
    expect(steepest).toBeLessThan(2);
  });
});
