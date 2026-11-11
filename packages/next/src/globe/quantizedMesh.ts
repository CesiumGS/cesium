/**
 * Quantized-mesh 1.0 terrain tiles (Cesium World Terrain): decode in a
 * worker into a mesh ready for the draw-record pipeline. Follows 1.x
 * `CesiumTerrainProvider` / `QuantizedMeshTerrainData`:
 *
 * - header: tile center (Earth-fixed), height range, bounding sphere,
 *   horizon-occlusion point;
 * - vertices: u, v, height quantized to 0..32767, zigzag-delta encoded;
 * - triangles: high-water-mark encoded indices (32-bit above 64k vertices);
 * - edge vertex lists (west, south, east, north), used for skirts;
 * - extensions: oct-encoded vertex normals (1), water mask (2), metadata
 *   (4, JSON: availability of descendant tiles).
 *
 * Positions come out relative to the tile center, in Earth-fixed axes;
 * skirts hang `skirtHeight` below each edge to hide cracks between levels.
 */
import { Ellipsoid } from "../math/ellipsoid.ts";
import { horizonCullingPoint } from "../math/horizon.ts";
import type { GltfAsset, GltfMesh } from "../io/gltfTypes.ts";
import { HEIGHT_NORMAL_ATTRIBUTE } from "./heightNormal.ts";

/** What a decode may be asked besides the tile (`TerrainLoader`'s request). */
export interface TerrainDecodeOptions {
  /** Also write each vertex's `h·n̂` (`HEIGHT_NORMAL_ATTRIBUTE`). */
  heightNormal?: boolean;
}

