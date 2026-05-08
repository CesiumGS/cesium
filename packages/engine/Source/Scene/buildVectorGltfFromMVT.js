// @ts-check

import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import PolygonPipeline from "../Core/PolygonPipeline.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import defined from "../Core/defined.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import RuntimeError from "../Core/RuntimeError.js";
import MetadataType from "./MetadataType.js";

/** @import { TypedArray } from "../Core/globalTypes.js"; */

const DEFAULT_HEIGHT = 0;

const scratchWorld = new Cartesian3();
const scratchLocal = new Cartesian3();

/**
 * @typedef {object} VectorTilePoint
 * @property {number} x Tile-local x (0–extent)
 * @property {number} y Tile-local y (0–extent)
 * @ignore
 */

/**
 * @typedef {object} VectorTileFeature
 * @property {"Point"|"LineString"|"Polygon"|"Unknown"} type
 * @property {Array<VectorTilePoint>|Array<Array<VectorTilePoint>>} geometry
 * @property {object} [properties]
 * @ignore
 */

/**
 * @typedef {object} VectorTileLayer
 * @property {number} extent
 * @property {VectorTileFeature[]} features
 * @ignore
 */

/**
 * @typedef {object} DecodedVectorTile
 * @property {VectorTileLayer[]} layers
 * @ignore
 */

/**
 * @typedef {object} PolygonRingGroup
 * @property {Array.<VectorTilePoint>} outerRing
 * @property {Array.<Array.<VectorTilePoint>>} holes
 * @ignore
 */

/**
 * @typedef {object} BuildVectorGltfOptions
 * @property {string} [featureIdProperty] MVT property name to use as feature ID.
 * @ignore
 */

/**
 * Build a vector glTF payload from decoded tile-local vector geometry.
 *
 * @param {DecodedVectorTile} decoded
 * @param {{tileX:number, tileY:number, tileZ:number}} tileCoordinates
 * @param {BuildVectorGltfOptions} [options]
 * @returns {object|undefined}
 *
 * @ignore
 */
