// "The Earth turns" (spec scenario 1): ITRF against GCRF, purely rotational.
// The question is how the ground moves against the stars; the answer is
// where Greenwich faces among the stars at the scenario's time (the angle of
// ITRF's x in GCRF's equator), with the sidereal day at the clock's rate,
// to Earth orientation's stated accuracy (measured, or predicted with its
// age). It adds no frames: the tree is the built-in one, and the path the
// answer runs along is ITRF up to GCRF.
//
// Off the checked setup it re-runs live what the catalog's
// frame-tree.compositions.itrf-gcrf checks (round trips and compositions
// through the six other frames) at the scenario's own instant.
import { type Frame, frameTransform } from "../../../src/frames/Frame.ts";
import { earthOrientationSigma } from "../../../src/measure/accuracy.ts";
import { EARTH_ROTATION_RATE } from "../../../src/measure/constants.ts";
import { Instant } from "../../../src/time/Instant.ts";
import {
  fmt,
  type StressContext,
  type StressResult,
} from "../stress/runner.ts";
import {
  ROTATION,
  apply,
  compositionTolerance,
  distance,
  norm,
  random,
  rotationDifference,
  translationOf,
} from "../stress/shared.ts";
import { registerScenario, type ScenarioEvaluator } from "./evaluate.ts";
import type { KnobState } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

const SPEC = SCENARIOS.find((s) => s.id === "earth-turns")!;

/** WGS 84's equatorial radius, m: where Earth orientation's angle becomes metres on the ground. */
const EQUATOR = 6_378_137;

/** The sidereal day, s: one turn of the Earth against the stars. */
export const SIDEREAL_DAY = (2 * Math.PI) / EARTH_ROTATION_RATE;

/** The proof check this scenario stands in for off the checked setup. */
const PROOF = "frame-tree.compositions.itrf-gcrf";

/** Where ITRF's x (Greenwich) faces in GCRF's equator, degrees east of GCRF's x, in [0, 360). */
export function greenwichAngle(ctx: StressContext, instant: Instant): number {
  const m = frameTransform(ctx.frames.itrf, ctx.frames.gcrf, instant);
  const deg = (Math.atan2(m[1]!, m[0]!) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** "1 h 23 min 4.1 s", or seconds under a minute. */
export function duration(s: number): string {
  if (s < 60) {
    return `${s < 10 ? s.toFixed(1) : Math.round(s)} s`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s - h * 3600) / 60);
  const rest = s - h * 3600 - m * 60;
  return [h > 0 ? `${h} h` : "", `${m} min`, `${rest.toFixed(h > 0 ? 1 : 0)} s`]
    .filter((p) => p !== "")
    .join(" ");
}

/**
 * The catalog's ITRF–GCRF check at one instant: seeded points through
 * ITRF → GCRF → ITRF and back, and through each of the six other frames,
 * within 1 mm per 1e9 m and 1e-12 in rotation.
 */
function compositions(ctx: StressContext, instant: Instant): StressResult {
  const f = ctx.frames;
  const others: Frame[] = [
    f.earthIcrf,
    f.eme2000,
    f.hcrs,
    f.moonIcrf,
    f.moonMe,
    f.moonPa,
  ];
  const a = f.itrf;
  const b = f.gcrf;
  const ab = frameTransform(a, b, instant);
  const ba = frameTransform(b, a, instant);
  const next = random(17);
  let ratio = -1;
  let worst = 0;
  let worstTolerance = 0;
  let worstRotation = rotationDifference(ba, ab, "identity");
  let samples = 0;
  const consider = (deviation: number, tolerance: number) => {
    samples++;
    if (deviation / tolerance > ratio) {
      ratio = deviation / tolerance;
      worst = deviation;
      worstTolerance = tolerance;
    }
  };
  for (let k = 0; k < 4; k++) {
    const r = 10 ** (9 * next());
    const z = 2 * next() - 1;
    const phi = 2 * Math.PI * next();
    const s = Math.sqrt(1 - z * z);
    const p = Float64Array.of(
      r * s * Math.cos(phi),
      r * s * Math.sin(phi),
      r * z,
    );
    const there = apply(ab, p);
    consider(
      distance(apply(ba, there), p),
      compositionTolerance(
        [translationOf(ab), translationOf(ba)],
        [norm(p), norm(there)],
      ),
    );
    for (const c of others) {
      const ac = frameTransform(a, c, instant);
      const cb = frameTransform(c, b, instant);
      const step = apply(ac, p);
      consider(
        distance(apply(cb, step), there),
        compositionTolerance(
          [translationOf(ab), translationOf(ac), translationOf(cb)],
          [norm(p), norm(step)],
        ),
      );
      worstRotation = Math.max(worstRotation, rotationDifference(cb, ac, ab));
    }
  }
  return {
    id: `${PROOF}.live`,
    group: "frame-tree",
    title:
      "ITRF and GCRF at the scenario's time: round trips, and compositions through the six other frames, agree within 1 mm per 1e9 m and 1e-12 in rotation",
    pass: worstRotation <= ROTATION,
    value: worst,
    tolerance: worstTolerance,
    unit: "m",
    detail: `${samples} samples at the scenario's time; the worst against its own tolerance shown; rotation ${fmt(worstRotation)} (limit ${ROTATION})`,
    accuracyNote: "exact arithmetic: round trips and compositions",
    instant: instant.tdb(),
  };
}

/** Earth orientation's accuracy at `instant`, as the answer states it (R8). */
function orientation(
  ctx: StressContext,
  instant: Instant,
): { meters?: number; note: string } {
  const sigma = earthOrientationSigma(ctx.frames, instant);
  if (sigma.degraded) {
    return {
      note: `not bounded: the time is outside the Earth-orientation table (${sigma.span})`,
    };
  }
  const radians = Math.hypot(
    sigma.ut1Seconds * EARTH_ROTATION_RATE,
    sigma.polarRadians,
  );
  return {
    meters: radians * EQUATOR,
    note: sigma.predicted
      ? `predicted Earth orientation, ${sigma.ageDays.toFixed(1)} days past the last measured row (IERS Bulletin A): grows with the prediction's age; at the equator`
      : "measured Earth orientation (IERS): UT1 and polar motion, at the equator",
  };
}

export const evaluateEarthTurns: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
) => {
  const instant = Instant.fromTdb(epochTdb);
  const angle = greenwichAngle(ctx, instant);
  const checked = greenwichAngle(
    ctx,
    Instant.fromUtc(
      Date.parse(SPEC.checked.epochUtc),
      ctx.frames.data.leapSeconds,
    ),
  );
  // The checked angle stated within half a turn of this one, so the delta
  // (proof.ts) never jumps by 360°.
  const turn = ((((angle - checked + 180) % 360) + 360) % 360) - 180;
  const rate = Number(knobs.rate);
  const onScreen = SIDEREAL_DAY / rate;
  return {
    scenario: "earth-turns",
    added: [],
    answer: {
      headline: `Greenwich faces ${angle.toFixed(2)}° east of GCRF's x: the ground turns once against the stars every ${duration(SIDEREAL_DAY)}, ${rate === 1 ? "in real time" : `${duration(onScreen)} at ${rate.toLocaleString("en-US")}×`}`,
      value: angle,
      unit: "°",
      accuracy: orientation(ctx, instant),
      path: { from: "ITRF", to: "GCRF" },
    },
    overlays: [],
    live: [compositions(ctx, instant)],
    checkedAnswerValue: angle - turn,
  };
};

registerScenario("earth-turns", evaluateEarthTurns);