/** A tile's extent in radians. */
export interface Rectangle {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Ranges of available tiles at one level (inclusive). */
export interface TileRange {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/** What a decoded terrain tile carries besides its mesh. */
export interface TerrainTileInfo {
  minimumHeight: number;
  maximumHeight: number;
  /** Earth-fixed bounding sphere. */
  sphere: { center: [number, number, number]; radius: number };
  /** Undefined when none exists (a tile spanning a hemisphere). */
  horizonOcclusionPoint?: [number, number, number];
  /**
   * The point 1.x culls the tile with: the header's, or for a tile reaching
   * below the ellipsoid one recomputed from its vertices against an
   * ellipsoid shrunk by the minimum height. Undefined: no horizon test.
   */
  occludee?: [number, number, number];
  /**
   * Height range of the mesh clipped to each quadrant (south-west,
   * south-east, north-west, north-east): what 1.x's upsampled children of
   * this tile are bounded by.
   */
  quadrants: [number, number][];
  /**
   * Availability of descendants from the metadata extension: entry i holds
   * the ranges at level + 1 + i.
   */
  available?: TileRange[][];
  /**
   * The quantized vertices and triangles (no skirts), kept on the CPU for
   * height queries (`interpolateHeight`, as 1.x's terrain data does).
   */
  heights?: TerrainHeights;
}

/** A terrain tile's surface for height queries. */
export interface TerrainHeights {
  /** u, v and height per vertex, 0..32767 (v from the south). */
  u: Uint16Array;
  v: Uint16Array;
  h: Uint16Array;
  triangles: Uint32Array;
  minimumHeight: number;
  maximumHeight: number;
  /**
   * Oct-encoded vertex normals (two bytes a vertex), when the tile has
   * them: tiles upsampled from this one interpolate them.
   */
  normals?: Uint8Array;
}

/**
 * The triangle containing (u, v) in [0, 1]² of the tile (vertex indices),
 * as `interpolateHeight` finds it; undefined if none does.
 */
export function containingTriangle(
  t: TerrainHeights,
  uNormalized: number,
  vNormalized: number,
): [number, number, number] | undefined {
  const u = Math.min(Math.max(uNormalized, 0), 1) * 32767;
  const v = Math.min(Math.max(vNormalized, 0), 1) * 32767;
  const { u: us, v: vs, triangles } = t;
  for (let i = 0; i + 2 < triangles.length; i += 3) {
    const i0 = triangles[i]!;
    const i1 = triangles[i + 1]!;
    const i2 = triangles[i + 2]!;
    const u0 = us[i0]!,
      u1 = us[i1]!,
      u2 = us[i2]!;
    const v0 = vs[i0]!,
      v1 = vs[i1]!,
      v2 = vs[i2]!;
    if (
      u < Math.min(u0, u1, u2) ||
      u > Math.max(u0, u1, u2) ||
      v < Math.min(v0, v1, v2) ||
      v > Math.max(v0, v1, v2)
    ) {
      continue;
    }
    const x1mx3 = u0 - u2;
    const x3mx2 = u2 - u1;
    const y2my3 = v1 - v2;
    const y1my3 = v0 - v2;
    const inverse = 1 / (y2my3 * x1mx3 + x3mx2 * y1my3);
    const l1 = (y2my3 * (u - u2) + x3mx2 * (v - v2)) * inverse;
    const l2 = (-y1my3 * (u - u2) + x1mx3 * (v - v2)) * inverse;
    if (l1 >= -1e-15 && l2 >= -1e-15 && 1 - l1 - l2 >= -1e-15) {
      return [i0, i1, i2];
    }
  }
  return undefined;
}

/**
 * Height at (u, v) in [0, 1]² of the tile, interpolated in the triangle
 * containing it (1.x QuantizedMeshTerrainData.interpolateHeight), or
 * undefined if no triangle contains it.
 */
export function interpolateHeight(
  t: TerrainHeights,
  uNormalized: number,
  vNormalized: number,
): number | undefined {
  const u = Math.min(Math.max(uNormalized, 0), 1) * 32767;
  const v = Math.min(Math.max(vNormalized, 0), 1) * 32767;
  const { u: us, v: vs, h: hs, triangles } = t;
  for (let i = 0; i + 2 < triangles.length; i += 3) {
    const i0 = triangles[i]!;
    const i1 = triangles[i + 1]!;
    const i2 = triangles[i + 2]!;
    const u0 = us[i0]!,
      u1 = us[i1]!,
      u2 = us[i2]!;
    const v0 = vs[i0]!,
      v1 = vs[i1]!,
      v2 = vs[i2]!;
    if (
      u < Math.min(u0, u1, u2) ||
      u > Math.max(u0, u1, u2) ||
      v < Math.min(v0, v1, v2) ||
      v > Math.max(v0, v1, v2)
    ) {
      continue;
    }
    // 1.x Intersections2D.computeBarycentricCoordinates.
    const x1mx3 = u0 - u2;
    const x3mx2 = u2 - u1;
    const y2my3 = v1 - v2;
    const y1my3 = v0 - v2;
    const inverse = 1 / (y2my3 * x1mx3 + x3mx2 * y1my3);
    const ymy3 = v - v2;
    const xmx3 = u - u2;
    const l1 = (y2my3 * xmx3 + x3mx2 * ymy3) * inverse;
    const l2 = (-y1my3 * xmx3 + x1mx3 * ymy3) * inverse;
    const l3 = 1 - l1 - l2;
    if (l1 >= -1e-15 && l2 >= -1e-15 && l3 >= -1e-15) {
      const q = l1 * hs[i0]! + l2 * hs[i1]! + l3 * hs[i2]!;
      return (
        t.minimumHeight + (q / 32767) * (t.maximumHeight - t.minimumHeight)
      );
    }
  }
  return undefined;
}

const EXT_OCT_NORMALS = 1;
const EXT_METADATA = 4;

/** 1.x AttributeCompression.octDecode for 8-bit components. */
function octDecode(x: number, y: number, out: Float32Array, o: number): void {
  let nx = (x / 255) * 2 - 1;
  let ny = (y / 255) * 2 - 1;
  const nz = 1 - (Math.abs(nx) + Math.abs(ny));
  if (nz < 0) {
    const ox = nx;
    nx = (1 - Math.abs(ny)) * Math.sign(ox || 1);
    ny = (1 - Math.abs(ox)) * Math.sign(ny || 1);
  }
  const len = Math.hypot(nx, ny, nz) || 1;
  out[o] = nx / len;
  out[o + 1] = ny / len;
  out[o + 2] = nz / len;
}

function zigZagDeltaDecode(u: Uint16Array, v: Uint16Array, h: Uint16Array) {
  let uu = 0;
  let vv = 0;
  let hh = 0;
  for (let i = 0; i < u.length; i++) {
    uu += (u[i]! >> 1) ^ -(u[i]! & 1);
    vv += (v[i]! >> 1) ^ -(v[i]! & 1);
    hh += (h[i]! >> 1) ^ -(h[i]! & 1);
    u[i] = uu;
    v[i] = vv;
    h[i] = hh;
  }
}

/**
 * Height range of the mesh clipped to each quadrant (1.x
 * upsampleQuantizedTerrainMesh bounds). Heights are linear over each
 * triangle, so the clipped pieces' extremes lie at their corners: the
 * vertices inside a quadrant, edge crossings of the midlines, and the
 * tile's center.
 */
function quadrantHeights(
  u: Uint16Array,
  v: Uint16Array,
  h: Uint16Array,
  triangles: Uint32Array,
  minimumHeight: number,
  range: number,
): [number, number][] {
  const MID = 32767 / 2;
  const out: [number, number][] = [0, 1, 2, 3].map(() => [Infinity, -Infinity]);
  const height = (q: number) => minimumHeight + (q / 32767) * range;
  // Adds a point to every quadrant it lies in (both sides of a midline).
  const add = (uu: number, vv: number, hh: number) => {
    for (let q = 0; q < 4; q++) {
      const east = (q & 1) === 1;
      const north = (q & 2) === 2;
      if ((east ? uu >= MID : uu <= MID) && (north ? vv >= MID : vv <= MID)) {
        const r = out[q]!;
        r[0] = Math.min(r[0], hh);
        r[1] = Math.max(r[1], hh);
      }
    }
  };
  for (let i = 0; i < u.length; i++) {
    add(u[i]!, v[i]!, height(h[i]!));
  }
  for (let t = 0; t + 2 < triangles.length; t += 3) {
    const a = triangles[t]!;
    const b = triangles[t + 1]!;
    const c = triangles[t + 2]!;
    for (const [i, j] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const ui = u[i]!,
        uj = u[j]!,
        vi = v[i]!,
        vj = v[j]!;
      const hi = height(h[i]!),
        hj = height(h[j]!);
      if ((ui - MID) * (uj - MID) < 0) {
        const s = (MID - ui) / (uj - ui);
        add(MID, vi + s * (vj - vi), hi + s * (hj - hi));
      }
      if ((vi - MID) * (vj - MID) < 0) {
        const s = (MID - vi) / (vj - vi);
        add(ui + s * (uj - ui), MID, hi + s * (hj - hi));
      }
    }
    // The tile's center, inside this triangle.
    const ua = u[a]!,
      va = v[a]!;
    const d = (v[b]! - v[c]!) * (ua - u[c]!) + (u[c]! - u[b]!) * (va - v[c]!);
    if (d !== 0) {
      const l1 =
        ((v[b]! - v[c]!) * (MID - u[c]!) + (u[c]! - u[b]!) * (MID - v[c]!)) / d;
      const l2 =
        ((v[c]! - va) * (MID - u[c]!) + (ua - u[c]!) * (MID - v[c]!)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 >= 0 && l2 >= 0 && l3 >= 0) {
        add(
          MID,
          MID,
          l1 * height(h[a]!) + l2 * height(h[b]!) + l3 * height(h[c]!),
        );
      }
    }
  }
  return out;
}

/**
 * Decodes one tile. `rect` is the tile's extent; `skirtHeight` in meters
 * (1.x: five times the level's maximum geometric error).
 */
export function decodeQuantizedMesh(
  buffer: ArrayBuffer,
  rect: Rectangle,
  skirtHeight: number | readonly number[],
  options: TerrainDecodeOptions = {},
): { asset: GltfAsset; info: TerrainTileInfo; transfer: Transferable[] } {
  const view = new DataView(buffer);
  let pos = 0;
  const f64 = () => {
    const v = view.getFloat64(pos, true);
    pos += 8;
    return v;
  };
  const center: [number, number, number] = [f64(), f64(), f64()];
  const minimumHeight = view.getFloat32(pos, true);
  const maximumHeight = view.getFloat32(pos + 4, true);
  pos += 8;
  const sphere = {
    center: [f64(), f64(), f64()] as [number, number, number],
    radius: f64(),
  };
  const horizonOcclusionPoint: [number, number, number] = [f64(), f64(), f64()];

  const vertexCount = view.getUint32(pos, true);
  pos += 4;
  const encoded = new Uint16Array(buffer.slice(pos, pos + vertexCount * 6));
  pos += vertexCount * 6;
  const u = encoded.subarray(0, vertexCount);
  const v = encoded.subarray(vertexCount, 2 * vertexCount);
  const h = encoded.subarray(2 * vertexCount, 3 * vertexCount);
  zigZagDeltaDecode(u, v, h);

  const wide = vertexCount > 65536;
  const bytesPerIndex = wide ? 4 : 2;
  if (pos % bytesPerIndex !== 0) {
    pos += bytesPerIndex - (pos % bytesPerIndex);
  }
  const readIndices = (count: number): Uint32Array => {
    const out = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
      out[i] = wide
        ? view.getUint32(pos + i * 4, true)
        : view.getUint16(pos + i * 2, true);
    }
    pos += count * bytesPerIndex;
    return out;
  };
  const triangleCount = view.getUint32(pos, true);
  pos += 4;
  const triangles = readIndices(triangleCount * 3);
  // High-water-mark decoding.
  let highest = 0;
  for (let i = 0; i < triangles.length; i++) {
    const code = triangles[i]!;
    triangles[i] = highest - code;
    if (code === 0) {
      highest++;
    }
  }
  const edges: Uint32Array[] = [];
  for (let e = 0; e < 4; e++) {
    const n = view.getUint32(pos, true);
    pos += 4;
    edges.push(readIndices(n));
  }

