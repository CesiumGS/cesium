// When no dish can hear Orion (Task 6b; fix 1): for each dish, the windows
// when the Moon hides Orion, and the windows when Orion is unavailable to
// it at all (the Moon in the way, or the Earth: below its horizon); and the
// network's windows, when every dish is unavailable at once. Behind the
// Moon, during the flyby, only DSS-43 had Orion above its horizon, so the
// network's loss is DSS-43's own.
//
// The verdicts here are hand geometry from the frame tree's own vectors
// (cheap enough to scan the whole OEM): each body where it was when its
// light left (two light-time passes); the Moon a sphere of 1,737.4 km
// (IAU 2015, as naif-moon-radius); the Earth the WGS 84 ellipsoid, the
// path tested against it in ITRF at reception. A 120 s scan finds each
// change of verdict and bisection pins each edge to a millisecond. The
// library's own line of sight (`measure`, against the Earth and the Moon)
// is then asked just inside and just outside each edge of the chosen
// dish's windows (dishTracks.ts's live check): the edges are the library's
// too.
//
// The real limb rises and falls by kilometres with the lunar terrain, which
// isn't modelled: each Moon edge says how many seconds a kilometre of limb
// moves it (`secondsPerKm`), from the crossing's own rate.
import { type Frame, frameTransform } from "../../../src/frames/Frame.ts";
import type { Frames } from "../../../src/frames/frames.ts";
import { C } from "../../../src/measure/constants.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";
import { Instant } from "../../../src/time/Instant.ts";
import type { Trajectory } from "../../../src/trajectory/Trajectory.ts";
import { type HorizonMask, belowMask } from "./horizonMask.ts";
import { angleBetween, azimuthElevation } from "./pointing.ts";

/** The Moon's radius the lines of sight take, m (IAU 2015, NAIF pck00011: naif-moon-radius). */
export const MOON_RADIUS = 1_737_400;

/**
 * The scan's step, s: the Moon's windows last tens of minutes and a dish's
 * horizon hours; a window shorter than this can be missed (the scan costs
 * about 2 ms an instant, over nine days of OEM).
 */
export const STEP = 600;

/** Edges are bisected to this, s. */
const EDGE = 1e-3;

export interface Window {
  /** TDB seconds past J2000 (reception at the dish). */
  start: number;
  end: number;
  /** An end that is the edge of Orion's data (a segment's), not a change of verdict. */
  open?: { start?: true; end?: true };
}

export interface MoonWindow extends Window {
  /** Seconds a kilometre of limb height moves each edge (from the crossing's rate). */
  secondsPerKm: { start: number; end: number };
}

/** Why a dish can't hear Orion at an instant, by hand; undefined outside Orion's data. */
export interface Blocked {
  moon: boolean;
  earth: boolean;
  /** The angle from the Moon's limb to Orion, radians (negative inside the disc). */
  limb: number;
  /** The Moon's distance from the dish, m. */
  moonDistance: number;
  /** Orion's azimuth and elevation at the dish, degrees (light time, no aberration). */
  azimuth: number;
  elevation: number;
  /** At or below the dish's published horizon mask, when it has one. */
  mask?: boolean;
}

/** A dish for the scan: where it is (ITRF, m) and its published receive mask, if any. */
export interface Dish {
  place: ArrayLike<number>;
  mask?: HorizonMask;
}

/** East, north and up at an Earth-fixed point (WGS 84 geodetic). */
function enuAt(p: ArrayLike<number>): number[][] {
  const g = Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(p), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!;
  const [sl, cl] = [Math.sin(g.longitude), Math.cos(g.longitude)];
  const [sp, cp] = [Math.sin(g.latitude), Math.cos(g.latitude)];
  return [
    [-sl, cl, 0],
    [-sp * cl, -sp * sl, cp],
    [cp * cl, cp * sl, sp],
  ];
}

const sub = (a: ArrayLike<number>, b: ArrayLike<number>) => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
const len = (v: readonly number[]) => Math.hypot(v[0]!, v[1]!, v[2]!);

