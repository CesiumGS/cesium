// Spike (a): WGSL and GLSL ES 3.00 from one program. Uniform inputs (the
// program's own and hoisted literals) each take one vec4 slot of a uniform
// block, which is std140-compatible in GLSL and matches WGSL's uniform
// layout. Other inputs are the function's parameters; the linker gives them
// their per-feature, per-vertex or per-fragment sources.

import { width, type Eqn, type Program, type Type } from "./cir.ts";

export type Target = "wgsl" | "glsl";

export interface Emitted {
  /** Declarations (uniform block, output struct) and the function. */
  readonly code: string;
  /** Uniform input name to its vec4 slot. */
  readonly slots: Record<string, number>;
  /** The function's parameters, in order. */
  readonly params: readonly { name: string; type: Type }[];
}

const TYPES: Record<Target, Record<Type, string>> = {
  wgsl: {
    bool: "bool",
    int: "i32",
    float: "f32",
    float2: "vec2f",
    float3: "vec3f",
    float4: "vec4f",
  },
  glsl: {
    bool: "bool",
    int: "int",
    float: "float",
    float2: "vec2",
    float3: "vec3",
    float4: "vec4",
  },
};

function num(x: number): string {
  if (!Number.isFinite(x)) {
    throw new Error(`spike: ${x} can't be a shader literal`);
  }
  // Shortest round trip in float64, then as a float literal of both languages.
  let s = String(x);
  if (!/[.e]/.test(s)) {
    s += ".0";
  }
  return x < 0 ? `(${s})` : s;
}

const SWIZZLE = "xyzw";

