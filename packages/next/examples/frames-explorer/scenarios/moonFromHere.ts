// "Where's the Moon from here?" (spec scenario 3, Task 6b): the Moon from a
// California site, Sacramento's east-north-up frame on ITRF. The question
// is where it is in the sky and how far; the answer is the light-time range
// (how far the light came), with the azimuth and elevation it arrives from,
// airless, as JPL Horizons' observer table gives them. The time is the
// viewer's timeline; there are no knobs.
//
// The tree adds the site under ITRF. The Moon isn't data: it is a frame of
// the tree (MOON_ICRF), so the answer's path runs from it through ICRF and
// GCRF down to the site. The page traces the line of sight over the drawn
// terrain for the local horizon (sightLines.ts).
//
// At the checked setup, the proof is the catalog's comparison with Horizons
// (space.moon-from-sacramento: the astrometric direction and the range) and
// the tree's ITRF–MOON_ICRF compositions. Off it, the compositions re-run
// live at the scenario's time, and the pointing is worked out by hand from
// the tree's vectors against `measure`'s (R11).
import { frameTransform } from "../../../src/frames/Frame.ts";
import { framePoint } from "../../../src/frames/local.ts";
import { measure } from "../../../src/measure/measure.ts";
import { Instant } from "../../../src/time/Instant.ts";
import references from "../references.json";
import { MOON_RANGE } from "../stress/groups/space.ts";
import {
  fmt,
  type StressContext,
  type StressResult,
} from "../stress/runner.ts";
import { compositionsAt } from "./earthTurns.ts";
import {
  registerScenario,
  type ScenarioAnswer,
  type ScenarioEvaluation,
  type ScenarioEvaluator,
} from "./evaluate.ts";
import {
  angleBetween,
  azimuthElevation,
  pointingByHand,
  pointingText,
} from "./pointing.ts";
import { SACRAMENTO, earthSiteFrame } from "./scenes.ts";
import type { KnobState } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

const SPEC = SCENARIOS.find((s) => s.id === "moon-from-here")!;

/** The proof check the compositions stand in for off the checked setup. */
const COMPOSITIONS = "frame-tree.compositions.itrf-moon-icrf";

/** The hand pointing against `measure`'s apparent direction, radians. */
export const POINTING_BY_HAND = 1e-9;

/** How far the sight line runs along the direction, m: far past any terrain. */
export const SIGHT_LENGTH = 1_000_000;

const ARCSECOND = Math.PI / 648_000;

/** Horizons' row as references.json copies it (the headline's published counterpart). */
function horizons(): NonNullable<ScenarioAnswer["published"]> {
  const entry = (
    references.entries as unknown as Record<
      string,
      {
        deltaAu: string;
        au: string;
        source: { document: string; url?: string };
      }
    >
  )["jpl-horizons-moon-sacramento"]!;
  const auKm = Number(entry.au.split("=")[1]!.replace("km", "").trim());
  const km = Number(entry.deltaAu) * auKm;
  return {
    value: km,
    unit: "km",
    printed: `${entry.deltaAu} au (${km.toLocaleString("en-US", { maximumFractionDigits: 3 })} km), the light-time range at 2026-06-21 06:00 UTC`,
    document: entry.source.document,
    ...(entry.source.url !== undefined && { url: entry.source.url }),
    proofId: "space.moon-from-sacramento.range",
    tolerance: `within ${MOON_RANGE} m`,
  };
}

const km = (m: number) =>
  `${(m / 1000).toLocaleString("en-US", { maximumFractionDigits: 0 })} km`;

/** The Moon from the site at `instant`: Newtonian light time, as Horizons' (its Shapiro delay is a few metres). */
function moonFrom(ctx: StressContext, instant: Instant) {
  const f = ctx.frames;
  const site = earthSiteFrame(f.itrf, SACRAMENTO);
  const m = measure(
    framePoint(site, [0, 0, 0]),
    framePoint(f.moonIcrf, [0, 0, 0]),
    instant,
    f,
    { shapiro: [] },
  );
  return { site, m, leg: m.signal!.downlink };
}

/** The checked setup's range, km, once per worker. */
let checkedRange: number | undefined;

