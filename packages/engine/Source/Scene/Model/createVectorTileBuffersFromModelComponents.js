// @ts-check

import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import RuntimeError from "../../Core/RuntimeError.js";
import BufferPoint from "../BufferPoint.js";
import BufferPointCollection from "../BufferPointCollection.js";
import BufferPolygon from "../BufferPolygon.js";
import BufferPolygonCollection from "../BufferPolygonCollection.js";
import BufferPolyline from "../BufferPolyline.js";
import BufferPolylineCollection from "../BufferPolylineCollection.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelReader from "./ModelReader.js";
import ModelUtility from "./ModelUtility.js";
import ModelComponents from "../ModelComponents.js";
import Cesium3DTileVectorFeature from "../Cesium3DTileVectorFeature.js";

/** @import { TypedArray, TypedArrayConstructor } from "../../Core/globalTypes.js"; */
/** @import BufferPrimitive from "../BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../BufferPrimitiveCollection.js"; */
/** @import VectorGltf3DTileContent from "../VectorGltf3DTileContent.js"; */
/** @import {Attribute, Components, Node, Polygon, Primitive} from "../ModelComponents.js"; */

/**
 * @typedef {object} VectorTileResult
 * @property {Array<BufferPrimitiveCollection<BufferPrimitive>>} collections List of all vector primitive collections.
 * @property {Array<Matrix4>} collectionLocalMatrices List of transform matrices for each collection; order matches 'collections'.
 * @property {Map<BufferPrimitiveCollection<BufferPrimitive>, number>} collectionFeatureTableIds Maps vector primitive collection -> propertyTableId.
 * @property {Map<number, Map<number, Cesium3DTileVectorFeature>>} featuresByTableId Maps propertyTableId -> featureId -> feature.
 * @ignore
 */

const scratchPosition = new Cartesian3();
const scratchPoint = new BufferPoint();
const scratchPolyline = new BufferPolyline();
const scratchPolygon = new BufferPolygon();

/**
 * Creates vector buffers from model components.
 *
 * @param {VectorGltf3DTileContent} content
 * @param {Components} components
 * @returns {VectorTileResult}
 *
 * @ignore
 */
function createVectorTileBuffersFromModelComponents(content, components) {
  const rootNodes = components.scene.nodes;

  /** @type {VectorTileResult} */
  const result = {
    collections: [],
    collectionLocalMatrices: [],
    collectionFeatureTableIds: new Map(),
    featuresByTableId: new Map(),
  };

  for (let i = 0; i < rootNodes.length; i++) {
    appendNodeToBuffers(content, rootNodes[i], Matrix4.IDENTITY, result);
  }

  return result;
}

/**
 * @param {TypedArray} indices
 * @ignore
 */
function getPrimitiveRestartIndex(indices) {
  const bits = indices.BYTES_PER_ELEMENT * 8;
  return Math.pow(2, bits) - 1;
}

/**
 * @param {Primitive} primitive
 * @ignore
 */
function gatherPrimitiveStats(primitive) {
  const stats = {
    pointPrimitiveCount: 0,
    pointVertexCount: 0,
    polylinePrimitiveCount: 0,
    polylineVertexCount: 0,
    polygonPrimitiveCount: 0,
    polygonVertexCount: 0,
    polygonHoleCount: 0,
    polygonTriangleCount: 0,
  };

  const polygon = primitive.polygon;
  const primitiveType = primitive.primitiveType;
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );
  const positionCount = positionAttribute.count;

  const indices = primitive.indices
    ? ModelReader.readIndicesAsTypedArray(primitive.indices)
    : undefined;

  if (primitiveType === PrimitiveType.POINTS) {
    stats.pointPrimitiveCount += positionCount;
    stats.pointVertexCount += positionCount;
  } else if (primitiveType === PrimitiveType.LINE_STRIP) {
    const stripCount = getPrimitiveCount(indices);
    stats.polylinePrimitiveCount += stripCount;
    stats.polylineVertexCount += indices.length - stripCount + 1;
  } else if (
    primitiveType === PrimitiveType.TRIANGLES ||
    primitiveType === PrimitiveType.LINE_LOOP
  ) {
    // Count interior rings ("holes"): in loopIndices each hole loop is preceded
    // by exactly one primitive restart index, and polygons are separated by
    // loopIndicesOffsets (not restart indices).
    const loopRestartIndex = getPrimitiveRestartIndex(polygon.loopIndices);
    let holeCount = 0;
    for (let i = 0; i < polygon.loopIndices.length; i++) {
      if (polygon.loopIndices[i] === loopRestartIndex) {
        holeCount++;
      }
    }
    stats.polygonPrimitiveCount += polygon.count;
    // Includes both ring vertices and interior (fill subdivision) vertices.
    stats.polygonVertexCount += positionCount;
    stats.polygonTriangleCount += polygon.triangleIndices.length / 3;
    stats.polygonHoleCount += holeCount;
  } else {
    throw new RuntimeError(`Unexpected primitive type: ${primitiveType}`);
  }

  return stats;
}

