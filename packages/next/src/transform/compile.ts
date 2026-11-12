// The transform graph's compiler (plan 2026-11-12, task 4, part a): a route's
// shape to one fused WGSL function, `transformPoint(pLocal, c, u)`, with a
// float64 path for the data it reads. Vertices are offsets δ from a draw's
// centre c (the content's local frame), so the route is
//   F(c + δ) = F(c) + [F(c + δ) - F(c)],
// the first term per draw in hi/lo float32 (from float64 on the CPU, or a
// df64 compute pass), the second per vertex in float32 and relative to
// itself, by the residual rules of residual.ts: each smooth step's IR is
// evaluated as (centre value, change) pairs, so a position 6.4e6 m from the
// origin or a UTM coordinate keeps its millimetres. Affine runs collapse to
// a float32 3×3 on δ (the translation is in F(c)); the output is
// `F(c) - eye + residual`, relative to the camera as the engine's RTC is.
//
// Per-draw data (`DrawCentre`): F(c) as hi and lo, the centre values the
// rules read, and the derivative of each of those with respect to the
// separable parameters. Per-view data (`RouteUniforms`): the eye as hi and
// lo, the affine 3×3s, the parameter values, and values derived from the
// parameters alone (float64 on the CPU). A parameter that enters affinely at
// the last smooth step and declares itself `separable` is a uniform for
// good: the shader forms the centre values from it, with no per-frame work.
// Any other parameter that the centre values depend on is "dynamic": a
// change recomputes every draw's centre constants, on the CPU
// (`centreConstants`) or in a compute pass in df64 (`centreConstantsWgsl`).
// The centre constants also depend on the route's affine matrices: recompute
// them when `route.revision` changes.
//
// Normals are the cofactor of the route's Jacobian at the vertex: each
// smooth step's J (autodiff, ad.ts) is evaluated by the same residual rules
// and the steps' and affine runs' 3×3s are multiplied; `transformNormalTangent`
// orthogonalizes against the transformed tangent.
//
// A route is refused (`ok: false`, with the reason) when a smooth step has no
// restricted-JS source, the source does not parse, or the step is an inverse:
// the caller falls back to fitted lattices. Programs are cached by `key`.
//
// There is no Taylor truncation to choose by draw radius and error budget:
// the residual rules are exact algebra, so a draw of any size is as accurate
// as float32 allows relative to its own offsets (spikes/transformGraph.ts:
// 2.6 to 9 mm for ×10 exaggeration at 1 to 8 km, under 1.2 mm elsewhere, and
// the blend band's kink included). A Taylor form (centre J, H, third
// derivatives in float64) would cost less per vertex for a smooth step
// with no kinks and stays an option for the normals, whose exact Jacobian
// is the expensive part of a nested route.
import { hessianProgram, jacobianProgram } from "./ad.ts";
import {
  DF64_CORE_WGSL,
  DF64_WGSL,
  emitDf64,
  splitDouble,
} from "./df64Wgsl.ts";
import { evaluate } from "./evaluate.ts";
import type { SmoothSpec } from "./graph.ts";
import type { IrProgram } from "./ir.ts";
import { parseTransform } from "./parse.ts";
import {
  lowerComposites,
  RESIDUAL_WGSL,
  ResidualPass,
  type PassHost,
  type PassOutput,
} from "./residual.ts";
import type { AffineStep, Route, SmoothStep } from "./route.ts";

export interface CompileOptions {
  /**
   * The normals' Jacobian (default "exact", as `true`; `false` is "none"):
   * - "exact": each step's J, evaluated at the vertex by the residual rules;
   * - "linear": J at the draw's centre and its first-order change in the
   *   offset (the centre's J and Hessian are per-draw data, from the CPU
   *   only, so the route has no centre compute pass), for each step whose
   *   function has no kink (min, max, abs, clamp, select, floor, fract: a
   *   Jacobian that jumps); a step with one stays exact;
   * - "auto": "linear" when the route's exact Jacobian costs a lot (the
   *   steps' Jacobian programs together past `AUTO_LINEAR_NODES` nodes), else
   *   "exact": the nested projections' normals cost about as much as their
   *   positions' three Jacobian columns, which a linear model skips.
   */
  normals?: boolean | "exact" | "linear" | "auto" | "none";
  /** Emit `centreConstantsWgsl`, the df64 compute pass for dynamic parameters (default true; never for a route with a linear step). */
  centreCompute?: boolean;
  /**
   * The compute pass writes draw `i`'s record at float index `rows[i]` of
   * `records` (a read-only `array<u32>` at binding 3, `centreBindings.rows`)
   * rather than `i * perDrawLayout.floats`: the records sit inside a larger
   * buffer (the engine's placements buffer).
   */
  centreRows?: boolean;
}

/** "auto" normals go linear for a route whose steps' Jacobian programs have more nodes than this together. */
export const AUTO_LINEAR_NODES = 400;

/** Ops that make a function's Jacobian jump: a step with one never takes linear normals. */
const KINK_OPS: ReadonlySet<string> = new Set([
  "abs",
  "min",
  "max",
  "select",
  "clamp",
  "floor",
  "fract",
]);

/** A packed record: float offsets of named fields, and its length in floats (a multiple of 4). */
export interface RecordLayout {
  readonly floats: number;
  readonly fields: Readonly<Record<string, number>>;
}

export type ParamRecord = Readonly<Record<string, number>>;

/** A smooth step's IR, for what reads it besides the shader (bounds: intervals over a box). */
export interface CompiledStep {
  /** Index among the route's collapsed steps (`route.steps`). */
  readonly stepIndex: number;
  readonly id: string;
  /** Parameter names the step's function reads. */
  readonly locals: readonly string[];
  /** Each local's key in `paramValues`. */
  readonly keys: ReadonlyMap<string, string>;
  /** The value program, composites lowered: 3 outputs. */
  readonly value: IrProgram;
  /** J, row-major (`3 * i + j`): 9 outputs; undefined when compiled without normals. */
  readonly jacobian: IrProgram | undefined;
}

