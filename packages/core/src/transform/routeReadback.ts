// CS-54's route readback: compiled routes on the GPU, held against their
// float64 map. For every built-in transform, its route (content through the
// built-in to the world, as in the golden fixtures, `test/transformGolden.test.ts`)
// is compiled with exact normals. A kernel runs `tgRoute` at offsets from a
// draw center and writes the position relative to the eye, the center term
// alone (`tgCenter`, the integer sums of the center constants, the eye and the
// separable parameters), and the Jacobian's three columns. The change from
// the center is the position minus the center term: the float32 work of the
// residual rules. The eye is the route's image of the center, or, in the
// eye-away cases (CS-986), each row's own eye, which the kernel writes into
// its copy of the uniforms. The center term is held against the exact value
// of the parts it reads, to the bound derived in centerTerm.ts. The WebGPU suite (`bench/irWgsl.ts`) runs a compute
// kernel around `CompiledRoute.wgsl`, and the WebGL 2 suite (`bench/irGlsl.ts`)
// a vertex shader around `CompiledRoute.glsl`, read back by transform feedback.
// Both run the same cases against the same tolerances, so the two emitters are
// held to one claim, as `src/ir/readback.ts` holds the op cases.
//
// On both backends the center constants come from the CPU in float64
// (`centerConstants`), as they do on WebGL 2, where the df64 compute pass has
// no form. One case puts two routes, prefixed `a_` and `b_`, in one kernel: the
// name-prefix option links two compiled routes into one program.
//
// Every buffer index in the kernels is clamped and they have no loops.
//
// The cases themselves, which name the built-ins, are in
// `src/transforms/routeCases.ts`: the transform core imports none of them.
//
// Not exported from the entry point: it is test support.
import {
  centerTermBound,
  centerTermExact,
  fixParts,
  fromFixParts,
  type CenterInputs,
} from "./centerTerm.ts";
import { compileRoute, type CompiledRoute } from "./compile.ts";
import { evaluate } from "./evaluate.ts";
import type { Route } from "./route.ts";

export type Vec3 = readonly [number, number, number];

/** One route in a kernel: its compiled module, its draw center and its eye. */
export interface RouteUnit {
  readonly route: Route;
  readonly compiled: CompiledRoute;
  /** The draw center, in the content's frame (the route's input). */
  readonly center: Vec3;
  /** The route's float64 image of the center. */
  readonly image: Float64Array;
  /** The eye `uniforms` hold: the image, unless a case gives each row its own (`RouteCase.eyes`). */
  readonly eye: Float64Array;
  /** The per-draw record (`DrawCenter`), from the CPU in float64. */
  readonly record: Float32Array;
  /** The per-view uniforms (`RouteUniforms`) for `eye`. */
  readonly uniforms: Float32Array;
}

/** An error bound: `abs + rel · scale`, where the scale is the row's own size. */
export interface Bound {
  readonly abs: number;
  readonly rel: number;
}

export interface RouteCase {
  readonly name: string;
  /** What the outputs are in: the built-in's output unit. */
  readonly units: string;
  /** One route, or two (prefixed `a_` and `b_`) in one kernel. */
  readonly routes: readonly RouteUnit[];
  /** Offsets from the draw center (the kernel's rows), in the content's frame. */
  readonly rows: readonly Vec3[];
  /**
   * The change from the center (position minus center term, in `units`): its
   * scale is the row's |offset| times the largest entry of J there, so the
   * bound is relative to how far the vertex moved.
   */
  readonly position: Bound;
  /**
   * The center term (`tgCenter`, in `units`), against the exact value of the
   * parts it reads: its scale is the term's derived worst-case error there
   * (`centerTermBound`), so `CENTER`, `{abs: 0, rel: 1}`, is that bound.
   */
  readonly center: Bound;
  /**
   * The parts the center term reads, against the float64 map (the route's
   * image of the center less the eye): the CPU's float64 inputs, which every
   * backend shares. Its scale is |F(c)| plus |eye|, per axis.
   */
  readonly inputs: Bound;
  /**
   * An eye for each row, in `units` (single-route cases only): the kernel
   * writes each into its own copy of `RouteUniforms`, so the center term is
   * read with the eye away from the draw's image. Without it, every row's eye
   * is the image.
   */
  readonly eyes?: readonly Vec3[];
  /** The Jacobian's entries: their scale is the largest entry of J there. */
  readonly jacobian: Bound;
  /**
   * The drawn position: what the kernel writes as the position (the center
   * term plus the change, relative to the eye, in `units`), against the
   * float64 map less the eye. Its scale is |F(c)|. Only the corridor cases
   * set it: it holds CS-54's 0.1 mm baseline on the GPU's own answer.
   */
  readonly drawn?: Bound;
}

