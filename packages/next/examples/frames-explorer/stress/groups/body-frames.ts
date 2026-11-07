// Moving bodies' frames (Task 7): the drone's and the ship's, from their
// tracks (scenarios/bodyFrame.ts). Each check is a hand formula or a round
// trip; none cites a published value. The catalog runs them at the
// scenarios' checked setups (frame-tree.body-frame.*); the drone and the
// ship re-run the same functions live at their knobs.
import { frameTransform, type Frame } from "../../../../src/frames/Frame.ts";
import { Ellipsoid } from "../../../../src/math/ellipsoid.ts";
import { terrainLineOfSight } from "../../../../src/measure/terrainLineOfSight.ts";
import { Instant } from "../../../../src/time/Instant.ts";
import { trackFrame, type BodyTrack } from "../../scenarios/bodyFrame.ts";
import { heightOverMeridian, testHill } from "../../scenarios/testHill.ts";
import {
  DRONE,
  droneFrames,
  onEarth,
  shipFrames,
  SHIP,
} from "../../scenarios/vehicles.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import { stressCase } from "../shared.ts";

const deg = Math.PI / 180;
const GROUP = "frame-tree";
const ID = "frame-tree.body-frame";

type Base = Pick<StressResult, "group"> & { instant?: number };

/** Up, east and north at `p` from its geodetic latitude and longitude, by hand. */
function handEnu(p: ArrayLike<number>) {
  const c = Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(p), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!;
  const [sl, cl] = [Math.sin(c.longitude), Math.cos(c.longitude)];
  const [sp, cp] = [Math.sin(c.latitude), Math.cos(c.latitude)];
  return {
    east: [-sl, cl, 0],
    north: [-sp * cl, -sp * sl, cp],
    up: [cp * cl, cp * sl, sp],
    height: c.height,
  };
}

const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const col = (m: ArrayLike<number>, c: number) => [
  m[4 * c]!,
  m[4 * c + 1]!,
  m[4 * c + 2]!,
];
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
/** The angle between unit vectors, rad (atan2: exact near 0). */
const angle = (a: number[], b: number[]) =>
  Math.atan2(
    Math.hypot(
      a[1]! * b[2]! - a[2]! * b[1]!,
      a[2]! * b[0]! - a[0]! * b[2]!,
      a[0]! * b[1]! - a[1]! * b[0]!,
    ),
    dot(a, b),
  );

/** Heading: the body's x against the track's horizontal velocity's azimuth, by hand. */
export function headingResult(
  base: Base & { id: string },
  where: string,
  body: Frame,
  itrf: Frame,
  track: BodyTrack,
  tdb: number,
): StressResult {
  const m = frameTransform(body, itrf, Instant.fromTdb(tdb));
  const { position, velocity } = track.at(tdb);
  const { east, north } = handEnu(position);
  const hand = Math.atan2(dot(velocity, east), dot(velocity, north));
  const x = col(m, 0);
  const ours = Math.atan2(dot(x, east), dot(x, north));
  const off = Math.abs(
    Math.atan2(Math.sin(ours - hand), Math.cos(ours - hand)),
  );
  return {
    ...base,
    title: `${where}: the body's heading (its x axis) against the track's horizontal velocity's azimuth, resolved on east and north from the geodetic latitude and longitude by hand, within 10⁻⁹°`,
    pass: true,
    value: off / deg,
    tolerance: 1e-9,
    unit: "°",
    detail: `heading ${fmt(ours / deg, 9)}°; by hand ${fmt((hand / deg + 360) % 360, 9)}°`,
    accuracyNote: "exact arithmetic: a hand formula",
  };
}

