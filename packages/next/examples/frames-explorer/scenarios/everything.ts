// "Everything at once" (Task 8, the capstone): five objects, each in its own
// frame on its own branch of one tree, and any two of them. The dish
// (DSS-43, from NAIF's station SPK, under ITRF), the ship's mast sensor (its
// synthetic track's body frame, under ITRF), Orion (its OEM's own frame,
// under EME2000), the lunar site (east-north-up at the Moon's south pole,
// under MOON_ME) and the robot arm's tool (the app's chain of joint frames,
// under ITRF). The question: how far apart are they, how long does light
// take between them, and can one see the other? The time is the viewer's
// timeline.
//
// The answer is the distance between the two frames' origins, taken to ICRF
// at the instant shown and differenced; the one-way light time from
// `measure` (a signal from To, heard at From now; Newtonian, as plan 3's
// SPICE fixture); and its line of sight against the Earth and the Moon. An
// end on the Earth also has its local horizon toward the other traced on the
// page over the drawn terrain (sightLines.ts). The route `branchPath(From,
// To)` lights, up to where the two meet and down.
//
// The accuracy is the library's: `accuracyOf` for the two origins, and, for
// each end the app defines (the dish, the ship, the lunar site, the arm's
// tool), its frames' own stated accuracies up to its nearest built-in frame
// (`pointAccuracy`, stated.ts), root-sum-square, as the walk composes each
// end (composed.ts `mixedView`): a pair is bounded only where both ends are.
import { DEG_PER_RAD } from "../units.ts";
import { frameTransform, type Frame } from "../../../src/frames/Frame.ts";
import { convertPoint, framePoint } from "../../../src/frames/local.ts";
import {
  pointAccuracy,
  type PointAccuracy,
} from "../../../src/frames/pointAccuracy.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";
import { C } from "../../../src/measure/constants.ts";
import { measure } from "../../../src/measure/measure.ts";
import { MOON } from "../../../src/scene/Body.ts";
import { Instant } from "../../../src/time/Instant.ts";
import type { FrameCache } from "../frameCache.ts";
import type { EngineeringFrame } from "../../../src/engineering/EngineeringFrame.ts";
import {
  fmt,
  type StressContext,
  type StressResult,
} from "../stress/runner.ts";
import { STATIONS_SPK, orion } from "../stress/shared.ts";
import type { AddedFrameSpec } from "../tree.ts";
import { anglesOf, armFrames } from "./arm.ts";
import {
  dishAndNetworkWindows,
  clockText,
  dishHorizon,
  publishedLight,
  stationFrame,
} from "./dishTracks.ts";
import { HORIZON_GREY, azimuthElevation, horizonGrey } from "./pointing.ts";
import {
  registerScenario,
  type Moment,
  type PairEnd,
  type ScenarioAnswer,
  type ScenarioEvaluation,
  type ScenarioEvaluator,
} from "./evaluate.ts";
import { orionTreeNode } from "./orionData.ts";
import { SIGHT_LENGTH } from "./moonFromHere.ts";
import { armAdded } from "./robotArm.ts";
import {
  DSN_STATION_ACCURACY,
  LUNAR_SITE_ACCURACY,
  MAST_ACCURACY,
  SHIP_ACCURACY,
} from "./stated.ts";
import {
  CAPSTONE,
  CAPSTONE_ARM,
  CAPSTONE_DISH,
  CAPSTONE_LATITUDE,
  CAPSTONE_MAST,
  DSN_STATIONS,
  LUNAR_SITE,
  capstoneEnds,
  frameLabel,
  latitudeText,
  lunarSiteFrame,
  type CapstoneObject,
} from "./scenes.ts";
import { caZone3Frame } from "./drone.ts";
import { seaHeights } from "./ship.ts";
import type { KnobState } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";
import {
  MAST_SENSOR,
  SEA_STATE,
  SHIP,
  SHIP_BODY,
  shipFrames,
} from "./vehicles.ts";

const SPEC = SCENARIOS.find((s) => s.id === "everything")!;

/** The ship's datum in the capstone: the ship's checked one, the sea at NAVD88 0 m through GEOID18. */
const SHIP_DATUM: KnobState = { datum: "navd88" };

/** Within this of a body's limb (degrees) the hand check leaves the verdict to the library. */
/** The Earth's mean radius, m: a horizon's dip by hand. */
const LIMB_GREY = 0.01;

/** "0.12° of the Mast sensor's horizon and 0.01° of the Moon's limb": each grey item with its own band. */
export const greyText = (grey: readonly { what: string; band: number }[]) =>
  grey.map((g) => `${fmt(g.band, 2)}° of ${g.what}`).join(" and ");

