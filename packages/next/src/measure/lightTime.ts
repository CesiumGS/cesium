import type { Ephemeris } from "../ephemeris/Ephemeris.ts";
import { frameTransform } from "../frames/Frame.ts";
import type { Frames } from "../frames/frames.ts";
import type { FramePoint } from "../frames/local.ts";
import { rotationPart } from "../frames/matrix.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { Instant } from "../time/Instant.ts";
import { C, GM_EARTH, GM_MOON, GM_SUN } from "./constants.ts";
import { positionIn, velocityIn } from "./motion.ts";

/** A body whose Shapiro delay `solveLightTime` can add. */
export type ShapiroBody = "sun" | "earth" | "moon";

/**
 * A signal's path between two points, from `solveLightTime`. Positions are
 * in ICRF (the BCRS), meters; times are TDB.
 */
export interface LightTimeSolution {
  /** Reception minus emission, TDB seconds. */
  readonly lightTime: number;
  readonly emission: Instant;
  readonly reception: Instant;
  /** The transmitter at emission, ICRF, m. */
  readonly transmitterPosition: Float64Array;
  /** The receiver at reception, ICRF, m. */
  readonly receiverPosition: Float64Array;
}

const ALL_BODIES: readonly ShapiroBody[] = ["sun", "earth", "moon"];
const TOLERANCE = 1e-14;
const MAX_ITERATIONS = 10;
/** (1 + γ) GM / c³ with γ = 1, seconds. */
const SHAPIRO: Readonly<Record<ShapiroBody, number>> = {
  sun: (2 * GM_SUN) / C ** 3,
  earth: (2 * GM_EARTH) / C ** 3,
  moon: (2 * GM_MOON) / C ** 3,
};
/**
 * The point-mass formula is meaningless inside a body and diverges at its
 * center (a point at the geocenter, say), so an end's distance from a body
 * is taken as at least this: the IAU 2015 nominal solar radius, and the
 * smallest radii of WGS84 and the lunar sphere.
 */
const RADIUS: Readonly<Record<ShapiroBody, number>> = {
  sun: 6.957e8,
  earth: Ellipsoid.WGS84.minimumRadius,
  moon: Ellipsoid.MOON.minimumRadius,
};
const EPHEMERIS: Readonly<
  Record<ShapiroBody, (e: Ephemeris, i: Instant, out: Float64Array) => void>
> = {
  sun: (e, i, out) => e.sun(i, out),
  earth: (e, i, out) => e.earth(i, out),
  moon: (e, i, out) => e.moon(i, out),
};

const body = new Float64Array(6);
const rotation = new Float64Array(9);
const matrix = new Float64Array(16);

const distance = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/**
 * The Shapiro delay, seconds, of the path from `emitted` to `received`
 * (ICRF, m) past `bodies` placed at TDB `mid`: the sum term of IERS
 * Conventions 2010 eq. 11.17,
 *
 *   (1 + γ) GM/c³ · ln((r_e + r_r + ρ) / (r_e + r_r − ρ)),  γ = 1.
 */
function shapiroDelay(
  emitted: Float64Array,
  received: Float64Array,
  bodies: readonly ShapiroBody[],
  mid: Instant,
  ephemeris: Ephemeris,
): number {
  const rho = distance(emitted, received);
  let delay = 0;
  for (const b of bodies) {
    EPHEMERIS[b](ephemeris, mid, body);
    const re = Math.max(distance(emitted, body), RADIUS[b]);
    const rr = Math.max(distance(received, body), RADIUS[b]);
    delay += SHAPIRO[b] * Math.log((re + rr + rho) / (re + rr - rho));
  }
  return delay;
}

/**
 * The light time of a signal from `transmitter` to `receiver`, both fixed in
 * their frames (frames 3, R9: a point that carries its own instant throws).
 * With `fixed: "reception"` the receiver receives at `at`; with
 * `fixed: "emission"` the transmitter emits at `at`.
 *
 * Solves IERS Conventions 2010 eq. 11.17 in the BCRS (ICRF positions, TDB),
 *
 *   t_r − t_e = |x_r(t_r) − x_e(t_e)| / c + Σ (2GM/c³) ln((r_e + r_r + ρ)/(r_e + r_r − ρ)),
 *
 * by fixed-point iteration from the geometric distance at `at` (R5; so both
 * ends must be placeable at `at` itself, as well as at their own times). Each
 * Shapiro body comes from the ephemeris at the signal's mid-time; the
 * default is the Sun, the Earth and the Moon, and `shapiro: []` gives
 * SPICE's converged Newtonian light time (CN, or XCN when transmitting).
 *
 * It stops when a step changes the light time by less than 1e-14 s, or when
 * the light time no longer moves the other end's instant: TDB seconds are a
 * float64, 1.2e-7 s apart at today's epochs, so the next step would repeat
 * this one exactly (or alternate between two neighbouring instants). The
 * solution's instants are those its positions were evaluated at. It throws
 * after 10 steps without converging, and wherever an end's position throws,
 * such as when the other end's time falls outside a trajectory's data: it
 * never extrapolates.
 */
