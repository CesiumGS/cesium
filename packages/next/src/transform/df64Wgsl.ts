// Double-float (df64) arithmetic in WGSL and an IR emitter for it (plan
// 2026-11-12, task 4): a value is a vec2f (hi, lo), hi + lo with |lo| at most
// half an ulp of hi, about 48 bits of significand. The compiler's per-frame
// centre-constant pass evaluates a smooth function there (a position on the
// Earth to 1e-7 m, a projection's easting to a micrometre) where float32
// would be off by metres. The same building blocks as shaders/exactSum.slang
// and warpFitDf64.slang (Knuth's two-sum, Veltkamp-split two-product, no fma),
// which need the compiler to keep the order of float operations.
//
// Accuracy, with the range of arguments each is meant for:
// - add, sub, mul, div, sqrt: about 1e-14 relative.
// - sin, cos, tan: argument reduction by π/2 in df64, then a Taylor series:
//   1e-14 relative plus 4e-15 · |argument| absolute (an angle of a few
//   hundred radians keeps 1e-12).
// - exp, sinh, cosh, tanh: reduction by ln 2 and a series, 1e-14 relative.
// - log: one Halley step from the float32 log, 1e-14 relative.
// - atan2, atan, asin, acos: a float32 atan2 corrected by the angle between
//   the argument and it (sin and cos of that float32 in df64), 1e-14 absolute.
// - pow with a variable exponent: exp(b log a), a > 0, 1e-13 relative.
// - floor, comparisons, min, max: exact on (hi, lo).
// Beyond the ranges (exp of more than 80, an angle of 1e5 radians) results
// degrade or overflow to inf as float32 does.
import { splitDf64 } from "../math/transforms.ts";
import type { IrNode } from "./ir.ts";

/** x as (hi, lo), float32 each: hi + lo is x to 48 bits (`splitDf64`). */
export function splitDouble(x: number): [number, number] {
  return splitDf64(x);
}

/** A float32 as a WGSL literal. */
export function f32Literal(value: number): string {
  const f32 = Math.fround(value);
  if (!Number.isFinite(f32)) {
    throw new RangeError(`cannot emit the constant ${value} in f32`);
  }
  let text = String(Number(f32.toPrecision(9)));
  if (!/[.e]/.test(text)) {
    text += ".0";
  }
  return text;
}

/** x as a WGSL `vec2f(hi, lo)` literal. */
export function df64Literal(value: number): string {
  const [hi, lo] = splitDouble(value);
  return `vec2f(${f32Literal(hi)}, ${f32Literal(lo)})`;
}

function inverseFactorial(n: number): number {
  let f = 1n;
  for (let k = 2n; k <= BigInt(n); k++) {
    f *= k;
  }
  return 1 / Number(f);
}

/** Series coefficients by degree index: the coefficient of x^(step·k + offset). */
function series(count: number, term: (k: number) => number): number[] {
  return Array.from({ length: count }, (_, k) => term(k));
}

/** `acc = c[n]; acc = acc · x + c[n-1]; …; acc = acc · x + c[0]` in df64. */
function horner(
  acc: string,
  x: string,
  coefficients: readonly number[],
): string {
  const n = coefficients.length - 1;
  const lines = [`  ${acc} = ${df64Literal(coefficients[n]!)};`];
  for (let k = n - 1; k >= 0; k--) {
    lines.push(
      `  ${acc} = df_add(df_mul(${acc}, ${x}), ${df64Literal(coefficients[k]!)});`,
    );
  }
  return lines.join("\n");
}

const SIN_COEFFICIENTS = series(
  10,
  (k) => (k % 2 ? -1 : 1) * inverseFactorial(2 * k + 1),
);
const COS_COEFFICIENTS = series(
  10,
  (k) => (k % 2 ? -1 : 1) * inverseFactorial(2 * k),
);
const EXP_COEFFICIENTS = series(15, (k) => inverseFactorial(k));
const SINH_COEFFICIENTS = series(9, (k) => inverseFactorial(2 * k + 1));

