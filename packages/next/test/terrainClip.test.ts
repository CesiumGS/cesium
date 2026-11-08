import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  MAX_TERRAIN_CLIP_VERTICES,
  TerrainClips,
  clipPlane,
  compileTerrainClip,
  insideClipShape,
  packClipShape,
  rectanglesOverlap,
  type TerrainClipRegion,
} from "../src/globe/terrainClip.ts";
import { castTerrainRay } from "../src/globe/terrainRay.ts";
import { TerrainSource } from "../src/globe/TerrainSource.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { splitVec3 } from "../src/math/transforms.ts";
import {
  CLIP_BLOCK_ROWS,
  MAX_TERRAIN_CLIPS,
  TERRAIN_CLIP_WORD,
  RECORD_WORDS,
} from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import { A, at, gridTile, stripTarget } from "./terrainRayFixtures.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = Math.PI / 180;
const WGS84 = Ellipsoid.WGS84;

/** A set of clips, each at its own slot, from regions. */
function clipsOf(...regions: TerrainClipRegion[]): TerrainClips {
  const clips = new TerrainClips();
  regions.forEach((region, slot) =>
    clips.add({ clip: { region }, shape: compileTerrainClip(region), slot }),
  );
  return clips;
}

/** Meters north (+) of a latitude, in degrees. */
const metersNorth = (m: number) => m / 6_367_000 / R;

