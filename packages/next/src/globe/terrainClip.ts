/**
 * Terrain clipping: regions of a globe (`Tileset3D.addTerrainClip`) where
 * its terrain isn't drawn, so content placed there (a site's design, an
 * excavation) shows instead. Rectangles and simple polygons, their
 * vertices geodetic longitude and latitude in degrees on the globe's body.
 * The same regions can make the terrain translucent instead
 * (`Tileset3D.addTerrainTranslucency`): a region with an opacity.
 *
 * Each region is tested per fragment (surface.slang `terrainOpacity`):
 * a fragment's position, relative to the region's anchor (the middle of
 * its vertices on the ellipsoid), is projected onto the anchor's tangent
 * plane from the point where the anchor's normal meets the polar axis
 * (`clipPlane`), and tested against the region's edges projected the
 * same way: in its cell of the region's grid (`ClipGrid`), against that
 * cell's few edges only, at most 32 (`MAX_CLIP_CELL_EDGES`), and 128 over
 * all the regions a fragment lies in (`MAX_CLIP_FRAGMENT_EDGES`, checked
 * as regions are added). The projection is exact on the ellipsoid
 * (a vertex's own longitude and latitude land on it) and keeps meridians
 * straight; relative to the anchor, float32 keeps millimeters for a site.
 * Off the ellipsoid a point's normal leans from the projection's line by
 * how far apart the two meet the polar axis (about 43 km·cos φ per radian
 * of latitude between them): at height h, d meters north or south of the
 * anchor, a point lands about h·d·cos²φ / 950,000 km off its own
 * longitude and latitude (east or west of it, not at all). 4 mm at a
 * site's edge 2 km from its middle on 4,000 m terrain; 20 cm 100 km out.
 * The CPU (float64, crossing number) and the GPU (float32, the grid) test
 * the same projection, so they agree to a millimeter or so at the edges;
 * only the edge's place on the ground moves.
 *
 * Edges: a polygon's are straight in that plane (near geodesics); a
 * rectangle's follow its meridians exactly, and its parallels as chords
 * within 2 mm of them for rectangles up to about 80 km wide at 45° of
 * latitude (`PARALLEL_TOLERANCE`, 256 chords a parallel at most). Wider
 * rectangles' chords sag more, as the width squared: about 5 cm for 5°
 * wide at 45°, 19 cm for 10° (`parallelSag`). The CPU and GPU test the
 * same chords, so they still agree; only the edge's place on the ground
 * moves.
 *
 * Picks, ray queries and height queries agree with what is drawn:
 * clipped terrain is a hole for them all (`TerrainClips`). A tile tests
 * only the regions it touches (`TerrainClips.maskFor`, a bit per region in
 * its draw records); with no regions nothing is tested.
 *
 * Regions are geodetic on the Earth and evaluated in the globe's anchor
 * (`Tileset3D.anchor`, the Earth's): their anchors and edges are
 * Earth-fixed, and the shader compares them with fragments in the view's
 * shading axes (its body anchor's, plan 5a's call 18). A view of the Earth
 * has the Earth's anchor as its body anchor, so wherever its render space
 * places the Earth (a rig on an inertial reference frame turns it), the
 * shader's inputs are those of an Earth-fixed render space, and clips stay
 * where they were drawn. A globe under another anchor than its views' body
 * anchor isn't supported yet (per-body content comes later).
 */
import { Ellipsoid } from "../math/ellipsoid.ts";
import { splitVec3 } from "../math/transforms.ts";
import {
  CLIP_BLOCK_ROWS,
  MAX_TERRAIN_CLIP_BLOCKS,
  MAX_TERRAIN_CLIPS,
} from "../render/layout.ts";
import type { Rectangle } from "./quantizedMesh.ts";

/**
 * Why `Tileset3D.addTerrainClip` refused a region; the message says what
 * to change.
 */
export class TerrainClipError extends Error {
  constructor(message: string) {
    super(`TerrainClip: ${message}`);
    this.name = "TerrainClipError";
  }
}

