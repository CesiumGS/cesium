// A Gaussian bump: every point moves along the unit direction u by
// amplitude · exp(-|p - c|² / 2σ²), a lift (negative digs) about a centre.
// Output is affine in the amplitude. No closed-form inverse: a route solves
// by Newton with the Jacobian below.
import type { SmoothEdge } from "../transform/graph.ts";
import {
  edgeOf,
  nonzero3,
  vec3Specs,
  type Named,
  type TransformDescriptor,
} from "./descriptor.ts";

type K = "cx" | "cy" | "cz" | "ux" | "uy" | "uz" | "amplitude" | "sigma";

const source = `(p, params) => {
  const { cx, cy, cz, ux, uy, uz, amplitude, sigma } = params;
  const il = 1 / Math.hypot(ux, uy, uz);
  const dx = p[0] - cx;
  const dy = p[1] - cy;
  const dz = p[2] - cz;
  const g = amplitude * Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * sigma * sigma));
  return [p[0] + g * ux * il, p[1] + g * uy * il, p[2] + g * uz * il];
}`;

export const bumpDescriptor: TransformDescriptor = {
  id: "bump",
  params: {
    ...vec3Specs("c", [0, 0, 0], "the bump's centre"),
    ...vec3Specs("u", [0, 0, 1], "the direction points move in (normalized)"),
    amplitude: { default: 1, description: "the lift at the centre, m" },
    sigma: {
      default: 1,
      min: 1e-9,
      description: "the Gaussian's standard deviation, m",
    },
  },
  forward(p, params, out, jacobian) {
    const { cx, cy, cz, ux, uy, uz, amplitude, sigma } = params as Named<K>;
    const il = 1 / Math.hypot(ux, uy, uz);
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    const dx = x - cx;
    const dy = y - cy;
    const dz = z - cz;
    const g =
      amplitude *
      Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * sigma * sigma));
    const u = [ux * il, uy * il, uz * il];
    out[0] = x + g * u[0]!;
    out[1] = y + g * u[1]!;
    out[2] = z + g * u[2]!;
    if (jacobian) {
      const grad = [dx, dy, dz].map((d) => (-g * d) / (sigma * sigma));
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          jacobian[c * 3 + r] = (r === c ? 1 : 0) + u[r]! * grad[c]!;
        }
      }
    }
  },
  separable: ["amplitude"],
  source,
  slang: "bumpParity",
};

/** A bump of `amplitude` metres at `center`, `sigma` wide, along `direction` (default +z). */
export function bump(options: {
  center: ArrayLike<number>;
  amplitude: number;
  sigma: number;
  direction?: ArrayLike<number>;
}): SmoothEdge {
  const c = options.center;
  const u = nonzero3(options.direction ?? [0, 0, 1], "bump: direction");
  return edgeOf(bumpDescriptor, {
    cx: c[0]!,
    cy: c[1]!,
    cz: c[2]!,
    ux: u[0],
    uy: u[1],
    uz: u[2],
    amplitude: options.amplitude,
    sigma: options.sigma,
  });
}
