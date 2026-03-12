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

/** @import { TypedArrayConstructor } from "../../Core/globalTypes.js"; */

function getPositionAttribute(primitive) {
  return ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );
}

function getPositionCount(primitive) {
  const attribute = getPositionAttribute(primitive);
  return defined(attribute) ? attribute.count : 0;
}

function readAttributeTypedArray(attribute) {
  if (!defined(attribute)) {
    return undefined;
  }
  if (defined(attribute.typedArray)) {
    return attribute.typedArray;
  }
  if (defined(attribute.buffer)) {
    return ModelReader.readAttributeAsTypedArray(attribute);
  }
  return undefined;
}

function readIndicesOrSequential(primitive, vertexCount) {
  const indices = primitive.indices;
  if (!defined(indices)) {
    const result = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      result[i] = i;
    }
    return result;
  }
  if (defined(indices.typedArray)) {
    return indices.typedArray;
  }
  if (defined(indices.buffer)) {
    return ModelReader.readIndicesAsTypedArray(indices);
  }
  return undefined;
}

function readIndices(primitive) {
  const indices = primitive.indices;
  if (!defined(indices)) {
    return undefined;
  }
  if (defined(indices.typedArray)) {
    return indices.typedArray;
  }
  if (defined(indices.buffer)) {
    return ModelReader.readIndicesAsTypedArray(indices);
  }
  return undefined;
}

function getMeshVectorExtension(primitive) {
  const meshVector = primitive.meshVector;
  if (!defined(meshVector)) {
    return undefined;
  }
  if (meshVector.vector === false) {
    return undefined;
  }
  return meshVector;
}

function getPrimitiveRestartIndex(indices) {
  const bits = indices.BYTES_PER_ELEMENT * 8;
  return Math.pow(2, bits) - 1;
}

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

function isSequentialIndices(indices, start, count) {
  if (count <= 1) {
    return true;
  }
  const first = indices[start];
  for (let i = 1; i < count; i++) {
    if (indices[start + i] !== first + i) {
      return false;
    }
  }
  return true;
}

function getFeatureIdSource(primitive) {
  if (!defined(primitive.featureIds) || primitive.featureIds.length === 0) {
    return undefined;
  }

  const featureIdSet = primitive.featureIds[0];
  if (defined(featureIdSet.setIndex)) {
    const featureIdAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.FEATURE_ID,
      featureIdSet.setIndex,
    );
    const featureIds = readAttributeTypedArray(featureIdAttribute);
    if (!defined(featureIds)) {
      return undefined;
    }
    return {
      values: featureIds,
      nullFeatureId: featureIdSet.nullFeatureId,
    };
  }

  if (defined(featureIdSet.offset) || defined(featureIdSet.repeat)) {
    return {
      offset: featureIdSet.offset ?? 0,
      repeat: featureIdSet.repeat ?? 1,
      nullFeatureId: featureIdSet.nullFeatureId,
    };
  }

  return undefined;
}

function getFeatureId(featureIdSource, vertexIndex) {
  if (!defined(featureIdSource)) {
    return undefined;
  }

  let featureId;
  if (defined(featureIdSource.values)) {
    if (vertexIndex < 0 || vertexIndex >= featureIdSource.values.length) {
      return undefined;
    }
    featureId = featureIdSource.values[vertexIndex];
  } else {
    featureId =
      Math.floor(vertexIndex / featureIdSource.repeat) + featureIdSource.offset;
  }

  featureId = Math.trunc(featureId);
  if (
    defined(featureIdSource.nullFeatureId) &&
    featureId === featureIdSource.nullFeatureId
  ) {
    return undefined;
  }
  return featureId;
}