/** A rectangle in degrees; `west` > `east` crosses the antimeridian. */
export interface TerrainClipRectangle {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** A polygon vertex: geodetic longitude and latitude, degrees. */
export interface TerrainClipPosition {
  longitude: number;
  latitude: number;
}

/**
 * Where a globe's terrain isn't drawn (`Tileset3D.addTerrainClip`): a
 * rectangle, or a simple polygon (no holes, edges that don't cross; either
 * winding; a closing vertex equal to the first is dropped). Vertices are
 * geodetic, in degrees, on the globe's body. Regions are for sites: every
 * vertex lies within 10° of the region's middle, and the whole region
 * (its edges too) below 85° of latitude: regions that reach within 5° of
 * a pole, or go round one, are refused.
 */
export type TerrainClipRegion =
  | { readonly rectangle: TerrainClipRectangle; readonly polygon?: undefined }
  | {
      readonly polygon: readonly TerrainClipPosition[];
      readonly rectangle?: undefined;
    };

/** A region added to a globe, for `Tileset3D.removeTerrainClip`. */
export interface TerrainClip {
  /** The region as it was given. */
  readonly region: TerrainClipRegion;
}

/** Vertices of one region at most (its edges are tested per fragment). */
export const MAX_TERRAIN_CLIP_VERTICES = 1024;
/** Regions stay below this latitude, degrees. */
const MAX_LATITUDE = 85;
/** Every vertex within this angle of the region's anchor, degrees. */
const MAX_REACH = 10;
/** A rectangle's parallels stay this close to their edges, m. */
const PARALLEL_TOLERANCE = 0.002;
/** Chords a rectangle's parallel is split into at most. */
const MAX_PARALLEL_SEGMENTS = 256;
/** Header rows before a region's grid (surface.slang `CLIP_HEADER_ROWS`). */
export const CLIP_HEADER_ROWS = 6;
/**
 * Columns, and rows, of a region's grid at most (surface.slang
 * `MAX_CLIP_GRID`).
 */
export const MAX_CLIP_GRID = 128;
/** A grid is refined until no cell holds more edges than this. */
const CELL_EDGES_TARGET = 8;
/**
 * Edges one cell of a region's grid may hold (surface.slang
 * `MAX_CLIP_CELL_EDGES`, its loop bound): a fragment tests at most these
 * per region.
 */
export const MAX_CLIP_CELL_EDGES = 32;
/**
 * Edges a fragment tests at most, over all the regions it lies in
 * (surface.slang `MAX_CLIP_FRAGMENT_EDGES`): regions that overlap share
 * it (`TerrainClips.checkBudget`).
 */
export const MAX_CLIP_FRAGMENT_EDGES = 128;
/** A region's packed rows at most: `MAX_TERRAIN_CLIP_BLOCKS` blocks. */
export const MAX_CLIP_REGION_ROWS = MAX_TERRAIN_CLIP_BLOCKS * CLIP_BLOCK_ROWS;
/** Regions of at most this many vertices get one cell. */
const ONE_CELL_VERTICES = 16;
/** Samples per edge for a region's longitude and latitude bounds. */
const BOUND_SAMPLES = 16;
/** Added around those bounds, radians (about 6 m). */
const BOUND_MARGIN = 1e-6;
/**
 * The highest terrain a region's bounds allow for, m: off the ellipsoid a
 * point lands up to h·d·cos²φ / 950,000 km from its own longitude and
 * latitude in the plane (d its distance from the anchor), so the bounds
 * grow by that much, about 10 m at the 10° reach.
 */
const MAX_TERRAIN_HEIGHT = 9000;
const RADIANS = Math.PI / 180;

/**
 * @internal A region ready to test: its anchor and plane, its vertices in
 * the plane, its longitude and latitude bounds (radians), and its cost.
 */
export interface ClipShape {
  /** Earth-fixed anchor on the ellipsoid, m. */
  readonly anchor: Float64Array;
  /** The anchor's east, north and up (geodetic normal) axes. */
  readonly east: Float64Array;
  readonly north: Float64Array;
  readonly up: Float64Array;
  /** From the anchor down its normal to the polar axis, m. */
  readonly radius: number;
  /** Vertices in the plane, x and y interleaved, m. */
  readonly xy: Float64Array;
  /** The vertices' box in the plane: min x, min y, max x, max y. */
  readonly box: readonly [number, number, number, number];
  /**
   * Longitude and latitude bounds of the region on the ellipsoid, radians,
   * longitudes in [-π, π]; west > east across the antimeridian.
   */
  readonly bounds: Rectangle;
  /**
   * Where its fragments may test edges, radians as `bounds`: the bounds
   * of its plane box, which the shader tests a fragment against first.
   */
  readonly cost: Rectangle;
  /** The per-fragment test's grid over `box`. */
  readonly grid: ClipGrid;
  /** Edges in the grid's most crowded cell: a fragment tests at most these. */
  readonly maxCellEdges: number;
}

/**
 * @internal A region's grid over its plane box: each cell lists the edges
 * that cross it (`edges[first …]`), and holds a sample point whose
 * inside-ness is known. A fragment in a cell is inside when the segment to
 * the sample crosses an odd number of the cell's edges and the sample is
 * outside, or an even number and it is inside: its cost is the cell's
 * edges, whatever the polygon's size. Cells run row by row from the box's
 * southwest corner (cell = row · columns + column).
 */
export interface ClipGrid {
  /** Cells across (x, east) and up (y, north) the box. */
  readonly columns: number;
  readonly rows: number;
  readonly first: Uint32Array;
  readonly count: Uint32Array;
  readonly inside: Uint8Array;
  /** Sample points, x and y interleaved. */
  readonly sample: Float64Array;
  /** Edge k runs from vertex k to vertex k + 1 (the last to the first). */
  readonly edges: Uint32Array;
}

/** A region's anchor point and frame at a longitude and latitude, radians. */
function frame(
  longitude: number,
  latitude: number,
  ellipsoid: Ellipsoid,
): Pick<ClipShape, "anchor" | "east" | "north" | "up" | "radius"> {
  const anchor = ellipsoid.cartographicToCartesian(
    { longitude, latitude, height: 0 },
    new Float64Array(3),
  );
  const cl = Math.cos(longitude);
  const sl = Math.sin(longitude);
  const cp = Math.cos(latitude);
  const sp = Math.sin(latitude);
  const up = Float64Array.of(cp * cl, cp * sl, sp);
  const east = Float64Array.of(-sl, cl, 0);
  const north = Float64Array.of(-sp * cl, -sp * sl, cp);
  // Where the normal meets the polar axis: anchor − radius · up, with
  // radius the prime vertical's (N), as the normal's x and y run out.
  const radius = Math.hypot(anchor[0]!, anchor[1]!) / cp;
  return { anchor, east, north, up, radius };
}

/**
 * Projects an Earth-fixed point into a region's plane (x, y in `out`);
 * false when it lies behind the projection's center (the far side).
 */
export function clipPlane(
  shape: Pick<ClipShape, "anchor" | "east" | "north" | "up" | "radius">,
  p: ArrayLike<number>,
  out: Float64Array,
): boolean {
  const dx = p[0]! - shape.anchor[0]!;
  const dy = p[1]! - shape.anchor[1]!;
  const dz = p[2]! - shape.anchor[2]!;
  const { east: e, north: n, up: u } = shape;
  const denominator = shape.radius + dx * u[0]! + dy * u[1]! + dz * u[2]!;
  if (!(denominator > 0)) {
    return false;
  }
  const k = shape.radius / denominator;
  out[0] = (dx * e[0]! + dy * e[1]! + dz * e[2]!) * k;
  out[1] = (dx * n[0]! + dy * n[1]! + dz * n[2]!) * k;
  return true;
}

/** The ellipsoid point a plane point projects from, as longitude/latitude. */
function unproject(
  shape: Pick<ClipShape, "anchor" | "east" | "north" | "up" | "radius">,
  x: number,
  y: number,
  ellipsoid: Ellipsoid,
): { longitude: number; latitude: number } {
  const { anchor: a, east: e, north: n, up: u, radius } = shape;
  // From the center C = anchor − radius·up along x·east + y·north + radius·up.
  const cx = a[0]! - radius * u[0]!;
  const cy = a[1]! - radius * u[1]!;
  const cz = a[2]! - radius * u[2]!;
  const dx = x * e[0]! + y * n[0]! + radius * u[0]!;
  const dy = x * e[1]! + y * n[1]! + radius * u[1]!;
  const dz = x * e[2]! + y * n[2]! + radius * u[2]!;
  const ra = ellipsoid.radii[0]!;
  const rc = ellipsoid.radii[2]!;
  const ia = 1 / (ra * ra);
  const ic = 1 / (rc * rc);
  const A = (dx * dx + dy * dy) * ia + dz * dz * ic;
  const B = 2 * ((cx * dx + cy * dy) * ia + cz * dz * ic);
  const Cq = (cx * cx + cy * cy) * ia + cz * cz * ic - 1;
  // C is inside the ellipsoid (Cq < 0): one root ahead.
  const t = (-B + Math.sqrt(B * B - 4 * A * Cq)) / (2 * A);
  const c = ellipsoid.cartesianToCartographic(
    Float64Array.of(cx + t * dx, cy + t * dy, cz + t * dz),
    { longitude: 0, latitude: 0, height: 0 },
  )!;
  return { longitude: c.longitude, latitude: c.latitude };
}

/** Longitude in degrees wrapped to (-180, 180]. */
function wrapDegrees(longitude: number): number {
  const w = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return w === -180 ? 180 : w;
}

/** Radians wrapped to [-π, π]. */
function wrapRadians(longitude: number): number {
  return longitude - 2 * Math.PI * Math.round(longitude / (2 * Math.PI));
}

function checkLatitude(latitude: number, what: string): void {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) {
    throw new TerrainClipError(
      `${what} latitude ${latitude} is not in [-90, 90]; give degrees.`,
    );
  }
  if (Math.abs(latitude) > MAX_LATITUDE) {
    throw new TerrainClipError(
      `${what} latitude ${latitude}° is within ${90 - MAX_LATITUDE}° of a pole; regions near the poles aren't supported yet, so keep the region below ${MAX_LATITUDE}°.`,
    );
  }
}

