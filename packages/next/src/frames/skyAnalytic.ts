// The sky's analytic models and the arithmetic that turns the sky's parts
// into Earth-fixed axes. Apart from `sky.ts` so that what imports it
// (`attachSky`, the Viewer) doesn't reach the IAU 2006/2000A series that
// `skyState`'s data branch pulls (plan 5a's call 32 and ruling 6).
import { icrfToFixed } from "../time/celestial.ts";
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

/**
 * The analytic sky at UTC `ms`, into `out`: Meeus's sun, Simon's Moon, the
 * IAU rotation model's lunar axes, and `icrfToFixed`'s precession and
 * sidereal time. It loads nothing. `skyState(ms, undefined, out)` is this.
 */
export function analyticSky(ms: number, out: SkyState): SkyState {
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
 * @internal The sky from its parts in ICRF axes, turned to Earth-fixed axes
 * by `out.icrfToFixed` (set first): the Sun from the Earth's centre (any
 * length), the Moon from the Earth's centre (metres) and the row-major
 * ICRF to mean-Earth rotation. Sets `source` to `"ephemeris"`. `skyState`
 * and `attachSky` share it, so their arithmetic is the same.
 */
export function turnSky(
  sunFromEarth: ArrayLike<number>,
  moonFromEarth: ArrayLike<number>,
  meanEarthRows: ArrayLike<number>,
  out: SkyState,
): SkyState {
  const r = out.icrfToFixed;
  turn(r, sunFromEarth, 0, out.sunDirection, 0);
  const d = Math.hypot(
    out.sunDirection[0]!,
    out.sunDirection[1]!,
    out.sunDirection[2]!,
  );
  for (let i = 0; i < 3; i++) {
    out.sunDirection[i] = out.sunDirection[i]! / d;
  }
  turn(r, moonFromEarth, 0, out.moonPosition, 0);
  // Rows 0 and 2 of the row-major ICRF -> ME rotation are the ME x axis and
  // pole in ICRF.
  turn(r, meanEarthRows, 0, out.moonAxes, 0);
  turn(r, meanEarthRows, 6, out.moonAxes, 3);
  out.source = "ephemeris";
  return out;
}
