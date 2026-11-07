// "A ship enters San Francisco Bay" (Task 7): a ship inbound on the Off San
// Francisco traffic separation scheme (a synthetic track along the lanes of
// 33 CFR 167.400–167.406, labelled synthetic: no AIS extract small enough to
// pin exists, vehicles.ts), pitching and rolling in a modelled sea, with a
// sensor up its mast. The questions: where is the ship on the port's design
// grid (California zone 3), and can the mast see Harding Rock's buoy past
// the headlands of the Golden Gate? The time is the viewer's timeline.
//
// The tree adds the ship's body under ITRF (from its track: its place,
// heading along the lane, and the sea state's pitch and roll), the mast
// sensor under the body, and California zone 3 under ITRF. The ship's
// reference point is data, pinned beside its body; its route runs to ITRF
// and through PROJ to the grid. The mast's sight line to the buoy is traced
// on the page over the drawn terrain (Task 5, sightLines.ts): the sea's
// curve and the headlands are both in it.
//
// The height datum (the knob): the sea is at NAVD88 0 m, which GEOID18 puts
// about 32 m below the ellipsoid here; taken at the ellipsoid's 0 instead,
// the ship and the buoy float 32 m too high, and the mast sees further than
// it can. Charts use mean lower low water: plan 4b's work.
import { EngineeringFrame } from "../../../src/engineering/EngineeringFrame.ts";
import { frameTransform } from "../../../src/frames/Frame.ts";
import { EARTH } from "../../../src/scene/Body.ts";
import { Instant } from "../../../src/time/Instant.ts";
import type { FrameCache } from "../frameCache.ts";
import {
  headingResult,
  rollResult,
  roundTripResult,
  sightOverHillResult,
} from "../stress/groups/body-frames.ts";
import { CALIFORNIA, fmt, type StressContext } from "../stress/runner.ts";
import { DESIGN_ROUND_TRIP, proj, worstRoundTrip } from "../stress/shared.ts";
import { geoidHeight } from "./drone.ts";
import {
  registerScenario,
  type ScenarioAnswer,
  type ScenarioEvaluator,
} from "./evaluate.ts";
import { BIM_CRS, FTUS_PER_M, crsEdge } from "./sites.ts";
import type { KnobState } from "./spec.ts";
import {
  BUOY,
  BUOY_GROUND,
  MAST_SENSOR,
  SEA_STATE,
  SHIP,
  SHIP_BODY,
  alongTrack,
  buoyLight,
  headingText,
  seaState,
  shipAt,
  shipFrames,
  shipSpan,
  shipTrack,
} from "./vehicles.ts";

const CA = BIM_CRS["ca-zone-3"];

/** California zone 3, plain or with NAVD88 heights through GEOID18, from the scenario's cache (the capstone's ship too, Task 8). */
export function frameOf(
  ctx: StressContext,
  cache: FrameCache<EngineeringFrame>,
  kind: "plain" | "navd88",
): EngineeringFrame {
  return cache.get(`ship:${kind}`, () =>
    EngineeringFrame.create(
      {
        name: `${CA.name}${kind === "navd88" ? " (NAVD88)" : ""}`,
        body: EARTH,
        crs: kind === "navd88" ? CALIFORNIA : CA.crs,
      },
      proj(ctx),
    ),
  );
}

/** The sea's ellipsoidal height at each vertex and at the buoy: NAVD88 0 through GEOID18, or the ellipsoid's 0. */
export function seaHeights(
  navd88: EngineeringFrame,
  knobs: KnobState,
): { heights: number[]; buoySea: number; geoid: number } {
  const on = knobs.datum === "navd88";
  const heights = SHIP.vertices.map(([lon, lat]) =>
    on ? geoidHeight(navd88, lon, lat) : 0,
  );
  const geoid = geoidHeight(navd88, BUOY.longitude, BUOY.latitude);
  return { heights, buoySea: on ? geoid : 0, geoid };
}

