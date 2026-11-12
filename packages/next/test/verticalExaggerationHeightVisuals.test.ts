// The "Vertical exaggeration" example's height visuals (plan §13.26, the
// owner's answer 2): the ramp and its legend, the shader's switches, and the
// globe taking the shader only while an effect is on.
import { describe, expect, it, vi } from "vitest";

await vi.hoisted(async () => {
  const { installGpuGlobals } = await import("./fakeGpu.ts");
  installGpuGlobals();
});

const { RAMP, RAMP_TOP, createHeightVisuals, attach, rampGradient } =
  await import("../examples/vertical-exaggeration/heightVisuals.ts");

describe("height visuals", () => {
  it("has a ramp that rises from the ellipsoid to the top of the Alps, and a legend gradient over the same stops", () => {
    expect(RAMP[0]![0]).toBe(0);
    expect(RAMP_TOP).toBeGreaterThanOrEqual(4478);
    const heights = RAMP.map(([m]) => m);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    const css = rampGradient();
    expect(css).toContain(`${RAMP[0]![1]} 0.00%`);
    expect(css).toContain(`${RAMP.at(-1)![1]} 100.00%`);
  });

  it("is on only while an effect is", () => {
    const visuals = createHeightVisuals();
    expect(visuals.active).toBe(false);
    visuals.set({ tint: true, lookup: "drawn" });
    expect(visuals.active).toBe(true);
    expect(visuals.state).toMatchObject({ tint: true, lookup: "drawn" });
    visuals.set({ tint: false, contours: 250 });
    expect(visuals.active).toBe(true);
    visuals.set({ contours: 0, haze: true, hazeKey: "true" });
    expect(visuals.active).toBe(true);
    visuals.set({ haze: false });
    expect(visuals.active).toBe(false);
  });

  it("puts the shader on the globe while an effect is on, and takes it off after", () => {
    const visuals = createHeightVisuals();
    const globe = { shader: undefined as unknown } as Parameters<
      typeof attach
    >[0];
    attach(globe, visuals);
    expect(globe!.shader).toBeUndefined();
    visuals.set({ tint: true });
    attach(globe, visuals);
    expect(globe!.shader).toBe(visuals.shader);
    visuals.set({ tint: false });
    attach(globe, visuals);
    expect(globe!.shader).toBeUndefined();
    expect(() => attach(undefined, visuals)).not.toThrow();
  });

  it("reads the height a fragment is keyed to: true from the true position, drawn from the drawn one", () => {
    const { code } = createHeightVisuals().shader;
    expect(code).toContain("fsInput.truePositionEC");
    expect(code).toContain("heightAbove(fsInput.positionWC)");
    expect(code).toContain("select(trueH, drawnH, uniforms.tint.y > 0.5)");
  });
});
