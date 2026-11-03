import { describe, expect, it } from "vitest";
import { shadowRange } from "../src/scene/shadows.ts";

describe("shadowRange", () => {
  it("covers what is shown with room, in quarter-octave steps", () => {
    const r = shadowRange(undefined, { near: 100, far: 1000 })!;
    expect(r.near).toBeLessThanOrEqual(80);
    expect(r.near).toBeGreaterThan(80 / 2 ** 0.25);
    expect(r.far).toBeGreaterThanOrEqual(1250);
    expect(r.far).toBeLessThan(1250 * 2 ** 0.25);
    expect(Math.log2(r.far) * 4).toBeCloseTo(Math.round(Math.log2(r.far) * 4));
  });

  it("widens at once", () => {
    const r = shadowRange(undefined, { near: 100, far: 1000 })!;
    const wider = shadowRange(r, { near: 50, far: 2000 })!;
    expect(wider.near).toBeLessThan(r.near);
    expect(wider.far).toBeGreaterThan(r.far);
  });

  it("narrows only past its slack", () => {
    const r = shadowRange(undefined, { near: 100, far: 1000 })!;
    // A little nearer than the far end and farther than the near: kept.
    expect(shadowRange(r, { near: 110, far: 900 })).toEqual(r);
    // Much narrower: follows.
    const narrow = shadowRange(r, { near: 300, far: 400 })!;
    expect(narrow.near).toBeGreaterThan(r.near);
    expect(narrow.far).toBeLessThan(r.far);
  });

  it("keeps the last range without a reading", () => {
    const r = { near: 10, far: 20 };
    expect(shadowRange(r, undefined)).toBe(r);
    expect(shadowRange(undefined, undefined)).toBeUndefined();
  });
});
