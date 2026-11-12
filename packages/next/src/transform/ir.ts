// The transform graph's scalar IR (plan 2026-11-12, task 2): a DAG of float
// operations on the position `p` (three lanes), named scalar parameters and
// constants. Nodes are hash-consed (equal nodes are one node, so common
// subexpressions are shared) and constants are folded as they are built.
// Vector operations (dot, cross, length, normalize) lower to scalar ones, so
// evaluation, autodiff, intervals and code generation each handle one small
// op set. Booleans are 0/1 numbers; `select` takes a nonzero condition.

export type NodeId = number;

/** Each op with its operand count. */
const ARITY = {
  const: 0,
  pos: 0,
  param: 0,
  neg: 1,
  abs: 1,
  sqrt: 1,
  exp: 1,
  log: 1,
  sin: 1,
  cos: 1,
  tan: 1,
  atan: 1,
  asin: 1,
  acos: 1,
  sinh: 1,
  cosh: 1,
  tanh: 1,
  floor: 1,
  ceil: 1,
  fract: 1,
  sign: 1,
  not: 1,
  add: 2,
  sub: 2,
  mul: 2,
  div: 2,
  min: 2,
  max: 2,
  pow: 2,
  atan2: 2,
  lt: 2,
  le: 2,
  gt: 2,
  ge: 2,
  eq: 2,
  ne: 2,
  and: 2,
  or: 2,
  select: 3,
  clamp: 3,
  mix: 3,
  smoothstep: 3,
} as const;

/**
 * An operation. Operand order: `atan2(y, x)`, `pow(base, exponent)`,
 * `select(cond, ifTrue, ifFalse)`, `clamp(x, lo, hi)`, `mix(a, b, t)`,
 * `smoothstep(edge0, edge1, x)`.
 */
export type Op = keyof typeof ARITY;

export const OPS = Object.keys(ARITY) as readonly Op[];

export function arity(op: Op): number {
  return ARITY[op];
}

export interface IrNode {
  readonly op: Op;
  /** Operands: ids of earlier nodes. */
  readonly args: readonly NodeId[];
  /** `const`: the value. `pos`: the lane, 0 to 2. */
  readonly value: number;
  /** `param`: the parameter's name. */
  readonly name: string;
}

/** A finished DAG: nodes in dependency order, and the nodes that are its results. */
export interface IrProgram {
  readonly nodes: readonly IrNode[];
  readonly outputs: readonly NodeId[];
  /** The parameters the outputs read, in first-use order. */
  readonly params: readonly string[];
}

export type Vec3 = readonly [NodeId, NodeId, NodeId];

/** One op on numbers, in float64: constant folding and evaluation share it. */
export function applyOp(op: Op, a: number, b = 0, c = 0): number {
  switch (op) {
    case "neg":
      return -a;
    case "abs":
      return Math.abs(a);
    case "sqrt":
      return Math.sqrt(a);
    case "exp":
      return Math.exp(a);
    case "log":
      return Math.log(a);
    case "sin":
      return Math.sin(a);
    case "cos":
      return Math.cos(a);
    case "tan":
      return Math.tan(a);
    case "atan":
      return Math.atan(a);
    case "asin":
      return Math.asin(a);
    case "acos":
      return Math.acos(a);
    case "sinh":
      return Math.sinh(a);
    case "cosh":
      return Math.cosh(a);
    case "tanh":
      return Math.tanh(a);
    case "floor":
      return Math.floor(a);
    case "ceil":
      return Math.ceil(a);
    case "fract":
      return a - Math.floor(a);
    case "sign":
      return Math.sign(a);
    case "not":
      return a === 0 ? 1 : 0;
    case "add":
      return a + b;
    case "sub":
      return a - b;
    case "mul":
      return a * b;
    case "div":
      return a / b;
    case "min":
      return Math.min(a, b);
    case "max":
      return Math.max(a, b);
    case "pow":
      return Math.pow(a, b);
    case "atan2":
      return Math.atan2(a, b);
    case "lt":
      return a < b ? 1 : 0;
    case "le":
      return a <= b ? 1 : 0;
    case "gt":
      return a > b ? 1 : 0;
    case "ge":
      return a >= b ? 1 : 0;
    case "eq":
      return a === b ? 1 : 0;
    case "ne":
      return a !== b ? 1 : 0;
    case "and":
      return a !== 0 && b !== 0 ? 1 : 0;
    case "or":
      return a !== 0 || b !== 0 ? 1 : 0;
    case "select":
      return a !== 0 ? b : c;
    case "clamp":
      return Math.min(Math.max(a, b), c);
    case "mix":
      return a * (1 - c) + b * c;
    case "smoothstep": {
      const s = Math.min(Math.max((c - a) / (b - a), 0), 1);
      return s * s * (3 - 2 * s);
    }
    default:
      throw new Error(`applyOp: '${op}' has no operands`);
  }
}

