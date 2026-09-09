// @ts-check

import Cartesian3 from "../Core/Cartesian3.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import Matrix4 from "../Core/Matrix4.js";
import defined from "../Core/defined.js";
import BufferPoint from "./BufferPoint.js";
import BufferPointCollection from "./BufferPointCollection.js";
import BufferPolygon from "./BufferPolygon.js";
import BufferPolygonCollection from "./BufferPolygonCollection.js";
import BufferPolyline from "./BufferPolyline.js";
import BufferPolylineCollection from "./BufferPolylineCollection.js";
import Cesium3DTileVectorFeature from "./Cesium3DTileVectorFeature.js";

/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import { VectorTileBuffers, VectorLayerPolygonBuffers, VectorLayerPolylineBuffers, VectorLayerPointBuffers } from "./buildVectorTileBuffers.js"; */
/** @import { VectorTileResult } from "./Model/createVectorTileBuffersFromModelComponents.js"; */
/** @import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js"; */

const scratchPosition = new Cartesian3();
const scratchPoint = new BufferPoint();
const scratchPolyline = new BufferPolyline();
const scratchPolygon = new BufferPolygon();
const scratchOrigin = new Cartesian3();

/** All direct-path features share a single property table. */
const PROPERTY_TABLE_ID = 0;

/**
 * Minimal batch-table-compatible wrapper over a plain feature property array,
 * satisfying the interface used by {@link Cesium3DTileVectorFeature}
 * (hasProperty, getProperty, getPropertyIds, featuresLength, etc.) without
 * requiring a Model or Cesium3DTileBatchTable.
 *
 * @ignore
 */
class VectorPropertyTable {
  /**
   * @param {Array<Object.<string, *>|null>} properties Feature properties, indexed by feature ID.
   */
  constructor(properties) {
    this._properties = properties;
    /** @type {number|undefined} */
    this._byteLength = undefined;
  }

  get featuresLength() {
    return this._properties.length;
  }

  /**
   * Estimated memory used by the feature properties, in bytes.
   * @type {number}
   */
  get batchTableByteLength() {
    if (!defined(this._byteLength)) {
      this._byteLength = estimatePropertiesByteLength(this._properties);
    }
    return this._byteLength;
  }

  /**
   * @param {number} featureId
   * @param {string} name
   * @returns {boolean}
   */
  hasProperty(featureId, name) {
    const props = this._properties[featureId];
    return defined(props) && name in props;
  }

  /**
   * @param {number} featureId
   * @param {string} name
   * @returns {*}
   */
  getProperty(featureId, name) {
    return this._properties[featureId]?.[name];
  }

  /**
   * Plain feature properties carry no semantic definitions.
   * @param {number} _featureId
   * @param {string} _name
   * @returns {boolean}
   */
  hasPropertyBySemantic(_featureId, _name) {
    return false;
  }

  /**
   * @param {number} _featureId
   * @param {string} _name
   * @returns {undefined}
   */
  getPropertyBySemantic(_featureId, _name) {
    return undefined;
  }

  /**
   * @param {number} featureId
   * @param {string[]} [results]
   * @returns {string[]}
   */
  getPropertyIds(featureId, results) {
    results = results ?? [];
    results.length = 0;
    const props = this._properties[featureId];
    if (defined(props)) {
      for (const name of Object.keys(props)) {
        results.push(name);
      }
    }
    return results;
  }

  /**
   * @param {number} _featureId
   * @param {string} _className
   * @returns {boolean}
   */
  isClass(_featureId, _className) {
    return false;
  }

  /**
   * @param {number} _featureId
   * @param {string} _className
   * @returns {boolean}
   */
  isExactClass(_featureId, _className) {
    return false;
  }

  /**
   * @param {number} _featureId
   * @returns {string|undefined}
   */
  getExactClassName(_featureId) {
    return undefined;
  }
}

/**
 * Estimates the memory used by an array of feature property objects.
 * Strings are counted at two bytes per character; numbers and booleans
 * at eight bytes each.
 *
 * @param {Array<Object.<string, *>|null>} properties
 * @returns {number} The estimated byte length.
 * @private
 */
function estimatePropertiesByteLength(properties) {
  let byteLength = 0;
  for (let i = 0; i < properties.length; i++) {
    const props = properties[i];
    if (!defined(props)) {
      continue;
    }
    for (const name of Object.keys(props)) {
      byteLength += 2 * name.length;
      const value = props[name];
      if (typeof value === "string") {
        byteLength += 2 * value.length;
      } else {
        byteLength += 8;
      }
    }
  }
  return byteLength;
}