/**
 * Returns the number of GL primitives, separated by primitive restart index
 * values, defined in the given index list.
 *
 * @param {TypedArray} indices
 * @ignore
 */
function getPrimitiveCount(indices) {
  const restart = getPrimitiveRestartIndex(indices);

  let count = 0;

  for (let i = 0; i < indices.length; i++) {
    if (indices[i] === restart && i + 1 < indices.length) {
      count++;
    }
  }

  return count + 1;
}

/**
 * @param {VectorGltf3DTileContent} content
 * @param {Primitive} primitive
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @param {number} collectionIndex
 * @param {Map<number, Cesium3DTileVectorFeature>} features
 * @ignore
 */
function appendPrimitiveToBuffers(
  content,
  primitive,
  collection,
  collectionIndex,
  features,
) {
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );
  /** @type {TypedArray} */
  const collectionPositions =
    positionAttribute.typedArray ??
    (collection.positionNormalized
      ? ModelReader.readAttributeAsRawCompactTypedArray(positionAttribute)
      : ModelReader.readAttributeAsTypedArray(positionAttribute));

  /** @type {TypedArray} */
  const indices = primitive.indices
    ? ModelReader.readIndicesAsTypedArray(primitive.indices)
    : undefined;

  const getFeature = createFeatureFactoryFn(content, primitive, features);

  if (collection instanceof BufferPointCollection) {
    appendBufferPoints(
      collection,
      collectionIndex,
      collectionPositions,
      indices,
      getFeature,
    );
  } else if (collection instanceof BufferPolylineCollection) {
    appendBufferPolylines(
      collection,
      collectionIndex,
      collectionPositions,
      indices,
      getFeature,
    );
  } else if (collection instanceof BufferPolygonCollection) {
    appendBufferPolygons(
      collection,
      collectionIndex,
      collectionPositions,
      getFeature,
      primitive.polygon,
    );
  }
}

/**
 * @callback FeatureFactoryFn
 * @param {number} vertexOffset
 * @returns {Cesium3DTileVectorFeature|undefined}
 * @ignore
 */

/**
 * Returns a factory function that, given a vertex offset, returns the
 * Cesium3DTileVectorFeature instance associated with the vertex.
 *
 * @param {VectorGltf3DTileContent} content
 * @param {Primitive} primitive
 * @param {Map<number, Cesium3DTileVectorFeature>} features
 * @returns {FeatureFactoryFn}
 * @ignore
 */
function createFeatureFactoryFn(content, primitive, features) {
  // @ts-expect-error Missing types.
  const label = content.tileset.featureIdLabel;
  const featureIdComponent = ModelUtility.getFeatureIdsByLabel(
    primitive.featureIds,
    label,
  );

  if (!(featureIdComponent instanceof ModelComponents.FeatureIdAttribute)) {
    return () => undefined;
  }

  const featureIdAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.FEATURE_ID,
    featureIdComponent.setIndex,
  );

  /** @type {TypedArray} */
  const featureIdArray =
    featureIdAttribute.typedArray ??
    ModelReader.readAttributeAsTypedArray(featureIdAttribute);

  for (let i = 0; i < featureIdArray.length; i++) {
    const featureId = featureIdArray[i];
    if (!features.has(featureId)) {
      const feature = new Cesium3DTileVectorFeature(
        content,
        featureId,
        featureIdComponent.propertyTableId,
      );
      features.set(featureId, feature);
    }
  }

  /** @type {FeatureFactoryFn} */
  return function getFeature(vertexOffset) {
    const featureId = featureIdArray[vertexOffset];
    if (featureId !== featureIdComponent.nullFeatureId) {
      return features.get(featureId);
    }
  };
}

/**
 * @param {BufferPointCollection} collection
 * @param {number} collectionIndex
 * @param {TypedArray} collectionPositions
 * @param {TypedArray} indices
 * @param {FeatureFactoryFn} getFeature
 * @ignore
 */
