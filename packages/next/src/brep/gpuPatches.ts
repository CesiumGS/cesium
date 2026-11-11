// The b-rep form prepared for GPU dicing (overall plan §13.33, "Step 5
// redirected", part 1): one record per (face, span) with everything the
// shaders need, and a float64 reference of what they compute.
//
// A span is the part of one patch (a Bézier surface) or of one angular piece
// (an analytic surface, cut at quarter turns) under the face's draw rect:
// the bounding rect of the face's loops' pcurves, as control-point hulls. The
// GPU dices each span into an n_u × n_v grid, evaluating the surface at every
// vertex (analytic formulas as form.ts documents, or de Casteljau on the
// homogeneous net) and drawing the whole rect; a face whose trim is exactly
// its rect (`needsTrim` false) is complete, others carry trim data
// (gpuTrims.ts) that the fragment stage tests per pixel.
//
// Error: a triangulated n_u × n_v grid over a span lies within
//   C_u / n_u² + C_uv / (n_u n_v) + C_v / n_v²
// metres of the surface (model space, before any placement). With h and k the
// cell's sides in (u, v), the constants come from a bound on the distance a
// cell's triangles leave,
//   D_u h² + D_uv h k + D_v k²,
// with D per unit parameter, and C = D × the span's widths:
// - Analytic kinds: the sagitta r θ² / 8 of a circle of the widest radius
//   (2 r sin²(θ / 4) ≤ r θ² / 8), along u, and along v where it bends too
//   (sphere, torus), as the tessellator bounds them (tessellate.ts `curvature`).
// - Bézier with an analytic identity: the same from the identity. A cell's
//   angle is at most the patch's rate in angle (bounds.ts `axisRates`) times
//   its sides, so a cylinder or cone leaves r (a / n_u + b / n_v)² / 8; a
//   sphere's cell has a chord from the speeds (`speedBounds`), and leaves
//   at most k times its square (k from the span's whole chord, the error's
//   convex shape under the line to it).
// - Free-form Bézier: (P_ss h² + 2 P_st h k + P_tt k²) / 8 from the sound
//   Bernstein bounds of the net (bounds.ts `netBounds`, any positive weights
//   and any degree: the products and ratios are over Bernstein bases of the
//   net's own degrees, up to 7 in each direction).
// The GPU takes the face's densities, the largest D over its spans, and a
// distance the same for all of them (the face's nearest), so every span of a
// face puts the same number of cells per unit of (u, v) and neighbouring
// spans meet on the same samples. Lengths are metres, angles radians.
import {
  axisRadius,
  axisRates,
  frameOf,
  netBounds,
  netOf,
  restrictNet,
  speedBounds,
  type Frame,
} from "./bounds.ts";
import { evaluatePatch } from "./bezier.ts";
import { buildFaceTrim, trimTolerance, type FaceTrimData } from "./gpuTrims.ts";
import { faceTrim } from "./tessellate.ts";
import { SurfaceKind, type BrepForm } from "./form.ts";

/** Words of a span's record on the GPU (f32 and u32 alike). */
export const SPAN_WORDS = 48;
/** The highest Bézier degree the GPU evaluates, per direction: the form's most (form.ts). */
export const MAX_GPU_DEGREE = 7;
/** The most cells along a span's side the GPU dices to. */
export const MAX_CELLS = 64;
/** `GpuSpan.trim` of a face whose trim is its rect: no trim data. */
export const NO_TRIM = 0xffffffff;
/** `GpuSpan.trim` of a face that needs a trim test, until `packGpuPatches` writes the data's offset. */
export const TRIM_PENDING = 0xfffffffe;
/** The widest angle of one analytic span, rad: wider rects are cut so a span keeps a useful bound and a bounding sphere. */
const ANALYTIC_PIECE = Math.PI / 2;
/** A bound that failed (undefined from bounds.ts): large, finite in float32 squares. */
const HUGE = 1e12;

type Box = readonly [number, number, number, number];
type Sphere = readonly [number, number, number, number];

/** Record word offsets (`SPAN_WORDS` of them); the shaders' `PatchSpan` reads the same. */
export const SPAN = {
  kind: 0,
  degrees: 1,
  face: 2,
  controls: 3,
  origin: 4,
  axisX: 7,
  axisY: 10,
  params: 13,
  domain: 15,
  rect: 19,
  corner: 23,
  sphere: 25,
  faceSphere: 29,
  density: 33,
  speed: 36,
  error: 38,
  trim: 41,
} as const;
/** Bits of `SPAN.kind`'s word above the kind. */
export const SPAN_REVERSED = 1 << 8;
export const SPAN_NEEDS_TRIM = 1 << 9;

