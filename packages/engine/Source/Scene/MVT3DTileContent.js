// @ts-check

import BufferPoint from "./BufferPoint.js";
import BufferPointCollection from "./BufferPointCollection.js";
import BufferPointMaterial from "./BufferPointMaterial.js";
import BufferPolygon from "./BufferPolygon.js";
import BufferPolygonCollection from "./BufferPolygonCollection.js";
import BufferPolygonMaterial from "./BufferPolygonMaterial.js";
import BufferPolyline from "./BufferPolyline.js";
import BufferPolylineCollection from "./BufferPolylineCollection.js";
import BufferPolylineMaterial from "./BufferPolylineMaterial.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cesium3DTileStyle from "./Cesium3DTileStyle.js";
import Color from "../Core/Color.js";
import Matrix4 from "../Core/Matrix4.js";
import decodeMVT from "../Core/decodeMVT.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import earcut from "earcut";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import Cesium3DContentGroup from "./Cesium3DContentGroup.js"; */
/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js"; */
/** @import Cesium3DTileFeature from "./Cesium3DTileFeature.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import ImplicitMetadataView from "./ImplicitMetadataView.js"; */
/** @import Ray from "../Core/Ray.js"; */
/** @import Resource from "../Core/Resource.js"; */

const point = new BufferPoint();
const polyline = new BufferPolyline();
const polygon = new BufferPolygon();

const pointMaterial = new BufferPointMaterial();
const polylineMaterial = new BufferPolylineMaterial();
const polygonMaterial = new BufferPolygonMaterial();

const scratchTileModelMatrix = new Matrix4();

/**
 * Tile content for Mapbox Vector Tile (.pbf / MVT) format. Decodes the
 * protobuf binary into {@link BufferPointCollection},
 * {@link BufferPolylineCollection}, and {@link BufferPolygonCollection}.
 *
 * @ignore
 */
class MVT3DTileContent {
  /**
   * @param {Cesium3DTileset} tileset
   * @param {Cesium3DTile} tile
   * @param {Resource} resource
   */
  constructor(tileset, tile, resource) {
    /** @type {Cesium3DTileset} */
    this._tileset = tileset;
    /** @type {Cesium3DTile} */
    this._tile = tile;
    /** @type {Resource} */
    this._resource = resource;

    /** @type {Array<BufferPrimitiveCollection<BufferPrimitive>>} */
    this._collections = [];

    /** @type {Array<Matrix4>} */
    this._collectionLocalMatrices = [];

    /** @type {ImplicitMetadataView} */
    this._metadata = undefined;
    /** @type {Cesium3DContentGroup} */
    this._group = undefined;

    /** @type {boolean} */
    this.featurePropertiesDirty = false;

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

  get batchTableByteLength() {
    return 0;
  }

  /** @returns {undefined} */
  get innerContents() {
    return undefined;
  }

  get ready() {
    return this._ready;
  }

  get tileset() {
    return this._tileset;
  }

  get tile() {
    return this._tile;
  }

  get url() {
    return this._resource.getUrlComponent(true);
  }

  /** @type {Cesium3DTileBatchTable} */
  get batchTable() {
    return undefined;
  }

  /** @type {ImplicitMetadataView} */
  get metadata() {
    return this._metadata;
  }

  set metadata(value) {
    this._metadata = value;
  }

  /** @type {Cesium3DContentGroup} */
  get group() {
    return this._group;
  }

  set group(value) {
    this._group = value;
  }

  /**
   * @param {number} _featureId
   * @returns {Cesium3DTileFeature}
   */
  getFeature(_featureId) {
    return undefined;
  }

  /**
   * @param {number} _featureId
   * @param {string} _name
   * @returns {boolean}
   */
  hasProperty(_featureId, _name) {
    return false;
  }

  /**
   * @param {boolean} enabled
   * @param {Color} color
   */
  applyDebugSettings(enabled, color) {
    color = enabled ? color : Color.WHITE;
    this.applyStyle(new Cesium3DTileStyle({ color }));
  }

  /** @param {*} style */
  applyStyle(style) {
    const show = style.show?.evaluate(null) ?? true;
    const color = style.color?.evaluate(null, new Color());

    Color.clone(color, pointMaterial.color);
    pointMaterial.size = style.pointSize?.evaluate(null);
    pointMaterial.outlineWidth = style.pointOutlineWidth?.evaluate(null);
    style.pointOutlineColor?.evaluate(null, pointMaterial.outlineColor);
    for (const c of this._collections.filter(
      (c) => c instanceof BufferPointCollection,
    )) {
      for (let i = 0; i < c.primitiveCount; i++) {
        c.get(i, point);
        point.show = show;
        point.setMaterial(pointMaterial);
      }
    }

    Color.clone(color, polylineMaterial.color);
    polylineMaterial.width = style.lineWidth?.evaluate(null) ?? 1;
    for (const c of this._collections.filter(
      (c) => c instanceof BufferPolylineCollection,
    )) {
      for (let i = 0; i < c.primitiveCount; i++) {
        c.get(i, polyline);
        polyline.show = show;
        polyline.setMaterial(polylineMaterial);
      }
    }

    Color.clone(color, polygonMaterial.color);
    for (const c of this._collections.filter(
      (c) => c instanceof BufferPolygonCollection,
    )) {
      for (let i = 0; i < c.primitiveCount; i++) {
        c.get(i, polygon);
        polygon.show = show;
        polygon.setMaterial(polygonMaterial);
      }
    }
  }

  /**
   * @param {Cesium3DTileset} _tileset
   * @param {FrameState} frameState
   */
  update(_tileset, frameState) {
    Matrix4.multiplyTransformation(
      this._tile.computedTransform,
      Matrix4.IDENTITY,
      scratchTileModelMatrix,
    );

    for (let i = 0; i < this._collections.length; i++) {
      Matrix4.multiplyTransformation(
        scratchTileModelMatrix,
        this._collectionLocalMatrices[i],
        this._collections[i].modelMatrix,
      );
      this._collections[i].update(frameState);
    }
  }

  /**
   * @param {Ray} _ray
   * @param {FrameState} _frameState
   * @param {Cartesian3|undefined} _result
   * @returns {Cartesian3|undefined}
   */
  pick(_ray, _frameState, _result) {
    return undefined;
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
   * Create an MVT3DTileContent from a downloaded .pbf ArrayBuffer.
   *
   * The tile's z/x/y coordinates are parsed from the content resource URL
   * (expected pattern: …/{z}/{x}/{y}.pbf).
   *
   * @param {Cesium3DTileset} tileset
   * @param {Cesium3DTile} tile
   * @param {Resource} resource
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<MVT3DTileContent>}
   */
  static async fromArrayBuffer(tileset, tile, resource, arrayBuffer) {
    const content = new MVT3DTileContent(tileset, tile, resource);

    const { tileX, tileY, tileZ } = parseTileCoords(
      /** @type {any} */ (resource).url,
    );

    // Decompress if gzip-encoded (magic bytes 0x1F 0x8B).
    // tippecanoe and most MVT tile servers compress tiles by default.
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const ds = new DecompressionStream("gzip");
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(bytes);
      writer.close();
      const chunks = [];
      let totalLen = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(value);
        totalLen += value.length;
      }
      const out = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
      arrayBuffer = out.buffer;
    }