/**
 * Creates vector primitive collections directly from transferable vector tile
 * geometry buffers (as produced by buildVectorTileBuffers in a worker),
 * bypassing the glTF/Model round-trip entirely.
 *
 * @param {VectorGltf3DTileContent} content
 * @param {VectorTileBuffers} geometry
 * @returns {VectorTileResult}
 *
 * @ignore
 */
function createVectorTileBuffersFromGeometry(content, geometry) {
  /** @type {VectorTileResult} */
  const result = {
    collections: [],
    collectionLocalMatrices: [],
    collectionFeatureTableIds: new Map(),
    featuresByTableId: new Map(),
  };

  /** @type {Map<number, Cesium3DTileVectorFeature>} */
  const features = new Map();
  result.featuresByTableId.set(PROPERTY_TABLE_ID, features);

  const nullFeatureId = geometry.nullFeatureId;

  /**
   * @param {number} featureId
   * @returns {Cesium3DTileVectorFeature|undefined}
   */
  function getFeature(featureId) {
    if (featureId === nullFeatureId) {
      return undefined;
    }
    let feature = features.get(featureId);
    if (!defined(feature)) {
      feature = new Cesium3DTileVectorFeature(
        content,
        featureId,
        PROPERTY_TABLE_ID,
      );
      features.set(featureId, feature);
    }
    return feature;
  }

  scratchOrigin.x = geometry.origin.x;
  scratchOrigin.y = geometry.origin.y;
  scratchOrigin.z = geometry.origin.z;
  const localMatrix = Matrix4.fromTranslation(scratchOrigin, new Matrix4());

  /**
   * @param {BufferPrimitiveCollection<*>} collection
   */
  function registerCollection(collection) {
    result.collections.push(collection);
    result.collectionLocalMatrices.push(Matrix4.clone(localMatrix));
    result.collectionFeatureTableIds.set(collection, PROPERTY_TABLE_ID);
    return result.collections.length - 1;
  }

  for (const layer of geometry.layers) {
    if (defined(layer.points)) {
      appendPoints(layer.points, registerCollection, getFeature);
    }
    if (defined(layer.polylines)) {
      appendPolylines(layer.polylines, registerCollection, getFeature);
    }
    if (defined(layer.polygons)) {
      appendPolygons(layer.polygons, registerCollection, getFeature);
    }
  }

  return result;
}

/**
 * @callback RegisterCollectionFn
 * @param {*} collection
 * @returns {number} The collection index.
 * @ignore
 */

/**
 * @callback GetFeatureFn
 * @param {number} featureId
 * @returns {Cesium3DTileVectorFeature|undefined}
 * @ignore
 */

/**
 * @param {VectorLayerPointBuffers} points
 * @param {RegisterCollectionFn} registerCollection
 * @param {GetFeatureFn} getFeature
 * @ignore
 */
function appendPoints(points, registerCollection, getFeature) {
  const positions = points.positions;
  const featureIds = points.featureIds;
  const vertexCount = positions.length / 3;

  const collection = new BufferPointCollection({
    primitiveCountMax: vertexCount,
    allowPicking: true,
    positionDatatype: ComponentDatatype.FLOAT,
  });
  const collectionIndex = registerCollection(collection);

  for (let i = 0; i < vertexCount; i++) {
    Cartesian3.fromArray(
      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      positions,
      i * 3,
      scratchPosition,
    );

    const feature = getFeature(featureIds[i]);
    if (defined(feature)) {
      feature.addPrimitiveByCollection(collectionIndex, i);
    }

    collection.add(
      {
        position: scratchPosition,
        pickObject: feature,
        featureId: feature?.featureId,
      },
      scratchPoint,
    );
  }
}

/**
 * @param {VectorLayerPolylineBuffers} polylines
 * @param {RegisterCollectionFn} registerCollection
 * @param {GetFeatureFn} getFeature
 * @ignore
 */