/**
 * @internal Validates a region and builds its plane, or throws an error
 * saying what is wrong with it.
 */
export function compileTerrainClip(
  region: TerrainClipRegion,
  ellipsoid: Ellipsoid = Ellipsoid.WGS84,
): ClipShape {
  if (region.rectangle && region.polygon) {
    throw new TerrainClipError("give a rectangle or a polygon, not both.");
  }
  if (region.rectangle) {
    return compileRectangle(region.rectangle, ellipsoid);
  }
  const polygon = region.polygon;
  if (!Array.isArray(polygon)) {
    throw new TerrainClipError("give a rectangle or a polygon.");
  }
  const points: Array<[number, number]> = [];
  polygon.forEach((p: TerrainClipPosition, i: number) => {
    if (!Number.isFinite(p?.longitude)) {
      throw new TerrainClipError(
        `vertex ${i}'s longitude is not a number; give degrees.`,
      );
    }
    checkLatitude(p.latitude, `vertex ${i}'s`);
    points.push([p.longitude, p.latitude]);
  });
  if (points.length > 1) {
    const [a, b] = [points[0]!, points[points.length - 1]!];
    if (wrapDegrees(a[0] - b[0]) === 0 && a[1] === b[1]) {
      points.pop(); // a closing vertex
    }
  }
  if (points.length < 3) {
    throw new TerrainClipError("a polygon needs at least 3 vertices.");
  }
  // Longitudes continued from the first, each edge the short way round.
  for (let i = 1; i < points.length; i++) {
    const step = wrapDegrees(points[i]![0] - points[i - 1]![0]);
    if (Math.abs(step) >= 180) {
      throw new TerrainClipError(
        `edge ${i - 1} spans 180° of longitude; regions are for sites, so split a larger area into regions.`,
      );
    }
    points[i]![0] = points[i - 1]![0] + step;
  }
  let lon = 0;
  let lat = 0;
  for (const [x, y] of points) {
    lon += x;
    lat += y;
  }
  return compileShape(
    points,
    (lon / points.length) * RADIANS,
    (lat / points.length) * RADIANS,
    ellipsoid,
    true,
  );
}

function compileRectangle(
  r: TerrainClipRectangle,
  ellipsoid: Ellipsoid,
): ClipShape {
  for (const key of ["west", "east"] as const) {
    if (!Number.isFinite(r[key])) {
      throw new TerrainClipError(
        `the rectangle's ${key} is not a number; give degrees.`,
      );
    }
  }
  checkLatitude(r.south, "the rectangle's south");
  checkLatitude(r.north, "the rectangle's north");
  if (!(r.north > r.south)) {
    throw new TerrainClipError("the rectangle's north must exceed its south.");
  }
  const west = wrapDegrees(r.west);
  let east = wrapDegrees(r.east);
  if (east === west) {
    throw new TerrainClipError(
      "the rectangle's east equals its west; give an east that differs (west > east crosses the antimeridian).",
    );
  }
  if (east < west) {
    east += 360; // across the antimeridian
  }
  if (east - west >= 180) {
    throw new TerrainClipError(
      `the rectangle spans ${east - west}° of longitude; regions are for sites, so split a larger area into regions.`,
    );
  }
  const lon0 = ((west + east) / 2) * RADIANS;
  const lat0 = ((r.south + r.north) / 2) * RADIANS;
  const base = frame(lon0, lat0, ellipsoid);
  // Parallels bow away from the plane's straight lines: split each until
  // its chords stay within the tolerance of it (meridians are straight).
  const parallel = (latitude: number, from: number, to: number) => {
    let segments = 1;
    while (
      segments < MAX_PARALLEL_SEGMENTS &&
      parallelSag(base, ellipsoid, latitude, from, to, segments) >
        PARALLEL_TOLERANCE
    ) {
      segments *= 2;
    }
    const out: Array<[number, number]> = [];
    for (let i = 0; i <= segments; i++) {
      out.push([from + ((to - from) * i) / segments, latitude]);
    }
    return out;
  };
  const points = [
    ...parallel(r.south, west, east),
    ...parallel(r.north, east, west),
  ];
  return compileShape(points, lon0, lat0, ellipsoid, false, base);
}

/**
 * @internal How far a parallel (degrees of latitude, from one longitude to
 * another) split into `segments` equal chords strays from its chords in a
 * region's plane at most, m: the bow at each chord's middle.
 */