/** Level: the body's z along the local up (the geodetic normal by hand), and x horizontal. */
export function levelResult(
  base: Base & { id: string },
  where: string,
  body: Frame,
  itrf: Frame,
  tdb: number,
): StressResult {
  const m = frameTransform(body, itrf, Instant.fromTdb(tdb));
  const { up } = handEnu([m[12]!, m[13]!, m[14]!]);
  const z = col(m, 2);
  const tilt = angle(z, up);
  return {
    ...base,
    title: `${where}, level: the body's z axis along the local up (the geodetic normal from latitude and longitude by hand), within 10⁻¹² rad`,
    pass: Math.abs(dot(col(m, 0), up)) < 1e-12,
    value: tilt,
    tolerance: 1e-12,
    unit: "rad",
    detail: `z from up ${fmt(tilt)} rad; x·up ${fmt(dot(col(m, 0), up))}`,
    accuracyNote: "exact arithmetic: a hand formula",
  };
}

/**
 * Roll: the body rolled by `roll` against the same body unrolled (at the
 * same pitch): y turned about x by the roll, x unchanged.
 */
export function rollResult(
  base: Base & { id: string },
  where: string,
  itrf: Frame,
  track: BodyTrack,
  tdb: number,
  attitude: { pitch: number; roll: number },
): StressResult {
  const instant = Instant.fromTdb(tdb);
  const rolled = frameTransform(
    trackFrame("rolled", itrf, track, () => attitude),
    itrf,
    instant,
  );
  const unrolled = frameTransform(
    trackFrame("unrolled", itrf, track, () => ({ ...attitude, roll: 0 })),
    itrf,
    instant,
  );
  const [y1, y0, z0] = [col(rolled, 1), col(unrolled, 1), col(unrolled, 2)];
  const turned = angle(y1, y0);
  const sense = Math.sign(dot(y1, z0)) * Math.sign(attitude.roll);
  const xMoved = angle(col(rolled, 0), col(unrolled, 0));
  return {
    ...base,
    title: `${where}: a roll of ${fmt(attitude.roll / deg, 4)}° turns the body's y about its x by that much, its right side down (y toward z), and leaves x where it was, within 10⁻¹² rad`,
    pass: xMoved < 1e-12 && (attitude.roll === 0 || sense > 0),
    value: Math.abs(turned - Math.abs(attitude.roll)),
    tolerance: 1e-12,
    unit: "rad",
    detail: `y turned ${fmt(turned / deg, 12)}°; x moved ${fmt(xMoved)} rad; pitch ${fmt(attitude.pitch / deg, 4)}°`,
    accuracyNote: "exact arithmetic: a hand formula",
  };
}

/**
 * The camera's footprint over flat ground (a test tile at the ground's
 * height under the drone): where the library's terrain ray meets it,
 * against the hand ray–plane intersection on the tangent plane at the
 * nadir, (H − gimbal)/tan(tilt) ahead along the heading. The plane leaves
 * the curved ground by d²/2R, which moves the spot d²/2R ÷ sin(tilt)
 * further along the ray: the tolerance carries it.
 */
