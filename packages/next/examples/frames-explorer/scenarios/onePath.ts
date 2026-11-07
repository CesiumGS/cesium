// "One path, three frames" (spec scenario 7): Orion's trajectory drawn in
// GCRF, ITRF or MOON_ME. The same path looks utterly different because the
// frame you look from moves: the answer is Orion's speed in the drawn frame
// at the scenario's time, beside its speed in the other two (Earth-fixed,
// the Earth's turn alone makes it tens of km/s). Orion is data, not a frame:
// pinned beside its OEM's reference (EME2000), and the answer's path is its
// route through the tree to the drawn frame (the owner's tree design). The path itself is drawn on the main thread (orionLayer.ts,
// `trajectoryPath`), which follows the clock without a rebuild.
//
// Off the checked setup it re-runs live what the catalog's
// trajectory.moon-me checks (the distance from the frame's origin kept, the
// round trip) in the drawn frame at the scenario's time.
import { type Frame, frameTransform } from "../../../src/frames/Frame.ts";
import { convertPoint, framePoint } from "../../../src/frames/local.ts";
import { EARTH_ROTATION_RATE } from "../../../src/measure/constants.ts";
import { measure } from "../../../src/measure/measure.ts";
import { Instant } from "../../../src/time/Instant.ts";
import type { Trajectory } from "../../../src/trajectory/Trajectory.ts";
import {
  fmt,
  plainAccuracy,
  type StressContext,
  type StressResult,
} from "../stress/runner.ts";
import {
  apply,
  compositionTolerance,
  distance,
  norm,
  orion,
  translationOf,
} from "../stress/shared.ts";
import { branchPath, buildTree } from "../tree.ts";
import { length, speed } from "../panel/format.ts";
import {
  registerScenario,
  type ScenarioAnswer,
  type ScenarioEvaluator,
} from "./evaluate.ts";
import { orionData } from "./orionData.ts";
import type { KnobState } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

const SPEC = SCENARIOS.find((s) => s.id === "one-path")!;

export type DrawnFrame = "GCRF" | "ITRF" | "MOON_ME";

const ORIGIN_NAME: Record<DrawnFrame, string> = {
  GCRF: "the Earth's centre",
  ITRF: "the Earth's centre",
  MOON_ME: "the Moon's centre",
};

const frameOf = (ctx: StressContext, name: DrawnFrame): Frame =>
  name === "GCRF"
    ? ctx.frames.gcrf
    : name === "ITRF"
      ? ctx.frames.itrf
      : ctx.frames.moonMe;

/** Orion's position (m) and speed (m/s) in `frame` at `tdb`, by a central difference over ±0.5 s. */
export function orionIn(
  o: Trajectory,
  frame: Frame,
  tdb: number,
): { position: Float64Array; speed: number } {
  const at = (t: number) =>
    frameTransform(o.frame, frame, Instant.fromTdb(t)).subarray(12, 15);
  const a = at(tdb - 0.5);
  const b = at(tdb + 0.5);
  return {
    position: Float64Array.from(at(tdb)),
    speed: distance(a, b),
  };
}

/**
 * Why there's no answer now, in words: the OEM covers a span (with short
 * gaps between its segments), and the clock is outside it.
 */
function noPosition(ctx: StressContext, o: Trajectory): string {
  const leap = ctx.frames.data.leapSeconds;
  const day = (tdb: number) =>
    new Date(Instant.fromTdb(tdb).toUtc(leap)).toISOString().slice(0, 10);
  return `No Orion data at this time: its OEM covers ${day(o.spans[0]![0])} to ${day(o.spans.at(-1)![1])}, with short gaps between segments. Move the clock into that span to see the answer.`;
}

/** Each drawn frame's turning against the stars, rad/s: ITRF the Earth's, MOON_ME the Moon's (one turn a sidereal month). */
const TURNING: Record<DrawnFrame, number> = {
  GCRF: 0,
  ITRF: EARTH_ROTATION_RATE,
  MOON_ME: (2 * Math.PI) / (27.321661 * 86_400),
};

/**
 * The speed's own accuracy (Task 9, I3), not its position's: the OEM's
 * velocity covariance, and the position's error turning with the frame
 * (ω × δr); the frames' own motion is taken from DE440 and IERS as exact.
 * Without a velocity covariance it isn't stated, and says so, with the
 * position's accuracy beside it.
 */
