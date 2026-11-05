// Derived from ERFA (eraS06, liberfa v2.0.1), itself derived from the IAU
// SOFA library. See ./LICENSE.
import {
  DAS2R,
  fad03,
  fae03,
  faf03,
  fal03,
  falp03,
  faom03,
  fapa03,
  fave03,
} from "./fundamental.ts";
import { s0, s1, s2, s3, s4, sp } from "./s06Table.ts";

const DJ00 = 2_451_545.0;
const DJC = 36_525.0;

/** Sum of s sin(arg) + c cos(arg) over the rows of one order, starting from `w`. */
function series(rows: readonly number[], fa: number[], w: number): number {
  for (let i = rows.length / 10 - 1; i >= 0; i--) {
    const r = 10 * i;
    let arg = 0.0;
    for (let j = 0; j < 8; j++) {
      arg += rows[r + j]! * fa[j]!;
    }
    w += rows[r + 8]! * Math.sin(arg) + rows[r + 9]! * Math.cos(arg);
  }
  return w;
}

/**
 * The CIO locator s (radians) for the given CIP X, Y, from the IAU 2006
 * precession and IAU 2000A nutation models, as ERFA `eraS06`.
 *
 * @param jd1 First part of the two-part TT Julian date.
 * @param jd2 Second part.
 * @param x CIP X.
 * @param y CIP Y.
 */
export function s06(jd1: number, jd2: number, x: number, y: number): number {
  const t = (jd1 - DJ00 + jd2) / DJC;
  const fa = [
    fal03(t),
    falp03(t),
    faf03(t),
    fad03(t),
    faom03(t),
    fave03(t),
    fae03(t),
    fapa03(t),
  ];

  const w0 = series(s0, fa, sp[0]!);
  const w1 = series(s1, fa, sp[1]!);
  const w2 = series(s2, fa, sp[2]!);
  const w3 = series(s3, fa, sp[3]!);
  const w4 = series(s4, fa, sp[4]!);
  const w5 = sp[5]!;

  return (
    (w0 + (w1 + (w2 + (w3 + (w4 + w5 * t) * t) * t) * t) * t) * DAS2R -
    (x * y) / 2.0
  );
}
