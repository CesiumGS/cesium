import { describe, expect, it } from "vitest";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import { frameTransform } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { frameBias } from "../src/time/erfa/bias.ts";
import { Instant } from "../src/time/Instant.ts";
import bias from "./fixtures/frames/bias.json";
import { syntheticFrameData } from "./syntheticFrames.ts";

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
    ["hcrs", "sun"],
    ["moonIcrf", "moon"],
  ] as const)("%s sits at the ephemeris's %s", (name, body) => {
    const state = data.ephemeris[body](t);
    expect(
      maxDiff(originIn(frames[name], frames.icrf), state.subarray(0, 3)),
    ).toBeLessThan(1e-4);
  });

  it("EME2000 to GCRF is the transpose of the frame bias", () => {
    const m = frameTransform(frames.eme2000, frames.gcrf, t);
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
