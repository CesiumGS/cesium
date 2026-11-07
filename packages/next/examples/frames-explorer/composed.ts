// The walk's composed accuracies (R8, UX review C2): for each frame in the
// tree and each reference (ITRF, GCRF, ICRF), the library's own `accuracyOf`
// statement (through `measure`, its public face) for a point at the frame's origin against the reference's
// origin at the clock's instant, with each term tied to the path's edges it
// comes from and the edges that add nothing named, and why.
//
// `accuracyOf` is the authority (deferred note from Task 2: the Moon's
// relativistic term sits on no edge, and only `accuracyOf` includes it). It
// states the accuracy of the separation between the two points, so a
// rotation on the path adds nothing to it: the walk says so.
import { convertPoint, framePoint } from "../../src/frames/local.ts";
import {
  pointAccuracy,
  type PointAccuracyTerm,
} from "../../src/frames/pointAccuracy.ts";
import type { Frames } from "../../src/frames/frames.ts";
import type {
  AccuracyStatement,
  AccuracyTerm,
} from "../../src/measure/accuracy.ts";
import { measure } from "../../src/measure/measure.ts";
import type { Instant } from "../../src/time/Instant.ts";
import {
  REFERENCES,
  type ComposedAccuracy,
  type ComposedView,
  type Reference,
  type WalkTerm,
} from "./panel/model.ts";
import type { TreeNode } from "./tree.ts";
import { aboutSeparation } from "./warnings.ts";

/** A node the main thread can't hand to `accuracyOf` itself: an engineering frame known only from the worker. */
export interface PlacedNode {
  /** Its origin in ITRF, meters. */
  readonly itrf: ArrayLike<number>;
  /** The recorded PROJ operation's term (`accuracyOf`'s projection term). */
  readonly projection: AccuracyTerm;
}

function index(tree: TreeNode) {
  const parent = new Map<string, TreeNode>();
  const byId = new Map<string, TreeNode>();
  const walk = (n: TreeNode) => {
    byId.set(n.id, n);
    for (const c of n.children) {
      parent.set(c.id, n);
      walk(c);
    }
  };
  walk(tree);
  const chain = (id: string): string[] => {
    const out: string[] = [];
    for (let at: string | undefined = id; at !== undefined;) {
      out.push(at);
      at = parent.get(at)?.id;
    }
    return out;
  };
  return { byId, chain };
}

/** The path's edges, named by their child node: the reference's side, then the frame's. */
function pathEdges(
  chain: (id: string) => string[],
  from: string,
  to: string,
): string[] {
  const up = chain(from);
  const down = chain(to);
  const ancestor = up.find((id) => down.includes(id));
  if (ancestor === undefined) {
    return [];
  }
  return [
    ...up.slice(0, up.indexOf(ancestor)),
    ...down.slice(0, down.indexOf(ancestor)).reverse(),
  ];
}

const EPHEMERIS_EDGES: ReadonlySet<TreeNode["edge"]["kind"]> = new Set([
  "translation",
  "translation+rotation",
  "iers-affine",
]);

/** Why an edge on the path adds nothing to the separation of the two origins. */
function whyNothing(node: TreeNode): string {
  if (node.edge.accuracy.byDefinition) {
    // Its own short form (fix 2: splitting the note cut "Park et al.").
    return node.edge.accuracy.short ?? "exact by definition";
  }
  switch (node.edge.kind) {
    case "rotation":
      return "a rotation turns the frame's axes about its own origin, so it doesn't move that origin";
    case "constant":
      return "a fixed placement, exact as given";
    case "translation":
    case "translation+rotation":
    case "iers-affine":
      return "its DE440 position is the same on both sides of the walk, so it cancels";
    default:
      return "the statement has no term for it at this origin";
  }
}

/** The walk's word for a stated term's source: the built-in edges keep theirs. */
function statedSource(frame: string): WalkTerm["source"] {
  switch (frame) {
    case "ITRF":
      return "earthOrientation";
    case "GCRF":
    case "EARTH_ICRF":
    case "MOON_ICRF":
    case "HCRS":
      return "ephemeris";
    default:
      return "stated";
  }
}

/** Why a stated edge adds nothing at the origin. */
function whyStatedNothing(t: PointAccuracyTerm, node: TreeNode): string {
  if (t.kind === "exact") {
    return node.edge.accuracy.short ?? t.note;
  }
  return "its rotation turns about this point: the lever arm is 0 m";
}

/**
 * The view of a frame whose route to the reference crosses frames the app
 * defines (Task 7b fix 1): every edge's own stated accuracy (`Frame`'s
 * `accuracy` option, the built-in edges' too), composed by the library's
 * `pointAccuracy`, so the walk states what the answer states, with each
 * term on its edge. Its rotation terms take the point's distance from each
 * frame's origin as their lever; a frame that states nothing is unbounded
 * and named.
 */
