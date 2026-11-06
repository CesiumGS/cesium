// "Stand on the Moon" (spec scenario 8): a lunar site, an east-north-up
// frame on MOON_ME at the latitude knob (on the IAU Moon sphere, at 0°
// longitude), and how fast a clock there runs against one on the Earth.
// The answer is the lunar-time catalog check's own computation at the site:
// the proper-time rate against a clock at h = 0 at the California datasheet
// point, sampled hourly and averaged over a synodic month from the
// scenario's time, in µs/day. The tree adds the site under MOON_ME; the
// answer runs from the site through MOON_ME and MOON_ICRF to ICRF, down to
// ITRF. The drawn Moon is the sky's backdrop until plan 5 draws it as a
// tileset in MOON_ME (scenes.ts says so on the page).
//
// Ruling S5: the checked setup is at the exact south pole (−90°), where
// lunar-time.moon-vs-earth.synodic applies. `eastNorthUpFrame` takes its
// general branch there (the pole's x is 1e-10 m, not 0) and gives a finite,
// orthonormal, right-handed triad (east along +y, north along +x); the live
// check below states it at every latitude.
import { type Frame, frameTransform } from "../../../src/frames/Frame.ts";
import { properTimeRate } from "../../../src/measure/doppler.ts";
import { Instant } from "../../../src/time/Instant.ts";
import references from "../references.json";
import { onEarth, sexagesimal } from "../stress/references.ts";
import {
  fmt,
  type StressContext,
  type StressResult,
} from "../stress/runner.ts";
import {
  apply,
  compositionTolerance,
  distance,
  norm,
  translationOf,
} from "../stress/shared.ts";
import { registerScenario, type ScenarioEvaluator } from "./evaluate.ts";
import {
  LUNAR_SITE,
  latitudeText,
  lunarSiteFrame,
  lunarSitePosition,
} from "./scenes.ts";
import type { KnobState } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

const SPEC = SCENARIOS.find((s) => s.id === "stand-on-moon")!;

/** One sample an hour over a synodic month: lunar-time.moon-vs-earth's. */
const STEP = 3600;
const SYNODIC_MONTH = 29.530589;
const DAY = 86_400;

/** The Earth clock: h = 0 at the NGS datasheet point GU2195, as the catalog's case has it. */
function earthClock(): Float64Array {
  const mark = (
    references.entries as unknown as Record<
      string,
      { longitude: string; latitude: string }
    >
  )["ngs-GU2195"]!;
  return onEarth(
    sexagesimal(mark.longitude).value,
    sexagesimal(mark.latitude).value,
    0,
  );
}

/**
 * How much faster a clock at `site` (in MOON_ME) ticks than the Earth clock,
 * averaged hourly over a synodic month from `t0` (TDB s), µs/day:
 * lunar-time.moon-vs-earth's computation.
 */
export function lunarClockGain(
  ctx: StressContext,
  site: ArrayLike<number>,
  t0: number,
): number {
  const f = ctx.frames;
  const california = earthClock();
  const position = new Float64Array(3);
  const velocity = new Float64Array(3);
  const state = (frame: Frame, p: ArrayLike<number>, tdb: number) => {
    const a = apply(
      frameTransform(frame, f.icrf, Instant.fromTdb(tdb - 0.5)),
      p,
    );
    const b = apply(
      frameTransform(frame, f.icrf, Instant.fromTdb(tdb + 0.5)),
      p,
    );
    for (let i = 0; i < 3; i++) {
      position[i] = (a[i]! + b[i]!) / 2;
      velocity[i] = b[i]! - a[i]!;
    }
  };
  const samples = Math.round((SYNODIC_MONTH * DAY) / STEP);
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const tdb = t0 + i * STEP;
    const instant = Instant.fromTdb(tdb);
    state(f.moonMe, site, tdb);
    const moon = properTimeRate(position, velocity, instant, f);
    state(f.itrf, california, tdb);
    const earth = properTimeRate(position, velocity, instant, f);
    sum += moon - earth;
  }
  return (sum / samples) * DAY * 1e6;
}

/**
 * Ashby & Patla's published rate, as references.json gives it: the value
 * the catalog's lunar-time.moon-vs-earth.synodic compares with, within 2%.
 */
function publishedRate(): NonNullable<
  import("./evaluate.ts").ScenarioAnswer["published"]
> {
  const entry = (
    references.entries as unknown as Record<
      string,
      { rate: string; source: { document: string; doi?: string } }
    >
  )["ashby-patla-2024"]!;
  const printed = entry.rate.replace("μs", "µs");
  return {
    value: Number.parseFloat(printed),
    unit: "µs/day",
    printed,
    document: entry.source.document,
    ...(entry.source.doi !== undefined && {
      url: `https://doi.org/${entry.source.doi}`,
    }),
    proofId: "lunar-time.moon-vs-earth.synodic",
    tolerance: "within 2%",
  };
}

/** The checked setup's gain, computed once per worker (it is the same every time). */
let checkedGain: { key: string; value: number } | undefined;

