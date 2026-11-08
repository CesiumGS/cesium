// The built-in tree's precise edges, one per reference frame: `createFrames`
// and the catalog's providers both build on these, so the two trees agree to
// the bit (plan 5a's call 13). Each edge writes its reference frame's
// child-to-parent matrix for an instant.
import type { FrameData } from "../ephemeris/loadFrameData.ts";
import {
  C,
  EARTH_ROTATION_RATE,
  GM_MOON,
  GM_SUN,
  L_C,
} from "../math/constants.ts";
import type { Mat4 } from "../math/mat4.ts";
import { celestialToTerrestrial } from "../time/earthOrientation.ts";
import type { Instant } from "../time/Instant.ts";
import type { FrameAccuracy } from "./frameAccuracy.ts";
import { toParentMatrix } from "./matrix.ts";
import { earthOrientationSigma } from "./orientationSigma.ts";

/** A reference frame's edge: writes its child-to-parent matrix at `instant`. */
export type FrameEdge = (instant: Instant, out: Mat4) => void;

/** A precise edge and its stated accuracy, fixed or by instant. */
export interface PreciseEdge {
  readonly toParent: FrameEdge;
  readonly accuracy:
    Readonly<FrameAccuracy> | ((instant: Instant) => Readonly<FrameAccuracy>);
}

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const distance = (a: Float64Array, b: Float64Array): number =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/**
 * GCRF to ICRF, IERS Conventions 2010 (TN36) eq. 11.19:
 * `p_icrf = earth + k·r - ½ (V · r) V / c²`, with `k = 1 - U/c² - L_C`, U
 * the Sun's and the Moon's potential at the geocentre and V the Earth's
 * barycentric velocity. The one affine, non-rigid edge, so its Mat4 is
 * written directly rather than through `toParentMatrix`.
 */
export function gcrfEdge(data: Pick<FrameData, "ephemeris">): FrameEdge {
  const { ephemeris } = data;
  const earthState = new Float64Array(6);
  const sunState = new Float64Array(6);
  const moonState = new Float64Array(6);
  return (instant, out) => {
    ephemeris.earth(instant, earthState);
    ephemeris.sun(instant, sunState);
    ephemeris.moon(instant, moonState);
    const u =
      GM_SUN / distance(earthState, sunState) +
      GM_MOON / distance(earthState, moonState);
    const k = 1 - u / (C * C) - L_C;
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        out[col * 4 + row] =
          (row === col ? k : 0) -
          (0.5 * earthState[3 + row]! * earthState[3 + col]!) / (C * C);
      }
      out[col * 4 + 3] = 0;
    }
    out[12] = earthState[0]!;
    out[13] = earthState[1]!;
    out[14] = earthState[2]!;
    out[15] = 1;
  };
}

/**
 * ITRF from GCRF by IAU 2006/2000A and the EOP. Throws past the EOP table's
 * predictions, where UT1 would otherwise drift silently.
 */
export function itrfEdge(
  data: Pick<FrameData, "eop" | "leapSeconds">,
): FrameEdge {
  const { eop, leapSeconds } = data;
  const rotation = new Float64Array(9);
  return (instant, out) => {
    const sample = eop.atInstant(instant, leapSeconds);
    if (sample.degraded) {
      // UT1 - UTC drifts about a millisecond a day once the table's
      // predictions end: hundreds of meters at the equator within a year.
      const iso = (ms: number) => new Date(ms).toISOString();
      throw new Error(
        `ITRF: the EOP table covers ${iso(eop.first)} to ${iso(eop.last)} and its predictions end there; measurements past it need newer EOP data (npm run setup refreshes it)`,
      );
    }
    toParentMatrix(
      celestialToTerrestrial(instant, sample, rotation),
      undefined,
      out,
    );
  };
}

/**
 * A body's centre in ICRF axes, from the ephemeris: the Sun (HCRS), the
 * Earth (EARTH_ICRF, TDB-compatible) or the Moon (MOON_ICRF). A plain
 * translation from the barycentre.
 */
export function bodyEdge(
  name: "HCRS" | "EARTH_ICRF" | "MOON_ICRF",
  data: Pick<FrameData, "ephemeris">,
): FrameEdge {
  const { ephemeris } = data;
  const state = new Float64Array(6);
  const position =
    name === "HCRS"
      ? (i: Instant) => ephemeris.sun(i, state)
      : name === "EARTH_ICRF"
        ? (i: Instant) => ephemeris.earth(i, state)
        : (i: Instant) => ephemeris.moon(i, state);
  return (instant, out) => {
    toParentMatrix(IDENTITY, position(instant), out);
  };
}

/** MOON_ME from MOON_ICRF: the lunar PCK's mean-Earth / polar axes. */
export function moonMeEdge(data: Pick<FrameData, "ephemeris">): FrameEdge {
  const { ephemeris } = data;
  const rotation = new Float64Array(9);
  return (instant, out) => {
    toParentMatrix(ephemeris.moonMeanEarth(instant, rotation), undefined, out);
  };
}

/**
 * The GCRF to ITRF rotation's accuracy at `instant`: the Earth-orientation
 * sigma. UT1 error turns the Earth by `σ_t · ω` radians and polar motion
 * tilts its axis by `σ_p`; the edge states their root sum square in radians
 * (a point's error is this times its distance from the geocentre). Not
 * known outside the EOP table.
 */
export function itrfAccuracy(
  data: Pick<FrameData, "eop" | "leapSeconds">,
  instant: Instant,
): FrameAccuracy {
  const sigma = earthOrientationSigma({ data }, instant);
  if (sigma.degraded) {
    return {
      note: `not known: the instant is outside the EOP table (${sigma.span})`,
    };
  }
  const note = sigma.predicted
    ? `predicted Earth orientation, ${sigma.ageDays.toFixed(1)} days past the last observed row (IERS Bulletin A)`
    : "measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)";
  const radians = Math.hypot(
    sigma.ut1Seconds * EARTH_ROTATION_RATE,
    sigma.polarRadians,
  );
  return Number.isFinite(radians) && radians > 0
    ? {
        radians,
        note: `${note}. An angular bound: the Earth's spin (UT1) and the tilt of its axis (polar motion) combined, in radians; a point's error in metres is this times its distance from the geocentre`,
      }
    : { note: "not known: Earth orientation is not finite" };
}
