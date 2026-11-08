// The built-in tree's precise edges, one per reference frame: `createFrames`
// and the catalog's providers both build on these, so the two trees agree to
// the bit (plan 5a's call 13). Each edge writes its reference frame's
// child-to-parent matrix for an instant. ITRF's edge, which pulls the IAU
// 2006/2000A series, lives in `itrfEdge.ts`. It is not re-exported here: a
// re-export would put the series in the ephemeris provider's chunk too.
import type { FrameData } from "../ephemeris/loadFrameData.ts";
import { C, GM_MOON, GM_SUN, L_C } from "../math/constants.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Instant } from "../time/Instant.ts";
import type { FrameAccuracy } from "./frameAccuracy.ts";
import { toParentMatrix } from "./matrix.ts";

/** A reference frame's edge: writes its child-to-parent matrix at `instant`. */
export type FrameEdge = (instant: Instant, out: Mat4) => void;

/** A precise edge and its stated accuracy, fixed or by instant. */
export interface PreciseEdge {
  readonly toParent: FrameEdge;
  readonly accuracy:
    Readonly<FrameAccuracy> | ((instant: Instant) => Readonly<FrameAccuracy>);
  /**
   * Whether the data covers `instant`. Outside it `toParent` throws, and
   * the catalog throws `FrameUnavailableError` (`"outsideData"`) instead.
   */
  readonly covers: (instant: Instant) => boolean;
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