function buildVectorGltfFromMVT(decoded, tileCoordinates, options) {
  const tileX = tileCoordinates.tileX;
  const tileY = tileCoordinates.tileY;
  const tileZ = tileCoordinates.tileZ;
  const featureIdProperty = options?.featureIdProperty;

  const origin = computeTileOriginCartesian(tileX, tileY, tileZ);
  // Maximum value of a Uint32; used as sentinel for null feature IDs and primitive restart indices.
  const MAX_INT_U32 = 0xffffffff;
  const nullFeatureId = MAX_INT_U32;
  const primitiveRestartIndex = MAX_INT_U32;
  // Maps a property value (or auto-increment key) to a compact integer feature ID.
  const featureIdLookup = new Map();

  /** @type {number[]} */
  const pointPositions = [];
  /** @type {number[]} */
  const pointFeatureIds = [];

  /** @type {number[]} */
  const linePositions = [];
  /** @type {number[]} */
  const lineFeatureIds = [];
  /** @type {number[]} */
  const lineIndices = [];
  let lineCount = 0;

  /** @type {number[]} */
  const polygonPositions = [];
  /** @type {number[]} */
  const polygonFeatureIds = [];
  /** @type {number[]} */
  const polygonIndices = [];
  /** @type {number[]} */
  const polygonAttributeOffsets = [];
  /** @type {number[]} */
  const polygonIndicesOffsets = [];
  /** @type {number[]} */
  const polygonHoleCounts = [];
  /** @type {number[]} */
  const polygonHoleOffsets = [];
  let polygonCount = 0;

  for (const layer of decoded.layers) {
    const extent = layer.extent;
    for (const feature of layer.features) {
      const currentFeatureId = defined(featureIdProperty)
        ? (mapFeatureIdFromProperty(
            feature,
            featureIdProperty,
            featureIdLookup,
          ) ?? nullFeatureId)
        : getOrAssignAutoFeatureId(feature, featureIdLookup);

      if (feature.type === "Point") {
        const points = /** @type {VectorTilePoint[]} */ (feature.geometry);
        for (const point of points) {
          appendTilePointAsLocalPosition(
            point,
            tileX,
            tileY,
            tileZ,
            extent,
            DEFAULT_HEIGHT,
            origin,
            pointPositions,
          );
          pointFeatureIds.push(currentFeatureId);
        }
        continue;
      }

      if (feature.type === "LineString") {
        const lines = /** @type {VectorTilePoint[][]} */ (feature.geometry);
        for (const line of lines) {
          const lineStart = linePositions.length / 3;
          for (const point of line) {
            appendTilePointAsLocalPosition(
              point,
              tileX,
              tileY,
              tileZ,
              extent,
              DEFAULT_HEIGHT,
              origin,
              linePositions,
            );
            lineFeatureIds.push(currentFeatureId);
          }

          for (let i = 0; i < line.length; i++) {
            lineIndices.push(lineStart + i);
          }
          lineIndices.push(primitiveRestartIndex);
          lineCount++;
        }
        continue;
      }

      if (feature.type === "Polygon") {
        const rawRings = /** @type {VectorTilePoint[][]} */ (feature.geometry);
        const groups = groupPolygonRings(rawRings);

        for (const group of groups) {
          const rings = [group.outerRing, ...group.holes];
          /** @type {Cartesian2[]} */
          const positions2D = [];
          // Flat xyz components: every 3 entries form one vertex.
          /** @type {number[]} */
          const polygonPositionComponents = [];
          /** @type {number[]} */
          const holeOffsets = [];
          let vertexOffset = 0;

          for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
            const ring = rings[ringIndex];
            if (ring.length < 3) {
              throw new RuntimeError(
                `Polygon ring has fewer than 3 points (${ring.length}).`,
              );
            }
            if (ringIndex > 0) {
              holeOffsets.push(vertexOffset);
            }

            for (const point of ring) {
              positions2D.push(new Cartesian2(point.x, point.y));
              appendTilePointAsLocalPosition(
                point,
                tileX,
                tileY,
                tileZ,
                extent,
                DEFAULT_HEIGHT,
                origin,
                polygonPositionComponents,
              );
              vertexOffset++;
            }
          }

          if (positions2D.length < 3) {
            continue;
          }

          const triangles = PolygonPipeline.triangulate(
            positions2D,
            holeOffsets.length > 0 ? holeOffsets : undefined,
          );

          if (!defined(triangles) || triangles.length === 0) {
            oneTimeWarning(
              "buildVectorGltfFromMVT-triangulation-failed",
              "Polygon triangulation failed; skipping polygon.",
            );
            continue;
          }

          const globalVertexStart = polygonPositions.length / 3;
          const globalIndexStart = polygonIndices.length;
          polygonAttributeOffsets.push(globalVertexStart);
          polygonIndicesOffsets.push(globalIndexStart);
          polygonHoleCounts.push(holeOffsets.length);
          for (let i = 0; i < holeOffsets.length; i++) {
            polygonHoleOffsets.push(globalVertexStart + holeOffsets[i]);
          }

          for (let i = 0; i < polygonPositionComponents.length; i++) {
            polygonPositions.push(polygonPositionComponents[i]);
          }
          for (let i = 0; i < polygonPositionComponents.length / 3; i++) {
            polygonFeatureIds.push(currentFeatureId);
          }
          for (let i = 0; i < triangles.length; i++) {
            polygonIndices.push(triangles[i] + globalVertexStart);
          }
          polygonCount++;
        }
      }
    }
  }

  if (
    pointPositions.length === 0 &&
    linePositions.length === 0 &&
    polygonPositions.length === 0
  ) {
    return undefined;
  }

  if (
    lineIndices.length > 0 &&
    lineIndices[lineIndices.length - 1] === primitiveRestartIndex
  ) {
    lineIndices.pop();
  }

  /** @type {object[]} */
  const bufferViews = [];
  /** @type {object[]} */
  const accessors = [];
  /** @type {Uint8Array[]} */
  const chunks = [];
  let byteLength = 0;

  function addPadding() {
    const padding = (4 - (byteLength % 4)) % 4;
    if (padding > 0) {
      chunks.push(new Uint8Array(padding));
      byteLength += padding;
    }
  }

  /**
   * @param {TypedArray} typedArray
   * @param {number} target
   * @returns {number}
   */
  function addBufferView(typedArray, target) {
    addPadding();
    const byteOffset = byteLength;
    chunks.push(
      new Uint8Array(
        typedArray.buffer,
        typedArray.byteOffset,
        typedArray.byteLength,
      ),
    );
    byteLength += typedArray.byteLength;
    const bufferViewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: byteOffset,
      byteLength: typedArray.byteLength,
      target: target,
    });
    return bufferViewIndex;
  }

  /**
   * @param {TypedArray} typedArray
   * @param {object} options
   * @param {string} options.type
   * @param {number} options.componentType
   * @param {number} options.target
   * @param {number[]} [options.min]
   * @param {number[]} [options.max]
   * @returns {number}
   */
  function addAccessor(typedArray, options) {
    const bufferView = addBufferView(typedArray, options.target);
    const componentCount = /** @type {*} */ (MetadataType).getComponentCount(
      options.type,
    );
    const accessor = /** @type {*} */ ({
      bufferView: bufferView,
      byteOffset: 0,
      componentType: options.componentType,
      count: typedArray.length / componentCount,
      type: options.type,
    });
    if (defined(options.min)) {
      accessor.min = options.min;
    }
    if (defined(options.max)) {
      accessor.max = options.max;
    }
    const accessorIndex = accessors.length;
    accessors.push(accessor);
    return accessorIndex;
  }

  /**
   * @param {Float32Array} positions
   * @returns {{min:number[],max:number[]}}
   */
  function computeMinMax(positions) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (z < minZ) {
        minZ = z;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
      if (z > maxZ) {
        maxZ = z;
      }
    }

    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    };
  }

  const featureCount = featureIdLookup.size;

  /**
   * @param {*} attributes
   * @param {*} extensions
   * @param {number[]} featureIdValues
   */
  function addFeatureIdsToPrimitive(attributes, extensions, featureIdValues) {
    if (featureIdValues.length === 0) {
      return;
    }
    const featureIds = new Uint32Array(featureIdValues);
    const featureAccessor = addAccessor(featureIds, {
      type: "SCALAR",
      componentType: ComponentDatatype.UNSIGNED_INT,
      target: WebGLConstants.ARRAY_BUFFER,
    });
    attributes._FEATURE_ID_0 = featureAccessor;
    extensions.EXT_mesh_features = {
      featureIds: [
        {
          featureCount: featureCount,
          nullFeatureId: nullFeatureId,
          attribute: 0,
        },
      ],
    };
  }

  /** @type {object[]} */
  const primitives = [];

  if (pointPositions.length > 0) {
    const positions = new Float32Array(pointPositions);
    const minMax = computeMinMax(positions);

    const positionAccessor = addAccessor(positions, {
      type: "VEC3",
      componentType: ComponentDatatype.FLOAT,
      target: WebGLConstants.ARRAY_BUFFER,
      min: minMax.min,
      max: minMax.max,
    });
    const attributes = /** @type {*} */ ({
      POSITION: positionAccessor,
    });
    const extensions = /** @type {*} */ ({
      CESIUM_mesh_vector: {
        vector: true,
        count: positions.length / 3,
      },
    });
    addFeatureIdsToPrimitive(attributes, extensions, pointFeatureIds);

    primitives.push({
      mode: PrimitiveType.POINTS,
      attributes: attributes,
      extensions: extensions,
    });
  }

  if (linePositions.length > 0 && lineIndices.length > 1) {
    const positions = new Float32Array(linePositions);
    const indices = new Uint32Array(lineIndices);
    const minMax = computeMinMax(positions);

    const positionAccessor = addAccessor(positions, {
      type: "VEC3",
      componentType: ComponentDatatype.FLOAT,
      target: WebGLConstants.ARRAY_BUFFER,
      min: minMax.min,
      max: minMax.max,
    });
    const indicesAccessor = addAccessor(indices, {
      type: "SCALAR",
      componentType: ComponentDatatype.UNSIGNED_INT,
      target: WebGLConstants.ELEMENT_ARRAY_BUFFER,
    });
    const attributes = /** @type {*} */ ({
      POSITION: positionAccessor,
    });
    const extensions = /** @type {*} */ ({
      CESIUM_mesh_vector: {
        vector: true,
        count: lineCount,
      },
    });
    addFeatureIdsToPrimitive(attributes, extensions, lineFeatureIds);

    primitives.push({
      mode: PrimitiveType.LINE_STRIP,
      indices: indicesAccessor,
      attributes: attributes,
      extensions: extensions,
    });
  }

  if (polygonPositions.length > 0 && polygonIndices.length >= 3) {
    const positions = new Float32Array(polygonPositions);
    const indices = new Uint32Array(polygonIndices);
    const attributeOffsets = new Uint32Array(polygonAttributeOffsets);
    const indicesOffsets = new Uint32Array(polygonIndicesOffsets);
    const hasPolygonHoles = polygonHoleOffsets.length > 0;
    const holeCounts = hasPolygonHoles
      ? new Uint32Array(polygonHoleCounts)
      : undefined;
    const holeOffsets = hasPolygonHoles
      ? new Uint32Array(polygonHoleOffsets)
      : undefined;
    const minMax = computeMinMax(positions);

    const positionAccessor = addAccessor(positions, {
      type: "VEC3",
      componentType: ComponentDatatype.FLOAT,
      target: WebGLConstants.ARRAY_BUFFER,
      min: minMax.min,
      max: minMax.max,
    });
    const indicesAccessor = addAccessor(indices, {
      type: "SCALAR",
      componentType: ComponentDatatype.UNSIGNED_INT,
      target: WebGLConstants.ELEMENT_ARRAY_BUFFER,
    });
    const attributeOffsetsAccessor = addAccessor(attributeOffsets, {
      type: "SCALAR",
      componentType: ComponentDatatype.UNSIGNED_INT,
      target: WebGLConstants.ARRAY_BUFFER,
    });
    const indicesOffsetsAccessor = addAccessor(indicesOffsets, {
      type: "SCALAR",
      componentType: ComponentDatatype.UNSIGNED_INT,
      target: WebGLConstants.ARRAY_BUFFER,
    });
    const holeCountsAccessor = defined(holeCounts)
      ? addAccessor(holeCounts, {
          type: "SCALAR",
          componentType: ComponentDatatype.UNSIGNED_INT,
          target: WebGLConstants.ARRAY_BUFFER,
        })
      : undefined;
    const holeOffsetsAccessor = defined(holeOffsets)
      ? addAccessor(holeOffsets, {
          type: "SCALAR",
          componentType: ComponentDatatype.UNSIGNED_INT,
          target: WebGLConstants.ARRAY_BUFFER,
        })
      : undefined;
    const attributes = /** @type {*} */ ({
      POSITION: positionAccessor,
    });
    const extensions = /** @type {*} */ ({
      CESIUM_mesh_vector: {
        vector: true,
        count: polygonCount,
        polygonAttributeOffsets: attributeOffsetsAccessor,
        polygonIndicesOffsets: indicesOffsetsAccessor,
      },
    });
    if (hasPolygonHoles) {
      extensions.CESIUM_mesh_vector.polygonHoleCounts = holeCountsAccessor;
      extensions.CESIUM_mesh_vector.polygonHoleOffsets = holeOffsetsAccessor;
    }
    addFeatureIdsToPrimitive(attributes, extensions, polygonFeatureIds);

    primitives.push({
      mode: PrimitiveType.TRIANGLES,
      indices: indicesAccessor,
      attributes: attributes,
      extensions: extensions,
    });
  }

  if (primitives.length === 0) {
    return undefined;
  }

  const binaryChunk = concatChunks(chunks, byteLength);
  const translation = [origin.x, origin.y, origin.z];
  const extensionsUsed = ["CESIUM_mesh_vector"];
  if (featureCount > 0) {
    extensionsUsed.push("EXT_mesh_features");
  }

  const gltfJson = {
    asset: {
      version: "2.0",
    },
    extensionsUsed: extensionsUsed,
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    nodes: [
      {
        mesh: 0,
        translation: translation,
      },
    ],
    meshes: [
      {
        primitives: primitives,
      },
    ],
    accessors: accessors,
    bufferViews: bufferViews,
    buffers: [
      {
        byteLength: binaryChunk.byteLength,
      },
    ],
  };

  return buildGlb(gltfJson, binaryChunk);
}