const COMMUTATIVE: ReadonlySet<Op> = new Set([
  "add",
  "mul",
  "min",
  "max",
  "eq",
  "ne",
  "and",
  "or",
]);

function constKey(v: number): string {
  return Object.is(v, -0) ? "-0" : String(v);
}

/** The builder: append-only, hash-consed, folding constants. */
export class Ir {
  readonly nodes: IrNode[] = [];
  private readonly index = new Map<string, NodeId>();

  /** A builder holding `program`'s nodes under the same ids. */
  static fromProgram(program: IrProgram): Ir {
    const ir = new Ir();
    for (const node of program.nodes) {
      ir.intern(node);
    }
    return ir;
  }

  private intern(node: IrNode): NodeId {
    const key =
      node.op === "const"
        ? `c|${constKey(node.value)}`
        : `${node.op}|${node.args.join(",")}|${node.value}|${node.name}`;
    const found = this.index.get(key);
    if (found !== undefined) {
      return found;
    }
    this.nodes.push(node);
    this.index.set(key, this.nodes.length - 1);
    return this.nodes.length - 1;
  }

  constant(value: number): NodeId {
    return this.intern({ op: "const", args: [], value, name: "" });
  }

  /** The position's lane `axis` (0, 1 or 2: x, y or z). */
  pos(axis: number): NodeId {
    if (axis !== 0 && axis !== 1 && axis !== 2) {
      throw new RangeError(`pos axis must be 0, 1 or 2, got ${axis}`);
    }
    return this.intern({ op: "pos", args: [], value: axis, name: "" });
  }

  param(name: string): NodeId {
    return this.intern({ op: "param", args: [], value: 0, name });
  }

  /** The constant's value, or `undefined` if `id` is not a constant. */
  constOf(id: NodeId): number | undefined {
    const node = this.nodes[id];
    return node?.op === "const" ? node.value : undefined;
  }

  op(op: Op, ...args: NodeId[]): NodeId {
    if (ARITY[op] === 0 || args.length !== ARITY[op]) {
      throw new Error(
        `op '${op}' takes ${ARITY[op]} operands, got ${args.length}${
          ARITY[op] === 0 ? " (use constant, pos or param)" : ""
        }`,
      );
    }
    for (const arg of args) {
      if (!Number.isInteger(arg) || arg < 0 || arg >= this.nodes.length) {
        throw new RangeError(`op '${op}': operand ${arg} is not a node`);
      }
    }
    const consts = args.map((arg) => this.constOf(arg));
    if (consts.every((c) => c !== undefined)) {
      const value = applyOp(op, consts[0]!, consts[1], consts[2]);
      // A non-finite result is left to run time: it cannot be a WGSL literal.
      if (Number.isFinite(value)) {
        return this.constant(value);
      }
    }
    const simple = this.simplify(op, args);
    if (simple !== undefined) {
      return simple;
    }
    const ordered =
      COMMUTATIVE.has(op) && args[0]! > args[1]! ? [args[1]!, args[0]!] : args;
    return this.intern({ op, args: ordered, value: 0, name: "" });
  }