/** One (face, span) record, in float64. */
export interface GpuSpan {
  readonly face: number;
  readonly surface: number;
  /** The patch of a Bézier span; -1 for an analytic one. */
  readonly patch: number;
  /** How the span is evaluated: an analytic kind, or `Bezier`. */
  readonly kind: SurfaceKind;
  /** The face's outward normal is −(∂u × ∂v). */
  readonly reversed: boolean;
  readonly degreeU: number;
  readonly degreeV: number;
  /** A Bézier span's homogeneous control net relative to `origin` (4 per point, u fastest); empty for an analytic one. */
  readonly net: Float64Array;
  /** An analytic span's origin, x axis and y axis, origin relative. */
  readonly frame: Float64Array;
  /** An analytic span's radii and angle (form.ts `surfaceParams`). */
  readonly params: readonly [number, number];
  /** The patch's domain in (u, v), which a Bézier span's local parameters span; the rect for an analytic span. */
  readonly domain: Box;
  /** What the span draws: the face's rect within this patch or piece. */
  readonly rect: Box;
  /** The face rect's lowest u and v: the UV varying is (u, v) minus this. */
  readonly corner: readonly [number, number];
  /** Bounding sphere of the span's surface, model space. */
  readonly sphere: Sphere;
  /** Bounding sphere of the face's spans. */
  readonly faceSphere: Sphere;
  /** C_u, C_uv, C_v: the error constants of the span, m (see above). */
  readonly c: readonly [number, number, number];
  /** D_u, D_uv, D_v: the largest per-unit-parameter constants over the face's spans, m. */
  readonly density: readonly [number, number, number];
  /** The largest speeds |∂P/∂u| and |∂P/∂v| over the face's spans, m per unit parameter: for the error a placement adds. */
  readonly speed: readonly [number, number];
  /** How far the stored geometry may be from the modeling surface, m (not part of the display error). */
  readonly representationError: number;
  /** `NO_TRIM` for a face the rect completes, else `TRIM_PENDING` here and the trim data's word offset in the packed spans (`packGpuPatches`). */
  readonly trim: number;
  readonly needsTrim: boolean;
}

/** A face as prepared. */
export interface GpuFace {
  readonly face: number;
  /** False when the GPU path can't draw it (`reason`); it has no spans. */
  readonly supported: boolean;
  readonly reason?: string;
  /** The face's trim isn't its rect. */
  readonly needsTrim: boolean;
  readonly reversed: boolean;
  /** The bounding rect of the loops' pcurves (control-point hulls). */
  readonly rect: Box | undefined;
  /** The loops as the fragment's trim test reads them (gpuTrims.ts); only for a face that needs one and the GPU can draw. */
  readonly trim: FaceTrimData | undefined;
  /** Its spans in `GpuPatches.spans`. */
  readonly first: number;
  readonly count: number;
  readonly sphere: Sphere | undefined;
}

export interface GpuPatches {
  /** What positions are relative to, m: the draw's anchor. */
  readonly origin: Float64Array;
  /** One per face of the form. */
  readonly faces: readonly GpuFace[];
  /** Every span of every supported face, by face. */
  readonly spans: readonly GpuSpan[];
  /** A sphere around everything, model space. */
  readonly sphere: Sphere;
}

export interface PrepareOptions {
  /** What positions are relative to (default: the center of the form's bounds). */
  readonly origin?: ArrayLike<number>;
  /**
   * The display tolerance of the trims as a share of a face's size (default
   * `DISPLAY_TRIM_TOLERANCE`, 1e-4): how far a trim piece may stray from the
   * face's pcurves in the drawing. Picks are refined exactly.
   */
  readonly trimTolerance?: number;
}

/** The records, control points and trim data packed for the GPU: spans, then control points, then trims. */
export interface GpuPatchData {
  readonly words: Uint32Array;
  readonly f32: Float32Array;
  readonly spanCount: number;
  /** The packed spans, in record order, with their trim words as written. */
  readonly spans: readonly GpuSpan[];
  /** A sphere around the packed spans. */
  readonly sphere: Sphere;
  /** Some packed span's face needs the trim test: the draw uses the trimmed pipelines. */
  readonly trimmed: boolean;
}

/**
 * A record for every face of the form: its span records, its rect and whether
 * it needs a trim test. Faces the GPU can't draw (no loops, no patch under the
 * rect, a degree the form doesn't allow) are marked, with no spans.
 */
export function prepareGpuPatches(
  form: BrepForm,
  options: PrepareOptions = {},
): GpuPatches {
  const origin = Float64Array.from(options.origin ?? formCenter(form));
  const nets = new Map<number, Float64Array>();
  const netFor = (patch: number): Float64Array => {
    let h = nets.get(patch);
    if (!h) {
      h = netOf(form, patch).h.slice();
      for (let i = 0; i < h.length; i += 4) {
        for (let k = 0; k < 3; k++) {
          h[i + k] = h[i + k]! - origin[k]! * h[i + 3]!;
        }
      }
      nets.set(patch, h);
    }
    return h;
  };
  const faces: GpuFace[] = [];
  const spans: GpuSpan[] = [];
  const count = form.faceSurface.length;
  for (let face = 0; face < count; face++) {
    const built = prepareFace(
      form,
      face,
      origin,
      netFor,
      options.trimTolerance,
    );
    faces.push({
      ...built.face,
      first: spans.length,
      count: built.spans.length,
    });
    spans.push(...built.spans);
  }
  return { origin, faces, spans, sphere: enclose(spans.map((s) => s.sphere)) };
}

/**
 * The records of the faces `include` keeps (default: every supported face),
 * as the words the shaders read: `SPAN_WORDS` per span, then each control
 * point they use once, four floats homogeneous, then each trimmed face's
 * trim data (gpuTrims.ts). Control and trim offsets in the records are words
 * from the start.
 */
