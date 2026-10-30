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
  const place = (i: number, dst: number, drop: number) => {
    const uu = u[i]! / 32767;
    const vv = v[i]! / 32767;
    carto.longitude = rect.west + uu * (rect.east - rect.west);
    carto.latitude = rect.south + vv * (rect.north - rect.south);
    carto.height = minimumHeight + (h[i]! / 32767) * range - drop;
    ellipsoid.cartographicToCartesian(carto, scratch);
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
    for (let k = 0; k + 1 < sorted.length; k++) {
      const a = sorted[k]!;
      const b = sorted[k + 1]!;
      const a2 = first + k;
      const b2 = first + k + 1;
      // Drawn double-sided, so winding doesn't matter.
      skirtTriangles.push(a, b, a2, b, b2, a2);
    }
  });
  const indices = new Uint32Array(triangles.length + skirtTriangles.length);
  indices.set(triangles);
  indices.set(skirtTriangles, triangles.length);

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
      ...(available ? { available } : {}),
    },
    transfer: [positions.buffer, normals.buffer, uvs.buffer, indices.buffer],
  };
}
