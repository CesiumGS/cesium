// Display-relative emission must not count toward the exposure reading.
// Emission is added after the exposure (surface.slang), and the meter
// divides the exposure out, so it read light plus emission over exposure:
// a bright emitter lowered the exposure, which raised the reading, which
// lowered the exposure again, down to the floor (the Slang playground's
// "Rim glow": only the glow showed). The surface writes the share of its
// luminance that is scene light to the scene target's alpha; the meter
// takes that share of the color.
//
// What this can't see: the GPU's own arithmetic (fp16 alpha, the MSAA
// resolve, the translucent composite's "over" on alpha), and the meter's
// histogram. The fake GPU runs no shaders, so the rule is ported here and
// the shader sources are checked to hold it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const LUMINANCE = [0.2126, 0.7152, 0.0722] as const;
const luminance = (c: readonly number[]) =>
  c[0]! * LUMINANCE[0] + c[1]! * LUMINANCE[1] + c[2]! * LUMINANCE[2];

/** surface.slang: the scene's share of a pixel's luminance. */
function sceneShare(lit: number[], shown: number[]): number {
  const e = luminance(shown);
  if (!(e > 0)) {
    return 1;
  }
  const l = luminance(lit);
  return Math.min(Math.max(l / (l + e), 0), 1);
}

/** meter.slang: a pixel's metered luminance, or undefined when left out. */
function metered(
  rgb: number[],
  alpha: number,
  exposure: number,
): number | undefined {
  if (!(alpha > 0)) {
    return undefined;
  }
  const scaled = rgb.map(
    (c) => (Math.max(c, 0) * Math.min(alpha, 1)) / exposure,
  );
  return luminance(scaled);
}

/** A pixel as the surface shader writes it at an exposure. */
function pixel(sceneLight: number[], emission: number[], exposure: number) {
  const lit = sceneLight.map((c) => c * exposure);
  const rgb = lit.map((c, i) => c + emission[i]!);
  return { rgb, alpha: sceneShare(lit, emission) };
}

describe("the exposure meter and emission", () => {
  const light = [4, 4, 4];
  const glow = [30, 10, 5];

  it("reads the scene's light alone, whatever the emission", () => {
    for (const exposure of [0.001, 0.01, 0.1, 1, 10]) {
      const withGlow = pixel(light, glow, exposure);
      const reading = metered(withGlow.rgb, withGlow.alpha, exposure)!;
      expect(reading).toBeCloseTo(luminance(light), 4);
    }
  });

  it("does not move with the exposure when the view holds emission", () => {
    const readings = [0.0005, 0.005, 0.05, 0.5, 5].map((exposure) => {
      const p = pixel(light, glow, exposure);
      return metered(p.rgb, p.alpha, exposure)!;
    });
    for (const r of readings) {
      expect(r).toBeCloseTo(readings[0]!, 6);
    }
    // The old rule, for contrast: the reading climbed as the exposure fell.
    const old = [0.5, 0.005].map((exposure) => {
      const p = pixel(light, glow, exposure);
      return metered(p.rgb, 1, exposure)!;
    });
    expect(old[1]!).toBeGreaterThan(old[0]! * 10);
  });

  it("reads a half emission, half light pixel as its light", () => {
    const exposure = 0.2;
    const lit = [0.8, 0.8, 0.8];
    const p = pixel(
      [4, 4, 4],
      lit.map((c) => c * 1),
      exposure,
    ); // equal luminance
    expect(p.alpha).toBeCloseTo(0.5, 6);
    expect(metered(p.rgb, p.alpha, exposure)).toBeCloseTo(4, 6);
  });

  it("leaves pure emission out, like unlit content", () => {
    const p = pixel([0, 0, 0], glow, 0.1);
    expect(p.alpha).toBe(0);
    expect(metered(p.rgb, p.alpha, 0.1)).toBeUndefined();
  });

  it("keeps a pixel without emission as it was", () => {
    const p = pixel(light, [0, 0, 0], 0.3);
    expect(p.alpha).toBe(1);
    expect(metered(p.rgb, p.alpha, 0.3)).toBeCloseTo(luminance(light), 6);
  });

  describe("the shader sources", () => {
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), "utf8");

    it("meter takes the alpha share of the color", () => {
      const wgsl = read("../src/shaders/generated/meter.wgsl");
      expect(wgsl).toMatch(
        /color_0\.xyz, vec3<f32>\(0\.0f\)\) \* vec3<f32>\(min\(\w+, 1\.0f\)\)/,
      );
      expect(read("../src/shaders/meter.slang")).toContain(
        "* min(color.a, 1.0) / params.exposure",
      );
    });

    it("surface writes the scene share to the scene target's alpha", () => {
      const slang = read("../src/shaders/surface.slang");
      expect(slang).toContain("float4(s.color, s.sceneShare)");
      expect(slang).not.toMatch(/out\.color = float4\(s\.color, 1\.0\)/);
      // The share is built from the light before the display-relative term.
      expect(slang).toContain(
        "dot(lit, luminance) / (dot(lit, luminance) + shownLuminance)",
      );
    });
  });
});
