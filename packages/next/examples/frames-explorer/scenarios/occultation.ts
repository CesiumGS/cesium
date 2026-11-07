// When the Moon hides Orion from a dish (Task 6b, the owner's ask): the
// windows in Orion's OEM when the library's line of sight (`lineOfSight`,
// against the Moon alone) is blocked, for each station, and when it is
// blocked for every station at once. A coarse scan of the geocentric angle
// between Orion and the Moon finds where to look (within 3°: the Moon's
// half-degree disc and up to a degree of parallax between the stations);
// a 20 s scan there finds each change of verdict; bisection then pins each
// edge to a millisecond. Computed once per worker and frame tree.
//
// The edges are those of a sphere of 1,737.4 km (IAU, naif-moon-radius).
// The real limb rises and falls by kilometres with the lunar terrain, which
// isn't modelled: the edges say how many seconds a kilometre of limb moves
// them (`secondsPerKm`), from the crossing's own rate.
import { type Frame, frameTransform } from "../../../src/frames/Frame.ts";
import type { Frames } from "../../../src/frames/frames.ts";
import { framePoint } from "../../../src/frames/local.ts";
import { solveLightTime } from "../../../src/measure/lightTime.ts";
import { lineOfSight } from "../../../src/measure/lineOfSight.ts";
import { MOON } from "../../../src/scene/Body.ts";
import { Instant } from "../../../src/time/Instant.ts";
import type { Trajectory } from "../../../src/trajectory/Trajectory.ts";
import { angleBetween } from "./pointing.ts";

/** The Moon's radius the line of sight takes, m (IAU 2015, NAIF pck00011). */
export const MOON_RADIUS = 1_737_400;

/** The fine scan's step, s: shorter than any window (they last tens of minutes). */
const FINE = 20;

/** The coarse scan's step, s. */
const COARSE = 600;

/** Edges are bisected to this, s. */
const EDGE = 1e-3;

export interface OcclusionWindow {
  /** Loss and acquisition of signal, TDB seconds past J2000 (reception at the dish). */
  start: number;
  end: number;
  /** Seconds a kilometre of limb height moves each edge (from the crossing's rate). */
  secondsPerKm: { start: number; end: number };
}

/** Whether the Moon blocks Orion from `station` (ITRF, m) at `tdb`; undefined outside Orion's data. */
export function moonBlocks(
  frames: Frames,
  orion: Trajectory,
  station: ArrayLike<number>,
  tdb: number,
): boolean | undefined {
  try {
    // `measure`'s own line of sight, without the accuracy statement it
    // also builds (which made a scan take minutes).
    const s = solveLightTime(
      framePoint(frames.itrf, station),
      framePoint(orion.frame, [0, 0, 0]),
      Instant.fromTdb(tdb),
      "reception",
      frames,
      [],
    );
    return !lineOfSight(s, frames, [MOON]).clear;
  } catch {
    return undefined;
  }
}

/**
 * The angle from the Moon's limb to Orion as `station` sees them at `tdb`,
 * radians, by hand: each body where it was when its light left (two
 * light-time passes), the Moon's angular radius asin(R / distance);
 * negative when Orion is inside the disc. The edges' hand check.
 */
export function limbAngle(
  frames: Frames,
  orion: Trajectory,
  station: ArrayLike<number>,
  tdb: number,
): number {
  const t = Instant.fromTdb(tdb);
  const toIcrf = frameTransform(frames.itrf, frames.icrf, t);
  const s = [0, 1, 2].map(
    (i) =>
      toIcrf[12 + i]! +
      toIcrf[i]! * station[0]! +
      toIcrf[4 + i]! * station[1]! +
      toIcrf[8 + i]! * station[2]!,
  );
  const seen = (frame: Frame) => {
    const at = (x: number) =>
      frameTransform(frame, frames.icrf, Instant.fromTdb(x)).subarray(12, 15);
    let p = at(tdb);
    for (let i = 0; i < 3; i++) {
      const d = Math.hypot(p[0]! - s[0]!, p[1]! - s[1]!, p[2]! - s[2]!);
      p = at(tdb - d / 299_792_458);
    }
    return [p[0]! - s[0]!, p[1]! - s[1]!, p[2]! - s[2]!];
  };
  const moon = seen(frames.moonIcrf);
  const craft = seen(orion.frame);
  const limb = Math.asin(
    MOON_RADIUS / Math.hypot(moon[0]!, moon[1]!, moon[2]!),
  );
  return angleBetween(moon, craft) - limb;
}