function appendPolylines(polylines, registerCollection, getFeature) {
  const positions = polylines.positions;
  const featureIds = polylines.featureIds;
  const indices = polylines.indices;
  const restartIndex = 0xffffffff;

  const collection = new BufferPolylineCollection({
    primitiveCountMax: polylines.count,
    vertexCountMax: positions.length / 3,
    allowPicking: true,
    positionDatatype: ComponentDatatype.FLOAT,
  });
  const collectionIndex = registerCollection(collection);

  let lineIndexStart = 0;
  let lineIndexCount = 0;
  let primitiveIndex = 0;

  for (let i = 0; i < indices.length; i++) {
    // Iteration has reached the end of a line strip primitive if the current
    // index is a "restart index", or the next index is out of bounds.
    const index = indices[i];
    if (index === restartIndex) {
      lineIndexCount = i - lineIndexStart;
    } else if (i + 1 === indices.length) {
      lineIndexCount = i + 1 - lineIndexStart;
    }

    if (lineIndexCount === 0) {
      continue;
    }

    const lineIndexEnd = lineIndexStart + lineIndexCount;
    const linePositions = new Float32Array(lineIndexCount * 3);
    for (let j = lineIndexStart; j < lineIndexEnd; j++) {
      const vertexOffset = indices[j];
      const dst = (j - lineIndexStart) * 3;
      linePositions[dst] = positions[vertexOffset * 3];
      linePositions[dst + 1] = positions[vertexOffset * 3 + 1];
      linePositions[dst + 2] = positions[vertexOffset * 3 + 2];
    }

    const feature = getFeature(featureIds[indices[lineIndexStart]]);
    if (defined(feature)) {
      feature.addPrimitiveByCollection(collectionIndex, primitiveIndex);
    }

    collection.add(
      {
        positions: linePositions,
        pickObject: feature,
        featureId: feature?.featureId,
      },
      scratchPolyline,
    );

    lineIndexStart = i + 1;
    lineIndexCount = 0;
    primitiveIndex++;
  }
}

/**
 * @param {VectorLayerPolygonBuffers} polygons
 * @param {RegisterCollectionFn} registerCollection
 * @param {GetFeatureFn} getFeature
 * @ignore
 */
function appendPolygons(polygons, registerCollection, getFeature) {
  const positions = polygons.positions;
  const featureIds = polygons.featureIds;
  const indices = polygons.indices;
  const attributeOffsets = polygons.attributeOffsets;
  const indicesOffsets = polygons.indicesOffsets;
  const holeCounts = polygons.holeCounts;
  const holeOffsets = polygons.holeOffsets;

  const vertexCount = positions.length / 3;
  const polygonCount = attributeOffsets.length;

  const collection = new BufferPolygonCollection({
    primitiveCountMax: polygonCount,
    vertexCountMax: vertexCount,
    holeCountMax: holeOffsets?.length ?? 0,
    triangleCountMax: indices.length / 3,
    allowPicking: true,
    positionDatatype: ComponentDatatype.FLOAT,
  });
  const collectionIndex = registerCollection(collection);

  let holeCursor = 0;
  for (let i = 0; i < polygonCount; i++) {
    const polygonVertexStart = attributeOffsets[i];
    const polygonVertexEnd =
      i + 1 < polygonCount ? attributeOffsets[i + 1] : vertexCount;

    const polygonPositions = positions.subarray(
      polygonVertexStart * 3,
      polygonVertexEnd * 3,
    );

    let holes;
    if (defined(holeCounts) && holeCounts[i] > 0) {
      const holeCount = holeCounts[i];
      holes = holeOffsets.slice(holeCursor, holeCursor + holeCount);
      for (let h = 0; h < holeCount; h++) {
        holes[h] -= polygonVertexStart;
      }
      holeCursor += holeCount;
    }

    const triangleIndexStart = indicesOffsets[i];
    const triangleIndexEnd =
      i + 1 < polygonCount ? indicesOffsets[i + 1] : indices.length;
    const triangles = indices.slice(triangleIndexStart, triangleIndexEnd);
    for (let t = 0; t < triangles.length; t++) {
      triangles[t] -= polygonVertexStart;
    }

    const feature = getFeature(featureIds[polygonVertexStart]);
    if (defined(feature)) {
      feature.addPrimitiveByCollection(collectionIndex, i);
    }

    collection.add(
      {
        positions: polygonPositions,
        triangles,
        holes,
        pickObject: feature,
        featureId: feature?.featureId,
      },
      scratchPolygon,
    );
  }
}

export default createVectorTileBuffersFromGeometry;
export { VectorPropertyTable };