describe("terrain clip regions", () => {
  it("contains points of a rectangle across the antimeridian", () => {
    const clips = clipsOf({
      rectangle: { west: 179.9, south: 10, east: -179.9, north: 10.1 },
    });
    for (const lon of [180, -180, 179.95, -179.95, 179.901, -179.901]) {
      expect(clips.clippedAt(lon * R, 10.05 * R), `${lon}`).toBe(true);
    }
    for (const lon of [179.8, -179.8, 0, 90]) {
      expect(clips.clippedAt(lon * R, 10.05 * R), `${lon}`).toBe(false);
    }
    expect(clips.clippedAt(180 * R, 10.2 * R)).toBe(false);
    expect(clips.clippedAt(180 * R, 9.9 * R)).toBe(false);
    // Its bounds wrap: west > east, and both sides of 180° overlap it.
    const b = clips.entries[0]!.shape.bounds;
    expect(b.west).toBeGreaterThan(b.east);
    expect(
      rectanglesOverlap(b, { west: 3, south: 0, east: Math.PI, north: 0.5 }),
    ).toBe(true);
    expect(
      rectanglesOverlap(b, { west: -Math.PI, south: 0, east: -3, north: 0.5 }),
    ).toBe(true);
  });

  it("follows a rectangle's parallels and meridians to a centimeter", () => {
    // 20 km wide at 47°: a parallel bows 4 m from its chord there.
    const clips = clipsOf({
      rectangle: { west: -121.9, south: 46.8, east: -121.64, north: 46.9 },
    });
    for (const lon of [-121.899, -121.8, -121.77, -121.641]) {
      for (const [lat, sign] of [
        [46.9, -1],
        [46.8, 1],
      ] as const) {
        const inside = lat + sign * metersNorth(0.01);
        const outside = lat - sign * metersNorth(0.01);
        expect(clips.clippedAt(lon * R, inside * R), `${lon} ${lat} in`).toBe(
          true,
        );
        expect(clips.clippedAt(lon * R, outside * R), `${lon} ${lat}`).toBe(
          false,
        );
      }
    }
    // Meridians are straight in the plane: exact.
    const east = 1 / (6_378_000 * Math.cos(46.85 * R)) / R / 100;
    expect(clips.clippedAt((-121.64 - east) * R, 46.85 * R)).toBe(true);
    expect(clips.clippedAt((-121.64 + east) * R, 46.85 * R)).toBe(false);
  });

  it("puts a polygon's vertices exactly on the ellipsoid, and its edges between", () => {
    const polygon = [
      { longitude: 7.4, latitude: 46.9 },
      { longitude: 7.45, latitude: 46.9 },
      { longitude: 7.43, latitude: 46.95 },
    ];
    const clips = clipsOf({ polygon });
    const shape = clips.entries[0]!.shape;
    const q = new Float64Array(2);
    polygon.forEach((v, i) => {
      clipPlane(
        shape,
        WGS84.cartographicToCartesian(
          { longitude: v.longitude * R, latitude: v.latitude * R, height: 0 },
          new Float64Array(3),
        ),
        q,
      );
      expect(Math.abs(q[0]! - shape.xy[i * 2]!)).toBeLessThan(1e-6);
      expect(Math.abs(q[1]! - shape.xy[i * 2 + 1]!)).toBeLessThan(1e-6);
    });
    // The centroid is in; a point beyond the long edge is out.
    expect(clips.clippedAt(7.4267 * R, 46.9167 * R)).toBe(true);
    expect(clips.clippedAt(7.46 * R, 46.95 * R)).toBe(false);
    // A closing vertex equal to the first is dropped.
    const closed = compileTerrainClip({ polygon: [...polygon, polygon[0]!] });
    expect(closed.xy.length).toBe(6);
  });

  it("tests a point at its height as the GPU does, within millimeters of its foot", () => {
    // A 4 km site on 4,000 m terrain: a point 1 cm inside its south edge,
    // 2 km from its middle, is still inside up there.
    const clips = clipsOf({
      rectangle: { west: 7.4, south: 46.9, east: 7.45, north: 46.936 },
    });
    const lat = 46.9 + metersNorth(0.01);
    expect(clips.clippedAt(7.42 * R, lat * R, 4000)).toBe(true);
    expect(
      clips.clippedAt(7.42 * R, (46.9 - metersNorth(0.01)) * R, 4000),
    ).toBe(false);
  });

  it("refuses regions it can't clip, saying why", () => {
    const cases: Array<[TerrainClipRegion, RegExp]> = [
      [
        {
          polygon: [
            { longitude: 0, latitude: 86 },
            { longitude: 120, latitude: 86 },
            { longitude: 240, latitude: 86 },
          ],
        },
        /within 5° of a pole/,
      ],
      [
        { rectangle: { west: 0, south: 80, east: 1, north: 88 } },
        /within 5° of a pole/,
      ],
      [
        {
          polygon: [
            { longitude: 0, latitude: 0 },
            { longitude: 0.1, latitude: 0.1 },
            { longitude: 0.1, latitude: 0 },
            { longitude: 0, latitude: 0.1 },
          ],
        },
        /edges 0 and 2 cross/,
      ],
      [
        {
          polygon: [
            { longitude: 0, latitude: 0 },
            { longitude: 1, latitude: 0 },
          ],
        },
        /at least 3 vertices/,
      ],
      [
        {
          polygon: [
            { longitude: 3, latitude: 0 },
            { longitude: 3, latitude: 0.5 },
            { longitude: 3, latitude: 1 },
          ],
        },
        /no area/,
      ],
      [
        { rectangle: { west: 0, south: 1, east: 1, north: 0 } },
        /north must exceed/,
      ],
      [
        { rectangle: { west: 0, south: 0, east: 25, north: 1 } },
        /from the region's middle/,
      ],
      [
        {
          polygon: Array.from(
            { length: MAX_TERRAIN_CLIP_VERTICES + 1 },
            (_, i) => ({
              longitude:
                Math.cos((i / (MAX_TERRAIN_CLIP_VERTICES + 1)) * 2 * Math.PI) *
                0.01,
              latitude:
                Math.sin((i / (MAX_TERRAIN_CLIP_VERTICES + 1)) * 2 * Math.PI) *
                0.01,
            }),
          ),
        },
        /at most 1024/,
      ],
      [
        {
          polygon: [
            { longitude: 0, latitude: Number.NaN },
            { longitude: 1, latitude: 0 },
            { longitude: 1, latitude: 1 },
          ],
        },
        /vertex 0's latitude/,
      ],
    ];
    for (const [region, message] of cases) {
      expect(() => compileTerrainClip(region), String(message)).toThrow(
        message,
      );
    }
  });

  it("filters regions per tile by rectangle, with a bit per slot", () => {
    const site = {
      rectangle: { west: 7.4, south: 46.9, east: 7.45, north: 46.95 },
    };
    const far = {
      polygon: [
        { longitude: -122, latitude: 46.8 },
        { longitude: -121.9, latitude: 46.8 },
        { longitude: -121.95, latitude: 46.85 },
      ],
    };
    const dateline = {
      rectangle: { west: 179.99, south: -17, east: -179.99, north: -16.99 },
    };
    const clips = clipsOf(site, far, dateline);
    const tile = (w: number, s: number, e: number, n: number) => ({
      west: w * R,
      south: s * R,
      east: e * R,
      north: n * R,
    });
    // The west half has the far polygon, and the dateline's at -180°.
    expect(clips.maskFor(tile(-180, -90, 0, 90))).toBe(0b110);
    expect(clips.maskFor(tile(0, -90, 180, 90))).toBe(0b101);
    // A tile beside the site's east edge, and one across it.
    expect(clips.maskFor(tile(7.46, 46.9, 7.5, 46.95))).toBe(0);
    expect(clips.maskFor(tile(7.44, 46.94, 7.5, 47))).toBe(0b001);
    // Both sides of the antimeridian.
    expect(clips.maskFor(tile(179.9, -17.1, 180, -16.9))).toBe(0b100);
    expect(clips.maskFor(tile(-180, -17.1, -179.9, -16.9))).toBe(0b100);
    expect(clips.maskFor(tile(-179.9, -17.1, -179.8, -16.9))).toBe(0);
    // Slot 31 is the sign bit: still a positive mask.
    const high = new TerrainClips();
    high.add({
      clip: { region: site },
      shape: compileTerrainClip(site),
      slot: 31,
    });
    expect(high.maskFor(tile(7, 46, 8, 47))).toBe(0x80000000);
  });

  it("packs a region's rows as the shader reads them", () => {
    const shape = compileTerrainClip({
      polygon: [
        { longitude: 7.4, latitude: 46.9 },
        { longitude: 7.45, latitude: 46.9 },
        { longitude: 7.43, latitude: 46.95 },
      ],
    });
    const rows = packClipShape(shape);
    // 6 header rows, one grid cell, its three edges a row each.
    expect(rows.length).toBe((6 + 1 + 3) * 4);
    expect(rows[7]).toBe(1); // the grid's size
    const u = new Uint32Array(rows.buffer);
    expect(u[24]).toBe(0); // the cell's first edge
    expect(u[25]! & 0x7fffffff).toBe(3); // and its count
    expect(rows[0]! + rows[4]!).toBeCloseTo(shape.anchor[0]!, 2);
    expect(rows[3]).toBe(Math.fround(shape.radius));
    expect([...rows.subarray(20, 24)]).toEqual(shape.box.map(Math.fround));
    // The last edge runs from the last vertex to the first.
    expect([...rows.subarray(36, 40)]).toEqual(
      [shape.xy[4]!, shape.xy[5]!, shape.xy[0]!, shape.xy[1]!].map(Math.fround),
    );
    // In float32, as the GPU tests it, the plane keeps a site's millimeters.
    const f = Float32Array.from(shape.xy);
    for (let i = 0; i < f.length; i++) {
      expect(Math.abs(f[i]! - shape.xy[i]!)).toBeLessThan(1e-3);
    }
    expect(insideClipShape(shape, 0, 0)).toBe(true);
  });
});

