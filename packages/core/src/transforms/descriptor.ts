// What a built-in curvilinear transform is (plan 2026-11-12, task 3): a
// descriptor that carries the float64 TS function with its analytic
// Jacobian, the same function as restricted-JS text (so the compiler can
// use the IR, and a test checks the two agree), and which parameters enter
// linearly. A constructor turns a descriptor and parameter values into the
// `curvilinear` edge the graph takes.
import {
  curvilinear,
  type BoundRegion,
  type DeclaredBound,
  type Params,
  type CurvilinearEdge,
  type CurvilinearForward,
  type CurvilinearInverse,
} from "../transform/graph.ts";

/** One parameter: its starting value and the range it is valid in. */
export interface ParamSpec {
  readonly default: number;
  /** Inclusive lower bound of the valid range. */
  readonly min?: number;
  /** Inclusive upper bound of the valid range. */
  readonly max?: number;
  readonly description?: string;
  /** The range the parameter is expected to take (a slider's), inside or outside the valid range; the declared bounds hold over it as well as over the value a view has. */
  readonly expected?: readonly [number, number];
}

export type { BoundRegion, DeclaredBound } from "../transform/graph.ts";

/** The values each parameter takes, by name: [lowest, highest]. */
export type ParamRanges = Readonly<Record<string, readonly [number, number]>>;

export interface TransformDescriptor {
  /** What the transform is, in a route's `shapeKey`. */
  readonly id: string;
  /** The parameters by name, in the order the Slang parameter struct lists them. */
  readonly params: Readonly<Record<string, ParamSpec>>;
  /** Float64, writing the 3×3 Jacobian (column-major) when asked. */
  readonly forward: CurvilinearForward;
  /** The closed-form inverse; left out, a route solves by Newton. */
  readonly inverse?: CurvilinearInverse;
  /** The parameters the output is affine in (displacement ∝ parameter). */
  readonly separable: readonly string[];
  /** The separable parameters' values at which the function is the identity (`CurvilinearSpec.identity`). */
  readonly identity?: Readonly<Record<string, number>>;
  /**
   * A closed-form bound on the Jacobian over a parallelepiped (`BoundRegion`),
   * for every parameter value in `ranges` (the parameters' `expected` ranges
   * are already in them). Sound, not tight: selection composes these along a
   * route in place of sampling it (`scene/routeBounds.ts`). Left out, a
   * route through the transform is sampled.
   */
  readonly bound?: (region: BoundRegion, ranges: ParamRanges) => DeclaredBound;
  /** Which sides are geographic coordinates (`CurvilinearSpec.geographic`). */
  readonly geographic?: { readonly in?: boolean; readonly out?: boolean };
  /** `forward` as restricted-JS text: it parses with `parseTransform` to the same function. */
  readonly source: string;
  /** The entry point in `shaders/transforms.slang` that evaluates it with `fwd_diff`, when there is one. */
  readonly slang?: string;
}

/** A parameter record with these names, as a forward function reads it. */
export type Named<K extends string> = Readonly<Record<K, number>>;

/** The descriptor's starting parameter values. */
export function defaultParams(descriptor: TransformDescriptor): Params {
  const out: Record<string, number> = {};
  for (const [name, spec] of Object.entries(descriptor.params)) {
    out[name] = spec.default;
  }
  return out;
}

/** Throws a `RangeError` naming a parameter that is unknown, not finite, or out of its range. */
export function checkParams(
  descriptor: TransformDescriptor,
  values: Params,
): void {
  for (const [name, value] of Object.entries(values)) {
    const spec = descriptor.params[name];
    if (spec === undefined) {
      throw new RangeError(`${descriptor.id}: no parameter '${name}'`);
    }
    if (!Number.isFinite(value)) {
      throw new RangeError(
        `${descriptor.id}: '${name}' is ${value}; it must be finite`,
      );
    }
    if (
      (spec.min !== undefined && value < spec.min) ||
      (spec.max !== undefined && value > spec.max)
    ) {
      throw new RangeError(
        `${descriptor.id}: '${name}' is ${value}; it is valid from ${spec.min ?? "-∞"} to ${spec.max ?? "∞"}`,
      );
    }
  }
}

/** The `curvilinear` edge of a descriptor, with `values` over its defaults. */
export function edgeOf(
  descriptor: TransformDescriptor,
  values: Params = {},
): CurvilinearEdge {
  checkParams(descriptor, values);
  return curvilinear({
    id: descriptor.id,
    forward: descriptor.forward,
    ...(descriptor.inverse !== undefined && { inverse: descriptor.inverse }),
    params: { ...defaultParams(descriptor), ...values },
    source: descriptor.source,
    separable: descriptor.separable,
    ...(descriptor.identity !== undefined && { identity: descriptor.identity }),
    ...(descriptor.geographic !== undefined && {
      geographic: descriptor.geographic,
    }),
    ...(descriptor.bound !== undefined && {
      bound: (region, ranges) =>
        descriptor.bound!(region, withExpected(descriptor, ranges)),
    }),
  });
}

/** `{ prefixx, prefixy, prefixz }` from a vector. */
export function vec3Params(
  prefix: string,
  v: ArrayLike<number>,
): Record<string, number> {
  return {
    [`${prefix}x`]: v[0]!,
    [`${prefix}y`]: v[1]!,
    [`${prefix}z`]: v[2]!,
  };
}

/** The three components' specs, all starting at `v`. */
export function vec3Specs(
  prefix: string,
  v: ArrayLike<number>,
  description: string,
): Record<string, ParamSpec> {
  const out: Record<string, ParamSpec> = {};
  (["x", "y", "z"] as const).forEach((axis, i) => {
    out[`${prefix}${axis}`] = {
      default: v[i]!,
      description: `${description}, ${axis}`,
    };
  });
  return out;
}

/** `v` as a triple, throwing when it is zero or has a non-finite component. */
export function nonzero3(
  v: ArrayLike<number>,
  what: string,
): [number, number, number] {
  const length = Math.hypot(v[0]!, v[1]!, v[2]!);
  if (!(Number.isFinite(length) && length > 0)) {
    throw new RangeError(`${what} must be a finite, non-zero vector`);
  }
  return [v[0]!, v[1]!, v[2]!];
}

/** `ranges` widened to each parameter's `expected` range. */
function withExpected(
  descriptor: TransformDescriptor,
  ranges: ParamRanges,
): ParamRanges {
  const out: Record<string, readonly [number, number]> = {};
  for (const [name, spec] of Object.entries(descriptor.params)) {
    const own = ranges[name] ?? [spec.default, spec.default];
    out[name] = spec.expected
      ? [Math.min(own[0], spec.expected[0]), Math.max(own[1], spec.expected[1])]
      : own;
  }
  return out;
}
