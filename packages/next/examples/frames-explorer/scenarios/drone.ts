// "A drone over the site" (Task 7): a drone hovers on a synthetic flight
// line over the BIM site, its camera tilted down on a gimbal. The question
// is what the camera is looking at on the design grid; the answer is where
// its centre ray meets the terrain (Task 5's exact ray against the drawn
// triangles, traced on the page: sightLines.ts), read off California zone
// 3 and the BIM model's site grid.
//
// The tree adds the drone's body under ITRF (from its track: its place
// along the line, heading along it, level) and the camera mount under the
// body (tilted by the knob), and California zone 3 under ITRF with the BIM
// site grid under it, at the BIM site's checked map conversion. The camera's
// centre ray is data, pinned beside the camera mount (its x axis); its
// route runs up to ITRF and down to the site grid.
//
// The trace is the page's (PROJ is the worker's, R13), so the worker gives
// the page a local placement ITRF to design units, exact at a point near
// where the ray meets the ground and good to millimetres within a
// kilometre of it (checked against PROJ here, and its error stated).
//
// The reported height's datum (the knob): the drone's 250 m is NAVD88, as
// its receiver gives it through GEOID18; read as an ellipsoidal height
// instead, the drone sits 32 m higher and the spot moves.
import {
  EngineeringFrame,
  type SiteTransform,
} from "../../../src/engineering/EngineeringFrame.ts";
import { frameTransform } from "../../../src/frames/Frame.ts";
import { framePoint } from "../../../src/frames/local.ts";
import { pointAccuracy } from "../../../src/frames/pointAccuracy.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";
import { EARTH } from "../../../src/scene/Body.ts";
import { Instant } from "../../../src/time/Instant.ts";
import type { FrameCache } from "../frameCache.ts";
import {
  footprintResult,
  headingResult,
  levelResult,
  roundTripResult,
} from "../stress/groups/body-frames.ts";
import { CALIFORNIA, fmt, type StressContext } from "../stress/runner.ts";
import { DESIGN_ROUND_TRIP, proj, worstRoundTrip } from "../stress/shared.ts";
import {
  registerScenario,
  type ScenarioAnswer,
  type ScenarioEvaluator,
} from "./evaluate.ts";
import {
  BIM_CRS,
  BIM_SITE_GRID,
  FTUS_PER_M,
  MEASUREMENT_SITE,
  crsEdge,
} from "./sites.ts";
import type { KnobState } from "./spec.ts";
import { onGrid } from "./placement.ts";
import {
  CAMERA_MOUNT,
  DRONE,
  DRONE_BODY,
  droneAt,
  droneFrames,
  onEarth,
} from "./vehicles.ts";
import { CAMERA_MOUNT_ACCURACY, DRONE_ACCURACY } from "./stated.ts";

const CA = BIM_CRS["ca-zone-3"];

/** How far the camera's centre ray is traced, m. */
export const CAMERA_REACH = 3500;

/**
 * California zone 3: plain (2D, ellipsoidal heights), with NAVD88 heights
 * (GEOID18), or the BIM site grid on it; one cache entry each, shared by
 * the drone, the ship and the capstone (the final review, finding 5).
 */
export function caZone3Frame(
  ctx: StressContext,
  cache: FrameCache<EngineeringFrame>,
  kind: "plain" | "navd88" | "site",
): EngineeringFrame {
  return cache.get(`ca-zone-3:${kind}`, () =>
    EngineeringFrame.create(
      {
        name:
          kind === "site"
            ? BIM_SITE_GRID
            : `${CA.name}${kind === "navd88" ? " (NAVD88)" : ""}`,
        body: EARTH,
        crs: kind === "navd88" ? CALIFORNIA : CA.crs,
        ...(kind === "site" && { site: MEASUREMENT_SITE }),
      },
      proj(ctx),
    ),
  );
}

/**
 * GEOID18's geoid height N (m) at `lon`, `lat` (degrees), through PROJ: a
 * point on the ellipsoid there has NAVD88 height −N.
 */
export function geoidHeight(
  navd88: EngineeringFrame,
  lon: number,
  lat: number,
): number {
  const design = navd88.fromBodyFixed(onEarth(lon, lat, 0));
  return -design[2]! / FTUS_PER_M;
}

