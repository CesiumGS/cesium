// A camera route (src/camera/route.ts: affine steps and `CurvilinearMap` steps) as a
// transform-graph route (src/transform), for the compiler: the bridge between
// the curvilinear maps the engine has today and the curvilinear steps it compiles. Each affine
// step is an affine node and each curvilinear map with a `curvilinear` spec a curvilinear node,
// under a root that is the route's base; the content's node is the deepest.
// Only forward steps bridge (a curvilinear map run through its inverse is fitted), and a
// curvilinear map with a `scale` (a slider) needs the spec to say which parameters it
// scales (`CurvilinearSpec.identity`): at scale `s` each is
// `identity + s · (value − identity)`, the curvilinear map's `p + s · (f(p) − p)`.
//
// The bridged route always has an affine step at each end and between two curvilinear maps
// (an identity where the camera route has none), so the routes of different
// views to different roots, which differ in their affine steps only, have one
// shape and one compiled program (`normalize`).
import {
  curvilinearValuesOf,
  type Route as CameraRoute,
  type RouteStep as CameraStep,
  type CurvilinearMap,
} from "../../camera/route.ts";
import {
  affine,
  curvilinear,
  TransformGraph,
  type Params,
  type TransformNode,
} from "../../transform/graph.ts";
import { routeBetween, type Route } from "../../transform/route.ts";

export interface BridgedRoute {
  readonly graph: TransformGraph;
  /** The route from the content's node to the base's. */
  readonly route: Route;
  /** What the route's curvilinear steps' functions are, for telling when a rebuild is due. */
  readonly sources: readonly (string | undefined)[];
  /**
   * Brings the graph to the camera route's affine matrices and the curvilinear maps'
   * parameter values now (their specs are live, and so is a slider). What
   * changed: a matrix, or a parameter value.
   */
  refresh(camera: CameraRoute): { matrices: boolean; params: boolean };
  /** Whether `camera` is the route this was made from, in its steps and curvilinear maps' functions. */
  matches(camera: CameraRoute): boolean;
  /** The affine matrices before the last curvilinear map, in order, as the graph has them now. */
  prefixMatrices(): readonly Float64Array[];
}

export interface BridgeRefusal {
  readonly reason: string;
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

/**
 * The camera route's steps with an affine step at each end and between curvilinear maps
 * (an identity where the route has none): the shape every view's route to
 * its own root takes.
 */
export function normalize(steps: readonly CameraStep[]): CameraStep[] {
  const out: CameraStep[] = [];
  const pad = () =>
    out.push({ kind: "affine", matrix: Float64Array.from(IDENTITY) });
  for (const step of steps) {
    if (
      step.kind === "curvilinear" &&
      (out.length === 0 || out[out.length - 1]!.kind === "curvilinear")
    ) {
      pad();
    }
    out.push(step);
  }
  if (out[out.length - 1]?.kind === "curvilinear") {
    pad();
  }
  return out;
}

/** The parameter values a curvilinear map's curvilinear step has now (`curvilinearValuesOf`). */
export function valuesOf(curvilinearMap: CurvilinearMap): Params {
  return curvilinearValuesOf(curvilinearMap);
}

function same(a: Params, b: Params): boolean {
  const names = Object.keys(a);
  return (
    names.length === Object.keys(b).length && names.every((n) => a[n] === b[n])
  );
}

/** The bridged route, or why the camera route can't take the compiled path. */
export function bridgeRoute(input: CameraRoute): BridgedRoute | BridgeRefusal {
  const camera = { ...input, steps: normalize(input.steps) };
  let curvilinearMaps = 0;
  for (const step of camera.steps) {
    if (step.kind === "affine") {
      continue;
    }
    curvilinearMaps++;
    const name = step.curvilinearMap.description ?? "a curvilinear map";
    if (step.inverse) {
      return { reason: `${name} is run through its inverse` };
    }
    const spec = step.curvilinearMap.curvilinear;
    if (!spec) {
      return { reason: `${name} has no curvilinear spec` };
    }
    if (spec.source === undefined) {
      return { reason: `${name}'s function is not in the IR's subset` };
    }
    if (step.curvilinearMap.scale && !spec.identity) {
      return {
        reason: `${name} has a scale and its spec declares no identity values to scale from`,
      };
    }
  }
  if (curvilinearMaps === 0) {
    return { reason: "the route crosses no curvilinear map" };
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
    if (step.kind === "affine") {
      nodes[i] = graph.add(
        `affine ${i}`,
        parent,
        affine({ matrix: step.matrix }),
      );
      matrices[i] = Float64Array.from(step.matrix);
    } else {
      const spec = step.curvilinearMap.curvilinear!;
      const values = valuesOf(step.curvilinearMap);
      nodes[i] = graph.add(
        `curvilinear map ${i}`,
        parent,
        curvilinear({
          ...spec,
          id: spec.id ?? `curvilinear map${i}`,
          params: values,
        }),
      );
      held[i] = values;
      sources[i] = spec.source;
    }
    parent = nodes[i]!;
  }
  const route = routeBetween(nodes[0]!, root);
  const lastCurvilinearMap = camera.steps.findLastIndex(
    (s) => s.kind === "curvilinear",
  );
  return {
    graph,
    route,
    sources: camera.steps.flatMap((s, i) =>
      s.kind === "curvilinear" ? [sources[i]] : [],
    ),
    prefixMatrices() {
      const out: Float64Array[] = [];
      for (let i = 0; i < lastCurvilinearMap; i++) {
        const m = matrices[i];
        if (m) {
          out.push(m);
        }
      }
      return out;
    },
    matches(raw) {
      const next = { ...raw, steps: normalize(raw.steps) };
      return (
        next.steps.length === nodes.length &&
        next.steps.every((s, i) =>
          s.kind === "affine"
            ? matrices[i] !== undefined
            : held[i] !== undefined &&
              !s.inverse &&
              s.curvilinearMap.curvilinear?.source === sources[i],
        )
      );
    },
    refresh(raw) {
      const next = { ...raw, steps: normalize(raw.steps) };
      let changedMatrices = false;
      let changedParams = false;
      next.steps.forEach((s, i) => {
        if (s.kind === "affine") {
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
        const values = valuesOf(s.curvilinearMap);
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
