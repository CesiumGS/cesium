// The WGSL emitter: float32 WGSL from a Cesium IR program.
//
// The program's meaning is its float64 evaluation (`evaluate`). The WGSL is an
// approximation of it, in float32, and each op's tolerance is written down in
// `wgslCases.ts`, where a GPU readback test holds it. Three things differ
// from the float64 meaning and aren't promised:
//
// - NaN and infinity. WebGPU lets a compiler assume neither occurs, so a
//   result that is NaN or infinite in float64 is not compared on the GPU.
// - Where WGSL leaves an op undefined (`pow` of a negative base to a
//   non-integer power, `pow(0, y)` for y at or below 0, `asin` outside
//   [-1, 1]), the emitter doesn't add a guard beyond the two that cost one
//   `select` each: `pow(x, 0)` is 1, and a negative base to an integer
//   power takes its sign from the power's parity.
// - Precision: float32 has 24 bits. The transcendental built-ins are
//   implementation-defined to a few ULPs, so the tolerances are not
//   one-ULP claims.
//
// Where WGSL's built-in differs from KHR_interactivity's formula (`clamp`,
// `smoothStep`, `round`, `normalize`, `select`'s operand order) the emitter
// writes KHR's formula, and where WGSL has no op (`log10`, `cbrt`) its own.
//
// Layout. Uniform inputs and literal slots each take one vec4 slot of one
// uniform block (std140 has the same layout, so GLSL shares the values
// array). Every other input is a parameter of the function, in declaration
// order: the linker gives it a source (per feature, per vertex, per
// fragment). Every equation is one `let`, and every line carries its
// equation's id in a trailing comment and in `sourceMap`.

import { OPS } from "./ops.ts";
import {
  width,
  type Eqn,
  type Program,
  type Type,
  type Value,
} from "./types.ts";

/** One slot of the uniform block. */
export interface UniformSlot {
  /** An input's name, or a literal's slot name. */
  readonly name: string;
  readonly kind: "input" | "literal";
  readonly type: Type;
  /** Index of the vec4 in the block. */
  readonly index: number;
}

export interface EmitOptions {
  /** The function's name, before `prefix`. Default `cir_main`. */
  readonly fn?: string;
  /**
   * Put before every name the module declares (the uniform block's struct and
   * variable, the output struct and the function), so two emitted programs
   * can share one module. Default "". The uniform block's `group` and
   * `binding` are the caller's to keep apart.
   */
  readonly prefix?: string;
  /** The uniform block's `@group` and `@binding`. Default 0 and 0. */
  readonly group?: number;
  readonly binding?: number;
}