  let octNormals: Uint8Array | undefined;
  let available: TileRange[][] | undefined;
  while (pos < view.byteLength) {
    const id = view.getUint8(pos);
    const length = view.getUint32(pos + 1, true);
    pos += 5;
    if (id === EXT_OCT_NORMALS) {
      // A copy: kept with the heights for upsampling, so transferred.
      octNormals = new Uint8Array(buffer.slice(pos, pos + vertexCount * 2));
    } else if (id === EXT_METADATA) {
      const jsonLength = view.getUint32(pos, true);
      const text = new TextDecoder().decode(
        new Uint8Array(buffer, pos + 4, jsonLength),
      );
      try {
        available = JSON.parse(text).available;
      } catch {
        // Malformed metadata: availability stays unknown.
      }
    }
    pos += length;
  }

  return buildTerrainTile({
    rect,
    skirtHeight,
    center,
    minimumHeight,
    maximumHeight,
    sphere,
    horizonOcclusionPoint,
    u,
    v,
    h,
    triangles,
    edges,
    octNormals,
    available,
    keepHeights: true,
    ...(options.heightNormal ? { heightNormal: true } : {}),
  });
}

/** A terrain tile's decoded contents, before its mesh is built. */
interface TerrainTileData {
  rect: Rectangle;
  /** Meters; or per edge: west, south, east, north. */
  skirtHeight: number | readonly number[];
  /** Earth-fixed center: positions are relative to it. */
  center: [number, number, number];
  minimumHeight: number;
  maximumHeight: number;
  sphere: { center: [number, number, number]; radius: number };
  horizonOcclusionPoint?: [number, number, number] | undefined;
  /** Quantized u, v, height per vertex (0..32767), v from the south. */
  u: Uint16Array;
  v: Uint16Array;
  h: Uint16Array;
  triangles: Uint32Array;
  /** Edge vertex indices: west, south, east, north. */
  edges: Uint32Array[];
  octNormals?: Uint8Array | undefined;
  /** Unit normals per vertex (x, y, z), where there are no oct normals. */
  vertexNormals?: Float32Array | undefined;
  available?: TileRange[][] | undefined;
  /** Keep the vertices and triangles for height queries (data tiles). */
  keepHeights?: boolean;
  /** Write `HEIGHT_NORMAL_ATTRIBUTE` for each vertex. */
  heightNormal?: boolean;
}

/**
 * The vertices (quantized) and triangles of a flat `n`×`n` ellipsoid tile:
 * what `flatTerrainTile` draws, for ray queries against the ellipsoid.
 */
export function flatTerrainHeights(n = 16): TerrainHeights {
  const count = n * n;
  const u = new Uint16Array(count);
  const v = new Uint16Array(count);
  const h = new Uint16Array(count);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      u[k] = Math.round((i / (n - 1)) * 32767);
      v[k] = Math.round((j / (n - 1)) * 32767);
    }
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
  return { u, v, h, triangles, minimumHeight: 0, maximumHeight: 0 };
}

