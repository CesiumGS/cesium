// The three shapes of the B-reps gallery example, built with `BrepBuilder`
// (the same shapes as the engine's tests). Lengths are metres.
import {
  BrepBuilder,
  evaluateSurface,
  type BrepUse,
  type BrepForm,
  type NurbsCurve,
  type NurbsSurface,
} from "../../src/brep/index.ts";

/** The tolerance, m, of edges whose curves a 64-sample polyline only approximates. */
const POLYLINE_TOLERANCE = 1e-3;

/**
 * Spike B's surface: a 6 × 6 net over x, y in [0, 100] m, a saddle of
 * amplitude 8 m plus 15 m at the four middle control points. The control
 * point (2, 3) has weight 2 unless `weights` says otherwise.
 */
function spikeBSurface(
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

/** A hole through a slab: the loops its top and bottom faces take as inner loops. */
interface Hole {
  top: BrepUse[];
  bottom: BrepUse[];
}

/**
 * A hole of radius r through the z extent [0, h] at (cx, cy): its cylinder
 * face (reversed, so that it faces the hole's axis, out of the material), a
 * seam, and the two circles. The top face (u, v = x, y) uses the top circle
 * clockwise; the bottom face (u, v = y, x) uses the bottom circle forward,
 * which is clockwise in its mirrored coordinates.
 */
function throughHole(
  b: BrepBuilder,
  cx: number,
  cy: number,
  r: number,
  h: number,
  id: string,
): Hole {
  const tau = 2 * Math.PI;
  const low = b.vertex([cx + r, cy, 0]);
  const high = b.vertex([cx + r, cy, h]);
  const seam = b.edge(low, high, { id: `${id}-seam` });
  const lowCircle = b.edge(low, low, {
    curve: arcCurve3([cx, cy, 0], [1, 0, 0], [0, 1, 0], r, 4),
    tolerance: POLYLINE_TOLERANCE,
    id: `${id}-bottom`,
  });
  const highCircle = b.edge(high, high, {
    curve: arcCurve3([cx, cy, h], [1, 0, 0], [0, 1, 0], r, 4),
    tolerance: POLYLINE_TOLERANCE,
    id: `${id}-top`,
  });
  const side = b.cylinder([cx, cy, 0], [1, 0, 0], [0, 1, 0], r);
  b.face(
    side,
    [
      [
        {
          edge: lowCircle,
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
          edge: highCircle,
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
    { reversed: true, id },
  );
  return {
    top: [
      {
        edge: highCircle,
        reversed: true,
        pcurve: arcCurve2([cx, cy], r, 0, -1, 4),
      },
    ],
    bottom: [
      {
        edge: lowCircle,
        pcurve: arcCurve2([cy, cx], r, Math.PI / 2, -1, 4),
      },
    ],
  };
}

/** A box of the given size with 6 planar faces, 12 line edges and 8 vertices, and through-holes in its z faces. */
function slab(
  size: readonly [number, number, number],
  holes: ReadonlyArray<{ x: number; y: number; r: number }>,
): BrepForm {
  const b = new BrepBuilder();
  // Vertex i sits at x = bit 0, y = bit 1, z = bit 2 of i.
  const corner = (i: number) => [
    (i & 1) * size[0],
    ((i >> 1) & 1) * size[1],
    ((i >> 2) & 1) * size[2],
  ];
  for (let i = 0; i < 8; i++) {
    b.vertex(corner(i), { id: `v${i}` });
  }
  const through = holes.map((hole, k) =>
    throughHole(b, hole.x, hole.y, hole.r, size[2], `hole${k}`),
  );
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
    {
      origin: [0, 0, size[2]],
      x: [1, 0, 0],
      y: [0, 1, 0],
      axis: 2,
      high: true,
    },
    { origin: [0, 0, 0], x: [0, 0, 1], y: [0, 1, 0], axis: 0, high: false },
    {
      origin: [size[0], 0, 0],
      x: [0, 1, 0],
      y: [0, 0, 1],
      axis: 0,
      high: true,
    },
    { origin: [0, 0, 0], x: [1, 0, 0], y: [0, 0, 1], axis: 1, high: false },
    {
      origin: [0, size[1], 0],
      x: [0, 0, 1],
      y: [1, 0, 0],
      axis: 1,
      high: true,
    },
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
    const inner =
      face.axis === 2 ? through.map((h) => (face.high ? h.top : h.bottom)) : [];
    b.face(surface, [loop, ...inner], { id: `f${index}` });
  });
  return b.build();
}

/** A 2 × 3 × 4 m box: 6 planar faces, 12 line edges and 8 vertices, closed. */
export function boxBrep(): BrepForm {
  return slab([2, 3, 4], []);
}

/**
 * A plate of 4 × 3 × 0.2 m with 4 bolt holes of r = 0.15 m near its corners:
 * the top and bottom faces each have 4 inner loops, the 4 sides, and 4
 * cylinder faces, each with a seam.
 */
export function plateBrep(): BrepForm {
  return slab(
    [4, 3, 0.2],
    [
      { x: 0.5, y: 0.5, r: 0.15 },
      { x: 3.5, y: 0.5, r: 0.15 },
      { x: 0.5, y: 2.5, r: 0.15 },
      { x: 3.5, y: 2.5, r: 0.15 },
    ],
  );
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

/** The first 2q + 1 points of a unit circle's rational quadratic ring (q quarter turns, 1 to 4), placed by `place`. */
function arcCurve(
  dimension: 2 | 3,
  quarters: number,
  place: (x: number, y: number) => number[],
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
  ].slice(0, 2 * quarters + 1);
  const points = new Float64Array(ring.length * dimension);
  ring.forEach(([x, y], i) => points.set(place(x!, y!), i * dimension));
  const knots = [0, 0, 0];
  for (let k = 1; k < quarters; k++) {
    knots.push(k / quarters, k / quarters);
  }
  knots.push(1, 1, 1);
  return {
    degree: 2,
    knots: Float64Array.from(knots),
    count: ring.length,
    dimension,
    points,
    weights: Float64Array.from(ring.map((p) => p[2]!)),
  };
}

/** An arc in 3D: from centre + r·ex, counter-clockwise towards ey, for q quarter turns. */
function arcCurve3(
  centre: readonly number[],
  ex: readonly number[],
  ey: readonly number[],
  r: number,
  quarters: number,
): NurbsCurve {
  return arcCurve(3, quarters, (x, y) =>
    [0, 1, 2].map((k) => centre[k]! + r * (x * ex[k]! + y * ey[k]!)),
  );
}

/**
 * An arc in (u, v): it starts at angle `start` from the centre and turns
 * counter-clockwise for sign 1 and clockwise for sign -1.
 */
function arcCurve2(
  centre: readonly [number, number],
  r: number,
  start: number,
  sign: 1 | -1,
  quarters: number,
): NurbsCurve {
  const c = Math.cos(start);
  const sn = Math.sin(start);
  return arcCurve(2, quarters, (x, y) => {
    const yy = sign * y;
    return [
      centre[0] + r * (c * x - sn * yy),
      centre[1] + r * (sn * x + c * yy),
    ];
  });
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
  // The surface's points, from the form so far (the builder's surface 0).
  const formSoFar = b.build();
  const at = (u: number, v: number): number[] => [
    ...evaluateSurface(formSoFar, surface, u, v).position,
  ];
  const corner = at;
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
    polyline.set(at(u, v), k * 3);
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
 * A sphere of r = 1 m: one face over u in [0, 2π] and v in [−π/2, π/2]. Its
 * seam, a half circle from the south pole to the north pole, is used twice.
 * Each pole is a degenerate edge: one vertex at both ends, a zero-length 3D
 * curve, and a pcurve along the pole's v line.
 */
export function sphereBrep(): BrepForm {
  const b = new BrepBuilder();
  const tau = 2 * Math.PI;
  const half = Math.PI / 2;
  const south = b.vertex([0, 0, -1], { id: "south" });
  const north = b.vertex([0, 0, 1], { id: "north" });
  const seam = b.edge(south, north, {
    curve: arcCurve3([0, 0, 0], [0, 0, -1], [1, 0, 0], 1, 2),
    tolerance: POLYLINE_TOLERANCE,
    id: "seam",
  });
  const southPole = b.edge(south, south, { id: "southPole" });
  const northPole = b.edge(north, north, { id: "northPole" });
  const surface = b.sphere([0, 0, 0], [1, 0, 0], [0, 1, 0], 1);
  b.face(
    surface,
    [
      [
        {
          edge: southPole,
          pcurve: [
            [0, -half],
            [tau, -half],
          ],
        },
        {
          edge: seam,
          pcurve: [
            [tau, -half],
            [tau, half],
          ],
        },
        {
          edge: northPole,
          pcurve: [
            [tau, half],
            [0, half],
          ],
        },
        {
          edge: seam,
          reversed: true,
          pcurve: [
            [0, half],
            [0, -half],
          ],
        },
      ],
    ],
    { id: "sphere" },
  );
  return b.build();
}

/**
 * A torus of R = 1 m and r = 0.3 m: one face over the full (u, v) domain,
 * with two seams, one around u and one around v, each used twice, and one
 * vertex at (1.3, 0, 0).
 */
export function torusBrep(): BrepForm {
  const b = new BrepBuilder();
  const tau = 2 * Math.PI;
  const big = 1;
  const small = 0.3;
  const vertex = b.vertex([big + small, 0, 0], { id: "v" });
  // Around u, at v = 0: the outer equator. Around v, at u = 0: the tube.
  const aroundU = b.edge(vertex, vertex, {
    curve: arcCurve3([0, 0, 0], [1, 0, 0], [0, 1, 0], big + small, 4),
    tolerance: POLYLINE_TOLERANCE,
    id: "aroundU",
  });
  const aroundV = b.edge(vertex, vertex, {
    curve: arcCurve3([big, 0, 0], [1, 0, 0], [0, 0, 1], small, 4),
    tolerance: POLYLINE_TOLERANCE,
    id: "aroundV",
  });
  const surface = b.torus([0, 0, 0], [1, 0, 0], [0, 1, 0], big, small);
  b.face(
    surface,
    [
      [
        {
          edge: aroundU,
          pcurve: [
            [0, 0],
            [tau, 0],
          ],
        },
        {
          edge: aroundV,
          pcurve: [
            [tau, 0],
            [tau, tau],
          ],
        },
        {
          edge: aroundU,
          reversed: true,
          pcurve: [
            [tau, tau],
            [0, tau],
          ],
        },
        {
          edge: aroundV,
          reversed: true,
          pcurve: [
            [0, tau],
            [0, 0],
          ],
        },
      ],
    ],
    { id: "torus" },
  );
  return b.build();
}

/**
 * A cone frustum, radius 1 m at the bottom and 0.5 m at the top, 1.5 m high:
 * a cone face with a seam line, and two planar caps.
 */
export function coneFrustumBrep(): BrepForm {
  const b = new BrepBuilder();
  const tau = 2 * Math.PI;
  const h = 1.5;
  const bottomRadius = 1;
  const topRadius = 0.5;
  const bottom = b.vertex([bottomRadius, 0, 0]);
  const top = b.vertex([topRadius, 0, h]);
  const seam = b.edge(bottom, top, { id: "seam" });
  const bottomCircle = b.edge(bottom, bottom, {
    curve: circle(0, 0, bottomRadius, 0),
    tolerance: POLYLINE_TOLERANCE,
    id: "bottom",
  });
  const topCircle = b.edge(top, top, {
    curve: circle(0, 0, topRadius, h),
    tolerance: POLYLINE_TOLERANCE,
    id: "top",
  });
  // The radius shrinks by 0.5 m over 1.5 m of v: a negative half-angle.
  const side = b.cone(
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    bottomRadius,
    -Math.atan((bottomRadius - topRadius) / h),
  );
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
  b.face(
    b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]),
    [[{ edge: bottomCircle, pcurve: circle(0, 0, bottomRadius, undefined) }]],
    { reversed: true, id: "bottomCap" },
  );
  b.face(
    b.plane([0, 0, h], [1, 0, 0], [0, 1, 0]),
    [[{ edge: topCircle, pcurve: circle(0, 0, topRadius, undefined) }]],
    { id: "topCap" },
  );
  return b.build();
}

/**
 * A block of 2 × 1.5 × 1 m (x, y, z) whose long top edge at y = 1.5 m is
 * rounded by a quarter-cylinder fillet of r = 0.3 m, with a vertical
 * through-hole of r = 0.2 m at (1, 0.6). Its faces are the bottom, front,
 * back, top, fillet, two ends (each with a quarter-circle arc in its outer
 * loop) and the hole's cylinder, which has a seam.
 */
export function filletedBlockBrep(): BrepForm {
  const b = new BrepBuilder();
  const length = 2;
  const depth = 1.5;
  const height = 1;
  const r = 0.3;
  const wall = depth - r; // y where the fillet starts on top
  const shoulder = height - r; // z where it starts on the back
  // The end profile, at x = 0 (vertices 0 to 4) and again at x = length (5 to 9).
  const profile: number[][] = [
    [0, 0],
    [depth, 0],
    [depth, shoulder],
    [wall, height],
    [0, height],
  ];
  const position: number[][] = [];
  for (const x of [0, length]) {
    for (const [y, z] of profile) {
      position.push([x, y!, z!]);
    }
  }
  position.forEach((p, i) => b.vertex(p, { id: `v${i}` }));
  // Along x: edge i joins vertex i to vertex i + 5.
  const along = [0, 1, 2, 3, 4].map((i) => b.edge(i, i + 5, { id: `x${i}` }));
  // An end's profile: bottom, back, arc, top and front edges.
  const end = (offset: number, x: number) => {
    const at = (i: number) => (i + 1) % 5;
    return [0, 1, 2, 3, 4].map((i) =>
      i === 2
        ? b.edge(offset + 2, offset + 3, {
            curve: arcCurve3([x, wall, shoulder], [0, 1, 0], [0, 0, 1], r, 1),
            tolerance: POLYLINE_TOLERANCE,
            id: `arc${offset}`,
          })
        : b.edge(offset + i, offset + at(i), { id: `p${offset}-${i}` }),
    );
  };
  // Profile edge i goes from profile vertex i to i + 1, but the last, 4 to 0.
  const a = end(0, 0);
  const c = end(5, length);
  const hole = throughHole(b, 1, 0.6, 0.2, height, "hole");

  const pos = (v: number) => position[v]!;
  /** A use whose pcurve is the straight line between two vertices' images on a plane. */
  const plane = (
    origin: number[],
    x: number[],
    y: number[],
    items: Array<{
      edge: number;
      from: number;
      to: number;
      reversed?: boolean;
      pcurve?: NurbsCurve;
    }>,
  ) => {
    const uv = (v: number): [number, number] => {
      const d = pos(v).map((k, i) => k - origin[i]!);
      return [
        d[0]! * x[0]! + d[1]! * x[1]! + d[2]! * x[2]!,
        d[0]! * y[0]! + d[1]! * y[1]! + d[2]! * y[2]!,
      ];
    };
    return {
      surface: b.plane(origin, x, y),
      loop: items.map((item) => ({
        edge: item.edge,
        reversed: item.reversed,
        pcurve: item.pcurve ?? ([uv(item.from), uv(item.to)] as const),
      })),
    };
  };

  const bottom = plane(
    [0, 0, 0],
    [0, 1, 0],
    [1, 0, 0],
    [
      { edge: a[0]!, from: 0, to: 1 },
      { edge: along[1]!, from: 1, to: 6 },
      { edge: c[0]!, from: 6, to: 5, reversed: true },
      { edge: along[0]!, from: 5, to: 0, reversed: true },
    ],
  );
  b.face(bottom.surface, [bottom.loop, hole.bottom], { id: "bottom" });

  const front = plane(
    [0, 0, 0],
    [1, 0, 0],
    [0, 0, 1],
    [
      { edge: along[0]!, from: 0, to: 5 },
      { edge: c[4]!, from: 5, to: 9, reversed: true },
      { edge: along[4]!, from: 9, to: 4, reversed: true },
      { edge: a[4]!, from: 4, to: 0 },
    ],
  );
  b.face(front.surface, [front.loop], { id: "front" });

  const back = plane(
    [0, depth, 0],
    [0, 0, 1],
    [1, 0, 0],
    [
      { edge: a[1]!, from: 1, to: 2 },
      { edge: along[2]!, from: 2, to: 7 },
      { edge: c[1]!, from: 7, to: 6, reversed: true },
      { edge: along[1]!, from: 6, to: 1, reversed: true },
    ],
  );
  b.face(back.surface, [back.loop], { id: "back" });

  const top = plane(
    [0, 0, height],
    [1, 0, 0],
    [0, 1, 0],
    [
      { edge: along[4]!, from: 4, to: 9 },
      { edge: c[3]!, from: 9, to: 8, reversed: true },
      { edge: along[3]!, from: 8, to: 3, reversed: true },
      { edge: a[3]!, from: 3, to: 4 },
    ],
  );
  b.face(top.surface, [top.loop, hole.top], { id: "top" });

  // The end at x = 0 faces -x, so its (u, v) = (z, y) and its loop runs
  // backwards round the profile.
  const endA = plane(
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [
      { edge: a[4]!, from: 0, to: 4, reversed: true },
      { edge: a[3]!, from: 4, to: 3, reversed: true },
      {
        edge: a[2]!,
        from: 3,
        to: 2,
        reversed: true,
        pcurve: arcCurve2([shoulder, wall], r, 0, 1, 1),
      },
      { edge: a[1]!, from: 2, to: 1, reversed: true },
      { edge: a[0]!, from: 1, to: 0, reversed: true },
    ],
  );
  b.face(endA.surface, [endA.loop], { id: "endWest" });

  const endB = plane(
    [length, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [
      { edge: c[0]!, from: 5, to: 6 },
      { edge: c[1]!, from: 6, to: 7 },
      {
        edge: c[2]!,
        from: 7,
        to: 8,
        pcurve: arcCurve2([wall, shoulder], r, 0, 1, 1),
      },
      { edge: c[3]!, from: 8, to: 9 },
      { edge: c[4]!, from: 9, to: 5 },
    ],
  );
  b.face(endB.surface, [endB.loop], { id: "endEast" });

  // The fillet: a cylinder along x, u from the back (0) to the top (π/2).
  const half = Math.PI / 2;
  b.face(
    b.cylinder([0, wall, shoulder], [0, 1, 0], [0, 0, 1], r),
    [
      [
        {
          edge: a[2]!,
          pcurve: [
            [0, 0],
            [half, 0],
          ],
        },
        {
          edge: along[3]!,
          pcurve: [
            [half, 0],
            [half, length],
          ],
        },
        {
          edge: c[2]!,
          reversed: true,
          pcurve: [
            [half, length],
            [0, length],
          ],
        },
        {
          edge: along[2]!,
          reversed: true,
          pcurve: [
            [0, length],
            [0, 0],
          ],
        },
      ],
    ],
    { id: "fillet" },
  );
  return b.build();
}
