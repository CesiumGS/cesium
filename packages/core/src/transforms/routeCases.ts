// CS-54's route readback cases: every built-in transform's route, at the
// parameters and points of the golden fixtures (`test/transformGolden.test.ts`),
// and two routes prefixed `a_` and `b_` in one kernel. The kernels, the float64
// answers and the bounds are `src/transform/routeReadback.ts`; this file names
// the built-ins, which the transform core doesn't import. The browser suites
// (`bench/irWgsl.ts`, `bench/irGlsl.ts`) run these cases on both backends.
//
// Not exported from the entry point: it is test support.

import {
  flattenDescriptor,
  geocentricToGeographicDescriptor,
  geographicToGeocentricDescriptor,
  heightOffsetDescriptor,
  lambertConformalConicDescriptor,
  lambertConformalConicToGeographicDescriptor,
  transverseMercatorDescriptor,
  transverseMercatorToGeographicDescriptor,
  verticalExaggerationDescriptor,
  webMercatorDescriptor,
  webMercatorToGeographicDescriptor,
} from "../georeference/index.ts";
import {
  bendDescriptor,
  bumpDescriptor,
  corridorUnrollDescriptor,
  displacementName,
  edgeOf,
  latticeDescriptor,
  radialDistortionDescriptor,
  scaleAboutDescriptor,
  scaleAlongAxesDescriptor,
  taperDescriptor,
  twistDescriptor,
  velocityModelDescriptor,
  type CorridorOptions,
  type TransformDescriptor,
} from "./index.ts";
import { clearCompileCache } from "../transform/compile.ts";
import { affine, TransformGraph, type Params } from "../transform/graph.ts";
import { routeBetween, type Route } from "../transform/route.ts";
import {
  CENTER,
  CORRIDOR_CHANGE_M,
  CORRIDOR_DRAWN_M,
  INPUTS,
  JACOBIAN,
  offsetsOf,
  POSITION,
  unitOf,
  type Bound,
  type RouteCase,
  type Vec3,
} from "../transform/routeReadback.ts";

// --- The cases ------------------------------------------------------------

const WGS84 = [6378137, 6378137, 6356752.314245179] as const;
const IDENTITY = Float64Array.of(
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
);

interface Builtin {
  readonly name: string;
  readonly units: string;
  readonly descriptor: TransformDescriptor;
  readonly params?: Params;
  readonly centers: readonly Vec3[];
  /** The half-extent of a draw about its center, per axis, in the input's units. */
  readonly half: Vec3;
  readonly position?: Bound;
  readonly center?: Bound;
  readonly jacobian?: Bound;
  readonly drawn?: Bound;
}

function latticeParams(degree: Vec3): Params {
  const values: Record<string, number> = {
    ox: 1,
    oy: -2,
    oz: 3,
    e1x: 10,
    e1y: 1,
    e1z: 0,
    e2x: 0,
    e2y: 12,
    e2z: 1,
    e3x: 1,
    e3y: 0,
    e3z: 9,
  };
  let k = 0;
  for (let i = 0; i <= degree[0]; i++) {
    for (let j = 0; j <= degree[1]; j++) {
      for (let m = 0; m <= degree[2]; m++) {
        for (const axis of ["x", "y", "z"] as const) {
          values[displacementName(i, j, m, axis)] = Math.sin(1.7 * ++k) * 0.8;
        }
      }
    }
  }
  return values;
}

const POLYLINE = [
  [0, 0],
  [100, 10],
  [180, 40],
  [230, 40.5],
] as const;

const ALIGNMENT: CorridorOptions = {
  start: [100, -50],
  heading: 0.3,
  station: 1000,
  elements: [
    { kind: "line", length: 400 },
    { kind: "arc", length: 380, radius: 650 },
    { kind: "line", length: 250 },
    { kind: "arc", length: 600, radius: -900 },
    { kind: "line", length: 1400 },
    { kind: "arc", length: 500, radius: 1500 },
    { kind: "line", length: 40 },
  ],
};

const UTM32 = {
  centralMeridian: 9,
  scaleFactor: 0.9996,
  falseEasting: 500000,
  falseNorthing: 0,
};
const LCC = {
  lon0: -96,
  lat0: 23,
  lat1: 33,
  lat2: 45,
  falseEasting: 1e6,
  falseNorthing: -2e6,
};

