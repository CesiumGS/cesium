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
import { framePoint } from "../../src/frames/local.ts";
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
    return "exact by definition (IAU 2006 adopted constants)";
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
  const b = framePoint(ref, [0, 0, 0], instant);
  const accuracyOf = (a: ReturnType<typeof framePoint>): AccuracyStatement => {
    try {
      return measure(a, b, instant, frames).accuracy;
    } catch (error) {
      // A frame against itself has nothing to compose; anything else that
      // fails is not bounded, with why, never exact (R8, F35).
      if (target === reference) {
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
  let statement: AccuracyStatement;
  const extra = placed.get(target);
  // Only warnings about the separation stay: measure's signal, footprint
  // and alignment notes say nothing of where the origin is (S-I4).
  if (node.frame !== undefined) {
    statement = accuracyOf(framePoint(node.frame, [0, 0, 0], instant));
  } else if (extra !== undefined) {
    const s = accuracyOf(framePoint(frames.itrf, extra.itrf, instant));
    const terms = [...s.terms, extra.projection];
    statement = {
      meters:
        s.meters === undefined || extra.projection.meters === undefined
          ? undefined
          : Math.hypot(s.meters, extra.projection.meters),
      terms,
      warnings: s.warnings,
      ...(s.warningCodes && { warningCodes: s.warningCodes }),
    };
  } else {
    return undefined;
  }
  statement = aboutSeparation(statement);
  const edges = pathEdges(chain, reference, target);
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