/**
 * surface.slang `insideTerrainClip` for one region, in float32 as the GPU
 * runs it: `rows` as packed, the camera split hi/lo, the fragment's
 * camera-relative position in float32.
 */
function shaderInside(
  rows: Float32Array,
  vertices: number,
  camera: Float64Array,
  point: Float64Array,
): boolean {
  const f = Math.fround;
  const u = new Uint32Array(rows.buffer);
  const hi = new Float32Array(3);
  const lo = new Float32Array(3);
  splitVec3(camera, hi, 0, lo, 0);
  const rel = [0, 1, 2].map((i) => f(point[i]! - camera[i]!));
  // SplitPosition.difference: (int(hi) − int(camera hi)) + (lo − camera lo).
  const anchorRel = [0, 1, 2].map((i) =>
    f(f(rows[i]! - hi[i]!) + f(rows[4 + i]! - lo[i]!)),
  );
  const d = rel.map((v, i) => f(v - anchorRel[i]!));
  const dot = (o: number) =>
    f(
      f(f(rows[o]! * d[0]!) + f(rows[o + 1]! * d[1]!)) +
        f(rows[o + 2]! * d[2]!),
    );
  const lx = dot(8);
  const ly = dot(12);
  const lz = dot(16);
  const denominator = f(rows[3]! + lz);
  if (denominator <= 0) {
    return false;
  }
  const k = f(rows[3]! / denominator);
  const qx = f(lx * k);
  const qy = f(ly * k);
  const [x0, y0, x1, y1] = [rows[20]!, rows[21]!, rows[22]!, rows[23]!];
  if (qx < x0 || qy < y0 || qx > x1 || qy > y1) {
    return false;
  }
  const size = rows[7]!;
  const grid = 6;
  const edges = grid + size * size;
  const cw = f(f(x1 - x0) / size);
  const ch = f(f(y1 - y0) / size);
  const ax = Math.min(Math.floor(Math.max(f(f(qx - x0) / cw), 0)), size - 1);
  const ay = Math.min(Math.floor(Math.max(f(f(qy - y0) / ch), 0)), size - 1);
  const c = (grid + ay * size + ax) * 4;
  const start = u[c]!;
  const count = u[c + 1]! & 0x7fffffff;
  let inside = u[c + 1]! >>> 31 === 1;
  const sx = rows[c + 2]!;
  const sy = rows[c + 3]!;
  // surface.slang `segmentsCross`, in float32.
  const side = (ex: number, ey: number, px: number, py: number) =>
    f(f(ex * py) - f(ey * px)) > 0;
  for (let j = 0; j < count; j++) {
    const o = (edges + start + j) * 4;
    const [pax, pay, pbx, pby] = [
      rows[o]!,
      rows[o + 1]!,
      rows[o + 2]!,
      rows[o + 3]!,
    ];
    const ex = f(pbx - pax);
    const ey = f(pby - pay);
    const tx = f(sx - qx);
    const ty = f(sy - qy);
    if (
      side(ex, ey, f(qx - pax), f(qy - pay)) !==
        side(ex, ey, f(sx - pax), f(sy - pay)) &&
      side(tx, ty, f(pax - qx), f(pay - qy)) !==
        side(tx, ty, f(pbx - qx), f(pby - qy))
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Distance from a plane point to a region's nearest edge, m. */
function edgeDistance(xy: Float64Array, x: number, y: number): number {
  const n = xy.length / 2;
  let nearest = Infinity;
  for (let e = 0; e < n; e++) {
    const ax = xy[e * 2]!;
    const ay = xy[e * 2 + 1]!;
    const bx = xy[((e + 1) % n) * 2]!;
    const by = xy[((e + 1) % n) * 2 + 1]!;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) /
          ((bx - ax) ** 2 + (by - ay) ** 2),
      ),
    );
    nearest = Math.min(
      nearest,
      Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)),
    );
  }
  return nearest;
}