export function packGpuPatches(
  patches: GpuPatches,
  include: (face: GpuFace) => boolean = () => true,
): GpuPatchData {
  const kept = patches.spans.filter((span) =>
    include(patches.faces[span.face]!),
  );
  let controlWords = 0;
  const offsets = new Map<Float64Array, number>();
  for (const span of kept) {
    if (span.net.length > 0 && !offsets.has(span.net)) {
      offsets.set(span.net, kept.length * SPAN_WORDS + controlWords);
      controlWords += span.net.length;
    }
  }
  let trimWords = 0;
  const trimAt = new Map<number, number>();
  for (const span of kept) {
    const data = patches.faces[span.face]!.trim;
    if (data && !trimAt.has(span.face)) {
      trimAt.set(
        span.face,
        kept.length * SPAN_WORDS + controlWords + trimWords,
      );
      trimWords += data.words.length;
    }
  }
  const words = new Uint32Array(
    kept.length * SPAN_WORDS + controlWords + trimWords,
  );
  const f32 = new Float32Array(words.buffer);
  const packed = kept.map((span): GpuSpan => {
    const at = trimAt.get(span.face);
    return at === undefined ? span : { ...span, trim: at };
  });
  packed.forEach((span, index) => {
    const o = index * SPAN_WORDS;
    const put = (at: number, values: ArrayLike<number>): void => {
      for (let k = 0; k < values.length; k++) {
        f32[o + at + k] = values[k]!;
      }
    };
    words[o + SPAN.kind] =
      span.kind |
      (span.reversed ? SPAN_REVERSED : 0) |
      (span.needsTrim ? SPAN_NEEDS_TRIM : 0);
    words[o + SPAN.degrees] = span.degreeU | (span.degreeV << 8);
    words[o + SPAN.face] = span.face;
    words[o + SPAN.controls] = offsets.get(span.net) ?? 0;
    put(SPAN.origin, span.frame.subarray(0, 3));
    put(SPAN.axisX, span.frame.subarray(3, 6));
    put(SPAN.axisY, span.frame.subarray(6, 9));
    put(SPAN.params, span.params);
    put(SPAN.domain, span.domain);
    put(SPAN.rect, span.rect);
    put(SPAN.corner, span.corner);
    put(SPAN.sphere, span.sphere);
    put(SPAN.faceSphere, span.faceSphere);
    put(SPAN.density, span.density);
    put(SPAN.speed, span.speed);
    put(SPAN.error, span.c);
    words[o + SPAN.trim] = span.trim;
  });
  for (const [net, at] of offsets) {
    for (let k = 0; k < net.length; k++) {
      f32[at + k] = net[k]!;
    }
  }
  for (const [face, at] of trimAt) {
    words.set(patches.faces[face]!.trim!.words, at);
  }
  return {
    words,
    f32,
    spanCount: packed.length,
    spans: packed,
    sphere: enclose(packed.map((s) => s.sphere)),
    trimmed: packed.some((s) => s.needsTrim),
  };
}

// The cell counts the GPU takes (shaders/dice.slang `diceCounts` is this).

/**
 * Cells per unit of u and v that keep a span's error within `error` m (model
 * space), from the face's densities: the terms of the error that aren't
 * zero share it equally (a cylinder's one term gets all of it).
 * `jacobian` and `curvature` are a placement's bounds (its Jacobian's norm
 * and its second derivative's, model units), which the placed surface adds:
 * D' = jacobian · D + curvature · speeds² / 8 term by term.
 */
export function diceDensity(
  span: Pick<GpuSpan, "density" | "speed">,
  error: number,
  jacobian = 1,
  curvature = 0,
): { u: number; v: number } {
  const [su, sv] = span.speed;
  const du = jacobian * span.density[0] + (curvature * su * su) / 8;
  const duv = jacobian * span.density[1] + (curvature * 2 * su * sv) / 8;
  const dv = jacobian * span.density[2] + (curvature * sv * sv) / 8;
  const shares = Number(du > 0) + Number(duv > 0) + Number(dv > 0);
  let u = Math.sqrt((shares * du) / error);
  let v = Math.sqrt((shares * dv) / error);
  const wanted = (shares * duv) / error;
  const have = u * v;
  if (have < wanted) {
    if (u > 0 && v > 0) {
      const f = Math.sqrt(wanted / have);
      u *= f;
      v *= f;
    } else if (u > 0) {
      v = wanted / u;
    } else if (v > 0) {
      u = wanted / v;
    } else {
      u = v = Math.sqrt(wanted);
    }
  }
  return { u, v };
}

/** The cells along a span's sides for an error of `error` m: `diceDensity` times the rect's widths, rounded up to 1 to `MAX_CELLS`. */
export function diceCounts(
  span: Pick<GpuSpan, "density" | "speed" | "rect">,
  error: number,
  jacobian = 1,
  curvature = 0,
): { nu: number; nv: number } {
  const { u, v } = diceDensity(span, error, jacobian, curvature);
  const count = (rate: number, width: number): number =>
    Math.min(MAX_CELLS, Math.max(1, Math.ceil(rate * width)));
  return {
    nu: count(u, span.rect[1] - span.rect[0]),
    nv: count(v, span.rect[3] - span.rect[2]),
  };
}

/** The error (m) of an n_u × n_v grid over the span, from its constants: C_u / n_u² + C_uv / (n_u n_v) + C_v / n_v². */
export function spanError(
  span: Pick<GpuSpan, "c">,
  nu: number,
  nv: number,
): number {
  return span.c[0] / (nu * nu) + span.c[1] / (nu * nv) + span.c[2] / (nv * nv);
}

// The surface, as the shaders evaluate it.

/** A span's surface point and unit normal at (u, v): model space, float64. */
export function evaluateSpan(
  span: GpuSpan,
  u: number,
  v: number,
): { position: Float64Array; normal: Float64Array } {
  const sign = span.reversed ? -1 : 1;
  if (span.kind !== SurfaceKind.Bezier) {
    const n = analyticNormal(span.kind, span.params, u, v);
    return {
      position: analyticPoint(span.kind, span.frame, span.params, u, v),
      normal: scaled(fromLocal(span.frame, n[0], n[1], n[2], false), sign),
    };
  }
  const first = bezierPoint(span, u, v);
  if (first.normal) {
    return { position: first.position, normal: scaled(first.normal, sign) };
  }
  // At a pole (a degenerate row): the normal a little inside the span.
  const inward = (x: number, lo: number, hi: number): number =>
    x + ((lo + hi) / 2 - x) * 1e-3;
  const [r0, r1, q0, q1] = span.rect;
  const nudged = bezierPoint(span, inward(u, r0, r1), inward(v, q0, q1));
  return {
    position: first.position,
    normal: scaled(nudged.normal ?? Float64Array.of(0, 0, 1), sign),
  };
}