export function solveLightTime(
  receiver: FramePoint,
  transmitter: FramePoint,
  at: Instant,
  fixed: "reception" | "emission",
  frames: Frames,
  shapiro: readonly ShapiroBody[] = ALL_BODIES,
): LightTimeSolution {
  for (const [role, point] of [
    ["receiver", receiver],
    ["transmitter", transmitter],
  ] as const) {
    if (point.instant) {
      throw new Error(
        `solveLightTime: the ${role} carries its own instant, so it can't be placed at the signal's other time; use a point fixed in its frame`,
      );
    }
  }
  const icrf = frames.icrf;
  const receiving = fixed === "reception";
  const anchored = receiving ? receiver : transmitter;
  const travelling = receiving ? transmitter : receiver;
  const sign = receiving ? -1 : 1;
  const t0 = at.tdb();
  const fixedPosition = positionIn(anchored, icrf, at);
  const otherPosition = positionIn(travelling, icrf, at);
  const emitted = receiving ? otherPosition : fixedPosition;
  const received = receiving ? fixedPosition : otherPosition;

  let lightTime = distance(fixedPosition, otherPosition) / C;
  let previousTime = NaN;
  for (let step = 0; step < MAX_ITERATIONS; step++) {
    const time = t0 + sign * lightTime;
    const other = Instant.fromTdb(time);
    positionIn(travelling, icrf, other, otherPosition);
    let next = distance(fixedPosition, otherPosition) / C;
    if (shapiro.length > 0) {
      const mid = Instant.fromTdb(0.5 * (t0 + time));
      next += shapiroDelay(
        emitted,
        received,
        shapiro,
        mid,
        frames.data.ephemeris,
      );
    }
    const change = Math.abs(next - lightTime);
    lightTime = next;
    const nextTime = t0 + sign * next;
    if (change < TOLERANCE || nextTime === time || nextTime === previousTime) {
      return {
        lightTime,
        emission: receiving ? other : at,
        reception: receiving ? at : other,
        transmitterPosition: Float64Array.from(emitted),
        receiverPosition: Float64Array.from(received),
      };
    }
    previousTime = time;
  }
  throw new Error(
    `solveLightTime: the light time did not converge in ${MAX_ITERATIONS} steps (last ${lightTime} s)`,
  );
}

/**
 * The apparent direction of the signal's other end, seen from one end: a
 * unit vector in `point.frame`'s axes at that end's time. `point` is that
 * end (the solution's receiver or transmitter), which gives its velocity.
 *
 * At the receiver it points toward where the transmitter was at emission;
 * at the transmitter, toward where the receiver will be at reception. Each
 * is then corrected for stellar aberration by that end's barycentric
 * velocity v, as SPICE's STELAB (CN+S) and STLABX (XCN+S) document it: with
 * r the light-time-corrected direction and h = r × v, sin φ = |v| sin w / c
 * for w the angle between r and v, and r is rotated about h by φ when
 * receiving, by −φ when transmitting (frames 3, R6).
 *
 * The ICRF direction is turned into `point.frame`'s axes by the rotation
 * part (`rotationPart`) of the frame transform from ICRF at that end's
 * time, without eq. 11.19's scale and shear: a direction is not a position.
 */
export function apparentDirection(
  solution: LightTimeSolution,
  at: "receiver" | "transmitter",
  point: FramePoint,
  frames: Frames,
): Float64Array {
  const receiving = at === "receiver";
  const from = receiving
    ? solution.receiverPosition
    : solution.transmitterPosition;
  const to = receiving
    ? solution.transmitterPosition
    : solution.receiverPosition;
  const instant = receiving ? solution.reception : solution.emission;
  const length = distance(to, from);
  const ux = (to[0]! - from[0]!) / length;
  const uy = (to[1]! - from[1]!) / length;
  const uz = (to[2]! - from[2]!) / length;

  // STELAB: h = u × v/c, φ = asin |h|, rotate u about h by ±φ.
  const v = velocityIn(point, frames.icrf, instant);
  const bx = v[0]! / C,
    by = v[1]! / C,
    bz = v[2]! / C;
  let hx = uy * bz - uz * by;
  let hy = uz * bx - ux * bz;
  let hz = ux * by - uy * bx;
  const sinPhi = Math.hypot(hx, hy, hz);
  let x = ux,
    y = uy,
    z = uz;
  if (sinPhi > 0) {
    const phi = (receiving ? 1 : -1) * Math.asin(sinPhi);
    hx /= sinPhi;
    hy /= sinPhi;
    hz /= sinPhi;
    // Rodrigues about the unit axis h (SPICE's VROTV): u's part along h
    // stays, the rest turns by φ.
    const along = ux * hx + uy * hy + uz * hz;
    const px = ux - along * hx,
      py = uy - along * hy,
      pz = uz - along * hz;
    const cos = Math.cos(phi),
      sin = Math.sin(phi);
    x = along * hx + cos * px + sin * (hy * pz - hz * py);
    y = along * hy + cos * py + sin * (hz * px - hx * pz);
    z = along * hz + cos * pz + sin * (hx * py - hy * px);
  }

  const r = rotationPart(
    frameTransform(frames.icrf, point.frame, instant, matrix),
    rotation,
  );
  const out = new Float64Array(3);
  out[0] = r[0]! * x + r[1]! * y + r[2]! * z;
  out[1] = r[3]! * x + r[4]! * y + r[5]! * z;
  out[2] = r[6]! * x + r[7]! * y + r[8]! * z;
  const n = Math.hypot(out[0], out[1], out[2]);
  out[0] /= n;
  out[1] /= n;
  out[2] /= n;
  return out;
}
