// The GLSL ES 3.00 emitter: float32 GLSL from a Cesium IR program, the twin of
// the WGSL emitter (`wgsl.ts`) for the WebGL 2 renderer.
//
// The same claims hold as in `wgsl.ts`: the float64 evaluator is the meaning,
// the GLSL is a float32 approximation of it, and `wgslCases.ts` states each
// op's tolerance, which the WebGL 2 readback test (`bench/irGlsl.ts`) holds
// with the same numbers as the WebGPU one. NaN, infinity and the operands
// GLSL leaves undefined (`pow` of a negative base to a non-integer power,
// `pow(0, y)` for y below 0, `asin` outside [-1, 1]) aren't promised.
//
// Where GLSL differs from WGSL:
//
// - `atan(y, x)` is `math/atan2`.
// - `%` is for integers only, so `math/rem` is `x - y trunc(x / y)` (the same
//   truncated remainder WGSL's `%` has; GLSL's `mod` is floored).
// - `math/select` is the ternary, which takes one scalar condition and
//   evaluates only the chosen operand. The emitter's own selects on vectors
//   (`sinh`, `tanh`, `pow`) use `mix` with a `bvec`.
// - Comparisons on vectors are `lessThan` and friends, and `&&` takes scalars,
//   so the vector forms never combine two comparisons: `pow`'s sign is
//   arithmetic on `T(comparison)`.
// - There is no `saturate`: it is `clamp(x, 0.0, 1.0)`.
// - Conversions are `float()` and `int()`, not `f32()` and `i32()`.
// - Uniforms are one std140 block, `layout(std140) uniform CirUniforms`: an
//   array of vec4, one per slot, as in WGSL (so `packUniforms` serves both).
//   GLSL ES 3.00 has no `binding` qualifier: the host binds the block with
//   `uniformBlockBinding` and the name in `uniformBlock`. A block may be 16 KB
//   (1024 slots) on any WebGL 2 device, so a larger program fails to link
//   there instead of here.
//
// The emitted `code` is declarations and one function, with no `#version` line
// and no `precision` statement: the shader that holds it starts with
// `#version 300 es` and, in a fragment shader, `precision highp float;`
// (`emitGlslKernel` writes both). Every equation is one local, with its id in
// a trailing comment and in `sourceMap`, as in WGSL.

import { OPS } from "./ops.ts";
import {
  width,
  type Eqn,
  type Program,
  type Type,
  type Value,
} from "./types.ts";
import { f32Literal, uniformSlots, type UniformSlot } from "./wgsl.ts";

export interface GlslEmitOptions {
  /** The function's name, before `prefix`. Default `cir_main`. */
  readonly fn?: string;
  /**
   * Put before every name the code declares (the uniform block, its instance,
   * the output struct and the function), so two emitted programs can share one
   * shader. Default "". As in `wgsl.ts`.
   */
  readonly prefix?: string;
}

export interface EmittedGlsl {
  /** Declarations (uniform block, output struct) and the function. */
  readonly code: string;
  /** The function's name, with the prefix. */
  readonly fn: string;
  /** The output struct's name, with the prefix. */
  readonly outStruct: string;
  /** The uniform block's name, for `getUniformBlockIndex`. */
  readonly uniformBlock: string;
  readonly uniforms: readonly UniformSlot[];
  /** The function's parameters (the non-uniform inputs), in order. */
  readonly params: readonly { readonly name: string; readonly type: Type }[];
  /** The output struct's fields, in order. */
  readonly outputs: readonly { readonly name: string; readonly type: Type }[];
  /** Line (1-based, within `code`) to the equation that wrote it. */
  readonly sourceMap: readonly {
    readonly line: number;
    readonly eqn: number;
  }[];
}

const GLSL_TYPE: Record<Type, string> = {
  bool: "bool",
  int: "int",
  float: "float",
  float2: "vec2",
  float3: "vec3",
  float4: "vec4",
};