function statedView(
  node: TreeNode,
  ref: NonNullable<TreeNode["frame"]>,
  instant: Instant,
  byId: ReadonlyMap<string, TreeNode>,
  edges: readonly string[],
): ComposedView {
  let terms: readonly PointAccuracyTerm[];
  let meters: number | undefined;
  let unboundedBy: string | undefined;
  let failed: string | undefined;
  try {
    const p = pointAccuracy(framePoint(node.frame!, [0, 0, 0], instant), ref);
    terms = p.terms;
    meters = p.meters;
    unboundedBy = p.unboundedBy;
  } catch (error) {
    terms = [];
    meters = undefined;
    failed = error instanceof Error ? error.message : String(error);
  }
  const shown = terms.filter((t) => t.kind === "unstated" || t.meters > 0);
  const added = new Set(shown.map((t) => t.frame));
  const zeroAtOrigin = edges
    .filter((e) => !added.has(e))
    .map((e) => {
      const t = terms.find((x) => x.frame === e);
      const n = byId.get(e)!;
      return {
        edge: e,
        why: t ? whyStatedNothing(t, n) : "the statement has no term for it",
      };
    });
  const note =
    failed !== undefined
      ? `Not bounded: the statement could not be composed: ${failed}.`
      : unboundedBy !== undefined
        ? `Not bounded: ${unboundedBy} states no accuracy (${terms.find((t) => t.frame === unboundedBy)!.note}).`
        : "Each frame's own stated accuracy, composed by the library (pointAccuracy): root-sum-square, each rotation error times the point's distance from that frame's origin.";
  return {
    statement: {
      meters,
      terms: shown.map((t) => ({
        source: statedSource(t.frame),
        meters: t.kind === "unstated" ? undefined : t.meters,
        note: t.note,
      })),
      warnings: failed !== undefined ? [failed] : [],
      warningCodes: [],
    },
    termEdges: shown.map((t) => [t.frame]),
    zeroAtOrigin,
    note,
  };
}

/**
 * The accuracy of the separation of a point from the reference's origin by
 * the library's `accuracyOf` (through `measure`), each term tied to the
 * route's `edges` it comes from. `target === reference` composes nothing.
 */
function separationView(
  byId: ReadonlyMap<string, TreeNode>,
  frames: Frames,
  instant: Instant,
  ref: NonNullable<TreeNode["frame"]>,
  self: boolean,
  point: ReturnType<typeof framePoint>,
  edges: readonly string[],
  projection?: AccuracyTerm,
): ComposedView {
  const b = framePoint(ref, [0, 0, 0], instant);
  const accuracyOf = (a: ReturnType<typeof framePoint>): AccuracyStatement => {
    try {
      return measure(a, b, instant, frames).accuracy;
    } catch (error) {
      // A frame against itself has nothing to compose; anything else that
      // fails is not bounded, with why, never exact (R8, F35).
      if (self) {
        return { meters: 0, terms: [], warnings: [] };
      }
      const message = error instanceof Error ? error.message : String(error);
      return {
        meters: undefined,
        terms: [],
        warnings: [`the statement could not be composed: ${message}`],
      };
    }
  };
  let statement = accuracyOf(point);
  if (projection !== undefined) {
    statement = {
      meters:
        statement.meters === undefined || projection.meters === undefined
          ? undefined
          : Math.hypot(statement.meters, projection.meters),
      terms: [...statement.terms, projection],
      warnings: statement.warnings,
      ...(statement.warningCodes && { warningCodes: statement.warningCodes }),
    };
  }
  // Only warnings about the separation stay: measure's signal, footprint
  // and alignment notes say nothing of where the origin is (S-I4).
  statement = aboutSeparation(statement);
  const kindOf = (id: string) => byId.get(id)?.edge.kind;
  const termEdges = statement.terms.map((t): string[] => {
    switch (t.source) {
      case "ephemeris":
        return edges.filter((e) => EPHEMERIS_EDGES.has(kindOf(e)!));
      case "earthOrientation":
        return edges.includes("ITRF")
          ? ["ITRF"]
          : edges.filter((e) => kindOf(e) !== "rotation").slice(-1);
      case "projection":
        return edges.filter((e) => kindOf(e) === "proj-operation");
      case "trajectory":
      case "coordinateScale":
        return edges.filter((e) => kindOf(e) === "trajectory");
      default:
        return [];
    }
  });
  const used = new Set(termEdges.flat());
  const zeroAtOrigin = edges
    .filter((e) => !used.has(e))
    .map((e) => ({ edge: e, why: whyNothing(byId.get(e)!) }));
  const unknown = statement.terms.find((t) => t.meters === undefined);
  const note =
    statement.warnings[0] ??
    (unknown !== undefined
      ? `Not bounded: ${unknown.note}.`
      : "The accuracy of the separation of the two origins: what a distance between them can claim.");
  return { statement, termEdges, zeroAtOrigin, note };
}

