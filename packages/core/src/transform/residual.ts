// Residual evaluation of an IR program (plan 2026-11-12, task 4): the value
// of every node at p = c + δ is held as its value at the draw center c, a
// float64 number computed on the CPU (or in df64), plus the float32 change
// Δ = v(c + δ) - v(c). Each op has a rule giving Δ from its operands' Δ and
// center values with no subtraction of nearly equal numbers, so Δ is as
// accurate relative to itself as float32 allows whatever the size of the
// center values. A position 6.4e6 m from the origin moved by meters, or a
// projection's easting, keeps millimeters:
//   Δ(a b) = a_c Δb + b_c Δa + Δa Δb          (exact algebra)
//   Δ√a = Δa / (√a_c + √(a_c + Δa))
//   Δ sin a = cos a_c sin Δa - 2 sin a_c sin²(Δa / 2)
//   Δ log a = log1p(Δa / a_c),  Δ eˣ = eˣ_c expm1(Δa),
//   Δ atan2(y, x) = atan2(x_c Δy - y_c Δx, |c|² + x_c Δx + y_c Δy), …
// Where float32's builtins are coarse (WGSL allows thousands of ulps for
// sin, atan and exp) the rules use the helpers below: short polynomials for
// the small arguments Δ has, and the builtin only when Δ is large.
//
// Center values the rules read are per-draw constants ("stored"); values of
// nodes that depend on no position are per-view uniforms ("derived", float64
// on the CPU). A stored value that is affine in separable parameters s
// (displacement ∝ factor) is kept as v(0) and its derivative per s, so the
// shader forms v(s) from the uniform s and no per-frame work follows a
// slider move. Branches (select, min, max, abs, floor, comparisons) follow
// the vertex's own side with the crossing term from the center values.
//
// The rules are written once and spelled in either shading language (CS-54):
// `lines` are WGSL, `glslLines()` GLSL ES 3.00, the same statements in the same
// order over the same per-draw and uniform slots, with the helpers below as a
// library in each (`RESIDUAL_WGSL`, `RESIDUAL_GLSL`). Only `select` and the
// declarations differ.
//
// The program is Cesium IR, scalarized: `d<n>` takes its number from
// `numbering`, a lane of the position is `math/extract3` of `p`, and a bool
// is the float 0 or 1 (`type/boolToFloat` is its operand).
import { Builder } from "../ir/builder.ts";
import type { Id, Program } from "../ir/types.ts";
import { f32Literal } from "./df64Wgsl.ts";
import { leafOf, numbering, opOf, through } from "./program.ts";

type NodeId = Id;