const LANES = "xyzw";
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** GLSL ES 3.00's keywords and reserved words: no name here may be one. */
const RESERVED: ReadonlySet<string> = new Set(
  `attribute const uniform varying layout centroid flat smooth break continue
  do for while switch case default if else in out inout float int void bool
  true false invariant discard return mat2 mat3 mat4 mat2x2 mat2x3 mat2x4
  mat3x2 mat3x3 mat3x4 mat4x2 mat4x3 mat4x4 vec2 vec3 vec4 ivec2 ivec3 ivec4
  bvec2 bvec3 bvec4 uint uvec2 uvec3 uvec4 lowp mediump highp precision
  sampler2D sampler3D samplerCube sampler2DShadow samplerCubeShadow
  sampler2DArray sampler2DArrayShadow isampler2D isampler3D isamplerCube
  isampler2DArray usampler2D usampler3D usamplerCube usampler2DArray struct
  common partition active asm class union enum typedef template this resource
  goto inline noinline public static extern external interface long short
  half fixed unsigned superp input output hvec2 hvec3 hvec4 fvec2 fvec3 fvec4
  sampler1D sampler1DShadow sampler2DRect sampler3DRect sampler2DRectShadow
  filter sizeof cast namespace using packed volatile main`.split(/\s+/),
);

/** Why `name` can't be a GLSL ES 3.00 identifier, or undefined. */
function nameProblem(name: string): string | undefined {
  if (!IDENT.test(name)) {
    return "isn't an identifier";
  }
  if (RESERVED.has(name)) {
    return "is a GLSL ES keyword or reserved word";
  }
  if (name.startsWith("gl_") || name.includes("__")) {
    return "is reserved (gl_ prefix or two underscores)";
  }
  return undefined;
}

function valueText(type: Type, v: Value): string {
  if (typeof v === "boolean") {
    return String(v);
  }
  if (typeof v === "number") {
    return type === "int" ? String(Math.trunc(v)) : f32Literal(v);
  }
  return `${GLSL_TYPE[type]}(${v.map(f32Literal).join(", ")})`;
}

const INFIX: Record<string, string> = {
  "math/add": "+",
  "math/sub": "-",
  "math/mul": "*",
  "math/div": "/",
  "math/lt": "<",
  "math/le": "<=",
  "math/gt": ">",
  "math/ge": ">=",
  "math/eq": "==",
  "math/and": "&&",
  "math/or": "||",
};

/** Built-ins with KHR's name and operand order. */
const BUILTIN: Record<string, string> = {
  "math/abs": "abs",
  "math/sign": "sign",
  "math/trunc": "trunc",
  "math/floor": "floor",
  "math/ceil": "ceil",
  "math/fract": "fract",
  "math/sqrt": "sqrt",
  "math/exp": "exp",
  "math/log": "log",
  "math/log2": "log2",
  "math/sin": "sin",
  "math/cos": "cos",
  "math/tan": "tan",
  "math/asin": "asin",
  "math/acos": "acos",
  "math/atan": "atan",
  "math/cosh": "cosh",
  "math/min": "min",
  "math/max": "max",
  "math/atan2": "atan",
  "math/length": "length",
  "math/cross": "cross",
};

