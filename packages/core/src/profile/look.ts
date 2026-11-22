// A view's look, from the options it has today (docs/superpowers/plans/2026-11-13-engine-profiles.md,
// section 7): each feature `false`, `true` (the engine picks the step) or a
// named step (pinned). The options keep their names and types; this maps
// them onto the catalog, so the resolver sees what today's render code does.
import type { GlareSettings } from "../scene/observer.ts";
import type { Look, Step } from "./types.ts";

/** What a view's look is read from: `View` has all of these. */
export interface LookSource {
  readonly observer: { readonly glare?: GlareSettings | null };
  readonly shadows: boolean;
  readonly ambientOcclusion: boolean;
  readonly translucencyMethod: "moments" | "exact";
  readonly fxaa: boolean;
  readonly cityLights: boolean;
  readonly sunDisk: boolean;
  readonly aerialPerspective: boolean;
  readonly lodTransitions: "morph" | "pop";
}

/** The features a view's options set, in a fixed order (`lookValues`). */
export const LOOK_FEATURES = [
  "glare",
  "shadows",
  "ambientOcclusion",
  "translucency",
  "fxaa",
  "cityLights",
  "sunDisk",
  "aerialPerspective",
  "lodTransitions",
] as const;

/**
 * Glare: no settings, or neither a veil nor spikes, or `tier: "off"`, is
 * off; `tier: "auto"` lets the engine pick; a named tier is pinned.
 */
function glareLook(glare: GlareSettings | null | undefined): boolean | Step {
  if (!glare || (!glare.veil && !glare.spikes) || glare.tier === "off") {
    return false;
  }
  return glare.tier === "auto" ? true : glare.tier;
}

/**
 * Writes the look's value for each of `LOOK_FEATURES` into `out`, in order,
 * and returns it. Translucency's moments are pinned at 32-bit: the engine's
 * moments are its best supported moments step, so a device without
 * `float32-blendable` gives `moments16`, as today.
 */
export function lookValues(
  source: LookSource,
  out: (boolean | Step)[] = [],
): (boolean | Step)[] {
  out[0] = glareLook(source.observer.glare);
  out[1] = source.shadows;
  out[2] = source.ambientOcclusion;
  out[3] = source.translucencyMethod === "exact" ? "exact" : "moments32";
  out[4] = source.fxaa;
  out[5] = source.cityLights;
  out[6] = source.sunDisk;
  out[7] = source.aerialPerspective;
  out[8] = source.lodTransitions;
  out.length = LOOK_FEATURES.length;
  return out;
}

/** A view's look, as the resolver takes it. */
export function viewLook(source: LookSource): Look {
  const values = lookValues(source);
  return Object.fromEntries(LOOK_FEATURES.map((name, i) => [name, values[i]]));
}
