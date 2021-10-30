import BoundingSphere from "../Core/BoundingSphere.js";
import BoxGeometry from "../Core/BoxGeometry.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import CylinderGeometry from "../Core/CylinderGeometry.js";
import defined from "../Core/defined.js";
import EllipsoidGeometry from "../Core/EllipsoidGeometry.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Matrix4 from "../Core/Matrix4.js";
import Vector3DTileBatch from "../Scene/Vector3DTileBatch.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

var scratchCartesian = new Cartesian3();

var packedBoxLength = Matrix4.packedLength + Cartesian3.packedLength;
var packedCylinderLength = Matrix4.packedLength + 2;
var packedEllipsoidLength = Matrix4.packedLength + Cartesian3.packedLength;
var packedSphereLength = Cartesian3.packedLength + 1;

var scratchModelMatrixAndBV = {
  modelMatrix: new Matrix4(),
  boundingVolume: new BoundingSphere(),
};

function boxModelMatrixAndBoundingVolume(boxes, index) {
  var boxIndex = index * packedBoxLength;

  var dimensions = Cartesian3.unpack(boxes, boxIndex, scratchCartesian);
  boxIndex += Cartesian3.packedLength;

  var boxModelMatrix = Matrix4.unpack(
    boxes,
    boxIndex,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4.multiplyByScale(boxModelMatrix, dimensions, boxModelMatrix);

  var boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3.clone(Cartesian3.ZERO, boundingVolume.center);
  boundingVolume.radius = Math.sqrt(3.0);

  return scratchModelMatrixAndBV;
}

function cylinderModelMatrixAndBoundingVolume(cylinders, index) {
  var cylinderIndex = index * packedCylinderLength;

  var cylinderRadius = cylinders[cylinderIndex++];
  var length = cylinders[cylinderIndex++];
  var scale = Cartesian3.fromElements(
    cylinderRadius,
    cylinderRadius,
    length,
    scratchCartesian
  );

  var cylinderModelMatrix = Matrix4.unpack(
    cylinders,
    cylinderIndex,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4.multiplyByScale(cylinderModelMatrix, scale, cylinderModelMatrix);

  var boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3.clone(Cartesian3.ZERO, boundingVolume.center);
  boundingVolume.radius = Math.sqrt(2.0);

  return scratchModelMatrixAndBV;
}

function ellipsoidModelMatrixAndBoundingVolume(ellipsoids, index) {
  var ellipsoidIndex = index * packedEllipsoidLength;

  var radii = Cartesian3.unpack(ellipsoids, ellipsoidIndex, scratchCartesian);
  ellipsoidIndex += Cartesian3.packedLength;

  var ellipsoidModelMatrix = Matrix4.unpack(
    ellipsoids,
    ellipsoidIndex,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4.multiplyByScale(ellipsoidModelMatrix, radii, ellipsoidModelMatrix);

  var boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3.clone(Cartesian3.ZERO, boundingVolume.center);
  boundingVolume.radius = 1.0;

  return scratchModelMatrixAndBV;
}

function sphereModelMatrixAndBoundingVolume(spheres, index) {
  var sphereIndex = index * packedSphereLength;

  var sphereRadius = spheres[sphereIndex++];

  var sphereTranslation = Cartesian3.unpack(
    spheres,
    sphereIndex,
    scratchCartesian
  );
  var sphereModelMatrix = Matrix4.fromTranslation(
    sphereTranslation,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4.multiplyByUniformScale(
    sphereModelMatrix,
    sphereRadius,
    sphereModelMatrix
  );

  var boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3.clone(Cartesian3.ZERO, boundingVolume.center);
  boundingVolume.radius = 1.0;

  return scratchModelMatrixAndBV;
}

var scratchPosition = new Cartesian3();

function createPrimitive(
  options,
  primitive,
  primitiveBatchIds,
  geometry,
  getModelMatrixAndBoundingVolume
) {
  if (!defined(primitive)) {
    return;
  }

  var numberOfPrimitives = primitiveBatchIds.length;
  var geometryPositions = geometry.attributes.position.values;
  var geometryIndices = geometry.indices;

  var positions = options.positions;
  var vertexBatchIds = options.vertexBatchIds;
  var indices = options.indices;

  var batchIds = options.batchIds;
  var batchTableColors = options.batchTableColors;
  var batchedIndices = options.batchedIndices;
  var indexOffsets = options.indexOffsets;
  var indexCounts = options.indexCounts;
  var boundingVolumes = options.boundingVolumes;

  var modelMatrix = options.modelMatrix;
  var center = options.center;

  var positionOffset = options.positionOffset;
  var batchIdIndex = options.batchIdIndex;
  var indexOffset = options.indexOffset;
  var batchedIndicesOffset = options.batchedIndicesOffset;

  for (var i = 0; i < numberOfPrimitives; ++i) {
    var primitiveModelMatrixAndBV = getModelMatrixAndBoundingVolume(
      primitive,
      i
    );
    var primitiveModelMatrix = primitiveModelMatrixAndBV.modelMatrix;
    Matrix4.multiply(modelMatrix, primitiveModelMatrix, primitiveModelMatrix);

    var batchId = primitiveBatchIds[i];

    var positionsLength = geometryPositions.length;
    for (var j = 0; j < positionsLength; j += 3) {
      var position = Cartesian3.unpack(geometryPositions, j, scratchPosition);
      Matrix4.multiplyByPoint(primitiveModelMatrix, position, position);
      Cartesian3.subtract(position, center, position);

      Cartesian3.pack(position, positions, positionOffset * 3 + j);
      vertexBatchIds[batchIdIndex++] = batchId;
    }

    var indicesLength = geometryIndices.length;
    for (var k = 0; k < indicesLength; ++k) {
      indices[indexOffset + k] = geometryIndices[k] + positionOffset;
    }

    var offset = i + batchedIndicesOffset;
    batchedIndices[offset] = new Vector3DTileBatch({
      offset: indexOffset,
      count: indicesLength,
      color: Color.fromRgba(batchTableColors[batchId]),
      batchIds: [batchId],
    });
    batchIds[offset] = batchId;
    indexOffsets[offset] = indexOffset;
    indexCounts[offset] = indicesLength;
    boundingVolumes[offset] = BoundingSphere.transform(
      primitiveModelMatrixAndBV.boundingVolume,
      primitiveModelMatrix
    );

    positionOffset += positionsLength / 3;
    indexOffset += indicesLength;
  }

  options.positionOffset = positionOffset;
  options.batchIdIndex = batchIdIndex;
  options.indexOffset = indexOffset;
  options.batchedIndicesOffset += numberOfPrimitives;
}

var scratchCenter = new Cartesian3();
var scratchMatrix4 = new Matrix4();

function unpackBuffer(buffer) {
  var packedBuffer = new Float64Array(buffer);

  var offset = 0;
  Cartesian3.unpack(packedBuffer, offset, scratchCenter);
  offset += Cartesian3.packedLength;

  Matrix4.unpack(packedBuffer, offset, scratchMatrix4);
}

function packedBatchedIndicesLength(batchedIndices) {
  var length = batchedIndices.length;
  var count = 0;
  for (var i = 0; i < length; ++i) {
    count += Color.packedLength + 3 + batchedIndices[i].batchIds.length;
  }
  return count;
}

function packBuffer(indicesBytesPerElement, batchedIndices, boundingVolumes) {
  var numBVs = boundingVolumes.length;
  var length =
    1 +
    1 +
    numBVs * BoundingSphere.packedLength +
    1 +
    packedBatchedIndicesLength(batchedIndices);

  var packedBuffer = new Float64Array(length);

  var offset = 0;
  packedBuffer[offset++] = indicesBytesPerElement;
  packedBuffer[offset++] = numBVs;

  for (var i = 0; i < numBVs; ++i) {
    BoundingSphere.pack(boundingVolumes[i], packedBuffer, offset);
    offset += BoundingSphere.packedLength;
  }

  var indicesLength = batchedIndices.length;
  packedBuffer[offset++] = indicesLength;

  for (var j = 0; j < indicesLength; ++j) {
    var batchedIndex = batchedIndices[j];

    Color.pack(batchedIndex.color, packedBuffer, offset);
    offset += Color.packedLength;

    packedBuffer[offset++] = batchedIndex.offset;
    packedBuffer[offset++] = batchedIndex.count;

    var batchIds = batchedIndex.batchIds;
    var batchIdsLength = batchIds.length;
    packedBuffer[offset++] = batchIdsLength;

    for (var k = 0; k < batchIdsLength; ++k) {
      packedBuffer[offset++] = batchIds[k];
    }
  }

  return packedBuffer;
}

function createVectorTileGeometries(parameters, transferableObjects) {
  var boxes = defined(parameters.boxes)
    ? new Float32Array(parameters.boxes)
    : undefined;
  var boxBatchIds = defined(parameters.boxBatchIds)
    ? new Uint16Array(parameters.boxBatchIds)
    : undefined;
  var cylinders = defined(parameters.cylinders)
    ? new Float32Array(parameters.cylinders)
    : undefined;
  var cylinderBatchIds = defined(parameters.cylinderBatchIds)
    ? new Uint16Array(parameters.cylinderBatchIds)
    : undefined;
  var ellipsoids = defined(parameters.ellipsoids)
    ? new Float32Array(parameters.ellipsoids)
    : undefined;
  var ellipsoidBatchIds = defined(parameters.ellipsoidBatchIds)
    ? new Uint16Array(parameters.ellipsoidBatchIds)
    : undefined;
  var spheres = defined(parameters.spheres)
    ? new Float32Array(parameters.spheres)
    : undefined;
  var sphereBatchIds = defined(parameters.sphereBatchIds)
    ? new Uint16Array(parameters.sphereBatchIds)
    : undefined;

  var numberOfBoxes = defined(boxes) ? boxBatchIds.length : 0;
  var numberOfCylinders = defined(cylinders) ? cylinderBatchIds.length : 0;
  var numberOfEllipsoids = defined(ellipsoids) ? ellipsoidBatchIds.length : 0;
  var numberOfSpheres = defined(spheres) ? sphereBatchIds.length : 0;

  var boxGeometry = BoxGeometry.getUnitBox();
  var cylinderGeometry = CylinderGeometry.getUnitCylinder();
  var ellipsoidGeometry = EllipsoidGeometry.getUnitEllipsoid();

  var boxPositions = boxGeometry.attributes.position.values;
  var cylinderPositions = cylinderGeometry.attributes.position.values;
  var ellipsoidPositions = ellipsoidGeometry.attributes.position.values;

  var numberOfPositions = boxPositions.length * numberOfBoxes;
  numberOfPositions += cylinderPositions.length * numberOfCylinders;
  numberOfPositions +=
    ellipsoidPositions.length * (numberOfEllipsoids + numberOfSpheres);

  var boxIndices = boxGeometry.indices;
  var cylinderIndices = cylinderGeometry.indices;
  var ellipsoidIndices = ellipsoidGeometry.indices;

  var numberOfIndices = boxIndices.length * numberOfBoxes;
  numberOfIndices += cylinderIndices.length * numberOfCylinders;
  numberOfIndices +=
    ellipsoidIndices.length * (numberOfEllipsoids + numberOfSpheres);

  var positions = new Float32Array(numberOfPositions);
  var vertexBatchIds = new Uint16Array(numberOfPositions / 3);
  var indices = IndexDatatype.createTypedArray(
    numberOfPositions / 3,
    numberOfIndices
  );

  var numberOfGeometries =
    numberOfBoxes + numberOfCylinders + numberOfEllipsoids + numberOfSpheres;
  var batchIds = new Uint16Array(numberOfGeometries);
  var batchedIndices = new Array(numberOfGeometries);
  var indexOffsets = new Uint32Array(numberOfGeometries);
  var indexCounts = new Uint32Array(numberOfGeometries);
  var boundingVolumes = new Array(numberOfGeometries);

  unpackBuffer(parameters.packedBuffer);

  var options = {
    batchTableColors: new Uint32Array(parameters.batchTableColors),
    positions: positions,
    vertexBatchIds: vertexBatchIds,
    indices: indices,
    batchIds: batchIds,
    batchedIndices: batchedIndices,
    indexOffsets: indexOffsets,
    indexCounts: indexCounts,
    boundingVolumes: boundingVolumes,
    positionOffset: 0,
    batchIdIndex: 0,
    indexOffset: 0,
    batchedIndicesOffset: 0,
    modelMatrix: scratchMatrix4,
    center: scratchCenter,
  };

  createPrimitive(
    options,
    boxes,
    boxBatchIds,
    boxGeometry,
    boxModelMatrixAndBoundingVolume
  );
  createPrimitive(
    options,
    cylinders,
    cylinderBatchIds,
    cylinderGeometry,
    cylinderModelMatrixAndBoundingVolume
  );
  createPrimitive(
    options,
    ellipsoids,
    ellipsoidBatchIds,
    ellipsoidGeometry,
    ellipsoidModelMatrixAndBoundingVolume
  );
  createPrimitive(
    options,
    spheres,
    sphereBatchIds,
    ellipsoidGeometry,
    sphereModelMatrixAndBoundingVolume
  );

  var packedBuffer = packBuffer(
    indices.BYTES_PER_ELEMENT,
    batchedIndices,
    boundingVolumes
  );
  transferableObjects.push(
    positions.buffer,
    vertexBatchIds.buffer,
    indices.buffer
  );
  transferableObjects.push(
    batchIds.buffer,
    indexOffsets.buffer,
    indexCounts.buffer
  );
  transferableObjects.push(packedBuffer.buffer);

  return {
    positions: positions.buffer,
    vertexBatchIds: vertexBatchIds.buffer,
    indices: indices.buffer,
    indexOffsets: indexOffsets.buffer,
    indexCounts: indexCounts.buffer,
    batchIds: batchIds.buffer,
    packedBuffer: packedBuffer.buffer,
  };
}
export default createTaskProcessorWorker(createVectorTileGeometries);