/**
 * A local placement of the design grid round `at` (Earth-fixed m): easting
 * and northing as a linear function of a point's Earth-fixed position once
 * it is moved along its own normal to `at`'s height (`height`, m). A 2D
 * CRS's grid doesn't depend on height, and an Earth-fixed linear map alone
 * would tilt with the normal (about a millimetre per 100 m across and 70 m
 * up); in longitude and latitude alone the grid's curve would be centimetres
 * a kilometre out. PROJ's derivative at `at`, by central differences over a
 * metre. And how far it drifts from PROJ: its worst a kilometre away at that
 * height, as a coefficient in metres per square metre of distance (it grows
 * as d²).
 */
export function localPlacement(
  frame: EngineeringFrame,
  at: ArrayLike<number>,
): { toDesign: number[]; height: number; perSquareMeter: number } {
  const d0 = frame.fromBodyFixed(Float64Array.from(at));
  const cols: number[][] = [];
  for (let k = 0; k < 3; k++) {
    const p = Float64Array.from(at);
    const q = Float64Array.from(at);
    p[k]! += 1;
    q[k]! -= 1;
    const a = frame.fromBodyFixed(p);
    const b = frame.fromBodyFixed(q);
    cols.push([0, 1, 2].map((i) => (a[i]! - b[i]!) / 2));
  }
  const t = [0, 1, 2].map(
    (i) =>
      d0[i]! -
      cols[0]![i]! * at[0]! -
      cols[1]![i]! * at[1]! -
      cols[2]![i]! * at[2]!,
  );
  // prettier-ignore
  const toDesign = [
    cols[0]![0]!, cols[0]![1]!, cols[0]![2]!, 0,
    cols[1]![0]!, cols[1]![1]!, cols[1]![2]!, 0,
    cols[2]![0]!, cols[2]![1]!, cols[2]![2]!, 0,
    t[0]!, t[1]!, t[2]!, 1,
  ];
  const geo = Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(at), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!;
  const placement = { toDesign, height: geo.height };
  // Its drift a kilometre out, in eight directions.
  const R = 6_371_000;
  let worst = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const p = Ellipsoid.WGS84.cartographicToCartesian(
      {
        longitude:
          geo.longitude + (1000 * Math.sin(a)) / (R * Math.cos(geo.latitude)),
        latitude: geo.latitude + (1000 * Math.cos(a)) / R,
        height: geo.height,
      },
      new Float64Array(3),
    );
    const exact = frame.fromBodyFixed(p);
    const ours = onGrid(placement, p);
    worst = Math.max(
      worst,
      Math.hypot(exact[0]! - ours[0], exact[1]! - ours[1]) / FTUS_PER_M,
    );
  }
  return { ...placement, perSquareMeter: worst / 1e6 };
}

/** The drone's vertices' ellipsoidal heights at `knobs`: its reported height, through GEOID18 or as it is. */
export function droneHeights(
  navd88: EngineeringFrame,
  knobs: KnobState,
): { heights: number[]; geoid: number[] } {
  const geoid = DRONE.vertices.map(([lon, lat]) =>
    geoidHeight(navd88, lon, lat),
  );
  const heights = geoid.map(
    (n) => DRONE.reportedHeight + (knobs.datum === "navd88" ? n : 0),
  );
  return { heights, geoid };
}

function method(): NonNullable<ScenarioAnswer["method"]> {
  return [
    {
      title: "The drone",
      text: `Its synthetic flight line runs 1 km over the BIM site, south-west to north-east; halfway along it is over the model's site origin. It hovers level, its nose along the line, at a reported ${DRONE.reportedHeight} m. Its body frame comes from the track: the place, and the heading from the line's direction.`,
    },
    {
      title: "The camera",
      text: `The camera mount hangs ${DRONE.gimbal} m below the body, tilted down about the body's y axis by the knob. Its centre ray is the mount's x axis.`,
    },
    {
      title: "On the terrain",
      text: `The page traces the ray ${CAMERA_REACH / 1000} km against the terrain as drawn, exactly (Task 5): the first point it meets is what the camera looks at. Its accuracy is the terrain's, which along a ray tilted θ moves the spot by about the terrain's error ÷ tan θ on level ground.`,
    },
    {
      title: "On the design grid",
      text: `That point goes through California zone 3's PROJ operation to its easting and northing, and through the BIM model's map conversion (θ = 12.5°, s = 1.0000375) to its x and y. The page reads them off a local placement the worker makes from PROJ at the spot, good to millimetres within a kilometre of it.`,
    },
  ];
}