/** "6,012,345.6 ftUS". */
const ft = (v: number) =>
  `${v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

/** "17:42 UTC". */
const hhmm = (ms: number) => `${new Date(ms).toISOString().slice(11, 16)} UTC`;

/** The leg's name, by its index along the track. */
const LEGS = [
  "up the southern approach's northbound lane",
  "across the precautionary area",
  "in the main ship channel's eastbound lane",
  "in the main ship channel's eastbound lane",
];

function method(): NonNullable<ScenarioAnswer["method"]> {
  return [
    {
      title: "The track",
      text: `Synthetic, labelled so: no public AIS extract of one vessel small enough to pin exists (NOAA's daily files are hundreds of megabytes). The ship follows the Off San Francisco traffic separation scheme's inbound lanes (33 CFR 167.400–167.406) at ${fmt(SHIP.speed / (1852 / 3600), 3)} knots: up the southern approach, across the precautionary area and along the main ship channel to Mile Rocks.`,
    },
    {
      title: "The ship's frame",
      text: `Its body frame comes from the track: the place, the heading along the lane, and a modelled sea state (synthetic: pitch ±${SEA_STATE.pitch.amplitude}° over ${SEA_STATE.pitch.period} s, roll ±${SEA_STATE.roll.amplitude}° over ${SEA_STATE.roll.period} s). The mast sensor sits up the body's z axis, so it sways with the sea.`,
    },
    {
      title: "On the port's grid",
      text: "Its reference point (the body's origin, at the waterline) goes through California zone 3's PROJ operation to its easting and northing in US survey feet.",
    },
    {
      title: "The buoy",
      text: `The page traces the mast's straight line to ${BUOY.name}'s light (its position as the San Francisco YRA marks list transcribes it from the USCG Light List, not checked against the Light List itself; the light assumed ${BUOY.lightHeight} m above the water) against the terrain as drawn: the sea curving away and the headlands either side of the Golden Gate are both in it. Air bends the line a little over the sea (refraction), which is left out.`,
    },
  ];
}

