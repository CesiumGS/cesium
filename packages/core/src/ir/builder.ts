// The builder: append-only, typed, hash-consed. It folds `const` operands
// (never literal slots), simplifies, drops dead equations and keys a program
// by its shape. A literal's identity is its slot, not its value: two slots
// never merge, and folding leaves them alone, so a value edit stays a
// uniform write.

import { COMMUTATIVE, OPS, applyValue, typeOf, typeOfValue } from "./ops.ts";
import {
  IR_VERSION,
  type Eqn,
  type Id,
  type Input,
  type Program,
  type Rate,
  type Type,
  type Value,
} from "./types.ts";

const valueKey = (v: Value | undefined): string =>
  v === undefined
    ? ""
    : typeof v === "number"
      ? Object.is(v, -0)
        ? "-0"
        : String(v)
      : JSON.stringify(v, (_k, x: unknown) =>
          typeof x === "number" && Object.is(x, -0) ? "-0" : x,
        );

function finite(v: Value): boolean {
  if (typeof v === "boolean") {
    return true;
  }
  return typeof v === "number" ? Number.isFinite(v) : v.every(Number.isFinite);
}

export class Builder {
  readonly inputs: Input[] = [];
  readonly eqns: Eqn[] = [];
  private readonly index = new Map<string, Id>();
  private readonly inputIds = new Map<string, Id>();
  private readonly slots = new Map<string, Id>();

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

  /** An input (declared once; asking again returns the same equation). */
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

  /** A structural number: folded freely. */
  const(value: Value): Id {
    return this.intern({
      op: "const",
      args: [],
      type: typeOfValue(value),
      value,
    });
  }

  /** An editable literal: never folded, hoisted to a uniform later. */
  literal(slot: string, value: Value): Id {
    const found = this.slots.get(slot);
    if (found !== undefined) {
      const e = this.eqns[found]!;
      if (valueKey(e.value) !== valueKey(value)) {
        throw new Error(`literal slot '${slot}' given two values`);
      }
      return found;
    }
    const id = this.intern({
      op: "literal",
      args: [],
      type: typeOfValue(value),
      value,
      slot,
    });
    this.slots.set(slot, id);
    return id;
  }

  typeOf(id: Id): Type {
    return this.eqns[id]!.type;
  }

  constOf(id: Id): Value | undefined {
    const e = this.eqns[id]!;
    return e.op === "const" ? e.value : undefined;
  }

  /** An equation of `op` on `args`; `index` is an extract's component. */
  op(op: string, args: readonly Id[], index?: number): Id {
    for (const a of args) {
      if (!Number.isInteger(a) || a < 0 || a >= this.eqns.length) {
        throw new RangeError(`${op}: operand ${a} isn't an equation`);
      }
    }
    if (op === "const" || op === "literal" || op === "input" || !OPS[op]) {
      throw new Error(`'${op}' isn't an op to apply`);
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

  // +0 only: x - (-0) is x + 0, which turns -0 into +0.
  private isPositiveZero(id: Id): boolean {
    const v = this.constOf(id);
    return (
      Object.is(v, 0) ||
      (Array.isArray(v) && v.every((x: number) => Object.is(x, 0)))
    );
  }

  private isOne(id: Id): boolean {
    const v = this.constOf(id);
    return v === 1 || (Array.isArray(v) && v.every((x) => x === 1));
  }

  // Only rewrites that hold for every float64 (NaN and infinity included),
  // except `x + 0`, which turns -0 into +0 (the plan names it).
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
        return this.isPositiveZero(c) ? a : undefined;
      case "math/mul":
        return this.isOne(a) ? c : this.isOne(c) ? a : undefined;
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
      } else if (e.op === "literal") {
        builder.slots.set(e.slot!, id);
      }
    }
    return builder;
  }
}

/**
 * The program's shape: its JSON without literal values. Two programs that
 * differ only in literal values share a key, so they share a shader module
 * and a pipeline.
 */
export function shapeKey(p: Program): string {
  return JSON.stringify({
    version: p.version,
    inputs: p.inputs,
    // A literal's value is replaced by its type; a const's is text.
    eqns: p.eqns.map((e) =>
      e.op === "literal" ? { ...e, value: e.type } : valueKeyed(e),
    ),
    outputs: p.outputs,
  });
}

// A constant's value as text, so the sign of zero is part of the key.
const valueKeyed = (e: Eqn): unknown =>
  e.value === undefined ? e : { ...e, value: valueKey(e.value) };