export function footprintResult(
  base: Base & { id: string },
  where: string,
  mount: Frame,
  itrf: Frame,
  tilt: number,
  ground: number,
): StressResult {
  const m = frameTransform(mount, itrf, Instant.fromTdb(0));
  const origin = [m[12]!, m[13]!, m[14]!];
  const { up, height } = handEnu(origin);
  const c = Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(origin), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!;
  const flat = testHill({
    longitude: c.longitude / deg,
    latitude: c.latitude / deg,
    height: 0,
    sea: ground,
    span: 8000,
  });
  const ray = col(m, 0);
  const reach = 3500;
  const to = origin.map((x, i) => x + reach * ray[i]!);
  const r = terrainLineOfSight(origin, to, flat.target);
  const h = height - ground;
  const d = tilt > 0 ? h / Math.tan(tilt * deg) : Infinity;
  const forward = [0, 1, 2].map((i) => ray[i]! - dot(ray, up) * up[i]!);
  const fl = Math.hypot(forward[0]!, forward[1]!, forward[2]!);
  const nadir = origin.map((x, i) => x - h * up[i]!);
  const hand =
    fl > 1e-9 ? nadir.map((x, i) => x + (d * forward[i]!) / fl) : nadir;
  const reaches = Math.hypot(d, h) < reach;
  // The ground falls d²/2R below the plane; the ray, tilted down, meets it
  // that ÷ sin(tilt) further along itself.
  const tolerance =
    1e-3 + (d * d) / (2 * 6_371_000) / Math.max(Math.sin(tilt * deg), 1e-9);
  if (!reaches) {
    return {
      ...base,
      title: `${where}: tilted ${tilt}° the camera's centre ray reaches flat ground ${fmt(d, 4)} m ahead by hand, beyond the ${reach} m it is traced: the library finds no ground within it`,
      pass: r.clear === true || r.clear === undefined,
      detail: `library: ${r.clear === false ? "met the ground" : "no ground"}`,
      accuracyNote: "exact arithmetic: a hand formula",
    };
  }
  const off = r.blockedAt ? dist(r.blockedAt, hand) : Infinity;
  return {
    ...base,
    title: `${where}: tilted ${tilt}° the camera's centre ray meets flat ground ${fmt(h, 4)} m below where the hand ray–plane intersection puts it, (H − ${DRONE.gimbal} m)/tan(tilt) = ${fmt(d, 4)} m ahead, within 1 mm plus the plane's departure from the curved ground, d²/2R ÷ sin(tilt) along the ray`,
    pass: r.clear === false,
    value: off,
    tolerance,
    unit: "m",
    detail: `library ${r.clear === false ? "met the ground" : "found no ground"}; ${fmt(off * 1000, 4)} mm from the hand point`,
    accuracyNote: "exact arithmetic: a hand formula (the test ground is exact)",
  };
}

/** Points 1 km out along each frame's axes, to ITRF and back. */
export function roundTripResult(
  base: Base & { id: string },
  where: string,
  frames: readonly Frame[],
  itrf: Frame,
  tdb: number,
): StressResult {
  const instant = Instant.fromTdb(tdb);
  let worst = 0;
  for (const f of frames) {
    const there = frameTransform(f, itrf, instant);
    const direct = frameTransform(itrf, f, instant);
    for (const p of [
      [1000, 0, 0],
      [0, 1000, 0],
      [0, 0, 1000],
      [250, -400, 75],
    ]) {
      const q = [0, 1, 2].map(
        (i) =>
          there[i]! * p[0]! +
          there[4 + i]! * p[1]! +
          there[8 + i]! * p[2]! +
          there[12 + i]!,
      );
      const r = [0, 1, 2].map(
        (i) =>
          direct[i]! * q[0]! +
          direct[4 + i]! * q[1]! +
          direct[8 + i]! * q[2]! +
          direct[12 + i]!,
      );
      worst = Math.max(worst, dist(r, p));
    }
  }
  return {
    ...base,
    title: `${where}: points a kilometre out along ${frames.map((f) => f.name).join(" and ")} go to ITRF and back within 1 µm`,
    pass: true,
    value: worst,
    tolerance: 1e-6,
    unit: "m",
    detail: `${frames.length * 4} points; the worst ${fmt(worst)} m`,
    accuracyNote: "exact arithmetic: a round trip",
  };
}

/** The test hill's ridge, and where the mast and the buoy stand either side of it. */
export const HILL = {
  height: 40,
  mastEast: -3000,
  buoyEast: 7000,
} as const;

/**
 * The mast's sight line to a buoy over the test hill, from `mast` m: the
 * library's verdict (`terrainLineOfSight` over the drawn tile) against the
 * hand clearance over the crest (the segment's height where it crosses
 * the crest's meridian, less the crest's). Blocked when the hand clearance
 * is negative; clear when it is more than the tile's error; between, the
 * library may say "may block", which the hand formula can't contradict.
 */
