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
// At the checked setup (DSS-43 at signal.json's "spread" row) its checks
// are the catalog's against plan 3's SPICE fixture (light time and
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
import { overlayMesh, polyline } from "../overlays.ts";
import signalFixture from "../../../test/fixtures/frames/signal.json";
import { STATIONS_SPK, orion } from "../stress/shared.ts";
import {
  registerScenario,
  type ScenarioAnswer,
  type ScenarioEvaluation,
  type ScenarioEvaluator,
} from "./evaluate.ts";
import { SIGHT_LENGTH, POINTING_BY_HAND } from "./moonFromHere.ts";
import {
  type DishWindows,
  type MoonWindow,
  type Window,
  MOON_RADIUS,
  blockedAt,
  scanWindows,
} from "./occultation.ts";
import {
  angleBetween,
  azimuthElevation,
  pointingByHand,
  pointingText,
} from "./pointing.ts";
import { MASK_SOURCE, dsnMask } from "./dsnMasks.ts";
import { maskAt } from "./horizonMask.ts";
import { DSN_STATIONS, type StationId, stationOf } from "./scenes.ts";
import type { KnobState } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

const SPEC = SCENARIOS.find((s) => s.id === "dish-tracks")!;

const ARCSECOND = Math.PI / 648_000;

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

/**
 * The headline's published counterpart (Task 6c fix 1, the controller's
 * ruling): plan 3's SPICE fixture's one-way light time at DSS-43 for the
 * checked setup's row (signal.json's "spread" row nearest `checkedTdb`),
 * which space.dss43-orion.light-time compares ours with at every row.
 */
function publishedLight(
  checkedTdb: number,
): NonNullable<ScenarioEvaluation["answer"]["published"]> {
  const row = signalFixture.rows.reduce((best, r) =>
    Math.abs(r.tdb - checkedTdb) < Math.abs(best.tdb - checkedTdb) ? r : best,
  );
  const lt = row.dss43.CN.lt;
  return {
    value: lt,
    unit: "s",
    printed: `${lt.toFixed(9)} s one way at DSS-43 (CN, no Shapiro delay), signal.json's "${row.kind}" row`,
    document:
      "Plan 3's SPICE fixture, test/fixtures/frames/signal.json (NAIF SPICE spkpos)",
    checkId: "space.dss43-orion.light-time",
    tolerance: "c·∆lt within 0.5 m at each of its rows",
  };
}

/** The checked setup's light time, s, once per frame tree. */
const checkedLights = new WeakMap<Frames, number>();

/** Each dish's windows and the network's, once per Orion. */
const windowsByOrion = new WeakMap<
  object,
  {
    byStation: Record<StationId, DishWindows>;
    network: Window[];
    places: Record<StationId, number[]>;
  }
>();

/**
 * Each dish's windows (behind the Moon; unavailable, the Moon or its
 * horizon in the way) and the network's (every dish unavailable at once),
 * from the stations' SPK places at the checked setup (plate motion over the
 * mission is millimetres).
 */
export async function dishAndNetworkWindows(ctx: StressContext) {
  const o = orion(ctx);
  let w = windowsByOrion.get(o);
  if (w === undefined) {
    const t = Instant.fromUtc(
      Date.parse(SPEC.checked.epochUtc),
      ctx.frames.data.leapSeconds,
    );
    const ids = Object.keys(DSN_STATIONS) as StationId[];
    const places = {} as Record<StationId, number[]>;
    const byStation = {} as Record<StationId, DishWindows>;
    for (const id of ids) {
      places[id] = Array.from(
        (await stationTrajectory(ctx, id)).state(t).subarray(0, 3),
      );
    }
    const scan = scanWindows(
      ctx.frames,
      o,
      // Each dish with its published receive mask (fix 2: the owner's
      // choice for the near field): its horizon is the mask, not the
      // ellipsoid's.
      ids.map((id) => ({ place: places[id], mask: dsnMask(id) })),
    );
    ids.forEach((id, i) => {
      byStation[id] = scan.dishes[i]!;
    });
    w = { byStation, network: scan.network, places };
    windowsByOrion.set(o, w);
  }
  return w;
}

/** "22:43:18 UTC" for a TDB time. */
const clockText = (ctx: StressContext, tdb: number) =>
  `${new Date(Instant.fromTdb(tdb).toUtc(ctx.frames.data.leapSeconds)).toISOString().slice(11, 19)} UTC`;

