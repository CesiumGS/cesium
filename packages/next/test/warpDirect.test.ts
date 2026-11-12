// Closed-form warps evaluated straight per vertex from baked polynomials
// (scene/warpDirect.ts): the float32 bake against float64 truth, and bounds.
import { describe, expect, it } from "vitest";
import { Ellipsoid, cartographic } from "../src/math/ellipsoid.ts";
import {
  WGS84_RADII,
  formForward,
  type GpuWarpForm,
} from "../src/scene/warpForms.ts";
import {
  DIRECT_DRAW_ROWS,
  bakeHeightField,
  directDisplacement,
  liftBoundOver,
  scaleAboutBoundOver,
} from "../src/scene/warpDirect.ts";

function ecef(lonDeg: number, latDeg: number, h: number): Float64Array {
  return Ellipsoid.WGS84.cartographicToCartesian(
    cartographic((lonDeg * Math.PI) / 180, (latDeg * Math.PI) / 180, h),
    new Float64Array(3),
  );
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Worst |direct - float64 truth| in mm over random points of the tile's sphere. */
function worst(form: GpuWarpForm, origin: Float64Array, scale: number): number {
  const rows = new Float32Array(DIRECT_DRAW_ROWS * 4);
  bakeHeightField(WGS84_RADII, origin, [0, 0, 0], scale, rows);
  const next = rng(7);
  const m = new Float64Array(3);
  const p = new Float64Array(3);
  const q = new Float64Array(3);
  const got = new Float64Array(3);
  let worstMm = 0;
  for (let i = 0; i < 400; i++) {
    for (let a = 0; a < 3; a++) {
      m[a] = (next() * 2 - 1) * scale * 0.57;
      p[a] = origin[a]! + m[a]!;
    }
    formForward(form, p, q);
    directDisplacement(rows, 0, form, m, got);
    for (let a = 0; a < 3; a++) {
      worstMm = Math.max(worstMm, Math.abs(got[a]! - (q[a]! - p[a]!)) * 1000);
    }
  }
  return worstMm;
}

describe("direct evaluation of closed-form warps", () => {
  const origin = ecef(3.2, 44, 800);

  it("a height lift is exact to a bake's truncation", () => {
    const lift: GpuWarpForm = {
      kind: "heightLift",
      factor: 10,
      baseHeight: 100,
      offset: 3,
    };
    // A float32 normal is good to 6e-8 of a 7 km lift: about half a millimeter.`n    expect(worst(lift, origin, 2000)).toBeLessThan(1);
    expect(worst(lift, origin, 8000)).toBeLessThan(3);
  });

  it("a bump and a scale about a point need no refit", () => {
    const bump: GpuWarpForm = {
      kind: "heightBump",
      center: ecef(3.2, 44.005, 0),
      amplitude: 300,
      sigma: 900,
    };
    expect(worst(bump, origin, 2000)).toBeLessThan(0.5);
    const scale: GpuWarpForm = {
      kind: "scaleAbout",
      center: ecef(3.19, 44, 0),
      factors: [1.5, 0.5, 2],
    };
    expect(worst(scale, origin, 2000)).toBeLessThan(0.5);
  });

  it("reports its own truncation", () => {
    const report = bakeHeightField(
      WGS84_RADII,
      origin,
      [0, 0, 0],
      5000,
      undefined,
      0,
      true,
    )!;
    expect(report.heightError).toBeLessThan(1e-3);
    expect(report.normalError).toBeLessThan(1e-7);
  });

  it("a lift's bound holds over the whole animation", () => {
    const bound = liftBoundOver([-50, 400], {
      factor: [1, 12],
      baseHeight: [0, 100],
      offset: [-20, 20],
    });
    const next = rng(3);
    let largest = 0;
    for (let i = 0; i < 2000; i++) {
      const h = -50 + next() * 450;
      const k = 1 + next() * 11;
      const b = next() * 100;
      const o = -20 + next() * 40;
      largest = Math.max(largest, Math.abs((k - 1) * (h - b) + o));
    }
    expect(bound).toBeGreaterThanOrEqual(largest);
    expect(bound).toBeLessThan(largest * 1.2);
  });

  it("a scale-about bound holds for a point anywhere in its region", () => {
    const tile = ecef(3.2, 44, 0);
    const region = { center: ecef(3.25, 44.02, 0), radius: 5000 };
    const bound = scaleAboutBoundOver(tile, 3000, region, [0.5, 2]);
    const next = rng(11);
    let largest = 0;
    for (let i = 0; i < 500; i++) {
      const c = [0, 1, 2].map(
        (a) => region.center[a]! + (next() * 2 - 1) * region.radius * 0.57,
      );
      const m = [0, 1, 2].map((a) => tile[a]! + (next() * 2 - 1) * 3000 * 0.57);
      const s = 0.5 + next() * 1.5;
      const d = Math.hypot(...[0, 1, 2].map((a) => (s - 1) * (m[a]! - c[a]!)));
      largest = Math.max(largest, d);
    }
    expect(bound).toBeGreaterThanOrEqual(largest);
  });
});
