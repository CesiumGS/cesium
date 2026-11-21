// A transform's program on Cesium IR: input `p` (float3, per vertex) is the
// position, each float uniform input is a parameter, and the outputs, in
// order, are its values (three for a map, nine for J, 27 for H). The
// emitters (`wgsl.ts`, `residual.ts`, `df64Wgsl.ts`) read it scalarized:
// each lane of `p` through `math/extract3`, and a boolean as the float 0 or
// 1, so `type/boolToFloat` is the same value as its operand.

import type { Builder } from "../ir/builder.ts";
import type { Id, Program } from "../ir/types.ts";

/** The position's input. */
export const POSITION = "p";

/** The parameters the program reads, in the order it first reads them. */
export function paramsOf(p: Program): string[] {
  const names: string[] = [];
  for (const e of p.eqns) {
    if (e.op === "input") {
      const input = p.inputs[e.index!]!;
      if (input.name !== POSITION && !names.includes(input.name)) {
        names.push(input.name);
      }
    }
  }
  return names;
}

/** What an emitter writes inline: a constant, a lane of the position, or a parameter. */
export type Leaf =
  | { readonly kind: "const"; readonly value: number }
  | { readonly kind: "pos"; readonly lane: number }
  | { readonly kind: "param"; readonly name: string };

/** The equation `id` stands for: through `type/boolToFloat`, a bool is its float. */
export function through(p: Program, id: Id): Id {
  let at = id;
  while (p.eqns[at]!.op === "type/boolToFloat") {
    at = p.eqns[at]!.args[0]!;
  }
  return at;
}

/** Equation `id` as a leaf an emitter writes inline, or undefined. */
export function leafOf(p: Program, id: Id): Leaf | undefined {
  const e = p.eqns[through(p, id)]!;
  switch (e.op) {
    case "const":
      return {
        kind: "const",
        value:
          typeof e.value === "boolean"
            ? e.value
              ? 1
              : 0
            : (e.value as number),
      };
    case "input":
      return e.type === "float"
        ? { kind: "param", name: p.inputs[e.index!]!.name }
        : undefined;
    case "math/extract3": {
      const source = p.eqns[e.args[0]!]!;
      return source.op === "input" && p.inputs[source.index!]!.name === POSITION
        ? { kind: "pos", lane: e.index! }
        : undefined;
    }
    default:
      return undefined;
  }
}

/** Equation `id` is no value of its own: the position's input, or a bool's float. */
export function isBookkeeping(p: Program, id: Id): boolean {
  const e = p.eqns[id]!;
  return (
    e.op === "type/boolToFloat" || (e.op === "input" && e.type === "float3")
  );
}

/**
 * Each equation's number in emitted names (`v<n>`, `d<n>`): its place among
 * the equations that are values, so the bookkeeping ones (`isBookkeeping`)
 * take no number and a program's names follow its values alone.
 */
export function numbering(p: Program): (id: Id) => number {
  const numbers = new Int32Array(p.eqns.length);
  let n = 0;
  p.eqns.forEach((_, id) => {
    numbers[id] = n;
    if (!isBookkeeping(p, id)) {
      n++;
    }
  });
  return (id) => numbers[through(p, id)]!;
}

/** The number of equations that are values (`numbering`'s count). */
export function valueCount(p: Program): number {
  return p.eqns.filter((_, id) => !isBookkeeping(p, id)).length;
}

/**
 * `b.op(op, args, index)`, with the rewrites transform programs have always
 * been built with beyond Cesium IR's builder's own: `x - 0` is `x` and
 * `0 - x` is `-x` (for either zero), `x ** 1` is `x`, `x ** 0` is 1, and
 * `min(x, x)` and `max(x, x)` are `x`. They keep a transform's programs, and
 * so its WGSL and its values, as they were. The two on `-` can turn a zero
 * result's sign (`0 - 0` is +0, `-0` is -0), which is why Cesium IR's
 * builder doesn't make them.
 */
export function opOf(
  b: Builder,
  op: string,
  args: readonly Id[],
  index?: number,
): Id {
  const [x, y] = args;
  switch (op) {
    case "math/sub":
      if (b.constOf(y!) === 0) {
        return x!;
      }
      if (b.constOf(x!) === 0) {
        return b.op("math/neg", [y!]);
      }
      break;
    case "math/pow":
      if (b.constOf(y!) === 1) {
        return x!;
      }
      if (b.constOf(y!) === 0) {
        return b.const(1);
      }
      break;
    case "math/min":
    case "math/max":
      if (x === y) {
        return x!;
      }
      break;
    default:
      break;
  }
  return b.op(op, args, index);
}