/** Floats a kernel writes per row for one route: the position, the center term, then J's columns. */
export const ROUTE_OUT_FLOATS = 15;

// --- Bounds and offsets ------------------------------------------------------

/**
 * The float32 change from the draw center keeps a tenth of a millimeter
 * (CS-54's corridor baseline): plan meters in and out, kilometers along the
 * alignment, draws 120 m across.
 */
export const CORRIDOR_CHANGE_M = 1e-4;

/**
 * The corridor's drawn position (center term plus change) keeps a tenth of a
 * millimeter too, in meters, on both backends: the 0.1 mm the baseline means
 * is where the vertex lands.
 */
export const CORRIDOR_DRAWN_M = 1e-4;

/**
 * float32 on changes: a few hundred ulps of the vertex's own movement, for
 * the residual rules' helpers and the GPU's transcendental built-ins, which
 * WebGPU and GLSL ES leave a few ulps loose each. Measured on an Apple M2
 * (2026-11-22): at most 0.44 of this on either backend.
 */
export const POSITION: Bound = { abs: 0, rel: 4e-5 };
/**
 * The center term, against the exact value of the parts it reads: the bound
 * derived in centerTerm.ts (`centerTermBound`), with nothing added (CS-921,
 * CS-986). It replaces CS-54's 2 × 10⁻⁷ of |F(c)| (1.3 m at the Earth's
 * surface), a figure measured with the eye at the draw's image.
 */
export const CENTER: Bound = { abs: 0, rel: 1 };
/**
 * The parts against the float64 map: the CPU's inputs, shared by every
 * backend, with its scale (`inputsScaleOf`) (1 + Σⱼ|sⱼ|)·(|F(c)| + |eye|).
 * Each value in the exact form is its float64 to 2⁻⁴⁹ units; what is left is
 * float64 evaluations' agreement: the record's F(c), and each G(c), a
 * difference of two evaluations as large as |F(c)| times the parameter s,
 * against `Route.forward`. That is 2 + 2J evaluations, weighted 1 or |s|.
 * Taking each within one float64 ulp of the scale (2⁻⁵² of it) gives rel
 * 2·2⁻⁵². For flatten's 150 m at the Earth's surface that is 6 × 10⁻⁷ m
 * (measured 6.6 × 10⁻⁸ m, a ratio of 0.11), where a fixed 10⁻⁷ m had less
 * room than the plausible worst, 150 ulps of 6.4 × 10⁶ m (1.4 × 10⁻⁷ m).
 * The one ulp is an assumption about the built-ins' float64 programs, not a
 * derivation from them, and it doesn't hold for the multi-step built-ins
 * (geocentric to geographic, the transverse Mercator series), whose float64
 * work runs through values larger than their output: for them the absolute
 * term carries the agreement. abs 10⁻⁹ is measured, not derived (geocentric
 * to geographic, 5 × 10⁻¹⁰), and it doesn't grow with the values. A value
 * whose whole units leave int32's range is float32 (`fixParts`): its case
 * adds 2⁻²⁴ of its scale.
 */
