// A moving body's frame from its track (Task 7, scenarios/bodyFrame.ts),
// the drone's footprint over flat ground and the ship's sight line over a
// hill (scenarios/testHill.ts), each against a hand computation.
import { describe, expect, it } from "vitest";
import {
  bodyAxes,
  enuAxes,
  headingOf,
  tiltDown,
  trackFrame,
} from "../examples/frames-explorer/scenarios/bodyFrame.ts";
import {
  heightOverMeridian,
  testHill,
} from "../examples/frames-explorer/scenarios/testHill.ts";
import {
  SHIP,
  alongTrack,
  droneFrames,
  legLengths,
  onEarth,
  shipFrames,
  shipTrack,
} from "../examples/frames-explorer/scenarios/vehicles.ts";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { terrainLineOfSight } from "../src/measure/terrainLineOfSight.ts";
import { terrainQueries } from "../src/query/terrainBackend.ts";
import { Instant } from "../src/time/Instant.ts";

const deg = Math.PI / 180;
const itrf = Frame.root("ITRF");
const at = Instant.fromTdb(0);
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const col = (m: ArrayLike<number>, c: number) => [
  m[4 * c]!,
  m[4 * c + 1]!,
  m[4 * c + 2]!,
];

/** A body standing at (lon, lat) and moving `east`, `north` m/s. */
function still(lon: number, lat: number, east: number, north: number) {
  const position = onEarth(lon, lat, 120);
  const { east: e, north: n } = enuAxes(position);
  const velocity = [0, 1, 2].map((i) => east * e[i]! + north * n[i]!);
  return { at: () => ({ position, velocity }) };
}

describe("trackFrame", () => {
  it("heads where a north-east track's hand azimuth says, and keeps z along the local up when level", () => {
    // 3 m/s east and 4 north: atan2(3, 4) from north.
    const track = still(-122.44, 37.75, 3, 4);
    const f = trackFrame("Body", itrf, track);
    const m = frameTransform(f, itrf, at);
    const hand = Math.atan2(3, 4);
    const p = track.at().position;
    expect(headingOf(p, track.at().velocity)).toBeCloseTo(hand, 14);
    const { east, north, up } = enuAxes(p);
    // Body x is the heading's horizontal unit vector.
    const x = col(m, 0);
    expect(Math.atan2(dot(x, east), dot(x, north))).toBeCloseTo(hand, 12);
    // Level: z is the geodetic normal within 1e-12, and the origin is the track's.
    const z = col(m, 2);
    expect(1 - dot(z, up)).toBeLessThan(1e-12);
    expect(Math.abs(dot(x, up))).toBeLessThan(1e-12);
    expect([m[12], m[13], m[14]]).toEqual(Array.from(p));
  });

  it("a 10° roll turns y about x by 10°, and a pitch lifts the nose", () => {
    const track = still(-122.44, 37.75, 1, 1);
    const level = frameTransform(trackFrame("A", itrf, track), itrf, at);
    const rolled = frameTransform(
      trackFrame("B", itrf, track, () => ({ pitch: 0, roll: 10 * deg })),
      itrf,
      at,
    );
    const [x0, y0, z0] = [col(level, 0), col(level, 1), col(level, 2)];
    const [x1, y1] = [col(rolled, 0), col(rolled, 1)];
    // x is the axis: unchanged.
    expect(1 - dot(x1, x0)).toBeLessThan(1e-15);
    // y turned by 10° about x, its right side down (y toward z).
    expect(Math.acos(Math.min(1, dot(y1, y0)))).toBeCloseTo(10 * deg, 12);
    expect(dot(y1, z0)).toBeCloseTo(Math.sin(10 * deg), 12);
    const p = track.at().position;
    const pitched = bodyAxes(p, track.at().velocity, {
      pitch: 5 * deg,
      roll: 0,
    });
    expect(dot(pitched.x, enuAxes(p).up)).toBeCloseTo(Math.sin(5 * deg), 12);
    // Each stays a rotation.
    for (const m of [level, rolled]) {
      for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 3; b++) {
          expect(dot(col(m, a), col(m, b))).toBeCloseTo(a === b ? 1 : 0, 12);
        }
      }
    }
  });

  it("follows the ship's track at the instant asked: on its first leg at the start, the lane's heading north", () => {
    const heights = SHIP.vertices.map(() => -32);
    const [body, mast] = shipFrames(itrf, heights, 0, 25);
    const m = frameTransform(body, itrf, Instant.fromTdb(60));
    const p = alongTrack(shipTrack(heights), 60 * SHIP.speed).position;
    expect(Math.hypot(m[12]! - p[0]!, m[13]! - p[1]!, m[14]! - p[2]!)).toBe(0);
    // The southern approach's lane runs due north (one meridian).
    const x = col(m, 0);
    const { north } = enuAxes(p);
    expect(dot(x, north)).toBeGreaterThan(Math.cos(3 * deg));
    // The mast sensor is 25 m up the body's (pitching, rolling) z.
    const s = frameTransform(mast, itrf, Instant.fromTdb(60));
    const z = col(m, 2);
    for (let i = 0; i < 3; i++) {
      expect(s[12 + i]! - m[12 + i]!).toBeCloseTo(25 * z[i]!, 9);
    }
    expect(legLengths(shipTrack(heights))).toHaveLength(4);
  });
});