/** The float32 helpers the generated residual code calls (names `tg_`); include once per module. */
export const RESIDUAL_WGSL = `
// ---- residual helpers: accurate for small arguments ----
fn tg_sq(x: f32) -> f32 {
  return x * x;
}

fn tg_sin(x: f32) -> f32 {
  if (abs(x) > 1.6) {
    return sin(x);
  }
  let x2 = x * x;
  return x * (1.0 + x2 * (-0.166666672 + x2 * (0.00833333377 + x2 * (-1.98412701e-4 + x2 * (2.75573188e-6 + x2 * (-2.50521079e-8 + x2 * 1.60590444e-10))))));
}

fn tg_cos(x: f32) -> f32 {
  if (abs(x) > 3.2) {
    return cos(x);
  }
  return 1.0 - 2.0 * tg_sq(tg_sin(0.5 * x));
}

fn tg_expm1(x: f32) -> f32 {
  if (abs(x) > 0.5) {
    return exp(x) - 1.0;
  }
  return x * (1.0 + x * (0.5 + x * (0.166666672 + x * (0.0416666679 + x * (0.00833333377 + x * (0.00138888892 + x * (1.98412701e-4 + x * 2.48015876e-5)))))));
}

fn tg_log1p(x: f32) -> f32 {
  if (abs(x) > 0.4) {
    return log(1.0 + x);
  }
  let z = x / (2.0 + x);
  let z2 = z * z;
  return 2.0 * z * (1.0 + z2 * (0.333333343 + z2 * (0.200000003 + z2 * (0.142857149 + z2 * 0.111111112))));
}

fn tg_atan(t: f32) -> f32 {
  if (abs(t) > 2.0) {
    return atan(t);
  }
  let a = t / (1.0 + sqrt(1.0 + t * t));
  let b = a / (1.0 + sqrt(1.0 + a * a));
  let b2 = b * b;
  return 4.0 * b * (1.0 + b2 * (-0.333333343 + b2 * (0.200000003 + b2 * (-0.142857149 + b2 * (0.111111112 + b2 * -0.0909090936)))));
}

fn tg_sinh(x: f32) -> f32 {
  if (abs(x) > 0.5) {
    return 0.5 * (exp(x) - exp(-x));
  }
  let x2 = x * x;
  return x * (1.0 + x2 * (0.166666672 + x2 * (0.00833333377 + x2 * (1.98412701e-4 + x2 * (2.75573188e-6 + x2 * 2.50521079e-8)))));
}

fn tg_cosh(x: f32) -> f32 {
  if (abs(x) > 1.0) {
    return cosh(x);
  }
  return 1.0 + 2.0 * tg_sq(tg_sinh(0.5 * x));
}

// atan(a_c + da) - atan(a_c)
fn tg_atan1(ac: f32, da: f32) -> f32 {
  let den = 1.0 + ac * (ac + da);
  return select(atan(ac + da) - atan(ac), tg_atan(da / den), den > 0.0);
}

// atan2(yc + dy, xc + dx) - nc, where nc = atan2(yc, xc): the angle between the two points.
fn tg_atan2(yc: f32, xc: f32, dy: f32, dx: f32, nc: f32) -> f32 {
  let cross = xc * dy - yc * dx;
  let dotp = xc * xc + yc * yc + xc * dx + yc * dy;
  return select(atan2(yc + dy, xc + dx) - nc, tg_atan(cross / dotp), dotp > 0.0);
}

// min(0, dc + dd) - min(0, dc)
fn tg_min0(dc: f32, dd: f32) -> f32 {
  let v = dc + dd;
  if (dc <= 0.0) {
    return select(-dc, dd, v <= 0.0);
  }
  return select(0.0, v, v <= 0.0);
}

// max(0, dc + dd) - max(0, dc)
fn tg_max0(dc: f32, dd: f32) -> f32 {
  let v = dc + dd;
  if (dc >= 0.0) {
    return select(-dc, dd, v >= 0.0);
  }
  return select(0.0, v, v >= 0.0);
}

// |ac + da| - |ac|
fn tg_abs(ac: f32, da: f32) -> f32 {
  let v = ac + da;
  return select(abs(v) - abs(ac), sign(ac) * da, ac != 0.0 && ((ac > 0.0) == (v > 0.0)));
}

// The change of select(cond, t, f) when cond is fv at the vertex and fc at the center, e = t_c - f_c.
fn tg_select(fv: f32, fc: f32, dt: f32, df: f32, e: f32) -> f32 {
  let tv = fv != 0.0;
  let tc = fc != 0.0;
  if (tv == tc) {
    return select(df, dt, tv);
  }
  return select(dt + e, df - e, tc);
}

fn tg_pow2d(ac: f32, da: f32) -> f32 {
  return da * (2.0 * ac + da);
}

fn tg_pow3d(ac: f32, da: f32) -> f32 {
  let av = ac + da;
  return da * (ac * ac + ac * av + av * av);
}

fn tg_pow4d(ac: f32, da: f32) -> f32 {
  let av = ac + da;
  return da * (ac * ac * ac + ac * ac * av + ac * av * av + av * av * av);
}
`;

/**
 * `RESIDUAL_WGSL` in GLSL ES 3.00: the same helpers, names and statements,
 * with `atan(y, x)` for `atan2` and the ternary for `select`.
 */