export interface EmittedWgsl {
  /** Declarations (uniform block, output struct) and the function. */
  readonly code: string;
  /** The function's name, with the prefix. */
  readonly fn: string;
  /** The output struct's name, with the prefix. */
  readonly outStruct: string;
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

const WGSL_TYPE: Record<Type, string> = {
  bool: "bool",
  int: "i32",
  float: "f32",
  float2: "vec2f",
  float3: "vec3f",
  float4: "vec4f",
};

const LANES = "xyzw";
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** The shortest decimal that reads back as the same float32. */
export function f32Literal(x: number): string {
  if (!Number.isFinite(x)) {
    throw new RangeError(`${x} can't be a WGSL literal`);
  }
  const r = Math.fround(x);
  if (!Number.isFinite(r)) {
    throw new RangeError(`${x} is outside float32's range`);
  }
  let s = "";
  for (let digits = 1; digits <= 9; digits++) {
    s = r.toPrecision(digits);
    if (Math.fround(Number(s)) === r) {
      break;
    }
  }
  // toPrecision may give "1.0e+21"; WGSL wants "1.0e21".
  s = String(Number(s)).replace("e+", "e");
  if (Object.is(r, -0)) {
    return "-0.0";
  }
  return /[.e]/.test(s) ? s : `${s}.0`;
}

function valueText(type: Type, v: Value): string {
  if (typeof v === "boolean") {
    return String(v);
  }
  if (typeof v === "number") {
    return f32Literal(v);
  }
  return `${WGSL_TYPE[type]}(${v.map(f32Literal).join(", ")})`;
}

const INFIX: Record<string, string> = {
  "math/add": "+",
  "math/sub": "-",
  "math/mul": "*",
  "math/div": "/",
  "math/rem": "%",
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
  "math/saturate": "saturate",
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
  "math/atan2": "atan2",
  "math/length": "length",
  "math/cross": "cross",
};

/** The right-hand side of one equation, on operand names `a`. */
function rhs(e: Eqn, a: readonly string[], argTypes: readonly Type[]): string {
  const T = WGSL_TYPE[e.type];
  const k = (n: number) => `${T}(${f32Literal(n)})`;
  const infix = INFIX[e.op];
  if (infix) {
    return `(${a[0]} ${infix} ${a[1]})`;
  }
  const builtin = BUILTIN[e.op];
  if (builtin) {
    return `${builtin}(${a.join(", ")})`;
  }
  switch (e.op) {
    case "math/neg":
      return `(-${a[0]})`;
    case "math/not":
      return `(!${a[0]})`;
    // Half away from zero (WGSL's round is half to even). trunc(x) plus
    // trunc of twice the fraction: exact in float32, and the sign of zero
    // follows trunc.
    case "math/round":
      return `(trunc(${a[0]}) + trunc((${a[0]} - trunc(${a[0]})) * ${k(2)}))`;
    // The built-ins cancel near zero (Metal's sinh(-1e-7) is 50% off), so a
    // short series takes over where it is exact to float32.
    case "math/sinh": {
      const x2 = `(${a[0]} * ${a[0]})`;
      const series = `(${a[0]} * (${k(1)} + ${x2} / ${k(6)} * (${k(1)} + ${x2} / ${k(20)} * (${k(1)} + ${x2} / ${k(42)}))))`;
      return `select(sinh(${a[0]}), ${series}, abs(${a[0]}) < ${k(0.5)})`;
    }
    case "math/tanh": {
      const x2 = `(${a[0]} * ${a[0]})`;
      const series = `(${a[0]} * (${k(1)} - ${x2} / ${k(3)} * (${k(1)} - ${k(2)} * ${x2} / ${k(5)} * (${k(1)} - ${k(17)} * ${x2} / ${k(42)}))))`;
      return `select(tanh(${a[0]}), ${series}, abs(${a[0]}) < ${k(0.1)})`;
    }
    case "math/log10":
      return `(log(${a[0]}) * ${k(0.4342944819032518)})`;
    case "math/cbrt":
      return `(sign(${a[0]}) * pow(abs(${a[0]}), ${k(1 / 3)}))`;
    // pow(x, 0) is 1; a negative base takes the sign of an odd integer power.
    case "math/pow": {
      const odd = `(${a[0]} < ${k(0)}) & (fract(${a[1]} * ${k(0.5)}) != ${k(0)})`;
      const sgn = `select(${k(1)}, ${k(-1)}, ${odd})`;
      return `select(pow(abs(${a[0]}), ${a[1]}) * ${sgn}, ${k(1)}, ${a[1]} == ${k(0)})`;
    }
    // Reversed bounds are allowed.
    case "math/clamp":
      return `min(max(${a[0]}, min(${a[1]}, ${a[2]})), max(${a[1]}, ${a[2]}))`;
    // (1 - t) a + t b, in that form.
    case "math/mix":
      return `((${k(1)} - ${a[2]}) * ${a[0]} + ${a[2]} * ${a[1]})`;
    // KHR's ramp always rises, whichever edge is larger.
    case "math/smoothStep": {
      const t = `clamp((${a[2]} - min(${a[0]}, ${a[1]})) / abs(${a[1]} - ${a[0]}), ${k(0)}, ${k(1)})`;
      return `(${t} * ${t} * (${k(3)} - ${k(2)} * ${t}))`;
    }
    // WGSL's select takes (false, true, condition).
    case "math/select":
      return `select(${a[2]}, ${a[1]}, ${a[0]})`;
    // Zero length (or a float32 overflow of it): zero components.
    case "math/normalize":
      return argTypes[0] === "float"
        ? `select(0.0, ${a[0]} / abs(${a[0]}), ${a[0]} != 0.0)`
        : `select(${k(0)}, ${a[0]} / length(${a[0]}), length(${a[0]}) > 0.0)`;
    case "math/dot":
      return argTypes[0] === "float"
        ? `(${a[0]} * ${a[1]})`
        : `dot(${a[0]}, ${a[1]})`;
    case "type/boolToFloat":
      return `select(0.0, 1.0, ${a[0]})`;
    case "type/intToFloat":
      return `f32(${a[0]})`;
    default:
      break;
  }
  if (e.op.startsWith("math/combine")) {
    return `${T}(${a.join(", ")})`;
  }
  if (e.op.startsWith("math/extract")) {
    return `${a[0]}.${LANES[e.index!]}`;
  }
  throw new Error(`the WGSL emitter has no form for '${e.op}'`);
}

/** The uniform block's slots: inputs at the uniform rate, then literals. */
export function uniformSlots(p: Program): UniformSlot[] {
  const slots: UniformSlot[] = [];
  for (const input of p.inputs) {
    if (input.rate === "uniform") {
      slots.push({
        name: input.name,
        kind: "input",
        type: input.type,
        index: slots.length,
      });
    }
  }
  for (const e of p.eqns) {
    if (
      e.op === "literal" &&
      !slots.some((s) => s.kind === "literal" && s.name === e.slot)
    ) {
      slots.push({
        name: e.slot!,
        kind: "literal",
        type: e.type,
        index: slots.length,
      });
    }
  }
  return slots;
}

/** The uniform block's contents: `values` for the inputs, the program's own literals. */
export function packUniforms(
  p: Program,
  values: Readonly<Record<string, Value>>,
): Float32Array {
  const slots = uniformSlots(p);
  const out = new Float32Array(slots.length * 4);
  for (const s of slots) {
    let v: Value | undefined;
    if (s.kind === "input") {
      v = values[s.name];
      if (v === undefined) {
        throw new Error(`uniform '${s.name}' has no value`);
      }
    } else {
      v = p.eqns.find((e) => e.op === "literal" && e.slot === s.name)!.value!;
    }
    const lanes =
      typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : v;
    out.set(lanes, s.index * 4);
  }
  return out;
}

const ident = (name: string) => `in_${name.replace(/[^A-Za-z0-9_]/g, "_")}`;

/** WGSL for `p`: a uniform block, an output struct and one function. */
export function emitWgsl(p: Program, options: EmitOptions = {}): EmittedWgsl {
  const prefix = options.prefix ?? "";
  if (prefix !== "" && !IDENT.test(prefix)) {
    throw new Error(`'${prefix}' can't start a WGSL name`);
  }
  const fn = `${prefix}${options.fn ?? "cir_main"}`;
  if (!IDENT.test(fn) || fn.startsWith("__")) {
    throw new Error(`'${fn}' isn't a function name`);
  }
  const block = `${prefix}CirUniforms`;
  const blockVar = `${prefix}cir_u`;
  const outStruct = `${prefix}CirOut`;
  for (const o of p.outputs) {
    if (!IDENT.test(o.name)) {
      throw new Error(`output '${o.name}' isn't a WGSL field name`);
    }
  }
  const uniforms = uniformSlots(p);
  const params = p.inputs
    .filter((i) => i.rate !== "uniform")
    .map((i) => ({ name: i.name, type: i.type }));
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
        ? `i32(${lanes})`
        : lanes;
  };

