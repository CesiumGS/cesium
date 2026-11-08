// The measure tool's lines on the globe stand just over what they mark: a
// 1 px line in the plane of a surface fights it for depth (owner's
// "z-fighting", 2026-11-08). CPU only (fakeGpu).
import { describe, expect, it, vi } from "vitest";
import {
  LINE_LIFT,
  MeasureOverlay,
} from "../examples/design-globe/measureOverlay.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { fakeEngine } from "./fakeGpu.ts";

describe("a measure line", () => {
  it("stands LINE_LIFT over its ends, in both placements", async () => {
    const engine = await fakeEngine();
    const world = engine.createWorld();
    const addMesh = vi.spyOn(world, "addMesh");
    const a = Ellipsoid.WGS84.cartographicToCartesian(
      { longitude: -2.1, latitude: 0.66, height: 100 },
      new Float64Array(3),
    );
    const b = Float64Array.from(a, (v, k) => v + [50, 0, 0][k]!);
    const up = new Float64Array(3);
    Ellipsoid.WGS84.geodeticSurfaceNormal(a, up);
    const end = (p: Float64Array) => ({ rigid: p, reprojected: p });
    const overlay = new MeasureOverlay(world);
    overlay.set([
      {
        key: "user",
        segments: [{ a: end(a), b: end(b) }],
        color: "#fde047",
        ghost: false,
      },
    ]);
    const mesh = addMesh.mock.calls[0]![0];
    // Relative to its origin, the first end: straight up by the lift.
    for (let k = 0; k < 3; k++) {
      expect(mesh.positions[k]).toBeCloseTo(up[k]! * LINE_LIFT, 5);
    }
    const partner = Object.values(mesh.attributes!)[0]!.data;
    for (let k = 0; k < 3; k++) {
      expect(partner[k]).toBeCloseTo(up[k]! * LINE_LIFT, 5);
    }
  });
});
