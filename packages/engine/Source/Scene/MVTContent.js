// @ts-check

import BufferPoint from "./BufferPoint.js";
import BufferPointCollection from "./BufferPointCollection.js";
import BufferPointMaterial from "./BufferPointMaterial.js";
import BufferPolygon from "./BufferPolygon.js";
import BufferPolygonCollection from "./BufferPolygonCollection.js";
import BufferPolyline from "./BufferPolyline.js";
import BufferPolylineCollection from "./BufferPolylineCollection.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Matrix4 from "../Core/Matrix4.js";
import PolygonPipeline from "../Core/PolygonPipeline.js";
import decodeMVT from "./decodeMVT.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import Resource from "../Core/Resource.js"; */

const scratchContentModelMatrix = new Matrix4();

class MVTContent {
  /**
   * @param {Resource} resource
   */
  constructor(resource) {
    /** @type {Resource} */
    this._resource = resource;

    /** @type {Array<BufferPrimitiveCollection<BufferPrimitive>>} */
    this._collections = [];

    /** @type {Array<Matrix4>} */
    this._collectionLocalMatrices = [];

    /** @type {Matrix4} */
    this.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);

    /** @type {boolean} */
    this._ready = false;
  }

  get featuresLength() {
    return this._collections.reduce((sum, c) => sum + c.primitiveCount, 0);
  }

  get pointsLength() {
    return this._collections
      .filter((c) => c instanceof BufferPointCollection)
      .reduce((sum, c) => sum + c.primitiveCount, 0);
  }

  get trianglesLength() {
    return this._collections
      .filter((c) => c instanceof BufferPolygonCollection)
      .reduce((sum, c) => sum + c.triangleCount, 0);
  }

  get geometryByteLength() {
    return this._collections.reduce((sum, c) => sum + c.byteLength, 0);
  }

  get texturesByteLength() {
    return 0;
  }

  get ready() {
    return this._ready;
  }

  get url() {
    return this._resource.getUrlComponent(true);
  }

  /**
   * @param {FrameState} frameState
   */
  update(frameState) {
    Matrix4.multiplyTransformation(
      this.modelMatrix,
      Matrix4.IDENTITY,
      scratchContentModelMatrix,
    );

    for (let i = 0; i < this._collections.length; i++) {
      Matrix4.multiplyTransformation(
        scratchContentModelMatrix,
        this._collectionLocalMatrices[i],
        this._collections[i].modelMatrix,
      );
      this._collections[i].update(frameState);
    }
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    this._collections.forEach((c) => c.destroy());
    this._collections.length = 0;
    return destroyObject(this);
  }

  /**
   * @param {Resource} resource
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<MVTContent>}
   */
  static async fromArrayBuffer(resource, arrayBuffer) {
    const content = new MVTContent(resource);

    const { tileX, tileY, tileZ } = parseTileCoords(
      resource.getUrlComponent(true),
    );

    const bytes = new Uint8Array(arrayBuffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      arrayBuffer = await decompressGzip(arrayBuffer);
    }

    const decoded = decodeMVT(arrayBuffer);
    const { collections, matrices } = buildCollections(
      decoded,
      tileX,
      tileY,
      tileZ,
    );

    content._collections = collections;
    content._collectionLocalMatrices = matrices;
    content._ready = true;
    return content;
  }
}

/**
 * @param {string} url
 * @returns {{tileZ:number, tileX:number, tileY:number}}
 */