export function parallelSag(
  base: Pick<ClipShape, "anchor" | "east" | "north" | "up" | "radius">,
  ellipsoid: Ellipsoid,
  latitude: number,
  from: number,
  to: number,
  segments: number,
): number {
  const p = new Float64Array(3);
  const at = (lon: number) => {
    ellipsoid.cartographicToCartesian(
      { longitude: lon * RADIANS, latitude: latitude * RADIANS, height: 0 },
      p,
    );
    const q = new Float64Array(2);
    clipPlane(base, p, q);
    return q;
  };
  const step = (to - from) / segments;
  let sag = 0;
  let a = at(from);
  for (let i = 0; i < segments; i++) {
    const m = at(from + (i + 0.5) * step);
    const b = at(from + (i + 1) * step);
    const bow =
      Math.abs(
        (b[0]! - a[0]!) * (m[1]! - a[1]!) - (b[1]! - a[1]!) * (m[0]! - a[0]!),
      ) / Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
    sag = Math.max(sag, bow);
    a = b;
  }
  return sag;
}

function compileShape(
  points: ReadonlyArray<readonly [number, number]>,
  lon0: number,
  lat0: number,
  ellipsoid: Ellipsoid,
  polygon: boolean,
  base = frame(lon0, lat0, ellipsoid),
): ClipShape {
  if (points.length > MAX_TERRAIN_CLIP_VERTICES) {
    throw new TerrainClipError(
      `${points.length} vertices; at most ${MAX_TERRAIN_CLIP_VERTICES} are supported, so simplify the polygon.`,
    );
  }
  const reach = Math.cos(MAX_REACH * RADIANS);
  const xy = new Float64Array(points.length * 2);
  const p = new Float64Array(3);
  const q = new Float64Array(2);
  points.forEach(([lon, lat], i) => {
    const longitude = lon * RADIANS;
    const latitude = lat * RADIANS;
    ellipsoid.cartographicToCartesian({ longitude, latitude, height: 0 }, p);
    const cp = Math.cos(latitude);
    const along =
      cp * Math.cos(longitude) * base.up[0]! +
      cp * Math.sin(longitude) * base.up[1]! +
      Math.sin(latitude) * base.up[2]!;
    if (along < reach || !clipPlane(base, p, q)) {
      throw new TerrainClipError(
        `vertex ${i} lies more than ${MAX_REACH}° from the region's middle; regions are for sites, so split a larger area into regions.`,
      );
    }
    xy[i * 2] = q[0]!;
    xy[i * 2 + 1] = q[1]!;
  });
  const n = points.length;
  let area = 0;
  const box: [number, number, number, number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += xy[i * 2]! * xy[j * 2 + 1]! - xy[j * 2]! * xy[i * 2 + 1]!;
    box[0] = Math.min(box[0], xy[i * 2]!);
    box[1] = Math.min(box[1], xy[i * 2 + 1]!);
    box[2] = Math.max(box[2], xy[i * 2]!);
    box[3] = Math.max(box[3], xy[i * 2 + 1]!);
  }
  const crossing = crossingEdges(xy);
  if (crossing) {
    throw new TerrainClipError(
      `edges ${crossing[0]} and ${crossing[1]} cross; give a simple polygon (no holes, no crossing edges).`,
    );
  }
  // No area, to rounding (meridians are straight: points along one).
  const size = Math.hypot(box[2] - box[0], box[3] - box[1]);
  if (!(Math.abs(area) > 1e-6 + 1e-12 * size * size)) {
    throw new TerrainClipError(
      "the polygon has no area; give at least 3 vertices not all on one line.",
    );
  }
  // Round a pole: the edges' bounds below miss its cap.
  for (const z of [ellipsoid.radii[2]!, -ellipsoid.radii[2]!]) {
    if (clipPlane(base, [0, 0, z], q) && insideRing(xy, q[0]!, q[1]!)) {
      throw new TerrainClipError(
        `the polygon goes round the ${z > 0 ? "north" : "south"} pole; regions near the poles aren't supported yet, so keep the region below ${MAX_LATITUDE}°.`,
      );
    }
  }
  const sampled = edgeBounds(base, xy, lon0, ellipsoid);
  if (polygon) {
    // A polygon's edges are straight in the plane: they bow poleward of
    // their vertices (a rectangle's follow its parallels).
    const reach = Math.max(-sampled.south, sampled.north);
    if (reach > MAX_LATITUDE * RADIANS) {
      throw new TerrainClipError(
        `edge ${sampled.poleward} reaches ${(reach / RADIANS).toFixed(4)}° of latitude, within ${90 - MAX_LATITUDE}° of a pole; regions near the poles aren't supported yet, so keep the region below ${MAX_LATITUDE}° (vertices closer together bow less).`,
      );
    }
  }
  const bounds = withMargin(sampled, ellipsoid, xy);
  const [x0, y0, x1, y1] = box;
  const corners = Float64Array.of(x0, y0, x1, y0, x1, y1, x0, y1);
  const cost = withMargin(
    edgeBounds(base, corners, lon0, ellipsoid),
    ellipsoid,
    corners,
  );
  const grid = buildGrid(xy, box);
  let maxCellEdges = 0;
  for (const c of grid.count) {
    maxCellEdges = Math.max(maxCellEdges, c);
  }
  return { ...base, xy, box, bounds, cost, grid, maxCellEdges };
}

/** Two edges that cross or touch (not neighbors at their shared vertex). */
function crossingEdges(xy: Float64Array): [number, number] | undefined {
  const n = xy.length / 2;
  const orient = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  const between = (a: number, b: number, c: number) =>
    Math.min(a, b) <= c && c <= Math.max(a, b);
  for (let i = 0; i < n; i++) {
    const ax = xy[i * 2]!;
    const ay = xy[i * 2 + 1]!;
    const bx = xy[((i + 1) % n) * 2]!;
    const by = xy[((i + 1) % n) * 2 + 1]!;
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) {
        continue; // neighbors share a vertex
      }
      const cx = xy[j * 2]!;
      const cy = xy[j * 2 + 1]!;
      const dx = xy[((j + 1) % n) * 2]!;
      const dy = xy[((j + 1) % n) * 2 + 1]!;
      const o1 = orient(ax, ay, bx, by, cx, cy);
      const o2 = orient(ax, ay, bx, by, dx, dy);
      const o3 = orient(cx, cy, dx, dy, ax, ay);
      const o4 = orient(cx, cy, dx, dy, bx, by);
      if (o1 !== o2 && o3 !== o4) {
        return [i, j];
      }
      if (
        (o1 === 0 && between(ax, bx, cx) && between(ay, by, cy)) ||
        (o2 === 0 && between(ax, bx, dx) && between(ay, by, dy)) ||
        (o3 === 0 && between(cx, dx, ax) && between(cy, dy, ay)) ||
        (o4 === 0 && between(cx, dx, bx) && between(cy, dy, by))
      ) {
        return [i, j];
      }
    }
  }
  return undefined;
}

