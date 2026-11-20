// A built-in curvilinear edge as the live spec a curvilinear frame takes (docs/design/transform-graph.md).
// The built-ins (`twist`, `bend`, `utm`, `radialDistortion`, …) return graph
// edges, which are values: this puts one over content in the frames
// (`curvilinearFrame(name, parent, liveEdge(edge, …))`), with its parameters
// changeable and one float a slider moves.
import type { CurvilinearFrameSpec, WarpScale } from "../camera/route.ts";
import type {
  Params,
  CurvilinearEdge,
  CurvilinearSpec,
} from "../transform/graph.ts";
import { LiveWarp } from "./liveWarp.ts";

/** What `liveEdge` takes besides the edge. */
export interface LiveEdgeOptions {
  /** Words for the graph panel and reports. */
  readonly description: string;
  /** A live number for a slider (a world's placement parameter): the strength of the edge, 0 for none. Needs the edge's `identity`. */
  readonly scale?: WarpScale;
  /** Overrides the edge's own `identity` (the values of its separable parameters at which it does nothing). */
  readonly identity?: Params;
  /** 1σ of what the edge models, m. */
  readonly sigma?: number;
  /** The edge writes no Jacobian: take it by central differences with this step (in the node's units; by default a millionth of the coordinate, at least a millionth). */
  readonly differences?: number;
  /** Where the edge is defined, in the node's own coordinates: a center and a radius. */
  readonly domain?: {
    readonly center: ArrayLike<number>;
    readonly radius: number;
  };
}

/** A built-in edge as a changeable `CurvilinearFrameSpec`: its function and inverse with the parameters it has now, and the same edge as a graph step for the compiler. */
export class LiveEdge extends LiveWarp implements CurvilinearFrameSpec {
  readonly description: string;
  readonly scale: WarpScale | undefined;
  readonly accuracy: { readonly sigma: number } | undefined;
  readonly domain:
    { readonly center: ArrayLike<number>; readonly radius: number } | undefined;
  /** The closed-form inverse, when the edge has one; else the engine solves by Newton. */
  readonly inverse?: (q: ArrayLike<number>, out: Float64Array) => Float64Array;
  private readonly spec: CurvilinearSpec;
  private readonly step: number | undefined;
  private readonly values: Record<string, number>;
  private curvilinearRevision = -1;
  private curvilinearSpec: CurvilinearSpec | undefined;

  constructor(edge: CurvilinearEdge, options: LiveEdgeOptions) {
    super();
    this.step = options.differences;
    this.domain = options.domain;
    this.description = options.description;
    this.scale = options.scale;
    this.accuracy =
      options.sigma !== undefined ? { sigma: options.sigma } : undefined;
    const identity = options.identity ?? edge.spec.identity;
    this.spec = { ...edge.spec, ...(identity !== undefined && { identity }) };
    this.values = { ...edge.spec.params };
    const inverse = edge.spec.inverse;
    if (inverse !== undefined) {
      this.inverse = (q, out) => {
        inverse(q, this.values, out);
        return out;
      };
    }
  }

  /** The parameter values now. */
  get params(): Params {
    return this.values;
  }

  /** Sets parameters by name (one the edge doesn't declare throws), then says the edge changed. */
  setParams(patch: Params): void {
    for (const name of Object.keys(patch)) {
      if (!(name in this.values)) {
        throw new RangeError(`${this.spec.id ?? "edge"}: no parameter ${name}`);
      }
    }
    Object.assign(this.values, patch);
    this.changed();
  }

  /** The edge as the compiler's curvilinear step, with the parameters it has now. */
  get curvilinear(): CurvilinearSpec {
    if (this.curvilinearRevision !== this.ownRevision) {
      this.curvilinearRevision = this.ownRevision;
      this.curvilinearSpec = { ...this.spec, params: { ...this.values } };
    }
    return this.curvilinearSpec!;
  }

  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array {
    if (jacobian === undefined) {
      this.spec.forward(p, this.values, out);
      return out;
    }
    const h = this.step;
    if (h === undefined) {
      // An edge that writes no Jacobian leaves it untouched: take it by differences.
      jacobian.fill(Number.NaN);
      this.spec.forward(p, this.values, out, jacobian);
      if (!jacobian.some(Number.isNaN)) {
        return out;
      }
    } else {
      this.spec.forward(p, this.values, out);
    }
    const plus = new Float64Array(3);
    const minus = new Float64Array(3);
    const at = [p[0]!, p[1]!, p[2]!];
    for (let c = 0; c < 3; c++) {
      const step = h ?? 1e-6 * Math.max(1, Math.abs(at[c]!));
      const a = at.slice();
      const b = at.slice();
      a[c] = a[c]! + step;
      b[c] = b[c]! - step;
      this.spec.forward(a, this.values, plus);
      this.spec.forward(b, this.values, minus);
      for (let r = 0; r < 3; r++) {
        jacobian[c * 3 + r] = (plus[r]! - minus[r]!) / (2 * step);
      }
    }
    return out;
  }
}

/**
 * `edge` (a built-in's `curvilinear` edge) as a spec for `curvilinearFrame`: put it
 * over the content it acts on, and move its parameters with `setParams` or
 * one float with `scale`.
 */
export function liveEdge(
  edge: CurvilinearEdge,
  options: LiveEdgeOptions,
): LiveEdge {
  return new LiveEdge(edge, options);
}