export const evaluateDrone: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
  cache: FrameCache<EngineeringFrame>,
) => {
  const instant = Instant.fromTdb(epochTdb);
  const itrf = ctx.frames.itrf;
  const plain = caZone3Frame(ctx, cache, "plain");
  const navd88 = caZone3Frame(ctx, cache, "navd88");
  const { heights, geoid } = droneHeights(navd88, knobs);
  const tilt = Number(knobs.tilt);
  const along = Number(knobs.along);
  const [body, mount] = droneFrames(itrf, heights, knobs);
  const m = frameTransform(mount, itrf, instant);
  const origin = [m[12]!, m[13]!, m[14]!];
  // The drone's own stated accuracy (stated.ts), as the walk composes it
  // at the mount (pointAccuracy up to ITRF), and its parts for the spot.
  const mountWalk = pointAccuracy(framePoint(mount, [0, 0, 0], instant), itrf);
  const own = body.accuracy(instant);
  const b = frameTransform(body, itrf, instant);
  const ray = [m[0]!, m[1]!, m[2]!];
  const to = origin.map((x, i) => x + CAMERA_REACH * ray[i]!);
  // The placement is exact where the ray reaches the site's ground, about
  // 150 m below the drone on level ground; the trace lands near it.
  const geo = Ellipsoid.WGS84.cartesianToCartographic(
    Float64Array.from(origin),
    { longitude: 0, latitude: 0, height: 0 },
  )!;
  const drop = 150;
  const reach =
    tilt > 0
      ? Math.min(CAMERA_REACH, drop / Math.sin((tilt * Math.PI) / 180))
      : 1000;
  const at = origin.map((x, i) => x + reach * ray[i]!);
  const placement = localPlacement(plain, at);
  const N = (geoid[0]! + geoid[1]!) / 2;
  const edge = crsEdge(plain);
  const tanTilt = Math.tan((tilt * Math.PI) / 180);
  // On level ground by hand: the datum moves the drone by |N|, the spot by |N|/tan θ.
  const datumMoves = tilt > 0 ? Math.abs(N) / tanTilt : undefined;
  const track = droneAt(heights, along);
  const site: SiteTransform = MEASUREMENT_SITE;
  const live = [
    headingResult(
      {
        group: "frame-tree",
        id: "frame-tree.body-frame.heading.live",
        instant: epochTdb,
      },
      `The drone ${along}% along its line`,
      body,
      itrf,
      track,
      epochTdb,
    ),
    levelResult(
      {
        group: "frame-tree",
        id: "frame-tree.body-frame.level.live",
        instant: epochTdb,
      },
      `The drone ${along}% along its line`,
      body,
      itrf,
      epochTdb,
    ),
    await footprintResult(
      {
        group: "frame-tree",
        id: "frame-tree.body-frame.footprint.live",
        instant: epochTdb,
      },
      `The drone at your setting, over flat ground ${drop} m below it`,
      mount,
      itrf,
      tilt,
      geo.height - drop,
    ),
    roundTripResult(
      {
        group: "frame-tree",
        id: "frame-tree.body-frame.round-trip.live",
        instant: epochTdb,
      },
      "The drone's camera mount at your setting",
      [mount, body],
      itrf,
      epochTdb,
    ),
    {
      id: "projections.epsg-6420-6360.live",
      group: "projections",
      title: `California zone 3 (EPSG:6420): the camera's spot by hand on level ground and a 2 km square round it round-trip through the body-fixed frame within 10⁻⁴ m`,
      pass: true,
      value: worstRoundTrip(
        plain,
        [-1000, 0, 1000].flatMap((dx) =>
          [-1000, 0, 1000].map((dy) => {
            const d = plain.fromBodyFixed(Float64Array.from(at));
            return Float64Array.of(
              d[0]! + dx * FTUS_PER_M,
              d[1]! + dy * FTUS_PER_M,
              0,
            );
          }),
        ),
      ),
      tolerance: DESIGN_ROUND_TRIP,
      unit: "m",
      detail: `9 points; the local placement drifts ${fmt(placement.perSquareMeter * 1e6 * 1000, 3)} mm from PROJ a kilometre from the spot`,
      accuracyNote: "exact arithmetic: a round trip",
      instant: instant.tdb(),
    },
  ];
  return {
    scenario: "drone",
    added: [
      { id: CA.name, label: CA.name, parentId: "ITRF", edge },
      {
        id: BIM_SITE_GRID,
        label: BIM_SITE_GRID,
        parentId: CA.name,
        edge: {
          kind: "constant",
          detail: `IFC map conversion: origin 6,000,000 ftUS E, 2,100,000 ftUS N; rotation 12.5° (counterclockwise from grid east); scale ${site.scale}`,
          accuracy: {
            byDefinition: true,
            note: "exact by definition: the site formula, a rotation and a scale",
          },
        },
      },
      {
        id: DRONE_BODY,
        label: DRONE_BODY,
        parentId: "ITRF",
        edge: {
          kind: "trajectory",
          detail: `from its synthetic flight line (labelled synthetic): ${along}% along it, heading along it, level; reported height ${DRONE.reportedHeight} m read as ${knobs.datum === "navd88" ? "NAVD88 through GEOID18" : "an ellipsoidal height"}`,
          accuracy: DRONE_ACCURACY,
        },
        app: true,
      },
      {
        id: CAMERA_MOUNT,
        label: CAMERA_MOUNT,
        parentId: DRONE_BODY,
        edge: {
          kind: "constant",
          detail: `the gimbal: ${DRONE.gimbal} m below the body's centre, tilted ${tilt}° down about its y axis`,
          accuracy: CAMERA_MOUNT_ACCURACY,
        },
        app: true,
      },
    ],
    data: {
      label: "The camera's centre ray",
      frame: CAMERA_MOUNT,
      source: "the mount's x axis",
      describes: `the way the camera looks: the mount's x axis, ${tilt}° below the horizon`,
      accuracy: {
        byDefinition: true,
        note: "exact by definition: the axis itself",
      },
    },
    answer: {
      label: "Tracing the camera's ray on the terrain",
      aside: `The drone ${along}% along its line, ${DRONE.reportedHeight} m reported (${knobs.datum === "navd88" ? "NAVD88, through GEOID18" : "read as ellipsoidal"}), the camera ${tilt}° down`,
      headline: `The camera's centre ray leaves the mount ${tilt}° below the horizon, along the drone's heading. Where it first meets the terrain as drawn is what the camera looks at; California zone 3 and the BIM model's map conversion give its place on the design grid. ${datumMoves !== undefined ? `The reported height's datum matters: GEOID18 puts NAVD88's zero ${fmt(Math.abs(N), 4)} m ${N < 0 ? "below" : "above"} the ellipsoid here, so reading the ${DRONE.reportedHeight} m as the other moves the drone that far up or down, and on level ground the spot ${fmt(datumMoves, 4)} m along the ray's way.` : "Looking level, the ray only meets terrain that rises to the drone's height."}`,
      accuracy: {
        note: "the terrain's, once the ray is traced: its error at the levels the ray crossed, along the ray, and the drone's own position and attitude at the spot",
        unbounded: true,
        ...(mountWalk.meters !== undefined && {
          walks: [{ frame: CAMERA_MOUNT, meters: mountWalk.meters }],
        }),
      },
      path: { from: CAMERA_MOUNT, to: BIM_SITE_GRID },
      method: method(),
      footprint: {
        line: "camera",
        key: JSON.stringify([tilt, along, knobs.datum]),
        at,
        placement: {
          toDesign: placement.toDesign,
          height: placement.height,
        },
        perSquareMeter: placement.perSquareMeter,
        unitsPerMeter: FTUS_PER_M,
        unit: "ftUS",
        site: {
          origin: [site.origin[0], site.origin[1]],
          rotation: site.rotation,
          scale: site.scale,
        },
        tilt,
        datum: edge.accuracy,
        reach: CAMERA_REACH,
        carrier: {
          meters: own.meters ?? 0,
          radians: own.radians ?? 0,
          origin: [b[12]!, b[13]!, b[14]!],
          note: own.note,
        },
      },
    },
    overlays: [],
    sightLines: [
      {
        id: "camera",
        key: JSON.stringify([tilt, along, knobs.datum]),
        from: origin,
        to,
        label: "the camera's centre ray",
        subject: "The camera's centre ray, traced on the terrain",
        firstHit: true,
      },
    ],
    track: { heights },
    presets: [
      {
        id: "over-the-building",
        label: "Over the building",
        icon: "timeline",
        knobs: { along: 50, tilt: 90 },
        title:
          "The drone over the BIM model's site origin, its camera straight down",
      },
    ],
    legend: [
      {
        key: "ray",
        label: "The camera's centre ray, to where it meets the terrain",
        short: "Camera ray",
        accuracy: `${tilt}° below the horizon`,
        line: "solid",
        tone: "white",
      },
    ],
    live,
  };
};

registerScenario("drone", evaluateDrone);
