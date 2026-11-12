// Helpers for the warps an application wants most (plan §13.26, the owner's
// "helper functions … i doubt most users will know what a jacobian is"): a
// plain function made into a warp, an anisotropic scale about a point, and a
// blend of two warps. Each returns a `WarpSpec` for `warpFrame`, with the
// Jacobian, the inverse, the revision and a description done. The warps of
// heights above a surface are in `heightWarps.ts`, and the reprojection
// warp is in the proj entry.
import {
  warpForward,
  warpInverse,
  type Warp,
  type WarpScale,
} from "../camera/route.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type { SmoothSpec } from "../transform/graph.ts";
import { scaleAlongAxes } from "../transforms/scaleAlongAxes.ts";
import type { WarpFrame, WarpSpec } from "./warpFrame.ts";

/**
 * A `WarpSpec` that can change: `changed()` says its inputs did. It bumps
 * `revision`, so every route through it is refitted, and invalidates the
 * frames built on it (`warpFrame(name, parent, spec)`), which wakes whoever
 * watches the frames resolver.
 */
export interface ChangeableWarp extends WarpSpec {
  changed(): void;
}

/** What `liveWarp` stands in for the ends of a warp with: only `name` is read, in messages. */
const NO_FRAME = { name: "(unattached)" };

/** The base of the helpers' warps: a revision, and the frames to invalidate. */
export abstract class LiveWarp implements ChangeableWarp {
  abstract readonly presentation: boolean;
  private own = 1;
  private readonly frames = new Set<WarpFrame>();

  get revision(): number {
    return this.own;
  }

  abstract forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array;

  attach(frame: WarpFrame): void {
    this.frames.add(frame);
  }

  changed(): void {
    this.own++;
    for (const frame of this.frames) {
      frame.invalidate();
    }
  }

  /** The warp's inputs' own changes, for a getter that sums revisions. */
  protected get ownRevision(): number {
    return this.own;
  }
}

/** `spec` as a `Warp` between no frames, for `warpForward` and `warpInverse`: it reads `spec` live. */
export function liveWarp(spec: WarpSpec): Warp {
  return {
    from: NO_FRAME,
    to: NO_FRAME,
    get presentation() {
      return spec.presentation;
    },
    get revision() {
      return spec.revision;
    },
    get domain() {
      return spec.domain;
    },
    get accuracy() {
      return spec.accuracy;
    },
    get description() {
      return spec.description;
    },
    get scale() {
      return spec.scale;
    },
    get smooth() {
      return spec.smooth;
    },
    forward: (p, out, jacobian) => spec.forward(p, out, jacobian),
    ...(spec.inverse !== undefined && {
      inverse: (q: ArrayLike<number>, out: Float64Array) =>
        spec.inverse!(q, out),
    }),
  };
}

/**
 * A point map, p to q, in metres: it writes `q` into `out` (and may return
 * it), or returns `q` as three numbers. It reads `p` and nothing else.
 */
export type PointMap = (
  p: ArrayLike<number>,
  out: Float64Array,
) => ArrayLike<number> | void;

/** What `warpFromFunction` takes besides the function. */
export interface WarpFromFunctionOptions {
  /** Whether the warp changes only how content is drawn (exaggeration), not where it is (a reprojection). Required: it decides what the warp's frames may answer. */
  readonly presentation: boolean;
  /** Words for reports (a `Warp`'s `description`). */
  readonly description?: string;
  /** Where the function is defined, in the parent's metres; everywhere when absent. The derivative's step scales with its radius. */
  readonly domain?: Warp["domain"];
  /** What the function is accurate to against what it models; exact when absent. It says nothing of the derivative, which is numerical. */
  readonly accuracy?: Warp["accuracy"];
  /** A live number moving the warp's strength (a slider): see `Warp.scale`. */
  readonly scale?: WarpScale;
  /** The exact inverse, when the function has one; otherwise the engine's Newton inverts it. */
  readonly inverse?: (q: ArrayLike<number>, out: Float64Array) => Float64Array;
  /** The step of the numerical derivative, in the parent's metres, replacing the default (see `warpFromFunction`). */
  readonly step?: number;
  /** The Newton inverse's tolerance, metres (the engine's default: 1e-9). */
  readonly tolerance?: number;
  /** The Newton inverse's iteration limit (the engine's default: 32). */
  readonly iterations?: number;
}

/** A warp made from a function: `changed()` after it behaves differently. */
export interface FunctionWarp extends ChangeableWarp {
  /** The inverse: the options' own, else the engine's Newton on this warp's `forward` and its Jacobian. */
  inverse(q: ArrayLike<number>, out: Float64Array): Float64Array;
}

const EPS = Number.EPSILON;

