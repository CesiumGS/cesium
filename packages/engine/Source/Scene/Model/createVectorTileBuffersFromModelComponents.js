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

function getTriangleCount(primitiveType, indexCount) {
  if (primitiveType === PrimitiveType.TRIANGLES) {
    return Math.floor(indexCount / 3);
  }
  if (
    primitiveType === PrimitiveType.TRIANGLE_STRIP ||
    primitiveType === PrimitiveType.TRIANGLE_FAN
  ) {
    return Math.max(indexCount - 2, 0);
  }
  return 0;
}

function gatherPrimitiveStats(primitive, stats) {
  const primitiveType = primitive.primitiveType;
  const positionCount = getPositionCount(primitive);
  if (positionCount === 0) {
    return;
  }

  const indexCount = defined(primitive.indices)
    ? primitive.indices.count
    : positionCount;

  if (primitiveType === PrimitiveType.POINTS) {
    stats.pointPrimitiveCount += indexCount;
    stats.pointVertexCount += indexCount;
    return;
  }

  if (PrimitiveType.isLines(primitiveType)) {
    if (primitiveType === PrimitiveType.LINES) {
      const lineCount = Math.floor(indexCount / 2);
      stats.polylinePrimitiveCount += lineCount;
      stats.polylineVertexCount += lineCount * 2;
    } else if (primitiveType === PrimitiveType.LINE_STRIP) {
      if (indexCount >= 2) {
        stats.polylinePrimitiveCount += 1;
        stats.polylineVertexCount += indexCount;
      }
    } else if (primitiveType === PrimitiveType.LINE_LOOP) {
      if (indexCount >= 2) {
        stats.polylinePrimitiveCount += 1;
        stats.polylineVertexCount += indexCount + 1;
      }
    }
    return;
  }

  if (PrimitiveType.isTriangles(primitiveType)) {
    const triangleCount = getTriangleCount(primitiveType, indexCount);
    if (triangleCount > 0) {
      stats.polygonPrimitiveCount += 1;
      stats.polygonVertexCount += positionCount;
      stats.polygonTriangleCount += triangleCount;
    }
  }
}

function gatherNodeStats(node, stats) {
  const primitives = node.primitives;
  for (let i = 0; i < primitives.length; i++) {
    gatherPrimitiveStats(primitives[i], stats);
  }

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    gatherNodeStats(children[i], stats);
  }
}

function readTransformedPositions(primitive, nodeTransform) {
  const positionAttribute = getPositionAttribute(primitive);
  const values = readAttributeTypedArray(positionAttribute);
  if (!defined(values) || values.length === 0) {
    return undefined;
  }

  const transformed = Matrix4.equals(nodeTransform, Matrix4.IDENTITY)
    ? values
    : ModelReader.transform3D(values, nodeTransform);

  const result = new Float64Array(transformed.length);
  for (let i = 0; i < transformed.length; i++) {
    result[i] = transformed[i];
  }
  return result;
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

  const values = new Float64Array(indices.length * 3);
  for (let i = 0; i < indices.length; i++) {
    const vertexIndex = indices[i];
    const srcOffset = vertexIndex * 3;
    values[i * 3] = positions[srcOffset];
    values[i * 3 + 1] = positions[srcOffset + 1];
    values[i * 3 + 2] = positions[srcOffset + 2];
  }

  polylineCollection.add({ positions: values }, polylineView);
  setPrimitiveFeatureId(polylineView, featureIdSource, indices[0]);
}

function appendPolygonPrimitive(
  polygonCollection,
  polygonView,
  featureIdSource,
  primitiveType,
  positions,
  indices,
) {
  if (
    primitiveType === PrimitiveType.TRIANGLE_STRIP ||
    primitiveType === PrimitiveType.TRIANGLE_FAN
  ) {
    throw new RuntimeError(
      "Vector polygons with TRIANGLE_STRIP or TRIANGLE_FAN topology are not supported.",
    );
  }
  const triangleIndices = indices;

  if (!defined(triangleIndices) || triangleIndices.length < 3) {
    return;
  }

  polygonCollection.add(
    {
      positions: positions,
      triangles: triangleIndices,
    },
    polygonView,
  );
  setPrimitiveFeatureId(polygonView, featureIdSource, triangleIndices[0]);
}

