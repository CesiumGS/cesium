// Derived from ERFA (eraEra00, eraSp00, eraC2ixys, eraPom00, eraC2tcio and
// the eraR* helpers, liberfa v2.0.1), itself derived from the IAU SOFA
// library. See ./LICENSE.
//
// Matrices are row-major 3x3 in a length-9 array, like ERFA's r[i][j] at
// index 3 * i + j.
import { D2PI, DAS2R } from "./fundamental.ts";

const DJ00 = 2_451_545.0;
const DJC = 36_525.0;

/** Normalize an angle to [0, 2 pi). */
function anp(a: number): number {
  let w = a % D2PI;
  if (w < 0) {
    w += D2PI;
  }
  return w;
}

/**
 * Earth rotation angle (radians, [0, 2 pi)) for a two-part UT1 Julian date,
 * IAU 2000, as ERFA `eraEra00`.
 */
export function era00(dj1: number, dj2: number): number {
  const [d1, d2] = dj1 < dj2 ? [dj1, dj2] : [dj2, dj1];
  const t = d1 + (d2 - DJ00);
  const f = (d1 % 1.0) + (d2 % 1.0);
  return anp(D2PI * (f + 0.779057273264 + 0.00273781191135448 * t));
}

/** The TIO locator s' (radians) for a two-part TT Julian date, as ERFA `eraSp00`. */
export function sp00(jd1: number, jd2: number): number {
  const t = (jd1 - DJ00 + jd2) / DJC;
  return -47e-6 * t * DAS2R;
}

/** Rotate the matrix about x by `phi`, in place (ERFA `eraRx`). */
function rx(phi: number, r: Float64Array): void {
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  for (let j = 0; j < 3; j++) {
    const a1 = c * r[3 + j]! + s * r[6 + j]!;
    const a2 = -s * r[3 + j]! + c * r[6 + j]!;
    r[3 + j] = a1;
    r[6 + j] = a2;
  }
}

/** Rotate the matrix about y by `theta`, in place (ERFA `eraRy`). */
function ry(theta: number, r: Float64Array): void {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  for (let j = 0; j < 3; j++) {
    const a0 = c * r[j]! - s * r[6 + j]!;
    const a2 = s * r[j]! + c * r[6 + j]!;
    r[j] = a0;
    r[6 + j] = a2;
  }
}

/** Rotate the matrix about z by `psi`, in place (ERFA `eraRz`). */
function rz(psi: number, r: Float64Array): void {
  const s = Math.sin(psi);
  const c = Math.cos(psi);
  for (let j = 0; j < 3; j++) {
    const a0 = c * r[j]! + s * r[3 + j]!;
    const a1 = -s * r[j]! + c * r[3 + j]!;
    r[j] = a0;
    r[3 + j] = a1;
  }
}

function identity(): Float64Array {
  return Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
}

/**
 * The celestial-to-intermediate matrix from the CIP X, Y and the CIO locator
 * s, as ERFA `eraC2ixys`.
 */
export function c2ixys(x: number, y: number, s: number): Float64Array {
  const r2 = x * x + y * y;
  const e = r2 > 0.0 ? Math.atan2(y, x) : 0.0;
  const d = Math.atan(Math.sqrt(r2 / (1.0 - r2)));
  const m = identity();
  rz(e, m);
  ry(d, m);
  rz(-(e + s), m);
  return m;
}

/**
 * The polar-motion matrix (TIRS to ITRS) from xp, yp and s' (radians), as
 * ERFA `eraPom00`.
 */
export function pom00(xp: number, yp: number, sp: number): Float64Array {
  const m = identity();
  rz(sp, m);
  ry(-xp, m);
  rx(-yp, m);
  return m;
}

/**
 * The celestial-to-terrestrial matrix from the celestial-to-intermediate
 * matrix, the Earth rotation angle and the polar-motion matrix, as ERFA
 * `eraC2tcio`: `rpom * Rz(era) * rc2i`. Writes into `out`.
 */
export function c2tcio(
  rc2i: Float64Array,
  era: number,
  rpom: Float64Array,
  out: Float64Array,
): Float64Array {
  const r = Float64Array.from(rc2i);
  rz(era, r);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let w = 0.0;
      for (let k = 0; k < 3; k++) {
        w += rpom[3 * i + k]! * r[3 * k + j]!;
      }
      out[3 * i + j] = w;
    }
  }
  return out;
}