class FunctionWarpImpl extends LiveWarp implements FunctionWarp {
  readonly presentation: boolean;
  readonly description: string | undefined;
  readonly domain: Warp["domain"];
  readonly accuracy: Warp["accuracy"];
  readonly scale: WarpScale | undefined;
  private readonly at = new Float64Array(3);
  private readonly plus = new Float64Array(3);
  private readonly minus = new Float64Array(3);
  private readonly core: Warp;

  constructor(
    private readonly map: PointMap,
    private readonly options: WarpFromFunctionOptions,
  ) {
    super();
    if (
      options.step !== undefined &&
      !(Number.isFinite(options.step) && options.step > 0)
    ) {
      throw new RangeError(
        `warpFromFunction: step must be a positive number of metres, got ${options.step}`,
      );
    }
    this.presentation = options.presentation;
    this.description = options.description;
    this.domain = options.domain;
    this.accuracy = options.accuracy;
    this.scale = options.scale;
    this.core = {
      from: NO_FRAME,
      to: NO_FRAME,
      presentation: options.presentation,
      revision: 1,
      ...(options.description !== undefined && {
        description: options.description,
      }),
      forward: (p, out, jacobian) => this.forward(p, out, jacobian),
    };
  }

  private evaluate(
    x: number,
    y: number,
    z: number,
    out: Float64Array,
  ): Float64Array {
    const at = this.at;
    at[0] = x;
    at[1] = y;
    at[2] = z;
    const result = this.map(at, out);
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
        `warpFromFunction: the function is not finite at (${x}, ${y}, ${z})`,
      );
    }
    return out;
  }

  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array {
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    this.evaluate(x, y, z, out);
    if (jacobian === undefined) {
      return out;
    }
    const reach = Math.max(
      Math.hypot(x, y, z),
      Math.hypot(out[0]!, out[1]!, out[2]!),
      1,
    );
    const length = this.domain?.radius ?? Math.max(Math.hypot(x, y, z), 1);
    const h = this.options.step ?? Math.cbrt(3 * EPS * reach * length * length);
    const { plus, minus } = this;
    for (let c = 0; c < 3; c++) {
      const dx = c === 0 ? h : 0;
      const dy = c === 1 ? h : 0;
      const dz = c === 2 ? h : 0;
      this.evaluate(x + dx, y + dy, z + dz, plus);
      this.evaluate(x - dx, y - dy, z - dz, minus);
      for (let r = 0; r < 3; r++) {
        jacobian[c * 3 + r] = (plus[r]! - minus[r]!) / (2 * h);
      }
    }
    return out;
  }

  inverse = (q: ArrayLike<number>, out: Float64Array): Float64Array => {
    if (this.options.inverse !== undefined) {
      return this.options.inverse(q, out);
    }
    const { tolerance, iterations } = this.options;
    return warpInverse(this.core, q, out as Float64Array<ArrayBuffer>, {
      ...(tolerance !== undefined && { tolerance }),
      ...(iterations !== undefined && { iterations }),
    });
  };
}

/**
 * A warp from a plain function, p to q in metres (`PointMap`), so an
 * application writes the map and nothing else. The Jacobian the engine's
 * fits and selection read is made here, by central differences; the
 * inverse is the options' own, or the engine's Newton (`warpInverse`)
 * using that Jacobian; `changed()` bumps the revision and invalidates the
 * frames built on it.
 *
 * Accuracy of the Jacobian. The step is `(3·ε·R·L²)^(1/3)` metres (ε the
 * float64 epsilon, R the larger of |p|, |q| and 1 m, and L the domain's
 * radius, else |p|), which balances rounding against truncation: about
 * 1e-5 of L. For a map that varies smoothly on the scale of L (a
 * Jacobian whose third derivative is of order J/L²), the Jacobian is
 * right to a relative 1e-9, usually to 1e-10, at Earth scale (measured: a
 * ×10 exaggeration written as a function, at 400 points over the globe and
 * 20 km of height, is within 4e-10 of its exact Jacobian, whose entries
 * reach 10). A map with
 * features smaller than that step (a kink, a tight bend) needs a smaller
 * `step` or an analytic Jacobian written by hand, which is what the
 * `Warp` interface asks for. The stencil spans ±step, so a point within
 * that of the domain's edge sees the function just outside it. The
 * forward values are the function's own, exactly; an error in the
 * Jacobian only changes the engine's stretch estimates and Newton's
 * speed, never where Newton converges to.
 *
 * The function must be injective on its domain and finite (the warp throws
 * a `RangeError` where it isn't).
 */
export function warpFromFunction(
  map: PointMap,
  options: WarpFromFunctionOptions,
): FunctionWarp {
  return new FunctionWarpImpl(map, options);
}

