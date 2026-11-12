// Residual evaluation of an IR program (plan 2026-11-12, task 4): the value
// of every node at p = c + δ is held as its value at the draw centre c, a
// float64 number computed on the CPU (or in df64), plus the float32 change
// Δ = v(c + δ) - v(c). Each op has a rule giving Δ from its operands' Δ and
// centre values with no subtraction of nearly equal numbers, so Δ is as
// accurate relative to itself as float32 allows whatever the size of the
// centre values. A position 6.4e6 m from the origin moved by metres, or a
// projection's easting, keeps millimetres:
//   Δ(a b) = a_c Δb + b_c Δa + Δa Δb          (exact algebra)
//   Δ√a = Δa / (√a_c + √(a_c + Δa))
//   Δ sin a = cos a_c sin Δa - 2 sin a_c sin²(Δa / 2)
//   Δ log a = log1p(Δa / a_c),  Δ eˣ = eˣ_c expm1(Δa),
//   Δ atan2(y, x) = atan2(x_c Δy - y_c Δx, |c|² + x_c Δx + y_c Δy), …
// Where float32's builtins are coarse (WGSL allows thousands of ulps for
// sin, atan and exp) the rules use the helpers below: short polynomials for
// the small arguments Δ has, and the builtin only when Δ is large.
//
// Centre values the rules read are per-draw constants ("stored"); values of
// nodes that depend on no position are per-view uniforms ("derived", float64
// on the CPU). A stored value that is affine in separable parameters s
// (displacement ∝ factor) is kept as v(0) and its derivative per s, so the
// shader forms v(s) from the uniform s and no per-frame work follows a
// slider move. Branches (select, min, max, abs, floor, comparisons) follow
// the vertex's own side with the crossing term from the centre values.
import { f32Literal } from "./df64Wgsl.ts";
import { expandComposite, Ir, type IrProgram, type NodeId } from "./ir.ts";

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

// The change of select(cond, t, f) when cond is fv at the vertex and fc at the centre, e = t_c - f_c.
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

const COMPOSITES = new Set(["clamp", "mix", "smoothstep"]);
const FLAGS = new Set(["lt", "le", "gt", "ge", "eq", "ne", "and", "or", "not"]);
const COMPARE_TEST: Record<string, string> = {
  lt: "< 0.0",
  le: "<= 0.0",
  gt: "> 0.0",
  ge: ">= 0.0",
  eq: "== 0.0",
  ne: "!= 0.0",
};

/** `program` with clamp, mix and smoothstep written out in the other ops. */
export function lowerComposites(program: IrProgram): IrProgram {
  let current = program;
  for (let pass = 0; pass < 4; pass++) {
    if (!current.nodes.some((node) => COMPOSITES.has(node.op))) {
      return current;
    }
    const ir = new Ir();
    const map: NodeId[] = [];
    current.nodes.forEach((node, id) => {
      if (node.op === "const") {
        map[id] = ir.constant(node.value);
      } else if (node.op === "pos") {
        map[id] = ir.pos(node.value);
      } else if (node.op === "param") {
        map[id] = ir.param(node.name);
      } else {
        const args = node.args.map((arg) => map[arg]!);
        map[id] = COMPOSITES.has(node.op)
          ? expandComposite(ir, node.op, args)!
          : ir.op(node.op, ...args);
      }
    });
    current = ir.program(current.outputs.map((out) => map[out]!));
  }
  return current;
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

/** A per-draw value: node `node`'s centre value, then one derivative float per `terms` parameter. */
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
  /** WGSL for the output's change Δ at the vertex ("0.0" when it has none). */
  readonly delta: string;
  /** WGSL for the output's centre value. */
  readonly centre: string;
}

/**
 * One program's residual evaluation: `lines` define `d<id>` (the change of
 * each position-dependent node) from `dIn: vec3f`, the vertex's offset from
 * the centre, reading `c: DrawCentre` and `u: RouteUniforms`.
 */
export class ResidualPass {
  readonly ir: Ir;
  readonly lines: string[] = [];
  readonly stored: StoredValue[] = [];
  readonly derived: DerivedValue[] = [];
  /** Separable parameters a stored value turned out to be nonlinear in. */
  readonly demote = new Set<string>();
  /** Set when a rule falls back to float32 on whole values (`asin`, `acos`, a variable power). */
  readonly approximate = new Set<string>();
  readonly outputs: NodeId[];
  private readonly varyingMemo = new Map<NodeId, boolean>();
  private centreMemo: IrProgram | undefined;
  private uniformMemo: IrProgram | undefined;
  private readonly storedExpr = new Map<NodeId, string>();
  private readonly derivedExpr = new Map<NodeId, string>();
  private readonly depsMemo = new Map<
    NodeId,
    { deps: ReadonlySet<string>; ok: boolean }
  >();