export interface CompiledRoute {
  readonly ok: true;
  /** The route's `shapeKey`, a hash of the smooth steps' sources, and the options. */
  readonly key: string;
  /**
   * A WGSL module fragment: `DrawCentre`, `RouteUniforms`, the helpers, and
   * `transformPoint(pLocal, c, u) -> vec3f`, `transformNormal(nLocal, pLocal,
   * c, u) -> vec3f`, `transformNormalTangent(nLocal, tLocal, pLocal, c, u)`,
   * `routeJacobian(pLocal, c, u) -> mat3x3f` and `transformVertex(pLocal,
   * nLocal, c, u) -> TransformedVertex`. Positions come out relative to the eye.
   */
  readonly wgsl: string;
  /**
   * The same module for the passes that draw positions and not shading
   * (depth, shadows, picks, lines): the same `DrawCentre`, `RouteUniforms`,
   * `tgStep<j>` and `tgRoute`, whose Jacobian is the identity and which has
   * no Jacobian code, no normals. A pipeline's compile time grows with the
   * code its vertex stage reaches, and a nested or exact route's Jacobian
   * is several times its positions' (exaggeration: 49 of 58 KB).
   */
  readonly positionWgsl: string;
  /** The per-view uniforms (`RouteUniforms`, vec4f members `v0…`): `eyeHi`, `eyeLo`, `affine<i>` (3 columns of vec4), `param:<key>` (a df64 pair for separable parameters), derived values. */
  readonly uniformsLayout: RecordLayout;
  /** The per-draw record (`DrawCentre`, vec4f members `v0…`): `outHi`, `outLo`, `outG:<key>` (hi then lo), and each centre value as `s<step>.<v|j><n>` (then its derivatives). */
  readonly perDrawLayout: RecordLayout;
  /** Parameters (as `<id>.<name>`) whose change needs the centre constants recomputed. */
  readonly dynamicParams: readonly string[];
  /** Parameters that are plain uniforms: affine at the last smooth step, so no centre work. */
  readonly separableParams: readonly string[];
  /** Parameters read by the route that no centre value depends on: uniforms with no centre work either. */
  readonly uniformParams: readonly string[];
  /** Ops whose residual rule is float32 on whole values (less accurate), if any. */
  readonly approximations: readonly string[];
  /** A compute shader (`centreConstants`) for every draw's record in df64; bindings in `centreBindings`. */
  readonly centreConstantsWgsl: string | undefined;
  readonly centreBindings: {
    /** group 0, binding 0 (uniform): `centreUniforms(...)`. */
    readonly uniforms: 0;
    /** group 0, binding 1 (read-only storage array<f32>): `packCentres(...)`. */
    readonly centres: 1;
    /** group 0, binding 2 (storage array<f32>): `perDrawLayout.floats` per draw, or at `rows` (`centreRows`). */
    readonly records: 2;
    /** group 0, binding 3 (read-only storage array<u32>), with `centreRows`: each draw's record's first float. */
    readonly rows: 3;
  };
  /** How each smooth step's normals are made, in route order ("none" without normals). */
  readonly normalModes: readonly ("exact" | "linear" | "none")[];
  /** The route's parameter values by `<id>.<name>`. */
  paramValues(route: Route): ParamRecord;
  /** The smooth steps' IR in route order. */
  readonly steps: readonly CompiledStep[];
  /** Fills the per-view uniforms for the route's current matrices and parameters; `eye` is in the route's output frame. */
  fillUniforms(
    route: Route,
    out?: Float32Array,
    eye?: ArrayLike<number>,
  ): Float32Array;
  /**
   * One draw's record, in float64: the route's value at the draw centre
   * (local coordinates) as hi and lo, and the centre values. `route`
   * defaults to the one `compileRoute` was given.
   */
  centreConstants(
    drawCentreLocal: ArrayLike<number>,
    paramValues?: ParamRecord,
    route?: Route,
    out?: Float32Array,
  ): Float32Array;
  /** The compute pass's uniform buffer for `count` draws. */
  centreUniforms(
    route: Route,
    count: number,
    paramValues?: ParamRecord,
    out?: Float32Array,
  ): Float32Array;
  /** Draw centres as the compute pass reads them: 8 floats each, hi then lo. */
  packCentres(centres: readonly ArrayLike<number>[]): Float32Array;
}

export interface Refusal {
  readonly ok: false;
  /** Why the route cannot be compiled, naming the smooth step. */
  readonly reason: string;
}

export type CompileResult = CompiledRoute | Refusal;

type Core = Omit<CompiledRoute, "centreConstants"> & {
  centreConstants(
    drawCentreLocal: ArrayLike<number>,
    paramValues: ParamRecord | undefined,
    route: Route,
    out?: Float32Array,
  ): Float32Array;
};

const cache = new Map<string, Core>();

/** Forgets every cached program (tests). */
export function clearCompileCache(): void {
  cache.clear();
}

class Records {
  floats = 0;
  readonly fields: Record<string, number> = {};
  alloc(count: number, name?: string, align = 1): number {
    this.floats = Math.ceil(this.floats / align) * align;
    const offset = this.floats;
    this.floats += count;
    if (name !== undefined) {
      this.fields[name] = offset;
    }
    return offset;
  }
  layout(): RecordLayout {
    return {
      floats: Math.max(4, Math.ceil(this.floats / 4) * 4),
      fields: this.fields,
    };
  }
}

const COMPONENT = "xyzw";
const slot = (base: string, offset: number) =>
  `${base}.v${offset >> 2}.${COMPONENT[offset & 3]}`;
const slot3 = (base: string, offset: number) => `${base}.v${offset >> 2}.xyz`;
/** A struct's members `v0 … v<n-1>: vec4f`: named fields, not an array, so a shader loads only the fields it reads. */
const members = (floats: number) =>
  Array.from({ length: floats / 4 }, (_, i) => `  v${i}: vec4f,`);

interface SmoothInfo {
  /** Ordinal among the route's smooth steps. */
  readonly j: number;
  readonly stepIndex: number;
  readonly id: string;
  /** Parameter names the step's function reads, in the spec's order. */
  readonly locals: readonly string[];
  readonly keys: ReadonlyMap<string, string>;
  readonly spec: SmoothSpec;
  readonly value: IrProgram;
  readonly jacobian: IrProgram | undefined;
  /** How the step's Jacobian is made in the shader; set once the route's modes are chosen. */
  normal: "exact" | "linear" | "none";
}

