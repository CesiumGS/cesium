import { warpForward, warpInverse, type Warp } from "../camera/route.ts";
import type { Instant } from "../time/Instant.ts";
import type { EdgeAccuracy } from "../transform/accuracy.ts";
import {
  affine,
  smooth,
  switchEdge,
  TransformGraph,
  type Edge,
  type PlainEdge,
  type TransformNode,
} from "../transform/graph.ts";
import type { FrameCatalog } from "./catalog.ts";
import type { Frame } from "./Frame.ts";
import { framePoint } from "./local.ts";
import { pointAccuracy } from "./pointAccuracy.ts";
import { isSwitchFrame, isSmoothFrame } from "./smoothFrame.ts";

/** A catalogue's reference frames as affine nodes of a transform graph. */
export interface FrameGraph {
  readonly graph: TransformGraph;
  /** The node of `frame`, once it is in the catalogue's tree in use. */
  node(frame: Frame): TransformNode | undefined;
  /** The frame a node stands for. */
  frameOf(node: TransformNode): Frame | undefined;
  /**
   * What each frame edge states of its accuracy, for `accuracyAlong`'s
   * `affine` option, at scene `seconds` (default 0): the covariance at the
   * edge's output that `pointAccuracy` composes for that one edge (every
   * figure, its confidence read as 1σ, rotations by their lever, rotated into
   * the output's axes); `Infinity` for an edge that is unstated, simulated or
   * refused, which makes the total unbounded.
   */
  accuracy(seconds?: number): EdgeAccuracy;
  /**
   * Adds the frames the tree in use has gained, and bumps the node of each
   * frame whose `revision` moved (data arrived, `invalidate()`), so a route's
   * `revision` follows it. Called once on creation.
   */
  sync(): void;
}

/**
 * Represents the catalogue's tree in use in a transform graph: each `Frame`
 * edge is an affine node whose matrix is `frame.toParent` at the route's
 * seconds (as `resolver.instant` reads them), a smooth frame a smooth node
 * with the same direction (up to its parent) and a switch frame a switch
 * node. The frames stay the source of truth and `FrameResolver` keeps
 * working; this is a view of them.
 */
export function graphOfFrames(
  catalog: FrameCatalog,
  resolver: { instant(seconds: number): Instant },
  graph: TransformGraph = new TransformGraph(),
): FrameGraph {
  const nodes = new Map<Frame, TransformNode>();
  const frames = new Map<TransformNode, Frame>();
  const seen = new Map<Frame, number>();
  const sync = () => {
    for (const { frame } of catalog.treeInUse()) {
      const node = nodes.get(frame);
      if (node) {
        if (seen.get(frame) !== frame.revision) {
          seen.set(frame, frame.revision);
          graph.invalidate(node);
        }
        continue;
      }
      const parent = frame.parent && nodes.get(frame.parent);
      const made = parent
        ? graph.add(frame.name, parent, edgeOfFrame(frame, resolver))
        : graph.root(frame.name);
      nodes.set(frame, made);
      frames.set(made, frame);
      seen.set(frame, frame.revision);
    }
  };
  sync();
  const accuracy =
    (seconds = 0): EdgeAccuracy =>
    (edge) => {
      const frame = frames.get(edge.node);
      if (edge.kind !== "affine" || !frame?.parent) {
        return undefined;
      }
      const instant = resolver.instant(seconds);
      // Up the edge is the frame to its parent; undone, the parent to the frame.
      const [from, to] = edge.down
        ? [frame.parent, frame]
        : [frame, frame.parent];
      const a = pointAccuracy(
        framePoint(from, edge.input, instant),
        to,
        instant,
      );
      return a.meters === undefined || a.covariance === undefined
        ? Number.POSITIVE_INFINITY
        : a.covariance;
    };
  return {
    graph,
    node: (frame) => nodes.get(frame),
    frameOf: (node) => frames.get(node),
    accuracy,
    sync,
  };
}

/** A frame's edge to its parent as a graph edge. */
function edgeOfFrame(
  frame: Frame,
  resolver: { instant(seconds: number): Instant },
): Edge {
  if (isSmoothFrame(frame)) {
    return smoothEdgeOfWarp(frame.warp);
  }
  if (isSwitchFrame(frame)) {
    const { byView, default: fallback } = frame.edges();
    const plain = (warp: Warp | undefined): PlainEdge =>
      warp ? smoothEdgeOfWarp(warp) : identityEdge();
    return switchEdge({
      byView: new Map([...byView].map(([view, warp]) => [view, plain(warp)])),
      ...(fallback !== null && { default: plain(fallback) }),
    });
  }
  return affine({
    at: (seconds, out) => {
      frame.toParent(resolver.instant(seconds), out);
    },
  });
}

const identityEdge = () =>
  affine({ matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] });

/** A warp (local to parent, at the scale it has now) as a smooth node. */
function smoothEdgeOfWarp(warp: Warp) {
  return smooth({
    id: warp.description ?? `${warp.from.name} to ${warp.to.name}`,
    params: {},
    forward: (p, _params, out, jacobian) => {
      warpForward(warp, p, out, jacobian);
    },
    inverse: (q, _params, out) => {
      warpInverse(warp, q, out);
    },
    ...(warp.accuracy?.sigma !== undefined && {
      accuracy: warp.accuracy.sigma,
    }),
  });
}