export const evaluateMoonFromHere: ScenarioEvaluator = async (
  ctx: StressContext,
  _knobs: KnobState,
  epochTdb: number,
) => {
  const f = ctx.frames;
  const instant = Instant.fromTdb(epochTdb);
  const { site, m, leg } = moonFrom(ctx, instant);
  const apparent = leg.receiverDirection;
  const { azimuth, elevation } = azimuthElevation(apparent);
  const range = leg.range;
  checkedRange ??=
    moonFrom(
      ctx,
      Instant.fromUtc(Date.parse(SPEC.checked.epochUtc), f.data.leapSeconds),
    ).leg.range / 1000;
  // The same pointing by hand from the tree's vectors (R11).
  const hand = pointingByHand(f, site, f.moonIcrf, instant);
  const byHand = angleBetween(hand.apparent, apparent);
  const aberration = angleBetween(hand.astrometric, apparent);
  const shift = angleBetween(hand.geometric, apparent);
  // The site and the ray in ITRF, for the line of sight over the terrain
  // and the drawn ray.
  const toItrf = frameTransform(site, f.itrf, instant);
  const origin = [toItrf[12]!, toItrf[13]!, toItrf[14]!];
  const along = (length: number) =>
    [0, 1, 2].map(
      (i) =>
        origin[i]! +
        length *
          (toItrf[i]! * apparent[0]! +
            toItrf[4 + i]! * apparent[1]! +
            toItrf[8 + i]! * apparent[2]!),
    );
  const blockedBy = m.lineOfSight?.blockedBy?.name;
  const up = elevation >= 0;
  const live: StressResult[] = [
    compositionsAt(
      ctx,
      instant,
      f.itrf,
      f.moonIcrf,
      COMPOSITIONS,
      "ITRF ↔ MOON_ICRF at the scenario's time, checked by every route through the tree: round trips and compositions agree within 1 mm per 1e9 m and 1e-12 in rotation",
    ),
    {
      id: "moon-from-here.pointing.live",
      group: "space",
      title:
        "The Moon's apparent direction from Sacramento, from `measure`, against the same worked by hand from the tree's vectors (light time by iteration, aberration by the site's velocity), within 1e-9 rad",
      pass: true,
      value: byHand,
      tolerance: POINTING_BY_HAND,
      unit: "rad",
      detail: `${pointingText(azimuth, elevation)}; light time ${fmt(leg.lightTime, 7)} s; from where the Moon is now, light time and aberration together move it ${fmt(shift / ARCSECOND, 3)}″`,
      effect: {
        value: aberration / ARCSECOND,
        unit: "″",
        label: "aberration moves where the Moon is seen",
      },
      accuracyNote: "exact arithmetic: the same physics by another route",
      instant: instant.tdb(),
    },
  ];
  const statement = m.accuracy;
  const method: NonNullable<ScenarioAnswer["method"]> = [
    {
      title: "The Moon's centre",
      text: "DE440 places it (MOON_ICRF) at the moment its light left: the light time solved, 1.2 to 1.4 s.",
    },
    {
      title: "Down the tree",
      text: "Through ICRF and GCRF into the turning Earth (ITRF, with IAU 2006/2000A and the IERS Earth orientation), then into Sacramento's east-north-up frame.",
    },
    {
      title: "Where it looks",
      text: "Corrected for aberration by the site's own motion, the direction's east, north and up give the azimuth (clockwise from north) and elevation, without the air's refraction, as Horizons' airless table does.",
    },
    {
      title: "Against Horizons",
      text: "At the checked setup JPL Horizons' observer table gives the same direction in ICRF and the same light-time range. Its azimuth and elevation differ by about half an arcsecond: its horizon turns with the pole of date, ours with the Earth (polar motion), so the catalog shows that row without a verdict.",
    },
  ];
  const evaluation: ScenarioEvaluation = {
    scenario: "moon-from-here",
    added: [
      {
        id: SACRAMENTO.name,
        label: SACRAMENTO.name,
        parentId: "ITRF",
        edge: {
          kind: "constant",
          detail: `local frame: east-north-up at ${SACRAMENTO.latitude}° N, ${-SACRAMENTO.longitude}° W on WGS 84 (h = 0), a fixed placement in ITRF; the site Horizons was asked for`,
          accuracy: {
            byDefinition: true,
            note: "exact by definition: the site is where it is defined, the point Horizons' table is for",
          },
        },
      },
    ],
    answer: {
      label: `away, ${pointingText(azimuth, elevation)}`,
      aside: `${up ? (blockedBy ? `In the sky, but behind ${blockedBy}` : "Above the horizon") : "Below the horizon: the Earth is in the way"} · the light left ${fmt(leg.lightTime, 4)} s ago · ${km(m.distance)} between centres now`,
      headline: `From Sacramento the Moon is ${pointingText(azimuth, elevation)}, ${km(range)} away as the light travels: what you see left the Moon ${fmt(leg.lightTime, 4)} s ago, when it was there. At this instant its centre is ${km(m.distance)} from the site. Its centre comes down the tree from MOON_ICRF through ICRF and GCRF to ITRF and the site's east-north-up frame, where east, north and up give the azimuth and elevation.`,
      value: range / 1000,
      unit: "km",
      published: horizons(),
      accuracy:
        statement.meters !== undefined
          ? {
              meters: statement.meters,
              note: "the Moon's centre from the site, 1σ: DE440's Moon and the Earth's orientation; airless (refraction near the horizon is up to about half a degree)",
            }
          : {
              note: `not bounded: ${statement.terms.find((t) => t.meters === undefined)?.note ?? "a term has no size"}`,
              unbounded: true,
            },
      path: { from: "MOON_ICRF", to: SACRAMENTO.name },
      method,
    },
    // The line itself follows the clock on the page (skyRay.ts).
    overlays: [],
    legend: [
      {
        key: "ray",
        label: "The line of sight to the Moon's centre, as it arrives",
        short: "To the Moon",
        accuracy: pointingText(azimuth, elevation),
        line: "solid",
        tone: "white",
      },
    ],
    sightLines: [
      {
        id: "moon",
        from: origin,
        to: along(SIGHT_LENGTH),
        label: "the Moon",
      },
    ],
    live,
    checkedAnswerValue: checkedRange,
  };
  return evaluation;
};

registerScenario("moon-from-here", evaluateMoonFromHere);