/** What `scaleAbout` takes besides its point and factors. */
export interface ScaleAboutOptions {
  /** The ellipsoid whose east, north and up at the point define the axes: WGS84 by default. */
  readonly ellipsoid?: Ellipsoid;
  /** Default true: a scale of the drawn scene; false to move where content is. */
  readonly presentation?: boolean;
  readonly scale?: WarpScale;
}

/** An anisotropic scale about a point; set `factors` to change it. */
export interface ScaleAbout extends ChangeableWarp {
  /** The scale along east, north and up: setting it calls `changed()`. */
  factors: readonly [number, number, number];
}

function checkFactors(
  factors: number | ArrayLike<number>,
): [number, number, number] {
  const f: number[] =
    typeof factors === "number"
      ? [factors, factors, factors]
      : [factors[0]!, factors[1]!, factors[2]!];
  for (const v of f) {
    if (!(Number.isFinite(v) && v > 0)) {
      throw new RangeError(
        `scaleAbout: factors must be positive finite numbers, got ${f.join(", ")}`,
      );
    }
  }
  return f as [number, number, number];
}

class ScaleAboutImpl extends LiveWarp implements ScaleAbout {
  readonly presentation: boolean;
  readonly scale: WarpScale | undefined;
  private readonly center: Float64Array;
  /** Column-major east, north, up. */
  private readonly basis = new Float64Array(9);
  private current: [number, number, number];
  private forwardMatrix = new Float64Array(9);
  private inverseMatrix = new Float64Array(9);
  private smoothRevision = -1;
  private smoothSpec: SmoothSpec | undefined;

  constructor(
    point: ArrayLike<number>,
    factors: number | ArrayLike<number>,
    options: ScaleAboutOptions,
  ) {
    super();
    this.presentation = options.presentation ?? true;
    this.scale = options.scale;
    this.center = Float64Array.from([point[0]!, point[1]!, point[2]!]);
    if (!this.center.every(Number.isFinite)) {
      throw new RangeError("scaleAbout: the point must be finite");
    }
    const enu = eastNorthUpToFixedFrame(
      this.center,
      options.ellipsoid ?? Ellipsoid.WGS84,
      new Float64Array(16),
    );
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        this.basis[c * 3 + r] = enu[c * 4 + r]!;
      }
    }
    this.current = checkFactors(factors);
    this.rebuild();
  }

  get factors(): readonly [number, number, number] {
    return this.current;
  }

  /** The built-in scale along the same axes, for the compiled route. */
  get smooth(): SmoothSpec {
    if (this.smoothRevision !== this.ownRevision) {
      this.smoothRevision = this.ownRevision;
      this.smoothSpec = scaleAlongAxes({
        center: this.center,
        factors: this.current,
        axes: this.basis,
      }).spec;
    }
    return this.smoothSpec!;
  }

  set factors(value: readonly [number, number, number]) {
    this.current = checkFactors(value);
    this.rebuild();
    this.changed();
  }

  get description(): string {
    const [e, n, u] = this.current;
    const c = Array.from(this.center, (v) => Math.round(v * 100) / 100);
    return `scale east × ${e}, north × ${n}, up × ${u} about (${c.join(", ")}) m`;
  }

  /** E·diag(f)·Eᵀ and E·diag(1/f)·Eᵀ. */
  private rebuild(): void {
    const b = this.basis;
    for (let k = 0; k < 2; k++) {
      const m = k === 0 ? this.forwardMatrix : this.inverseMatrix;
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          let sum = 0;
          for (let a = 0; a < 3; a++) {
            const f = k === 0 ? this.current[a]! : 1 / this.current[a]!;
            sum += b[a * 3 + r]! * f * b[a * 3 + c]!;
          }
          m[c * 3 + r] = sum;
        }
      }
    }
  }

  private apply(
    m: Float64Array,
    p: ArrayLike<number>,
    out: Float64Array,
  ): Float64Array {
    const c = this.center;
    const x = p[0]! - c[0]!;
    const y = p[1]! - c[1]!;
    const z = p[2]! - c[2]!;
    out[0] = c[0]! + m[0]! * x + m[3]! * y + m[6]! * z;
    out[1] = c[1]! + m[1]! * x + m[4]! * y + m[7]! * z;
    out[2] = c[2]! + m[2]! * x + m[5]! * y + m[8]! * z;
    return out;
  }

  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array {
    this.apply(this.forwardMatrix, p, out);
    jacobian?.set(this.forwardMatrix);
    return out;
  }

  inverse = (q: ArrayLike<number>, out: Float64Array): Float64Array =>
    this.apply(this.inverseMatrix, q, out);
}