function scaled(n: ArrayLike<number>, s: number): Float64Array {
  return Float64Array.of(s * n[0]!, s * n[1]!, s * n[2]!);
}

/** A Bézier span's point, and the unit ∂u × ∂v unless the derivatives are parallel or vanish. */
function bezierPoint(
  span: GpuSpan,
  u: number,
  v: number,
): { position: Float64Array; normal: Float64Array | undefined } {
  const [u0, u1, v0, v1] = span.domain;
  const s = u1 > u0 ? clamp01((u - u0) / (u1 - u0)) : 0;
  const t = v1 > v0 ? clamp01((v - v0) / (v1 - v0)) : 0;
  const sample = evaluatePatch(span.net, 0, span.degreeU, span.degreeV, s, t);
  const n = cross(sample.du, sample.dv);
  const length = Math.hypot(n[0], n[1], n[2]);
  const scale = Math.max(Math.hypot(...sample.du), Math.hypot(...sample.dv));
  return {
    position: sample.position,
    normal:
      length > 1e-9 * scale * scale && length > 0
        ? Float64Array.of(n[0] / length, n[1] / length, n[2] / length)
        : undefined,
  };
}

function cross(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): [number, number, number] {
  return [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
}

/** A local (a, b, c) along x, y, z = x × y as a model-space point or vector (`point` adds the origin). */
function fromLocal(
  frame: Float64Array,
  a: number,
  b: number,
  c: number,
  point: boolean,
): Float64Array {
  const x = [frame[3]!, frame[4]!, frame[5]!];
  const y = [frame[6]!, frame[7]!, frame[8]!];
  const z = cross(x, y);
  return Float64Array.of(
    (point ? frame[0]! : 0) + a * x[0]! + b * y[0]! + c * z[0],
    (point ? frame[1]! : 0) + a * x[1]! + b * y[1]! + c * z[1],
    (point ? frame[2]! : 0) + a * x[2]! + b * y[2]! + c * z[2],
  );
}

function analyticPoint(
  kind: SurfaceKind,
  frame: Float64Array,
  params: readonly [number, number],
  u: number,
  v: number,
): Float64Array {
  const [p0, p1] = params;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  switch (kind) {
    case SurfaceKind.Plane:
      return fromLocal(frame, u, v, 0, true);
    case SurfaceKind.Cylinder:
      return fromLocal(frame, p0 * cu, p0 * su, v, true);
    case SurfaceKind.Cone: {
      const radius = p0 + v * Math.tan(p1);
      return fromLocal(frame, radius * cu, radius * su, v, true);
    }
    case SurfaceKind.Sphere: {
      const cv = Math.cos(v);
      return fromLocal(
        frame,
        p0 * cv * cu,
        p0 * cv * su,
        p0 * Math.sin(v),
        true,
      );
    }
    case SurfaceKind.Torus: {
      const radius = p0 + p1 * Math.cos(v);
      return fromLocal(frame, radius * cu, radius * su, p1 * Math.sin(v), true);
    }
    default:
      throw new Error(`evaluateSpan: surface kind ${kind} isn't analytic`);
  }
}

/**
 * ∂u × ∂v normalized in the surface's local axes, in closed form: the
 * cross product's scalar factor (a radius, cos v) keeps its sign, so this
 * is the normal the derivatives give, and it is defined at a pole.
 */
function analyticNormal(
  kind: SurfaceKind,
  params: readonly [number, number],
  u: number,
  v: number,
): [number, number, number] {
  const [p0, p1] = params;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const sign = (x: number): number => (x < 0 ? -1 : 1);
  let a: number, b: number, c: number;
  switch (kind) {
    case SurfaceKind.Plane:
      [a, b, c] = [0, 0, 1];
      break;
    case SurfaceKind.Cylinder:
      [a, b, c] = [cu * sign(p0), su * sign(p0), 0];
      break;
    case SurfaceKind.Cone: {
      const t = Math.tan(p1);
      const side = sign(p0 + v * t);
      [a, b, c] = [cu * side, su * side, -t * side];
      break;
    }
    case SurfaceKind.Sphere: {
      const cv = Math.cos(v);
      const side = sign(p0) * sign(cv);
      [a, b, c] = [cv * cu * side, cv * su * side, Math.sin(v) * side];
      break;
    }
    default: {
      const cv = Math.cos(v);
      const side = sign(p1) * sign(p0 + p1 * cv);
      [a, b, c] = [cv * cu * side, cv * su * side, Math.sin(v) * side];
    }
  }
  const length = Math.hypot(a, b, c) || 1;
  return [a / length, b / length, c / length];
}

/**
 * The vertices a span's n_u × n_v grid has, as the GPU computes them in
 * float64: positions and normals in model space (relative to the origin),
 * the UV varying (u, v minus the face rect's corner) and triangles counter-
 * clockwise in (u, v), clockwise for a reversed face, so they face outward.
 * Vertices run u fastest.
 */
export function diceSpan(
  span: GpuSpan,
  nu: number,
  nv: number,
): {
  positions: Float64Array;
  normals: Float64Array;
  uvs: Float64Array;
  parameters: Float64Array;
  indices: Uint32Array;
} {
  const stride = nu + 1;
  const vertices = stride * (nv + 1);
  const positions = new Float64Array(vertices * 3);
  const normals = new Float64Array(vertices * 3);
  const uvs = new Float64Array(vertices * 2);
  const parameters = new Float64Array(vertices * 2);
  const [u0, u1, v0, v1] = span.rect;
  for (let j = 0; j <= nv; j++) {
    const v = j === nv ? v1 : v0 + ((v1 - v0) * j) / nv;
    for (let i = 0; i <= nu; i++) {
      const u = i === nu ? u1 : u0 + ((u1 - u0) * i) / nu;
      const k = j * stride + i;
      const sample = evaluateSpan(span, u, v);
      positions.set(sample.position, k * 3);
      normals.set(sample.normal, k * 3);
      uvs[k * 2] = u - span.corner[0];
      uvs[k * 2 + 1] = v - span.corner[1];
      parameters[k * 2] = u;
      parameters[k * 2 + 1] = v;
    }
  }
  const indices = new Uint32Array(nu * nv * 6);
  let at = 0;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * stride + i;
      const b = a + 1;
      const c = a + stride + 1;
      const d = a + stride;
      const quad = span.reversed ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
      indices.set(quad, at);
      at += 6;
    }
  }
  return { positions, normals, uvs, parameters, indices };
}

