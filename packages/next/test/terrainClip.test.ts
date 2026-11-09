import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  CLIP_HEADER_ROWS,
  MAX_CLIP_CELL_EDGES,
  MAX_CLIP_FRAGMENT_EDGES,
  MAX_CLIP_GRID,
  MAX_CLIP_REGION_ROWS,
  MAX_TERRAIN_CLIP_VERTICES,
  TerrainRegionError,
  TerrainClips,
  clipPlane,
  compileTerrainClip,
  insideClipShape,
  packClipShape,
  parallelSag,
  rectanglesOverlap,
  type ClipEntry,
  type TerrainRegionShape,
} from "../src/globe/terrainClip.ts";
import { castTerrainRay } from "../src/globe/terrainRay.ts";
import { TerrainSource } from "../src/globe/TerrainSource.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import {
  CLIP_BLOCK_BITS,
  CLIP_BLOCK_ROWS,
  CLIP_BOXES,
  MAX_TERRAIN_CLIPS,
  TERRAIN_CLIP_WORD,
  RECORD_WORDS,
} from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import { A, at, gridTile, stripTarget } from "./terrainRayFixtures.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { shaderInside } from "./terrainClipShader.ts";

const R = Math.PI / 180;
const WGS84 = Ellipsoid.WGS84;

/** A region as a cut (opacity 0, not ground) in a world slot. */
function cut(
  region: TerrainRegionShape,
  slot: number,
  shape = compileTerrainClip(region),
): ClipEntry {
  return {
    clip: { region },
    shape,
    slot,
    opacity: 0,
    ground: false,
    pickThrough: false,
  };
}

