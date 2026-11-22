// Front end 4: a WGSL function, through naga (WGSL to SPIR-V), to the IR.
// naga's own IR isn't reachable from `naga-wasm` (its `Module` is an opaque
// handle), and isn't promised stable anyway; SPIR-V is a ratified binary
// with a versioned grammar, so it's the bridge out of naga that holds still.
// This reads the straight-line subset a pure function compiles to: one
// block, arithmetic, GLSL.std.450 calls, composites, compares and selects.

import {
  Builder,
  floatOf,
  type Id,
  type Program,
  type Rate,
  type Type,
} from "./cir.ts";

const GLSL_STD_450: Record<number, [string, number]> = {
  4: ["math/abs", 1],
  6: ["math/sign", 1],
  8: ["math/floor", 1],
  9: ["math/ceil", 1],
  10: ["math/fract", 1],
  3: ["math/trunc", 1],
  13: ["math/sin", 1],
  14: ["math/cos", 1],
  15: ["math/tan", 1],
  16: ["math/asin", 1],
  17: ["math/acos", 1],
  18: ["math/atan", 1],
  19: ["math/sinh", 1],
  20: ["math/cosh", 1],
  21: ["math/tanh", 1],
  25: ["math/atan2", 2],
  26: ["math/pow", 2],
  27: ["math/exp", 1],
  28: ["math/log", 1],
  30: ["math/log2", 1],
  31: ["math/sqrt", 1],
  37: ["math/min", 2],
  40: ["math/max", 2],
  43: ["math/clamp", 3],
  46: ["math/mix", 3],
  49: ["math/smoothStep", 3],
  66: ["math/length", 1],
  68: ["math/cross", 2],
  69: ["math/normalize", 1],
};

const BINARY: Record<number, string> = {
  129: "math/add",
  131: "math/sub",
  133: "math/mul",
  136: "math/div",
  141: "math/rem",
  180: "math/eq",
  184: "math/lt",
  188: "math/gt",
  190: "math/le",
  192: "math/ge",
  167: "math/or",
  166: "math/and",
};

/**
 * The SPIR-V function named `name` (from OpName) as a program. Parameters
 * become inputs with `rates[param]` (default per fragment).
 */
