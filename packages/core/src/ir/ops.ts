// The vocabulary: KHR_interactivity's math and type nodes, with its exact
// formulas. Each op's float64 meaning is one function (`applyValue`), which
// constant folding and the evaluator share. The float64 meaning is the
// conformant one; the GPU's is an approximation of it.

import { floatOf, isFloat, type Type, type Value } from "./types.ts";

type Kind =
  | "unary" // float_n -> float_n, componentwise
  | "binary" // (float_n, float_n) -> float_n, componentwise
  | "ternary" // (float_n, float_n, float_n) -> float_n, componentwise
  | "compare" // (float, float) -> bool
  | "logic" // bool... -> bool
  | "special";

interface OpDef {
  readonly kind: Kind;
  readonly arity: number;
  /** Componentwise float64 semantics (unary, binary, ternary, compare, logic). */
  readonly f?: (a: number, b: number, c: number) => number;
}

const u = (f: (a: number) => number): OpDef => ({
  kind: "unary",
  arity: 1,
  f: (a) => f(a),
});
const b = (f: (a: number, b: number) => number): OpDef => ({
  kind: "binary",
  arity: 2,
  f: (a, x) => f(a, x),
});
const cmp = (f: (a: number, b: number) => boolean): OpDef => ({
  kind: "compare",
  arity: 2,
  f: (a, x) => (f(a, x) ? 1 : 0),
});
const special = (arity: number): OpDef => ({ kind: "special", arity });

/** The op table: name, kind, arity and float64 meaning. */
export const OPS: Readonly<Record<string, OpDef>> = {
  // Leaves.
  const: special(0),
  literal: special(0),
  input: special(0),
  "math/abs": u(Math.abs),
  "math/sign": u(Math.sign),
  "math/trunc": u(Math.trunc),
  "math/floor": u(Math.floor),
  "math/ceil": u(Math.ceil),
  // Halves round away from zero (1.x's `round` is floor(x + 0.5)).
  "math/round": u((a) => Math.sign(a) * Math.round(Math.abs(a))),
  "math/fract": u((a) => a - Math.floor(a)),
  "math/neg": u((a) => -a),
  "math/saturate": u((a) => Math.min(Math.max(a, 0), 1)),
  "math/sqrt": u(Math.sqrt),
  "math/cbrt": u(Math.cbrt),
  "math/exp": u(Math.exp),
  "math/log": u(Math.log),
  "math/log2": u(Math.log2),
  "math/log10": u(Math.log10),
  "math/sin": u(Math.sin),
  "math/cos": u(Math.cos),
  "math/tan": u(Math.tan),
  "math/asin": u(Math.asin),
  "math/acos": u(Math.acos),
  "math/atan": u(Math.atan),
  "math/sinh": u(Math.sinh),
  "math/cosh": u(Math.cosh),
  "math/tanh": u(Math.tanh),
  "math/add": b((a, x) => a + x),
  "math/sub": b((a, x) => a - x),
  "math/mul": b((a, x) => a * x),
  "math/div": b((a, x) => a / x),
  // Truncated remainder, as JavaScript's `%` and WGSL's `%`.
  "math/rem": b((a, x) => a % x),
  "math/min": b(Math.min),
  "math/max": b(Math.max),
  "math/pow": b(Math.pow),
  "math/atan2": b(Math.atan2),
  // min(max(a, min(b, c)), max(b, c)): reversed bounds are allowed.
  "math/clamp": {
    kind: "ternary",
    arity: 3,
    f: (a, x, c) => Math.min(Math.max(a, Math.min(x, c)), Math.max(x, c)),
  },
  // (1 - c) a + c b, in that form (it decides the last bit).
  "math/mix": {
    kind: "ternary",
    arity: 3,
    f: (a, x, t) => (1 - t) * a + t * x,
  },
  // t = saturate((c - min(a, b)) / |b - a|), t² (3 - 2t): the ramp always rises.
  "math/smoothStep": {
    kind: "ternary",
    arity: 3,
    f: (a, x, c) => {
      const t = Math.min(
        Math.max((c - Math.min(a, x)) / Math.abs(x - a), 0),
        1,
      );
      return t * t * (3 - 2 * t);
    },
  },
  "math/eq": cmp((a, x) => a === x),
  "math/lt": cmp((a, x) => a < x),
  "math/le": cmp((a, x) => a <= x),
  "math/gt": cmp((a, x) => a > x),
  "math/ge": cmp((a, x) => a >= x),
  "math/and": { kind: "logic", arity: 2, f: (a, x) => (a && x ? 1 : 0) },
  "math/or": { kind: "logic", arity: 2, f: (a, x) => (a || x ? 1 : 0) },
  "math/not": { kind: "logic", arity: 1, f: (a) => (a ? 0 : 1) },
  "math/select": special(3),
  "math/length": special(1),
  "math/normalize": special(1),
  "math/dot": special(2),
  "math/cross": special(2),
  "math/combine2": special(2),
  "math/combine3": special(3),
  "math/combine4": special(4),
  "math/extract2": special(1),
  "math/extract3": special(1),
  "math/extract4": special(1),
  "type/boolToFloat": special(1),
  "type/intToFloat": special(1),
};