// Preparing a face.

function formCenter(form: BrepForm): Float64Array {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  const add = (x: number, y: number, z: number): void => {
    low[0] = Math.min(low[0]!, x);
    low[1] = Math.min(low[1]!, y);
    low[2] = Math.min(low[2]!, z);
    high[0] = Math.max(high[0]!, x);
    high[1] = Math.max(high[1]!, y);
    high[2] = Math.max(high[2]!, z);
  };
  const v = form.vertexPosition;
  for (let i = 0; i + 2 < v.length; i += 3) {
    add(v[i]!, v[i + 1]!, v[i + 2]!);
  }
  const p = form.patchPoints;
  for (let i = 0; i + 3 < p.length; i += 4) {
    add(p[i]! / p[i + 3]!, p[i + 1]! / p[i + 3]!, p[i + 2]! / p[i + 3]!);
  }
  return Float64Array.from(
    low.map((l, k) => (Number.isFinite(l) ? (l + high[k]!) / 2 : 0)),
  );
}

/** The bounding rect of a face's loops' pcurves: their segments' control-point hulls. */
function loopRect(form: BrepForm, face: number): Box | undefined {
  const firstLoop = form.faceLoops[face * 2]!;
  const loops = form.faceLoops[face * 2 + 1]!;
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  const c = form.curves2;
  for (let loop = firstLoop; loop < firstLoop + loops; loop++) {
    const firstUse = form.loopUses[loop * 2]!;
    const uses = form.loopUses[loop * 2 + 1]!;
    for (let use = firstUse; use < firstUse + uses; use++) {
      const first = form.usePcurve[use * 2]!;
      const count = form.usePcurve[use * 2 + 1]!;
      for (let segment = first; segment < first + count; segment++) {
        const start = c.first[segment]!;
        for (let k = 0; k <= c.degree[segment]!; k++) {
          const p = (start + k) * 3;
          const x = c.points[p]! / c.points[p + 2]!;
          const y = c.points[p + 1]! / c.points[p + 2]!;
          u0 = Math.min(u0, x);
          u1 = Math.max(u1, x);
          v0 = Math.min(v0, y);
          v1 = Math.max(v1, y);
        }
      }
    }
  }
  return [u0, u1, v0, v1].every(Number.isFinite) ? [u0, u1, v0, v1] : undefined;
}

interface Density {
  readonly d: [number, number, number];
  readonly speed: [number, number];
  readonly sphere: Sphere;
  readonly slack: number;
}