export const RESIDUAL_GLSL = `
// ---- residual helpers: accurate for small arguments ----
float tg_sq(float x) {
  return x * x;
}

float tg_sin(float x) {
  if (abs(x) > 1.6) {
    return sin(x);
  }
  float x2 = x * x;
  return x * (1.0 + x2 * (-0.166666672 + x2 * (0.00833333377 + x2 * (-1.98412701e-4 + x2 * (2.75573188e-6 + x2 * (-2.50521079e-8 + x2 * 1.60590444e-10))))));
}

float tg_cos(float x) {
  if (abs(x) > 3.2) {
    return cos(x);
  }
  return 1.0 - 2.0 * tg_sq(tg_sin(0.5 * x));
}

float tg_expm1(float x) {
  if (abs(x) > 0.5) {
    return exp(x) - 1.0;
  }
  return x * (1.0 + x * (0.5 + x * (0.166666672 + x * (0.0416666679 + x * (0.00833333377 + x * (0.00138888892 + x * (1.98412701e-4 + x * 2.48015876e-5)))))));
}

float tg_log1p(float x) {
  if (abs(x) > 0.4) {
    return log(1.0 + x);
  }
  float z = x / (2.0 + x);
  float z2 = z * z;
  return 2.0 * z * (1.0 + z2 * (0.333333343 + z2 * (0.200000003 + z2 * (0.142857149 + z2 * 0.111111112))));
}

float tg_atan(float t) {
  if (abs(t) > 2.0) {
    return atan(t);
  }
  float a = t / (1.0 + sqrt(1.0 + t * t));
  float b = a / (1.0 + sqrt(1.0 + a * a));
  float b2 = b * b;
  return 4.0 * b * (1.0 + b2 * (-0.333333343 + b2 * (0.200000003 + b2 * (-0.142857149 + b2 * (0.111111112 + b2 * -0.0909090936)))));
}

float tg_sinh(float x) {
  if (abs(x) > 0.5) {
    return 0.5 * (exp(x) - exp(-x));
  }
  float x2 = x * x;
  return x * (1.0 + x2 * (0.166666672 + x2 * (0.00833333377 + x2 * (1.98412701e-4 + x2 * (2.75573188e-6 + x2 * 2.50521079e-8)))));
}

float tg_cosh(float x) {
  if (abs(x) > 1.0) {
    return cosh(x);
  }
  return 1.0 + 2.0 * tg_sq(tg_sinh(0.5 * x));
}

// atan(a_c + da) - atan(a_c)
float tg_atan1(float ac, float da) {
  float den = 1.0 + ac * (ac + da);
  return den > 0.0 ? tg_atan(da / den) : atan(ac + da) - atan(ac);
}

// atan2(yc + dy, xc + dx) - nc, where nc = atan2(yc, xc): the angle between the two points.
float tg_atan2(float yc, float xc, float dy, float dx, float nc) {
  float cross = xc * dy - yc * dx;
  float dotp = xc * xc + yc * yc + xc * dx + yc * dy;
  return dotp > 0.0 ? tg_atan(cross / dotp) : atan(yc + dy, xc + dx) - nc;
}

// min(0, dc + dd) - min(0, dc)
float tg_min0(float dc, float dd) {
  float v = dc + dd;
  if (dc <= 0.0) {
    return v <= 0.0 ? dd : -dc;
  }
  return v <= 0.0 ? v : 0.0;
}

// max(0, dc + dd) - max(0, dc)
float tg_max0(float dc, float dd) {
  float v = dc + dd;
  if (dc >= 0.0) {
    return v >= 0.0 ? dd : -dc;
  }
  return v >= 0.0 ? v : 0.0;
}

// |ac + da| - |ac|
float tg_abs(float ac, float da) {
  float v = ac + da;
  return ac != 0.0 && ((ac > 0.0) == (v > 0.0)) ? sign(ac) * da : abs(v) - abs(ac);
}

// The change of select(cond, t, f) when cond is fv at the vertex and fc at the center, e = t_c - f_c.
float tg_select(float fv, float fc, float dt, float df, float e) {
  bool tv = fv != 0.0;
  bool tc = fc != 0.0;
  if (tv == tc) {
    return tv ? dt : df;
  }
  return tc ? df - e : dt + e;
}

float tg_pow2d(float ac, float da) {
  return da * (2.0 * ac + da);
}

float tg_pow3d(float ac, float da) {
  float av = ac + da;
  return da * (ac * ac + ac * av + av * av);
}

float tg_pow4d(float ac, float da) {
  float av = ac + da;
  return da * (ac * ac * ac + ac * ac * av + ac * av * av + av * av * av);
}
`;

/** A shading language the residual rules are spelled in. */
export type ShadingLanguage = "wgsl" | "glsl";

