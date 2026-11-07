// The robot arm at LC-39A (Task 7b): its pad, its synthetic geometry and
// spec sheet, and its frames, built by the app through the public Frame API
// (jointChain.ts). Pure and light: the page (the stage, its lines, the
// triads) and the worker (robotArm.ts, the catalog) build the same frames
// from here.
//
// The tree: ITRF → LC-39A pad ENU (the library's `eastNorthUpFrame` at the
// pad, "up" the ellipsoid's normal at the point itself; at h = 0 the same as
// at its foot, so the explorer's two ENU conventions agree here) → Arm base
// (a fixed placement, its survey stated) → Base yaw → Shoulder → Elbow →
// Wrist → Tool.
import { Frame } from "../../../src/frames/Frame.ts";
import type { FrameAccuracy } from "../../../src/frames/frameAccuracy.ts";
import { eastNorthUpFrame } from "../../../src/frames/local.ts";
import { Ellipsoid, fromDegrees } from "../../../src/math/ellipsoid.ts";
import type { KnobState } from "./spec.ts";
import { jointChain, type Joint } from "./jointChain.ts";

const DEG = Math.PI / 180;

/**
 * LC-39A, where the pad frame is defined (references.json `lc-39a-pad`:
 * 28°36′30.2″ N, 80°36′15.6″ W), on the WGS 84 ellipsoid at h = 0 (as the
 * globe is drawn; no pad elevation is published to use).
 */
export const PAD = {
  name: "LC-39A pad ENU",
  short: "LC-39A",
  latitude: 28 + 36 / 60 + 30.2 / 3600,
  longitude: -(80 + 36 / 60 + 15.6 / 3600),
  height: 0,
} as const;

/** The frames' names, the tree's node ids. */
export const ARM = {
  base: "Arm base",
  yaw: "Base yaw",
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist",
  tool: "Tool",
} as const;

/** The arm's joint frames, base to tool: the ones the app defines (and draws triads for). */
export const ARM_FRAMES: readonly string[] = [
  ARM.base,
  ARM.yaw,
  ARM.shoulder,
  ARM.elbow,
  ARM.wrist,
  ARM.tool,
];

/**
 * The synthetic arm, sized like a launch pad's service arm (labelled
 * synthetic): the base 30 m east of the pad's centre, a 20 m column to the
 * slewing ring (base yaw), an 18 m boom, a 14 m forearm and a 2 m tool.
 */
export const GEOMETRY = {
  base: [30, 0, 0],
  column: 20,
  boom: 18,
  forearm: 14,
  tool: 2,
} as const;

/** The synthetic spec sheet (1σ; labelled synthetic). */
export const SPEC_SHEET = {
  /** Each joint's encoder, degrees. */
  encoderDegrees: 0.005,
  /** Each link's length tolerance, m. */
  linkMeters: 0.0002,
  /** The base's survey in the pad frame, m. */
  surveyMeters: 0.002,
} as const;

/** The joints' angles, degrees: the knobs. */
export interface ArmAngles {
  yaw: number;
  shoulder: number;
  elbow: number;
  wrist: number;
}

/** The angles the knobs set (degrees). */
export const anglesOf = (knobs: KnobState): ArmAngles => ({
  yaw: Number(knobs.yaw),
  shoulder: Number(knobs.shoulder),
  elbow: Number(knobs.elbow),
  wrist: Number(knobs.wrist),
});

const encoder = (what: string): FrameAccuracy => ({
  radians: SPEC_SHEET.encoderDegrees * DEG,
  note: `${what} encoder, ±${SPEC_SHEET.encoderDegrees}° (synthetic spec sheet, 1σ)`,
});
const encoderAndLink = (what: string, link: string): FrameAccuracy => ({
  ...encoder(what),
  meters: SPEC_SHEET.linkMeters,
  note: `${what} encoder ±${SPEC_SHEET.encoderDegrees}° and the ${link}'s length ±${SPEC_SHEET.linkMeters * 1000} mm (synthetic spec sheet, 1σ)`,
});

/**
 * The joints, reading `angles` (degrees) each time they are evaluated.
 * Positive shoulder, elbow and wrist angles raise the link (a turn about
 * the joint's y axis by minus the angle); positive yaw turns the arm from
 * east toward north.
 */
export function armJoints(angles: Readonly<ArmAngles>): Joint[] {
  const g = GEOMETRY;
  return [
    {
      name: ARM.yaw,
      axis: "z",
      offset: [0, 0, g.column],
      angle: () => angles.yaw * DEG,
      accuracy: encoderAndLink("The slewing ring's", "column"),
    },
    {
      name: ARM.shoulder,
      axis: "y",
      offset: [0, 0, 0],
      angle: () => -angles.shoulder * DEG,
      accuracy: encoder("The shoulder's"),
    },
    {
      name: ARM.elbow,
      axis: "y",
      offset: [g.boom, 0, 0],
      angle: () => -angles.elbow * DEG,
      accuracy: encoderAndLink("The elbow's", "boom"),
    },
    {
      name: ARM.wrist,
      axis: "y",
      offset: [g.forearm, 0, 0],
      angle: () => -angles.wrist * DEG,
      accuracy: encoderAndLink("The wrist's", "forearm"),
    },
    {
      name: ARM.tool,
      axis: "x",
      offset: [g.tool, 0, 0],
      angle: () => 0,
      accuracy: {
        meters: SPEC_SHEET.linkMeters,
        note: `the tool's length ±${SPEC_SHEET.linkMeters * 1000} mm (synthetic spec sheet, 1σ); no joint of its own`,
      },
    },
  ];
}

