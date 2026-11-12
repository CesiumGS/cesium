// A pick in any node of the transform graph (plan 2026-11-12, task 5). A core
// pick carries where the content is (its domain point, or the drawn position
// carried back through the route: `locatePick`) and the camera route that
// drew it. `pickIn` represents that route as a transform graph (each rigid
// step an affine node, each warp a smooth one, so the route's own steps are
// its nodes: the content's node is "true", the view's render space is
// "drawn") and carries the point to the node asked for, in float64, from the
// point itself. A catalogue frame is a node of the frames' graph
// (`graphOfFrames`); the pick's anchor is where the two graphs meet.
import type { FrameKey } from "../camera/frameResolver.ts";
import {
  smoothValuesOf,
  warpForward,
  warpInverse,
  type Route as CameraRoute,
  type Warp,
} from "../camera/route.ts";
import type { CorePick } from "../scene/pick.ts";
import type { SigmaIn } from "../transform/accuracy.ts";
import {
  affine,
  smooth,
  TransformGraph,
  type SmoothSpec,
  type TransformNode,
} from "../transform/graph.ts";
import {
  pointIn,
  type NodePoint,
  type PointIn,
  type PointInOptions,
} from "../transform/queries.ts";
import type { Frame } from "./Frame.ts";
import type { FrameGraph } from "./graphOfFrames.ts";
import { locatePick, type TruthHow } from "./pickTruth.ts";

/** A camera route (rigid steps and warps) as a graph: the route's steps are its nodes. */
export interface RouteGraph {
  readonly graph: TransformGraph;
  /** The content's node: the route's `frame`, where true coordinates are. */
  readonly true: TransformNode;
  /** The route's base, the view's render space: where content is drawn. */
  readonly drawn: TransformNode;
  /** Every node from `true` up to `drawn`: the space before each step, then the base. */
  readonly nodes: readonly TransformNode[];
}

/** One warp as a smooth edge: its IR spec where it has one, else its own function (float64 only). */
function edgeOf(warp: Warp, inverse: boolean, index: number): SmoothSpec {
  const sigma = warp.accuracy?.sigma;
  const spec = warp.smooth;
  if (spec && !inverse && (!warp.scale || spec.identity)) {
    return {
      ...spec,
      id: spec.id ?? `warp${index}`,
      params: smoothValuesOf(warp),
      ...(sigma !== undefined && { accuracy: sigma }),
    };
  }
  return {
    id: `warp${index}${inverse ? "-" : ""}`,
    params: {},
    forward: inverse
      ? (p, _params, out) => {
          warpInverse(warp, p, out);
        }
      : (p, _params, out, jacobian) => {
          warpForward(warp, p, out, jacobian);
        },
    inverse: inverse
      ? (q, _params, out) => {
          warpForward(warp, q, out);
        }
      : (q, _params, out) => {
          warpInverse(warp, q, out);
        },
    ...(sigma !== undefined && { accuracy: sigma }),
  };
}

/**
 * `route` as a transform graph rooted at its base: step `i`'s input space is
 * node `i`, so the content is the deepest node and the view's render space
 * the root. A warp with a `smooth` spec keeps it (with the parameter values
 * it has, its scale applied), so its IR and closed-form Jacobian are there;
 * any other warp (no spec, or run through its inverse) is its function,
 * evaluated in float64 with the Jacobian by differences. The warps' scales
 * are as they are now: a pick's own route has them frozen.
 */
export function graphOfCameraRoute(route: CameraRoute): RouteGraph {
  const graph = new TransformGraph();
  const drawn = graph.root(route.base.name);
  const nodes: TransformNode[] = new Array<TransformNode>(route.steps.length);
  let parent = drawn;
  for (let i = route.steps.length - 1; i >= 0; i--) {
    const step = route.steps[i]!;
    const name = i === 0 ? route.frame.name : `step ${i}`;
    nodes[i] = graph.add(
      name,
      parent,
      step.kind === "rigid"
        ? affine({ matrix: step.matrix })
        : smooth(edgeOf(step.warp, step.inverse, i)),
    );
    parent = nodes[i]!;
  }
  return { graph, true: nodes[0]!, drawn, nodes: [...nodes, drawn] };
}

/** What a pick needs to reach the catalogue's frames: their graph, and the frame a key (an anchor, the render root) names. */
export interface PickFrames {
  readonly graph: FrameGraph;
  frameOf(key: FrameKey | undefined): Frame | undefined;
}