/**
 * Longitude and latitude extremes of a ring's edges (in a region's plane)
 * on the ellipsoid, sampled, radians (longitudes continued from `lon0`),
 * with the longest edge and the edge reaching furthest toward a pole.
 */
function edgeBounds(
  base: Pick<ClipShape, "anchor" | "east" | "north" | "up" | "radius">,
  xy: Float64Array,
  lon0: number,
  ellipsoid: Ellipsoid,
): Rectangle & { longest: number; poleward: number } {
  const n = xy.length / 2;
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  let longest = 0;
  let poleward = 0;
  let farthest = -1;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = xy[i * 2]!;
    const ay = xy[i * 2 + 1]!;
    const bx = xy[j * 2]!;
    const by = xy[j * 2 + 1]!;
    longest = Math.max(longest, Math.hypot(bx - ax, by - ay));
    for (let k = 0; k < BOUND_SAMPLES; k++) {
      const s = k / BOUND_SAMPLES;
      const c = unproject(
        base,
        ax + (bx - ax) * s,
        ay + (by - ay) * s,
        ellipsoid,
      );
      const lon = lon0 + wrapRadians(c.longitude - lon0);
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      south = Math.min(south, c.latitude);
      north = Math.max(north, c.latitude);
      if (Math.abs(c.latitude) > farthest) {
        farthest = Math.abs(c.latitude);
        poleward = i;
      }
    }
  }
  return { west, south, east, north, longest, poleward };
}

/**
 * Sampled bounds (`edgeBounds`) grown to hold what lies between the
 * samples and what stands on terrain up to `MAX_TERRAIN_HEIGHT` (`xy` the
 * ring sampled, for its distance from the anchor), wrapped to [-π, π].
 */
function withMargin(
  sampled: Rectangle & { longest: number },
  ellipsoid: Ellipsoid,
  xy: Float64Array,
): Rectangle {
  const { west, south, east, north, longest } = sampled;
  let far = 0;
  for (let i = 0; i < xy.length; i += 2) {
    far = Math.max(far, Math.hypot(xy[i]!, xy[i + 1]!));
  }
  // Between samples an edge bows by about (step)²/(8R) (1 + tan φ); a
  // point at height leans by up to h·d / 950,000 km.
  const step = longest / BOUND_SAMPLES;
  const a = ellipsoid.maximumRadius;
  const tan = Math.tan(Math.max(Math.abs(south), Math.abs(north)));
  const lean = (MAX_TERRAIN_HEIGHT * far) / 9.5e8 / a;
  const margin =
    BOUND_MARGIN + lean + ((step * step) / (8 * a * a)) * (1 + tan) * 4;
  const cosLat = Math.cos(Math.max(Math.abs(south), Math.abs(north)) + margin);
  const lonMargin = margin / Math.max(cosLat, 1e-6);
  return {
    west: wrapRadians(west - lonMargin),
    south: south - margin,
    east: wrapRadians(east + lonMargin),
    north: north + margin,
  };
}

/** Whether segment a–b meets the rectangle [x0, x1] × [y0, y1]. */
function segmentMeetsRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  // Liang–Barsky: clip the segment's parameter range to each slab.
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) {
      return q >= 0;
    }
    const r = q / p;
    if (p < 0) {
      t0 = Math.max(t0, r);
    } else {
      t1 = Math.min(t1, r);
    }
    return t0 <= t1;
  };
  return (
    clip(-dx, ax - x0) &&
    clip(dx, x1 - ax) &&
    clip(-dy, ay - y0) &&
    clip(dy, y1 - ay)
  );
}

/** Distance from a point to segment a–b. */
function segmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t =
    l2 > 0
      ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
      : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/** Crossing number of a ring (x, y interleaved) at a point, in float64. */
function insideRing(xy: Float64Array, x: number, y: number): boolean {
  const n = xy.length / 2;
  let inside = false;
  let px = xy[(n - 1) * 2]!;
  let py = xy[(n - 1) * 2 + 1]!;
  for (let i = 0; i < n; i++) {
    const vx = xy[i * 2]!;
    const vy = xy[i * 2 + 1]!;
    if (crosses(px, py, vx, vy, x, y)) {
      inside = !inside;
    }
    px = vx;
    py = vy;
  }
  return inside;
}

/**
 * The region's grid (`ClipGrid`): cells about square over the region's
 * box (one for up to 16 vertices), refined until no cell lists more than
 * 8 edges (a corridor's thin strip needs cells about as long as its
 * edges), while the region's rows fit `MAX_CLIP_REGION_ROWS` and each side
 * `MAX_CLIP_GRID`. Each cell lists the edges within a small margin of it,
 * its sample the candidate point farthest from them. Throws when a cell
 * would still hold more than `MAX_CLIP_CELL_EDGES` edges.
 */