interface AffineLink {
  readonly kind: "affine";
  readonly index: number;
  readonly uniform: number;
}

/** A linear step's per-draw floats: J at the centre (row-major) and the Hessian (`9 i + 3 j + k`, the same order). */
interface LinearFields {
  readonly j0: number;
  readonly h0: number;
}

interface SmoothLink {
  readonly kind: "smooth";
  readonly info: SmoothInfo;
  readonly value: ResidualPass;
  readonly valueOut: PassOutput[];
  readonly jac: ResidualPass | undefined;
  readonly jacOut: PassOutput[] | undefined;
  readonly linear: LinearFields | undefined;
}

type Link = AffineLink | SmoothLink;

interface Plan {
  readonly uniforms: Records;
  readonly draw: Records;
  readonly paramOffsets: ReadonlyMap<string, number>;
  readonly links: readonly Link[];
  /** Separable parameters kept as uniforms: local names, at the last smooth step. */
  readonly separable: readonly string[];
  readonly eyeHi: number;
  readonly eyeLo: number;
  readonly outHi: number;
  readonly outLo: number;
  readonly outG: ReadonlyMap<string, number>;
}

const parsed = new Map<string, IrProgram>();

function programOf(source: string): IrProgram {
  let program = parsed.get(source);
  if (!program) {
    program = lowerComposites(parseTransform(source));
    parsed.set(source, program);
  }
  return program;
}

const jacobians = new WeakMap<IrProgram, IrProgram>();
const hessians = new WeakMap<IrProgram, IrProgram>();

/** J of a (lowered) value program, lowered, made once. */
function jacobianOf(value: IrProgram): IrProgram {
  let program = jacobians.get(value);
  if (!program) {
    program = lowerComposites(jacobianProgram(value));
    jacobians.set(value, program);
  }
  return program;
}

/** H of a (lowered) value program (`9 i + 3 j + k`), made once. */
function hessianOf(value: IrProgram): IrProgram {
  let program = hessians.get(value);
  if (!program) {
    program = lowerComposites(hessianProgram(value));
    hessians.set(value, program);
  }
  return program;
}

/** Sets each step's `normal` from the mode asked for (`CompileOptions.normals`). */
function chooseNormals(
  infos: readonly SmoothInfo[],
  requested: "exact" | "linear" | "auto" | "none",
): void {
  if (requested === "none") {
    for (const info of infos) {
      info.normal = "none";
    }
    return;
  }
  const smoothSteps = infos.map(
    (info) => !info.value.nodes.some((node) => KINK_OPS.has(node.op)),
  );
  // What linear normals would save: the Jacobian programs of the steps that may take them.
  const saved = infos.reduce(
    (sum, info, k) =>
      sum + (smoothSteps[k] ? (info.jacobian?.nodes.length ?? 0) : 0),
    0,
  );
  const linear =
    requested === "linear" ||
    (requested === "auto" && saved > AUTO_LINEAR_NODES);
  infos.forEach((info, k) => {
    info.normal = linear && smoothSteps[k] ? "linear" : "exact";
  });
}

function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function smoothSpecOf(route: Route, step: SmoothStep): SmoothSpec {
  const edge = route.from.graph.edgeFor(step.node, route.view).edge;
  if (edge.kind !== "smooth") {
    throw new Error(`"${step.node.name}" is not a smooth node`);
  }
  return edge.spec;
}

/**
 * Compiles `route`'s shape; a second route with the same key reuses the
 * program. Returns the reason when the route can't be compiled.
 */