/** Each frame's origin in `to` at `instant`, m. */
const originIn = (frame: Frame, to: Frame, instant: Instant): number[] => {
  const m = frameTransform(frame, to, instant);
  return [m[12]!, m[13]!, m[14]!];
};

const sub = (a: readonly number[], b: readonly number[]) =>
  a.map((x, i) => x - b[i]!);
const norm = (a: readonly number[]) => Math.hypot(a[0]!, a[1]!, a[2]!);
const dot = (a: readonly number[], b: readonly number[]) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

/** "22:43:18 UTC". */
/** The five objects' frames at `instant`, and the tree's frames for them. */
async function objects(
  ctx: StressContext,
  cache: FrameCache<EngineeringFrame>,
  instant: Instant,
) {
  const f = ctx.frames;
  const leap = f.data.leapSeconds;
  const o = orion(ctx);
  const dish = await stationFrame(ctx, CAPSTONE_DISH, instant);
  const { heights } = seaHeights(
    caZone3Frame(ctx, cache, "navd88"),
    SHIP_DATUM,
  );
  const startTdb = Instant.fromUtc(Date.parse(SHIP.startUtc), leap).tdb();
  const [body, mast] = shipFrames(f.itrf, heights, startTdb, CAPSTONE_MAST);
  const site = lunarSiteFrame(f.moonMe, CAPSTONE_LATITUDE);
  const angles = anglesOf(CAPSTONE_ARM);
  const arm = armFrames(f.itrf, angles);
  const frames: Record<CapstoneObject, Frame> = {
    dish: dish.frame,
    ship: mast,
    orion: o.frame,
    "lunar-site": site,
    tool: arm.tool,
  };
  return { o, dish, heights, body, mast, site, arm, angles, frames };
}

/** What the tree adds for the five objects. */
function addedFrames(
  ctx: StressContext,
  x: Awaited<ReturnType<typeof objects>>,
  instant: Instant,
): AddedFrameSpec[] {
  const f = ctx.frames;
  // Orion's node as the worker's Orion statements name it (host.ts
  // `trajectoryInfo`): its id is the trajectory's own, so the walk merges
  // them.
  const orionNode = orionTreeNode(f, x.o, instant);
  const station = DSN_STATIONS[CAPSTONE_DISH];
  return [
    {
      id: station.name,
      label: station.name,
      parentId: "ITRF",
      edge: {
        kind: "constant",
        detail: `local frame: east-north-up at ${CAPSTONE_DISH} (${station.complex}), from NAIF's station SPK (${STATIONS_SPK}: DSN 810-005's ITRF93 position with its plate motion)`,
        accuracy: DSN_STATION_ACCURACY,
      },
      app: true,
    },
    {
      id: SHIP_BODY,
      label: SHIP_BODY,
      parentId: "ITRF",
      edge: {
        kind: "trajectory",
        detail: `from its synthetic track along 33 CFR 167's inbound lanes (labelled synthetic) at 12 knots, holding off Mile Rocks after it ends: heading along the lane; pitch and roll from a modelled sea state (synthetic, ±${SEA_STATE.pitch.amplitude}° and ±${SEA_STATE.roll.amplitude}°); its origin at the waterline, the sea at NAVD88 0 m through GEOID18`,
        accuracy: SHIP_ACCURACY,
      },
      app: true,
    },
    {
      id: MAST_SENSOR,
      label: MAST_SENSOR,
      parentId: SHIP_BODY,
      edge: {
        kind: "constant",
        detail: `${fmt(CAPSTONE_MAST, 3)} m up the body's z axis`,
        accuracy: MAST_ACCURACY,
      },
      app: true,
    },
    {
      id: orionNode.id,
      label: "Orion",
      parentId: x.o.reference.name,
      edge: {
        ...orionNode.edge,
        detail: `Orion's own frame: its origin where the Artemis II OEM puts it, ${x.o.reference.name}'s axes (${orionNode.edge.detail})`,
      },
    },
    {
      id: LUNAR_SITE,
      label: `Lunar site, ${latitudeText(CAPSTONE_LATITUDE)}`,
      parentId: "MOON_ME",
      edge: {
        kind: "constant",
        detail: `east-north-up at ${latitudeText(CAPSTONE_LATITUDE)}, 0° longitude, on the IAU Moon sphere (1,737.4 km)`,
        accuracy: LUNAR_SITE_ACCURACY,
      },
      app: true,
    },
    ...armAdded(x.arm, x.angles, instant),
  ];
}

/** An accuracy term's words in the breakdown, its "End a" and "End b" named. */
function termLabel(
  t: { source: string; note: string },
  a: string,
  b: string,
): string {
  const end = /^End ([ab])\b/.exec(t.note)?.[1];
  const who = end === "a" ? a : end === "b" ? b : undefined;
  switch (t.source) {
    case "ephemeris":
      return "DE440, the Earth–Moon geometry";
    case "earthOrientation":
      return `Earth orientation at ${who ?? "an end"}`;
    case "trajectory":
      return "Orion's OEM covariance";
    case "coordinateScale":
      return "Orion's time scale (TDB or TT)";
    case "relativity":
      return "The Moon's relativistic terms";
    case "lightTime":
      return "Light-time iteration";
    default:
      return t.source;
  }
}

