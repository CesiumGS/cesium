// The Moon's adopted orientation constants, apart from the ephemeris that
// reads the lunar PCK: the catalog builds MOON_PA from them without loading
// the ephemeris (plan 5a, ruling 1: MOON_PA is constant and built in).

const ARCSECOND = Math.PI / 648000;
/** moon_de440_250416.tf: MOON_ME_DE440_ME421 relative to MOON_PA_DE440. */
const TKFRAME_ANGLES = [67.8526, 78.6944, 0.2785].map((a) => a * ARCSECOND);

/** Rotation of the axes (a passive, "frame" rotation) about x, y or z, row-major. */
export function frameRotation(axis: 1 | 2 | 3, angle: number): number[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  switch (axis) {
    case 1:
      return [1, 0, 0, 0, c, s, 0, -s, c];
    case 2:
      return [c, 0, -s, 0, 1, 0, s, 0, c];
    default:
      return [c, s, 0, -s, c, 0, 0, 0, 1];
  }
}

/** `out = a * b` for row-major 3x3 matrices; `out` may alias neither. */
export function multiply3(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i * 3 + j] =
        a[i * 3]! * b[j]! +
        a[i * 3 + 1]! * b[3 + j]! +
        a[i * 3 + 2]! * b[6 + j]!;
    }
  }
  return out;
}

/**
 * The rotation from the principal axes (MOON_PA) to the mean Earth / polar
 * axes (MOON_ME), row-major. moon_de440_250416.tf defines MOON_ME_DE440_ME421
 * by the angles (67.8526, 78.6944, 0.2785) arcseconds about axes (3, 2, 1)
 * relative to MOON_PA_DE440, and says they are "the inverse of the cited
 * rotation", so the rotation PA to ME is `[-a3]1 [-a2]2 [-a1]3` (rotations
 * of the axes). SPICE's `pxform` agrees to 1e-12 (test/data/ephemeris.test.ts).
 */
export const MOON_PA_TO_ME: readonly number[] = (() => {
  const [a1, a2, a3] = TKFRAME_ANGLES as [number, number, number];
  const t = new Float64Array(9);
  const u = new Float64Array(9);
  multiply3(frameRotation(1, -a3), frameRotation(2, -a2), t);
  return Array.from(multiply3(t, frameRotation(3, -a1), u));
})();
