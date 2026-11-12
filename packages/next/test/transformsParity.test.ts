// The built-in smooth transforms (plan 2026-11-12, task 3): each descriptor's
// float64 TS function against the IR parsed from its source (values, and the
// analytic Jacobian against the IR's automatic one), inverse round trips,
// the declared linear parameters, known projection values, the frames
// catalogue's height warps, and the Slang side (src/shaders/transforms.slang)
// through the generated WGSL's structure.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  heightOffset as framesHeightOffset,
  verticalExaggeration as framesExaggeration,
} from "../src/frames/heightWarps.ts";
import {
  flatten,
  flattenDescriptor,
  geocentricToGeographicDescriptor,
  geographicToGeocentricDescriptor,
  heightOffsetDescriptor,
  lambertConformalConic,
  lambertConformalConicDescriptor,
  transverseMercator,
  transverseMercatorDescriptor,
  utm,
  verticalExaggeration,
  verticalExaggerationDescriptor,
  webMercatorDescriptor,
} from "../src/georeference/index.ts";
import {
  jacobian as irJacobian,
  evaluate,
  hessianProgram,
  parseTransform,
  routeBetween,
  TransformGraph,
  type Params,
} from "../src/transform/index.ts";
import {
  bendDescriptor,
  bumpDescriptor,
  checkParams,
  corridorUnroll,
  corridorUnrollDescriptor,
  defaultParams,
  displacementName,
  edgeOf,
  lattice,
  latticeDescriptor,
  radialDistortionDescriptor,
  scaleAboutDescriptor,
  taperDescriptor,
  twist,
  twistDescriptor,
  velocityModelDescriptor,
  type CorridorOptions,
  type TransformDescriptor,
} from "../src/transforms/index.ts";

const WGS84 = [6378137, 6378137, 6356752.314245179] as const;
const RAD = Math.PI / 180;

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Sampler = (r: () => number) => [number, number, number];
const between = (r: () => number, lo: number, hi: number) =>
  lo + (hi - lo) * r();
const box =
  (lo: number[], hi: number[]): Sampler =>
  (r) => [
    between(r, lo[0]!, hi[0]!),
    between(r, lo[1]!, hi[1]!),
    between(r, lo[2]!, hi[2]!),
  ];

/** Body-fixed metres at a longitude and latitude (degrees) and height. */
function ecef(lon: number, lat: number, h: number): [number, number, number] {
  const out = new Float64Array(3);
  geographicToGeocentricDescriptor(WGS84).forward([lon, lat, h], {}, out);
  return [out[0]!, out[1]!, out[2]!];
}
const geodetic =
  (
    lon: [number, number],
    lat: [number, number],
    h: [number, number],
  ): Sampler =>
  (r) =>
    ecef(between(r, ...lon), between(r, ...lat), between(r, ...h));

interface Case {
  name: string;
  descriptor: TransformDescriptor;
  params?: Params;
  sample: Sampler;
  /** The Jacobian is the graph's central differences, not an analytic one: compared loosely. */
  numericJacobian?: boolean;
  inverseTolerance?: number;
}

const near = (a: number, b: number, tolerance: number, scale = 1): boolean =>
  Math.abs(a - b) <= tolerance * Math.max(scale, Math.abs(a), Math.abs(b));

const lensParams = { k1: -0.2, k2: 0.05, k3: -0.01, p1: 0.001, p2: -0.002 };

/** An alignment: line, left arc, line, right arc, line. */
const alignment: CorridorOptions = {
  start: [100, -50],
  heading: 0.3,
  station: 1000,
  elements: [
    { kind: "line", length: 100 },
    { kind: "arc", length: 80, radius: 150 },
    { kind: "line", length: 50 },
    { kind: "arc", length: 60, radius: -100 },
    { kind: "line", length: 40 },
  ],
};

const polyline = [
  [0, 0],
  [100, 10],
  [180, 40],
  [230, 40.5],
];
/** The polyline's corners, by station. */
const corners = polyline
  .slice(1, -1)
  .map((_, i) =>
    polyline
      .slice(0, i + 2)
      .reduce(
        (sum, q, k, all) =>
          k === 0
            ? 0
            : sum +
              Math.hypot(q[0]! - all[k - 1]![0]!, q[1]! - all[k - 1]![1]!),
        0,
      ),
  );

