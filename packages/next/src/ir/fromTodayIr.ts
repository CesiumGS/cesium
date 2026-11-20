// The adapter between today's transform IR (`src/transform/ir.ts`) and Cesium
// IR, and today's pass functions (`ad.ts`, `evaluate.ts`, `interval.ts`) run
// on Cesium IR's passes through it, so today's tests check Cesium IR's
// passes. It is temporary: CS-53 moves the transforms onto Cesium IR and
// removes this file. Keep it in this one file.
//
// src/ir imports nothing outside itself, so today's program is described
// here by its shape (`TodayProgram`), not imported.
//
// Today to Cesium IR: the position is one float3 input `p` per vertex; a
// parameter is a float uniform input; each output is a float output `o<i>`.
// Today's booleans are the numbers 0 and 1: a comparison becomes a `bool`, a
// number used as a condition becomes `x != 0`, and a bool used as a number
// becomes `type/boolToFloat`. `ne` becomes not-eq and `smoothstep` becomes
// `math/smoothStep`. Back again, each lane of a vector is one of today's
// nodes, and a bool is 0 or 1. Two meanings differ, as CS-53 states:
// KHR's `clamp` with reversed bounds and `smoothStep` with reversed edges.
// The passes here run on Cesium IR, so they follow KHR; today's form of a
// derived program is for reading its nodes, and its evaluation goes back to
// the Cesium IR program it came from.

import { Builder } from "./builder.ts";
import {
  derivativeName,
  hessianProgram as cirHessian,
  jacobianProgram as cirJacobian,
  parameterProgram as cirParameters,
} from "./ad.ts";
import { evaluate as cirEvaluate } from "./evaluate.ts";
import {
  evaluateInterval as cirInterval,
  type Interval,
  type Range,
} from "./interval.ts";
import { width, type Id, type Program, type Value } from "./types.ts";

/** One of today's nodes, by shape (`IrNode`). */
export interface TodayNode {
  readonly op: string;
  readonly args: readonly number[];
  readonly value: number;
  readonly name: string;
}

/** Today's program, by shape (`IrProgram`). */
export interface TodayProgram {
  readonly nodes: readonly TodayNode[];
  readonly outputs: readonly number[];
  readonly params: readonly string[];
}

/** Today's op name to KHR_interactivity's, where it maps one to one. */
export const TODAY_TO_CIR: Readonly<Record<string, string>> = {
  neg: "math/neg",
  abs: "math/abs",
  sqrt: "math/sqrt",
  exp: "math/exp",
  log: "math/log",
  sin: "math/sin",
  cos: "math/cos",
  tan: "math/tan",
  atan: "math/atan",
  asin: "math/asin",
  acos: "math/acos",
  sinh: "math/sinh",
  cosh: "math/cosh",
  tanh: "math/tanh",
  floor: "math/floor",
  ceil: "math/ceil",
  fract: "math/fract",
  sign: "math/sign",
  add: "math/add",
  sub: "math/sub",
  mul: "math/mul",
  div: "math/div",
  min: "math/min",
  max: "math/max",
  pow: "math/pow",
  atan2: "math/atan2",
  lt: "math/lt",
  le: "math/le",
  gt: "math/gt",
  ge: "math/ge",
  eq: "math/eq",
  and: "math/and",
  or: "math/or",
  not: "math/not",
  select: "math/select",
  clamp: "math/clamp",
  mix: "math/mix",
  smoothstep: "math/smoothStep",
};

const CIR_TO_TODAY: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(TODAY_TO_CIR).map(([today, cir]) => [cir, today]),
);

/** The name of today's output `i` in Cesium IR. */
export const outputName = (i: number): string => `o${i}`;

