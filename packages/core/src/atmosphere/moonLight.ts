// The Moon's appearance in the sky: how bright its disk is at a phase.
// The core draws it; where the Moon is comes from the time library
// (`moonPosition`, `moonAxes`) or the frames module's sky.

const deg = Math.PI / 180;

/**
 * The Moon's geometric albedo (V): its full disk's brightness as a share
 * of a white Lambertian disk's in the same light.
 */
export const MOON_ALBEDO = 0.12;

/**
 * The Moon's brightness at phase angle `alpha` (radians, at the Moon
 * between the sun and the observer; 0 full) as a share of full: Allen's
 * magnitudes, 0.026° per degree plus 4 × 10⁻⁹ of its fourth power (the
 * opposition surge and the rough surface's shadows make a half moon a
 * tenth of a full one, not a half).
 */
export function moonPhaseBrightness(alpha: number): number {
  const a = Math.min(Math.abs(alpha), Math.PI) / deg;
  return 10 ** (-0.4 * (0.026 * a + 4e-9 * a ** 4));
}

/**
 * The Lommel-Seeliger disk's brightness at phase angle `alpha` as a share
 * of full: 1 − sin(α/2) tan(α/2) ln cot(α/4). A disk whose radiance goes
 * as 2μ₀/(μ₀ + μ) (flat at full, as the Moon looks) sums to this; the
 * sky's disk divides it out so the Moon's total follows Allen's.
 */
export function lommelSeeliger(alpha: number): number {
  const a = Math.min(Math.abs(alpha), Math.PI - 1e-3);
  if (a < 1e-6) {
    return 1;
  }
  return 1 - Math.sin(a / 2) * Math.tan(a / 2) * Math.log(1 / Math.tan(a / 4));
}
