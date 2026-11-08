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

/** The grid X, Y and s are sampled on: seconds of TT (plan 5a, ruling 2). */
const GRID_SECONDS = 60;

/** One grid sample of the series: X, Y and s at TT `k` × 60 s past J2000. */
interface GridSample {
  k: number;
  x: number;
  y: number;
  s: number;
}

// The two samples around the last instant asked for. Scrubbing forward by
// one grid step reuses one of them.
let below: GridSample = { k: Number.NaN, x: 0, y: 0, s: 0 };
let above: GridSample = { k: Number.NaN, x: 0, y: 0, s: 0 };

function sample(k: number, out: GridSample): void {
  const [tt1, tt2] = splitJd(k * GRID_SECONDS);
  const [x, y] = xy06(tt1, tt2);
  out.k = k;
  out.x = x;
  out.y = y;
  out.s = s06(tt1, tt2, x, y);
}

/**
 * The CIP's X and Y and the CIO locator s (radians) at `instant`, IAU
 * 2006/2000A: the series sampled on a 60 s grid of TT and interpolated
 * linearly between the two samples around the instant (plan 5a, ruling 2).
 * The two samples are cached. Against the series evaluated at the instant,
 * the error is under 1 µas (5 × 10⁻¹² rad); the test measures it.
 *
 * @param out Receives `[X, Y, s]`; allocated when omitted.
 */
export function interpolatedXys(
  instant: Instant,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  const tt = instant.tt;
  const k = Math.floor(tt / GRID_SECONDS);
  if (below.k !== k || above.k !== k + 1) {
    if (above.k === k) {
      // One step forward: the upper sample becomes the lower.
      [below, above] = [above, below];
      sample(k + 1, above);
    } else if (below.k === k + 1) {
      // One step back.
      [below, above] = [above, below];
      sample(k, below);
    } else {
      sample(k, below);
      sample(k + 1, above);
    }
  }
  const w = (tt - k * GRID_SECONDS) / GRID_SECONDS;
  out[0] = below.x + (above.x - below.x) * w;
  out[1] = below.y + (above.y - below.y) * w;
  out[2] = below.s + (above.s - below.s) * w;
  return out;
}

const xys = new Float64Array(3);

/**
 * The rotation from GCRS to ITRS, `itrs = M * gcrs` (row-major 3x3), by the
 * IAU 2006/2000A CIO-based model: ERFA's
 * `c2tcio(c2ixys(X + dX, Y + dY, s), era, pom00(xp, yp, s'))`, with X, Y
 * and s interpolated on a 60 s grid of TT (`interpolatedXys`, under 1 µas
 * from the series). With measured EOP it is good to a few milliarcseconds,
 * orders better than the simplified `icrfToFixed`.
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

  interpolatedXys(instant, xys);
  const rc2i = c2ixys(xys[0]! + eop.dX, xys[1]! + eop.dY, xys[2]!);
  const rpom = pom00(eop.xp, eop.yp, sp00(tt1, tt2));
  return c2tcio(rc2i, era, rpom, out);
}
