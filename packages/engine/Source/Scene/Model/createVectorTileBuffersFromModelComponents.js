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
import Frozen from "../../Core/Frozen.js";

/** @import { TypedArrayConstructor } from "../../Core/globalTypes.js"; */

const scratchPointPosition = new Cartesian3();
const scratchPointView = new BufferPoint();
const scratchPolylineView = new BufferPolyline();
const scratchPolygonView = new BufferPolygon();

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

  //>>includeStart('debug', pragmas.debug);
  assert(defined(meshVector), "CESIUM_mesh_vector data is required.");
  assert(meshVector.vector === true, "CESIUM_mesh_vector.vector must be true.");
  //>>includeEnd('debug');

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
    stats.pointPrimitiveCount += meshVector.count;
    stats.pointVertexCount += meshVector.count;
    return;
  }

  if (primitiveType === PrimitiveType.LINE_STRIP) {
    const indices = readIndices(primitive);

    //>>includeStart('debug', pragmas.debug);
    assert(
      defined(indices),
      "Vector polylines with LINE_STRIP topology must be indexed.",
    );
    //>>includeEnd('debug');

    stats.polylinePrimitiveCount += meshVector.count;
    stats.polylineVertexCount += indices.length - (meshVector.count - 1);
    return;
  }

  if (primitiveType === PrimitiveType.TRIANGLES) {
    const indices = readIndices(primitive);

    //>>includeStart('debug', pragmas.debug);
    assert(
      defined(indices),
      "Vector polygons with TRIANGLES topology must be indexed.",
    );
    //>>includeEnd('debug');

    const polygonAttributeOffsets = meshVector.polygonAttributeOffsets;
    const polygonIndicesOffsets = meshVector.polygonIndicesOffsets;
    const polygonHoleCounts = meshVector.polygonHoleCounts;

    //>>includeStart('debug', pragmas.debug);
    assert(
      defined(polygonAttributeOffsets) && defined(polygonIndicesOffsets),
      "Vector polygons require polygonAttributeOffsets and polygonIndicesOffsets.",
    );
    //>>includeEnd('debug');

    const polygonCount = polygonAttributeOffsets.length;
    stats.polygonPrimitiveCount += polygonCount;
    stats.polygonVertexCount += positionCount;
    stats.polygonTriangleCount += indices.length / 3;
    if (polygonHoleCounts) {
      for (let i = 0; i < polygonHoleCounts.length; i++) {
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
        scratchPointPosition,
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
  polylineCollection,
  polygonCollection,
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

    const indices = readIndices(primitive);
    for (let i = 0, il = indices ? indices.length : vertexCount; i < il; i++) {
      appendPointPrimitive(
        pointCollection,
        scratchPointView,
        featureIdSource,
        positions,
        indices ? indices[i] : i,
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
      //>>includeStart('debug', pragmas.debug);
      assert(
        segmentCount >= 2,
        "Vector polyline segments must contain at least 2 vertices.",
      );
      //>>includeEnd('debug');

      const segment = indices.subarray(
        segmentStart,
        segmentStart + segmentCount,
      );
      appendPolylinePrimitive(
        polylineCollection,
        scratchPolylineView,
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

    //>>includeStart('debug', pragmas.debug);
    assert(
      defined(polygonAttributeOffsets) && defined(polygonIndicesOffsets),
      "Vector polygons require polygonAttributeOffsets and polygonIndicesOffsets.",
    );
    //>>includeEnd('debug');

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

      const triangleIndexOffset = polygonIndicesOffsets[i];
      const triangleIndexCount =
        i + 1 < polygonCount
          ? polygonIndicesOffsets[i + 1] - triangleIndexOffset
          : indices.length - triangleIndexOffset;
      let triangleIndices;
      if (triangleIndexCount > 0) {
        const IndexArray = /** @type {TypedArrayConstructor} */ (
          indices.constructor
        );
        triangleIndices = new IndexArray(triangleIndexCount);
        for (let t = 0; t < triangleIndexCount; t++) {
          triangleIndices[t] =
            indices[triangleIndexOffset + t] - polygonVertexOffset;
        }
      }

      appendPolygonPrimitive(
        polygonCollection,
        scratchPolygonView,
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
  options,
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

    if (stats.pointPrimitiveCount > 0) {
      collection = new BufferPointCollection({
        primitiveCountMax: stats.pointPrimitiveCount,
        vertexCountMax: stats.pointVertexCount,
        heightReference: options.heightReference,
      });
      points.push(collection);
    } else if (stats.polylinePrimitiveCount > 0) {
      collection = new BufferPolylineCollection({
        primitiveCountMax: stats.polylinePrimitiveCount,
        vertexCountMax: stats.polylineVertexCount,
        heightReference: options.heightReference,
      });
      polylines.push(collection);
    } else if (stats.polygonPrimitiveCount > 0) {
      collection = new BufferPolygonCollection({
        primitiveCountMax: stats.polygonPrimitiveCount,
        vertexCountMax: stats.polygonVertexCount,
        holeCountMax: stats.polygonHoleCount,
        triangleCountMax: stats.polygonTriangleCount,
        heightReference: options.heightReference,
      });
      polygons.push(collection);
    }

    if (!defined(collection)) {
      continue;
    }

    collection._vectorLocalModelMatrix = Matrix4.clone(nodeTransform);
    appendPrimitiveToBuffers(
      primitive,
      stats.pointPrimitiveCount > 0 ? collection : undefined,
      stats.polylinePrimitiveCount > 0 ? collection : undefined,
      stats.polygonPrimitiveCount > 0 ? collection : undefined,
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
      options,
    );
  }
}

/**
 * @typedef {object} VectorTileBuffers
 * @property {BufferPointCollection[]} points
 * @property {BufferPolylineCollection[]} polylines
 * @property {BufferPolygonCollection[]} polygons
 */

/**
 * Creates vector buffers from model components.
 *
 * @param {ModelComponents.Components} components
 * @param {object} [options]
 * @param {number} [options.heightReference]
 * @returns {VectorTileBuffers|undefined}
 *
 * @private
 */
function createVectorTileBuffersFromModelComponents(
  components,
  options = Frozen.EMPTY_OBJECT,
) {
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
      options,
    );
  }

  if (points.length === 0 && polylines.length === 0 && polygons.length === 0) {
    return undefined;
  }

  return {
    points: points,
    polylines: polylines,
    polygons: polygons,
  };
}

export default createVectorTileBuffersFromModelComponents;