/** Every built-in, with the parameters and points of the golden fixtures. */
const BUILTINS: readonly Builtin[] = [
  {
    name: "scaleAbout",
    units: "m",
    descriptor: scaleAboutDescriptor,
    params: { cx: 3, cy: -2, cz: 1, sx: 2, sy: 0.5, sz: -1.5 },
    centers: [
      [1, 2, 3],
      [-40, 25, 11],
    ],
    half: [5, 5, 5],
  },
  {
    name: "scaleAlongAxes",
    units: "m",
    descriptor: scaleAlongAxesDescriptor,
    params: { ox: 2, oy: -1, oz: 0.5, sa: 1.5, sb: 0.75, sc: 2 },
    centers: [
      [1, 2, 3],
      [-40, 25, 11],
    ],
    half: [5, 5, 5],
  },
  {
    name: "bump",
    units: "m",
    descriptor: bumpDescriptor,
    params: {
      cx: 1,
      cy: 2,
      cz: 3,
      ux: 1,
      uy: 2,
      uz: 2,
      amplitude: 7,
      sigma: 20,
    },
    centers: [
      [1, 2, 3],
      [10, -5, 6],
      [-30, 12, 0.5],
    ],
    half: [4, 4, 4],
  },
  {
    name: "bend",
    units: "m",
    descriptor: bendDescriptor,
    params: { ox: 1, oz: -2, curvature: 0.02 },
    centers: [
      [1, 2, 3],
      [10, -5, 6],
      [-20, 7, -3],
    ],
    half: [2, 2, 2],
  },
  {
    name: "twist",
    units: "m",
    descriptor: twistDescriptor,
    params: { ox: 1, oy: 2, oz: 0, rate: 0.01 },
    centers: [
      [1, 2, 3],
      [10, -5, 6],
      [-20, 7, -30],
    ],
    half: [3, 3, 3],
  },
  {
    name: "taper",
    units: "m",
    descriptor: taperDescriptor,
    params: { ox: 1, oy: -1, oz: 2, ax: 1, ay: -1, az: 2, rate: 0.01 },
    centers: [
      [1, 2, 3],
      [10, -5, 6],
      [-20, 7, -30],
    ],
    half: [3, 3, 3],
  },
  {
    name: "lattice 2x2x2",
    units: "m",
    descriptor: latticeDescriptor([2, 2, 2]),
    params: latticeParams([2, 2, 2]),
    centers: [
      [3, 2, 5],
      [8, 9, 7],
    ],
    half: [0.5, 0.5, 0.5],
  },
  {
    name: "lattice 1x2x3",
    units: "m",
    descriptor: latticeDescriptor([1, 2, 3]),
    params: latticeParams([1, 2, 3]),
    centers: [
      [3, 2, 5],
      [8, 9, 7],
    ],
    half: [0.5, 0.5, 0.5],
  },
  {
    name: "radialDistortion",
    units: "image-plane units",
    descriptor: radialDistortionDescriptor,
    params: { k1: -0.2, k2: 0.05, k3: -0.01, p1: 0.001, p2: -0.002 },
    centers: [
      [0.1, 0.2, 3],
      [-0.3, 0.4, 2],
      [2.5, -1.5, 6],
    ],
    half: [0.05, 0.05, 0.1],
  },
  {
    name: "velocityModel",
    units: "m",
    descriptor: velocityModelDescriptor,
    params: { v0: 1800, g: 0.6 },
    centers: [
      [1, 2, 0.5],
      [-30, 40, 2],
      [50, -60, 3.5],
    ],
    half: [5, 5, 0.2],
  },
  {
    name: "velocityModel, constant velocity",
    units: "m",
    descriptor: velocityModelDescriptor,
    params: { v0: 1800, g: 0 },
    centers: [
      [1, 2, 0.5],
      [-30, 40, 2],
    ],
    half: [5, 5, 0.2],
  },
  {
    name: "corridorUnroll, lines and arcs",
    units: "m",
    descriptor: corridorUnrollDescriptor(ALIGNMENT),
    centers: [
      [1010, 3, 1],
      [1400, -8, 2],
      [1780, 300, -3],
      [2400, -600, 0],
      [3600, 15, 0],
    ],
    half: [60, 60, 1],
    position: { abs: CORRIDOR_CHANGE_M, rel: 0 },
    drawn: { abs: CORRIDOR_DRAWN_M, rel: 0 },
  },
  {
    name: "corridorUnroll, a polyline",
    units: "m",
    descriptor: corridorUnrollDescriptor({ polyline: POLYLINE }),
    centers: [
      [50, 1, 2],
      [150, -2, 1],
      [215, 1.5, -2],
    ],
    half: [2, 1, 1],
    position: { abs: CORRIDOR_CHANGE_M, rel: 0 },
    drawn: { abs: CORRIDOR_DRAWN_M, rel: 0 },
  },
  {
    name: "verticalExaggeration",
    units: "m",
    descriptor: verticalExaggerationDescriptor(WGS84),
    params: { factor: 3, ceiling: 9000, baseHeight: 0, band: 1800 },
    centers: [
      [4.0e6, 3.0e5, 4.9e6],
      [4.2e6, 7.0e5, 4.75e6],
    ],
    half: [100, 100, 100],
  },
  {
    name: "heightOffset",
    units: "m",
    descriptor: heightOffsetDescriptor(WGS84),
    params: { offset: 123 },
    centers: [
      [4.0e6, 3.0e5, 4.9e6],
      [4.2e6, 7.0e5, 4.75e6],
    ],
    half: [100, 100, 100],
  },
  {
    name: "flatten",
    units: "m",
    descriptor: flattenDescriptor(
      [
        [10, 45],
        [10.3, 44.95],
        [10.35, 45.2],
        [10.15, 45.1],
        [9.95, 45.25],
      ],
      WGS84,
    ),
    params: { height: 150, falloff: 4000 },
    centers: [
      [4.4545e6, 7.86e5, 4.4885e6],
      [4.448e6, 8.04e5, 4.499e6],
    ],
    half: [200, 200, 200],
  },
  {
    name: "transverseMercator",
    units: "m (easting, northing, height)",
    descriptor: transverseMercatorDescriptor(WGS84),
    params: UTM32,
    centers: [
      [9.5, 46, 100],
      [5.1, 52.3, 20],
    ],
    half: [0.01, 0.01, 10],
  },
  {
    name: "lambertConformalConic",
    units: "m (easting, northing, height)",
    descriptor: lambertConformalConicDescriptor(WGS84),
    params: LCC,
    centers: [
      [-96, 40, 10],
      [-110, 30, 500],
    ],
    half: [0.01, 0.01, 10],
  },
  {
    name: "webMercator",
    units: "m (x, y, height)",
    descriptor: webMercatorDescriptor(WGS84),
    centers: [
      [10, 40, 10],
      [-120, -60, 300],
    ],
    half: [0.01, 0.01, 10],
  },
  {
    name: "geographicToGeocentric",
    units: "m (ECEF)",
    descriptor: geographicToGeocentricDescriptor(WGS84),
    centers: [
      [10, 40, 10],
      [-120, -60, 300],
    ],
    half: [0.01, 0.01, 10],
  },
  {
    name: "geocentricToGeographic",
    units: "degrees, degrees, m",
    descriptor: geocentricToGeographicDescriptor(WGS84),
    centers: [
      [4.0e6, 3.0e5, 4.9e6],
      [-2.0e6, -5.0e6, -3.1e6],
    ],
    half: [100, 100, 100],
  },
  {
    name: "transverseMercatorToGeographic",
    units: "degrees, degrees, m",
    descriptor: transverseMercatorToGeographicDescriptor(WGS84),
    params: UTM32,
    centers: [
      [500100, 5.1e6, 100],
      [420000, 5.6e6, 20],
    ],
    half: [50, 50, 10],
  },
  {
    name: "lambertConformalConicToGeographic",
    units: "degrees, degrees, m",
    descriptor: lambertConformalConicToGeographicDescriptor(WGS84),
    params: LCC,
    centers: [
      [1.0e6, -1.0e6, 10],
      [2.5e5, -1.8e6, 500],
    ],
    half: [50, 50, 10],
  },
  {
    name: "webMercatorToGeographic",
    units: "degrees, degrees, m",
    descriptor: webMercatorToGeographicDescriptor(WGS84),
    centers: [
      [1.1e6, 4.8e6, 10],
      [-1.3e7, -8.0e6, 300],
    ],
    half: [50, 50, 10],
  },
];