/** `select(whenFalse, whenTrue, cond)` in `lang`. */
function choose(
  lang: ShadingLanguage,
  whenFalse: string,
  whenTrue: string,
  cond: string,
): string {
  return lang === "wgsl"
    ? `select(${whenFalse}, ${whenTrue}, ${cond})`
    : `(${cond} ? ${whenTrue} : ${whenFalse})`;
}

const COMPOSITES = new Set([
  "math/clamp",
  "math/saturate",
  "math/mix",
  "math/smoothStep",
]);
const FLAGS = new Set([
  "math/lt",
  "math/le",
  "math/gt",
  "math/ge",
  "math/eq",
  "math/and",
  "math/or",
  "math/not",
]);
const COMPARE_TEST: Record<string, string> = {
  "math/lt": "< 0.0",
  "math/le": "<= 0.0",
  "math/gt": "> 0.0",
  "math/ge": ">= 0.0",
  "math/eq": "== 0.0",
};

/**
 * KHR_interactivity's formula for a composite op, in the other ops: `clamp`
 * with reversed bounds allowed, `mix` as (1 - t) a + t b, and `smoothStep`'s
 * rising ramp. With constant bounds or edges, their min and max fold.
 */
function expandComposite(b: Builder, op: string, args: readonly Id[]): Id {
  const [x, y, z] = args as [Id, Id, Id];
  const k = (v: number) => b.const(v);
  const f = (name: string, ...a: Id[]) => opOf(b, name, a);
  const clamp = (v: Id, lo: Id, hi: Id) =>
    f(
      "math/min",
      f("math/max", v, f("math/min", lo, hi)),
      f("math/max", lo, hi),
    );
  switch (op) {
    case "math/clamp":
      return clamp(x, y, z);
    case "math/saturate":
      return f("math/min", f("math/max", x, k(0)), k(1));
    case "math/mix":
      return f(
        "math/add",
        f("math/mul", f("math/sub", k(1), z), x),
        f("math/mul", z, y),
      );
    case "math/smoothStep": {
      const t = f(
        "math/min",
        f(
          "math/max",
          f(
            "math/div",
            f("math/sub", z, f("math/min", x, y)),
            f("math/abs", f("math/sub", y, x)),
          ),
          k(0),
        ),
        k(1),
      );
      return f(
        "math/mul",
        f("math/mul", t, t),
        f("math/sub", k(3), f("math/mul", k(2), t)),
      );
    }
    default:
      throw new Error(`no composite '${op}'`);
  }
}

/** `program` with clamp, saturate, mix and smoothStep written out in the other ops. */
export function lowerComposites(program: Program): Program {
  if (!program.eqns.some((e) => COMPOSITES.has(e.op))) {
    return program;
  }
  const b = new Builder();
  const map: Id[] = [];
  program.eqns.forEach((e, id) => {
    switch (e.op) {
      case "const":
        map[id] = b.const(e.value!);
        return;
      case "literal":
        map[id] = b.literal(e.slot!, e.value!);
        return;
      case "input": {
        const input = program.inputs[e.index!]!;
        map[id] = b.input(input.name, input.type, input.rate);
        return;
      }
      default: {
        const args = e.args.map((a) => map[a]!);
        map[id] = COMPOSITES.has(e.op)
          ? expandComposite(b, e.op, args)
          : opOf(b, e.op, args, e.index);
      }
    }
  });
  return b.program(
    Object.fromEntries(program.outputs.map((o) => [o.name, map[o.id]!])),
  );
}

/** What a pass asks of its host: where per-draw and uniform floats live. */
export interface PassHost {
  /** Reserves `count` consecutive per-draw floats; returns the first one's offset. */
  drawSlots(count: number): number;
  /** The WGSL expression reading per-draw float `offset`. */
  draw(offset: number): string;
  /** The WGSL expression reading the uniform for the program's parameter `name`. */
  param(name: string): string;
  /** Reserves one uniform float for a derived value; returns its offset. */
  uniformSlot(): number;
  /** The WGSL expression reading uniform float `offset`. */
  uniform(offset: number): string;
}

/** A per-draw value: node `node`'s center value, then one derivative float per `terms` parameter. */
export interface StoredValue {
  readonly node: NodeId;
  readonly offset: number;
  readonly terms: readonly string[];
}

