// The smooth-frame helpers (plan §13.26, §13.37): each helper's forward,
// Jacobian and inverse at Earth scale, the exaggeration against its
// definition, and the helpers through `smoothFrame`, the frames resolver's
// `route()` and `routeForward`: forward going up from the frame to its
// parent.
import { describe, expect, it, vi } from "vitest";
import {
  routeForward,
  routeInverse,
  warpForward,
  warpInverse,
  type SmoothFrameSpec,
  type Warp,
} from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import {
  verticalExaggeration,
  heightOffset,
} from "../src/georeference/heightWarps.ts";
import { blend } from "../src/transforms/blend.ts";
import { fromFunction } from "../src/transforms/fromFunction.ts";
import { liveWarp } from "../src/transforms/liveWarp.ts";
import { scaleAbout } from "../src/transforms/scaleAbout.ts";
import { smoothFrame } from "../src/frames/smoothFrame.ts";
import { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";
import type { ProjApi } from "../src/engineering/projApi.ts";
import { reprojectionWarp } from "../src/proj/reprojectionWarp.ts";
import type { CoordinateOperation } from "../src/frames/coordinates.ts";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";
import { EARTH } from "../src/scene/Body.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const SECONDS = Date.UTC(2000, 0, 1, 12) / 1000;
const WGS84 = Ellipsoid.WGS84;
const R = 6_371_000;

const norm = (a: ArrayLike<number>) => Math.hypot(a[0]!, a[1]!, a[2]!);
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** A point lon, lat (degrees) and height (m) above `ellipsoid`, in metres. */
function at(lon: number, lat: number, h: number, ellipsoid = WGS84) {
  return ellipsoid.cartographicToCartesian(
    fromDegrees(lon, lat, h),
    new Float64Array(3),
  );
}

const SAMPLES: [number, number, number][] = [
  [0, 0, 0],
  [-75.16, 39.95, 250],
  [139.7, 35.7, 3776],
  [-122.4, 37.8, -400],
  [10, 89.5, 1000],
  [170, -45, 8848],
  [0, 90, 500],
  [30, -90, 120],
];

/** The Jacobian of `forward` by central differences at 1 m: an independent check of an analytic one. */
function numerical(warp: SmoothFrameSpec, p: ArrayLike<number>, h = 1) {
  const j = new Float64Array(9);
  const plus = new Float64Array(3);
  const minus = new Float64Array(3);
  for (let c = 0; c < 3; c++) {
    const a = Array.from(p);
    const b = Array.from(p);
    a[c] = a[c]! + h;
    b[c] = b[c]! - h;
    warp.forward(a, plus);
    warp.forward(b, minus);
    for (let r = 0; r < 3; r++) {
      j[c * 3 + r] = (plus[r]! - minus[r]!) / (2 * h);
    }
  }
  return j;
}

function maxDiff(a: ArrayLike<number>, b: ArrayLike<number>) {
  let m = 0;
  for (let i = 0; i < 9; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
}

/** Forward, Jacobian against differences, and the inverse round trip. */
function checkWarp(
  warp: SmoothFrameSpec,
  points: ArrayLike<number>[],
  { jacobian = 1e-7, trip = 1e-6 } = {},
) {
  for (const p of points) {
    const q = new Float64Array(3);
    const j = new Float64Array(9);
    warp.forward(p, q, j);
    expect(maxDiff(j, numerical(warp, p))).toBeLessThan(jacobian);
    const back = warp.inverse!(q, new Float64Array(3));
    expect(dist(back, p)).toBeLessThan(trip);
  }
}

describe("verticalExaggeration", () => {
  it("multiplies height and keeps latitude and longitude, on WGS84", () => {
    const k = 10;
    const warp = verticalExaggeration({ factor: k });
    for (const [lon, lat, h] of SAMPLES) {
      const q = warp.forward(at(lon, lat, h), new Float64Array(3));
      const c = WGS84.cartesianToCartographic(q, fromDegrees(0, 0));
      expect(c).toBeDefined();
      expect(c!.height).toBeCloseTo(k * h, 4);
      const input = fromDegrees(lon, lat);
      expect(c!.latitude).toBeCloseTo(input.latitude, 11);
      if (Math.abs(lat) < 89) {
        expect(c!.longitude).toBeCloseTo(input.longitude, 11);
      }
    }
  });

  it("has an exact Jacobian and inverse at Earth scale, at the poles too", () => {
    const warp = verticalExaggeration({ factor: 7 });
    checkWarp(
      warp,
      SAMPLES.map(([lon, lat, h]) => at(lon, lat, h)),
    );
    // A high point and a deep one (7 × 300 km below is still above the centre).
    checkWarp(warp, [at(20, 20, 400_000), at(20, 20, -300_000)]);
  });

  it("is the identity at factor 1 and exaggerates about baseHeight", () => {
    const p = at(-75, 40, 1234);
    const same = verticalExaggeration({ factor: 1 });
    const j = new Float64Array(9);
    const q = same.forward(p, new Float64Array(3), j);
    expect(dist(q, p)).toBeLessThan(1e-9);
    expect(maxDiff(j, [1, 0, 0, 0, 1, 0, 0, 0, 1])).toBeLessThan(1e-12);

    const about = verticalExaggeration({ factor: 4, baseHeight: 1000 });
    const out = about.forward(p, new Float64Array(3));
    const c = WGS84.cartesianToCartographic(out, fromDegrees(0, 0))!;
    expect(c.height).toBeCloseTo(1000 + 4 * 234, 4);
    checkWarp(about, [p, at(0, 0, -50)]);
  });

  it("works above a sphere, an ellipsoid of its own and a triaxial one", () => {
    const sphere = verticalExaggeration({
      factor: 5,
      reference: { sphere: R },
    });
    const p = [R * 0.6 + 1234.5, R * 0.7 - 987.6, R * 0.37 + 55.5];
    const q = sphere.forward(p, new Float64Array(3));
    expect(norm(q)).toBeCloseTo(R + 5 * (norm(p) - R), 5);
    checkWarp(sphere, [p, [R, 0, 0], [0, 0, R + 9000]]);

    const moon = Ellipsoid.MOON;
    const onMoon = verticalExaggeration({
      factor: 3,
      reference: { ellipsoid: moon },
    });
    checkWarp(onMoon, [at(10, 20, 2000, moon), at(-80, -60, -1500, moon)]);

    const triaxial = new Ellipsoid(7_000_000, 6_500_000, 6_000_000);
    const odd = verticalExaggeration({
      factor: 2.5,
      reference: { ellipsoid: triaxial },
    });
    checkWarp(odd, [
      at(40, 30, 5000, triaxial),
      at(-100, -10, -3000, triaxial),
      at(0, 89, 10, triaxial),
    ]);
    const q2 = odd.forward(at(40, 30, 5000, triaxial), new Float64Array(3));
    const c = triaxial.cartesianToCartographic(q2, fromDegrees(0, 0))!;
    expect(c.height).toBeCloseTo(12_500, 3);
  });

  it("works above a plane", () => {
    const plane = verticalExaggeration({
      factor: 3,
      reference: { plane: { origin: [0, 0, 100], normal: [0, 0, 2] } },
    });
    const q = plane.forward([5, -6, 150], new Float64Array(3));
    expect(Array.from(q)).toEqual([5, -6, 250]);
    const j = new Float64Array(9);
    plane.forward([5, -6, 150], q, j);
    expect(Array.from(j)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 3]);
    checkWarp(
      verticalExaggeration({
        factor: 2,
        reference: { plane: { normal: [1, 1, 1] } },
      }),
      [
        [10, 20, 30],
        [-3, 4, 1e6],
      ],
    );
  });

  it("rejects a factor that is not positive and a point at the centre", () => {
    expect(() => verticalExaggeration({ factor: 0 })).toThrow(RangeError);
    expect(() => verticalExaggeration({ factor: -2 })).toThrow(RangeError);
    expect(() => verticalExaggeration({ factor: Infinity })).toThrow(
      RangeError,
    );
    const warp = verticalExaggeration({ factor: 2 });
    expect(() => warp.forward([0, 0, 0], new Float64Array(3))).toThrow(
      /centre/,
    );
  });

  it("has a description", () => {
    const warp = verticalExaggeration({ factor: 10, baseHeight: 5 });
    expect(warp.description).toBe(
      "vertical exaggeration × 10 of height above the WGS84 ellipsoid, about 5 m",
    );
    expect(
      verticalExaggeration({ factor: 2, reference: { sphere: 100 } })
        .description,
    ).toContain("a sphere of radius 100 m");
  });

  it("a scale parameter multiplies heights by 1 + s(factor − 1), through warpForward and warpInverse", () => {
    const slider = { value: 0.5, range: [0, 1] as const };
    const spec = verticalExaggeration({ factor: 10, scale: slider });
    const warp = liveWarp(spec);
    const p = at(-75, 40, 1000);
    const q = warpForward(warp, p, new Float64Array(3));
    const c = WGS84.cartesianToCartographic(q, fromDegrees(0, 0))!;
    expect(c.height).toBeCloseTo(5500, 4);
    const j = new Float64Array(9);
    warpForward(warp, p, q, j);
    // The scaled Jacobian is I + s(J − I): the differences of the scaled map.
    const scaled: SmoothFrameSpec = {
      revision: 1,
      forward: (a, out) => warpForward(warp, a, out),
    };
    expect(maxDiff(j, numerical(scaled, p))).toBeLessThan(1e-7);
    const back = warpInverse(warp, q);
    expect(dist(back, p)).toBeLessThan(1e-6);
    slider.value = 0;
    expect(dist(warpForward(warp, p, new Float64Array(3)), p)).toBe(0);
  });
});

describe("heightOffset", () => {
  it("lifts along the normal: height plus metres, latitude and longitude kept", () => {
    const warp = heightOffset(250);
    for (const [lon, lat, h] of SAMPLES) {
      const q = warp.forward(at(lon, lat, h), new Float64Array(3));
      const c = WGS84.cartesianToCartographic(q, fromDegrees(0, 0))!;
      expect(c.height).toBeCloseTo(h + 250, 5);
      if (Math.abs(lat) < 89) {
        expect(c.latitude).toBeCloseTo(fromDegrees(lon, lat).latitude, 11);
      }
    }
    checkWarp(
      warp,
      SAMPLES.map(([lon, lat, h]) => at(lon, lat, h)),
    );
    checkWarp(heightOffset(-75, { reference: { sphere: R } }), [
      [R + 10, 5, 7],
      [1, R - 300, -4],
    ]);
  });

  it("changes through `metres`", () => {
    const warp = heightOffset(10);
    const before = warp.revision;
    warp.metres = 20;
    expect(warp.revision).toBe(before + 1);
    const q = warp.forward(at(0, 0, 0), new Float64Array(3));
    expect(
      WGS84.cartesianToCartographic(q, fromDegrees(0, 0))!.height,
    ).toBeCloseTo(20, 6);
    expect(warp.description).toContain("20 m");
  });
});

describe("scaleAbout", () => {
  it("scales along east, north and up at the point, and is affine", () => {
    const centre = at(-75, 40, 0);
    const warp = scaleAbout(centre, [2, 3, 5]);
    // A point 100 m east of the centre goes 200 m east.
    const east = [
      -Math.sin((-75 * Math.PI) / 180),
      Math.cos((-75 * Math.PI) / 180),
      0,
    ];
    const p = [
      centre[0]! + 100 * east[0]!,
      centre[1]! + 100 * east[1]!,
      centre[2]! + 100 * east[2]!,
    ];
    const q = warp.forward(p, new Float64Array(3));
    expect(dist(q, centre)).toBeCloseTo(200, 8);
    expect(
      ((q[0]! - centre[0]!) * east[0]! + (q[1]! - centre[1]!) * east[1]!) / 200,
    ).toBeCloseTo(1, 10);
    expect(dist(warp.forward(centre, new Float64Array(3)), centre)).toBe(0);
    checkWarp(
      warp,
      [p, [centre[0]! + 5e5, centre[1]! - 2e5, centre[2]! + 9e4]],
      {
        jacobian: 1e-9,
        trip: 1e-7,
      },
    );
  });

  it("takes one factor, rejects bad ones, and changes through `factors`", () => {
    const centre = at(10, 10, 0);
    const warp = scaleAbout(centre, 2);
    expect(warp.factors).toEqual([2, 2, 2]);
    expect(() => scaleAbout(centre, [1, 0, 1])).toThrow(RangeError);
    expect(() => scaleAbout(centre, [1, NaN, 1])).toThrow(RangeError);
    const before = warp.revision;
    warp.factors = [1, 1, 4];
    expect(warp.revision).toBe(before + 1);
    expect(warp.description).toContain("up × 4");
  });
});

describe("fromFunction", () => {
  /**
   * The same exaggeration as a plain function of the point, on a sphere. It
   * reads `R` and `k` from its scope, which is outside the restricted subset:
   * the function stays the CPU path and its draws are fitted.
   */
  const k = 10;
  const exaggerate = (
    p: ArrayLike<number>,
    _params: Record<string, number>,
    out: Float64Array,
  ) => {
    const r = norm(p);
    const f = (R + k * (r - R)) / r;
    out[0] = p[0]! * f;
    out[1] = p[1]! * f;
    out[2] = p[2]! * f;
  };
  const analytic = verticalExaggeration({
    factor: k,
    reference: { sphere: R },
  });

  it("makes a Jacobian by central differences, right to 1e-9 at Earth scale", () => {
    const warp = fromFunction(exaggerate);
    let worst = 0;
    for (const [lon, lat, h] of SAMPLES) {
      const p = at(lon, lat, h * 3 - 400, Ellipsoid.WGS84);
      const j = new Float64Array(9);
      const exact = new Float64Array(9);
      const q = warp.forward(p, new Float64Array(3), j);
      const qa = analytic.forward(p, new Float64Array(3), exact);
      expect(dist(q, qa)).toBeLessThan(1e-6);
      worst = Math.max(worst, maxDiff(j, exact));
    }
    expect(worst).toBeLessThan(1e-9);
  });

  it("scales its step to the domain: a small domain resolves small features", () => {
    // A bump of width 20 m on a tangent plane: the default step for |p| = R is far too wide.
    const bump = (
      p: ArrayLike<number>,
      _params: Record<string, number>,
      out: Float64Array,
    ) => {
      out[0] = p[0]!;
      out[1] = p[1]!;
      out[2] = p[2]! + 3 * Math.exp(-((p[0]! - R) ** 2) / (2 * 20 * 20));
    };
    const p = [R + 15, 0, 0];
    const exact = new Float64Array(9);
    exact.set([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    exact[2] = (3 * -15 * Math.exp(-(15 ** 2) / 800)) / 400;
    const wide = fromFunction(bump);
    const small = fromFunction(bump, {
      domain: { center: [R, 0, 0], radius: 100 },
    });
    const jw = new Float64Array(9);
    const js = new Float64Array(9);
    wide.forward(p, new Float64Array(3), jw);
    small.forward(p, new Float64Array(3), js);
    expect(maxDiff(js, exact)).toBeLessThan(1e-6);
    expect(maxDiff(jw, exact)).toBeGreaterThan(maxDiff(js, exact));
    const stepped = fromFunction(bump, { step: 0.01 });
    const jt = new Float64Array(9);
    stepped.forward(p, new Float64Array(3), jt);
    expect(maxDiff(jt, exact)).toBeLessThan(1e-6);
  });

  it("inverts by Newton, from the engine's warpInverse, to a micrometre at Earth scale", () => {
    const warp = fromFunction(exaggerate);
    for (const [lon, lat, h] of SAMPLES) {
      const p = at(lon, lat, h, Ellipsoid.WGS84);
      const q = warp.forward(p, new Float64Array(3));
      const back = warp.inverse(q, new Float64Array(3));
      expect(dist(back, p)).toBeLessThan(1e-6);
    }
  });

  it("takes an exact inverse when given one, and a function that returns its answer", () => {
    const inverse = vi.fn(
      (q: ArrayLike<number>, _params: unknown, out: Float64Array) => {
        out.set([q[0]! / 2, q[1]! / 2, q[2]! / 2]);
        return out;
      },
    );
    const warp = fromFunction((p) => [2 * p[0]!, 2 * p[1]!, 2 * p[2]!], {
      inverse,
    });
    const j = new Float64Array(9);
    const q = warp.forward([3, 4, 5], new Float64Array(3), j);
    expect(Array.from(q)).toEqual([6, 8, 10]);
    expect(maxDiff(j, [2, 0, 0, 0, 2, 0, 0, 0, 2])).toBeLessThan(1e-9);
    expect(Array.from(warp.inverse([6, 8, 10], new Float64Array(3)))).toEqual([
      3, 4, 5,
    ]);
    expect(inverse).toHaveBeenCalledTimes(1);
  });

  it("accepts p as out, and throws where the function isn't finite", () => {
    const warp = fromFunction(exaggerate);
    const p = at(5, 50, 100);
    const expected = warp.forward(p, new Float64Array(3));
    const aliased = Float64Array.from(p);
    warp.forward(aliased, aliased, new Float64Array(9));
    expect(dist(aliased, expected)).toBe(0);
    const bad = fromFunction(() => [NaN, 0, 0]);
    expect(() => bad.forward([1, 2, 3], new Float64Array(3))).toThrow(
      RangeError,
    );
    expect(() => fromFunction(exaggerate, { step: -1 })).toThrow(RangeError);
  });

  it("carries its options into the spec", () => {
    const slider = { value: 1 };
    const warp = fromFunction(exaggerate, {
      description: "mine",
      domain: { center: [R, 0, 0], radius: 1e6 },
      accuracy: { sigma: 0.1 },
      scale: slider,
    });
    expect(warp).toMatchObject({
      description: "mine",
      accuracy: { sigma: 0.1 },
      scale: slider,
    });
    expect(warp.domain!.radius).toBe(1e6);
  });
});

describe("blend", () => {
  const a = verticalExaggeration({ factor: 4 });
  const b = heightOffset(500);

  it("is a at 0, b at 1, and the mix between, with the mix's Jacobian", () => {
    const p = at(-75, 40, 800);
    const qa = a.forward(p, new Float64Array(3));
    const qb = b.forward(p, new Float64Array(3));
    const mix = blend(a, b, 0.25);
    const q = mix.forward(p, new Float64Array(3));
    for (let i = 0; i < 3; i++) {
      expect(q[i]).toBeCloseTo(0.75 * qa[i]! + 0.25 * qb[i]!, 6);
    }
    expect(dist(blend(a, b, 0).forward(p, new Float64Array(3)), qa)).toBe(0);
    expect(dist(blend(a, b, 1).forward(p, new Float64Array(3)), qb)).toBe(0);
    checkWarp(mix, [p, at(139, 35, 3000)]);
  });

  it("follows its inputs' revisions and its own t, and combines accuracies without optimism", () => {
    const first = fromFunction((p) => [p[0]!, p[1]!, p[2]!], {
      accuracy: { sigma: 1, bound: 3 },
    });
    const second = fromFunction((p) => [p[0]!, p[1]!, p[2]!], {
      accuracy: { sigma: 3, bound: 5 },
    });
    const mix = blend(first, second, 0.5);
    const before = mix.revision;
    first.changed();
    expect(mix.revision).toBe(before + 1);
    mix.t = 0.75;
    expect(mix.revision).toBe(before + 2);
    expect(mix.accuracy).toMatchObject({ sigma: 2.5, bound: 4.5 });
    expect(() => blend(first, second, 2)).toThrow(RangeError);
    expect(mix.description).toContain("blend of");
  });
});

describe("reprojectionWarp", () => {
  const RADIUS = 6_378_137;
  /** Spherical Mercator: (x, y, z) metres to degrees and height. */
  const mercator = (accuracy: number | undefined): CoordinateOperation => ({
    forward: (xyz, out = new Float64Array(3)) => {
      out[0] = ((xyz[0]! / RADIUS) * 180) / Math.PI;
      out[1] =
        ((2 * Math.atan(Math.exp(xyz[1]! / RADIUS)) - Math.PI / 2) * 180) /
        Math.PI;
      out[2] = xyz[2]!;
      return out;
    },
    inverse: (llh, out = new Float64Array(3)) => {
      out[0] = (llh[0]! * Math.PI * RADIUS) / 180;
      out[1] =
        RADIUS * Math.log(Math.tan(Math.PI / 4 + (llh[1]! * Math.PI) / 360));
      out[2] = llh[2]!;
      return out;
    },
    accuracy,
    description: "Web Mercator to WGS84",
  });

  const DESIGN = [
    [-8_366_000, 4_860_000, 35],
    [15_550_000, 4_250_000, 120],
    [0, 0, 0],
    [-13_600_000, -4_000_000, -20],
  ];

  it("is the operation then the ellipsoid, with a Jacobian and an exact inverse: design coordinates to body-fixed metres", () => {
    const warp = reprojectionWarp(mercator(0.5));
    for (const design of DESIGN) {
      const q = warp.forward(design, new Float64Array(3));
      const llh = mercator(0.5).forward(design);
      const expected = at(llh[0]!, llh[1]!, llh[2]!);
      expect(dist(q, expected)).toBeLessThan(1e-6);
      const back = warp.inverse(q, new Float64Array(3));
      expect(dist(back, design)).toBeLessThan(1e-6);
      // The Jacobian against differences at 1 design unit: Mercator is smooth.
      const j = new Float64Array(9);
      warp.forward(design, new Float64Array(3), j);
      expect(maxDiff(j, numerical(warp, design))).toBeLessThan(1e-7);
    }
  });

  it("states the operation's accuracy as a sigma, and says so when it states none", () => {
    const stated = reprojectionWarp(mercator(0.5));
    expect(stated.accuracy).toMatchObject({ sigma: 0.5 });
    expect(stated.description).toBe("reprojection: Web Mercator to WGS84");
    const unstated = reprojectionWarp(mercator(undefined));
    expect(unstated.accuracy!.sigma).toBeUndefined();
    expect(unstated.accuracy!.bound).toBeUndefined();
    expect(unstated.accuracy!.note).toContain("no accuracy");
  });

  it("takes a coordinate service's answer, and an area of interest becomes its domain", () => {
    const operation = mercator(undefined);
    const warp = reprojectionWarp(
      {
        operation,
        units: {
          projected: true,
          horizontalUnitName: "metre",
          metersPerUnit: 1,
        },
        gridFactors: () => {
          throw new Error("not used");
        },
        credits: [],
      },
      { areaOfInterest: { west: -80, south: 35, east: -70, north: 45 } },
    );
    // The domain is in the design frame's coordinates: a circle of design units.
    const llh = operation.forward(warp.domain!.center);
    expect(llh[0]).toBeCloseTo(-75, 8);
    expect(llh[1]).toBeCloseTo(40, 3);
    expect(warp.domain!.radius).toBeGreaterThan(5e5);
    expect(warp.domain!.radius).toBeLessThan(2e6);
    // An area across 180° has its centre there.
    const across = reprojectionWarp(operation, {
      areaOfInterest: { west: 170, south: -10, east: -170, north: 10 },
    });
    const there = operation.forward(across.domain!.center);
    expect(Math.abs(Math.abs(there[0]!) - 180)).toBeLessThan(1e-8);
  });

  it("rejects a point outside the operation's domain", () => {
    const warp = reprojectionWarp({
      ...mercator(1),
      forward: () => new Float64Array([NaN, 0, 0]),
    });
    expect(() => warp.forward([1, 2, 3], new Float64Array(3))).toThrow(
      /not finite/,
    );
  });

  it("is an engineering frame's toBodyFixed, site transform included", () => {
    const stub = {
      proj_create: () => ({}),
      proj_get_name: () => "stub",
      proj_as_proj_string: () => "+proj=noop",
      proj_get_type: () => 2,
      PJ_TYPE_PROJECTED_CRS: 2,
      PJ_TYPE_COMPOUND_CRS: 1,
      PJ_FWD: 1,
      PJ_INV: -1,
      proj_crs_get_coordinate_system: () => ({}),
      proj_cs_get_axis_count: () => 2,
      proj_cs_get_axis_info: (_: unknown, index: number) => ({
        unit_name: "stub unit",
        unit_conv_factor: 1,
        direction: index === 0 ? "east" : "north",
      }),
      proj_coord: (x: number, y: number, z: number, t: number) => ({
        v: [x, y, z, t],
      }),
      proj_trans: (_: unknown, __: unknown, c: { v: number[] }) => c,
    } as unknown as ProjApi;
    const frame = EngineeringFrame.create(
      {
        name: "stub",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 4326 },
        pipeline: "+proj=noop",
        site: { origin: [-75, 40, 5], rotation: 0.2, scale: 1 },
      },
      stub,
    );
    const warp = reprojectionWarp(frame);
    expect(warp.description).toBe(
      `reprojection of stub: ${frame.operation.description}`,
    );
    for (const design of [
      [0.5, 0.25, 3],
      [-0.1, 0.4, 10],
    ]) {
      const q = warp.forward(design, new Float64Array(3));
      expect(dist(q, frame.toBodyFixed(design))).toBe(0);
      expect(dist(warp.inverse(q, new Float64Array(3)), design)).toBeLessThan(
        1e-6,
      );
    }
  });
});

describe("helpers through smoothFrame, route() and routeForward", () => {
  const setup = (spec: SmoothFrameSpec) => {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const itrf = catalog.get("ITRF");
    const frame = smoothFrame("content", itrf, spec);
    catalog.add(frame);
    return { catalog, itrf, frame, resolver: createFramesResolver(catalog) };
  };

  it("an exaggeration frame's route multiplies heights going up to its parent and undoes them going down", () => {
    const spec = verticalExaggeration({ factor: 10 });
    const { itrf, frame, resolver } = setup(spec);
    const up = resolver.route(frame, itrf, SECONDS);
    expect(up.steps.map((s) => s.kind)).toEqual(["warp"]);
    expect(up.steps[0]).toMatchObject({ inverse: false });
    const down = resolver.route(itrf, frame, SECONDS);
    for (const [lon, lat, h] of SAMPLES) {
      const p = at(lon, lat, h);
      const q = routeForward(up, p);
      const c = WGS84.cartesianToCartographic(q, fromDegrees(0, 0))!;
      expect(c.height).toBeCloseTo(10 * h, 4);
      expect(dist(routeForward(down, q), p)).toBeLessThan(1e-6);
      expect(dist(routeInverse(up, q), p)).toBeLessThan(1e-6);
    }
    expect(frame.warp.description).toContain("vertical exaggeration × 10");
  });

  it("a slider-scaled exaggeration follows the live scale", () => {
    const slider = { value: 0, range: [0, 1] as [number, number] };
    const { itrf, frame, resolver } = setup(
      verticalExaggeration({ factor: 10, scale: slider }),
    );
    const route = resolver.route(frame, itrf, SECONDS);
    const p = at(-75, 40, 1000);
    expect(dist(routeForward(route, p), p)).toBe(0);
    slider.value = 0.5;
    const c = WGS84.cartesianToCartographic(
      routeForward(route, p),
      fromDegrees(0, 0),
    )!;
    expect(c.height).toBeCloseTo(5500, 4);
  });

  it("changed() bumps the route's revision and wakes watchers, without the app calling invalidate", () => {
    const spec = verticalExaggeration({ factor: 2 });
    const { itrf, frame, resolver } = setup(spec);
    const told = vi.fn();
    const unwatch = resolver.watch(told);
    const before = resolver.routeRevision(frame, itrf);
    const heard = told.mock.calls.length;
    spec.factor = 3;
    expect(resolver.routeRevision(frame, itrf)).not.toBe(before);
    expect(told.mock.calls.length).toBeGreaterThan(heard);
    const q = routeForward(resolver.route(frame, itrf, SECONDS), at(0, 0, 100));
    expect(
      WGS84.cartesianToCartographic(q, fromDegrees(0, 0))!.height,
    ).toBeCloseTo(300, 4);
    unwatch();
  });

  it("a function's frame is invalidated by changed(), and fitted: its function reads a free variable", () => {
    let k = 2;
    const spec = fromFunction((p, _params, out) => {
      out[0] = p[0]! * k;
      out[1] = p[1]! * k;
      out[2] = p[2]! * k;
    });
    expect(spec.compiled).toBe(false);
    expect(spec.fitReason).toContain("free variable");
    expect(spec.smooth).toBeUndefined();
    const { itrf, frame, resolver } = setup(spec);
    const onChange = vi.fn();
    frame.onChange(onChange);
    const route = resolver.route(frame, itrf, SECONDS);
    expect(Array.from(routeForward(route, [1, 2, 3]))).toEqual([2, 4, 6]);
    k = 5;
    spec.changed();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(Array.from(routeForward(route, [1, 2, 3]))).toEqual([5, 10, 15]);
  });

  it("a reprojection frame places design coordinates in the body-fixed frame, with the operation's accuracy", () => {
    const op: CoordinateOperation = {
      forward: (xyz, out = new Float64Array(3)) => {
        out.set([xyz[0]!, xyz[1]!, xyz[2]!]);
        return out;
      },
      inverse: (llh, out = new Float64Array(3)) => {
        out.set([llh[0]!, llh[1]!, llh[2]!]);
        return out;
      },
      accuracy: 0.25,
      description: "identity on degrees",
    };
    const { itrf, frame, resolver } = setup(reprojectionWarp(op));
    const up = resolver.route(frame, itrf, SECONDS);
    const q = routeForward(up, [-75, 40, 100]);
    expect(dist(q, at(-75, 40, 100))).toBeLessThan(1e-6);
    const point = resolver.accuracy([-75, 40, 100], frame, itrf, SECONDS);
    expect(point.meters).toBeCloseTo(0.25, 12);
  });

  it("the warp passed to smoothFrame is the same Jacobian-carrying spec", () => {
    const spec = verticalExaggeration({ factor: 10 });
    const { frame } = setup(spec);
    const warp: Warp = frame.warp;
    const j = new Float64Array(9);
    warp.forward(at(0, 45, 1000), new Float64Array(3), j);
    expect(Number.isFinite(j[0]!)).toBe(true);
    expect(warp.inverse).toBeDefined();
  });
});

describe("fromFunction in the restricted subset", () => {
  /** A swirl about the z axis whose angle grows with height, with a strength parameter. */
  const twist = (p: ArrayLike<number>, params: { rate: number }) => {
    const a = params.rate * p[2]!;
    return [
      p[0]! * Math.cos(a) - p[1]! * Math.sin(a),
      p[0]! * Math.sin(a) + p[1]! * Math.cos(a),
      p[2]!,
    ];
  };

  it("parses to the IR: compiled, with a smooth spec the compiler can take", () => {
    const warp = fromFunction(twist as never, { params: { rate: 0.01 } });
    expect(warp.compiled).toBe(true);
    expect(warp.fitReason).toBeUndefined();
    expect(warp.smooth?.source).toContain("params.rate");
    expect(warp.smooth?.params).toEqual({ rate: 0.01 });
  });

  it("has an exact Jacobian by autodiff, right where central differences are only near", () => {
    const warp = fromFunction(twist as never, { params: { rate: 0.01 } });
    const p = [3, -2, 40];
    const j = new Float64Array(9);
    warp.forward(p, new Float64Array(3), j);
    expect(maxDiff(j, numerical(warp, p, 1e-4))).toBeLessThan(1e-7);
    // d(out_z)/dz = 1 exactly, and d(out_x)/dz = -rate (x sin a + y cos a).
    const a = 0.01 * 40;
    expect(j[8]).toBe(1);
    expect(j[6]).toBeCloseTo(-0.01 * (3 * Math.sin(a) + -2 * Math.cos(a)), 14);
  });

  it("moves with setParams: the revision, the smooth spec's values and the frame's watchers", () => {
    const warp = fromFunction(twist as never, { params: { rate: 0.01 } });
    const before = warp.revision;
    warp.setParams({ rate: 0.02 });
    expect(warp.revision).toBe(before + 1);
    expect(warp.smooth?.params).toEqual({ rate: 0.02 });
    expect(() => warp.setParams({ nope: 1 })).toThrow(/no parameter 'nope'/);
    expect(() => warp.setParams({ rate: Number.NaN })).toThrow(RangeError);
    const q = warp.forward([1, 0, 50], new Float64Array(3));
    expect(q[0]).toBeCloseTo(Math.cos(0.02 * 50), 14);
  });
});