function latticeParams(degree: [number, number, number], seed: number): Params {
  const r = rng(seed);
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
  for (let i = 0; i <= degree[0]; i++) {
    for (let j = 0; j <= degree[1]; j++) {
      for (let k = 0; k <= degree[2]; k++) {
        for (const axis of ["x", "y", "z"] as const) {
          values[displacementName(i, j, k, axis)] = between(r, -1, 1);
        }
      }
    }
  }
  return values;
}

/** A point of the lattice with coordinates (s, t, u) in the cube. */
const inLattice =
  (p: Params): Sampler =>
  (r) => {
    const [s, t, u] = [r(), r(), r()];
    return [
      p.ox! + s * p.e1x! + t * p.e2x! + u * p.e3x!,
      p.oy! + s * p.e1y! + t * p.e2y! + u * p.e3y!,
      p.oz! + s * p.e1z! + t * p.e2z! + u * p.e3z!,
    ];
  };

const lattice222 = latticeParams([2, 2, 2], 7);
const lattice123 = latticeParams([1, 2, 3], 8);

const cases: Case[] = [
  {
    name: "scaleAbout",
    descriptor: scaleAboutDescriptor,
    params: { cx: 3, cy: -2, cz: 1, sx: 2, sy: 0.5, sz: -1.5 },
    sample: box([-50, -50, -50], [50, 50, 50]),
  },
  {
    name: "bump",
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
    sample: box([-40, -40, -40], [40, 40, 40]),
  },
  {
    name: "bend",
    descriptor: bendDescriptor,
    params: { ox: 1, oz: 3, curvature: 0.01 },
    sample: box([-50, -50, -20], [50, 50, 20]),
  },
  {
    name: "bend, negative curvature",
    descriptor: bendDescriptor,
    params: { ox: 0, oz: 0, curvature: -0.02 },
    sample: box([-50, -50, -20], [50, 50, 20]),
  },
  {
    name: "bend, flat",
    descriptor: bendDescriptor,
    params: { ox: 0, oz: 0, curvature: 0 },
    sample: box([-50, -50, -20], [50, 50, 20]),
  },
  {
    name: "twist",
    descriptor: twistDescriptor,
    params: { ox: 1, oy: -1, oz: 2, ax: 1, ay: 2, az: 2, rate: 0.03 },
    sample: box([-40, -40, -40], [40, 40, 40]),
  },
  {
    name: "taper",
    descriptor: taperDescriptor,
    params: { ox: 1, oy: -1, oz: 2, ax: 1, ay: -1, az: 2, rate: 0.01 },
    sample: box([-40, -40, -40], [40, 40, 40]),
  },
  {
    name: "lattice 2×2×2",
    descriptor: latticeDescriptor([2, 2, 2]),
    params: lattice222,
    sample: inLattice(lattice222),
  },
  {
    name: "lattice 1×2×3",
    descriptor: latticeDescriptor([1, 2, 3]),
    params: lattice123,
    sample: inLattice(lattice123),
  },
  {
    name: "radialDistortion",
    descriptor: radialDistortionDescriptor,
    params: lensParams,
    sample: (r) => {
      const z = between(r, 1, 10);
      return [between(r, -0.7, 0.7) * z, between(r, -0.7, 0.7) * z, z];
    },
  },
  {
    name: "velocityModel",
    descriptor: velocityModelDescriptor,
    params: { v0: 1800, g: 0.6 },
    sample: box([-100, -100, 0], [100, 100, 4]),
  },
  {
    name: "velocityModel, near-constant velocity",
    descriptor: velocityModelDescriptor,
    params: { v0: 1800, g: 1e-5 },
    sample: box([-100, -100, 0], [100, 100, 4]),
  },
  {
    name: "velocityModel, constant velocity",
    descriptor: velocityModelDescriptor,
    params: { v0: 1800, g: 0 },
    sample: box([-100, -100, 0], [100, 100, 4]),
  },
];

