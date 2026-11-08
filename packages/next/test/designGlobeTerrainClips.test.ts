// The design globe's terrain clips (feedback F11): each site's footprint,
// padded, and the corridor's strip, as polygons in geodetic degrees.
import { describe, expect, it } from "vitest";
import { Alignment } from "../src/engineering/alignment.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import {
  CORRIDOR_ALIGNMENT,
  STRUCTURES,
} from "../examples/design-globe/corridor.ts";
import { PORTFOLIO, modelRoute } from "../examples/design-globe/sites.ts";
import {
  STRIP_SLIVER,
  footprintRegion,
  geodeticOf,
  horizontalApart,
  routeRegion,
  stripRegion,
} from "../examples/design-globe/terrainClips.ts";

const R = Math.PI / 180;
/** A toy placement: a design unit is 1e-5° east or north of (10°, 50°). */
const displayed = (d: ArrayLike<number>) =>
  Ellipsoid.WGS84.cartographicToCartesian(
    {
      longitude: (10 + d[0]! * 1e-5) * R,
      latitude: (50 + d[1]! * 1e-5) * R,
      height: d[2]!,
    },
    new Float64Array(3),
  );

/** A clip vertex back in the toy placement's design units. */
const design = (v: { longitude: number; latitude: number }) => [
  (v.longitude - 10) / 1e-5,
  (v.latitude - 50) / 1e-5,
];

describe("terrain clip regions", () => {
  it("round-trips a point's longitude and latitude", () => {
    const g = geodeticOf(displayed([100, -200, 30]));
    expect(g.longitude).toBeCloseTo(10.001, 9);
    expect(g.latitude).toBeCloseTo(49.998, 9);
  });

  it("pads a footprint outward from its middle", () => {
    const corners: [number, number, number][] = [
      [0, 0, 0],
      [100, 0, 0],
      [100, 100, 0],
      [0, 100, 0],
    ];
    const p = footprintRegion(corners, displayed, 10 * Math.SQRT2);
    expect(p).toHaveLength(4);
    expect(p[0]!.longitude).toBeCloseTo(10 - 10e-5, 9);
    expect(p[0]!.latitude).toBeCloseTo(50 - 10e-5, 9);
    expect(p[2]!.longitude).toBeCloseTo(10 + 110e-5, 9);
    expect(p[2]!.latitude).toBeCloseTo(50 + 110e-5, 9);
  });

  it("runs the corridor's strip down one edge and back the other, within the clip's vertex limit", () => {
    const alignment = new Alignment(CORRIDOR_ALIGNMENT);
    const p = stripRegion(alignment, (d) => d, 52, 500);
    const perSide =
      Math.ceil((alignment.endStation - alignment.startStation) / 500) + 1;
    expect(p).toHaveLength(2 * perSide);
    expect(p.length).toBeLessThanOrEqual(1024);
  });

  it("narrows the strip to a sliver over the structures, within the clip's vertex limit", () => {
    const alignment = new Alignment(CORRIDOR_ALIGNMENT);
    const p = stripRegion(alignment, (d) => d, 52, 500, STRUCTURES);
    expect(p.length).toBeLessThanOrEqual(1024);
    // A toy: three gaps, two meeting and one at the very end.
    const toy = new Alignment({
      name: "toy",
      start: [0, 0],
      startAzimuth: Math.PI / 2,
      startStation: 0,
      horizontal: [{ kind: "line", length: 5_000 }],
    });
    const flat = (d: ArrayLike<number>) => displayed([d[0]!, d[1]!, 0]);
    const q = stripRegion(toy, flat, 50, 500, [
      { fromStation: 1_000, toStation: 2_000 },
      { fromStation: 2_000, toStation: 2_500 },
      { fromStation: 4_000, toStation: 5_000 },
    ]).map(design);
    const leftQ = q.slice(0, q.length / 2);
    // East along the toy line; north is the offset, positive to the left.
    expect(
      leftQ.map(([e, n]) => [Math.round(e!), Number(n!.toFixed(3))]),
    ).toEqual([
      [0, 50],
      [500, 50],
      [1_000, 50],
      [1_000, STRIP_SLIVER],
      [2_000, STRIP_SLIVER],
      [2_500, STRIP_SLIVER],
      [2_500, 50],
      [3_000, 50],
      [3_500, 50],
      [4_000, 50],
      [4_000, STRIP_SLIVER],
      [5_000, STRIP_SLIVER],
    ]);
  });

  it("buffers a route: mitred at its corner, squared off past its ends", () => {
    // East 100, then north 100; 10 either side.
    const route: [number, number, number][] = [
      [0, 0, 0],
      [100, 0, 0],
      [100, 100, 0],
    ];
    const p = routeRegion(route, displayed, () => 10, 50).map(design);
    // Each side: the start, the first leg's middle, the corner, the second
    // leg's middle and the end; the left side out, the right side back.
    expect(p).toHaveLength(10);
    const expected = [
      [-10, 10],
      [50, 10],
      [90, 10],
      [90, 50],
      [90, 110],
      [110, 110],
      [110, 50],
      [110, -10],
      [50, -10],
      [-10, -10],
    ];
    p.forEach(([e, n], i) => {
      expect(e, `vertex ${i} east`).toBeCloseTo(expected[i]![0]!, 4);
      expect(n, `vertex ${i} north`).toBeCloseTo(expected[i]![1]!, 4);
    });
  });

  it("clips London's pole line around its wayleave, within the clip's vertex limit", () => {
    const london = PORTFOLIO.find((s) => s.id === "london")!;
    const route = modelRoute(london)!;
    // The wayleave strip, 12 m wide, holds the poles and their stays.
    expect(route.halfWidth).toBe(6);
    expect(route.points).toHaveLength(6);
    const p = routeRegion(route.points, displayed, () => 12, 500);
    expect(p.length).toBeGreaterThan(100);
    expect(p.length).toBeLessThanOrEqual(1024);
    // Every model but the pole line covers its footprint.
    for (const site of PORTFOLIO) {
      expect(modelRoute(site) !== undefined, site.id).toBe(
        site.model.kind === "poleLine",
      );
    }
  });

  it("measures how far apart two points are across the ground, not up", () => {
    const a = displayed([0, 0, 0]);
    const up = displayed([0, 0, 25]);
    expect(horizontalApart(up, a)).toBeLessThan(1e-6);
    // 1e-4° of latitude at 50°: about 11.1 m, whatever the height.
    const north = displayed([0, 10, 25]);
    expect(horizontalApart(north, a)).toBeCloseTo(11.12, 1);
  });
});
