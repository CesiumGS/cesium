/**
 * Lights beyond the sun (plan "Lights beyond the sun", tier 1): point and
 * spot lights in candela, as glTF's `KHR_lights_punctual` gives them,
 * shaded by clustered forward shading (Olsson, Billeter and Assarsson
 * 2012): each view culls its lights to its frustum here, a compute pass
 * sorts them into a grid of froxels (lights.slang), and each pixel shades
 * the lights of its froxel (opaque.wgsl). Unshadowed.
 */

import type { TransformHandle } from "./World.ts";

export interface LightOptions {
  type: "point" | "spot";
  /** Linear RGB, scaling `intensity` (default white). */
  color?: readonly [number, number, number];
  /** Luminous intensity, candela: a 100 W bulb's is about 135. */
  intensity: number;
  /**
   * Meters beyond which it lights nothing (glTF `range`), fading to it.
   * Unset: as far as it can be seen at the view's exposure.
   */
  range?: number;
  /** A spot's full-intensity cone, radians from its axis (default 0). */
  innerConeAngle?: number;
  /** A spot's edge, radians from its axis (default π/4). */
  outerConeAngle?: number;
  /**
   * Where it is: at the transform's origin, a spot pointing down its −z
   * (glTF's convention). Moving or hiding the transform moves or hides it.
   */
  transform: TransformHandle;
}

export interface LightHandle {
  readonly index: number;
  readonly generation: number;
}

/** The froxel grid: tiles across, tiles down, slices in depth. */
export const CLUSTERS = [32, 18, 32] as const;
/**
 * Lights a froxel holds: its brightest there (common.wgsl
 * `CLUSTER_LIGHTS`); the fainter rest are dropped.
 */
export const CLUSTER_LIGHTS = 16;
/** Lights a view shades, the nearest first when more are in sight. */
export const MAX_VIEW_LIGHTS = 1024;
/** The header: the grid's parameters and the camera's axes (5 vec4). */
export const LIGHT_HEADER_FLOATS = 20;
/** A light: 4 vec4 (lights.slang `Light`). */
export const LIGHT_FLOATS = 16;
export const LIGHTS_SIZE =
  (LIGHT_HEADER_FLOATS + MAX_VIEW_LIGHTS * LIGHT_FLOATS) * 4;
export const CLUSTERS_SIZE =
  CLUSTERS[0] * CLUSTERS[1] * CLUSTERS[2] * (1 + CLUSTER_LIGHTS) * 4;

/**
 * A light's light on a white diffuse surface, shown below this share of
 * white, is out of sight: its reach without a range. At a night's
 * adaptation that is some 400 times below what the eye adapts to (local
 * adaptation lifts a region 100 times at most); lower, every froxel
 * filled with faint lights.
 */
const LIGHT_CUTOFF = 1 / 256;
/** No light reaches farther, meters. */
const MAX_REACH = 10_000;

/**
 * How far a light of `intensity` (candela, its brightest channel) lights
 * anything at `exposure` (scene light to display): where its illuminance
 * (I/d²) on white, E/π, shows below `LIGHT_CUTOFF`; within its `range`.
 */
export function lightReach(
  intensity: number,
  exposure: number,
  range?: number,
): number {
  const cutoff = Math.sqrt((intensity * exposure) / (Math.PI * LIGHT_CUTOFF));
  return Math.min(range ?? Infinity, cutoff, MAX_REACH);
}

/** A view's camera, as the lights need it. */
export interface LightCamera {
  position: ArrayLike<number>;
  direction: ArrayLike<number>;
  up: ArrayLike<number>;
  right: ArrayLike<number>;
  near: number;
  /** Tangents of the half fields of view. */
  tanX: number;
  tanY: number;
}

const candidates: Array<{ distance: number; at: number }> = [];
const scratch = new Float64Array(MAX_VIEW_LIGHTS * LIGHT_FLOATS);
let scratchCount = 0;

/**
 * Packs the lights a view sees into `out` at `offset` (the header, then
 * each light camera-relative): `lights` calls back with each light and its
 * Earth-fixed matrix. Returns how many.
 */