/**
 * Assigns a stable auto-incrementing integer ID to each unique feature.
 *
 * @param {VectorTileFeature} feature
 * @param {Map<VectorTileFeature, number>} featureIdLookup
 * @returns {number}
 * @ignore
 */
function getOrAssignAutoFeatureId(feature, featureIdLookup) {
  let id = featureIdLookup.get(feature);
  if (!defined(id)) {
    id = featureIdLookup.size;
    featureIdLookup.set(feature, id);
  }
  return id;
}

/**
 * @param {VectorTileFeature} feature
 * @param {string} featureIdProperty
 * @param {Map<string, number>} featureIdLookup
 * @returns {number|undefined}
 * @ignore
 */
function mapFeatureIdFromProperty(feature, featureIdProperty, featureIdLookup) {
  const properties = feature.properties;
  if (!defined(properties)) {
    return undefined;
  }
  const propertyValue = /** @type {*} */ (properties)[featureIdProperty];
  if (!defined(propertyValue)) {
    return undefined;
  }
  if (
    typeof propertyValue !== "string" &&
    typeof propertyValue !== "number" &&
    typeof propertyValue !== "boolean"
  ) {
    return undefined;
  }
  if (typeof propertyValue === "number" && !Number.isFinite(propertyValue)) {
    return undefined;
  }
  const mapKey = `${typeof propertyValue}:${propertyValue}`;
  let mappedFeatureId = featureIdLookup.get(mapKey);
  if (defined(mappedFeatureId)) {
    return mappedFeatureId;
  }
  mappedFeatureId = featureIdLookup.size;
  featureIdLookup.set(mapKey, mappedFeatureId);
  return mappedFeatureId;
}

