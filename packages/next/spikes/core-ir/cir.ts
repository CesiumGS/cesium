// Spike (a): a minimal core IR, jaxpr-like. A program is a list of typed,
// single-assignment equations (`eqns`), each an op of a standard vocabulary
// applied to earlier equations' values. Inputs carry a rate (uniform, per
// feature, per vertex, per fragment). Literals a person can edit are
// `literal` equations with a slot (their place in the source), so hoisting
// them to uniforms keeps a program's shape when a value changes; `const` is
// for structural numbers (folded freely). Equal equations are one equation
// (hash-consing), and constants fold as they're built.
//
// Op names and semantics are borrowed one-to-one from glTF KHR_interactivity's
// math nodes (ratified 2026-08-30): `math/add`, `math/select`, ..., with its
// type names (`float` is float64 there, as here). Ops it lacks would live
// under `cesium/` and be listed in `EXTENSION_OPS` (none are needed for the
// four spike inputs). Every pass (evaluation,
// autodiff, intervals, rates, hoisting, the emitters) is an interpretation
// of this one structure, as in JAX.

export const IR_VERSION = "cesium-ir/0.1";
export const VOCABULARY = "KHR_interactivity";

export type Type = "bool" | "int" | "float" | "float2" | "float3" | "float4";
export type Rate = "uniform" | "feature" | "vertex" | "fragment";
export const RATES: readonly Rate[] = [
  "uniform",
  "feature",
  "vertex",
  "fragment",
];

export type Id = number;

export interface Input {
  readonly name: string;
  readonly type: Type;
  readonly rate: Rate;
}

/** A literal's value: a number, a vector, or a boolean. */
export type Value = number | readonly number[] | boolean;

export interface Eqn {
  readonly op: string;
  readonly args: readonly Id[];
  readonly type: Type;
  /**
   * `const`: its value. `literal`: its value, and `slot` names it.
   * `input`: the input's index. `math/extract*`: the component.
   */
  readonly value?: Value;
  readonly slot?: string;
  readonly index?: number;
}

export interface Program {
  readonly version: string;
  readonly inputs: readonly Input[];
  readonly eqns: readonly Eqn[];
  readonly outputs: readonly { readonly name: string; readonly id: Id }[];
}

export function width(type: Type): number {
  switch (type) {
    case "float2":
      return 2;
    case "float3":
      return 3;
    case "float4":
      return 4;
    default:
      return 1;
  }
}

export function floatOf(n: number): Type {
  const t = (["float", "float2", "float3", "float4"] as const)[n - 1];
  if (!t) {
    throw new Error(`no float type of width ${n}`);
  }
  return t;
}

export const isFloat = (t: Type): boolean => t.startsWith("float");

// ---------------------------------------------------------------- ops

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

/** The op table: name, kind, arity and float64 meaning. */
export const OPS: Readonly<Record<string, OpDef>> = {
  // Leaves.
  const: { kind: "special", arity: 0 },
  literal: { kind: "special", arity: 0 },
  input: { kind: "special", arity: 0 },
  // KHR_interactivity math, componentwise.
  "math/abs": u(Math.abs),
  "math/sign": u(Math.sign),
  "math/trunc": u(Math.trunc),
  "math/floor": u(Math.floor),
  "math/ceil": u(Math.ceil),
  // KHR's round is half away from zero; 1.x's `round` is floor(x + 0.5).
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
  // KHR: min(max(a, min(b, c)), max(b, c)); reversed bounds are allowed.
  "math/clamp": {
    kind: "ternary",
    arity: 3,
    f: (a, b, c) => Math.min(Math.max(a, Math.min(b, c)), Math.max(b, c)),
  },
  // KHR: (1 - c) a + c b, in that form (it decides the last bit).
  "math/mix": {
    kind: "ternary",
    arity: 3,
    f: (a, x, t) => (1 - t) * a + t * x,
  },
  "math/eq": cmp((a, x) => a === x),
  "math/lt": cmp((a, x) => a < x),
  "math/le": cmp((a, x) => a <= x),
  "math/gt": cmp((a, x) => a > x),
  "math/ge": cmp((a, x) => a >= x),
  "math/and": { kind: "logic", arity: 2, f: (a, x) => (a && x ? 1 : 0) },
  "math/or": { kind: "logic", arity: 2, f: (a, x) => (a || x ? 1 : 0) },
  "math/not": { kind: "logic", arity: 1, f: (a) => (a ? 0 : 1) },
  "math/select": { kind: "special", arity: 3 },
  "math/length": { kind: "special", arity: 1 },
  "math/normalize": { kind: "special", arity: 1 },
  "math/dot": { kind: "special", arity: 2 },
  "math/cross": { kind: "special", arity: 2 },
  "math/combine2": { kind: "special", arity: 2 },
  "math/combine3": { kind: "special", arity: 3 },
  "math/combine4": { kind: "special", arity: 4 },
  "math/extract2": { kind: "special", arity: 1 },
  "math/extract3": { kind: "special", arity: 1 },
  "math/extract4": { kind: "special", arity: 1 },
  "type/boolToFloat": { kind: "special", arity: 1 },
  // KHR: t = saturate((c - min(a, b)) / |b - a|), t² (3 - 2t): the ramp
  // always rises, whichever edge is larger (GLSL's is undefined there).
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
};