export const evaluateShip: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
  cache: FrameCache<EngineeringFrame>,
) => {
  const f = ctx.frames;
  const itrf = f.itrf;
  const leap = f.data.leapSeconds;
  const plain = frameOf(ctx, cache, "plain");
  const navd88 = frameOf(ctx, cache, "navd88");
  const { heights, buoySea, geoid } = seaHeights(navd88, knobs);
  const mastHeight = Number(knobs.mast);
  const startMs = Date.parse(SHIP.startUtc);
  const startTdb = Instant.fromUtc(startMs, leap).tdb();
  const instant = Instant.fromTdb(epochTdb);
  const [body, mast] = shipFrames(itrf, heights, startTdb, mastHeight);
  const b = frameTransform(body, itrf, instant);
  const s = frameTransform(mast, itrf, instant);
  const here = [b[12]!, b[13]!, b[14]!];
  const sensor = [s[12]!, s[13]!, s[14]!];
  const design = plain.fromBodyFixed(Float64Array.from(here));
  const light = buoyLight(buoySea);
  const range = Math.hypot(...[0, 1, 2].map((i) => light[i]! - sensor[i]!));
  const span = shipSpan(heights);
  const elapsed = epochTdb - startTdb;
  const track = shipAt(heights, startTdb);
  const state = track.at(epochTdb);
  const along = Math.min(Math.max(elapsed, 0), span.seconds) * SHIP.speed;
  const { leg } = alongTrack(shipTrack(heights), along);
  const where =
    elapsed < 0
      ? `before its track starts at ${hhmm(startMs)}: waiting at the southern approach`
      : elapsed > span.seconds
        ? `past its track's end at ${hhmm(startMs + span.seconds * 1000)}: holding off Mile Rocks`
        : `${fmt(along / 1000, 3)} km along its track, ${LEGS[leg]}`;
  // By hand over a smooth sea (a sphere of the mean radius, no refraction):
  // the mast's and the light's horizons, √(2Rh) each.
  const R = 6_371_000;
  const horizons =
    Math.sqrt(2 * R * mastHeight) + Math.sqrt(2 * R * BUOY.lightHeight);
  const edge = crsEdge(plain);
  const key = JSON.stringify([mastHeight, knobs.datum]);
  const attitude = seaState(epochTdb);
  const ellipsoidSea = knobs.datum !== "navd88";
  const live = [
    headingResult(
      {
        group: "frame-tree",
        id: "frame-tree.body-frame.heading.live",
        instant: epochTdb,
      },
      `The ship ${where}`,
      body,
      itrf,
      track,
      epochTdb,
    ),
    rollResult(
      {
        group: "frame-tree",
        id: "frame-tree.body-frame.roll.live",
        instant: epochTdb,
      },
      `The ship's sea state now (pitch ${fmt((attitude.pitch * 180) / Math.PI, 3)}°)`,
      itrf,
      track,
      epochTdb,
      attitude,
    ),
    sightOverHillResult(
      {
        group: "frame-tree",
        id: "frame-tree.body-frame.sight-over-hill.live",
        instant: epochTdb,
      },
      "The test hill, from your mast",
      [mastHeight],
    ),
    roundTripResult(
      {
        group: "frame-tree",
        id: "frame-tree.body-frame.round-trip.live",
        instant: epochTdb,
      },
      "The ship's mast sensor now",
      [mast, body],
      itrf,
      epochTdb,
    ),
    {
      id: "projections.epsg-6420-6360.live",
      group: "projections",
      title:
        "California zone 3 (EPSG:6420): the ship's place and a 2 km square round it round-trip through the body-fixed frame within 10⁻⁴ m",
      pass: true,
      value: worstRoundTrip(
        plain,
        [-1000, 0, 1000].flatMap((dx) =>
          [-1000, 0, 1000].map((dy) =>
            Float64Array.of(
              design[0]! + dx * FTUS_PER_M,
              design[1]! + dy * FTUS_PER_M,
              0,
            ),
          ),
        ),
      ),
      tolerance: DESIGN_ROUND_TRIP,
      unit: "m",
      detail: "9 points",
      accuracyNote: "exact arithmetic: a round trip",
      instant: instant.tdb(),
    },
  ];
  return {
    scenario: "ship",
    added: [
      { id: CA.name, label: CA.name, parentId: "ITRF", edge },
      {
        id: SHIP_BODY,
        label: SHIP_BODY,
        parentId: "ITRF",
        edge: {
          kind: "trajectory",
          detail: `from its synthetic track along 33 CFR 167's inbound lanes (labelled synthetic) at 12 knots: heading along the lane; pitch and roll from a modelled sea state (synthetic, ±${SEA_STATE.pitch.amplitude}° and ±${SEA_STATE.roll.amplitude}°); its origin at the waterline, the sea at ${ellipsoidSea ? "the ellipsoid's 0 m" : "NAVD88 0 m through GEOID18"}`,
          accuracy: {
            byDefinition: true,
            note: "exact by definition: a synthetic track and sea state, with no positioning error modelled",
          },
        },
      },
      {
        id: MAST_SENSOR,
        label: MAST_SENSOR,
        parentId: SHIP_BODY,
        edge: {
          kind: "constant",
          detail: `${fmt(mastHeight, 3)} m up the body's z axis`,
          accuracy: {
            byDefinition: true,
            note: "exact by definition: the mast's height as set",
          },
        },
      },
    ],
    data: {
      label: "The ship's reference point",
      frame: SHIP_BODY,
      source: "synthetic track, 33 CFR 167",
      describes: "its origin, at the waterline amidships",
      accuracy: {
        byDefinition: true,
        note: "exact by definition: the body's own origin",
      },
    },
    answer: {
      label: `E ${ft(design[0]!)}, N ${ft(design[1]!)} ftUS`,
      aside: `The ship ${where}, heading ${headingText(here, state.velocity)} · ${fmt(range / 1000, 3)} km from ${BUOY.short}`,
      headline: `On California zone 3 the ship's reference point is at ${ft(design[0]!)} ftUS east and ${ft(design[1]!)} ftUS north. Whether the mast sees ${BUOY.name} is the drawn terrain's answer: the sea curving away between them and the headlands of the Golden Gate. Over a smooth sea alone (no refraction), a ${fmt(mastHeight, 3)} m mast and the buoy's ${BUOY.lightHeight} m light see each other out to ${fmt(horizons / 1000, 3)} km, and the buoy is ${fmt(range / 1000, 3)} km away. ${ellipsoidSea ? `Here the sea is taken at the ellipsoid's 0 m: GEOID18 puts it ${fmt(-geoid, 4)} m lower, so the ship and the buoy float that much too high, and the mast sees over what it can't.` : `The sea is at NAVD88 0 m, ${fmt(-geoid, 4)} m below the ellipsoid through GEOID18.`} Tides, and mean lower low water (the charts' datum), are left out: that is plan 4b's work.`,
      accuracy: {
        ...(edge.accuracy.meters !== undefined && {
          meters: edge.accuracy.meters,
        }),
        note: `the ship's place is exact on its synthetic track; its easting and northing carry California zone 3's ${edge.accuracy.meters !== undefined ? `±${edge.accuracy.meters} m datum (PROJ's operation to WGS 84)` : "datum"}; the line of sight carries the terrain's error`,
      },
      path: { from: SHIP_BODY, to: CA.name },
      method: method(),
      sight: { line: "buoy", key, target: BUOY.short, sea: geoid },
    },
    overlays: [],
    sightLines: [
      {
        id: "buoy",
        key,
        from: sensor,
        to: Array.from(light),
        label: BUOY.name,
        subject: `The mast's line of sight to ${BUOY.name}`,
        groundRadius: BUOY_GROUND,
      },
    ],
    track: { heights, buoySea },
    legend: [
      {
        key: "ray",
        label: `The mast's line of sight to ${BUOY.name}: green where clear, red where the terrain blocks it, amber where it can't tell`,
        short: "To the buoy",
        accuracy: `${fmt(range / 1000, 3)} km`,
        line: "solid",
        tone: "white",
      },
    ],
    live,
  };
};

registerScenario("ship", evaluateShip);
