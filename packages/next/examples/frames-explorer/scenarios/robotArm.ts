// "A robot arm at a spaceport" (Task 7b): a synthetic service arm on
// LC-39A, its joint frames defined by the app through the public Frame API
// (jointChain.ts, arm.ts), each with the accuracy its spec sheet states. The
// question is how far the arm's tool is from a survey station, and how sure
// that is. The answer is the straight-line distance from the tool to CCV6,
// the nearest NOAA CORS station NGS publishes in both NAD83(2011) and ITRF
// (17 km away: none is within a few kilometres), with the accuracy the
// library composes along the chain (`pointAccuracy`) and the station's own.
//
// The tree adds the arm under ITRF (pad ENU, base, yaw, shoulder, elbow,
// wrist, tool: defined by the app) and NAD83(2011) under ITRF (the PROJ
// operation). The station's position is data, pinned in NAD83(2011); its
// route runs up through PROJ to ITRF and down the arm to the tool.
import { frameTransform } from "../../../src/frames/Frame.ts";
import { framePoint } from "../../../src/frames/local.ts";
import {
  dominantTerm,
  pointAccuracy,
  type PointAccuracyTerm,
} from "../../../src/frames/pointAccuracy.ts";
import { Instant } from "../../../src/time/Instant.ts";
import references from "../references.json";
import {
  STATION_ID,
  stationInItrf,
  stationValues,
  type CorsStation,
} from "../stress/groups/cors-station.ts";
import {
  composedAccuracyResult,
  forwardKinematicsResult,
} from "../stress/groups/joint-chain.ts";
import { roundTripResult } from "../stress/groups/body-frames.ts";
import { fmt, type StressContext } from "../stress/runner.ts";
import { proj } from "../stress/shared.ts";
import type { AddedFrameSpec, EdgeAccuracy } from "../tree.ts";
import {
  ARM,
  GEOMETRY,
  COORDINATE_EPOCH,
  MARK,
  PAD_OUTSIDE,
  PAD_OUTSIDE_SHORT,
  largestFirst,
  PAD,
  SPEC_SHEET,
  anglesOf,
  armFrames,
} from "./arm.ts";
import { registerScenario, type ScenarioEvaluator } from "./evaluate.ts";
import type { KnobState } from "./spec.ts";

const station = (references.entries as unknown as Record<string, CorsStation>)[
  STATION_ID
]!;

/**
 * The station's own accuracy (1σ, m): the datasheet's network standard
 * deviations (north, east, height) and its printed NAD83(2011) velocity's
 * rounding, carried over the years since its epoch (each component's
 * half-digit taken as a uniform error, σ = half/√3).
 */
export function stationSigma(years: number): {
  meters: number;
  datasheet: number;
  velocity: number;
} {
  const v = stationValues(station);
  const datasheet = Math.hypot(...v.sd);
  const velocity = Math.hypot(
    ...v.velocity.map((p) => (p.half / Math.sqrt(3)) * Math.abs(years)),
  );
  return { meters: Math.hypot(datasheet, velocity), datasheet, velocity };
}

/** Millimetres, to a tenth. */
const mm = (m: number) => `${(m * 1000).toFixed(1)} mm`;

/** An angle in degrees, with a true minus. */
const deg = (d: number) => `${d < 0 ? "−" : ""}${Math.abs(d)}°`;

/** Each joint's name in the answer's words, by frame. */
const JOINT_WORDS: Record<string, string> = {
  [ARM.yaw]: "base yaw",
  [ARM.shoulder]: "shoulder",
  [ARM.elbow]: "elbow",
  [ARM.wrist]: "wrist",
};

/** A term that is a rotation error times its lever arm. */
type AngularTerm = Extract<PointAccuracyTerm, { kind: "angular" }>;

/** An angular term's words in the answer's breakdown. */
const encoderLabel = (t: AngularTerm): string =>
  `${(JOINT_WORDS[t.frame] ?? t.frame).replace(/^./, (c) => c.toUpperCase())} encoder ±${SPEC_SHEET.encoderDegrees}° × ${t.lever.toFixed(1)} m`;