function gatherPrimitiveStats(primitive, stats) {
  const meshVector = getMeshVectorExtension(primitive);
  if (!defined(meshVector)) {
    return;
  }

  const primitiveType = primitive.primitiveType;
  const positionCount = getPositionCount(primitive);
  if (positionCount === 0) {
    return;
  }

  if (primitiveType === PrimitiveType.POINTS) {
    const indexCount = defined(primitive.indices)
      ? primitive.indices.count
      : positionCount;
    stats.pointPrimitiveCount += indexCount;
    stats.pointVertexCount += indexCount;
    return;
  }

  if (primitiveType === PrimitiveType.LINE_STRIP) {
    const indices = readIndices(primitive);
    if (!defined(indices)) {
      throw new RuntimeError(
        "Vector polylines with LINE_STRIP topology must be indexed.",
      );
    }
    forEachLineStripSegment(indices, (segmentStart, segmentCount) => {
      if (segmentCount >= 2) {
        stats.polylinePrimitiveCount += 1;
        stats.polylineVertexCount += segmentCount;
      }
    });
    return;
  }

  if (primitiveType === PrimitiveType.TRIANGLES) {
    const indices = readIndices(primitive);
    if (!defined(indices)) {
      throw new RuntimeError(
        "Vector polygons with TRIANGLES topology must be indexed.",
      );
    }

    const polygonAttributeOffsets = meshVector.polygonAttributeOffsets;
    const polygonIndicesOffsets = meshVector.polygonIndicesOffsets;
    const polygonHoleCounts = meshVector.polygonHoleCounts;
    if (!defined(polygonAttributeOffsets) || !defined(polygonIndicesOffsets)) {
      throw new RuntimeError(
        "Vector polygons require polygonAttributeOffsets and polygonIndicesOffsets.",
      );
    }

    const polygonCount = polygonAttributeOffsets.length;
    stats.polygonPrimitiveCount += polygonCount;
    for (let i = 0; i < polygonCount; i++) {
      const start = polygonAttributeOffsets[i];
      const end =
        i + 1 < polygonCount ? polygonAttributeOffsets[i + 1] : positionCount;
      const polygonIndicesCount =
        i + 1 < polygonCount
          ? polygonIndicesOffsets[i + 1] - polygonIndicesOffsets[i]
          : indices.length - polygonIndicesOffsets[i];
      stats.polygonVertexCount += Math.max(end - start, 0);
      stats.polygonTriangleCount += polygonIndicesCount / 3;
      if (polygonHoleCounts) {
        stats.polygonHoleCount += polygonHoleCounts[i];
      }
    }
    return;
  }

  throw new RuntimeError(
    `Vector primitives with primitive type ${primitiveType} are not supported.`,
  );
}

function createStats() {
  return {
    pointPrimitiveCount: 0,
    pointVertexCount: 0,
    polylinePrimitiveCount: 0,
    polylineVertexCount: 0,
    polygonPrimitiveCount: 0,
    polygonVertexCount: 0,
    polygonHoleCount: 0,
    polygonTriangleCount: 0,
  };
}

function readPositions(primitive) {
  const positionAttribute = getPositionAttribute(primitive);
  const values = readAttributeTypedArray(positionAttribute);
  if (!defined(values) || values.length === 0) {
    return undefined;
  }
  return values;
}

function setPrimitiveFeatureId(primitiveView, featureIdSource, vertexIndex) {
  const featureId = getFeatureId(featureIdSource, vertexIndex);
  if (defined(featureId)) {
    primitiveView.featureId = featureId;
  }
}

function appendPointPrimitive(
  pointCollection,
  pointView,
  featureIdSource,
  positions,
  vertexIndex,
) {
  const offset = vertexIndex * 3;
  pointCollection.add(
    {
      position: Cartesian3.fromElements(
        positions[offset],
        positions[offset + 1],
        positions[offset + 2],
      ),
    },
    pointView,
  );
  setPrimitiveFeatureId(pointView, featureIdSource, vertexIndex);
}

function appendPolylinePrimitive(
  polylineCollection,
  polylineView,
  featureIdSource,
  positions,
  indices,
) {
  if (indices.length < 2) {
    return;
  }

  let values;
  if (isSequentialIndices(indices, 0, indices.length)) {
    const startIndex = indices[0];
    const endIndex = startIndex + indices.length;
    values = positions.subarray(startIndex * 3, endIndex * 3);
  } else {
    const TypedArray = /** @type {TypedArrayConstructor} */ (
      positions.constructor
    );
    values = new TypedArray(indices.length * 3);
    for (let i = 0; i < indices.length; i++) {
      const vertexIndex = indices[i];
      const srcOffset = vertexIndex * 3;
      values[i * 3] = positions[srcOffset];
      values[i * 3 + 1] = positions[srcOffset + 1];
      values[i * 3 + 2] = positions[srcOffset + 2];
    }
  }

  polylineCollection.add({ positions: values }, polylineView);
  setPrimitiveFeatureId(polylineView, featureIdSource, indices[0]);
}

