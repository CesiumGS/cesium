import { applyOp, type IrProgram } from "./ir.ts";

/** Parameter values by name. */
export type ParamValues = Readonly<Record<string, number>>;

/**
 * The program's outputs at position `p`, in float64: the same arithmetic as
 * the function the program was parsed from, for cross-checking a parse.
 */
export function evaluate(
  program: IrProgram,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  const values = new Float64Array(program.nodes.length);
  program.nodes.forEach((node, id) => {
    const [a, b, c] = node.args;
    switch (node.op) {
      case "const":
        values[id] = node.value;
        break;
      case "pos":
        values[id] = p[node.value]!;
        break;
      case "param": {
        const value = params[node.name];
        if (value === undefined) {
          throw new Error(`parameter '${node.name}' has no value`);
        }
        values[id] = value;
        break;
      }
      default:
        values[id] = applyOp(
          node.op,
          values[a!]!,
          b === undefined ? 0 : values[b]!,
          c === undefined ? 0 : values[c]!,
        );
    }
  });
  return program.outputs.map((out) => values[out]!);
}
