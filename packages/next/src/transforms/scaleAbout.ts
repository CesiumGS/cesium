// Scale about a point: q = c + S (p - c), S diagonal. Output is affine in
// each factor and each centre coordinate; the inverse is exact.
import type { SmoothEdge } from "../transform/graph.ts";
import {
  edgeOf,
  vec3Specs,
  type Named,
  type TransformDescriptor,
} from "./descriptor.ts";

type K = "cx" | "cy" | "cz" | "sx" | "sy" | "sz";

const source = `(p, params) => {
  const { cx, cy, cz, sx, sy, sz } = params;
  return [
    cx + sx * (p[0] - cx),
    cy + sy * (p[1] - cy),
    cz + sz * (p[2] - cz),
  ];
}`;

export const scaleAboutDescriptor: TransformDescriptor = {
  id: "scaleAbout",
  params: {
    ...vec3Specs("c", [0, 0, 0], "the fixed point"),
    ...vec3Specs("s", [1, 1, 1], "the factor"),
  },
  forward(p, params, out, jacobian) {
    const { cx, cy, cz, sx, sy, sz } = params as Named<K>;
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    out[0] = cx + sx * (x - cx);
    out[1] = cy + sy * (y - cy);
    out[2] = cz + sz * (z - cz);
    if (jacobian) {
      jacobian.fill(0);
      jacobian[0] = sx;
      jacobian[4] = sy;
      jacobian[8] = sz;
    }
  },
  inverse(q, params, out) {
    const { cx, cy, cz, sx, sy, sz } = params as Named<K>;
    const x = q[0]!;
    const y = q[1]!;
    const z = q[2]!;
    out[0] = cx + (x - cx) / sx;
    out[1] = cy + (y - cy) / sy;
    out[2] = cz + (z - cz) / sz;
  },
  separable: ["cx", "cy", "cz", "sx", "sy", "sz"],
  source,
  slang: "scaleAboutParity",
};

/**
 * Every point scaled about `center` (default the origin) by `factors`
 * (one number, or one per axis; nonzero for the inverse).
 */
export function scaleAbout(options: {
  center?: ArrayLike<number>;
  factors: number | ArrayLike<number>;
}): SmoothEdge {
  const c = options.center ?? [0, 0, 0];
  const f =
    typeof options.factors === "number"
      ? [options.factors, options.factors, options.factors]
      : options.factors;
  return edgeOf(scaleAboutDescriptor, {
    cx: c[0]!,
    cy: c[1]!,
    cz: c[2]!,
    sx: f[0]!,
    sy: f[1]!,
    sz: f[2]!,
  });
}
