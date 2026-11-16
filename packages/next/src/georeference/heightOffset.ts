// A constant lift along the ellipsoid's normals: q = p + offset · n. Raises
// content clear of terrain, or sinks it. Output is affine in `offset`; the
// inverse is exact, as p and q share a normal line.
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
import {
  curvatureRadii,
  enuAtNormal,
  halfExtents,
  hull,
  liftBound,
  UNBOUNDED,
} from "./regionBounds.ts";

const frame = heightFrame();

export function heightOffsetDescriptor(
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  return {
    id: "heightOffset",
    params: {
      offset: {
        default: 0,
        description: "meters along the normal, up positive",
      },
    },
    forward(p, params, out, jacobian) {
      const { offset } = params as Named<"offset">;
      const x = p[0]!;
      const y = p[1]!;
      const z = p[2]!;
      locate(radii, p, frame, jacobian !== undefined);
      out[0] = x + offset * frame.n[0]!;
      out[1] = y + offset * frame.n[1]!;
      out[2] = z + offset * frame.n[2]!;
      if (jacobian) {
        heightMapJacobian(frame, offset, 1, jacobian);
      }
    },
    inverse(q, params, out) {
      const { offset } = params as Named<"offset">;
      const x = q[0]!;
      const y = q[1]!;
      const z = q[2]!;
      locate(radii, q, frame, false);
      out[0] = x - offset * frame.n[0]!;
      out[1] = y - offset * frame.n[1]!;
      out[2] = z - offset * frame.n[2]!;
    },
    bound(region, ranges) {
      // J = I + offset · S (I + hS)⁻¹: nothing along the normal, on the
      // surface a block with eigenvalues offset / (ρ + h) (see the lift).
      const { min, max } = curvatureRadii(radii);
      try {
        locate(radii, region.center, frame, false);
      } catch {
        return UNBOUNDED;
      }
      const basis = enuAtNormal(frame.n);
      const w = halfExtents(basis, region.axes);
      const reach = Math.hypot(w[0], w[1], w[2]);
      if (!(min + frame.h - reach > 0)) {
        return UNBOUNDED;
      }
      const lam = 1 / (min + frame.h - reach);
      const hLow = frame.h - w[2];
      const hHigh = frame.h + w[2] + 0.5 * lam * (w[0] * w[0] + w[1] * w[1]);
      const t = [1 / (max + hHigh), 1 / (min + hLow)];
      const dT = hull(ranges.offset!.flatMap((o) => t.map((v) => o * v)));
      const tilt = Math.min(Math.PI, lam * reach);
      const axis = Math.hypot(region.center[0]!, region.center[1]!);
      const twist = axis > reach ? reach / (axis - reach) + tilt : Math.PI;
      return {
        basisIn: basis,
        basisOut: basis,
        absJ: liftBound(dT, [0, 0], tilt, Math.min(Math.PI, twist)),
      };
    },
    separable: ["offset"],
    identity: { offset: 0 },
    source: [
      "(p, params) => {",
      ...footSource(radii),
      "  return [p[0] + params.offset * nx, p[1] + params.offset * ny, p[2] + params.offset * nz];",
      "}",
    ].join("\n"),
  };
}

/** Every point moved `offset` meters up the normal of the ellipsoid of `radii` (default WGS84). */
export function heightOffsetEdge(options: {
  radii?: Radii;
  offset: number;
}): SmoothEdge {
  return edgeOf(heightOffsetDescriptor(options.radii), {
    offset: options.offset,
  });
}