const alignmentDescriptor = corridorUnrollDescriptor(alignment);
const polylineDescriptor = corridorUnrollDescriptor({ polyline });

cases.push(
  {
    name: "corridorUnroll, lines and arcs",
    descriptor: alignmentDescriptor,
    sample: box([980, -20, -5], [1350, 20, 5]),
  },
  {
    name: "corridorUnroll, past the ends",
    descriptor: alignmentDescriptor,
    sample: (r) => {
      const beyond = r() < 0.5;
      return [
        beyond ? between(r, 1330, 1400) : between(r, 940, 1000),
        between(r, -10, 10),
        0,
      ];
    },
  },
  {
    name: "corridorUnroll, a polyline",
    descriptor: polylineDescriptor,
    // Away from the corners, where the strip is one-to-one.
    sample: (r) => {
      for (;;) {
        const s = between(r, 0, 232);
        if (corners.every((c) => Math.abs(s - c) > 6)) {
          return [s, between(r, -2, 2), between(r, -3, 3)];
        }
      }
    },
  },
  {
    name: "verticalExaggeration, across the ceiling",
    descriptor: verticalExaggerationDescriptor(WGS84),
    params: { factor: 3, ceiling: 9000, baseHeight: 0, band: 1800 },
    sample: geodetic([-180, 180], [-89, 89], [-500, 20000]),
  },
  {
    name: "verticalExaggeration, shrinking about a base",
    descriptor: verticalExaggerationDescriptor(WGS84),
    params: { factor: 0.4, ceiling: 3000, baseHeight: 500, band: 600 },
    sample: geodetic([-180, 180], [-89, 89], [-500, 8000]),
  },
  {
    name: "heightOffset",
    descriptor: heightOffsetDescriptor(WGS84),
    params: { offset: 123 },
    sample: geodetic([-180, 180], [-89, 89], [-500, 20000]),
  },
  {
    name: "flatten",
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
    sample: geodetic([9.6, 10.7], [44.7, 45.5], [-200, 1200]),
    inverseTolerance: -1,
  },
  {
    name: "transverseMercator, UTM 32",
    descriptor: transverseMercatorDescriptor(WGS84),
    params: {
      centralMeridian: 9,
      scaleFactor: 0.9996,
      falseEasting: 500000,
      falseNorthing: 0,
    },
    sample: box([4, 30, -100], [14, 60, 1000]),
    numericJacobian: true,
  },
  {
    name: "lambertConformalConic, two parallels",
    descriptor: lambertConformalConicDescriptor(WGS84),
    params: {
      lon0: -96,
      lat0: 23,
      lat1: 33,
      lat2: 45,
      falseEasting: 1e6,
      falseNorthing: -2e6,
    },
    sample: box([-120, 25, -100], [-75, 50, 1000]),
  },
  {
    name: "lambertConformalConic, one parallel, southern",
    descriptor: lambertConformalConicDescriptor(WGS84),
    params: {
      lon0: 20,
      lat0: -30,
      lat1: -35,
      lat2: -35,
      falseEasting: 0,
      falseNorthing: 0,
    },
    sample: box([5, -50, -100], [35, -20, 1000]),
  },
  {
    name: "webMercator",
    descriptor: webMercatorDescriptor(WGS84),
    sample: box([-180, -80, -100], [180, 80, 1000]),
  },
  {
    name: "geographicToGeocentric",
    descriptor: geographicToGeocentricDescriptor(WGS84),
    sample: box([-180, -89, -500], [180, 89, 20000]),
  },
  {
    name: "geocentricToGeographic",
    descriptor: geocentricToGeographicDescriptor(WGS84),
    sample: geodetic([-179, 179], [-89, 89], [-500, 20000]),
  },
);

function valuesOf(c: Case): Params {
  return { ...defaultParams(c.descriptor), ...c.params };
}

