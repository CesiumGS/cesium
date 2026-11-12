// Corridor unroll: an alignment (lines and circular arcs, or a polyline,
// parametrized by arc length) as a strip. The node's points are
// (station, offset, elevation); its parent is plan (x, y, z):
//   q = P(station) + offset Â· N(station),  z = elevation,
// N the left normal of the alignment (positive offset to the left, headings
// counter-clockwise from +x). Past either end the alignment continues along
// its end tangent. The Jacobian is [T (1 - offset Îº), N, áº‘].
//
// The inverse (plan to strip) projects the point onto the alignment: the
// nearest point of any element, ties to the earlier one. Where the offset
// reaches the radius of curvature (offset Â· Îº â‰¥ 1), or past the outside of a
// polyline's corner, the strip is not one-to-one and the forward map's
// Jacobian is singular or jumps. Elements' parameters are baked in as
// parameters named s0, x0, y0, c0, n0, k0, s1, ...: start station, start
// point, cosine and sine of the start heading, curvature (0 on a line); se,
// xe, ye, ce, ne is the end. The element kinds are the shape.
import type { SmoothEdge } from "../transform/graph.ts";
import {
  edgeOf,
  type ParamSpec,
  type TransformDescriptor,
} from "./descriptor.ts";

export type CorridorElement =
  | { readonly kind: "line"; readonly length: number }
  | {
      readonly kind: "arc";
      readonly length: number;
      /** Positive turns left (counter-clockwise), negative right. */
      readonly radius: number;
    };

interface Placed {
  readonly kind: "line" | "arc";
  readonly station: number;
  readonly x: number;
  readonly y: number;
  readonly heading: number;
  readonly curvature: number;
}

interface End {
  readonly station: number;
  readonly x: number;
  readonly y: number;
  readonly heading: number;
}

/** The point at `u` along an element from its start (x, y, heading, curvature). */
function along(
  x: number,
  y: number,
  c: number,
  n: number,
  k: number,
  u: number,
): [number, number, number, number] {
  if (k === 0) {
    return [x + u * c, y + u * n, c, n];
  }
  const a = k * u;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return [
    x + (n * (ca - 1) + c * sa) / k,
    y - (c * (ca - 1) - n * sa) / k,
    c * ca - n * sa,
    n * ca + c * sa,
  ];
}

function placeElements(
  start: readonly [number, number],
  heading: number,
  station: number,
  elements: readonly CorridorElement[],
): { placed: Placed[]; end: End } {
  const placed: Placed[] = [];
  let x = start[0];
  let y = start[1];
  let theta = heading;
  let s = station;
  for (const element of elements) {
    if (!(element.length > 0) || !Number.isFinite(element.length)) {
      throw new RangeError(
        "corridorUnroll: an element needs a positive length",
      );
    }
    const k = element.kind === "arc" ? 1 / element.radius : 0;
    if (!Number.isFinite(k)) {
      throw new RangeError(
        "corridorUnroll: an arc needs a finite, non-zero radius",
      );
    }
    placed.push({
      kind: element.kind,
      station: s,
      x,
      y,
      heading: theta,
      curvature: k,
    });
    const [nx, ny] = along(
      x,
      y,
      Math.cos(theta),
      Math.sin(theta),
      k,
      element.length,
    );
    x = nx;
    y = ny;
    theta += k * element.length;
    s += element.length;
  }
  return { placed, end: { station: s, x, y, heading: theta } };
}

function polylineElements(
  points: readonly ArrayLike<number>[],
  station: number,
): { placed: Placed[]; end: End } {
  if (points.length < 2) {
    throw new RangeError(
      "corridorUnroll: a polyline needs at least two points",
    );
  }
  const placed: Placed[] = [];
  let s = station;
  let heading = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
    if (!(length > 0)) {
      throw new RangeError("corridorUnroll: a polyline has a repeated point");
    }
    heading = Math.atan2(b[1]! - a[1]!, b[0]! - a[0]!);
    placed.push({
      kind: "line",
      station: s,
      x: a[0]!,
      y: a[1]!,
      heading,
      curvature: 0,
    });
    s += length;
  }
  const last = points[points.length - 1]!;
  return { placed, end: { station: s, x: last[0]!, y: last[1]!, heading } };
}