function prepareFace(
  form: BrepForm,
  face: number,
  origin: Float64Array,
  netFor: (patch: number) => Float64Array,
  display?: number,
): { face: Omit<GpuFace, "first" | "count">; spans: GpuSpan[] } {
  const reversed = form.faceReversed[face] === 1;
  const surface = form.faceSurface[face]!;
  const rect = loopRect(form, face);
  const trim = rect ? faceTrim(form, face) : undefined;
  const needsTrim = trim?.trimmed ?? false;
  const fail = (reason: string) => ({
    face: {
      face,
      supported: false,
      reason,
      needsTrim,
      reversed,
      rect,
      trim: undefined,
      sphere: undefined,
    },
    spans: [] as GpuSpan[],
  });
  if (!rect) {
    return fail("the face has no loop with a finite extent");
  }
  const kind = form.surfaceKind[surface] as SurfaceKind;
  const corner: readonly [number, number] = [rect[0], rect[2]];
  const pieces: SpanSource[] = [];
  if (kind === SurfaceKind.Bezier) {
    const first = form.surfacePatches[surface * 2]!;
    const count = form.surfacePatches[surface * 2 + 1]!;
    const eps = 1e-9;
    for (let patch = first; patch < first + count; patch++) {
      const domain: Box = [
        form.patchDomain[patch * 4]!,
        form.patchDomain[patch * 4 + 1]!,
        form.patchDomain[patch * 4 + 2]!,
        form.patchDomain[patch * 4 + 3]!,
      ];
      const spanU = rect[1] - rect[0];
      const spanV = rect[3] - rect[2];
      if (
        domain[1] <= rect[0] + eps * spanU ||
        domain[0] >= rect[1] - eps * spanU ||
        domain[3] <= rect[2] + eps * spanV ||
        domain[2] >= rect[3] - eps * spanV
      ) {
        continue;
      }
      const du = form.patchDegree[patch * 2]!;
      const dv = form.patchDegree[patch * 2 + 1]!;
      if (du > MAX_GPU_DEGREE || dv > MAX_GPU_DEGREE) {
        return fail(
          `a patch has degree ${du} × ${dv}; the GPU evaluates up to ${MAX_GPU_DEGREE}`,
        );
      }
      pieces.push({
        patch,
        domain,
        rect: [
          Math.max(rect[0], domain[0]),
          Math.min(rect[1], domain[1]),
          Math.max(rect[2], domain[2]),
          Math.min(rect[3], domain[3]),
        ],
      });
    }
  } else {
    const angularU = kind !== SurfaceKind.Plane;
    const angularV = kind === SurfaceKind.Sphere || kind === SurfaceKind.Torus;
    const pieceCount = (width: number, angular: boolean): number =>
      angular ? Math.max(1, Math.ceil(width / ANALYTIC_PIECE - 1e-9)) : 1;
    const ku = pieceCount(rect[1] - rect[0], angularU);
    const kv = pieceCount(rect[3] - rect[2], angularV);
    const edge = (lo: number, hi: number, i: number, k: number): number =>
      i === k ? hi : lo + ((hi - lo) * i) / k;
    for (let j = 0; j < kv; j++) {
      for (let i = 0; i < ku; i++) {
        const r: Box = [
          edge(rect[0], rect[1], i, ku),
          edge(rect[0], rect[1], i + 1, ku),
          edge(rect[2], rect[3], j, kv),
          edge(rect[2], rect[3], j + 1, kv),
        ];
        pieces.push({ patch: -1, domain: r, rect: r });
      }
    }
  }
  if (pieces.length === 0) {
    return fail("no patch lies under the face's rect");
  }

  const frameAt = new Float64Array(9);
  const params: [number, number] = [
    form.surfaceParams[surface * 2]!,
    form.surfaceParams[surface * 2 + 1]!,
  ];
  if (kind !== SurfaceKind.Bezier) {
    for (let k = 0; k < 9; k++) {
      frameAt[k] =
        form.surfaceFrame[surface * 9 + k]! - (k < 3 ? origin[k]! : 0);
    }
  }
  const densities = pieces.map((piece) =>
    pieceDensity(form, surface, kind, piece, params, frameAt, origin, netFor),
  );
  const density: [number, number, number] = [0, 0, 0];
  const speed: [number, number] = [0, 0];
  for (const d of densities) {
    for (let k = 0; k < 3; k++) {
      density[k] = Math.max(density[k]!, d.d[k]!);
    }
    speed[0] = Math.max(speed[0], d.speed[0]);
    speed[1] = Math.max(speed[1], d.speed[1]);
  }
  const faceSphere = enclose(densities.map((d) => d.sphere));
  const trimWord = needsTrim ? TRIM_PENDING : NO_TRIM;
  let trimData: FaceTrimData | undefined;
  if (needsTrim && trim) {
    const { uv } = trimTolerance({
      edgeTolerances: loopEdgeTolerances(form, face),
      size: 2 * faceSphere[3],
      speed,
      rect,
      ...(display !== undefined ? { display } : {}),
    });
    trimData = buildFaceTrim(form, face, rect, uv, trim.contains);
  }
  const spans = pieces.map((piece, index): GpuSpan => {
    const d = densities[index]!;
    const wu = piece.rect[1] - piece.rect[0];
    const wv = piece.rect[3] - piece.rect[2];
    return {
      face,
      surface,
      patch: piece.patch,
      kind,
      reversed,
      degreeU: piece.patch >= 0 ? form.patchDegree[piece.patch * 2]! : 0,
      degreeV: piece.patch >= 0 ? form.patchDegree[piece.patch * 2 + 1]! : 0,
      net: piece.patch >= 0 ? netFor(piece.patch) : EMPTY,
      frame: frameAt,
      params,
      domain: piece.domain,
      rect: piece.rect,
      corner,
      sphere: d.sphere,
      faceSphere,
      c: [d.d[0] * wu * wu, d.d[1] * wu * wv, d.d[2] * wv * wv],
      density,
      speed,
      representationError: d.slack,
      trim: trimWord,
      needsTrim,
    };
  });
  return {
    face: {
      face,
      supported: true,
      needsTrim,
      reversed,
      rect,
      trim: trimData,
      sphere: faceSphere,
    },
    spans,
  };
}

/** The tolerances, m, of the edges the face's loops use. */
function* loopEdgeTolerances(form: BrepForm, face: number): Iterable<number> {
  const firstLoop = form.faceLoops[face * 2]!;
  const loops = form.faceLoops[face * 2 + 1]!;
  for (let loop = firstLoop; loop < firstLoop + loops; loop++) {
    const firstUse = form.loopUses[loop * 2]!;
    const uses = form.loopUses[loop * 2 + 1]!;
    for (let use = firstUse; use < firstUse + uses; use++) {
      yield form.edgeTolerance[form.useEdge[use]!]!;
    }
  }
}

const EMPTY = new Float64Array(0);

interface SpanSource {
  readonly patch: number;
  readonly domain: Box;
  readonly rect: Box;
}