/** Whether the segment `p0`–`p1` (ITRF, m) passes through the WGS 84 ellipsoid, 1 m in from each end. */
function throughEarth(p0: readonly number[], p1: readonly number[]): boolean {
  const a = Ellipsoid.WGS84.radii;
  const d = sub(p1, p0);
  const l = len(d);
  const k = 1 / l;
  const s = p0.map((x, i) => (x + d[i]! * k) / a[i]!);
  const e = p1.map((x, i) => (x - d[i]! * k) / a[i]! - s[i]!);
  const t = Math.min(
    1,
    Math.max(
      0,
      -(s[0]! * e[0]! + s[1]! * e[1]! + s[2]! * e[2]!) /
        (e[0]! ** 2 + e[1]! ** 2 + e[2]! ** 2),
    ),
  );
  const c = s.map((x, i) => x + e[i]! * t);
  const n0 = s[0]! ** 2 + s[1]! ** 2 + s[2]! ** 2;
  return c[0]! ** 2 + c[1]! ** 2 + c[2]! ** 2 < Math.min(1, n0);
}

/**
 * The sky at `tdb`, for every dish at once: ITRF to ICRF, and the Moon's and
 * Orion's barycentric places when their light left, light time from the
 * Earth's centre (a dish's own differs by at most 21 ms: Orion and the Moon
 * move about 20 m against each other in it, far inside an edge's 1 ms
 * bisection over a limb crossing of about 1.3 km/s, and the library is asked
 * at each edge anyway). Undefined outside Orion's data.
 */
export interface Sky {
  toIcrf: Float64Array;
  moon: ArrayLike<number>;
  orion: ArrayLike<number>;
}

export function skyAt(
  frames: Frames,
  orion: Trajectory,
  tdb: number,
): Sky | undefined {
  const t = Instant.fromTdb(tdb);
  if (!orion.contains(t)) {
    return undefined;
  }
  const toIcrf = frameTransform(frames.itrf, frames.icrf, t);
  const centre = toIcrf.subarray(12, 15);
  const seen = (frame: Frame) => {
    const at = (x: number) =>
      frameTransform(frame, frames.icrf, Instant.fromTdb(x)).subarray(12, 15);
    const first = at(tdb);
    return at(tdb - len(sub(first, centre)) / C);
  };
  try {
    return { toIcrf, moon: seen(frames.moonIcrf), orion: seen(orion.frame) };
  } catch {
    return undefined;
  }
}

/** What stands between `dish` and Orion under `sky`, by hand. */
export function blockedIn(sky: Sky, dish: Dish): Blocked {
  const station = dish.place;
  const toIcrf = sky.toIcrf;
  const s = [0, 1, 2].map(
    (i) =>
      toIcrf[12 + i]! +
      toIcrf[i]! * station[0]! +
      toIcrf[4 + i]! * station[1]! +
      toIcrf[8 + i]! * station[2]!,
  );
  const craft = sub(sky.orion, s);
  const moon = sub(sky.moon, s);
  const moonDistance = len(moon);
  const limb =
    angleBetween(moon, craft) - Math.asin(MOON_RADIUS / moonDistance);
  // The path in ITRF at reception: ICRF to ITRF is the linear part's
  // transpose (its 1e-9 scale doesn't move a horizon).
  const r = toIcrf;
  const inItrf = [0, 1, 2].map(
    (j) =>
      r[4 * j]! * craft[0]! +
      r[4 * j + 1]! * craft[1]! +
      r[4 * j + 2]! * craft[2]!,
  );
  const far = [0, 1, 2].map((i) => station[i]! + inItrf[i]!);
  const [e, n, u] = enuAt(station);
  const dot = (a: number[]) =>
    a[0]! * inItrf[0]! + a[1]! * inItrf[1]! + a[2]! * inItrf[2]!;
  const { azimuth, elevation } = azimuthElevation([dot(e!), dot(n!), dot(u!)]);
  return {
    moon: limb < 0 && len(craft) > moonDistance,
    earth: throughEarth(Array.from(station), far),
    limb,
    moonDistance,
    azimuth,
    elevation,
    ...(dish.mask && { mask: belowMask(dish.mask, azimuth, elevation) }),
  };
}