  if (uniforms.length > 0) {
    emit(`struct ${block} { k: array<vec4f, ${uniforms.length}> }`);
    emit(
      `@group(${options.group ?? 0}) @binding(${options.binding ?? 0}) var<uniform> ${blockVar}: ${block};`,
    );
  }
  emit(
    `struct ${outStruct} { ${outputs.map((o) => `${o.name}: ${WGSL_TYPE[o.type]}`).join(", ")} }`,
  );
  emit(
    `fn ${fn}(${params.map((q) => `${ident(q.name)}: ${WGSL_TYPE[q.type]}`).join(", ")}) -> ${outStruct} {`,
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
    emit(`  let v${id} = ${text};`, id);
  });
  emit(
    `  return ${outStruct}(${p.outputs.map((o) => `v${o.id}`).join(", ")});`,
  );
  emit("}");
  return {
    code: lines.join("\n"),
    fn,
    outStruct,
    uniforms,
    params,
    outputs,
    sourceMap,
  };
}

/** Lanes a value of `type` takes in a flat float32 buffer. */
const stride = (types: readonly Type[]): number =>
  types.reduce((n, t) => n + width(t), 0);

/**
 * A complete compute module around `emitWgsl`'s function, for the readback
 * test. Group 0: the uniform block at binding 0 (when there is one), the
 * per-row inputs (every non-uniform input's lanes, row by row, bools and
 * ints as float32) at binding 1, and the outputs (the same way) at binding 2.
 * One invocation per row; there are no loops.
 */
export function emitWgslKernel(
  p: Program,
  options: { readonly workgroupSize?: number } = {},
): EmittedWgsl & {
  readonly inStride: number;
  readonly outStride: number;
  readonly entry: string;
} {
  const e = emitWgsl(p);
  const inStride = stride(e.params.map((q) => q.type));
  const outStride = stride(e.outputs.map((o) => o.type));
  const load: string[] = [];
  let off = 0;
  for (const q of e.params) {
    const n = width(q.type);
    const base = off;
    const at = (j: number) => `cir_in[i * ${inStride}u + ${base + j}u]`;
    const lanes = Array.from({ length: n }, (_, j) => at(j)).join(", ");
    load.push(
      q.type === "bool"
        ? `${at(0)} != 0.0`
        : q.type === "int"
          ? `i32(${at(0)})`
          : n === 1
            ? at(0)
            : `${WGSL_TYPE[q.type]}(${lanes})`,
    );
    off += n;
  }
  const store: string[] = [];
  off = 0;
  for (const o of e.outputs) {
    const n = width(o.type);
    for (let j = 0; j < n; j++) {
      const lane = n === 1 ? `r.${o.name}` : `r.${o.name}.${LANES[j]}`;
      store.push(
        `  cir_out[i * ${outStride}u + ${off + j}u] = ${
          o.type === "bool"
            ? `select(0.0, 1.0, ${lane})`
            : o.type === "int"
              ? `f32(${lane})`
              : lane
        };`,
      );
    }
    off += n;
  }
  const size = options.workgroupSize ?? 64;
  const code = [
    e.code,
    `@group(0) @binding(1) var<storage, read> cir_in: array<f32>;`,
    `@group(0) @binding(2) var<storage, read_write> cir_out: array<f32>;`,
    `@compute @workgroup_size(${size}) fn cir_kernel(@builtin(global_invocation_id) gid: vec3u) {`,
    `  let i = gid.x;`,
    `  if (i >= arrayLength(&cir_out) / ${Math.max(outStride, 1)}u) { return; }`,
    `  let r = ${e.fn}(${load.join(", ")});`,
    ...store,
    `}`,
  ].join("\n");
  return { ...e, code, inStride, outStride, entry: "cir_kernel" };
}