/** The built-ins whose center term the readback also reads with the eye away from the draw. */
const EYE_ROUTES = [
  "verticalExaggeration",
  "heightOffset",
  "flatten",
  "corridorUnroll, lines and arcs",
  "corridorUnroll, a polyline",
  "geographicToGeocentric",
] as const;

/** The eye's offsets from the draw's image: 0, then 10 m, 1 km, 100 km and 1,000 km in three directions. */
function eyeOffsets(): Vec3[] {
  const directions: Vec3[] = [
    [1, 0, 0],
    [1 / 3, -2 / 3, 2 / 3],
    [-0.6, 0.48, -0.64],
  ];
  const out: Vec3[] = [[0, 0, 0]];
  for (const d of [10, 1e3, 1e5, 1e6]) {
    for (const v of directions) {
      out.push([d * v[0], d * v[1], d * v[2]]);
    }
  }
  return out;
}

/** The built-in's route: content (the identity) through it to the world. */
function builtinRoute(b: Builtin): Route {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const step = graph.add("step", world, edgeOf(b.descriptor, b.params));
  const content = graph.add("content", step, affine({ matrix: IDENTITY }));
  return routeBetween(content, world);
}

/**
 * The route cases: each built-in at each of its draw centers, and two routes
 * (twist as `a_`, the lines-and-arcs corridor as `b_`) in one kernel.
 */
