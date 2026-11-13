// A sphere carried through a route by declared bounds (scene/routeBounds.ts,
// plan 2026-11-12 task 12 fix 2): it must hold a dense sample of the route's
// image of the sphere, within about 1.5 times the sampled radius, for the
// vertical exaggeration (with and without a ceiling) and a UTM route; a route
// with a step that has no bound is not composed (it is sampled instead).
import { describe, expect, it } from "vitest";
import type { FrameKey } from "../src/camera/frameResolver.ts";
import { routeForward, type Route, type Warp } from "../src/camera/route.ts";
import {
  geocentricToGeographic,
  geographicToGeocentric,
} from "../src/georeference/geocentric.ts";
import { heightOffsetEdge } from "../src/georeference/heightOffset.ts";
import { utm } from "../src/georeference/transverseMercator.ts";
import { verticalExaggerationEdge } from "../src/georeference/verticalExaggeration.ts";
import { webMercator } from "../src/georeference/webMercator.ts";
import { treeFromJson } from "../src/streaming/Tile.ts";
import { drawnTile, type TileWarp } from "../src/streaming/tileWarp.ts";
import { composeSphere } from "../src/scene/routeBounds.ts";
import { scaleAboutEdge } from "../src/transforms/scaleAbout.ts";
import { bend } from "../src/transforms/bend.ts";
import { smooth, type SmoothEdge } from "../src/transform/graph.ts";

const KEY = { name: "x" } as unknown as FrameKey;

function warpOf(edge: SmoothEdge): Warp {
  const spec = edge.spec;
  return {
    from: KEY,
    to: KEY,
    revision: 0,
    smooth: spec,
    forward(p, out, jacobian) {
      spec.forward(p, spec.params, out, jacobian);
      return out;
    },
  };
}

function routeOf(...edges: SmoothEdge[]): Route {
  return {
    frame: KEY,
    base: KEY,
    seconds: 0,
    revision: 0,
    steps: edges.map((e) => ({
      kind: "warp" as const,
      warp: warpOf(e),
      inverse: false,
    })),
  };
}

const toEcef = geographicToGeocentric().spec;

function ecef(lon: number, lat: number, h: number): number[] {
  const out = new Float64Array(3);
  toEcef.forward([lon, lat, h], toEcef.params, out);
  return [...out];
}

/** A sample of the sphere: a 9 × 9 × 9 grid inside it, the same directions on its surface, and its 8 cube corners' directions. */
function sample(c: ArrayLike<number>, r: number): number[][] {
  const points: number[][] = [];
  for (let i = -4; i <= 4; i++) {
    for (let j = -4; j <= 4; j++) {
      for (let k = -4; k <= 4; k++) {
        const d = [i / 4, j / 4, k / 4];
        const len = Math.hypot(d[0]!, d[1]!, d[2]!);
        if (len === 0) {
          continue;
        }
        for (const s of len <= 1 ? [1, 1 / len] : [1 / len]) {
          points.push([0, 1, 2].map((a) => c[a]! + d[a]! * s * r));
        }
      }
    }
  }
  return points;
}

/** Sphere radius in metres and, in a geographic node's input, in the node's local metric (the caller makes the centre). */
function measure(route: Route, c: number[], r: number) {
  const composed = composeSphere(route, undefined, new Map(), c, r);
  expect(composed).toBeDefined();
  const image = new Float64Array(3);
  routeForward(route, c, image);
  let sampled = 0;
  let outside = 0;
  for (const p of sample(c, r)) {
    const q = routeForward(route, p, new Float64Array(3));
    const d = Math.hypot(
      q[0]! - composed!.center[0]!,
      q[1]! - composed!.center[1]!,
      q[2]! - composed!.center[2]!,
    );
    sampled = Math.max(sampled, d);
    outside = Math.max(outside, d - composed!.radius);
  }
  return { composed: composed!, sampled, outside };
}

