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

const frame = heightFrame();

export function heightOffsetDescriptor(
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  return {
    id: "heightOffset",
    params: {
      offset: {
        default: 0,
        description: "metres along the normal, up positive",
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
    separable: ["offset"],
    source: [
      "(p, params) => {",
      ...footSource(radii),
      "  return [p[0] + params.offset * nx, p[1] + params.offset * ny, p[2] + params.offset * nz];",
      "}",
    ].join("\n"),
  };
}

/** Every point moved `offset` metres up the normal of the ellipsoid of `radii` (default WGS84). */
export function heightOffset(options: {
  radii?: Radii;
  offset: number;
}): SmoothEdge {
  return edgeOf(heightOffsetDescriptor(options.radii), {
    offset: options.offset,
  });
}