/** A per-view uniform: node `node`'s value, from the parameters alone. */
export interface DerivedValue {
  readonly node: NodeId;
  readonly offset: number;
}

export interface PassOutput {
  /** The output's change Δ at the vertex ("0.0" when it has none), in either language. */
  readonly delta: string;
  /** The output's center value, in either language. */
  readonly center: string;
}

/**
 * One program's residual evaluation: `lines` define `d<id>` (the change of
 * each position-dependent node) from `dIn: vec3f`, the vertex's offset from
 * the center, reading `c: DrawCenter` and `u: RouteUniforms`, in WGSL;
 * `glslLines()` are the same in GLSL ES 3.00. Slot reads (`c.v3.x`) are
 * spelled alike in both.
 */
export class ResidualPass {
  /** The program's builder, holding the equations the rules add (`cos a` for `sin a`'s rule). */
  readonly ir: Builder;
  readonly lines: string[] = [];
  readonly stored: StoredValue[] = [];
  readonly derived: DerivedValue[] = [];
  /** Separable parameters a stored value turned out to be nonlinear in. */
  readonly demote = new Set<string>();
  /** Set when a rule falls back to float32 on whole values (`asin`, `acos`, a variable power). */
  readonly approximate = new Set<string>();
  readonly outputs: NodeId[];
  private readonly number: (id: NodeId) => number;
  private readonly varyingMemo = new Map<NodeId, boolean>();
  private centerMemo: Program | undefined;
  private uniformMemo: Program | undefined;
  private glslMemo: string[] | undefined;
  private readonly storedExpr = new Map<NodeId, string>();
  private readonly derivedExpr = new Map<NodeId, string>();
  private readonly depsMemo = new Map<
    NodeId,
    { deps: ReadonlySet<string>; ok: boolean }
  >();

  constructor(
    readonly program: Program,
    private readonly host: PassHost,
    private readonly separable: ReadonlySet<string>,
  ) {
    this.ir = Builder.from(program);
    this.outputs = program.outputs.map((o) => o.id);
    this.number = numbering(program);
  }

  /** The program the rules read: the given one and the equations they add. */
  private get view(): Program {
    return {
      version: this.program.version,
      inputs: this.ir.inputs,
      eqns: this.ir.eqns,
      outputs: [],
    };
  }

  /** The change of equation `id` at the vertex, by name. */
  private d(id: NodeId): string {
    return `d${this.number(id)}`;
  }

  /** Emits the statements and returns each program output's change and center value. */
  emit(): PassOutput[] {
    for (const id of this.statements()) {
      this.lines.push(`  let ${this.d(id)}: f32 = ${this.rule(id, "wgsl")};`);
    }
    return this.outputs.map((id) => ({
      delta: this.varying(id) ? this.d(id) : "0.0",
      center: this.cv(id),
    }));
  }

  /**
   * `lines` in GLSL ES 3.00 (after `emit`). The rules run again for the other
   * spelling; every slot and every equation they reach was made by `emit`
   * (the builder hash-conses, the slots are memoized), so the layout is the same.
   */
  glslLines(): readonly string[] {
    if (!this.glslMemo) {
      const before = this.ir.eqns.length;
      const slots = this.stored.length + this.derived.length;
      this.glslMemo = this.statements().map(
        (id) => `  float ${this.d(id)} = ${this.rule(id, "glsl")};`,
      );
      if (
        this.ir.eqns.length !== before ||
        this.stored.length + this.derived.length !== slots
      ) {
        throw new Error("residual: the GLSL spelling reached a new equation");
      }
    }
    return this.glslMemo;
  }

  /** The equations that get a statement: position-dependent values, in order. */
  private statements(): NodeId[] {
    const out: NodeId[] = [];
    this.program.eqns.forEach((e, id) => {
      if (
        e.op !== "input" &&
        through(this.program, id) === id &&
        this.varying(id)
      ) {
        out.push(id);
      }
    });
    return out;
  }

  /** The program whose outputs are `this.outputs` followed by each stored value's equation (after `emit`). */
  centerProgram(): Program {
    this.centerMemo ??= this.ir.program(
      named([...this.outputs, ...this.stored.map((s) => s.node)]),
    );
    return this.centerMemo;
  }