const edgeOf = (a: {
  meters?: number;
  radians?: number;
  byDefinition?: true;
  note: string;
}): EdgeAccuracy => ({ ...a });

/**
 * The arm's frames as the tree adds them (pad to tool, defined by the app),
 * each edge stating its own accuracy at `instant` (the capstone's too,
 * Task 8).
 */
export function armAdded(
  arm: ReturnType<typeof armFrames>,
  angles: ReturnType<typeof anglesOf>,
  instant: Instant,
): AddedFrameSpec[] {
  const at = (name: string) => arm.all.find((f) => f.name === name)!;
  const appEdge = (
    name: string,
    kind: AddedFrameSpec["edge"]["kind"],
    detail: string,
  ): AddedFrameSpec["edge"] => ({
    kind,
    detail,
    accuracy: edgeOf(at(name).accuracy(instant)),
  });
  return [
    {
      id: PAD.name,
      label: PAD.name,
      parentId: "ITRF",
      app: true,
      edge: appEdge(
        PAD.name,
        "constant",
        `east-north-up at NGS mark ${PAD.mark} on LC-39A's pad (${PAD.latitude.toFixed(5)}° N, ${(-PAD.longitude).toFixed(5)}° W, h ${PAD.height.toFixed(3)} m, its datasheet's, its NAD83(1990) position taken as NAD83(2011), an identity PROJ states at 0.1 m (ESRI:108355); carried by CCV6's NAD83(2011) velocity and through PROJ to ITRF2020 at ${COORDINATE_EPOCH.toFixed(1)}): the library's eastNorthUpFrame`,
      ),
    },
    {
      id: ARM.base,
      label: ARM.base,
      parentId: PAD.name,
      app: true,
      edge: appEdge(
        ARM.base,
        "constant",
        `a fixed placement ${GEOMETRY.base[0]} m east of the pad's centre (synthetic)`,
      ),
    },
    {
      id: ARM.yaw,
      label: ARM.yaw,
      parentId: ARM.base,
      app: true,
      edge: appEdge(
        ARM.yaw,
        "translation+rotation",
        `the slewing ring, ${GEOMETRY.column} m up its column, turned ${deg(angles.yaw)} about its up axis (z)`,
      ),
    },
    {
      id: ARM.shoulder,
      label: ARM.shoulder,
      parentId: ARM.yaw,
      app: true,
      edge: appEdge(
        ARM.shoulder,
        "rotation",
        `the boom raised ${deg(angles.shoulder)} about the shoulder's y axis`,
      ),
    },
    {
      id: ARM.elbow,
      label: ARM.elbow,
      parentId: ARM.shoulder,
      app: true,
      edge: appEdge(
        ARM.elbow,
        "translation+rotation",
        `${GEOMETRY.boom} m along the boom, the forearm turned ${deg(angles.elbow)} about y`,
      ),
    },
    {
      id: ARM.wrist,
      label: ARM.wrist,
      parentId: ARM.elbow,
      app: true,
      edge: appEdge(
        ARM.wrist,
        "translation+rotation",
        `${GEOMETRY.forearm} m along the forearm, the tool turned ${deg(angles.wrist)} about y`,
      ),
    },
    {
      id: ARM.tool,
      label: ARM.tool,
      parentId: ARM.wrist,
      app: true,
      edge: appEdge(
        ARM.tool,
        "constant",
        `the tool's point, ${GEOMETRY.tool} m out from the wrist`,
      ),
    },
  ];
}

