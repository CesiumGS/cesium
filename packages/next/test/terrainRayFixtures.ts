/**
 * Synthetic loaded terrain for the ray tests: regular grid meshes quantized
 * as quantized-mesh tiles are, a strip target that answers `patchAt` from a
 * list of rectangles, and an independent clearance (the drawn triangle under
 * a point, along its geodetic normal) to check the traversal against.
 */
import { Ellipsoid, type Cartographic } from "../src/math/ellipsoid.ts";
import type { Rectangle, TerrainHeights } from "../src/globe/quantizedMesh.ts";
import type {
  TerrainRayPatch,
  TerrainRayTarget,
  TerrainRayTile,
} from "../src/globe/terrainRay.ts";
import { LEVEL_ZERO_ERROR } from "../src/globe/TerrainSource.ts";

export const WGS84 = Ellipsoid.WGS84;
export const A = WGS84.radii[0]!;

export function at(lon: number, lat: number, height: number): Float64Array {
  return WGS84.cartographicToCartesian(
    { longitude: lon, latitude: lat, height },
    new Float64Array(3),
  );
}

/** The quantized coordinate of grid line `i` of `n`. */
const line = (i: number, n: number) => Math.round((i / (n - 1)) * 32767);

/**
 * An `n`×`n` grid tile over `rectangle` with heights from `height(lon,
 * lat)` at each (quantized) vertex. Cell (i, j) splits into
 * (a, a+1, a+n) and (a+1, a+n+1, a+n), as the ellipsoid's flat tiles do.
 */
export function gridTile(
  rectangle: Rectangle,
  n: number,
  height: (lon: number, lat: number) => number,
  level = 14,
  geometricError = LEVEL_ZERO_ERROR / 2 ** level,
): TerrainRayTile {
  const count = n * n;
  const u = new Uint16Array(count);
  const v = new Uint16Array(count);
  const h = new Uint16Array(count);
  const metres = new Float64Array(count);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      u[k] = line(i, n);
      v[k] = line(j, n);
      metres[k] = height(
        rectangle.west + (u[k]! / 32767) * (rectangle.east - rectangle.west),
        rectangle.south + (v[k]! / 32767) * (rectangle.north - rectangle.south),
      );
    }
  }
  let minimumHeight = Infinity;
  let maximumHeight = -Infinity;
  for (const m of metres) {
    minimumHeight = Math.min(minimumHeight, m);
    maximumHeight = Math.max(maximumHeight, m);
  }
  const range = maximumHeight - minimumHeight;
  for (let k = 0; k < count; k++) {
    h[k] =
      range > 0
        ? Math.round(((metres[k]! - minimumHeight) / range) * 32767)
        : 0;
  }
  const triangles = new Uint32Array((n - 1) * (n - 1) * 6);
  let t = 0;
  for (let j = 0; j + 1 < n; j++) {
    for (let i = 0; i + 1 < n; i++) {
      const a = j * n + i;
      triangles.set([a, a + 1, a + n, a + 1, a + n + 1, a + n], t);
      t += 6;
    }
  }
  const heights: TerrainHeights = {
    u,
    v,
    h,
    triangles,
    minimumHeight,
    maximumHeight,
  };
  return { rectangle, heights, level, geometricError };
}

export interface StripEntry {
  rectangle: Rectangle;
  tile?: TerrainRayTile;
  unknown?: TerrainRayPatch["unknown"];
}

/** A target over a list of rectangles; a point outside them all throws. */
export function stripTarget(entries: StripEntry[]): TerrainRayTarget & {
  calls: number;
} {
  const target = {
    ellipsoid: WGS84,
    calls: 0,
    patchAt(longitude: number, latitude: number): TerrainRayPatch {
      target.calls++;
      const e = entries.find((x) => contains(x.rectangle, longitude, latitude));
      if (!e) {
        throw new Error(`no patch at ${longitude}, ${latitude}`);
      }
      return e.tile
        ? { rectangle: e.rectangle, tile: e.tile }
        : { rectangle: e.rectangle, unknown: e.unknown ?? "not drawn" };
    },
  };
  return target;
}