  /** The program of the derived uniforms' equations, in `derived` order (after `emit`). */
  uniformProgram(): Program {
    this.uniformMemo ??= this.ir.program(
      named(this.derived.map((d) => d.node)),
    );
    return this.uniformMemo;
  }

  varying(id: NodeId): boolean {
    const known = this.varyingMemo.get(id);
    if (known !== undefined) {
      return known;
    }
    const e = this.ir.eqns[id]!;
    const leaf = leafOf(this.view, id);
    const result =
      leaf?.kind === "pos" ||
      (e.op === "input" && e.type === "float3") ||
      (leaf === undefined &&
        e.op !== "input" &&
        e.args.some((arg) => this.varying(arg)));
    this.varyingMemo.set(id, result);
    return result;
  }

  /** Which separable parameters an equation depends on, and whether it is affine in them. */
  private deps(id: NodeId): { deps: ReadonlySet<string>; ok: boolean } {
    const known = this.depsMemo.get(id);
    if (known) {
      return known;
    }
    const e = this.ir.eqns[through(this.view, id)]!;
    const leaf = leafOf(this.view, id);
    const none = new Set<string>();
    let result: { deps: ReadonlySet<string>; ok: boolean };
    if (leaf?.kind === "param") {
      result = {
        deps: this.separable.has(leaf.name) ? new Set([leaf.name]) : none,
        ok: true,
      };
    } else if (leaf !== undefined || e.args.length === 0) {
      result = { deps: none, ok: true };
    } else {
      const parts = e.args.map((arg) => this.deps(arg));
      const union = new Set<string>(parts.flatMap((p) => [...p.deps]));
      const allOk = parts.every((p) => p.ok);
      let ok: boolean;
      switch (e.op) {
        case "math/add":
        case "math/sub":
        case "math/neg":
          ok = allOk;
          break;
        case "math/mul":
          ok = allOk && !(parts[0]!.deps.size > 0 && parts[1]!.deps.size > 0);
          break;
        case "math/div":
          ok = allOk && parts[1]!.deps.size === 0;
          break;
        case "math/select":
          ok = allOk && parts[0]!.deps.size === 0;
          break;
        default:
          ok = allOk && union.size === 0;
      }
      result = { deps: union, ok };
    }
    this.depsMemo.set(id, result);
    return result;
  }

  /** The WGSL expression of equation `id`'s center value. */
  cv(given: NodeId): string {
    const id = through(this.view, given);
    const leaf = leafOf(this.view, id);
    if (leaf?.kind === "const") {
      return literal(leaf.value);
    }
    if (leaf?.kind === "param") {
      return this.host.param(leaf.name);
    }
    if (!this.varying(id)) {
      let expr = this.derivedExpr.get(id);
      if (expr === undefined) {
        const offset = this.host.uniformSlot();
        this.derived.push({ node: id, offset });
        expr = this.host.uniform(offset);
        this.derivedExpr.set(id, expr);
      }
      return expr;
    }
    let expr = this.storedExpr.get(id);
    if (expr === undefined) {
      const { deps, ok } = this.deps(id);
      if (!ok) {
        for (const dep of deps) {
          this.demote.add(dep);
        }
      }
      const terms = ok ? [...deps].sort() : [];
      const offset = this.host.drawSlots(1 + terms.length);
      this.stored.push({ node: id, offset, terms });
      expr = this.host.draw(offset);
      if (terms.length > 0) {
        const parts = terms.map(
          (t, i) => `${this.host.param(t)} * ${this.host.draw(offset + 1 + i)}`,
        );
        expr = `(${expr} + ${parts.join(" + ")})`;
      }
      this.storedExpr.set(id, expr);
    }
    return expr;
  }

  /** The vertex's value of a condition: the flag itself, or the center value plus its change. */
  private flag(given: NodeId): string {
    const id = through(this.view, given);
    if (!this.varying(id)) {
      return this.cv(id);
    }
    return FLAGS.has(this.ir.eqns[id]!.op)
      ? this.d(id)
      : `(${this.cv(id)} + ${this.d(id)})`;
  }

