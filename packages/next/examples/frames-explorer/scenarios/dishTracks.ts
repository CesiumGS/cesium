// "A dish tracks Orion" (spec scenario 4, Task 6b): one of the DSN's three
// 70 m dishes (DSS-14 at Goldstone, DSS-43 at Canberra, DSS-63 at Madrid),
// placed from NAIF's station SPK in the frames store, looks up at Orion. The
// question is where to point, how long the signal takes, and whether the
// dish can see it; the answer is the one-way light time, with the azimuth
// and elevation it arrives from (aberration included: where the dish
// points), and whether the Earth or the Moon is in the way (`measure`'s line
// of sight). The page traces the last part over the drawn terrain for the
// local horizon (sightLines.ts). The time is the viewer's timeline.
//
// Orion is data, pinned beside its OEM's EME2000; the station's
// east-north-up frame is added under ITRF. The answer's route runs from
// Orion's data up through EARTH_ICRF to ICRF (the tree hangs EME2000 under
// EARTH_ICRF, by the frame bias), then down through GCRF and the turning
// Earth to the dish.
//
// At the checked setup (DSS-43 at signal.json's "spread" row) the proof is
// the catalog's check against plan 3's SPICE fixture (light time and
// Doppler). Off it, the pointing is worked out by hand from the tree's own
// vectors (R11), and the line of sight by hand limb geometry.
import { framePoint, eastNorthUpFrame } from "../../../src/frames/local.ts";
import type { Frames } from "../../../src/frames/frames.ts";
import { frameTransform } from "../../../src/frames/Frame.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";
import { measure } from "../../../src/measure/measure.ts";
import { Instant } from "../../../src/time/Instant.ts";
import { Trajectory } from "../../../src/trajectory/Trajectory.ts";
import {
  fmt,
  messageOf,
  type StressContext,
  type StressResult,
} from "../stress/runner.ts";
import { STATIONS_SPK, orion } from "../stress/shared.ts";
import {
  registerScenario,
  type ScenarioAnswer,
  type ScenarioEvaluation,
  type ScenarioEvaluator,
} from "./evaluate.ts";
import { SIGHT_LENGTH, POINTING_BY_HAND } from "./moonFromHere.ts";
import {
  angleBetween,
  azimuthElevation,
  pointingByHand,
  pointingText,
} from "./pointing.ts";
import { DSN_STATIONS, type StationId, stationOf } from "./scenes.ts";
import type { KnobState } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

const SPEC = SCENARIOS.find((s) => s.id === "dish-tracks")!;

const ARCSECOND = Math.PI / 648_000;

/** The Moon's radius, m (IAU, as the catalog's line-of-sight check cites it: naif-moon-radius). */
const MOON_RADIUS = 1_737_400;

/** Within this of the horizon (degrees) the hand check leaves the Earth's verdict to the library. */
const HORIZON_GREY = 1;

/** A store item that isn't there: the host says so as missing data, with the setup hint. */
function missing(message: string): Error {
  const e = new Error(message);
  e.name = "MissingDataError";
  return e;
}

/** Each station's trajectory from the SPK, by frame tree (one SPK read per worker). */
const stations = new WeakMap<Frames, Map<StationId, Trajectory>>();

/** The station's trajectory in ITRF, from the store's station SPK; says which is missing if one is. */
export async function stationTrajectory(
  ctx: StressContext,
  id: StationId,
): Promise<Trajectory> {
  const f = ctx.frames;
  let byId = stations.get(f);
  if (byId === undefined) {
    if (ctx.loadStations === undefined) {
      throw missing(
        `the DSN stations (${STATIONS_SPK}) aren't in this context`,
      );
    }
    const bytes = await ctx.loadStations();
    byId = new Map();
    for (const [key, s] of Object.entries(DSN_STATIONS)) {
      try {
        const t = Trajectory.fromSpk([bytes], s.naif, f, {
          name: key,
          accuracy: "precise",
          j2000: "icrf",
        });
        if (t.reference !== f.itrf) {
          throw new Error(
            `its SPK segment is in ${t.reference.name}, not ITRF93`,
          );
        }
        byId.set(key as StationId, t);
      } catch (error) {
        throw missing(
          `${key} (NAIF ${s.naif}) isn't usable in ${STATIONS_SPK}: ${messageOf(error)}`,
        );
      }
    }
    stations.set(f, byId);
  }
  return byId.get(id)!;
}

/** Why there's no answer now: the OEM's span, as one-path says it. */
function noOrion(ctx: StressContext): string {
  const o = orion(ctx);
  const day = (tdb: number) =>
    new Date(Instant.fromTdb(tdb).toUtc(ctx.frames.data.leapSeconds))
      .toISOString()
      .slice(0, 10);
  return `No Orion data at this time: its OEM covers ${day(o.spans[0]![0])} to ${day(o.spans.at(-1)![1])}, with short gaps between segments. Move the clock into that span to see the answer.`;
}