export const INPUTS: Bound = { abs: 1e-9, rel: 2 * 2 ** -52 };

/**
 * `INPUTS`' scale on one axis: (1 + Σⱼ|sⱼ|)·(|F(c)| + |eye|), the separable
 * parameters' values from the parts the center term reads.
 */
export function inputsScaleOf(
  x: CenterInputs,
  image: number,
  eye: number,
): number {
  let s = 1;
  for (const [p] of x.terms) {
    s += Math.abs(fromFixParts(p.p, p.at));
  }
  return s * (Math.abs(image) + Math.abs(eye));
}
/** float32 on J's entries, against the largest: measured at most 3.5 × 10⁻⁷ of it. */
export const JACOBIAN: Bound = { abs: 0, rel: 2e-6 };

/** The offsets of one draw's vertices: its center, the corners and edge midpoints of its box, and a few inside. */
export function offsetsOf(half: Vec3): Vec3[] {
  const out: Vec3[] = [[0, 0, 0]];
  for (const f of [1, 0.37]) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          out.push([sx * f * half[0], sy * f * half[1], sz * f * half[2]]);
        }
      }
    }
  }
  for (let a = 0; a < 3; a++) {
    for (const s of [-1, 1]) {
      const v: [number, number, number] = [0, 0, 0];
      v[a] = s * half[a]!;
      out.push(v);
    }
  }
  out.push([0.013 * half[0], -0.002 * half[1], 0.0007 * half[2]]);
  return out;
}

/** One route compiled with exact normals, its eye at its image of `center`, and its record and uniforms. */
export function unitOf(route: Route, center: Vec3, prefix = ""): RouteUnit {
  const compiled = compileRoute(route, { normals: "exact", prefix });
  if (!compiled.ok) {
    throw new Error(compiled.reason);
  }
  const eye = route.forward(center);
  return {
    route,
    compiled,
    center,
    image: eye,
    eye,
    record: compiled.centerConstants(center),
    uniforms: compiled.fillUniforms(route, undefined, eye),
  };
}

// --- The kernels ------------------------------------------------------------

/**
 * Each row's eye as the center term's parts (12 floats a row, `fixParts`
 * per axis), for a case with `eyes`; else null.
 */
export function rowEyeParts(c: RouteCase): Float32Array | null {
  if (!c.eyes) {
    return null;
  }
  if (c.routes.length !== 1 || c.eyes.length !== c.rows.length) {
    throw new Error(`${c.name}: one eye a row, for one route`);
  }
  const out = new Float32Array(12 * c.eyes.length);
  c.eyes.forEach((e, i) => {
    for (let a = 0; a < 3; a++) {
      fixParts(e[a]!, out, 12 * i + 4 * a);
    }
  });
  return out;
}

/**
 * The input buffer: each row's offset, 3 floats (at least one float), then,
 * for a case with `eyes`, each row's eye parts (`rowEyeParts`).
 */
export function packRouteRows(c: RouteCase): Float32Array {
  const eyes = rowEyeParts(c);
  const offsets = 3 * c.rows.length;
  const input = new Float32Array(Math.max(offsets + (eyes?.length ?? 0), 1));
  c.rows.forEach((r, i) => input.set(r, 3 * i));
  if (eyes) {
    input.set(eyes, offsets);
  }
  return input;
}

/** Floats per row in the output: `ROUTE_OUT_FLOATS` per route. */
export const routeOutStride = (c: RouteCase): number =>
  ROUTE_OUT_FLOATS * c.routes.length;

/**
 * A WGSL compute kernel: the routes' modules, the rows at binding 0, the
 * answers at binding 1, and route k's `DrawCenter` and `RouteUniforms` as
 * uniforms at bindings 2 + 2k and 3 + 2k. One invocation per row.
 */
