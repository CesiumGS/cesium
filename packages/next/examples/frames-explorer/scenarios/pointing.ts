// Looking up from a site on the Earth (Task 6b): the azimuth and elevation
// of a direction in the site's east-north-up frame, the compass point, and
// the same pointing worked out by hand from the frame tree's own vectors
// (R11): the light time solved by iteration, then stellar aberration by the
// site's barycentric velocity, the textbook way, rotated into the site's
// axes. The dish and the Moon scenarios check `measure`'s apparent direction
// against it; the difference from the geometric direction is the effect.
import { DEG_PER_RAD, EARTH_MEAN_RADIUS } from "../units.ts";
import { type Frame, frameTransform } from "../../../src/frames/Frame.ts";
import type { Frames } from "../../../src/frames/frames.ts";
import { rotationPart } from "../../../src/frames/matrix.ts";
import { C, EARTH_ROTATION_RATE } from "../../../src/measure/constants.ts";
import { Instant } from "../../../src/time/Instant.ts";

/**
 * Within this of the horizon (degrees) a hand check leaves the Earth's
 * verdict to the library: the hand geometry's own slack, before the
 * horizon's dip (the final review, finding 4: one rule for the dish and the
 * capstone).
 */
export const HORIZON_GREY = 0.1;

/**
 * The hand check's grey band at an end `h` m above the ellipsoid or its own
 * ground (degrees): `HORIZON_GREY` plus the horizon's dip √(2h/R). The dish
 * at about 690 m gets about 0.94°; a ship's mast at 25 m about 0.26°.
 */
export const horizonGrey = (h: number): number =>
  HORIZON_GREY +
  Math.sqrt((2 * Math.max(h, 0)) / EARTH_MEAN_RADIUS) * DEG_PER_RAD;

/** Azimuth (degrees clockwise from north, in [0, 360)) and elevation (degrees) of an east-north-up vector. */
export function azimuthElevation(enu: ArrayLike<number>): {
  azimuth: number;
  elevation: number;
} {
  const [e, n, u] = [enu[0]!, enu[1]!, enu[2]!];
  const azimuth = (Math.atan2(e, n) * DEG_PER_RAD + 360) % 360;
  return {
    azimuth: azimuth === 360 ? 0 : azimuth,
    elevation: Math.atan2(u, Math.hypot(e, n)) * DEG_PER_RAD,
  };
}

const POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

/** The 16-point compass name of an azimuth in degrees ("WSW" at 255.8°). */
export function compassPoint(azimuth: number): string {
  const i = Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16;
  return POINTS[i]!;
}

/** "18.65° up at azimuth 255.77° (WSW)", or "below the horizon" when it is. */
export function pointingText(azimuth: number, elevation: number): string {
  const az = `azimuth ${azimuth.toFixed(2)}° (${compassPoint(azimuth)})`;
  return elevation >= 0
    ? `${elevation.toFixed(2)}° up at ${az}`
    : `${(-elevation).toFixed(2)}° below the horizon at ${az}`;
}

const sub = (a: ArrayLike<number>, b: ArrayLike<number>) => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
const len = (v: readonly number[]) => Math.hypot(v[0]!, v[1]!, v[2]!);

/** The angle between two vectors, radians, accurate near 0 (not acos). */
export function angleBetween(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): number {
  const cx = a[1]! * b[2]! - a[2]! * b[1]!;
  const cy = a[2]! * b[0]! - a[0]! * b[2]!;
  const cz = a[0]! * b[1]! - a[1]! * b[0]!;
  return Math.atan2(
    Math.hypot(cx, cy, cz),
    a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!,
  );
}

/**
 * Stellar aberration, relativistically: the unit direction `u` seen by an
 * observer moving at β = V/c, p = (γ⁻¹u + (1 + u·β/(1 + γ⁻¹))β) / (1 + u·β).
 * The one helper both pointings use (fix 1).
 */
export function aberrate(
  u: readonly number[],
  beta: readonly number[],
): number[] {
  const ub = u[0]! * beta[0]! + u[1]! * beta[1]! + u[2]! * beta[2]!;
  const g = Math.sqrt(1 - (beta[0]! ** 2 + beta[1]! ** 2 + beta[2]! ** 2));
  return u.map((x, i) => (g * x + (1 + ub / (1 + g)) * beta[i]!) / (1 + ub));
}

/**
 * By hand, from the tree's vectors (R11): where `target`'s origin is seen
 * from `site`'s origin at `instant`, in `site`'s axes. The light time
 * c·τ = |x_target(t − τ) − x_site(t)| (barycentric, Newtonian) solved by
 * iteration; the astrometric direction u; then stellar aberration by the
 * site's barycentric velocity V (a ±0.5 s difference), relativistically:
 * p = (γ⁻¹u + (1 + u·β/(1 + γ⁻¹))β) / (1 + u·β), β = V/c. Returns the
 * apparent, the geometric (instantaneous) and the
 * astrometric (light time only) unit vectors, and the light-time range c·τ.
 */
