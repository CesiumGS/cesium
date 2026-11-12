// Clip sets placed at transform-graph nodes (plan 2026-11-12, task 5). A
// `ClipSet`'s `frame` is a `FrameKey` (anything with a name), and a
// `TransformNode` is one, so a set can already say "my shapes are in this
// node's coordinates". What is missing is the resolver's answer: where the
// content's anchor is relative to that node. This is an adapter over a
// `FrameResolver`, not a rewrite of the clip machinery: for two keys that
// are nodes of one graph (a node itself, or a key `options.nodeOf` places at
// one) it answers from the graph's route between them, in float64: a matrix
// when the route is affine (the set is tested in the true or drawn space as
// ever), `NonRigidRouteError` when it crosses a smooth edge, which makes the
// set curved (`planClip`), and `route()` as the camera layer's route, each
// smooth edge a `Warp`, which is what `WorldCurvedClips` fits the signed
// distance through (`resolveRoute`, `routeForward`). Every other key goes to
// the resolver it wraps.
import type { FrameKey, FrameResolver } from "../../camera/frameResolver.ts";
import {
  NonRigidRouteError,
  type Route as CameraRoute,
  type RouteStep as CameraStep,
  type Warp,
} from "../../camera/route.ts";
import { accuracyAlong } from "../../transform/accuracy.ts";
import { TransformNode, type ViewId } from "../../transform/graph.ts";
import {
  routeBetween,
  type AffineStep,
  type Route,
} from "../../transform/route.ts";

export interface NodeResolverOptions {
  /** The graph route's view (default none). */
  readonly view?: ViewId;
  /** The node a key that is not itself a node stands at (an anchor's, the render root's), if any. */
  nodeOf?(key: FrameKey): TransformNode | undefined;
}

const IDENTITY = Float64Array.of(
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
);

/** A graph smooth edge as the camera layer's warp (up: its forward; a step down is `inverse: true` of the same warp). The parameters are as they are now: a route is a snapshot, and its revision says when to ask again. */
function warpOf(
  route: Route,
  step: Extract<Route["steps"][number], { kind: "smooth" }>,
): Warp {
  const graph = route.from.graph;
  const node = step.node;
  const edge = graph.edgeFor(node, route.view).edge;
  if (edge.kind !== "smooth") {
    throw new Error(`"${node.name}" is not a smooth node`);
  }
  const spec = edge.spec;
  const params = graph.values(node, route.view);
  const revision = node.revision;
  return {
    from: node,
    to: node.parent ?? node,
    presentation: false,
    revision,
    description: node.name,
    ...(spec.accuracy !== undefined && { accuracy: { sigma: spec.accuracy } }),
    smooth: { ...spec, params },
    forward(p, out, jacobian) {
      spec.forward(p, params, out, jacobian);
      return out;
    },
    ...(spec.inverse !== undefined && {
      inverse(q: ArrayLike<number>, out: Float64Array) {
        spec.inverse!(q, params, out);
        return out;
      },
    }),
  };
}

/** `route` as the camera layer's: its affine runs rigid steps, each smooth step a warp. */
function cameraRoute(
  route: Route,
  frame: FrameKey,
  base: FrameKey,
  seconds: number,
): CameraRoute {
  const steps: CameraStep[] = [];
  for (const step of route.steps) {
    if (step.kind === "affine") {
      steps.push({ kind: "rigid", matrix: Float64Array.from(step.matrix) });
    } else {
      steps.push({
        kind: "warp",
        warp: warpOf(route, step),
        inverse: step.inverse,
      });
    }
  }
  if (steps.length === 0) {
    steps.push({ kind: "rigid", matrix: Float64Array.from(IDENTITY) });
  }
  return {
    frame,
    base,
    seconds,
    steps,
    presentation: false,
    revision: route.revision,
  };
}

/**
 * `inner` with transform-graph nodes understood as frames: the clip sets of
 * `WorldClips` and `WorldCurvedClips` then take a node as their `frame`.
 * Wrap the resolver a world's cameras use (`engine.cameras.setResolver`).
 */
export function nodeResolver(
  inner: FrameResolver,
  options: NodeResolverOptions = {},
): FrameResolver {
  const nodeOf = (key: FrameKey): TransformNode | undefined =>
    key instanceof TransformNode ? key : options.nodeOf?.(key);
  /** The graph route between two keys, when both are nodes of one graph. */
  const between = (
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
  ): Route | undefined => {
    const a = nodeOf(frame);
    const b = nodeOf(base);
    if (!a || !b || a.graph !== b.graph) {
      return undefined;
    }
    return routeBetween(a, b, {
      ...(options.view !== undefined && { view: options.view }),
      seconds,
    });
  };
  const resolver: FrameResolver = {
    resolve(frame, base, seconds, out) {
      const route = between(frame, base, seconds);
      if (!route) {
        return inner.resolve(frame, base, seconds, out);
      }
      const steps = route.steps;
      if (steps.some((s) => s.kind === "smooth")) {
        throw new NonRigidRouteError(frame.name, base.name);
      }
      out.set(steps.length === 0 ? IDENTITY : (steps[0] as AffineStep).matrix);
      return out;
    },
    route(frame, base, seconds) {
      const route = between(frame, base, seconds);
      if (!route) {
        if (inner.route) {
          return inner.route(frame, base, seconds);
        }
        return {
          frame,
          base,
          seconds,
          steps: [
            {
              kind: "rigid",
              matrix: inner.resolve(frame, base, seconds, new Float64Array(16)),
            },
          ],
          presentation: false,
          revision: inner.routeRevision(frame, base),
        };
      }
      return cameraRoute(route, frame, base, seconds);
    },
    accuracy(point, frame, base, seconds) {
      const route = between(frame, base, seconds);
      if (!route) {
        return inner.accuracy
          ? inner.accuracy(point, frame, base, seconds)
          : {
              meters: 0,
              note: "the transform table states no error",
            };
      }
      const a = accuracyAlong(route, point, 0);
      return {
        meters: a.meters,
        note: `the transform graph's route from ${frame.name} to ${base.name}: smooth nodes' declared σ through the route's Jacobian`,
      };
    },
    routeRevision(frame, base) {
      const a = nodeOf(frame);
      const b = nodeOf(base);
      if (a && b && a.graph === b.graph) {
        return routeBetween(a, b, {
          ...(options.view !== undefined && { view: options.view }),
        }).revision;
      }
      return inner.routeRevision(frame, base);
    },
    ...(inner.motion && { motion: inner.motion.bind(inner) }),
    ...(inner.watch && { watch: inner.watch.bind(inner) }),
  };
  return resolver;
}
