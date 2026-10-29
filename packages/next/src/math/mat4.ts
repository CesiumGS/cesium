import type { Vec3 } from "./vec3.ts";

/** Column-major float64 4x4 matrix, the same layout as WGSL `mat4x4f`. */
export type Mat4 = Float64Array;

export function mat4(): Mat4 {
  return identity(new Float64Array(16));
}

export function identity(out: Mat4): Mat4 {
  out.fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
  return out;
}

export function copy(out: Mat4, a: ArrayLike<number>): Mat4 {
  for (let i = 0; i < 16; i++) {
    out[i] = a[i]!;
  }
  return out;
}

export function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  const r = scratch;
  for (let col = 0; col < 4; col++) {
    const b0 = b[col * 4]!,
      b1 = b[col * 4 + 1]!,
      b2 = b[col * 4 + 2]!,
      b3 = b[col * 4 + 3]!;
    for (let row = 0; row < 4; row++) {
      r[col * 4 + row] =
        a[row]! * b0 + a[4 + row]! * b1 + a[8 + row]! * b2 + a[12 + row]! * b3;
    }
  }
  return copy(out, r);
}
const scratch = new Float64Array(16);

/** Columns are the basis vectors (x, y, z) and the translation. */
export function fromBasis(out: Mat4, x: Vec3, y: Vec3, z: Vec3, t: Vec3): Mat4 {
  out[0] = x[0]!;
  out[1] = x[1]!;
  out[2] = x[2]!;
  out[3] = 0;
  out[4] = y[0]!;
  out[5] = y[1]!;
  out[6] = y[2]!;
  out[7] = 0;
  out[8] = z[0]!;
  out[9] = z[1]!;
  out[10] = z[2]!;
  out[11] = 0;
  out[12] = t[0]!;
  out[13] = t[1]!;
  out[14] = t[2]!;
  out[15] = 1;
  return out;
}

export function fromScale(out: Mat4, sx: number, sy: number, sz: number): Mat4 {
  identity(out);
  out[0] = sx;
  out[5] = sy;
  out[10] = sz;
  return out;
}

export function setTranslation(out: Mat4, t: Vec3): Mat4 {
  out[12] = t[0]!;
  out[13] = t[1]!;
  out[14] = t[2]!;
  return out;
}

/** Transforms a point (w = 1) by `m`, ignoring the projective row. */
export function transformPoint(out: Vec3, m: Mat4, p: Vec3): Vec3 {
  const x = p[0]!,
    y = p[1]!,
    z = p[2]!;
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
  return out;
}

/** Multiplies a homogeneous point, writing x, y, z, w into `out`. */
export function transformVec4(
  out: Float64Array,
  m: Mat4,
  x: number,
  y: number,
  z: number,
  w: number,
): Float64Array {
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]! * w;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]! * w;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]! * w;
  out[3] = m[3]! * x + m[7]! * y + m[11]! * z + m[15]! * w;
  return out;
}

/**
 * View matrix with the camera at the origin: rotation only. Rendering is
 * camera-relative, so translation is applied per draw on the GPU instead.
 */
export function viewRotation(
  out: Mat4,
  direction: Vec3,
  up: Vec3,
  right: Vec3,
): Mat4 {
  out[0] = right[0]!;
  out[4] = right[1]!;
  out[8] = right[2]!;
  out[12] = 0;
  out[1] = up[0]!;
  out[5] = up[1]!;
  out[9] = up[2]!;
  out[13] = 0;
  out[2] = -direction[0]!;
  out[6] = -direction[1]!;
  out[10] = -direction[2]!;
  out[14] = 0;
  out[3] = 0;
  out[7] = 0;
  out[11] = 0;
  out[15] = 1;
  return out;
}

/**
 * Reverse-Z perspective with an infinite far plane for WebGPU's [0, 1] clip
 * depth: depth is 1 at `near` and approaches 0 at infinity.
 */
export function perspectiveReverseZInfinite(
  out: Mat4,
  fovy: number,
  aspect: number,
  near: number,
): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[11] = -1;
  out[14] = near;
  return out;
}
