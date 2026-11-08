// The catalog's analytic stand-ins (plan 5a's call 12): today's analytic sky
// as edges of the built-in tree, each with its stated accuracy. They load
// nothing and cost nothing: Meeus's Sun, Simon's Moon, the IAU rotation
// model's lunar axes, and `icrfToFixed`'s precession and sidereal time.
// EME2000 and MOON_PA are constant and built in; their matrices live here so
// the catalog and `createFrames` share them.
import { identity, type Mat4 } from "../math/mat4.ts";
import { icrfToFixed } from "../time/celestial.ts";
import { frameBias } from "../time/erfa/bias.ts";
import type { Instant } from "../time/Instant.ts";
import type { LeapSeconds } from "../time/leapSeconds.ts";
import { moonAxes, moonPosition } from "../time/moon.ts";
import { sunPosition } from "../time/sun.ts";
import type { FrameEdge } from "./edges.ts";
import { deepFreeze, type FrameAccuracy } from "./frameAccuracy.ts";
import { MOON_PA_TO_ME } from "./lunarConstants.ts";
import { toParentMatrix } from "./matrix.ts";

/** The reference frames with an analytic stand-in. */
export type StandInName =
  "HCRS" | "GCRF" | "EARTH_ICRF" | "MOON_ICRF" | "ITRF" | "MOON_ME";

const ARCSECOND = Math.PI / 648000;

/**
 * HCRS's stand-in puts the Sun at the barycentre. The Sun circles it at up
 * to about 1.5 million km (some 2.2 solar radii; 1.38 million km at most over
 * 2000 to 2050 in DE440). The stated 2.2 million km is a conservative bound
 * above that.
 */
const SUN_BARYCENTRE_METERS = 2.2e9;
/**
 * The Sun from the Earth by Meeus's low-precision formula, against DE440:
 * 32,277 km at most, sampled daily over 2000 to 2050 (0.0123°), rounded up
 * (test/data/frameCatalog.test.ts).
 */
const MEEUS_SUN_METERS = 3.3e7;
/**
 * The Moon from the Earth by Simon et al. (1994)'s main terms, against
 * DE440: 2,051 km at most, sampled daily over 2000 to 2050 (about 0.31°),
 * rounded up (test/data/frameCatalog.test.ts).
 */
const SIMON_MOON_METERS = 2.1e6;
/**
 * The IAU rotation model's lunar axes against the lunar PCK's mean-Earth
 * axes: 20.01″ at most, sampled daily over 2000 to 2050, rounded up
 * (test/data/frameCatalog.test.ts).
 */
const MOON_AXES_RADIANS = 21 * ARCSECOND;

/**
 * `icrfToFixed` against IAU 2006/2000A with the EOP, as a bound from its
 * parts (they add in quadrature: the first tilts the pole, the second spins
 * about it):
 *
 * - the model, which leaves out nutation: 9.96″ at most against the series
 *   with UT1 = UTC and no polar motion, sampled over 2000 to 2050, taken as
 *   10″, plus 0.6″ of polar motion (about 0.5″ at most);
 * - UT1 taken as UTC: |UT1 - UTC| < 0.9 s, which holds wherever the
 *   leap-second table does (13.54″ of spin at 0.9 s), taken as 13.6″.
 *
 * hypot(10.6″, 13.6″) = 17.2″, rounded up to 18″. The largest sample over the
 * EOP table's observed rows (2000 to 2026) is 14.49″ (plan 1's 0.0023°, or
 * 8.3″, was one instant, 2026-01-01).
 */
const ITRF_RADIANS = 18 * ARCSECOND;

/** The Earth's stand-in: the barycentre's offset plus Meeus's Sun. */
const EARTH_METERS = SUN_BARYCENTRE_METERS + MEEUS_SUN_METERS;
const EARTH_NOTE =
  "analytic stand-in: the Earth placed from Meeus's Sun (within 33,000 km of DE440, sampled daily over 2000 to 2050), with the Sun at the barycentre (which it circles at up to about 1.5 million km; 2.2 million km is stated as a conservative bound)";

/**
 * Each stand-in's stated accuracy, stated as its 1σ figure (a conservative
 * one): the largest error measured against the precise data, rounded up, or
 * for ITRF a bound from its parts.
 */
export const ANALYTIC_ACCURACY = deepFreeze({
  HCRS: {
    meters: SUN_BARYCENTRE_METERS,
    note: "analytic stand-in: the Sun placed at the barycentre, which it circles at up to about 1.5 million km (1.38 million km over 2000 to 2050 in DE440); 2.2 million km is stated as a conservative bound",
  },
  GCRF: { meters: EARTH_METERS, note: EARTH_NOTE },
  EARTH_ICRF: { meters: EARTH_METERS, note: EARTH_NOTE },
  MOON_ICRF: {
    meters: EARTH_METERS + SIMON_MOON_METERS,
    note: "analytic stand-in: the Moon from the Earth by Simon et al. (1994), within about 0.31° (2,100 km) of DE440, sampled daily over 2000 to 2050, on the Earth's stand-in (Meeus's Sun, the Sun at the barycentre)",
  },
  ITRF: {
    radians: ITRF_RADIANS,
    note: "analytic stand-in: IAU 1976 precession and Greenwich mean sidereal time, with UT1 taken as UTC and no nutation or polar motion (icrfToFixed): within 18″ (0.005°) of IAU 2006/2000A with the EOP, assuming |UT1 − UTC| < 0.9 s, within the leap-second table. A bound from its parts: the model within 10″ over 2000 to 2050 and polar motion 0.6″, tilting the pole; UT1 − UTC 13.6″ of spin",
  },
  MOON_ME: {
    radians: MOON_AXES_RADIANS,
    note: "analytic stand-in: the IAU rotation model's lunar axes (Archinal et al. 2011), within 21″ of the lunar PCK's mean-Earth axes, sampled daily over 2000 to 2050",
  },
} as const satisfies Record<StandInName, FrameAccuracy>);

