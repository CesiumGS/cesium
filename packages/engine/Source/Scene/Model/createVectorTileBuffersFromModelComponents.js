// @ts-check

import Cartesian3 from "../../Core/Cartesian3.js";
import assert from "../../Core/assert.js";
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

/** @import { TypedArray } from "../../Core/globalTypes.js"; */
/** @import BufferPrimitive from "../BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../BufferPrimitiveCollection.js"; */
/** @import VectorGltf3DTileContent from "../VectorGltf3DTileContent.js"; */
/** @import {Attribute, Components, Node, Primitive} from "../ModelComponents.js"; */

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
 * @param {TypedArray} indices
 * @param {Function} callback
 * @ignore
 */
function forEachLineStripSegment(indices, callback) {
  const restart = getPrimitiveRestartIndex(indices);
  let segmentStart = 0;
  for (let i = 0; i <= indices.length; i++) {
    if (i === indices.length || indices[i] === restart) {
      const segmentCount = i - segmentStart;
      if (segmentCount > 0) {
        callback(segmentStart, segmentCount);
      }
      segmentStart = i + 1;
    }
  }
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
    stats.pointPrimitiveCount += vector.count;
    stats.pointVertexCount += vector.count;
  } else if (primitiveType === PrimitiveType.LINE_STRIP) {
    //>>includeStart('debug', pragmas.debug);
    assert(defined(indices), "Vector LINE_STRIP primitive must be indexed.");
    //>>includeEnd('debug');

    stats.polylinePrimitiveCount += vector.count;
    stats.polylineVertexCount += indices.length - (vector.count - 1);
  } else if (primitiveType === PrimitiveType.TRIANGLES) {
    //>>includeStart('debug', pragmas.debug);
    assert(defined(indices), "Vector TRIANGLES primitive must be indexed.");
    //>>includeEnd('debug');

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
    throw new RuntimeError(`Unexpected primitive type: ${primitiveType}`);
  }

  return stats;
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
  const vector = primitive.vector;
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
  const vertexCount = collectionPositions.length / 3;

  /** @type {TypedArray} */
  const indices = primitive.indices
    ? ModelReader.readIndicesAsTypedArray(primitive.indices)
    : undefined;

  const featureIdComponent = primitive.featureIds?.[0];
  const hasFeatureIdAttribute =
    featureIdComponent instanceof ModelComponents.FeatureIdAttribute;

  /** @type {TypedArray|undefined} */
  let featureIdArray;
  if (hasFeatureIdAttribute) {
    const featureIdAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.FEATURE_ID,
      featureIdComponent.setIndex,
    );
    featureIdArray =
      featureIdAttribute.typedArray ??
      ModelReader.readAttributeAsTypedArray(featureIdAttribute);
  }

  /**
   * @param {number} vertexOffset
   * @returns {Cesium3DTileVectorFeature|undefined}
   */
  function getFeature(vertexOffset) {
    // getFeature is only called when hasFeatureIdAttribute is true.
    const featureId = featureIdArray[vertexOffset];
    if (featureId === featureIdComponent.nullFeatureId) {
      return undefined;
    }
    let feature = features.get(featureId);
    if (!defined(feature)) {
      feature = new Cesium3DTileVectorFeature(
        content,
        featureId,
        featureIdComponent.propertyTableId,
      );
      features.set(featureId, feature);
    }
    return feature;
  }

  if (collection instanceof BufferPointCollection) {
    for (let i = 0, il = indices ? indices.length : vertexCount; i < il; i++) {
      const vertexOffset = indices ? indices[i] : i;
      Cartesian3.fromArray(
        // @ts-expect-error TODO(tsd-jsdoc): See https://github.com/CesiumGS/cesium/pull/13302.
        collectionPositions,
        vertexOffset * 3,
        scratchPosition,
      );

      const pickObject = hasFeatureIdAttribute
        ? getFeature(vertexOffset)
        : undefined;
      if (defined(pickObject)) {
        pickObject.addPrimitiveByCollection(collectionIndex, i);
        collection.add(
          {
            position: scratchPosition,
            featureId: pickObject.featureId,
            pickObject,
          },
          scratchPoint,
        );
      } else {
        collection.add({ position: scratchPosition }, scratchPoint);
      }
    }
  } else if (collection instanceof BufferPolylineCollection) {
    // @ts-expect-error TODO
    forEachLineStripSegment(indices, (indexOffset, indexCount) => {
      const i = collection.primitiveCount;
      const vertexOffset = indices[indexOffset];
      const positions = collectionPositions.subarray(
        vertexOffset * 3,
        (vertexOffset + indexCount) * 3,
      );

      const pickObject = hasFeatureIdAttribute
        ? getFeature(vertexOffset)
        : undefined;
      if (defined(pickObject)) {
        pickObject.addPrimitiveByCollection(collectionIndex, i);
        collection.add(
          { positions, featureId: pickObject.featureId, pickObject },
          scratchPolyline,
        );
      } else {
        collection.add({ positions }, scratchPolyline);
      }
    });
  } else if (collection instanceof BufferPolygonCollection) {
    const polygonAttributeOffsets = vector.polygonAttributeOffsets;
    const polygonIndicesOffsets = vector.polygonIndicesOffsets;
    const polygonHoleCounts = vector.polygonHoleCounts;
    const polygonHoleOffsets = vector.polygonHoleOffsets;

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
          holes[h] -= polygonVertexStart;
        }
      }

      const triangleIndexStart = polygonIndicesOffsets[i];
      const triangleIndexEnd =
        i + 1 < polygonCount ? polygonIndicesOffsets[i + 1] : indices.length;
      const triangles = indices.slice(triangleIndexStart, triangleIndexEnd);
      for (let t = 0; t < triangles.length; t++) {
        triangles[t] -= polygonVertexStart;
      }

      const pickObject = hasFeatureIdAttribute
        ? getFeature(polygonVertexStart)
        : undefined;
      if (defined(pickObject)) {
        pickObject.addPrimitiveByCollection(collectionIndex, i);
        collection.add(
          {
            positions,
            triangles,
            holes,
            featureId: pickObject.featureId,
            pickObject,
          },
          scratchPolygon,
        );
      } else {
        collection.add({ positions, triangles, holes }, scratchPolygon);
      }
    }
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
    if (!primitive.vector) {
      continue;
    }

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
    } else if (primitiveType === PrimitiveType.TRIANGLES) {
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

export default createVectorTileBuffersFromModelComponents;
