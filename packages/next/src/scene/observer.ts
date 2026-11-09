// How a view turns the scene's light into an image: one set of plain settings,
// with no GPU types. The rasterizer reads them (render/view/exposure.ts and the
// output passes); nothing here reaches a scene or sky shader except the
// pre-exposure, a matter of fp16's range, and the stars' point spread, which
// keeps each star's energy (CESIUM2_WEBGPU_PLAN.md §13.32).
import type { PostStage } from "./postStage.ts";

/**
 * How a view turns the scene's light into an image (plan §4.2): as a
 * camera records it (a fixed exposure, a plain scale, or metered), or as
 * the eye sees it (`EYE`). Light is in physical units by default (lux,
 * cd/m²), so the default is a camera set for daylight.
 */
export type Exposure =
  /**
   * A camera's exposure value at ISO 100: about 15 in direct sun ("sunny
   * 16"), 12 overcast, 7 in a lit interior. Scale 1 / (1.2 · 2^EV100).
   */
  | { ev100: number }
  /** A plain multiplier, for scenes without physical units. */
  | { scale: number }
  /**
   * Automatic: from the image's average luminance (reflected-light meter,
   * K = 12.5), adapting over time. EV100 is kept within [min, max];
   * `compensation` (stops) brightens when positive; `speed` is the
   * adaptation rate per second.
   */
  | {
      auto: true;
      compensation?: number;
      min?: number;
      max?: number;
      speed?: number;
    }
  /**
   * The eye: the scene's light as a person there would see it
   * (scene/eye.ts). Its cones and rods adapt to the scene, each showing
   * what it sees as visible as it was (Ferwerda et al. 1996's thresholds):
   * in dim light the rods take over, gray and a little blue (Thompson et
   * al. 2002), colors fading; night looks darker than day (Tumblin and
   * Rushmeier's brightness: 1.8 stops by moonlight); adapting to light
   * takes a moment, to dark longer. It sees the stars against a dark sky
   * even where the scene is bright (from orbit). `compensation` (stops)
   * brightens when positive; `speed` is how many times faster than a
   * real eye it adapts (1: to dark in minutes, as the eye does; default
   * `EYE_ADAPTATION_SPEED`, 400: a few seconds).
   */
  | { eye: true; compensation?: number; speed?: number };

/** The eye (`Exposure`): the `Viewer`'s default. */
export const EYE: Exposure = { eye: true };

/** No exposure: for scenes lit without units (1.x's terms). */
export const UNITLESS_EXPOSURE: Exposure = { scale: 1 };

/** Daylight: EV100 15. */
export const DAYLIGHT_EXPOSURE: Exposure = { ev100: 15 };

/** The exposure scale for an EV100 (Lagarde and de Rousiers 2014). */
export const ev100ToScale = (ev100: number): number => 1 / (1.2 * 2 ** ev100);

/** The EV100 of an exposure scale: the inverse of `ev100ToScale`. */
export const scaleToEv100 = (scale: number): number => -Math.log2(1.2 * scale);

/**
 * How exposed scene light becomes display color:
 *
 * - "pbrNeutral" (default): Khronos PBR Neutral. Base colors stay as
 *   authored up to about 0.8, then highlights compress toward white; the
 *   choice for design review and product color.
 * - "agx": Troy Sobotka's AgX (as Blender 4 and Filament ship it). A
 *   filmic curve in a wider gamut: bright saturated light desaturates
 *   toward white the way film and the eye see it (a sunset, a lamp), with
 *   lower contrast and a slightly lifted middle gray.
 * - "aces": the ACES filmic curve as CesiumJS 1.x applies it (Narkowicz's
 *   fit): more contrast and saturation, highlights clipping toward hue.
 */
export type ToneMapping = "pbrNeutral" | "agx" | "aces";

/**
 * How a star's light spreads on the image, in CSS pixels. A star's energy
 * doesn't change with it, only how it's shared among pixels.
 */
export interface PointSpread {
  /** The core's standard deviation. */
  core: number;
  /** A wider, fainter part: its standard deviation, and its share of the light. */
  wing?: { sigma: number; share: number };
}

