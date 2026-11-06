import { describe, expect, it } from "vitest";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import type { Ephemeris } from "../src/ephemeris/Ephemeris.ts";
import { C, GM_MOON, GM_SUN, L_C } from "../src/measure/constants.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import { frameTransform } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { frameBias } from "../src/time/erfa/bias.ts";
import { Instant } from "../src/time/Instant.ts";
import bias from "./fixtures/frames/bias.json";
import { SAMPLE, syntheticFrameData } from "./syntheticFrames.ts";

const data = syntheticFrameData();
const frames = createFrames(data);
const t = Instant.fromTdb(37.5);

const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
};

/** The origin of `from` in `to`: the translation of the transform. */
const originIn = (
  from: Parameters<typeof frameTransform>[0],
  to: Parameters<typeof frameTransform>[1],
): number[] => Array.from(frameTransform(from, to, t).subarray(12, 15));

/** The 3x3 rotation of a column-major Mat4, row-major. */
const rotationOf = (m: ArrayLike<number>): number[] => {
  const r: number[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      r.push(m[col * 4 + row]!);
    }
  }
  return r;
};

describe("frameBias", () => {
  it("matches pyerfa's bp06 rb element-wise to 1e-15", () => {
    expect(maxDiff(frameBias(), bias.rb)).toBeLessThan(1e-15);
  });

  it("is orthonormal: B Bᵀ = I to 1e-15", () => {
    const b = frameBias();
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const product: number[] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let w = 0;
        for (let k = 0; k < 3; k++) {
          w += b[3 * i + k]! * b[3 * j + k]!;
        }
        product.push(w);
      }
    }
    expect(maxDiff(product, identity)).toBeLessThan(1e-15);
  });

  it("writes into `out`", () => {
    const out = new Float64Array(9);
    expect(frameBias(out)).toBe(out);
  });
});

describe("the frame tree", () => {
  it.each([
    ["gcrf", "earth"],
    ["earthIcrf", "earth"],
    ["hcrs", "sun"],
    ["moonIcrf", "moon"],
  ] as const)("%s sits at the ephemeris's %s", (name, body) => {
    const state = data.ephemeris[body](t);
    expect(
      maxDiff(originIn(frames[name], frames.icrf), state.subarray(0, 3)),
    ).toBeLessThan(1e-4);
  });

  it("EME2000 to EARTH_ICRF is the transpose of the frame bias", () => {
    const m = frameTransform(frames.eme2000, frames.earthIcrf, t);
    const b = frameBias();
    const transpose = [
      b[0]!, b[3]!, b[6]!,
      b[1]!, b[4]!, b[7]!,
      b[2]!, b[5]!, b[8]!,
    ]; // prettier-ignore
    expect(maxDiff(rotationOf(m), transpose)).toBeLessThan(1e-15);
    expect(maxDiff(Array.from(m.subarray(12, 15)), [0, 0, 0])).toBe(0);
  });

  it("names the fixed frame of a body", () => {
    expect(frames.bodyFixed(EARTH)).toBe(frames.itrf);
    expect(frames.bodyFixed(MOON)).toBe(frames.moonMe);
  });

  it("throws, naming the body, for one without a fixed frame", () => {
    expect(() =>
      frames.bodyFixed({ name: "Mars", ellipsoid: Ellipsoid.WGS84 }),
    ).toThrow(/Mars/);
  });

  it("MOON is a 1,737,400 m sphere with NAIF id 301 and no atmosphere", () => {
    expect(MOON.naifId).toBe(301);
    expect(EARTH.naifId).toBe(399);
    expect(Array.from(Ellipsoid.MOON.radii)).toEqual([
      1_737_400, 1_737_400, 1_737_400,
    ]);
    expect(MOON.atmosphere).toBeUndefined();
  });

  it("exposes the data it was built from", () => {
    expect(frames.data).toBe(data);
  });

  it("throws with the span for an instant outside the packs", () => {
    const outside = Instant.fromTdb(1e6);
    expect(() => frameTransform(frames.itrf, frames.icrf, outside)).toThrow(
      /outside the loaded span/,
    );
  });
});

describe("the ITRF edge past the EOP table's predictions", () => {
  const degraded = createFrames(
    syntheticFrameData({ ...SAMPLE, predicted: true, degraded: true }),
  );
  const predicted = createFrames(
    syntheticFrameData({ ...SAMPLE, predicted: true, degraded: false }),
  );

  it("throws, naming the table's span and how to refresh it", () => {
    expect(() => frameTransform(degraded.itrf, degraded.gcrf, t)).toThrow(
      /EOP table covers 2000-01-01T00:00:00\.000Z to 2030-01-01T00:00:00\.000Z.*newer EOP data/,
    );
  });

  it("leaves the rest of the GCRF subtree alone", () => {
    expect(() =>
      frameTransform(degraded.eme2000, degraded.gcrf, t),
    ).not.toThrow();
  });

  it("allows predicted samples that are not degraded", () => {
    expect(() =>
      frameTransform(predicted.itrf, predicted.gcrf, t),
    ).not.toThrow();
  });
});

/** The linear part of a column-major Mat4 applied to `r`, the translation dropped. */
const applyLinear = (m: ArrayLike<number>, r: number[]): number[] =>
  [0, 1, 2].map(
    (row) => m[row]! * r[0]! + m[4 + row]! * r[1]! + m[8 + row]! * r[2]!,
  );
const norm = (v: number[]): number => Math.hypot(v[0]!, v[1]!, v[2]!);
const unit = (v: number[]): number[] => v.map((x) => x / norm(v));