/**
 * A flat tile on the ellipsoid (1.x `EllipsoidTerrainProvider`): an
 * `n`×`n` grid at height 0, with skirts, built without any data.
 */
export function flatTerrainTile(
  rect: Rectangle,
  skirtHeight: number | readonly number[],
  n = 16,
  options: TerrainDecodeOptions = {},
): { asset: GltfAsset; info: TerrainTileInfo; transfer: Transferable[] } {
  const count = n * n;
  const { u, v, h, triangles } = flatTerrainHeights(n);
  const positions = new Float64Array(count * 3);
  const p = new Float64Array(3);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      Ellipsoid.WGS84.cartographicToCartesian(
        {
          longitude: rect.west + (i / (n - 1)) * (rect.east - rect.west),
          latitude: rect.south + (j / (n - 1)) * (rect.north - rect.south),
          height: 0,
        },
        p,
      );
      positions.set(p, (j * n + i) * 3);
    }
  }
  const column = (i: number) =>
    Uint32Array.from({ length: n }, (_, j) => j * n + i);
  const row = (j: number) =>
    Uint32Array.from({ length: n }, (_, i) => j * n + i);
  // Center and bounds from the grid itself.
  const mid = n >> 1;
  const center: [number, number, number] = [
    positions[(mid * n + mid) * 3]!,
    positions[(mid * n + mid) * 3 + 1]!,
    positions[(mid * n + mid) * 3 + 2]!,
  ];
  let radius = 0;
  for (let k = 0; k < count; k++) {
    radius = Math.max(
      radius,
      Math.hypot(
        positions[k * 3]! - center[0],
        positions[k * 3 + 1]! - center[1],
        positions[k * 3 + 2]! - center[2],
      ),
    );
  }
  const occludee = horizonCullingPoint(center, positions, 0);
  return buildTerrainTile({
    rect,
    skirtHeight,
    center,
    minimumHeight: 0,
    maximumHeight: 0,
    sphere: { center, radius },
    // None for very large tiles (their points don't all face one way):
    // they are never horizon-culled.
    horizonOcclusionPoint: occludee
      ? [occludee[0]!, occludee[1]!, occludee[2]!]
      : undefined,
    u,
    v,
    h,
    triangles,
    edges: [column(0), row(0), column(n - 1), row(n - 1)],
    ...(options.heightNormal ? { heightNormal: true } : {}),
  });
}