/** Unavailable to the dish: the Moon, the Earth or its horizon mask in the way. */
export const unavailable = (b: Blocked): boolean =>
  b.moon || b.earth || b.mask === true;

/** What stands between the dish at `station` (ITRF, m) and Orion at `tdb`, by hand. */
export function blockedAt(
  frames: Frames,
  orion: Trajectory,
  dish: Dish,
  tdb: number,
): Blocked | undefined {
  const sky = skyAt(frames, orion, tdb);
  return sky && blockedIn(sky, dish);
}

/** The windows where `test` holds, over `spans`: a scan every `STEP`, each edge bisected to 1 ms. */
function windowsOf(
  spans: readonly (readonly [number, number])[],
  test: (tdb: number) => boolean | undefined,
): Window[] {
  const out: Window[] = [];
  const edge = (a: number, b: number, va: boolean) => {
    let lo = a;
    let hi = b;
    while (hi - lo > EDGE) {
      const mid = 0.5 * (lo + hi);
      if (test(mid) === va) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return 0.5 * (lo + hi);
  };
  for (const [s0, s1] of spans) {
    // Inside the span by a millisecond: its own ends can be outside the data.
    const a = s0 + EDGE;
    const b = s1 - EDGE;
    let prev = a;
    let was = test(a);
    let start = was === true ? a : undefined;
    let openStart = was === true;
    for (let t = Math.min(b, a + STEP); ; t = Math.min(b, t + STEP)) {
      const now = test(t);
      if (now !== undefined && was !== undefined && now !== was) {
        const at = edge(prev, t, was);
        if (now) {
          start = at;
          openStart = false;
        } else if (start !== undefined) {
          out.push({
            start,
            end: at,
            ...(openStart && { open: { start: true } }),
          });
          start = undefined;
        }
      }
      prev = t;
      was = now;
      if (t >= b) {
        if (start !== undefined) {
          out.push({
            start,
            end: b,
            open: { ...(openStart && { start: true as const }), end: true },
          });
        }
        break;
      }
    }
  }
  return out;
}

/** Seconds per km of limb height at a Moon edge: 1 km over the Moon's distance, against the limb angle's rate. */
function perKm(
  frames: Frames,
  orion: Trajectory,
  dish: Dish,
  t: number,
): number {
  const a = blockedAt(frames, orion, dish, t - 1);
  const b = blockedAt(frames, orion, dish, t + 1);
  if (!a || !b) {
    return NaN;
  }
  return 1000 / a.moonDistance / Math.abs((b.limb - a.limb) / 2);
}

export interface DishWindows {
  /** When the Moon hides Orion from the dish. */
  moon: MoonWindow[];
  /** When the dish can't hear Orion at all: the Moon, the Earth or its horizon mask in the way. */
  unavailable: Window[];
}

/**
 * Every dish's windows and the network's (every dish unavailable at once)
 * over Orion's OEM, in one scan: each instant's verdicts are worked out
 * once for every dish and shared by the three kinds of window, with the
 * Earth's orientation once per instant.
 */
export function scanWindows(
  frames: Frames,
  orion: Trajectory,
  stations: readonly Dish[],
): { dishes: DishWindows[]; network: Window[] } {
  const memo = new Map<number, (Blocked | undefined)[]>();
  const at = (t: number) => {
    let v = memo.get(t);
    if (v === undefined) {
      const sky = skyAt(frames, orion, t);
      v = stations.map((s) => (sky ? blockedIn(sky, s) : undefined));
      memo.set(t, v);
    }
    return v;
  };
  const dishes = stations.map((station, i) => ({
    moon: windowsOf(orion.spans, (t) => at(t)[i]?.moon).map((w) => ({
      ...w,
      secondsPerKm: {
        start: perKm(frames, orion, station, w.start),
        end: perKm(frames, orion, station, w.end),
      },
    })),
    unavailable: windowsOf(orion.spans, (t) => {
      const b = at(t)[i];
      return b && unavailable(b);
    }),
  }));
  const network = windowsOf(orion.spans, (t) => {
    const v = at(t);
    if (v.some((b) => b === undefined)) {
      return undefined;
    }
    return v.every((b) => unavailable(b!));
  });
  return { dishes, network };
}