export interface PickInOptions extends PointInOptions {
  /** The frames, to ask for a pick in a catalogue `Frame`. */
  readonly frames?: PickFrames;
  /**
   * The pick's route as a graph (`graphOfCameraRoute(pick.route)`), when the
   * caller holds its nodes to ask for one (`pickIn(pick, node, { route })`);
   * made from the pick's own route when left out.
   */
  readonly route?: RouteGraph;
  /** The pick's own 1σ in its true point, carried to the answer (default 0: the located point is taken as exact). */
  readonly sigma?: SigmaIn;
}

/** A pick carried to a node. */
export interface PickedIn extends PointIn {
  /** How the point was found (`TruePick.how`); a graph-native point is "domain". */
  readonly how: TruthHow;
  /** The point is an estimate (found by an inverse, or the drawn position). */
  readonly provisional: boolean;
  /** Worst case, m, beyond the pixel, in the content's own node (`TruePick.bound`). */
  readonly bound: number;
  readonly note: string;
}

/** What a pick can be carried to: "true", "drawn", a node of the pick's own route graph, or a catalogue frame. */
export type PickTarget = "true" | "drawn" | TransformNode | Frame;

function isFrame(target: PickTarget): target is Frame {
  return typeof target === "object" && "toParent" in target;
}

/**
 * `pick` in `target`, in float64, from its located point (its domain point
 * where the pick variant resolved one; else the drawn position through the
 * route's inverse, provisional). "true" is the content's own node and
 * "drawn" the view's render space; a node of the pick's route (the space
 * between two steps, a node of `options.route`) is its own; a `Frame`
 * is the catalogue's, through `options.frames` and the graph route between
 * the pick's anchor and it. A graph-native point (`NodePoint`) is carried
 * to a node of its graph.
 */
export function pickIn(
  pick: CorePick | NodePoint,
  target: PickTarget,
  options: PickInOptions = {},
): PickedIn {
  if ("node" in pick) {
    if (typeof target === "string" || isFrame(target)) {
      throw new Error(
        'pickIn: a point at a graph node is carried to a node, not "true", "drawn" or a Frame',
      );
    }
    return {
      ...pointIn(pick, target, options),
      how: "domain",
      provisional: false,
      bound: 0,
      note: "the point's own coordinates at its node",
    };
  }
  const located = locatePick(pick);
  const sigmaIn = options.sigma ?? 0;
  if (isFrame(target)) {
    const frames = options.frames;
    const anchor = frames?.frameOf(located.frame);
    const from = anchor && frames?.graph.node(anchor);
    const to = frames?.graph.node(target);
    if (!frames || !from || !to) {
      throw new Error(
        `pickIn: "${target.name}" or the pick's anchor is not in the frames' graph (pass options.frames)`,
      );
    }
    const carried = pointIn(
      { node: from, position: located.position, sigma: sigmaIn },
      to,
      {
        ...options,
        accuracy: {
          affine: frames.graph.accuracy(options.seconds ?? pick.seconds),
          ...options.accuracy,
        },
      },
    );
    return {
      ...carried,
      how: located.how,
      provisional: located.how === "inverse" || located.how === "drawn",
      bound: located.bound,
      note: located.note,
    };
  }
  const view = pick.view as unknown as {
    anchorPlacement?(anchor: CorePick["anchor"]): Float64Array | undefined;
  };
  let pg: RouteGraph;
  if (options.route !== undefined) {
    pg = options.route;
  } else if (located.route !== undefined) {
    pg = graphOfCameraRoute(located.route);
  } else {
    // No warp: drawn is true under the anchor's rigid placement, when the view gave it.
    const graph = new TransformGraph();
    const drawn = graph.root(pick.root.name);
    const placement = view.anchorPlacement?.(pick.anchor);
    const content = graph.add(
      located.frame.name,
      drawn,
      affine({
        matrix: placement ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      }),
    );
    pg = { graph, true: content, drawn, nodes: [content, drawn] };
  }
  let node: TransformNode;
  if (target === "true") {
    node = pg.true;
  } else if (target === "drawn") {
    node = pg.drawn;
  } else if (target.graph === pg.graph) {
    node = target;
  } else {
    throw new Error(
      `pickIn: "${target.name}" is not a node of the pick's route (use "true", "drawn", a node of options.route, or a Frame)`,
    );
  }
  const carried = pointIn(
    { node: pg.true, position: located.position, sigma: sigmaIn },
    node,
    options,
  );
  return {
    ...carried,
    how: located.how,
    provisional: located.how === "inverse" || located.how === "drawn",
    bound: located.bound,
    note: located.note,
  };
}