/** The per-unit constants, speeds and bounding sphere of one span. */
function pieceDensity(
  form: BrepForm,
  surface: number,
  kind: SurfaceKind,
  piece: SpanSource,
  params: readonly [number, number],
  frame: Float64Array,
  origin: Float64Array,
  netFor: (patch: number) => Float64Array,
): Density {
  const [u0, u1, v0, v1] = piece.rect;
  const wu = u1 - u0;
  const wv = v1 - v0;
  const [p0, p1] = [Math.abs(params[0]), params[1]];
  if (kind !== SurfaceKind.Bezier) {
    let d: [number, number, number];
    let speed: [number, number];
    switch (kind) {
      case SurfaceKind.Plane:
        d = [0, 0, 0];
        speed = [1, 1];
        break;
      case SurfaceKind.Cylinder:
        d = [p0 / 8, 0, 0];
        speed = [p0, 1];
        break;
      case SurfaceKind.Cone: {
        const t = Math.tan(p1);
        const widest = Math.max(Math.abs(p0 + v0 * t), Math.abs(p0 + v1 * t));
        d = [widest / 8, 0, 0];
        speed = [widest, Math.hypot(1, t)];
        break;
      }
      case SurfaceKind.Sphere: {
        const widest = maxAbsCos(v0, v1);
        d = [(widest * p0) / 8, 0, p0 / 8];
        speed = [widest * p0, p0];
        break;
      }
      default:
        d = [(p0 + Math.abs(p1)) / 8, 0, Math.abs(p1) / 8];
        speed = [p0 + Math.abs(p1), Math.abs(p1)];
    }
    // Every point of the span is within the speeds' reach of a sample. The
    // lines of a plane, and of a cylinder or cone along v, are straight: their
    // ends bound them, so those directions take no samples between and no pad.
    const bentU = kind !== SurfaceKind.Plane;
    const bentV = kind === SurfaceKind.Sphere || kind === SurfaceKind.Torus;
    const stepsU = bentU ? 16 : 1;
    const stepsV = bentV ? 16 : 1;
    const pad =
      (bentU ? (speed[0] * wu) / (2 * stepsU) : 0) +
      (bentV ? (speed[1] * wv) / (2 * stepsV) : 0);
    return {
      d,
      speed,
      sphere: analyticBall(
        kind,
        frame,
        params,
        piece.rect,
        stepsU,
        stepsV,
        pad,
      ),
      slack: 0,
    };
  }

  const patch = piece.patch;
  const pwu = piece.domain[1] - piece.domain[0];
  const pwv = piece.domain[3] - piece.domain[2];
  const net = netOf(form, patch);
  const h = netFor(patch);
  const identity = form.surfaceIdentity[surface] as SurfaceKind;
  const slack = form.surfaceError[surface]!;
  // The span's part of the net bounds its surface, by the convex hull.
  const s0 = (u0 - piece.domain[0]) / pwu;
  const s1 = (u1 - piece.domain[0]) / pwu;
  const t0 = (v0 - piece.domain[2]) / pwv;
  const t1 = (v1 - piece.domain[2]) / pwv;
  const part = restrictNet(
    { du: net.du, dv: net.dv, h: Float64Array.from(h) },
    clamp01(s0),
    clamp01(s1),
    clamp01(t0),
    clamp01(t1),
  );
  const hull: number[][] = [];
  for (let i = 0; i < part.h.length; i += 4) {
    hull.push([
      part.h[i]! / part.h[i + 3]!,
      part.h[i + 1]! / part.h[i + 3]!,
      part.h[i + 2]! / part.h[i + 3]!,
    ]);
  }
  const sphere = ball(hull, 0);

  // Speeds, for the error a placement adds (and the sphere identity's chord).
  const centre = hull[0]!;
  const speeds = speedBounds(form, patch, {
    origin: [
      centre[0]! + origin[0]!,
      centre[1]! + origin[1]!,
      centre[2]! + origin[2]!,
    ],
    x: [1, 0, 0],
    y: [0, 1, 0],
    z: [0, 0, 1],
  });
  const speed: [number, number] = speeds
    ? [Math.sqrt(speeds.ss) / pwu, Math.sqrt(speeds.tt) / pwv]
    : [HUGE, HUGE];

  if (identity !== SurfaceKind.Bezier && identity !== SurfaceKind.Torus) {
    const frame: Frame = frameOf(form, surface);
    const known = identityDensity(
      form,
      patch,
      identity,
      frame,
      p0,
      pwu,
      pwv,
      wu,
      wv,
      speeds,
    );
    if (known) {
      return { d: known, speed, sphere, slack };
    }
  }
  const bound = netBounds(form, patch);
  return {
    d: [
      bound.ss / (8 * pwu * pwu),
      (2 * bound.st) / (8 * pwu * pwv),
      bound.tt / (8 * pwv * pwv),
    ],
    speed,
    sphere,
    slack: 0,
  };
}

/**
 * The per-unit constants of a Bézier patch on an analytic surface, from the
 * identity (see the header); undefined when the patch doesn't allow it.
 */
function identityDensity(
  form: BrepForm,
  patch: number,
  identity: SurfaceKind,
  frame: Frame,
  radius: number,
  pwu: number,
  pwv: number,
  wu: number,
  wv: number,
  speeds: { ss: number; tt: number; st: number } | undefined,
): [number, number, number] | undefined {
  switch (identity) {
    case SurfaceKind.Plane:
      return [0, 0, 0];
    case SurfaceKind.Cylinder:
    case SurfaceKind.Cone: {
      const rates = axisRates(form, patch, frame);
      if (!rates) {
        return undefined;
      }
      const widest =
        identity === SurfaceKind.Cone ? axisRadius(form, patch, frame) : radius;
      const a = rates.s / pwu;
      const b = rates.t / pwv;
      return [
        (widest * a * a) / 8,
        (widest * 2 * a * b) / 8,
        (widest * b * b) / 8,
      ];
    }
    case SurfaceKind.Sphere: {
      if (!speeds) {
        return undefined;
      }
      const a = Math.sqrt(speeds.ss) / pwu;
      const b = Math.sqrt(speeds.tt) / pwv;
      const across = speeds.st / (pwu * pwv);
      // A cell's chord c leaves c² / 4 / (r + √(r² − c² / 4)); that is
      // convex in c², so below its value at the whole span's one cell
      // it is under the line through the origin.
      const whole = (a * wu + b * wv) ** 2;
      const k =
        whole / 4 >= radius * radius
          ? 1 / (4 * radius)
          : 1 / (4 * (radius + Math.sqrt(radius * radius - whole / 4)));
      return [k * a * a, 2 * k * across, k * b * b];
    }
    default:
      return undefined;
  }
}

