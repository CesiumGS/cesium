/**
 * Float64 3-vectors stored in typed arrays. Every operation writes into a
 * caller-provided `out` so steady-state code never allocates.
 */
export type Vec3 = Float64Array;

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  const out = new Float64Array(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

export function set(out: Vec3, x: number, y: number, z: number): Vec3 {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

export function copy(out: Vec3, a: ArrayLike<number>): Vec3 {
  out[0] = a[0]!;
  out[1] = a[1]!;
  out[2] = a[2]!;
  return out;
}

export function add(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  out[0] = a[0]! + b[0]!;
  out[1] = a[1]! + b[1]!;
  out[2] = a[2]! + b[2]!;
  return out;
}

export function sub(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  out[0] = a[0]! - b[0]!;
  out[1] = a[1]! - b[1]!;
  out[2] = a[2]! - b[2]!;
  return out;
}

export function scale(out: Vec3, a: Vec3, s: number): Vec3 {
  out[0] = a[0]! * s;
  out[1] = a[1]! * s;
  out[2] = a[2]! * s;
  return out;
}

/** out = a + b * s */
export function scaleAndAdd(out: Vec3, a: Vec3, b: Vec3, s: number): Vec3 {
  out[0] = a[0]! + b[0]! * s;
  out[1] = a[1]! + b[1]! * s;
  out[2] = a[2]! + b[2]! * s;
  return out;
}

export function mul(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  out[0] = a[0]! * b[0]!;
  out[1] = a[1]! * b[1]!;
  out[2] = a[2]! * b[2]!;
  return out;
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}

export function cross(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  const ax = a[0]!,
    ay = a[1]!,
    az = a[2]!;
  const bx = b[0]!,
    by = b[1]!,
    bz = b[2]!;
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

export function distance(a: Vec3, b: Vec3): number {
  const dx = a[0]! - b[0]!,
    dy = a[1]! - b[1]!,
    dz = a[2]! - b[2]!;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function normalize(out: Vec3, a: Vec3): Vec3 {
  const len = length(a);
  return scale(out, a, len > 0 ? 1 / len : 0);
}

export function negate(out: Vec3, a: Vec3): Vec3 {
  return scale(out, a, -1);
}