/** The middle of a 50 km alignment at `t` in [0, 1], degrees. */
const alignment = (t: number) => ({
  longitude: -121.9 + 0.55 * t + 0.02 * Math.sin(t * 9),
  latitude: 46.6 + 0.2 * t,
});

/** A corridor's strip: both edges of the alignment, 16 m either side. */
function strip(points: number): TerrainClipRegion {
  const half = points / 2;
  const offset = metersNorth(16);
  const side = (sign: number, t: number) => {
    const c = alignment(t);
    return { longitude: c.longitude, latitude: c.latitude + sign * offset };
  };
  return {
    polygon: [
      ...Array.from({ length: half }, (_, i) => side(1, i / (half - 1))),
      ...Array.from({ length: half }, (_, i) => side(-1, 1 - i / (half - 1))),
    ],
  };
}

describe("the shader's float32 test", () => {
  it("agrees with the CPU's to a centimeter, seen from 1.5 km", () => {
    const region: TerrainClipRegion = {
      polygon: [
        { longitude: -121.738, latitude: 46.7845 },
        { longitude: -121.7325, latitude: 46.784 },
        { longitude: -121.7315, latitude: 46.7872 },
        { longitude: -121.7345, latitude: 46.7885 },
        { longitude: -121.7382, latitude: 46.787 },
      ],
    };
    const clips = clipsOf(region);
    const shape = clips.entries[0]!.shape;
    const rows = packClipShape(shape);
    const camera = WGS84.cartographicToCartesian(
      { longitude: -121.74 * R, latitude: 46.775 * R, height: 2600 },
      new Float64Array(3),
    );
    let disagree = 0;
    let inside = 0;
    const q = new Float64Array(2);
    for (let i = 0; i <= 60; i++) {
      for (let j = 0; j <= 60; j++) {
        const lon = -121.739 + (i / 60) * 0.009;
        const lat = 46.7835 + (j / 60) * 0.0055;
        const p = WGS84.cartographicToCartesian(
          { longitude: lon * R, latitude: lat * R, height: 1600 },
          new Float64Array(3),
        );
        const cpu = clips.clippedPoint(p);
        const gpu = shaderInside(rows, 5, camera, p);
        inside += cpu ? 1 : 0;
        if (cpu !== gpu) {
          // Only within a centimeter of an edge.
          clipPlane(shape, p, q);
          expect(edgeDistance(shape.xy, q[0]!, q[1]!)).toBeLessThan(0.01);
          disagree++;
        }
      }
    }
    expect(inside).toBeGreaterThan(1000);
    expect(disagree).toBeLessThan(5);
  });
});

