import { Ellipsoid } from "../math/ellipsoid.ts";
import { julianDate } from "./sun.ts";

const deg = Math.PI / 180;
const arcsecond = deg / 3600;

/** The Moon's mean radius, meters (IAU): `Ellipsoid.MOON`'s. */
export const MOON_RADIUS = Ellipsoid.MOON.maximumRadius;

/**
 * Terrestrial time's lead on UTC, ms (32.184 s plus 37 leap seconds, as of
 * 2017): the ephemeris runs on dynamical time.
 */
const TT_MINUS_UTC = 69_184;

/**
 * Meeus's table 47.A (ELP-2000/82, Chapront-Touzé and Chapront, truncated):
 * multiples of D, M, M′ and F, then the longitude's sine coefficient
 * (10⁻⁶ degree) and the distance's cosine coefficient (meters).
 */
// prettier-ignore
const LONGITUDE_DISTANCE = [
  0, 0, 1, 0, 6288774, -20905355,
  2, 0, -1, 0, 1274027, -3699111,
  2, 0, 0, 0, 658314, -2955968,
  0, 0, 2, 0, 213618, -569925,
  0, 1, 0, 0, -185116, 48888,
  0, 0, 0, 2, -114332, -3149,
  2, 0, -2, 0, 58793, 246158,
  2, -1, -1, 0, 57066, -152138,
  2, 0, 1, 0, 53322, -170733,
  2, -1, 0, 0, 45758, -204586,
  0, 1, -1, 0, -40923, -129620,
  1, 0, 0, 0, -34720, 108743,
  0, 1, 1, 0, -30383, 104755,
  2, 0, 0, -2, 15327, 10321,
  0, 0, 1, 2, -12528, 0,
  0, 0, 1, -2, 10980, 79661,
  4, 0, -1, 0, 10675, -34782,
  0, 0, 3, 0, 10034, -23210,
  4, 0, -2, 0, 8548, -21636,
  2, 1, -1, 0, -7888, 24208,
  2, 1, 0, 0, -6766, 30824,
  1, 0, -1, 0, -5163, -8379,
  1, 1, 0, 0, 4987, -16675,
  2, -1, 1, 0, 4036, -12831,
  2, 0, 2, 0, 3994, -10445,
  4, 0, 0, 0, 3861, -11650,
  2, 0, -3, 0, 3665, 14403,
  0, 1, -2, 0, -2689, -7003,
  2, 0, -1, 2, -2602, 0,
  2, -1, -2, 0, 2390, 10056,
  1, 0, 1, 0, -2348, 6322,
  2, -2, 0, 0, 2236, -9884,
  0, 1, 2, 0, -2120, 5751,
  0, 2, 0, 0, -2069, 0,
  2, -2, -1, 0, 2048, -4950,
  2, 0, 1, -2, -1773, 4130,
  2, 0, 0, 2, -1595, 0,
  4, -1, -1, 0, 1215, -3958,
  0, 0, 2, 2, -1110, 0,
  3, 0, -1, 0, -892, 3258,
  2, 1, 1, 0, -810, 2616,
  4, -1, -2, 0, 759, -1897,
  0, 2, -1, 0, -713, -2117,
  2, 2, -1, 0, -700, 2354,
  2, 1, -2, 0, 691, 0,
  2, -1, 0, -2, 596, 0,
  4, 0, 1, 0, 549, -1423,
  0, 0, 4, 0, 537, -1117,
  4, -1, 0, 0, 520, -1571,
  1, 0, -2, 0, -487, -1739,
  2, 1, 0, -2, -399, 0,
  0, 0, 2, -2, -381, -4421,
  1, 1, 1, 0, 351, 0,
  3, 0, -2, 0, -340, 0,
  4, 0, -3, 0, 330, 0,
  2, -1, 2, 0, 327, 0,
  0, 2, 1, 0, -323, 1165,
  1, 1, -1, 0, 299, 0,
  2, 0, 3, 0, 294, 0,
  2, 0, -1, -2, 0, 8752,
];

