// "One path, three frames" (spec scenario 7): Orion's trajectory drawn in
// GCRF, ITRF or MOON_ME. The same path looks utterly different because the
// frame you look from moves: the answer is Orion's speed in the drawn frame
// at the scenario's time, beside its speed in the other two (Earth-fixed,
// the Earth's turn alone makes it tens of km/s). The tree adds Orion under
// its OEM's reference, and the answer runs from Orion through the tree to
// the drawn frame. The path itself is drawn on the main thread (main.ts,
// `trajectoryPath`), which follows the clock without a rebuild.
//
// Off the checked setup it re-runs live what the catalog's
// trajectory.moon-me checks (the distance from the frame's origin kept, the
// round trip) in the drawn frame at the scenario's time.
import { type Frame, frameTransform } from "../../../src/frames/Frame.ts";
import { convertPoint, framePoint } from "../../../src/frames/local.ts";
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
import { buildTree, type TreeNode } from "../tree.ts";
import { registerScenario, type ScenarioEvaluator } from "./evaluate.ts";
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

/** Orion's node, as the tree has it under its reference (plain data). */
function orionNode(
  ctx: StressContext,
  o: Trajectory,
  instant: Instant,
): TreeNode {
  const tree = buildTree(ctx.frames, { trajectories: [o] }, instant);
  const find = (n: TreeNode): TreeNode | undefined =>
    n.id === o.name ? n : n.children.map(find).find((x) => x);
  return find(tree)!;
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
      title: `Orion at the scenario's time in ${name}, directly and through ICRF, lands in one place (within 1 mm per 1e9 m): its distance from ${ORIGIN_NAME[name]} is the same by both routes`,
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
      title: `Orion at the scenario's time round-trips through ${name} back to ${o.reference.name} within 1 mm per 1e9 m`,
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
  const node = orionNode(ctx, o, instant);
  const added = [
    {
      id: node.id,
      label: "Orion",
      parentId: o.reference.name,
      edge: node.edge,
    },
  ];
  const path = { from: node.id, to: name };
  const checkedTdb = Instant.fromUtc(
    Date.parse(SPEC.checked.epochUtc),
    ctx.frames.data.leapSeconds,
  ).tdb();
  const checkedSpeed = orionIn(o, ctx.frames.moonMe, checkedTdb).speed / 1000;
  let here: ReturnType<typeof orionIn>;
  try {
    o.state(instant);
    here = orionIn(o, frameOf(ctx, name), epochTdb);
  } catch (error) {
    // Outside the OEM's spans (or in a gap): the answer says so, unbounded.
    return {
      scenario: "one-path",
      added,
      answer: {
        headline: `Orion has no position at this time: ${error instanceof Error ? error.message : String(error)}`,
        accuracy: { note: "not bounded: outside Orion's data" },
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
  const otherText = others
    .map((f) => `${kms(orionIn(o, frameOf(ctx, f), epochTdb).speed)} in ${f}`)
    .join(" and ");
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
    answer: {
      headline: `In ${name}, Orion is ${km(norm(here.position))} from ${ORIGIN_NAME[name]}, moving at ${kms(here.speed)}; the same instant reads ${otherText}`,
      value: here.speed / 1000,
      unit: "km/s",
      accuracy: {
        ...(statement.meters !== undefined && { meters: statement.meters }),
        note:
          statement.meters !== undefined
            ? `Orion's position through the tree to ${name}, 1σ: the OEM's covariance, its unstated time scale (taken as TDB) and DE440`
            : `not bounded: ${statement.terms.find((t) => t.meters === undefined)?.note ?? "a term has no size"}`,
      },
      path,
    },
    overlays: [],
    live: liveChecks(ctx, o, name, instant),
    checkedAnswerValue: checkedSpeed,
  };
};

registerScenario("one-path", evaluateOnePath);
