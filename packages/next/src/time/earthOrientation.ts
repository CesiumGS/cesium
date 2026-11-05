import { c2ixys, c2tcio, era00, pom00, sp00 } from "./erfa/rotation.ts";
import { s06 } from "./erfa/s06.ts";
import { xy06 } from "./erfa/xy06.ts";
import type { EopSample } from "./eop.ts";
import type { Instant } from "./Instant.ts";

/** Seconds past J2000 as a two-part JD: J2000 plus whole days, then the rest. */
function splitJd(seconds: number): [number, number] {
  const days = Math.floor(seconds / 86_400);
  return [2_451_545.0 + days, (seconds - days * 86_400) / 86_400];
}

/**
 * The rotation from GCRS to ITRS, `itrs = M * gcrs` (row-major 3x3), by the
 * IAU 2006/2000A CIO-based model: ERFA's
 * `c2tcio(c2ixys(X + dX, Y + dY, s), era, pom00(xp, yp, s'))`. With measured
 * EOP it is good to a few milliarcseconds, orders better than the simplified
 * `icrfToFixed`.
 *
 * @param instant The time, which fixes TT for the CIP and, with
 *   `eop.ut1MinusTai`, UT1 for the Earth rotation angle.
 * @param eop Earth orientation at the instant, from
 *   `EarthOrientationParameters.atInstant`, which is right inside a leap
 *   second too.
 * @param out Receives the matrix; allocated when omitted.
 */
export function celestialToTerrestrial(
  instant: Instant,
  eop: EopSample,
  out: Float64Array = new Float64Array(9),
): Float64Array {
  // Two-part JDs as whole days plus a remainder, so neither part loses
  // precision to the other.
  const [tt1, tt2] = splitJd(instant.tt);
  // UT1 = TAI + (UT1 - TAI), which is continuous across leap seconds, so no
  // leap-second table is involved.
  const [ut11, ut12] = splitJd(instant.tai() + eop.ut1MinusTai);
  const era = era00(ut11, ut12);

  const [x, y] = xy06(tt1, tt2);
  const s = s06(tt1, tt2, x, y);
  const rc2i = c2ixys(x + eop.dX, y + eop.dY, s);
  const rpom = pom00(eop.xp, eop.yp, sp00(tt1, tt2));
  return c2tcio(rc2i, era, rpom, out);
}