  private rule(id: NodeId, lang: ShadingLanguage): string {
    const e = this.ir.eqns[id]!;
    const [a, b, c] = e.args;
    const isVarying = (n: NodeId | undefined) =>
      n !== undefined && this.varying(n);
    const dOf = (n: NodeId | undefined): string | null =>
      isVarying(n) ? this.d(n!) : null;
    const zero = (x: string | null) => x ?? "0.0";
    const plus = (x: string | null, y: string | null): string | null =>
      x === null ? y : y === null ? x : `(${x} + ${y})`;
    const minus = (x: string | null, y: string | null): string | null =>
      y === null ? x : x === null ? `(-${y})` : `(${x} - ${y})`;
    const da = dOf(a);
    const db = dOf(b);
    const aux = (op: string, ...args: NodeId[]) => opOf(this.ir, op, args);
    const cvOf = (n: NodeId) => this.cv(n);
    const leaf = leafOf(this.view, id);
    if (leaf?.kind === "pos") {
      return `dIn.${"xyz"[leaf.lane]}`;
    }

    switch (e.op) {
      case "math/add":
        return plus(da, db)!;
      case "math/sub":
        return minus(da, db)!;
      case "math/neg":
        return `-${da}`;
      case "math/mul": {
        const terms = [
          db === null ? null : `${cvOf(a!)} * ${db}`,
          da === null ? null : `${cvOf(b!)} * ${da}`,
          da !== null && db !== null ? `${da} * ${db}` : null,
        ].filter((t): t is string => t !== null);
        return terms.join(" + ");
      }
      case "math/div":
        if (db === null) {
          return `${da} / ${cvOf(b!)}`;
        }
        return `${minus(da, `${cvOf(id)} * ${db}`)} / (${cvOf(b!)} + ${db})`;
      case "math/sqrt":
        return `${da} / (${cvOf(id)} + sqrt(max(${cvOf(a!)} + ${da}, 0.0)))`;
      case "math/exp":
        return `${cvOf(id)} * tg_expm1(${da})`;
      case "math/log":
        return `tg_log1p(${da} / ${cvOf(a!)})`;
      case "math/sin": {
        const cosA = cvOf(aux("math/cos", a!));
        return `${cosA} * tg_sin(${da}) - 2.0 * ${cvOf(id)} * tg_sq(tg_sin(0.5 * ${da}))`;
      }
      case "math/cos": {
        const sinA = cvOf(aux("math/sin", a!));
        return `-${sinA} * tg_sin(${da}) - 2.0 * ${cvOf(id)} * tg_sq(tg_sin(0.5 * ${da}))`;
      }
      case "math/tan": {
        const sn = cvOf(aux("math/sin", a!));
        const cc = cvOf(aux("math/cos", a!));
        return `tg_sin(${da}) / (${cc} * (${cc} * tg_cos(${da}) - ${sn} * tg_sin(${da})))`;
      }
      case "math/atan":
        return `tg_atan1(${cvOf(a!)}, ${da})`;
      case "math/atan2":
        return `tg_atan2(${cvOf(a!)}, ${cvOf(b!)}, ${zero(da)}, ${zero(db)}, ${cvOf(id)})`;
      case "math/sinh": {
        const ch = cvOf(aux("math/cosh", a!));
        const h = `(0.5 * ${da})`;
        return `2.0 * (${ch} * tg_cosh(${h}) + ${cvOf(id)} * tg_sinh(${h})) * tg_sinh(${h})`;
      }
      case "math/cosh": {
        const sh = cvOf(aux("math/sinh", a!));
        const h = `(0.5 * ${da})`;
        return `2.0 * (${sh} * tg_cosh(${h}) + ${cvOf(id)} * tg_sinh(${h})) * tg_sinh(${h})`;
      }
      case "math/tanh": {
        const ch = cvOf(aux("math/cosh", a!));
        const sh = cvOf(aux("math/sinh", a!));
        return `tg_sinh(${da}) / (${ch} * (${ch} * tg_cosh(${da}) + ${sh} * tg_sinh(${da})))`;
      }
      case "math/asin":
      case "math/acos": {
        const name = e.op.slice("math/".length);
        this.approximate.add(name);
        return `${name}(clamp(${cvOf(a!)} + ${da}, -1.0, 1.0)) - ${cvOf(id)}`;
      }
      case "math/pow":
        return this.powRule(id, da, db);
      case "math/abs":
        return `tg_abs(${cvOf(a!)}, ${da})`;
      case "math/min":
      case "math/max": {
        // min(a, b) = a + min(0, b - a), and likewise for max
        const d = cvOf(aux("math/sub", b!, a!));
        const step = `tg_${e.op.slice("math/".length)}0(${d}, ${zero(minus(db, da))})`;
        return plus(da, step)!;
      }
      case "math/floor":
      case "math/ceil":
      case "math/sign":
        return `${e.op.slice("math/".length)}(${cvOf(a!)} + ${da}) - ${cvOf(id)}`;
      case "math/fract": {
        const fl = cvOf(aux("math/floor", a!));
        return `${da} - (floor(${cvOf(a!)} + ${da}) - ${fl})`;
      }
      case "math/lt":
      case "math/le":
      case "math/gt":
      case "math/ge":
      case "math/eq": {
        const d = cvOf(aux("math/sub", a!, b!));
        return choose(
          lang,
          "0.0",
          "1.0",
          `${d} + ${zero(minus(da, db))} ${COMPARE_TEST[e.op]!}`,
        );
      }
      case "math/and":
        return choose(
          lang,
          "0.0",
          "1.0",
          `${this.flag(a!)} != 0.0 && ${this.flag(b!)} != 0.0`,
        );
      case "math/or":
        return choose(
          lang,
          "0.0",
          "1.0",
          `${this.flag(a!)} != 0.0 || ${this.flag(b!)} != 0.0`,
        );
      case "math/not":
        return choose(lang, "0.0", "1.0", `${this.flag(a!)} == 0.0`);
      case "math/select": {
        const t = through(this.view, b!);
        const f = through(this.view, c!);
        const diff = cvOf(aux("math/sub", this.asFloat(t), this.asFloat(f)));
        return `tg_select(${this.flag(a!)}, ${cvOf(a!)}, ${zero(dOf(b))}, ${zero(dOf(c))}, ${diff})`;
      }
      default:
        throw new Error(`residual: no rule for op '${e.op}'`);
    }
  }

