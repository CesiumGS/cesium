// Twist (Barr 1984): rotation about an axis through `o` by an angle
// proportional to the distance t along it, θ = rate · t. The distance along
// the axis is unchanged, so the inverse is the opposite rotation, exact.
// With q = p - o, a the unit axis, t = q·a, m = q - t a, w = a × m:
//   p' = o + t a + m cos θ + w sin θ
//   J  = a aᵀ + R (I - a aᵀ) + rate (dR/dθ m) aᵀ.
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
  const mx = dx - t * nx;
  const my = dy - t * ny;
  const mz = dz - t * nz;
  const c = Math.cos(rate * t);
  const s = Math.sin(rate * t);
  const wx = ny * mz - nz * my;
  const wy = nz * mx - nx * mz;
  const wz = nx * my - ny * mx;
  return [
    ox + t * nx + mx * c + wx * s,
    oy + t * ny + my * c + wy * s,
    oz + t * nz + mz * c + wz * s,
  ];
}`;

export const twistDescriptor: TransformDescriptor = {
  id: "twist",
  params: {
    ...vec3Specs("o", [0, 0, 0], "a point on the axis"),
    ...vec3Specs("a", [0, 0, 1], "the axis direction (normalized)"),
    rate: {
      default: 0,
      description: "radians of twist per metre along the axis",
    },
  },
  forward(p, params, out, jacobian) {
    const { ox, oy, oz, ax, ay, az, rate } = params as Named<K>;
    const il = 1 / Math.hypot(ax, ay, az);
    const a = [ax * il, ay * il, az * il];
    const d = [p[0]! - ox, p[1]! - oy, p[2]! - oz];
    const t = d[0]! * a[0]! + d[1]! * a[1]! + d[2]! * a[2]!;
    const m = [d[0]! - t * a[0]!, d[1]! - t * a[1]!, d[2]! - t * a[2]!];
    const theta = rate * t;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const w = [
      a[1]! * m[2]! - a[2]! * m[1]!,
      a[2]! * m[0]! - a[0]! * m[2]!,
      a[0]! * m[1]! - a[1]! * m[0]!,
    ];
    out[0] = ox + t * a[0]! + m[0]! * c + w[0]! * s;
    out[1] = oy + t * a[1]! + m[1]! * c + w[1]! * s;
    out[2] = oz + t * a[2]! + m[2]! * c + w[2]! * s;
    if (jacobian) {
      // dR/dθ m = -m sin θ + w cos θ
      const v = [0, 1, 2].map((r) => -m[r]! * s + w[r]! * c);
      for (let col = 0; col < 3; col++) {
        // a × e_col
        const cross = [
          col === 1 ? -a[2]! : col === 2 ? a[1]! : 0,
          col === 0 ? a[2]! : col === 2 ? -a[0]! : 0,
          col === 0 ? -a[1]! : col === 1 ? a[0]! : 0,
        ];
        for (let r = 0; r < 3; r++) {
          const e = r === col ? 1 : 0;
          jacobian[col * 3 + r] =
            a[r]! * a[col]! +
            (e - a[col]! * a[r]!) * c +
            cross[r]! * s +
            rate * a[col]! * v[r]!;
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
    const m = [d[0]! - t * a[0]!, d[1]! - t * a[1]!, d[2]! - t * a[2]!];
    const theta = -rate * t;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const w = [
      a[1]! * m[2]! - a[2]! * m[1]!,
      a[2]! * m[0]! - a[0]! * m[2]!,
      a[0]! * m[1]! - a[1]! * m[0]!,
    ];
    out[0] = ox + t * a[0]! + m[0]! * c + w[0]! * s;
    out[1] = oy + t * a[1]! + m[1]! * c + w[1]! * s;
    out[2] = oz + t * a[2]! + m[2]! * c + w[2]! * s;
  },
  separable: [],
  source,
  slang: "twistParity",
};

/** A twist of `rate` radians per metre about the axis through `origin` along `axis`. */
export function twist(options: {
  axis?: ArrayLike<number>;
  rate: number;
  origin?: ArrayLike<number>;
}): SmoothEdge {
  const a = nonzero3(options.axis ?? [0, 0, 1], "twist: axis");
  const o = options.origin ?? [0, 0, 0];
  return edgeOf(twistDescriptor, {
    ox: o[0]!,
    oy: o[1]!,
    oz: o[2]!,
    ax: a[0],
    ay: a[1],
    az: a[2],
    rate: options.rate,
  });
}
