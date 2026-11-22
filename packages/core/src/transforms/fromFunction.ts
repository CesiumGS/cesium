// A curvilinear transform from a plain function (docs/design/transform-graph.md, owner 2026-11-11:
// application functions are restricted plain JS). The function is the CPU
// path, called as it is; its source is parsed, never evaluated, into the IR
// (`parseTransform`), which gives the engine an exact Jacobian by autodiff
// and a compiled route on the GPU. A function outside the subset (a free
// variable, a call to something but `Math`, a loop with no constant bound) is
// refused by the parser with the construct named: it is kept all the same, its
// Jacobian by central differences and its draws fitted per vertex, as ever
// (`FunctionCurvilinearMap.compiled` is false, `fitReason` says why).
import {
  curvilinearInverse,
  type CurvilinearMap,
  type CurvilinearScale,
} from "../camera/route.ts";
import type { Params, CurvilinearSpec } from "../transform/graph.ts";
import { irPasses, loadIr, type IrPasses } from "../transform/lazyIr.ts";
import type { Program } from "../transform/program.ts";
import {
  LiveCurvilinearMap,
  NO_FRAME,
  type ChangeableCurvilinearMap,
} from "./liveCurvilinearMap.ts";

/**
 * A point function, p to q in meters: it writes `q` into `out` (`out[0] = …`)
 * or returns it as three numbers, and reads `p` and its declared `params` and
 * nothing else (`Math` aside). Restricted JS parses to the IR.
 */
export type PointFunction = (
  p: ArrayLike<number>,
  params: Params,
  out: Float64Array,
) => ArrayLike<number> | void;

/** What `fromFunction` takes besides the function. */
export interface FromFunctionOptions {
  /** The parameters the function reads, by name, with their starting values: explicit inputs, never closures. Set them with `setParams`. */
  readonly params?: Params;
  /** The parameters the output is affine in, which a compiled route keeps as uniforms. */
  readonly separable?: readonly string[];
  /** The values of the separable parameters at which the function is the identity, for a `scale` (a slider). */
  readonly identity?: Params;
  /** Words for reports (a `CurvilinearMap`'s `description`). */
  readonly description?: string;
  /** Where the function is defined, in the frame's own meters; everywhere when absent. The derivative's step scales with its radius. */
  readonly domain?: CurvilinearMap["domain"];
  /** What the function is accurate to against what it models; exact when absent. It says nothing of the derivative. */
  readonly accuracy?: CurvilinearMap["accuracy"];
  /** A live number moving the curvilinear map's strength (a slider): see `CurvilinearMap.scale`. */
  readonly scale?: CurvilinearScale;
  /** The exact inverse, when the function has one; otherwise the engine's Newton inverts it. */
  readonly inverse?: (
    q: ArrayLike<number>,
    params: Params,
    out: Float64Array,
  ) => ArrayLike<number> | void;
  /** The step of the numerical derivative, in meters, replacing the default, for a function outside the IR's subset. */
  readonly step?: number;
  /** The Newton inverse's tolerance, meters (the engine's default: 1e-9). */
  readonly tolerance?: number;
  /** The Newton inverse's iteration limit (the engine's default: 32). */
  readonly iterations?: number;
}

/** A transform made from a function: `setParams` or `changed()` after it behaves differently. */
export interface FunctionCurvilinearMap extends ChangeableCurvilinearMap {
  /** The parameter values now. */
  readonly params: Params;
  /** Sets parameters by name (a name the function wasn't given throws), then `changed()`. */
  setParams(patch: Params): void;
  /**
   * Whether the function parsed to the IR: its draws are compiled. False: they are fitted, and `fitReason` says why.
   * Cesium IR loads when the first function map is made (CS-794), so this is false
   * until it has (a moment, usually): the map says `changed()` when it settles.
   */
  readonly compiled: boolean;
  /** The parser's words for the construct that kept the function out of the IR; undefined when it parsed. While Cesium IR loads: "Cesium IR is loading". */
  readonly fitReason: string | undefined;
  /** The inverse: the options' own, else the engine's Newton on this curvilinear map's `forward` and its Jacobian. */
  inverse(q: ArrayLike<number>, out: Float64Array): Float64Array;
}

const EPS = Number.EPSILON;

/** `fitReason` while Cesium IR loads (the function isn't parsed yet). */
const IR_LOADING = "Cesium IR is loading";