describe("a corridor's strip", () => {
  it("keeps every cell's edges few, and the shader agrees with the CPU", () => {
    const clips = clipsOf(strip(660));
    const shape = clips.entries[0]!.shape;
    const { grid } = shape;
    // Refined to cells about as long as the strip's 150 m edges.
    expect(grid.size).toBe(128);
    expect(Math.max(...grid.count)).toBeLessThanOrEqual(16);
    const rows = packClipShape(shape);
    const camera = WGS84.cartographicToCartesian(
      { longitude: -121.6 * R, latitude: 46.7 * R, height: 3000 },
      new Float64Array(3),
    );
    const q = new Float64Array(2);
    let inside = 0;
    let checked = 0;
    for (let i = 0; i <= 400; i++) {
      const c = alignment(i / 400);
      for (const across of [-30, -10, -1, 0, 1, 10, 30, 2000]) {
        const p = WGS84.cartographicToCartesian(
          {
            longitude: c.longitude * R,
            latitude: (c.latitude + metersNorth(across)) * R,
            height: 800,
          },
          new Float64Array(3),
        );
        const cpu = clips.clippedPoint(p);
        const gpu = shaderInside(rows, shape.xy.length / 2, camera, p);
        inside += cpu ? 1 : 0;
        checked++;
        if (cpu !== gpu) {
          clipPlane(shape, p, q);
          expect(edgeDistance(shape.xy, q[0]!, q[1]!)).toBeLessThan(0.01);
        }
      }
    }
    expect(inside).toBeGreaterThan(checked / 4);
  });

  it("masks only the tiles the strip crosses, not all inside its bounds", () => {
    const clips = clipsOf(strip(660));
    const tile = (lon: number, lat: number, size: number) => ({
      west: lon * R,
      south: lat * R,
      east: (lon + size) * R,
      north: (lat + size) * R,
    });
    // A 1 km tile on the alignment, and one 5 km off it (inside the
    // strip's bounds).
    const c = alignment(0.5);
    const d = 0.01;
    expect(
      clips.maskFor(tile(c.longitude - d / 2, c.latitude - d / 2, d)),
    ).toBe(1);
    expect(clips.maskFor(tile(c.longitude + 0.06, c.latitude - 0.03, d))).toBe(
      0,
    );
    // Wider than 1°: by bounds.
    expect(clips.maskFor(tile(-122, 46, 1.2))).toBe(1);
  });

  it("refuses a polygon whose edges crowd into one cell", () => {
    // A sawtooth of 1,000 vertices 1 mm apart, closed by a big box below.
    const zig = Array.from({ length: 1000 }, (_, i) => ({
      longitude: 7 + i * 1e-8,
      latitude: 46 + (i % 2) * 1e-7,
    }));
    expect(() =>
      compileTerrainClip({
        polygon: [
          ...zig,
          { longitude: 7.05, latitude: 45.95 },
          { longitude: 7, latitude: 45.95 },
        ],
      }),
    ).toThrow(/crowd into one cell/);
  });
});