export function packViewLights(
  out: Float32Array,
  offset: number,
  lights: (
    visit: (light: LightOptions, matrix: ArrayLike<number>) => void,
  ) => void,
  camera: LightCamera,
  exposure: number,
): number {
  const p = camera.position;
  const f = camera.direction;
  const r = camera.right;
  const u = camera.up;
  const { tanX, tanY, near } = camera;
  const sideX = Math.sqrt(1 + tanX * tanX);
  const sideY = Math.sqrt(1 + tanY * tanY);
  candidates.length = 0;
  scratchCount = 0;
  lights((light, m) => {
    const color = light.color ?? [1, 1, 1];
    const brightest = Math.max(color[0], color[1], color[2]) * light.intensity;
    if (!(brightest > 0)) {
      return;
    }
    const reach = lightReach(brightest, exposure, light.range);
    const cx = m[12]! - p[0]!;
    const cy = m[13]! - p[1]!;
    const cz = m[14]! - p[2]!;
    const z = cx * f[0]! + cy * f[1]! + cz * f[2]!;
    const x = cx * r[0]! + cy * r[1]! + cz * r[2]!;
    const y = cx * u[0]! + cy * u[1]! + cz * u[2]!;
    // Outside the frustum's near or side planes by more than its reach.
    if (
      z + reach < near ||
      (Math.abs(x) - z * tanX) / sideX > reach ||
      (Math.abs(y) - z * tanY) / sideY > reach
    ) {
      return;
    }
    if (scratchCount === MAX_VIEW_LIGHTS) {
      // Full: keep the nearest (the farthest kept so far makes way).
      let farthest = 0;
      for (let i = 1; i < candidates.length; i++) {
        if (candidates[i]!.distance > candidates[farthest]!.distance) {
          farthest = i;
        }
      }
      const distance = Math.hypot(cx, cy, cz);
      if (distance >= candidates[farthest]!.distance) {
        return;
      }
      writeLight(candidates[farthest]!.at, light, m, cx, cy, cz, reach, color);
      candidates[farthest]!.distance = distance;
      return;
    }
    const at = scratchCount++ * LIGHT_FLOATS;
    writeLight(at, light, m, cx, cy, cz, reach, color);
    candidates.push({ distance: Math.hypot(cx, cy, cz), at });
  });
  // The grid's depth: from the near plane to the farthest light's reach.
  let far = near * 2;
  for (let i = 0; i < scratchCount; i++) {
    const o = i * LIGHT_FLOATS;
    const z =
      scratch[o]! * f[0]! + scratch[o + 1]! * f[1]! + scratch[o + 2]! * f[2]!;
    far = Math.max(far, z + scratch[o + 3]!);
  }
  const h = offset;
  out[h] = CLUSTERS[0];
  out[h + 1] = CLUSTERS[1];
  out[h + 2] = CLUSTERS[2];
  out[h + 3] = scratchCount;
  out[h + 4] = near;
  out[h + 5] = CLUSTERS[2] / Math.log(far / near);
  out[h + 6] = tanX;
  out[h + 7] = tanY;
  out.set(
    [f[0]!, f[1]!, f[2]!, far, r[0]!, r[1]!, r[2]!, 0, u[0]!, u[1]!, u[2]!, 0],
    h + 8,
  );
  out.set(
    scratch.subarray(0, scratchCount * LIGHT_FLOATS),
    h + LIGHT_HEADER_FLOATS,
  );
  return scratchCount;
}

function writeLight(
  at: number,
  light: LightOptions,
  m: ArrayLike<number>,
  cx: number,
  cy: number,
  cz: number,
  reach: number,
  color: readonly [number, number, number],
): void {
  const s = scratch;
  s[at] = cx;
  s[at + 1] = cy;
  s[at + 2] = cz;
  s[at + 3] = reach;
  s[at + 4] = color[0] * light.intensity;
  s[at + 5] = color[1] * light.intensity;
  s[at + 6] = color[2] * light.intensity;
  s[at + 7] = light.type === "spot" ? 1 : 0;
  // Where a spot points: its transform's −z, unit.
  const length = Math.hypot(m[8]!, m[9]!, m[10]!) || 1;
  s[at + 8] = -m[8]! / length;
  s[at + 9] = -m[9]! / length;
  s[at + 10] = -m[10]! / length;
  // glTF's cone falloff: (cos θ · scale + offset)², clamped.
  const inner = Math.cos(light.innerConeAngle ?? 0);
  const outer = Math.cos(light.outerConeAngle ?? Math.PI / 4);
  const scale = 1 / Math.max(0.001, inner - outer);
  s[at + 11] = scale;
  s[at + 12] = -outer * scale;
  s[at + 13] = 0;
  s[at + 14] = 0;
  s[at + 15] = 0;
}