/** Each end's place by the frames: ICRF and ITRF, m; throws outside Orion's data. */
function placeOf(
  ctx: StressContext,
  frame: Frame,
  instant: Instant,
): { icrf: number[]; itrf: number[] } {
  return {
    icrf: originIn(frame, ctx.frames.icrf, instant),
    itrf: originIn(frame, ctx.frames.itrf, instant),
  };
}

/** The lowest point of the straight line between two Earth-fixed points, m above the ellipsoid. */
function lowestHeight(a: readonly number[], b: readonly number[]): number {
  let low = Infinity;
  for (let i = 0; i <= 400; i++) {
    const p = a.map((x, k) => x + (i / 400) * (b[k]! - x));
    const h = Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(p), {
      longitude: 0,
      latitude: 0,
      height: 0,
    })?.height;
    if (h !== undefined) {
      low = Math.min(low, h);
    }
  }
  return low;
}

/** `other` above `at`'s horizon (degrees), up being the ellipsoid's normal (or the sphere's radial). */
function elevation(
  at: readonly number[],
  other: readonly number[],
  up: readonly number[],
): number {
  const d = sub(other, at);
  return Math.asin(dot(d, up) / (norm(d) * norm(up))) * DEG_PER_RAD;
}

/** The checked pair's distance at the checked setup, km, once per frame tree. */
const checkedDistances = new WeakMap<object, number>();

