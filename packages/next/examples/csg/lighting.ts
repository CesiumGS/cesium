import { DAYLIGHT_SUN_ILLUMINANCE } from "../../src/render/layout.ts";

/**
 * The CSG sample's lighting controls (plan §13.33): what the engine's view
 * exposes of the sun, shadows, ambient occlusion, sky light and exposure, as
 * plain settings that a deep link carries (`encodeLighting`/`decodeLighting`)
 * and `applyLighting` puts on a viewer.
 *
 * What the engine doesn't expose isn't here: the sun's shadows have no
 * softness or cascade options (they are the cascaded maps `View.shadows`
 * turns on), and ambient occlusion has a radius but no strength.
 */
export interface Lighting {
  /** Degrees clockwise from north, as `Viewer.setSun`. */
  azimuth: number;
  /** Degrees above the horizon. */
  elevation: number;
  /**
   * The sun's strength: 1 is what the atmosphere lets through (white at
   * noon, orange low); another value is a white sun of that many times
   * `DAYLIGHT_SUN_ILLUMINANCE`.
   */
  sun: number;
  shadows: boolean;
  ambientOcclusion: boolean;
  /** How far ambient occlusion looks for occluders, m. */
  aoRadius: number;
  /** The sky's light on the surfaces, diffuse and specular, times. */
  sky: number;
  /** The camera's exposure, EV100. */
  exposure: number;
}

export const DEFAULT_LIGHTING: Readonly<Lighting> = {
  azimuth: 150,
  elevation: 40,
  sun: 1,
  shadows: true,
  ambientOcclusion: true,
  aoRadius: 3,
  sky: 1,
  exposure: 15,
};

/** Each number's range, for the sliders and for what a link may say. */
export const LIGHTING_RANGES = {
  azimuth: { min: 0, max: 360, step: 1 },
  elevation: { min: 1, max: 90, step: 1 },
  sun: { min: 0, max: 3, step: 0.05 },
  aoRadius: { min: 0.1, max: 6, step: 0.1 },
  sky: { min: 0, max: 3, step: 0.05 },
  exposure: { min: 10, max: 20, step: 0.1 },
} as const;

const NUMBERS = [
  "azimuth",
  "elevation",
  "sun",
  "aoRadius",
  "sky",
  "exposure",
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** The settings in a link's parameter, comma separated; undefined when they are the defaults. */
export function encodeLighting(lighting: Lighting): string | undefined {
  const same =
    lighting.shadows === DEFAULT_LIGHTING.shadows &&
    lighting.ambientOcclusion === DEFAULT_LIGHTING.ambientOcclusion &&
    NUMBERS.every((key) => lighting[key] === DEFAULT_LIGHTING[key]);
  if (same) {
    return undefined;
  }
  const round = (value: number) => String(Math.round(value * 100) / 100);
  return [
    round(lighting.azimuth),
    round(lighting.elevation),
    round(lighting.sun),
    lighting.shadows ? "1" : "0",
    lighting.ambientOcclusion ? "1" : "0",
    round(lighting.aoRadius),
    round(lighting.sky),
    round(lighting.exposure),
  ].join(",");
}

/** The settings a link's parameter says, each clamped to its range; what it leaves out or garbles is the default. */
export function decodeLighting(text: string | undefined): Lighting {
  const out: Lighting = { ...DEFAULT_LIGHTING };
  if (!text) {
    return out;
  }
  const parts = text.split(",");
  const number = (at: number, key: (typeof NUMBERS)[number]) => {
    const value =
      parts[at] === undefined || parts[at] === "" ? NaN : +parts[at]!;
    if (Number.isFinite(value)) {
      const { min, max } = LIGHTING_RANGES[key];
      out[key] = clamp(value, min, max);
    }
  };
  number(0, "azimuth");
  number(1, "elevation");
  number(2, "sun");
  number(5, "aoRadius");
  number(6, "sky");
  number(7, "exposure");
  for (const [at, key] of [
    [3, "shadows"],
    [4, "ambientOcclusion"],
  ] as const) {
    if (parts[at] === "0" || parts[at] === "1") {
      out[key] = parts[at] === "1";
    }
  }
  return out;
}

/** What `applyLighting` needs of the viewer. */
export interface LightingTarget {
  setSun(azimuth: number, elevation: number): void;
  readonly view: {
    shadows: boolean;
    ambientOcclusion: boolean;
    ambientOcclusionRadius: number;
    lighting: {
      sunIlluminance: number | "atmosphere";
      diffuseIbl: number;
      specularIbl: number;
    };
    observer: { exposure: { ev100: number } | object };
  };
  readonly engine: { requestRender(): void };
}

/** Puts the settings on the viewer's view and sun. */
export function applyLighting(target: LightingTarget, lighting: Lighting) {
  const { view } = target;
  target.setSun(lighting.azimuth, lighting.elevation);
  view.lighting.sunIlluminance =
    lighting.sun === 1 ? "atmosphere" : DAYLIGHT_SUN_ILLUMINANCE * lighting.sun;
  view.lighting.diffuseIbl = lighting.sky;
  view.lighting.specularIbl = lighting.sky;
  view.observer.exposure = { ev100: lighting.exposure };
  // Not read by the engine's on-demand fingerprint: they need a render asked for.
  view.shadows = lighting.shadows;
  view.ambientOcclusion = lighting.ambientOcclusion;
  view.ambientOcclusionRadius = lighting.aoRadius;
  target.engine.requestRender();
}