export function fromSpirv(
  words: Uint32Array,
  name: string,
  rates: Readonly<Record<string, Rate>> = {},
): Program {
  if (words[0] !== 0x07230203) {
    throw new Error("not SPIR-V");
  }
  const names = new Map<number, string>();
  const types = new Map<number, Type | "void" | "fn">();
  const vecOf = new Map<number, [number, number]>(); // vector type -> [component type, n]
  const b = new Builder();
  const ids = new Map<number, Id>();
  let ext450 = -1;
  let fnId = -1;
  let inside = false;
  const params: number[] = [];
  let result: Id | undefined;
  const str = (at: number, n: number) => {
    const bytes = new Uint8Array(
      words.buffer,
      words.byteOffset + at * 4,
      n * 4,
    );
    return new TextDecoder().decode(
      bytes.slice(0, bytes.indexOf(0) < 0 ? undefined : bytes.indexOf(0)),
    );
  };
  for (let at = 5; at < words.length;) {
    const count = words[at]! >>> 16;
    const op = words[at]! & 0xffff;
    const w = (i: number) => words[at + i]!;
    const get = (i: number) => {
      const id = ids.get(w(i));
      if (id === undefined) {
        throw new Error(`spirv: %${w(i)} isn't a value (op ${op})`);
      }
      return id;
    };
    switch (op) {
      case 5: // OpName
        names.set(w(1), str(at + 2, count - 2));
        break;
      case 11: // OpExtInstImport
        if (str(at + 2, count - 2) === "GLSL.std.450") {
          ext450 = w(1);
        }
        break;
      case 19:
        types.set(w(1), "void");
        break;
      case 20:
        types.set(w(1), "bool");
        break;
      case 21:
        types.set(w(1), "int");
        break;
      case 22:
        types.set(w(1), "float");
        break;
      case 23: // OpTypeVector
        types.set(w(1), floatOf(w(3)));
        vecOf.set(w(1), [w(2), w(3)]);
        break;
      case 33:
        types.set(w(1), "fn");
        break;
      case 41:
        ids.set(w(2), b.const(true));
        break; // OpConstantTrue
      case 42:
        ids.set(w(2), b.const(false));
        break;
      case 43: {
        // OpConstant (32-bit float or int)
        const t = types.get(w(1));
        const bits = new DataView(new ArrayBuffer(4));
        bits.setUint32(0, w(3), true);
        ids.set(
          w(2),
          b.const(
            t === "float" ? bits.getFloat32(0, true) : bits.getInt32(0, true),
          ),
        );
        break;
      }
      case 44: {
        // OpConstantComposite
        const parts = Array.from(
          { length: count - 3 },
          (_, i) => b.constOf(get(3 + i)) as number,
        );
        ids.set(w(2), b.const(parts));
        break;
      }
      case 54: // OpFunction
        if (names.get(w(2)) === name) {
          fnId = w(2);
          inside = true;
        }
        break;
      case 55: // OpFunctionParameter
        if (inside) {
          params.push(w(2));
          const pname = names.get(w(2)) ?? `arg${params.length - 1}`;
          ids.set(
            w(2),
            b.input(pname, types.get(w(1)) as Type, rates[pname] ?? "fragment"),
          );
        }
        break;
      case 56: // OpFunctionEnd
        inside = false;
        break;
      default:
        if (!inside) {
          break;
        }
        switch (op) {
          case 248: // OpLabel
          case 249: // OpBranch (naga opens with a block that branches on)
          case 253: // OpReturn
            break;
          case 254: // OpReturnValue
            result = get(1);
            break;
          case 127:
            ids.set(w(2), b.op("math/neg", [get(3)]));
            break; // OpFNegate
          case 168:
            ids.set(w(2), b.op("math/not", [get(3)]));
            break; // OpLogicalNot
          case 142: {
            // OpVectorTimesScalar
            const v = get(3);
            const n = vecOf.get(w(1))![1];
            ids.set(w(2), b.op("math/mul", [v, b.splat(get(4), n)]));
            break;
          }
          case 148:
            ids.set(w(2), b.op("math/dot", [get(3), get(4)]));
            break; // OpDot
          case 169:
            ids.set(w(2), b.op("math/select", [get(3), get(4), get(5)]));
            break; // OpSelect
          case 80: {
            // OpCompositeConstruct
            const parts = Array.from({ length: count - 3 }, (_, i) =>
              get(3 + i),
            );
            ids.set(w(2), b.op(`math/combine${parts.length}`, parts));
            break;
          }
          case 81: {
            // OpCompositeExtract (one index)
            const v = get(3);
            const n = Number(b.typeOf(v).at(-1));
            ids.set(w(2), b.op(`math/extract${n}`, [v], w(4)));
            break;
          }
          case 79: {
            // OpVectorShuffle
            const [x, y] = [get(3), get(4)];
            const nx = Number(b.typeOf(x).at(-1));
            const lanes = Array.from({ length: count - 5 }, (_, i) => w(5 + i));
            const pick = (l: number) =>
              l < nx
                ? b.op(`math/extract${nx}`, [x], l)
                : b.op(
                    `math/extract${Number(b.typeOf(y).at(-1))}`,
                    [y],
                    l - nx,
                  );
            ids.set(w(2), b.op(`math/combine${lanes.length}`, lanes.map(pick)));
            break;
          }
          case 12: {
            // OpExtInst
            if (w(3) !== ext450) {
              throw new Error(
                "spirv: an extended instruction outside GLSL.std.450",
              );
            }
            const [cir, arity] = GLSL_STD_450[w(4)] ?? [];
            if (!cir) {
              throw new Error(
                `spirv: GLSL.std.450 instruction ${w(4)} isn't in the spike`,
              );
            }
            ids.set(
              w(2),
              b.op(
                cir,
                Array.from({ length: arity! }, (_, i) => get(5 + i)),
              ),
            );
            break;
          }
          default: {
            const bin = BINARY[op];
            if (!bin) {
              throw new Error(
                `spirv: op ${op} isn't in the spike's straight-line subset`,
              );
            }
            ids.set(w(2), b.op(bin, [get(3), get(4)]));
          }
        }
    }
    at += count;
  }
  if (fnId < 0 || result === undefined) {
    throw new Error(`spirv: no function '${name}' returning a value`);
  }
  return b.program({ [name]: result });
}
