// A camera route (src/camera/route.ts: rigid steps and `Warp` steps) as a
// transform-graph route (src/transform), for the compiler: the bridge between
// the warps the engine has today and the smooth steps it compiles. Each rigid
// step is an affine node and each warp with a `smooth` spec a smooth node,
// under a root that is the route's base; the content's node is the deepest.
// Only forward steps bridge (a warp run through its inverse is fitted), and a
// warp with a `scale` (a slider) needs the spec to say which parameters it
// scales (`SmoothSpec.identity`): at scale `s` each is
// `identity + s · (value − identity)`, the warp's `p + s · (f(p) − p)`.
import {
  warpScaleOf,
  type Route as CameraRoute,
  type Warp,
} from "../../camera/route.ts";
import {
  affine,
  smooth,
  TransformGraph,
  type Params,
  type TransformNode,
} from "../../transform/graph.ts";
import { routeBetween, type Route } from "../../transform/route.ts";

export interface BridgedRoute {
  readonly graph: TransformGraph;
  /** The route from the content's node to the base's. */
  readonly route: Route;
  /** What the route's smooth steps' functions are, for telling when a rebuild is due. */
  readonly sources: readonly (string | undefined)[];
  /**
   * Brings the graph to the camera route's rigid matrices and the warps'
   * parameter values now (their specs are live, and so is a slider). What
   * changed: a matrix, or a parameter value.
   */
  refresh(camera: CameraRoute): { matrices: boolean; params: boolean };
  /** Whether `camera` is the route this was made from, in its steps and warps' functions. */
  matches(camera: CameraRoute): boolean;
}

export interface BridgeRefusal {
  readonly reason: string;
}

/** The parameter values a warp's smooth step has now: the spec's, at the warp's scale. */
export function valuesOf(warp: Warp): Params {
  const spec = warp.smooth!;
  const values: Record<string, number> = { ...spec.params };
  if (warp.scale) {
    const s = warpScaleOf(warp);
    for (const [name, identity] of Object.entries(spec.identity ?? {})) {
      if (name in values) {
        values[name] = identity + s * (values[name]! - identity);
      }
    }
  }
  return values;
}

function same(a: Params, b: Params): boolean {
  const names = Object.keys(a);
  return (
    names.length === Object.keys(b).length && names.every((n) => a[n] === b[n])
  );
}

/** The bridged route, or why the camera route can't take the compiled path. */
export function bridgeRoute(camera: CameraRoute): BridgedRoute | BridgeRefusal {
  let warps = 0;
  for (const step of camera.steps) {
    if (step.kind === "rigid") {
      continue;
    }
    warps++;
    const name = step.warp.description ?? "a warp";
    if (step.inverse) {
      return { reason: `${name} is run through its inverse` };
    }
    const spec = step.warp.smooth;
    if (!spec) {
      return { reason: `${name} has no smooth spec` };
    }
    if (spec.source === undefined) {
      return { reason: `${name}'s function is not in the IR's subset` };
    }
    if (step.warp.scale && !spec.identity) {
      return {
        reason: `${name} has a scale and its spec declares no identity values to scale from`,
      };
    }
  }
  if (warps === 0) {
    return { reason: "the route crosses no warp" };
  }
  const graph = new TransformGraph();
  const root = graph.root(camera.base.name);
  const nodes: TransformNode[] = new Array<TransformNode>(camera.steps.length);
  const matrices: Array<Float64Array | undefined> = [];
  const held: Array<Params | undefined> = [];
  const sources: Array<string | undefined> = [];
  let parent = root;
  for (let i = camera.steps.length - 1; i >= 0; i--) {
    const step = camera.steps[i]!;
    if (step.kind === "rigid") {
      nodes[i] = graph.add(
        `rigid ${i}`,
        parent,
        affine({ matrix: step.matrix }),
      );
      matrices[i] = Float64Array.from(step.matrix);
    } else {
      const spec = step.warp.smooth!;
      const values = valuesOf(step.warp);
      nodes[i] = graph.add(
        `warp ${i}`,
        parent,
        smooth({ ...spec, id: spec.id ?? `warp${i}`, params: values }),
      );
      held[i] = values;
      sources[i] = spec.source;
    }
    parent = nodes[i]!;
  }
  const route = routeBetween(nodes[0]!, root);
  return {
    graph,
    route,
    sources: camera.steps.flatMap((s, i) =>
      s.kind === "warp" ? [sources[i]] : [],
    ),
    matches(next) {
      return (
        next.steps.length === nodes.length &&
        next.steps.every((s, i) =>
          s.kind === "rigid"
            ? matrices[i] !== undefined
            : held[i] !== undefined &&
              !s.inverse &&
              s.warp.smooth?.source === sources[i],
        )
      );
    },
    refresh(next) {
      let changedMatrices = false;
      let changedParams = false;
      next.steps.forEach((s, i) => {
        if (s.kind === "rigid") {
          const before = matrices[i]!;
          for (let k = 0; k < 16; k++) {
            if (before[k] !== s.matrix[k]) {
              before.set(s.matrix);
              graph.setMatrix(nodes[i]!, s.matrix);
              changedMatrices = true;
              break;
            }
          }
          return;
        }
        const values = valuesOf(s.warp);
        if (!same(values, held[i]!)) {
          held[i] = values;
          graph.setParams(nodes[i]!, values);
          changedParams = true;
        }
      });
      return { matrices: changedMatrices, params: changedParams };
    },
  };
}
