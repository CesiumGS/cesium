import { describe, expect, it } from "vitest";
import Cartesian3 from "cesium-oracle/Cartesian3.js";
import Cartographic from "cesium-oracle/Cartographic.js";
import OracleEllipsoid from "cesium-oracle/Ellipsoid.js";
import FixedFrameTransforms from "cesium-oracle/FixedFrameTransforms.js";
import Matrix4 from "cesium-oracle/Matrix4.js";
import PerspectiveFrustum from "cesium-oracle/PerspectiveFrustum.js";
import { Ellipsoid, cartographic } from "../src/math/ellipsoid.ts";
import { eastNorthUpToFixedFrame, splitVec3 } from "../src/math/transforms.ts";
import * as v3 from "../src/math/vec3.ts";
import * as m4 from "../src/math/mat4.ts";
import { Camera } from "../src/scene/Camera.ts";

// L0 parity: 2.0 geodesy must match 1.x to near machine precision.
const REL = 1e-12;

function expectClose(actual: number, expected: number, rel = REL) {
  const tolerance = rel * Math.max(1, Math.abs(expected));
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

// Deterministic sample of positions, including poles, the antimeridian,
// below-surface heights and orbit altitudes.
function samples(): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [
    [0, Math.PI / 2, 0],
    [0, -Math.PI / 2, 100],
    [Math.PI, 0, 0],
    [-Math.PI, 0.3, -400],
    [-1.3194, 0.6988, 1e7],
  ];
  let seed = 12345;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  for (let i = 0; i < 200; i++) {
    out.push([
      (rand() * 2 - 1) * Math.PI,
      (rand() * 2 - 1) * (Math.PI / 2),
      rand() * 2e4 - 1e3,
    ]);
  }
  return out;
}

describe("L0 geodesy parity with CesiumJS 1.x", () => {
  const ours = Ellipsoid.WGS84;
  const theirs = OracleEllipsoid.WGS84;

  it("cartographicToCartesian", () => {
    const out = v3.vec3();
    for (const [lon, lat, h] of samples()) {
      ours.cartographicToCartesian(cartographic(lon, lat, h), out);
      const expected = theirs.cartographicToCartesian(
        new Cartographic(lon, lat, h),
      );
      expectClose(out[0]!, expected.x);
      expectClose(out[1]!, expected.y);
      expectClose(out[2]!, expected.z);
    }
  });

  it("cartesianToCartographic", () => {
    const p = v3.vec3();
    const result = cartographic();
    for (const [lon, lat, h] of samples()) {
      const c = theirs.cartographicToCartesian(new Cartographic(lon, lat, h));
      v3.set(p, c.x, c.y, c.z);
      const expected = theirs.cartesianToCartographic(c);
      ours.cartesianToCartographic(p, result);
      expectClose(result.longitude, expected.longitude);
      expectClose(result.latitude, expected.latitude);
      expect(Math.abs(result.height - expected.height)).toBeLessThan(1e-6);
    }
  });

  it("eastNorthUpToFixedFrame, including poles and the center", () => {
    const origin = v3.vec3();
    const out = m4.mat4();
    const points = samples().map(([lon, lat, h]) =>
      theirs.cartographicToCartesian(new Cartographic(lon, lat, h)),
    );
    points.push(
      new Cartesian3(0, 0, 0),
      new Cartesian3(0, 0, 6356752.0),
      new Cartesian3(0, 0, -6356752.0),
    );
    for (const c of points) {
      v3.set(origin, c.x, c.y, c.z);
      eastNorthUpToFixedFrame(origin, ours, out);
      const expected = FixedFrameTransforms.eastNorthUpToFixedFrame(
        c,
        theirs,
        new Matrix4(),
      );
      for (let i = 0; i < 16; i++) {
        expectClose(out[i]!, expected[i]);
      }
    }
  });
});

describe("L0 camera projection parity with CesiumJS 1.x", () => {
  it("vertical field of view and x/y projection terms match PerspectiveFrustum", () => {
    const camera = new Camera();
    const proj = m4.mat4();
    for (const aspect of [0.5, 1, 1.7778, 3]) {
      for (const fov of [0.3, Math.PI / 3, 1.5]) {
        camera.fov = fov;
        const frustum = new PerspectiveFrustum({
          fov,
          aspectRatio: aspect,
          near: 1,
          far: 1e8,
        });
        expectClose(camera.fovy(aspect), frustum.fovy);
        camera.projection(proj, aspect);
        const expected = frustum.projectionMatrix;
        expectClose(proj[0]!, expected[0]);
        expectClose(proj[5]!, expected[5]);
      }
    }
  });

  it("reverse-Z maps near to depth 1 and recedes toward 0", () => {
    const camera = new Camera();
    camera.near = 0.5;
    const proj = camera.projection(m4.mat4(), 1.5);
    const clip = new Float64Array(4);
    const depthAt = (distance: number) => {
      m4.transformVec4(clip, proj, 0, 0, -distance, 1);
      return clip[2]! / clip[3]!;
    };
    expectClose(depthAt(0.5), 1);
    expect(depthAt(1e7)).toBeGreaterThan(0);
    expect(depthAt(1e7)).toBeLessThan(depthAt(1e3));
  });
});

describe("hi/lo split", () => {
  it("recovers camera-relative offsets to sub-millimeter precision at planetary scale", () => {
    const hiA = new Float32Array(3),
      loA = new Float32Array(3);
    const hiB = new Float32Array(3),
      loB = new Float32Array(3);
    const a = v3.vec3(),
      b = v3.vec3();
    const surface = OracleEllipsoid.WGS84.cartographicToCartesian(
      Cartographic.fromDegrees(-75.6, 40.04, 120),
    );
    v3.set(a, surface.x, surface.y, surface.z);
    for (const offset of [0.001, 0.37, 12.5, 1234.5678]) {
      v3.set(b, a[0]! + offset, a[1]! - offset, a[2]! + offset / 2);
      splitVec3(a, hiA, 0, loA, 0);
      splitVec3(b, hiB, 0, loB, 0);
      for (let i = 0; i < 3; i++) {
        // Emulate the GPU: every operation rounds to float32.
        const f = Math.fround;
        const relative = f(f(hiA[i]! - hiB[i]!) + f(loA[i]! - loB[i]!));
        expect(Math.abs(relative - (a[i]! - b[i]!))).toBeLessThan(1e-4);
      }
    }
  });
});
