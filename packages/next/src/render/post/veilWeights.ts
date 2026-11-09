// The veil's weights (CESIUM2_WEBGPU_PLAN.md §13.22): equal energy per octave of angle,
// so a point's veil falls as 1/θ². A level of a mip pyramid conserves energy, so its peak
// falls by 4 per level, and equal weights give a slope of -2. Halved weights, as the
// paper's section 5.1 has, give -3. No GPU types here; glare.ts holds the same in WGSL.

/** The pyramid's levels at most. */
export const VEIL_LEVELS = 9;

const DEG = Math.PI / 180;
/** The angles the veil's energy is shared over, radians. */
export const VEIL_FROM = 0.1 * DEG;
export const VEIL_TO = 60 * DEG;

/**
 * Each level's share of the energy, for a view with `pixelAngle` radians per pixel. A
 * level's σ is `basePixels × 2^i` pixels. Its share is the octaves of angle within half an
 * octave of its σ, out of those from 0.1° to 60°: octaves finer than level 0's go to level
 * 0, and those wider than the top level's are lost. Zeros for a `pixelAngle` that isn't
 * positive and finite. `out` is written, if given.
 */
export function veilWeights(
  pixelAngle: number,
  levels: number,
  basePixels: number,
  out: Float32Array = new Float32Array(levels),
): Float32Array {
  out.fill(0);
  if (!(pixelAngle > 0) || !Number.isFinite(pixelAngle)) {
    return out;
  }
  const from = Math.log2(VEIL_FROM);
  const to = Math.log2(VEIL_TO);
  const center = Math.log2(basePixels * pixelAngle);
  for (let i = 0; i < levels; i++) {
    const low = i === 0 ? from : center + i - 0.5;
    const high = center + i + 0.5;
    out[i] =
      Math.max(Math.min(high, to) - Math.max(low, from), 0) / (to - from);
  }
  return out;
}

/**
 * What the pyramid amounts to for a point, per pixel², at `r` pixels from it:
 * `Σ wᵢ exp(−r² / 2σᵢ²) / (2π σᵢ²)`, as glare.ts's `glareSpread` holds it.
 */
export function veilSpread(
  r: number,
  weights: ArrayLike<number>,
  basePixels: number,
): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    const sigma = basePixels * 2 ** i;
    const variance = sigma * sigma;
    sum +=
      (weights[i]! * Math.exp((-r * r) / (2 * variance))) /
      (2 * Math.PI * variance);
  }
  return sum;
}

/** How the sun's veil fades as it goes behind the camera, from its z along the view. */
export function sunVeilFade(z: number): number {
  const t = Math.min(Math.max((z - 0.05) / 0.1, 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * The sun's veil at a pixel, cd/m² (not pre-exposed), in closed form from its true
 * illuminance, so no clamped pixel carries its energy. `pixelOffset` is the pixel from the
 * sun, pixels; `pixelSolidAngle` its solid angle, sr; `light` the sun's lux through the
 * air; `z` the sun's z along the view.
 */
export function sunVeil(
  pixelOffset: readonly [number, number],
  pixelSolidAngle: number,
  light: readonly [number, number, number],
  visibility: number,
  share: number,
  weights: ArrayLike<number>,
  basePixels: number,
  z: number,
): [number, number, number] {
  const spread = veilSpread(Math.hypot(...pixelOffset), weights, basePixels);
  const k =
    pixelSolidAngle > 0
      ? (visibility * share * spread * sunVeilFade(z)) / pixelSolidAngle
      : 0;
  return [light[0] * k, light[1] * k, light[2] * k];
}
