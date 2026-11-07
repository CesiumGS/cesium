// The drone over the BIM site and the ship entering San Francisco Bay
// (Task 7): their synthetic tracks, their body frames (bodyFrame.ts), the
// drone's camera mount and the ship's mast sensor, the ship's modelled sea
// state, and the buoy the mast looks for. Plain data and pure functions:
// the worker's evaluators (drone.ts, ship.ts) and the page (the triads, the
// lines placed every frame, the buoy's window) read the same ones, so the
// page's geometry is the worker's (Task 4c's rule).
//
// Heights come in as ellipsoidal heights, one per vertex: the worker turns
// the reported heights (the drone's, the sea's) into them through GEOID18
// or not, as the datum knob says, and the page builds the same track from
// them. Light imports only: the page never bundles PROJ.
import { Frame } from "../../../src/frames/Frame.ts";
import { Ellipsoid, fromDegrees } from "../../../src/math/ellipsoid.ts";
import {
  headingOf,
  tiltDown,
  trackFrame,
  type BodyTrack,
} from "./bodyFrame.ts";
import { BIM_PLACES, offsetPlace } from "./sites.ts";
import type { KnobState } from "./spec.ts";

const deg = Math.PI / 180;

export const DRONE_BODY = "Drone body";
export const CAMERA_MOUNT = "Camera mount";
export const SHIP_BODY = "Ship body";
export const MAST_SENSOR = "Mast sensor";

/** A track of straight legs: its vertices (longitude, latitude, degrees), each with its ellipsoidal height (m). */
export interface LegTrack {
  vertices: readonly (readonly [number, number])[];
  heights: readonly number[];
}

/** Earth-fixed (WGS 84) at `lon`, `lat` (degrees) and height `h` (m). */
export const onEarth = (lon: number, lat: number, h: number): Float64Array =>
  Ellipsoid.WGS84.cartographicToCartesian(
    fromDegrees(lon, lat, h),
    new Float64Array(3),
  );

/**
 * Each leg's length, m: the chord between its ends on the ellipsoid. Not
 * at their heights: the datum knob lifts a body, it never moves it along
 * its track (at 32 m up a 30 km track would be 15 cm longer).
 */
export function legLengths(track: Pick<LegTrack, "vertices">): number[] {
  const p = track.vertices.map((v) => onEarth(v[0], v[1], 0));
  return p.slice(1).map((b, i) => {
    const a = p[i]!;
    return Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!);
  });
}

/**
 * The point `s` metres along `track` (clamped to its ends): longitude,
 * latitude and height interpolated along its leg, and the leg's direction
 * (its chord's, Earth-fixed unit), which the body holds past either end.
 */
export function alongTrack(
  track: LegTrack,
  s: number,
): { position: Float64Array; direction: number[]; leg: number } {
  const lengths = legLengths(track);
  let leg = 0;
  let rest = Math.max(0, s);
  while (leg < lengths.length - 1 && rest > lengths[leg]!) {
    rest -= lengths[leg]!;
    leg++;
  }
  const f = Math.min(1, rest / lengths[leg]!);
  const [a, b] = [track.vertices[leg]!, track.vertices[leg + 1]!];
  const [ha, hb] = [track.heights[leg]!, track.heights[leg + 1]!];
  const position = onEarth(
    a[0] + f * (b[0] - a[0]),
    a[1] + f * (b[1] - a[1]),
    ha + f * (hb - ha),
  );
  const pa = onEarth(a[0], a[1], ha);
  const pb = onEarth(b[0], b[1], hb);
  const d = [0, 1, 2].map((i) => pb[i]! - pa[i]!);
  const l = Math.hypot(d[0]!, d[1]!, d[2]!);
  return { position, direction: d.map((x) => x / l), leg };
}

const POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** "053° (NE)": a velocity's heading at a place, degrees from north. */
export function headingText(
  position: ArrayLike<number>,
  velocity: ArrayLike<number>,
): string {
  const h = (((headingOf(position, velocity) / deg) % 360) + 360) % 360;
  return `${Math.round(h).toString().padStart(3, "0")}° (${POINTS[Math.round(h / 45) % 8]})`;
}

// ------------------------------------------------------------------ drone

/**
 * The drone's synthetic flight line over the BIM site: 1 km straight from
 * 400 m west and 300 m south of the model's site origin to as far east and
 * north (a heading of about 53°), so halfway along it is over the origin.
 * Its reported height is 250 m, NAVD88 as its receiver gives it through
 * GEOID18 (synthetic, labelled so).
 */
export const DRONE = (() => {
  const o = BIM_PLACES["san-francisco"];
  const a = offsetPlace(o.longitude, o.latitude, -400, -300);
  const b = offsetPlace(o.longitude, o.latitude, 400, 300);
  return {
    vertices: [
      [a.longitude, a.latitude],
      [b.longitude, b.latitude],
    ] as const,
    reportedHeight: 250,
    /** The camera's gimbal below the body's centre, m. */
    gimbal: 0.15,
  };
})();

/** The drone's track with its vertices' ellipsoidal heights. */
export const droneTrack = (heights: readonly number[]): LegTrack => ({
  vertices: DRONE.vertices,
  heights,
});

/** Where the drone hovers, `along` percent of the way down its line: still, its nose along the line. */
export function droneAt(heights: readonly number[], along: number): BodyTrack {
  const track = droneTrack(heights);
  const length = legLengths(track)[0]!;
  const { position, direction } = alongTrack(track, (along / 100) * length);
  return { at: () => ({ position, velocity: direction }) };
}

/**
 * The drone's body (level: it hovers) and its camera mount, tilted down by
 * the knob about the body's y, its gimbal below the body's centre.
 */