/** A set of cuts, each at its own slot, from regions. */
function clipsOf(...regions: TerrainRegionShape[]): TerrainClips {
  const clips = new TerrainClips();
  regions.forEach((region, slot) => clips.add(cut(region, slot)));
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
    const b = clips.entries[0]!.shape!.bounds;
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
    const shape = clips.entries[0]!.shape!;
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
    const cases: Array<[TerrainRegionShape, RegExp]> = [
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
      // Every vertex at 85°, round the pole: its cap would go unclipped.
      [
        {
          polygon: [0, 90, 180, 270].map((longitude) => ({
            longitude,
            latitude: 85,
          })),
        },
        /goes round the north pole; .*keep the region below 85°/,
      ],
      [
        {
          polygon: [0, -90, -180, -270].map((longitude) => ({
            longitude,
            latitude: -85,
          })),
        },
        /goes round the south pole/,
      ],
      // Its vertices at 85° or below, its edge bowing 3 m past it.
      [
        {
          polygon: [
            { longitude: 0, latitude: 85 },
            { longitude: 2, latitude: 85 },
            { longitude: 1, latitude: 84 },
          ],
        },
        /edge 0 reaches 85\.000\d° of latitude, within 5° of a pole/,
      ],
      [
        { rectangle: { west: 5, south: 0, east: 5, north: 1 } },
        /east equals its west; give an east that differs/,
      ],
      [
        { rectangle: { west: 5, south: 0, east: 365, north: 1 } },
        /east equals its west/,
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
      expect(() => compileTerrainClip(region)).toThrow(TerrainRegionError);
    }
    // Close to a pole, but clear of the limit: fine. A rectangle's
    // parallels are its edges, so one may run along 85°.
    expect(() =>
      compileTerrainClip({
        polygon: [
          { longitude: 0, latitude: 84.9 },
          { longitude: 0.1, latitude: 84.9 },
          { longitude: 0.05, latitude: 84.95 },
        ],
      }),
    ).not.toThrow();
    expect(() =>
      compileTerrainClip({
        rectangle: { west: 0, south: 84, east: 10, north: 85 },
      }),
    ).not.toThrow();
  });

  it("puts a polar region's cap neither in its bounds nor past the limit", () => {
    // The near-pole region that is accepted: its bounds hold all of it.
    const region: TerrainRegionShape = {
      rectangle: { west: 0, south: 84, east: 10, north: 85 },
    };
    const clips = clipsOf(region);
    const b = clips.entries[0]!.shape!.bounds;
    expect(b.north).toBeGreaterThan(85 * R);
    expect(b.north).toBeLessThan(85.001 * R);
    expect(clips.clippedAt(5 * R, 84.999 * R)).toBe(true);
    expect(clips.clippedAt(5 * R, 85.001 * R)).toBe(false);
  });

  it("keeps a rectangle's parallels within 2 mm up to 1° wide, and says how far past it", () => {
    for (const [width, most] of [
      [0.1, 0.002],
      [1, 0.002],
      [5, 0.05],
      [10, 0.2],
    ] as const) {
      const shape = compileTerrainClip({
        rectangle: { west: 10, south: 44.5, east: 10 + width, north: 45.5 },
      });
      // Both parallels' vertices; a parallel has one chord fewer.
      const chords = shape.xy.length / 4 - 1;
      const sag = parallelSag(shape, WGS84, 45.5, 10, 10 + width, chords);
      expect(sag, `${width}°`).toBeLessThanOrEqual(most);
      // The chords run between the vertices, all of them on the parallel.
      expect(chords).toBeLessThanOrEqual(256);
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
    high.add(cut(site, 31));
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
    const u = new Uint32Array(rows.buffer);
    expect(u[7]).toBe(1 | (1 << 16)); // the grid's columns and rows
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
function strip(points: number): TerrainRegionShape {
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
    const region: TerrainRegionShape = {
      polygon: [
        { longitude: -121.738, latitude: 46.7845 },
        { longitude: -121.7325, latitude: 46.784 },
        { longitude: -121.7315, latitude: 46.7872 },
        { longitude: -121.7345, latitude: 46.7885 },
        { longitude: -121.7382, latitude: 46.787 },
      ],
    };
    const clips = clipsOf(region);
    const shape = clips.entries[0]!.shape!;
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
        const gpu = shaderInside(rows, camera, p);
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
    const shape = clips.entries[0]!.shape!;
    const { grid } = shape;
    // Refined while its rows fit a region's blocks: a few thousand cells,
    // about square, and few edges in each.
    expect(grid.columns * grid.rows).toBeGreaterThan(1000);
    const cellWidth = (shape.box[2] - shape.box[0]) / grid.columns;
    const cellHeight = (shape.box[3] - shape.box[1]) / grid.rows;
    expect(cellWidth / cellHeight).toBeGreaterThan(0.5);
    expect(cellWidth / cellHeight).toBeLessThan(2);
    expect(shape.maxCellEdges).toBe(Math.max(...grid.count));
    expect(shape.maxCellEdges).toBeLessThanOrEqual(16);
    const rows = packClipShape(shape);
    expect(rows.length / 4).toBeLessThanOrEqual(MAX_CLIP_REGION_ROWS);
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
        const gpu = shaderInside(rows, camera, p);
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

describe("the shader's constants and loops", () => {
  const slang = readFileSync(
    new URL("../src/shaders/surface.slang", import.meta.url),
    "utf8",
  );
  const wgsl = readFileSync(
    new URL("../src/shaders/generated/surface.wgsl", import.meta.url),
    "utf8",
  );
  /** surface.slang's `static const uint name = Nu;`. */
  const constant = (name: string) => {
    const m = new RegExp(`static const uint ${name} = (\\d+)u;`).exec(slang);
    expect(m, name).not.toBeNull();
    return Number(m![1]);
  };

  it("agree with TypeScript's", () => {
    expect(constant("MAX_TERRAIN_CLIPS")).toBe(MAX_TERRAIN_CLIPS);
    expect(constant("MAX_CLIP_GRID")).toBe(MAX_CLIP_GRID);
    expect(constant("MAX_CLIP_CELL_EDGES")).toBe(MAX_CLIP_CELL_EDGES);
    expect(constant("MAX_CLIP_FRAGMENT_EDGES")).toBe(MAX_CLIP_FRAGMENT_EDGES);
    expect(constant("CLIP_HEADER_ROWS")).toBe(CLIP_HEADER_ROWS);
    expect(constant("CLIP_BLOCK_BITS")).toBe(CLIP_BLOCK_BITS);
    expect(constant("CLIP_BOXES")).toBe(CLIP_BOXES);
    // Grid columns and rows pack into 16 bits each.
    expect(MAX_CLIP_GRID).toBeLessThan(1 << 16);
  });

  it("bound every clip loop by a constant in the generated WGSL", () => {
    const body = (name: string) => {
      const start = wgsl.indexOf(`fn ${name}(`);
      expect(start, name).toBeGreaterThanOrEqual(0);
      return wgsl.slice(start, wgsl.indexOf("\n}\n", start));
    };
    const bounds = (code: string) => {
      // Each `loop` opens with its counter against a literal; the counter
      // only ever steps by one.
      const loops = code.split(/\bloop\s*\{/).slice(1);
      return loops.map((after) => {
        const m = /^\s*if\(\((\w+) < u32\((\d+)\)\)\)/.exec(after);
        expect(m, after.slice(0, 80)).not.toBeNull();
        const counter = m![1]!;
        const writes = [
          ...code.matchAll(new RegExp(`\\b${counter} = ([^;]+);`, "g")),
        ];
        for (const [, value] of writes) {
          expect(value).toBe(`${counter} + u32(1)`);
        }
        return Number(m![2]);
      });
    };
    expect(bounds(body("terrainOpacity_0"))).toEqual([
      MAX_TERRAIN_CLIPS,
      MAX_CLIP_CELL_EDGES,
    ]);
    expect(bounds(body("insideClipBoxes_0"))).toEqual([CLIP_BOXES]);
    // The fragment's budget starts at its constant, and caps each cell.
    const clip = body("terrainOpacity_0");
    expect(clip).toMatch(
      new RegExp(`budget_0 : u32 = u32\\(${MAX_CLIP_FRAGMENT_EDGES}\\)`),
    );
    expect(clip).toMatch(
      new RegExp(`min\\(u32\\(${MAX_CLIP_CELL_EDGES}\\), budget_0\\)`),
    );
  });
});

describe("a fragment's edge budget", () => {
  /** A polygon of `n` vertices round (lon, lat), `r` degrees across. */
  const ring = (n: number, lon: number, lat: number, r = 0.01) => ({
    polygon: Array.from({ length: n }, (_, k) => ({
      longitude: lon + r * Math.cos((2 * Math.PI * k) / n),
      latitude: lat + r * Math.sin((2 * Math.PI * k) / n),
    })),
  });

  it("refuses a cell of more than 32 edges, saying to simplify or split", () => {
    // A comb: 1,020 teeth 0.43 m apart in a 5.5 km site (101 edges a
    // cell at the old 128 limit).
    const comb = (width: number): TerrainRegionShape => ({
      polygon: [
        { longitude: 0, latitude: 0 },
        { longitude: 0.05, latitude: 0 },
        { longitude: 0.05, latitude: 0.001 },
        ...Array.from({ length: 1020 }, (_, i) => ({
          longitude: width * (1 - i / 1019),
          latitude: 0.001 + (i % 2 ? 0.0004 : 0.0001),
        })),
      ],
    });
    expect(() => compileTerrainClip(comb(0.004))).toThrow(
      /101 edges crowd into one cell .*at most 32.*simplify the polygon .*or split it/,
    );
    // Teeth wider apart fit, a long thin grid along the site.
    const fine = compileTerrainClip(comb(0.05));
    expect(fine.maxCellEdges).toBeLessThanOrEqual(MAX_CLIP_CELL_EDGES);
    expect(fine.grid.columns).toBe(MAX_CLIP_GRID);
    expect(fine.grid.rows).toBeLessThan(16);
  });

  it("refuses a region whose overlaps would give a fragment more than 128 edges", () => {
    // Rings of 16 edges, their cells holding `most` each: as many overlap
    // as the budget holds, and one more is refused.
    const most = compileTerrainClip(ring(16, 7, 46)).maxCellEdges;
    const fit = Math.floor(MAX_CLIP_FRAGMENT_EDGES / most);
    expect(fit).toBeLessThan(MAX_TERRAIN_CLIPS);
    const clips = new TerrainClips();
    for (let slot = 0; slot < fit; slot++) {
      const region = ring(16, 7 + slot * 0.0001, 46);
      const shape = compileTerrainClip(region);
      expect(shape.maxCellEdges).toBe(most);
      clips.checkBudget(shape);
      clips.add(cut(region, slot, shape));
    }
    const next = compileTerrainClip(ring(16, 7.004, 46));
    expect(() => clips.checkBudget(next)).toThrow(TerrainRegionError);
    expect(() => clips.checkBudget(next)).toThrow(
      new RegExp(
        `overlaps ${fit} others, a fragment could test ${(fit + 1) * most} edges \\(at most 128; .*simplify the polygon .*, split it, or remove a region it overlaps`,
      ),
    );
    // Clear of them: its own budget.
    expect(() =>
      clips.checkBudget(compileTerrainClip(ring(16, 8, 46))),
    ).not.toThrow();
    // Removing one makes room.
    clips.remove(clips.entries[0]!.clip);
    expect(() => clips.checkBudget(next)).not.toThrow();
  });

  it("keeps a fragment's tests within the budget where regions overlap", () => {
    // Every fragment under eight overlapping regions tests no more than
    // their cells' edges, which the budget holds to 128.
    const regions = Array.from({ length: 8 }, (_, i) =>
      ring(16, 7 + i * 0.0005, 46),
    );
    const clips = clipsOf(...regions);
    const most = clips.entries.reduce((m, e) => m + e.shape!.maxCellEdges, 0);
    expect(most).toBeLessThanOrEqual(MAX_CLIP_FRAGMENT_EDGES);
    let tested = 0;
    const camera = WGS84.cartographicToCartesian(
      { longitude: 7 * R, latitude: 45.99 * R, height: 2000 },
      new Float64Array(3),
    );
    const p = new Float64Array(3);
    for (let i = 0; i <= 40; i++) {
      for (let j = 0; j <= 40; j++) {
        WGS84.cartographicToCartesian(
          {
            longitude: (6.988 + i * 0.0007) * R,
            latitude: (45.988 + j * 0.0006) * R,
            height: 0,
          },
          p,
        );
        const budget: { left: number; cut?: boolean } = {
          left: MAX_CLIP_FRAGMENT_EDGES,
        };
        const gpu = regions.some((_, k) =>
          shaderInside(
            packClipShape(clips.entries[k]!.shape!),
            camera,
            p,
            budget,
          ),
        );
        // Never cut short: every region's whole cell was tested, and no
        // more than their most crowded cells hold.
        expect(budget.cut).toBeFalsy();
        expect(MAX_CLIP_FRAGMENT_EDGES - budget.left).toBeLessThanOrEqual(most);
        tested = Math.max(tested, MAX_CLIP_FRAGMENT_EDGES - budget.left);
        if (gpu !== clips.clippedPoint(p)) {
          const q = new Float64Array(2);
          const near = clips.entries.some(
            (e) =>
              clipPlane(e.shape!, p, q) &&
              edgeDistance(e.shape!.xy, q[0]!, q[1]!) < 0.01,
          );
          expect(near).toBe(true);
        }
      }
    }
    // Some fragment lay in several regions' cells at once.
    expect(tested).toBeGreaterThan(
      Math.max(...regions.map((_, k) => clips.entries[k]!.shape!.maxCellEdges)),
    );
  });
});

describe("the per-tile prefilter", () => {
  it("sets a tile's bit wherever a point in it, up to 9,000 m high, is clipped", () => {
    // Random tiles about each region, a few meters to 5 km wide, points in
    // them at random heights: a clipped point's tile must test the region.
    const wide: TerrainRegionShape = {
      polygon: [
        { longitude: 20, latitude: 30 },
        { longitude: 28.5, latitude: 31 },
        { longitude: 27, latitude: 38.5 },
        { longitude: 21, latitude: 37 },
      ],
    };
    const regions: TerrainRegionShape[] = [
      strip(660),
      {
        polygon: [
          { longitude: -121.738, latitude: 46.7845 },
          { longitude: -121.7325, latitude: 46.784 },
          { longitude: -121.7315, latitude: 46.7872 },
          { longitude: -121.7345, latitude: 46.7885 },
          { longitude: -121.7382, latitude: 46.787 },
        ],
      },
      { rectangle: { west: 179.95, south: 10, east: -179.97, north: 10.03 } },
      wide,
    ];
    let seed = 1;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const p = new Float64Array(3);
    let clipped = 0;
    for (const region of regions) {
      const clips = clipsOf(region);
      const b = clips.entries[0]!.shape!.bounds;
      const east = b.east < b.west ? b.east + 2 * Math.PI : b.east;
      for (let k = 0; k < 1500; k++) {
        const size = (0.0001 + random() * 0.05) * R;
        // Near the bounds' edges as often as inside them.
        const edge = random() < 0.5;
        let w = edge
          ? (random() < 0.5 ? b.west : east) - size * random()
          : b.west - size + random() * (east - b.west + size);
        const s = edge
          ? b.south - size + random() * (b.north - b.south + size)
          : (random() < 0.5 ? b.south : b.north) - size * random();
        if (w > Math.PI) {
          w -= 2 * Math.PI;
        }
        const tile = {
          west: w,
          south: s,
          east: Math.min(w + size, Math.PI),
          north: s + size,
        };
        const mask = clips.maskFor(tile);
        for (let i = 0; i < 20; i++) {
          const longitude = tile.west + random() * (tile.east - tile.west);
          const latitude = tile.south + random() * (tile.north - tile.south);
          WGS84.cartographicToCartesian(
            { longitude, latitude, height: random() * 9000 },
            p,
          );
          if (clips.clippedPoint(p)) {
            clipped++;
            expect(mask, `${longitude / R}, ${latitude / R}`).toBe(1);
          }
        }
      }
    }
    expect(clipped).toBeGreaterThan(5000);
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
    source.clips.add(
      cut({ rectangle: { west: 0, south: 0, east: 0, north: 0 } }, 0, site),
    );
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
      const clip = globe.terrain.addRegion({
        polygon: [
          { longitude: 7.4, latitude: 46.9 },
          { longitude: 7.45, latitude: 46.9 },
          { longitude: 7.43, latitude: 46.95 },
        ],
      });
      expect(wake).toHaveBeenCalled();
      expect(globe.terrain.regions).toEqual([clip]);
      expect(Object.isFrozen(clip.shape)).toBe(true);
      // Degrees, as the region's vertices are.
      expect(globe.terrainClipped(7.43, 46.92)).toBe(true);
      expect(globe.terrainClipped(7.43, 46.96)).toBe(false);
      expect(globe.exactHeight(7.43 * R, 46.92 * R)).toBeUndefined();
      // Its rows in whole blocks after the directory's (block 0), and its
      // directory row: its first row, and nothing else.
      const directory = writes.find((w) => w.offset === 0)!;
      const entry = new Uint32Array(directory.data.buffer);
      expect(entry[0]! % CLIP_BLOCK_ROWS).toBe(0);
      expect(entry[0]).toBeGreaterThanOrEqual(CLIP_BLOCK_ROWS);
      expect([...entry.subarray(1)]).toEqual([0, 0, 0]);
      wake.mockClear();
      writes.length = 0;
      clip.remove();
      expect(wake).toHaveBeenCalled();
      expect(globe.terrain.regions).toEqual([]);
      expect(globe.terrainClipped(7.43, 46.92)).toBe(false);
      // Its directory row is emptied.
      const cleared = writes.find((w) => w.offset === 0)!;
      expect([...new Uint32Array(cleared.data.buffer)]).toEqual([0, 0, 0, 0]);
      expect(globe.exactHeight(7.43 * R, 46.92 * R)).toBe(0);
      // Removing it again does nothing.
      clip.remove();
    } finally {
      device.queue = queue;
      wake.mockRestore();
      engine.removeTileset(globe);
    }
  });

  it("refuses a 33rd region in a world, and frees slots with the globe", () => {
    const world = engine.createWorld();
    const globe = engine.addEllipsoid(world);
    const square = (i: number): TerrainRegionShape => ({
      rectangle: { west: i, south: 0, east: i + 0.01, north: 0.01 },
    });
    for (let i = 0; i < MAX_TERRAIN_CLIPS; i++) {
      globe.terrain.addRegion(square(i));
    }
    expect(() => globe.terrain.addRegion(square(40))).toThrow(
      /at most 32 terrain regions per world .*; remove one, or merge/,
    );
    engine.removeTileset(globe);
    const again = engine.addEllipsoid(world);
    expect(() => again.terrain.addRegion(square(40))).not.toThrow();
    engine.removeTileset(again);
  });

  it("writes a tile's mask into its draws' records", () => {
    const world = engine.createWorld();
    const mesh = world.addMesh(createBox());
    const draw = world.addDraw({ mesh });
    const records = world.raster.recordsU32;
    const at = draw.index * RECORD_WORDS + TERRAIN_CLIP_WORD;
    expect(records[at]).toBe(0);
    world.setTerrainClip(draw, 0x80000005);
    expect(records[at]).toBe(0x80000005);
    world.setTerrainClip(draw, 0);
    expect(records[at]).toBe(0);
  });
});