/**
 * The site's triad (S5): finite, unit axes, at right angles, and right-handed
 * (east × north = up), at the knob's latitude, the poles included.
 */
function triadCheck(
  site: Frame,
  latitude: number,
  instant: Instant,
): StressResult {
  const m = frameTransform(site, site.parent!, instant);
  const axis = (k: number) => [m[4 * k]!, m[4 * k + 1]!, m[4 * k + 2]!];
  const [e, n, u] = [axis(0), axis(1), axis(2)];
  const dot = (a: number[], b: number[]) =>
    a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  const cross = (a: number[], b: number[]) => [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
  const finite = [...e, ...n, ...u].every(Number.isFinite);
  const c = cross(e, n);
  const worst = finite
    ? Math.max(
        Math.abs(norm(e) - 1),
        Math.abs(norm(n) - 1),
        Math.abs(norm(u) - 1),
        Math.abs(dot(e, n)),
        Math.abs(dot(n, u)),
        Math.abs(dot(u, e)),
        Math.hypot(c[0]! - u[0]!, c[1]! - u[1]!, c[2]! - u[2]!),
      )
    : Infinity;
  return {
    id: "stand-on-moon.site-triad",
    group: "lunar-time",
    title: `The site's east-north-up axes at ${latitudeText(latitude)}: finite, unit length, at right angles and right-handed (east × north = up), within 1e-12`,
    pass: finite,
    value: worst,
    tolerance: 1e-12,
    detail: `east (${e.map((x) => fmt(x, 3)).join(", ")}), north (${n.map((x) => fmt(x, 3)).join(", ")}), up (${u.map((x) => fmt(x, 3)).join(", ")}) in MOON_ME`,
    accuracyNote: "exact arithmetic: the axes' own lengths and angles",
    instant: instant.tdb(),
  };
}

/** The site's origin through ICRF and back to MOON_ME. */
function roundTrip(
  ctx: StressContext,
  site: Frame,
  instant: Instant,
): StressResult {
  const f = ctx.frames;
  const there = frameTransform(site, f.icrf, instant);
  const back = frameTransform(f.icrf, f.moonMe, instant);
  const p = apply(there, [0, 0, 0]);
  const q = apply(back, p);
  const expected = frameTransform(site, f.moonMe, instant).subarray(12, 15);
  return {
    id: "stand-on-moon.site-round-trip",
    group: "lunar-time",
    title:
      "The site's origin from MOON_ME through ICRF and back lands where it started, within 1 mm per 1e9 m",
    pass: true,
    value: distance(q, expected),
    tolerance: compositionTolerance(
      [translationOf(there), translationOf(back)],
      [norm(p), norm(q)],
    ),
    unit: "m",
    detail: `the site is ${fmt(norm(p) / 1000, 7)} km from the solar-system barycentre`,
    accuracyNote: "exact arithmetic: a round trip",
    instant: instant.tdb(),
  };
}

export const evaluateStandOnMoon: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
) => {
  const latitude = Number(knobs.latitude);
  const instant = Instant.fromTdb(epochTdb);
  const site = lunarSiteFrame(ctx.frames.moonMe, latitude);
  const gain = lunarClockGain(ctx, lunarSitePosition(latitude), epochTdb);
  const checkedTdb = Instant.fromUtc(
    Date.parse(SPEC.checked.epochUtc),
    ctx.frames.data.leapSeconds,
  ).tdb();
  const key = `${checkedTdb}`;
  if (checkedGain?.key !== key) {
    const lat = Number(SPEC.checked.knobs.latitude);
    checkedGain = {
      key,
      value: lunarClockGain(ctx, lunarSitePosition(lat), checkedTdb),
    };
  }
  return {
    scenario: "stand-on-moon",
    added: [
      {
        id: LUNAR_SITE,
        label: `Lunar site, ${latitudeText(latitude)}`,
        parentId: "MOON_ME",
        edge: {
          kind: "constant",
          detail: `east-north-up at ${latitudeText(latitude)}, 0° longitude, on the IAU Moon sphere (1,737.4 km)`,
          accuracy: {
            note: "not stated: a fixed placement on MOON_ME, exact as built; MOON_ME's own orientation has no stated accuracy",
          },
        },
      },
    ],
    answer: {
      label: "fast, against a clock on the Earth",
      published: publishedRate(),
      headline: `A clock at ${latitudeText(latitude)} on the Moon gains ${gain.toFixed(2)} µs a day on one on the Earth's surface, averaged over a synodic month: the Moon's weaker gravity speeds it up more than its motion slows it.`,
      value: gain,
      unit: "µs/day",
      accuracy: {
        note: "within 2% of the method: point-mass potentials of the Sun, the Earth and the Moon (the catalog's tolerance against Ashby & Patla 2024)",
      },
      path: { from: LUNAR_SITE, to: "ITRF" },
    },
    overlays: [],
    live: [triadCheck(site, latitude, instant), roundTrip(ctx, site, instant)],
    checkedAnswerValue: checkedGain.value,
  };
};

registerScenario("stand-on-moon", evaluateStandOnMoon);
