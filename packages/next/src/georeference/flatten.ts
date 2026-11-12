// Flatten: heights inside a polygon (longitude/latitude, degrees) collapse
// to `height`, and the collapse fades out over `falloff` metres outside it:
//   h' = h + w (height - h),  w = 1 - smoothstep(0, falloff, d),
// d the distance outside the polygon (0 inside), so w is 1 inside and the
// profile is C¹ across the edge. Distances are planar in a local
// equirectangular frame at the polygon's centroid (east-west metres are
// R cos φ₀ per radian, R the mean radius), good to a percent or so over tens
// of kilometres: use a polygon of that size. Output is affine in `height`.
// The Jacobian is the closed form of ellipsoid.ts with g the gradient of the
// weight through the foot's longitude and latitude. There is no closed-form
// inverse (the weight depends on where the point is): a route solves by Newton.
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

const RAD = Math.PI / 180;
const lit = (v: number): string => `(${v})`;

/** The wrapped difference of two longitudes, radians. */
function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

interface Local {
  /** The centroid, radians. */
  readonly lon0: number;
  readonly lat0: number;
  /** Metres per radian east and north. */
  readonly kx: number;
  readonly ky: number;
  /** The polygon in metres about the centroid. */
  readonly xy: readonly (readonly [number, number])[];
}

function localFrame(
  radii: Radii,
  polygon: readonly (readonly [number, number])[],
): Local {
  if (polygon.length < 3) {
    throw new RangeError("flatten: a polygon needs at least three points");
  }
  const ref = polygon[0]![0] * RAD;
  let lon = 0;
  let lat = 0;
  for (const [lo, la] of polygon) {
    lon += wrap(lo * RAD - ref);
    lat += la * RAD;
  }
  const lon0 = ref + lon / polygon.length;
  const lat0 = lat / polygon.length;
  const radius = (radii[0] + radii[1] + radii[2]) / 3;
  const kx = radius * Math.cos(lat0);
  const ky = radius;
  return {
    lon0,
    lat0,
    kx,
    ky,
    xy: polygon.map(([lo, la]) => [
      wrap(lo * RAD - lon0) * kx,
      (la * RAD - lat0) * ky,
    ]),
  };
}

function sourceOf(radii: Radii, local: Local): string {
  const { xy } = local;
  const lines = [
    "(p, params) => {",
    ...footSource(radii),
    `  const lr = Math.atan2(ny * ${lit(Math.cos(local.lon0))} - nx * ${lit(Math.sin(local.lon0))}, nx * ${lit(Math.cos(local.lon0))} + ny * ${lit(Math.sin(local.lon0))});`,
    `  const X = lr * ${lit(local.kx)};`,
    `  const Y = (Math.atan2(nz, Math.hypot(nx, ny)) - ${lit(local.lat0)}) * ${lit(local.ky)};`,
  ];
  const d2: string[] = [];
  const crossings: string[] = [];
  xy.forEach(([ax, ay], i) => {
    const [bx, by] = xy[(i + 1) % xy.length]!;
    const ex = bx - ax;
    const ey = by - ay;
    const l2 = ex * ex + ey * ey;
    if (l2 > 0) {
      lines.push(
        `  const t${i} = Math.min(Math.max(((X - ${lit(ax)}) * ${lit(ex)} + (Y - ${lit(ay)}) * ${lit(ey)}) / ${lit(l2)}, 0), 1);`,
        `  const qx${i} = X - (${lit(ax)} + t${i} * ${lit(ex)});`,
        `  const qy${i} = Y - (${lit(ay)} + t${i} * ${lit(ey)});`,
        `  const d2${i} = qx${i} * qx${i} + qy${i} * qy${i};`,
      );
      d2.push(`d2${i}`);
    }
    if (ay !== by) {
      const slope = (bx - ax) / (by - ay);
      lines.push(
        `  const c${i} = (Y >= ${lit(Math.min(ay, by))} && Y < ${lit(Math.max(ay, by))} && X < ${lit(ax)} + (Y - ${lit(ay)}) * ${lit(slope)}) ? 1 : 0;`,
      );
      crossings.push(`c${i}`);
    }
  });
  let nearest = d2[d2.length - 1]!;
  for (let i = d2.length - 2; i >= 0; i--) {
    nearest = `Math.min(${d2[i]}, ${nearest})`;
  }
  lines.push(
    `  const dmin2 = ${nearest};`,
    `  const count = ${crossings.join(" + ")};`,
    "  const odd = count - 2 * Math.floor(count / 2);",
    "  const dist = odd > 0.5 ? 0 : Math.sqrt(dmin2);",
    "  const t = Math.min(dist / params.falloff, 1);",
    "  const w = 1 - t * t * (3 - 2 * t);",
    "  const d = w * (params.height - h);",
    "  return [p[0] + d * nx, p[1] + d * ny, p[2] + d * nz];",
    "}",
  );
  return lines.join("\n");
}