/**
 * A route through the app's own frames, in two parts (Task 7b fix 2): from
 * the node up to its nearest built-in ancestor, each frame's stated
 * accuracy as the library composes it (`pointAccuracy`); from there to the
 * reference, `accuracyOf` for the node's origin expressed in that ancestor,
 * so each built-in edge reads as it does for every other node (its lever,
 * its "not stated"). The two combine root-sum-square, each term on its edge.
 */
function mixedView(
  byId: ReadonlyMap<string, TreeNode>,
  chain: (id: string) => string[],
  frames: Frames,
  instant: Instant,
  reference: Reference,
  node: TreeNode,
  ref: NonNullable<TreeNode["frame"]>,
): ComposedView {
  const ids = chain(node.id);
  const anchorId = ids.find((id) => id !== node.id && !byId.get(id)?.app);
  const anchor = anchorId !== undefined ? byId.get(anchorId)?.frame : undefined;
  if (anchorId === undefined || anchor === undefined) {
    return statedView(
      node,
      ref,
      instant,
      byId,
      pathEdges(chain, reference, node.id),
    );
  }
  const appPart = statedView(
    node,
    anchor,
    instant,
    byId,
    pathEdges(chain, anchorId, node.id),
  );
  if (anchorId === reference) {
    return appPart;
  }
  let builtIn: ComposedView;
  try {
    const p = convertPoint(
      framePoint(node.frame!, [0, 0, 0], instant),
      anchor,
    ).position;
    builtIn = separationView(
      byId,
      frames,
      instant,
      ref,
      false,
      framePoint(anchor, p, instant),
      pathEdges(chain, reference, anchorId),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    builtIn = {
      statement: {
        meters: undefined,
        terms: [],
        warnings: [`the statement could not be composed: ${message}`],
      },
      termEdges: [],
      zeroAtOrigin: [],
      note: `Not bounded: the statement could not be composed: ${message}.`,
    };
  }
  const a = appPart.statement;
  const b = builtIn.statement;
  const meters =
    a.meters === undefined || b.meters === undefined
      ? undefined
      : Math.hypot(a.meters, b.meters);
  const note =
    b.meters === undefined
      ? builtIn.note
      : a.meters === undefined
        ? appPart.note
        : `Root-sum-square of two parts: from ${node.label} up to ${anchorId}, each frame's own stated accuracy (pointAccuracy); from ${anchorId} to ${reference}, the library's statement for that point (accuracyOf).`;
  return {
    statement: {
      meters,
      terms: [...b.terms, ...a.terms],
      warnings: b.warnings,
      ...(b.warningCodes && { warningCodes: b.warningCodes }),
    },
    termEdges: [...builtIn.termEdges, ...appPart.termEdges],
    zeroAtOrigin: [...builtIn.zeroAtOrigin, ...appPart.zeroAtOrigin],
    note,
  };
}

/** One frame's view against one reference. */
export function composedView(
  tree: TreeNode,
  frames: Frames,
  instant: Instant,
  reference: Reference,
  target: string,
  placed: ReadonlyMap<string, PlacedNode> = new Map(),
): ComposedView | undefined {
  const { byId, chain } = index(tree);
  const node = byId.get(target);
  const ref = byId.get(reference)?.frame;
  if (node === undefined || ref === undefined) {
    return undefined;
  }
  const route = pathEdges(chain, reference, target);
  if (node.frame !== undefined && route.some((e) => byId.get(e)?.app)) {
    return mixedView(byId, chain, frames, instant, reference, node, ref);
  }
  const self = target === reference;
  if (node.frame !== undefined) {
    return separationView(
      byId,
      frames,
      instant,
      ref,
      self,
      framePoint(node.frame, [0, 0, 0], instant),
      route,
    );
  }
  const extra = placed.get(target);
  if (extra !== undefined) {
    return separationView(
      byId,
      frames,
      instant,
      ref,
      self,
      framePoint(frames.itrf, extra.itrf, instant),
      route,
      extra.projection,
    );
  }
  return undefined;
}

/** Every frame's view against every reference, at `instant`. */
export function composedAccuracy(
  tree: TreeNode,
  frames: Frames,
  instant: Instant,
  placed: ReadonlyMap<string, PlacedNode> = new Map(),
): ComposedAccuracy {
  const ids: string[] = [];
  const walk = (n: TreeNode) => {
    ids.push(n.id);
    n.children.forEach(walk);
  };
  walk(tree);
  const out = {} as Record<Reference, Record<string, ComposedView>>;
  for (const reference of REFERENCES) {
    out[reference] = {};
    for (const id of ids) {
      const v = composedView(tree, frames, instant, reference, id, placed);
      if (v !== undefined) {
        out[reference][id] = v;
      }
    }
  }
  return out;
}
