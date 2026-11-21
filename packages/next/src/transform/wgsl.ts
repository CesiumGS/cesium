// IR to WGSL text, in f32, with each shared subexpression computed once in a
// `let`. The generated function is `fn <name>(p: vec3<f32>, params: <Name>Params)`
// returning a `vec3<f32>` (3 outputs), a `mat3x3<f32>` (9: J, row-major in
// the program, so the matrix is built column by column) or an
// `array<f32, N>`; the params struct is left out when the program reads none.
// Known limits: `pow` with a negative base (or a non-constant exponent
// reaching one) is undefined in WGSL, where JS gives a number or NaN;
// constant integer exponents up to 4 become products and are exact.
// `clamp`, `mix` and `smoothStep` are written as KHR_interactivity's
// formulas (reversed bounds and edges allowed, as CS-51's emitter writes
// them), not WGSL's built-ins. The program is read scalarized (Cesium IR's
// `scalarize`); a bool is the float 0 or 1, and `let v<n>` takes its number
// from `numbering`.
// The df64 variant (center constants in hi/lo pairs) is df64Wgsl.ts's
// `emitDf64`; the float32 residual form the compiler uses is residual.ts's.

import { scalarize } from "../ir/scalarize.ts";
import type { Id } from "../ir/types.ts";
import { asCir, type AnyProgram } from "./evaluate.ts";
import { leafOf, numbering, paramsOf, through } from "./program.ts";

export interface WgslOptions {
  /** The function's name; default `transformPoint`. */
  readonly name?: string;
  /** Emit the params struct before the function (default true). */
  readonly emitParamsStruct?: boolean;
}

const RESERVED = new Set([
  "alias",
  "break",
  "case",
  "const",
  "const_assert",
  "continue",
  "continuing",
  "default",
  "diagnostic",
  "discard",
  "else",
  "enable",
  "false",
  "fn",
  "for",
  "if",
  "let",
  "loop",
  "override",
  "requires",
  "return",
  "struct",
  "switch",
  "true",
  "var",
  "while",
  "filter",
  "target",
  "ref",
  "ptr",
  "sample",
  "mat2x2",
  "mat3x3",
  "mat4x4",
  "vec2",
  "vec3",
  "vec4",
  "array",
  "bool",
  "f32",
  "i32",
  "u32",
  "f16",
]);

/** The WGSL field for a parameter name. */
export function wgslParamField(name: string): string {
  const field = name.replace(/[^A-Za-z0-9_]/g, "_");
  const safe = /^[A-Za-z]/.test(field) ? field : `f_${field}`;
  return RESERVED.has(safe) ? `${safe}_` : safe;
}

function literal(value: number): string {
  const f32 = Math.fround(value);
  if (!Number.isFinite(f32)) {
    throw new RangeError(`cannot emit the constant ${value} in f32`);
  }
  let text = String(Number(f32.toPrecision(9)));
  if (!/[.e]/.test(text)) {
    text += ".0";
  }
  return f32 < 0 || Object.is(f32, -0) ? `(${text})` : text;
}

const UNARY: Readonly<Record<string, string>> = {
  "math/abs": "abs",
  "math/sqrt": "sqrt",
  "math/exp": "exp",
  "math/log": "log",
  "math/sin": "sin",
  "math/cos": "cos",
  "math/tan": "tan",
  "math/atan": "atan",
  "math/asin": "asin",
  "math/acos": "acos",
  "math/sinh": "sinh",
  "math/cosh": "cosh",
  "math/tanh": "tanh",
  "math/floor": "floor",
  "math/ceil": "ceil",
  "math/fract": "fract",
  "math/sign": "sign",
};

const INFIX: Readonly<Record<string, string>> = {
  "math/add": "+",
  "math/sub": "-",
  "math/mul": "*",
  "math/div": "/",
};

const COMPARE: Readonly<Record<string, string>> = {
  "math/lt": "<",
  "math/le": "<=",
  "math/gt": ">",
  "math/ge": ">=",
  "math/eq": "==",
};

function emitPow(base: string, exponent: number | undefined, e: string) {
  const n = exponent;
  if (n !== undefined && Number.isInteger(n) && Math.abs(n) <= 4) {
    if (n === 0) {
      return "1.0";
    }
    const product = Array.from({ length: Math.abs(n) }, () => base).join(" * ");
    return n > 0 ? `(${product})` : `(1.0 / (${product}))`;
  }
  if (n === 0.5) {
    return `sqrt(${base})`;
  }
  return `pow(${base}, ${e})`;
}