export const EXTENSION_OPS = Object.keys(OPS).filter((k) =>
  k.startsWith("cesium/"),
);

const COMMUTATIVE = new Set([
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
      same();
      return "float";
    case "math/normalize":
      return same();
    case "math/dot":
      same();
      return "float";
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

// ---------------------------------------------------------------- builder

const valueKey = (v: Value | undefined): string =>
  v === undefined
    ? ""
    : typeof v === "number"
      ? Object.is(v, -0)
        ? "-0"
        : String(v)
      : JSON.stringify(v);

/** Append-only builder: typed, hash-consed, folding constants. */
export class Builder {
  readonly inputs: Input[] = [];
  readonly eqns: Eqn[] = [];
  private readonly index = new Map<string, Id>();
  private readonly inputIds = new Map<string, Id>();

  private intern(e: Eqn): Id {
    const key = `${e.op}|${e.type}|${e.args.join(",")}|${valueKey(e.value)}|${e.slot ?? ""}|${e.index ?? ""}`;
    const found = this.index.get(key);
    if (found !== undefined) {
      return found;
    }
    this.eqns.push(e);
    this.index.set(key, this.eqns.length - 1);
    return this.eqns.length - 1;
  }

  input(name: string, type: Type, rate: Rate): Id {
    const found = this.inputIds.get(name);
    if (found !== undefined) {
      const declared = this.inputs[this.eqns[found]!.index!]!;
      if (declared.type !== type || declared.rate !== rate) {
        throw new Error(`input '${name}' declared twice, differently`);
      }
      return found;
    }
    this.inputs.push({ name, type, rate });
    const id = this.intern({
      op: "input",
      args: [],
      type,
      index: this.inputs.length - 1,
    });
    this.inputIds.set(name, id);
    return id;
  }

  const(value: Value): Id {
    return this.intern({
      op: "const",
      args: [],
      type: typeOfValue(value),
      value,
    });
  }

  /** An editable literal: kept (not folded), hoisted to a uniform later. */
  literal(slot: string, value: Value): Id {
    return this.intern({
      op: "literal",
      args: [],
      type: typeOfValue(value),
      value,
      slot,
    });
  }

  typeOf(id: Id): Type {
    return this.eqns[id]!.type;
  }

  constOf(id: Id): Value | undefined {
    const e = this.eqns[id]!;
    return e.op === "const" ? e.value : undefined;
  }

  op(op: string, args: readonly Id[], index?: number): Id {
    for (const a of args) {
      if (!Number.isInteger(a) || a < 0 || a >= this.eqns.length) {
        throw new RangeError(`${op}: operand ${a} isn't an equation`);
      }
    }
    const type = typeOf(
      op,
      args.map((a) => this.typeOf(a)),
      index,
    );
    const consts = args.map((a) => this.constOf(a));
    if (consts.every((c) => c !== undefined)) {
      const v = applyValue(op, consts as Value[], index);
      if (finite(v)) {
        return this.const(v);
      }
    }
    const simple = this.simplify(op, args, index);
    if (simple !== undefined) {
      return simple;
    }
    const ordered =
      COMMUTATIVE.has(op) && args[0]! > args[1]! ? [args[1]!, args[0]!] : args;
    return this.intern(
      index === undefined
        ? { op, args: ordered, type }
        : { op, args: ordered, type, index },
    );
  }

  private isZero(id: Id): boolean {
    const v = this.constOf(id);
    return v === 0 || (Array.isArray(v) && v.every((x) => x === 0));
  }

  private isOne(id: Id): boolean {
    const v = this.constOf(id);
    return v === 1 || (Array.isArray(v) && v.every((x) => x === 1));
  }

  private simplify(
    op: string,
    args: readonly Id[],
    index?: number,
  ): Id | undefined {
    const [a, c] = args as [Id, Id];
    switch (op) {
      case "math/add":
        return this.isZero(a) ? c : this.isZero(c) ? a : undefined;
      case "math/sub":
        return this.isZero(c)
          ? a
          : this.isZero(a)
            ? this.op("math/neg", [c])
            : undefined;
      case "math/mul":
        return this.isOne(a)
          ? c
          : this.isOne(c)
            ? a
            : this.isZero(a)
              ? a
              : this.isZero(c)
                ? c
                : undefined;
      case "math/div":
        return this.isOne(c) ? a : undefined;
      case "math/neg": {
        const e = this.eqns[a]!;
        return e.op === "math/neg" ? e.args[0] : undefined;
      }
      case "math/select": {
        const cond = this.constOf(a);
        return cond !== undefined
          ? cond
            ? args[1]
            : args[2]
          : args[1] === args[2]
            ? args[1]
            : undefined;
      }
      default:
        // extractN(combineN(...)) is that operand.
        if (op.startsWith("math/extract") && index !== undefined) {
          const e = this.eqns[a]!;
          return e.op === `math/combine${op.at(-1)}`
            ? e.args[index]
            : undefined;
        }
        return undefined;
    }
  }

  /** `x` as a float vector of width `n` (KHR has no splat: a combine). */
  splat(x: Id, n: number): Id {
    return n === 1 ? x : this.op(`math/combine${n}`, Array(n).fill(x));
  }

  /** The program for `outputs`: only the equations they reach, in order. */
  program(outputs: Record<string, Id>): Program {
    const live = new Uint8Array(this.eqns.length);
    const stack = Object.values(outputs);
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (!live[id]) {
        live[id] = 1;
        stack.push(...this.eqns[id]!.args);
      }
    }
    const remap = new Map<Id, Id>();
    const eqns: Eqn[] = [];
    this.eqns.forEach((e, id) => {
      if (live[id]) {
        remap.set(id, eqns.length);
        eqns.push({ ...e, args: e.args.map((a) => remap.get(a)!) });
      }
    });
    return {
      version: IR_VERSION,
      inputs: [...this.inputs],
      eqns,
      outputs: Object.entries(outputs).map(([name, id]) => ({
        name,
        id: remap.get(id)!,
      })),
    };
  }

  /** A builder holding `p`'s equations under the same ids. */
  static from(p: Program): Builder {
    const builder = new Builder();
    builder.inputs.push(...p.inputs);
    for (const e of p.eqns) {
      const id = builder.intern(e);
      if (e.op === "input") {
        builder.inputIds.set(p.inputs[e.index!]!.name, id);
      }
    }
    return builder;
  }
}

function typeOfValue(v: Value): Type {
  if (typeof v === "boolean") {
    return "bool";
  }
  return typeof v === "number" ? "float" : floatOf(v.length);
}

function finite(v: Value): boolean {
  if (typeof v === "boolean") {
    return true;
  }
  return typeof v === "number" ? Number.isFinite(v) : v.every(Number.isFinite);
}

// ---------------------------------------------------------------- float64 semantics

const lanes = (v: Value): readonly number[] =>
  typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : v;

const pack = (xs: number[]): Value => (xs.length === 1 ? xs[0]! : xs);

/** One op on values, in float64: folding and the evaluator share it. */
export function applyValue(
  op: string,
  args: readonly Value[],
  index?: number,
): Value {
  const def = OPS[op]!;
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
  const dot = (x: readonly number[], y: readonly number[]) =>
    x.reduce((s, xi, i) => s + xi * y[i]!, 0);
  switch (op) {
    case "math/select":
      return args[0] ? args[1]! : args[2]!;
    case "math/length":
      return Math.hypot(...v[0]!);
    case "math/normalize": {
      const l = Math.hypot(...v[0]!);
      return pack(v[0]!.map((x) => x / l));
    }
    case "math/dot":
      return dot(v[0]!, v[1]!);
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

/** The outputs of `p` for `inputs` (by name), in float64. */
export function evaluate(
  p: Program,
  inputs: Readonly<Record<string, Value>>,
): Record<string, Value> {
  const values: Value[] = new Array(p.eqns.length);
  p.eqns.forEach((e, id) => {
    switch (e.op) {
      case "const":
      case "literal":
        values[id] = e.value!;
        break;
      case "input": {
        const name = p.inputs[e.index!]!.name;
        const v = inputs[name];
        if (v === undefined) {
          throw new Error(`input '${name}' has no value`);
        }
        values[id] = v;
        break;
      }
      default:
        values[id] = applyValue(
          e.op,
          e.args.map((a) => values[a]!),
          e.index,
        );
    }
  });
  return Object.fromEntries(p.outputs.map((o) => [o.name, values[o.id]!]));
}

// ---------------------------------------------------------------- text form

/** A jaxpr-style listing, for reading and for diffs. */
export function print(p: Program): string {
  const name = (id: Id) => `v${id}`;
  const lines = p.eqns.map((e, id) => {
    const rhs =
      e.op === "input"
        ? `input ${p.inputs[e.index!]!.name} @${p.inputs[e.index!]!.rate}`
        : e.op === "const"
          ? JSON.stringify(e.value)
          : e.op === "literal"
            ? `literal[${e.slot}] ${JSON.stringify(e.value)}`
            : `${e.op}${e.index !== undefined ? `[${e.index}]` : ""} ${e.args.map(name).join(" ")}`;
    return `  ${name(id)}:${e.type} = ${rhs}`;
  });
  const outs = p.outputs.map((o) => `${o.name}=${name(o.id)}`).join(", ");
  return `{ ${p.version}\n${lines.join("\n")}\n  in (${outs}) }`;
}
