// Bend: the x axis curves about a center at (ox, ·, oz + 1/κ) in the x–z
// plane, y unchanged (Barr 1984's bend with a constant curvature): a
// point at distance dz above the neutral line and dx along it goes to
// angle θ = κ dx on the circle of radius 1/κ - dz. Orient it with an affine
// node. Curvature 0 is the identity. The inverse is exact while the point
// stays within a half turn of the neutral line (|θ| < π).
import type { CurvilinearEdge } from "../transform/graph.ts";
import { edgeOf, type Named, type TransformDescriptor } from "./descriptor.ts";

type K = "ox" | "oz" | "curvature";

const source = `(p, params) => {
  const { ox, oz, curvature } = params;
  const dx = p[0] - ox;
  const dz = p[2] - oz;
  const small = Math.abs(curvature) < 1e-12;
  const k = small ? 1 : curvature;
  const theta = k * dx;
  const rr = 1 / k - dz;
  const bx = rr * Math.sin(theta);
  const bz = 1 / k - rr * Math.cos(theta);
  return [ox + (small ? dx : bx), p[1], oz + (small ? dz : bz)];
}`;

export const bendDescriptor: TransformDescriptor = {
  id: "bend",
  params: {
    ox: { default: 0, description: "a point on the neutral line, x" },
    oz: { default: 0, description: "a point on the neutral line, z" },
    curvature: {
      default: 0,
      description: "1/radius, 1/m, positive curving toward +z",
    },
  },
  forward(p, params, out, jacobian) {
    const { ox, oz, curvature } = params as Named<K>;
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    const dx = x - ox;
    const dz = z - oz;
    if (Math.abs(curvature) < 1e-12) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      if (jacobian) {
        jacobian.fill(0);
        jacobian[0] = jacobian[4] = jacobian[8] = 1;
      }
      return;
    }
    const theta = curvature * dx;
    const radius = 1 / curvature;
    const rr = radius - dz;
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    out[0] = ox + rr * sin;
    out[1] = y;
    out[2] = oz + radius - rr * cos;
    if (jacobian) {
      jacobian.fill(0);
      jacobian[0] = rr * curvature * cos;
      jacobian[2] = rr * curvature * sin;
      jacobian[4] = 1;
      jacobian[6] = -sin;
      jacobian[8] = cos;
    }
  },
  inverse(q, params, out) {
    const { ox, oz, curvature } = params as Named<K>;
    const x = q[0]!;
    const y = q[1]!;
    const z = q[2]!;
    if (Math.abs(curvature) < 1e-12) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      return;
    }
    const radius = 1 / curvature;
    const side = Math.sign(radius);
    const X = x - ox;
    const W = radius - (z - oz);
    const theta = Math.atan2(side * X, side * W);
    out[0] = ox + theta / curvature;
    out[1] = y;
    out[2] = oz + radius - side * Math.hypot(X, W);
  },
  bound: (region, ranges) => {
    // J in x, y, z: [[(1 - κ dz) cos θ, 0, -sin θ], [0, 1, 0], [(1 - κ dz)
    // sin θ, 0, cos θ]], θ = κ dx and dz the height above the neutral line.
    const c = region.center;
    const a = region.axes;
    const wx = Math.abs(a[0]!) + Math.abs(a[3]!) + Math.abs(a[6]!);
    const wz = Math.abs(a[2]!) + Math.abs(a[5]!) + Math.abs(a[8]!);
    let dx = 0;
    for (const o of ranges.ox!) {
      dx = Math.max(dx, Math.abs(c[0]! - o) + wx);
    }
    let kappa = 0;
    let fac = 1;
    const dz = [
      c[2]! - wz - Math.max(...ranges.oz!),
      c[2]! + wz - Math.min(...ranges.oz!),
    ];
    for (const k of ranges.curvature!) {
      kappa = Math.max(kappa, Math.abs(k));
      for (const d of dz) {
        fac = Math.max(fac, Math.abs(1 - k * d));
      }
    }
    const sin = Math.min(1, kappa * dx);
    const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    return {
      basisIn: I,
      basisOut: I,
      absJ: [fac, 0, fac * sin, 0, 1, 0, sin, 0, 1],
    };
  },
  separable: [],
  source,
  slang: "bendParity",
};

/** A bend of constant `curvature` (1/m) about the line through `origin` (its x and z) along +x, toward +z. */
export function bend(options: {
  curvature: number;
  origin?: ArrayLike<number>;
}): CurvilinearEdge {
  const o = options.origin ?? [0, 0, 0];
  return edgeOf(bendDescriptor, {
    ox: o[0]!,
    oz: o[2]!,
    curvature: options.curvature,
  });
}
