// Front end 2: a restricted JS transform, through the engine's parser
// (`parseTransform`), which builds Cesium IR (CS-53), copied equation for
// equation into this IR. The position is one float3 input `p` per vertex;
// parameters are uniforms. Constants written in the function stay
// constants (folded); a transform's knobs are its parameters.

import type { Program as EngineProgram } from "../../packages/core/src/ir/types.ts";
import { parseTransform } from "../../packages/core/src/transform/parse.ts";
import { Builder, type Id, type Program } from "./cir.ts";

/** The engine's Cesium IR program in this IR: its three outputs as one float3, `q`. */
export function fromEngineIr(src: EngineProgram): Program {
  const b = new Builder();
  const ids: Id[] = [];
  src.eqns.forEach((e, i) => {
    switch (e.op) {
      case "const":
        ids[i] = b.const(e.value!);
        return;
      case "input": {
        const input = src.inputs[e.index!]!;
        ids[i] = b.input(input.name, input.type, input.rate);
        return;
      }
      default:
        ids[i] = b.op(
          e.op,
          e.args.map((x) => ids[x]!),
          e.index,
        );
    }
  });
  const outs = src.outputs.map((o) => ids[o.id]!);
  const q = outs.length === 3 ? b.op("math/combine3", outs) : outs[0]!;
  return b.program({ q });
}

export function transformProgram(source: string): Program {
  return fromEngineIr(parseTransform(source));
}
