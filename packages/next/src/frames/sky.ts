import type { FrameData } from "../ephemeris/loadFrameData.ts";
import { icrfToFixed } from "../time/celestial.ts";
import { celestialToTerrestrial } from "../time/earthOrientation.ts";
import { Instant } from "../time/Instant.ts";
import { moonAxes, moonPosition } from "../time/moon.ts";
import { sunDirection } from "../time/sun.ts";

/**
 * The sky at a time, in Earth-fixed axes: what the engine draws the stars,
 * the Moon and the sun's light from.
 */
export interface SkyState {
  /** The celestial frame's rotation to Earth-fixed axes (row-major 3 × 3). */
  icrfToFixed: Float64Array;
  /** Unit vector toward the Sun's center. */
  sunDirection: Float64Array;
  /** The Moon's center, meters from the Earth's center. */
  moonPosition: Float64Array;
  /**
   * The Moon's axes: `[0..2]` toward its mean-Earth longitude and latitude 0,
   * `[3..5]` its north pole.
   */
  moonAxes: Float64Array;
  /**
   * Where the numbers came from: DE440 and the IAU 2006/2000A rotation
   * (`"ephemeris"`), or the analytic models (`"analytic"`: no data, or the
   * instant lies outside the data's span).
   */
  source: "ephemeris" | "analytic";
}

/** An empty `SkyState` for `skyState` to fill. */
export function createSkyState(): SkyState {
  return {
    icrfToFixed: new Float64Array(9),
    sunDirection: new Float64Array(3),
    moonPosition: new Float64Array(3),
    moonAxes: new Float64Array(6),
    source: "analytic",
  };
}

const sunState = new Float64Array(6);
const earthState = new Float64Array(6);
const moonState = new Float64Array(6);
const meanEarth = new Float64Array(9);
const icrfVector = new Float64Array(3);
const moonAxesIcrf = new Float64Array(6);

/** `out[o..o+2] = m · v[p..p+2]` for a row-major 3 × 3 `m`. */
function turn(
  m: ArrayLike<number>,
  v: ArrayLike<number>,
  p: number,
  out: Float64Array,
  o: number,
): void {
  const x = v[p]!;
  const y = v[p + 1]!;
  const z = v[p + 2]!;
  for (let i = 0; i < 3; i++) {
    out[o + i] = m[i * 3]! * x + m[i * 3 + 1]! * y + m[i * 3 + 2]! * z;
  }
}

/** The analytic sky: Meeus's sun, Simon's Moon, precession and sidereal time. */
function analytic(ms: number, out: SkyState): SkyState {
  const m = icrfToFixed(ms, out.icrfToFixed);
  sunDirection(ms, out.sunDirection);
  turn(m, moonPosition(ms, icrfVector), 0, out.moonPosition, 0);
  const a = moonAxes(ms, moonAxesIcrf);
  turn(m, a, 0, out.moonAxes, 0);
  turn(m, a, 3, out.moonAxes, 3);
  out.source = "analytic";
  return out;
}

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
    return analytic(ms, out);
  }
  const instant = Instant.fromUtc(ms, data.leapSeconds);
  const { ephemeris } = data;
  if (!ephemeris.contains(instant)) {
    return analytic(ms, out);
  }
  const r = celestialToTerrestrial(
    instant,
    data.eop.atInstant(instant, data.leapSeconds),
    out.icrfToFixed,
  );
  const sun = ephemeris.sun(instant, sunState);
  const earth = ephemeris.earth(instant, earthState);
  for (let i = 0; i < 3; i++) {
    icrfVector[i] = sun[i]! - earth[i]!;
  }
  turn(r, icrfVector, 0, out.sunDirection, 0);
  const d = Math.hypot(
    out.sunDirection[0]!,
    out.sunDirection[1]!,
    out.sunDirection[2]!,
  );
  for (let i = 0; i < 3; i++) {
    out.sunDirection[i] = out.sunDirection[i]! / d;
  }
  turn(r, ephemeris.moonFromEarth(instant, moonState), 0, out.moonPosition, 0);
  // Rows 0 and 2 of the row-major ICRF -> ME rotation are the ME x axis and
  // pole in ICRF.
  const me = ephemeris.moonMeanEarth(instant, meanEarth);
  turn(r, me, 0, out.moonAxes, 0);
  turn(r, me, 6, out.moonAxes, 3);
  out.source = "ephemeris";
  return out;
}
