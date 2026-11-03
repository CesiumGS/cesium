import { julianDate } from "./sun.ts";

const deg = Math.PI / 180;
const arcsecond = deg / 3600;

/** The Moon's mean radius, meters (IAU). */
export const MOON_RADIUS = 1_737_400;

/**
 * The Moon's geometric albedo (V): its full disk's brightness as a share
 * of a white Lambertian disk's in the same light.
 */
export const MOON_ALBEDO = 0.12;

/**
 * Terrestrial time's lead on UTC, ms (32.184 s plus 37 leap seconds, as of
 * 2017): the ephemeris runs on dynamical time.
 */
const TT_MINUS_UTC = 69_184;

/**
 * The Moon's center at a time, meters from the Earth's center in the
 * celestial frame (ICRF): Simon et al. (1994) §4, mean elements with their
 * main periodic terms, as 1.x's `Simon1994PlanetaryPositions` computes it
 * (`computeMoonPositionInEarthInertialFrame`), within about 0.05° and 0.1%
 * of distance (tests: Meeus's example 47.a). Turn it to Earth-fixed axes
 * with `icrfToFixed`.
 */
export function moonPosition(
  ms: number,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  const t = (julianDate(ms + TT_MINUS_UTC) - 2_451_545.0) / 36_525;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;

  // §3.4 (b.1): mean elements, then their periodic terms (tables 4, 5).
  let semimajorAxis = 383_397.7725 + 0.004 * t;
  let eccentricity = 0.055545526 - 0.000000016 * t;
  let inclination =
    -0.00008 * t + 0.02966 * t2 - 0.000042 * t3 - 0.00000013 * t4;
  let perigee =
    14_643_420.2669 * t - 38.2702 * t2 - 0.045047 * t3 + 0.00021301 * t4;
  let node =
    -6_967_919.3631 * t + 6.3602 * t2 + 0.007625 * t3 - 0.00003586 * t4;
  let meanLongitude =
    1_732_559_343.4847 * t - 6.391 * t2 + 0.006588 * t3 - 0.00003169 * t4;

  // Delaunay arguments (§3.5 b).
  const D =
    297.85019547 * deg +
    arcsecond *
      (1_602_961_601.209 * t - 6.3706 * t2 + 0.006593 * t3 - 0.00003169 * t4);
  const F =
    93.27209062 * deg +
    arcsecond *
      (1_739_527_262.8478 * t - 12.7512 * t2 - 0.001037 * t3 + 0.00000417 * t4);
  const l =
    134.96340251 * deg +
    arcsecond *
      (1_717_915_923.2178 * t + 31.8792 * t2 + 0.051635 * t3 - 0.0002447 * t4);
  const lp =
    357.52910918 * deg +
    arcsecond *
      (129_596_581.0481 * t - 0.5532 * t2 + 0.000136 * t3 - 0.00001149 * t4);
  const psi =
    310.17137918 * deg -
    arcsecond *
      (6_967_051.436 * t + 6.2068 * t2 + 0.007618 * t3 - 0.00003219 * t4);

  const D2 = 2 * D;
  const D4 = 4 * D;
  const D6 = 6 * D;
  const l2 = 2 * l;
  const l3 = 3 * l;
  const l4 = 4 * l;
  const F2 = 2 * F;
  const { cos, sin } = Math;
  semimajorAxis +=
    3400.4 * cos(D2) -
    635.6 * cos(D2 - l) -
    235.6 * cos(l) +
    218.1 * cos(D2 - lp) +
    181.0 * cos(D2 + l);
  eccentricity +=
    0.014216 * cos(D2 - l) +
    0.008551 * cos(D2 - l2) -
    0.001383 * cos(l) +
    0.001356 * cos(D2 + l) -
    0.001147 * cos(D4 - l3) -
    0.000914 * cos(D4 - l2) +
    0.000869 * cos(D2 - lp - l) -
    0.000627 * cos(D2) -
    0.000394 * cos(D4 - l4) +
    0.000282 * cos(D2 - lp - l2) -
    0.000279 * cos(D - l) -
    0.000236 * cos(l2) +
    0.000231 * cos(D4) +
    0.000229 * cos(D6 - l4) -
    0.000201 * cos(l2 - F2);
  inclination +=
    486.26 * cos(D2 - F2) -
    40.13 * cos(D2) +
    37.51 * cos(F2) +
    25.73 * cos(l2 - F2) +
    19.97 * cos(D2 - lp - F2);
  perigee +=
    -55609 * sin(D2 - l) -
    34711 * sin(D2 - l2) -
    9792 * sin(l) +
    9385 * sin(D4 - l3) +
    7505 * sin(D4 - l2) +
    5318 * sin(D2 + l) +
    3484 * sin(D4 - l4) -
    3417 * sin(D2 - lp - l) -
    2530 * sin(D6 - l4) -
    2376 * sin(D2) -
    2075 * sin(D2 - l3) -
    1883 * sin(l2) -
    1736 * sin(D6 - 5 * l) +
    1626 * sin(lp) -
    1370 * sin(D6 - l3);
  node +=
    -5392 * sin(D2 - F2) -
    540 * sin(lp) -
    441 * sin(D2) +
    423 * sin(F2) -
    288 * sin(l2 - F2);
  meanLongitude +=
    -3332.9 * sin(D2) +
    1197.4 * sin(D2 - l) -
    662.5 * sin(lp) +
    396.3 * sin(l) -
    218.0 * sin(D2 - lp);
  const psi2 = 2 * psi;
  const psi3 = 3 * psi;
  inclination +=
    46.997 * cos(psi) * t -
    0.614 * cos(D2 - F2 + psi) * t +
    0.614 * cos(D2 - F2 - psi) * t -
    0.0297 * cos(psi2) * t2 -
    0.0335 * cos(psi) * t2 +
    0.0012 * cos(D2 - F2 + psi2) * t2 -
    0.00016 * cos(psi) * t3 +
    0.00004 * cos(psi3) * t3 +
    0.00004 * cos(psi2) * t3;
  const both =
    2.116 * sin(psi) * t -
    0.111 * sin(D2 - F2 - psi) * t -
    0.0015 * sin(psi) * t2;
  perigee += both;
  meanLongitude += both;
  node +=
    -520.77 * sin(psi) * t +
    13.66 * sin(D2 - F2 + psi) * t +
    1.12 * sin(D2 - psi) * t -
    1.06 * sin(F2 - psi) * t +
    0.66 * sin(psi2) * t2 +
    0.371 * sin(psi) * t2 -
    0.035 * sin(D2 - F2 + psi2) * t2 -
    0.015 * sin(D2 - F2 + psi) * t2 +
    0.0014 * sin(psi) * t3 -
    0.0011 * sin(psi3) * t3 -
    0.0009 * sin(psi2) * t3;

  const a = semimajorAxis * 1000;
  const i = 5.15668983 * deg + inclination * arcsecond;
  const varpi = 83.35324312 * deg + perigee * arcsecond;
  const omega = 125.04455501 * deg + node * arcsecond;
  const lambda = 218.31664563 * deg + meanLongitude * arcsecond;

  // Kepler's equation for the eccentric anomaly (Newton), then the orbit's
  // plane turned into the ecliptic (J2000).
  const e = eccentricity;
  const M = lambda - varpi;
  let E = M + e * sin(M);
  for (let k = 0; k < 8; k++) {
    E -= (E - e * sin(E) - M) / (1 - e * cos(E));
  }
  const x = a * (cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * sin(E);
  const w = varpi - omega; // argument of perigee
  const cw = cos(w);
  const sw = sin(w);
  const ci = cos(i);
  const si = sin(i);
  const cn = cos(omega);
  const sn = sin(omega);
  const ex = (cn * cw - sn * sw * ci) * x + (-cn * sw - sn * cw * ci) * y;
  const ey = (sn * cw + cn * sw * ci) * x + (-sn * sw + cn * cw * ci) * y;
  const ez = sw * si * x + cw * si * y;
  // The ecliptic to the equator (J2000 obliquity, 23.4392911°).
  const ce = 0.9174820620691819;
  const se = 0.39777715593191376;
  out[0] = ex;
  out[1] = ce * ey - se * ez;
  out[2] = se * ey + ce * ez;
  return out;
}

/**
 * The Moon's brightness at phase angle `alpha` (radians, at the Moon
 * between the sun and the observer; 0 full) as a share of full: Allen's
 * magnitudes, 0.026° per degree plus 4 × 10⁻⁹ of its fourth power (the
 * opposition surge and the rough surface's shadows make a half moon a
 * tenth of a full one, not a half).
 */
export function moonPhaseBrightness(alpha: number): number {
  const a = Math.min(Math.abs(alpha), Math.PI) / deg;
  return 10 ** (-0.4 * (0.026 * a + 4e-9 * a ** 4));
}

/**
 * The Lommel-Seeliger disk's brightness at phase angle `alpha` as a share
 * of full: 1 − sin(α/2) tan(α/2) ln cot(α/4). A disk whose radiance goes
 * as 2μ₀/(μ₀ + μ) (flat at full, as the Moon looks) sums to this; the
 * sky's disk divides it out so the Moon's total follows Allen's.
 */
export function lommelSeeliger(alpha: number): number {
  const a = Math.min(Math.abs(alpha), Math.PI - 1e-3);
  if (a < 1e-6) {
    return 1;
  }
  return 1 - Math.sin(a / 2) * Math.tan(a / 2) * Math.log(1 / Math.tan(a / 4));
}