/** Just inside and just outside each Moon edge, s, where the library's line of sight is asked. */
export const EDGE_PROBE = 0.05;

/** How far out the horizon mask is drawn round the dish, m. */
const MASK_RADIUS = 8000;

/** The azimuths our terrain is checked against the published mask at, degrees. */
const MASK_CHECK = [0, 45, 90, 135, 180, 225, 270, 315];

/** A horizon edge's elevation against the mask there, degrees: 1 ms of Orion's motion is far less. */
export const MASK_EDGE = 0.001;

/** Orion seen from `site` at `instant`: Newtonian light time, as plan 3's SPICE fixture. */
export function look(
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

/** The station's east-north-up frame at its SPK place at `instant` (the capstone's dish too, Task 8). */
export async function stationFrame(
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
  const toItrf = frameTransform(site, f.itrf, instant);
  /** A point `length` m from the dish at `az`, `el` degrees, ITRF. */
  const enuPoint = (az: number, el: number, length: number) => {
    const [ra, re] = [(az * Math.PI) / 180, (el * Math.PI) / 180];
    const d = [
      Math.cos(re) * Math.sin(ra),
      Math.cos(re) * Math.cos(ra),
      Math.sin(re),
    ];
    return [0, 1, 2].map(
      (i) =>
        position[i]! +
        length *
          (toItrf[i]! * d[0]! +
            toItrf[4 + i]! * d[1]! +
            toItrf[8 + i]! * d[2]!),
    );
  };
  // Our terrain against the station's published mask: the station's, not
  // the time's, so it is checked with or without Orion's data (fix 2).
  const stationMask = dsnMask(id);
  const maskCheck: ScenarioEvaluation["maskCheck"] = {
    label: `${id}'s published receive mask`,
    source: MASK_SOURCE,
    from: Array.from(position),
    samples: MASK_CHECK.map((a) => ({
      azimuth: a,
      elevation: maskAt(stationMask, a),
      to: enuPoint(a, maskAt(stationMask, a), SIGHT_LENGTH),
    })),
  };
  let checkedLight = checkedLights.get(f);
  if (checkedLight === undefined) {
    const t = Instant.fromUtc(
      Date.parse(SPEC.checked.epochUtc),
      f.data.leapSeconds,
    );
    const checkedId = SPEC.checked.knobs.station as StationId;
    const s = await stationFrame(ctx, checkedId, t);
    checkedLight = look(ctx, s.frame, t).signal!.downlink.lightTime;
    checkedLights.set(f, checkedLight);
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
      maskCheck,
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
  // Behind the Moon, below the horizon: the dish's windows and the
  // network's, the ones we're in, and the edges asked of the library.
  const all = await dishAndNetworkWindows(ctx);
  const mine = all.byStation[id];
  const inside = <W extends Window>(list: readonly W[]) =>
    list.find((w) => w.start - 1 <= epochTdb && epochTdb <= w.end + 1);
  const moonNow = inside(mine.moon);
  const networkNow = inside(all.network);
  const behindMoon = by === "Moon";
  // The dish's horizon is its published receive mask (DSN 810-005 301),
  // linear between whole degrees of azimuth; the Earth and the Moon stay.
  const myMask = dsnMask(id);
  const limit = maskAt(myMask, azimuth);
  const belowHorizon = !behindMoon && (by === "Earth" || elevation <= limit);
  const edgeText = (w: MoonWindow) =>
    `loss ${clockText(ctx, w.start)}, acquisition ${clockText(ctx, w.end)}; a kilometre of the real limb's relief (the Moon is taken as a 1,737.4 km sphere) moves them ${fmt(w.secondsPerKm.start, 2)} s and ${fmt(w.secondsPerKm.end, 2)} s`;
  const networkText = (w: Window) =>
    `no 70 m dish can hear Orion from ${clockText(ctx, w.start)} to ${clockText(ctx, w.end)} (${fmt((w.end - w.start) / 60, 3)} min)`;
  // The library's line of sight (`measure`, the Earth and the Moon) just
  // inside and just outside each edge of this dish's unavailable windows.
  const stationPoint = framePoint(f.itrf, all.places[id]);
  const libraryClear = (t: number): boolean | undefined => {
    try {
      return measure(
        stationPoint,
        framePoint(o.frame, [0, 0, 0]),
        Instant.fromTdb(t),
        f,
        { shapiro: [] },
      ).lineOfSight?.clear;
    } catch {
      return undefined;
    }
  };
  const near = mine.unavailable.filter(
    (w) =>
      Math.abs(w.start - epochTdb) < 86_400 ||
      Math.abs(w.end - epochTdb) < 86_400,
  );
  // An end at the edge of Orion's data isn't a change of verdict: not asked.
  // A Moon edge is asked of the library's line of sight; a horizon edge is
  // the mask's (the library has no masks): Orion on it there, by hand.
  const isMoonEdge = (t: number) =>
    mine.moon.some(
      (m) => Math.abs(m.start - t) < 0.01 || Math.abs(m.end - t) < 0.01,
    );
  const edges = near.flatMap((w) => [
    ...(w.open?.start ? [] : [{ t: w.start, starts: true }]),
    ...(w.open?.end ? [] : [{ t: w.end, starts: false }]),
  ]);
  const dish = { place: all.places[id], mask: myMask };
  const disagreements: number[] = [];
  let worstMask = 0;
  for (const { t, starts } of edges) {
    if (isMoonEdge(t)) {
      for (const [at, clear] of [
        [t - EDGE_PROBE, starts],
        [t + EDGE_PROBE, !starts],
      ] as const) {
        const c = libraryClear(at);
        if (c !== undefined && c !== clear) {
          disagreements.push(at);
        }
      }
    } else {
      const b = blockedAt(f, o, dish, t);
      if (b) {
        worstMask = Math.max(
          worstMask,
          Math.abs(b.elevation - maskAt(myMask, b.azimuth)),
        );
      }
    }
  }
  const maskMiss = worstMask > MASK_EDGE;
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
      id: "dish-tracks.windows.live",
      group: "space",
      title: `${id}'s windows without Orion (the Moon, or its published horizon mask) within a day of the scenario's time, found by hand geometry and bisected to 1 ms: the library's line of sight agrees ${EDGE_PROBE} s inside and outside each Moon edge, and Orion is on the mask at each horizon edge (within ${MASK_EDGE}°)`,
      pass: near.length > 0 && disagreements.length === 0 && !maskMiss,
      value: disagreements.length,
      tolerance: 0,
      unit: "edges",
      detail: `${near.length} windows (${edges.length} edges; the worst horizon edge ${fmt(worstMask, 2)}° off the mask${disagreements.length > 0 ? `; the library disagrees at ${disagreements.map((t) => clockText(ctx, t)).join(", ")}` : ""}): ${near.map((w) => `${w.open?.start ? "data from " : ""}${clockText(ctx, w.start)} to ${clockText(ctx, w.end)}${w.open?.end ? " (end of a data segment)" : ""}`).join("; ")}${mine.moon.length > 0 ? `; behind the Moon: ${mine.moon.map(edgeText).join("; ")}` : ""}${all.network.length > 0 ? `; the network: ${all.network.map(networkText).join("; ")}` : ""}`,
      accuracyNote:
        "computed, not published: hand geometry (the Moon a 1,737.4 km sphere; DSN 810-005's receive masks, linear between whole degrees) checked against the library's line of sight at each Moon edge",
      instant: instant.tdb(),
    },
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
      text: "The straight path is tested against the Earth and the Moon, each placed when the light passes it. The dish's horizon is its published receive mask (DSN 810-005 Module 301, from SRTM terrain and the neighbouring antennas, at least about 6°), linear between whole degrees of azimuth, compared with Orion's airless elevation: refraction lifts it by about 0.15° at 6°, which can move a mask edge by about half a minute. The page checks our drawn terrain against that mask at eight azimuths.",
    },
  ];
  const evaluation: ScenarioEvaluation = {
    scenario: "dish-tracks",
    added,
    data,
    answer: {
      // The state leads (fix 1): the pointing only while it's in view.
      label: behindMoon
        ? "Signal lost: Orion is behind the Moon"
        : belowHorizon
          ? `Below the horizon at ${id}`
          : `one way; point ${pointingText(azimuth, elevation)}`,
      sky: behindMoon
        ? {
            state: "lost",
            where: `at ${id}`,
            text: `Signal lost: Orion is behind the Moon${moonNow ? ` · ${edgeText(moonNow)}` : ""}`,
          }
        : belowHorizon
          ? {
              state: "lost",
              where: `at ${id}`,
              text:
                elevation < 0
                  ? `Below ${id}'s horizon: the Earth is in the way (${(-elevation).toFixed(2)}° down)`
                  : `Below ${id}'s horizon mask: Orion is ${elevation.toFixed(2)}° up, the published receive limit there ${limit.toFixed(2)}° (DSN 810-005 301)`,
            }
          : {
              state: "clear",
              where: `at ${id}`,
              text: "In view: clear of the Earth and the Moon",
            },
      aside: [
        ...(networkNow ? [networkText(networkNow)] : []),
        `${fmt(hand.range / 1000, 7)} km`,
        `range rate ${fmt(leg.rangeRate / 1000, 4)} km/s`,
      ].join(" · "),
      headline: `${behindMoon ? `Signal lost: Orion is behind the Moon, so ${id} can't hear it. ` : belowHorizon ? `Orion is below ${id}'s horizon, so it can't hear it. ` : `${id} at ${station.complex} points ${pointingText(azimuth, elevation)} to receive Orion. `}The signal takes ${leg.lightTime.toFixed(6)} s on the way down. Orion's data comes from EME2000 through EARTH_ICRF up to ICRF, then down through GCRF and the turning Earth (ITRF) into ${station.name}, the dish's own east, north and up.`,
      ...(!(behindMoon || belowHorizon) && {
        value: leg.lightTime,
        unit: "s",
        published: publishedLight(
          Instant.fromUtc(
            Date.parse(SPEC.checked.epochUtc),
            f.data.leapSeconds,
          ).tdb(),
        ),
      }),
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
    // The line itself follows the clock on the page (skyRay.ts); from the
    // dish, its published horizon mask is drawn round it.
    overlays:
      knobs.view === "orbit"
        ? []
        : [
            {
              id: "mask",
              geometry: {
                kind: "scenario",
                layers: [
                  {
                    name: "mask",
                    chunks: overlayMesh(
                      polyline(
                        Float64Array.from(
                          Array.from({ length: 361 }, (_, a) =>
                            enuPoint(a, maskAt(myMask, a), MASK_RADIUS),
                          ).flat(),
                        ),
                        [255, 255, 255, 255],
                      ),
                    ),
                  },
                ],
                ms: 0,
              },
            },
          ],
    horizonMasks: Object.fromEntries(
      (Object.keys(DSN_STATIONS) as StationId[]).map((k) => [
        DSN_STATIONS[k].name,
        dsnMask(k),
      ]),
    ),
    maskCheck,
    legend: [
      ...(knobs.view === "orbit"
        ? []
        : [
            {
              key: "mask",
              label: `${id}'s horizon mask, as DSN 810-005 301 publishes it (receive), drawn ${MASK_RADIUS / 1000} km out`,
              short: "Horizon mask",
              accuracy: `${Math.min(...myMask).toFixed(1)}° to ${Math.max(...myMask).toFixed(1)}° above the horizon`,
              line: "solid" as const,
              tone: "family" as const,
            },
          ]),
      {
        key: "ray",
        label: "The line of sight to Orion, where the dish points",
        short: "To Orion",
        accuracy: pointingText(azimuth, elevation),
        line: "solid",
        tone: "white",
      },
    ],
    windows: [
      ...all.network.map((w, i) => ({
        id: `network-${i}`,
        label: "No 70 m dish (DSS-14, DSS-43, DSS-63) can hear Orion",
        startUtc: Instant.fromTdb(w.start).toUtc(f.data.leapSeconds),
        endUtc: Instant.fromTdb(w.end).toUtc(f.data.leapSeconds),
      })),
      ...mine.moon.map((w, i) => ({
        id: `${id}-moon-${i}`,
        label: `Orion behind the Moon from ${id}`,
        startUtc: Instant.fromTdb(w.start).toUtc(f.data.leapSeconds),
        endUtc: Instant.fromTdb(w.end).toUtc(f.data.leapSeconds),
      })),
    ],
    presets: all.network
      .filter((w) =>
        Object.values(all.byStation).some((d) =>
          d.moon.some((m) => m.start < w.end && m.end > w.start),
        ),
      )
      .slice(0, 1)
      .map((w) => ({
        id: "behind-moon",
        label: "Behind the Moon",
        icon: "moon" as const,
        // A minute before the network loses Orion.
        utcMs: Instant.fromTdb(w.start - 60).toUtc(f.data.leapSeconds),
      })),
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
