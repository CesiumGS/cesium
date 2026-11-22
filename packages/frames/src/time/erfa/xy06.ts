// Derived from ERFA (eraXy06, liberfa v2.0.1), itself derived from the IAU
// SOFA library. See ./LICENSE.
import {
  DAS2R,
  fad03,
  fae03,
  faf03,
  fal03,
  falp03,
  fama03,
  fame03,
  fane03,
  faom03,
  fapa03,
  fasa03,
  faju03,
  faur03,
  fave03,
} from "./fundamental.ts";
import { a, jasc, japt, jaxy, mfals, mfapl, nc, xyp } from "./xy06Table.ts";

/** Julian date of J2000.0. */
const DJ00 = 2_451_545.0;
/** Days per Julian century. */
const DJC = 36_525.0;
/** Highest power of t in the polynomials. */
const MAXPT = 5;
/** Frequencies in the luni-solar and planetary series. */
const NFLS = mfals.length / 5;
const NFPL = mfapl.length / 14;
/** Total amplitude count. */
const NA = a.length;

/**
 * CIP X, Y (radians) from the IAU 2006 precession and IAU 2000A nutation
 * series, as ERFA `eraXy06`. They combine frame bias, precession and
 * nutation.
 *
 * @param jd1 First part of the two-part TT Julian date.
 * @param jd2 Second part.
 */
export function xy06(jd1: number, jd2: number): [number, number] {
  const t = (jd1 - DJ00 + jd2) / DJC;

  const pt: number[] = [];
  let w = 1.0;
  for (let j = 0; j <= MAXPT; j++) {
    pt.push(w);
    w *= t;
  }

  // Fundamental arguments (IERS 2003).
  const fa = [
    fal03(t),
    falp03(t),
    faf03(t),
    fad03(t),
    faom03(t),
    fame03(t),
    fave03(t),
    fae03(t),
    fama03(t),
    faju03(t),
    fasa03(t),
    faur03(t),
    fane03(t),
    fapa03(t),
  ];

  // Polynomial part.
  const xypr = [0, 0];
  for (let jxy = 0; jxy < 2; jxy++) {
    for (let j = MAXPT; j >= 0; j--) {
      xypr[jxy]! += xyp[jxy * (MAXPT + 1) + j]! * pt[j]!;
    }
  }

  // Periodic terms, planetary then luni-solar, each worked backwards through
  // the shared amplitude array as ERFA does.
  const xypl = [0, 0];
  const xyls = [0, 0];
  let ialast = NA;

  const accumulate = (
    mults: readonly number[],
    stride: number,
    ifreq: number,
    ia: number,
    into: number[],
  ): void => {
    let arg = 0.0;
    for (let i = 0; i < stride; i++) {
      const m = mults[ifreq * stride + i]!;
      if (m !== 0) {
        arg += m * fa[i]!;
      }
    }
    const sc = [Math.sin(arg), Math.cos(arg)];
    for (let i = ialast; i >= ia; i--) {
      const j = i - ia;
      into[jaxy[j]!]! += a[i - 1]! * sc[jasc[j]!]! * pt[japt[j]!]!;
    }
    ialast = ia - 1;
  };

  for (let ifreq = NFPL - 1; ifreq >= 0; ifreq--) {
    accumulate(mfapl, 14, ifreq, nc[ifreq + NFLS]!, xypl);
  }
  for (let ifreq = NFLS - 1; ifreq >= 0; ifreq--) {
    accumulate(mfals, 5, ifreq, nc[ifreq]!, xyls);
  }

  return [
    DAS2R * (xypr[0]! + (xyls[0]! + xypl[0]!) / 1e6),
    DAS2R * (xypr[1]! + (xyls[1]! + xypl[1]!) / 1e6),
  ];
}
