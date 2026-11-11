// Fixtures for the b-rep tests: a box, a capped cylinder and a trimmed NURBS
// face (Spike B's surface). Lengths are metres.
import { BrepBuilder } from "../src/brep/build.ts";
import { SurfaceKind, type BrepForm } from "../src/brep/form.ts";
import {
  evaluateNurbsSurface,
  type NurbsCurve,
  type NurbsSurface,
} from "../src/brep/nurbs.ts";

/**
 * Spike B's surface: a 6 × 6 net over x, y in [0, 100] m, a saddle of
 * amplitude 8 m plus 15 m at the four middle control points. The control
 * point (2, 3) has weight 2 unless `weights` says otherwise.
 */
export function spikeBSurface(
  weights?: (i: number, j: number) => number,
): NurbsSurface {
  const n = 6;
  const points = new Float64Array(n * n * 3);
  const w = new Float64Array(n * n).fill(1);
  const clamped = [0, 0, 0, 0, 1 / 3, 2 / 3, 1, 1, 1, 1];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 100;
      const y = (j / (n - 1)) * 100;
      const sx = (x - 50) / 50;
      const sy = (y - 50) / 50;
      const bump = (i === 2 || i === 3) && (j === 2 || j === 3) ? 15 : 0;
      points.set([x, y, 8 * (sx * sx - sy * sy) + bump], (j * n + i) * 3);
      w[j * n + i] = weights ? weights(i, j) : i === 2 && j === 3 ? 2 : 1;
    }
  }
  return {
    degreeU: 3,
    degreeV: 3,
    knotsU: Float64Array.from(clamped),
    knotsV: Float64Array.from(clamped),
    countU: n,
    countV: n,
    points,
    weights: w,
  };
}

/** The tolerance, m, of edges whose curves a 64-sample polyline only approximates. */
const POLYLINE_TOLERANCE = 1e-3;

/** A 2 × 3 × 4 m box: 6 planar faces, 12 line edges and 8 vertices, closed. */
export function boxBrep(): BrepForm {
  const b = new BrepBuilder();
  const size = [2, 3, 4];
  // Vertex i sits at x = bit 0, y = bit 1, z = bit 2 of i.
  const corner = (i: number) => [
    (i & 1) * size[0]!,
    ((i >> 1) & 1) * size[1]!,
    ((i >> 2) & 1) * size[2]!,
  ];
  for (let i = 0; i < 8; i++) {
    b.vertex(corner(i), { id: `v${i}` });
  }
  const edges = new Map<string, number>();
  const edgeOf = (a: number, c: number): number => {
    const key = `${Math.min(a, c)},${Math.max(a, c)}`;
    let e = edges.get(key);
    if (e === undefined) {
      e = b.edge(Math.min(a, c), Math.max(a, c), { id: `e${edges.size}` });
      edges.set(key, e);
    }
    return e;
  };

  // Each face: its plane's origin and axes (x × y points out of the box), and
  // the fixed coordinate that picks its 4 corners.
  const faces: {
    origin: number[];
    x: number[];
    y: number[];
    axis: number;
    high: boolean;
  }[] = [
    { origin: [0, 0, 0], x: [0, 1, 0], y: [1, 0, 0], axis: 2, high: false },
    { origin: [0, 0, 4], x: [1, 0, 0], y: [0, 1, 0], axis: 2, high: true },
    { origin: [0, 0, 0], x: [0, 0, 1], y: [0, 1, 0], axis: 0, high: false },
    { origin: [2, 0, 0], x: [0, 1, 0], y: [0, 0, 1], axis: 0, high: true },
    { origin: [0, 0, 0], x: [1, 0, 0], y: [0, 0, 1], axis: 1, high: false },
    { origin: [0, 3, 0], x: [0, 0, 1], y: [1, 0, 0], axis: 1, high: true },
  ];
  faces.forEach((face, index) => {
    const surface = b.plane(face.origin, face.x, face.y);
    const uv = (i: number): [number, number] => {
      const p = corner(i);
      const d = [
        p[0]! - face.origin[0]!,
        p[1]! - face.origin[1]!,
        p[2]! - face.origin[2]!,
      ];
      return [
        d[0]! * face.x[0]! + d[1]! * face.x[1]! + d[2]! * face.x[2]!,
        d[0]! * face.y[0]! + d[1]! * face.y[1]! + d[2]! * face.y[2]!,
      ];
    };
    const ids = [...Array(8).keys()].filter(
      (i) => ((i >> face.axis) & 1) === (face.high ? 1 : 0),
    );
    const cx = ids.reduce((s, i) => s + uv(i)[0], 0) / 4;
    const cy = ids.reduce((s, i) => s + uv(i)[1], 0) / 4;
    // Counter-clockwise in (u, v).
    ids.sort(
      (p, q) =>
        Math.atan2(uv(p)[1] - cy, uv(p)[0] - cx) -
        Math.atan2(uv(q)[1] - cy, uv(q)[0] - cx),
    );
    const loop = ids.map((from, k) => {
      const to = ids[(k + 1) % 4]!;
      return {
        edge: edgeOf(from, to),
        reversed: from > to,
        pcurve: [uv(from), uv(to)] as const,
      };
    });
    b.face(surface, [loop], { id: `f${index}` });
  });
  return b.build();
}