function sourceOf(kinds: readonly ("line" | "arc")[]): string {
  const N = kinds.length;
  const names: string[] = [];
  for (let i = 0; i < N; i++) {
    names.push(`s${i}`, `x${i}`, `y${i}`, `c${i}`, `n${i}`, `k${i}`);
  }
  names.push("se", "xe", "ye", "ce", "ne");
  const lines = [
    "(p, params) => {",
    `  const { ${names.join(", ")} } = params;`,
    "  const st = p[0];",
  ];
  for (let i = 0; i < N; i++) {
    lines.push(`  const u${i} = st - s${i};`);
    if (kinds[i] === "line") {
      lines.push(
        `  const px${i} = x${i} + u${i} * c${i};`,
        `  const py${i} = y${i} + u${i} * n${i};`,
        `  const tx${i} = c${i};`,
        `  const ty${i} = n${i};`,
      );
    } else {
      lines.push(
        `  const ca${i} = Math.cos(k${i} * u${i});`,
        `  const sa${i} = Math.sin(k${i} * u${i});`,
        `  const px${i} = x${i} + (n${i} * (ca${i} - 1) + c${i} * sa${i}) / k${i};`,
        `  const py${i} = y${i} - (c${i} * (ca${i} - 1) - n${i} * sa${i}) / k${i};`,
        `  const tx${i} = c${i} * ca${i} - n${i} * sa${i};`,
        `  const ty${i} = n${i} * ca${i} + c${i} * sa${i};`,
      );
    }
  }
  lines.push("  const ub = st - s0;", "  const ua = st - se;");
  const chain = (field: string, before: string, after: string): string => {
    let expr = after;
    for (let i = N - 1; i >= 0; i--) {
      const upper = i + 1 < N ? `s${i + 1}` : "se";
      expr = `st < ${upper} ? ${field}${i} : (${expr})`;
    }
    return `st < s0 ? ${before} : (${expr})`;
  };
  lines.push(
    `  const qx = ${chain("px", "x0 + ub * c0", "xe + ua * ce")};`,
    `  const qy = ${chain("py", "y0 + ub * n0", "ye + ua * ne")};`,
    `  const tx = ${chain("tx", "c0", "ce")};`,
    `  const ty = ${chain("ty", "n0", "ne")};`,
    "  return [qx - p[1] * ty, qy + p[1] * tx, p[2]];",
    "}",
  );
  return lines.join("\n");
}