/** Orion's geocentric angle from the Moon at `tdb`, radians (the coarse scan). */
function geocentricAngle(frames: Frames, orion: Trajectory, tdb: number) {
  const t = Instant.fromTdb(tdb);
  const m = frameTransform(frames.moonIcrf, frames.earthIcrf, t).subarray(
    12,
    15,
  );
  const o = frameTransform(orion.frame, frames.earthIcrf, t).subarray(12, 15);
  return angleBetween(m, o);
}

/** Where the verdict changes between `a` (verdict `va`) and `b`, to a millisecond. */
function edge(
  blocked: (t: number) => boolean | undefined,
  a: number,
  b: number,
  va: boolean,
): number {
  let lo = a;
  let hi = b;
  while (hi - lo > EDGE) {
    const mid = 0.5 * (lo + hi);
    if (blocked(mid) === va) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return 0.5 * (lo + hi);
}

/** Seconds per km of limb height at an edge: 1 km over the Moon's distance, against the limb angle's rate there. */
function perKm(
  frames: Frames,
  orion: Trajectory,
  station: ArrayLike<number>,
  t: number,
): number {
  const rate = Math.abs(
    (limbAngle(frames, orion, station, t + 1) -
      limbAngle(frames, orion, station, t - 1)) /
      2,
  );
  const moon = frameTransform(
    frames.moonIcrf,
    frames.itrf,
    Instant.fromTdb(t),
  ).subarray(12, 15);
  const d = Math.hypot(
    moon[0]! - station[0]!,
    moon[1]! - station[1]!,
    moon[2]! - station[2]!,
  );
  return 1000 / d / rate;
}

/** The windows when the Moon blocks Orion from `station` (ITRF, m), over the OEM's spans. */
export function moonWindows(
  frames: Frames,
  orion: Trajectory,
  station: ArrayLike<number>,
): OcclusionWindow[] {
  const blocked = (t: number) => moonBlocks(frames, orion, station, t);
  const out: OcclusionWindow[] = [];
  for (const [s0, s1] of orion.spans) {
    // Where Orion is within 3° of the Moon from the Earth's centre.
    const near: [number, number][] = [];
    for (let t = s0; t < s1; t += COARSE) {
      if (geocentricAngle(frames, orion, t) < (3 * Math.PI) / 180) {
        const last = near.at(-1);
        if (last && last[1] >= t - COARSE) {
          last[1] = Math.min(s1, t + COARSE);
        } else {
          near.push([Math.max(s0, t - COARSE), Math.min(s1, t + COARSE)]);
        }
      }
    }
    for (const [a, b] of near) {
      let prev = a;
      let was = blocked(a);
      let start = was === true ? a : undefined;
      for (let t = Math.min(b, a + FINE); ; t = Math.min(b, t + FINE)) {
        const now = blocked(t);
        if (now !== undefined && was !== undefined && now !== was) {
          const at = edge(blocked, prev, t, was);
          if (now) {
            start = at;
          } else if (start !== undefined) {
            out.push({
              start,
              end: at,
              secondsPerKm: {
                start: perKm(frames, orion, station, start),
                end: perKm(frames, orion, station, at),
              },
            });
            start = undefined;
          }
        }
        prev = t;
        was = now;
        if (t >= b) {
          break;
        }
      }
    }
  }
  return out;
}

/** Where every list of windows overlaps: the times all stations have lost Orion. */
export function commonWindows(
  lists: readonly (readonly OcclusionWindow[])[],
): { start: number; end: number }[] {
  let common = (lists[0] ?? []).map((w) => ({ start: w.start, end: w.end }));
  for (const list of lists.slice(1)) {
    const next: { start: number; end: number }[] = [];
    for (const a of common) {
      for (const b of list) {
        const start = Math.max(a.start, b.start);
        const end = Math.min(a.end, b.end);
        if (end > start) {
          next.push({ start, end });
        }
      }
    }
    common = next;
  }
  return common;
}
