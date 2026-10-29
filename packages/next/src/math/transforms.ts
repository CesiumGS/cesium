import * as v3 from "./vec3.ts";
import * as m4 from "./mat4.ts";
import type { Vec3 } from "./vec3.ts";
import type { Mat4 } from "./mat4.ts";
import { Ellipsoid, EPSILON14 } from "./ellipsoid.ts";

const east = v3.vec3();
const north = v3.vec3();
const up = v3.vec3();

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
  } else if (nearZero(x) && nearZero(y)) {
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
 * Splits each float64 component into a float32 pair (`hi = fround(v)`,
 * `lo = fround(v - hi)`). The GPU recovers small camera-relative offsets as
 * `(hiA - hiB) + (loA - loB)` without ever forming the large value in float32.
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
    const h = Math.fround(value);
    hi[hiOffset + i] = h;
    lo[loOffset + i] = Math.fround(value - h);
  }
}
