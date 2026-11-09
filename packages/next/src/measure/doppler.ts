import type { Frames } from "../frames/frames.ts";
import type { FramePoint } from "../frames/local.ts";
import { Instant } from "../time/Instant.ts";
import { C, GM_EARTH, GM_MOON, GM_SUN } from "./constants.ts";
import {
  apparentDirection,
  solveLightTime,
  type LightTimeSolution,
  type ShapiroBody,
} from "./lightTime.ts";
import { derivative, velocityIn } from "./motion.ts";

/**
 * One direction of a link: light time, range, range rate and the Doppler
 * ratio, with the apparent directions at both ends (frames 3, R4, R6).
 */
export interface Leg {
  /** Reception minus emission, TDB seconds. */
  readonly lightTime: number;
  /** C · lightTime, m. */
  readonly range: number;
  /**
   * d(range)/dt, m/s, at the instant the leg was asked for: the central
   * difference of the light-time range over ±0.5 s (one-sided within 0.5 s
   * of a trajectory's data edge). Its precision is limited by quantization,
   * not by R3's ~1e-7 m/s: the far end's instant is a float64 TDB (about
   * 1.2e-7 s apart at today's epochs), which puts up to about 1 mm/s of
   * noise into a ±0.5 s difference.
   */
  readonly rangeRate: number;
  /** f_received / f_transmitted. */
  readonly dopplerRatio: number;
  /** (dopplerRatio − 1) · frequency, Hz, when a frequency was given. */
  readonly dopplerShift?: number;
  /** Toward the receiver, in the transmitter point's frame, at emission. */
  readonly transmitterDirection: Float64Array;
  /** Toward the transmitter, in the receiver point's frame, at reception. */
  readonly receiverDirection: Float64Array;
}

export interface LegOptions {
  /** Shapiro bodies for the light time; default the Sun, Earth and Moon. */
  readonly shapiro?: readonly ShapiroBody[];
  /** The transmitted frequency, Hz, for `dopplerShift`. */
  readonly frequency?: number;
}

/**
 * Within this of a body's center the body's own term is left out: the
 * geocentric convention of frames 3, R1, where U at the geocenter excludes
 * the Earth (a point mass diverges there).
 */
const CENTER = 1;
const body = new Float64Array(6);
const velocity = new Float64Array(3);
const rate = new Float64Array(1);

/**
 * The rate of proper time against TDB, dτ/dt = 1 − U/c² − v²/2c², for a
 * clock at `position` (ICRF, m, barycentric) moving at `velocity` (ICRF,
 * m/s) at `instant`. U sums the Sun, the Earth and the Moon as point masses
 * at their ephemeris positions (frames 3, R4); a body's own term is left out
 * within 1 m of its center.
 */
export function properTimeRate(
  position: ArrayLike<number>,
  velocity: ArrayLike<number>,
  instant: Instant,
  frames: Frames,
): number {
  const ephemeris = frames.data.ephemeris;
  let potential = 0;
  for (const [mu, place] of [
    [GM_SUN, ephemeris.sun],
    [GM_EARTH, ephemeris.earth],
    [GM_MOON, ephemeris.moon],
  ] as const) {
    place.call(ephemeris, instant, body);
    const r = Math.hypot(
      position[0]! - body[0]!,
      position[1]! - body[1]!,
      position[2]! - body[2]!,
    );
    if (r > CENTER) {
      potential += mu / r;
    }
  }
  const v2 =
    velocity[0]! * velocity[0]! +
    velocity[1]! * velocity[1]! +
    velocity[2]! * velocity[2]!;
  return 1 - potential / (C * C) - v2 / (2 * C * C);
}

/** The proper-time rate of `point` at `instant`, at ICRF `position`. */
function rateOf(
  point: FramePoint,
  position: Float64Array,
  instant: Instant,
  frames: Frames,
): number {
  velocityIn(point, frames.icrf, instant, velocity);
  return properTimeRate(position, velocity, instant, frames);
}

function legWithSolution(
  receiver: FramePoint,
  transmitter: FramePoint,
  at: Instant,
  fixed: "reception" | "emission",
  frames: Frames,
  options: LegOptions,
): { leg: Leg; solution: LightTimeSolution } {
  const solve = (instant: Instant): LightTimeSolution =>
    solveLightTime(
      receiver,
      transmitter,
      instant,
      fixed,
      frames,
      options.shapiro,
    );
  const solution = solve(at);
  const rangeRate = derivative(
    (instant, out) => {
      out[0] = C * solve(instant).lightTime;
    },
    at,
    1,
    rate,
  )[0]!;
  // dlt/dt is the same difference of the light time: rangeRate / c.
  const dlt = rangeRate / C;
  const ratio =
    (rateOf(
      transmitter,
      solution.transmitterPosition,
      solution.emission,
      frames,
    ) /
      rateOf(receiver, solution.receiverPosition, solution.reception, frames)) *
    (fixed === "reception" ? 1 - dlt : 1 / (1 + dlt));
  return {
    solution,
    leg: {
      lightTime: solution.lightTime,
      range: C * solution.lightTime,
      rangeRate,
      dopplerRatio: ratio,
      ...(options.frequency === undefined
        ? {}
        : { dopplerShift: (ratio - 1) * options.frequency }),
      transmitterDirection: apparentDirection(
        solution,
        "transmitter",
        transmitter,
        frames,
      ),
      receiverDirection: apparentDirection(
        solution,
        "receiver",
        receiver,
        frames,
      ),
    },
  };
}

function leg(
  receiver: FramePoint,
  transmitter: FramePoint,
  at: Instant,
  fixed: "reception" | "emission",
  frames: Frames,
  options: LegOptions,
): Leg {
  return legWithSolution(receiver, transmitter, at, fixed, frames, options).leg;
}

/**
 * `downlink` with the light-time solution it solved, for a caller that needs
 * it too (line of sight): the downlink's light time is then solved once.
 * Internal to `measure`.
 */
export function downlinkWithSolution(
  receiver: FramePoint,
  transmitter: FramePoint,
  at: Instant,
  frames: Frames,
  options: LegOptions = {},
): { leg: Leg; solution: LightTimeSolution } {
  return legWithSolution(
    receiver,
    transmitter,
    at,
    "reception",
    frames,
    options,
  );
}

/**
 * The signal from `transmitter` to `receiver`, received at `at`. Doppler is
 * IERS-style one-way,
 *
 *   f_r/f_t = [dτ_t/dt at emission / dτ_r/dt at reception] · (1 − dlt/dt),
 *
 * with both ends' proper-time rates (`properTimeRate`; frames 3, R4) and
 * dlt/dt the light time's derivative with respect to the reception time.
 * Both points must be fixed in their frames (R9).
 */
export function downlink(
  receiver: FramePoint,
  transmitter: FramePoint,
  at: Instant,
  frames: Frames,
  options: LegOptions = {},
): Leg {
  return leg(receiver, transmitter, at, "reception", frames, options);
}

/**
 * The signal from `transmitter` to `receiver`, emitted at `at`. The ratio is
 * [dτ_t/dt at emission / dτ_r/dt at reception] / (1 + dlt/dt), with dlt/dt
 * the light time's derivative with respect to the emission time.
 */
export function uplink(
  transmitter: FramePoint,
  receiver: FramePoint,
  at: Instant,
  frames: Frames,
  options: LegOptions = {},
): Leg {
  return leg(receiver, transmitter, at, "emission", frames, options);
}
