// IR to WGSL text, in f32, with each shared subexpression computed once in a
// `let`. The generated function is `fn <name>(p: vec3<f32>, params: <Name>Params)`
// returning a `vec3<f32>` (3 outputs), a `mat3x3<f32>` (9: J, row-major in
// the program, so the matrix is built column by column) or an
// `array<f32, N>`; the params struct is left out when the program reads none.
// Known limits: `pow` with a negative base (or a non-constant exponent
// reaching one) is undefined in WGSL, where JS gives a number or NaN;
// constant integer exponents up to 4 become products and are exact.
// TODO(task 4): the df64 variant, for centre constants in hi/lo pairs.

import type { IrNode, IrProgram, Op } from "./ir.ts";

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

const UNARY: Partial<Record<Op, string>> = {
  abs: "abs",
  sqrt: "sqrt",
  exp: "exp",
  log: "log",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  atan: "atan",
  asin: "asin",
  acos: "acos",
  sinh: "sinh",
  cosh: "cosh",
  tanh: "tanh",
  floor: "floor",
  ceil: "ceil",
  fract: "fract",
  sign: "sign",
};

const INFIX: Partial<Record<Op, string>> = {
  add: "+",
  sub: "-",
  mul: "*",
  div: "/",
};

const COMPARE: Partial<Record<Op, string>> = {
  lt: "<",
  le: "<=",
  gt: ">",
  ge: ">=",
  eq: "==",
  ne: "!=",
};

function emitPow(base: string, exponent: IrNode | undefined, e: string) {
  const n = exponent?.op === "const" ? exponent.value : undefined;
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
export function toWgsl(program: IrProgram, options: WgslOptions = {}): string {
  const name = options.name ?? "transformPoint";
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`'${name}' is not a usable WGSL function name`);
  }
  const fields = new Map<string, string>();
  for (const param of program.params) {
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
  const nodes = program.nodes;
  const inline = (id: number): string | undefined => {
    const node = nodes[id]!;
    switch (node.op) {
      case "const":
        return literal(node.value);
      case "pos":
        return `p.${"xyz"[node.value]}`;
      case "param":
        return `params.${fields.get(node.name)}`;
      default:
        return undefined;
    }
  };
  const ref = (id: number) => inline(id) ?? `v${id}`;
  const bool = (id: number) => `(${ref(id)} != 0.0)`;
  const flag = (condition: string) => `select(0.0, 1.0, ${condition})`;

  const lines: string[] = [];
  nodes.forEach((node, id) => {
    if (inline(id) !== undefined) {
      return;
    }
    const [a, b, c] = node.args;
    const A = ref(a!);
    const B = b === undefined ? "" : ref(b);
    const C = c === undefined ? "" : ref(c);
    let expression: string;
    const unary = UNARY[node.op];
    const infix = INFIX[node.op];
    const compare = COMPARE[node.op];
    if (unary) {
      expression = `${unary}(${A})`;
    } else if (infix) {
      expression = `${A} ${infix} ${B}`;
    } else if (compare) {
      expression = flag(`${A} ${compare} ${B}`);
    } else {
      switch (node.op) {
        case "neg":
          expression = `-${A}`;
          break;
        case "min":
        case "max":
          expression = `${node.op}(${A}, ${B})`;
          break;
        case "pow":
          expression = emitPow(A, nodes[b!], B);
          break;
        case "atan2":
          expression = `atan2(${A}, ${B})`;
          break;
        case "not":
          expression = flag(`${A} == 0.0`);
          break;
        case "and":
          expression = flag(`${bool(a!)} && ${bool(b!)}`);
          break;
        case "or":
          expression = flag(`${bool(a!)} || ${bool(b!)}`);
          break;
        case "select":
          expression = `select(${C}, ${B}, ${bool(a!)})`;
          break;
        case "clamp":
          expression = `clamp(${A}, ${B}, ${C})`;
          break;
        case "mix":
          expression = `mix(${A}, ${B}, ${C})`;
          break;
        case "smoothstep":
          expression = `smoothstep(${A}, ${B}, ${C})`;
          break;
        default:
          throw new Error(`wgsl: no emitter for op '${node.op}'`);
      }
    }
    lines.push(`  let v${id} = ${expression};`);
  });

  const out = program.outputs.map(ref);
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
