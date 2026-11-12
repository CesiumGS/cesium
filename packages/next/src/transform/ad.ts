// Forward-mode differentiation on the IR. A tangent of every node, along one
// input (a position lane or a parameter), is built as new IR nodes: the
// "dual" part of a dual number, kept symbolic, so the result is a program
// like any other (evaluated in float64, run through intervals, or emitted as
// WGSL for normals and the compiler's bounds). A node that does not depend on
// the input has no tangent at all (zero), so the extra nodes stay few.
// J is three such passes (one per position lane: the 3 dual lanes); H is
// forward over forward: the tangent pass again, over J's nodes.

import { evaluate, type ParamValues } from "./evaluate.ts";
import { expandComposite, Ir, type IrProgram, type NodeId } from "./ir.ts";

/** What to differentiate along: a position lane (0, 1, 2) or a parameter's name. */
export type Wrt = number | string;

type Tangent = NodeId | null;

/**
 * The derivatives of `outputs` along `wrt`, as nodes of `ir`
 * (a zero derivative is the constant 0).
 */
export function differentiate(
  ir: Ir,
  outputs: readonly NodeId[],
  wrt: Wrt,
): NodeId[] {
  const memo = new Map<NodeId, Tangent>();
  const k = (v: number) => ir.constant(v);
  const op = (name: Parameters<Ir["op"]>[0], ...args: NodeId[]) =>
    ir.op(name, ...args);
  const mulT = (t: Tangent, x: NodeId): Tangent =>
    t === null ? null : op("mul", t, x);
  const addT = (a: Tangent, b: Tangent): Tangent =>
    a === null ? b : b === null ? a : op("add", a, b);
  const subT = (a: Tangent, b: Tangent): Tangent =>
    b === null ? a : a === null ? op("neg", b) : op("sub", a, b);
  const negT = (a: Tangent): Tangent => (a === null ? null : op("neg", a));
  const divT = (a: Tangent, x: NodeId): Tangent =>
    a === null ? null : op("div", a, x);
  const orZero = (t: Tangent) => t ?? k(0);

  const tangent = (id: NodeId): Tangent => {
    if (memo.has(id)) {
      return memo.get(id)!;
    }
    const result = rule(id);
    memo.set(id, result);
    return result;
  };

  const rule = (id: NodeId): Tangent => {
    const node = ir.nodes[id]!;
    const [a, b, c] = node.args;
    switch (node.op) {
      case "const":
        return null;
      case "pos":
        return wrt === node.value ? k(1) : null;
      case "param":
        return wrt === node.name ? k(1) : null;
      case "floor":
      case "ceil":
      case "sign":
      case "lt":
      case "le":
      case "gt":
      case "ge":
      case "eq":
      case "ne":
      case "and":
      case "or":
      case "not":
        return null;
      case "clamp":
      case "mix":
      case "smoothstep":
        return tangent(expandComposite(ir, node.op, node.args)!);
      case "select": {
        const tt = tangent(b!);
        const tf = tangent(c!);
        return tt === null && tf === null
          ? null
          : op("select", a!, orZero(tt), orZero(tf));
      }
      default:
        break;
    }
    const ta = tangent(a!);
    const tb = b === undefined ? null : tangent(b);
    switch (node.op) {
      case "neg":
        return negT(ta);
      case "fract":
        return ta;
      case "add":
        return addT(ta, tb);
      case "sub":
        return subT(ta, tb);
      case "mul":
        return addT(mulT(ta, b!), mulT(tb, a!));
      case "div":
        // d(a/b) = (da - (a/b) db) / b
        return divT(subT(ta, mulT(tb, id)), b!);
      case "abs":
        return mulT(ta, op("sign", a!));
      case "min":
      case "max":
        return ta === null && tb === null
          ? null
          : op(
              "select",
              op(node.op === "min" ? "le" : "ge", a!, b!),
              orZero(ta),
              orZero(tb),
            );
      case "sqrt":
        return divT(ta, op("mul", k(2), id));
      case "exp":
        return mulT(ta, id);
      case "log":
        return divT(ta, a!);
      case "sin":
        return mulT(ta, op("cos", a!));
      case "cos":
        return negT(mulT(ta, op("sin", a!)));
      case "tan":
        return mulT(ta, op("add", k(1), op("mul", id, id)));
      case "atan":
        return divT(ta, op("add", k(1), op("mul", a!, a!)));
      case "asin":
        return divT(ta, op("sqrt", op("sub", k(1), op("mul", a!, a!))));
      case "acos":
        return negT(divT(ta, op("sqrt", op("sub", k(1), op("mul", a!, a!)))));
      case "sinh":
        return mulT(ta, op("cosh", a!));
      case "cosh":
        return mulT(ta, op("sinh", a!));
      case "tanh":
        return mulT(ta, op("sub", k(1), op("mul", id, id)));
      case "atan2": {
        // atan2(y, x): (x dy - y dx) / (x^2 + y^2)
        const denominator = op("add", op("mul", a!, a!), op("mul", b!, b!));
        return divT(subT(mulT(ta, b!), mulT(tb, a!)), denominator);
      }
      case "pow": {
        // d(a^b) = b a^(b-1) da + a^b ln(a) db
        const viaBase =
          ta === null
            ? null
            : mulT(ta, op("mul", b!, op("pow", a!, op("sub", b!, k(1)))));
        const viaExponent =
          tb === null ? null : mulT(tb, op("mul", id, op("log", a!)));
        return addT(viaBase, viaExponent);
      }
      default:
        throw new Error(`differentiate: no rule for '${node.op}'`);
    }
  };

  return outputs.map((out) => orZero(tangent(out)));
}

