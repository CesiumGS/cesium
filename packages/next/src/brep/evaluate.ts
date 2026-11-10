// Exact float64 evaluation of the b-rep form's surfaces (overall plan
// §13.33). Positions are metres, derivatives are metres per parameter unit.
import { evaluatePatch, evaluateSegment } from "./bezier.ts";
import { SurfaceKind, type BezierCurves, type BrepForm } from "./form.ts";

/** A surface point and its first derivatives, m and m per parameter unit. */
export interface SurfaceSample {
  readonly position: Float64Array;
  readonly du: Float64Array;
  readonly dv: Float64Array;
}

/** The point and first derivatives of a surface at (u, v). */
export function evaluateSurface(
  form: BrepForm,
  surface: number,
  u: number,
  v: number,
): SurfaceSample {
  const kind = form.surfaceKind[surface] as SurfaceKind;
  if (kind === SurfaceKind.Bezier) {
    return evaluateBezierSurface(form, surface, u, v);
  }
  const f = form.surfaceFrame;
  const b = surface * 9;
  const ox = f[b]!;
  const oy = f[b + 1]!;
  const oz = f[b + 2]!;
  const xx = f[b + 3]!;
  const xy = f[b + 4]!;
  const xz = f[b + 5]!;
  const yx = f[b + 6]!;
  const yy = f[b + 7]!;
  const yz = f[b + 8]!;
  // z = x × y.
  const zx = xy * yz - xz * yy;
  const zy = xz * yx - xx * yz;
  const zz = xx * yy - xy * yx;
  const p0 = form.surfaceParams[surface * 2]!;
  const p1 = form.surfaceParams[surface * 2 + 1]!;

  // Local coordinates (a, b, c) along x, y, z for the point and derivatives.
  let pa: number, pb: number, pc: number;
  let ua: number, ub: number, uc: number;
  let va: number, vb: number, vc: number;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  switch (kind) {
    case SurfaceKind.Plane:
      [pa, pb, pc] = [u, v, 0];
      [ua, ub, uc] = [1, 0, 0];
      [va, vb, vc] = [0, 1, 0];
      break;
    case SurfaceKind.Cylinder:
      [pa, pb, pc] = [p0 * cu, p0 * su, v];
      [ua, ub, uc] = [-p0 * su, p0 * cu, 0];
      [va, vb, vc] = [0, 0, 1];
      break;
    case SurfaceKind.Cone: {
      const t = Math.tan(p1);
      const radius = p0 + v * t;
      [pa, pb, pc] = [radius * cu, radius * su, v];
      [ua, ub, uc] = [-radius * su, radius * cu, 0];
      [va, vb, vc] = [t * cu, t * su, 1];
      break;
    }
    case SurfaceKind.Sphere: {
      const cv = Math.cos(v);
      const sv = Math.sin(v);
      [pa, pb, pc] = [p0 * cv * cu, p0 * cv * su, p0 * sv];
      [ua, ub, uc] = [-p0 * cv * su, p0 * cv * cu, 0];
      [va, vb, vc] = [-p0 * sv * cu, -p0 * sv * su, p0 * cv];
      break;
    }
    case SurfaceKind.Torus: {
      const cv = Math.cos(v);
      const sv = Math.sin(v);
      const radius = p0 + p1 * cv;
      [pa, pb, pc] = [radius * cu, radius * su, p1 * sv];
      [ua, ub, uc] = [-radius * su, radius * cu, 0];
      [va, vb, vc] = [-p1 * sv * cu, -p1 * sv * su, p1 * cv];
      break;
    }
    default:
      throw new Error(`evaluateSurface: unknown surface kind ${kind}`);
  }
  return {
    position: new Float64Array([
      ox + pa * xx + pb * yx + pc * zx,
      oy + pa * xy + pb * yy + pc * zy,
      oz + pa * xz + pb * yz + pc * zz,
    ]),
    du: new Float64Array([
      ua * xx + ub * yx + uc * zx,
      ua * xy + ub * yy + uc * zy,
      ua * xz + ub * yz + uc * zz,
    ]),
    dv: new Float64Array([
      va * xx + vb * yx + vc * zx,
      va * xy + vb * yy + vc * zy,
      va * xz + vb * yz + vc * zz,
    ]),
  };
}