/** A rational quadratic circle of radius r at (cx, cy[, z]), counter-clockwise from angle 0. */
function circle(
  cx: number,
  cy: number,
  r: number,
  z: number | undefined,
): NurbsCurve {
  const s = Math.SQRT1_2;
  const ring = [
    [1, 0, 1],
    [1, 1, s],
    [0, 1, 1],
    [-1, 1, s],
    [-1, 0, 1],
    [-1, -1, s],
    [0, -1, 1],
    [1, -1, s],
    [1, 0, 1],
  ];
  const dimension = z === undefined ? 2 : 3;
  const points = new Float64Array(9 * dimension);
  ring.forEach(([x, y], i) => {
    points.set(
      z === undefined
        ? [cx + r * x!, cy + r * y!]
        : [cx + r * x!, cy + r * y!, z],
      i * dimension,
    );
  });
  return {
    degree: 2,
    knots: Float64Array.from([
      0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1,
    ]),
    count: 9,
    dimension,
    points,
    weights: Float64Array.from(ring.map((p) => p[2]!)),
  };
}

/**
 * A capped cylinder, r = 1 m and h = 3 m, on the z axis: one cylinder face
 * with a seam edge used twice, two planar caps, and two circular edges as
 * rational quadratics. The seam runs from (1, 0, 0) to (1, 0, 3).
 */
export function cappedCylinderBrep(): BrepForm {
  const b = new BrepBuilder();
  const r = 1;
  const h = 3;
  const bottom = b.vertex([r, 0, 0]);
  const top = b.vertex([r, 0, h]);
  const seam = b.edge(bottom, top, { id: "seam" });
  const bottomCircle = b.edge(bottom, bottom, {
    curve: circle(0, 0, r, 0),
    tolerance: POLYLINE_TOLERANCE,
    id: "bottom",
  });
  const topCircle = b.edge(top, top, {
    curve: circle(0, 0, r, h),
    tolerance: POLYLINE_TOLERANCE,
    id: "top",
  });
  const tau = 2 * Math.PI;
  const side = b.cylinder([0, 0, 0], [1, 0, 0], [0, 1, 0], r);
  b.face(
    side,
    [
      [
        {
          edge: bottomCircle,
          pcurve: [
            [0, 0],
            [tau, 0],
          ],
        },
        {
          edge: seam,
          pcurve: [
            [tau, 0],
            [tau, h],
          ],
        },
        {
          edge: topCircle,
          reversed: true,
          pcurve: [
            [tau, h],
            [0, h],
          ],
        },
        {
          edge: seam,
          reversed: true,
          pcurve: [
            [0, h],
            [0, 0],
          ],
        },
      ],
    ],
    { id: "side" },
  );
  // The planes' normals are +z, so the bottom cap is reversed to point down.
  const bottomPlane = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
  b.face(
    bottomPlane,
    [[{ edge: bottomCircle, pcurve: circle(0, 0, r, undefined) }]],
    {
      reversed: true,
      id: "bottomCap",
    },
  );
  const topPlane = b.plane([0, 0, h], [1, 0, 0], [0, 1, 0]);
  b.face(
    topPlane,
    [[{ edge: topCircle, pcurve: circle(0, 0, r, undefined) }]],
    {
      id: "topCap",
    },
  );
  return b.build();
}

/**
 * Spike B's surface as one face. The outer loop is the domain boundary, with
 * four 3D edges that are the boundary rows of control points, as exact cubic
 * NURBS curves. The inner loop is a hole of r = 0.2 around (0.5, 0.5) in
 * (u, v): its pcurve is an exact clockwise rational quadratic circle, and its
 * 3D edge is the surface image of 65 points on that circle, a closed degree-1
 * polyline. That edge has a tolerance of 0.05 m: the chord sag of 64 segments
 * is about 0.024 m.
 */
