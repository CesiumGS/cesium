// Taper (Barr 1984): the cross-section about an axis through `o` scales by
// r(t) = 1 + rate · t, t the distance along the axis, which is unchanged.
// With q = p - o, a the unit axis, t = q·a, m = q - t a:
//   p' = o + t a + r m,   J = r I + (1 - r) a aᵀ + rate m aᵀ.
// Output is affine in `rate`. The inverse divides the cross-section by r(t):
// exact where r > 0.
import type { SmoothEdge } from "../transform/graph.ts";
import {
  edgeOf,
  nonzero3,
  vec3Specs,
  type Named,
  type TransformDescriptor,
} from "./descriptor.ts";

type K = "ox" | "oy" | "oz" | "ax" | "ay" | "az" | "rate";

const source = `(p, params) => {
  const { ox, oy, oz, ax, ay, az, rate } = params;
  const il = 1 / Math.hypot(ax, ay, az);
  const nx = ax * il;
  const ny = ay * il;
  const nz = az * il;
  const dx = p[0] - ox;
  const dy = p[1] - oy;
  const dz = p[2] - oz;
  const t = dx * nx + dy * ny + dz * nz;
  const r = 1 + rate * t;
  return [
    ox + t * nx + r * (dx - t * nx),
    oy + t * ny + r * (dy - t * ny),
    oz + t * nz + r * (dz - t * nz),
  ];
}`;

export const taperDescriptor: TransformDescriptor = {
  id: "taper",
  params: {
    ...vec3Specs("o", [0, 0, 0], "a point on the axis"),
    ...vec3Specs("a", [0, 0, 1], "the axis direction (normalized)"),
    rate: {
      default: 0,
      description: "the cross-section's scale change per metre along the axis",
    },
  },
  forward(p, params, out, jacobian) {
    const { ox, oy, oz, ax, ay, az, rate } = params as Named<K>;
    const il = 1 / Math.hypot(ax, ay, az);
    const a = [ax * il, ay * il, az * il];
    const d = [p[0]! - ox, p[1]! - oy, p[2]! - oz];
    const t = d[0]! * a[0]! + d[1]! * a[1]! + d[2]! * a[2]!;
    const r = 1 + rate * t;
    const m = [d[0]! - t * a[0]!, d[1]! - t * a[1]!, d[2]! - t * a[2]!];
    out[0] = ox + t * a[0]! + r * m[0]!;
    out[1] = oy + t * a[1]! + r * m[1]!;
    out[2] = oz + t * a[2]! + r * m[2]!;
    if (jacobian) {
      for (let c = 0; c < 3; c++) {
        for (let k = 0; k < 3; k++) {
          jacobian[c * 3 + k] =
            r * (k === c ? 1 : 0) +
            (1 - r) * a[k]! * a[c]! +
            rate * m[k]! * a[c]!;
        }
      }
    }
  },
  inverse(q, params, out) {
    const { ox, oy, oz, ax, ay, az, rate } = params as Named<K>;
    const il = 1 / Math.hypot(ax, ay, az);
    const a = [ax * il, ay * il, az * il];
    const d = [q[0]! - ox, q[1]! - oy, q[2]! - oz];
    const t = d[0]! * a[0]! + d[1]! * a[1]! + d[2]! * a[2]!;
    const r = 1 + rate * t;
    out[0] = ox + t * a[0]! + (d[0]! - t * a[0]!) / r;
    out[1] = oy + t * a[1]! + (d[1]! - t * a[1]!) / r;
    out[2] = oz + t * a[2]! + (d[2]! - t * a[2]!) / r;
  },
  separable: ["rate"],
  source,
  slang: "taperParity",
};

/** A taper of `rate` per metre along the axis through `origin` along `axis` (default +z). */
export function taper(options: {
  axis?: ArrayLike<number>;
  rate: number;
  origin?: ArrayLike<number>;
}): SmoothEdge {
  const a = nonzero3(options.axis ?? [0, 0, 1], "taper: axis");
  const o = options.origin ?? [0, 0, 0];
  return edgeOf(taperDescriptor, {
    ox: o[0]!,
    oy: o[1]!,
    oz: o[2]!,
    ax: a[0],
    ay: a[1],
    az: a[2],
    rate: options.rate,
  });
}