/** Today's program as Cesium IR (see the file's comment for the mapping). */
export function fromTodayIr(src: TodayProgram): Program {
  const b = new Builder();
  const p = b.input("p", "float3", "vertex");
  for (const name of src.params) {
    b.input(name, "float", "uniform");
  }
  const ids: Id[] = [];
  const asBool = (id: Id) =>
    b.typeOf(id) === "bool"
      ? id
      : b.op("math/not", [b.op("math/eq", [id, b.const(0)])]);
  const asFloat = (id: Id) =>
    b.typeOf(id) === "bool" ? b.op("type/boolToFloat", [id]) : id;
  src.nodes.forEach((n, i) => {
    const a = n.args.map((x) => ids[x]!);
    switch (n.op) {
      case "const":
        ids[i] = b.const(n.value);
        return;
      case "pos":
        ids[i] = b.op("math/extract3", [p], n.value);
        return;
      case "param":
        ids[i] = b.input(n.name, "float", "uniform");
        return;
      case "ne":
        ids[i] = b.op("math/not", [b.op("math/eq", a.map(asFloat))]);
        return;
      case "and":
      case "or":
      case "not":
        ids[i] = b.op(TODAY_TO_CIR[n.op]!, a.map(asBool));
        return;
      case "select":
        ids[i] = b.op("math/select", [
          asBool(a[0]!),
          asFloat(a[1]!),
          asFloat(a[2]!),
        ]);
        return;
      default: {
        const op = TODAY_TO_CIR[n.op];
        if (!op) {
          throw new Error(`fromTodayIr: no Cesium IR op for '${n.op}'`);
        }
        ids[i] = b.op(op, a.map(asFloat));
      }
    }
  });
  return b.program(
    Object.fromEntries(
      src.outputs.map((o, i) => [outputName(i), asFloat(ids[o]!)]),
    ),
  );
}

/**
 * A Cesium IR program back as today's: input `p` (float3) is the position,
 * float inputs are parameters, and the outputs' lanes, in order, are today's
 * outputs. Each vector lane is a node; a bool is 0 or 1.
 */
export function toTodayIr(p: Program): TodayProgram {
  const nodes: TodayNode[] = [];
  const index = new Map<string, number>();
  const node = (op: string, args: number[], value = 0, name = ""): number => {
    const key = `${op}|${args.join(",")}|${Object.is(value, -0) ? "-0" : value}|${name}`;
    const found = index.get(key);
    if (found !== undefined) {
      return found;
    }
    nodes.push({ op, args, value, name });
    index.set(key, nodes.length - 1);
    return nodes.length - 1;
  };
  const params: string[] = [];
  const lanes: number[][] = [];
  const k = (v: number) => node("const", [], v);
  const sum = (xs: number[]) =>
    xs.slice(1).reduce((s, x) => node("add", [s, x]), xs[0]!);
  p.eqns.forEach((e, id) => {
    const a = e.args.map((x) => lanes[x]!);
    const n = e.type === "bool" ? 1 : width(e.type);
    const each = (f: (i: number) => number) =>
      (lanes[id] = Array.from({ length: n }, (_, i) => f(i)));
    switch (e.op) {
      case "const":
      case "literal": {
        const v = e.value as Value;
        lanes[id] =
          typeof v === "boolean"
            ? [k(v ? 1 : 0)]
            : typeof v === "number"
              ? [k(v)]
              : v.map(k);
        return;
      }
      case "input": {
        const input = p.inputs[e.index!]!;
        if (input.name === "p" && input.type === "float3") {
          lanes[id] = [0, 1, 2].map((i) => node("pos", [], i));
        } else if (input.type === "float") {
          if (!params.includes(input.name)) {
            params.push(input.name);
          }
          lanes[id] = [node("param", [], 0, input.name)];
        } else {
          throw new Error(`toTodayIr: input '${input.name}' has no today form`);
        }
        return;
      }
      case "type/boolToFloat":
        lanes[id] = a[0]!;
        return;
      case "math/select":
        each((i) => node("select", [a[0]![0]!, a[1]![i]!, a[2]![i]!]));
        return;
      case "math/dot":
        lanes[id] = [sum(a[0]!.map((x, i) => node("mul", [x, a[1]![i]!])))];
        return;
      case "math/length":
        lanes[id] = [
          node("sqrt", [sum(a[0]!.map((x) => node("mul", [x, x])))]),
        ];
        return;
      case "math/cross": {
        const [x, y] = [a[0]!, a[1]!];
        const t = (i: number, j: number) =>
          node("sub", [
            node("mul", [x[i]!, y[j]!]),
            node("mul", [x[j]!, y[i]!]),
          ]);
        lanes[id] = [t(1, 2), t(2, 0), t(0, 1)];
        return;
      }
      case "math/saturate":
        each((i) => node("clamp", [a[0]![i]!, k(0), k(1)]));
        return;
      default:
        break;
    }
    if (e.op.startsWith("math/combine")) {
      lanes[id] = a.map((x) => x[0]!);
      return;
    }
    if (e.op.startsWith("math/extract")) {
      lanes[id] = [a[0]![e.index!]!];
      return;
    }
    const op = CIR_TO_TODAY[e.op];
    if (!op) {
      throw new Error(`toTodayIr: no today op for '${e.op}'`);
    }
    // Comparisons and logic take scalars; the rest are componentwise.
    each((i) =>
      node(
        op,
        a.map((x) => x[x.length === 1 ? 0 : i]!),
      ),
    );
  });
  // Only the nodes the outputs reach, renumbered in order.
  const outs = p.outputs.flatMap((o) => lanes[o.id]!);
  const live = new Uint8Array(nodes.length);
  const stack = [...outs];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (!live[id]) {
      live[id] = 1;
      stack.push(...nodes[id]!.args);
    }
  }
  const remap = new Map<number, number>();
  const kept: TodayNode[] = [];
  nodes.forEach((n, id) => {
    if (live[id]) {
      remap.set(id, kept.length);
      kept.push({ ...n, args: n.args.map((x) => remap.get(x)!) });
    }
  });
  const used = params.filter((name) =>
    kept.some((n) => n.op === "param" && n.name === name),
  );
  return {
    nodes: kept,
    outputs: outs.map((o) => remap.get(o)!),
    params: used,
  };
}