function appendPolygonPrimitive(
  polygonCollection,
  polygonView,
  featureIdSource,
  positions,
  triangles,
  holes,
  featureIdVertexIndex,
) {
  if (!defined(triangles) || triangles.length < 3) {
    return;
  }

  const options = {
    positions: positions,
    triangles: triangles,
  };
  if (defined(holes) && holes.length > 0) {
    options.holes = holes;
  }

  polygonCollection.add(options, polygonView);
  setPrimitiveFeatureId(polygonView, featureIdSource, featureIdVertexIndex);
}

function appendPrimitiveToBuffers(
  primitive,
  pointCollection,
  pointView,
  polylineCollection,
  polylineView,
  polygonCollection,
  polygonView,
) {
  const meshVector = getMeshVectorExtension(primitive);
  if (!defined(meshVector)) {
    return;
  }

  const primitiveType = primitive.primitiveType;
  const positions = readPositions(primitive);
  if (!defined(positions)) {
    return;
  }

  const vertexCount = positions.length / 3;
  const featureIdSource = getFeatureIdSource(primitive);

  if (primitiveType === PrimitiveType.POINTS) {
    if (!defined(pointCollection)) {
      return;
    }

    const indices = readIndicesOrSequential(primitive, vertexCount);
    if (!defined(indices)) {
      return;
    }

    for (let i = 0; i < indices.length; i++) {
      appendPointPrimitive(
        pointCollection,
        pointView,
        featureIdSource,
        positions,
        indices[i],
      );
    }
    return;
  }

  if (primitiveType === PrimitiveType.LINE_STRIP) {
    if (!defined(polylineCollection)) {
      return;
    }

    const indices = readIndices(primitive);
    if (!defined(indices)) {
      throw new RuntimeError(
        "Vector polylines with LINE_STRIP topology must be indexed.",
      );
    }

    forEachLineStripSegment(indices, (segmentStart, segmentCount) => {
      if (segmentCount < 2) {
        return;
      }
      const segment = indices.subarray(
        segmentStart,
        segmentStart + segmentCount,
      );
      appendPolylinePrimitive(
        polylineCollection,
        polylineView,
        featureIdSource,
        positions,
        segment,
      );
    });
    return;
  }

  if (primitiveType === PrimitiveType.TRIANGLES) {
    if (!defined(polygonCollection)) {
      return;
    }

    const indices = readIndices(primitive);
    if (!defined(indices)) {
      throw new RuntimeError(
        "Vector polygons with TRIANGLES topology must be indexed.",
      );
    }

    const polygonAttributeOffsets = meshVector.polygonAttributeOffsets;
    const polygonIndicesOffsets = meshVector.polygonIndicesOffsets;
    const polygonHoleCounts = meshVector.polygonHoleCounts;
    const polygonHoleOffsets = meshVector.polygonHoleOffsets;
    if (!defined(polygonAttributeOffsets) || !defined(polygonIndicesOffsets)) {
      throw new RuntimeError(
        "Vector polygons require polygonAttributeOffsets and polygonIndicesOffsets.",
      );
    }

    const hasHoles = defined(polygonHoleCounts) && defined(polygonHoleOffsets);
    let holes;

    let holeOffsetIndex = 0;
    const polygonCount = polygonAttributeOffsets.length;
    for (let i = 0; i < polygonCount; i++) {
      const polygonVertexOffset = polygonAttributeOffsets[i];
      const polygonVertexEnd =
        i + 1 < polygonCount ? polygonAttributeOffsets[i + 1] : vertexCount;
      const polygonVertexCount = Math.max(
        polygonVertexEnd - polygonVertexOffset,
        0,
      );
      if (polygonVertexCount === 0) {
        continue;
      }

      const polygonPositions = positions.subarray(
        polygonVertexOffset * 3,
        polygonVertexEnd * 3,
      );

      if (hasHoles) {
        const holeCount = polygonHoleCounts[i];
        if (holeCount > 0) {
          const HoleArray = /** @type {TypedArrayConstructor} */ (
            polygonHoleOffsets.constructor
          );
          holes = new HoleArray(holeCount);
          for (let h = 0; h < holeCount; h++) {
            holes[h] =
              polygonHoleOffsets[holeOffsetIndex + h] - polygonVertexOffset;
          }
        }
        holeOffsetIndex += holeCount;
      }

      // TODO(donmccurdy)

      const triangleIndexOffset = polygonIndicesOffsets[i];
      const triangleIndexCount =
        i + 1 < polygonCount
          ? polygonIndicesOffsets[i + 1] - triangleIndexOffset
          : indices.length - triangleIndexOffset;
      let triangleIndices;
      if (triangleIndexCount > 0) {
        if (polygonVertexOffset === 0) {
          triangleIndices = indices.subarray(
            triangleIndexOffset,
            triangleIndexOffset + triangleIndexCount,
          );
        } else {
          const IndexArray = /** @type {TypedArrayConstructor} */ (
            indices.constructor
          );
          triangleIndices = new IndexArray(triangleIndexCount);
          for (let t = 0; t < triangleIndexCount; t++) {
            triangleIndices[t] =
              indices[triangleIndexOffset + t] - polygonVertexOffset;
          }
        }
      }

      appendPolygonPrimitive(
        polygonCollection,
        polygonView,
        featureIdSource,
        polygonPositions,
        triangleIndices,
        holes,
        polygonVertexOffset,
      );
    }
    return;
  }

  throw new RuntimeError(
    `Vector primitives with primitive type ${primitiveType} are not supported.`,
  );
}