/** EME2000 in EARTH_ICRF: the IAU 2006 frame bias, constant. */
export const EME2000_TO_PARENT: Readonly<Mat4> = toParentMatrix(
  frameBias(),
  undefined,
  new Float64Array(16),
);

/** MOON_PA in MOON_ME: `MOON_PA_TO_ME` is me = M · pa, so the child (pa) from the parent (me) is Mᵀ. */
export const MOON_PA_TO_PARENT: Readonly<Mat4> = (() => {
  const meToPa = new Float64Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      meToPa[3 * i + j] = MOON_PA_TO_ME[3 * j + i]!;
    }
  }
  return toParentMatrix(meToPa, undefined, new Float64Array(16));
})();

/** Unix ms of 2000-01-01T12:00:00, J2000 read as if TT were UTC-labelled. */
const J2000_UNIX_MS = 946_728_000_000;
const DAY_MS = 86_400_000;

/**
 * UTC milliseconds since 1970 at `instant`, for the analytic models (which
 * take UTC). As `Instant.toUtc`, but rounded to 10 µs rather than to the
 * millisecond: fine enough to keep the stand-ins smooth, coarse enough that
 * an instant made from whole UTC milliseconds comes back to exactly them
 * (the round trip through TT costs under a microsecond).
 */
export function analyticUtcMs(instant: Instant, leap: LeapSeconds): number {
  const taiMs = J2000_UNIX_MS + instant.tai() * 1000;
  const dat = leap.taiMinusUtcAtTai(taiMs);
  let utc = taiMs - 1000 * dat;
  if (leap.taiMinusUtc(utc) !== dat) {
    // Inside an inserted second: hold just before the day's end.
    utc = Math.floor(utc / DAY_MS) * DAY_MS - 0.01;
  }
  return Math.round(utc * 100) / 100;
}

/**
 * The stand-in edges, each reading the leap-second table `leap()` returns
 * when it turns an instant into UTC:
 *
 * - HCRS at the barycentre (the identity to ICRF);
 * - GCRF and EARTH_ICRF translated by `-sunPosition`, the Earth from
 *   Meeus's Sun, so the Sun's direction from the Earth is `sunDirection`'s;
 * - MOON_ICRF at the Earth's stand-in plus `moonPosition`;
 * - ITRF rotated from GCRF by `icrfToFixed`;
 * - MOON_ME rotated from MOON_ICRF by `moonAxes`.
 */
export function analyticEdges(
  leap: () => LeapSeconds,
): Readonly<Record<StandInName, FrameEdge>> {
  const sun = new Float64Array(3);
  const moon = new Float64Array(3);
  const axes = new Float64Array(6);
  const rotation = new Float64Array(9);
  const ms = (instant: Instant) => analyticUtcMs(instant, leap());
  const earth: FrameEdge = (instant, out) => {
    sunPosition(ms(instant), sun);
    identity(out);
    out[12] = -sun[0]!;
    out[13] = -sun[1]!;
    out[14] = -sun[2]!;
  };
  return {
    HCRS: (_instant, out) => {
      identity(out);
    },
    GCRF: earth,
    EARTH_ICRF: earth,
    MOON_ICRF: (instant, out) => {
      const t = ms(instant);
      sunPosition(t, sun);
      moonPosition(t, moon);
      identity(out);
      out[12] = moon[0]! - sun[0]!;
      out[13] = moon[1]! - sun[1]!;
      out[14] = moon[2]! - sun[2]!;
    },
    ITRF: (instant, out) => {
      toParentMatrix(icrfToFixed(ms(instant), rotation), undefined, out);
    },
    MOON_ME: (instant, out) => {
      // Rows of ICRF -> ME: the x axis, y = z × x, and the pole.
      const a = moonAxes(ms(instant), axes);
      const x0 = a[0]!;
      const x1 = a[1]!;
      const x2 = a[2]!;
      const z0 = a[3]!;
      const z1 = a[4]!;
      const z2 = a[5]!;
      rotation[0] = x0;
      rotation[1] = x1;
      rotation[2] = x2;
      rotation[3] = z1 * x2 - z2 * x1;
      rotation[4] = z2 * x0 - z0 * x2;
      rotation[5] = z0 * x1 - z1 * x0;
      rotation[6] = z0;
      rotation[7] = z1;
      rotation[8] = z2;
      toParentMatrix(rotation, undefined, out);
    },
  };
}