    const decoded = decodeMVT(arrayBuffer);

    // Allow callers to restrict which geometry types are built, e.g.:
    //   tileset.extras = { mvtGeometryTypes: ["LineString"] }
    const geometryTypes = /** @type {any} */ (tileset)?.extras
      ?.mvtGeometryTypes ?? ["Point", "LineString", "Polygon"];

    const { collections, matrices } = buildCollections(
      decoded,
      tileX,
      tileY,
      tileZ,
      geometryTypes,
    );

    content._collections = collections;
    content._collectionLocalMatrices = matrices;
    content._ready = true;

    return content;
  }
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * Parse z/x/y from a URL of the form …/{z}/{x}/{y}.pbf or …/{z}/{x}/{y}.mvt
 * @param {string} url
 * @returns {{tileZ:number, tileX:number, tileY:number}}
 */
function parseTileCoords(url) {
  const match = url.match(/\/(\d+)\/(\d+)\/(\d+)\.(?:pbf|mvt)/);
  if (!match) {
    return { tileZ: 0, tileX: 0, tileY: 0 };
  }
  return {
    tileZ: parseInt(match[1], 10),
    tileX: parseInt(match[2], 10),
    tileY: parseInt(match[3], 10),
  };
}

// ---------------------------------------------------------------------------
// Build Buffer*Collections from decoded MVT layers
// ---------------------------------------------------------------------------

// Height offsets above ellipsoid to avoid z-fighting with terrain surface.
const HEIGHT_POLYGON = 50; // meters — below lines/points
const HEIGHT_POLYLINE = 100;
const HEIGHT_POINT = 150;

/**
 * @param {import("../Core/decodeMVT.js").DecodedMVT} decoded
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @param {string[]} geometryTypes
 * @returns {{collections: Array<any>, matrices: Array<Matrix4>}}
 */