/**
 * Meeus's table 47.B: multiples of D, M, M′ and F, then the latitude's sine
 * coefficient (10⁻⁶ degree).
 */
// prettier-ignore
const LATITUDE = [
  0, 0, 0, 1, 5128122,
  0, 0, 1, 1, 280602,
  0, 0, 1, -1, 277693,
  2, 0, 0, -1, 173237,
  2, 0, -1, 1, 55413,
  2, 0, -1, -1, 46271,
  2, 0, 0, 1, 32573,
  0, 0, 2, 1, 17198,
  2, 0, 1, -1, 9266,
  0, 0, 2, -1, 8822,
  2, -1, 0, -1, 8216,
  2, 0, -2, -1, 4324,
  2, 0, 1, 1, 4200,
  2, 1, 0, -1, -3359,
  2, -1, -1, 1, 2463,
  2, -1, 0, 1, 2211,
  2, -1, -1, -1, 2065,
  0, 1, -1, -1, -1870,
  4, 0, -1, -1, 1828,
  0, 1, 0, 1, -1794,
  0, 0, 0, 3, -1749,
  0, 1, -1, 1, -1565,
  1, 0, 0, 1, -1491,
  0, 1, 1, 1, -1475,
  0, 1, 1, -1, -1410,
  0, 1, 0, -1, -1344,
  1, 0, 0, -1, -1335,
  0, 0, 3, 1, 1107,
  4, 0, 0, -1, 1021,
  4, 0, -1, 1, 833,
  0, 0, 1, -3, 777,
  4, 0, -2, 1, 671,
  2, 0, 0, -3, 607,
  2, 0, 2, -1, 596,
  2, -1, 1, -1, 491,
  2, 0, -2, 1, -451,
  0, 0, 3, -1, 439,
  2, 0, 2, 1, 422,
  2, 0, -3, -1, 421,
  2, 1, -1, 1, -366,
  2, 1, 0, 1, -351,
  4, 0, 0, 1, 331,
  2, -1, 1, 1, 315,
  2, -2, 0, -1, 302,
  0, 0, 1, 3, -283,
  2, 1, 1, -1, -229,
  1, 1, 0, -1, 223,
  1, 1, 0, 1, 223,
  0, 1, -2, -1, -220,
  2, 1, -1, -1, -220,
  1, 0, 1, 1, -185,
  2, -1, -2, -1, 181,
  0, 1, 2, 1, -177,
  4, 0, -2, -1, 176,
  4, -1, -1, -1, 166,
  1, 0, 1, -1, -164,
  4, 0, 1, -1, 132,
  1, 0, -1, -1, -119,
  4, -1, 0, -1, 115,
  2, -2, 0, 1, 107,
];

/**
 * The Moon's geocentric ecliptic longitude and latitude (radians) and
 * distance (meters), of the mean ecliptic and equinox of the date, at
 * Julian centuries `t` of dynamical time from J2000: Meeus's chapter 47
 * (Astronomical Algorithms, 2nd ed.), the main periodic terms of
 * ELP-2000/82, without nutation.
 */