/** The df64 library as WGSL text (functions prefixed `df_`); include once per module. */
export const DF64_CORE_WGSL = `
// ---- df64: (hi, lo) pairs in a vec2f ----
fn df_twoSum(a: f32, b: f32) -> vec2f {
  var s: f32 = a + b;
  var v: f32 = s - a;
  return vec2f(s, (a - (s - v)) + (b - v));
}

fn df_quick(a: f32, b: f32) -> vec2f {
  var s: f32 = a + b;
  return vec2f(s, b - (s - a));
}

fn df_highHalf(a: f32) -> f32 {
  var c: f32 = 4097.0 * a;
  return c - (c - a);
}

fn df_twoProd(a: f32, b: f32) -> vec2f {
  var p: f32 = a * b;
  var ah: f32 = df_highHalf(a);
  var al: f32 = a - ah;
  var bh: f32 = df_highHalf(b);
  var bl: f32 = b - bh;
  return vec2f(p, ah * bh - p + ah * bl + al * bh + al * bl);
}

fn df_add(a: vec2f, b: vec2f) -> vec2f {
  var s: vec2f = df_twoSum(a.x, b.x);
  var t: vec2f = df_twoSum(a.y, b.y);
  var u: vec2f = df_quick(s.x, s.y + t.x);
  return df_quick(u.x, u.y + t.y);
}

fn df_sub(a: vec2f, b: vec2f) -> vec2f {
  return df_add(a, -b);
}

fn df_mul(a: vec2f, b: vec2f) -> vec2f {
  var p: vec2f = df_twoProd(a.x, b.x);
  return df_quick(p.x, p.y + (a.x * b.y + a.y * b.x));
}
`;

/** The whole df64 library as WGSL text (functions prefixed `df_`); include once per module. */
export const DF64_WGSL = `${DF64_CORE_WGSL}
fn df_addf(a: vec2f, b: f32) -> vec2f {
  var s: vec2f = df_twoSum(a.x, b);
  return df_quick(s.x, s.y + a.y);
}

fn df_mulf(a: vec2f, b: f32) -> vec2f {
  var p: vec2f = df_twoProd(a.x, b);
  return df_quick(p.x, p.y + a.y * b);
}

fn df_sqr(a: vec2f) -> vec2f {
  return df_mul(a, a);
}

fn df_div(a: vec2f, b: vec2f) -> vec2f {
  var q1: f32 = a.x / b.x;
  var r: vec2f = df_sub(a, df_mulf(b, q1));
  var q2: f32 = r.x / b.x;
  r = df_sub(r, df_mulf(b, q2));
  var q3: f32 = r.x / b.x;
  return df_addf(df_quick(q1, q2), q3);
}

fn df_sqrt(a: vec2f) -> vec2f {
  if (a.x <= 0.0) {
    return vec2f(0.0);
  }
  var y: f32 = sqrt(a.x);
  var d: vec2f = df_sub(a, df_twoProd(y, y));
  return df_quick(y, d.x / (2.0 * y));
}

fn df_lt(a: vec2f, b: vec2f) -> bool {
  return a.x < b.x || (a.x == b.x && a.y < b.y);
}

fn df_eq(a: vec2f, b: vec2f) -> bool {
  return a.x == b.x && a.y == b.y;
}

fn df_flag(b: bool) -> vec2f {
  return vec2f(select(0.0, 1.0, b), 0.0);
}

fn df_sign(a: vec2f) -> f32 {
  return select(sign(a.y), sign(a.x), a.x != 0.0);
}

fn df_floor(a: vec2f) -> vec2f {
  var f: f32 = floor(a.x);
  return vec2f(f - select(0.0, 1.0, a.x == f && a.y < 0.0), 0.0);
}

// sin x and cos x as (sin hi, sin lo, cos hi, cos lo): reduce by pi/2, then series.
fn df_sincos(x: vec2f) -> vec4f {
  var k: f32 = round(x.x * 0.636619772);
  var r: vec2f = df_sub(x, df_mulf(${df64Literal(Math.PI / 2)}, k));
  var r2: vec2f = df_sqr(r);
  var s: vec2f;
  var c: vec2f;
${horner("s", "r2", SIN_COEFFICIENTS)}
${horner("c", "r2", COS_COEFFICIENTS)}
  s = df_mul(s, r);
  var q: i32 = i32(k) & 3;
  if (q == 0) {
    return vec4f(s, c);
  }
  if (q == 1) {
    return vec4f(c, -s);
  }
  if (q == 2) {
    return vec4f(-s, -c);
  }
  return vec4f(-c, s);
}

fn df_exp(x: vec2f) -> vec2f {
  if (x.x < -87.0) {
    return vec2f(0.0);
  }
  var k: f32 = round(x.x * 1.44269504);
  var r: vec2f = df_sub(x, df_mulf(${df64Literal(Math.LN2)}, k));
  var p: vec2f;
${horner("p", "r", EXP_COEFFICIENTS)}
  var scale: f32 = bitcast<f32>(u32(i32(k) + 127) << 23u);
  return p * scale;
}

fn df_log(a: vec2f) -> vec2f {
  var y0: f32 = log(a.x);
  var e: vec2f = df_exp(vec2f(y0, 0.0));
  var t: vec2f = df_div(df_sub(a, e), df_add(a, e));
  return df_add(vec2f(y0, 0.0), df_mulf(t, 2.0));
}

// The angle of the point (x, y): atan2 in float32, then the small angle left.
fn df_atan2(y: vec2f, x: vec2f) -> vec2f {
  if (y.x == 0.0 && x.x == 0.0) {
    return vec2f(0.0);
  }
  var t0: f32 = atan2(y.x, x.x);
  var sc: vec4f = df_sincos(vec2f(t0, 0.0));
  var num: vec2f = df_sub(df_mul(y, sc.zw), df_mul(x, sc.xy));
  var den: vec2f = df_add(df_mul(x, sc.zw), df_mul(y, sc.xy));
  var t: vec2f = df_div(num, den);
  var t2: vec2f = df_sqr(t);
  var t3: vec2f = df_mul(t2, t);
  var d: vec2f = df_add(t, df_mulf(t3, -0.333333343));
  d = df_addf(d, t3.x * t2.x * 0.2);
  return df_add(vec2f(t0, 0.0), d);
}

// sinh x and cosh x as (sinh hi, sinh lo, cosh hi, cosh lo).
fn df_sinhcosh(x: vec2f) -> vec4f {
  var e: vec2f = df_exp(x);
  var inv: vec2f = df_div(vec2f(1.0, 0.0), e);
  var ch: vec2f = df_mulf(df_add(e, inv), 0.5);
  var sh: vec2f;
  if (abs(x.x) < 0.5) {
    var x2: vec2f = df_sqr(x);
    var p: vec2f;
${horner("p", "x2", SINH_COEFFICIENTS)}
    sh = df_mul(p, x);
  } else {
    sh = df_mulf(df_sub(e, inv), 0.5);
  }
  return vec4f(sh, ch);
}

fn df_pow(a: vec2f, b: vec2f) -> vec2f {
  return df_exp(df_mul(b, df_log(a)));
}
`;

