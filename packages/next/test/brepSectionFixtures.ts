// Fixtures for the section tests: solids with known cross sections. Lengths
// are metres.
import { BrepBuilder } from "../src/brep/build.ts";
import { SurfaceKind, type BrepForm } from "../src/brep/form.ts";
import type { NurbsCurve } from "../src/brep/nurbs.ts";
import { fromPlane, planeFrame } from "../src/brep/sectionCurves.ts";
import {
  arcChain,
  lineProfile,
  revolvedSurface,
  turnAngles,
} from "./brepFixtures.ts";

const TAU = 2 * Math.PI;

/**
 * The area of a solid's section by a plane, by counting the cells of the
 * plane's (u, v) square [−extent, extent]² whose point `inside` holds.
 */
export function sectionArea(
  point: number[],
  normal: number[],
  extent: number,
  inside: (p: number[]) => boolean,
  cells = 1600,
): number {
  const plane = planeFrame(point, normal);
  const h = (2 * extent) / cells;
  let count = 0;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      if (
        inside(
          fromPlane(plane, [-extent + (i + 0.5) * h, -extent + (j + 0.5) * h]),
        )
      ) {
        count++;
      }
    }
  }
  return count * h * h;
}

/** A rational quadratic circle in 3D at height z (or 2D when z is undefined), counter-clockwise from angle 0. */
export function circleCurve(
  cx: number,
  cy: number,
  r: number,
  z: number | undefined,
  clockwise = false,
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
  if (clockwise) {
    ring.reverse();
  }
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

/** A full sphere of radius r about the origin: one face, a seam and two poles. */
export function sphereBrep(r: number): BrepForm {
  const b = new BrepBuilder();
  const south = b.vertex([0, 0, -r]);
  const north = b.vertex([0, 0, r]);
  const seamStart = b.vertex([r, 0, 0]);
  // The seam: a meridian from the south pole to the north, as a rational quadratic half circle.
  const s = Math.SQRT1_2;
  const meridian: NurbsCurve = {
    degree: 2,
    knots: Float64Array.from([0, 0, 0, 0.5, 0.5, 1, 1, 1]),
    count: 5,
    dimension: 3,
    points: Float64Array.from([0, 0, -r, r, 0, -r, r, 0, 0, r, 0, r, 0, 0, r]),
    weights: Float64Array.from([1, s, 1, s, 1]),
  };
  void seamStart;
  const seam = b.edge(south, north, { curve: meridian, tolerance: 1e-9 });
  const southPole = b.edge(south, south);
  const northPole = b.edge(north, north);
  const sphere = b.sphere([0, 0, 0], [1, 0, 0], [0, 1, 0], r);
  const lo = -Math.PI / 2;
  const hi = Math.PI / 2;
  b.face(sphere, [
    [
      {
        edge: southPole,
        pcurve: [
          [0, lo],
          [TAU, lo],
        ],
      },
      {
        edge: seam,
        pcurve: [
          [TAU, lo],
          [TAU, hi],
        ],
      },
      {
        edge: northPole,
        reversed: true,
        pcurve: [
          [TAU, hi],
          [0, hi],
        ],
      },
      {
        edge: seam,
        reversed: true,
        pcurve: [
          [0, hi],
          [0, lo],
        ],
      },
    ],
  ]);
  return b.build();
}

/**
 * A block 4 × 4 × 2 m with a cylindrical hole of radius 0.5 m through it along z, centred
 * (2, 2): the box minus a cylinder, its lower corner at the origin.
 */
export function boxMinusCylinderBrep(): BrepForm {
  const b = new BrepBuilder();
  const w = 4;
  const h = 2;
  const r = 0.5;
  const corner = (i: number): [number, number, number] => [
    (i & 1) * w,
    ((i >> 1) & 1) * w,
    ((i >> 2) & 1) * h,
  ];
  for (let i = 0; i < 8; i++) {
    b.vertex(corner(i));
  }
  const edges = new Map<string, number>();
  const edgeOf = (a: number, c: number): number => {
    const key = `${Math.min(a, c)},${Math.max(a, c)}`;
    let e = edges.get(key);
    if (e === undefined) {
      e = b.edge(Math.min(a, c), Math.max(a, c));
      edges.set(key, e);
    }
    return e;
  };
  const rect = (
    origin: number[],
    x: number[],
    y: number[],
    ids: number[],
    reversed: boolean,
  ) => {
    const surface = b.plane(origin, x, y);
    const uv = (i: number): [number, number] => {
      const p = corner(i);
      const d = [p[0] - origin[0]!, p[1] - origin[1]!, p[2] - origin[2]!];
      return [
        d[0]! * x[0]! + d[1]! * x[1]! + d[2]! * x[2]!,
        d[0]! * y[0]! + d[1]! * y[1]! + d[2]! * y[2]!,
      ];
    };
    const cx = ids.reduce((s, i) => s + uv(i)[0], 0) / 4;
    const cy = ids.reduce((s, i) => s + uv(i)[1], 0) / 4;
    ids.sort(
      (p, q) =>
        Math.atan2(uv(p)[1] - cy, uv(p)[0] - cx) -
        Math.atan2(uv(q)[1] - cy, uv(q)[0] - cx),
    );
    const outer = ids.map((from, k) => {
      const to = ids[(k + 1) % 4]!;
      return {
        edge: edgeOf(from, to),
        reversed: from > to,
        pcurve: [uv(from), uv(to)] as const,
      };
    });
    b.face(surface, [outer], { reversed });
  };
  // Hole circles: bottom (z = 0) and top (z = h), shared with the bore.
  const vb = b.vertex([w / 2 + r, w / 2, 0]);
  const vt = b.vertex([w / 2 + r, w / 2, h]);
  const bottomCircle = b.edge(vb, vb, {
    curve: circleCurve(w / 2, w / 2, r, 0),
    tolerance: 1e-9,
  });
  const topCircle = b.edge(vt, vt, {
    curve: circleCurve(w / 2, w / 2, r, h),
    tolerance: 1e-9,
  });
  const boreSeam = b.edge(vb, vt);
  const hole = (circle: number) => [
    {
      edge: circle,
      reversed: true,
      pcurve: circleCurve(w / 2, w / 2, r, undefined, true),
    },
  ];
  // The faces: sides, then the bottom and top with the hole.
  const sideFaces: [number[], number[], number[], number[], boolean][] = [
    [[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 2, 4, 6], false],
    [[w, 0, 0], [0, 1, 0], [0, 0, 1], [1, 3, 5, 7], false],
    [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 4, 5], false],
    [[0, w, 0], [0, 0, 1], [1, 0, 0], [2, 3, 6, 7], false],
  ];
  for (const [o, x, y, ids] of sideFaces) {
    rect(o, x, y, ids, false);
  }
  // Bottom (normal −z: reversed) and top (normal +z), each with the hole.
  const plate = (
    z: number,
    ids: number[],
    circle: number,
    reversed: boolean,
  ) => {
    const surface = b.plane([0, 0, z], [1, 0, 0], [0, 1, 0]);
    const uv = (i: number): [number, number] => [corner(i)[0], corner(i)[1]];
    ids.sort(
      (p, q) =>
        Math.atan2(uv(p)[1] - w / 2, uv(p)[0] - w / 2) -
        Math.atan2(uv(q)[1] - w / 2, uv(q)[0] - w / 2),
    );
    const outer = ids.map((from, k) => {
      const to = ids[(k + 1) % 4]!;
      return {
        edge: edgeOf(from, to),
        reversed: from > to,
        pcurve: [uv(from), uv(to)] as const,
      };
    });
    b.face(surface, [outer, hole(circle)], { reversed });
  };
  plate(0, [0, 1, 2, 3], bottomCircle, true);
  plate(h, [4, 5, 6, 7], topCircle, false);
  // The bore: the cylinder's inside, its normal toward the axis (reversed).
  const bore = b.cylinder([w / 2, w / 2, 0], [1, 0, 0], [0, 1, 0], r);
  b.face(
    bore,
    [
      [
        {
          edge: bottomCircle,
          pcurve: [
            [0, 0],
            [TAU, 0],
          ],
        },
        {
          edge: boreSeam,
          pcurve: [
            [TAU, 0],
            [TAU, h],
          ],
        },
        {
          edge: topCircle,
          reversed: true,
          pcurve: [
            [TAU, h],
            [0, h],
          ],
        },
        {
          edge: boreSeam,
          reversed: true,
          pcurve: [
            [0, h],
            [0, 0],
          ],
        },
      ],
    ],
    { reversed: true },
  );
  return b.build();
}