function parseTileCoords(url) {
  const match = url.match(/\/(\d+)\/(\d+)\/(\d+)\.(?:pbf|mvt)(?:[?#]|$)/i);
  if (!match) {
    return { tileZ: 0, tileX: 0, tileY: 0 };
  }
  return {
    tileZ: parseInt(match[1], 10),
    tileX: parseInt(match[2], 10),
    tileY: parseInt(match[3], 10),
  };
}

const HEIGHT_POLYGON = 50;
const HEIGHT_POLYLINE = 100;
const HEIGHT_POINT = 150;

/**
 * @param {import("./decodeMVT.js").DecodedMVT} decoded
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @returns {{collections: Array<any>, matrices: Array<Matrix4>}}
 */
function buildCollections(decoded, tileX, tileY, tileZ) {
  const collections = [];
  const matrices = [];

  for (const layer of decoded.layers) {
    const stats = gatherStats(layer);
    if (stats.pointCount > 0) {
      const col = buildPointCollection(layer, tileX, tileY, tileZ, stats);
      collections.push(col);
      matrices.push(Matrix4.clone(Matrix4.IDENTITY));
    }
    if (stats.lineVertexCount > 0) {
      const col = buildPolylineCollection(layer, tileX, tileY, tileZ, stats);
      collections.push(col);
      matrices.push(Matrix4.clone(Matrix4.IDENTITY));
    }
    if (stats.polygonVertexCount > 0) {
      const col = buildPolygonCollection(layer, tileX, tileY, tileZ, stats);
      if (defined(col)) {
        collections.push(col);
        matrices.push(Matrix4.clone(Matrix4.IDENTITY));
      }
    }
  }

  return { collections, matrices };
}

/**
 * @param {Array<{x:number,y:number}>} ring
 * @returns {number}
 */
function ringSignedArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
  }
  return area / 2;
}

/**
 * @param {Array<{x:number,y:number}>} ring
 * @returns {Array<{x:number,y:number}>}
 */
function stripClosingVertex(ring) {
  if (
    ring.length > 1 &&
    ring[0].x === ring[ring.length - 1].x &&
    ring[0].y === ring[ring.length - 1].y
  ) {
    return ring.slice(0, ring.length - 1);
  }
  return ring;
}

/**
 * @param {import("./decodeMVT.js").MVTLayer} layer
 */
function gatherStats(layer) {
  let pointCount = 0;
  let lineFeatureCount = 0;
  let lineVertexCount = 0;
  let polygonFeatureCount = 0;
  let polygonVertexCount = 0;
  let polygonHoleCount = 0;

  for (const feature of layer.features) {
    if (feature.type === "Point") {
      pointCount += feature.geometry.length;
    } else if (feature.type === "LineString") {
      for (const ring of /** @type {import("./decodeMVT.js").MVTPoint[][]} */ (
        feature.geometry
      )) {
        lineFeatureCount++;
        lineVertexCount += ring.length;
      }
    } else if (feature.type === "Polygon") {
      const rings = /** @type {Array<Array<{x:number,y:number}>>} */ (
        feature.geometry
      );
      for (const rawRing of rings) {
        const ring = stripClosingVertex(rawRing);
        if (ring.length < 3) {
          continue;
        }
        const area = ringSignedArea(ring);
        if (area <= 0) {
          polygonFeatureCount++;
        } else {
          polygonHoleCount++;
        }
        polygonVertexCount += ring.length;
      }
    }
  }

  const polygonTriangleCount = Math.max(
    polygonFeatureCount,
    polygonVertexCount,
  );

  return {
    pointCount,
    lineFeatureCount,
    lineVertexCount,
    polygonFeatureCount,
    polygonVertexCount,
    polygonHoleCount,
    polygonTriangleCount,
  };
}

/**
 * @param {import("./decodeMVT.js").MVTLayer} layer
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @param {*} stats
 * @returns {BufferPointCollection}
 */
function buildPointCollection(layer, tileX, tileY, tileZ, stats) {
  const col = new BufferPointCollection({
    primitiveCountMax: stats.pointCount,
  });

  const point = new BufferPoint();
  const material = new BufferPointMaterial({ size: 8 });
  const n = 1 << tileZ;

  for (const feature of layer.features) {
    if (feature.type !== "Point") {
      continue;
    }
    for (const pt of /** @type {import("./decodeMVT.js").MVTPoint[]} */ (
      feature.geometry
    )) {
      const u = (tileX + pt.x / layer.extent) / n;
      const v = (tileY + pt.y / layer.extent) / n;
      const lon = u * 2 * Math.PI - Math.PI;
      const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * v)));
      const pos = Cartesian3.fromRadians(lon, lat, HEIGHT_POINT);
      col.add({ position: pos, material }, point);
    }
  }

  return col;
}

/**
 * @param {import("./decodeMVT.js").MVTLayer} layer
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @param {*} stats
 * @returns {BufferPolylineCollection}
 */
