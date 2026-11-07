// When no dish can hear Orion (Task 6b; fix 1): for each dish, the windows
// when the Moon hides Orion, and the windows when Orion is unavailable to
// it at all (the Moon in the way, or the Earth: below its horizon); and the
// network's windows, when every dish is unavailable at once. Behind the
// Moon, during the flyby, only DSS-43 had Orion above its horizon, so the
// network's loss is DSS-43's own.
//
// The verdicts here are hand geometry from the frame tree's own vectors
// (cheap enough to scan the whole OEM), Orion's direction aberrated as the
// dish sees it (fix 2): each body where it was when its
// light left (two light-time passes); the Moon a sphere of 1,737.4 km
// (IAU 2015, as naif-moon-radius); the Earth the WGS 84 ellipsoid, the
// path tested against it in ITRF at reception. A scan whose steps follow
// how near the nearest verdict is to changing finds each change of verdict
// (fix 2), and bisection pins each edge to a millisecond. The
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
import { C, EARTH_ROTATION_RATE } from "../../../src/measure/constants.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";
import { Instant } from "../../../src/time/Instant.ts";
import type { Trajectory } from "../../../src/trajectory/Trajectory.ts";
import { type HorizonMask, belowMask, maskAt } from "./horizonMask.ts";
import { aberrate, angleBetween, azimuthElevation } from "./pointing.ts";

/** The Moon's radius the lines of sight take, m (IAU 2015, NAIF pck00011: naif-moon-radius). */
export const MOON_RADIUS = 1_737_400;

/**
 * The scan's longest step, s. Each step is as long as the nearest verdict
 * could take to change (fix 2): the smallest margin over every dish (its
 * elevation from its mask, the limb angle) over a bound on how fast that
 * margin can close, at least 1 s. A window of any length is found; only
 * one shorter than 1 s could hide between steps.
 */
export const STEP = 600;

/** The shortest step, s. */
export const MIN_STEP = 1;

/** The Earth's turn, degrees per second. */
const SPIN = (EARTH_ROTATION_RATE * 180) / Math.PI;

/** A bound on the Moon's angular rate seen from the Earth, degrees per second (about 1 km/s at 384,000 km is 1.5e-4). */
const MOON_RATE = 5e-4;

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
  /** Orion's apparent azimuth and elevation at the dish, degrees (light time and aberration, as `measure`'s; airless). */
  azimuth: number;
  elevation: number;
  /** At or below the dish's published horizon mask, when it has one. */
  mask?: boolean;
  /** How far the nearest verdict is from changing, degrees: from the mask (or the horizon) and the Moon's limb. */
  margin: number;
  /** A bound on how fast that margin can close, degrees per second. */
  rate: number;
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
  /** The Earth's centre's barycentric velocity, m/s. */
  earthVelocity: number[];
  /** A bound on Orion's angular rate seen from the Earth's surface, degrees per second (its speed over its distance less the Earth's radius). */
  orionRate: number;
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
    const e = (x: number) =>
      frameTransform(
        frames.earthIcrf,
        frames.icrf,
        Instant.fromTdb(x),
      ).subarray(12, 15);
    const o = orion.state(t);
    const speed = Math.hypot(o[3]!, o[4]!, o[5]!);
    const away = Math.max(1e5, Math.hypot(o[0]!, o[1]!, o[2]!) - 6.4e6);
    return {
      toIcrf,
      moon: seen(frames.moonIcrf),
      orion: seen(orion.frame),
      earthVelocity: sub(e(tdb + 0.5), e(tdb - 0.5)),
      orionRate: ((speed / away) * 180) / Math.PI,
    };
  } catch {
    return undefined;
  }
}

