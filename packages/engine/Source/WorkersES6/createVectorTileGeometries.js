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

const scratchCartesian = new Cartesian3();

const packedBoxLength = Matrix4.packedLength + Cartesian3.packedLength;
const packedCylinderLength = Matrix4.packedLength + 2;
const packedEllipsoidLength = Matrix4.packedLength + Cartesian3.packedLength;
const packedSphereLength = Cartesian3.packedLength + 1;

const scratchModelMatrixAndBV = {
  modelMatrix: new Matrix4(),
  boundingVolume: new BoundingSphere(),
};

function boxModelMatrixAndBoundingVolume(boxes, index) {
  let boxIndex = index * packedBoxLength;

  const dimensions = Cartesian3.unpack(boxes, boxIndex, scratchCartesian);
  boxIndex += Cartesian3.packedLength;

  const boxModelMatrix = Matrix4.unpack(
    boxes,
    boxIndex,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4.multiplyByScale(boxModelMatrix, dimensions, boxModelMatrix);

  const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3.clone(Cartesian3.ZERO, boundingVolume.center);
  boundingVolume.radius = Math.sqrt(3.0);

  return scratchModelMatrixAndBV;
}

function cylinderModelMatrixAndBoundingVolume(cylinders, index) {
  let cylinderIndex = index * packedCylinderLength;

  const cylinderRadius = cylinders[cylinderIndex++];
  const length = cylinders[cylinderIndex++];
  const scale = Cartesian3.fromElements(
    cylinderRadius,
    cylinderRadius,
    length,
    scratchCartesian
  );

  const cylinderModelMatrix = Matrix4.unpack(
    cylinders,
    cylinderIndex,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4.multiplyByScale(cylinderModelMatrix, scale, cylinderModelMatrix);

  const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3.clone(Cartesian3.ZERO, boundingVolume.center);
  boundingVolume.radius = Math.sqrt(2.0);

  return scratchModelMatrixAndBV;
}

function ellipsoidModelMatrixAndBoundingVolume(ellipsoids, index) {
  let ellipsoidIndex = index * packedEllipsoidLength;

  const radii = Cartesian3.unpack(ellipsoids, ellipsoidIndex, scratchCartesian);
  ellipsoidIndex += Cartesian3.packedLength;

  const ellipsoidModelMatrix = Matrix4.unpack(
    ellipsoids,
    ellipsoidIndex,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4.multiplyByScale(ellipsoidModelMatrix, radii, ellipsoidModelMatrix);

  const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3.clone(Cartesian3.ZERO, boundingVolume.center);
  boundingVolume.radius = 1.0;

  return scratchModelMatrixAndBV;
}

function sphereModelMatrixAndBoundingVolume(spheres, index) {
  let sphereIndex = index * packedSphereLength;

  const sphereRadius = spheres[sphereIndex++];

  const sphereTranslation = Cartesian3.unpack(
    spheres,
    sphereIndex,
    scratchCartesian
  );
  const sphereModelMatrix = Matrix4.fromTranslation(
    sphereTranslation,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4.multiplyByUniformScale(
    sphereModelMatrix,
    sphereRadius,
    sphereModelMatrix
  );

  const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3.clone(Cartesian3.ZERO, boundingVolume.center);
  boundingVolume.radius = 1.0;

  return scratchModelMatrixAndBV;
}

const scratchPosition = new Cartesian3();

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

  const numberOfPrimitives = primitiveBatchIds.length;
  const geometryPositions = geometry.attributes.position.values;
  const geometryIndices = geometry.indices;

  const positions = options.positions;
  const vertexBatchIds = options.vertexBatchIds;
  const indices = options.indices;

  const batchIds = options.batchIds;
  const batchTableColors = options.batchTableColors;
  const batchedIndices = options.batchedIndices;
  const indexOffsets = options.indexOffsets;
  const indexCounts = options.indexCounts;
  const boundingVolumes = options.boundingVolumes;

  const modelMatrix = options.modelMatrix;
  const center = options.center;

  let positionOffset = options.positionOffset;
  let batchIdIndex = options.batchIdIndex;
  let indexOffset = options.indexOffset;
  const batchedIndicesOffset = options.batchedIndicesOffset;

  for (let i = 0; i < numberOfPrimitives; ++i) {
    const primitiveModelMatrixAndBV = getModelMatrixAndBoundingVolume(
      primitive,
      i
    );
    const primitiveModelMatrix = primitiveModelMatrixAndBV.modelMatrix;
    Matrix4.multiply(modelMatrix, primitiveModelMatrix, primitiveModelMatrix);

    const batchId = primitiveBatchIds[i];

    const positionsLength = geometryPositions.length;
    for (let j = 0; j < positionsLength; j += 3) {
      const position = Cartesian3.unpack(geometryPositions, j, scratchPosition);
      Matrix4.multiplyByPoint(primitiveModelMatrix, position, position);
      Cartesian3.subtract(position, center, position);

      Cartesian3.pack(position, positions, positionOffset * 3 + j);
      vertexBatchIds[batchIdIndex++] = batchId;
    }

    const indicesLength = geometryIndices.length;
    for (let k = 0; k < indicesLength; ++k) {
      indices[indexOffset + k] = geometryIndices[k] + positionOffset;
    }

    const offset = i + batchedIndicesOffset;
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

const scratchCenter = new Cartesian3();
const scratchMatrix4 = new Matrix4();

function unpackBuffer(buffer) {
  const packedBuffer = new Float64Array(buffer);

  let offset = 0;
  Cartesian3.unpack(packedBuffer, offset, scratchCenter);
  offset += Cartesian3.packedLength;

  Matrix4.unpack(packedBuffer, offset, scratchMatrix4);
}

function packedBatchedIndicesLength(batchedIndices) {
  const length = batchedIndices.length;
  let count = 0;
  for (let i = 0; i < length; ++i) {
    count += Color.packedLength + 3 + batchedIndices[i].batchIds.length;
  }
  return count;
}

function packBuffer(indicesBytesPerElement, batchedIndices, boundingVolumes) {
  const numBVs = boundingVolumes.length;
  const length =
    1 +
    1 +
    numBVs * BoundingSphere.packedLength +
    1 +
    packedBatchedIndicesLength(batchedIndices);

  const packedBuffer = new Float64Array(length);

  let offset = 0;
  packedBuffer[offset++] = indicesBytesPerElement;
  packedBuffer[offset++] = numBVs;

  for (let i = 0; i < numBVs; ++i) {
    BoundingSphere.pack(boundingVolumes[i], packedBuffer, offset);
    offset += BoundingSphere.packedLength;
  }

  const indicesLength = batchedIndices.length;
  packedBuffer[offset++] = indicesLength;

  for (let j = 0; j < indicesLength; ++j) {
    const batchedIndex = batchedIndices[j];

    Color.pack(batchedIndex.color, packedBuffer, offset);
    offset += Color.packedLength;

    packedBuffer[offset++] = batchedIndex.offset;
    packedBuffer[offset++] = batchedIndex.count;

    const batchIds = batchedIndex.batchIds;
    const batchIdsLength = batchIds.length;
    packedBuffer[offset++] = batchIdsLength;

    for (let k = 0; k < batchIdsLength; ++k) {
      packedBuffer[offset++] = batchIds[k];
    }
  }

  return packedBuffer;
}

function createVectorTileGeometries(parameters, transferableObjects) {
  const boxes = defined(parameters.boxes)
    ? new Float32Array(parameters.boxes)
    : undefined;
  const boxBatchIds = defined(parameters.boxBatchIds)
    ? new Uint16Array(parameters.boxBatchIds)
    : undefined;
  const cylinders = defined(parameters.cylinders)
    ? new Float32Array(parameters.cylinders)
    : undefined;
  const cylinderBatchIds = defined(parameters.cylinderBatchIds)
    ? new Uint16Array(parameters.cylinderBatchIds)
    : undefined;
  const ellipsoids = defined(parameters.ellipsoids)
    ? new Float32Array(parameters.ellipsoids)
    : undefined;
  const ellipsoidBatchIds = defined(parameters.ellipsoidBatchIds)
    ? new Uint16Array(parameters.ellipsoidBatchIds)
    : undefined;
  const spheres = defined(parameters.spheres)
    ? new Float32Array(parameters.spheres)
    : undefined;
  const sphereBatchIds = defined(parameters.sphereBatchIds)
    ? new Uint16Array(parameters.sphereBatchIds)
    : undefined;

  const numberOfBoxes = defined(boxes) ? boxBatchIds.length : 0;
  const numberOfCylinders = defined(cylinders) ? cylinderBatchIds.length : 0;
  const numberOfEllipsoids = defined(ellipsoids) ? ellipsoidBatchIds.length : 0;
  const numberOfSpheres = defined(spheres) ? sphereBatchIds.length : 0;

  const boxGeometry = BoxGeometry.getUnitBox();
  const cylinderGeometry = CylinderGeometry.getUnitCylinder();
  const ellipsoidGeometry = EllipsoidGeometry.getUnitEllipsoid();

  const boxPositions = boxGeometry.attributes.position.values;
  const cylinderPositions = cylinderGeometry.attributes.position.values;
  const ellipsoidPositions = ellipsoidGeometry.attributes.position.values;

  let numberOfPositions = boxPositions.length * numberOfBoxes;
  numberOfPositions += cylinderPositions.length * numberOfCylinders;
  numberOfPositions +=
    ellipsoidPositions.length * (numberOfEllipsoids + numberOfSpheres);

  const boxIndices = boxGeometry.indices;
  const cylinderIndices = cylinderGeometry.indices;
  const ellipsoidIndices = ellipsoidGeometry.indices;

  let numberOfIndices = boxIndices.length * numberOfBoxes;
  numberOfIndices += cylinderIndices.length * numberOfCylinders;
  numberOfIndices +=
    ellipsoidIndices.length * (numberOfEllipsoids + numberOfSpheres);

  const positions = new Float32Array(numberOfPositions);
  const vertexBatchIds = new Uint16Array(numberOfPositions / 3);
  const indices = IndexDatatype.createTypedArray(
    numberOfPositions / 3,
    numberOfIndices
  );

  const numberOfGeometries =
    numberOfBoxes + numberOfCylinders + numberOfEllipsoids + numberOfSpheres;
  const batchIds = new Uint16Array(numberOfGeometries);
  const batchedIndices = new Array(numberOfGeometries);
  const indexOffsets = new Uint32Array(numberOfGeometries);
  const indexCounts = new Uint32Array(numberOfGeometries);
  const boundingVolumes = new Array(numberOfGeometries);

  unpackBuffer(parameters.packedBuffer);

  const options = {
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

  const packedBuffer = packBuffer(
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