describe("composed spheres", () => {
  // Measured ratios (composed radius over sampled): 1.0 to 1.07 for UTM,
  // 1.0 to 1.22 for the exaggeration except where a sphere straddles the top
  // of the blend band (k 5 to 10 at the ceiling, r = 1 km: up to 1.72), where
  // the largest slope in reach overstates a displacement that falls to 0.
  it("hold the exaggeration's image, within 2 times the sampled radius", () => {
    for (const ceiling of [9000, 1e9]) {
      for (const factor of [1, 2, 5, 10]) {
        const route = routeOf(verticalExaggerationEdge({ factor, ceiling }));
        for (const r of [100, 1000, 10_000, 100_000]) {
          for (const h of [0, 3000, 6000, 9000]) {
            const c = ecef(-105, 40, h);
            const { composed, sampled, outside } = measure(route, c, r);
            const ratio = composed.radius / sampled;
            expect(outside).toBeLessThan(1e-6 * Math.max(1, r));
            expect(ratio).toBeLessThanOrEqual(2);
          }
        }
      }
    }
  });

  it("hold a UTM route's image (geocentric to geographic, then UTM zone 13)", () => {
    const route = routeOf(
      geocentricToGeographic(),
      utm({ zone: 13, hemisphere: "north" }),
    );
    for (const [lon, lat] of [
      [-105, 40],
      [-102, 10],
      [-108, 60],
      [-99, 0],
    ] as const) {
      for (const r of [100, 1000, 10_000, 100_000]) {
        for (const h of [0, 4500, 9000]) {
          const c = ecef(lon, lat, h);
          const { sampled, outside, composed } = measure(route, c, r);
          const ratio = composed.radius / sampled;
          expect(outside).toBeLessThan(1e-6 * Math.max(1, r));
          expect(ratio).toBeLessThanOrEqual(1.5);
        }
      }
    }
  });

  it("hold the other built-ins' image", () => {
    const cases: [string, Route, number[]][] = [
      [
        "heightOffset",
        routeOf(heightOffsetEdge({ offset: 500 })),
        ecef(10, 50, 1000),
      ],
      [
        "webMercator",
        routeOf(geocentricToGeographic(), webMercator()),
        ecef(10, 50, 1000),
      ],
      [
        "ecef round trip",
        routeOf(geocentricToGeographic(), geographicToGeocentric()),
        ecef(10, 50, 1000),
      ],
      [
        "scaleAbout",
        routeOf(scaleAboutEdge({ center: [1, 2, 3], factors: [2, 3, 0.5] })),
        [100, 200, 300],
      ],
      ["bend", routeOf(bend({ curvature: 0.002 })), [100, 20, 30]],
    ];
    for (const [name, route, c] of cases) {
      for (const r of [10, 100, 300]) {
        const { sampled, outside, composed } = measure(route, c, r);
        expect(outside).toBeLessThan(1e-6 * Math.max(1, r));
        // scaleAbout's stretch is 3 in one direction and 0.5 in another.
        expect(composed.radius / sampled, `${name} r=${r}`).toBeLessThanOrEqual(
          name === "scaleAbout" ? 3.1 : 2.5,
        );
      }
    }
  });

  it("is undefined for a route with a step that has no bound, so it is sampled", () => {
    const route = routeOf(
      verticalExaggerationEdge({ factor: 3, ceiling: 9000 }),
      smooth({
        params: {},
        forward: (p, _params, out) => {
          out[0] = p[0]! * 1.5;
          out[1] = p[1]!;
          out[2] = p[2]!;
        },
      }),
    );
    expect(
      composeSphere(route, undefined, new Map(), ecef(0, 0, 0), 100),
    ).toBeUndefined();
  });

  it("drives drawnTile: composed where the warp has a sphere, sampled where it has none", () => {
    const tree = {
      warnings: new Set<string>(),
      tilesAdded: () => {},
    } as unknown as Parameters<typeof treeFromJson>[3];
    const make = () =>
      treeFromJson(
        {
          asset: { version: "1.1" },
          geometricError: 100,
          root: {
            geometricError: 10,
            boundingVolume: {
              box: [100, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10],
            },
          },
        },
        "https://tiles.test/t.json",
        undefined,
        tree,
      ).root;
    let sampled = 0;
    const base = {
      version: 1,
      fitVersion: 0,
      bounds(): ReturnType<TileWarp["bounds"]> {
        sampled++;
        return {
          center: Float64Array.of(1, 2, 3),
          radius: 7,
          sigmaMin: 1,
          sigmaMax: 2,
          secondDerivative: 0,
        };
      },
      fitError: () => 0,
    };
    const composed: TileWarp = {
      ...base,
      sphere: (c, r) => ({
        center: Float64Array.of(c[0]!, c[1]!, c[2]!),
        radius: 3 * r,
        sigmaMax: 3,
      }),
    };
    const none: TileWarp = { ...base, sphere: () => undefined };
    const a = drawnTile(make(), composed);
    expect(sampled).toBe(0);
    expect(a.sigmaMax).toBe(3);
    // The box's corners are 10·√3 from its centre.
    expect(a.volume.kind === "sphere" && a.volume.sphere.radius).toBeCloseTo(
      30 * Math.sqrt(3),
      9,
    );
    const b = drawnTile(make(), none);
    expect(sampled).toBe(1);
    expect(b.sigmaMax).toBe(2);
  });
});