  private simplify(op: Op, args: readonly NodeId[]): NodeId | undefined {
    const [a, b, c] = args as [NodeId, NodeId, NodeId];
    const ca = this.constOf(a);
    const cb = this.constOf(b);
    switch (op) {
      case "add":
        return ca === 0 ? b : cb === 0 ? a : undefined;
      case "sub":
        return cb === 0 ? a : ca === 0 ? this.op("neg", b) : undefined;
      case "mul":
        return ca === 1 ? b : cb === 1 ? a : undefined;
      case "div":
        return cb === 1 ? a : undefined;
      case "neg": {
        const node = this.nodes[a]!;
        return node.op === "neg" ? node.args[0] : undefined;
      }
      case "pow":
        return cb === 1 ? a : cb === 0 ? this.constant(1) : undefined;
      case "min":
      case "max":
        return a === b ? a : undefined;
      case "select": {
        const cc = this.constOf(a);
        return cc !== undefined ? (cc !== 0 ? b : c) : b === c ? b : undefined;
      }
      default:
        return undefined;
    }
  }

  dot3(a: Vec3, b: Vec3): NodeId {
    let sum = this.op("mul", a[0], b[0]);
    for (let i = 1; i < 3; i++) {
      sum = this.op("add", sum, this.op("mul", a[i]!, b[i]!));
    }
    return sum;
  }

  cross3(a: Vec3, b: Vec3): Vec3 {
    const term = (i: number, j: number) =>
      this.op(
        "sub",
        this.op("mul", a[i]!, b[j]!),
        this.op("mul", a[j]!, b[i]!),
      );
    return [term(1, 2), term(2, 0), term(0, 1)];
  }

  length3(a: Vec3): NodeId {
    return this.op("sqrt", this.dot3(a, a));
  }

  normalize3(a: Vec3): Vec3 {
    const length = this.length3(a);
    return [
      this.op("div", a[0], length),
      this.op("div", a[1], length),
      this.op("div", a[2], length),
    ];
  }

  /** The program for `outputs`: only the nodes they reach, in the same order. */
  program(outputs: readonly NodeId[]): IrProgram {
    const live = new Uint8Array(this.nodes.length);
    const stack = [...outputs];
    for (const out of outputs) {
      if (!this.nodes[out]) {
        throw new RangeError(`output ${out} is not a node`);
      }
    }
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (live[id]) {
        continue;
      }
      live[id] = 1;
      stack.push(...this.nodes[id]!.args);
    }
    const remap = new Map<NodeId, NodeId>();
    const nodes: IrNode[] = [];
    const params: string[] = [];
    this.nodes.forEach((node, id) => {
      if (!live[id]) {
        return;
      }
      remap.set(id, nodes.length);
      if (node.op === "param" && !params.includes(node.name)) {
        params.push(node.name);
      }
      nodes.push({ ...node, args: node.args.map((arg) => remap.get(arg)!) });
    });
    return { nodes, outputs: outputs.map((out) => remap.get(out)!), params };
  }
}

/**
 * The primitive expression for `clamp`, `mix` or `smoothstep`, for passes
 * (autodiff) that differentiate the definition; `undefined` for other ops.
 */
export function expandComposite(
  ir: Ir,
  op: Op,
  args: readonly NodeId[],
): NodeId | undefined {
  const [a, b, c] = args as [NodeId, NodeId, NodeId];
  const k = (v: number) => ir.constant(v);
  switch (op) {
    case "clamp":
      return ir.op("min", ir.op("max", a, b), c);
    case "mix":
      return ir.op(
        "add",
        ir.op("mul", a, ir.op("sub", k(1), c)),
        ir.op("mul", b, c),
      );
    case "smoothstep": {
      const s = ir.op(
        "clamp",
        ir.op("div", ir.op("sub", c, a), ir.op("sub", b, a)),
        k(0),
        k(1),
      );
      return ir.op(
        "mul",
        ir.op("mul", s, s),
        ir.op("sub", k(3), ir.op("mul", k(2), s)),
      );
    }
    default:
      return undefined;
  }
}
