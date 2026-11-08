import type { Vec3 } from "../math/vec3.ts";
import { icrfToFixed } from "./celestial.ts";

const DAY_MS = 86_400_000;
const deg = Math.PI / 180;

/** Julian date (UT) of a time in milliseconds since 1970 (UTC). */
export function julianDate(ms: number): number {
  return ms / DAY_MS + 2_440_587.5;
}

/**
 * Greenwich mean sidereal time, radians (IAU 1982, as 1.x's
 * `Transforms.computeTemeToPseudoFixedMatrix` uses).
 */
export function greenwichSiderealTime(ms: number): number {
  const d = julianDate(ms) - 2_451_545.0;
  const t = d / 36_525;
  const degrees =
    280.46061837 +
    360.98564736629 * d +
    0.000387933 * t * t -
    (t * t * t) / 38_710_000;
  return (((degrees % 360) + 360) % 360) * deg;
}

/**
 * The direction toward the sun from the Earth's center at a time, a unit
 * vector in Earth-fixed axes (the frame `Engine.sunDirection` uses): the
 * sun's apparent position by Meeus's low-precision algorithm
 * (Astronomical Algorithms, ch. 25; about 0.01°), turned to Earth-fixed
 * axes by the Greenwich sidereal time. Polar motion and the difference
 * between UT and TT (about a minute, 0.0007° of sun) are left out.
 *
 * 1.x computes the sun with Simon et al. (1994) and turns it with the IAU
 * 2006 model when its Earth-orientation data is loaded, else as here by
 * sidereal time; porting those for exact parity is a follow-up (plan
 * §13.13). Earth only: other bodies need their own ephemerides (§13.14).
 */
export function sunDirection(ms: number, out: Vec3): Vec3 {
  const n = julianDate(ms) - 2_451_545.0;
  const meanLongitude = (280.46 + 0.9856474 * n) * deg;
  const meanAnomaly = (357.528 + 0.9856003 * n) * deg;
  const longitude =
    meanLongitude +
    (1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * deg;
  const obliquity = (23.439 - 0.0000004 * n) * deg;
  // Equatorial (of date), then about the pole by sidereal time.
  const x = Math.cos(longitude);
  const y = Math.cos(obliquity) * Math.sin(longitude);
  const z = Math.sin(obliquity) * Math.sin(longitude);
  const theta = greenwichSiderealTime(ms);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  out[0] = c * x + s * y;
  out[1] = -s * x + c * y;
  out[2] = z;
  return out;
}

/** The astronomical unit, m (IAU 2012 Resolution B2). */
const AU = 149_597_870_700;

const fixedScratch = new Float64Array(9);

/**
 * The sun's center from the Earth's center at a time, metres, in the
 * celestial frame's axes (ICRF): `sunDirection`'s direction turned back by
 * `icrfToFixed(ms)ᵀ`, times the distance from the same low-precision
 * formula (R = 1.00014 - 0.01671 cos g - 0.00014 cos 2g au, g the mean
 * anomaly; Astronomical Almanac, section C). So `icrfToFixed(ms)` turns it
 * back onto `sunDirection` exactly, up to rounding.
 */
export function sunPosition(ms: number, out: Vec3): Vec3 {
  const n = julianDate(ms) - 2_451_545.0;
  const g = (357.528 + 0.9856003 * n) * deg;
  const r = (1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g)) * AU;
  const d = sunDirection(ms, scratch);
  const m = icrfToFixed(ms, fixedScratch);
  const x = d[0]!;
  const y = d[1]!;
  const z = d[2]!;
  // icrf = Mᵀ · fixed for the row-major M.
  for (let i = 0; i < 3; i++) {
    out[i] = r * (m[i]! * x + m[3 + i]! * y + m[6 + i]! * z);
  }
  return out;
}

/**
 * The sun's elevation above the horizon at a place (geodetic longitude
 * and latitude, radians), radians: its direction's angle with the
 * ellipsoid's normal there (no refraction).
 */
export function sunElevation(
  ms: number,
  longitude: number,
  latitude: number,
): number {
  const sun = sunDirection(ms, scratch);
  const cl = Math.cos(latitude);
  const up0 = cl * Math.cos(longitude);
  const up1 = cl * Math.sin(longitude);
  const up2 = Math.sin(latitude);
  return Math.asin(
    Math.max(-1, Math.min(1, sun[0]! * up0 + sun[1]! * up1 + sun[2]! * up2)),
  );
}

/** Sunrise, solar noon and sunset in a day, ms (undefined: none). */
export interface SunTimes {
  sunrise?: number;
  noon: number;
  sunset?: number;
}

/**
 * Sunrise, solar noon and sunset between `start` and `start` + 24 h at a
 * place: the sun's center crossing the horizon (no refraction or disk:
 * a few minutes from almanac times) and its highest point, found by
 * sampling every 10 minutes, then bisecting (crossings) or a ternary
 * search (noon).
 */
export function sunTimes(
  start: number,
  longitude: number,
  latitude: number,
): SunTimes {
  const step = 10 * 60_000;
  const elevation = (t: number) => sunElevation(t, longitude, latitude);
  const cross = (a: number, b: number) => {
    for (let i = 0; i < 20; i++) {
      const m = (a + b) / 2;
      if (Math.sign(elevation(m)) === Math.sign(elevation(a))) {
        a = m;
      } else {
        b = m;
      }
    }
    return (a + b) / 2;
  };
  const times: SunTimes = { noon: start };
  let best = -Infinity;
  let previous = elevation(start);
  for (let t = start + step; t <= start + DAY_MS; t += step) {
    const e = elevation(t);
    if (e > best) {
      best = e;
      times.noon = t;
    }
    if (previous < 0 && e >= 0 && times.sunrise === undefined) {
      times.sunrise = cross(t - step, t);
    } else if (previous >= 0 && e < 0 && times.sunset === undefined) {
      times.sunset = cross(t - step, t);
    }
    previous = e;
  }
  // The highest sample is within a step of noon: narrow it down.
  let a = times.noon - step;
  let b = times.noon + step;
  for (let i = 0; i < 30; i++) {
    const m1 = a + (b - a) / 3;
    const m2 = b - (b - a) / 3;
    if (elevation(m1) < elevation(m2)) {
      a = m1;
    } else {
      b = m2;
    }
  }
  times.noon = (a + b) / 2;
  return times;
}

const scratch = new Float64Array(3);
