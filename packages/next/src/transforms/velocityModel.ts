// A 1D velocity model v(z) = v0 + g z: two-way time to depth and back, in
// closed form. The one-way time to depth z is (1/g) ln(1 + g z / v0), so
//   t = (2/g) ln(1 + g z / v0)   and   z = (v0/g) (exp(g t / 2) - 1).
// The node is the time section (x, y, two-way time in seconds); its parent
// is depth in metres (x, y, z, down positive). g = 0 is the constant
// velocity z = v0 t / 2, taken through a series near it. Output is affine
// in v0 (z ∝ v0).
import type { SmoothEdge } from "../transform/graph.ts";
import { edgeOf, type Named, type TransformDescriptor } from "./descriptor.ts";

type K = "v0" | "g";

const source = `(p, params) => {
  const { v0, g } = params;
  const x = 0.5 * g * p[2];
  const small = Math.abs(x) < 1e-3;
  const safe = small ? 1 : x;
  const f = small ? 1 + x * (0.5 + x * (1 / 6 + x / 24)) : (Math.exp(x) - 1) / safe;
  return [p[0], p[1], 0.5 * v0 * p[2] * f];
}`;

export const velocityModelDescriptor: TransformDescriptor = {
  id: "velocityModel",
  params: {
    v0: { default: 2000, min: 1e-9, description: "velocity at the datum, m/s" },
    g: { default: 0, description: "velocity gradient with depth, 1/s" },
  },
  forward(p, params, out, jacobian) {
    const { v0, g } = params as Named<K>;
    const t = p[2]!;
    const x = 0.5 * g * t;
    const f =
      Math.abs(x) < 1e-3
        ? 1 + x * (0.5 + x * (1 / 6 + x / 24))
        : (Math.exp(x) - 1) / x;
    out[0] = p[0]!;
    out[1] = p[1]!;
    out[2] = 0.5 * v0 * t * f;
    if (jacobian) {
      jacobian.fill(0);
      jacobian[0] = jacobian[4] = 1;
      jacobian[8] = 0.5 * v0 * Math.exp(x);
    }
  },
  inverse(q, params, out) {
    const { v0, g } = params as Named<K>;
    const z = q[2]!;
    const y = (g * z) / v0;
    if (!(y > -1)) {
      throw new RangeError(
        "velocityModel: the depth is beyond the model's asymptote (infinite time)",
      );
    }
    const f =
      Math.abs(y) < 1e-3
        ? 1 - y * (0.5 - y * (1 / 3 - y / 4))
        : Math.log1p(y) / y;
    out[0] = q[0]!;
    out[1] = q[1]!;
    out[2] = ((2 * z) / v0) * f;
  },
  separable: ["v0"],
  source,
  slang: "velocityModelParity",
};

/** v(z) = `v0` + `gradient` · z (m/s, 1/s): the time section to depth. */
export function velocityModel(options: {
  v0: number;
  gradient?: number;
}): SmoothEdge {
  return edgeOf(velocityModelDescriptor, {
    v0: options.v0,
    g: options.gradient ?? 0,
  });
}
