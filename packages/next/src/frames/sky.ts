import type { FrameData } from "../ephemeris/loadFrameData.ts";
import { celestialToTerrestrial } from "../time/earthOrientation.ts";
import { Instant } from "../time/Instant.ts";
import { analyticSky, turnSky, type SkyState } from "./skyAnalytic.ts";

export { createSkyState, type SkyState } from "./skyAnalytic.ts";

const sunState = new Float64Array(6);
const earthState = new Float64Array(6);
const moonState = new Float64Array(6);
const meanEarth = new Float64Array(9);
const icrfVector = new Float64Array(3);

/**
 * The sky at UTC `ms`, into `out`. With `data` and an instant inside its
 * span, the numbers are DE440's: the Sun geometric (apparent places are not
 * drawn), the Moon from the ephemeris and its mean-Earth axes from the lunar
 * PCK, all turned by one `celestialToTerrestrial` matrix (the frame tree's
 * ITRF). Otherwise the analytic models answer and `source` says so: drawing
 * falls back where measuring (frames, trajectories) throws, so scrubbing the
 * clock far from the data still shows a sky.
 */
export function skyState(
  ms: number,
  data: FrameData | undefined,
  out: SkyState,
): SkyState {
  if (!data) {
    return analyticSky(ms, out);
  }
  const instant = Instant.fromUtc(ms, data.leapSeconds);
  const { ephemeris } = data;
  if (!ephemeris.contains(instant)) {
    return analyticSky(ms, out);
  }
  celestialToTerrestrial(
    instant,
    data.eop.atInstant(instant, data.leapSeconds),
    out.icrfToFixed,
  );
  const sun = ephemeris.sun(instant, sunState);
  const earth = ephemeris.earth(instant, earthState);
  for (let i = 0; i < 3; i++) {
    icrfVector[i] = sun[i]! - earth[i]!;
  }
  return turnSky(
    icrfVector,
    ephemeris.moonFromEarth(instant, moonState),
    ephemeris.moonMeanEarth(instant, meanEarth),
    out,
  );
}