export function moonEcliptic(t: number): {
  longitude: number;
  latitude: number;
  distance: number;
} {
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  // Mean longitude, elongation, the Sun's and the Moon's mean anomalies,
  // the argument of latitude (degrees).
  const Lp =
    218.3164477 +
    481267.88123421 * t -
    0.0015786 * t2 +
    t3 / 538841 -
    t4 / 65194000;
  const D =
    (297.8501921 +
      445267.1114034 * t -
      0.0018819 * t2 +
      t3 / 545868 -
      t4 / 113065000) *
    deg;
  const M =
    (357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000) * deg;
  const Mp =
    (134.9633964 +
      477198.8675055 * t +
      0.0087414 * t2 +
      t3 / 69699 -
      t4 / 14712000) *
    deg;
  const F =
    (93.272095 +
      483202.0175233 * t -
      0.0036539 * t2 -
      t3 / 3526000 +
      t4 / 863310000) *
    deg;
  // Venus, Jupiter and the Earth's flattening.
  const A1 = (119.75 + 131.849 * t) * deg;
  const A2 = (53.09 + 479264.29 * t) * deg;
  const A3 = (313.45 + 481266.484 * t) * deg;
  // The Earth's orbit's decreasing eccentricity scales the terms in M.
  const E = 1 - 0.002516 * t - 0.0000074 * t2;
  const E2 = E * E;
  const { sin, cos } = Math;
  let sl = 0;
  let sr = 0;
  for (let k = 0; k < LONGITUDE_DISTANCE.length; k += 6) {
    const m = LONGITUDE_DISTANCE[k + 1]!;
    const a =
      LONGITUDE_DISTANCE[k]! * D +
      m * M +
      LONGITUDE_DISTANCE[k + 2]! * Mp +
      LONGITUDE_DISTANCE[k + 3]! * F;
    const e = m === 0 ? 1 : m === 1 || m === -1 ? E : E2;
    sl += e * LONGITUDE_DISTANCE[k + 4]! * sin(a);
    sr += e * LONGITUDE_DISTANCE[k + 5]! * cos(a);
  }
  let sb = 0;
  for (let k = 0; k < LATITUDE.length; k += 5) {
    const m = LATITUDE[k + 1]!;
    const a =
      LATITUDE[k]! * D + m * M + LATITUDE[k + 2]! * Mp + LATITUDE[k + 3]! * F;
    const e = m === 0 ? 1 : m === 1 || m === -1 ? E : E2;
    sb += e * LATITUDE[k + 4]! * sin(a);
  }
  const L = Lp * deg;
  sl += 3958 * sin(A1) + 1962 * sin(L - F) + 318 * sin(A2);
  sb +=
    -2235 * sin(L) +
    382 * sin(A3) +
    175 * sin(A1 - F) +
    175 * sin(A1 + F) +
    127 * sin(L - Mp) -
    115 * sin(L + Mp);
  return {
    longitude: (Lp + sl / 1e6) * deg,
    latitude: (sb / 1e6) * deg,
    distance: 385_000_560 + sr,
  };
}

/**
 * The Moon's center at a time, meters from the Earth's center in the
 * celestial frame (ICRF): Meeus's chapter 47, the main periodic terms of
 * the ELP-2000/82 lunar theory (`moonEcliptic`), turned from the ecliptic
 * and equinox of the date to the J2000 equator by the mean obliquity and
 * precession (IAU 1976). Against DE440 it is within 16″ of direction and
 * 27 km, sampled daily over 2000 to 2050 (test/data/frameCatalog.test.ts);
 * the series it replaced (Simon et al. 1994's main terms, as 1.x's
 * `Simon1994PlanetaryPositions`) was up to 0.31° (2,051 km) off. Turn it to
 * Earth-fixed axes with `icrfToFixed`.
 */
export function moonPosition(
  ms: number,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  const t = (julianDate(ms + TT_MINUS_UTC) - 2_451_545.0) / 36_525;
  const { longitude, latitude, distance } = moonEcliptic(t);
  const { sin, cos } = Math;
  // The ecliptic of the date, then its equator (the mean obliquity, IAU
  // 1976: 23°26′21.448″ at J2000).
  const cb = cos(latitude);
  const x = distance * cb * cos(longitude);
  const y0 = distance * cb * sin(longitude);
  const z0 = distance * sin(latitude);
  const epsilon =
    (84381.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t * t * t) *
    arcsecond;
  const ce = cos(epsilon);
  const se = sin(epsilon);
  const y = ce * y0 - se * z0;
  const z = se * y0 + ce * z0;
  // Precession back to J2000 (IAU 1976, as `icrfToFixed`): J2000 =
  // R3(ζ) · R2(−θ) · R3(z) · of date.
  const zeta =
    (2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) * arcsecond;
  const zz =
    (2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) * arcsecond;
  const theta =
    (2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) * arcsecond;
  const cz = cos(zz);
  const sz = sin(zz);
  const x1 = cz * x + sz * y;
  const y1 = -sz * x + cz * y;
  const ct = cos(theta);
  const st = sin(theta);
  const x2 = ct * x1 + st * z;
  const z2 = -st * x1 + ct * z;
  const cs = cos(zeta);
  const ss = sin(zeta);
  out[0] = cs * x2 + ss * y1;
  out[1] = -ss * x2 + cs * y1;
  out[2] = z2;
  return out;
}