export function speedAccuracy(
  frame: DrawnFrame,
  velocity: number | undefined,
  position: number | undefined,
  positionWhy?: string,
): ScenarioAnswer["accuracy"] {
  if (velocity === undefined || position === undefined) {
    return {
      note: `the speed's accuracy isn't stated: ${velocity === undefined ? "the OEM gives no velocity covariance here" : `Orion's position isn't bounded (${positionWhy ?? "a term has no size"})`}${position !== undefined ? `; Orion's position is ±${length(position)} (1σ)` : ""}`,
      unbounded: true,
    };
  }
  const turning = TURNING[frame] * position;
  const total = Math.hypot(velocity, turning);
  return {
    figure: `±${speed(total)}`,
    note: `Orion's speed in ${frame}: the OEM's velocity covariance (±${speed(velocity)})${turning > 0 ? `, and its position's ±${length(position)} turning with ${frame} (±${speed(turning)})` : ""}; the frames' own motion taken from DE440 and IERS as exact`,
  };
}

/** The headline's words after the speed: what it's relative to (fix 1). */
const RELATIVE: Record<DrawnFrame, string> = {
  GCRF: "relative to the Earth's centre, not turning (GCRF)",
  ITRF: "relative to the turning Earth (ITRF)",
  MOON_ME: "relative to the Moon (MOON_ME)",
};

/** What the drawn frame does to the path, in a sentence (owner, fix 1). */
const WHY: Record<DrawnFrame, string> = {
  GCRF: "GCRF doesn't turn, so the path is the free-return figure-eight round the Moon.",
  ITRF: "The Earth's turn is the last step, which is why the path loops round and round: the Earth turns under it once a day.",
  MOON_ME:
    "MOON_ME turns with the Moon, so the path swings round the Moon's far side and back.",
};

/**
 * The route Orion's data takes through the tree to the drawn frame, in
 * words: "Orion's data (EME2000) runs through EARTH_ICRF, ICRF and GCRF to
 * ITRF." The tree's shape never changes; the route does.
 */
function routeText(
  ctx: StressContext,
  o: Trajectory,
  name: DrawnFrame,
): string {
  const tree = buildTree(ctx.frames);
  const p = branchPath(tree, o.reference.name, name);
  const via = [...p.up, p.ancestor, ...p.down.slice(0, -1)]
    .map((n) => n.id)
    .filter((id) => id !== name && id !== o.reference.name);
  const list =
    via.length <= 1
      ? (via[0] ?? "")
      : `${via.slice(0, -1).join(", ")} and ${via.at(-1)}`;
  return `Orion's data (${o.reference.name}) runs${list ? ` through ${list}` : ""} to ${name}.`;
}

const km = (m: number) => `${Math.round(m / 1000).toLocaleString("en-US")} km`;
const kms = (m: number) =>
  `${(m / 1000).toLocaleString("en-US", { maximumFractionDigits: m < 1e4 ? 2 : 1 })} km/s`;

/** The catalog's two trajectory.moon-me checks, in `name` at `instant`. */
function liveChecks(
  ctx: StressContext,
  o: Trajectory,
  name: DrawnFrame,
  instant: Instant,
): StressResult[] {
  const frame = frameOf(ctx, name);
  const state = o.state(instant);
  const p = framePoint(o.reference, state.subarray(0, 3), instant);
  const there = convertPoint(p, frame);
  const back = convertPoint(there, o.reference);
  const to = frameTransform(o.reference, frame, instant);
  const from = frameTransform(frame, o.reference, instant);
  // The same position by a second route, through ICRF: GCRF's and ITRF's
  // edges scale lengths (IERS 2010 eq. 11.19), so the drawn frame's
  // distances needn't match the reference frame's; the two routes must.
  const toIcrf = frameTransform(o.reference, ctx.frames.icrf, instant);
  const fromIcrf = frameTransform(ctx.frames.icrf, frame, instant);
  const viaIcrf = convertPoint(convertPoint(p, ctx.frames.icrf), frame);
  const tolerance = compositionTolerance(
    [translationOf(to), translationOf(from)],
    [norm(p.position), norm(there.position)],
  );
  const routeTolerance = compositionTolerance(
    [translationOf(to), translationOf(toIcrf), translationOf(fromIcrf)],
    [norm(p.position), norm(apply(toIcrf, p.position))],
  );
  const accuracy = plainAccuracy(
    measure(
      framePoint(frame, [0, 0, 0]),
      framePoint(o.frame, [0, 0, 0]),
      instant,
      ctx.frames,
      { signal: false },
    ).accuracy,
  );
  return [
    {
      id: "trajectory.moon-me.distance.live",
      group: "trajectory",
      title: `Orion at the scenario's time in ${name}, directly and through ICRF, lands in one place (within 1 mm per 10⁹ m): its distance from ${ORIGIN_NAME[name]} is the same by both routes`,
      pass: true,
      value: distance(viaIcrf.position, there.position),
      tolerance: routeTolerance,
      unit: "m",
      detail: `${fmt(norm(there.position) / 1000, 7)} km from ${ORIGIN_NAME[name]}`,
      accuracy,
      instant: instant.tdb(),
    },
    {
      id: "trajectory.moon-me.round-trip.live",
      group: "trajectory",
      title: `Orion at the scenario's time round-trips through ${name} back to ${o.reference.name} within 1 mm per 10⁹ m`,
      pass: true,
      value: distance(back.position, p.position),
      tolerance,
      unit: "m",
      detail: `reference ${o.reference.name}`,
      accuracy,
      instant: instant.tdb(),
    },
  ];
}

export const evaluateOnePath: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
) => {
  const o = orion(ctx);
  const name = String(knobs.frame) as DrawnFrame;
  const instant = Instant.fromTdb(epochTdb);
  // Orion is data, not a frame (the owner's tree design, fix 1): pinned
  // beside the frame its numbers are in, its route through the tree to the
  // drawn frame lit. The tree's shape never changes.
  const added: [] = [];
  const data = orionData(ctx.frames, o, instant);
  const path = { from: o.reference.name, to: name };
  const checkedTdb = Instant.fromUtc(
    Date.parse(SPEC.checked.epochUtc),
    ctx.frames.data.leapSeconds,
  ).tdb();
  const checkedSpeed = orionIn(o, ctx.frames.moonMe, checkedTdb).speed / 1000;
  let here: ReturnType<typeof orionIn>;
  try {
    o.state(instant);
    here = orionIn(o, frameOf(ctx, name), epochTdb);
  } catch {
    // Outside the OEM's spans (or in a gap): the answer says so, unbounded.
    return {
      scenario: "one-path",
      added,
      data,
      answer: {
        label: "",
        headline: noPosition(ctx, o),
        accuracy: {
          note: "not bounded: outside Orion's data",
          unbounded: true,
        },
        path,
      },
      overlays: [],
      live: [],
      checkedAnswerValue: checkedSpeed,
    };
  }
  const others = (["GCRF", "ITRF", "MOON_ME"] as const).filter(
    (f) => f !== name,
  );
  const statement = measure(
    framePoint(frameOf(ctx, name), [0, 0, 0]),
    framePoint(o.frame, [0, 0, 0]),
    instant,
    ctx.frames,
    { signal: false },
  ).accuracy;
  return {
    scenario: "one-path",
    added,
    data,
    answer: {
      label: RELATIVE[name],
      aside: others
        .map(
          (f) => `${kms(orionIn(o, frameOf(ctx, f), epochTdb).speed)} in ${f}`,
        )
        .join(" · "),
      headline: `The same Orion, the same instant: its speed depends on the frame you measure it in, because the frames move differently. ${WHY[name]} ${routeText(ctx, o, name)} Here Orion is ${km(norm(here.position))} from ${ORIGIN_NAME[name]}.`,
      value: here.speed / 1000,
      unit: "km/s",
      accuracy: speedAccuracy(
        name,
        o.velocitySigma(instant),
        statement.meters,
        statement.meters === undefined
          ? (statement.terms.find((t) => t.meters === undefined)?.note ??
              "a term has no size")
          : undefined,
      ),
      path,
    },
    overlays: [],
    live: liveChecks(ctx, o, name, instant),
    checkedAnswerValue: checkedSpeed,
  };
};

registerScenario("one-path", evaluateOnePath);