/**
 * @param {VectorTilePoint[][]} rawRings
 * @returns {Array.<PolygonRingGroup>}
 * @ignore
 */
function groupPolygonRings(rawRings) {
  /** @type {Array.<PolygonRingGroup>} */
  const groups = [];
  for (const rawRing of rawRings) {
    const ring = stripClosingVertex(rawRing);
    if (ring.length < 3) {
      continue;
    }
    const area = ringSignedArea(ring);
    if (area <= 0) {
      groups.push({ outerRing: ring, holes: [] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].holes.push(ring);
    }
  }
  return groups;
}

/**
 * @param {VectorTilePoint[]} ring
 * @returns {number}
 * @ignore
 */
function ringSignedArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
  }
  return area / 2;
}

/**
 * @param {VectorTilePoint[]} ring
 * @returns {VectorTilePoint[]}
 * @ignore
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
 * @param {VectorTilePoint} point
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @param {number} extent
 * @param {number} height
 * @param {Cartesian3} origin
 * @param {number[]} out
 * @ignore
 */
function appendTilePointAsLocalPosition(
  point,
  tileX,
  tileY,
  tileZ,
  extent,
  height,
  origin,
  out,
) {
  const n = 1 << tileZ;
  const u = (tileX + point.x / extent) / n;
  const v = (tileY + point.y / extent) / n;
  const lon = u * 2 * Math.PI - Math.PI;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * v)));

  Cartesian3.fromRadians(lon, lat, height, undefined, scratchWorld);
  Cartesian3.subtract(scratchWorld, origin, scratchLocal);
  out.push(scratchLocal.x, scratchLocal.y, scratchLocal.z);
}