function buildGrid(
  xy: Float64Array,
  box: readonly [number, number, number, number],
): ClipGrid {
  const n = xy.length / 2;
  const width = Math.max(box[2] - box[0], 1e-9);
  const height = Math.max(box[3] - box[1], 1e-9);
  // Columns and rows for about `cells` cells, each about square.
  const shape = (cells: number): [number, number] => {
    const columns = Math.min(
      MAX_CLIP_GRID,
      Math.max(1, Math.round(Math.sqrt((cells * width) / height))),
    );
    const rows = Math.min(
      MAX_CLIP_GRID,
      Math.max(1, Math.round(cells / columns)),
    );
    return [columns, rows];
  };
  const rowsOf = (columns: number, rows: number, lists: number[][]) =>
    CLIP_HEADER_ROWS +
    columns * rows +
    lists.reduce((sum, list) => sum + list.length, 0);
  const crowd = (lists: number[][]) =>
    lists.reduce((m, list) => Math.max(m, list.length), 0);
  let best: { columns: number; rows: number; lists: number[][] } | undefined;
  let tried = "";
  // Finer, a cell count doubling a step, until each cell holds few edges:
  // a fragment tests its cell's.
  for (
    let cells = n <= ONE_CELL_VERTICES ? 1 : n;
    cells <= MAX_CLIP_GRID * MAX_CLIP_GRID * 2;
    cells *= 2
  ) {
    const [columns, rows] = shape(cells);
    const key = `${columns}x${rows}`;
    if (key === tried) {
      continue; // clamped to the same grid
    }
    tried = key;
    const lists = binEdges(xy, box, columns, rows);
    if (rowsOf(columns, rows, lists) > MAX_CLIP_REGION_ROWS) {
      break;
    }
    if (best === undefined || crowd(lists) < crowd(best.lists)) {
      best = { columns, rows, lists };
    }
    if (crowd(lists) <= CELL_EDGES_TARGET) {
      break;
    }
  }
  // Too many rows at the first: coarser until they fit (one cell always
  // does, with at most 1,024 edges).
  for (let cells = n / 2; best === undefined; cells = Math.floor(cells / 2)) {
    const [columns, rows] = shape(Math.max(1, cells));
    const lists = binEdges(xy, box, columns, rows);
    if (rowsOf(columns, rows, lists) <= MAX_CLIP_REGION_ROWS || cells <= 1) {
      best = { columns, rows, lists };
    }
  }
  const most = crowd(best.lists);
  if (most > MAX_CLIP_CELL_EDGES) {
    throw new TerrainClipError(
      `${most} edges crowd into one cell of the region's grid (at most ${MAX_CLIP_CELL_EDGES}); simplify the polygon where its edges are densest, or split it into smaller regions.`,
    );
  }
  return gridOf(xy, box, best.columns, best.rows, best.lists);
}

/** Each cell's edges: those within a small margin of it. */
function binEdges(
  xy: Float64Array,
  box: readonly [number, number, number, number],
  columns: number,
  rows: number,
): number[][] {
  const n = xy.length / 2;
  const [bx0, by0, bx1, by1] = box;
  const w = (bx1 - bx0) / columns;
  const h = (by1 - by0) / rows;
  // A fragment's cell is found in float32: it may land in a neighbor, so
  // each cell lists the edges a little beyond it too.
  const margin = 1e-3 * Math.max(w, h) + 1e-3;
  const lists: number[][] = Array.from({ length: columns * rows }, () => []);
  const cellOf = (v: number, origin: number, step: number, count: number) =>
    Math.max(0, Math.min(count - 1, Math.floor((v - origin) / step)));
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n;
    const ax = xy[k * 2]!;
    const ay = xy[k * 2 + 1]!;
    const cx = xy[j * 2]!;
    const cy = xy[j * 2 + 1]!;
    const i0 = cellOf(Math.min(ax, cx) - margin, bx0, w, columns);
    const i1 = cellOf(Math.max(ax, cx) + margin, bx0, w, columns);
    const j0 = cellOf(Math.min(ay, cy) - margin, by0, h, rows);
    const j1 = cellOf(Math.max(ay, cy) + margin, by0, h, rows);
    for (let gy = j0; gy <= j1; gy++) {
      for (let gx = i0; gx <= i1; gx++) {
        const x0 = bx0 + gx * w - margin;
        const y0 = by0 + gy * h - margin;
        if (
          columns * rows === 1 ||
          segmentMeetsRect(
            ax,
            ay,
            cx,
            cy,
            x0,
            y0,
            x0 + w + 2 * margin,
            y0 + h + 2 * margin,
          )
        ) {
          lists[gy * columns + gx]!.push(k);
        }
      }
    }
  }
  return lists;
}

/** The grid's cells: their samples and edge lists (`ClipGrid`). */
function gridOf(
  xy: Float64Array,
  box: readonly [number, number, number, number],
  columns: number,
  rows: number,
  lists: number[][],
): ClipGrid {
  const n = xy.length / 2;
  const [bx0, by0, bx1, by1] = box;
  const w = (bx1 - bx0) / columns;
  const h = (by1 - by0) / rows;
  const cells = columns * rows;
  const first = new Uint32Array(cells);
  const count = new Uint32Array(cells);
  const inside = new Uint8Array(cells);
  const sample = new Float64Array(cells * 2);
  const edges: number[] = [];
  for (let c = 0; c < cells; c++) {
    const list = lists[c]!;
    const gx = c % columns;
    const gy = Math.floor(c / columns);
    // The sample: of a few points in the cell, the farthest from its edges.
    let best = -1;
    for (const [fx, fy] of SAMPLE_POINTS) {
      const sx = bx0 + (gx + fx) * w;
      const sy = by0 + (gy + fy) * h;
      let nearest = Infinity;
      for (const k of list) {
        const j = (k + 1) % n;
        nearest = Math.min(
          nearest,
          segmentDistance(
            sx,
            sy,
            xy[k * 2]!,
            xy[k * 2 + 1]!,
            xy[j * 2]!,
            xy[j * 2 + 1]!,
          ),
        );
      }
      if (nearest > best) {
        best = nearest;
        sample[c * 2] = sx;
        sample[c * 2 + 1] = sy;
      }
    }
    // Rounded as the GPU holds it, then classified.
    sample[c * 2] = Math.fround(sample[c * 2]!);
    sample[c * 2 + 1] = Math.fround(sample[c * 2 + 1]!);
    inside[c] = insideRing(xy, sample[c * 2]!, sample[c * 2 + 1]!) ? 1 : 0;
    first[c] = edges.length;
    count[c] = list.length;
    edges.push(...list);
  }
  return {
    columns,
    rows,
    first,
    count,
    inside,
    sample,
    edges: Uint32Array.from(edges),
  };
}

/** Candidate sample points in a cell, as fractions of its sides. */
const SAMPLE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.5],
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75],
  [0.5, 0.2],
  [0.5, 0.8],
  [0.2, 0.5],
  [0.8, 0.5],
];

