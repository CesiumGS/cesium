// Derived from ERFA (eraBp06, eraPfw06, eraFw2m and eraObl06 at J2000,
// liberfa v2.0.1), itself derived from the IAU SOFA library. See ./LICENSE.
//
// Matrices are row-major 3x3 in a length-9 array, like ERFA's r[i][j] at
// index 3 * i + j.
import { DAS2R } from "./fundamental.ts";

// The frame bias angles at J2000, as eraPfw06 gives them for zero time
// (the IAU 2006 values, arcseconds), and the mean obliquity eraObl06 gives.
const GAMB = -0.052928 * DAS2R;
const PHIB = 84381.412819 * DAS2R;
const PSIB = -0.041775 * DAS2R;
const EPSA = 84381.406 * DAS2R;

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

/**
 * The frame bias matrix, row-major: `eme2000 = B · icrs`. It is ERFA
 * `eraBp06`'s `rb` (the Fukushima-Williams angles at J2000, assembled by
 * `eraFw2m`): a rotation of about 0.02 arcseconds, 45 m at 400,000 km.
 */
export function frameBias(
  out: Float64Array = new Float64Array(9),
): Float64Array {
  out.set([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  rz(GAMB, out);
  rx(PHIB, out);
  rz(-PSIB, out);
  rx(-EPSA, out);
  return out;
}