// --- Today's pass functions, on Cesium IR -----------------------------------

/** Each program's Cesium IR: a converted one, or the one a derived program came from. */
const cir = new WeakMap<TodayProgram, Program>();

/** Cesium IR for `src`, converted once. */
export function cirOf(src: TodayProgram): Program {
  let found = cir.get(src);
  if (!found) {
    found = fromTodayIr(src);
    cir.set(src, found);
  }
  return found;
}

/** Today's form of a derived Cesium IR program, whose passes stay on the Cesium IR program. */
function derivedToday(p: Program): TodayProgram {
  const today = toTodayIr(p);
  cir.set(today, p);
  return today;
}

const outputNames = (src: TodayProgram) =>
  src.outputs.map((_, i) => outputName(i));

/** Today's `jacobianProgram`: 9 outputs, row-major, `3 i + j` is ∂out_i/∂p_j. */
export function jacobianProgram(src: TodayProgram): TodayProgram {
  const p = cirOf(src);
  const names = outputNames(src);
  const j = cirJacobian(p, "p", names);
  const b = Builder.from(j);
  const out: Record<string, Id> = {};
  names.forEach((name, i) => {
    for (let c = 0; c < 3; c++) {
      out[`e${3 * i + c}`] = idOf(
        j,
        derivativeName(name, { input: "p", lane: c }),
      );
    }
  });
  return derivedToday(b.program(out));
}

/** Today's `hessianProgram`: 27 outputs, `9 i + 3 j + k`. */
export function hessianProgram(src: TodayProgram): TodayProgram {
  const p = cirOf(src);
  const names = outputNames(src);
  const h = cirHessian(p, "p", names);
  const b = Builder.from(h);
  const out: Record<string, Id> = {};
  names.forEach((name, i) => {
    for (let j = 0; j < 3; j++) {
      for (let m = 0; m < 3; m++) {
        out[`e${9 * i + 3 * j + m}`] = idOf(
          h,
          derivativeName(
            name,
            { input: "p", lane: j },
            { input: "p", lane: m },
          ),
        );
      }
    }
  });
  return derivedToday(b.program(out));
}