/** The crossing-number step (surface.slang `crosses`). */
function crosses(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  qx: number,
  qy: number,
): boolean {
  return ay > qy !== by > qy && qx < ax + ((qy - ay) * (bx - ax)) / (by - ay);
}

/** Whether a plane point lies inside a region's polygon (crossing number). */
export function insideClipShape(
  shape: ClipShape,
  x: number,
  y: number,
): boolean {
  const [x0, y0, x1, y1] = shape.box;
  if (x < x0 || y < y0 || x > x1 || y > y1) {
    return false;
  }
  return insideRing(shape.xy, x, y);
}

/** Whether two rectangles (radians; west > east across 180°) overlap. */
export function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  if (a.south > b.north || b.south > a.north) {
    return false;
  }
  const spans = (r: Rectangle): Array<[number, number]> =>
    r.west <= r.east
      ? [[r.west, r.east]]
      : [
          [r.west, Math.PI],
          [-Math.PI, r.east],
        ];
  for (const [w0, e0] of spans(a)) {
    for (const [w1, e1] of spans(b)) {
      if (w0 <= e1 && w1 <= e0) {
        return true;
      }
    }
  }
  return false;
}

/** Whether a longitude and latitude (radians) lie in a rectangle's bounds. */
function inBounds(r: Rectangle, longitude: number, latitude: number): boolean {
  if (latitude < r.south || latitude > r.north) {
    return false;
  }
  const lon = wrapRadians(longitude);
  return r.west <= r.east
    ? lon >= r.west && lon <= r.east
    : lon >= r.west || lon <= r.east;
}

/**
 * @internal A region's rows for the GPU (surface.slang `insideTerrainClip`):
 * anchor hi and the plane's radius; anchor lo and the grid's columns and
 * rows (a uint, columns in the low 16 bits); east, north, up; the plane
 * box (`CLIP_HEADER_ROWS` in all). Then its grid's cells, row by row
 * (first edge row and count, with the sample's inside-ness in the count's
 * top bit, as uints; the sample's x and y); then each cell's edges, one a
 * row (both ends, x and y), so a fragment reads one row an edge. At most
 * `MAX_CLIP_REGION_ROWS` rows (`buildGrid`).
 */
export function packClipShape(shape: ClipShape): Float32Array {
  const { grid, xy } = shape;
  const n = xy.length / 2;
  const cells = grid.columns * grid.rows;
  const rows = CLIP_HEADER_ROWS + cells + grid.edges.length;
  const f = new Float32Array(rows * 4);
  const u = new Uint32Array(f.buffer);
  splitVec3(shape.anchor, f, 0, f, 4);
  f[3] = shape.radius;
  u[7] = (grid.columns | (grid.rows << 16)) >>> 0;
  f.set(shape.east, 8);
  f.set(shape.north, 12);
  f.set(shape.up, 16);
  f.set(shape.box, 20);
  const g = CLIP_HEADER_ROWS * 4;
  for (let c = 0; c < cells; c++) {
    u[g + c * 4] = grid.first[c]!;
    u[g + c * 4 + 1] = (grid.count[c]! | (grid.inside[c]! << 31)) >>> 0;
    f[g + c * 4 + 2] = grid.sample[c * 2]!;
    f[g + c * 4 + 3] = grid.sample[c * 2 + 1]!;
  }
  const e = g + cells * 4;
  grid.edges.forEach((k, i) => {
    const j = (k + 1) % n;
    f[e + i * 4] = xy[k * 2]!;
    f[e + i * 4 + 1] = xy[k * 2 + 1]!;
    f[e + i * 4 + 2] = xy[j * 2]!;
    f[e + i * 4 + 3] = xy[j * 2 + 1]!;
  });
  return f;
}

/**
 * @internal One region of a globe: its handle, shape and world slot, and
 * its opacity: 0 for a clip (not drawn inside), between 0 and 1 for a
 * translucent region (`Tileset3D.addTerrainTranslucency`).
 */
export interface ClipEntry {
  readonly clip: object;
  readonly shape: ClipShape;
  /** Its bit in draw records' `terrainClip` (`World.addTerrainClipRegion`). */
  readonly slot: number;
  /** 0: a clip. Default 0. */
  readonly opacity?: number;
  /** A translucent region picks don't stop at (`pickThrough`). */
  readonly pickThrough?: boolean;
}

/**
 * @internal A globe's clip regions as the CPU tests them: per tile (which
 * regions its draws test) and per point (picks, rays, height queries).
 */
export class TerrainClips {
  private readonly list: ClipEntry[] = [];
  /** Bumped by every change: tiles' masks are recomputed for it. */
  version = 0;
  private readonly scratch = new Float64Array(3);
  private readonly plane = new Float64Array(2);

  constructor(readonly ellipsoid: Ellipsoid = Ellipsoid.WGS84) {}

  get size(): number {
    return this.list.length;
  }

  get entries(): readonly ClipEntry[] {
    return this.list;
  }

  add(entry: ClipEntry): void {
    if (entry.slot < 0 || entry.slot >= MAX_TERRAIN_CLIPS) {
      throw new Error(`TerrainClips: slot ${entry.slot} out of range`);
    }
    this.list.push(entry);
    this.version++;
  }

  /**
   * Throws when, with `shape` added, a fragment where it overlaps other
   * regions could test more than `MAX_CLIP_FRAGMENT_EDGES` edges: the sum
   * of the most crowded cells of the regions whose costs (`ClipShape.cost`)
   * overlap its own. Checked as each region comes, it holds wherever
   * regions overlap: a fragment's regions all overlap the last of them.
   */
  checkBudget(shape: ClipShape): void {
    let edges = shape.maxCellEdges;
    let others = 0;
    for (const e of this.list) {
      if (rectanglesOverlap(e.shape.cost, shape.cost)) {
        edges += e.shape.maxCellEdges;
        others++;
      }
    }
    if (edges > MAX_CLIP_FRAGMENT_EDGES) {
      throw new TerrainClipError(
        `where this region overlaps ${others} other${others === 1 ? "" : "s"}, a fragment could test ${edges} edges (at most ${MAX_CLIP_FRAGMENT_EDGES}; this region's most crowded cell has ${shape.maxCellEdges}); simplify the polygon where its edges are densest, split it, or remove a region it overlaps.`,
      );
    }
  }