/**
 * The unit outward normal of a face at (u, v): the normalized ∂u × ∂v,
 * reversed when the face is reversed. Undefined where the derivatives are
 * parallel or vanish, as at a pole.
 */
export function faceNormal(
  form: BrepForm,
  face: number,
  u: number,
  v: number,
): Float64Array | undefined {
  const { du, dv } = evaluateSurface(form, form.faceSurface[face]!, u, v);
  const nx = du[1]! * dv[2]! - du[2]! * dv[1]!;
  const ny = du[2]! * dv[0]! - du[0]! * dv[2]!;
  const nz = du[0]! * dv[1]! - du[1]! * dv[0]!;
  const length = Math.hypot(nx, ny, nz);
  const scale = Math.max(
    Math.hypot(du[0]!, du[1]!, du[2]!),
    Math.hypot(dv[0]!, dv[1]!, dv[2]!),
  );
  if (!(length > 1e-12 * scale * scale)) {
    return undefined;
  }
  const s = (form.faceReversed[face] === 1 ? -1 : 1) / length;
  return new Float64Array([nx * s, ny * s, nz * s]);
}

/**
 * A Bézier surface at (u, v): the lowest-index patch whose domain holds the
 * point, so a shared boundary takes the lower patch and its derivatives.
 * A point outside every patch takes the nearest patch, clamped to its edge.
 * Derivatives are scaled from patch parameters to surface parameters.
 */
function evaluateBezierSurface(
  form: BrepForm,
  surface: number,
  u: number,
  v: number,
): SurfaceSample {
  const first = form.surfacePatches[surface * 2]!;
  const count = form.surfacePatches[surface * 2 + 1]!;
  if (count === 0) {
    throw new Error(`evaluateSurface: surface ${surface} has no patches`);
  }
  const d = form.patchDomain;
  let best = first;
  let bestMiss = Infinity;
  for (let patch = first; patch < first + count; patch++) {
    const u0 = d[patch * 4]!;
    const u1 = d[patch * 4 + 1]!;
    const v0 = d[patch * 4 + 2]!;
    const v1 = d[patch * 4 + 3]!;
    const missU = Math.max(u0 - u, u - u1, 0);
    const missV = Math.max(v0 - v, v - v1, 0);
    const miss = Math.max(missU, missV);
    if (miss < bestMiss) {
      best = patch;
      bestMiss = miss;
      if (miss === 0) {
        break;
      }
    }
  }
  const u0 = d[best * 4]!;
  const u1 = d[best * 4 + 1]!;
  const v0 = d[best * 4 + 2]!;
  const v1 = d[best * 4 + 3]!;
  const widthU = u1 - u0;
  const widthV = v1 - v0;
  const s = widthU > 0 ? Math.min(Math.max((u - u0) / widthU, 0), 1) : 0;
  const t = widthV > 0 ? Math.min(Math.max((v - v0) / widthV, 0), 1) : 0;
  const sample = evaluatePatch(
    form.patchPoints,
    form.patchFirst[best]!,
    form.patchDegree[best * 2]!,
    form.patchDegree[best * 2 + 1]!,
    s,
    t,
  );
  const scaleU = widthU > 0 ? 1 / widthU : 0;
  const scaleV = widthV > 0 ? 1 / widthV : 0;
  for (let k = 0; k < 3; k++) {
    sample.du[k] = sample.du[k]! * scaleU;
    sample.dv[k] = sample.dv[k]! * scaleV;
  }
  return sample;
}

function evaluateCurve(
  curves: BezierCurves,
  dimension: 2 | 3,
  segment: number,
  t: number,
): { position: Float64Array; derivative: Float64Array } {
  return evaluateSegment(
    curves.points,
    curves.first[segment]!,
    curves.degree[segment]!,
    dimension,
    t,
  );
}

/** A 2D (u, v) curve segment at t in [0, 1]: position and derivative per unit t. */
export function evaluateCurve2(
  form: BrepForm,
  segment: number,
  t: number,
): { position: Float64Array; derivative: Float64Array } {
  return evaluateCurve(form.curves2, 2, segment, t);
}

/** A 3D curve segment at t in [0, 1]: position (m) and derivative (m per unit t). */
export function evaluateCurve3(
  form: BrepForm,
  segment: number,
  t: number,
): { position: Float64Array; derivative: Float64Array } {
  return evaluateCurve(form.curves3, 3, segment, t);
}