/** Today's `parameterProgram`: `3 n + i` is ∂out_i/∂names[n]. */
export function parameterProgram(
  src: TodayProgram,
  names: readonly string[],
): TodayProgram {
  const p = cirOf(src);
  const outs = outputNames(src);
  // A name the program doesn't read has zero derivatives.
  const known = names.filter((n) => p.inputs.some((i) => i.name === n));
  const d = cirParameters(p, known, outs);
  const b = Builder.from(d);
  const zero = b.const(0);
  const out: Record<string, Id> = {};
  names.forEach((name, n) => {
    outs.forEach((o, i) => {
      out[`e${3 * n + i}`] = known.includes(name)
        ? idOf(d, derivativeName(o, { input: name }))
        : zero;
    });
  });
  return derivedToday(b.program(out));
}

function idOf(p: Program, name: string): Id {
  const o = p.outputs.find((x) => x.name === name);
  if (!o) {
    throw new Error(`no output '${name}'`);
  }
  return o.id;
}

/** The inputs an equation reads (a derived program keeps every input declared). */
const read = (p: Program) =>
  p.eqns.flatMap((e) => (e.op === "input" ? [p.inputs[e.index!]!] : []));

/** Today's `evaluate`: the outputs at `p`, in float64, on Cesium IR's evaluator. */
export function evaluate(
  src: TodayProgram,
  p: ArrayLike<number>,
  params: Readonly<Record<string, number>> = {},
): number[] {
  const program = cirOf(src);
  const inputs: Record<string, Value> = { p: [p[0]!, p[1]!, p[2]!] };
  for (const input of read(program)) {
    if (input.name === "p") {
      continue;
    }
    const v = params[input.name];
    if (v === undefined) {
      throw new Error(`parameter '${input.name}' has no value`);
    }
    inputs[input.name] = v;
  }
  const values = cirEvaluate(program, inputs);
  return program.outputs.map((o) => values[o.name] as number);
}

/** Today's `ParamRange`. */
export type TodayRange = number | readonly [number, number] | Interval;

/** Today's `evaluateInterval`: bounds of each output, on Cesium IR's interval pass. */
export function evaluateInterval(
  src: TodayProgram,
  box: { readonly min: ArrayLike<number>; readonly max: ArrayLike<number> },
  params: Readonly<Record<string, TodayRange>> = {},
): Interval[] {
  const program = cirOf(src);
  const ranges: Record<string, Range> = {
    p: [0, 1, 2].map((i) => ({ lo: box.min[i]!, hi: box.max[i]! })),
  };
  for (const input of read(program)) {
    if (input.name === "p") {
      continue;
    }
    const r = params[input.name];
    if (r === undefined) {
      throw new Error(`parameter '${input.name}' has no range`);
    }
    ranges[input.name] =
      typeof r === "number"
        ? r
        : Array.isArray(r)
          ? { lo: r[0]!, hi: r[1]! }
          : (r as Interval);
  }
  const bounds = cirInterval(program, ranges);
  return program.outputs.map((o) => bounds[o.name]![0]!);
}

const derived = new WeakMap<TodayProgram, Map<string, TodayProgram>>();

function cached(
  src: TodayProgram,
  key: string,
  build: () => TodayProgram,
): TodayProgram {
  let byKey = derived.get(src);
  if (!byKey) {
    byKey = new Map();
    derived.set(src, byKey);
  }
  let found = byKey.get(key);
  if (!found) {
    found = build();
    byKey.set(key, found);
  }
  return found;
}

/** Today's `jacobian`: J at `p`, row-major. */
export function jacobian(
  src: TodayProgram,
  p: ArrayLike<number>,
  params: Readonly<Record<string, number>> = {},
): number[] {
  return evaluate(
    cached(src, "J", () => jacobianProgram(src)),
    p,
    params,
  );
}

/** Today's `hessian`: H at `p`. */
export function hessian(
  src: TodayProgram,
  p: ArrayLike<number>,
  params: Readonly<Record<string, number>> = {},
): number[] {
  return evaluate(
    cached(src, "H", () => hessianProgram(src)),
    p,
    params,
  );
}

/** Today's `parameterDerivatives`: `3 n + i`. */
export function parameterDerivatives(
  src: TodayProgram,
  names: readonly string[],
  p: ArrayLike<number>,
  params: Readonly<Record<string, number>> = {},
): number[] {
  return evaluate(
    cached(src, `P:${names.join(",")}`, () => parameterProgram(src, names)),
    p,
    params,
  );
}
