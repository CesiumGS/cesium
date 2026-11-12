import * as v3 from "./vec3.ts";
import * as m4 from "./mat4.ts";
import type { Vec3 } from "./vec3.ts";
import type { Mat4 } from "./mat4.ts";
import { Ellipsoid, EPSILON14 } from "./ellipsoid.ts";

const east = v3.vec3();
const north = v3.vec3();
const up = v3.vec3();

/** True when `x` and `y` are both near zero: the point is on the polar axis. */
export function isOnPolarAxis(x: number, y: number): boolean {
  return Math.abs(x) <= EPSILON14 && Math.abs(y) <= EPSILON14;
}

/**
 * Local east-north-up frame at `origin`, expressed in the Earth-fixed frame.
 * Matches 1.x `Transforms.eastNorthUpToFixedFrame`, including the pole and
 * center special cases.
 */
export function eastNorthUpToFixedFrame(
  origin: Vec3,
  ellipsoid: Ellipsoid,
  out: Mat4,
): Mat4 {
  const x = origin[0]!,
    y = origin[1]!,
    z = origin[2]!;
  const nearZero = (value: number) => Math.abs(value) <= EPSILON14;

  if (nearZero(x) && nearZero(y) && nearZero(z)) {
    v3.set(east, 0, 1, 0);
    v3.set(north, -1, 0, 0);
    v3.set(up, 0, 0, 1);
  } else if (isOnPolarAxis(x, y)) {
    const sign = Math.sign(z);
    v3.set(east, 0, 1, 0);
    v3.set(north, -sign, 0, 0);
    v3.set(up, 0, 0, sign);
  } else {
    ellipsoid.geodeticSurfaceNormal(origin, up);
    v3.normalize(east, v3.set(east, -y, x, 0));
    v3.cross(north, up, east);
  }
  return m4.fromBasis(out, east, north, up, origin);
}

/**
 * The high part of a float64 split into a float32 pair: a whole number of
 * meters, so the GPU subtracts two highs as integers (common.slang
 * `SplitPosition.difference`). A float32 at or above 2^23 is already an integer; below
 * 2^24 the nearest integer is exact in float32. Valid to ±2^31 m (the
 * Moon's distance is 2^28.5).
 *
 * Why integers (CESIUM2_WEBGPU_PLAN.md §3.3, "Precision"): on Apple GPUs
 * Dawn compiles with relaxed math, which may reassociate
 * `(hiA - hiB) + (loA - loB)` into a sum of the large values; measured on
 * an M-series Mac (r50) the hi/lo path then erred as much as plain float32
 * (0.45 m at Philadelphia). Integer subtraction can't be reassociated with
 * float arithmetic.
 */
export function splitHigh(value: number): number {
  return Math.abs(value) < 2 ** 24 ? Math.round(value) : Math.fround(value);
}

/**
 * `x` as a df64 pair for emulated-double arithmetic in compute kernels
 * (`transform/df64Wgsl.ts`): `hi` is the nearest float32 and `lo` the
 * float32 rest, so `hi + lo` is `x` to about 48 bits. Not the whole-meter
 * split of `splitVec3`: df64 arithmetic carries its own error terms and
 * doesn't rely on integer highs, but a vertex position must still use
 * `splitVec3`.
 */
export function splitDf64(x: number): [number, number] {
  const hi = Math.fround(x);
  const lo = x - hi;
  return [hi, Math.fround(lo)];
}

/**
 * Splits each float64 component into a float32 pair: `hi` a whole number
 * of meters (`splitHigh`), `lo = fround(v - hi)`. The GPU recovers small
 * camera-relative offsets as `(hiA - hiB as integers) + (loA - loB)`
 * (common.slang `SplitPosition.difference`) without ever forming the large value in
 * float32.
 */
export function splitVec3(
  v: Vec3,
  hi: Float32Array,
  hiOffset: number,
  lo: Float32Array,
  loOffset: number,
): void {
  for (let i = 0; i < 3; i++) {
    const value = v[i]!;
    const h = splitHigh(value);
    hi[hiOffset + i] = h;
    lo[loOffset + i] = Math.fround(value - h);
  }
}

/**
 * Why a column-major 4×4 matrix is not a rigid placement (a rotation and a
 * translation), or undefined when it is one: every value finite, the
 * rotation's columns orthonormal within `tolerance` (default 10⁻⁹), no
 * mirror, and the bottom row exactly (0, 0, 0, 1).
 */
export function rigidMatrixError(
  m: ArrayLike<number>,
  tolerance = 1e-9,
): string | undefined {
  if (m.length < 16) {
    return "it has fewer than 16 values";
  }
  for (let i = 0; i < 16; i++) {
    if (!Number.isFinite(m[i])) {
      return "it has a value that is not finite";
    }
  }
  if (m[3] !== 0 || m[7] !== 0 || m[11] !== 0 || m[15] !== 1) {
    return "its bottom row is not (0, 0, 0, 1)";
  }
  for (let a = 0; a < 3; a++) {
    for (let b = a; b < 3; b++) {
      const dot =
        m[a * 4]! * m[b * 4]! +
        m[a * 4 + 1]! * m[b * 4 + 1]! +
        m[a * 4 + 2]! * m[b * 4 + 2]!;
      if (Math.abs(dot - (a === b ? 1 : 0)) > tolerance) {
        return "its rotation's columns are not orthonormal";
      }
    }
  }
  const det =
    m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) -
    m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) +
    m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!);
  if (det < 0) {
    return "it mirrors";
  }
  return undefined;
}