/** The graph's central differences, for a function with no analytic Jacobian. */
function centralDifferences(c: Case, p: number[]): number[] {
  const plus = new Float64Array(3);
  const minus = new Float64Array(3);
  const v = valuesOf(c);
  const j = new Array<number>(9);
  for (let axis = 0; axis < 3; axis++) {
    const h = 6e-6 * Math.max(1, Math.abs(p[axis]!));
    const at = [...p];
    at[axis] = p[axis]! + h;
    c.descriptor.forward(at, v, plus);
    at[axis] = p[axis]! - h;
    c.descriptor.forward(at, v, minus);
    for (let r = 0; r < 3; r++) {
      j[axis * 3 + r] = (plus[r]! - minus[r]!) / (2 * h);
    }
  }
  return j;
}

describe("a descriptor's TS function and the IR of its source", () => {
  for (const c of cases) {
    describe(c.name, () => {
      const v = valuesOf(c);
      const program = parseTransform(c.descriptor.source);
      const points = Array.from({ length: 60 }, (_, i) =>
        c.sample(rng(100 + i)),
      );

      it("parses, and the schema holds the values", () => {
        checkParams(c.descriptor, v);
        for (const name of Object.keys(c.descriptor.params)) {
          expect(v[name], name).toBeTypeOf("number");
        }
      });

      it("evaluates the same function in float64 (1e-9 relative)", () => {
        const out = new Float64Array(3);
        for (const p of points) {
          c.descriptor.forward(p, v, out);
          const ir = evaluate(program, p, v);
          for (let i = 0; i < 3; i++) {
            expect(
              near(out[i]!, ir[i]!, 1e-9),
              `${p} → ${out[i]} vs ${ir[i]}`,
            ).toBe(true);
          }
        }
      });

      it("writes a Jacobian equal to the IR's automatic one", () => {
        const out = new Float64Array(3);
        const j = new Float64Array(9);
        const tolerance = c.numericJacobian ? 1e-6 : 1e-9;
        for (const p of points) {
          j.fill(Number.NaN);
          c.descriptor.forward(p, v, out, j);
          const reference = irJacobian(program, p, v); // row-major
          const got = c.numericJacobian ? centralDifferences(c, p) : [...j];
          for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 3; row++) {
              const a = got[col * 3 + row]!;
              const b = reference[row * 3 + col]!;
              expect(
                near(a, b, tolerance),
                `${p}: J[${row}][${col}] ${a} vs ${b}`,
              ).toBe(true);
            }
          }
        }
        if (!c.numericJacobian) {
          expect(j.some(Number.isNaN)).toBe(false);
        }
      });

      if (c.descriptor.inverse && c.inverseTolerance !== -1) {
        it("round-trips through its inverse", () => {
          const q = new Float64Array(3);
          const back = new Float64Array(3);
          for (const p of points) {
            c.descriptor.forward(p, v, q);
            c.descriptor.inverse!(q, v, back);
            for (let i = 0; i < 3; i++) {
              expect(
                near(back[i]!, p[i]!, c.inverseTolerance ?? 1e-9),
                `${p} → ${[...q]} → ${[...back]}`,
              ).toBe(true);
            }
          }
        });
      }

      it("is affine in each parameter it declares separable", () => {
        const outs = [0, 1, 2].map(() => new Float64Array(3));
        for (const name of c.descriptor.separable) {
          const spec = c.descriptor.params[name]!;
          const base = v[name]!;
          const step = Math.max(1, Math.abs(base)) * 0.25;
          const values = [base - step, base + 0.3 * step, base + step].map(
            (x) => ({
              ...v,
              [name]: Math.min(
                Math.max(x, spec.min ?? -Infinity),
                spec.max ?? Infinity,
              ),
            }),
          );
          for (const p of points.slice(0, 20)) {
            values.forEach((vals, i) =>
              c.descriptor.forward(p, vals, outs[i]!),
            );
            const [a, m, b] = values.map((x) => x[name]!) as [
              number,
              number,
              number,
            ];
            if (!(b > a)) {
              continue;
            }
            const t = (m - a) / (b - a);
            for (let i = 0; i < 3; i++) {
              const lerp = outs[0]![i]! + t * (outs[2]![i]! - outs[0]![i]!);
              expect(near(outs[1]![i]!, lerp, 1e-9), `${name} at ${p}`).toBe(
                true,
              );
            }
          }
        }
      });
    });
  }
});