export function trimmedNurbsBrep(): BrepForm {
  const b = new BrepBuilder();
  const net = spikeBSurface();
  const surface = b.nurbsSurface(net);

  // A boundary row or column of the net, as a cubic curve.
  const boundary = (indices: number[], knots: Float64Array): NurbsCurve => ({
    degree: 3,
    knots,
    count: indices.length,
    dimension: 3,
    points: Float64Array.from(
      indices.flatMap((k) => [...net.points.subarray(k * 3, k * 3 + 3)]),
    ),
    weights: Float64Array.from(indices.map((k) => net.weights![k]!)),
  });
  const n = net.countU;
  const along = [...Array(n).keys()];
  const corner = (u: number, v: number) => [...evaluateNurbsSurface(net, u, v)];
  const v00 = b.vertex(corner(0, 0));
  const v10 = b.vertex(corner(1, 0));
  const v11 = b.vertex(corner(1, 1));
  const v01 = b.vertex(corner(0, 1));
  const tolerance = POLYLINE_TOLERANCE;
  const bottom = b.edge(v00, v10, {
    curve: boundary(
      along.map((i) => i),
      net.knotsU,
    ),
    tolerance,
  });
  const right = b.edge(v10, v11, {
    curve: boundary(
      along.map((j) => j * n + n - 1),
      net.knotsV,
    ),
    tolerance,
  });
  const top = b.edge(v01, v11, {
    curve: boundary(
      along.map((i) => (n - 1) * n + i),
      net.knotsU,
    ),
    tolerance,
  });
  const left = b.edge(v00, v01, {
    curve: boundary(
      along.map((j) => j * n),
      net.knotsV,
    ),
    tolerance,
  });

  // The hole: a clockwise circle in (u, v), and its 65-point polyline in 3D.
  const radius = 0.2;
  const spot = (angle: number): [number, number] => [
    0.5 + radius * Math.cos(angle),
    0.5 - radius * Math.sin(angle),
  ];
  const segments = 64;
  const polyline = new Float64Array((segments + 1) * 3);
  for (let k = 0; k <= segments; k++) {
    const [u, v] = spot((2 * Math.PI * k) / segments);
    polyline.set(evaluateNurbsSurface(net, u, v), k * 3);
  }
  const hole = b.vertex([...polyline.subarray(0, 3)]);
  const holeEdge = b.edge(hole, hole, {
    curve: {
      degree: 1,
      knots: Float64Array.from([
        0,
        ...Array.from({ length: segments + 1 }, (_, i) => i),
        segments,
      ]),
      count: segments + 1,
      dimension: 3,
      points: polyline,
    },
    tolerance: 0.05,
  });
  const clockwise = circle(0.5, 0.5, radius, undefined);
  for (let i = 0; i < 9; i++) {
    clockwise.points[i * 2 + 1] = 1 - clockwise.points[i * 2 + 1]!;
  }
  b.face(
    surface,
    [
      [
        {
          edge: bottom,
          pcurve: [
            [0, 0],
            [1, 0],
          ],
        },
        {
          edge: right,
          pcurve: [
            [1, 0],
            [1, 1],
          ],
        },
        {
          edge: top,
          reversed: true,
          pcurve: [
            [1, 1],
            [0, 1],
          ],
        },
        {
          edge: left,
          reversed: true,
          pcurve: [
            [0, 1],
            [0, 0],
          ],
        },
      ],
      [{ edge: holeEdge, pcurve: clockwise }],
    ],
    { id: "trimmed" },
  );
  return b.build();
}

/**
 * A chain of rational quadratic arcs of the unit circle through `angles`
 * (rad), as control points, weights and knots. The knots are uniform, so
 * arcs of different angles make the parameterization uneven in angle.
 */
export function arcChain(angles: readonly number[]): {
  points: [number, number][];
  weights: number[];
  knots: number[];
} {
  const points: [number, number][] = [];
  const weights: number[] = [];
  const arcs = angles.length - 1;
  for (let i = 0; i < arcs; i++) {
    const half = (angles[i + 1]! - angles[i]!) / 2;
    const middle = angles[i]! + half;
    if (i === 0) {
      points.push([Math.cos(angles[0]!), Math.sin(angles[0]!)]);
      weights.push(1);
    }
    points.push([
      Math.cos(middle) / Math.cos(half),
      Math.sin(middle) / Math.cos(half),
    ]);
    weights.push(Math.cos(half));
    points.push([Math.cos(angles[i + 1]!), Math.sin(angles[i + 1]!)]);
    weights.push(1);
  }
  const knots = [0, 0, 0];
  for (let i = 1; i < arcs; i++) {
    knots.push(i / arcs, i / arcs);
  }
  knots.push(1, 1, 1);
  return { points, weights, knots };
}

