import { greenwichSiderealTime, julianDate } from "./sun.ts";

const arcsecond = Math.PI / (180 * 3600);

/**
 * The rotation from the celestial frame (ICRF, J2000 equator and equinox:
 * star catalogs, star maps) to Earth-fixed axes at a time, row-major 3 × 3:
 * fixed = M · icrf. Precession to the date (IAU 1976, Meeus's Astronomical
 * Algorithms, ch. 21), then about the pole by the Greenwich mean sidereal
 * time, as `sunDirection` turns the sun. Nutation (under 20″), the equation
 * of the equinoxes (about 1 s of time) and polar motion are left out; 1.x's
 * sky box turns by sidereal time alone (`computeTemeToPseudoFixedMatrix`),
 * which leaves out precession too (0.36° by 2026).
 *
 * This is the analytic model only, and never throws. The IAU 2006/2000A
 * rotation from frames data (the frame tree's ITRF) is the frames module's:
 * `skyState(ms, data, out).icrfToFixed`.
 */
export function icrfToFixed(
  ms: number,
  out: Float64Array = new Float64Array(9),
): Float64Array {
  const t = (julianDate(ms) - 2_451_545.0) / 36_525;
  const zeta =
    (2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) * arcsecond;
  const z =
    (2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) * arcsecond;
  const theta =
    (2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) * arcsecond;
  // Precession: of date = R3(−z) · R2(θ) · R3(−ζ) · J2000 (frame rotations).
  const p = multiply(rotateZ(-z), multiply(rotateY(theta), rotateZ(-zeta)));
  // Earth-fixed = R3(GMST) · of date.
  const m = multiply(rotateZ(greenwichSiderealTime(ms)), p);
  out.set(m);
  return out;
}

/** A frame rotation by `a` about z (row-major). */
function rotateZ(a: number): number[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
}

/** A frame rotation by `a` about y (row-major). */
function rotateY(a: number): number[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, 0, -s, 0, 1, 0, s, 0, c];
}

function multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(9);
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