/** J as a program of 9 outputs, row-major: `3 * i + j` is d out_i / d p_j. */
export function jacobianProgram(program: IrProgram): IrProgram {
  const ir = Ir.fromProgram(program);
  const columns = [0, 1, 2].map((j) => differentiate(ir, program.outputs, j));
  const outputs: NodeId[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      outputs.push(columns[j]![i]!);
    }
  }
  return ir.program(outputs);
}

/**
 * H as a program of 27 outputs: `9 * i + 3 * j + k` is d² out_i / d p_j d p_k.
 * Forward over forward: each of J's columns, differentiated again.
 */
export function hessianProgram(program: IrProgram): IrProgram {
  const ir = Ir.fromProgram(program);
  const columns = [0, 1, 2].map((j) => differentiate(ir, program.outputs, j));
  const outputs = new Array<NodeId>(27);
  for (let j = 0; j < 3; j++) {
    for (let k = j; k < 3; k++) {
      const second = differentiate(ir, columns[j]!, k);
      for (let i = 0; i < 3; i++) {
        outputs[9 * i + 3 * j + k] = second[i]!;
        outputs[9 * i + 3 * k + j] = second[i]!;
      }
    }
  }
  return ir.program(outputs);
}

/**
 * The derivatives along parameters as a program: for each name in order,
 * the 3 outputs' derivatives, so `3 * n + i` is d out_i / d names[n].
 */
export function parameterProgram(
  program: IrProgram,
  names: readonly string[],
): IrProgram {
  const ir = Ir.fromProgram(program);
  return ir.program(
    names.flatMap((name) => differentiate(ir, program.outputs, name)),
  );
}

const cache = new WeakMap<IrProgram, Map<string, IrProgram>>();

function derived(
  program: IrProgram,
  key: string,
  build: () => IrProgram,
): IrProgram {
  let byKey = cache.get(program);
  if (!byKey) {
    byKey = new Map();
    cache.set(program, byKey);
  }
  let result = byKey.get(key);
  if (!result) {
    result = build();
    byKey.set(key, result);
  }
  return result;
}

/** J at `p`, row-major (`3 * i + j`), in float64. */
export function jacobian(
  program: IrProgram,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return evaluate(
    derived(program, "J", () => jacobianProgram(program)),
    p,
    params,
  );
}

/** H at `p` (`9 * i + 3 * j + k`), in float64. */
export function hessian(
  program: IrProgram,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return evaluate(
    derived(program, "H", () => hessianProgram(program)),
    p,
    params,
  );
}

/** The derivatives along `names` at `p` (`3 * n + i`), in float64. */
export function parameterDerivatives(
  program: IrProgram,
  names: readonly string[],
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return evaluate(
    derived(program, `P:${names.join(",")}`, () =>
      parameterProgram(program, names),
    ),
    p,
    params,
  );
}