/** A descriptor's forward at one point. */
function at(
  d: TransformDescriptor,
  params: Params,
  p: ArrayLike<number>,
): [number, number, number] {
  const out = new Float64Array(3);
  d.forward(p, { ...defaultParams(d), ...params }, out);
  return [out[0]!, out[1]!, out[2]!];
}

describe("projections against published values", () => {
  it("the OSGB36 National Grid example (EPSG guidance note 7-2)", () => {
    const a = 6377563.396;
    const f = 1 / 299.3249646;
    const edge = transverseMercator({
      radii: [a, a, a * (1 - f)],
      centralMeridian: -2,
      latitudeOfOrigin: 49,
      scaleFactor: 0.9996012717,
      falseEasting: 400000,
      falseNorthing: -100000,
    });
    const [e, n] = at(
      transverseMercatorDescriptor([a, a, a * (1 - f)]),
      edge.spec.params,
      [0.5, 50.5, 0],
    );
    // The guidance note's figures are to 0.01 m, from the series it gives.
    expect(Math.abs(e - 577274.99)).toBeLessThan(0.01);
    expect(Math.abs(n - 69740.5)).toBeLessThan(0.01);
  });

  it("UTM puts the central meridian at the false easting and the equator at 0", () => {
    const edge = utm({ zone: 32 });
    expect(edge.spec.params.centralMeridian).toBe(9);
    const [e, n] = at(
      transverseMercatorDescriptor(WGS84),
      edge.spec.params,
      [9, 0, 0],
    );
    expect(e).toBeCloseTo(500000, 6);
    expect(n).toBeCloseTo(0, 6);
    expect(
      utm({ zone: 32, hemisphere: "south" }).spec.params.falseNorthing,
    ).toBe(1e7);
  });

  it("the transverse Mercator inverse undoes the forward to a micrometre across 10 degrees of the meridian", () => {
    const d = transverseMercatorDescriptor(WGS84);
    const params = { ...defaultParams(d), centralMeridian: 9 };
    const r = rng(5);
    for (let i = 0; i < 200; i++) {
      const p = [
        between(r, -1, 19),
        between(r, -80, 80),
        between(r, -100, 9000),
      ];
      const q = new Float64Array(3);
      const back = new Float64Array(3);
      d.forward(p, params, q);
      d.inverse!(q, params, back);
      expect(
        Math.abs(back[0]! - p[0]!) * 111e3 * Math.cos(p[1]! * RAD),
      ).toBeLessThan(1e-6);
      expect(Math.abs(back[1]! - p[1]!) * 111e3).toBeLessThan(1e-6);
    }
  });

  it("the Lambert conformal conic example (EPSG guidance note 7-2, Texas South Central)", () => {
    const radii = [6378206.4, 6378206.4, 6356583.8] as const;
    const ftUS = 1200 / 3937;
    const edge = lambertConformalConic({
      radii,
      lon0: -99,
      lat0: 27 + 50 / 60,
      lat1: 28 + 23 / 60,
      lat2: 30 + 17 / 60,
      falseEasting: 2000000 * ftUS,
      falseNorthing: 0,
    });
    const [e, n] = at(
      lambertConformalConicDescriptor(radii),
      edge.spec.params,
      [-96, 28.5, 0],
    );
    expect(e / ftUS).toBeCloseTo(2963503.91, 2);
    expect(n / ftUS).toBeCloseTo(254759.8, 2);
  });

  it("Web Mercator reaches the square's edge at 180 degrees and at 85.0511 degrees", () => {
    const [x, y] = at(
      webMercatorDescriptor(WGS84),
      {},
      [180, 85.0511287798066, 0],
    );
    expect(x).toBeCloseTo(20037508.342789244, 6);
    expect(y).toBeCloseTo(20037508.342789244, 4);
  });

  it("UTM through geocentric nodes agrees with the spike's body-fixed transverse Mercator", async () => {
    const { formForward, utmForm } = await import("../src/scene/warpForms.ts");
    const form = utmForm(33);
    const edge = utm({ zone: 33 });
    const tm = transverseMercatorDescriptor(WGS84);
    const r = rng(11);
    for (let i = 0; i < 40; i++) {
      const lon = between(r, 12, 18);
      const lat = between(r, 30, 70);
      const h = between(r, -100, 5000);
      const spike = new Float64Array(3);
      formForward(form, ecef(lon, lat, h), spike);
      const mine = at(tm, edge.spec.params, [lon, lat, h]);
      for (let k = 0; k < 3; k++) {
        expect(Math.abs(mine[k]! - spike[k]!)).toBeLessThan(1e-6);
      }
    }
  });
});