  constructor(
    readonly program: IrProgram,
    private readonly host: PassHost,
    private readonly separable: ReadonlySet<string>,
  ) {
    this.ir = Ir.fromProgram(program);
    this.outputs = [...program.outputs];
  }

  /** Emits the statements and returns each program output's change and centre value. */
  emit(): PassOutput[] {
    this.program.nodes.forEach((_, id) => {
      if (this.varying(id)) {
        this.lines.push(`  let d${id}: f32 = ${this.rule(id)};`);
      }
    });
    return this.outputs.map((id) => ({
      delta: this.varying(id) ? `d${id}` : "0.0",
      centre: this.cv(id),
    }));
  }

  /** The program whose outputs are `this.outputs` followed by each stored value's node (after `emit`). */
  centreProgram(): IrProgram {
    this.centreMemo ??= this.ir.program([
      ...this.outputs,
      ...this.stored.map((s) => s.node),
    ]);
    return this.centreMemo;
  }

  /** The program of the derived uniforms' nodes, in `derived` order (after `emit`). */
  uniformProgram(): IrProgram {
    this.uniformMemo ??= this.ir.program(this.derived.map((d) => d.node));
    return this.uniformMemo;
  }

  varying(id: NodeId): boolean {
    const known = this.varyingMemo.get(id);
    if (known !== undefined) {
      return known;
    }
    const node = this.ir.nodes[id]!;
    const result =
      node.op === "pos" ||
      (node.op !== "const" &&
        node.op !== "param" &&
        node.args.some((arg) => this.varying(arg)));
    this.varyingMemo.set(id, result);
    return result;
  }