function buildCollections(decoded, tileX, tileY, tileZ, geometryTypes) {
  const collections = [];
  const matrices = [];

  for (const layer of decoded.layers) {
    const stats = gatherStats(layer);
    if (geometryTypes.includes("Point") && stats.pointCount > 0) {
      const col = buildPointCollection(layer, tileX, tileY, tileZ, stats);
      collections.push(col);
      matrices.push(Matrix4.clone(Matrix4.IDENTITY));
    }
    if (geometryTypes.includes("LineString") && stats.lineVertexCount > 0) {
      const col = buildPolylineCollection(layer, tileX, tileY, tileZ, stats);
      collections.push(col);
      matrices.push(Matrix4.clone(Matrix4.IDENTITY));
    }
    if (geometryTypes.includes("Polygon") && stats.polygonVertexCount > 0) {
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
 * Compute signed area of a ring (in tile-local 2D space).
 * Positive = clockwise (exterior ring in MVT screen-space convention).
 * Negative = counter-clockwise (interior / hole ring).
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
 * Strip the closing vertex from an MVT ring (last point == first point).
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
 * @param {import("../Core/decodeMVT.js").MVTLayer} layer
 */
function gatherStats(layer) {
  let pointCount = 0;
  let lineFeatureCount = 0;
  let lineVertexCount = 0;
  // Count unique polygons (outer rings start new polygons)
  let polygonFeatureCount = 0;
  // Vertices without closing vertex
  let polygonVertexCount = 0;
  let polygonHoleCount = 0;

  for (const feature of layer.features) {
    if (feature.type === "Point") {
      pointCount += feature.geometry.length;
    } else if (feature.type === "LineString") {
      for (const ring of /** @type {import("../Core/decodeMVT.js").MVTPoint[][]} */ (
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
        // MVT tile coords: Y increases downward.
        // Clockwise (exterior) → negative shoelace area.
        // Counter-clockwise (hole) → positive shoelace area.
        if (area <= 0) {
          // Clockwise = exterior ring → new polygon
          polygonFeatureCount++;
        } else {
          polygonHoleCount++;
        }
        polygonVertexCount += ring.length;
      }
    }
  }

  // earcut produces (V - 2 - 2*H) triangles for a polygon with V verts and H holes
  // Use a generous upper bound
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
 * @param {import("../Core/decodeMVT.js").MVTLayer} layer
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

  const p = new BufferPoint();
  const material = new BufferPointMaterial({ size: 8 });
  const n = 1 << tileZ;

  for (const feature of layer.features) {
    if (feature.type !== "Point") {
      continue;
    }
    for (const pt of /** @type {import("../Core/decodeMVT.js").MVTPoint[]} */ (
      feature.geometry
    )) {
      const u = (tileX + pt.x / layer.extent) / n;
      const v = (tileY + pt.y / layer.extent) / n;
      const lon = u * 2 * Math.PI - Math.PI;
      const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * v)));
      const pos = Cartesian3.fromRadians(lon, lat, HEIGHT_POINT);
      col.add({ position: pos, material }, p);
    }
  }

  return col;
}

/**
 * @param {import("../Core/decodeMVT.js").MVTLayer} layer
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

  const pl = new BufferPolyline();
  const n = 1 << tileZ;

  for (const feature of layer.features) {
    if (feature.type !== "LineString") {
      continue;
    }
    for (const ring of /** @type {import("../Core/decodeMVT.js").MVTPoint[][]} */ (
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
      col.add({ positions }, pl);
    }
  }

  return col;
}

/**
 * @param {import("../Core/decodeMVT.js").MVTLayer} layer
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

  const pg = new BufferPolygon();
  const n = 1 << tileZ;

  for (const feature of layer.features) {
    if (feature.type !== "Polygon") {
      continue;
    }
    const rawRings = /** @type {Array<Array<{x:number,y:number}>>} */ (
      feature.geometry
    );

    // Classify rings: in MVT tile coords (Y-down), clockwise = exterior, CCW = hole.
    // Multiple exterior rings in one feature encode a MultiPolygon.
    /** @type {{outerRing: import("../Core/decodeMVT.js").MVTPoint[], holes: import("../Core/decodeMVT.js").MVTPoint[][]}[]} */
    const polygonGroups = [];
    let skippedOrphanHoles = 0;

    for (const rawRing of rawRings) {
      const ring = stripClosingVertex(rawRing);
      if (ring.length < 3) {
        continue;
      }
      const area = ringSignedArea(ring);
      if (area <= 0) {
        // Clockwise = exterior ring
        polygonGroups.push({ outerRing: ring, holes: [] });
      } else if (polygonGroups.length > 0) {
        // CCW = hole, append to most recent exterior ring
        polygonGroups[polygonGroups.length - 1].holes.push(ring);
      } else {
        skippedOrphanHoles++;
      }
    }

    if (skippedOrphanHoles > 0) {
      void skippedOrphanHoles; // unused, suppress lint warning
    }

    for (const { outerRing, holes } of polygonGroups) {
      const allRings = [outerRing, ...holes];
      const allPositions3D = [];
      const holeOffsets3D = []; // hole start indices into allPositions3D
      const flat2D = [];
      const holeOffsets2D = []; // hole start indices for earcut
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
          flat2D.push(pt.x, pt.y);
          vertexOffset++;
        }
      }

      let triangleIndices;
      try {
        triangleIndices = earcut(
          flat2D,
          holeOffsets2D.length > 0 ? holeOffsets2D : undefined,
          2,
        );
      } catch {
        continue;
      }

      if (!triangleIndices || triangleIndices.length === 0) {
        continue;
      }

      const maxIdx = Math.max(...triangleIndices);
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
        pg,
      );
    }
  }

  return col;
}

export default MVT3DTileContent;