/** Ops whose operand order doesn't matter (for hash-consing). */
export const COMMUTATIVE: ReadonlySet<string> = new Set([
  "math/add",
  "math/mul",
  "math/min",
  "math/max",
  "math/eq",
  "math/and",
  "math/or",
  "math/dot",
]);

/** The result type of `op` on `args`, or an error naming what's wrong. */
export function typeOf(
  op: string,
  args: readonly Type[],
  index?: number,
): Type {
  const def = OPS[op];
  if (!def) {
    throw new Error(`unknown op '${op}'`);
  }
  if (args.length !== def.arity) {
    throw new Error(`${op} takes ${def.arity} operands, got ${args.length}`);
  }
  const same = () => {
    if (!args.every((t) => t === args[0]) || !isFloat(args[0]!)) {
      throw new Error(`${op} needs float operands of one type, got ${args}`);
    }
    return args[0]!;
  };
  switch (def.kind) {
    case "unary":
    case "binary":
    case "ternary":
      return same();
    case "compare":
      if (args[0] !== "float" || args[1] !== "float") {
        throw new Error(`${op} compares two floats, got ${args}`);
      }
      return "bool";
    case "logic":
      if (!args.every((t) => t === "bool")) {
        throw new Error(`${op} needs bools, got ${args}`);
      }
      return "bool";
    default:
      break;
  }
  switch (op) {
    case "math/select":
      if (args[0] !== "bool" || args[1] !== args[2]) {
        throw new Error(`math/select needs (bool, T, T), got ${args}`);
      }
      return args[1]!;
    case "math/length":
    case "math/dot":
      same();
      return "float";
    case "math/normalize":
      return same();
    case "math/cross":
      if (same() !== "float3") {
        throw new Error("math/cross needs float3");
      }
      return "float3";
    case "type/boolToFloat":
      if (args[0] !== "bool") {
        throw new Error("type/boolToFloat needs a bool");
      }
      return "float";
    case "type/intToFloat":
      if (args[0] !== "int") {
        throw new Error("type/intToFloat needs an int");
      }
      return "float";
    default:
      break;
  }
  const n = Number(op.at(-1));
  if (op.startsWith("math/combine")) {
    if (!args.every((t) => t === "float")) {
      throw new Error(`${op} needs floats`);
    }
    return floatOf(n);
  }
  if (op.startsWith("math/extract")) {
    if (args[0] !== floatOf(n) || index === undefined || index >= n) {
      throw new Error(`${op} needs a float${n} and a component below ${n}`);
    }
    return "float";
  }
  throw new Error(`no type rule for '${op}'`);
}

const lanes = (v: Value): readonly number[] =>
  typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : v;

const pack = (xs: number[]): Value => (xs.length === 1 ? xs[0]! : xs);

/** The type of a value, as a leaf's. */
export function typeOfValue(v: Value): Type {
  if (typeof v === "boolean") {
    return "bool";
  }
  return typeof v === "number" ? "float" : floatOf(v.length);
}

/** One op on values, in float64: folding and the evaluator share it. */
export function applyValue(
  op: string,
  args: readonly Value[],
  index?: number,
): Value {
  const def = OPS[op];
  if (!def) {
    throw new Error(`unknown op '${op}'`);
  }
  switch (def.kind) {
    case "unary":
    case "binary":
    case "ternary": {
      const ls = args.map(lanes);
      return pack(
        ls[0]!.map((x, i) => def.f!(x, ls[1]?.[i] ?? 0, ls[2]?.[i] ?? 0)),
      );
    }
    case "compare":
      return def.f!(args[0] as number, args[1] as number, 0) === 1;
    case "logic":
      return def.f!(args[0] ? 1 : 0, args[1] ? 1 : 0, 0) === 1;
    default:
      break;
  }
  const v = args.map(lanes);
  switch (op) {
    case "math/select":
      return args[0] ? args[1]! : args[2]!;
    case "math/length":
      return Math.hypot(...v[0]!);
    case "math/normalize": {
      // Length 0, infinite or NaN: zero components (the spec's isValid is false).
      const l = Math.hypot(...v[0]!);
      return pack(v[0]!.map((x) => (l > 0 && Number.isFinite(l) ? x / l : 0)));
    }
    case "math/dot": {
      // The spec's sum, a_x * b_x + a_y * b_y + ..., from the first product:
      // starting at +0 would turn a sum of -0 products into +0.
      const [x, y] = [v[0]!, v[1]!];
      return x.slice(1).reduce((s, xi, i) => s + xi * y[i + 1]!, x[0]! * y[0]!);
    }
    case "math/cross": {
      const [x, y] = [v[0]!, v[1]!];
      return [
        x[1]! * y[2]! - x[2]! * y[1]!,
        x[2]! * y[0]! - x[0]! * y[2]!,
        x[0]! * y[1]! - x[1]! * y[0]!,
      ];
    }
    case "type/boolToFloat":
      return args[0] ? 1 : 0;
    case "type/intToFloat":
      // "This operation MUST NOT produce negative zero."
      return (args[0] as number) + 0;
    default:
      break;
  }
  if (op.startsWith("math/combine")) {
    return v.map((x) => x[0]!);
  }
  if (op.startsWith("math/extract")) {
    return v[0]![index!]!;
  }
  throw new Error(`no float64 meaning for '${op}'`);
}