/** The right-hand side of one equation, on operand names `a`. */
function rhs(e: Eqn, a: readonly string[], argTypes: readonly Type[]): string {
  const T = GLSL_TYPE[e.type];
  const vector = width(e.type) > 1;
  const k = (n: number) => `${T}(${f32Literal(n)})`;
  // Comparisons and selects that work on a scalar and on a vector alike.
  const less = (x: string, y: string) =>
    vector ? `lessThan(${x}, ${y})` : `(${x} < ${y})`;
  const differs = (x: string, y: string) =>
    vector ? `notEqual(${x}, ${y})` : `(${x} != ${y})`;
  const same = (x: string, y: string) =>
    vector ? `equal(${x}, ${y})` : `(${x} == ${y})`;
  const pick = (whenFalse: string, whenTrue: string, cond: string) =>
    vector
      ? `mix(${whenFalse}, ${whenTrue}, ${cond})`
      : `(${cond} ? ${whenTrue} : ${whenFalse})`;
  const infix = INFIX[e.op];
  if (infix) {
    return `(${a[0]} ${infix} ${a[1]})`;
  }
  const builtin = BUILTIN[e.op];
  if (builtin) {
    return builtin === "atan" && a.length === 2
      ? `atan(${a[0]}, ${a[1]})`
      : `${builtin}(${a.join(", ")})`;
  }
  switch (e.op) {
    case "math/neg":
      return `(-${a[0]})`;
    case "math/not":
      return `(!${a[0]})`;
    // Truncated, as the float64 meaning and WGSL's `%`.
    case "math/rem":
      return `(${a[0]} - ${a[1]} * trunc(${a[0]} / ${a[1]}))`;
    case "math/saturate":
      return `clamp(${a[0]}, ${k(0)}, ${k(1)})`;
    // Half away from zero (GLSL's round leaves halves to the implementation):
    // trunc(x) plus trunc of twice the fraction, exact in float32.
    case "math/round":
      return `(trunc(${a[0]}) + trunc((${a[0]} - trunc(${a[0]})) * ${k(2)}))`;
    // The built-ins cancel near zero, so a short series takes over where it
    // is exact to float32 (as in WGSL).
    case "math/sinh": {
      const x2 = `(${a[0]} * ${a[0]})`;
      const series = `(${a[0]} * (${k(1)} + ${x2} / ${k(6)} * (${k(1)} + ${x2} / ${k(20)} * (${k(1)} + ${x2} / ${k(42)}))))`;
      return pick(`sinh(${a[0]})`, series, less(`abs(${a[0]})`, k(0.5)));
    }
    case "math/tanh": {
      const x2 = `(${a[0]} * ${a[0]})`;
      const series = `(${a[0]} * (${k(1)} - ${x2} / ${k(3)} * (${k(1)} - ${k(2)} * ${x2} / ${k(5)} * (${k(1)} - ${k(17)} * ${x2} / ${k(42)}))))`;
      return pick(`tanh(${a[0]})`, series, less(`abs(${a[0]})`, k(0.1)));
    }
    case "math/log10":
      return `(log(${a[0]}) * ${k(0.4342944819032518)})`;
    case "math/cbrt":
      return `(sign(${a[0]}) * pow(abs(${a[0]}), ${k(1 / 3)}))`;
    // pow(x, 0) is 1; a negative base takes the sign of an odd integer power.
    // The sign is arithmetic on 0 or 1, since `&&` doesn't take a bvec.
    case "math/pow": {
      const negative = `${T}(${less(a[0]!, k(0))})`;
      const odd = `${T}(${differs(`fract(${a[1]} * ${k(0.5)})`, k(0))})`;
      const sgn = `(${k(1)} - ${k(2)} * ${negative} * ${odd})`;
      return pick(
        `pow(abs(${a[0]}), ${a[1]}) * ${sgn}`,
        k(1),
        same(a[1]!, k(0)),
      );
    }
    // Reversed bounds are allowed.
    case "math/clamp":
      return `min(max(${a[0]}, min(${a[1]}, ${a[2]})), max(${a[1]}, ${a[2]}))`;
    // (1 - t) a + t b, in that form: GLSL's mix may use another.
    case "math/mix":
      return `((${k(1)} - ${a[2]}) * ${a[0]} + ${a[2]} * ${a[1]})`;
    // KHR's ramp always rises, whichever edge is larger.
    case "math/smoothStep": {
      const t = `clamp((${a[2]} - min(${a[0]}, ${a[1]})) / abs(${a[1]} - ${a[0]}), ${k(0)}, ${k(1)})`;
      return `(${t} * ${t} * (${k(3)} - ${k(2)} * ${t}))`;
    }
    // One scalar condition, whatever the operands' type.
    case "math/select":
      return `(${a[0]} ? ${a[1]} : ${a[2]})`;
    // Zero length (or a float32 overflow of it): zero components.
    case "math/normalize":
      return argTypes[0] === "float"
        ? `(${a[0]} != 0.0 ? ${a[0]} / abs(${a[0]}) : 0.0)`
        : `(length(${a[0]}) > 0.0 ? ${a[0]} / length(${a[0]}) : ${k(0)})`;
    case "math/dot":
      return argTypes[0] === "float"
        ? `(${a[0]} * ${a[1]})`
        : `dot(${a[0]}, ${a[1]})`;
    case "type/boolToFloat":
    case "type/intToFloat":
      return `float(${a[0]})`;
    default:
      break;
  }
  if (e.op.startsWith("math/combine")) {
    return `${T}(${a.join(", ")})`;
  }
  if (e.op.startsWith("math/extract")) {
    return `${a[0]}.${LANES[e.index!]}`;
  }
  throw new Error(`the GLSL emitter has no form for '${e.op}'`);
}