describe("the drone's footprint over flat ground", () => {
  it("lands where the hand ray-plane intersection puts it: H / tan(tilt) ahead of the nadir, along the heading", async () => {
    // Level ground at the drone's site, 0 m; the drone 150 m above it.
    const ground = testHill({
      longitude: -122.4427,
      latitude: 37.7462,
      height: 0,
      span: 4000,
    });
    const H = 150;
    for (const tilt of [30, 45, 70, 90]) {
      // A track 1 m long straight up and down the site: heights [H, H].
      const heights = [H, H];
      const [, mount] = droneFrames(itrf, heights, { tilt, along: 50 });
      const m = frameTransform(mount, itrf, at);
      const origin = [m[12]!, m[13]!, m[14]!];
      const ray = col(m, 0);
      const to = origin.map((x, i) => x + 2000 * ray[i]!);
      const r = await terrainLineOfSight(
        origin,
        to,
        terrainQueries(ground.target),
      );
      expect(r.clear, `${tilt}°`).toBe(false);
      const hit = r.blockedAt!;
      // By hand, on the tangent plane at the nadir: the camera is the
      // gimbal below the body, H − 0.15 m up; it lands (H − 0.15)/tan(tilt)
      // ahead along the heading.
      const { east, north, up } = enuAxes(origin);
      const forward = [0, 1, 2].map((i) => ray[i]! - dot(ray, up) * up[i]!);
      const fl = Math.hypot(forward[0]!, forward[1]!, forward[2]!);
      const h = H - 0.15;
      const d = h / Math.tan(tilt * deg);
      const nadir = origin.map((x, i) => x - h * up[i]!);
      const hand =
        fl > 1e-9 ? nadir.map((x, i) => x + (d * forward[i]!) / fl) : nadir;
      const off = Math.hypot(...hand.map((x, i) => x - hit[i]!));
      // The ground curves away from the plane by d²/2R, which the ray meets
      // that ÷ sin(tilt) further along: a few mm here.
      expect(off, `${tilt}°`).toBeLessThan(
        0.001 + (d * d) / (2 * 6.3e6) / Math.sin(tilt * deg),
      );
      expect(east.length + north.length).toBe(6);
    }
  });
});

describe("the ship's sight line to the buoy over a hill", () => {
  const hill = testHill({ longitude: -122.5, latitude: 37.8, height: 40 });
  // The mast 3 km west of the crest, the buoy's light 7 km east, 3 m up.
  const buoy = hill.at(7000, 3);
  const queries = terrainQueries(hill.target);
  /** The hand clearance over the crest from a `mast` m mast. */
  const hand = (mast: number) =>
    heightOverMeridian(hill.at(-3000, mast), buoy, hill.crest.longitude)! -
    hill.crest.height;
  const verdict = async (mast: number) => {
    const from = hill.at(-3000, mast);
    const r = await terrainLineOfSight(from, buoy, queries);
    return { r, clearance: hand(mast) };
  };

  it("is blocked by the hill from a 25 m mast, as the hand clearance says", async () => {
    const { r, clearance } = await verdict(25);
    expect(clearance).toBeLessThan(0);
    expect(r.clear).toBe(false);
    // It meets the hill on its near side.
    expect(r.blockedAt).toBeDefined();
  });

  it("clears it when the mast rises above it, by the hand clearance", async () => {
    const { r, clearance } = await verdict(80);
    expect(clearance).toBeGreaterThan(10);
    expect(r.clear).toBe(true);
    // The lowest clearance is the crest's (the sea sags less than the ridge).
    expect(r.minClearance!).toBeCloseTo(Math.min(clearance, 80, 3), 1);
  });

  it("finds the mast height where it opens within the terrain's error, by hand", async () => {
    // Bisect the hand clearance's zero and check both sides a metre off.
    let lo = 25;
    let hi = 80;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (hand(mid) < 0) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    expect((await verdict(hi - 1)).r.clear).toBe(false);
    // Clear needs the terrain's error too: a little more.
    expect((await verdict(hi + 3)).r.clear).toBe(true);
    expect(tiltDown(0)[0]).toBe(1);
  });
});
