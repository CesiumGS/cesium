// Front end 2: a restricted JS transform, through today's parser
// (`parseTransform`) to today's scalar IR, then op for op to this IR. The
// position is one float3 input `p` per vertex; parameters are uniforms.
// Constants written in the function stay constants (folded); a transform's
// knobs are its parameters.

import { parseTransform } from "../../src/transform/parse.ts";
import type { IrProgram } from "../../src/transform/ir.ts";
import { Builder, type Id, type Program } from "./cir.ts";

/** Today's op name to the vocabulary's (all one-to-one). */
export const TODAY_TO_CIR: Record<string, string> = {
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
  select: "math/select",
  clamp: "math/clamp",
  mix: "math/mix",
  smoothstep: "math/smoothStep",
  and: "math/and",
  or: "math/or",
  not: "math/not",
};

/** Today's IR to this one: booleans become bools, `ne` becomes not-eq. */
export function fromTodayIr(src: IrProgram): Program {
  const b = new Builder();
  const p = b.input("p", "float3", "vertex");
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
      default:
        ids[i] = b.op(TODAY_TO_CIR[n.op]!, a.map(asFloat));
    }
  });
  const outs = src.outputs.map((o) => asFloat(ids[o]!));
  const q = outs.length === 3 ? b.op("math/combine3", outs) : outs[0]!;
  return b.program({ q });
}

export function transformProgram(source: string): Program {
  return fromTodayIr(parseTransform(source));
}
