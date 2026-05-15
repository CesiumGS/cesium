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
/** @import {Attribute, Components, Node, Polygon, Primitive, Vector} from "../ModelComponents.js"; */

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

  const vector = primitive.vector;
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
    const stripCount = vector ? vector.count : getPrimitiveCount(indices);
    stats.polylinePrimitiveCount += stripCount;
    stats.polylineVertexCount += indices.length - stripCount + 1;
  } else if (
    primitiveType === PrimitiveType.TRIANGLES ||
    primitiveType === PrimitiveType.LINE_LOOP
  ) {
    if (vector) {
      stats.polygonPrimitiveCount += vector.count;
      stats.polygonVertexCount += positionCount;
      stats.polygonTriangleCount += indices.length / 3;

      const polygonHoleCounts = vector.polygonHoleCounts;
      if (polygonHoleCounts) {
        for (let i = 0; i < polygonHoleCounts.length; i++) {
          stats.polygonHoleCount += polygonHoleCounts[i];
        }
      }
    } else {
      const loopCount = getPrimitiveCount(indices);
      stats.polygonPrimitiveCount += polygon.count;
      stats.polygonVertexCount += indices.length - loopCount + 1;
      stats.polygonTriangleCount +=
        polygon.triangleIndices?.length ?? indices.length; // Over-estimate when using `indices.length`.
      stats.polygonHoleCount += loopCount - polygon.count;
    }
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
    if (defined(primitive.vector)) {
      appendBufferPolygonsDeprecated(
        collection,
        collectionIndex,
        collectionPositions,
        indices,
        getFeature,
        primitive.vector,
      );
    } else {
      appendBufferPolygons(
        collection,
        collectionIndex,
        collectionPositions,
        indices,
        getFeature,
        primitive.polygon,
      );
    }
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
 * @param {TypedArray} indices
 * @param {FeatureFactoryFn} getFeature
 * @param {Vector} vector
 * @deprecated To be removed after v1.142 release.
 * @ignore
 */
function appendBufferPolygonsDeprecated(
  collection,
  collectionIndex,
  collectionPositions,
  indices,
  getFeature,
  vector,
) {
  const polygonAttributeOffsets = vector.polygonAttributeOffsets;
  const polygonIndicesOffsets = vector.polygonIndicesOffsets;
  const polygonHoleCounts = vector.polygonHoleCounts;
  const polygonHoleOffsets = vector.polygonHoleOffsets;

  const vertexCount = collectionPositions.length / 3;
  const polygonCount = polygonAttributeOffsets.length;
  for (let i = 0; i < polygonCount; i++) {
    const polygonVertexStart = polygonAttributeOffsets[i];
    const polygonVertexEnd =
      i + 1 < polygonCount ? polygonAttributeOffsets[i + 1] : vertexCount;

    const positions = collectionPositions.subarray(
      polygonVertexStart * 3,
      polygonVertexEnd * 3,
    );

    let holes;
    if (defined(polygonHoleCounts) && polygonHoleCounts[i] > 0) {
      const holeCount = polygonHoleCounts[i];
      holes = polygonHoleOffsets.slice(i, i + holeCount);
      for (let h = 0; h < holeCount; h++) {
        holes[i] -= polygonVertexStart;
      }
    }

    const triangleIndexStart = polygonIndicesOffsets[i];
    const triangleIndexEnd =
      i + 1 < polygonCount ? polygonIndicesOffsets[i + 1] : indices.length;
    const triangles = indices.slice(triangleIndexStart, triangleIndexEnd);
    for (let t = 0; t < triangleIndexEnd; t++) {
      triangles[t] -= polygonVertexStart;
    }

    const feature = getFeature(polygonVertexStart);
    if (feature) {
      feature.addPrimitiveByCollection(collectionIndex, i);
    }

    collection.add(
      {
        positions,
        triangles,
        holes,
        pickObject: feature,
        featureId: feature?.featureId,
      },
      scratchPolygon,
    );
  }
}

/**
 * @param {BufferPolygonCollection} collection
 * @param {number} collectionIndex
 * @param {TypedArray} collectionPositions
 * @param {TypedArray} indices
 * @param {FeatureFactoryFn} getFeature
 * @param {Polygon} polygon
 * @ignore
 */
function appendBufferPolygons(
  collection,
  collectionIndex,
  collectionPositions,
  indices,
  getFeature,
  polygon,
) {
  // Create mapping from vertex index in the source glTF primitive, to result
  // vertex index in the extracted vector primitive.
  const TypedArray = /** @type {TypedArrayConstructor} */ (indices.constructor);
  const resultIndices = new TypedArray(indices.length);

  const loopRestartIndex = getPrimitiveRestartIndex(indices);

  for (let i = 0; i < polygon.count; i++) {
    const isLastPolygon = i + 1 === polygon.count;

    // Extract vertex loops, exterior loops followed by interior ("holes").
    const loopIndicesStart = polygon.indicesOffsets[i];
    const loopIndicesEnd = isLastPolygon
      ? indices.length
      : polygon.indicesOffsets[i + 1];
    const loopIndices = indices.subarray(loopIndicesStart, loopIndicesEnd);
    const positions = copyArrayByIndices(
      collectionPositions,
      loopIndices,
      3,
      resultIndices,
    );

    // List start indices of interior loops ("holes").
    const holesArray = [];
    for (let j = 0; j < loopIndices.length; j++) {
      const isLastIndex = j + 1 === loopIndices.length;
      if (loopIndices[j] === loopRestartIndex && !isLastIndex) {
        holesArray.push(j);
      }
    }
    const holes = new TypedArray(holesArray);

    // Extract or tessellate triangle indices.
    let triangles;
    if (defined(polygon.triangleIndices)) {
      const triangleIndicesStart = polygon.triangleIndicesOffsets[i];
      const triangleIndicesEnd = isLastPolygon
        ? polygon.triangleIndices.length
        : polygon.triangleIndicesOffsets[i + 1];
      triangles = polygon.triangleIndices.subarray(
        triangleIndicesStart,
        triangleIndicesEnd,
      );
      // Rewrite collection-local indices to polygon-local indices.
      for (let j = 0; j < triangles.length; j++) {
        triangles[j] = resultIndices[triangles[j]];
      }
    } else {
      throw new Error("Runtime triangulation not yet supported.");
    }

    const feature = getFeature(loopIndices[0]);
    if (feature) {
      feature.addPrimitiveByCollection(collectionIndex, i);
    }

    collection.add(
      {
        positions,
        triangles,
        holes,
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

  for (let i = 0; i < indices.length; i++) {
    // Write each result value, skipping primitive restart indices.
    const index = indices[i];
    if (index !== restartIndex) {
      for (let j = 0; j < stride; j++) {
        result[i * stride + j] = array[index * stride + j];
      }
    }

    // Write source index -> result index mapping.
    if (resultIndices) {
      resultIndices[index] = index === restartIndex ? restartIndex : i;
    }
  }

  return result;
}

export default createVectorTileBuffersFromModelComponents;