export function routeKernelWgsl(c: RouteCase): {
  code: string;
  entry: string;
} {
  const rows = c.rows.length;
  const stride = routeOutStride(c);
  const lines: string[] = [];
  c.routes.forEach((u) => lines.push(u.compiled.wgsl, ""));
  lines.push(
    `@group(0) @binding(0) var<storage, read> rin: array<f32>;`,
    `@group(0) @binding(1) var<storage, read_write> rout: array<f32>;`,
  );
  c.routes.forEach((u, k) => {
    const p = u.compiled.prefix;
    lines.push(
      `@group(0) @binding(${2 + 2 * k}) var<uniform> rc${k}: ${p}DrawCenter;`,
      `@group(0) @binding(${3 + 2 * k}) var<uniform> ru${k}: ${p}RouteUniforms;`,
    );
  });
  lines.push(
    `@compute @workgroup_size(64) fn route_kernel(@builtin(global_invocation_id) gid: vec3u) {`,
    `  let i = gid.x;`,
    `  if (i >= ${rows}u) { return; }`,
    `  let ni = arrayLength(&rin) - 1u;`,
    `  let no = arrayLength(&rout) - 1u;`,
    `  let p = vec3f(rin[min(3u * i, ni)], rin[min(3u * i + 1u, ni)], rin[min(3u * i + 2u, ni)]);`,
  );
  c.routes.forEach((u, k) => {
    const p = u.compiled.prefix;
    const base = ROUTE_OUT_FLOATS * k;
    let view = `ru${k}`;
    if (c.eyes) {
      // The row's eye, after the offsets, into a copy of the uniforms.
      const e = u.compiled.uniformsLayout.fields.eye! >> 2;
      const at = 3 * rows;
      view = `uu${k}`;
      lines.push(`  var uu${k}: ${p}RouteUniforms = ru${k};`);
      for (let a = 0; a < 3; a++) {
        const f = (n: number) =>
          `rin[min(${at}u + 12u * i + ${4 * a + n}u, ni)]`;
        lines.push(
          `  uu${k}.v${e + a} = vec4f(${f(0)}, ${f(1)}, ${f(2)}, ${f(3)});`,
        );
      }
    }
    lines.push(
      `  var j${k}: mat3x3f;`,
      `  let q${k} = ${p}tgRoute(p, rc${k}, ${view}, &j${k});`,
      `  let o${k} = ${p}tgCenter(rc${k}, ${view});`,
    );
    const lanes = [`q${k}`, `o${k}`, `j${k}[0]`, `j${k}[1]`, `j${k}[2]`];
    lanes.forEach((v, l) => {
      for (let a = 0; a < 3; a++) {
        lines.push(
          `  rout[min(i * ${stride}u + ${base + 3 * l + a}u, no)] = ${v}.${"xyz"[a]};`,
        );
      }
    });
  });
  lines.push(`}`);
  return { code: lines.join("\n"), entry: "route_kernel" };
}

/**
 * A GLSL ES 3.00 vertex shader: the routes' modules, the offset as attribute
 * `tg_p`, route k's `DrawCenter` and `RouteUniforms` in std140 blocks
 * `TgDraw<k>` and `TgView<k>`, and the answers as varyings `tg_o<n>` (five
 * vec3s per route: the position, the center term and J's columns), for
 * transform feedback.
 */