export function emit(p: Program, target: Target, fnName = "cir_main"): Emitted {
  const T = TYPES[target];
  const slots: Record<string, number> = {};
  const params: { name: string; type: Type }[] = [];
  for (const input of p.inputs) {
    if (input.rate === "uniform") {
      slots[input.name] = Object.keys(slots).length;
    }
  }
  const ident = (name: string) => `in_${name.replace(/[^A-Za-z0-9_]/g, "_")}`;
  const literal = (e: Eqn): string => {
    const v = e.value!;
    if (typeof v === "boolean") {
      return String(v);
    }
    if (typeof v === "number") {
      return num(v);
    }
    return `${T[e.type]}(${v.map(num).join(", ")})`;
  };
  const expr: string[] = [];
  const lines: string[] = [];
  const ref = (id: number) => expr[id]!;
  p.eqns.forEach((e, id) => {
    const a = e.args.map(ref);
    let rhs: string;
    switch (e.op) {
      case "const":
      case "literal":
        expr[id] = literal(e);
        return;
      case "input": {
        const input = p.inputs[e.index!]!;
        if (input.rate === "uniform") {
          const n = width(input.type);
          const lanes = n === 1 ? ".x" : `.${SWIZZLE.slice(0, n)}`;
          expr[id] = `cir_u.k[${slots[input.name]}]${lanes}`;
        } else {
          if (!params.some((q) => q.name === input.name)) {
            params.push({ name: input.name, type: input.type });
          }
          expr[id] = ident(input.name);
        }
        return;
      }
      default:
        rhs = call(e, a, target);
    }
    const v = `v${id}`;
    lines.push(
      target === "wgsl"
        ? `  let ${v} = ${rhs};`
        : `  ${T[e.type]} ${v} = ${rhs};`,
    );
    expr[id] = v;
  });

  const nUniforms = Object.keys(slots).length;
  const out = p.outputs;
  const decl: string[] = [];
  if (target === "wgsl") {
    if (nUniforms > 0) {
      decl.push(`struct CirUniforms { k: array<vec4f, ${nUniforms}> }`);
      decl.push(
        `@group(CIR_GROUP) @binding(CIR_BINDING) var<uniform> cir_u: CirUniforms;`,
      );
    }
    decl.push(
      `struct CirOut { ${out.map((o) => `${o.name}: ${T[p.eqns[o.id]!.type]}`).join(", ")} }`,
    );
    const sig = params.map((q) => `${ident(q.name)}: ${T[q.type]}`).join(", ");
    decl.push(`fn ${fnName}(${sig}) -> CirOut {`);
    decl.push(...lines);
    decl.push(`  return CirOut(${out.map((o) => ref(o.id)).join(", ")});`, "}");
  } else {
    if (nUniforms > 0) {
      decl.push(
        `layout(std140) uniform CirUniforms { vec4 k[${nUniforms}]; } cir_u;`,
      );
    }
    decl.push(
      `struct CirOut { ${out.map((o) => `${T[p.eqns[o.id]!.type]} ${o.name};`).join(" ")} };`,
    );
    const sig = params.map((q) => `${T[q.type]} ${ident(q.name)}`).join(", ");
    decl.push(`CirOut ${fnName}(${sig}) {`);
    decl.push(...lines);
    decl.push(`  return CirOut(${out.map((o) => ref(o.id)).join(", ")});`, "}");
  }
  return { code: decl.join("\n"), slots, params };
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

/** Same name and operand order in WGSL and GLSL. */
const SAME = new Set([
  "abs",
  "sign",
  "trunc",
  "floor",
  "ceil",
  "fract",
  "sqrt",
  "exp",
  "log",
  "log2",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "tanh",
  "min",
  "max",
  "pow",
  "mix",
  "length",
  "normalize",
  "dot",
  "cross",
]);

function call(e: Eqn, a: readonly string[], target: Target): string {
  const glsl = target === "glsl";
  const T = TYPES[target];
  const infix = INFIX[e.op];
  if (infix) {
    return `(${a[0]} ${infix} ${a[1]})`;
  }
  const name = e.op.slice(e.op.indexOf("/") + 1);
  if (SAME.has(name)) {
    return `${name}(${a.join(", ")})`;
  }
  switch (e.op) {
    case "math/neg":
      return `(-${a[0]})`;
    case "math/not":
      return `(!${a[0]})`;
    case "math/round":
      // KHR: half away from zero (WGSL's round is half to even).
      return `(sign(${a[0]}) * floor(abs(${a[0]}) + 0.5))`;
    case "math/saturate":
      return glsl ? `clamp(${a[0]}, 0.0, 1.0)` : `saturate(${a[0]})`;
    case "math/log10":
      return `(log(${a[0]}) * 0.4342944819032518)`;
    case "math/cbrt":
      return `(sign(${a[0]}) * pow(abs(${a[0]}), ${T[e.type]}(1.0 / 3.0)))`;
    case "math/rem":
      // Truncated, as JavaScript's and WGSL's `%`; GLSL's mod() is floored.
      return glsl
        ? `(${a[0]} - ${a[1]} * trunc(${a[0]} / ${a[1]}))`
        : `(${a[0]} % ${a[1]})`;
    case "math/atan2":
      return glsl ? `atan(${a[0]}, ${a[1]})` : `atan2(${a[0]}, ${a[1]})`;
    case "math/clamp":
      // KHR allows reversed bounds; WGSL's and GLSL's clamp don't.
      return `min(max(${a[0]}, min(${a[1]}, ${a[2]})), max(${a[1]}, ${a[2]}))`;
    case "math/smoothStep": {
      // KHR's rising ramp, whichever edge is larger (not the shading languages').
      const t = `clamp((${a[2]} - min(${a[0]}, ${a[1]})) / abs(${a[1]} - ${a[0]}), ${T[e.type]}(0.0), ${T[e.type]}(1.0))`;
      return `(${t} * ${t} * (3.0 - 2.0 * ${t}))`;
    }
    case "math/select":
      return glsl
        ? `(${a[0]} ? ${a[1]} : ${a[2]})`
        : `select(${a[2]}, ${a[1]}, ${a[0]})`;
    case "type/boolToFloat":
      return glsl ? `float(${a[0]})` : `f32(${a[0]})`;
    default:
      break;
  }
  if (e.op.startsWith("math/combine")) {
    return `${T[e.type === "float" ? "float" : e.type]}(${a.join(", ")})`;
  }
  if (e.op.startsWith("math/extract")) {
    return `${a[0]}.${SWIZZLE[e.index!]}`;
  }
  throw new Error(`spike: no ${target} for '${e.op}'`);
}