export function sightOverHillResult(
  base: Base & { id: string },
  where: string,
  masts: readonly number[],
): StressResult {
  const hill = testHill({
    longitude: -122.5,
    latitude: 37.8,
    height: HILL.height,
  });
  const buoy = hill.at(HILL.buoyEast, 3);
  const rows = masts.map((mast) => {
    const from = hill.at(HILL.mastEast, mast);
    const r = terrainLineOfSight(from, buoy, hill.target);
    const clearance =
      heightOverMeridian(from, buoy, hill.crest.longitude)! - hill.crest.height;
    const error = r.accuracy.meters ?? 0;
    const agrees =
      clearance < 0
        ? r.clear === false
        : clearance > error + 1
          ? r.clear === true
          : r.clear !== false || clearance < error;
    return { mast, clearance, clear: r.clear, agrees };
  });
  const words = (c: boolean | undefined) =>
    c === true ? "clear" : c === false ? "blocked" : "may block";
  return {
    ...base,
    title: `${where}: a mast's sight line to a buoy's light (3 m up) past a ${HILL.height} m ridge ${-HILL.mastEast / 1000} km ahead, from ${masts.map((m) => `${fmt(m, 3)} m`).join(" and ")}: the library's verdict over the drawn test hill against the hand clearance over its crest`,
    pass: rows.every((r) => r.agrees),
    detail: rows
      .map(
        (r) =>
          `${fmt(r.mast, 3)} m: library ${words(r.clear)}, by hand ${r.clearance >= 0 ? "clears" : "is below"} the crest by ${fmt(Math.abs(r.clearance), 4)} m`,
      )
      .join("; "),
    accuracyNote:
      "exact arithmetic: the test hill is exact; the ridge's height is drawn to its tile's quantization",
  };
}

/** The drone's checked pose, its ground 150 m below (ellipsoidal heights). */
const CHECKED_DRONE = { tilt: 45, along: 50, height: 150 };

/** The ship's checked time on its track (s after its start) and its mast. */
const CHECKED_SHIP = { seconds: 80 * 60, mast: 25, sea: -32 };

export const bodyFrameCase: StressCase = stressCase(
  ID,
  GROUP,
  "Moving bodies' frames from their tracks (the drone's and the ship's): the heading, level and roll against hand formulas, the drone's footprint over flat ground against the hand ray–plane intersection, the ship's sight line over a test hill against the hand clearance, and round trips",
  ["frames"],
  async (ctx, base) => {
    const itrf = ctx.frames.itrf;
    const d = CHECKED_DRONE;
    const heights = [d.height, d.height];
    const [body, mount] = droneFrames(itrf, heights, {
      tilt: d.tilt,
      along: d.along,
    });
    // The heading's track: 3 m/s east and 4 north at the drone's place.
    const p = onEarth(DRONE.vertices[0][0], DRONE.vertices[0][1], d.height);
    const enu = handEnu(p);
    const ne: BodyTrack = {
      at: () => ({
        position: p,
        velocity: [0, 1, 2].map((i) => 3 * enu.east[i]! + 4 * enu.north[i]!),
      }),
    };
    const shipHeights = SHIP.vertices.map(() => CHECKED_SHIP.sea);
    const [ship, mast] = shipFrames(itrf, shipHeights, 0, CHECKED_SHIP.mast);
    const t = CHECKED_SHIP.seconds;
    const where = (s: string) => ({ group: GROUP, id: `${base.id}.${s}` });
    return [
      headingResult(
        where("heading"),
        "A body tracking 3 m/s east and 4 m/s north (azimuth atan2(3, 4))",
        trackFrame("north-east", itrf, ne),
        itrf,
        ne,
        0,
      ),
      levelResult(
        where("level"),
        "The drone hovering over the BIM site",
        body,
        itrf,
        0,
      ),
      rollResult(where("roll"), "A body at the drone's place", itrf, ne, 0, {
        pitch: 0,
        roll: 10 * deg,
      }),
      footprintResult(
        where("footprint"),
        `The drone ${d.height} m over flat ground`,
        mount,
        itrf,
        d.tilt,
        0,
      ),
      roundTripResult(
        where("round-trip"),
        "The drone's camera mount and the ship's mast sensor (pitching and rolling)",
        [mount, mast, ship],
        itrf,
        t,
      ),
      sightOverHillResult(where("sight-over-hill"), "A test hill", [25, 80]),
    ];
  },
);
