// The projected-to-geographic built-ins (a node authored in a CRS's grid),
// the live ceiling of `verticalExaggeration`, and `liveEdge`: what the
// transform-graph gallery example needed and carried itself.
import { describe, expect, it } from "vitest";
import {
  geographicToGeocentric,
  lambertConformalConic,
  lambertConformalConicToGeographic,
  transverseMercator,
  transverseMercatorToGeographic,
  utm,
  utmToGeographic,
  verticalExaggeration,
  verticalExaggerationEdge,
  webMercator,
  webMercatorToGeographic,
} from "../src/georeference/index.ts";
import { compileRoute } from "../src/transform/compile.ts";
import {
  affine,
  evaluate,
  parseTransform,
  routeBetween,
  TransformGraph,
  type SmoothEdge,
} from "../src/transform/index.ts";
import { liveEdge, twist } from "../src/transforms/index.ts";

/** A repeatable stream in [0, 1). */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: () => number, lo: number, hi: number) =>
  lo + (hi - lo) * r();

function forwardOf(edge: SmoothEdge, p: ArrayLike<number>): number[] {
  const out = new Float64Array(3);
  edge.spec.forward(p, edge.spec.params, out);
  return [out[0]!, out[1]!, out[2]!];
}

/** Body-fixed metres at a longitude and latitude (degrees) and height. */
function ecefOf(lon: number, lat: number, h: number): number[] {
  return forwardOf(geographicToGeocentric(), [lon, lat, h]);
}

/** Metres of a difference in degrees of longitude and latitude at `lat`. */
function metres(dLon: number, dLat: number, lat: number): number {
  return Math.hypot(
    dLon * 111_320 * Math.cos((lat * Math.PI) / 180),
    dLat * 110_574,
  );
}

const sources: Array<{
  name: string;
  forward: SmoothEdge;
  back: SmoothEdge;
  lon: [number, number];
  lat: [number, number];
}> = [
  {
    name: "UTM 32N",
    forward: utm({ zone: 32 }),
    back: utmToGeographic({ zone: 32 }),
    lon: [4, 14],
    lat: [-80, 80],
  },
  {
    name: "UTM 48S (Jakarta)",
    forward: utm({ zone: 48, hemisphere: "south" }),
    back: utmToGeographic({ zone: 48, hemisphere: "south" }),
    lon: [102, 108],
    lat: [-12, -1],
  },
  {
    name: "a transverse Mercator with a latitude of origin",
    forward: transverseMercator({
      centralMeridian: -2,
      latitudeOfOrigin: 49,
      scaleFactor: 0.9996012717,
      falseEasting: 400000,
      falseNorthing: -100000,
    }),
    back: transverseMercatorToGeographic({
      centralMeridian: -2,
      latitudeOfOrigin: 49,
      scaleFactor: 0.9996012717,
      falseEasting: 400000,
      falseNorthing: -100000,
    }),
    lon: [-5, 2],
    lat: [49, 61],
  },
  {
    name: "a Lambert conformal conic with two parallels",
    forward: lambertConformalConic({
      lon0: -96,
      lat0: 23,
      lat1: 33,
      lat2: 45,
      falseEasting: 1e6,
      falseNorthing: -2e6,
    }),
    back: lambertConformalConicToGeographic({
      lon0: -96,
      lat0: 23,
      lat1: 33,
      lat2: 45,
      falseEasting: 1e6,
      falseNorthing: -2e6,
    }),
    lon: [-120, -75],
    lat: [25, 50],
  },
  {
    name: "Web Mercator",
    forward: webMercator(),
    back: webMercatorToGeographic(),
    lon: [-180, 180],
    lat: [-84, 84],
  },
];