export function pointingByHand(
  frames: Frames,
  site: Frame,
  target: Frame,
  instant: Instant,
): {
  apparent: number[];
  geometric: number[];
  astrometric: number[];
  range: number;
} {
  const icrf = frames.icrf;
  const at = (f: Frame, tdb: number) =>
    frameTransform(f, icrf, Instant.fromTdb(tdb)).subarray(12, 15);
  const t = instant.tdb();
  const observer = at(site, t);
  let v = sub(at(target, t), observer);
  const geometric = v;
  for (let i = 0; i < 6; i++) {
    v = sub(at(target, t - len(v) / C), observer);
  }
  const range = len(v);
  const u = v.map((x) => x / range);
  const beta = sub(at(site, t + 0.5), at(site, t - 0.5)).map((x) => x / C);
  const p = aberrate(u, beta);
  // Into the site's axes: the ICRF-to-site rotation (column-major 4×4).
  const m = frameTransform(icrf, site, instant);
  const toSite = (w: readonly number[]) => {
    const r = [0, 1, 2].map(
      (i) => m[i]! * w[0]! + m[4 + i]! * w[1]! + m[8 + i]! * w[2]!,
    );
    const l = len(r);
    return r.map((x) => x / l);
  };
  return {
    apparent: toSite(p),
    geometric: toSite(geometric),
    astrometric: toSite(u),
    range,
  };
}

/**
 * Where to draw the line of sight at `instant`, cheaply enough for every
 * frame on the page's thread (Task 6b: the ray follows the clock smoothly,
 * never stepping with the worker's evaluations): the light-time-corrected
 * direction from `site`'s origin to `targetIcrf` (its barycentric place at
 * a TDB time, m), with stellar aberration by the site's velocity (the
 * Earth's centre's, from the ephemeris, plus the Earth's turn at the site),
 * turned into the site's axes by the rotation part of ICRF to the site, as
 * `measure`'s apparent direction is. `latitude` is the site's geodetic
 * latitude, degrees: the Earth's axis lies in its meridian plane at that
 * angle from up. Returns the unit vector in the site's (east-north-up) axes.
 */
export function rayDirection(
  frames: Frames,
  site: Frame,
  latitude: number,
  targetIcrf: (tdb: number) => ArrayLike<number>,
  instant: Instant,
): number[] {
  return rayFrom(frames, site, latitude, targetIcrf, instant).enu;
}

/** `rayDirection`'s direction, with the light-time range to the target, m. */
export function rayFrom(
  frames: Frames,
  site: Frame,
  latitude: number,
  targetIcrf: (tdb: number) => ArrayLike<number>,
  instant: Instant,
): { enu: number[]; range: number } {
  const icrf = frames.icrf;
  const t = instant.tdb();
  const m = frameTransform(site, icrf, instant);
  const observer = [m[12]!, m[13]!, m[14]!];
  let v = sub(targetIcrf(t), observer);
  for (let i = 0; i < 4; i++) {
    v = sub(targetIcrf(t - len(v) / C), observer);
  }
  const range = len(v);
  const u = v.map((x) => x / range);
  // The site's velocity: the Earth's centre's (±0.5 s of the ephemeris)
  // plus Ω × r about the Earth's axis, cos φ north + sin φ up.
  const earth = (tdb: number) =>
    frameTransform(frames.earthIcrf, icrf, Instant.fromTdb(tdb)).subarray(
      12,
      15,
    );
  const centre = earth(t);
  const ve = sub(earth(t + 0.5), earth(t - 0.5));
  const phi = (latitude * Math.PI) / 180;
  const col = (j: number) => {
    const c = [m[4 * j]!, m[4 * j + 1]!, m[4 * j + 2]!];
    const l = len(c);
    return c.map((x) => x / l);
  };
  const north = col(1);
  const up = col(2);
  const axis = north.map((x, i) => Math.cos(phi) * x + Math.sin(phi) * up[i]!);
  const r = sub(observer, centre);
  const spin = [
    axis[1]! * r[2]! - axis[2]! * r[1]!,
    axis[2]! * r[0]! - axis[0]! * r[2]!,
    axis[0]! * r[1]! - axis[1]! * r[0]!,
  ].map((x) => x * EARTH_ROTATION_RATE);
  const beta = ve.map((x, i) => (x + spin[i]!) / C);
  const p = aberrate(u, beta);
  // ICRF to the site's axes: the rotation part's transpose (row-major).
  const rot = rotationPart(m);
  const out = [0, 1, 2].map(
    (j) => rot[j]! * p[0]! + rot[3 + j]! * p[1]! + rot[6 + j]! * p[2]!,
  );
  const l = len(out);
  return { enu: out.map((x) => x / l), range };
}
