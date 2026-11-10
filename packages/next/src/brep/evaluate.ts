// Exact float64 evaluation of the b-rep form's surfaces (overall plan
// §13.33). Positions are metres, derivatives are metres per parameter unit.
import { SurfaceKind, type BrepForm } from "./form.ts";

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
    throw new Error("evaluateSurface: Bézier surfaces come in Task 2");
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