export function routeCases(): RouteCase[] {
  clearCompileCache();
  const out: RouteCase[] = [];
  for (const b of BUILTINS) {
    const route = builtinRoute(b);
    b.centers.forEach((center, k) => {
      out.push({
        name: `route: ${b.name} @${k}`,
        units: b.units,
        routes: [unitOf(route, center)],
        rows: offsetsOf(b.half),
        position: b.position ?? POSITION,
        center: b.center ?? CENTER,
        inputs: INPUTS,
        jacobian: b.jacobian ?? JACOBIAN,
        ...(b.drawn ? { drawn: b.drawn } : {}),
      });
    });
  }
  // The eye away from the draw's image (CS-986): the separable routes, the
  // corridors and a draw at the Earth's surface without separable parameters.
  for (const name of EYE_ROUTES) {
    const b = BUILTINS.find((k) => k.name === name)!;
    const route = builtinRoute(b);
    b.centers.forEach((center, k) => {
      const unit = unitOf(route, center);
      const eyes = eyeOffsets().map((d): Vec3 => [
        unit.image[0]! + d[0],
        unit.image[1]! + d[1],
        unit.image[2]! + d[2],
      ]);
      out.push({
        name: `route: ${b.name} @${k}, the eye away`,
        units: b.units,
        routes: [unit],
        // The center term doesn't read the offset: each row is the center.
        rows: eyes.map((): Vec3 => [0, 0, 0]),
        eyes,
        position: b.position ?? POSITION,
        center: CENTER,
        inputs: INPUTS,
        jacobian: b.jacobian ?? JACOBIAN,
      });
    });
  }
  // Past the exact range: a draw 3 × 10⁹ m out, whose F(c) fixParts writes
  // as float32 on x and z (6 × 10⁹ m and −2.6 × 10⁹ m after the scale), with
  // the eye at the image and 1,234.5678 m away.
  const far = BUILTINS.find((b) => b.name === "scaleAbout")!;
  const farUnit = unitOf(builtinRoute(far), [3e9, -2.5e9, 1.75e9]);
  const farEyes = [
    [0, 0, 0],
    [1234.5678, -0.25, 17.125],
  ].map((d): Vec3 => [
    farUnit.image[0]! + d[0]!,
    farUnit.image[1]! + d[1]!,
    farUnit.image[2]! + d[2]!,
  ]);
  out.push({
    name: "route: scaleAbout past 2^31 m, float32 parts",
    units: far.units,
    routes: [farUnit],
    rows: farEyes.map((): Vec3 => [0, 0, 0]),
    eyes: farEyes,
    position: POSITION,
    center: CENTER,
    // Each value past 2³¹ units is float32: 2⁻²⁴ of it.
    inputs: { abs: INPUTS.abs, rel: 2 ** -24 },
    jacobian: JACOBIAN,
  });
  const twist = BUILTINS.find((b) => b.name === "twist")!;
  const corridor = BUILTINS.find(
    (b) => b.name === "corridorUnroll, lines and arcs",
  )!;
  out.push({
    name: "route: two prefixed routes in one program (a_ twist, b_ corridor)",
    units: "m",
    routes: [
      unitOf(builtinRoute(twist), twist.centers[1]!, "a_"),
      unitOf(builtinRoute(corridor), corridor.centers[2]!, "b_"),
    ],
    // The corridor's offsets; the twist's box is inside them.
    rows: offsetsOf([3, 3, 1]),
    position: { abs: CORRIDOR_CHANGE_M, rel: POSITION.rel },
    // The center bound, and the corridor's drawn bound, in meters, for both
    // routes: the twist's center term is meters near the origin.
    center: CENTER,
    inputs: INPUTS,
    jacobian: JACOBIAN,
    drawn: { abs: CORRIDOR_DRAWN_M, rel: 0 },
  });
  return out;
}