const UNIFORM_BLOCK = "CirUniforms";

/** A parameter's name in the function. */
const ident = (name: string) => `in_${name.replace(/[^A-Za-z0-9_]/g, "_")}`;

/** GLSL ES 3.00 for `p`: a uniform block, an output struct and one function. */
export function emitGlsl(
  p: Program,
  options: GlslEmitOptions = {},
): EmittedGlsl {
  const prefix = options.prefix ?? "";
  if (prefix !== "" && !IDENT.test(prefix)) {
    throw new Error(`'${prefix}' can't start a GLSL name`);
  }
  const fn = `${prefix}${options.fn ?? "cir_main"}`;
  const uniformBlock = `${prefix}${UNIFORM_BLOCK}`;
  const blockVar = `${prefix}cir_u`;
  const outStruct = `${prefix}CirOut`;
  for (const name of [fn, uniformBlock, blockVar, outStruct]) {
    const problem = nameProblem(name);
    if (problem) {
      throw new Error(`'${name}' ${problem}`);
    }
  }
  for (const o of p.outputs) {
    const problem = nameProblem(o.name);
    if (problem) {
      throw new Error(
        `output '${o.name}' can't be a GLSL field name: it ${problem}`,
      );
    }
  }
  const uniforms = uniformSlots(p);
  const params = p.inputs
    .filter((i) => i.rate !== "uniform")
    .map((i) => ({ name: i.name, type: i.type }));
  const names = new Set<string>();
  for (const q of params) {
    const id = ident(q.name);
    const problem = nameProblem(id);
    if (problem) {
      throw new Error(
        `input '${q.name}' can't be a GLSL parameter: ${id} ${problem}`,
      );
    }
    if (names.has(id)) {
      throw new Error(`inputs '${q.name}' and another both become ${id}`);
    }
    names.add(id);
  }
  const outputs = p.outputs.map((o) => ({
    name: o.name,
    type: p.eqns[o.id]!.type,
  }));
  const slotOf = (name: string, kind: "input" | "literal") =>
    uniforms.find((s) => s.name === name && s.kind === kind)!.index;

  const lines: string[] = [];
  const sourceMap: { line: number; eqn: number }[] = [];
  const emit = (text: string, eqn?: number) => {
    lines.push(eqn === undefined ? text : `${text} // eqn ${eqn}`);
    if (eqn !== undefined) {
      sourceMap.push({ line: lines.length, eqn });
    }
  };
  const read = (type: Type, slot: number): string => {
    const n = width(type);
    const lanes = `${blockVar}.k[${slot}].${LANES.slice(0, n)}`;
    return type === "bool"
      ? `(${lanes} != 0.0)`
      : type === "int"
        ? `int(${lanes})`
        : lanes;
  };

  if (uniforms.length > 0) {
    emit(
      `layout(std140) uniform ${uniformBlock} { vec4 k[${uniforms.length}]; } ${blockVar};`,
    );
  }
  emit(
    `struct ${outStruct} { ${outputs.map((o) => `${GLSL_TYPE[o.type]} ${o.name};`).join(" ")} };`,
  );
  emit(
    `${outStruct} ${fn}(${params.map((q) => `${GLSL_TYPE[q.type]} ${ident(q.name)}`).join(", ")}) {`,
  );
  p.eqns.forEach((e, id) => {
    let text: string;
    switch (e.op) {
      case "const":
        text = valueText(e.type, e.value!);
        break;
      case "literal":
        text = read(e.type, slotOf(e.slot!, "literal"));
        break;
      case "input": {
        const input = p.inputs[e.index!]!;
        text =
          input.rate === "uniform"
            ? read(input.type, slotOf(input.name, "input"))
            : ident(input.name);
        break;
      }
      default: {
        if (!OPS[e.op]) {
          throw new Error(`unknown op '${e.op}'`);
        }
        text = rhs(
          e,
          e.args.map((x) => `v${x}`),
          e.args.map((x) => p.eqns[x]!.type),
        );
      }
    }
    emit(`  ${GLSL_TYPE[e.type]} v${id} = ${text};`, id);
  });
  emit(
    `  return ${outStruct}(${p.outputs.map((o) => `v${o.id}`).join(", ")});`,
  );
  emit("}");
  return {
    code: lines.join("\n"),
    fn,
    outStruct,
    uniformBlock,
    uniforms,
    params,
    outputs,
    sourceMap,
  };
}