export function routeKernelGlsl(c: RouteCase): {
  code: string;
  attribute: string;
  varyings: string[];
  blocks: { name: string; data: Float32Array }[];
} {
  const lines = [
    "#version 300 es",
    "precision highp float;",
    "precision highp int;",
  ];
  c.routes.forEach((u) => lines.push(u.compiled.glsl, ""));
  const blocks: { name: string; data: Float32Array }[] = [];
  const varyings: string[] = [];
  c.routes.forEach((u, k) => {
    const p = u.compiled.prefix;
    lines.push(
      `layout(std140) uniform TgDraw${k} { ${p}DrawCenter c; } tgd${k};`,
      `layout(std140) uniform TgView${k} { ${p}RouteUniforms u; } tgv${k};`,
    );
    blocks.push(
      { name: `TgDraw${k}`, data: u.record },
      { name: `TgView${k}`, data: u.uniforms },
    );
    for (let l = 0; l < 5; l++) {
      varyings.push(`tg_o${5 * k + l}`);
    }
  });
  const eyes = rowEyeParts(c);
  if (eyes) {
    // Each row's eye parts: three vec4s a row, read by the vertex's index.
    lines.push(
      `layout(std140) uniform TgEyes { vec4 e[${eyes.length / 4}]; } tge;`,
    );
    blocks.push({ name: "TgEyes", data: eyes });
  }
  lines.push(
    "in vec3 tg_p;",
    ...varyings.map((v) => `out vec3 ${v};`),
    "void main() {",
  );
  c.routes.forEach((u, k) => {
    const p = u.compiled.prefix;
    let view = `tgv${k}.u`;
    if (eyes) {
      const e = u.compiled.uniformsLayout.fields.eye! >> 2;
      view = `uu${k}`;
      lines.push(
        `  int r${k} = clamp(gl_VertexID, 0, ${c.rows.length - 1});`,
        `  ${p}RouteUniforms uu${k} = tgv${k}.u;`,
      );
      for (let a = 0; a < 3; a++) {
        lines.push(`  uu${k}.v${e + a} = tge.e[3 * r${k} + ${a}];`);
      }
    }
    lines.push(
      `  mat3 j${k};`,
      `  tg_o${5 * k} = ${p}tgRoute(tg_p, tgd${k}.c, ${view}, j${k});`,
      `  tg_o${5 * k + 1} = ${p}tgCenter(tgd${k}.c, ${view});`,
      `  tg_o${5 * k + 2} = j${k}[0];`,
      `  tg_o${5 * k + 3} = j${k}[1];`,
      `  tg_o${5 * k + 4} = j${k}[2];`,
    );
  });
  lines.push("  gl_Position = vec4(0.0);", "}");
  return { code: lines.join("\n"), attribute: "tg_p", varyings, blocks };
}

// --- The comparison -----------------------------------------------------------

/** One bound's result over a case. */
export interface BoundResult {
  readonly bound: Bound;
  compared: number;
  /** Largest |gpu - float64|. */
  maxAbs: number;
  /** Largest error as a fraction of what the bound allows (pass when <= 1). */
  worstRatio: number;
  worst: { row: number; lane: number; gpu: number; cpu: number } | null;
}

/** One route case's result, in the op cases' shape (`ReadbackRow`) and per bound. */
export interface RouteReadbackRow {
  name: string;
  units: string;
  rows: number;
  compared: number;
  skipped: number;
  maxAbs: number;
  worstRatio: number;
  compileMessages: string[];
  position: BoundResult;
  center: BoundResult;
  /** The CPU's inputs (the parts) against the float64 map. */
  inputs: BoundResult;
  jacobian: BoundResult;
  /** The drawn position's result, for a case that sets `drawn`; else null. */
  drawn: BoundResult | null;
  pass: boolean;
}

const bound = (b: Bound): BoundResult => ({
  bound: b,
  compared: 0,
  maxAbs: 0,
  worstRatio: 0,
  worst: null,
});

export function newRouteRow(c: RouteCase): RouteReadbackRow {
  return {
    name: c.name,
    units: c.units,
    rows: c.rows.length,
    compared: 0,
    skipped: 0,
    maxAbs: 0,
    worstRatio: 0,
    compileMessages: [],
    position: bound(c.position),
    center: bound(c.center),
    inputs: bound(c.inputs),
    jacobian: bound(c.jacobian),
    drawn: c.drawn ? bound(c.drawn) : null,
    pass: false,
  };
}