function descriptorOf(
  elements: readonly Placed[],
  end: End,
): TransformDescriptor {
  const N = elements.length;
  const kinds = elements.map((e) => e.kind);
  const params: Record<string, ParamSpec> = {};
  elements.forEach((e, i) => {
    params[`s${i}`] = {
      default: e.station,
      description: `element ${i}'s start station`,
    };
    params[`x${i}`] = { default: e.x, description: `element ${i}'s start, x` };
    params[`y${i}`] = { default: e.y, description: `element ${i}'s start, y` };
    params[`c${i}`] = { default: Math.cos(e.heading), min: -1, max: 1 };
    params[`n${i}`] = { default: Math.sin(e.heading), min: -1, max: 1 };
    params[`k${i}`] = {
      default: e.curvature,
      description: `element ${i}'s curvature, 1/m`,
    };
  });
  params.se = { default: end.station, description: "the end station" };
  params.xe = { default: end.x, description: "the end, x" };
  params.ye = { default: end.y, description: "the end, y" };
  params.ce = { default: Math.cos(end.heading), min: -1, max: 1 };
  params.ne = { default: Math.sin(end.heading), min: -1, max: 1 };

  const element = (
    v: Readonly<Record<string, number>>,
    i: number,
  ): readonly [number, number, number, number, number, number] => [
    v[`s${i}`]!,
    v[`x${i}`]!,
    v[`y${i}`]!,
    v[`c${i}`]!,
    v[`n${i}`]!,
    v[`k${i}`]!,
  ];

  /** The alignment's point, tangent and curvature at a station. */
  const at = (
    v: Readonly<Record<string, number>>,
    st: number,
  ): [number, number, number, number, number] => {
    if (st < v.s0!) {
      return [
        v.x0! + (st - v.s0!) * v.c0!,
        v.y0! + (st - v.s0!) * v.n0!,
        v.c0!,
        v.n0!,
        0,
      ];
    }
    for (let i = 0; i < N; i++) {
      const upper = i + 1 < N ? v[`s${i + 1}`]! : v.se!;
      if (st < upper) {
        const [s, x, y, c, n, k] = element(v, i);
        const [px, py, tx, ty] = along(x, y, c, n, k, st - s);
        return [px, py, tx, ty, k];
      }
    }
    return [
      v.xe! + (st - v.se!) * v.ce!,
      v.ye! + (st - v.se!) * v.ne!,
      v.ce!,
      v.ne!,
      0,
    ];
  };

  return {
    id: `corridorUnroll:${kinds.map((k) => (k === "line" ? "L" : "A")).join("")}`,
    params,
    forward(p, values, out, jacobian) {
      const st = p[0]!;
      const offset = p[1]!;
      const z = p[2]!;
      const [px, py, tx, ty, k] = at(values, st);
      out[0] = px - offset * ty;
      out[1] = py + offset * tx;
      out[2] = z;
      if (jacobian) {
        const scale = 1 - offset * k;
        jacobian.fill(0);
        jacobian[0] = tx * scale;
        jacobian[1] = ty * scale;
        jacobian[3] = -ty;
        jacobian[4] = tx;
        jacobian[8] = 1;
      }
    },
    inverse(q, values, out) {
      const x = q[0]!;
      const y = q[1]!;
      const z = q[2]!;
      let best = Infinity;
      let bestStation = values.s0!;
      let bestOffset = 0;
      const consider = (station: number): void => {
        const [px, py, tx, ty] = at(values, station);
        const dx = x - px;
        const dy = y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) {
          best = d2;
          bestStation = station;
          bestOffset = -dx * ty + dy * tx;
        }
      };
      // The ends, and the tangent extensions past them.
      consider(values.s0!);
      consider(values.se!);
      consider(
        values.s0! +
          Math.min(
            0,
            (x - values.x0!) * values.c0! + (y - values.y0!) * values.n0!,
          ),
      );
      consider(
        values.se! +
          Math.max(
            0,
            (x - values.xe!) * values.ce! + (y - values.ye!) * values.ne!,
          ),
      );
      for (let i = 0; i < N; i++) {
        const [s, sx, sy, c, n, k] = element(values, i);
        const length = (i + 1 < N ? values[`s${i + 1}`]! : values.se!) - s;
        consider(s);
        if (k === 0) {
          consider(
            s + Math.min(length, Math.max(0, (x - sx) * c + (y - sy) * n)),
          );
        } else {
          // Centre of the circle; the angle swept from the start, in the turn's direction.
          const cx = sx - n / k;
          const cy = sy + c / k;
          const delta = Math.atan2(
            (sx - cx) * (y - cy) - (sy - cy) * (x - cx),
            (sx - cx) * (x - cx) + (sy - cy) * (y - cy),
          );
          const turn =
            k > 0
              ? delta < 0
                ? delta + 2 * Math.PI
                : delta
              : delta > 0
                ? delta - 2 * Math.PI
                : delta;
          const u = turn / k;
          if (u <= length) {
            consider(s + u);
          }
        }
      }
      out[0] = bestStation;
      out[1] = bestOffset;
      out[2] = z;
    },
    separable: [],
    source: sourceOf(kinds),
    // transforms.slang holds up to 8 elements.
    ...(N <= 8 && { slang: "corridorUnrollParity" }),
  };
}

export type CorridorOptions =
  | {
      start?: readonly [number, number];
      heading?: number;
      station?: number;
      elements: readonly CorridorElement[];
    }
  | { polyline: readonly ArrayLike<number>[]; station?: number };

/** The descriptor of an alignment given as lines and arcs, or as a polyline (see `corridorUnroll`). */
export function corridorUnrollDescriptor(
  options: CorridorOptions,
): TransformDescriptor {
  const { placed, end } =
    "polyline" in options
      ? polylineElements(options.polyline, options.station ?? 0)
      : placeElements(
          options.start ?? [0, 0],
          options.heading ?? 0,
          options.station ?? 0,
          options.elements,
        );
  if (placed.length === 0) {
    throw new RangeError("corridorUnroll: an alignment needs an element");
  }
  return descriptorOf(placed, end);
}

/**
 * The unroll of an alignment given as lines and arcs from `start` (default
 * the origin) at `heading` (radians counter-clockwise from +x, default 0),
 * stations counted from `station` (default 0); or as a `polyline` of plan
 * points, stations by arc length.
 */
export function corridorUnroll(options: CorridorOptions): SmoothEdge {
  return edgeOf(corridorUnrollDescriptor(options));
}