/** A clipped polygon's corner: tile u, v (0..32767), height, normal. */
interface Corner {
  u: number;
  v: number;
  height: number;
  nx: number;
  ny: number;
  nz: number;
}

/** The point a fraction `s` of the way from `a` to `b`. */
function crossing(a: Corner, b: Corner, s: number): Corner {
  return {
    u: a.u + s * (b.u - a.u),
    v: a.v + s * (b.v - a.v),
    height: a.height + s * (b.height - a.height),
    nx: a.nx + s * (b.nx - a.nx),
    ny: a.ny + s * (b.ny - a.ny),
    nz: a.nz + s * (b.nz - a.nz),
  };
}

/**
 * One Sutherland–Hodgman step: the part of `polygon` where
 * `sign · (corner[axis] − bound) ≥ 0`.
 */
function clipPolygon(
  polygon: Corner[],
  axis: "u" | "v",
  bound: number,
  sign: number,
): Corner[] {
  const out: Corner[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const da = sign * (a[axis] - bound);
    const db = sign * (b[axis] - bound);
    if (da >= 0) {
      out.push(a);
    }
    if (da >= 0 !== db >= 0) {
      out.push(crossing(a, b, da / (da - db)));
    }
  }
  return out;
}

/**
 * A tile below the last level with data (1.x
 * `upsampleQuantizedTerrainMesh`): the mesh of the nearest tile with data
 * (`parent`, over `parentRect`), clipped to `rect` and quantized again over
 * it, with skirts. Its surface is the parent's, so its imagery can refine
 * while the terrain stays as the data has it. Normals are interpolated from
 * the parent's (geodetic up without them). `skirtHeight` is one depth, or
 * one per edge (west, south, east, north).
 */