/** The pad's place on the Earth, ITRF metres. */
export const padPosition = (): Float64Array =>
  Ellipsoid.WGS84.cartographicToCartesian(
    fromDegrees(PAD.longitude, PAD.latitude, PAD.height),
    new Float64Array(3),
  );

/** The arm's frames under `itrf`: the pad, the base, then the joints to the tool (last). */
export interface ArmFrames {
  pad: Frame;
  base: Frame;
  joints: Frame[];
  /** Every frame, pad first, tool last. */
  all: Frame[];
  /** The tool's frame. */
  tool: Frame;
  /** The angles the joints read: set them to move the arm (no rebuild). */
  angles: ArmAngles;
}

/** The arm's frames under `itrf`, at `angles` (copied; set `.angles` to move it). */
export function armFrames(itrf: Frame, angles: Readonly<ArmAngles>): ArmFrames {
  const state: ArmAngles = { ...angles };
  const pad = eastNorthUpFrame(PAD.name, itrf, Ellipsoid.WGS84, padPosition(), {
    accuracy: {
      byDefinition: true,
      note: "exact by definition: the pad's frame is defined at LC-39A's published position (Wikipedia), on the WGS 84 ellipsoid",
    },
  });
  const [x, y, z] = GEOMETRY.base;
  // prettier-ignore
  const base = Frame.constant(ARM.base, pad, [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ], {
    accuracy: {
      meters: SPEC_SHEET.surveyMeters,
      note: `the base's survey in the pad frame, ±${SPEC_SHEET.surveyMeters * 1000} mm (synthetic, 1σ)`,
    },
  });
  const joints = jointChain(base, armJoints(state));
  return {
    pad,
    base,
    joints,
    all: [pad, base, ...joints],
    tool: joints[joints.length - 1]!,
    angles: state,
  };
}

/**
 * The tool's position in the arm base by hand, the closed-form planar
 * solution (R11): in the vertical plane the yaw turns to, the boom, forearm
 * and tool at their summed elevations φ₁ = shoulder, φ₂ = φ₁ + elbow,
 * φ₃ = φ₂ + wrist; then turned by the yaw about the base's up axis.
 */
export function toolByHand(
  angles: Readonly<ArmAngles>,
): [number, number, number] {
  const g = GEOMETRY;
  const p1 = angles.shoulder * DEG;
  const p2 = p1 + angles.elbow * DEG;
  const p3 = p2 + angles.wrist * DEG;
  const r =
    g.boom * Math.cos(p1) + g.forearm * Math.cos(p2) + g.tool * Math.cos(p3);
  const up =
    g.column +
    g.boom * Math.sin(p1) +
    g.forearm * Math.sin(p2) +
    g.tool * Math.sin(p3);
  const yaw = angles.yaw * DEG;
  return [r * Math.cos(yaw), r * Math.sin(yaw), up];
}

/**
 * The tool's accuracy by hand at `angles` (1σ, m), the rule the library
 * composes, worked separately (R11): each encoder's angle times the tool's
 * distance from that joint, each link's and the base's survey added, all
 * root-sum-square. The shoulder and the slewing ring share an origin (the
 * column's top).
 */
export function toolAccuracyByHand(angles: Readonly<ArmAngles>): {
  meters: number;
  levers: { yaw: number; shoulder: number; elbow: number; wrist: number };
} {
  const g = GEOMETRY;
  const p1 = angles.shoulder * DEG;
  const p2 = p1 + angles.elbow * DEG;
  const p3 = p2 + angles.wrist * DEG;
  const fromWrist = g.tool;
  const fromElbow = Math.hypot(
    g.forearm * Math.cos(p2) + g.tool * Math.cos(p3),
    g.forearm * Math.sin(p2) + g.tool * Math.sin(p3),
  );
  const fromShoulder = Math.hypot(
    g.boom * Math.cos(p1) + g.forearm * Math.cos(p2) + g.tool * Math.cos(p3),
    g.boom * Math.sin(p1) + g.forearm * Math.sin(p2) + g.tool * Math.sin(p3),
  );
  const e = SPEC_SHEET.encoderDegrees * DEG;
  const link = SPEC_SHEET.linkMeters;
  const meters = Math.hypot(
    e * fromShoulder, // yaw
    e * fromShoulder, // shoulder
    e * fromElbow,
    e * fromWrist,
    link, // column
    link, // boom
    link, // forearm
    link, // tool
    SPEC_SHEET.surveyMeters,
  );
  return {
    meters,
    levers: {
      yaw: fromShoulder,
      shoulder: fromShoulder,
      elbow: fromElbow,
      wrist: fromWrist,
    },
  };
}

/** The station the tool is measured to (references.json `ngs-DI3564`). */
export const MARK = {
  /** Its frame's node id: the NAD83(2011) CRS, reached through PROJ. */
  frame: "NAD83(2011)",
  name: "CCV6",
  long: "CCV6, Cape Canaveral 6 CORS ARP",
  pid: "DI3564",
} as const;
