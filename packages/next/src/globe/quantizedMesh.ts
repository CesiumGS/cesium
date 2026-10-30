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
  horizonOcclusionPoint: [number, number, number];
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
  skirtHeight: number,
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
      octNormals = new Uint8Array(buffer, pos, vertexCount * 2);
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
  });
}

/** A terrain tile's decoded contents, before its mesh is built. */
interface TerrainTileData {
  rect: Rectangle;
  skirtHeight: number;
  /** Earth-fixed center: positions are relative to it. */
  center: [number, number, number];
  minimumHeight: number;
  maximumHeight: number;
  sphere: { center: [number, number, number]; radius: number };
  horizonOcclusionPoint: [number, number, number];
  /** Quantized u, v, height per vertex (0..32767), v from the south. */
  u: Uint16Array;
  v: Uint16Array;
  h: Uint16Array;
  triangles: Uint32Array;
  /** Edge vertex indices: west, south, east, north. */
  edges: Uint32Array[];
  octNormals?: Uint8Array | undefined;
  available?: TileRange[][] | undefined;
}

/**
 * A flat tile on the ellipsoid (1.x `EllipsoidTerrainProvider`): an
 * `n`×`n` grid at height 0, with skirts, built without any data.
 */
export function flatTerrainTile(
  rect: Rectangle,
  skirtHeight: number,
  n = 16,
): { asset: GltfAsset; info: TerrainTileInfo; transfer: Transferable[] } {
  const count = n * n;
  const u = new Uint16Array(count);
  const v = new Uint16Array(count);
  const h = new Uint16Array(count);
  const positions = new Float64Array(count * 3);
  const p = new Float64Array(3);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      u[k] = Math.round((i / (n - 1)) * 32767);
      v[k] = Math.round((j / (n - 1)) * 32767);
      Ellipsoid.WGS84.cartographicToCartesian(
        {
          longitude: rect.west + (i / (n - 1)) * (rect.east - rect.west),
          latitude: rect.south + (j / (n - 1)) * (rect.north - rect.south),
          height: 0,
        },
        p,
      );
      positions.set(p, k * 3);
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
    horizonOcclusionPoint: occludee
      ? [occludee[0]!, occludee[1]!, occludee[2]!]
      : [0, 0, 0],
    u,
    v,
    h,
    triangles,
    edges: [column(0), row(0), column(n - 1), row(n - 1)],
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
    available,
  } = d;
  const vertexCount = u.length;
  // Vertices plus skirt copies along each edge.
  const skirtCount = edges.reduce((n, e) => n + e.length, 0);
  const total = vertexCount + skirtCount;
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
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
    if (octNormals) {
      octDecode(octNormals[i * 2]!, octNormals[i * 2 + 1]!, normals, dst * 3);
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
      place(i, next++, skirtHeight);
    }
    // Outward-facing, so the visible side is the front face and keeps its
    // (copied, surface) normal: with edges sorted along increasing u or v,
    // (a, b, a2) faces west on the west edge and north on the north edge,
    // and inward on the south and east edges, which flip.
    const flip = e === 1 || e === 2;
    for (let k = 0; k + 1 < sorted.length; k++) {
      const a = sorted[k]!;
      const b = sorted[k + 1]!;
      const a2 = first + k;
      const b2 = first + k + 1;
      if (flip) {
        skirtTriangles.push(a, a2, b, b, a2, b2);
      } else {
        skirtTriangles.push(a, b, a2, b, b2, a2);
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

  const mesh: GltfMesh = { positions, normals, uvs, indices };
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
      horizonOcclusionPoint,
      ...(occludee ? { occludee } : {}),
      quadrants,
      ...(available ? { available } : {}),
    },
    transfer: [positions.buffer, normals.buffer, uvs.buffer, indices.buffer],
  };
}
