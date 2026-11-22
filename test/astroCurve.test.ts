// The astrophoto curve (sky and observer plan, Task 3): a look over the whole image,
// built on the public stage interface. The fake GPU runs no shaders, so the rule is
// checked here and the shader's source pinned; spikes/observer.ts (group `curve`)
// checks its pixels.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  astroCurve,
  astrophotoCurveStage,
} from "../packages/next/src/render/post/astroCurve.ts";
import { PostStageError } from "../packages/next/src/scene/postStage.ts";

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
  it("is a simple user of the interface: one Slang function, one uniform", () => {
    const stage = astrophotoCurveStage();
    expect(stage.passes.length).toBe(1);
    expect(stage.textures.map((t) => t.name)).toEqual(["output"]);
    expect(stage.uniformLayout.fields.map((f) => f.name)).toEqual(["strength"]);
    // A uniform it has, but `shadowGain` is fixed with it: make another stage.
    expect(() => stage.setUniform("other", 4)).toThrow(/uniforms\.other/);
  });

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
    const strength = (options?: { strength: number }) => {
      const stage = astrophotoCurveStage(options);
      const data = stage.uniformData;
      return data.getFloat32(stage.uniformLayout.fields[0]!.offset, true);
    };
    expect(strength()).toBe(1);
    expect(strength({ strength: 0.5 })).toBe(0.5);
    for (const strength of [-1, Number.NaN, Infinity]) {
      expect(() => astrophotoCurveStage({ strength })).toThrow(PostStageError);
    }
  });

  describe("its Slang source (shaders/stages/astroCurve.slang)", () => {
    const source = readFileSync(
      new URL(
        "../packages/next/src/shaders/stages/astroCurve.slang",
        import.meta.url,
      ),
      "utf8",
    ).replace(/\/\/[^\n]*/g, "");

    it("holds the rule's constants", () => {
      expect(source).toContain("STRETCH = 8.0");
      expect(source).toContain("BLACK_POINT = 0.004");
      expect(source).toContain("asinh");
    });

    it("works on luminance, with one ratio for all three channels", () => {
      expect(source).toContain("0.2126, 0.7152, 0.0722");
      expect(source).toContain("c.rgb * ratio");
      // No per-channel curve.
      expect(source).not.toMatch(/asinh\([^)]*c\.[rgb]\b/);
    });

    it("adds its saturation about the curved luminance, up to 1.4 times", () => {
      expect(source).toContain("1.0 + 0.4 * s");
      expect(source).toContain("lerp(float3(curved)");
    });
  });

  it("is compiled: the unit is the build's, with no entry point and its own group 1", () => {
    const { code } = astrophotoCurveStage().passes[0]!.module;
    expect(code).toContain("@group(1)");
    expect(code).not.toMatch(/@(vertex|fragment|compute)\s+fn postStageStub/);
    expect(code).toContain("fn postStageBridge(");
  });
});