/** The eye row `row` reads for route `u`: its own (`RouteCase.eyes`), or the unit's. */
function eyeAt(c: RouteCase, u: RouteUnit, row: number): ArrayLike<number> {
  return c.eyes ? c.eyes[row]! : u.eye;
}

/**
 * The parts the center term reads on axis `a`, for row `row` and route `k`:
 * F(c) from the record, the eye (the row's own, or the uniforms'), and each
 * separable parameter with its derivative, in the shader's order.
 */
export function centerInputsOf(
  c: RouteCase,
  row: number,
  k: number,
  a: number,
): CenterInputs {
  const u = c.routes[k]!;
  const { perDrawLayout: draw, uniformsLayout: view } = u.compiled;
  const eyes = rowEyeParts(c);
  return {
    value: { p: u.record, at: draw.fields.out! + 4 * a },
    eye: eyes
      ? { p: eyes, at: 12 * row + 4 * a }
      : { p: u.uniforms, at: view.fields.eye! + 4 * a },
    terms: u.compiled.separableParams.map(
      (key) =>
        [
          { p: u.uniforms, at: view.fields[`paramParts:${key}`]! },
          { p: u.record, at: draw.fields[`outG:${key}`]! + 4 * a },
        ] as const,
    ),
  };
}

/** One lane's float64 answers: what an exact GPU writes, and what each bound compares. */
interface Expected {
  /** What an exact GPU writes (`routeOutStride` floats a row): position, center term, J. */
  readonly gpu: Float64Array;
  /** The change from the center, q(x) − q(c), per row, route and axis (3 a route). */
  readonly change: Float64Array;
  /** The drawn position, q(x) − eye, the same way. */
  readonly drawn: Float64Array;
  /** The center term's derived bound at its parts, the same way. */
  readonly centerBound: Float64Array;
  /** The float64 map's center term, q(c) − eye, the same way. */
  readonly map: Float64Array;
  /** The inputs bound's scale, |q(c)| + |eye| per axis, the same way. */
  readonly inputsScale: Float64Array;
}

function expectations(c: RouteCase): Expected {
  const stride = routeOutStride(c);
  const n = c.rows.length;
  const lanes = 3 * c.routes.length;
  const e: Expected = {
    gpu: new Float64Array(stride * n),
    change: new Float64Array(lanes * n),
    drawn: new Float64Array(lanes * n),
    centerBound: new Float64Array(lanes * n),
    map: new Float64Array(lanes * n),
    inputsScale: new Float64Array(lanes * n),
  };
  c.routes.forEach((u, k) => {
    // The kernels and the expected J are one curvilinear step's.
    if (u.compiled.steps.length !== 1) {
      throw new Error(
        `${c.name}: ${u.compiled.steps.length} curvilinear steps; the route readback compares one`,
      );
    }
    const step = u.compiled.steps[0]!;
    const values = u.compiled.paramValues(u.route);
    const local: Record<string, number> = {};
    for (const name of step.locals) {
      local[name] = values[step.keys.get(name)!]!;
    }
    c.rows.forEach((r, i) => {
      const x = [
        u.center[0] + Math.fround(r[0]),
        u.center[1] + Math.fround(r[1]),
        u.center[2] + Math.fround(r[2]),
      ];
      const q = u.route.forward(x);
      const eye = eyeAt(c, u, i);
      // The step's float64 autodiff J (row-major): the content's affine is the identity.
      const j = evaluate(step.jacobian!, x, local);
      const at = stride * i + ROUTE_OUT_FLOATS * k;
      for (let a = 0; a < 3; a++) {
        const lane = lanes * i + 3 * k + a;
        const inputs = centerInputsOf(c, i, k, a);
        const t = centerTermExact(inputs);
        e.change[lane] = q[a]! - u.image[a]!;
        e.drawn[lane] = q[a]! - eye[a]!;
        e.centerBound[lane] = centerTermBound(inputs, t);
        e.map[lane] = u.image[a]! - eye[a]!;
        e.inputsScale[lane] = inputsScaleOf(inputs, u.image[a]!, eye[a]!);
        e.gpu[at + a] = t + e.change[lane]!;
        e.gpu[at + 3 + a] = t;
        for (let col = 0; col < 3; col++) {
          e.gpu[at + 6 + 3 * col + a] = j[3 * a + col]!;
        }
      }
    });
  });
  return e;
}