function appendBufferPoints(
  collection,
  collectionIndex,
  collectionPositions,
  indices,
  getFeature,
) {
  const vertexCount = collectionPositions.length / 3;

  for (let i = 0, il = indices ? indices.length : vertexCount; i < il; i++) {
    const vertexOffset = indices ? indices[i] : i;
    Cartesian3.fromArray(
      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      collectionPositions,
      vertexOffset * 3,
      scratchPosition,
    );

    const feature = getFeature(vertexOffset);
    if (feature) {
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
 * @param {BufferPolylineCollection} collection
 * @param {number} collectionIndex
 * @param {TypedArray} collectionPositions
 * @param {TypedArray} indices
 * @param {FeatureFactoryFn} getFeature
 * @ignore
 */
function appendBufferPolylines(
  collection,
  collectionIndex,
  collectionPositions,
  indices,
  getFeature,
) {
  const restartIndex = getPrimitiveRestartIndex(indices);

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
    const lineIndices = indices.subarray(lineIndexStart, lineIndexEnd);
    const positions = copyArrayByIndices(collectionPositions, lineIndices, 3);

    const feature = getFeature(indices[lineIndexStart]);
    if (feature) {
      feature.addPrimitiveByCollection(collectionIndex, primitiveIndex);
    }

    collection.add(
      { positions, pickObject: feature, featureId: feature?.featureId },
      scratchPolyline,
    );

    lineIndexStart = i + 1;
    lineIndexCount = 0;
    primitiveIndex++;
  }
}

/**
 * @param {BufferPolygonCollection} collection
 * @param {number} collectionIndex
 * @param {TypedArray} collectionPositions
 * @param {FeatureFactoryFn} getFeature
 * @param {Polygon} polygon
 * @ignore
 */
function appendBufferPolygons(
  collection,
  collectionIndex,
  collectionPositions,
  getFeature,
  polygon,
) {
  const PositionArray = /** @type {TypedArrayConstructor} */ (
    collectionPositions.constructor
  );
  const IndexArray = /** @type {TypedArrayConstructor} */ (
    polygon.triangleIndices.constructor
  );
  const loopRestartIndex = getPrimitiveRestartIndex(polygon.loopIndices);

  for (let i = 0; i < polygon.count; i++) {
    const isLastPolygon = i + 1 === polygon.count;

    const loopStart = polygon.loopIndicesOffsets[i];
    const loopEnd = isLastPolygon
      ? polygon.loopIndices.length
      : polygon.loopIndicesOffsets[i + 1];
    const triangleStart = polygon.triangleIndicesOffsets[i];
    const triangleEnd = isLastPolygon
      ? polygon.triangleIndices.length
      : polygon.triangleIndicesOffsets[i + 1];

    // Build a compact per-polygon vertex layout. Ring vertices come first
    // (exterior loop, then each interior "hole" loop), preserving the
    // contiguous-prefix layout BufferPolygon expects, followed by any interior
    // (fill subdivision) vertices referenced only by triangles. 'globalToLocal'
    // maps a shared-buffer vertex index to its index in this polygon.
    const globalToLocal = new Map();
    /** @type {number[]} */
    const orderedGlobal = [];
    /** @type {number[]} */
    const holes = [];
    let ringCount = 0;
    let startNewRing = true;

    for (let j = loopStart; j < loopEnd; j++) {
      const globalIndex = polygon.loopIndices[j];
      if (globalIndex === loopRestartIndex) {
        startNewRing = true;
        continue;
      }
      if (startNewRing) {
        // Every ring after the first is an interior ring ("hole"); record the
        // local vertex index where its loop begins.
        if (ringCount > 0) {
          holes.push(orderedGlobal.length);
        }
        ringCount++;
        startNewRing = false;
      }
      if (!globalToLocal.has(globalIndex)) {
        globalToLocal.set(globalIndex, orderedGlobal.length);
        orderedGlobal.push(globalIndex);
      }
    }

    // Append interior (non-ring) vertices referenced only by fill triangles.
    for (let j = triangleStart; j < triangleEnd; j++) {
      const globalIndex = polygon.triangleIndices[j];
      if (!globalToLocal.has(globalIndex)) {
        globalToLocal.set(globalIndex, orderedGlobal.length);
        orderedGlobal.push(globalIndex);
      }
    }

    const vertexCount = orderedGlobal.length;
    const positions = new PositionArray(vertexCount * 3);
    for (let k = 0; k < vertexCount; k++) {
      const globalIndex = orderedGlobal[k];
      positions[k * 3] = collectionPositions[globalIndex * 3];
      positions[k * 3 + 1] = collectionPositions[globalIndex * 3 + 1];
      positions[k * 3 + 2] = collectionPositions[globalIndex * 3 + 2];
    }

    const triangleCount = triangleEnd - triangleStart;
    const triangles = new IndexArray(triangleCount);
    for (let j = 0; j < triangleCount; j++) {
      triangles[j] = globalToLocal.get(
        polygon.triangleIndices[triangleStart + j],
      );
    }

    const feature = getFeature(vertexCount > 0 ? orderedGlobal[0] : 0);
    if (feature) {
      feature.addPrimitiveByCollection(collectionIndex, i);
    }

    collection.add(
      {
        positions,
        triangles,
        holes: new IndexArray(holes),
        pickObject: feature,
        featureId: feature?.featureId,
      },
      scratchPolygon,
    );
  }
}

/**
 * @param {VectorGltf3DTileContent} content
 * @param {Node} node
 * @param {Matrix4} parentTransform
 * @param {VectorTileResult} result
 * @ignore
 */
function appendNodeToBuffers(content, node, parentTransform, result) {
  const localTransform = ModelUtility.getNodeTransform(node);
  const nodeTransform = Matrix4.multiplyTransformation(
    parentTransform,
    localTransform,
    new Matrix4(),
  );

  const primitives = node.primitives;
  for (let i = 0; i < primitives.length; i++) {
    const primitive = primitives[i];
    const primitiveType = primitive.primitiveType;

    /** @type {BufferPrimitiveCollection<BufferPrimitive>} */
    let collection;

    const stats = gatherPrimitiveStats(primitive);

    const positionAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.POSITION,
    );
    const positionNormalized = positionAttribute.normalized ?? false;
    const positionDatatype = positionAttribute.componentDatatype;

    if (primitiveType === PrimitiveType.POINTS) {
      collection = new BufferPointCollection({
        primitiveCountMax: stats.pointPrimitiveCount,
        allowPicking: true,
        positionNormalized,
        positionDatatype,
      });
    } else if (primitiveType === PrimitiveType.LINE_STRIP) {
      collection = new BufferPolylineCollection({
        primitiveCountMax: stats.polylinePrimitiveCount,
        vertexCountMax: stats.polylineVertexCount,
        allowPicking: true,
        positionNormalized,
        positionDatatype,
      });
    } else if (
      primitiveType === PrimitiveType.TRIANGLES ||
      primitiveType === PrimitiveType.LINE_LOOP
    ) {
      collection = new BufferPolygonCollection({
        primitiveCountMax: stats.polygonPrimitiveCount,
        vertexCountMax: stats.polygonVertexCount,
        holeCountMax: stats.polygonHoleCount,
        triangleCountMax: stats.polygonTriangleCount,
        allowPicking: true,
        positionNormalized,
        positionDatatype,
      });
    }

    const featureIdComponent = primitive.featureIds?.[0];
    const propertyTableId = featureIdComponent?.propertyTableId;
    if (!result.featuresByTableId.has(propertyTableId)) {
      result.featuresByTableId.set(propertyTableId, new Map());
    }

    result.collections.push(collection);
    result.collectionLocalMatrices.push(Matrix4.clone(nodeTransform));
    result.collectionFeatureTableIds.set(collection, propertyTableId);

    appendPrimitiveToBuffers(
      content,
      primitive,
      collection,
      result.collections.length - 1,
      result.featuresByTableId.get(propertyTableId),
    );
  }

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    appendNodeToBuffers(content, children[i], nodeTransform, result);
  }
}