class FunctionCurvilinearMapImpl
  extends LiveCurvilinearMap
  implements FunctionCurvilinearMap
{
  readonly description: string | undefined;
  readonly domain: CurvilinearMap["domain"];
  readonly accuracy: CurvilinearMap["accuracy"];
  readonly scale: CurvilinearScale | undefined;
  private readonly values: Record<string, number>;
  /** The function's IR program: parsed once Cesium IR has loaded, and none when it is outside the subset. */
  private program: Program | undefined;
  private irPasses: IrPasses | undefined;
  private reason: string | undefined = IR_LOADING;
  private readonly source: string;
  private readonly at = new Float64Array(3);
  private readonly plus = new Float64Array(3);
  private readonly minus = new Float64Array(3);
  private readonly core: CurvilinearMap;
  private curvilinearRevision = -1;
  private curvilinearSpec: CurvilinearSpec | undefined;

  constructor(
    private readonly map: PointFunction,
    private readonly options: FromFunctionOptions,
  ) {
    super();
    if (
      options.step !== undefined &&
      !(Number.isFinite(options.step) && options.step > 0)
    ) {
      throw new RangeError(
        `fromFunction: step must be a positive number of meters, got ${options.step}`,
      );
    }
    this.values = { ...options.params };
    for (const [name, value] of Object.entries(this.values)) {
      checkValue(name, value);
    }
    this.description = options.description;
    this.domain = options.domain;
    this.accuracy = options.accuracy;
    this.scale = options.scale;
    this.source = Function.prototype.toString.call(map);
    // Cesium IR loads with the first function map; this parses as soon as it has.
    const passes = irPasses();
    if (passes) {
      this.adopt(passes);
    } else {
      loadIr().then(
        (loaded) => {
          this.adopt(loaded);
          this.changed();
        },
        (error: unknown) => {
          this.reason = `Cesium IR did not load (${error instanceof Error ? error.message : String(error)})`;
          this.changed();
        },
      );
    }
    this.core = {
      from: NO_FRAME,
      to: NO_FRAME,
      revision: 1,
      ...(options.description !== undefined && {
        description: options.description,
      }),
      forward: (p, out, jacobian) => this.forward(p, out, jacobian),
    };
  }

  get compiled(): boolean {
    return this.program !== undefined;
  }

  get fitReason(): string | undefined {
    return this.reason;
  }

  /** Parses the function now that Cesium IR is here. */
  private adopt(passes: IrPasses): void {
    try {
      this.program = passes.parseTransform(this.source);
      this.irPasses = passes;
      this.reason = undefined;
    } catch (error) {
      if (!(error instanceof passes.TransformParseError)) {
        throw error;
      }
      this.program = undefined;
      this.reason = error.message;
    }
  }

  get params(): Params {
    return this.values;
  }

  setParams(patch: Params): void {
    for (const [name, value] of Object.entries(patch)) {
      if (!(name in this.values)) {
        throw new RangeError(
          `fromFunction: the function was given no parameter '${name}'`,
        );
      }
      checkValue(name, value);
    }
    Object.assign(this.values, patch);
    this.changed();
  }

  /**
   * The function as a graph curvilinear step when it parsed (the compiler reads
   * its source); undefined when it didn't, which has it fitted.
   */
  get curvilinear(): CurvilinearSpec | undefined {
    if (!this.program) {
      return undefined;
    }
    if (this.curvilinearRevision !== this.ownRevision) {
      this.curvilinearRevision = this.ownRevision;
      const { options } = this;
      this.curvilinearSpec = {
        id: options.description ?? "function",
        params: { ...this.values },
        source: this.source,
        forward: (p, params, out, jacobian) => {
          this.evaluate(p[0]!, p[1]!, p[2]!, params, out);
          if (jacobian) {
            this.jacobianAt(p, params, jacobian);
          }
        },
        ...(options.separable !== undefined && {
          separable: options.separable,
        }),
        ...(options.identity !== undefined && { identity: options.identity }),
      };
    }
    return this.curvilinearSpec;
  }

  private evaluate(
    x: number,
    y: number,
    z: number,
    params: Params,
    out: Float64Array,
  ): Float64Array {
    const at = this.at;
    at[0] = x;
    at[1] = y;
    at[2] = z;
    const result = this.map(at, params, out);
    if (result !== undefined && result !== out) {
      out[0] = result[0]!;
      out[1] = result[1]!;
      out[2] = result[2]!;
    }
    if (!(
      Number.isFinite(out[0]) &&
      Number.isFinite(out[1]) &&
      Number.isFinite(out[2])
    )) {
      throw new RangeError(
        `fromFunction: the function is not finite at (${x}, ${y}, ${z})`,
      );
    }
    return out;
  }

  /** J at `p`, column-major: the IR's autodiff when the function parsed, else central differences. */
  private jacobianAt(
    p: ArrayLike<number>,
    params: Params,
    out: Float64Array,
  ): void {
    if (this.program && this.irPasses) {
      const rows = this.irPasses.jacobian(this.program, p, params);
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          out[c * 3 + r] = rows[3 * r + c]!;
        }
      }
      return;
    }
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    const value = this.evaluate(x, y, z, params, this.minus);
    const reach = Math.max(
      Math.hypot(x, y, z),
      Math.hypot(value[0]!, value[1]!, value[2]!),
      1,
    );
    const length = this.domain?.radius ?? Math.max(Math.hypot(x, y, z), 1);
    const h = this.options.step ?? Math.cbrt(3 * EPS * reach * length * length);
    const { plus, minus } = this;
    for (let c = 0; c < 3; c++) {
      const dx = c === 0 ? h : 0;
      const dy = c === 1 ? h : 0;
      const dz = c === 2 ? h : 0;
      this.evaluate(x + dx, y + dy, z + dz, params, plus);
      this.evaluate(x - dx, y - dy, z - dz, params, minus);
      for (let r = 0; r < 3; r++) {
        out[c * 3 + r] = (plus[r]! - minus[r]!) / (2 * h);
      }
    }
  }

  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array {
    this.evaluate(p[0]!, p[1]!, p[2]!, this.values, out);
    if (jacobian !== undefined) {
      this.jacobianAt(p, this.values, jacobian);
    }
    return out;
  }

  inverse = (q: ArrayLike<number>, out: Float64Array): Float64Array => {
    const exact = this.options.inverse;
    if (exact !== undefined) {
      const result = exact(q, this.values, out);
      if (result !== undefined && result !== out) {
        out[0] = result[0]!;
        out[1] = result[1]!;
        out[2] = result[2]!;
      }
      return out;
    }
    const { tolerance, iterations } = this.options;
    return curvilinearInverse(this.core, q, out as Float64Array<ArrayBuffer>, {
      ...(tolerance !== undefined && { tolerance }),
      ...(iterations !== undefined && { iterations }),
    });
  };
}

