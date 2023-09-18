/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  Color_default
} from "./chunk-G3FMOTWF.js";
import {
  CylinderGeometry_default
} from "./chunk-T7Y4RF2B.js";
import "./chunk-4DO5CWC4.js";
import {
  EllipsoidGeometry_default
} from "./chunk-NVNLKOQ6.js";
import {
  createTaskProcessorWorker_default
} from "./chunk-V2Y7GTNU.js";
import {
  BoxGeometry_default
} from "./chunk-XP3DUV3T.js";
import "./chunk-DXQTOATV.js";
import "./chunk-HWW4AAWK.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import "./chunk-CHKMKWJP.js";
import "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default
} from "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import {
  Matrix4_default
} from "./chunk-5G2JRFMX.js";
import "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default
} from "./chunk-A7FTZEKI.js";
import "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
import "./chunk-63W23YZY.js";
import "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Scene/Vector3DTileBatch.js
function Vector3DTileBatch(options) {
  this.offset = options.offset;
  this.count = options.count;
  this.color = options.color;
  this.batchIds = options.batchIds;
}
var Vector3DTileBatch_default = Vector3DTileBatch;

// packages/engine/Source/Workers/createVectorTileGeometries.js
var scratchCartesian = new Cartesian3_default();
var packedBoxLength = Matrix4_default.packedLength + Cartesian3_default.packedLength;
var packedCylinderLength = Matrix4_default.packedLength + 2;
var packedEllipsoidLength = Matrix4_default.packedLength + Cartesian3_default.packedLength;
var packedSphereLength = Cartesian3_default.packedLength + 1;
var scratchModelMatrixAndBV = {
  modelMatrix: new Matrix4_default(),
  boundingVolume: new BoundingSphere_default()
};
function boxModelMatrixAndBoundingVolume(boxes, index) {
  let boxIndex = index * packedBoxLength;
  const dimensions = Cartesian3_default.unpack(boxes, boxIndex, scratchCartesian);
  boxIndex += Cartesian3_default.packedLength;
  const boxModelMatrix = Matrix4_default.unpack(
    boxes,
    boxIndex,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4_default.multiplyByScale(boxModelMatrix, dimensions, boxModelMatrix);
  const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3_default.clone(Cartesian3_default.ZERO, boundingVolume.center);
  boundingVolume.radius = Math.sqrt(3);
  return scratchModelMatrixAndBV;
}
function cylinderModelMatrixAndBoundingVolume(cylinders, index) {
  let cylinderIndex = index * packedCylinderLength;
  const cylinderRadius = cylinders[cylinderIndex++];
  const length = cylinders[cylinderIndex++];
  const scale = Cartesian3_default.fromElements(
    cylinderRadius,
    cylinderRadius,
    length,
    scratchCartesian
  );
  const cylinderModelMatrix = Matrix4_default.unpack(
    cylinders,
    cylinderIndex,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4_default.multiplyByScale(cylinderModelMatrix, scale, cylinderModelMatrix);
  const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3_default.clone(Cartesian3_default.ZERO, boundingVolume.center);
  boundingVolume.radius = Math.sqrt(2);
  return scratchModelMatrixAndBV;
}
function ellipsoidModelMatrixAndBoundingVolume(ellipsoids, index) {
  let ellipsoidIndex = index * packedEllipsoidLength;
  const radii = Cartesian3_default.unpack(ellipsoids, ellipsoidIndex, scratchCartesian);
  ellipsoidIndex += Cartesian3_default.packedLength;
  const ellipsoidModelMatrix = Matrix4_default.unpack(
    ellipsoids,
    ellipsoidIndex,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4_default.multiplyByScale(ellipsoidModelMatrix, radii, ellipsoidModelMatrix);
  const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3_default.clone(Cartesian3_default.ZERO, boundingVolume.center);
  boundingVolume.radius = 1;
  return scratchModelMatrixAndBV;
}
function sphereModelMatrixAndBoundingVolume(spheres, index) {
  let sphereIndex = index * packedSphereLength;
  const sphereRadius = spheres[sphereIndex++];
  const sphereTranslation = Cartesian3_default.unpack(
    spheres,
    sphereIndex,
    scratchCartesian
  );
  const sphereModelMatrix = Matrix4_default.fromTranslation(
    sphereTranslation,
    scratchModelMatrixAndBV.modelMatrix
  );
  Matrix4_default.multiplyByUniformScale(
    sphereModelMatrix,
    sphereRadius,
    sphereModelMatrix
  );
  const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
  Cartesian3_default.clone(Cartesian3_default.ZERO, boundingVolume.center);
  boundingVolume.radius = 1;
  return scratchModelMatrixAndBV;
}
var scratchPosition = new Cartesian3_default();
function createPrimitive(options, primitive, primitiveBatchIds, geometry, getModelMatrixAndBoundingVolume) {
  if (!defined_default(primitive)) {
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
    Matrix4_default.multiply(modelMatrix, primitiveModelMatrix, primitiveModelMatrix);
    const batchId = primitiveBatchIds[i];
    const positionsLength = geometryPositions.length;
    for (let j = 0; j < positionsLength; j += 3) {
      const position = Cartesian3_default.unpack(geometryPositions, j, scratchPosition);
      Matrix4_default.multiplyByPoint(primitiveModelMatrix, position, position);
      Cartesian3_default.subtract(position, center, position);
      Cartesian3_default.pack(position, positions, positionOffset * 3 + j);
      vertexBatchIds[batchIdIndex++] = batchId;
    }
    const indicesLength = geometryIndices.length;
    for (let k = 0; k < indicesLength; ++k) {
      indices[indexOffset + k] = geometryIndices[k] + positionOffset;
    }
    const offset = i + batchedIndicesOffset;
    batchedIndices[offset] = new Vector3DTileBatch_default({
      offset: indexOffset,
      count: indicesLength,
      color: Color_default.fromRgba(batchTableColors[batchId]),
      batchIds: [batchId]
    });
    batchIds[offset] = batchId;
    indexOffsets[offset] = indexOffset;
    indexCounts[offset] = indicesLength;
    boundingVolumes[offset] = BoundingSphere_default.transform(
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
var scratchCenter = new Cartesian3_default();
var scratchMatrix4 = new Matrix4_default();
function unpackBuffer(buffer) {
  const packedBuffer = new Float64Array(buffer);
  let offset = 0;
  Cartesian3_default.unpack(packedBuffer, offset, scratchCenter);
  offset += Cartesian3_default.packedLength;
  Matrix4_default.unpack(packedBuffer, offset, scratchMatrix4);
}
function packedBatchedIndicesLength(batchedIndices) {
  const length = batchedIndices.length;
  let count = 0;
  for (let i = 0; i < length; ++i) {
    count += Color_default.packedLength + 3 + batchedIndices[i].batchIds.length;
  }
  return count;
}
function packBuffer(indicesBytesPerElement, batchedIndices, boundingVolumes) {
  const numBVs = boundingVolumes.length;
  const length = 1 + 1 + numBVs * BoundingSphere_default.packedLength + 1 + packedBatchedIndicesLength(batchedIndices);
  const packedBuffer = new Float64Array(length);
  let offset = 0;
  packedBuffer[offset++] = indicesBytesPerElement;
  packedBuffer[offset++] = numBVs;
  for (let i = 0; i < numBVs; ++i) {
    BoundingSphere_default.pack(boundingVolumes[i], packedBuffer, offset);
    offset += BoundingSphere_default.packedLength;
  }
  const indicesLength = batchedIndices.length;
  packedBuffer[offset++] = indicesLength;
  for (let j = 0; j < indicesLength; ++j) {
    const batchedIndex = batchedIndices[j];
    Color_default.pack(batchedIndex.color, packedBuffer, offset);
    offset += Color_default.packedLength;
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
  const boxes = defined_default(parameters.boxes) ? new Float32Array(parameters.boxes) : void 0;
  const boxBatchIds = defined_default(parameters.boxBatchIds) ? new Uint16Array(parameters.boxBatchIds) : void 0;
  const cylinders = defined_default(parameters.cylinders) ? new Float32Array(parameters.cylinders) : void 0;
  const cylinderBatchIds = defined_default(parameters.cylinderBatchIds) ? new Uint16Array(parameters.cylinderBatchIds) : void 0;
  const ellipsoids = defined_default(parameters.ellipsoids) ? new Float32Array(parameters.ellipsoids) : void 0;
  const ellipsoidBatchIds = defined_default(parameters.ellipsoidBatchIds) ? new Uint16Array(parameters.ellipsoidBatchIds) : void 0;
  const spheres = defined_default(parameters.spheres) ? new Float32Array(parameters.spheres) : void 0;
  const sphereBatchIds = defined_default(parameters.sphereBatchIds) ? new Uint16Array(parameters.sphereBatchIds) : void 0;
  const numberOfBoxes = defined_default(boxes) ? boxBatchIds.length : 0;
  const numberOfCylinders = defined_default(cylinders) ? cylinderBatchIds.length : 0;
  const numberOfEllipsoids = defined_default(ellipsoids) ? ellipsoidBatchIds.length : 0;
  const numberOfSpheres = defined_default(spheres) ? sphereBatchIds.length : 0;
  const boxGeometry = BoxGeometry_default.getUnitBox();
  const cylinderGeometry = CylinderGeometry_default.getUnitCylinder();
  const ellipsoidGeometry = EllipsoidGeometry_default.getUnitEllipsoid();
  const boxPositions = boxGeometry.attributes.position.values;
  const cylinderPositions = cylinderGeometry.attributes.position.values;
  const ellipsoidPositions = ellipsoidGeometry.attributes.position.values;
  let numberOfPositions = boxPositions.length * numberOfBoxes;
  numberOfPositions += cylinderPositions.length * numberOfCylinders;
  numberOfPositions += ellipsoidPositions.length * (numberOfEllipsoids + numberOfSpheres);
  const boxIndices = boxGeometry.indices;
  const cylinderIndices = cylinderGeometry.indices;
  const ellipsoidIndices = ellipsoidGeometry.indices;
  let numberOfIndices = boxIndices.length * numberOfBoxes;
  numberOfIndices += cylinderIndices.length * numberOfCylinders;
  numberOfIndices += ellipsoidIndices.length * (numberOfEllipsoids + numberOfSpheres);
  const positions = new Float32Array(numberOfPositions);
  const vertexBatchIds = new Uint16Array(numberOfPositions / 3);
  const indices = IndexDatatype_default.createTypedArray(
    numberOfPositions / 3,
    numberOfIndices
  );
  const numberOfGeometries = numberOfBoxes + numberOfCylinders + numberOfEllipsoids + numberOfSpheres;
  const batchIds = new Uint16Array(numberOfGeometries);
  const batchedIndices = new Array(numberOfGeometries);
  const indexOffsets = new Uint32Array(numberOfGeometries);
  const indexCounts = new Uint32Array(numberOfGeometries);
  const boundingVolumes = new Array(numberOfGeometries);
  unpackBuffer(parameters.packedBuffer);
  const options = {
    batchTableColors: new Uint32Array(parameters.batchTableColors),
    positions,
    vertexBatchIds,
    indices,
    batchIds,
    batchedIndices,
    indexOffsets,
    indexCounts,
    boundingVolumes,
    positionOffset: 0,
    batchIdIndex: 0,
    indexOffset: 0,
    batchedIndicesOffset: 0,
    modelMatrix: scratchMatrix4,
    center: scratchCenter
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
    packedBuffer: packedBuffer.buffer
  };
}
var createVectorTileGeometries_default = createTaskProcessorWorker_default(createVectorTileGeometries);
export {
  createVectorTileGeometries_default as default
};
