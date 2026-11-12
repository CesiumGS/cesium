import type { SmoothFrameSpec, WarpScale } from "../../src/camera/route.ts";
import type {
  Params,
  SmoothEdge,
  SmoothSpec,
} from "../../src/transform/graph.ts";
import { LiveWarp } from "../../src/transforms/liveWarp.ts";

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
  /** The edge writes no Jacobian: take it by central differences with this step (in the node's units). */
  readonly differences?: number;
  /** Where the edge is defined, in the node's own coordinates: a centre and a radius. */
  readonly domain?: {
    readonly center: ArrayLike<number>;
    readonly radius: number;
  };
}

/**
 * A built-in smooth edge (`src/transforms`, `src/georeference`) as the spec
 * `smoothFrame` takes: its function and inverse with the parameters it has
 * now, the same edge as a graph step for the compiler, and a slider that moves
 * one float. The built-ins return graph edges; this is the application's glue
 * to put one over content in the engine, until the engine takes edges itself.
 */
export class LiveEdge extends LiveWarp implements SmoothFrameSpec {
  readonly description: string;
  readonly scale: WarpScale | undefined;
  readonly accuracy: { readonly sigma: number } | undefined;
  readonly domain:
    { readonly center: ArrayLike<number>; readonly radius: number } | undefined;
  /** The closed-form inverse, when the edge has one; else the engine solves by Newton. */
  readonly inverse?: (q: ArrayLike<number>, out: Float64Array) => Float64Array;
  private readonly spec: SmoothSpec;
  private readonly step: number | undefined;
  private readonly values: Record<string, number>;
  private smoothRevision = -1;
  private smoothSpec: SmoothSpec | undefined;

  constructor(edge: SmoothEdge, options: LiveEdgeOptions) {
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

  /** The edge as the compiler's smooth step, with the parameters it has now. */
  get smooth(): SmoothSpec {
    if (this.smoothRevision !== this.ownRevision) {
      this.smoothRevision = this.ownRevision;
      this.smoothSpec = { ...this.spec, params: { ...this.values } };
    }
    return this.smoothSpec!;
  }

  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array {
    const h = this.step;
    if (jacobian === undefined || h === undefined) {
      this.spec.forward(p, this.values, out, jacobian);
      return out;
    }
    this.spec.forward(p, this.values, out);
    const plus = new Float64Array(3);
    const minus = new Float64Array(3);
    const at = [p[0]!, p[1]!, p[2]!];
    for (let c = 0; c < 3; c++) {
      const a = at.slice();
      const b = at.slice();
      a[c] = a[c]! + h;
      b[c] = b[c]! - h;
      this.spec.forward(a, this.values, plus);
      this.spec.forward(b, this.values, minus);
      for (let r = 0; r < 3; r++) {
        jacobian[c * 3 + r] = (plus[r]! - minus[r]!) / (2 * h);
      }
    }
    return out;
  }
}

/** `edge` as a spec for `smoothFrame`. */
export function liveEdge(edge: SmoothEdge, options: LiveEdgeOptions): LiveEdge {
  return new LiveEdge(edge, options);
}