function checkValue(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `fromFunction: parameter '${name}' is ${value}; it must be finite`,
    );
  }
}

/**
 * A curvilinear transform from a plain function, p to q in meters
 * (`PointFunction`: `(p, params) => [x, y, z]`, or writing `out`), so an
 * application writes the map and nothing else. The function is the CPU
 * path. Written in the restricted subset (`parseTransform`: `Math`, its
 * parameters, constant loops) it is also parsed into the IR: the Jacobian
 * is exact by autodiff, a route through it compiles to the GPU and its
 * parameters are uniforms, so `setParams` moves them with no refit. Outside
 * the subset it is fitted (`compiled` false, `fitReason`), the Jacobian by central
 * differences and the draws by per-vertex fits.
 *
 * The step of the central differences is `(3·ε·R·L²)^(1/3)` meters (ε the
 * float64 epsilon, R the larger of |p|, |q| and 1 m, and L the domain's
 * radius, else |p|), which balances rounding against truncation: about
 * 1e-5 of L. For a map that varies smoothly on the scale of L it is right
 * to a relative 1e-9 at Earth scale. A map with features smaller than that
 * step (a kink, a tight bend) needs a smaller `step`. The forward values
 * are the function's own, exactly; an error in the Jacobian only changes
 * the engine's stretch estimates and Newton's speed, never where Newton
 * converges to.
 *
 * The inverse is the options' own, or the engine's Newton (`curvilinearInverse`)
 * using the Jacobian. The function must be injective on its domain and
 * finite (a `RangeError` where it isn't). Place it over the content it
 * transforms (`curvilinearFrame`).
 */
export function fromFunction(
  map: PointFunction,
  options: FromFunctionOptions = {},
): FunctionCurvilinearMap {
  return new FunctionCurvilinearMapImpl(map, options);
}