export function contains(r: Rectangle, lon: number, lat: number): boolean {
  return lon >= r.west && lon <= r.east && lat >= r.south && lat <= r.north;
}

/** Equal-width tiles side by side in longitude over [west, east]. */
export function strip(
  west: number,
  east: number,
  count: number,
  south: number,
  north: number,
): Rectangle[] {
  const w = (east - west) / count;
  return Array.from({ length: count }, (_, i) => ({
    west: west + i * w,
    east: i === count - 1 ? east : west + (i + 1) * w,
    south,
    north,
  }));
}

/** Earth-fixed vertex `k` of a tile, dequantized in float64. */
export function vertex(tile: TerrainRayTile, k: number): Float64Array {
  const { rectangle: r, heights: t } = tile;
  return at(
    r.west + (t.u[k]! / 32767) * (r.east - r.west),
    r.south + (t.v[k]! / 32767) * (r.north - r.south),
    t.minimumHeight + (t.h[k]! / 32767) * (t.maximumHeight - t.minimumHeight),
  );
}

const carto: Cartographic = { longitude: 0, latitude: 0, height: 0 };
const normal = new Float64Array(3);

/**
 * Height of `p` above the drawn surface under it, along its geodetic
 * normal: the plane of the grid triangle containing its footprint in (u, v)
 * (as `TerrainSource.surfaceHeight`). Undefined off every tile.
 */
export function clearanceAt(
  p: ArrayLike<number>,
  tiles: TerrainRayTile[],
  n: number,
): number | undefined {
  WGS84.cartesianToCartographic(p as Float64Array, carto);
  const tile = tiles.find((x) =>
    contains(x.rectangle, carto.longitude, carto.latitude),
  );
  if (!tile) {
    return undefined;
  }
  const r = tile.rectangle;
  const u = ((carto.longitude - r.west) / (r.east - r.west)) * 32767;
  const v = ((carto.latitude - r.south) / (r.north - r.south)) * 32767;
  const cell = (x: number) => {
    let i = Math.min(n - 2, Math.max(0, Math.floor((x / 32767) * (n - 1))));
    while (i > 0 && line(i, n) > x) {
      i--;
    }
    while (i < n - 2 && line(i + 1, n) < x) {
      i++;
    }
    return i;
  };
  const i = cell(u);
  const j = cell(v);
  const a = j * n + i;
  const t = tile.heights;
  let best: number[] | undefined;
  let bestScore = -Infinity;
  for (const tri of [
    [a, a + 1, a + n],
    [a + 1, a + n + 1, a + n],
  ]) {
    const [p0, p1, p2] = tri as [number, number, number];
    const d =
      (t.v[p1]! - t.v[p2]!) * (t.u[p0]! - t.u[p2]!) +
      (t.u[p2]! - t.u[p1]!) * (t.v[p0]! - t.v[p2]!);
    const l1 =
      ((t.v[p1]! - t.v[p2]!) * (u - t.u[p2]!) +
        (t.u[p2]! - t.u[p1]!) * (v - t.v[p2]!)) /
      d;
    const l2 =
      ((t.v[p2]! - t.v[p0]!) * (u - t.u[p2]!) +
        (t.u[p0]! - t.u[p2]!) * (v - t.v[p2]!)) /
      d;
    const score = Math.min(l1, l2, 1 - l1 - l2);
    if (score > bestScore) {
      bestScore = score;
      best = tri;
    }
  }
  const [q0, q1, q2] = best!.map((k) => vertex(tile, k)) as [
    Float64Array,
    Float64Array,
    Float64Array,
  ];
  const e1 = [q1[0]! - q0[0]!, q1[1]! - q0[1]!, q1[2]! - q0[2]!];
  const e2 = [q2[0]! - q0[0]!, q2[1]! - q0[1]!, q2[2]! - q0[2]!];
  const N = [
    e1[1]! * e2[2]! - e1[2]! * e2[1]!,
    e1[2]! * e2[0]! - e1[0]! * e2[2]!,
    e1[0]! * e2[1]! - e1[1]! * e2[0]!,
  ];
  WGS84.geodeticSurfaceNormalCartographic(carto, normal);
  const along =
    (p[0]! - q0[0]!) * N[0]! +
    (p[1]! - q0[1]!) * N[1]! +
    (p[2]! - q0[2]!) * N[2]!;
  return along / (normal[0]! * N[0]! + normal[1]! * N[1]! + normal[2]! * N[2]!);
}

