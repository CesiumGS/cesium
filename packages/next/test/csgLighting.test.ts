// The CSG sample's lighting settings (plan §13.33): what a link says is
// clamped to what the sliders allow, the defaults leave the link empty, and
// the settings land on the viewer's view and sun.
import { describe, expect, it, vi } from "vitest";
import { DAYLIGHT_SUN_ILLUMINANCE } from "../src/render/layout.ts";
import {
  DEFAULT_LIGHTING,
  LIGHTING_RANGES,
  applyLighting,
  decodeLighting,
  encodeLighting,
  type Lighting,
  type LightingTarget,
} from "../examples/csg/lighting.ts";

describe("the lighting settings in a link", () => {
  it("leaves the link empty for the defaults, and reads nothing as the defaults", () => {
    expect(encodeLighting({ ...DEFAULT_LIGHTING })).toBeUndefined();
    expect(decodeLighting(undefined)).toEqual(DEFAULT_LIGHTING);
    expect(decodeLighting("")).toEqual(DEFAULT_LIGHTING);
  });

  it("round-trips any setting", () => {
    const lighting: Lighting = {
      azimuth: 212,
      elevation: 17.5,
      sun: 1.4,
      shadows: false,
      ambientOcclusion: false,
      aoRadius: 0.8,
      sky: 0.35,
      exposure: 13.2,
    };
    const text = encodeLighting(lighting)!;
    expect(text).toBe("212,17.5,1.4,0,0,0.8,0.35,13.2");
    expect(decodeLighting(text)).toEqual(lighting);
    // One change from the defaults is enough to be written.
    expect(
      encodeLighting({ ...DEFAULT_LIGHTING, shadows: false }),
    ).toBeDefined();
  });

  it("clamps what is out of range and keeps the default for what is garbled", () => {
    const out = decodeLighting("999,-5,99,2,x,0,-1,40");
    expect(out.azimuth).toBe(LIGHTING_RANGES.azimuth.max);
    expect(out.elevation).toBe(LIGHTING_RANGES.elevation.min);
    expect(out.sun).toBe(LIGHTING_RANGES.sun.max);
    // Not 0 or 1: the default stays.
    expect(out.shadows).toBe(DEFAULT_LIGHTING.shadows);
    expect(out.ambientOcclusion).toBe(DEFAULT_LIGHTING.ambientOcclusion);
    expect(out.aoRadius).toBe(LIGHTING_RANGES.aoRadius.min);
    expect(out.sky).toBe(LIGHTING_RANGES.sky.min);
    expect(out.exposure).toBe(LIGHTING_RANGES.exposure.max);
    // A short link keeps the rest as it was.
    expect(decodeLighting("90")).toEqual({ ...DEFAULT_LIGHTING, azimuth: 90 });
    expect(decodeLighting("nope")).toEqual(DEFAULT_LIGHTING);
  });
});

describe("applying the lighting", () => {
  const target = () => {
    const calls: string[] = [];
    const t = {
      setSun: (az: number, el: number) => calls.push(`sun ${az} ${el}`),
      view: {
        shadows: true,
        ambientOcclusion: true,
        ambientOcclusionRadius: 3,
        lighting: {
          sunIlluminance: "atmosphere" as number | "atmosphere",
          diffuseIbl: 1,
          specularIbl: 1,
        },
        observer: { exposure: { ev100: 15 } as object },
      },
      engine: { requestRender: vi.fn() },
    } satisfies LightingTarget;
    return { t, calls };
  };

  it("sets the sun, the sky, the exposure, the shadows and the occlusion, and asks for a frame", () => {
    const { t, calls } = target();
    applyLighting(t, {
      azimuth: 200,
      elevation: 25,
      sun: 1.5,
      shadows: false,
      ambientOcclusion: false,
      aoRadius: 1.2,
      sky: 0.5,
      exposure: 14,
    });
    expect(calls).toEqual(["sun 200 25"]);
    expect(t.view.lighting.sunIlluminance).toBe(1.5 * DAYLIGHT_SUN_ILLUMINANCE);
    expect(t.view.lighting.diffuseIbl).toBe(0.5);
    expect(t.view.lighting.specularIbl).toBe(0.5);
    expect(t.view.observer.exposure).toEqual({ ev100: 14 });
    expect(t.view.shadows).toBe(false);
    expect(t.view.ambientOcclusion).toBe(false);
    expect(t.view.ambientOcclusionRadius).toBe(1.2);
    expect(t.engine.requestRender).toHaveBeenCalled();
  });

  it("leaves the sun to the atmosphere at 1", () => {
    const { t } = target();
    applyLighting(t, { ...DEFAULT_LIGHTING, sun: 2 });
    expect(t.view.lighting.sunIlluminance).toBe(2 * DAYLIGHT_SUN_ILLUMINANCE);
    applyLighting(t, { ...DEFAULT_LIGHTING });
    expect(t.view.lighting.sunIlluminance).toBe("atmosphere");
  });
});
