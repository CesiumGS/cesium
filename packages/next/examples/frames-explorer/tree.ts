// The frame-tree model behind the frames explorer's tree view. Plain data
// that Task 6's panel renders: every field is a string, number or array,
// except the optional `frame`, `engineering` and `trajectory` references to
// the library objects a node stands for (a worker that builds part of the tree
// leaves them out, and a structured clone carries no class instances).
import type { Frame } from "../../src/frames/Frame.ts";
import type { FrameAccuracy } from "../../src/frames/frameAccuracy.ts";
import type { Frames } from "../../src/frames/frames.ts";
import type { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
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
 * An edge's stated model accuracy (R8): the library's `FrameAccuracy` (one
 * source of truth, Task 7b), with the note's short form for the walk.
 * `meters` is a 1σ position error and `radians` a 1σ rotation error; an edge
 * states whichever applies. Both are `undefined` when the accuracy is not
 * known, with the reason in `note`. Never 0 and never NaN.
 */
export interface EdgeAccuracy extends FrameAccuracy {
  /**
   * The note's short form, where prose would be cut badly (fix 2): the
   * walk's "adds nothing" line uses it rather than splitting the note.
   */
  short?: string;
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
  /** Set on a node a scenario added to the base tree (`buildScenarioTree`). */
  added?: true;
  /** Set on an added node the app defines itself, through the public Frame API (the robot arm's joints, Task 7b). */
  app?: true;
}

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

/**
 * A frame's own stated accuracy, for an edge whose accuracy doesn't depend
 * on the instant (the instant is then not read; the epoch is a placeholder).
 */
const stated = (frame: Frame): EdgeAccuracy => ({
  ...frame.accuracy(Instant.fromTdb(0)),
});

type Edge = TreeNode["edge"];

/**
 * The GCRF to ITRF rotation's accuracy at `instant`: the library's own
 * statement on the edge (frames.ts, the Earth-orientation sigma). It
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
  return { ...frames.itrf.accuracy(instant) };
}

/**
 * The built-in edges whose accuracy drifts with the instant, by frame name:
 * the GCRF to ITRF Earth-orientation sigma (Task 4d: while the clock plays,
 * the page updates these in place rather than building the tree again).
 * Each is the accuracy `buildTree` states for that edge at `instant`.
 */
export function driftingAccuracies(
  frames: Frames,
  instant: Instant,
): Record<string, EdgeAccuracy> {
  return { [frames.itrf.name]: earthOrientationAccuracy(frames, instant) };
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
  // Every other edge's accuracy is the library's own statement on the frame
  // (frames.ts BUILT_IN_ACCURACY, Task 7b), with a short form where the walk
  // needs one.
  HCRS: (frames) => ({
    kind: "translation",
    detail: "ephemeris: sun (DE440)",
    accuracy: stated(frames.hcrs),
  }),
  EARTH_ICRF: (frames) => ({
    kind: "translation",
    detail: "ephemeris: earth (DE440)",
    accuracy: stated(frames.earthIcrf),
  }),
  MOON_ICRF: (frames) => ({
    kind: "translation",
    detail: "ephemeris: moon (DE440)",
    accuracy: stated(frames.moonIcrf),
  }),
  GCRF: (frames) => ({
    kind: "iers-affine",
    detail:
      "IERS Conventions 2010 eq. 11.19 (TT to TDB scale and Lorentz term), origin from ephemeris: earth (DE440)",
    accuracy: stated(frames.gcrf),
  }),
  EME2000: (frames) => ({
    kind: "constant",
    detail: "frame bias (IAU 2006)",
    accuracy: {
      ...stated(frames.eme2000),
      short: "exact by definition (IAU 2006 adopted constants)",
    },
  }),
  ITRF: (frames, instant) => ({
    kind: "rotation",
    detail: "IAU 2006/2000A + EOP",
    accuracy: earthOrientationAccuracy(frames, instant),
  }),
  MOON_ME: (frames) => ({
    kind: "rotation",
    detail: "lunar PCK libration (DE440)",
    accuracy: {
      ...stated(frames.moonMe),
      short: "not stated: no published orientation uncertainty",
    },
  }),
  MOON_PA: (frames) => ({
    kind: "constant",
    detail: "principal axes from mean Earth / polar axes (fixed rotation)",
    accuracy: {
      ...stated(frames.moonPa),
      short: "exact by definition for DE440 (its adopted constants)",
    },
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

/** A frame a scenario adds to the base tree. Plain data, so it can come from the worker. */
export interface AddedFrameSpec {
  id: string;
  label: string;
  parentId: string;
  edge: TreeNode["edge"];
  /** The app defines it itself, through the public Frame API (the diagram says "defined by your app"). */
  app?: true;
}

/**
 * A new tree: `base` plus the `added` frames, each marked `added`. `base` is
 * not changed (its nodes are copied; the `frame`, `engineering` and
 * `trajectory` references are shared). An added frame may hang under another
 * added frame, in any order.
 *
 * Throws, naming the id, if an id repeats (in `base` or among `added`) or a
 * parent isn't in the resulting tree.
 */
export function buildScenarioTree(
  base: TreeNode,
  added: readonly AddedFrameSpec[],
): TreeNode {
  const byId = new Map<string, TreeNode>();
  const copy = (node: TreeNode): TreeNode => {
    const out: TreeNode = { ...node, children: node.children.map(copy) };
    byId.set(out.id, out);
    return out;
  };
  const root = copy(base);
  const fresh = new Map<string, AddedFrameSpec>();
  for (const spec of added) {
    if (byId.has(spec.id) || fresh.has(spec.id)) {
      throw new Error(`frames tree: two nodes are named "${spec.id}"`);
    }
    fresh.set(spec.id, spec);
  }
  const nodes = new Map<string, TreeNode>();
  for (const spec of added) {
    const node: TreeNode = {
      id: spec.id,
      label: spec.label,
      edge: spec.edge,
      children: [],
      added: true,
      ...(spec.app && { app: true as const }),
    };
    nodes.set(spec.id, node);
  }
  for (const spec of added) {
    const parent = byId.get(spec.parentId) ?? nodes.get(spec.parentId);
    if (!parent) {
      throw new Error(
        `frames tree: "${spec.id}" hangs under "${spec.parentId}", which is not in the tree`,
      );
    }
    parent.children.push(nodes.get(spec.id)!);
  }
  // An added frame whose parents lead only to each other never reaches the root.
  const reachable = new Set<string>();
  const mark = (n: TreeNode): void => {
    reachable.add(n.id);
    n.children.forEach(mark);
  };
  mark(root);
  for (const id of fresh.keys()) {
    if (!reachable.has(id)) {
      throw new Error(`frames tree: "${id}" is not connected to the root`);
    }
  }
  return root;
}

/**
 * The route between `a` and `b` through their nearest common ancestor.
 * `up` runs from `a` to just below the ancestor, and `down` from just below
 * the ancestor to `b`; each is empty when that node is the ancestor itself.
 * Throws, naming the id, if either is not in `tree`.
 */
export function branchPath(
  tree: TreeNode,
  a: string,
  b: string,
): { up: TreeNode[]; ancestor: TreeNode; down: TreeNode[] } {
  const fromA = pathToRoot(tree, a);
  const fromB = pathToRoot(tree, b);
  const inB = new Set(fromB.map((n) => n.id));
  const meet = fromA.findIndex((n) => inB.has(n.id));
  const ancestor = fromA[meet]!;
  const downTo = fromB.findIndex((n) => n.id === ancestor.id);
  return {
    up: fromA.slice(0, meet),
    ancestor,
    down: fromB.slice(0, downTo).reverse(),
  };
}
