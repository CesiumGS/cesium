// Vertical exaggeration as a lift profile along the ellipsoid's normals: a
// point at height h goes to h' = h + (k - 1) g(h), g the part of the height
// that is lifted. Below `ceiling - band` g(h) = h - base, so heights scale
// by k about `baseHeight`; above the ceiling g is constant, so h' = h + (k -
// 1)(ceiling - base - band/2): a shift, never a stretch, and the sky is not
// pulled apart. Between, a quadratic blend over `band` metres makes
// dh'/dh continuous (J is C⁰, H finite, jumping at the band's two edges):
//   a = ceiling - band, u = clamp(h - a, 0, band)
//   g = min(h, a) - base + u - u² / (2 band).
// The inverse is exact, branch by branch (the profile is monotone for k > 0).
// Output is affine in `factor`, the one parameter a slider moves.
import type { SmoothEdge } from "../transform/graph.ts";
import {
  edgeOf,
  type Named,
  type TransformDescriptor,
} from "../transforms/descriptor.ts";
import {
  footSource,
  heightFrame,
  heightMapJacobian,
  locate,
  WGS84_RADII,
  type Radii,
} from "./ellipsoid.ts";

type K = "factor" | "ceiling" | "baseHeight" | "band";

/** g(h) and dg/dh. */
export function liftProfile(h: number, v: Named<K>): [number, number] {
  const a = v.ceiling - v.band;
  const u = Math.min(Math.max(h - a, 0), v.band);
  const g = Math.min(h, a) - v.baseHeight + u - (u * u) / (2 * v.band);
  const dg = h < a ? 1 : h < v.ceiling ? 1 - (h - a) / v.band : 0;
  return [g, dg];
}

/** The height whose lifted height is `h2`: the profile's exact inverse, branch by branch. */
export function unliftProfile(h2: number, v: Named<K>): number {
  const k = v.factor;
  const a = v.ceiling - v.band;
  const top = v.ceiling - v.baseHeight - v.band / 2;
  const hLow = k * a - (k - 1) * v.baseHeight;
  const hHigh = v.ceiling + (k - 1) * top;
  if (h2 <= hLow) {
    return (h2 + (k - 1) * v.baseHeight) / k;
  }
  if (h2 >= hHigh) {
    return h2 - (k - 1) * top;
  }
  const r = h2 - (a + (k - 1) * (a - v.baseHeight));
  return a + (2 * r) / (k + Math.sqrt(k * k - (2 * (k - 1) * r) / v.band));
}

function sourceOf(radii: Radii): string {
  return [
    "(p, params) => {",
    ...footSource(radii),
    "  const a = params.ceiling - params.band;",
    "  const u = Math.min(Math.max(h - a, 0), params.band);",
    "  const g = Math.min(h, a) - params.baseHeight + u - u * u / (2 * params.band);",
    "  const d = (params.factor - 1) * g;",
    "  return [p[0] + d * nx, p[1] + d * ny, p[2] + d * nz];",
    "}",
  ].join("\n");
}

const frame = heightFrame();

export function verticalExaggerationDescriptor(
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  return {
    id: "verticalExaggeration",
    params: {
      factor: {
        default: 1,
        min: 1e-6,
        description:
          "what heights below the ceiling are multiplied by (1: unchanged)",
      },
      ceiling: {
        default: 9000,
        description: "the height above which the lift is constant, m",
      },
      baseHeight: {
        default: 0,
        description: "the height that stays put as the factor changes, m",
      },
      band: {
        default: 1000,
        min: 1e-6,
        description:
          "the width below the ceiling over which the lift is blended, m",
      },
    },
    forward(p, params, out, jacobian) {
      const v = params as Named<K>;
      const x = p[0]!;
      const y = p[1]!;
      const z = p[2]!;
      locate(radii, p, frame, jacobian !== undefined);
      const [g, dg] = liftProfile(frame.h, v);
      const d = (v.factor - 1) * g;
      out[0] = x + d * frame.n[0]!;
      out[1] = y + d * frame.n[1]!;
      out[2] = z + d * frame.n[2]!;
      if (jacobian) {
        heightMapJacobian(frame, d, 1 + (v.factor - 1) * dg, jacobian);
      }
    },
    inverse(q, params, out) {
      const v = params as Named<K>;
      const x = q[0]!;
      const y = q[1]!;
      const z = q[2]!;
      locate(radii, q, frame, false);
      const h2 = frame.h;
      const h = unliftProfile(h2, v);
      out[0] = x + (h - h2) * frame.n[0]!;
      out[1] = y + (h - h2) * frame.n[1]!;
      out[2] = z + (h - h2) * frame.n[2]!;
    },
    separable: ["factor"],
    identity: { factor: 1 },
    source: sourceOf(radii),
    slang: "exaggerationParity",
  };
}

/**
 * Heights above the ellipsoid of `radii` (default WGS84, body-fixed metres)
 * multiplied by `factor` about `baseHeight` (default 0) below `ceiling`,
 * and shifted by a constant above it, blended over `band` (default a fifth
 * of the way from the base to the ceiling).
 */
export function verticalExaggerationEdge(options: {
  radii?: Radii;
  factor: number;
  ceiling: number;
  baseHeight?: number;
  band?: number;
}): SmoothEdge {
  const base = options.baseHeight ?? 0;
  if (!(options.ceiling > base)) {
    throw new RangeError(
      "verticalExaggeration: the ceiling must be above the base height",
    );
  }
  return edgeOf(verticalExaggerationDescriptor(options.radii), {
    factor: options.factor,
    ceiling: options.ceiling,
    baseHeight: base,
    band: options.band ?? 0.2 * (options.ceiling - base),
  });
}