/** Eq. 11.19's scale and V for `ephemeris` at `instant`, computed independently. */
const eq1119 = (ephemeris: Ephemeris, instant: Instant) => {
  const e = ephemeris.earth(instant);
  const s = ephemeris.sun(instant);
  const mo = ephemeris.moon(instant);
  const u =
    GM_SUN / Math.hypot(e[0]! - s[0]!, e[1]! - s[1]!, e[2]! - s[2]!) +
    GM_MOON / Math.hypot(e[0]! - mo[0]!, e[1]! - mo[1]!, e[2]! - mo[2]!);
  return {
    earth: [e[0]!, e[1]!, e[2]!],
    v: [e[3]!, e[4]!, e[5]!],
    scale: 1 - u / (C * C) - L_C,
  };
};

/**
 * A realistic ephemeris: Sun at 1 AU, Earth at 29.78 km/s, Moon at the
 * Moon's distance. The synthetic packs put the Earth 123 m from the Sun, so
 * U/c² is about 12 there and the terms below vanish in rounding.
 */
const state =
  (...values: number[]) =>
  (_instant: Instant, out: Float64Array = new Float64Array(6)) => {
    out.set(values);
    return out;
  };
const realistic = {
  sun: state(0, 0, 0, 0, 0, 0),
  earth: state(1.496e11, 0, 0, 1000, 29_780 * Math.cos(0.4), 29_780),
  moon: state(1.496e11 + 3.844e8, 0, 0, 0, 0, 0),
} as unknown as Ephemeris;
const realFrames = createFrames({ ...data, ephemeris: realistic });
const real = eq1119(realistic, t);
// Float64 spacing at 4e8 m is 6e-8 m, so 1e-9 m is not representable there.
const REAL_TOLERANCE = 1e-7;

describe("the relativistic Earth link (IERS eq. 11.19)", () => {
  it("EARTH_ICRF to ICRF is a pure translation by the Earth's position", () => {
    const m = frameTransform(frames.earthIcrf, frames.icrf, t);
    expect(rotationOf(m)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(
      maxDiff(Array.from(m.subarray(12, 15)), data.ephemeris.earth(t)),
    ).toBeLessThan(1e-4);
  });

  it("shortens a vector perpendicular to V by (U/c² + L_C)·r, on the synthetic ephemeris", () => {
    const { v, scale } = eq1119(data.ephemeris, t);
    const perp = unit([v[1]!, -v[0]!, 0]).map((x) => x * 3.844e8);
    const image = applyLinear(
      frameTransform(frames.gcrf, frames.icrf, t),
      perp,
    );
    const expected = perp.map((x) => x * scale);
    // The synthetic U/c² is about 12, so the image is 5e9 m and the float64
    // spacing there, not 1e-9 m, bounds the comparison.
    expect(maxDiff(image, expected)).toBeLessThan(1e-14 * norm(expected));
  });

  it("shortens a vector perpendicular to V by (U/c² + L_C)·r at the real scale", () => {
    const perp = unit([real.v[1]!, -real.v[0]!, 0]).map((x) => x * 3.844e8);
    const image = applyLinear(
      frameTransform(realFrames.gcrf, realFrames.icrf, t),
      perp,
    );
    expect(norm(perp) - norm(image)).toBeGreaterThan(8);
    expect(norm(perp) - norm(image)).toBeLessThan(12);
    expect(
      maxDiff(
        image,
        perp.map((x) => x * real.scale),
      ),
    ).toBeLessThan(REAL_TOLERANCE);
  });

  it("adds ½|V|²r/c² along V", () => {
    const along = unit(real.v).map((x) => x * 3.844e8);
    const image = applyLinear(
      frameTransform(realFrames.gcrf, realFrames.icrf, t),
      along,
    );
    const lorentz = (0.5 * norm(real.v) ** 2 * 3.844e8) / (C * C);
    expect(lorentz).toBeGreaterThan(1);
    const expected = along.map((x) => x * real.scale - (x / 3.844e8) * lorentz);
    expect(maxDiff(image, expected)).toBeLessThan(REAL_TOLERANCE);
  });

  it("keeps the translation at the Earth", () => {
    const m = frameTransform(realFrames.gcrf, realFrames.icrf, t);
    expect(maxDiff(Array.from(m.subarray(12, 15)), real.earth)).toBe(0);
  });

  it("inverts through the general affine inverse at 4e8 m", () => {
    for (const f of [frames, realFrames]) {
      const there = frameTransform(f.gcrf, f.earthIcrf, t);
      const back = frameTransform(f.earthIcrf, f.gcrf, t);
      const r = [4e8, -1e8, 2.5e8];
      const roundTrip = applyLinear(back, applyLinear(there, r));
      const tolerance = f === frames ? 1e-14 * 4e8 * 12 : REAL_TOLERANCE;
      expect(maxDiff(roundTrip, r)).toBeLessThan(tolerance);
    }
  });
});

describe("bodyOf", () => {
  it("names the body whose fixed frame a frame is or descends from", () => {
    expect(frames.bodyOf(frames.itrf)).toBe(EARTH);
    expect(frames.bodyOf(frames.moonMe)).toBe(MOON);
    expect(frames.bodyOf(frames.moonPa)).toBe(MOON);
    expect(frames.bodyOf(frames.icrf)).toBeUndefined();
    expect(frames.bodyOf(frames.gcrf)).toBeUndefined();
    expect(frames.bodyOf(frames.earthIcrf)).toBeUndefined();
  });
});
