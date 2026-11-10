// The distance-field adapter of the geometry query interface (brep 3, Task 4):
// a unit sphere as a signed distance, box ±1.
import { describe, expect, it } from "vitest";
import { sdfGeometry, type DistanceField } from "../src/geometry/sdf.ts";

const sphere: DistanceField = {
  distance: (x, y, z) => Math.hypot(x, y, z) - 1,
  min: [-1, -1, -1],
  max: [1, 1, 1],
};
const g = sdfGeometry(sphere);

describe("sdfGeometry", () => {
  it("is an f-rep with one face", () => {
    expect(g.kind).toBe("frep");
    expect(g.version).toBe(0);
    expect(g.entity({ kind: "face", index: 0 })).toEqual({
      ref: { kind: "face", index: 0 },
      points: [],
      faces: [{ kind: "face", index: 0 }],
    });
    expect(g.entity({ kind: "face", index: 1 })).toBeUndefined();
    expect(g.entity({ kind: "edge", index: 0 })).toBeUndefined();
  });

  it("hits a ray through the sphere, with the normal facing the start", () => {
    const a = g.rayHit({ from: [-3, 0, 0], to: [3, 0, 0] });
    expect(a.verdict).toBe("hit");
    if (a.verdict !== "hit") {
      return;
    }
    expect(Math.abs(a.hit.t - 1 / 3)).toBeLessThan(2e-4);
    expect(a.hit.normal[0]).toBeCloseTo(-1, 3);
    expect(Math.abs(a.hit.normal[1]!)).toBeLessThan(1e-3);
    expect(a.hit.entity).toEqual({ kind: "face", index: 0 });
    expect(a.hit.accuracy.exact).toBe(false);
    expect(a.hit.accuracy.meters).toBeCloseTo(1e-4, 12);
  });

  it("misses a ray beside the box, and a zero-length ray outside", () => {
    expect(g.rayHit({ from: [-3, 2, 0], to: [3, 2, 0] }).verdict).toBe("miss");
    expect(g.rayHit({ from: [5, 0, 0], to: [5, 0, 0] }).verdict).toBe("miss");
  });

  it("hits at t = 0 when the start is inside", () => {
    const a = g.rayHit({ from: [0, 0, 0], to: [3, 0, 0] });
    expect(a.verdict).toBe("hit");
    if (a.verdict === "hit") {
      expect(a.hit.t).toBe(0);
    }
  });

  it("answers a zero-length ray inside as a hit at tMin", () => {
    const a = g.rayHit({ from: [0, 0, 0], to: [0, 0, 0] }, { tMin: 0 });
    expect(a.verdict).toBe("hit");
  });

  it("settles a tangent ray, and runs out of steps when given few", () => {
    const t = g.rayHit({ from: [-3, 1, 0], to: [3, 1, 0] });
    expect(t.verdict).not.toBe("unknown");
    const g2 = sdfGeometry(sphere, { maxSteps: 2 });
    const u = g2.rayHit({ from: [-3, 0.9, 0], to: [3, 0.9, 0] });
    expect(u.verdict).toBe("unknown");
    if (u.verdict === "unknown") {
      expect(u.reason).toBe("notConverged");
    }
  });

  it("finds the closest point", () => {
    const c = g.closestPoint([0, 3, 0]);
    expect(c).toBeDefined();
    expect(Math.abs(c!.position[0]!)).toBeLessThan(1e-6);
    expect(Math.abs(c!.position[1]! - 1)).toBeLessThan(1e-6);
    expect(Math.abs(c!.distance - 2)).toBeLessThan(1e-6);
    expect(c!.entity).toEqual({ kind: "face", index: 0 });
    expect(g.closestPoint([0, 3, 0], { kinds: ["vertex"] })).toBeUndefined();
    expect(g.closestPoint([0, 3, 0], { maxDistance: 1 })).toBeUndefined();
  });

  it("says so when the closest point has not converged", () => {
    // A field that shrinks its own steps: distance is only half the truth.
    const slow = sdfGeometry({
      ...sphere,
      distance: (x, y, z) => (Math.hypot(x, y, z) - 1) / 2,
    });
    const c = slow.closestPoint([0, 100, 0]);
    expect(c).toBeDefined();
    expect(c!.accuracy.meters).toBeGreaterThan(1e-4);
    expect(c!.accuracy.note).toMatch(/not converged/);
  });

  it("measures a segment's distance, sampled", () => {
    const s = g.segmentDistance([-3, 2, 0], [3, 2, 0]);
    expect(s.distance).toBeGreaterThanOrEqual(1);
    expect(s.distance).toBeLessThanOrEqual(1 + 1e-3);
    expect(s.accuracy.note).toMatch(/sampled/);
  });

  it("draws only on the GPU, and gives its box", () => {
    expect(g.display(0.1)).toBeUndefined();
    const b = g.bounds();
    expect(Array.from(b.min)).toEqual([-1, -1, -1]);
    expect(Array.from(b.max)).toEqual([1, 1, 1]);
  });

  it("reports the unsampled rest when segmentDistance runs out of steps", () => {
    const plane: DistanceField = {
      distance: (_x, _y, z) => z,
      min: [-1e6, -1e6, -1e6],
      max: [1e6, 1e6, 1e6],
    };
    const p = sdfGeometry(plane, { maxSteps: 3 });
    const s = p.segmentDistance([0, 0, 0.01], [100000, 0, 0.01]);
    expect(s.accuracy.meters).toBeGreaterThanOrEqual(s.distance);
    expect(s.accuracy.note).toMatch(/steps/);
  });

  it("gives undefined for a NaN field in closestPoint", () => {
    const nan = sdfGeometry({
      distance: () => NaN,
      min: [-1, -1, -1],
      max: [1, 1, 1],
    });
    expect(nan.closestPoint([0, 3, 0])).toBeUndefined();
  });

  it("reports no finite distance for a NaN field in segmentDistance", () => {
    const nan = sdfGeometry({
      distance: () => NaN,
      min: [-1, -1, -1],
      max: [1, 1, 1],
    });
    const s = nan.segmentDistance([0, 0, 0], [1, 0, 0]);
    expect(Number.isNaN(s.distance)).toBe(true);
    expect(s.accuracy.meters).toBe(Infinity);
    expect(s.accuracy.exact).toBe(false);
    expect(s.accuracy.note).toMatch(/no finite distance/);
  });

  it("widens the hit accuracy for a ray starting inside", () => {
    const a = g.rayHit({ from: [0, 0, 0], to: [3, 0, 0] });
    expect(a.verdict).toBe("hit");
    if (a.verdict === "hit") {
      expect(a.hit.accuracy.meters).toBeGreaterThanOrEqual(1);
    }
  });

  it("rejects bad epsilon and maxSteps", () => {
    for (const epsilon of [0, -1, NaN, Infinity]) {
      expect(() => sdfGeometry(sphere, { epsilon })).toThrow(
        "sdfGeometry: epsilon must be a positive finite number",
      );
    }
    for (const maxSteps of [0, -1, 1.5, NaN]) {
      expect(() => sdfGeometry(sphere, { maxSteps })).toThrow(
        "sdfGeometry: maxSteps must be a positive integer",
      );
    }
  });

  it("gives undefined for closestPoint where the gradient is flat", () => {
    expect(g.closestPoint([0, 0, 0])).toBeUndefined();
  });

  it("says the closest point is on the surface, nearest only for a true distance", () => {
    const c = g.closestPoint([0, 3, 0]);
    expect(c?.accuracy.note).toMatch(/on the surface/);
    expect(c?.accuracy.note).toMatch(/true distance/);
  });
});
