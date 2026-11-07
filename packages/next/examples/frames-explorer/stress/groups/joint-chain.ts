// The robot arm's joint frames (Task 7b), defined by the app through the
// public Frame API (scenarios/jointChain.ts, arm.ts): forward kinematics
// against the closed-form planar solution by hand (R11), the tool's composed
// accuracy against the lever-arm rule worked by hand, and a round trip
// through the chain. None cites a published value. The catalog runs them at
// the arm's checked setup (frame-tree.joint-chain.*); the scenario re-runs
// the same functions live at its knobs.
import { frameTransform, type Frame } from "../../../../src/frames/Frame.ts";
import { framePoint } from "../../../../src/frames/local.ts";
import { pointAccuracy } from "../../../../src/frames/pointAccuracy.ts";
import { Instant } from "../../../../src/time/Instant.ts";
import {
  armFrames,
  toolAccuracyByHand,
  toolByHand,
  type ArmAngles,
} from "../../scenarios/arm.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import { stressCase } from "../shared.ts";
import { roundTripResult } from "./body-frames.ts";

const GROUP = "frame-tree";
const ID = "frame-tree.joint-chain";

type Base = Pick<StressResult, "group" | "id"> & { instant?: number };

/** The arm's checked pose (scenarios/specs.ts robot-arm). */
export const CHECKED_POSE: ArmAngles = {
  yaw: 20,
  shoulder: 35,
  elbow: -50,
  wrist: 0,
};

/** Fully extended and folded: the forward kinematics' other poses. */
const POSES: readonly ArmAngles[] = [
  CHECKED_POSE,
  { yaw: 0, shoulder: 0, elbow: 0, wrist: 0 },
  { yaw: -135, shoulder: 80, elbow: -150, wrist: 70 },
];

const poseText = (a: ArmAngles) =>
  `yaw ${a.yaw}°, shoulder ${a.shoulder}°, elbow ${a.elbow}°, wrist ${a.wrist}°`;

/** The tool in the arm base through the chain against the closed form by hand, the worst of `poses`. */
export function forwardKinematicsResult(
  base: Base,
  where: string,
  itrf: Frame,
  poses: readonly ArmAngles[],
): StressResult {
  const instant = Instant.fromTdb(base.instant ?? 0);
  let worst = 0;
  for (const pose of poses) {
    const arm = armFrames(itrf, pose);
    const m = frameTransform(arm.tool, arm.base, instant);
    const hand = toolByHand(pose);
    worst = Math.max(
      worst,
      Math.hypot(m[12]! - hand[0], m[13]! - hand[1], m[14]! - hand[2]),
    );
  }
  return {
    ...base,
    title: `${where}: the tool's place in the arm base through the joint frames against the closed-form planar solution by hand, within 10⁻⁹ m`,
    pass: true,
    value: worst,
    tolerance: 1e-9,
    unit: "m",
    detail: `${poses.length} pose${poses.length === 1 ? "" : "s"} (${poses.map(poseText).join("; ")}); the worst ${fmt(worst)} m`,
    accuracyNote: "exact arithmetic: the chain against a closed form",
  };
}

/** The tool's accuracy as the library composes it against the lever-arm rule by hand, the worst of `poses`. */
export function composedAccuracyResult(
  base: Base,
  where: string,
  itrf: Frame,
  poses: readonly ArmAngles[],
): StressResult {
  const instant = Instant.fromTdb(base.instant ?? 0);
  let worst = 0;
  const figures: string[] = [];
  for (const pose of poses) {
    const arm = armFrames(itrf, pose);
    const ours = pointAccuracy(framePoint(arm.tool, [0, 0, 0], instant), itrf);
    const hand = toolAccuracyByHand(pose);
    const off =
      ours.meters === undefined
        ? Infinity
        : Math.abs(ours.meters - hand.meters);
    worst = Math.max(worst, off);
    figures.push(
      `${fmt((ours.meters ?? NaN) * 1000, 4)} mm against ${fmt(hand.meters * 1000, 4)} mm by hand`,
    );
  }
  return {
    ...base,
    title: `${where}: the tool's accuracy as the library composes it (pointAccuracy) against each encoder's angle times its lever arm, plus the links and the base's survey, root-sum-square by hand, within 1 nm`,
    pass: true,
    value: worst,
    tolerance: 1e-9,
    unit: "m",
    detail: `${poses.map(poseText).join("; ")}: ${figures.join("; ")}`,
    accuracyNote: "exact arithmetic: the same rule worked twice",
  };
}

/** Fully extended: the encoders' lever arms at their longest. */
const EXTENDED: ArmAngles = { yaw: 20, shoulder: 0, elbow: 0, wrist: 0 };

export const jointChainCase: StressCase = stressCase(
  ID,
  GROUP,
  "A robot arm's joint frames, defined by the app (base yaw, shoulder, elbow, wrist, tool): forward kinematics against the closed-form planar solution by hand, the tool's composed accuracy against the lever-arm rule by hand, and a round trip through the chain",
  ["frames"],
  async (ctx, base) => {
    const itrf = ctx.frames.itrf;
    const where = (s: string) => ({ group: GROUP, id: `${base.id}.${s}` });
    const arm = armFrames(itrf, CHECKED_POSE);
    return [
      forwardKinematicsResult(
        where("forward-kinematics"),
        "The arm at three poses",
        itrf,
        POSES,
      ),
      composedAccuracyResult(
        where("accuracy"),
        "The arm at its checked pose and fully extended",
        itrf,
        [CHECKED_POSE, EXTENDED],
      ),
      roundTripResult(
        where("round-trip"),
        "The arm at its checked pose",
        [arm.tool, ...arm.joints.slice(0, -1)],
        itrf,
        0,
      ),
    ];
  },
);