/** The checked setup's light time, s, once per worker. */
let checkedLight: number | undefined;

/** Orion seen from `site` at `instant`: Newtonian light time, as plan 3's SPICE fixture. */
function look(
  ctx: StressContext,
  site: ReturnType<typeof eastNorthUpFrame>,
  instant: Instant,
) {
  const o = orion(ctx);
  return measure(
    framePoint(site, [0, 0, 0]),
    framePoint(o.frame, [0, 0, 0]),
    instant,
    ctx.frames,
    { shapiro: [] },
  );
}

/** The station's east-north-up frame at its SPK place at `instant`. */
async function stationFrame(
  ctx: StressContext,
  id: StationId,
  instant: Instant,
) {
  const t = await stationTrajectory(ctx, id);
  const position = t.state(instant).subarray(0, 3);
  return {
    position: Array.from(position),
    frame: eastNorthUpFrame(
      DSN_STATIONS[id].name,
      ctx.frames.itrf,
      Ellipsoid.WGS84,
      position,
    ),
  };
}

export const evaluateDishTracks: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
) => {
  const f = ctx.frames;
  const o = orion(ctx);
  const station = stationOf(knobs);
  const id = (Object.keys(DSN_STATIONS) as StationId[]).find(
    (k) => DSN_STATIONS[k] === station,
  )!;
  const instant = Instant.fromTdb(epochTdb);
  const { position, frame: site } = await stationFrame(ctx, id, instant);
  const added = [
    {
      id: station.name,
      label: station.name,
      parentId: "ITRF",
      edge: {
        kind: "constant" as const,
        detail: `local frame: east-north-up at ${id} (${station.complex}), from NAIF's station SPK (${STATIONS_SPK}: DSN 810-005's ITRF93 position with its plate motion)`,
        accuracy: {
          note: "not stated: NAIF's SPK gives the station's position without its uncertainty (DSN 810-005 quotes centimetres)",
        },
      },
    },
  ];
  const data = {
    label: "Orion's data",
    frame: o.reference.name,
    source: "OEM",
    accuracy: {
      note: "the OEM's own covariance, 1σ (Orion's node in the tree)",
    },
  };
  const path = { from: o.reference.name, to: station.name };
  if (checkedLight === undefined) {
    const t = Instant.fromUtc(
      Date.parse(SPEC.checked.epochUtc),
      f.data.leapSeconds,
    );
    const checkedId = SPEC.checked.knobs.station as StationId;
    const s = await stationFrame(ctx, checkedId, t);
    checkedLight = look(ctx, s.frame, t).signal!.downlink.lightTime;
  }
  let m: ReturnType<typeof measure>;
  try {
    o.state(instant);
    m = look(ctx, site, instant);
  } catch {
    // Outside the OEM's spans (or in a gap): the answer says so, unbounded.
    return {
      scenario: "dish-tracks",
      added,
      data,
      answer: {
        label: "",
        headline: noOrion(ctx),
        accuracy: {
          note: "not bounded: outside Orion's data",
          unbounded: true,
        },
        path,
      },
      overlays: [],
      live: [],
      checkedAnswerValue: checkedLight,
    };
  }
  const leg = m.signal!.downlink;
  const apparent = leg.receiverDirection;
  const { azimuth, elevation } = azimuthElevation(apparent);
  const shapiro = measure(
    framePoint(site, [0, 0, 0]),
    framePoint(o.frame, [0, 0, 0]),
    instant,
    f,
  ).signal!.downlink.lightTime;
  // By hand (R11): the pointing from the tree's vectors, and the line of
  // sight from the Moon's limb (the catalog's space.line-of-sight geometry).
  const hand = pointingByHand(f, site, o.frame, instant);
  const moon = pointingByHand(f, site, f.moonIcrf, instant);
  const limb = Math.asin(MOON_RADIUS / moon.range);
  const fromMoon = angleBetween(moon.astrometric, hand.astrometric);
  const handMoon = fromMoon < limb && hand.range > moon.range;
  const handEarth =
    elevation < -HORIZON_GREY
      ? true
      : elevation > HORIZON_GREY
        ? false
        : undefined;
  const sight = m.lineOfSight!;
  const by = sight.blockedBy?.name;
  const losPass =
    handEarth === true
      ? by === "Earth"
      : handEarth === false
        ? by !== "Earth" && sight.clear === !handMoon
        : sight.clear === !handMoon || by === "Earth";
  const verdict = sight.clear
    ? "clear of the Earth and the Moon"
    : `hidden by ${by === "Earth" ? "the Earth (below the horizon)" : "the Moon"}`;
  const toItrf = frameTransform(site, f.itrf, instant);
  const along = (length: number) =>
    [0, 1, 2].map(
      (i) =>
        position[i]! +
        length *
          (toItrf[i]! * apparent[0]! +
            toItrf[4 + i]! * apparent[1]! +
            toItrf[8 + i]! * apparent[2]!),
    );
  const live: StressResult[] = [
    {
      id: "dish-tracks.pointing.live",
      group: "space",
      title: `Orion's apparent direction from ${id}, from \`measure\`, against the same worked by hand from the tree's vectors (light time by iteration, aberration by the dish's velocity), within 1e-9 rad`,
      pass: true,
      value: angleBetween(hand.apparent, apparent),
      tolerance: POINTING_BY_HAND,
      unit: "rad",
      detail: `${pointingText(azimuth, elevation)}; light time ${fmt(leg.lightTime, 9)} s; from where Orion is now, light time and aberration together move it ${fmt(angleBetween(hand.geometric, apparent) / ARCSECOND, 3)}″ (Orion moves with the Earth, so they nearly cancel)`,
      effect: {
        value: angleBetween(hand.astrometric, apparent) / ARCSECOND,
        unit: "″",
        label: "aberration moves where the dish points",
      },
      accuracyNote: "exact arithmetic: the same physics by another route",
      instant: instant.tdb(),
    },
    {
      id: "space.line-of-sight.live",
      group: "space",
      title: `${id} to Orion at the scenario's time: the library's line of sight (the Earth and the Moon) agrees with hand geometry (the angle to Orion against the Moon's angular radius, and the horizon)`,
      pass: losPass,
      detail: `library: ${sight.clear ? "clear" : `blocked by ${by ?? "?"}`}; hand: Orion ${fmt(fromMoon / ARCSECOND / 3600, 6)}° from the Moon's centre, limb ${fmt(limb / ARCSECOND / 3600, 6)}°, Orion ${fmt(hand.range / 1000, 7)} km away and the Moon ${fmt(moon.range / 1000, 7)} km; elevation ${fmt(elevation, 5)}°${handEarth === undefined ? ` (within ${HORIZON_GREY}° of the horizon: the Earth's verdict is the library's)` : ""}`,
      accuracyNote: "exact arithmetic: hand geometry",
      instant: instant.tdb(),
    },
  ];
  const statement = m.accuracy;
  const method: NonNullable<ScenarioAnswer["method"]> = [
    {
      title: "The dish",
      text: `${id}'s position comes from NAIF's station SPK (DSN 810-005's ITRF93 coordinates, moved by the plate's motion), with east, north and up there.`,
    },
    {
      title: "Orion",
      text: "Its OEM gives position and velocity in EME2000. The tree takes them through the frame bias to EARTH_ICRF, up to ICRF, then down through GCRF and the Earth's rotation to ITRF and the dish.",
    },
    {
      title: "Light time and pointing",
      text: `The light time is solved where Orion was when the signal left it; aberration by the dish's own motion then gives where to point. Newtonian, as plan 3's SPICE checks: the Sun's Shapiro delay would add ${fmt((shapiro - leg.lightTime) * 1e9, 2)} ns.`,
    },
    {
      title: "Can it see it",
      text: "The straight path is tested against the Earth and the Moon, each placed when the light passes it; the page then traces the part near the dish over the drawn terrain, for the local horizon.",
    },
  ];
  const evaluation: ScenarioEvaluation = {
    scenario: "dish-tracks",
    added,
    data,
    answer: {
      label: `one way; point ${pointingText(azimuth, elevation)}`,
      aside: `${sight.clear ? "In view" : "Not in view"}: ${verdict} · ${fmt(hand.range / 1000, 7)} km · range rate ${fmt(leg.rangeRate / 1000, 4)} km/s`,
      headline: `${id} at ${station.complex} points ${pointingText(azimuth, elevation)} to receive Orion; the signal takes ${leg.lightTime.toFixed(6)} s on the way down, and the path is ${verdict}. Orion's data comes from EME2000 through EARTH_ICRF up to ICRF, then down through GCRF and the turning Earth (ITRF) into ${station.name}, the dish's own east, north and up.`,
      value: leg.lightTime,
      unit: "s",
      accuracy:
        statement.meters !== undefined
          ? {
              meters: statement.meters,
              note: `Orion from the dish, 1σ: the OEM's covariance and its unstated time scale, DE440 and the Earth's orientation; in light time ±${fmt((statement.meters / 299_792_458) * 1e9, 2)} ns`,
            }
          : {
              note: `not bounded: ${statement.terms.find((t) => t.meters === undefined)?.note ?? "a term has no size"}`,
              unbounded: true,
            },
      path,
      method,
    },
    // The line itself follows the clock on the page (skyRay.ts).
    overlays: [],
    legend: [
      {
        key: "ray",
        label: "The line of sight to Orion, where the dish points",
        short: "To Orion",
        accuracy: pointingText(azimuth, elevation),
        line: "solid",
        tone: "white",
      },
    ],
    sightLines: [
      {
        id: "orion",
        from: position,
        to: along(SIGHT_LENGTH),
        label: "Orion",
      },
    ],
    live,
    checkedAnswerValue: checkedLight,
  };
  return evaluation;
};

registerScenario("dish-tracks", evaluateDishTracks);