describe("the projected-to-geographic built-ins", () => {
  for (const s of sources) {
    describe(s.name, () => {
      const r = rng(7);
      const points = Array.from({ length: 80 }, () => [
        between(r, ...s.lon),
        between(r, ...s.lat),
        between(r, -100, 3000),
      ]);

      it("undoes the projection to a micrometre, in TypeScript and in its IR source", () => {
        const program = parseTransform(s.back.spec.source!);
        for (const p of points) {
          const grid = forwardOf(s.forward, p);
          const back = forwardOf(s.back, grid);
          const ir = evaluate(program, grid, s.back.spec.params);
          for (const got of [back, [...ir]]) {
            expect(
              metres(got[0]! - p[0]!, got[1]! - p[1]!, p[1]!),
            ).toBeLessThan(1e-6);
            expect(got[2]).toBeCloseTo(p[2]!, 9);
          }
        }
      });

      it("has the projection as its inverse", () => {
        const inverse = s.back.spec.inverse!;
        const out = new Float64Array(3);
        for (const p of points.slice(0, 20)) {
          const grid = forwardOf(s.forward, p);
          const geographic = forwardOf(s.back, grid);
          inverse(geographic, s.back.spec.params, out);
          for (let i = 0; i < 3; i++) {
            expect(Math.abs(out[i]! - grid[i]!)).toBeLessThan(1e-5);
          }
        }
      });
    });
  }

  it("takes a UTM grid point to the central meridian and the equator", () => {
    const [lon, lat] = forwardOf(utmToGeographic({ zone: 32 }), [500000, 0, 0]);
    expect(lon).toBeCloseTo(9, 12);
    expect(lat).toBeCloseTo(0, 12);
  });

  it("is the same edge under the same parameters as the projection", () => {
    const back = utmToGeographic({ zone: 48, hemisphere: "south" });
    expect(back.spec.params).toEqual(
      utm({ zone: 48, hemisphere: "south" }).spec.params,
    );
    expect(back.spec.separable).toEqual([]);
  });

  it("compiles in a route from grid to body-fixed metres, and routes back", () => {
    const graph = new TransformGraph();
    const earth = graph.root("earth");
    const geographic = graph.add("geographic", earth, geographicToGeocentric());
    const grid = graph.add(
      "grid",
      geographic,
      utmToGeographic({ zone: 48, hemisphere: "south" }),
    );
    const site = graph.add(
      "site",
      grid,
      affine({
        matrix: Float64Array.from([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 709000, 9325000, 3, 1,
        ]),
      }),
    );
    const up = routeBetween(site, earth);
    const compiled = compileRoute(up);
    expect(compiled.ok).toBe(true);
    const p = [120, -35, 4];
    const ecef = up.forward(p);
    const [lon, lat] = forwardOf(
      utmToGeographic({ zone: 48, hemisphere: "south" }),
      [709000 + 120, 9325000 - 35, 7],
    );
    const expected = ecefOf(lon!, lat!, 7);
    for (let i = 0; i < 3; i++) {
      expect(ecef[i]).toBeCloseTo(expected[i]!, 5);
    }
    const down = routeBetween(earth, site).forward(ecef);
    for (let i = 0; i < 3; i++) {
      expect(down[i]).toBeCloseTo(p[i]!, 5);
    }
  });
});