/**
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @returns {Cartesian3}
 * @ignore
 */
function computeTileOriginCartesian(tileX, tileY, tileZ) {
  const n = 1 << tileZ;
  const u = (tileX + 0.5) / n;
  const v = (tileY + 0.5) / n;
  const lon = u * 2 * Math.PI - Math.PI;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * v)));
  return Cartesian3.fromRadians(lon, lat, 0);
}

/**
 * Packs a glTF JSON object and binary buffer into a GLB (Binary glTF) Uint8Array.
 * GLB spec: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-gltf-layout
 *
 * @param {object} gltfJson
 * @param {Uint8Array} binaryChunk
 * @returns {Uint8Array}
 * @ignore
 */
function buildGlb(gltfJson, binaryChunk) {
  const GLB_MAGIC = 0x46546c67; // "glTF"
  const GLB_VERSION = 2;
  const CHUNK_TYPE_JSON = 0x4e4f534a; // "JSON"
  const CHUNK_TYPE_BIN = 0x004e4942; // "BIN\0"

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
  // Pad JSON to 4-byte boundary with spaces (0x20)
  const jsonPaddedLength = Math.ceil(jsonBytes.length / 4) * 4;
  const jsonChunk = new Uint8Array(jsonPaddedLength);
  jsonChunk.fill(0x20);
  jsonChunk.set(jsonBytes);

  // Pad binary to 4-byte boundary with zeros
  const binPaddedLength = Math.ceil(binaryChunk.byteLength / 4) * 4;
  const binChunk = new Uint8Array(binPaddedLength);
  binChunk.set(binaryChunk);

  const totalLength =
    12 + // header
    8 +
    jsonPaddedLength + // JSON chunk header + data
    8 +
    binPaddedLength; // BIN chunk header + data

  const glb = new Uint8Array(totalLength);
  const view = new DataView(glb.buffer);
  let offset = 0;

  // Header
  view.setUint32(offset, GLB_MAGIC, true);
  offset += 4;
  view.setUint32(offset, GLB_VERSION, true);
  offset += 4;
  view.setUint32(offset, totalLength, true);
  offset += 4;

  // JSON chunk
  view.setUint32(offset, jsonPaddedLength, true);
  offset += 4;
  view.setUint32(offset, CHUNK_TYPE_JSON, true);
  offset += 4;
  glb.set(jsonChunk, offset);
  offset += jsonPaddedLength;

  // BIN chunk
  view.setUint32(offset, binPaddedLength, true);
  offset += 4;
  view.setUint32(offset, CHUNK_TYPE_BIN, true);
  offset += 4;
  glb.set(binChunk, offset);

  return glb;
}

/**
 * @param {Uint8Array[]} chunks
 * @param {number} totalByteLength
 * @returns {Uint8Array}
 * @ignore
 */
function concatChunks(chunks, totalByteLength) {
  const out = new Uint8Array(totalByteLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export default buildVectorGltfFromMVT;
