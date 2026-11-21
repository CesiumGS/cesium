// Scalarize: a program with every equation a scalar (`float`, `bool` or
// `int`), for the passes and emitters that work lane by lane (the residual
// and df64 forms). A vector equation becomes one equation per lane, in lane
// order, where it stood; a vector input stays one input, read lane by lane
// through `math/extract<n>`. Vector ops with no lane form of their own are
// written out: `dot` and `length` as sums of products, `cross` and
// `normalize` per lane. A vector output becomes one output per lane,
// `<name>.<lane>`.
//
// The equations keep their order, so an already-scalar program comes back
// with the same equations under the same ids. Nothing is folded or
// simplified: the result computes what the program does, lane by lane, in
// the same float64 operations (a sum from its first product, as `math/dot`
// is defined), except `length`: the evaluator takes it as `Math.hypot`, and
// its lanes are the spec's square root of the sum of squares, which can
// differ in the last bits.

import { COMMUTATIVE } from "./ops.ts";
import { width, type Eqn, type Id, type Program, type Value } from "./types.ts";

const isVector = (e: Eqn): boolean => width(e.type) > 1;

// A value as a key, with the sign of zero kept (JSON writes -0 as 0).
const valueKey = (v: Value | undefined): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    typeof x === "number" && Object.is(x, -0) ? "-0" : x,
  ) ?? "";

/** `p` with every equation a scalar; see the file's comment. */
export function scalarize(p: Program): Program {
  const eqns: Eqn[] = [];
  const index = new Map<string, Id>();
  const add = (e: Eqn): Id => {
    const args =
      COMMUTATIVE.has(e.op) && e.args[0]! > e.args[1]!
        ? [e.args[1]!, e.args[0]!]
        : e.args;
    const key = `${e.op}|${e.type}|${args.join(",")}|${valueKey(e.value)}|${e.slot ?? ""}|${e.index ?? ""}`;
    const found = index.get(key);
    if (found !== undefined) {
      return found;
    }
    eqns.push(args === e.args ? e : { ...e, args });
    index.set(key, eqns.length - 1);
    return eqns.length - 1;
  };
  const scalar = (op: string, args: readonly Id[], type = "float"): Id =>
    add({ op, args, type: type as Eqn["type"] });
  const sum = (terms: readonly Id[]): Id =>
    terms.slice(1).reduce((s, t) => scalar("math/add", [s, t]), terms[0]!);
  const dot = (a: readonly Id[], b: readonly Id[]): Id =>
    sum(a.map((x, i) => scalar("math/mul", [x, b[i]!])));

  // Each equation's lanes: one id for a scalar, `width` ids for a vector. A
  // vector input's lanes are extracts, made where they are first read.
  const lanes: Id[][] = [];
  const vectorInputs = new Map<Id, Id>();
  const lane = (x: Id, l: number): Id => {
    const input = vectorInputs.get(x);
    return input === undefined
      ? lanes[x]![l]!
      : add({
          op: `math/extract${width(p.eqns[x]!.type)}`,
          args: [input],
          type: "float",
          index: l,
        });
  };
  const all = (x: Id): Id[] =>
    Array.from({ length: width(p.eqns[x]!.type) }, (_, l) => lane(x, l));

  p.eqns.forEach((e, id) => {
    if (!isVector(e)) {
      if (e.op === "math/dot") {
        lanes[id] = [dot(all(e.args[0]!), all(e.args[1]!))];
      } else if (e.op === "math/length") {
        const v = all(e.args[0]!);
        lanes[id] = [scalar("math/sqrt", [dot(v, v)])];
      } else if (e.op.startsWith("math/extract")) {
        lanes[id] = [lane(e.args[0]!, e.index!)];
      } else {
        lanes[id] = [add({ ...e, args: e.args.map((x) => lane(x, 0)) })];
      }
      return;
    }
    const n = width(e.type);
    const each = (f: (l: number) => Id) =>
      (lanes[id] = Array.from({ length: n }, (_, l) => f(l)));
    switch (e.op) {
      case "input":
        // The input stays whole; its lanes are read by extract.
        vectorInputs.set(id, add(e));
        return;
      case "const":
      case "literal": {
        const v = e.value as readonly number[];
        each((l) =>
          add({
            op: e.op,
            args: [],
            type: "float",
            value: v[l]! as Value,
            ...(e.slot !== undefined && { slot: `${e.slot}.${l}` }),
          }),
        );
        return;
      }
      case "math/cross": {
        const [x, y] = [all(e.args[0]!), all(e.args[1]!)];
        const term = (i: number, j: number) =>
          scalar("math/sub", [
            scalar("math/mul", [x[i]!, y[j]!]),
            scalar("math/mul", [x[j]!, y[i]!]),
          ]);
        lanes[id] = [term(1, 2), term(2, 0), term(0, 1)];
        return;
      }
      case "math/normalize":
        throw new Error(
          "scalarize: math/normalize has no lane form yet (its zero-length case)",
        );
      case "math/select":
        each((l) =>
          scalar("math/select", [
            lane(e.args[0]!, 0),
            lane(e.args[1]!, l),
            lane(e.args[2]!, l),
          ]),
        );
        return;
      default:
        break;
    }
    if (e.op.startsWith("math/combine")) {
      lanes[id] = e.args.map((x) => lane(x, 0));
      return;
    }
    // Componentwise ops.
    each((l) =>
      scalar(
        e.op,
        e.args.map((x) => lane(x, l)),
      ),
    );
  });

  const outputs = p.outputs.flatMap((o) =>
    isVector(p.eqns[o.id]!)
      ? all(o.id).map((id, l) => ({ name: `${o.name}.${l}`, id }))
      : [{ name: o.name, id: lane(o.id, 0) }],
  );
  return prune({ version: p.version, inputs: p.inputs, eqns, outputs });
}

/** Only the equations the outputs reach, in order. */
function prune(p: Program): Program {
  const live = new Uint8Array(p.eqns.length);
  const stack = p.outputs.map((o) => o.id);
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (!live[id]) {
      live[id] = 1;
      stack.push(...p.eqns[id]!.args);
    }
  }
  if (live.every(Boolean)) {
    return p;
  }
  const remap = new Map<Id, Id>();
  const eqns: Eqn[] = [];
  p.eqns.forEach((e, id) => {
    if (live[id]) {
      remap.set(id, eqns.length);
      eqns.push({ ...e, args: e.args.map((a) => remap.get(a)!) });
    }
  });
  return {
    ...p,
    eqns,
    outputs: p.outputs.map((o) => ({ name: o.name, id: remap.get(o.id)! })),
  };
}