/** A rational quadratic circle in 3D: centre `c`, in the plane of the unit axes `x` and `y`, counter-clockwise from x. */
export function circle3(
  c: readonly number[],
  x: readonly number[],
  y: readonly number[],
  r: number,
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
  const points = new Float64Array(27);
  ring.forEach(([a, b], i) => {
    for (let k = 0; k < 3; k++) {
      points[i * 3 + k] = c[k]! + r * (a! * x[k]! + b! * y[k]!);
    }
  });
  return {
    degree: 2,
    knots: Float64Array.from([
      0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1,
    ]),
    count: 9,
    dimension: 3,
    points,
    weights: Float64Array.from(ring.map((p) => p[2]!)),
  };
}

/** A cone frustum on the z axis: radius 1 at z = 0, growing with half-angle 0.3, 2 m tall; discs at both ends. */
export function coneFrustumBrep(): BrepForm {
  const b = new BrepBuilder();
  const r0 = 1;
  const a = 0.3;
  const h = 2;
  const r1 = r0 + h * Math.tan(a);
  const bottom = b.vertex([r0, 0, 0]);
  const top = b.vertex([r1, 0, h]);
  const seam = b.edge(bottom, top);
  const bottomCircle = b.edge(bottom, bottom, {
    curve: circle3([0, 0, 0], [1, 0, 0], [0, 1, 0], r0),
    tolerance: 1e-9,
  });
  const topCircle = b.edge(top, top, {
    curve: circle3([0, 0, h], [1, 0, 0], [0, 1, 0], r1),
    tolerance: 1e-9,
  });
  const cone = b.cone([0, 0, 0], [1, 0, 0], [0, 1, 0], r0, a);
  b.face(cone, [
    [
      {
        edge: bottomCircle,
        pcurve: [
          [0, 0],
          [TAU, 0],
        ],
      },
      {
        edge: seam,
        pcurve: [
          [TAU, 0],
          [TAU, h],
        ],
      },
      {
        edge: topCircle,
        reversed: true,
        pcurve: [
          [TAU, h],
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
  ]);
  b.face(
    b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]),
    [[{ edge: bottomCircle, pcurve: circleCurve(0, 0, r0, undefined) }]],
    { reversed: true },
  );
  b.face(b.plane([0, 0, h], [1, 0, 0], [0, 1, 0]), [
    [{ edge: topCircle, pcurve: circleCurve(0, 0, r1, undefined) }],
  ]);
  return b.build();
}

/** A full torus about the z axis: major radius `R`, minor `r`: one face and two seam circles. */
export function torusBrep(R: number, r: number): BrepForm {
  const b = new BrepBuilder();
  const v = b.vertex([R + r, 0, 0]);
  const equator = b.edge(v, v, {
    curve: circle3([0, 0, 0], [1, 0, 0], [0, 1, 0], R + r),
    tolerance: 1e-9,
  });
  const meridian = b.edge(v, v, {
    curve: circle3([R, 0, 0], [1, 0, 0], [0, 0, 1], r),
    tolerance: 1e-9,
  });
  const torus = b.torus([0, 0, 0], [1, 0, 0], [0, 1, 0], R, r);
  b.face(torus, [
    [
      {
        edge: equator,
        pcurve: [
          [0, 0],
          [TAU, 0],
        ],
      },
      {
        edge: meridian,
        pcurve: [
          [TAU, 0],
          [TAU, TAU],
        ],
      },
      {
        edge: equator,
        reversed: true,
        pcurve: [
          [TAU, TAU],
          [0, TAU],
        ],
      },
      {
        edge: meridian,
        reversed: true,
        pcurve: [
          [0, TAU],
          [0, 0],
        ],
      },
    ],
  ]);
  return b.build();
}

/**
 * A capped cylinder of NURBS patches, as SMLib holds one: r = 0.5 m, 2 m tall, its
 * side three arcs (90�, 150�, 120�) with an analytic identity; the discs are planes.
 */
export function nurbsCappedCylinderBrep(): BrepForm {
  const b = new BrepBuilder();
  const r = 0.5;
  const h = 2;
  const angles = turnAngles([3, 5, 4]);
  const arc = arcChain(angles);
  const ringCurve = (z: number): NurbsCurve => ({
    degree: 2,
    knots: Float64Array.from(arc.knots),
    count: arc.points.length,
    dimension: 3,
    points: Float64Array.from(
      arc.points.flatMap(([x, y]) => [r * x, r * y, z]),
    ),
    weights: Float64Array.from(arc.weights),
  });
  const ringCurve2 = (): NurbsCurve => ({
    degree: 2,
    knots: Float64Array.from(arc.knots),
    count: arc.points.length,
    dimension: 2,
    points: Float64Array.from(arc.points.flatMap(([x, y]) => [r * x, r * y])),
    weights: Float64Array.from(arc.weights),
  });
  const bottom = b.vertex([r, 0, 0]);
  const top = b.vertex([r, 0, h]);
  const seam = b.edge(bottom, top);
  const bottomCircle = b.edge(bottom, bottom, {
    curve: ringCurve(0),
    tolerance: 1e-9,
  });
  const topCircle = b.edge(top, top, { curve: ringCurve(h), tolerance: 1e-9 });
  const side = b.nurbsSurface(revolvedSurface(angles, lineProfile(r, r, h)), {
    identity: {
      kind: SurfaceKind.Cylinder,
      origin: [0, 0, 0],
      x: [1, 0, 0],
      y: [0, 1, 0],
      params: [r, 0],
    },
  });
  b.face(side, [
    [
      {
        edge: bottomCircle,
        pcurve: [
          [0, 0],
          [1, 0],
        ],
      },
      {
        edge: seam,
        pcurve: [
          [1, 0],
          [1, 1],
        ],
      },
      {
        edge: topCircle,
        reversed: true,
        pcurve: [
          [1, 1],
          [0, 1],
        ],
      },
      {
        edge: seam,
        reversed: true,
        pcurve: [
          [0, 1],
          [0, 0],
        ],
      },
    ],
  ]);
  b.face(
    b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]),
    [[{ edge: bottomCircle, pcurve: ringCurve2() }]],
    {
      reversed: true,
    },
  );
  b.face(b.plane([0, 0, h], [1, 0, 0], [0, 1, 0]), [
    [{ edge: topCircle, pcurve: ringCurve2() }],
  ]);
  return b.build();
}
