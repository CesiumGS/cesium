// Radial lens distortion, Brown–Conrady, as a map of camera space: a point
// (X, Y, Z), Z > 0 in front of the camera, goes to the point on the same
// depth whose pinhole projection is the distorted one. With u = X/Z, v = Y/Z,
// r² = u² + v²:
//   u' = u (1 + k1 r² + k2 r⁴ + k3 r⁶) + 2 p1 u v + p2 (r² + 2u²)
//   v' = v (1 + k1 r² + k2 r⁴ + k3 r⁶) + p1 (r² + 2v²) + 2 p2 u v
//   q  = (u' Z, v' Z, Z)
// so projecting q with the ideal pinhole (and intrinsics) gives the
// distorted pixel, and depth is preserved. Output is affine in each
// coefficient. The inverse (undistortion) is Newton on (u, v).
import type { SmoothEdge } from "../transform/graph.ts";
import { edgeOf, type Named, type TransformDescriptor } from "./descriptor.ts";

type K = "k1" | "k2" | "k3" | "p1" | "p2";

const source = `(p, params) => {
  const { k1, k2, k3, p1, p2 } = params;
  const z = p[2];
  const u = p[0] / z;
  const v = p[1] / z;
  const u2 = u * u;
  const v2 = v * v;
  const r2 = u2 + v2;
  const radial = 1 + r2 * (k1 + r2 * (k2 + r2 * k3));
  const du = 2 * p1 * u * v + p2 * (r2 + 2 * u2);
  const dv = p1 * (r2 + 2 * v2) + 2 * p2 * u * v;
  return [(u * radial + du) * z, (v * radial + dv) * z, z];
}`;

/** u', v' at (u, v), with their 2×2 Jacobian [du'/du, du'/dv, dv'/du, dv'/dv]. */
function distort(
  { k1, k2, k3, p1, p2 }: Named<K>,
  u: number,
  v: number,
  out: Float64Array,
  d?: Float64Array,
): void {
  const r2 = u * u + v * v;
  const radial = 1 + r2 * (k1 + r2 * (k2 + r2 * k3));
  out[0] = u * radial + 2 * p1 * u * v + p2 * (r2 + 2 * u * u);
  out[1] = v * radial + p1 * (r2 + 2 * v * v) + 2 * p2 * u * v;
  if (d) {
    // dR/dr², times 2 for d r²/du = 2u
    const dr = 2 * (k1 + r2 * (2 * k2 + 3 * r2 * k3));
    d[0] = radial + u * dr * u + 2 * p1 * v + 6 * p2 * u;
    d[1] = u * dr * v + 2 * p1 * u + 2 * p2 * v;
    d[2] = v * dr * u + 2 * p1 * u + 2 * p2 * v;
    d[3] = radial + v * dr * v + 6 * p1 * v + 2 * p2 * u;
  }
}

const uv = new Float64Array(2);
const dd = new Float64Array(4);

export const radialDistortionDescriptor: TransformDescriptor = {
  id: "radialDistortion",
  params: {
    k1: { default: 0, description: "radial, r²" },
    k2: { default: 0, description: "radial, r⁴" },
    k3: { default: 0, description: "radial, r⁶" },
    p1: { default: 0, description: "tangential" },
    p2: { default: 0, description: "tangential" },
  },
  forward(p, params, out, jacobian) {
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    const u = x / z;
    const v = y / z;
    distort(params as Named<K>, u, v, uv, jacobian ? dd : undefined);
    out[0] = uv[0]! * z;
    out[1] = uv[1]! * z;
    out[2] = z;
    if (jacobian) {
      jacobian.fill(0);
      jacobian[0] = dd[0]!;
      jacobian[1] = dd[2]!;
      jacobian[3] = dd[1]!;
      jacobian[4] = dd[3]!;
      jacobian[6] = uv[0]! - u * dd[0]! - v * dd[1]!;
      jacobian[7] = uv[1]! - u * dd[2]! - v * dd[3]!;
      jacobian[8] = 1;
    }
  },
  inverse(q, params, out) {
    const z = q[2]!;
    const target = [q[0]! / z, q[1]! / z];
    let u = target[0]!;
    let v = target[1]!;
    const named = params as Named<K>;
    for (let i = 0; i < 50; i++) {
      distort(named, u, v, uv, dd);
      const fu = uv[0]! - target[0]!;
      const fv = uv[1]! - target[1]!;
      const det = dd[0]! * dd[3]! - dd[1]! * dd[2]!;
      const du = (dd[3]! * fu - dd[1]! * fv) / det;
      const dv = (dd[0]! * fv - dd[2]! * fu) / det;
      u -= du;
      v -= dv;
      if (
        Math.abs(du) + Math.abs(dv) <
        1e-15 * (1 + Math.abs(u) + Math.abs(v))
      ) {
        out[0] = u * z;
        out[1] = v * z;
        out[2] = z;
        return;
      }
    }
    throw new RangeError("radialDistortion: the undistortion did not converge");
  },
  separable: ["k1", "k2", "k3", "p1", "p2"],
  source,
  slang: "radialDistortionParity",
};

/** Brown–Conrady distortion (radial k1, k2, k3; tangential p1, p2) of normalized camera space. */
export function radialDistortion(
  options: Partial<Record<K, number>> = {},
): SmoothEdge {
  return edgeOf(radialDistortionDescriptor, options);
}