export function compileRoute(
  route: Route,
  options: CompileOptions = {},
): CompileResult {
  const requested =
    options.normals === undefined || options.normals === true
      ? "exact"
      : options.normals === false
        ? "none"
        : options.normals;
  const normals = requested !== "none";
  const centreRows = options.centreRows ?? false;
  const steps = route.steps;
  const infos: SmoothInfo[] = [];
  const seen = new Map<string, number>();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    if (step.kind !== "smooth") {
      continue;
    }
    const spec = smoothSpecOf(route, step);
    if (step.inverse) {
      return {
        ok: false,
        reason: `smooth step "${step.id}" runs through its inverse; only forward steps compile (the fitted lattice path takes it)`,
      };
    }
    if (spec.source === undefined) {
      return {
        ok: false,
        reason: `smooth step "${step.id}" has no restricted-JS source for the IR (its function is not in the subset); the fitted lattice path takes it`,
      };
    }
    let value: IrProgram;
    let jacobian: IrProgram | undefined;
    try {
      value = programOf(spec.source);
      if (value.outputs.length !== 3) {
        throw new Error(`it returns ${value.outputs.length} values, not 3`);
      }
      jacobian = normals ? jacobianOf(value) : undefined;
    } catch (error) {
      return {
        ok: false,
        reason: `smooth step "${step.id}": ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    const declared = new Set(Object.keys(spec.params));
    const undeclared = value.params.find((p) => !declared.has(p));
    if (undeclared !== undefined) {
      return {
        ok: false,
        reason: `smooth step "${step.id}" reads parameter '${undeclared}', which its spec does not declare`,
      };
    }
    const count = (seen.get(step.id) ?? 0) + 1;
    seen.set(step.id, count);
    const prefix = count === 1 ? step.id : `${step.id}#${count}`;
    const locals = Object.keys(spec.params).filter((p) =>
      value.params.includes(p),
    );
    infos.push({
      j: infos.length,
      stepIndex: i,
      id: step.id,
      locals,
      keys: new Map(locals.map((p) => [p, `${prefix}.${p}`])),
      spec,
      value,
      jacobian,
      normal: "none",
    });
  }
  chooseNormals(infos, requested);
  // Linear normals are per-draw CPU data: no df64 compute pass makes them.
  const linear = infos.some((info) => info.normal === "linear");
  const centreCompute = (options.centreCompute ?? true) && !linear;

  const key = [
    route.shapeKey,
    hash(infos.map((info) => `${info.id}:${info.spec.source}`).join("\n")),
    `n${normals ? (linear ? infos.map((info) => info.normal[0]).join("") : 1) : 0}c${centreCompute ? 1 : 0}${centreRows ? "r" : ""}`,
  ].join("|");
  let core = cache.get(key);
  if (!core) {
    const last = infos[infos.length - 1];
    // A last step with linear normals has its Jacobian frozen at the draw's
    // centre, so none of its parameters is a uniform that changes with no
    // centre work: they are all centre-dependent.
    const candidates = new Set(
      last && last.normal !== "linear"
        ? (last.spec.separable ?? []).filter((p) => last.locals.includes(p))
        : [],
    );
    let plan: Plan;
    for (;;) {
      const attempt = buildPlan(route, infos, candidates);
      if (attempt instanceof Set) {
        for (const name of attempt) {
          candidates.delete(name);
        }
        continue;
      }
      plan = attempt;
      break;
    }
    core = assemble(key, plan, infos, normals, centreCompute, centreRows);
    cache.set(key, core);
  }
  return bind(core, route);
}

function bind(core: Core, route: Route): CompiledRoute {
  return {
    ...core,
    centreConstants: (c, values, other, out) =>
      core.centreConstants(c, values, other ?? route, out),
  };
}

function buildPlan(
  route: Route,
  infos: readonly SmoothInfo[],
  separable: ReadonlySet<string>,
): Plan | Set<string> {
  const uniforms = new Records();
  const draw = new Records();
  const paramOffsets = new Map<string, number>();
  const eyeHi = uniforms.alloc(4, "eyeHi", 4);
  const eyeLo = uniforms.alloc(4, "eyeLo", 4);
  const outHi = draw.alloc(4, "outHi", 4);
  const outLo = draw.alloc(4, "outLo", 4);
  const last = infos[infos.length - 1];
  const sLocals = [...separable].sort();
  const outG = new Map<string, number>();
  for (const name of sLocals) {
    outG.set(name, draw.alloc(8, `outG:${last!.keys.get(name)}`, 4));
  }

  const links: Link[] = [];
  const demote = new Set<string>();
  route.steps.forEach((step, index) => {
    if (step.kind === "affine") {
      links.push({
        kind: "affine",
        index,
        uniform: uniforms.alloc(12, `affine${index}`, 4),
      });
      return;
    }
    const info = infos.find((candidate) => candidate.stepIndex === index)!;
    const set = info === last ? separable : new Set<string>();
    const makeHost = (tag: string): PassHost => ({
      drawSlots: (count) =>
        draw.alloc(count, `s${info.j}.${tag}${draw.floats}`),
      draw: (offset) => slot("c", offset),
      param(name) {
        const key = info.keys.get(name)!;
        let offset = paramOffsets.get(key);
        if (offset === undefined) {
          // A separable parameter is a df64 pair: it scales a centre value as large as the route's output.
          const wide = info === last && separable.has(name);
          offset = uniforms.alloc(wide ? 2 : 1, `param:${key}`);
          paramOffsets.set(key, offset);
        }
        return slot("u", offset);
      },
      uniformSlot: () =>
        uniforms.alloc(1, `s${info.j}.${tag}${uniforms.floats}`),
      uniform: (offset) => slot("u", offset),
    });
    const value = new ResidualPass(info.value, makeHost("v"), set);
    const valueOut = value.emit();
    let jac: ResidualPass | undefined;
    let jacOut: PassOutput[] | undefined;
    let linear: LinearFields | undefined;
    if (info.jacobian && info.normal === "exact") {
      jac = new ResidualPass(info.jacobian, makeHost("j"), set);
      jacOut = jac.emit();
    } else if (info.normal === "linear") {
      linear = {
        j0: draw.alloc(9, `s${info.j}.lj0`, 4),
        h0: draw.alloc(27, `s${info.j}.lh0`, 4),
      };
    }
    for (const pass of [value, jac]) {
      for (const name of pass?.demote ?? []) {
        demote.add(name);
      }
    }
    links.push({ kind: "smooth", info, value, valueOut, jac, jacOut, linear });
  });
  if (demote.size > 0) {
    return demote;
  }
  for (const name of sLocals) {
    const key = last!.keys.get(name)!;
    if (!paramOffsets.has(key)) {
      paramOffsets.set(key, uniforms.alloc(2, `param:${key}`));
    }
  }
  return {
    uniforms,
    draw,
    paramOffsets,
    links,
    separable: sLocals,
    eyeHi,
    eyeLo,
    outHi,
    outLo,
    outG,
  };
}

const sum = (o: PassOutput) =>
  o.delta === "0.0" ? o.centre : `(${o.centre} + ${o.delta})`;

/**
 * Evaluates `pass`'s centre values at `x` in float64 into `record`: with the
 * separable parameters at 0 for the stored value, and at 1 for each
 * derivative. Returns the outputs (at 0) and each parameter's derivative of them.
 */
function fillPass(
  pass: ResidualPass,
  x: ArrayLike<number>,
  local: ParamRecord,
  separable: readonly string[],
  record: Float32Array,
): { value: Float64Array; derivative: Map<string, Float64Array> } {
  const program = pass.centreProgram();
  const n = pass.outputs.length;
  const zeroed: Record<string, number> = { ...local };
  for (const name of separable) {
    zeroed[name] = 0;
  }
  const base = evaluate(program, x, zeroed);
  pass.stored.forEach((s, k) => {
    record[s.offset] = base[n + k]!;
  });
  const derivative = new Map<string, Float64Array>();
  for (const name of separable) {
    const at = evaluate(program, x, { ...zeroed, [name]: 1 });
    pass.stored.forEach((s, k) => {
      const term = s.terms.indexOf(name);
      if (term >= 0) {
        record[s.offset + 1 + term] = at[n + k]! - base[n + k]!;
      }
    });
    derivative.set(
      name,
      Float64Array.from({ length: n }, (_, i) => at[i]! - base[i]!),
    );
  }
  return { value: Float64Array.from(base.slice(0, n)), derivative };
}

function assemble(
  key: string,
  plan: Plan,
  infos: readonly SmoothInfo[],
  normals: boolean,
  centreCompute: boolean,
  centreRows: boolean,
): Core {
  const last = infos[infos.length - 1];
  const uniformLayout = plan.uniforms.layout();
  const drawLayout = plan.draw.layout();
  const keyOf = (info: SmoothInfo, name: string) => info.keys.get(name)!;

  const separableKeys = last ? plan.separable.map((p) => keyOf(last, p)) : [];
  const dynamic: string[] = [];
  const uniformOnly: string[] = [];
  const approximate = new Set<string>();
  for (const link of plan.links) {
    if (link.kind !== "smooth") {
      continue;
    }
    const centred = new Set([
      ...link.value.centreProgram().params,
      ...(link.jac?.centreProgram().params ?? []),
      // A linear step's J and H at the centre read what its function does.
      ...(link.linear ? jacobianOf(link.info.value).params : []),
    ]);
    for (const name of link.info.locals) {
      if (link.info === last && plan.separable.includes(name)) {
        continue;
      }
      (centred.has(name) ? dynamic : uniformOnly).push(keyOf(link.info, name));
    }
    for (const op of link.value.approximate) {
      approximate.add(op);
    }
    for (const op of link.jac?.approximate ?? []) {
      approximate.add(op);
    }
  }

  const wgsl = generateWgsl(plan, last, uniformLayout, drawLayout, normals);
  const positionWgsl = generateWgsl(
    plan,
    last,
    uniformLayout,
    drawLayout,
    normals,
    true,
  );

  const paramList = infos.flatMap((info) =>
    info.locals.map((name) => ({ info, name, key: keyOf(info, name) })),
  );
  const paramValues = (route: Route): ParamRecord => {
    const values: Record<string, number> = {};
    const graph = route.from.graph;
    for (const info of infos) {
      const node = (route.steps[info.stepIndex] as SmoothStep).node;
      const held = graph.values(node, route.view);
      for (const name of info.locals) {
        values[keyOf(info, name)] = held[name] ?? info.spec.params[name]!;
      }
    }
    return values;
  };
  const localValues = (info: SmoothInfo, values: ParamRecord) => {
    const local: Record<string, number> = {};
    for (const name of info.locals) {
      local[name] = values[keyOf(info, name)]!;
    }
    return local;
  };

  const fillUniforms = (
    route: Route,
    into?: Float32Array,
    eye?: ArrayLike<number>,
  ): Float32Array => {
    const buffer = into ?? new Float32Array(uniformLayout.floats);
    const steps = route.steps;
    const values = paramValues(route);
    for (let a = 0; a < 3; a++) {
      const [hi, lo] = splitDouble(eye?.[a] ?? 0);
      buffer[plan.eyeHi + a] = hi;
      buffer[plan.eyeLo + a] = lo;
    }
    for (const link of plan.links) {
      if (link.kind === "affine") {
        const m = (steps[link.index] as AffineStep).matrix;
        for (let col = 0; col < 3; col++) {
          for (let row = 0; row < 3; row++) {
            buffer[link.uniform + 4 * col + row] = m[4 * col + row]!;
          }
          buffer[link.uniform + 4 * col + 3] = 0;
        }
      }
    }
    for (const [k, offset] of plan.paramOffsets) {
      const [hi, lo] = splitDouble(values[k]!);
      buffer[offset] = hi;
      if (separableKeys.includes(k)) {
        buffer[offset + 1] = lo;
      }
    }
    for (const link of plan.links) {
      if (link.kind !== "smooth") {
        continue;
      }
      const local = localValues(link.info, values);
      for (const pass of [link.value, link.jac]) {
        if (pass && pass.derived.length > 0) {
          const result = evaluate(pass.uniformProgram(), [0, 0, 0], local);
          pass.derived.forEach((d, i) => {
            buffer[d.offset] = result[i]!;
          });
        }
      }
    }
    return buffer;
  };

  const centreConstants: Core["centreConstants"] = (
    drawCentreLocal,
    given,
    route,
    into,
  ) => {
    const record = into ?? new Float32Array(drawLayout.floats);
    const steps = route.steps;
    const values = given ?? paramValues(route);
    const x = new Float64Array([
      drawCentreLocal[0]!,
      drawCentreLocal[1]!,
      drawCentreLocal[2]!,
    ]);
    const moved = new Float64Array(3);
    let g = new Map<string, Float64Array>();
    for (const link of plan.links) {
      if (link.kind === "affine") {
        const m = (steps[link.index] as AffineStep).matrix;
        for (let r = 0; r < 3; r++) {
          moved[r] =
            m[r]! * x[0]! + m[4 + r]! * x[1]! + m[8 + r]! * x[2]! + m[12 + r]!;
        }
        x.set(moved);
        g = new Map(
          [...g].map(([name, v]) => [
            name,
            Float64Array.from(
              { length: 3 },
              (_, r) => m[r]! * v[0]! + m[4 + r]! * v[1]! + m[8 + r]! * v[2]!,
            ),
          ]),
        );
        continue;
      }
      const local = localValues(link.info, values);
      const separable = link.info === last ? plan.separable : [];
      const result = fillPass(link.value, x, local, separable, record);
      if (link.jac) {
        fillPass(link.jac, x, local, separable, record);
      }
      if (link.linear) {
        // J and its change along each axis at the step's input centre, in float64.
        const jv = evaluate(jacobianOf(link.info.value), x, local);
        const hv = evaluate(hessianOf(link.info.value), x, local);
        for (let k = 0; k < 9; k++) {
          record[link.linear.j0 + k] = jv[k]!;
        }
        for (let a = 0; a < 3; a++) {
          for (let i = 0; i < 3; i++) {
            for (let k = 0; k < 3; k++) {
              record[link.linear.h0 + 9 * a + 3 * i + k] =
                hv[9 * i + 3 * k + a]!;
            }
          }
        }
      }
      x.set(result.value);
      if (link.info === last) {
        g = result.derivative;
      }
    }
    for (let a = 0; a < 3; a++) {
      const [hi, lo] = splitDouble(x[a]!);
      record[plan.outHi + a] = hi;
      record[plan.outLo + a] = lo;
    }
    for (const [name, offset] of plan.outG) {
      const v = g.get(name);
      for (let a = 0; a < 3; a++) {
        const [hi, lo] = splitDouble(v?.[a] ?? 0);
        record[offset + a] = hi;
        record[offset + 4 + a] = lo;
      }
    }
    return record;
  };

  const compute = centreCompute
    ? centreShader(plan, infos, drawLayout.floats, paramList, centreRows)
    : undefined;

  return {
    ok: true,
    key,
    wgsl,
    positionWgsl,
    uniformsLayout: uniformLayout,
    perDrawLayout: drawLayout,
    dynamicParams: dynamic,
    separableParams: separableKeys,
    uniformParams: uniformOnly,
    approximations: [...approximate].sort(),
    centreConstantsWgsl: compute?.wgsl,
    centreBindings: { uniforms: 0, centres: 1, records: 2, rows: 3 },
    paramValues,
    steps: infos.map((info) => ({
      stepIndex: info.stepIndex,
      id: info.id,
      locals: info.locals,
      keys: info.keys,
      value: info.value,
      jacobian: info.jacobian,
    })),
    normalModes: infos.map((info) => info.normal),
    fillUniforms,
    centreConstants,
    centreUniforms(route, count, given, into) {
      if (!compute) {
        throw new Error("compileRoute: built with centreCompute: false");
      }
      const buffer = into ?? new Float32Array(compute.uniformFloats);
      new Uint32Array(buffer.buffer, buffer.byteOffset, 1)[0] = count;
      const values = given ?? paramValues(route);
      paramList.forEach((p, i) => {
        const [hi, lo] = splitDouble(values[p.key]!);
        buffer[4 + 2 * i] = hi;
        buffer[4 + 2 * i + 1] = lo;
      });
      const steps = route.steps;
      for (const link of plan.links) {
        if (link.kind === "affine") {
          const m = (steps[link.index] as AffineStep).matrix;
          const base = compute.affine.get(link.index)!;
          for (let e = 0; e < 16; e++) {
            const [hi, lo] = splitDouble(m[e]!);
            buffer[base + e] = hi;
            buffer[base + 16 + e] = lo;
          }
        }
      }
      return buffer;
    },
    packCentres(centres) {
      const buffer = new Float32Array(8 * centres.length);
      centres.forEach((c, i) => {
        for (let a = 0; a < 3; a++) {
          const [hi, lo] = splitDouble(c[a]!);
          buffer[8 * i + a] = hi;
          buffer[8 * i + 4 + a] = lo;
        }
      });
      return buffer;
    },
  };
}

function generateWgsl(
  plan: Plan,
  last: SmoothInfo | undefined,
  uniformLayout: RecordLayout,
  drawLayout: RecordLayout,
  normals: boolean,
  positionsOnly = false,
): string {
  const out: string[] = [
    `struct DrawCentre {`,
    ...members(drawLayout.floats),
    `}`,
    ``,
    `struct RouteUniforms {`,
    ...members(uniformLayout.floats),
    `}`,
    RESIDUAL_WGSL,
  ];
  const linear = (offset: number) =>
    `mat3x3f(${slot3("u", offset)}, ${slot3("u", offset + 4)}, ${slot3("u", offset + 8)})`;
  out.push(DF64_CORE_WGSL);
  const component = (a: number) => {
    const hi = slot("c", plan.outHi + a);
    const lo = slot("c", plan.outLo + a);
    const eyeHi = slot("u", plan.eyeHi + a);
    const eyeLo = slot("u", plan.eyeLo + a);
    if (plan.separable.length === 0) {
      return `((${hi} - ${eyeHi}) + (${lo} - ${eyeLo}))`;
    }
    let value = `df_sub(vec2f(${hi}, ${lo}), vec2f(${eyeHi}, ${eyeLo}))`;
    for (const name of plan.separable) {
      const s = plan.paramOffsets.get(last!.keys.get(name)!)!;
      const g = plan.outG.get(name)!;
      value = `df_add(${value}, df_mul(vec2f(${slot("u", s)}, ${slot("u", s + 1)}), vec2f(${slot("c", g + a)}, ${slot("c", g + 4 + a)})))`;
    }
    return `${value}.x`;
  };
  out.push(
    `// The route's value at the draw centre minus the eye, in float32 from df64 sums.`,
    `fn tgCentre(c: DrawCentre, u: RouteUniforms) -> vec3f {`,
    `  return vec3f(${component(0)}, ${component(1)}, ${component(2)});`,
    `}`,
    ``,
  );
  const centre = "tgCentre(c, u)";
  for (const link of plan.links) {
    if (link.kind !== "smooth") {
      continue;
    }
    const { j } = link.info;
    out.push(
      `// step ${j}: ${link.info.id}`,
      `fn tgStep${j}(dIn: vec3f, c: DrawCentre, u: RouteUniforms) -> vec3f {`,
      ...link.value.lines,
      `  return vec3f(${link.valueOut.map((o) => o.delta).join(", ")});`,
      `}`,
      ``,
    );
    if (positionsOnly) {
      continue;
    }
    if (link.jac) {
      const j9 = link.jacOut!.map(sum);
      const column = (col: number) =>
        `vec3f(${j9[col]}, ${j9[3 + col]}, ${j9[6 + col]})`;
      out.push(
        `fn tgJac${j}(dIn: vec3f, c: DrawCentre, u: RouteUniforms) -> mat3x3f {`,
        ...link.jac.lines,
        `  return mat3x3f(${column(0)}, ${column(1)}, ${column(2)});`,
        `}`,
        ``,
      );
    } else if (link.linear) {
      // J at the draw centre and its first-order change in the offset `dIn`:
      // J0 + dIn.x dJ/dx + dIn.y dJ/dy + dIn.z dJ/dz, each row-major (row i, column k).
      const { j0, h0 } = link.linear;
      const entry = (i: number, k: number) =>
        `(${slot("c", j0 + 3 * i + k)} + dIn.x * ${slot("c", h0 + 3 * i + k)} + dIn.y * ${slot("c", h0 + 9 + 3 * i + k)} + dIn.z * ${slot("c", h0 + 18 + 3 * i + k)})`;
      const column = (k: number) =>
        `vec3f(${entry(0, k)}, ${entry(1, k)}, ${entry(2, k)})`;
      out.push(
        `// step ${j}'s Jacobian: linear in the offset from the draw centre.`,
        `fn tgJacLinear${j}(dIn: vec3f, c: DrawCentre) -> mat3x3f {`,
        `  return mat3x3f(${column(0)}, ${column(1)}, ${column(2)});`,
        `}`,
        ``,
      );
    }
  }

  const body: string[] = ["  var d: vec3f = pLocal;"];
  const bodyJ: string[] = [
    "  var d: vec3f = pLocal;",
    "  var jt: mat3x3f = mat3x3f(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);",
  ];
  for (const link of plan.links) {
    if (link.kind === "affine") {
      body.push(`  d = ${linear(link.uniform)} * d;`);
      bodyJ.push(
        `  d = ${linear(link.uniform)} * d;`,
        `  jt = ${linear(link.uniform)} * jt;`,
      );
    } else {
      body.push(`  d = tgStep${link.info.j}(d, c, u);`);
      if (link.jac) {
        bodyJ.push(`  jt = tgJac${link.info.j}(d, c, u) * jt;`);
      } else if (link.linear) {
        bodyJ.push(`  jt = tgJacLinear${link.info.j}(d, c) * jt;`);
      }
      bodyJ.push(`  d = tgStep${link.info.j}(d, c, u);`);
    }
  }
  out.push(
    `fn transformPoint(pLocal: vec3f, c: DrawCentre, u: RouteUniforms) -> vec3f {`,
    ...body,
    `  return ${centre} + d;`,
    `}`,
    ``,
  );
  if (positionsOnly) {
    out.push(
      `fn tgRoute(pLocal: vec3f, c: DrawCentre, u: RouteUniforms, jOut: ptr<function, mat3x3f>) -> vec3f {`,
      ...body,
      `  *jOut = mat3x3f(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);`,
      `  return ${centre} + d;`,
      `}`,
      ``,
    );
  } else if (normals) {
    out.push(
      `fn tgRoute(pLocal: vec3f, c: DrawCentre, u: RouteUniforms, jOut: ptr<function, mat3x3f>) -> vec3f {`,
      ...bodyJ,
      `  *jOut = jt;`,
      `  return ${centre} + d;`,
      `}`,
      ``,
      `fn routeJacobian(pLocal: vec3f, c: DrawCentre, u: RouteUniforms) -> mat3x3f {`,
      `  var j: mat3x3f;`,
      `  tgRoute(pLocal, c, u, &j);`,
      `  return j;`,
      `}`,
      ``,
      `// The cofactor matrix det(M) M^-T: maps a surface normal through M.`,
      `fn tgCofactor(m: mat3x3f) -> mat3x3f {`,
      `  return mat3x3f(cross(m[1], m[2]), cross(m[2], m[0]), cross(m[0], m[1]));`,
      `}`,
      ``,
      `fn transformNormal(nLocal: vec3f, pLocal: vec3f, c: DrawCentre, u: RouteUniforms) -> vec3f {`,
      `  return normalize(tgCofactor(routeJacobian(pLocal, c, u)) * nLocal);`,
      `}`,
      ``,
      `// The normal made perpendicular to the transformed tangent (Gram-Schmidt).`,
      `fn transformNormalTangent(nLocal: vec3f, tLocal: vec3f, pLocal: vec3f, c: DrawCentre, u: RouteUniforms) -> vec3f {`,
      `  let j = routeJacobian(pLocal, c, u);`,
      `  let t = normalize(j * tLocal);`,
      `  let n = tgCofactor(j) * nLocal;`,
      `  return normalize(n - t * dot(n, t));`,
      `}`,
      ``,
      `struct TransformedVertex {`,
      `  position: vec3f,`,
      `  normal: vec3f,`,
      `}`,
      ``,
      `fn transformVertex(pLocal: vec3f, nLocal: vec3f, c: DrawCentre, u: RouteUniforms) -> TransformedVertex {`,
      `  var j: mat3x3f;`,
      `  let position = tgRoute(pLocal, c, u, &j);`,
      `  return TransformedVertex(position, normalize(tgCofactor(j) * nLocal));`,
      `}`,
      ``,
    );
  }
  return out.join("\n");
}

interface CentreShader {
  readonly wgsl: string;
  readonly uniformFloats: number;
  readonly affine: ReadonlyMap<number, number>;
}

/**
 * The compute shader that fills every draw's record in df64: the same chain
 * as `centreConstants`, with each program's nodes emitted by `emitDf64`.
 */
function centreShader(
  plan: Plan,
  infos: readonly SmoothInfo[],
  recordFloats: number,
  paramList: readonly { info: SmoothInfo; name: string; key: string }[],
  centreRows: boolean,
): CentreShader {
  const last = infos[infos.length - 1];
  let cursor = Math.ceil((4 + 2 * paramList.length) / 4) * 4;
  const affine = new Map<number, number>();
  for (const link of plan.links) {
    if (link.kind === "affine") {
      affine.set(link.index, cursor);
      cursor += 32;
    }
  }
  const uniformFloats = cursor;
  const uf = (offset: number) => slot("cu", offset);
  const paramIndex = (info: SmoothInfo, name: string) =>
    paramList.findIndex((p) => p.info === info && p.name === name);

  const out: string[] = [
    DF64_WGSL,
    `struct CentreUniforms {`,
    ...members(uniformFloats),
    `}`,
    ``,
    `@group(0) @binding(0) var<uniform> cu: CentreUniforms;`,
    `@group(0) @binding(1) var<storage, read> centres: array<f32>;`,
    `@group(0) @binding(2) var<storage, read_write> records: array<f32>;`,
    ...(centreRows
      ? [`@group(0) @binding(3) var<storage, read> rows: array<u32>;`]
      : []),
    ``,
  ];
  const evalFn = (name: string, pass: ResidualPass, info: SmoothInfo) => {
    const program = pass.centreProgram();
    const local = new Map(info.locals.map((n, i) => [n, i]));
    const { lines, ref } = emitDf64(
      program.nodes,
      {
        pos: (axis) => `x${axis}`,
        param: (n) => `P[${local.get(n)}]`,
      },
      "e",
    );
    const outputs = program.outputs.map(ref);
    out.push(
      `fn ${name}(x0: vec2f, x1: vec2f, x2: vec2f, P: array<vec2f, ${Math.max(1, info.locals.length)}>) -> array<vec2f, ${outputs.length}> {`,
      ...lines,
      `  return array<vec2f, ${outputs.length}>(${outputs.join(", ")});`,
      `}`,
      ``,
    );
  };
  for (const link of plan.links) {
    if (link.kind === "smooth") {
      evalFn(`tgcValue${link.info.j}`, link.value, link.info);
      if (link.jac) {
        evalFn(`tgcJac${link.info.j}`, link.jac, link.info);
      }
    }
  }

  const main: string[] = [
    `@compute @workgroup_size(64)`,
    `fn centreConstants(@builtin(global_invocation_id) gid: vec3u) {`,
    `  let i = gid.x;`,
    `  if (i >= bitcast<u32>(${uf(0)})) {`,
    `    return;`,
    `  }`,
    centreRows ? `  let rb = rows[i];` : `  let rb = i * ${recordFloats}u;`,
    `  var x0 = vec2f(centres[8u * i], centres[8u * i + 4u]);`,
    `  var x1 = vec2f(centres[8u * i + 1u], centres[8u * i + 5u]);`,
    `  var x2 = vec2f(centres[8u * i + 2u], centres[8u * i + 6u]);`,
  ];
  const zero = "vec2f(0.0)";
  for (const name of plan.separable) {
    for (let a = 0; a < 3; a++) {
      main.push(`  var g_${name}_${a}: vec2f = ${zero};`);
    }
  }
  const store = (offset: number, value: string) =>
    `    records[rb + ${offset}u] = ${value};`;
  for (const link of plan.links) {
    if (link.kind === "affine") {
      const base = affine.get(link.index)!;
      const m = (r: number, c: number) =>
        `vec2f(${uf(base + 4 * c + r)}, ${uf(base + 16 + 4 * c + r)})`;
      main.push(`  {`);
      for (let r = 0; r < 3; r++) {
        main.push(
          `    let n${r} = df_add(df_add(df_add(df_mul(${m(r, 0)}, x0), df_mul(${m(r, 1)}, x1)), df_mul(${m(r, 2)}, x2)), ${m(r, 3)});`,
        );
      }
      if (last && link.index > last.stepIndex) {
        for (const name of plan.separable) {
          for (let r = 0; r < 3; r++) {
            main.push(
              `    let ng${name}${r} = df_add(df_add(df_mul(${m(r, 0)}, g_${name}_0), df_mul(${m(r, 1)}, g_${name}_1)), df_mul(${m(r, 2)}, g_${name}_2));`,
            );
          }
        }
      }
      main.push(`    x0 = n0;`, `    x1 = n1;`, `    x2 = n2;`);
      if (last && link.index > last.stepIndex) {
        for (const name of plan.separable) {
          for (let r = 0; r < 3; r++) {
            main.push(`    g_${name}_${r} = ng${name}${r};`);
          }
        }
      }
      main.push(`  }`);
      continue;
    }
    const { info } = link;
    const isLast = info === last;
    const separable = isLast ? plan.separable : [];
    const np = Math.max(1, info.locals.length);
    main.push(`  {`, `    var P: array<vec2f, ${np}>;`);
    info.locals.forEach((name, k) => {
      const at = 4 + 2 * paramIndex(info, name);
      main.push(`    P[${k}] = vec2f(${uf(at)}, ${uf(at + 1)});`);
    });
    const index = (name: string) => info.locals.indexOf(name);
    for (const name of separable) {
      main.push(`    P[${index(name)}] = ${zero};`);
    }
    const passes: [string, ResidualPass][] = [["Value", link.value]];
    if (link.jac) {
      passes.push(["Jac", link.jac]);
    }
    for (const [kind, pass] of passes) {
      const fn = `tgc${kind}${info.j}`;
      const n = pass.outputs.length;
      main.push(`    let r${kind} = ${fn}(x0, x1, x2, P);`);
      pass.stored.forEach((s, k) => {
        main.push(store(s.offset, `r${kind}[${n + k}].x`));
      });
    }
    for (const name of separable) {
      main.push(`    P[${index(name)}] = vec2f(1.0, 0.0);`);
      for (const [kind, pass] of passes) {
        const fn = `tgc${kind}${info.j}`;
        const n = pass.outputs.length;
        const q = `q${kind}_${name}`;
        main.push(`    let ${q} = ${fn}(x0, x1, x2, P);`);
        pass.stored.forEach((s, k) => {
          const term = s.terms.indexOf(name);
          if (term >= 0) {
            main.push(
              store(
                s.offset + 1 + term,
                `df_sub(${q}[${n + k}], r${kind}[${n + k}]).x`,
              ),
            );
          }
        });
        if (kind === "Value") {
          for (let a = 0; a < 3; a++) {
            main.push(`    g_${name}_${a} = df_sub(${q}[${a}], rValue[${a}]);`);
          }
        }
      }
      main.push(`    P[${index(name)}] = ${zero};`);
    }
    main.push(
      `    x0 = rValue[0];`,
      `    x1 = rValue[1];`,
      `    x2 = rValue[2];`,
    );
    main.push(`  }`);
  }
  for (let a = 0; a < 3; a++) {
    main.push(
      `  records[rb + ${plan.outHi + a}u] = x${a}.x;`,
      `  records[rb + ${plan.outLo + a}u] = x${a}.y;`,
    );
  }
  for (const name of plan.separable) {
    for (let a = 0; a < 3; a++) {
      main.push(
        `  records[rb + ${plan.outG.get(name)! + a}u] = g_${name}_${a}.x;`,
        `  records[rb + ${plan.outG.get(name)! + 4 + a}u] = g_${name}_${a}.y;`,
      );
    }
  }
  main.push(`}`, ``);
  out.push(...main);
  return { wgsl: out.join("\n"), uniformFloats, affine };
}
