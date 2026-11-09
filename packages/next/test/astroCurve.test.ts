// The astrophoto curve (sky and observer plan, Task 3): a look over the whole image,
// built on the public stage interface. The fake GPU runs no shaders, so the rule is
// checked here and the shader's source pinned; spikes/observer.ts (group `curve`)
// checks its pixels.
import { describe, expect, it } from "vitest";
import {
  astroCurve,
  astrophotoCurveStage,
} from "../src/render/post/astroCurve.ts";
import { PostStageError } from "../src/scene/postStage.ts";

describe("astroCurve", () => {
  it("about holds white, and leaves black", () => {
    // 0.1% under: the asinh of a value just below q, as the plan's formula says.
    expect(Math.abs(astroCurve(1, 1) - 1)).toBeLessThan(2e-3);
    expect(astroCurve(0, 1)).toBe(0);
  });

  it("is 0 at and below the black point", () => {
    expect(astroCurve(0.004, 1)).toBe(0);
    expect(astroCurve(0.002, 1)).toBe(0);
    expect(astroCurve(0.0041, 1)).toBeGreaterThan(0);
  });

  it("is monotonic, past white too", () => {
    let previous = -1;
    for (let i = 0; i <= 1000; i++) {
      const y = astroCurve((i / 1000) * 4, 1);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
  });

  it("at strength 0 is the identity, to 10⁻³", () => {
    for (let i = 0; i <= 100; i++) {
      const y = i / 100;
      expect(Math.abs(astroCurve(y, 0) - y)).toBeLessThan(1e-3);
    }
  });

  it("lifts what's faint more as it grows", () => {
    expect(astroCurve(0.05, 1)).toBeGreaterThan(astroCurve(0.05, 0.5));
    expect(astroCurve(0.05, 0.5)).toBeGreaterThan(astroCurve(0.05, 0));
  });
});

describe("astrophotoCurveStage", () => {
  it("says what it is", () => {
    const stage = astrophotoCurveStage();
    expect(stage.kind).toBe("look");
    expect(stage.label).toContain("look");
    expect(stage.label).toBe("Astrophoto curve (a look)");
  });

  it("sits after the response: it can't touch the scene's light", () => {
    expect(astrophotoCurveStage().slot).toBe("exposed");
  });

  it("states how far it lifts what's faint", () => {
    expect(Math.abs(astrophotoCurveStage().shadowGain - 2.89)).toBeLessThan(
      0.01,
    );
    const eps = 1e-5;
    // The slope just above the black point.
    const slope = (astroCurve(0.004 + eps, 1) - astroCurve(0.004, 1)) / eps;
    expect(astrophotoCurveStage().shadowGain).toBeCloseTo(slope, 3);
    // At strength 0 it's the identity: a gain of 1.
    expect(astrophotoCurveStage({ strength: 0 }).shadowGain).toBeCloseTo(1, 5);
  });

  it("defaults to full strength, and refuses one that makes no sense", () => {
    expect(astrophotoCurveStage().uniformData.getFloat32(0, true)).toBe(1);
    expect(
      astrophotoCurveStage({ strength: 0.5 }).uniformData.getFloat32(0, true),
    ).toBe(0.5);
    for (const strength of [-1, Number.NaN, Infinity]) {
      expect(() => astrophotoCurveStage({ strength })).toThrow(PostStageError);
    }
  });

  describe("its shader", () => {
    const source = astrophotoCurveStage().module.code;
    const own = source.slice(source.indexOf("fn postStage(input: PostInput)"));

    it("holds the rule's constants", () => {
      expect(own).toContain("8.0");
      expect(own).toContain("0.004");
      expect(own).toContain("asinh");
    });

    it("works on luminance, with one ratio for all three channels", () => {
      expect(own).toContain("0.2126, 0.7152, 0.0722");
      expect(own).toContain("c.rgb * ratio");
      // No per-channel curve.
      expect(own).not.toMatch(/asinh\([^)]*c\.[rgb]\b/);
    });

    it("adds its saturation about the curved luminance, up to 1.4 times", () => {
      expect(own).toContain("1.0 + 0.4 * s");
      expect(own).toContain("mix(vec3<f32>(curved)");
    });
  });
});