describe("verticalExaggeration with a ceiling", () => {
  const options = {
    factor: 4,
    ceiling: 5000,
    baseHeight: 200,
    band: 1000,
  };
  const edge = verticalExaggerationEdge(options);
  const ecef = ecefOf;

  it("is the built-in's function, Jacobian and inverse, below, across and above the ceiling", () => {
    const warp = verticalExaggeration(options);
    const r = rng(3);
    const mine = new Float64Array(3);
    const theirs = new Float64Array(3);
    const myJ = new Float64Array(9);
    const theirJ = new Float64Array(9);
    const back = new Float64Array(3);
    for (const h of [-100, 200, 1500, 4200, 4800, 5000, 5600, 12000]) {
      const p = ecef(between(r, -180, 180), between(r, -85, 85), h);
      warp.forward(p, mine, myJ);
      edge.spec.forward(p, edge.spec.params, theirs, theirJ);
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(mine[i]! - theirs[i]!)).toBeLessThan(1e-6);
      }
      for (let i = 0; i < 9; i++) {
        expect(Math.abs(myJ[i]! - theirJ[i]!)).toBeLessThan(1e-9);
      }
      warp.inverse!(mine, back);
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(back[i]! - p[i]!)).toBeLessThan(1e-6);
      }
    }
  });

  it("lifts above the ceiling by a constant, and has no height scale to declare", () => {
    const warp = verticalExaggeration(options);
    expect(warp.heightScale).toBeUndefined();
    expect(verticalExaggeration({ factor: 4 }).heightScale).toBeDefined();
    const lift = (h: number) => {
      const p = ecef(10, 40, h);
      const q = warp.forward(p, new Float64Array(3));
      return Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!, q[2]! - p[2]!);
    };
    // (k - 1) (ceiling - base - band / 2) = 3 · 4300.
    expect(lift(5000)).toBeCloseTo(12900, 6);
    expect(lift(30000)).toBeCloseTo(12900, 6);
    expect(lift(1200)).toBeCloseTo(3000, 6);
  });

  it("hands the compiler the built-in with its ceiling, and follows its setters", () => {
    const warp = verticalExaggeration(options);
    const first = warp.smooth!;
    expect(first.params).toMatchObject(options);
    const revision = warp.revision;
    warp.ceiling = 9000;
    warp.factor = 2;
    expect(warp.revision).toBe(revision + 2);
    expect(warp.smooth!.params).toMatchObject({
      factor: 2,
      ceiling: 9000,
      baseHeight: 200,
      band: 1000,
    });
    warp.band = undefined;
    expect(warp.smooth!.params.band).toBeCloseTo(0.2 * (9000 - 200), 9);
    warp.ceiling = undefined;
    expect(warp.smooth!.params.ceiling).toBeGreaterThan(1e8);
    expect(warp.heightScale).toBeDefined();
  });

  it("refuses a ceiling at or below the base, or a band that is not positive", () => {
    expect(() => verticalExaggeration({ factor: 2, ceiling: 0 })).toThrow(
      /above the base/,
    );
    expect(() =>
      verticalExaggeration({ factor: 2, ceiling: 100, band: 0 }),
    ).toThrow(/band/);
    const warp = verticalExaggeration({ factor: 2, ceiling: 100 });
    expect(() => {
      warp.baseHeight = 500;
    }).toThrow(/above the base/);
    expect(warp.baseHeight).toBe(0);
  });

  it("scales with a slider: at scale s heights go to 1 + s (k - 1) times, ceiling and all", () => {
    const scale = { value: 0.5 };
    const warp = verticalExaggeration({ ...options, scale });
    expect(warp.scale).toBe(scale);
    const half = verticalExaggerationEdge({ ...options, factor: 2.5 });
    const p = ecef(5, 20, 3000);
    const full = warp.forward(p, new Float64Array(3));
    const expected = forwardOf(half, p);
    // The engine scales the displacement: p + s (full - p).
    for (let i = 0; i < 3; i++) {
      expect(p[i]! + scale.value * (full[i]! - p[i]!)).toBeCloseTo(
        expected[i]!,
        6,
      );
    }
  });
});

describe("liveEdge", () => {
  const spec = (edge: SmoothEdge) => liveEdge(edge, { description: "a twist" });

  it("evaluates the edge with its parameters now, and says it changed when they do", () => {
    const live = spec(twist({ rate: 0.01 }));
    const out = new Float64Array(3);
    live.forward([10, 0, 5], out);
    const before = [...out];
    const revision = live.revision;
    live.setParams({ rate: 0.02 });
    expect(live.revision).toBe(revision + 1);
    live.forward([10, 0, 5], out);
    expect(out[1]).not.toBeCloseTo(before[1]!, 6);
    expect(live.smooth.params.rate).toBe(0.02);
    expect(() => live.setParams({ speed: 1 })).toThrow(/no parameter speed/);
  });

  it("takes a Jacobian by differences where the edge writes none, and writes the analytic one where it does", () => {
    const grid = spec(utmToGeographic({ zone: 32 }));
    const j = new Float64Array(9);
    const out = new Float64Array(3);
    grid.forward([500000, 5_300_000, 0], out, j);
    // d(longitude)/d(easting) is about 1 / (111320 cos φ · k) degrees per metre.
    expect(j[0]).toBeGreaterThan(1e-5);
    expect(j[0]).toBeLessThan(2e-5);
    expect(j.some(Number.isNaN)).toBe(false);
    expect(j[8]).toBeCloseTo(1, 9);
    const analytic = spec(webMercatorToGeographic());
    analytic.forward([1e6, 5e6, 0], out, j);
    expect(j[0]).toBeCloseTo(1 / (6378137 * (Math.PI / 180)), 12);
  });
});
