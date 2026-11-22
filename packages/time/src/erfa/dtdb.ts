// Derived from ERFA (eraDtdb, liberfa v2.0.1), itself derived from the IAU
// SOFA library. See ./LICENSE.
import { fairhd } from "./dtdbTable.ts";

/** Days per Julian millennium. */
const DJM = 365_250;
/** Julian date of J2000.0. */
const DJ00 = 2_451_545.0;

/** Sum of amplitude * sin(frequency * t + phase) over rows `first..last`, summed last to first as ERFA does. */
function series(first: number, last: number, t: number): number {
  let w = 0;
  for (let j = last; j >= first; j--) {
    // The table is generated and its row count fixed, so indices are in range.
    const k = 3 * j;
    w += fairhd[k]! * Math.sin(fairhd[k + 1]! * t + fairhd[k + 2]!);
  }
  return w;
}

/**
 * TDB - TT in seconds for a geocentric observer: the Fairhead & Bretagnon
 * (1990) series as in ERFA `eraDtdb` with `ut = elong = u = v = 0`, so its
 * topocentric terms vanish. Annual amplitude is about 1.66 ms; accurate to a
 * few nanoseconds over 1950-2050.
 *
 * @param jd1 First part of the two-part Julian date (TT or TDB).
 * @param jd2 Second part.
 */
export function tdbMinusTt(jd1: number, jd2: number): number {
  // Time since J2000.0 in Julian millennia.
  const t = (jd1 - DJ00 + jd2) / DJM;

  const w0 = series(0, 473, t);
  const w1 = series(474, 678, t);
  const w2 = series(679, 763, t);
  const w3 = series(764, 783, t);
  const w4 = series(784, 786, t);
  const wf = t * (t * (t * (t * w4 + w3) + w2) + w1) + w0;

  // Adjustments to use JPL planetary masses instead of IAU.
  const wj =
    0.00065e-6 * Math.sin(6069.776754 * t + 4.021194) +
    0.00033e-6 * Math.sin(213.299095 * t + 5.543132) +
    -0.00196e-6 * Math.sin(6208.294251 * t + 5.696701) +
    -0.00173e-6 * Math.sin(74.781599 * t + 2.4359) +
    0.03638e-6 * t * t;

  return wf + wj;
}