/**
 * Given a source array and a list of indices, creates and returns a new array
 * containing all values of the source array specified by the indices. Indices
 * may contain "primitive restart index" values. Optionally, a 'resultIndices'
 * parameter can be populated with a mapping from source index to result index.
 *
 * @param {TypedArray} array
 * @param {TypedArray} indices
 * @param {number} stride
 * @param {TypedArray} [resultIndices]
 * @returns {TypedArray}
 * @ignore
 */
function copyArrayByIndices(array, indices, stride, resultIndices) {
  const restartIndex = getPrimitiveRestartIndex(indices);

  // Scan and count the number of non-restart indices.
  let count = 0;
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    if (index !== restartIndex) {
      count++;
    }
  }

  const TypedArray = /** @type {TypedArrayConstructor} */ (array.constructor);
  const result = new TypedArray(count * stride);

  // Write each result value, skipping primitive restart indices. Write source
  // index -> result index to 'resultIndices' if provided.
  let dstIndex = 0;
  for (let i = 0; i < indices.length; i++) {
    const srcIndex = indices[i];

    if (resultIndices) {
      resultIndices[srcIndex] =
        srcIndex === restartIndex ? restartIndex : dstIndex;
    }

    if (srcIndex === restartIndex) {
      continue;
    }

    for (let j = 0; j < stride; j++) {
      result[dstIndex * stride + j] = array[srcIndex * stride + j];
    }

    dstIndex++;
  }

  return result;
}

export default createVectorTileBuffersFromModelComponents;
