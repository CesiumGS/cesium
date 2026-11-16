// The float64 evaluator and the text listing. Both are interpretations of the
// one program structure.

import { applyValue } from "./ops.ts";
import type { Id, Program, Value } from "./types.ts";

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

/** A jaxpr-style listing, for tests, diffs and the inspector. */
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
