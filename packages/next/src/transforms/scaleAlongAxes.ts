// Scale about a point along an orthonormal basis (a, b, u): q = o + sum_k
// s_k e_k (e_k . (p - o)). Output is affine in each factor `s_k`; the inverse
// is exact. `scaleAbout` in `scaleAbout.ts` (east, north, up at a point) is
// this, so that route's draws take the compiled path. TS only: no Slang entry.
import type { SmoothEdge } from "../transform/graph.ts";
import {
  edgeOf,
  vec3Specs,
  type Named,
  type TransformDescriptor,
} from "./descriptor.ts";

type K =
  | "ox"
  | "oy"
  | "oz"
  | "sa"
  | "sb"
  | "sc"
  | "ax"
  | "ay"
  | "az"
  | "bx"
  | "by"
  | "bz"
  | "ux"
  | "uy"
  | "uz";

const source = `(p, params) => {
  const { ox, oy, oz, sa, sb, sc, ax, ay, az, bx, by, bz, ux, uy, uz } = params;
  const dx = p[0] - ox;
  const dy = p[1] - oy;
  const dz = p[2] - oz;
  const ta = sa * (ax * dx + ay * dy + az * dz);
  const tb = sb * (bx * dx + by * dy + bz * dz);
  const tc = sc * (ux * dx + uy * dy + uz * dz);
  return [
    ox + ta * ax + tb * bx + tc * ux,
    oy + ta * ay + tb * by + tc * uy,
    oz + ta * az + tb * bz + tc * uz,
  ];
}`;

function apply(
  v: Named<K>,
  inverse: boolean,
  p: ArrayLike<number>,
  out: ArrayLike<number> & { [i: number]: number },
  jacobian?: Float64Array,
): void {
  const fa = inverse ? 1 / v.sa : v.sa;
  const fb = inverse ? 1 / v.sb : v.sb;
  const fc = inverse ? 1 / v.sc : v.sc;
  const dx = p[0]! - v.ox;
  const dy = p[1]! - v.oy;
  const dz = p[2]! - v.oz;
  const ta = fa * (v.ax * dx + v.ay * dy + v.az * dz);
  const tb = fb * (v.bx * dx + v.by * dy + v.bz * dz);
  const tc = fc * (v.ux * dx + v.uy * dy + v.uz * dz);
  out[0] = v.ox + ta * v.ax + tb * v.bx + tc * v.ux;
  out[1] = v.oy + ta * v.ay + tb * v.by + tc * v.uy;
  out[2] = v.oz + ta * v.az + tb * v.bz + tc * v.uz;
  if (jacobian) {
    const e = [
      [v.ax, v.ay, v.az, fa],
      [v.bx, v.by, v.bz, fb],
      [v.ux, v.uy, v.uz, fc],
    ];
    jacobian.fill(0);
    for (const [x, y, z, f] of e) {
      const g = [x!, y!, z!];
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          jacobian[c * 3 + r] = jacobian[c * 3 + r]! + f! * g[r]! * g[c]!;
        }
      }
    }
  }
}

export const scaleAlongAxesDescriptor: TransformDescriptor = {
  id: "scaleAlongAxes",
  params: {
    ...vec3Specs("o", [0, 0, 0], "the fixed point"),
    sa: { default: 1, description: "the factor along the first axis" },
    sb: { default: 1, description: "the factor along the second axis" },
    sc: { default: 1, description: "the factor along the third axis" },
    ...vec3Specs("a", [1, 0, 0], "the first axis (a unit vector)"),
    ...vec3Specs("b", [0, 1, 0], "the second axis"),
    ...vec3Specs("u", [0, 0, 1], "the third axis"),
  },
  forward(p, params, out, jacobian) {
    apply(params as Named<K>, false, p, out, jacobian);
  },
  inverse(q, params, out) {
    apply(params as Named<K>, true, q, out);
  },
  separable: ["sa", "sb", "sc"],
  identity: { sa: 1, sb: 1, sc: 1 },
  source,
};

/**
 * Every point scaled about `center` by `factors` along `axes` (three
 * orthonormal vectors; columns of a 3×3, column-major: east, north, up).
 */
export function scaleAlongAxes(options: {
  center: ArrayLike<number>;
  factors: ArrayLike<number>;
  axes: ArrayLike<number>;
}): SmoothEdge {
  const c = options.center;
  const f = options.factors;
  const e = options.axes;
  return edgeOf(scaleAlongAxesDescriptor, {
    ox: c[0]!,
    oy: c[1]!,
    oz: c[2]!,
    sa: f[0]!,
    sb: f[1]!,
    sc: f[2]!,
    ax: e[0]!,
    ay: e[1]!,
    az: e[2]!,
    bx: e[3]!,
    by: e[4]!,
    bz: e[5]!,
    ux: e[6]!,
    uy: e[7]!,
    uz: e[8]!,
  });
}