function clamp01(x: number): number {
  return Math.min(Math.max(x, 0), 1);
}

/** The largest |cos v| over [v0, v1]. */
function maxAbsCos(v0: number, v1: number): number {
  const lo = Math.min(v0, v1);
  const hi = Math.max(v0, v1);
  // A multiple of π inside the interval.
  if (Math.floor(hi / Math.PI) >= Math.ceil(lo / Math.PI)) {
    return 1;
  }
  return Math.max(Math.abs(Math.cos(lo)), Math.abs(Math.cos(hi)));
}

/**
 * A ball around an analytic span's surface, grown by `pad`: the
 * (stepsU + 1) × (stepsV + 1) samples of its rect (`analyticPoint`'s, the
 * trigonometry once a column and a row, in one flat array), centred on their
 * box.
 */
function analyticBall(
  kind: SurfaceKind,
  frame: Float64Array,
  params: readonly [number, number],
  rect: Box,
  stepsU: number,
  stepsV: number,
  pad: number,
): Sphere {
  const [p0, p1] = params;
  const [u0, u1, v0, v1] = rect;
  const x = [frame[3]!, frame[4]!, frame[5]!];
  const y = [frame[6]!, frame[7]!, frame[8]!];
  const z = cross(x, y);
  const nu = stepsU + 1;
  const nv = stepsV + 1;
  const cu = new Float64Array(nu);
  const su = new Float64Array(nu);
  const us = new Float64Array(nu);
  for (let i = 0; i < nu; i++) {
    const u = u0 + ((u1 - u0) * i) / stepsU;
    us[i] = u;
    cu[i] = Math.cos(u);
    su[i] = Math.sin(u);
  }
  const tan = kind === SurfaceKind.Cone ? Math.tan(p1) : 0;
  const points = new Float64Array(nu * nv * 3);
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  let at = 0;
  for (let j = 0; j < nv; j++) {
    const v = v0 + ((v1 - v0) * j) / stepsV;
    const cv = kind === SurfaceKind.Sphere ? Math.cos(v) : 0;
    const sv = kind === SurfaceKind.Sphere ? Math.sin(v) : 0;
    const tv = kind === SurfaceKind.Torus ? Math.cos(v) : 0;
    const torusZ = kind === SurfaceKind.Torus ? p1 * Math.sin(v) : 0;
    for (let i = 0; i < nu; i++) {
      let a: number;
      let b: number;
      let c: number;
      switch (kind) {
        case SurfaceKind.Plane:
          a = us[i]!;
          b = v;
          c = 0;
          break;
        case SurfaceKind.Cylinder:
          a = p0 * cu[i]!;
          b = p0 * su[i]!;
          c = v;
          break;
        case SurfaceKind.Cone: {
          const radius = p0 + v * tan;
          a = radius * cu[i]!;
          b = radius * su[i]!;
          c = v;
          break;
        }
        case SurfaceKind.Sphere:
          a = p0 * cv * cu[i]!;
          b = p0 * cv * su[i]!;
          c = p0 * sv;
          break;
        default: {
          const radius = p0 + p1 * tv;
          a = radius * cu[i]!;
          b = radius * su[i]!;
          c = torusZ;
        }
      }
      for (let k = 0; k < 3; k++) {
        const value = frame[k]! + a * x[k]! + b * y[k]! + c * z[k]!;
        points[at++] = value;
        low[k] = Math.min(low[k]!, value);
        high[k] = Math.max(high[k]!, value);
      }
    }
  }
  const centre = low.map((l, k) => (l + high[k]!) / 2);
  let r = 0;
  for (let k = 0; k < points.length; k += 3) {
    r = Math.max(
      r,
      Math.hypot(
        points[k]! - centre[0]!,
        points[k + 1]! - centre[1]!,
        points[k + 2]! - centre[2]!,
      ),
    );
  }
  return [centre[0]!, centre[1]!, centre[2]!, r + pad];
}

/** A ball around points, grown by `pad`: centred on their box. */
function ball(points: readonly (readonly number[])[], pad: number): Sphere {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      low[k] = Math.min(low[k]!, p[k]!);
      high[k] = Math.max(high[k]!, p[k]!);
    }
  }
  const c = low.map((l, k) => (l + high[k]!) / 2);
  let r = 0;
  for (const p of points) {
    r = Math.max(r, Math.hypot(p[0]! - c[0]!, p[1]! - c[1]!, p[2]! - c[2]!));
  }
  return [c[0]!, c[1]!, c[2]!, r + pad];
}

/** A ball around balls. */
function enclose(spheres: readonly Sphere[]): Sphere {
  if (spheres.length === 0) {
    return [0, 0, 0, 0];
  }
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (const s of spheres) {
    for (let k = 0; k < 3; k++) {
      low[k] = Math.min(low[k]!, s[k]! - s[3]);
      high[k] = Math.max(high[k]!, s[k]! + s[3]);
    }
  }
  const c = low.map((l, k) => (l + high[k]!) / 2);
  let r = 0;
  for (const s of spheres) {
    r = Math.max(
      r,
      Math.hypot(s[0] - c[0]!, s[1] - c[1]!, s[2] - c[2]!) + s[3],
    );
  }
  return [c[0]!, c[1]!, c[2]!, r];
}
