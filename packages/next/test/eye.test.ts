// The eye's response (plan §4.2): Ferwerda et al. 1996's thresholds,
// Tumblin and Rushmeier's brightness, and the calibration to daylight.
import { describe, expect, it } from "vitest";
import {
  DISPLAY_ADAPTATION,
  DISPLAY_WHITE,
  SCOTOPIC_WHITE,
  adapt,
  brightness,
  coneThreshold,
  eyeResponse,
  rodThreshold,
  rodWeight,
} from "../src/scene/eye.ts";

describe("thresholds (Ferwerda et al. 1996)", () => {
  it("follow Weber's law in bright light", () => {
    // log tp = log La − 1.255 above 10^1.9; log ts = log La − 0.395 above 10^−1.44.
    expect(coneThreshold(1000) / 1000).toBeCloseTo(10 ** -1.255, 6);
    expect(rodThreshold(1) / 1).toBeCloseTo(10 ** -0.395, 6);
  });

  it("level off at the absolute thresholds in the dark", () => {
    expect(coneThreshold(1e-4)).toBeCloseTo(10 ** -0.72, 6);
    expect(rodThreshold(1e-6)).toBeCloseTo(10 ** -2.86, 9);
  });

  it("are continuous where the pieces meet", () => {
    for (const [f, l] of [
      [coneThreshold, -2.6],
      [coneThreshold, 1.9],
      [rodThreshold, -3.94],
      [rodThreshold, -1.44],
    ] as const) {
      const a = f(10 ** (l - 1e-6));
      const b = f(10 ** (l + 1e-6));
      expect(Math.abs(Math.log10(a / b))).toBeLessThan(0.02);
    }
  });
});

describe("the rods' share and brightness", () => {
  it("rods see below the mesopic range and not above it", () => {
    expect(rodWeight(0.001)).toBe(1);
    expect(rodWeight(100)).toBe(0);
    expect(rodWeight(1)).toBeGreaterThan(0.5);
  });

  it("night looks darker than day (Tumblin and Rushmeier)", () => {
    expect(brightness(5000)).toBe(1);
    expect(Math.log2(brightness(0.03))).toBeCloseTo(-1.85, 1);
    expect(Math.log2(brightness(1e-4))).toBeCloseTo(-3.1, 1);
  });
});

describe("eyeResponse", () => {
  it("shows daylight's adaptation level as a metered camera does", () => {
    const day = 4000;
    const r = eyeResponse(day, day * SCOTOPIC_WHITE);
    expect(r.rods).toBe(0);
    expect(r.cones * day).toBeCloseTo(0.104, 2);
  });

  it("sees a moonlit scene with the rods, dimmer than day", () => {
    const moonlit = 0.03;
    const r = eyeResponse(moonlit, moonlit * SCOTOPIC_WHITE);
    const rods = r.rods * moonlit * SCOTOPIC_WHITE;
    const cones = r.cones * moonlit;
    expect(rods).toBeGreaterThan(20 * cones);
    expect(rods).toBeLessThan(0.104);
    expect(rods).toBeGreaterThan(0.01);
  });

  it("uses the display's own terms", () => {
    expect(DISPLAY_ADAPTATION).toBe(DISPLAY_WHITE / 2);
  });
});

describe("adapt", () => {
  it("brightens faster than it darkens", () => {
    const up = adapt(0, 1, 0.2, "cones");
    const down = 1 - adapt(1, 0, 0.2, "cones");
    expect(up).toBeGreaterThan(0.8);
    expect(down).toBeLessThan(0.2);
  });

  it("rods are slower than cones", () => {
    expect(adapt(0, 1, 0.2, "rods")).toBeLessThan(adapt(0, 1, 0.2, "cones"));
  });
});