  /** A float equation for `id`: a bool's float. */
  private asFloat(id: NodeId): NodeId {
    return this.ir.typeOf(id) === "bool"
      ? this.ir.op("type/boolToFloat", [id])
      : id;
  }

  private powRule(id: NodeId, da: string | null, db: string | null): string {
    const e = this.ir.eqns[id]!;
    const [a, b] = e.args as [NodeId, NodeId];
    const cvOf = (n: NodeId) => this.cv(n);
    const exponent = leafOf(this.view, b);
    const n = exponent?.kind === "const" ? exponent.value : undefined;
    if (da !== null && db === null && n !== undefined) {
      const m = Math.abs(n);
      if (Number.isInteger(n) && m >= 2 && m <= 4) {
        const ac = cvOf(a);
        const delta = `tg_pow${m}d(${ac}, ${da})`;
        if (n > 0) {
          return delta;
        }
        const product = (x: string) =>
          Array.from({ length: m }, () => x).join(" * ");
        return `-${delta} / ((${product(ac)}) * (${product(`(${ac} + ${da})`)}))`;
      }
      if (n === -1) {
        return `-${da} / (${cvOf(a)} * (${cvOf(a)} + ${da}))`;
      }
      if (n === 0.5) {
        return `${da} / (${cvOf(id)} + sqrt(max(${cvOf(a)} + ${da}, 0.0)))`;
      }
    }
    if (da !== null && db === null) {
      // a^b with b a parameter: e^(b log a) (a > 0)
      return `${cvOf(id)} * tg_expm1(${cvOf(b)} * tg_log1p(${da} / ${cvOf(a)}))`;
    }
    this.approximate.add("pow");
    return `pow(${cvOf(a)} + ${da ?? "0.0"}, ${cvOf(b)} + ${db ?? "0.0"}) - ${cvOf(id)}`;
  }
}

/** Equations as outputs `e0`, `e1`, …, in order. */
const named = (ids: readonly NodeId[]): Record<string, NodeId> =>
  Object.fromEntries(ids.map((id, i) => [`e${i}`, id]));

function literal(value: number): string {
  const text = f32Literal(value);
  return value < 0 || Object.is(value, -0) ? `(${text})` : text;
}