export function upsampleTerrainTile(
  parent: TerrainHeights,
  parentRect: Rectangle,
  rect: Rectangle,
  skirtHeight: number | readonly number[],
  options: TerrainDecodeOptions = {},
): { asset: GltfAsset; info: TerrainTileInfo; transfer: Transferable[] } {
  const width = parentRect.east - parentRect.west;
  const height = parentRect.north - parentRect.south;
  // The tile's extent in the parent's quantized coordinates.
  const u0 = ((rect.west - parentRect.west) / width) * 32767;
  const u1 = ((rect.east - parentRect.west) / width) * 32767;
  const v0 = ((rect.south - parentRect.south) / height) * 32767;
  const v1 = ((rect.north - parentRect.south) / height) * 32767;
  const range = parent.maximumHeight - parent.minimumHeight;
  const normal = new Float32Array(3);
  const corner = (i: number): Corner => {
    if (parent.normals) {
      octDecode(parent.normals[i * 2]!, parent.normals[i * 2 + 1]!, normal, 0);
    }
    return {
      u: parent.u[i]!,
      v: parent.v[i]!,
      height: parent.minimumHeight + (parent.h[i]! / 32767) * range,
      nx: normal[0]!,
      ny: normal[1]!,
      nz: normal[2]!,
    };
  };

  // Vertices keyed by their quantized place in the tile: corners shared by
  // neighboring triangles (and crossings of a shared edge) merge.
  const index = new Map<number, number>();
  const us: number[] = [];
  const vs: number[] = [];
  const heights: number[] = [];
  const normals: number[] = [];
  const triangles: number[] = [];
  const add = (c: Corner): number => {
    const u = Math.min(
      Math.max(Math.round(((c.u - u0) / (u1 - u0)) * 32767), 0),
      32767,
    );
    const v = Math.min(
      Math.max(Math.round(((c.v - v0) / (v1 - v0)) * 32767), 0),
      32767,
    );
    const key = u * 32768 + v;
    let i = index.get(key);
    if (i === undefined) {
      i = us.length;
      index.set(key, i);
      us.push(u);
      vs.push(v);
      heights.push(c.height);
      const length = Math.hypot(c.nx, c.ny, c.nz) || 1;
      normals.push(c.nx / length, c.ny / length, c.nz / length);
    }
    return i;
  };
  const t = parent.triangles;
  for (let k = 0; k + 2 < t.length; k += 3) {
    const a = t[k]!;
    const b = t[k + 1]!;
    const c = t[k + 2]!;
    const pu = [parent.u[a]!, parent.u[b]!, parent.u[c]!];
    const pv = [parent.v[a]!, parent.v[b]!, parent.v[c]!];
    if (
      Math.max(...pu) <= u0 ||
      Math.min(...pu) >= u1 ||
      Math.max(...pv) <= v0 ||
      Math.min(...pv) >= v1
    ) {
      continue;
    }
    let polygon = [corner(a), corner(b), corner(c)];
    polygon = clipPolygon(polygon, "u", u0, 1);
    polygon = clipPolygon(polygon, "u", u1, -1);
    polygon = clipPolygon(polygon, "v", v0, 1);
    polygon = clipPolygon(polygon, "v", v1, -1);
    if (polygon.length < 3) {
      continue;
    }
    const first = add(polygon[0]!);
    for (let i = 1; i + 1 < polygon.length; i++) {
      const j = add(polygon[i]!);
      const l = add(polygon[i + 1]!);
      if (first !== j && j !== l && l !== first) {
        triangles.push(first, j, l);
      }
    }
  }

  const count = us.length;
  let minimumHeight = Infinity;
  let maximumHeight = -Infinity;
  for (const h of heights) {
    minimumHeight = Math.min(minimumHeight, h);
    maximumHeight = Math.max(maximumHeight, h);
  }
  if (count === 0) {
    minimumHeight = maximumHeight = parent.minimumHeight;
  }
  const childRange = maximumHeight - minimumHeight;
  // u, v and h in one buffer, as decoded tiles keep them (transferred once).
  const uvh = new Uint16Array(count * 3);
  const u = uvh.subarray(0, count);
  const v = uvh.subarray(count, 2 * count);
  const h = uvh.subarray(2 * count, 3 * count);
  const west: number[] = [];
  const south: number[] = [];
  const east: number[] = [];
  const north: number[] = [];
  for (let i = 0; i < count; i++) {
    u[i] = us[i]!;
    v[i] = vs[i]!;
    h[i] =
      childRange > 0
        ? Math.round(((heights[i]! - minimumHeight) / childRange) * 32767)
        : 0;
    if (u[i] === 0) {
      west.push(i);
    }
    if (v[i] === 0) {
      south.push(i);
    }
    if (u[i] === 32767) {
      east.push(i);
    }
    if (v[i] === 32767) {
      north.push(i);
    }
  }

  // Center, bounding sphere and horizon point from the vertices.
  const ellipsoid = Ellipsoid.WGS84;
  const center = ellipsoid.cartographicToCartesian(
    {
      longitude: (rect.west + rect.east) / 2,
      latitude: (rect.south + rect.north) / 2,
      height: (minimumHeight + maximumHeight) / 2,
    },
    new Float64Array(3),
  );
  const positions = new Float64Array(count * 3);
  const p = new Float64Array(3);
  let radius = 0;
  for (let i = 0; i < count; i++) {
    ellipsoid.cartographicToCartesian(
      {
        longitude: rect.west + (u[i]! / 32767) * (rect.east - rect.west),
        latitude: rect.south + (v[i]! / 32767) * (rect.north - rect.south),
        height: heights[i]!,
      },
      p,
    );
    positions.set(p, i * 3);
    radius = Math.max(
      radius,
      Math.hypot(p[0]! - center[0]!, p[1]! - center[1]!, p[2]! - center[2]!),
    );
  }
  const occludee = horizonCullingPoint(center, positions, minimumHeight);
  const c: [number, number, number] = [center[0]!, center[1]!, center[2]!];
  return buildTerrainTile({
    rect,
    skirtHeight,
    center: c,
    minimumHeight,
    maximumHeight,
    sphere: { center: c, radius },
    horizonOcclusionPoint: occludee
      ? [occludee[0]!, occludee[1]!, occludee[2]!]
      : undefined,
    u,
    v,
    h,
    triangles: Uint32Array.from(triangles),
    edges: [west, south, east, north].map((e) => Uint32Array.from(e)),
    vertexNormals: parent.normals ? Float32Array.from(normals) : undefined,
    keepHeights: true,
    ...(options.heightNormal ? { heightNormal: true } : {}),
  });
}