/** The WGSL function text for `program`. */
export function toWgsl(program: AnyProgram, options: WgslOptions = {}): string {
  const name = options.name ?? "transformPoint";
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`'${name}' is not a usable WGSL function name`);
  }
  const s = scalarize(asCir(program));
  const fields = new Map<string, string>();
  for (const param of paramsOf(s)) {
    const field = wgslParamField(param);
    const clash = [...fields.entries()].find(([, f]) => f === field);
    if (clash) {
      throw new Error(
        `parameters '${clash[0]}' and '${param}' both map to WGSL field '${field}'`,
      );
    }
    fields.set(param, field);
  }
  const structName = `${name[0]!.toUpperCase()}${name.slice(1)}Params`;
  const number = numbering(s);
  const inline = (id: Id): string | undefined => {
    const leaf = leafOf(s, id);
    switch (leaf?.kind) {
      case "const":
        return literal(leaf.value);
      case "pos":
        return `p.${"xyz"[leaf.lane]}`;
      case "param":
        return `params.${fields.get(leaf.name)}`;
      default:
        return undefined;
    }
  };
  const ref = (id: Id) => inline(id) ?? `v${number(id)}`;
  const bool = (id: Id) => `(${ref(id)} != 0.0)`;
  const flag = (condition: string) => `select(0.0, 1.0, ${condition})`;

  const lines: string[] = [];
  s.eqns.forEach((e, id) => {
    if (e.op === "input" || through(s, id) !== id || inline(id) !== undefined) {
      return;
    }
    const [a, b, c] = e.args;
    const A = ref(a!);
    const B = b === undefined ? "" : ref(b);
    const C = c === undefined ? "" : ref(c);
    let expression: string;
    const unary = UNARY[e.op];
    const infix = INFIX[e.op];
    const compare = COMPARE[e.op];
    if (unary) {
      expression = `${unary}(${A})`;
    } else if (infix) {
      expression = `${A} ${infix} ${B}`;
    } else if (compare) {
      expression = flag(`${A} ${compare} ${B}`);
    } else {
      switch (e.op) {
        case "math/neg":
          expression = `-${A}`;
          break;
        case "math/min":
          expression = `min(${A}, ${B})`;
          break;
        case "math/max":
          expression = `max(${A}, ${B})`;
          break;
        case "math/pow": {
          const exponent = leafOf(s, b!);
          expression = emitPow(
            A,
            exponent?.kind === "const" ? exponent.value : undefined,
            B,
          );
          break;
        }
        case "math/atan2":
          expression = `atan2(${A}, ${B})`;
          break;
        case "math/not":
          expression = flag(`${A} == 0.0`);
          break;
        case "math/and":
          expression = flag(`${bool(a!)} && ${bool(b!)}`);
          break;
        case "math/or":
          expression = flag(`${bool(a!)} || ${bool(b!)}`);
          break;
        case "math/select":
          expression = `select(${C}, ${B}, ${bool(a!)})`;
          break;
        // KHR_interactivity's formulas, as CS-51's emitter writes them.
        case "math/clamp":
          expression = `min(max(${A}, min(${B}, ${C})), max(${B}, ${C}))`;
          break;
        case "math/saturate":
          expression = `min(max(${A}, 0.0), 1.0)`;
          break;
        case "math/mix":
          expression = `((1.0 - ${C}) * ${A} + ${C} * ${B})`;
          break;
        case "math/smoothStep": {
          const t = `clamp((${C} - min(${A}, ${B})) / abs(${B} - ${A}), 0.0, 1.0)`;
          expression = `(${t} * ${t} * (3.0 - 2.0 * ${t}))`;
          break;
        }
        default:
          throw new Error(`wgsl: no emitter for op '${e.op}'`);
      }
    }
    lines.push(`  let v${number(id)} = ${expression};`);
  });

  const out = s.outputs.map((o) => ref(o.id));
  let returnType: string;
  let result: string;
  if (out.length === 3) {
    returnType = "vec3<f32>";
    result = `vec3<f32>(${out.join(", ")})`;
  } else if (out.length === 9) {
    returnType = "mat3x3<f32>";
    const column = (j: number) =>
      `vec3<f32>(${out[j]}, ${out[3 + j]}, ${out[6 + j]})`;
    result = `mat3x3<f32>(${column(0)}, ${column(1)}, ${column(2)})`;
  } else {
    returnType = `array<f32, ${out.length}>`;
    result = `array<f32, ${out.length}>(${out.join(", ")})`;
  }

  const text: string[] = [];
  if (fields.size > 0 && options.emitParamsStruct !== false) {
    text.push(`struct ${structName} {`);
    for (const field of fields.values()) {
      text.push(`  ${field}: f32,`);
    }
    text.push("}", "");
  }
  const args =
    fields.size > 0 ? `p: vec3<f32>, params: ${structName}` : "p: vec3<f32>";
  text.push(`fn ${name}(${args}) -> ${returnType} {`, ...lines);
  text.push(`  return ${result};`, "}", "");
  return text.join("\n");
}