/** Lanes a value of `type` takes in a flat float32 buffer. */
const stride = (types: readonly Type[]): number =>
  types.reduce((n, t) => n + width(t), 0);

/** The type a bool or an int takes in the kernel's float32 buffers. */
const carried = (t: Type): string =>
  t === "bool" || t === "int" ? "float" : GLSL_TYPE[t];

/**
 * A complete vertex shader around `emitGlsl`'s function, for the readback
 * test (WebGL 2 has no compute shaders; transform feedback reads the answers
 * back). Each non-uniform input is a vertex attribute, `cir_in<i>`, read from
 * one interleaved buffer (`inStride` floats per row, in parameter order, bools
 * and ints as float32, the layout `emitWgslKernel` reads). Each output is a
 * varying, `cir_out<i>`, captured interleaved (`outStride` floats per row).
 * One vertex per row, drawn as points with the rasterizer discarding; there
 * are no loops. The block binds with `uniformBlockBinding`.
 */
export function emitGlslKernel(p: Program): EmittedGlsl & {
  readonly inStride: number;
  readonly outStride: number;
  /** Attribute names, in `params` order: bind location i to attributes[i]. */
  readonly attributes: readonly string[];
  /** Varying names, in `outputs` order, for `transformFeedbackVaryings`. */
  readonly varyings: readonly string[];
} {
  const e = emitGlsl(p);
  const inStride = stride(e.params.map((q) => q.type));
  const outStride = stride(e.outputs.map((o) => o.type));
  const attributes = e.params.map((_, i) => `cir_in${i}`);
  const varyings = e.outputs.map((_, i) => `cir_out${i}`);
  const load = e.params.map((q, i) =>
    q.type === "bool"
      ? `${attributes[i]} != 0.0`
      : q.type === "int"
        ? `int(${attributes[i]})`
        : attributes[i]!,
  );
  const header = [
    "#version 300 es",
    "precision highp float;",
    "precision highp int;",
  ];
  const body = [
    ...e.params.map((q, i) => `in ${carried(q.type)} ${attributes[i]};`),
    ...e.outputs.map((o, i) => `out ${carried(o.type)} ${varyings[i]};`),
    "void main() {",
    `  ${e.outStruct} r = ${e.fn}(${load.join(", ")});`,
    ...e.outputs.map((o, i) => {
      const field = `r.${o.name}`;
      return `  ${varyings[i]} = ${o.type === "bool" || o.type === "int" ? `float(${field})` : field};`;
    }),
    "  gl_Position = vec4(0.0);",
    "}",
  ];
  const code = [...header, e.code, ...body].join("\n");
  return {
    ...e,
    code,
    sourceMap: e.sourceMap.map((s) => ({ ...s, line: s.line + header.length })),
    inStride,
    outStride,
    attributes,
    varyings,
  };
}

/** The kernel's fragment shader: transform feedback needs a program to link. */
export const GLSL_KERNEL_FRAGMENT = [
  "#version 300 es",
  "precision highp float;",
  "out vec4 cir_color;",
  "void main() { cir_color = vec4(0.0); }",
].join("\n");
