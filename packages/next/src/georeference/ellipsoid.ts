// What the height-based geo transforms share: the foot of a point on an
// ellipsoid (float64 for the TS functions, the same Newton iteration unrolled
// as source text for the IR), the shape operator, and the Jacobian of "move
// along the normal by D". A point p is carried along the normal through it,
// q = p + D n, with D a function of the height h above the surface (and,
// for `flatten`, of where on the surface). With S the shape operator at the
// foot (the derivative of n along the surface), A = I + hS and M = A⁻¹ S:
//   J = I + D M + (dh'/dh - 1) n nᵀ + n gᵀ,
// where dh'/dh = 1 + ∂D/∂h at fixed position and g = ∇ of D through the
// foot's position (zero when D depends on h alone). This is the closed form
// of frames/heightWarps.ts (there as A⁻¹(I + h'S - n nᵀ) + (dh'/dh) n nᵀ).
// The ellipsoid is a body's radii; the point must be away from its centre.
import { ellipsoidFoot, type Radii } from "../scene/warpForms.ts";

export type { Radii };
export { WGS84_RADII } from "../scene/warpForms.ts";

/** Newton steps in the unrolled foot: from the start below, 5 reach float64 within a body's radius of the surface. */
export const FOOT_STEPS = 5;

export function checkRadii(radii: Radii, what: string): void {
  if (!radii.every((r) => Number.isFinite(r) && r > 0)) {
    throw new RangeError(`${what}: radii must be positive, finite numbers`);
  }
}

/** The semi-major and semi-minor axes and the first eccentricity² of an ellipsoid of revolution. */
export function revolution(
  radii: Radii,
  what: string,
): { a: number; b: number; e2: number } {
  checkRadii(radii, what);
  if (Math.abs(radii[0] - radii[1]) > 1e-6 * radii[0]) {
    throw new RangeError(
      `${what}: the ellipsoid must be one of revolution (x and y radii equal)`,
    );
  }
  const a = radii[0];
  const b = radii[2];
  return { a, b, e2: 1 - (b * b) / (a * a) };
}

/**
 * Source lines (restricted JS) that define `nx, ny, nz` (the unit normal at
 * p's foot) and `h` (its height above the ellipsoid), reading `p`.
 */
export function footSource(radii: Radii): string[] {
  const os = radii.map((r) => 1 / (r * r));
  const [ox, oy, oz] = os.map(String);
  const mean = String((os[0]! + os[1]! + os[2]!) / 3);
  const lines = [
    `  const x2 = p[0] * p[0] * ${ox};`,
    `  const y2 = p[1] * p[1] * ${oy};`,
    `  const z2 = p[2] * p[2] * ${oz};`,
    `  let lam = (Math.sqrt(x2 + y2 + z2) - 1) / ${mean};`,
  ];
  for (let i = 0; i < FOOT_STEPS; i++) {
    lines.push(
      `  const ax${i} = 1 / (1 + lam * ${ox});`,
      `  const ay${i} = 1 / (1 + lam * ${oy});`,
      `  const az${i} = 1 / (1 + lam * ${oz});`,
      `  const f${i} = x2 * ax${i} * ax${i} + y2 * ay${i} * ay${i} + z2 * az${i} * az${i} - 1;`,
      `  const den${i} = x2 * ax${i} * ax${i} * ax${i} * ${ox} + y2 * ay${i} * ay${i} * ay${i} * ${oy} + z2 * az${i} * az${i} * az${i} * ${oz};`,
      `  lam = lam + f${i} / (2 * den${i});`,
    );
  }
  lines.push(
    `  const bx = 1 / (1 + lam * ${ox});`,
    `  const by = 1 / (1 + lam * ${oy});`,
    `  const bz = 1 / (1 + lam * ${oz});`,
    `  const gx = p[0] * bx * ${ox};`,
    `  const gy = p[1] * by * ${oy};`,
    `  const gz = p[2] * bz * ${oz};`,
    "  const gl = Math.sqrt(gx * gx + gy * gy + gz * gz);",
    "  const nx = gx / gl;",
    "  const ny = gy / gl;",
    "  const nz = gz / gl;",
    "  const h = lam * gl;",
  );
  return lines;
}

/** Where a point is on its ellipsoid: the unit normal, the height, and M = A⁻¹ S (column-major). */
export interface HeightFrame {
  readonly n: Float64Array;
  h: number;
  readonly m: Float64Array;
}

export function heightFrame(): HeightFrame {
  return { n: new Float64Array(3), h: 0, m: new Float64Array(9) };
}

const foot = new Float64Array(3);
const shape = new Float64Array(9);
const a3 = new Float64Array(9);
const ainv = new Float64Array(9);

/** Column-major 3×3 inverse. */
export function invert3(m: ArrayLike<number>, out: Float64Array): void {
  const a = m[0]!;
  const d = m[1]!;
  const g = m[2]!;
  const b = m[3]!;
  const e = m[4]!;
  const h = m[5]!;
  const c = m[6]!;
  const f = m[7]!;
  const i = m[8]!;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!(Math.abs(det) > 0) || !Number.isFinite(det)) {
    throw new RangeError("the matrix is singular");
  }
  out[0] = (e * i - f * h) / det;
  out[1] = -(d * i - f * g) / det;
  out[2] = (d * h - e * g) / det;
  out[3] = -(b * i - c * h) / det;
  out[4] = (a * i - c * g) / det;
  out[5] = -(a * h - b * g) / det;
  out[6] = (b * f - c * e) / det;
  out[7] = -(a * f - c * d) / det;
  out[8] = (a * e - b * d) / det;
}

/** The normal and height at `p`; with `withShape`, also M. Throws at the body's centre. */
export function locate(
  radii: Radii,
  p: ArrayLike<number>,
  frame: HeightFrame,
  withShape: boolean,
): void {
  const { n } = frame;
  const h = ellipsoidFoot(radii, p, n);
  if (!Number.isFinite(h)) {
    throw new RangeError(
      "a point at the body's centre has no height above its surface",
    );
  }
  frame.h = h;
  if (!withShape) {
    return;
  }
  for (let i = 0; i < 3; i++) {
    foot[i] = p[i]! - h * n[i]!;
  }
  const os = radii.map((r) => 1 / (r * r));
  const mlen = Math.hypot(
    foot[0]! * os[0]!,
    foot[1]! * os[1]!,
    foot[2]! * os[2]!,
  );
  // S = P diag(1/r²) P / |m|, P = I - n nᵀ
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        const pr = (r === k ? 1 : 0) - n[r]! * n[k]!;
        const pc = (c === k ? 1 : 0) - n[c]! * n[k]!;
        sum += pr * os[k]! * pc;
      }
      shape[c * 3 + r] = sum / mlen;
    }
  }
  for (let i = 0; i < 9; i++) {
    a3[i] = (i % 4 === 0 ? 1 : 0) + frame.h * shape[i]!;
  }
  invert3(a3, ainv);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += ainv[k * 3 + r]! * shape[c * 3 + k]!;
      }
      frame.m[c * 3 + r] = sum;
    }
  }
}

/** J of p + D n, from the frame's M, D, dh'/dh (`slope`) and g (when D also depends on position). */
export function heightMapJacobian(
  frame: HeightFrame,
  d: number,
  slope: number,
  jacobian: Float64Array,
  g?: ArrayLike<number>,
): void {
  const { n, m } = frame;
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      jacobian[c * 3 + r] =
        (r === c ? 1 : 0) +
        d * m[c * 3 + r]! +
        (slope - 1) * n[r]! * n[c]! +
        (g ? n[r]! * g[c]! : 0);
    }
  }
}