/**
 * What an exact GPU writes at each row (`routeOutStride` floats): each
 * route's position (the center term plus the change), its center term (the
 * exact value of the parts it reads) and J's columns, in float64.
 */
export function expectedRoute(c: RouteCase): Float64Array {
  return expectations(c).gpu;
}

function record(
  b: BoundResult,
  row: number,
  lane: number,
  gpu: number,
  cpu: number,
  scale: number,
): void {
  b.compared++;
  const err = Math.abs(gpu - cpu);
  const allowed = b.bound.abs + b.bound.rel * scale;
  const ratio = Number.isNaN(err)
    ? Infinity
    : allowed === 0
      ? err === 0
        ? 0
        : Infinity
      : err / allowed;
  b.maxAbs = Math.max(b.maxAbs, Number.isNaN(err) ? Infinity : err);
  if (b.worst === null || ratio > b.worstRatio) {
    b.worstRatio = Math.max(ratio, b.worstRatio);
    b.worst = { row, lane, gpu, cpu };
  }
}

/** Compares a GPU's answers (`routeOutStride` floats per row) with the float64 ones. */
export function compareRoute(
  row: RouteReadbackRow,
  c: RouteCase,
  gpu: Float32Array,
): void {
  const expected = expectations(c);
  const stride = routeOutStride(c);
  const lanes = 3 * c.routes.length;
  c.rows.forEach((r, i) => {
    const moved = Math.hypot(r[0], r[1], r[2]);
    c.routes.forEach((u, k) => {
      const at = stride * i + ROUTE_OUT_FLOATS * k;
      const size = Math.hypot(u.image[0]!, u.image[1]!, u.image[2]!);
      let jmax = 0;
      for (let e = 6; e < ROUTE_OUT_FLOATS; e++) {
        jmax = Math.max(jmax, Math.abs(expected.gpu[at + e]!));
      }
      for (let e = 0; e < ROUTE_OUT_FLOATS; e++) {
        const lane = ROUTE_OUT_FLOATS * k + e;
        const cpu = expected.gpu[at + e]!;
        if (e < 3) {
          const l = lanes * i + 3 * k + e;
          // The change: the position less the GPU's own center term.
          const change = gpu[at + e]! - gpu[at + 3 + e]!;
          record(
            row.position,
            i,
            lane,
            change,
            expected.change[l]!,
            moved * jmax,
          );
          if (row.drawn) {
            // The drawn position: the GPU's position as written.
            record(row.drawn, i, lane, gpu[at + e]!, expected.drawn[l]!, size);
          }
        } else if (e < 6) {
          const l = lanes * i + 3 * k + e - 3;
          record(
            row.center,
            i,
            lane,
            gpu[at + e]!,
            cpu,
            expected.centerBound[l]!,
          );
          // The CPU's parts against the map: the same on every backend.
          record(
            row.inputs,
            i,
            lane,
            cpu,
            expected.map[l]!,
            expected.inputsScale[l]!,
          );
        } else {
          record(row.jacobian, i, lane, gpu[at + e]!, cpu, jmax);
        }
      }
    });
  });
  const bounds = [row.position, row.center, row.inputs, row.jacobian];
  if (row.drawn) {
    bounds.push(row.drawn);
  }
  row.compared = bounds.reduce((n, b) => n + b.compared, 0);
  row.maxAbs = Math.max(...bounds.map((b) => b.maxAbs));
  row.worstRatio = Math.max(...bounds.map((b) => b.worstRatio));
  row.pass = row.compared > 0 && row.worstRatio <= 1;
}