describe("queries skip clipped terrain", () => {
  const D = 1000 / A; // a 2 km tile about (0, 0)
  const SQUARE = { west: -D, south: -D, east: D, north: D };
  const N = 33;

  it("lets a ray through a clipped ridge to the ground beyond", () => {
    // A 300 m ridge over the tile's west half, flat ground at 0 east of it.
    const tile = gridTile(SQUARE, N, (lon) => (lon < 0 ? 300 : 0));
    const target = stripTarget([{ rectangle: SQUARE, tile }]);
    const from = at(-0.95 * D, 0, 200);
    const to = at(0.95 * D, 0, -50);
    const blocked = castTerrainRay(from, to, target)!;
    expect(blocked.hit).toBeDefined();
    const hitLon = Math.atan2(blocked.hit!.point[1]!, blocked.hit!.point[0]!);
    expect(hitLon).toBeLessThan(0);
    // The ridge clipped away: the ray meets the ground east of it.
    const deg = D / R;
    const clips = clipsOf({
      rectangle: {
        west: -deg,
        south: -deg / 2,
        east: -deg / 100,
        north: deg / 2,
      },
    });
    const clipped = castTerrainRay(from, to, {
      ...target,
      clipped: (p) => clips.clippedPoint(p),
    })!;
    expect(clipped.hit).toBeDefined();
    const lon = Math.atan2(clipped.hit!.point[1]!, clipped.hit!.point[0]!);
    expect(lon).toBeGreaterThan(0);
    // No clearance is measured over the hole: the lowest is over the
    // ground east of it, not under the ridge.
    expect(clipped.minClearance!.meters).toBeLessThan(0);
  });

  it("has no ellipsoid height inside a clip", () => {
    const source = TerrainSource.ellipsoid(
      () => Promise.reject(new Error("no loads")),
      { warnings: new Set() } as never,
    );
    const site = compileTerrainClip({
      rectangle: { west: 7.4, south: 46.9, east: 7.45, north: 46.95 },
    });
    source.clips.add({
      clip: { region: { rectangle: { west: 0, south: 0, east: 0, north: 0 } } },
      shape: site,
      slot: 0,
    });
    expect(source.sampleHeight(7.42 * R, 46.92 * R)).toBeUndefined();
    expect(source.surfaceHeight(7.42 * R, 46.92 * R)).toBeUndefined();
    expect(source.exactHeight(7.42 * R, 46.92 * R)).toBeUndefined();
    expect(source.sampleHeight(7.5 * R, 46.92 * R)).toBe(0);
    expect(source.exactHeight(7.5 * R, 46.92 * R)).toBe(0);
    const ray = source.rayTarget();
    const inside = WGS84.cartographicToCartesian(
      { longitude: 7.42 * R, latitude: 46.92 * R, height: 0 },
      new Float64Array(3),
    );
    expect(ray.clipped?.(inside)).toBe(true);
  });
});