/** The steepest a mask gets, degrees of elevation per degree of azimuth. */
const slopes = new WeakMap<HorizonMask, number>();
function slopeOf(mask: HorizonMask): number {
  let s = slopes.get(mask);
  if (s === undefined) {
    s = 0;
    for (let i = 0; i < 360; i++) {
      s = Math.max(s, Math.abs(mask[i + 1]! - mask[i]!));
    }
    slopes.set(mask, s);
  }
  return s;
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
  // Where the dish sees Orion, as `measure` does (fix 2): the light-time
  // direction aberrated by the dish's velocity (the Earth's centre's and the
  // Earth's turn at the dish), about 20″ at most; the mask and the
  // ellipsoid are tested along it.
  const axis = [toIcrf[8]!, toIcrf[9]!, toIcrf[10]!];
  const la = len(axis);
  const r0 = sub(s, toIcrf.subarray(12, 15));
  const spin = [
    axis[1]! * r0[2]! - axis[2]! * r0[1]!,
    axis[2]! * r0[0]! - axis[0]! * r0[2]!,
    axis[0]! * r0[1]! - axis[1]! * r0[0]!,
  ].map((x) => (x / la) * EARTH_ROTATION_RATE);
  const beta = sky.earthVelocity.map((v, i) => (v + spin[i]!) / C);
  const range = len(craft);
  const seen = aberrate(
    craft.map((x) => x / range),
    beta,
  ).map((x) => x * range);
  // The path in ITRF at reception: ICRF to ITRF is the linear part's
  // transpose (its 1e-9 scale doesn't move a horizon).
  const r = toIcrf;
  const inItrf = [0, 1, 2].map(
    (j) =>
      r[4 * j]! * seen[0]! +
      r[4 * j + 1]! * seen[1]! +
      r[4 * j + 2]! * seen[2]!,
  );
  const far = [0, 1, 2].map((i) => station[i]! + inItrf[i]!);
  const [e, n, u] = enuAt(station);
  const dot = (a: number[]) =>
    a[0]! * inItrf[0]! + a[1]! * inItrf[1]! + a[2]! * inItrf[2]!;
  const { azimuth, elevation } = azimuthElevation([dot(e!), dot(n!), dot(u!)]);
  // How soon a verdict could change: the margins over their rate bounds.
  const sweep = SPIN + sky.orionRate;
  const azimuthRate =
    sweep / Math.max(0.05, Math.cos((elevation * Math.PI) / 180));
  const horizon = dish.mask
    ? Math.abs(elevation - maskAt(dish.mask, azimuth))
    : Math.abs(elevation);
  const limbMargin = Math.abs((limb * 180) / Math.PI);
  return {
    moon: limb < 0 && len(craft) > moonDistance,
    earth: throughEarth(Array.from(station), far),
    limb,
    moonDistance,
    azimuth,
    elevation,
    ...(dish.mask && { mask: belowMask(dish.mask, azimuth, elevation) }),
    margin: Math.min(horizon, limbMargin),
    rate:
      sweep + MOON_RATE + (dish.mask ? slopeOf(dish.mask) * azimuthRate : 0),
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

/**
 * The windows where `test` holds, over `spans`: a scan whose next step is
 * `stepAt` the instant just tested (clamped to `MIN_STEP`…`STEP`), each edge
 * bisected to 1 ms.
 */
export function windowsOf(
  spans: readonly (readonly [number, number])[],
  test: (tdb: number) => boolean | undefined,
  stepAt: (tdb: number) => number = () => STEP,
): Window[] {
  const step = (t: number) => Math.min(STEP, Math.max(MIN_STEP, stepAt(t)));
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
    for (let t = Math.min(b, a + step(a)); ; t = Math.min(b, t + step(t))) {
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
  // The next step from an instant: the soonest any dish's verdict could
  // change there (every kind of window shares it, and the instants).
  const stepAt = (t: number) => {
    let s = STEP;
    for (const b of at(t)) {
      if (b) {
        s = Math.min(s, b.margin / b.rate);
      }
    }
    return s;
  };
  const dishes = stations.map((station, i) => ({
    moon: windowsOf(orion.spans, (t) => at(t)[i]?.moon, stepAt).map((w) => ({
      ...w,
      secondsPerKm: {
        start: perKm(frames, orion, station, w.start),
        end: perKm(frames, orion, station, w.end),
      },
    })),
    unavailable: windowsOf(
      orion.spans,
      (t) => {
        const b = at(t)[i];
        return b && unavailable(b);
      },
      stepAt,
    ),
  }));
  const network = windowsOf(
    orion.spans,
    (t) => {
      const v = at(t);
      if (v.some((b) => b === undefined)) {
        return undefined;
      }
      return v.every((b) => unavailable(b!));
    },
    stepAt,
  );
  return { dishes, network };
}