export const evaluateEverything: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
  cache: FrameCache<EngineeringFrame>,
) => {
  const f = ctx.frames;
  const leap = f.data.leapSeconds;
  const instant = Instant.fromTdb(epochTdb);
  const { from, to } = capstoneEnds(knobs);
  const [A, B] = [CAPSTONE[from], CAPSTONE[to]];
  const x = await objects(ctx, cache, instant);
  const added = addedFrames(ctx, x, instant);
  const path = { from: A.node, to: B.node };
  const key = JSON.stringify([from, to]);

  const checkedEnds = capstoneEnds(SPEC.checked.knobs);
  let checkedKm = checkedDistances.get(f);
  if (checkedKm === undefined) {
    const t = Instant.fromUtc(Date.parse(SPEC.checked.epochUtc), leap);
    const c = await objects(ctx, cache, t);
    const ends = checkedEnds;
    checkedKm =
      norm(
        sub(
          originIn(c.frames[ends.to], f.icrf, t),
          originIn(c.frames[ends.from], f.icrf, t),
        ),
      ) / 1000;
    checkedDistances.set(f, checkedKm);
  }

  // The dish's behind-the-Moon windows (Task 6b's scan, from the stations'
  // SPK places): the timeline's marks when the pair is the dish and Orion,
  // and the moment that reuses them.
  const all = await dishAndNetworkWindows(ctx);
  const mine = all.byStation[CAPSTONE_DISH];
  const same = all.network.find((w) =>
    mine.moon.some((m) => m.start < w.end && m.end > w.start),
  );
  const hidden =
    mine.moon.find((m) => same && m.start < same.end && m.end > same.start) ??
    mine.moon[0];
  const presets: Moment[] = [
    {
      id: "longest-path",
      label: "The longest path",
      icon: "extend",
      knobs: { from: "ship", to: "lunar-site" },
      utcMs: Date.parse(SPEC.checked.epochUtc),
      title:
        "The ship's mast to the lunar site, at the checked time: the longest route through the tree, seven edges, meeting only at ICRF, the root",
    },
    ...(hidden
      ? [
          {
            id: "behind-moon",
            label: "Orion behind the Moon",
            icon: "moon" as const,
            knobs: { from: "dish", to: "orion" },
            // A minute after the Moon hides Orion from the dish (the dish's
            // own window, Task 6b).
            utcMs: Instant.fromTdb(hidden.start + 60).toUtc(leap),
            title: `The dish (${CAPSTONE_DISH}) and Orion, a minute after the Moon hides Orion from it (loss at ${clockText(ctx, hidden.start)})`,
          },
        ]
      : []),
  ];
  const dishOrion =
    (from === "dish" && to === "orion") || (from === "orion" && to === "dish");
  const windows: NonNullable<ScenarioEvaluation["windows"]> = dishOrion
    ? mine.moon.map((w, i) => ({
        id: `${CAPSTONE_DISH}-moon-${i}`,
        label: `Orion behind the Moon from ${CAPSTONE_DISH}`,
        startUtc: Instant.fromTdb(w.start).toUtc(leap),
        endUtc: Instant.fromTdb(w.end).toUtc(leap),
      }))
    : [];

  const base: Omit<ScenarioEvaluation, "answer" | "live"> = {
    scenario: "everything",
    added,
    overlays: [],
    track: { heights: x.heights },
    presets,
    windows,
    // How far the setting moves the answer: only for the checked pair
    // itself (another pair's distance is not this one's moved).
    ...(from === checkedEnds.from &&
      to === checkedEnds.to && { checkedAnswerValue: checkedKm }),
  };

  const fa = x.frames[from];
  const fb = x.frames[to];
  let pa: { icrf: number[]; itrf: number[] };
  let pb: { icrf: number[]; itrf: number[] };
  let m: ReturnType<typeof measure>;
  try {
    pa = placeOf(ctx, fa, instant);
    pb = placeOf(ctx, fb, instant);
    // A signal from To, heard at From now (the dish's downlink): Newtonian,
    // as plan 3's SPICE fixture (CN).
    m = measure(
      framePoint(fa, [0, 0, 0]),
      framePoint(fb, [0, 0, 0]),
      instant,
      f,
      {
        shapiro: [],
      },
    );
  } catch (error) {
    // Outside Orion's data (or in one of its gaps), with Orion an end: said,
    // unbounded. Anything else is a fault, and the host reports it.
    const o = x.o;
    if (
      !(from === "orion" || to === "orion") ||
      !/outside its data/.test(error instanceof Error ? error.message : "")
    ) {
      throw error;
    }
    const day = (tdb: number) =>
      new Date(Instant.fromTdb(tdb).toUtc(leap)).toISOString().slice(0, 10);
    return {
      ...base,
      answer: {
        label: "No Orion data at this time",
        headline: `Orion has no place at this time, so neither its distance nor its light time can be given: the Artemis II OEM runs from ${day(o.spans[0]![0])} to ${day(o.spans.at(-1)![1])}, with short gaps between its segments. Move the clock into it, or pick a pair without Orion.`,
        accuracy: {
          note: "not bounded: outside Orion's data",
          unbounded: true,
        },
        path,
      },
      live: [],
    };
  }
  const distance = norm(sub(pb.icrf, pa.icrf));
  const leg = m.signal!.downlink;
  const lightTime = leg.lightTime;
  const shapiro = measure(
    framePoint(fa, [0, 0, 0]),
    framePoint(fb, [0, 0, 0]),
    instant,
    f,
  ).signal!.downlink.lightTime;

  // The accuracy, as the walk composes each end: an end the app defines
  // through its own frames' stated accuracies up to its nearest built-in
  // frame (pointAccuracy: ITRF for the dish, the ship and the tool, MOON_ME
  // for the lunar site), then the library's statement for the two origins
  // (accuracyOf, through `measure`, its public face), with the tool's taken
  // in ITRF.
  const anchorPoint = (obj: CapstoneObject, frame: Frame, itrf: number[]) =>
    obj === "tool" ? framePoint(f.itrf, itrf) : framePoint(frame, [0, 0, 0]);
  const statement = measure(
    anchorPoint(from, fa, pa.itrf),
    anchorPoint(to, fb, pb.itrf),
    instant,
    f,
    { shapiro: [] },
  ).accuracy;
  /** An end's own frames, as the walk composes them up to its anchor. */
  const ownOf = (obj: CapstoneObject) =>
    obj === "orion"
      ? undefined
      : pointAccuracy(
          framePoint(x.frames[obj], [0, 0, 0], instant),
          obj === "lunar-site" ? f.moonMe : f.itrf,
        );
  const ends = [from, to].map((obj) => ({ obj, own: ownOf(obj) }));
  const unboundedEnd = ends.find(
    (e) => e.own !== undefined && e.own.meters === undefined,
  );
  const meters =
    statement.meters === undefined || unboundedEnd !== undefined
      ? undefined
      : Math.hypot(statement.meters, ...ends.map((e) => e.own?.meters ?? 0));
  /** Each end's own part in the breakdown: what it states, and where from. */
  const ownRow = (obj: CapstoneObject, own: PointAccuracy) => {
    switch (obj) {
      case "tool":
        return {
          label: "The arm's frames (pointAccuracy)",
          ...(own.meters !== undefined && { meters: own.meters }),
          note: `the arm's encoders, links and survey up to ITRF, as the library composes what each frame states: ${own.combination}`,
        };
      case "dish":
        return {
          label: `${CAPSTONE_DISH}'s own position (DSN 810-005)`,
          ...(own.meters !== undefined && { meters: own.meters }),
          note: DSN_STATION_ACCURACY.note,
        };
      case "ship":
        return {
          label: "The ship's own position and heading (estimated)",
          ...(own.meters !== undefined && { meters: own.meters }),
          note: `${SHIP_ACCURACY.note}; at the mast, ${CAPSTONE_MAST} m up its body, as the library composes it`,
        };
      default:
        return {
          label: "The lunar site's own place",
          ...(own.meters !== undefined && { meters: own.meters }),
          note: LUNAR_SITE_ACCURACY.note,
        };
    }
  };
  const unknownTerm = statement.terms.find((t) => t.meters === undefined);
  const breakdown = [
    ...statement.terms.map((t) => ({
      label: termLabel(t, A.name, B.name),
      ...(t.meters !== undefined && { meters: t.meters }),
      note: t.note,
    })),
    // Each end the app defines, with what its own frames state (stated.ts):
    // in the ± as the walk composes it.
    // An end exact by definition (the lunar site) adds nothing: no row.
    ...ends.flatMap((e) =>
      e.own && e.own.meters !== 0 ? [ownRow(e.obj, e.own)] : [],
    ),
  ].sort(
    // Stated terms largest first; those that state nothing after them.
    (p, q) => (q.meters ?? -1) - (p.meters ?? -1),
  );
  const lead = breakdown[0];
  const accuracy: ScenarioAnswer["accuracy"] =
    meters === undefined
      ? {
          note: `not bounded: ${unboundedEnd?.own?.unboundedBy !== undefined ? `${unboundedEnd.own.unboundedBy} states no accuracy` : (unknownTerm?.note ?? "a term has no size")}`,
          unbounded: true,
        }
      : {
          meters,
          note: `the distance between the two origins (1σ), root-sum-square of the terms below; most of it ${lead!.label.replace(/^The /, "the ")}${lead!.meters !== undefined ? ` (±${fmt(lead!.meters, 2)} m)` : ""}`,
          // The ends the app defines under ITRF, as their walks state them.
          walks: ends.flatMap((e) =>
            e.own?.meters !== undefined && e.obj !== "lunar-site"
              ? [{ frame: CAPSTONE[e.obj].node, meters: e.own.meters }]
              : [],
          ),
        };

  // The line of sight: the library's, against the Earth and the Moon.
  const sight = m.lineOfSight!;
  const by = sight.blockedBy?.name;
  const where = `from ${A.name}`;
  const onEarth = (o: CapstoneObject) => CAPSTONE[o].place !== undefined;
  const bothOnEarth = onEarth(from) && onEarth(to);
  const dip = bothOnEarth ? lowestHeight(pa.itrf, pb.itrf) : undefined;
  const km = (m: number) =>
    `${Math.round(m / 1000).toLocaleString("en-US")} km`;
  // An end on the Earth, with the Earth and the Moon clear: its local
  // horizon toward the other. The dish's is its published receive mask, as
  // in dish-tracks (`dishHorizon`), so the two agree at one instant; the
  // ship's and the tool's are traced on the page over the drawn terrain.
  const groundEnd: CapstoneObject | undefined =
    sight.clear && !bothOnEarth
      ? onEarth(from)
        ? from
        : onEarth(to)
          ? to
          : undefined
      : undefined;
  // The dish's horizon toward an end off the Earth, as dish-tracks words it
  // (the Earth, or its mask), whether or not the sky is clear.
  const dishSees =
    (from === "dish" || to === "dish") && !bothOnEarth
      ? (() => {
          const other = from === "dish" ? fb : fa;
          const seen =
            from === "dish"
              ? m
              : measure(
                  framePoint(x.dish.frame, [0, 0, 0]),
                  framePoint(other, [0, 0, 0]),
                  instant,
                  f,
                  { shapiro: [] },
                );
          const { azimuth, elevation: el } = azimuthElevation(
            seen.signal!.downlink.receiverDirection,
          );
          return {
            elevation: el,
            ...dishHorizon(
              CAPSTONE_DISH,
              azimuth,
              el,
              from === "dish" ? B.name : A.name,
            ),
          };
        })()
      : undefined;
  const earthEnd = groundEnd === "dish" ? undefined : groundEnd;
  const sightLines: ScenarioEvaluation["sightLines"] =
    earthEnd === undefined
      ? []
      : (() => {
          const [here, there] =
            earthEnd === from ? [pa.itrf, pb.itrf] : [pb.itrf, pa.itrf];
          const d = sub(there, here);
          const l = norm(d);
          const other = earthEnd === from ? B : A;
          return [
            {
              id: "pair",
              key,
              from: here,
              to: here.map((v, i) => v + (SIGHT_LENGTH / l) * d[i]!),
              label: other.name,
              subject: `${CAPSTONE[earthEnd].title}'s local horizon toward ${other.name}`,
              end: CAPSTONE[earthEnd].name,
            },
          ];
        })();

  // By hand (R11): the light time by fixed-point iteration in ICRF from the
  // tree's own positions, and the line of sight from each end's horizon and
  // the bodies' limbs.
  let handLt = distance / C;
  for (let i = 0; i < 12; i++) {
    const t = Instant.fromTdb(epochTdb - handLt);
    handLt = norm(sub(originIn(fb, f.icrf, t), pa.icrf)) / C;
  }
  const upOf = (obj: CapstoneObject, itrf: number[], moonMe?: number[]) =>
    obj === "lunar-site"
      ? moonMe!
      : Array.from(
          Ellipsoid.WGS84.geodeticSurfaceNormal(
            Float64Array.from(itrf),
            new Float64Array(3),
          )!,
        );
  // Each grey item with its own band (degrees), so the detail prints the
  // band that decided it, not the widest (Task 9).
  const hand: {
    blocked?: "Earth" | "Moon";
    grey: { what: string; band: number }[];
    words: string[];
  } = { grey: [], words: [] };
  /** The other end's elevation from the lunar site, degrees, when it is an end. */
  let siteElevation: number | undefined;
  /** The tool's height above its pad, m. */
  const toolUp = frameTransform(x.arm.tool, x.arm.pad, instant)[14]!;
  for (const [obj, here, there] of [
    [from, pa, pb],
    [to, pb, pa],
  ] as const) {
    if (onEarth(obj)) {
      const el = elevation(here.itrf, there.itrf, upOf(obj, here.itrf));
      // The horizon dips by √(2h/R) from h up: the end's height above the
      // ellipsoid, or above its own ground (the mast, the arm), whichever
      // is more (M3).
      const h = Math.max(
        Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(here.itrf), {
          longitude: 0,
          latitude: 0,
          height: 0,
        })?.height ?? 0,
        obj === "ship" ? CAPSTONE_MAST : obj === "tool" ? toolUp : 0,
        0,
      );
      const grey = horizonGrey(h);
      hand.words.push(
        `${CAPSTONE[obj].name} sees the other ${fmt(el, 4)}° up (its horizon's dip ${fmt(grey - HORIZON_GREY, 2)}°)`,
      );
      if (Math.abs(el) <= grey) {
        hand.grey.push({ what: `${CAPSTONE[obj].name}'s horizon`, band: grey });
      } else if (el < 0) {
        hand.blocked ??= "Earth";
      }
    } else if (obj === "lunar-site") {
      const p = originIn(x.site, f.moonMe, instant);
      const q = convertPoint(
        framePoint(f.icrf, there.icrf),
        f.moonMe,
        instant,
      ).position;
      const el = elevation(p, Array.from(q), p);
      siteElevation = el;
      hand.words.push(`the lunar site sees the other ${fmt(el, 4)}° up`);
      if (Math.abs(el) <= HORIZON_GREY) {
        hand.grey.push({
          what: "the lunar site's horizon",
          band: HORIZON_GREY,
        });
      } else if (el < 0) {
        hand.blocked ??= "Moon";
      }
    }
  }
  // A body between two ends neither of which stands on it: its limb.
  for (const [body, frame, radius, standsOn] of [
    ["Moon", f.moonIcrf, MOON.ellipsoid.radii[0]!, "lunar-site"],
    ["Earth", f.gcrf, 6_371_000, undefined],
  ] as const) {
    if (
      from === standsOn ||
      to === standsOn ||
      (body === "Earth" && (onEarth(from) || onEarth(to)))
    ) {
      continue;
    }
    const centre = originIn(frame, f.icrf, instant);
    const toBody = sub(centre, pa.icrf);
    const toB = sub(pb.icrf, pa.icrf);
    const angle =
      Math.acos(Math.min(1, dot(toBody, toB) / (norm(toBody) * norm(toB)))) *
      DEG_PER_RAD;
    const limb = Math.asin(Math.min(1, radius / norm(toBody))) * DEG_PER_RAD;
    hand.words.push(
      `the ${body}'s centre ${fmt(angle, 6)}° from the line, its limb ${fmt(limb, 6)}°`,
    );
    if (Math.abs(angle - limb) <= LIMB_GREY) {
      hand.grey.push({ what: `the ${body}'s limb`, band: LIMB_GREY });
    } else if (angle < limb && norm(toB) > norm(toBody)) {
      hand.blocked ??= body;
    }
  }
  const fromSite = siteElevation;
  const skyText =
    by === "Earth" && dishSees
      ? dishSees.text
      : by === "Earth"
        ? `Out of sight: the Earth is in the way${dip !== undefined ? ` (the straight line between them passes ${km(-dip)} below the ellipsoid)` : ""}`
        : by === "Moon"
          ? `Out of sight: the Moon is in the way${fromSite !== undefined && fromSite < 0 ? ` (from the lunar site the other is ${fmt(-fromSite, 2)}° below the horizon)` : ""}`
          : dishSees?.below
            ? dishSees.text
            : dishSees
              ? `In view: clear of the Earth and the Moon, and above ${CAPSTONE_DISH}'s published receive mask (${dishSees.elevation.toFixed(2)}° up, the limit there ${dishSees.limit.toFixed(2)}°)`
              : "In view: clear of the Earth and the Moon";
  const seen = sight.clear && !dishSees?.below;
  const losPass =
    hand.grey.length > 0
      ? true
      : hand.blocked === undefined
        ? sight.clear
        : by === hand.blocked;

  const live: StressResult[] = [
    {
      id: "everything.light-time.live",
      group: "space",
      title: `${A.title} and ${B.name}: the one-way light time from measure against the same by hand (fixed-point iteration in ICRF from the tree's positions, Newtonian), within 1 ns`,
      pass: true,
      value: Math.abs(handLt - lightTime),
      tolerance: 1e-9,
      unit: "s",
      detail: `measure ${fmt(lightTime, 10)} s; by hand ${fmt(handLt, 10)} s; the Sun's, the Earth's and the Moon's Shapiro delay would add ${fmt((shapiro - lightTime) * 1e9, 3)} ns`,
      effect: {
        value: (lightTime - distance / C) * 1e6,
        unit: "µs",
        label: "the light's travel time moves the far end",
      },
      accuracyNote: "exact arithmetic: the same physics by another route",
      instant: epochTdb,
    },
    {
      id: "everything.round-trip.live",
      group: "frame-tree",
      title: `${A.title} and ${B.name}: points a kilometre out along each one's frame go to ICRF and back, within 1 mm per 10⁹ m of their distance from ICRF's origin`,
      pass: true,
      ...(() => {
        let worst = 0;
        let tolerance = Infinity;
        for (const fr of [fa, fb]) {
          const there = frameTransform(fr, f.icrf, instant);
          const back = frameTransform(f.icrf, fr, instant);
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
                back[i]! * q[0]! +
                back[4 + i]! * q[1]! +
                back[8 + i]! * q[2]! +
                back[12 + i]!,
            );
            worst = Math.max(worst, norm(sub(r, p)));
            tolerance = Math.min(tolerance, 1e-12 * norm(q) + 1e-6);
          }
        }
        return { value: worst, tolerance, unit: "m" };
      })(),
      detail: `8 points, through ${[fa, fb].map((fr) => fr.name).join(" and ")} to ICRF and back`,
      accuracyNote: "exact arithmetic: a round trip",
      instant: epochTdb,
    },
    {
      id: "everything.line-of-sight.live",
      group: "space",
      title: `${A.title} and ${B.name}: the library's line of sight (the Earth and the Moon) agrees with hand geometry (each end's horizon, and the bodies' limbs)`,
      pass: losPass,
      detail: `library: ${sight.clear ? "clear" : `blocked by ${by ?? "?"}`}; hand: ${hand.blocked ? `blocked by the ${hand.blocked}` : "clear"} (${hand.words.join("; ")})${hand.grey.length > 0 ? `; within ${greyText(hand.grey)}: the library's verdict stands` : ""}`,
      accuracyNote: "exact arithmetic: hand geometry",
      instant: epochTdb,
    },
  ];
  // The light time's published counterpart, for the checked pair alone
  // (DSS-43 receiving from Orion): plan 3's SPICE value at the checked row,
  // judged by the catalog's space.dss43-orion.light-time there.
  const checkedPair = from === checkedEnds.from && to === checkedEnds.to;
  const published: ScenarioAnswer["published"] = checkedPair
    ? {
        ...publishedLight(
          Instant.fromUtc(Date.parse(SPEC.checked.epochUtc), leap).tdb(),
        ),
        ours: lightTime,
      }
    : undefined;
  const unpublished = checkedPair
    ? undefined
    : from === "orion" && to === "dish"
      ? `No published value for this pair: plan 3's light time is for ${CAPSTONE_DISH} receiving from Orion, this pair turned round. It is checked by round trips, its light time by hand, and its distance is the difference of the two places in ICRF.`
      : "No published value for this pair: it is checked by round trips, its light time by hand, and its distance is the difference of the two places in ICRF.";

  // Measured in From's own frame the distance reads a little differently
  // where GCRF's relativistic scale is on the route (IERS 2010).
  const scaled = m.distance - distance;
  const toEnd = (
    e: { icrf: number[]; itrf: number[] },
    obj: CapstoneObject,
  ): PairEnd => ({
    object: obj,
    node: CAPSTONE[obj].node,
    itrf: e.itrf,
    icrf: e.icrf,
  });
  const lightText =
    lightTime >= 0.1
      ? `${lightTime.toFixed(6)} s`
      : `${fmt(lightTime * 1000, 6)} ms`;
  const answer: ScenarioAnswer = {
    label: "apart",
    aside: `Light ${lightText} one way (a signal from ${B.name}, heard at ${A.name} now)`,
    sky: {
      state: seen ? "clear" : "lost",
      where: dishSees && by !== "Moon" ? `at ${CAPSTONE_DISH}` : where,
      text: skyText,
      line: "pair",
      key,
    },
    headline: `${A.title} and ${B.name} are ${(distance / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km apart now, the straight line between the two frames' origins in ICRF. A signal from ${B.name} takes ${lightText} to reach ${A.name}. ${!sight.clear ? (by === "Earth" ? "The Earth is in the way" : "The Moon is in the way") : dishSees?.below ? `It is below ${CAPSTONE_DISH}'s published receive mask` : "The line between them is clear of the Earth and the Moon"}${dishSees && !dishSees.below ? `, and above ${CAPSTONE_DISH}'s published receive mask` : ""}${earthEnd !== undefined ? `; ${CAPSTONE[earthEnd].name}'s own horizon is the terrain as drawn, judged only where it is drawn finely enough` : ""}. Their route through the tree goes up from ${frameLabel(A)} to ${bothOnEarth ? "ITRF, where the two branches meet" : "ICRF, the root, where the two branches meet"}, then down to ${frameLabel(B)}.`,
    value: distance / 1000,
    unit: "km",
    digits: 1,
    accuracy,
    path,
    breakdown,
    ...(published && { published }),
    ...(unpublished !== undefined && { unpublished }),
    method: [
      {
        title: "Five objects, five branches",
        text: `The dish is ${CAPSTONE_DISH}'s east-north-up frame, placed from NAIF's station SPK, under ITRF. The ship's mast sensor rides its body frame (its synthetic track and sea state) under ITRF. Orion is its OEM's own frame under EME2000. The lunar site is east-north-up at ${latitudeText(CAPSTONE_LATITUDE)} on MOON_ME. The arm's tool ends the app's chain of joint frames under ITRF, at the robot arm's checked pose.`,
      },
      {
        title: "The distance",
        text: `Both origins are taken to ICRF at the instant shown and differenced. ${Math.abs(scaled) > 1e-3 ? `Measured in ${fa.name}'s own frame (measure's distance) it reads ${fmt(Math.abs(scaled), 3)} m ${scaled > 0 ? "longer" : "shorter"}: GCRF's relativistic transformation (IERS 2010 eq. 11.19) is on the route there.` : "In From's own frame (measure's distance) it reads the same, to the millimetre."}`,
      },
      {
        title: "The light time",
        text: `Solved where ${B.name} was when the signal left it, heard at ${A.name} now: Newtonian, as plan 3's SPICE fixture. The Shapiro delay of the Sun, the Earth and the Moon would add ${fmt((shapiro - lightTime) * 1e9, 3)} ns.`,
      },
      {
        title: "Can one see the other",
        text: `The straight path is tested against the Earth's and the Moon's ellipsoids, each placed when the light passes it. The dish's own horizon is ${CAPSTONE_DISH}'s published receive mask (DSN 810-005 301), as in "A dish tracks Orion". The ship's and the tool's are traced on the page over the terrain as drawn: never clear over terrain not drawn, or within its error, and not judged at all where the drawn tiles there are coarser than ±100 m (zoom to the end to trace it).`,
      },
      {
        title: "How sure",
        text: "The library's statement for the two origins (accuracyOf: the Earth's orientation at an Earth end, Orion's covariance, DE440 where the two meet at ICRF, the Moon's relativistic terms), and for each end the app defines its frames' own stated accuracies (pointAccuracy): the dish's published position (DSN 810-005), the ship's estimated AIS position and heading, the arm's encoders, links and survey, and the lunar site exact by definition; root-sum-square, as the walk composes each end. A pair is bounded only where both ends are.",
      },
    ],
  };
  return {
    ...base,
    answer,
    sightLines,
    pair: {
      from: toEnd(pa, from),
      to: toEnd(pb, to),
      ...(meters !== undefined && { meters }),
    },
    legend: [
      {
        key: "pair",
        label: `The straight line from ${A.name} to ${B.name}`,
        short: `${A.title.replace(/^The /, "")} to ${B.name.replace(/^the /, "")}`,
        accuracy:
          meters === undefined ? "not bounded" : `±${fmt(meters, 2)} m (1σ)`,
        line: "solid",
        tone: "white",
      },
    ],
    live,
    liveKinds: {
      "everything.light-time.live": "hand",
      "everything.round-trip.live": "roundTrip",
      "everything.line-of-sight.live": "hand",
    },
  };
};

registerScenario("everything", evaluateEverything);