export const evaluateRobotArm: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
) => {
  const instant = Instant.fromTdb(epochTdb);
  const itrf = ctx.frames.itrf;
  const angles = anglesOf(knobs);
  const arm = armFrames(itrf, angles);
  const t = frameTransform(arm.tool, itrf, instant);
  const tool = [t[12]!, t[13]!, t[14]!];
  // Both ends at one coordinate epoch: they ride one plate (arm.ts).
  const year = COORDINATE_EPOCH;
  const v = stationValues(station);
  const years = year - v.epoch;
  const { itrf: mark, operation } = stationInItrf(proj(ctx), station, year);
  const distance = Math.hypot(...tool.map((x, i) => x - mark[i]!));

  // The arm's part, as the library composes it from what each frame states.
  const composed = pointAccuracy(
    framePoint(arm.tool, [0, 0, 0], instant),
    itrf,
  );
  const markSigma = stationSigma(years);
  const projExact = operation.accuracy === 0 && !operation.ballpark;
  const projKnown = !operation.ballpark && operation.accuracy !== undefined;
  const projMeters = projKnown ? operation.accuracy! : undefined;
  const total =
    composed.meters === undefined || projMeters === undefined
      ? undefined
      : Math.hypot(composed.meters, markSigma.meters, projMeters);
  const angular = composed.terms.filter(
    (x): x is AngularTerm => x.kind === "angular",
  );
  const links = composed.terms.filter(
    (x) => x.kind === "meters" && x.frame !== ARM.base,
  );
  const survey = composed.terms.find((x) => x.frame === ARM.base);
  const breakdown = [
    ...angular.map((x) => ({
      label: encoderLabel(x),
      meters: x.meters!,
      note: x.note,
    })),
    ...(survey?.meters !== undefined
      ? [{ label: "Base survey", meters: survey.meters, note: survey.note }]
      : []),
    ...(links.length > 0
      ? [
          {
            label: `Links ±${SPEC_SHEET.linkMeters * 1000} mm × ${links.length}`,
            meters: Math.hypot(...links.map((x) => x.meters ?? NaN)),
            note: "the column's, boom's, forearm's and tool's lengths (synthetic spec sheet, 1σ), root-sum-square",
          },
        ]
      : []),
    {
      label: `${MARK.name} (NGS datasheet)`,
      meters: markSigma.meters,
      note: `the datasheet's network standard deviations (N ${mm(v.sd[0])}, E ${mm(v.sd[1])}, h ${mm(v.sd[2])}) and its printed velocity's rounding over ${years.toFixed(1)} years (${mm(markSigma.velocity)})`,
    },
    {
      label: "PROJ NAD83(2011) → ITRF2020",
      ...(projMeters !== undefined && { meters: projMeters }),
      note: projExact
        ? "exact by definition: PROJ states 0 m for EPSG's ITRF2020 to NAD83(2011) (1), the 14-parameter transformation that realises NAD83(2011) from ITRF2020"
        : projKnown
          ? "PROJ's stated accuracy for the operation"
          : "not stated: PROJ gives no accuracy for the operation",
    },
  ].sort(largestFirst);
  // The leading term, or the encoders that share it (the shoulder and the
  // base yaw turn about one point, the column's top).
  const top = dominantTerm({
    terms: [
      ...composed.terms,
      { frame: MARK.frame, kind: "meters", meters: markSigma.meters, note: "" },
    ],
  });
  const ties =
    top?.kind === "angular"
      ? angular.filter(
          (x) => Math.abs(x.meters! - top.meters!) <= 1e-3 * top.meters!,
        )
      : [];
  const lead =
    top === undefined
      ? "nothing leads"
      : top.frame === MARK.frame
        ? `most of it ${MARK.name}'s datasheet`
        : top.kind === "angular"
          ? `most of it the ${ties.map((x) => JOINT_WORDS[x.frame] ?? x.frame).join(" and ")} encoder${ties.length > 1 ? `s, ${mm(top.meters!)} each` : `, ${mm(top.meters!)}`}`
          : top.frame === ARM.base
            ? `most of it the base's survey, ${mm(top.meters!)}`
            : `most of it the ${top.frame}'s link, ${mm(top.meters!)}`;
  const added: AddedFrameSpec[] = [
    ...armAdded(arm, angles, instant),
    {
      id: MARK.frame,
      label: MARK.frame,
      parentId: "ITRF",
      edge: {
        kind: "proj-operation",
        // The pipeline itself is in the Verification row's detail; the
        // route step says what it is.
        detail: `PROJ: NAD83(2011) to ITRF2020, a 14-parameter Helmert with rates (EPSG's ITRF2020 to NAD83(2011) (1), inverted), at epoch ${year.toFixed(3)}; ${operation.grids.length > 0 ? `grids: ${operation.grids.join(", ")}` : "no grids"}`,
        accuracy: projExact
          ? {
              byDefinition: true,
              note: "exact by definition: PROJ states 0 m for EPSG's ITRF2020 to NAD83(2011) (1), the 14-parameter transformation that realises NAD83(2011) from ITRF2020",
              short:
                "exact by definition (the transformation realises NAD83(2011))",
            }
          : projMeters !== undefined
            ? {
                meters: projMeters,
                note: "PROJ's stated accuracy for the recorded operation",
              }
            : {
                note: "not stated: PROJ gives no accuracy for the recorded operation",
              },
      },
    },
  ];

  const where = `The arm at yaw ${deg(angles.yaw)}, shoulder ${deg(angles.shoulder)}, elbow ${deg(angles.elbow)}, wrist ${deg(angles.wrist)}`;
  const live = [
    forwardKinematicsResult(
      {
        group: "frame-tree",
        id: "frame-tree.joint-chain.forward-kinematics.live",
        instant: epochTdb,
      },
      where,
      itrf,
      [angles],
    ),
    composedAccuracyResult(
      {
        group: "frame-tree",
        id: "frame-tree.joint-chain.accuracy.live",
        instant: epochTdb,
      },
      where,
      itrf,
      [angles],
    ),
    {
      ...roundTripResult(
        {
          group: "frame-tree",
          id: "frame-tree.joint-chain.round-trip.live",
          instant: epochTdb,
        },
        where,
        [arm.tool, ...arm.joints.slice(0, -1)],
        itrf,
        epochTdb,
      ),
      instant: epochTdb,
    },
  ];

  const epochText = `the coordinate epoch ${COORDINATE_EPOCH.toFixed(1)}`;
  const accuracyNote =
    total === undefined
      ? `not bounded: ${composed.unboundedBy !== undefined ? `${composed.unboundedBy} states no accuracy` : "PROJ states no accuracy for the operation"}`
      : `the terms below, root-sum-square; ${lead}. ${PAD_OUTSIDE}`;
  const toolInBase = frameTransform(arm.tool, arm.base, instant);
  const out = Math.hypot(toolInBase[12]!, toolInBase[13]!);
  return {
    scenario: "robot-arm",
    added,
    data: {
      label: `${MARK.name}'s position`,
      frame: MARK.frame,
      source: `NGS datasheet ${MARK.pid}`,
      describes: `the station's NAD83(2011) position (epoch ${station.nad83.epoch}), carried to ${epochText} by its published velocity`,
      accuracy: {
        meters: markSigma.meters,
        note: `the datasheet's network standard deviations and its velocity's rounding over ${years.toFixed(1)} years (1σ)`,
      },
    },
    answer: {
      label: `from the tool to ${MARK.name}`,
      aside: `The tool ${out.toFixed(1)} m out from the column and ${toolInBase[14]!.toFixed(1)} m up · ${MARK.name} ${fmt(distance / 1000, 3)} km away, at Cape Canaveral`,
      headline: `A straight line from the arm's tool to ${MARK.long} (PID ${MARK.pid}), the NOAA CORS station nearest the pad that NGS publishes in both NAD83(2011) and ITRF: none is within a few kilometres, so it is ${fmt(distance / 1000, 3)} km away, at Cape Canaveral. The tool's place comes down the arm's frames, which the app defines; the station's comes from its datasheet, in NAD83(2011), through PROJ to ITRF2020 at ${year.toFixed(2)}. Each joint states its encoder and each link its length (a synthetic spec sheet), and the library composes them to the tool: the encoders' errors grow with the arm's reach.`,
      value: distance,
      unit: "m",
      digits: 3,
      accuracy:
        total === undefined
          ? { note: accuracyNote, unbounded: true }
          : {
              meters: total,
              note: accuracyNote,
              walks: [{ frame: ARM.tool, meters: composed.meters! }],
            },
      path: { from: MARK.frame, to: ARM.tool },
      breakdown,
      method: [
        {
          title: "The arm",
          text: `Synthetic, sized like a launch pad's service arm: its base ${GEOMETRY.base[0]} m east of LC-39A's centre, a ${GEOMETRY.column} m column to the slewing ring, an ${GEOMETRY.boom} m boom, a ${GEOMETRY.forearm} m forearm and a ${GEOMETRY.tool} m tool. Each joint is a frame the app builds with the public Frame API: a link offset in its parent, then a turn about its own axis by the knob.`,
        },
        {
          title: "What each frame states",
          text: `The spec sheet (synthetic, 1σ): each encoder ±${SPEC_SHEET.encoderDegrees}°, each link's length ±${SPEC_SHEET.linkMeters * 1000} mm, the base's survey in the pad frame ±${SPEC_SHEET.surveyMeters * 1000} mm. The pad's frame is exact by definition: it is defined at NGS mark ${PAD.mark}, a disk in LC-39A's pad, at its datasheet's position and height. So the ± covers the arm and the station from that point; it is not a survey of LC-39A or of where a real arm would stand. Moving the point moves the answer about 1 m per metre along the line to the station, 0.33 m per metre east and 3.4 mm per metre of height; ${PAD.mark}'s position is from a 1991 adjustment and the mark's stability is rated questionable.`,
        },
        {
          title: "How the library composes it",
          text: `pointAccuracy walks the tool's route to ITRF: each encoder's angle times the tool's distance from that joint (its lever arm), each link and the survey as they are, all root-sum-square (taken as independent). A frame that stated nothing would make the total unbounded, and be named.`,
        },
        {
          title: `${MARK.name}`,
          text: `NGS's NAD83(2011) position for the station (epoch ${station.nad83.epoch}), carried to ${epochText} by its NAD83(2011) velocity, through PROJ's NAD83(2011) to ITRF2020 operation at that epoch. The pad takes the same path, carried by the station's velocity (borrowed: a passive mark has none of its own), so the distance doesn't depend on the epoch chosen or follow the clock. ITRF here is taken as ITRF2020. The catalog checks the same path against NGS's own ITRF2020 position for the station.`,
        },
      ],
    },
    overlays: [],
    labels: [
      {
        id: "mark",
        text: `${MARK.name} · NGS ${MARK.pid}`,
        at: mark,
      },
    ],
    arm: {
      tool,
      mark,
      markMeters: markSigma.meters,
      ...(projMeters !== undefined && { projMeters }),
      ...(total !== undefined && { totalMeters: total }),
    },
    presets: [
      {
        id: "fully-extended",
        label: "Fully extended",
        icon: "extend",
        knobs: { shoulder: 0, elbow: 0, wrist: 0 },
        title:
          "The boom, forearm and tool level and in line: the encoders' lever arms at their longest",
      },
      {
        id: "stowed",
        label: "Stowed",
        icon: "stow",
        knobs: { shoulder: 80, elbow: -150, wrist: 70 },
        title: "The arm folded against its column, the tool level",
      },
    ],
    legend: [
      {
        key: "arm",
        label: "The arm, joint to joint (app-defined frames)",
        short: "Arm",
        accuracy:
          total === undefined
            ? "not bounded"
            : `tool ±${mm(composed.meters!)} (1σ)`,
        line: "solid",
        tone: "white",
      },
      {
        key: "leader",
        label: `The straight line from the tool to ${MARK.name}`,
        short: `To ${MARK.name}`,
        accuracy:
          total === undefined
            ? "not bounded"
            : `±${mm(total)} (1σ); ${PAD_OUTSIDE_SHORT}`,
        line: "dashed",
        tone: "white",
      },
    ],
    live,
  };
};

registerScenario("robot-arm", evaluateRobotArm);