  remove(clip: object): ClipEntry | undefined {
    const i = this.list.findIndex((e) => e.clip === clip);
    if (i < 0) {
      return undefined;
    }
    const [entry] = this.list.splice(i, 1);
    this.version++;
    return entry;
  }

  /** The regions (a bit per slot) touching a tile's rectangle, radians. */
  maskFor(rectangle: Rectangle): number {
    let mask = 0;
    for (const e of this.list) {
      if (
        rectanglesOverlap(e.shape.bounds, rectangle) &&
        this.touches(e.shape, rectangle)
      ) {
        mask |= 1 << e.slot;
      }
    }
    return mask >>> 0;
  }

  /**
   * Whether a tile's rectangle (bounds already overlapping) may hold
   * fragments inside the region: its box in the region's plane meets a grid
   * cell with edges or inside. A long thin region (a corridor's strip)
   * spans many tiles' bounds but touches few. Tiles wider than 1° keep the
   * bounds' answer.
   */
  private touches(shape: ClipShape, r: Rectangle): boolean {
    const east = r.east < r.west ? r.east + 2 * Math.PI : r.east;
    if (east - r.west > RADIANS || r.north - r.south > RADIANS) {
      return true;
    }
    // The tile's edges sampled on the ellipsoid, boxed in the plane.
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        if (i !== 0 && i !== steps && j !== 0 && j !== steps) {
          continue;
        }
        this.ellipsoid.cartographicToCartesian(
          {
            longitude: r.west + ((east - r.west) * i) / steps,
            latitude: r.south + ((r.north - r.south) * j) / steps,
            height: 0,
          },
          this.scratch,
        );
        if (!clipPlane(shape, this.scratch, this.plane)) {
          return true;
        }
        x0 = Math.min(x0, this.plane[0]!);
        y0 = Math.min(y0, this.plane[1]!);
        x1 = Math.max(x1, this.plane[0]!);
        y1 = Math.max(y1, this.plane[1]!);
      }
    }
    // Room for the edges' bow between samples, and for heights: off the
    // ellipsoid a point lands up to h·d / 950,000 km from its foot.
    const size = Math.max(x1 - x0, y1 - y0);
    const far = Math.max(
      Math.abs(x0),
      Math.abs(x1),
      Math.abs(y0),
      Math.abs(y1),
    );
    const margin = 2 + 1e-3 * size + 1e-5 * far;
    x0 -= margin;
    y0 -= margin;
    x1 += margin;
    y1 += margin;
    const [bx0, by0, bx1, by1] = shape.box;
    if (x1 < bx0 || y1 < by0 || x0 > bx1 || y0 > by1) {
      return false;
    }
    const { grid } = shape;
    const { columns, rows } = grid;
    const w = (bx1 - bx0) / columns;
    const h = (by1 - by0) / rows;
    const cell = (v: number, origin: number, step: number, count: number) =>
      Math.max(0, Math.min(count - 1, Math.floor((v - origin) / step)));
    const cy1 = cell(y1, by0, h, rows);
    const cx1 = cell(x1, bx0, w, columns);
    for (let cy = cell(y0, by0, h, rows); cy <= cy1; cy++) {
      for (let cx = cell(x0, bx0, w, columns); cx <= cx1; cx++) {
        const c = cy * columns + cx;
        if (grid.count[c]! > 0 || grid.inside[c]! !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  /** The clips' entries (opacity 0), not the translucent regions'. */
  get clips(): readonly ClipEntry[] {
    return this.list.filter((e) => !(e.opacity! > 0));
  }

  /** The translucent regions' entries. */
  get translucent(): readonly ClipEntry[] {
    return this.list.filter((e) => e.opacity! > 0);
  }

  /** The translucent regions' slots, a bit each. */
  get translucentMask(): number {
    let mask = 0;
    for (const e of this.list) {
      if (e.opacity! > 0) {
        mask |= 1 << e.slot;
      }
    }
    return mask >>> 0;
  }

  /**
   * Whether an Earth-fixed point lies inside a clip (not drawn).
   * Translucent regions are drawn: not here.
   */
  clippedPoint(p: ArrayLike<number>): boolean {
    return this.inside(p, (e) => !(e.opacity! > 0));
  }

  /**
   * At an Earth-fixed point: whether it lies inside a translucent region
   * (`inside`), and inside one that picks stop at, not `pickThrough`
   * (`stops`). Clips aren't counted.
   */
  translucentAt(p: ArrayLike<number>): { inside: boolean; stops: boolean } {
    let inside = false;
    let stops = false;
    for (const e of this.list) {
      if (
        e.opacity! > 0 &&
        clipPlane(e.shape, p, this.plane) &&
        insideClipShape(e.shape, this.plane[0]!, this.plane[1]!)
      ) {
        inside = true;
        stops ||= e.pickThrough !== true;
      }
    }
    return { inside, stops };
  }

  /** Whether `p` lies inside a region `which` accepts. */
  private inside(
    p: ArrayLike<number>,
    which: (e: ClipEntry) => boolean,
  ): boolean {
    for (const e of this.list) {
      if (
        which(e) &&
        clipPlane(e.shape, p, this.plane) &&
        insideClipShape(e.shape, this.plane[0]!, this.plane[1]!)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Whether the terrain at a longitude, latitude (radians) and height (m)
   * is clipped.
   */
  clippedAt(longitude: number, latitude: number, height = 0): boolean {
    if (this.list.length === 0) {
      return false;
    }
    let candidate = false;
    for (const e of this.list) {
      if (!(e.opacity! > 0) && inBounds(e.shape.bounds, longitude, latitude)) {
        candidate = true;
        break;
      }
    }
    if (!candidate) {
      return false;
    }
    this.ellipsoid.cartographicToCartesian(
      { longitude, latitude, height },
      this.scratch,
    );
    return this.clippedPoint(this.scratch);
  }

  /** The union of the regions' bounds, per region (height listeners). */
  boundsOf(entry: ClipEntry): Rectangle[] {
    const b = entry.shape.bounds;
    return b.west <= b.east
      ? [b]
      : [
          { west: b.west, south: b.south, east: Math.PI, north: b.north },
          { west: -Math.PI, south: b.south, east: b.east, north: b.north },
        ];
  }
}
