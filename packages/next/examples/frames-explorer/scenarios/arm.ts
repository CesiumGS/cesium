// The robot arm at LC-39A (Task 7b): its pad, its synthetic geometry and
// spec sheet, and its frames, built by the app through the public Frame API
// (jointChain.ts). Pure and light: the page (the stage, its lines, the
// triads) and the worker (robotArm.ts, the catalog) build the same frames
// from here.
//
// The tree: ITRF → LC-39A pad ENU (the library's `eastNorthUpFrame` at the
// pad, "up" the ellipsoid's normal at the point itself; 16 m below the
// ellipsoid that differs from the normal at its foot by about 7 nrad, so the
// explorer's two ENU conventions agree here to well under a micrometre at the
// arm's reach) → Arm base
// (a fixed placement, its survey stated) → Base yaw → Shoulder → Elbow →
// Wrist → Tool.
import { Frame } from "../../../src/frames/Frame.ts";
import type { FrameAccuracy } from "../../../src/frames/frameAccuracy.ts";
import { eastNorthUpFrame } from "../../../src/frames/local.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";
import type { KnobState } from "./spec.ts";
import { jointChain, type Joint } from "./jointChain.ts";

const DEG = Math.PI / 180;

/**
 * Where the pad frame is defined: NGS mark AK1155, "THIRTY NINE A", a disk
 * set in LC-39A's concrete pad beside the flame deflector (references.json
 * `lc-39a-pad`, the NGS datasheet). Its NAD83(1990) position (taken as
 * NAD83(2011) at 2010.0) and ellipsoidal height (NAVD88 14.137 m + GEOID18
 * −28.252 m, both on the datasheet) go through PROJ's NAD83(2011) to
 * ITRF2020 at the coordinate epoch, the same path the station takes; the
 * result is pinned here (the page has no PROJ) and the data test holds it
 * to PROJ within 1 mm. A definition: the ± is the arm's and the station's
 * from this point, not a survey of LC-39A.
 */
export const PAD = {
  name: "LC-39A pad ENU",
  short: "LC-39A",
  mark: "AK1155",
  /** The datasheet's NAD83(1990) position, degrees (for the camera and the words). */
  latitude: 28 + 36 / 60 + 27.06119 / 3600,
  longitude: -(80 + 36 / 60 + 14.609 / 3600),
  /** Its ellipsoidal height from the datasheet: NAVD88 + GEOID18, m. */
  height: 14.137 - 28.252,
  /** In ITRF2020 at `COORDINATE_EPOCH`, through PROJ, m. */
  itrf: [914850.9978, -5528601.0481, 3035776.5248] as const,
} as const;

/**
 * The coordinate epoch both ends are placed at (decimal year): the pad and
 * the station sit on one plate, so their distance doesn't follow the clock;
 * in ITRF2020 both drift about 1.3 cm a year together.
 */
export const COORDINATE_EPOCH = 2026.0;

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

/** The pad's place on the Earth, ITRF metres (pinned; see `PAD`). */
export const padPosition = (): Float64Array => Float64Array.from(PAD.itrf);

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
      note: "exact by definition: the pad's frame is defined at NGS mark AK1155 on LC-39A's pad (its datasheet position and height, through PROJ to ITRF2020); not a survey of the pad",
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

/**
 * The answer's breakdown order: terms with no size (not stated) first, as
 * the ones that bound nothing, then the largest first; ties keep their order.
 * Never NaN, whatever the sizes (Task 7b fix 1).
 */
export function largestFirst(
  a: { meters?: number | undefined },
  b: { meters?: number | undefined },
): number {
  const ua = a.meters === undefined || Number.isNaN(a.meters);
  const ub = b.meters === undefined || Number.isNaN(b.meters);
  if (ua || ub) {
    return ua === ub ? 0 : ua ? -1 : 1;
  }
  return b.meters! - a.meters!;
}