function buildPolylineCollection(layer, tileX, tileY, tileZ, stats) {
  const col = new BufferPolylineCollection({
    primitiveCountMax: stats.lineFeatureCount,
    vertexCountMax: stats.lineVertexCount,
  });

  const polyline = new BufferPolyline();
  const n = 1 << tileZ;

  for (const feature of layer.features) {
    if (feature.type !== "LineString") {
      continue;
    }
    for (const ring of /** @type {import("./decodeMVT.js").MVTPoint[][]} */ (
      feature.geometry
    )) {
      const positions = new Float64Array(ring.length * 3);
      for (let i = 0; i < ring.length; i++) {
        const pt = ring[i];
        const u = (tileX + pt.x / layer.extent) / n;
        const v = (tileY + pt.y / layer.extent) / n;
        const lon = u * 2 * Math.PI - Math.PI;
        const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * v)));
        const pos = Cartesian3.fromRadians(lon, lat, HEIGHT_POLYLINE);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      }
      col.add({ positions }, polyline);
    }
  }

  return col;
}

/**
 * @param {import("./decodeMVT.js").MVTLayer} layer
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @param {*} stats
 * @returns {BufferPolygonCollection|undefined}
 */
function buildPolygonCollection(layer, tileX, tileY, tileZ, stats) {
  const col = new BufferPolygonCollection({
    primitiveCountMax: stats.polygonFeatureCount,
    vertexCountMax: stats.polygonVertexCount,
    holeCountMax: stats.polygonHoleCount,
    triangleCountMax: stats.polygonTriangleCount,
  });

  const polygon = new BufferPolygon();
  const n = 1 << tileZ;

  for (const feature of layer.features) {
    if (feature.type !== "Polygon") {
      continue;
    }
    const rawRings = /** @type {Array<Array<{x:number,y:number}>>} */ (
      feature.geometry
    );

    /** @type {{outerRing: import("./decodeMVT.js").MVTPoint[], holes: import("./decodeMVT.js").MVTPoint[][]}[]} */
    const polygonGroups = [];
    for (const rawRing of rawRings) {
      const ring = stripClosingVertex(rawRing);
      if (ring.length < 3) {
        continue;
      }
      const area = ringSignedArea(ring);
      if (area <= 0) {
        polygonGroups.push({ outerRing: ring, holes: [] });
      } else if (polygonGroups.length > 0) {
        polygonGroups[polygonGroups.length - 1].holes.push(ring);
      }
    }

    for (const { outerRing, holes } of polygonGroups) {
      const allRings = [outerRing, ...holes];
      const allPositions3D = [];
      const allPositions2D = [];
      const holeOffsets3D = [];
      const holeOffsets2D = [];
      let vertexOffset = 0;

      for (let r = 0; r < allRings.length; r++) {
        const ring = allRings[r];
        if (r > 0) {
          holeOffsets3D.push(vertexOffset);
          holeOffsets2D.push(vertexOffset);
        }
        for (const pt of ring) {
          const u = (tileX + pt.x / layer.extent) / n;
          const v = (tileY + pt.y / layer.extent) / n;
          const lon = u * 2 * Math.PI - Math.PI;
          const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * v)));
          const pos = Cartesian3.fromRadians(lon, lat, HEIGHT_POLYGON);
          allPositions3D.push(pos.x, pos.y, pos.z);
          allPositions2D.push(new Cartesian2(pt.x, pt.y));
          vertexOffset++;
        }
      }

      let triangleIndices;
      try {
        triangleIndices = PolygonPipeline.triangulate(
          allPositions2D,
          holeOffsets2D.length > 0 ? holeOffsets2D : undefined,
        );
      } catch {
        continue;
      }

      if (!triangleIndices || triangleIndices.length === 0) {
        continue;
      }

      let maxIdx = -1;
      for (let i = 0; i < triangleIndices.length; i++) {
        if (triangleIndices[i] > maxIdx) {
          maxIdx = triangleIndices[i];
        }
      }
      if (maxIdx >= vertexOffset) {
        continue;
      }

      col.add(
        {
          positions: new Float64Array(allPositions3D),
          triangles: new Uint32Array(triangleIndices),
          holes:
            holeOffsets3D.length > 0
              ? new Uint32Array(holeOffsets3D)
              : undefined,
        },
        polygon,
      );
    }
  }

  return col;
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<ArrayBuffer>}
 */
async function decompressGzip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);

  if (typeof DecompressionStream === "function") {
    try {
      const decompressedStream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      return await new Response(decompressedStream).arrayBuffer();
    } catch {
      // Fallback to pako.inflate below.
    }
  }

  const { inflate } = await import("pako");
  const out = inflate(bytes);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

export default MVTContent;