describe("globe terrain clips", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });

  it("adds and removes regions, waking the frame loop", () => {
    const world = engine.createWorld();
    const globe = engine.addEllipsoid(world);
    const wake = vi.spyOn(engine, "wake");
    const writes: Array<{ offset: number; data: ArrayBufferView }> = [];
    const device = engine.gpu.device as unknown as { queue: GPUQueue };
    const queue = device.queue;
    device.queue = new Proxy(queue, {
      get: (t, key) =>
        key === "writeBuffer"
          ? (buffer: GPUBuffer, offset: number, data: ArrayBufferView) => {
              if (buffer.label.includes("world.clipBoxes")) {
                writes.push({ offset, data });
              }
            }
          : (t as unknown as Record<PropertyKey, unknown>)[key],
    });
    try {
      const clip = globe.addTerrainClip({
        polygon: [
          { longitude: 7.4, latitude: 46.9 },
          { longitude: 7.45, latitude: 46.9 },
          { longitude: 7.43, latitude: 46.95 },
        ],
      });
      expect(wake).toHaveBeenCalled();
      expect(globe.terrainClips).toEqual([clip]);
      expect(Object.isFrozen(clip.region)).toBe(true);
      expect(globe.terrainClipped(7.43 * R, 46.92 * R)).toBe(true);
      expect(globe.exactHeight(7.43 * R, 46.92 * R)).toBeUndefined();
      // Its rows in whole blocks after the directory's (block 0), and its
      // directory row: first row, vertex count.
      const directory = writes.find((w) => w.offset === 0)!;
      const entry = new Uint32Array(directory.data.buffer);
      expect(entry[0]! % CLIP_BLOCK_ROWS).toBe(0);
      expect(entry[0]).toBeGreaterThanOrEqual(CLIP_BLOCK_ROWS);
      expect(entry[1]).toBe(3);
      wake.mockClear();
      globe.removeTerrainClip(clip);
      expect(wake).toHaveBeenCalled();
      expect(globe.terrainClips).toEqual([]);
      expect(globe.terrainClipped(7.43 * R, 46.92 * R)).toBe(false);
      expect(globe.exactHeight(7.43 * R, 46.92 * R)).toBe(0);
      // Removing it again does nothing.
      globe.removeTerrainClip(clip);
    } finally {
      device.queue = queue;
      wake.mockRestore();
      engine.removeTileset(globe);
    }
  });

  it("refuses a 33rd region in a world, and frees slots with the globe", () => {
    const world = engine.createWorld();
    const globe = engine.addEllipsoid(world);
    const square = (i: number): TerrainClipRegion => ({
      rectangle: { west: i, south: 0, east: i + 0.01, north: 0.01 },
    });
    for (let i = 0; i < MAX_TERRAIN_CLIPS; i++) {
      globe.addTerrainClip(square(i));
    }
    expect(() => globe.addTerrainClip(square(40))).toThrow(/At most 32/);
    engine.removeTileset(globe);
    const again = engine.addEllipsoid(world);
    expect(() => again.addTerrainClip(square(40))).not.toThrow();
    engine.removeTileset(again);
  });

  it("writes a tile's mask into its draws' records", () => {
    const world = engine.createWorld();
    const mesh = world.addMesh(createBox());
    const draw = world.addDraw({ mesh });
    const records = (world as unknown as { recordsU32: Uint32Array })
      .recordsU32;
    const at = draw.index * RECORD_WORDS + TERRAIN_CLIP_WORD;
    expect(records[at]).toBe(0);
    world.setTerrainClip(draw, 0x80000005);
    expect(records[at]).toBe(0x80000005);
    world.setTerrainClip(draw, 0);
    expect(records[at]).toBe(0);
  });
});