/**
 * The Moon's axes at a time in the celestial frame (ICRF), unit vectors:
 * `out[0..2]` toward selenographic longitude and latitude 0 (the near
 * side's center), `out[3..5]` its north pole. The IAU rotation model
 * (Archinal et al. 2011, "Report of the IAU Working Group on Cartographic
 * Coordinates and Rotational Elements: 2009", table 2; 1.x's
 * `Iau2000Orientation.ComputeMoon`): the pole's right ascension and
 * declination and the prime meridian's angle with their periodic terms,
 * the mean-Earth frame within about 0.01°. The face toward the Earth
 * wobbles by up to 8° (libration): the Moon turns evenly on its orbit's
 * uneven pace, its equator tilted to the orbit. Turn it to Earth-fixed
 * axes with `icrfToFixed`.
 */
export function moonAxes(
  ms: number,
  out: Float64Array = new Float64Array(6),
): Float64Array {
  const d = julianDate(ms + TT_MINUS_UTC) - 2_451_545.0;
  const t = d / 36_525;
  const e = (base: number, rate: number) => (base + rate * d) * deg;
  const E1 = e(125.045, -0.0529921);
  const E2 = e(250.089, -0.1059842);
  const E3 = e(260.008, 13.0120009);
  const E4 = e(176.625, 13.3407154);
  const E5 = e(357.529, 0.9856003);
  const E6 = e(311.589, 26.4057084);
  const E7 = e(134.963, 13.064993);
  const E8 = e(276.617, 0.3287146);
  const E9 = e(34.226, 1.7484877);
  const E10 = e(15.134, -0.1589763);
  const E11 = e(119.743, 0.0036096);
  const E12 = e(239.961, 0.1643573);
  const E13 = e(25.053, 12.9590088);
  const { sin, cos } = Math;
  const alpha =
    (269.9949 +
      0.0031 * t -
      3.8787 * sin(E1) -
      0.1204 * sin(E2) +
      0.07 * sin(E3) -
      0.0172 * sin(E4) +
      0.0072 * sin(E6) -
      0.0052 * sin(E10) +
      0.0043 * sin(E13)) *
    deg;
  const delta =
    (66.5392 +
      0.013 * t +
      1.5419 * cos(E1) +
      0.0239 * cos(E2) -
      0.0278 * cos(E3) +
      0.0068 * cos(E4) -
      0.0029 * cos(E6) +
      0.0009 * cos(E7) +
      0.0008 * cos(E10) -
      0.0009 * cos(E13)) *
    deg;
  const w =
    (38.3213 +
      13.17635815 * d -
      1.4e-12 * d * d +
      3.561 * sin(E1) +
      0.1208 * sin(E2) -
      0.0642 * sin(E3) +
      0.0158 * sin(E4) +
      0.0252 * sin(E5) -
      0.0066 * sin(E6) -
      0.0047 * sin(E7) -
      0.0046 * sin(E8) +
      0.0028 * sin(E9) +
      0.0052 * sin(E10) +
      0.004 * sin(E11) +
      0.0019 * sin(E12) -
      0.0044 * sin(E13)) *
    deg;
  // The prime meridian, `w` along the Moon's equator from where it rises
  // through the celestial equator (the node, α + 90°).
  const sa = sin(alpha);
  const ca = cos(alpha);
  const sd = sin(delta);
  const cd = cos(delta);
  const cw = cos(w);
  const sw = sin(w);
  out[0] = -sa * cw - sd * ca * sw;
  out[1] = ca * cw - sd * sa * sw;
  out[2] = cd * sw;
  out[3] = cd * ca;
  out[4] = cd * sa;
  out[5] = sd;
  return out;
}