export function droneFrames(
  itrf: Frame,
  heights: readonly number[],
  knobs: KnobState,
): [Frame, Frame] {
  const body = trackFrame(
    DRONE_BODY,
    itrf,
    droneAt(heights, Number(knobs.along)),
  );
  const mount = Frame.constant(
    CAMERA_MOUNT,
    body,
    tiltDown(Number(knobs.tilt) * deg, [0, 0, -DRONE.gimbal]),
  );
  return [body, mount];
}

// ------------------------------------------------------------------- ship

/** Knots to m/s (the international nautical mile, 1,852 m). */
export const KNOT = 1852 / 3600;

/**
 * The ship's synthetic track, inbound along the Off San Francisco traffic
 * separation scheme (33 CFR 167.400–167.406, NAD 83, taken as WGS 84: they
 * differ by about 1.5 m here):
 *
 *  - up the Southern approach's northbound lane (167.403(b)), on its
 *    centreline at 122°39.80′W (between the separation zone's 122°40.40′
 *    and the lane's 122°39.20′), from 37°33.00′N to its end at 37°39.20′N;
 *  - across the precautionary area (167.401) to the main ship channel's
 *    eastbound lane (167.405(b));
 *  - along that lane's centreline (midway between the separation line,
 *    167.405(a), and the lane's outer line) to its end at 122°30.90′W,
 *    off Mile Rocks, short of the Golden Gate.
 *
 * At 12 knots, straight legs and an instant turn at each vertex. The
 * sections' coordinates are in references.json
 * (cfr-33-167-off-san-francisco, an input).
 */
export const SHIP = {
  vertices: [
    [-(122 + 39.8 / 60), 37 + 33.0 / 60],
    [-(122 + 39.8 / 60), 37 + 39.2 / 60],
    [-(122 + 37.85 / 60), 37 + 45.85 / 60],
    [-(122 + 34.3 / 60), 37 + 46.893 / 60],
    [-(122 + 30.9 / 60), 37 + 47.95 / 60],
  ] as const,
  speed: 12 * KNOT,
  /** When it is at the first vertex. */
  startUtc: "2026-03-01T17:00:00Z",
} as const;

/** The ship's track with its vertices' ellipsoidal heights (the sea's, at the waterline). */
export const shipTrack = (heights: readonly number[]): LegTrack => ({
  vertices: SHIP.vertices,
  heights,
});

/** The ship's track's length, m, and how long it takes, s. */
export function shipSpan(heights: readonly number[]): {
  length: number;
  seconds: number;
} {
  const length = legLengths(shipTrack(heights)).reduce((a, b) => a + b, 0);
  return { length, seconds: length / SHIP.speed };
}

/** The ship at a TDB time, `startTdb` its start: at its first vertex before, at its last after. */
export function shipAt(
  heights: readonly number[],
  startTdb: number,
): BodyTrack {
  const track = shipTrack(heights);
  return {
    at: (tdb) => {
      const { position, direction } = alongTrack(
        track,
        (tdb - startTdb) * SHIP.speed,
      );
      return {
        position,
        velocity: direction.map((d) => d * SHIP.speed),
      };
    },
  };
}

/**
 * The ship's modelled sea state (synthetic, labelled): a gentle swell
 * pitching it ±1° over 9 s and rolling it ±2.5° over 12 s.
 */
export const SEA_STATE = {
  pitch: { amplitude: 1, period: 9 },
  roll: { amplitude: 2.5, period: 12 },
} as const;

/** The sea state's pitch and roll at a TDB time, radians. */
export function seaState(tdb: number): { pitch: number; roll: number } {
  const p = SEA_STATE.pitch;
  const r = SEA_STATE.roll;
  return {
    pitch: p.amplitude * deg * Math.sin((2 * Math.PI * tdb) / p.period + 0.3),
    roll: r.amplitude * deg * Math.sin((2 * Math.PI * tdb) / r.period),
  };
}

/** The ship's body (its origin at the waterline amidships, pitching and rolling) and its mast sensor `mast` m above it. */
export function shipFrames(
  itrf: Frame,
  heights: readonly number[],
  startTdb: number,
  mast: number,
): [Frame, Frame] {
  const body = trackFrame(SHIP_BODY, itrf, shipAt(heights, startTdb), seaState);
  // prettier-ignore
  const sensor = Frame.constant(MAST_SENSOR, body, [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, mast, 1,
  ]);
  return [body, sensor];
}

/**
 * The buoy the mast looks for: Harding Rock Lighted Buoy HR, inside the
 * Golden Gate, past the headlands from the approach. Its position is the
 * USCG Light List's (Volume VI, District 11), as the San Francisco YRA
 * marks compilation transcribes it (references.json
 * uscg-light-list-harding-rock); its light's height above the water is
 * assumed (a lighted buoy's is a few metres; the Light List gives none).
 */
export const BUOY = {
  name: "Harding Rock Lighted Buoy HR",
  short: "Buoy HR",
  longitude: -122.44599,
  latitude: 37.83824,
  lightHeight: 3,
} as const;

/** The buoy's light, Earth-fixed, with the sea at ellipsoidal height `sea` there. */
export const buoyLight = (sea: number): Float64Array =>
  onEarth(BUOY.longitude, BUOY.latitude, sea + BUOY.lightHeight);

/**
 * How far from each end of the mast's sight line (m) the path counts as
 * over that end's own ground: the sea the buoy floats on (the drawn
 * triangle under it caps it, `terrainLineOfSight`'s `groundRadius`).
 * Without it, a light 3 m above the water would always sit inside the
 * drawn sea's error and never read as in sight.
 */
export const BUOY_GROUND = 1500;