/** Vertices, skirts, normals and bounds of a decoded terrain tile. */
function buildTerrainTile(d: TerrainTileData): {
  asset: GltfAsset;
  info: TerrainTileInfo;
  transfer: Transferable[];
} {
  const {
    rect,
    skirtHeight,
    center,
    minimumHeight,
    maximumHeight,
    sphere,
    horizonOcclusionPoint,
    u,
    v,
    h,
    triangles,
    edges,
    octNormals,
    vertexNormals,
    available,
  } = d;
  const vertexCount = u.length;
  // Vertices plus skirt copies along each edge.
  const skirtCount = edges.reduce((n, e) => n + e.length, 0);
  const total = vertexCount + skirtCount;
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  // `h·n̂` per vertex, when asked (`HEIGHT_NORMAL_ATTRIBUTE`).
  const heightNormals = d.heightNormal
    ? new Float32Array(total * 3)
    : undefined;
  const up = new Float64Array(3);
  const ellipsoid = Ellipsoid.WGS84;
  const scratch = new Float64Array(3);
  const carto = { longitude: 0, latitude: 0, height: 0 };
  const range = maximumHeight - minimumHeight;
  // Below sea level: Earth-fixed vertices (no skirts) for the occludee.
  const below =
    minimumHeight < 0 ? new Float64Array(vertexCount * 3) : undefined;
  const place = (i: number, dst: number, drop: number) => {
    const uu = u[i]! / 32767;
    const vv = v[i]! / 32767;
    carto.longitude = rect.west + uu * (rect.east - rect.west);
    carto.latitude = rect.south + vv * (rect.north - rect.south);
    carto.height = minimumHeight + (h[i]! / 32767) * range - drop;
    ellipsoid.cartographicToCartesian(carto, scratch);
    if (below && drop === 0) {
      below.set(scratch, dst * 3);
    }
    positions[dst * 3] = scratch[0]! - center[0];
    positions[dst * 3 + 1] = scratch[1]! - center[1];
    positions[dst * 3 + 2] = scratch[2]! - center[2];
    uvs[dst * 2] = uu;
    uvs[dst * 2 + 1] = vv;
    if (heightNormals) {
      ellipsoid.geodeticSurfaceNormalCartographic(carto, up);
      heightNormals[dst * 3] = carto.height * up[0]!;
      heightNormals[dst * 3 + 1] = carto.height * up[1]!;
      heightNormals[dst * 3 + 2] = carto.height * up[2]!;
    }
    if (octNormals) {
      octDecode(octNormals[i * 2]!, octNormals[i * 2 + 1]!, normals, dst * 3);
    } else if (vertexNormals) {
      normals[dst * 3] = vertexNormals[i * 3]!;
      normals[dst * 3 + 1] = vertexNormals[i * 3 + 1]!;
      normals[dst * 3 + 2] = vertexNormals[i * 3 + 2]!;
    } else {
      // Geodetic up as a fallback normal.
      ellipsoid.geodeticSurfaceNormalCartographic(carto, scratch);
      normals[dst * 3] = scratch[0]!;
      normals[dst * 3 + 1] = scratch[1]!;
      normals[dst * 3 + 2] = scratch[2]!;
    }
  };
  for (let i = 0; i < vertexCount; i++) {
    place(i, i, 0);
  }
  const quadrants = quadrantHeights(u, v, h, triangles, minimumHeight, range);
  const skirtTriangles: number[] = [];
  let next = vertexCount;
  // Edge order along the edge: west and east by v, south and north by u.
  const along = [v, u, v, u];
  edges.forEach((edge, e) => {
    const key = along[e]!;
    const sorted = Array.from(edge).sort((a, b) => key[a]! - key[b]!);
    const first = next;
    for (const i of sorted) {
      place(
        i,
        next++,
        typeof skirtHeight === "number" ? skirtHeight : skirtHeight[e]!,
      );
    }
    // Outward-facing, so the visible side is the front face and keeps its
    // (copied, surface) normal: with edges sorted along increasing u or v,
    // (a, b, a2) faces west on the west edge and north on the north edge,
    // and inward on the south and east edges, which flip. Each triangle
    // starts at a skirt vertex (a rotation: the same winding), so its
    // provoking vertex marks it as skirt (`MeshData.skirtStart`).
    const flip = e === 1 || e === 2;
    for (let k = 0; k + 1 < sorted.length; k++) {
      const a = sorted[k]!;
      const b = sorted[k + 1]!;
      const a2 = first + k;
      const b2 = first + k + 1;
      if (flip) {
        skirtTriangles.push(a2, b, a, a2, b2, b);
      } else {
        skirtTriangles.push(a2, a, b, a2, b, b2);
      }
    }
  });
  const indices = new Uint32Array(triangles.length + skirtTriangles.length);
  indices.set(triangles);
  indices.set(skirtTriangles, triangles.length);

  let occludee: [number, number, number] | undefined = horizonOcclusionPoint;
  if (below) {
    const point = horizonCullingPoint(center, below, minimumHeight);
    occludee = point ? [point[0]!, point[1]!, point[2]!] : undefined;
  }

  const mesh: GltfMesh = {
    positions,
    normals,
    uvs,
    indices,
    ...(skirtCount > 0 ? { skirtStart: vertexCount } : {}),
    ...(heightNormals
      ? {
          attributes: {
            [HEIGHT_NORMAL_ATTRIBUTE]: { data: heightNormals, components: 3 },
          },
        }
      : {}),
  };
  const matrix = new Float64Array(16);
  matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
  matrix[12] = center[0];
  matrix[13] = center[1];
  matrix[14] = center[2];
  const asset: GltfAsset = {
    meshes: [mesh],
    materials: [
      {
        baseColor: [0.62, 0.62, 0.6, 1],
        metallic: 0,
        roughness: 1,
        emissive: [0, 0, 0],
        alphaMode: "OPAQUE",
        alphaCutoff: 0.5,
        doubleSided: true,
        unlit: false,
        normalScale: 1,
        occlusionStrength: 1,
      },
    ],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: 0, matrix }],
    featureTables: [],
    warnings: [],
  };
  return {
    asset,
    info: {
      minimumHeight,
      maximumHeight,
      sphere,
      ...(horizonOcclusionPoint ? { horizonOcclusionPoint } : {}),
      ...(occludee ? { occludee } : {}),
      quadrants,
      ...(available ? { available } : {}),
      // u, v and h share one buffer (transferred once).
      ...(d.keepHeights
        ? {
            heights: {
              u,
              v,
              h,
              triangles,
              minimumHeight,
              maximumHeight,
              ...(octNormals ? { normals: octNormals } : {}),
            },
          }
        : {}),
    },
    transfer: [
      positions.buffer,
      normals.buffer,
      uvs.buffer,
      indices.buffer,
      ...(heightNormals ? [heightNormals.buffer] : []),
      ...(d.keepHeights ? [u.buffer, triangles.buffer] : []),
      ...(d.keepHeights && octNormals ? [octNormals.buffer] : []),
    ],
  };
}