/**
 * An anisotropic scale about `point` (metres, in the parent frame; a
 * position on the body), along the local east, north and up there:
 * `q = point + E·diag(factors)·Eᵀ·(p − point)`. `factors` is one number or
 * three (east, north, up), each positive. Affine, so the Jacobian is the
 * matrix, constant, and the inverse is exact. A presentation warp unless
 * `presentation: false`; give `scale` for a slider.
 */
export function scaleAbout(
  point: ArrayLike<number>,
  factors: number | ArrayLike<number>,
  options: ScaleAboutOptions = {},
): ScaleAbout {
  return new ScaleAboutImpl(point, factors, options);
}

/** A blend of two warps; set `t` to move it. */
export interface BlendedWarp extends ChangeableWarp {
  /** The weight of the second warp, 0 for the first and 1 for the second: setting it calls `changed()`. */
  t: number;
  inverse(q: ArrayLike<number>, out: Float64Array): Float64Array;
}

class BlendedWarpImpl extends LiveWarp implements BlendedWarp {
  private weight: number;
  private readonly a: Warp;
  private readonly b: Warp;
  private readonly core: Warp;
  private readonly ja = new Float64Array(9);
  private readonly jb = new Float64Array(9);
  private readonly qa = new Float64Array(3);
  private readonly qb = new Float64Array(3);

  constructor(
    private readonly first: WarpSpec,
    private readonly second: WarpSpec,
    t: number,
  ) {
    super();
    this.weight = checkWeight(t);
    this.a = liveWarp(first);
    this.b = liveWarp(second);
    this.core = {
      from: NO_FRAME,
      to: NO_FRAME,
      presentation: this.presentation,
      revision: 1,
      forward: (p, out, jacobian) => this.forward(p, out, jacobian),
    };
  }

  get presentation(): boolean {
    return this.first.presentation || this.second.presentation;
  }

  override get revision(): number {
    return this.ownRevision + this.first.revision + this.second.revision;
  }

  get t(): number {
    return this.weight;
  }

  set t(value: number) {
    this.weight = checkWeight(value);
    this.changed();
  }

  get description(): string {
    const name = (w: WarpSpec) => w.description ?? "a warp";
    return `blend of ${name(this.first)} and ${name(this.second)}, ${this.weight} of the way to the second`;
  }

  /** The weighted sum of the two stated accuracies, which is what perfectly correlated errors give: never optimistic. */
  get accuracy(): Warp["accuracy"] {
    const a = this.first.accuracy;
    const b = this.second.accuracy;
    if (a === undefined && b === undefined) {
      return undefined;
    }
    const t = this.weight;
    const mix = (x: number | undefined, y: number | undefined) =>
      x === undefined && y === undefined
        ? undefined
        : (1 - t) * (x ?? 0) + t * (y ?? 0);
    const sigma = mix(a?.sigma, b?.sigma);
    const bound = mix(a?.bound, b?.bound);
    return {
      ...(sigma !== undefined && { sigma }),
      ...(bound !== undefined && { bound }),
      note: "the weighted sum of the two warps' stated accuracies",
    };
  }

  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array {
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    const at = [x, y, z];
    const t = this.weight;
    warpForward(this.a, at, this.qa, jacobian && this.ja);
    warpForward(this.b, at, this.qb, jacobian && this.jb);
    for (let i = 0; i < 3; i++) {
      out[i] = (1 - t) * this.qa[i]! + t * this.qb[i]!;
    }
    if (jacobian) {
      for (let i = 0; i < 9; i++) {
        jacobian[i] = (1 - t) * this.ja[i]! + t * this.jb[i]!;
      }
    }
    return out;
  }

  inverse = (q: ArrayLike<number>, out: Float64Array): Float64Array =>
    warpInverse(this.core, q, out as Float64Array<ArrayBuffer>);
}

function checkWeight(t: number): number {
  if (!(Number.isFinite(t) && t >= 0 && t <= 1)) {
    throw new RangeError(`blendWarps: t must be in [0, 1], got ${t}`);
  }
  return t;
}

/**
 * The warp that carries a point to `(1 − t)·a(p) + t·b(p)`: 0 is `a`, 1 is
 * `b`. Both go from one frame to one frame and each is taken at its own
 * `scale`. The Jacobian is the same blend of theirs, exact; the inverse is
 * the engine's Newton. A presentation warp when either is. Its revision
 * follows both, but a frame is only invalidated by its own `changed()`,
 * so call that after changing `a` or `b`. To fade one warp in from nothing,
 * give it a `scale` instead.
 */
export function blendWarps(a: WarpSpec, b: WarpSpec, t = 0.5): BlendedWarp {
  return new BlendedWarpImpl(a, b, t);
}