/**
 * A NURBS surface of revolution about the z axis: u is the circle through
 * `angles` (see `arcChain`), v the profile, given as (radius, z) points with
 * weights and knots of the given degree.
 */
export function revolvedSurface(
  angles: readonly number[],
  profile: {
    degree: number;
    points: readonly (readonly [number, number])[];
    weights: readonly number[];
    knots: readonly number[];
  },
): NurbsSurface {
  const circle = arcChain(angles);
  const countU = circle.points.length;
  const countV = profile.points.length;
  const points = new Float64Array(countU * countV * 3);
  const weights = new Float64Array(countU * countV);
  for (let j = 0; j < countV; j++) {
    for (let i = 0; i < countU; i++) {
      const [radius, z] = profile.points[j]!;
      points.set(
        [radius * circle.points[i]![0], radius * circle.points[i]![1], z],
        (j * countU + i) * 3,
      );
      weights[j * countU + i] = circle.weights[i]! * profile.weights[j]!;
    }
  }
  return {
    degreeU: 2,
    degreeV: profile.degree,
    knotsU: Float64Array.from(circle.knots),
    knotsV: Float64Array.from(profile.knots),
    countU,
    countV,
    points,
    weights,
  };
}

/** A straight profile from (r0, 0) to (r1, height): a cylinder when r0 = r1, else a cone. */
export function lineProfile(r0: number, r1: number, height: number) {
  return {
    degree: 1,
    points: [
      [r0, 0],
      [r1, height],
    ] as const,
    weights: [1, 1],
    knots: [0, 0, 1, 1],
  };
}

/** A meridian through the latitudes `angles` (rad) of a sphere of radius r, as a profile. */
export function meridianProfile(r: number, angles: readonly number[]) {
  const arc = arcChain(angles);
  return {
    degree: 2,
    points: arc.points.map(([x, y]) => [r * x, r * y] as const),
    weights: arc.weights,
    knots: arc.knots,
  };
}

/** The unit-less angles of a circle cut into arcs of the given fractions of a turn. */
export function turnAngles(fractions: readonly number[]): number[] {
  const total = fractions.reduce((a, b) => a + b, 0);
  const out = [0];
  for (const f of fractions) {
    out.push(out[out.length - 1]! + (2 * Math.PI * f) / total);
  }
  return out;
}

/**
 * A one-face form on `surface` of a builder, over the (u, v) box, with a
 * rectangular loop. Its edges are straight lines between arbitrary vertices:
 * for tessellation and for forms that need a face, not for validation.
 */
export function boxFace(
  b: BrepBuilder,
  surface: number,
  box: readonly [number, number, number, number],
): void {
  const [u0, u1, v0, v1] = box;
  const v = [0, 1, 2, 3].map((i) => b.vertex([i, 0, 0]));
  const e = [0, 1, 2, 3].map((i) => b.edge(v[i]!, v[(i + 1) % 4]!));
  b.face(surface, [
    [
      {
        edge: e[0]!,
        pcurve: [
          [u0, v0],
          [u1, v0],
        ],
      },
      {
        edge: e[1]!,
        pcurve: [
          [u1, v0],
          [u1, v1],
        ],
      },
      {
        edge: e[2]!,
        pcurve: [
          [u1, v1],
          [u0, v1],
        ],
      },
      {
        edge: e[3]!,
        pcurve: [
          [u0, v1],
          [u0, v0],
        ],
      },
    ],
  ]);
}

/**
 * A r = 0.5 m, 2 m tall cylinder of one NURBS face, as SMLib holds it: three
 * arcs of 90°, 150° and 120° under uniform knots, with its analytic identity
 * and a representation error of 25 µm.
 */
export function nurbsCylinderBrep(): BrepForm {
  const b = new BrepBuilder();
  const surface = b.nurbsSurface(
    revolvedSurface(turnAngles([3, 5, 4]), lineProfile(0.5, 0.5, 2)),
    {
      identity: {
        kind: SurfaceKind.Cylinder,
        origin: [0, 0, 0],
        x: [1, 0, 0],
        y: [0, 1, 0],
        params: [0.5, 0],
      },
      error: 2.5e-5,
    },
  );
  boxFace(b, surface, [0, 1, 0, 1]);
  return b.build();
}
