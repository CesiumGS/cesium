// The design globe's terrain clips (feedback F11): each site's footprint,
// padded, and the corridor's strip, as polygons in geodetic degrees.
import { describe, expect, it } from "vitest";
import { Alignment } from "../src/engineering/alignment.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { CORRIDOR_ALIGNMENT } from "../examples/design-globe/corridor.ts";
import {
  PORTFOLIO,
  SITE_BUILDING,
  modelOnGround,
  modelRoute,
} from "../examples/design-globe/sites.ts";
import { SITES, siteById } from "../examples/design-globe/page.ts";
import {
  EARTHWORK,
  SIDE_SLOPES,
  daylightBreaks,
  daylightLine,
  daylightRise,
  slopeSection,
} from "../examples/design-globe/sideSlopes.ts";
import {
  CORRIDOR_CLIP_PLANS,
  STRIP_SLIVER,
  daylightPieces,
  daylightRegion,
  footprintRegion,
  geodeticOf,
  horizontalApart,
  routeRegion,
  siteClipRegion,
  syncUnderground,
  undergroundRegion,
  UNDERGROUND_HALF_WIDTH,
  UNDERGROUND_OPACITY,
  type DaylightStretch,
} from "../examples/design-globe/terrainClips.ts";
import type { Globe } from "../src/globe/Globe.ts";
import {
  MAX_CLIP_CELL_EDGES,
  MAX_CLIP_FRAGMENT_EDGES,
  MAX_TERRAIN_CLIP_VERTICES,
  compileTerrainClip,
} from "../src/globe/terrainClip.ts";

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

  it("runs the corridor's clip down its left daylight line and back its right, a sliver over its structures", () => {
    const toy = new Alignment({
      name: "toy",
      start: [0, 0],
      startAzimuth: Math.PI / 2,
      startStation: 0,
      horizontal: [{ kind: "line", length: 5_000 }],
    });
    const flat = (d: ArrayLike<number>) => displayed([d[0]!, d[1]!, 0]);
    // Earthwork 0 to 1,000 and 2,500 to 4,000; structures between and after.
    const stretches: DaylightStretch[] = [
      {
        fromStation: 0,
        toStation: 1_000,
        left: [
          [0, 50],
          [1_000, 60],
        ],
        right: [
          [0, 45],
          [1_000, 45],
        ],
      },
      {
        fromStation: 2_500,
        toStation: 4_000,
        left: [
          [2_500, 70],
          [4_000, 50],
        ],
        right: [
          [2_500, 41],
          [4_000, 80],
        ],
      },
    ];
    const r = daylightRegion(toy, flat, stretches, 1024);
    expect(r.tolerance).toBe(0);
    expect(r.outward).toBe(0);
    const q = r.polygon.map(design);
    const left = q.slice(0, q.length / 2);
    // East along the toy line; north is the offset, positive to the left.
    expect(
      left.map(([e, n]) => [Math.round(e!), Number(n!.toFixed(3))]),
    ).toEqual([
      [0, 50],
      [1_000, 60],
      [1_000, STRIP_SLIVER],
      [2_500, STRIP_SLIVER],
      [2_500, 70],
      [4_000, 50],
      [4_000, STRIP_SLIVER],
      [5_000, STRIP_SLIVER],
    ]);
    const right = q.slice(q.length / 2).reverse();
    expect(right.map(([, n]) => Number(n!.toFixed(3)))).toEqual([
      -45,
      -45,
      -STRIP_SLIVER,
      -STRIP_SLIVER,
      -41,
      -80,
      -STRIP_SLIVER,
      -STRIP_SLIVER,
    ]);
  });

  it("simplifies a daylight line outward only, by the least tolerance that fits", () => {
    const toy = new Alignment({
      name: "toy",
      start: [0, 0],
      startAzimuth: Math.PI / 2,
      startStation: 0,
      horizontal: [{ kind: "line", length: 2_000 }],
    });
    const flat = (d: ArrayLike<number>) => displayed([d[0]!, d[1]!, 0]);
    // A wiggling line, every 10 ft.
    const line: [number, number][] = [];
    for (let s = 0; s <= 2_000; s += 10) {
      line.push([s, 60 + 15 * Math.sin(s / 70) + 5 * Math.sin(s / 13)]);
    }
    const stretches = [
      { fromStation: 0, toStation: 2_000, left: line, right: line },
    ];
    const r = daylightRegion(toy, flat, stretches, 80);
    expect(r.polygon.length).toBeLessThanOrEqual(80);
    expect(r.exactVertices).toBe(2 * line.length);
    expect(r.tolerance).toBeGreaterThan(0);
    const left = r.polygon.slice(0, r.polygon.length / 2).map(design);
    // The clip's edge at each of the line's stations: never inside it, and
    // never more than the tolerance outside.
    for (const [s, u] of line) {
      const k = left.findIndex(([e]) => e! >= s - 1e-6);
      const [e1, n1] = left[k]!;
      const [e0, n0] = left[Math.max(0, k - 1)]!;
      const t = e1 === e0 ? 1 : (s - e0!) / (e1! - e0!);
      const at = n0! + (n1! - n0!) * t;
      expect(at, `station ${s}`).toBeGreaterThanOrEqual(u - 1e-6);
      expect(at - u, `station ${s}`).toBeLessThanOrEqual(r.tolerance + 1e-6);
    }
  });

  describe("the corridor's clip", () => {
    const alignment = new Alignment(CORRIDOR_ALIGNMENT);
    // A local tangent mapping of the design's feet near the corridor
    // (37.8° N, 122° W): close enough to the real placement for the clip's
    // grid, and invertible, so containment is tested exactly.
    const FT = 1200 / 3937;
    const [E0, N0] = [6_080_000, 2_110_000];
    const [LON0, LAT0] = [-122.17, 37.78];
    const mPerDegLat = 110_990;
    const mPerDegLon = 111_320 * Math.cos(LAT0 * R);
    const place = (d: ArrayLike<number>) =>
      Ellipsoid.WGS84.cartographicToCartesian(
        {
          longitude: (LON0 + ((d[0]! - E0) * FT) / mPerDegLon) * R,
          latitude: (LAT0 + ((d[1]! - N0) * FT) / mPerDegLat) * R,
          height: 0,
        },
        new Float64Array(3),
      );
    const breaks = daylightBreaks();
    const stretches: DaylightStretch[] = EARTHWORK.map((range) => ({
      ...range,
      left: daylightLine(range, -1, breaks).map(([s, o]) => [s, -o] as const),
      right: daylightLine(range, 1, breaks),
    }));
    // The first plan whose every piece the globe's grid takes, as the page
    // does (the fragment budget over regions is checked as they're added).
    const fitted = CORRIDOR_CLIP_PLANS.map((plan) => {
      const regions = daylightPieces(alignment, stretches, plan.pieces).map(
        (range) =>
          daylightRegion(alignment, place, stretches, plan.vertices, range),
      );
      try {
        const shapes = regions.map((r) =>
          compileTerrainClip({ polygon: r.polygon }),
        );
        return { plan, regions, shapes };
      } catch {
        return undefined;
      }
    }).find((f) => f !== undefined)!;
    /** A clip vertex back in design feet. */
    const back = (v: { longitude: number; latitude: number }) => [
      E0 + ((v.longitude - LON0) * mPerDegLon) / FT,
      N0 + ((v.latitude - LAT0) * mPerDegLat) / FT,
    ];
    const rings = fitted.regions.map((r) => r.polygon.map(back));
    const inside = (x: number, y: number) =>
      rings.some((ring) => insideRing(ring, x, y));
    const insideRing = (ring: number[][], x: number, y: number) => {
      let odd = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!;
        const [xj, yj] = ring[j]!;
        if (
          yi! > y !== yj! > y &&
          x < ((xj! - xi!) * (y - yi!)) / (yj! - yi!) + xi!
        ) {
          odd = !odd;
        }
      }
      return odd;
    };

    it("fits the globe's limits: 1,024 vertices a region, 32 edges a cell, 128 a fragment", () => {
      expect(fitted).toBeDefined();
      fitted.regions.forEach((r, k) => {
        expect(r.polygon.length).toBeLessThanOrEqual(MAX_TERRAIN_CLIP_VERTICES);
        expect(fitted.shapes[k]!.maxCellEdges).toBeLessThanOrEqual(
          MAX_CLIP_CELL_EDGES,
        );
        // Neighbours touch in a structure's middle, where both are slivers.
        if (k > 0) {
          expect(r.fromStation).toBe(fitted.regions[k - 1]!.toStation);
        }
      });
      // A fragment tests at most the edges of every region it lies in.
      const overlapping = fitted.shapes.reduce(
        (n, sh) => n + sh.maxCellEdges,
        0,
      );
      expect(overlapping).toBeLessThanOrEqual(MAX_CLIP_FRAGMENT_EDGES);
      const outward = Math.max(...fitted.regions.map((r) => r.outward));
      expect(outward).toBeLessThan(1);
      console.info(
        `corridor clip: ${fitted.plan.pieces} regions of ${fitted.regions.map((r) => r.polygon.length).join(", ")} vertices (exact ${fitted.regions.map((r) => r.exactVertices).join(", ")}), tolerance ${Math.max(...fitted.regions.map((r) => r.tolerance)).toFixed(2)} ftUS, outward at most ${outward.toFixed(3)} ftUS, busiest cells ${fitted.shapes.map((sh) => sh.maxCellEdges).join(", ")} edges`,
      );
    });

    it("holds every side slope out to its daylight line, every 10 ftUS", () => {
      let checked = 0;
      for (const range of EARTHWORK) {
        // Within the stretch: its ends lie on the clip's cross edges.
        const at = [range.fromStation + 0.01, range.toStation - 0.01];
        for (let s = range.fromStation + 5; s < range.toStation; s += 10) {
          at.push(s);
        }
        for (const s of at) {
          for (const side of [-1, 1] as const) {
            const run = slopeSection(daylightRise(s, side)!).daylight[0];
            // A hair inside the daylight line is inside the clip.
            const o = side * (SIDE_SLOPES.hinge + run - 0.01);
            const p = alignment.pointAt(s, o);
            expect(inside(p[0]!, p[1]!), `station ${s}, offset ${o}`).toBe(
              true,
            );
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(10_000);
    });

    it("keeps the ground over a structure: a sliver there", () => {
      // Mid-span of the viaduct the answers cross, 43,700 to 47,300.
      for (const o of [-1, 1, -41, 41]) {
        const p = alignment.pointAt(45_500, o);
        expect(inside(p[0]!, p[1]!), `offset ${o}`).toBe(false);
      }
    });
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

  it("leaves the ground unclipped under a model that stands on it (UX review M1, M5)", () => {
    const rigid = { error: () => 0.5, across: () => 0.5 };
    // London's poles and the site-grid building stand on the real ground.
    expect(siteById("london").onGround).toBe(true);
    expect(siteById("site-building").onGround).toBe(true);
    for (const site of SITES) {
      if (site.id === "corridor") {
        continue; // clipped to its daylight lines (below)
      }
      const region = siteClipRegion(site, displayed, 1, rigid, 3);
      expect(region === undefined, site.id).toBe(site.onGround === true);
      expect(site.onGround === true, site.id).toBe(
        modelOnGround(PORTFOLIO.find((p) => p.id === site.id) ?? SITE_BUILDING),
      );
    }
    // Even with a route or corners, a model on the ground clears its clip.
    expect(
      siteClipRegion(
        { ...siteById("london"), onGround: true },
        displayed,
        1,
        rigid,
        3,
      ),
    ).toBeUndefined();
  });

  it("would clip a pole line on one plane around its wayleave, within the clip's vertex limit", () => {
    const london = PORTFOLIO.find((s) => s.id === "london")!;
    const model = london.model as Extract<
      typeof london.model,
      { kind: "poleLine" }
    >;
    const flat = { ...london, model: { ...model, ground: undefined } };
    expect(modelOnGround(flat)).toBe(false);
    const route = modelRoute(flat)!;
    // The wayleave strip, 12 m wide, holds the poles and their stays.
    expect(route.halfWidth).toBe(6);
    expect(route.points).toHaveLength(6);
    const p = siteClipRegion(
      { route },
      displayed,
      1,
      { error: () => 0, across: () => 6 },
      0,
    )!;
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

describe("see underground", () => {
  const alignment = new Alignment(CORRIDOR_ALIGNMENT);

  it("is a strip the globe takes: within a region's limits, its edges either side", () => {
    const polygon = undergroundRegion(
      alignment,
      displayed,
      UNDERGROUND_HALF_WIDTH,
      500,
    );
    // A vertex each 500 ftUS along both sides, ends included.
    const stations = Math.ceil(
      (alignment.endStation - alignment.startStation) / 500,
    );
    expect(polygon).toHaveLength(2 * (stations + 1));
    expect(polygon.length).toBeLessThanOrEqual(MAX_TERRAIN_CLIP_VERTICES);
    const shape = compileTerrainClip({ polygon }, Ellipsoid.WGS84);
    expect(shape.maxCellEdges).toBeLessThanOrEqual(MAX_CLIP_CELL_EDGES);
    // Each side stands off the centreline by the half-width.
    for (const [i, s] of [
      [0, alignment.startStation],
      [stations, alignment.endStation],
    ] as const) {
      const left = design(polygon[i]!);
      const [e, n] = alignment.pointAt(s, -UNDERGROUND_HALF_WIDTH);
      expect(left[0]).toBeCloseTo(e!, 3);
      expect(left[1]).toBeCloseTo(n!, 3);
    }
    expect(() => undergroundRegion(alignment, displayed, 0, 500)).toThrow(
      RangeError,
    );
  });

  it("draws pieces at an opacity, picks through, replacing what it made; and says why it couldn't", () => {
    const added: { region: unknown; options: unknown; remove(): void }[] = [];
    let refuse = false;
    const globe = {
      terrain: {
        addRegion(region: unknown, options: unknown) {
          if (refuse && added.length > 0) {
            throw new Error("too many edges");
          }
          const handle = {
            region,
            options,
            remove() {
              added.splice(added.indexOf(handle), 1);
            },
          };
          added.push(handle);
          return handle;
        },
      },
    } as unknown as Globe;
    const a = [{ longitude: 0, latitude: 0 }];
    const b = [{ longitude: 1, latitude: 1 }];
    expect(syncUnderground(globe, [a], UNDERGROUND_OPACITY)).toBeUndefined();
    expect(added.map(({ region, options }) => ({ region, options }))).toEqual([
      {
        region: { polygon: a },
        options: { opacity: UNDERGROUND_OPACITY, pickThrough: true },
      },
    ]);
    // Again: the old one goes first.
    expect(syncUnderground(globe, [b], UNDERGROUND_OPACITY)).toBeUndefined();
    expect(added.map((x) => x.region)).toEqual([{ polygon: b }]);
    // A refused piece leaves nothing behind, and says why.
    refuse = true;
    expect(syncUnderground(globe, [a, b], UNDERGROUND_OPACITY)).toBe(
      "too many edges",
    );
    expect(added).toEqual([]);
    refuse = false;
    // None: opaque again.
    expect(syncUnderground(globe, [a], UNDERGROUND_OPACITY)).toBeUndefined();
    expect(syncUnderground(globe, [], UNDERGROUND_OPACITY)).toBeUndefined();
    expect(added).toEqual([]);
  });
});
