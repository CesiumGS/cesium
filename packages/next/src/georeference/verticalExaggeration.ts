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
import { liftedPart } from "../camera/heightProfile.ts";
import type {
  BoundRegion,
  DeclaredBound,
  SmoothEdge,
} from "../transform/graph.ts";
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
import {
  curvatureRadii,
  enuAtNormal,
  halfExtents,
  hull,
  liftBound,
  UNBOUNDED,
} from "./regionBounds.ts";

type K = "factor" | "ceiling" | "baseHeight" | "band";

/** g(h) and dg/dh. */
export function liftProfile(h: number, v: Named<K>): [number, number] {
  return liftedPart(h, v.baseHeight, v.ceiling, v.band);
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

/**
 * The lift's Jacobian over a box, in east, north and up at its centre. With
 * S the shape operator, J = I + (k - 1)(g S (I + hS)⁻¹ + g' n nᵀ) is
 * symmetric: along the normal 1 + (k - 1) g', and on the surface a 2 × 2
 * block with eigenvalues 1 + (k - 1) g / (ρ + h), ρ a radius of curvature.
 * Heights over the box: the height is convex above the surface with a unit
 * gradient n and a Hessian of at most 1 / (ρ_min + h), so it is within the
 * box's vertical half extent below the centre's and that plus the sag
 * ½ (e² + n²) / (ρ_min + h) above. g is non-decreasing and g' falls from 1 to
 * 0, so their ranges follow from those heights, over the parameters'
 * (their corners: the profile is monotone in the ceiling and base height).
 * The frame at a point of the box is tilted from the centre's by at most
 * the normal's turn over the box, and turned about the vertical by at most
 * the longitude's.
 */
function exaggerationBound(radii: Radii) {
  const { min: rhoMin, max: rhoMax } = curvatureRadii(radii);
  const at = heightFrame();
  return (
    region: BoundRegion,
    ranges: Readonly<Record<string, readonly [number, number]>>,
  ): DeclaredBound => {
    try {
      locate(radii, region.center, at, false);
    } catch {
      return UNBOUNDED;
    }
    const basis = enuAtNormal(at.n);
    const w = halfExtents(basis, region.axes);
    const reach = Math.hypot(w[0], w[1], w[2]);
    if (!(rhoMin + at.h - reach > 0)) {
      return UNBOUNDED;
    }
    const lam = 1 / (rhoMin + at.h - reach);
    const hLow = at.h - w[2];
    const hHigh = at.h + w[2] + 0.5 * lam * (w[0] * w[0] + w[1] * w[1]);
    const k = ranges.factor!;
    let gLow = Infinity;
    let gHigh = -Infinity;
    let dgLow = Infinity;
    let dgHigh = -Infinity;
    for (const ceiling of ranges.ceiling!) {
      for (const baseHeight of ranges.baseHeight!) {
        for (const band of ranges.band!) {
          const v = { factor: 1, ceiling, baseHeight, band };
          const [g0, dg0] = liftProfile(hLow, v);
          const [g1, dg1] = liftProfile(hHigh, v);
          gLow = Math.min(gLow, g0);
          gHigh = Math.max(gHigh, g1);
          dgLow = Math.min(dgLow, dg1);
          dgHigh = Math.max(dgHigh, dg0);
        }
      }
    }
    // g / (ρ + h) over the heights and radii: the largest and smallest.
    const tHigh =
      gHigh > 0 ? gHigh / (rhoMin + hLow) : gHigh / (rhoMax + hHigh);
    const tLow = gLow < 0 ? gLow / (rhoMin + hLow) : gLow / (rhoMax + hHigh);
    const f = [k[0] - 1, k[1] - 1];
    const dT = hull(f.flatMap((x) => [x * tLow, x * tHigh]));
    const dU = hull(f.flatMap((x) => [x * dgLow, x * dgHigh]));
    const tilt = lam * reach;
    const axis = Math.hypot(region.center[0]!, region.center[1]!);
    const twist = axis > reach ? reach / (axis - reach) + tilt : Math.PI;
    return {
      basisIn: basis,
      basisOut: basis,
      absJ: liftBound(
        dT,
        dU,
        Math.min(Math.PI, tilt),
        Math.min(Math.PI, twist),
      ),
    };
  };
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
    bound: exaggerationBound(radii),
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