  /** Which separable parameters a node depends on, and whether it is affine in them. */
  private deps(id: NodeId): { deps: ReadonlySet<string>; ok: boolean } {
    const known = this.depsMemo.get(id);
    if (known) {
      return known;
    }
    const node = this.ir.nodes[id]!;
    const none = new Set<string>();
    let result: { deps: ReadonlySet<string>; ok: boolean };
    if (node.op === "param") {
      result = {
        deps: this.separable.has(node.name) ? new Set([node.name]) : none,
        ok: true,
      };
    } else if (node.args.length === 0) {
      result = { deps: none, ok: true };
    } else {
      const parts = node.args.map((arg) => this.deps(arg));
      const union = new Set<string>(parts.flatMap((p) => [...p.deps]));
      const allOk = parts.every((p) => p.ok);
      let ok: boolean;
      switch (node.op) {
        case "add":
        case "sub":
        case "neg":
          ok = allOk;
          break;
        case "mul":
          ok = allOk && !(parts[0]!.deps.size > 0 && parts[1]!.deps.size > 0);
          break;
        case "div":
          ok = allOk && parts[1]!.deps.size === 0;
          break;
        case "select":
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

  /** The WGSL expression of node `id`'s centre value. */
  cv(id: NodeId): string {
    const node = this.ir.nodes[id]!;
    if (node.op === "const") {
      return literal(node.value);
    }
    if (node.op === "param") {
      return this.host.param(node.name);
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

  /** The vertex's value of a condition: the flag itself, or the centre value plus its change. */
  private flag(id: NodeId): string {
    if (!this.varying(id)) {
      return this.cv(id);
    }
    return FLAGS.has(this.ir.nodes[id]!.op)
      ? `d${id}`
      : `(${this.cv(id)} + d${id})`;
  }

  private rule(id: NodeId): string {
    const ir = this.ir;
    const node = ir.nodes[id]!;
    const [a, b, c] = node.args;
    const isVarying = (n: NodeId | undefined) =>
      n !== undefined && this.varying(n);
    const dOf = (n: NodeId | undefined): string | null =>
      isVarying(n) ? `d${n}` : null;
    const zero = (x: string | null) => x ?? "0.0";
    const plus = (x: string | null, y: string | null): string | null =>
      x === null ? y : y === null ? x : `(${x} + ${y})`;
    const minus = (x: string | null, y: string | null): string | null =>
      y === null ? x : x === null ? `(-${y})` : `(${x} - ${y})`;
    const da = dOf(a);
    const db = dOf(b);
    const aux = (op: Parameters<Ir["op"]>[0], ...args: NodeId[]) =>
      ir.op(op, ...args);
    const cvOf = (n: NodeId) => this.cv(n);

    switch (node.op) {
      case "pos":
        return `dIn.${"xyz"[node.value]}`;
      case "add":
        return plus(da, db)!;
      case "sub":
        return minus(da, db)!;
      case "neg":
        return `-${da}`;
      case "mul": {
        const terms = [
          db === null ? null : `${cvOf(a!)} * ${db}`,
          da === null ? null : `${cvOf(b!)} * ${da}`,
          da !== null && db !== null ? `${da} * ${db}` : null,
        ].filter((t): t is string => t !== null);
        return terms.join(" + ");
      }
      case "div":
        if (db === null) {
          return `${da} / ${cvOf(b!)}`;
        }
        return `${minus(da, `${cvOf(id)} * ${db}`)} / (${cvOf(b!)} + ${db})`;
      case "sqrt":
        return `${da} / (${cvOf(id)} + sqrt(max(${cvOf(a!)} + ${da}, 0.0)))`;
      case "exp":
        return `${cvOf(id)} * tg_expm1(${da})`;
      case "log":
        return `tg_log1p(${da} / ${cvOf(a!)})`;
      case "sin": {
        const cosA = cvOf(aux("cos", a!));
        return `${cosA} * tg_sin(${da}) - 2.0 * ${cvOf(id)} * tg_sq(tg_sin(0.5 * ${da}))`;
      }
      case "cos": {
        const sinA = cvOf(aux("sin", a!));
        return `-${sinA} * tg_sin(${da}) - 2.0 * ${cvOf(id)} * tg_sq(tg_sin(0.5 * ${da}))`;
      }
      case "tan": {
        const s = cvOf(aux("sin", a!));
        const cc = cvOf(aux("cos", a!));
        return `tg_sin(${da}) / (${cc} * (${cc} * tg_cos(${da}) - ${s} * tg_sin(${da})))`;
      }
      case "atan":
        return `tg_atan1(${cvOf(a!)}, ${da})`;
      case "atan2":
        return `tg_atan2(${cvOf(a!)}, ${cvOf(b!)}, ${zero(da)}, ${zero(db)}, ${cvOf(id)})`;
      case "sinh": {
        const ch = cvOf(aux("cosh", a!));
        const h = `(0.5 * ${da})`;
        return `2.0 * (${ch} * tg_cosh(${h}) + ${cvOf(id)} * tg_sinh(${h})) * tg_sinh(${h})`;
      }
      case "cosh": {
        const sh = cvOf(aux("sinh", a!));
        const h = `(0.5 * ${da})`;
        return `2.0 * (${sh} * tg_cosh(${h}) + ${cvOf(id)} * tg_sinh(${h})) * tg_sinh(${h})`;
      }
      case "tanh": {
        const ch = cvOf(aux("cosh", a!));
        const sh = cvOf(aux("sinh", a!));
        return `tg_sinh(${da}) / (${ch} * (${ch} * tg_cosh(${da}) + ${sh} * tg_sinh(${da})))`;
      }
      case "asin":
      case "acos":
        this.approximate.add(node.op);
        return `${node.op}(clamp(${cvOf(a!)} + ${da}, -1.0, 1.0)) - ${cvOf(id)}`;
      case "pow":
        return this.powRule(id, da, db);
      case "abs":
        return `tg_abs(${cvOf(a!)}, ${da})`;
      case "min":
      case "max": {
        // min(a, b) = a + min(0, b - a), and likewise for max
        const d = cvOf(aux("sub", b!, a!));
        const step = `tg_${node.op}0(${d}, ${zero(minus(db, da))})`;
        return plus(da, step)!;
      }
      case "floor":
      case "ceil":
      case "sign":
        return `${node.op}(${cvOf(a!)} + ${da}) - ${cvOf(id)}`;
      case "fract": {
        const fl = cvOf(aux("floor", a!));
        return `${da} - (floor(${cvOf(a!)} + ${da}) - ${fl})`;
      }
      case "lt":
      case "le":
      case "gt":
      case "ge":
      case "eq":
      case "ne": {
        const d = cvOf(aux("sub", a!, b!));
        return `select(0.0, 1.0, ${d} + ${zero(minus(da, db))} ${COMPARE_TEST[node.op]!})`;
      }
      case "and":
        return `select(0.0, 1.0, ${this.flag(a!)} != 0.0 && ${this.flag(b!)} != 0.0)`;
      case "or":
        return `select(0.0, 1.0, ${this.flag(a!)} != 0.0 || ${this.flag(b!)} != 0.0)`;
      case "not":
        return `select(0.0, 1.0, ${this.flag(a!)} == 0.0)`;
      case "select": {
        const e = cvOf(aux("sub", b!, c!));
        return `tg_select(${this.flag(a!)}, ${cvOf(a!)}, ${zero(dOf(b))}, ${zero(dOf(c))}, ${e})`;
      }
      default:
        throw new Error(`residual: no rule for op '${node.op}'`);
    }
  }

  private powRule(id: NodeId, da: string | null, db: string | null): string {
    const node = this.ir.nodes[id]!;
    const [a, b] = node.args as [NodeId, NodeId];
    const cvOf = (n: NodeId) => this.cv(n);
    const exponent = this.ir.nodes[b]!;
    const n = exponent.op === "const" ? exponent.value : undefined;
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

function literal(value: number): string {
  const text = f32Literal(value);
  return value < 0 || Object.is(value, -0) ? `(${text})` : text;
}
