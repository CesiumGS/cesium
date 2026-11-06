// The frame-tree model behind the frames explorer's tree view. Plain data
// that Task 6's panel renders: every field is a string, number or array,
// except the optional `frame`, `engineering` and `trajectory` references to
// the library objects a node stands for (a worker that builds part of the tree
// leaves them out, and a structured clone carries no class instances).
import type { Frame } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import type { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { earthOrientationSigma } from "../../src/measure/accuracy.ts";
import { EARTH_ROTATION_RATE } from "../../src/measure/constants.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { Trajectory } from "../../src/trajectory/Trajectory.ts";

/** How a frame is joined to its parent. */
export type EdgeKind =
  | "root"
  /** A Newtonian origin shift. */
  | "translation"
  | "rotation"
  | "translation+rotation"
  /** The GCRF edge: the affine map of IERS Conventions 2010 eq. 11.19. */
  | "iers-affine"
  | "constant"
  | "trajectory"
  /** An engineering frame: a recorded PROJ operation. */
  | "proj-operation";

/**
 * An edge's stated model accuracy (R8). `meters` is a 1σ position error and
 * `radians` a 1σ rotation error; an edge states whichever applies. Both are
 * `undefined` when the accuracy is not known, with the reason in `note`. Never
 * 0 and never NaN.
 */
export interface EdgeAccuracy {
  meters?: number;
  radians?: number;
  note: string;
}

export interface TreeNode {
  /** Unique in the tree: the frame's name; `engineering:<name>` for an engineering frame. */
  id: string;
  label: string;
  frame?: Frame;
  engineering?: EngineeringFrame;
  trajectory?: Trajectory;
  /** How this node is joined to its parent. The root's edge is `root`. */
  edge: { kind: EdgeKind; detail: string; accuracy: EdgeAccuracy };
  children: TreeNode[];
}

/** DE440's stated accuracy for the positions it gives, m (R8). */
const EPHEMERIS_M = 0.01;
/** The IAU 2006 frame bias's model accuracy, rad (R8). */
const FRAME_BIAS_RAD = 1e-15;
const ephemerisAccuracy = (): EdgeAccuracy => ({
  meters: EPHEMERIS_M,
  note: "DE440 Earth-Moon fit to lunar laser ranging (stated model accuracy)",
});

/**
 * An accuracy that is a finite positive number, or `undefined` with a note.
 * The one place a value becomes an `EdgeAccuracy`, so none is 0 or NaN.
 */
function accuracy(
  value: { meters?: number | undefined; radians?: number | undefined },
  note: string,
  unknownNote: string,
): EdgeAccuracy {
  const ok = (v: number | undefined): v is number =>
    v !== undefined && Number.isFinite(v) && v > 0;
  const out: EdgeAccuracy = { note };
  if (ok(value.meters)) {
    out.meters = value.meters;
  }
  if (ok(value.radians)) {
    out.radians = value.radians;
  }
  if (out.meters === undefined && out.radians === undefined) {
    out.note = unknownNote;
  }
  return out;
}

const unknown = (note: string): EdgeAccuracy => ({ note });

type Edge = TreeNode["edge"];

/**
 * The GCRF to ITRF rotation's accuracy at `instant`: the Earth-orientation
 * sigma. UT1 error turns the Earth by `σ_t · ω` radians and polar motion tilts
 * its axis by `σ_p`; the edge states their root sum square in radians (the
 * same terms `accuracyOf` scales to meters by the point's distance). A
 * predicted sample grows with its age past the table's last observed row
 * (IERS Bulletin A: polar 0.00068 · d^0.80 arcsec, UT1 0.00025 · d^0.75 s). It
 * depends on the instant, so without one it is not stated.
 */
function earthOrientationAccuracy(
  frames: Frames,
  instant: Instant | undefined,
): EdgeAccuracy {
  if (instant === undefined) {
    return unknown(
      "not stated without an instant: Earth orientation depends on time (pass one to buildTree)",
    );
  }
  const sigma = earthOrientationSigma(frames, instant);
  if (sigma.degraded) {
    return unknown(
      `not known: the instant is outside the EOP table (${sigma.span})`,
    );
  }
  const note = sigma.predicted
    ? `predicted Earth orientation, ${sigma.ageDays.toFixed(1)} days past the last observed row (IERS Bulletin A)`
    : "measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)";
  return accuracy(
    {
      radians: Math.hypot(
        sigma.ut1Seconds * EARTH_ROTATION_RATE,
        sigma.polarRadians,
      ),
    },
    `${note}. An angular bound: the root sum square of the UT1 rotation (σ_t · ω) and the polar-motion tilt, in radians; accuracyOf gives meters for a point`,
    "not known: Earth orientation is not finite",
  );
}

/** The built-in edges, keyed by frame name. Built lazily: some accuracies depend on the instant. */
const BUILT_IN: Record<
  string,
  (frames: Frames, instant: Instant | undefined) => Edge
> = {
  ICRF: () => ({
    kind: "root",
    detail: "the International Celestial Reference Frame",
    accuracy: unknown("the root defines the frame; there is no edge to bound"),
  }),
  HCRS: () => ({
    kind: "translation",
    detail: "ephemeris: sun (DE440)",
    accuracy: unknown(
      "not stated: heliocentric geometry has no stated absolute accuracy (DE440's 0.01 m is its Earth-Moon fit)",
    ),
  }),
  EARTH_ICRF: () => ({
    kind: "translation",
    detail: "ephemeris: earth (DE440)",
    accuracy: ephemerisAccuracy(),
  }),
  MOON_ICRF: () => ({
    kind: "translation",
    detail: "ephemeris: moon (DE440)",
    accuracy: ephemerisAccuracy(),
  }),
  GCRF: () => ({
    kind: "iers-affine",
    detail:
      "IERS Conventions 2010 eq. 11.19 (TT to TDB scale and Lorentz term), origin from ephemeris: earth (DE440)",
    accuracy: ephemerisAccuracy(),
  }),
  EME2000: () => ({
    kind: "constant",
    detail: "frame bias (IAU 2006)",
    accuracy: {
      radians: FRAME_BIAS_RAD,
      note: "frame bias model accuracy (stated)",
    },
  }),
  ITRF: (frames, instant) => ({
    kind: "rotation",
    detail: "IAU 2006/2000A + EOP",
    accuracy: earthOrientationAccuracy(frames, instant),
  }),
  MOON_ME: () => ({
    kind: "rotation",
    detail: "lunar PCK libration (DE440)",
    accuracy: unknown(
      "not stated: the library gives no lunar orientation accuracy",
    ),
  }),
  MOON_PA: () => ({
    kind: "constant",
    detail: "principal axes from mean Earth / polar axes (fixed rotation)",
    accuracy: unknown(
      "not stated: the library gives no principal-axes accuracy",
    ),
  }),
};

/** A frame that is not in the table: a local frame, a constant placement on its parent. */
const FALLBACK_LOCAL: Edge = {
  kind: "constant",
  detail: "local frame: a fixed placement in its parent",
  accuracy: unknown("not known: set by the position it was built at"),
};

/** An engineering frame's edge: the recorded PROJ operation. */
function projEdge(frame: EngineeringFrame): Edge {
  const { pipeline, grids, accuracy: stated, ballpark } = frame.operation;
  const known = !ballpark && stated !== undefined;
  const quality = ballpark
    ? "ballpark"
    : known
      ? `accuracy ±${stated} m`
      : "accuracy unknown";
  const gridText = grids.length > 0 ? grids.join(", ") : "none";
  return {
    kind: "proj-operation",
    detail: `PROJ operation: ${pipeline}; grids: ${gridText}; ${quality}`,
    accuracy: accuracy(
      { meters: known ? stated : undefined },
      `PROJ's stated accuracy for the recorded operation (grids: ${gridText})`,
      ballpark
        ? "ballpark: the operation ignores datum differences, so its accuracy is not known"
        : "unknown: PROJ states no accuracy for the recorded operation",
    ),
  };
}

/** A trajectory's edge; its accuracy is the `positionSigma` at the instant. */
function trajectoryEdge(
  trajectory: Trajectory,
  instant: Instant | undefined,
): Edge {
  const detail = `trajectory (${trajectory.source}), accuracy class ${trajectory.accuracy}, in ${trajectory.reference.name}`;
  if (instant === undefined) {
    return {
      kind: "trajectory",
      detail,
      accuracy: unknown(
        "not stated without an instant: the position sigma depends on time (pass one to buildTree)",
      ),
    };
  }
  return {
    kind: "trajectory",
    detail,
    accuracy: accuracy(
      { meters: trajectory.positionSigma(instant) },
      "trajectory position sigma at the instant (covariance or the stated positionSigma)",
      "not known: the trajectory has no covariance or positionSigma at the instant, or the instant is outside its data",
    ),
  };
}

/**
 * The tree of `frames`' built-in frames, with `extras` attached:
 *
 * - `engineering` frames hang under their body's fixed frame (ITRF for Earth,
 *   MOON_ME for the Moon) with a `proj-operation` edge;
 * - `trajectories` hang under their `reference`;
 * - `local` frames hang under their `parent`, which may be a built-in frame or
 *   another local frame (any order).
 *
 * Edge kinds come from a table keyed by built-in frame name; a local frame is a
 * `constant` placement. (A `Frame` doesn't expose how it was constructed, so a
 * local frame can't be told from a constant one by inspection.)
 *
 * `instant` (an `Instant`, or TDB seconds past J2000) fixes the edge
 * accuracies that depend on time: the GCRF to ITRF Earth-orientation sigma
 * (measured, or predicted by Bulletin A with its age) and a trajectory's
 * position sigma. Without it those edges are undefined with a note saying so.
 * Every edge's accuracy is a positive finite number or undefined with a note
 * (R8), never 0 or NaN.
 *
 * Throws, naming the frame, if a node's id repeats or its parent isn't in the
 * tree.
 */
export function buildTree(
  frames: Frames,
  extras: {
    engineering?: readonly EngineeringFrame[];
    trajectories?: readonly Trajectory[];
    local?: readonly Frame[];
  } = {},
  instant?: Instant | number,
): TreeNode {
  const at = typeof instant === "number" ? Instant.fromTdb(instant) : instant;
  const byId = new Map<string, TreeNode>();
  const byFrame = new Map<Frame, TreeNode>();
  const pending: { node: TreeNode; parent: Frame }[] = [];

  const add = (node: TreeNode): TreeNode => {
    if (byId.has(node.id)) {
      throw new Error(`frames tree: two nodes are named "${node.id}"`);
    }
    byId.set(node.id, node);
    if (node.frame) {
      byFrame.set(node.frame, node);
    }
    return node;
  };
  const make = (
    id: string,
    label: string,
    edge: Edge,
    refs: Pick<TreeNode, "frame" | "engineering" | "trajectory">,
  ): TreeNode => ({ id, label, ...refs, edge, children: [] });

  const builtIn = [
    frames.icrf,
    frames.hcrs,
    frames.gcrf,
    frames.earthIcrf,
    frames.eme2000,
    frames.moonIcrf,
    frames.itrf,
    frames.moonMe,
    frames.moonPa,
  ] as readonly Frame[];
  for (const frame of builtIn) {
    const edge = BUILT_IN[frame.name]!(frames, at);
    const node = add(make(frame.name, frame.name, edge, { frame }));
    if (frame.parent) {
      pending.push({ node, parent: frame.parent });
    }
  }
  for (const frame of extras.local ?? []) {
    const node = add(make(frame.name, frame.name, FALLBACK_LOCAL, { frame }));
    if (frame.parent) {
      pending.push({ node, parent: frame.parent });
    }
  }
  for (const trajectory of extras.trajectories ?? []) {
    const node = add(
      make(trajectory.name, trajectory.name, trajectoryEdge(trajectory, at), {
        frame: trajectory.frame,
        trajectory,
      }),
    );
    pending.push({ node, parent: trajectory.reference });
  }
  for (const engineering of extras.engineering ?? []) {
    const { name } = engineering.definition;
    const node = add(
      make(`engineering:${name}`, name, projEdge(engineering), {
        engineering,
      }),
    );
    pending.push({ node, parent: frames.bodyFixed(engineering.body) });
  }

  for (const { node, parent } of pending) {
    const owner = byFrame.get(parent);
    if (!owner) {
      throw new Error(
        `frames tree: "${node.id}" hangs under "${parent.name}", which is not in the tree`,
      );
    }
    owner.children.push(node);
  }
  const root = byId.get(frames.icrf.name)!;
  return root;
}

/** `id`'s node and each ancestor up to the root, in that order. Throws, naming `id`, if it is not in `tree`. */
export function pathToRoot(tree: TreeNode, id: string): TreeNode[] {
  const walk = (node: TreeNode): TreeNode[] | undefined => {
    if (node.id === id) {
      return [node];
    }
    for (const child of node.children) {
      const found = walk(child);
      if (found) {
        found.push(node);
        return found;
      }
    }
    return undefined;
  };
  const path = walk(tree);
  if (!path) {
    throw new Error(`frames tree: no node "${id}"`);
  }
  return path;
}