/** How an emitted program reads its inputs, as WGSL expressions of type vec2f. */
export interface Df64Inputs {
  pos(axis: number): string;
  param(name: string): string;
}

/**
 * df64 WGSL statements for `nodes` (a program's nodes, in order): each
 * computed node becomes `var <prefix><id>: vec2f`. `ref(id)` is the
 * expression for a node's value (constants and inputs inline). Booleans are
 * 0 and 1 in the hi part.
 */
export function emitDf64(
  nodes: readonly IrNode[],
  inputs: Df64Inputs,
  prefix: string,
): { lines: string[]; ref: (id: number) => string } {
  const ref = (id: number): string => {
    const node = nodes[id]!;
    switch (node.op) {
      case "const":
        return df64Literal(node.value);
      case "pos":
        return inputs.pos(node.value);
      case "param":
        return inputs.param(node.name);
      default:
        return `${prefix}${id}`;
    }
  };
  const lines: string[] = [];
  const cached = new Map<string, string>();
  const shared = (kind: string, arg: number, call: string): string => {
    const name = `${prefix}${kind}${arg}`;
    if (!cached.has(name)) {
      lines.push(`  var ${name}: vec4f = ${call}(${ref(arg)});`);
      cached.set(name, name);
    }
    return name;
  };
  const zero = "vec2f(0.0)";
  nodes.forEach((node, id) => {
    if (node.op === "const" || node.op === "pos" || node.op === "param") {
      return;
    }
    const [a, b, c] = node.args;
    const A = ref(a!);
    const B = b === undefined ? "" : ref(b);
    const C = c === undefined ? "" : ref(c);
    let e: string;
    switch (node.op) {
      case "add":
        e = `df_add(${A}, ${B})`;
        break;
      case "sub":
        e = `df_sub(${A}, ${B})`;
        break;
      case "mul":
        e = `df_mul(${A}, ${B})`;
        break;
      case "div":
        e = `df_div(${A}, ${B})`;
        break;
      case "neg":
        e = `-${A}`;
        break;
      case "sqrt":
        e = `df_sqrt(${A})`;
        break;
      case "abs":
        e = `select(${A}, -${A}, df_lt(${A}, ${zero}))`;
        break;
      case "min":
        e = `select(${B}, ${A}, df_lt(${A}, ${B}))`;
        break;
      case "max":
        e = `select(${B}, ${A}, df_lt(${B}, ${A}))`;
        break;
      case "floor":
        e = `df_floor(${A})`;
        break;
      case "ceil":
        e = `-df_floor(-${A})`;
        break;
      case "fract":
        e = `df_sub(${A}, df_floor(${A}))`;
        break;
      case "sign":
        e = `vec2f(df_sign(${A}), 0.0)`;
        break;
      case "lt":
        e = `df_flag(df_lt(${A}, ${B}))`;
        break;
      case "le":
        e = `df_flag(!df_lt(${B}, ${A}))`;
        break;
      case "gt":
        e = `df_flag(df_lt(${B}, ${A}))`;
        break;
      case "ge":
        e = `df_flag(!df_lt(${A}, ${B}))`;
        break;
      case "eq":
        e = `df_flag(df_eq(${A}, ${B}))`;
        break;
      case "ne":
        e = `df_flag(!df_eq(${A}, ${B}))`;
        break;
      case "and":
        e = `df_flag(${A}.x != 0.0 && ${B}.x != 0.0)`;
        break;
      case "or":
        e = `df_flag(${A}.x != 0.0 || ${B}.x != 0.0)`;
        break;
      case "not":
        e = `df_flag(${A}.x == 0.0)`;
        break;
      case "select":
        e = `select(${C}, ${B}, ${A}.x != 0.0)`;
        break;
      case "sin":
        e = `${shared("sc", a!, "df_sincos")}.xy`;
        break;
      case "cos":
        e = `${shared("sc", a!, "df_sincos")}.zw`;
        break;
      case "tan": {
        const sc = shared("sc", a!, "df_sincos");
        e = `df_div(${sc}.xy, ${sc}.zw)`;
        break;
      }
      case "sinh":
        e = `${shared("sh", a!, "df_sinhcosh")}.xy`;
        break;
      case "cosh":
        e = `${shared("sh", a!, "df_sinhcosh")}.zw`;
        break;
      case "tanh": {
        const sh = shared("sh", a!, "df_sinhcosh");
        e = `df_div(${sh}.xy, ${sh}.zw)`;
        break;
      }
      case "exp":
        e = `df_exp(${A})`;
        break;
      case "log":
        e = `df_log(${A})`;
        break;
      case "atan":
        e = `df_atan2(${A}, vec2f(1.0, 0.0))`;
        break;
      case "atan2":
        e = `df_atan2(${A}, ${B})`;
        break;
      case "asin":
        e = `df_atan2(${A}, df_sqrt(df_sub(vec2f(1.0, 0.0), df_sqr(${A}))))`;
        break;
      case "acos":
        e = `df_atan2(df_sqrt(df_sub(vec2f(1.0, 0.0), df_sqr(${A}))), ${A})`;
        break;
      case "pow": {
        const exponent = nodes[b!]!;
        const n = exponent.op === "const" ? exponent.value : undefined;
        if (n !== undefined && Number.isInteger(n) && Math.abs(n) <= 4) {
          if (n === 0) {
            e = "vec2f(1.0, 0.0)";
          } else {
            const product = Array.from({
              length: Math.abs(n) - 1,
            }).reduce<string>((acc) => `df_mul(${acc}, ${A})`, A);
            e = n > 0 ? product : `df_div(vec2f(1.0, 0.0), ${product})`;
          }
        } else if (n === 0.5) {
          e = `df_sqrt(${A})`;
        } else {
          e = `df_pow(${A}, ${B})`;
        }
        break;
      }
      default:
        throw new Error(`df64: no emitter for op '${node.op}'`);
    }
    lines.push(`  var ${prefix}${id}: vec2f = ${e};`);
  });
  return { lines, ref };
}
