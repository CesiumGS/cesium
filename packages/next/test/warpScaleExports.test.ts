// The scale-aware warp functions an application can call (`@cesium/next/frames`):
// `warpForward`, `warpInverse`, `routeForward` and `routeInverse` take a warp's
// live `scale` into account, where a warp's own `inverse` is the inverse at
// scale 1.
import { describe, expect, it } from "vitest";
import {
  routeForward,
  routeInverse,
  scaleAbout,
  verticalExaggeration,
  warpForward,
  warpFrame,
  warpFromFunction,
  warpInverse,
  createFrameCatalog,
  type Route,
  type Warp,
} from "../src/frames/index.ts";
import { warpScaleOf } from "../src/camera/route.ts";
import { liveWarp } from "../src/frames/warps.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";

const WGS84 = Ellipsoid.WGS84;
const at = (longitude: number, latitude: number, height: number) =>
  WGS84.cartographicToCartesian(
    { longitude, latitude, height },
    new Float64Array(3),
  );
const height = (p: ArrayLike<number>) =>
  WGS84.cartesianToCartographic(Float64Array.of(p[0]!, p[1]!, p[2]!), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!.height;
const apart = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** The warp frame of a ×10 exaggeration at the scale the box holds. */
function exaggeration(scale: { value: number }): Warp {
  const catalog = createFrameCatalog();
  return warpFrame(
    "exaggerated",
    catalog.get("ITRF"),
    verticalExaggeration({ factor: 10, scale }),
  ).warp;
}

describe("the public warp functions", () => {
  it("invert a warp at the scale it has now, where the warp's own inverse is at scale 1", () => {
    const scale = { value: 1 };
    const warp = exaggeration(scale);
    const p = at(0.13, 0.8, 2500);
    for (const s of [1, 0.75, 0.3, 0]) {
      scale.value = s;
      const k = 1 + 9 * s;
      const q = warpForward(warp, p, new Float64Array(3));
      expect(height(q)).toBeCloseTo(2500 * k, 5);
      expect(apart(warpInverse(warp, q), p)).toBeLessThan(1e-6);
      expect(warpScaleOf(warp)).toBe(s);
      if (s !== 1) {
        // The warp's own inverse undoes the ×10, not the ×k.
        expect(apart(warp.inverse!(q, new Float64Array(3)), p)).toBeGreaterThan(
          100,
        );
      }
    }
  });

  it("carry a route's points forward and back, each warp at its scale now", () => {
    const scale = { value: 0.5 };
    const warp = exaggeration(scale);
    const shift = new Float64Array(16);
    shift.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, -200, 300, 1]);
    const route: Route = {
      frame: warp.from,
      base: warp.to,
      seconds: 0,
      steps: [
        { kind: "rigid", matrix: shift },
        { kind: "warp", warp, inverse: false },
      ],
      presentation: true,
      revision: 1,
    };
    const p = at(0.1, 0.7, 1200);
    for (const s of [0.5, 1, 0.1]) {
      scale.value = s;
      const q = routeForward(route, p);
      const expected = warpForward(
        warp,
        [p[0]! + 100, p[1]! - 200, p[2]! + 300],
        new Float64Array(3),
      );
      expect(apart(q, expected)).toBeLessThan(1e-9);
      expect(apart(routeInverse(route, q), p)).toBeLessThan(1e-6);
    }
    // A step taken backwards is the other way: forward undoes the warp.
    const back: Route = {
      ...route,
      steps: [{ kind: "warp", warp, inverse: true }],
    };
    scale.value = 0.4;
    const drawn = warpForward(warp, p, new Float64Array(3));
    expect(apart(routeForward(back, drawn), p)).toBeLessThan(1e-6);
    expect(apart(routeInverse(back, p), drawn)).toBeLessThan(1e-9);
  });

  it("honour the scale of a warp from a function and of a scale about a point, with their exact inverses", () => {
    const state = { value: 0.6 };
    const scaled = scaleAbout(at(0, 0, 0), [1, 1, 3], { scale: state });
    const lifted = warpFromFunction(
      (p, out) => {
        out[0] = p[0]!;
        out[1] = p[1]!;
        out[2] = p[2]! + 50_000 * Math.sin(p[0]! / 1e6);
      },
      { presentation: true, scale: state },
    );
    for (const spec of [scaled, lifted]) {
      const warp = liveWarp(spec);
      const p = at(0.3, 0.2, 10);
      for (const s of [0.6, 1, 0.25]) {
        state.value = s;
        const q = warpForward(warp, p, new Float64Array(3));
        expect(apart(q, p)).toBeGreaterThan(1);
        expect(apart(warpInverse(warp, q), p)).toBeLessThan(1e-5);
      }
    }
  });
});
