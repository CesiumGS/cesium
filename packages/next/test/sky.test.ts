import { describe, expect, it } from "vitest";
import { frameTransform } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { createSkyState, skyState } from "../src/frames/sky.ts";
import { icrfToFixed } from "../src/time/celestial.ts";
import { celestialToTerrestrial } from "../src/time/earthOrientation.ts";
import { Instant } from "../src/time/Instant.ts";
import { moonAxes, moonPosition } from "../src/time/moon.ts";
import { sunDirection } from "../src/time/sun.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

// The synthetic ephemeris covers TDB [-200, 200] s around J2000
// (2000-01-01T12:00 TT, 64.184 s before 12:00 UTC's TDB, so noon UTC is inside).
const inside = Date.UTC(2000, 0, 1, 11, 59, 0);
const outside = Date.UTC(2026, 3, 6, 23);

const analytic = (ms: number) => {
  const m = icrfToFixed(ms);
  const p = moonPosition(ms);
  const a = moonAxes(ms);
  const fixed = new Float64Array(3);
  const axes = new Float64Array(6);
  for (let i = 0; i < 3; i++) {
    fixed[i] =
      m[i * 3]! * p[0]! + m[i * 3 + 1]! * p[1]! + m[i * 3 + 2]! * p[2]!;
    for (let k = 0; k < 6; k += 3) {
      axes[k + i] =
        m[i * 3]! * a[k]! +
        m[i * 3 + 1]! * a[k + 1]! +
        m[i * 3 + 2]! * a[k + 2]!;
    }
  }
  return { m, sun: sunDirection(ms, new Float64Array(3)), fixed, axes };
};

describe("skyState", () => {
  it("without data is the analytic models, bit for bit", () => {
    const out = skyState(outside, undefined, createSkyState());
    const a = analytic(outside);
    expect(out.source).toBe("analytic");
    expect([...out.icrfToFixed]).toEqual([...a.m]);
    expect([...out.sunDirection]).toEqual([...a.sun]);
    expect([...out.moonPosition]).toEqual([...a.fixed]);
    expect([...out.moonAxes]).toEqual([...a.axes]);
  });

  it("with data inside the span reads the ephemeris and agrees with the frame tree", () => {
    const data = syntheticFrameData();
    const out = skyState(inside, data, createSkyState());
    expect(out.source).toBe("ephemeris");
    expect(Math.hypot(...out.sunDirection)).toBeCloseTo(1, 14);
    const frames = createFrames(data);
    const t = Instant.fromUtc(inside, data.leapSeconds);
    // The Sun's place seen from the Earth, in the Newtonian EARTH_ICRF (the
    // ephemeris's own differences, as skyState reads them), turned by the
    // same matrix. skyState does not apply the TT scaling of gcrf.
    const sunIn = frameTransform(frames.hcrs, frames.earthIcrf, t);
    const r = celestialToTerrestrial(
      t,
      data.eop.atInstant(t, data.leapSeconds),
    );
    const sun = [0, 1, 2].map(
      (i) =>
        r[i * 3]! * sunIn[12]! +
        r[i * 3 + 1]! * sunIn[13]! +
        r[i * 3 + 2]! * sunIn[14]!,
    );
    const d = Math.hypot(sun[0]!, sun[1]!, sun[2]!);
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(out.sunDirection[i]! - sun[i]! / d)).toBeLessThan(1e-12);
    }
    // The Moon is the ephemeris's, turned by the same matrix.
    const p = data.ephemeris.moonFromEarth(t);
    const me = data.ephemeris.moonMeanEarth(t);
    const row = (i: number, v: ArrayLike<number>, o: number) =>
      r[i * 3]! * v[o]! + r[i * 3 + 1]! * v[o + 1]! + r[i * 3 + 2]! * v[o + 2]!;
    for (let i = 0; i < 3; i++) {
      expect(out.moonPosition[i]).toBeCloseTo(row(i, p, 0), 3);
      expect(out.moonAxes[i]).toBeCloseTo(row(i, me, 0), 12);
      expect(out.moonAxes[3 + i]).toBeCloseTo(row(i, me, 6), 12);
    }
  });

  it("with data and an instant outside the span falls back without throwing", () => {
    const data = syntheticFrameData();
    const out = skyState(outside, data, createSkyState());
    const a = analytic(outside);
    expect(out.source).toBe("analytic");
    expect([...out.icrfToFixed]).toEqual([...a.m]);
    expect([...out.sunDirection]).toEqual([...a.sun]);
    expect([...out.moonPosition]).toEqual([...a.fixed]);
    expect([...out.moonAxes]).toEqual([...a.axes]);
  });

  it("icrfToFixed is the analytic model; skyState answers from data", () => {
    const data = syntheticFrameData();
    const precise = skyState(inside, data, createSkyState());
    const model = skyState(inside, undefined, createSkyState());
    expect(precise.source).toBe("ephemeris");
    expect([...icrfToFixed(inside)]).toEqual([...model.icrfToFixed]);
    expect([...icrfToFixed(inside)]).not.toEqual([...precise.icrfToFixed]);
  });
});
