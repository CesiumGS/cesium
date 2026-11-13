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
import { writeFileSync } from "node:fs";
import { composeBox } from "../src/scene/routeBounds.ts";
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

/** East, north and up (columns) at a longitude and latitude in degrees. */
function enu(lon: number, lat: number): number[] {
  const l = (lon * Math.PI) / 180;
  const p = (lat * Math.PI) / 180;
  const up = [
    Math.cos(p) * Math.cos(l),
    Math.cos(p) * Math.sin(l),
    Math.sin(p),
  ];
  const east = [-Math.sin(l), Math.cos(l), 0];
  const north = [
    up[1]! * east[2]! - up[2]! * east[1]!,
    up[2]! * east[0]! - up[0]! * east[2]!,
    up[0]! * east[1]! - up[1]! * east[0]!,
  ];
  return [...east, ...north, ...up];
}

/** Half axes of a box with half extents `h` along east, north and up at (lon, lat). */
function boxAxes(lon: number, lat: number, h: number[]): number[] {
  const b = enu(lon, lat);
  return [0, 1, 2].flatMap((k) => [0, 1, 2].map((r) => b[k * 3 + r]! * h[k]!));
}

const sphereAxes = (r: number) => [r, 0, 0, 0, r, 0, 0, 0, r];

const lines: string[] = [];

/**
 * The composed box against a dense sample of the image of the region: a
 * 9 × 9 × 9 grid of it with its faces' grid. `outside` is how far a sampled
 * image lies past the box along its axes (m), `ratios` the box's half
 * lengths over the sampled extents along them.
 */
function measure(route: Route, c: number[], axes: number[]) {
  const composed = composeBox(route, undefined, new Map(), c, axes);
  expect(composed).toBeDefined();
  const box = composed!;
  const unit = [0, 1, 2].map((i) => {
    const len = Math.hypot(
      box.axes[i * 3]!,
      box.axes[i * 3 + 1]!,
      box.axes[i * 3 + 2]!,
    );
    return { len, u: [0, 1, 2].map((r) => box.axes[i * 3 + r]! / len) };
  });
  const extent = [0, 0, 0];
  const image = new Float64Array(3);
  for (let i = -4; i <= 4; i++) {
    for (let j = -4; j <= 4; j++) {
      for (let k = -4; k <= 4; k++) {
        const t = [i / 4, j / 4, k / 4];
        const p = [0, 1, 2].map(
          (r) =>
            c[r]! +
            axes[r]! * t[0]! +
            axes[3 + r]! * t[1]! +
            axes[6 + r]! * t[2]!,
        );
        routeForward(route, p, image);
        for (let a = 0; a < 3; a++) {
          const d = [0, 1, 2].reduce(
            (sum, r) => sum + (image[r]! - box.center[r]!) * unit[a]!.u[r]!,
            0,
          );
          extent[a] = Math.max(extent[a]!, Math.abs(d));
        }
      }
    }
  }
  const outside = Math.max(...unit.map((u, a) => extent[a]! - u.len));
  const ratios = unit.map((u, a) => u.len / extent[a]!);
  return { box, outside, ratios };
}

function check(
  name: string,
  route: Route,
  c: number[],
  axes: number[],
  most: number,
): void {
  const { outside, ratios } = measure(route, c, axes);
  lines.push(`${name}: ${ratios.map((r) => r.toFixed(3)).join(" ")}`);
  expect(outside, name).toBeLessThan(1e-6 * Math.max(1, ...axes.map(Math.abs)));
  expect(Math.max(...ratios), name).toBeLessThanOrEqual(most);
}

describe("composed boxes", () => {
  // Measured ratios (the box's half length over the sampled extent, per
  // axis): 1.0 to 1.2 for the exaggeration up to 10 km regions (a flat
  // 100 x 100 x 1 km tile at 5 km under x10 with a 9 km ceiling: 1.00, 1.00,
  // 1.34); a 200 km flat region at the ceiling reaches 4.4 vertically, where
  // the largest slope in reach overstates a displacement that falls to 0.
  // UTM: up to 1.5.
  it("hold the exaggeration's image of spheres and flat boxes", () => {
    for (const ceiling of [9000, 1e9]) {
      for (const factor of [1, 2, 5, 10]) {
        const route = routeOf(verticalExaggerationEdge({ factor, ceiling }));
        for (const r of [100, 1000, 10_000, 100_000]) {
          for (const h of [0, 3000, 6000, 9000]) {
            const c = ecef(-105, 40, h);
            check(
              `ex c=${ceiling} k=${factor} sphere r=${r} h=${h}`,
              route,
              c,
              sphereAxes(r),
              r > 10_000 ? 4.5 : 1.6,
            );
            check(
              `ex c=${ceiling} k=${factor} flat r=${r} h=${h}`,
              route,
              c,
              boxAxes(-105, 40, [r, r, Math.max(1, r / 100)]),
              r > 10_000 ? 4.5 : 1.6,
            );
          }
        }
      }
    }
  });

  it("hold the flat tile at 5 km under a x10 exaggeration with a 9 km ceiling", () => {
    const route = routeOf(
      verticalExaggerationEdge({ factor: 10, ceiling: 9000 }),
    );
    check(
      "flat 100x100x1 km",
      route,
      ecef(-105, 40, 5000),
      boxAxes(-105, 40, [50_000, 50_000, 500]),
      1.5,
    );
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
          check(
            `utm ${lon},${lat} sphere r=${r} h=${h}`,
            route,
            c,
            sphereAxes(r),
            1.6,
          );
          check(
            `utm ${lon},${lat} flat r=${r} h=${h}`,
            route,
            c,
            boxAxes(lon, lat, [r, r, Math.max(1, r / 100)]),
            1.6,
          );
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
    ];
    for (const [name, route, c] of cases) {
      for (const r of [10, 100, 1000]) {
        check(`${name} sphere r=${r}`, route, c, sphereAxes(r), 1.6);
        check(
          `${name} flat r=${r}`,
          route,
          c,
          boxAxes(10, 50, [r, r, r / 50]),
          1.6,
        );
      }
    }
    const plain: [string, Route, number[]][] = [
      [
        "scaleAbout",
        routeOf(scaleAboutEdge({ center: [1, 2, 3], factors: [2, 3, 0.5] })),
        [100, 200, 300],
      ],
      ["bend", routeOf(bend({ curvature: 0.002 })), [100, 20, 30]],
    ];
    for (const [name, route, c] of plain) {
      for (const r of [10, 100, 300]) {
        check(`${name} sphere r=${r}`, route, c, sphereAxes(r), 1.6);
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
      composeBox(route, undefined, new Map(), ecef(0, 0, 0), sphereAxes(100)),
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
      box: (c, axes) => ({
        center: Float64Array.of(c[0]!, c[1]!, c[2]!),
        axes: Float64Array.from(axes, (v) => 3 * v),
        sigmaMax: 3,
      }),
    };
    const none: TileWarp = { ...base, box: () => undefined };
    const a = drawnTile(make(), composed);
    expect(sampled).toBe(0);
    expect(a.sigmaMax).toBe(3);
    // The box's half axes are 10, tripled.
    expect(a.volume.kind === "box" && a.volume.obb.halfAxes[0]).toBe(30);
    const b = drawnTile(make(), none);
    expect(sampled).toBe(1);
    expect(b.sigmaMax).toBe(2);
  });

  it("writes the ratios", () => {
    if (process.env.SHOW_RATIOS) {
      writeFileSync(process.env.SHOW_RATIOS, lines.join("\n"));
    }
  });
});