describe("the height transforms against the frames catalogue's warps", () => {
  const r = rng(21);
  const points = Array.from({ length: 30 }, () =>
    ecef(between(r, -180, 180), between(r, -89, 89), between(r, -400, 8000)),
  );

  it("a lift profile below the ceiling is frames' verticalExaggeration, J and inverse included", () => {
    const warp = framesExaggeration({ factor: 3.5, baseHeight: 200 });
    const d = verticalExaggerationDescriptor(WGS84);
    const params = {
      ...defaultParams(d),
      factor: 3.5,
      baseHeight: 200,
      ceiling: 1e10,
      band: 1,
    };
    for (const p of points) {
      const theirs = new Float64Array(3);
      const theirJ = new Float64Array(9);
      warp.forward(p, theirs, theirJ);
      const mine = new Float64Array(3);
      const myJ = new Float64Array(9);
      d.forward(p, params, mine, myJ);
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(mine[i]! - theirs[i]!)).toBeLessThan(1e-6);
      }
      for (let i = 0; i < 9; i++) {
        expect(Math.abs(myJ[i]! - theirJ[i]!)).toBeLessThan(1e-9);
      }
      const back = new Float64Array(3);
      const theirBack = new Float64Array(3);
      d.inverse!(mine, params, back);
      warp.inverse!(mine, theirBack);
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(back[i]! - theirBack[i]!)).toBeLessThan(1e-6);
      }
    }
  });

  it("heightOffset is frames' heightOffset", () => {
    const warp = framesHeightOffset(123.5);
    const d = heightOffsetDescriptor(WGS84);
    for (const p of points) {
      const theirs = new Float64Array(3);
      const theirJ = new Float64Array(9);
      warp.forward(p, theirs, theirJ);
      const mine = new Float64Array(3);
      const myJ = new Float64Array(9);
      d.forward(p, { offset: 123.5 }, mine, myJ);
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(mine[i]! - theirs[i]!)).toBeLessThan(1e-6);
      }
      for (let i = 0; i < 9; i++) {
        expect(Math.abs(myJ[i]! - theirJ[i]!)).toBeLessThan(1e-9);
      }
    }
  });

  it("the lift is a shift above the ceiling, continuous in J across the band, and finite in H", () => {
    const d = verticalExaggerationDescriptor(WGS84);
    const params = { factor: 4, ceiling: 5000, baseHeight: 0, band: 1000 };
    const program = parseTransform(d.source);
    const lat = 37;
    const lon = -122;
    const lift = (h: number) => {
      const p = ecef(lon, lat, h);
      const q = at(d, params, p);
      return Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!, q[2]! - p[2]!);
    };
    // The lift is 3 · (ceiling - band/2) = 13500 m for every height above 5000.
    expect(lift(5000)).toBeCloseTo(13500, 6);
    expect(lift(20000)).toBeCloseTo(13500, 6);
    expect(lift(2000)).toBeCloseTo(6000, 6);
    // dlift/dh is continuous at both band edges.
    for (const edge of [4000, 5000]) {
      const slope = (h: number) => (lift(h + 1e-3) - lift(h - 1e-3)) / 2e-3;
      expect(slope(edge - 0.05)).toBeCloseTo(slope(edge + 0.05), 3);
    }
    // H of the IR is finite through the band.
    for (const h of [3999, 4500, 5000, 5001, 9000]) {
      const hessian = evaluate(hessianProgram(program), ecef(lon, lat, h), {
        ...defaultParams(d),
        ...params,
      });
      expect(hessian.every(Number.isFinite)).toBe(true);
    }
  });
});