function appendPrimitiveToBuffers(
  primitive,
  nodeTransform,
  pointCollection,
  pointView,
  polylineCollection,
  polylineView,
  polygonCollection,
  polygonView,
) {
  const primitiveType = primitive.primitiveType;
  const positions = readTransformedPositions(primitive, nodeTransform);
  if (!defined(positions)) {
    return;
  }

  const vertexCount = positions.length / 3;
  const indices = readIndicesOrSequential(primitive, vertexCount);
  if (!defined(indices)) {
    return;
  }

  const featureIdSource = getFeatureIdSource(primitive);

  if (primitiveType === PrimitiveType.POINTS) {
    if (!defined(pointCollection)) {
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

  if (PrimitiveType.isLines(primitiveType)) {
    if (!defined(polylineCollection)) {
      return;
    }

    if (primitiveType === PrimitiveType.LINES) {
      for (let i = 0; i + 1 < indices.length; i += 2) {
        appendPolylinePrimitive(
          polylineCollection,
          polylineView,
          featureIdSource,
          positions,
          [indices[i], indices[i + 1]],
        );
      }
    } else if (primitiveType === PrimitiveType.LINE_STRIP) {
      appendPolylinePrimitive(
        polylineCollection,
        polylineView,
        featureIdSource,
        positions,
        indices,
      );
    } else if (primitiveType === PrimitiveType.LINE_LOOP) {
      const loopIndices = new Uint32Array(indices.length + 1);
      for (let i = 0; i < indices.length; i++) {
        loopIndices[i] = indices[i];
      }
      loopIndices[indices.length] = indices[0];
      appendPolylinePrimitive(
        polylineCollection,
        polylineView,
        featureIdSource,
        positions,
        loopIndices,
      );
    } else {
      throw new RuntimeError(
        `Vector polylines with primitive type ${primitiveType} are not supported.`,
      );
    }
    return;
  }

  if (
    primitiveType === PrimitiveType.TRIANGLE_STRIP ||
    primitiveType === PrimitiveType.TRIANGLE_FAN
  ) {
    throw new RuntimeError(
      "Vector polygons with TRIANGLE_STRIP or TRIANGLE_FAN topology are not supported.",
    );
  }

  if (PrimitiveType.isTriangles(primitiveType)) {
    if (!defined(polygonCollection)) {
      return;
    }

    appendPolygonPrimitive(
      polygonCollection,
      polygonView,
      featureIdSource,
      primitiveType,
      positions,
      indices,
    );
    return;
  }

  throw new RuntimeError(
    `Vector primitives with primitive type ${primitiveType} are not supported.`,
  );
}

function appendNodeToBuffers(
  node,
  parentTransform,
  pointCollection,
  pointView,
  polylineCollection,
  polylineView,
  polygonCollection,
  polygonView,
) {
  const localTransform = ModelUtility.getNodeTransform(node);
  const nodeTransform = Matrix4.multiplyTransformation(
    parentTransform,
    localTransform,
    new Matrix4(),
  );

  const primitives = node.primitives;
  for (let i = 0; i < primitives.length; i++) {
    appendPrimitiveToBuffers(
      primitives[i],
      nodeTransform,
      pointCollection,
      pointView,
      polylineCollection,
      polylineView,
      polygonCollection,
      polygonView,
    );
  }

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    appendNodeToBuffers(
      children[i],
      nodeTransform,
      pointCollection,
      pointView,
      polylineCollection,
      polylineView,
      polygonCollection,
      polygonView,
    );
  }
}

/**
 * @typedef {object} VectorTileBuffers
 * @property {BufferPointCollection|undefined} points
 * @property {BufferPolylineCollection|undefined} polylines
 * @property {BufferPolygonCollection|undefined} polygons
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

  const stats = {
    pointPrimitiveCount: 0,
    pointVertexCount: 0,
    polylinePrimitiveCount: 0,
    polylineVertexCount: 0,
    polygonPrimitiveCount: 0,
    polygonVertexCount: 0,
    polygonTriangleCount: 0,
  };

  const rootNodes = components.scene.nodes;
  for (let i = 0; i < rootNodes.length; i++) {
    gatherNodeStats(rootNodes[i], stats);
  }

  const points =
    stats.pointPrimitiveCount > 0
      ? new BufferPointCollection({
          primitiveCountMax: stats.pointPrimitiveCount,
          vertexCountMax: stats.pointVertexCount,
        })
      : undefined;
  const polylines =
    stats.polylinePrimitiveCount > 0
      ? new BufferPolylineCollection({
          primitiveCountMax: stats.polylinePrimitiveCount,
          vertexCountMax: stats.polylineVertexCount,
        })
      : undefined;
  const polygons =
    stats.polygonPrimitiveCount > 0
      ? new BufferPolygonCollection({
          primitiveCountMax: stats.polygonPrimitiveCount,
          vertexCountMax: stats.polygonVertexCount,
          holeCountMax: 0,
          triangleCountMax: stats.polygonTriangleCount,
        })
      : undefined;

  const pointView = defined(points) ? new BufferPoint() : undefined;
  const polylineView = defined(polylines) ? new BufferPolyline() : undefined;
  const polygonView = defined(polygons) ? new BufferPolygon() : undefined;

  for (let i = 0; i < rootNodes.length; i++) {
    appendNodeToBuffers(
      rootNodes[i],
      Matrix4.IDENTITY,
      points,
      pointView,
      polylines,
      polylineView,
      polygons,
      polygonView,
    );
  }

  if (!defined(points) && !defined(polylines) && !defined(polygons)) {
    return undefined;
  }

  return {
    points: points,
    polylines: polylines,
    polygons: polygons,
  };
}

export default createVectorTileBuffersFromModelComponents;
