import { c2ixys, c2tcio, era00, pom00, sp00 } from "./erfa/rotation.ts";
import { s06 } from "./erfa/s06.ts";
import { xy06 } from "./erfa/xy06.ts";
import type { EopSample } from "./eop.ts";
import type { Instant } from "./Instant.ts";
import type { LeapSeconds } from "./leapSeconds.ts";

/**
 * The rotation from GCRS to ITRS, `itrs = M * gcrs` (row-major 3x3), by the
 * IAU 2006/2000A CIO-based model: ERFA's
 * `c2tcio(c2ixys(X + dX, Y + dY, s), era, pom00(xp, yp, s'))`. With measured
 * EOP it is good to a few milliarcseconds, orders better than the simplified
 * `icrfToFixed`.
 *
 * @param instant The time, which fixes TT for the CIP and, with `leap` and
 *   `eop.ut1MinusUtc`, UT1 for the Earth rotation angle.
 * @param eop Earth orientation at the instant.
 * @param leap Leap seconds, to recover UTC from the instant.
 * @param out Receives the matrix; allocated when omitted.
 */
export function celestialToTerrestrial(
  instant: Instant,
  eop: EopSample,
  leap: LeapSeconds,
  out: Float64Array = new Float64Array(9),
): Float64Array {
  const [tt1, tt2] = instant.jdTt();

  // UT1 = TAI - (TAI - UTC) + (UT1 - UTC), kept in seconds past J2000 so the
  // millisecond rounding of toUtc does not reach the Earth rotation angle
  // (1 ms is 15 mas); toUtc only picks the leap-second row.
  const dat = leap.taiMinusUtc(instant.toUtc(leap));
  const era = era00(tt1, (instant.tai() - dat + eop.ut1MinusUtc) / 86_400);

  const [x, y] = xy06(tt1, tt2);
  const s = s06(tt1, tt2, x, y);
  const rc2i = c2ixys(x + eop.dX, y + eop.dY, s);
  const rpom = pom00(eop.xp, eop.yp, sp00(tt1, tt2));
  return c2tcio(rc2i, era, rpom, out);
}