describe("the constructors give edges the graph takes", () => {
  it("rejects values outside the schema", () => {
    expect(() => edgeOf(bumpDescriptor, { sigma: 0 })).toThrow(RangeError);
    expect(() => edgeOf(bumpDescriptor, { width: 1 })).toThrow(
      /no parameter 'width'/,
    );
    expect(() => verticalExaggeration({ factor: 0, ceiling: 100 })).toThrow(
      RangeError,
    );
    expect(() => verticalExaggeration({ factor: 2, ceiling: -1 })).toThrow(
      /above the base/,
    );
    expect(() => twist({ axis: [0, 0, 0], rate: 1 })).toThrow(/non-zero/);
    expect(() =>
      lattice({ degree: [2, 2, 2], displacements: [1, 2, 3] }),
    ).toThrow(/27 control points/);
    expect(() =>
      flatten({
        polygon: [
          [0, 0],
          [1, 1],
        ],
        height: 0,
        falloff: 10,
      }),
    ).toThrow(/three points/);
  });

  it("carries the source, the separable names and the id on the spec", () => {
    const edge = verticalExaggeration({ factor: 2, ceiling: 9000 });
    expect(edge.spec.id).toBe("verticalExaggeration");
    expect(edge.spec.separable).toEqual(["factor"]);
    expect(() => parseTransform(edge.spec.source!)).not.toThrow();
    expect(edge.spec.params).toEqual({
      factor: 2,
      ceiling: 9000,
      baseHeight: 0,
      band: 1800,
    });
  });

  it("unrolls a plan point to (station, offset, elevation) by projection onto the alignment", () => {
    const graph = new TransformGraph();
    const plan = graph.root("plan");
    const strip = graph.add(
      "strip",
      plan,
      corridorUnroll({
        start: [10, 20],
        heading: Math.PI / 2,
        station: 500,
        elements: [{ kind: "line", length: 100 }],
      }),
    );
    // Heading +y: the left normal is -x, so a point 5 m west of the line is at offset +5.
    const q = routeBetween(plan, strip).forward([5, 50, 7]);
    expect(q[0]).toBeCloseTo(530, 9);
    expect(q[1]).toBeCloseTo(5, 9);
    expect(q[2]).toBeCloseTo(7, 9);
  });

  it("routes forward, with the Jacobian, and back (declared inverse and Newton)", () => {
    const graph = new TransformGraph();
    const world = graph.root("world");
    const twisted = graph.add("twisted", world, twist({ rate: 0.05 }));
    const bumpy = graph.add(
      "bumpy",
      twisted,
      edgeOf(bumpDescriptor, {
        cx: 5,
        cy: 0,
        cz: 0,
        ux: 1,
        uy: 0,
        uz: 1,
        amplitude: 3,
        sigma: 15,
      }),
    );
    const up = routeBetween(bumpy, world);
    const down = routeBetween(world, bumpy);
    const p = [4, -3, 12];
    const q = up.forward(p);
    // twist(bump(p)), by the descriptors
    const mid = at(
      bumpDescriptor,
      { cx: 5, cy: 0, cz: 0, ux: 1, uy: 0, uz: 1, amplitude: 3, sigma: 15 },
      p,
    );
    const expected = at(twistDescriptor, { rate: 0.05 }, mid);
    for (let i = 0; i < 3; i++) {
      expect(q[i]).toBeCloseTo(expected[i]!, 12);
    }
    const j = up.jacobian(p);
    const step = 1e-5;
    for (let c = 0; c < 3; c++) {
      const hi = [...p];
      const lo = [...p];
      hi[c]! += step;
      lo[c]! -= step;
      const a = up.forward(hi);
      const b = up.forward(lo);
      for (let rr = 0; rr < 3; rr++) {
        expect(j[c * 3 + rr]).toBeCloseTo((a[rr]! - b[rr]!) / (2 * step), 6);
      }
    }
    const back = down.forward(q);
    for (let i = 0; i < 3; i++) {
      expect(back[i]).toBeCloseTo(p[i]!, 8);
    }
  });
});