/** How much a view spends on glare. "off" draws none. */
export type GlareTier = "full" | "reduced" | "sources" | "off";

/** The pupil behind a lens's diffraction spikes. */
export type Aperture = "round" | "vanes" | "hex" | "blades7";

/** Light scattered in the eye or the lens: a veil, and a lens's spikes. */
export interface GlareSettings {
  tier: GlareTier | "auto";
  /** The veil, and the share of a pixel's light it spreads; null for none. */
  veil: { share: number } | null;
  /** Spikes: their pupil, their share of the light, and how far they reach, degrees. */
  spikes: { aperture: Aperture; share: number; extent: number } | null;
}

/**
 * Who is looking: everything between the scene's light and a pixel, per
 * view. `eyeObserver` and `cameraObserver` give the two usual sets.
 */
export interface ObserverSettings {
  /** The response to light. EV100 is the unit (`Exposure`). */
  exposure: Exposure;
  /** How exposed light becomes display color. */
  toneMapping: ToneMapping;
  /** The stars' point spread. */
  pointSpread: PointSpread;
  /** Glare; null for none. */
  glare: GlareSettings | null;
  /**
   * Further steps of the chain, in order within each slot (`createPostStage`).
   * A new list rebuilds the view's graph; `PostStage.enabled` doesn't.
   */
  stages: readonly PostStage[];
}

/** The eye's point spread, CSS pixels. */
const EYE_CORE = 0.85;
/** A camera's point spread, CSS pixels. */
const CAMERA_CORE = 0.55;

/**
 * A person looking (`Exposure`'s "eye"): `compensation` (stops) brightens
 * when positive, and `speed` is how many times faster than a real eye it
 * adapts.
 */
export function eyeObserver(
  options: { compensation?: number; speed?: number } = {},
): ObserverSettings {
  return {
    exposure: { eye: true, ...options },
    toneMapping: "pbrNeutral",
    pointSpread: { core: EYE_CORE },
    glare: null,
    stages: [],
  };
}

/** A camera at `exposure`: `{ ev100: 15 }` is direct sun. */
export function cameraObserver(exposure: Exposure): ObserverSettings {
  return {
    exposure,
    toneMapping: "pbrNeutral",
    pointSpread: { core: CAMERA_CORE },
    glare: null,
    stages: [],
  };
}

/** What a view's observer is doing now (`View.readout`). */
export interface ObserverReadout {
  /**
   * The exposure in EV100. Undefined for a plain scale, which has no
   * units. For the eye it's an equivalent (`equivalent`).
   */
  ev100: number | undefined;
  /**
   * `ev100` is the EV100 of the eye's pre-exposure, not a camera's setting:
   * the eye's response isn't one number. Show it as "≈".
   */
  equivalent: boolean;
  /** The multiplier on the scene's light in the HDR target (fp16's range). */
  preExposure: number;
  /** The eye's adaptation, cd/m²: its cones' (photopic). */
  cones?: number;
  /** The eye's adaptation, scotopic cd/m²: its rods'. */
  rods?: number;
}

/**
 * The readout for `exposure`: `preExposure` is what an adapting exposure
 * last drew with, and `adaptation` the eye's state, log10 cd/m².
 */
export function observerReadout(
  exposure: Exposure,
  preExposure: number,
  adaptation?: { cones: number; rods: number },
): ObserverReadout {
  if ("scale" in exposure) {
    return {
      ev100: undefined,
      equivalent: false,
      preExposure: exposure.scale,
    };
  }
  if ("ev100" in exposure) {
    return {
      ev100: exposure.ev100,
      equivalent: false,
      preExposure: ev100ToScale(exposure.ev100),
    };
  }
  const ev100 = scaleToEv100(preExposure);
  if ("auto" in exposure) {
    return { ev100, equivalent: false, preExposure };
  }
  return {
    ev100,
    equivalent: true,
    preExposure,
    ...(adaptation && {
      cones: 10 ** adaptation.cones,
      rods: 10 ** adaptation.rods,
    }),
  };
}