function appendNodeToBuffers(
  node,
  parentTransform,
  points,
  polylines,
  polygons,
) {
  const localTransform = ModelUtility.getNodeTransform(node);
  const nodeTransform = Matrix4.multiplyTransformation(
    parentTransform,
    localTransform,
    new Matrix4(),
  );

  const primitives = node.primitives;
  for (let i = 0; i < primitives.length; i++) {
    const primitive = primitives[i];
    const stats = createStats();
    gatherPrimitiveStats(primitive, stats);

    let collection;
    let pointView;
    let polylineView;
    let polygonView;

    if (stats.pointPrimitiveCount > 0) {
      collection = new BufferPointCollection({
        primitiveCountMax: stats.pointPrimitiveCount,
        vertexCountMax: stats.pointVertexCount,
      });
      pointView = new BufferPoint();
      points.push(collection);
    } else if (stats.polylinePrimitiveCount > 0) {
      collection = new BufferPolylineCollection({
        primitiveCountMax: stats.polylinePrimitiveCount,
        vertexCountMax: stats.polylineVertexCount,
      });
      polylineView = new BufferPolyline();
      polylines.push(collection);
    } else if (stats.polygonPrimitiveCount > 0) {
      collection = new BufferPolygonCollection({
        primitiveCountMax: stats.polygonPrimitiveCount,
        vertexCountMax: stats.polygonVertexCount,
        holeCountMax: stats.polygonHoleCount,
        triangleCountMax: stats.polygonTriangleCount,
      });
      polygonView = new BufferPolygon();
      polygons.push(collection);
    }

    if (!defined(collection)) {
      continue;
    }

    collection._vectorLocalModelMatrix = Matrix4.clone(nodeTransform);
    appendPrimitiveToBuffers(
      primitive,
      pointView ? collection : undefined,
      pointView,
      polylineView ? collection : undefined,
      polylineView,
      polygonView ? collection : undefined,
      polygonView,
    );
  }

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    appendNodeToBuffers(
      children[i],
      nodeTransform,
      points,
      polylines,
      polygons,
    );
  }
}

/**
 * @typedef {object} VectorTileBuffers
 * @property {BufferPointCollection[]|undefined} points
 * @property {BufferPolylineCollection[]|undefined} polylines
 * @property {BufferPolygonCollection[]|undefined} polygons
 */

/**
 * Creates vector buffers from model components.
 *
 * @param {ModelComponents.Components} components
 * @returns {VectorTileBuffers|undefined}
 *
 * @private
 */
function createVectorTileBuffersFromModelComponents(components) {
  if (!defined(components) || !defined(components.scene)) {
    return undefined;
  }

  const rootNodes = components.scene.nodes;
  const points = [];
  const polylines = [];
  const polygons = [];

  for (let i = 0; i < rootNodes.length; i++) {
    appendNodeToBuffers(
      rootNodes[i],
      Matrix4.IDENTITY,
      points,
      polylines,
      polygons,
    );
  }

  if (points.length === 0 && polylines.length === 0 && polygons.length === 0) {
    return undefined;
  }

  return {
    points: points.length > 0 ? points : undefined,
    polylines: polylines.length > 0 ? polylines : undefined,
    polygons: polygons.length > 0 ? polygons : undefined,
  };
}

export default createVectorTileBuffersFromModelComponents;