// The repo has no WGSL runtime in Node (the parity harness of parity/slang
// compares generated text, and the GPU spikes run in a browser), so the Slang
// side is checked here by the structure of what slangc generated from
// transforms.slang: each descriptor's entry exists, calls the `fwd_diff`
// expansion of its function three times (one per Jacobian column), and its
// parameter struct has the descriptor's parameters as fields, in order.
// Running the entries against these TS functions is task 4's GPU spike (a
// one-off run, kept out of the tree, found all ten within float32:
// values to 3e-5 relative, fwd_diff Jacobians to 2e-6).
describe("transforms.slang's generated WGSL", () => {
  const wgsl = readFileSync(
    new URL("../src/shaders/generated/transforms.wgsl", import.meta.url),
    "utf8",
  );
  const reflection = JSON.parse(
    readFileSync(
      new URL("../src/shaders/generated/transforms.json", import.meta.url),
      "utf8",
    ),
  ) as {
    parameters: {
      name: string;
      type: { elementType?: { fields?: { name: string }[] } };
    }[];
  };
  const fieldsOf = (buffer: string): string[] =>
    reflection.parameters
      .find((x) => x.name === buffer)!
      .type.elementType!.fields!.map((f) => f.name);

  const alignmentWithSlang = corridorUnrollDescriptor(alignment);
  const families: {
    descriptor: TransformDescriptor;
    buffer: string;
    /** The struct's fields beyond the descriptor's parameters, and which of the descriptor's it leaves to buffers. */
    fields?: (names: string[]) => string[];
  }[] = [
    { descriptor: scaleAboutDescriptor, buffer: "scaleAboutP" },
    { descriptor: bumpDescriptor, buffer: "bumpP" },
    { descriptor: bendDescriptor, buffer: "bendP" },
    { descriptor: twistDescriptor, buffer: "twistP" },
    { descriptor: taperDescriptor, buffer: "taperP" },
    {
      descriptor: latticeDescriptor([2, 2, 2]),
      buffer: "latticeP",
      // The 27 displacements are a buffer.
      fields: (names) => names.slice(0, 12),
    },
    { descriptor: radialDistortionDescriptor, buffer: "radialP" },
    { descriptor: velocityModelDescriptor, buffer: "velocityP" },
    {
      descriptor: alignmentWithSlang,
      buffer: "corridorP",
      // The elements are a buffer; the struct holds their count and the end.
      fields: () => ["count", "se", "xe", "ye", "ce", "ne"],
    },
    {
      descriptor: verticalExaggerationDescriptor(WGS84),
      buffer: "exaggerationP",
      // The radii are fields where the TS descriptor bakes them in.
      fields: (names) => [...names, "rx", "ry", "rz"],
    },
  ];

  it("has an entry per descriptor that names one, and no other", () => {
    const entries = [
      ...wgsl.matchAll(/@compute\s+@workgroup_size\([^)]*\)\s+fn (\w+)\(/g),
    ].map((m) => m[1]);
    expect(entries.sort()).toEqual(
      families.map((f) => f.descriptor.slang!).sort(),
    );
  });

  for (const { descriptor, buffer, fields } of families) {
    const entry = descriptor.slang!;
    const family = entry.replace(/Parity$/, "");
    describe(entry, () => {
      const start = wgsl.indexOf(`fn ${entry}(`);
      const next = wgsl.indexOf("@compute", start);
      const body = wgsl.slice(start, next < 0 ? undefined : next);

      it("calls the fwd_diff expansion of its function once per Jacobian column", () => {
        expect(wgsl).toMatch(new RegExp(`fn s_fwd_${family}F_\\d+\\(`));
        expect(
          body.match(new RegExp(`s_fwd_${family}F_\\d+\\(`, "g")),
        ).toHaveLength(3);
        expect(body).toMatch(new RegExp(`\\b${family}F_\\d+\\(`));
      });

      it("takes the descriptor's parameters, in its order", () => {
        const names = Object.keys(descriptor.params);
        expect(fieldsOf(buffer)).toEqual(fields ? fields(names) : names);
      });
    });
  }
});