export function flattenDescriptor(
  polygon: readonly (readonly [number, number])[],
  radii: Radii = WGS84_RADII,
): TransformDescriptor {
  const local = localFrame(radii, polygon);
  const c0 = Math.cos(local.lon0);
  const s0 = Math.sin(local.lon0);
  const { xy } = local;
  const frame = heightFrame();
  const grad = new Float64Array(3);
  const gn = new Float64Array(3);

  /** Whether (X, Y) is inside, and else the distance and the nearest point of the boundary. */
  const nearest = (X: number, Y: number) => {
    let count = 0;
    let best = Infinity;
    let bx = 0;
    let by = 0;
    xy.forEach(([ax, ay], i) => {
      const [cx, cy] = xy[(i + 1) % xy.length]!;
      const ex = cx - ax;
      const ey = cy - ay;
      const l2 = ex * ex + ey * ey;
      if (l2 > 0) {
        const t = Math.min(
          Math.max(((X - ax) * ex + (Y - ay) * ey) / l2, 0),
          1,
        );
        const qx = ax + t * ex;
        const qy = ay + t * ey;
        const d2 = (X - qx) ** 2 + (Y - qy) ** 2;
        if (d2 < best) {
          best = d2;
          bx = qx;
          by = qy;
        }
      }
      if (
        ay !== cy &&
        Y >= Math.min(ay, cy) &&
        Y < Math.max(ay, cy) &&
        X < ax + (Y - ay) * ((cx - ax) / (cy - ay))
      ) {
        count++;
      }
    });
    return { inside: count % 2 === 1, distance: Math.sqrt(best), bx, by };
  };

  return {
    id: `flatten${polygon.length}`,
    params: {
      height: { default: 0, description: "the height inside the polygon, m" },
      falloff: {
        default: 100,
        min: 1e-6,
        description: "the distance over which the flattening fades out, m",
      },
    },
    forward(p, params, out, jacobian) {
      const v = params as Named<"height" | "falloff">;
      const x = p[0]!;
      const y = p[1]!;
      const z = p[2]!;
      locate(radii, p, frame, jacobian !== undefined);
      const n = frame.n;
      const rho = Math.hypot(n[0]!, n[1]!);
      const X =
        Math.atan2(n[1]! * c0 - n[0]! * s0, n[0]! * c0 + n[1]! * s0) * local.kx;
      const Y = (Math.atan2(n[2]!, rho) - local.lat0) * local.ky;
      const where = nearest(X, Y);
      const distance = where.inside ? 0 : where.distance;
      const t = Math.min(distance / v.falloff, 1);
      const w = 1 - t * t * (3 - 2 * t);
      const d = w * (v.height - frame.h);
      out[0] = x + d * n[0]!;
      out[1] = y + d * n[1]!;
      out[2] = z + d * n[2]!;
      if (jacobian) {
        grad.fill(0);
        if (distance > 0 && t < 1) {
          // dw/dd, then the weight's gradient through the foot's longitude and latitude.
          const dw = (-6 * t * (1 - t)) / v.falloff;
          const ex = (X - where.bx) / distance;
          const ey = (Y - where.by) / distance;
          gn[0] =
            (-n[1]! / (rho * rho)) * ex * local.kx +
            ((-n[2]! * n[0]!) / rho) * ey * local.ky;
          gn[1] =
            (n[0]! / (rho * rho)) * ex * local.kx +
            ((-n[2]! * n[1]!) / rho) * ey * local.ky;
          gn[2] = rho * ey * local.ky;
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (let r = 0; r < 3; r++) {
              sum += frame.m[c * 3 + r]! * gn[r]!;
            }
            grad[c] = (v.height - frame.h) * dw * sum;
          }
        }
        heightMapJacobian(frame, d, 1 - w, jacobian, grad);
      }
    },
    separable: ["height"],
    source: sourceOf(radii, local),
  };
}

/**
 * Heights inside `polygon` ([longitude, latitude] pairs, degrees) set to
 * `height` metres on the ellipsoid of `radii` (default WGS84), fading out
 * over `falloff` metres outside it.
 */
export function flatten(options: {
  polygon: readonly (readonly [number, number])[];
  height: number;
  falloff: number;
  radii?: Radii;
}): SmoothEdge {
  return edgeOf(flattenDescriptor(options.polygon, options.radii), {
    height: options.height,
    falloff: options.falloff,
  });
}
