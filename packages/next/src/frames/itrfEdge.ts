// ITRF's precise edge from GCRF and its accuracy: IAU 2006/2000A and the
// EOP. Apart from `edges.ts` because it pulls the X, Y and s series: only
// the Earth orientation provider and `createFrames` load it.
import type { FrameData } from "../ephemeris/loadFrameData.ts";
import { EARTH_ROTATION_RATE } from "../math/constants.ts";
import { celestialToTerrestrial } from "../time/earthOrientation.ts";
import type { Instant } from "../time/Instant.ts";
import type { FrameEdge } from "./edges.ts";
import type { FrameAccuracy } from "./frameAccuracy.ts";
import { toParentMatrix } from "./matrix.ts";
import { earthOrientationSigma } from "./orientationSigma.ts";

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