/** Distance from `p` to the nearest of a tile's triangles, m. */
export function distanceToTile(
  p: ArrayLike<number>,
  tile: TerrainRayTile,
): number {
  const tri = tile.heights.triangles;
  let best = Infinity;
  for (let k = 0; k + 2 < tri.length; k += 3) {
    best = Math.min(
      best,
      pointTriangle(
        p,
        vertex(tile, tri[k]!),
        vertex(tile, tri[k + 1]!),
        vertex(tile, tri[k + 2]!),
      ),
    );
  }
  return best;
}

/** Ericson's closest point on a triangle, as a distance. */
function pointTriangle(
  p: ArrayLike<number>,
  a: Float64Array,
  b: Float64Array,
  c: Float64Array,
): number {
  const sub = (x: ArrayLike<number>, y: ArrayLike<number>) => [
    x[0]! - y[0]!,
    x[1]! - y[1]!,
    x[2]! - y[2]!,
  ];
  const dot = (x: number[], y: number[]) =>
    x[0]! * y[0]! + x[1]! * y[1]! + x[2]! * y[2]!;
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  const dist = (q: number[]) =>
    Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
  const point = (s: number, t: number) => [
    a[0]! + s * ab[0]! + t * ac[0]!,
    a[1]! + s * ab[1]! + t * ac[1]!,
    a[2]! + s * ab[2]! + t * ac[2]!,
  ];
  if (d1 <= 0 && d2 <= 0) {
    return dist(point(0, 0));
  }
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) {
    return dist(point(1, 0));
  }
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    return dist(point(d1 / (d1 - d3), 0));
  }
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) {
    return dist(point(0, 1));
  }
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    return dist(point(0, d2 / (d2 - d6)));
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return dist(point(1 - w, w));
  }
  const denom = 1 / (va + vb + vc);
  return dist(point(vb * denom, vc * denom));
}

/**
 * The true lowest clearance along `from`–`to`: dense samples, then finer
 * ones around the best, then a golden-section polish.
 */
export function trueMinimumClearance(
  from: Float64Array,
  to: Float64Array,
  tiles: TerrainRayTile[],
  n: number,
): { meters: number; t: number } {
  const length = Math.hypot(
    to[0]! - from[0]!,
    to[1]! - from[1]!,
    to[2]! - from[2]!,
  );
  const p = new Float64Array(3);
  const c = (t: number) => {
    for (let i = 0; i < 3; i++) {
      p[i] = from[i]! + (to[i]! - from[i]!) * t;
    }
    return clearanceAt(p, tiles, n) ?? Infinity;
  };
  let bestT = 0;
  let best = Infinity;
  const scan = (lo: number, hi: number, count: number) => {
    for (let k = 0; k <= count; k++) {
      const t = Math.min(1, Math.max(0, lo + ((hi - lo) * k) / count));
      const value = c(t);
      if (value < best) {
        best = value;
        bestT = t;
      }
    }
  };
  scan(0, 1, Math.ceil(length / 0.5));
  const coarse = 0.5 / length;
  scan(bestT - coarse, bestT + coarse, 1000);
  const fine = (2 * coarse) / 1000;
  let lo = Math.max(0, bestT - fine);
  let hi = Math.min(1, bestT + fine);
  const g = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 80; k++) {
    const a = hi - g * (hi - lo);
    const b = lo + g * (hi - lo);
    if (c(a) < c(b)) {
      hi = b;
    } else {
      lo = a;
    }
  }
  scan(lo, hi, 2);
  return { meters: best, t: bestT };
}
