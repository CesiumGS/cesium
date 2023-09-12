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
  createTaskProcessorWorker_default
} from "./chunk-V2Y7GTNU.js";
import {
  AttributeCompression_default
} from "./chunk-IJT7RSPE.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  combine_default
} from "./chunk-Z2BQIJST.js";
import {
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
import "./chunk-63W23YZY.js";
import "./chunk-J64Y4DQH.js";
import "./chunk-7KX4PCVC.js";

// packages/engine/Source/Workers/createVectorTileClampedPolylines.js
var MAX_SHORT = 32767;
var MITER_BREAK = Math.cos(Math_default.toRadians(150));
var scratchBVCartographic = new Cartographic_default();
var scratchEncodedPosition = new Cartesian3_default();
function decodePositions(uBuffer, vBuffer, heightBuffer, rectangle, minimumHeight, maximumHeight, ellipsoid) {
  const positionsLength = uBuffer.length;
  const decodedPositions = new Float64Array(positionsLength * 3);
  for (let i = 0; i < positionsLength; ++i) {
    const u = uBuffer[i];
    const v = vBuffer[i];
    const h = heightBuffer[i];
    const lon = Math_default.lerp(rectangle.west, rectangle.east, u / MAX_SHORT);
    const lat = Math_default.lerp(
      rectangle.south,
      rectangle.north,
      v / MAX_SHORT
    );
    const alt = Math_default.lerp(minimumHeight, maximumHeight, h / MAX_SHORT);
    const cartographic = Cartographic_default.fromRadians(
      lon,
      lat,
      alt,
      scratchBVCartographic
    );
    const decodedPosition = ellipsoid.cartographicToCartesian(
      cartographic,
      scratchEncodedPosition
    );
    Cartesian3_default.pack(decodedPosition, decodedPositions, i * 3);
  }
  return decodedPositions;
}
function getPositionOffsets(counts) {
  const countsLength = counts.length;
  const positionOffsets = new Uint32Array(countsLength + 1);
  let offset = 0;
  for (let i = 0; i < countsLength; ++i) {
    positionOffsets[i] = offset;
    offset += counts[i];
  }
  positionOffsets[countsLength] = offset;
  return positionOffsets;
}
var previousCompressedCartographicScratch = new Cartographic_default();
var currentCompressedCartographicScratch = new Cartographic_default();
function removeDuplicates(uBuffer, vBuffer, heightBuffer, counts) {
  const countsLength = counts.length;
  const positionsLength = uBuffer.length;
  const markRemoval = new Uint8Array(positionsLength);
  const previous = previousCompressedCartographicScratch;
  const current = currentCompressedCartographicScratch;
  let offset = 0;
  for (let i = 0; i < countsLength; i++) {
    const count = counts[i];
    let updatedCount = count;
    for (let j = 1; j < count; j++) {
      const index = offset + j;
      const previousIndex = index - 1;
      current.longitude = uBuffer[index];
      current.latitude = vBuffer[index];
      previous.longitude = uBuffer[previousIndex];
      previous.latitude = vBuffer[previousIndex];
      if (Cartographic_default.equals(current, previous)) {
        updatedCount--;
        markRemoval[previousIndex] = 1;
      }
    }
    counts[i] = updatedCount;
    offset += count;
  }
  let nextAvailableIndex = 0;
  for (let k = 0; k < positionsLength; k++) {
    if (markRemoval[k] !== 1) {
      uBuffer[nextAvailableIndex] = uBuffer[k];
      vBuffer[nextAvailableIndex] = vBuffer[k];
      heightBuffer[nextAvailableIndex] = heightBuffer[k];
      nextAvailableIndex++;
    }
  }
}
function VertexAttributesAndIndices(volumesCount) {
  const vertexCount = volumesCount * 8;
  const vec3Floats = vertexCount * 3;
  const vec4Floats = vertexCount * 4;
  this.startEllipsoidNormals = new Float32Array(vec3Floats);
  this.endEllipsoidNormals = new Float32Array(vec3Floats);
  this.startPositionAndHeights = new Float32Array(vec4Floats);
  this.startFaceNormalAndVertexCornerIds = new Float32Array(vec4Floats);
  this.endPositionAndHeights = new Float32Array(vec4Floats);
  this.endFaceNormalAndHalfWidths = new Float32Array(vec4Floats);
  this.vertexBatchIds = new Uint16Array(vertexCount);
  this.indices = IndexDatatype_default.createTypedArray(vertexCount, 36 * volumesCount);
  this.vec3Offset = 0;
  this.vec4Offset = 0;
  this.batchIdOffset = 0;
  this.indexOffset = 0;
  this.volumeStartIndex = 0;
}
var towardCurrScratch = new Cartesian3_default();
var towardNextScratch = new Cartesian3_default();
function computeMiteredNormal(previousPosition, position, nextPosition, ellipsoidSurfaceNormal, result) {
  const towardNext = Cartesian3_default.subtract(
    nextPosition,
    position,
    towardNextScratch
  );
  let towardCurr = Cartesian3_default.subtract(
    position,
    previousPosition,
    towardCurrScratch
  );
  Cartesian3_default.normalize(towardNext, towardNext);
  Cartesian3_default.normalize(towardCurr, towardCurr);
  if (Cartesian3_default.dot(towardNext, towardCurr) < MITER_BREAK) {
    towardCurr = Cartesian3_default.multiplyByScalar(
      towardCurr,
      -1,
      towardCurrScratch
    );
  }
  Cartesian3_default.add(towardNext, towardCurr, result);
  if (Cartesian3_default.equals(result, Cartesian3_default.ZERO)) {
    result = Cartesian3_default.subtract(previousPosition, position);
  }
  Cartesian3_default.cross(result, ellipsoidSurfaceNormal, result);
  Cartesian3_default.cross(ellipsoidSurfaceNormal, result, result);
  Cartesian3_default.normalize(result, result);
  return result;
}
var REFERENCE_INDICES = [
  0,
  2,
  6,
  0,
  6,
  4,
  // right
  0,
  1,
  3,
  0,
  3,
  2,
  // start face
  0,
  4,
  5,
  0,
  5,
  1,
  // bottom
  5,
  3,
  1,
  5,
  7,
  3,
  // left
  7,
  5,
  4,
  7,
  4,
  6,
  // end face
  7,
  6,
  2,
  7,
  2,
  3
  // top
];
var REFERENCE_INDICES_LENGTH = REFERENCE_INDICES.length;
var positionScratch = new Cartesian3_default();
var scratchStartEllipsoidNormal = new Cartesian3_default();
var scratchStartFaceNormal = new Cartesian3_default();
var scratchEndEllipsoidNormal = new Cartesian3_default();
var scratchEndFaceNormal = new Cartesian3_default();
VertexAttributesAndIndices.prototype.addVolume = function(preStartRTC, startRTC, endRTC, postEndRTC, startHeight, endHeight, halfWidth, batchId, center, ellipsoid) {
  let position = Cartesian3_default.add(startRTC, center, positionScratch);
  const startEllipsoidNormal = ellipsoid.geodeticSurfaceNormal(
    position,
    scratchStartEllipsoidNormal
  );
  position = Cartesian3_default.add(endRTC, center, positionScratch);
  const endEllipsoidNormal = ellipsoid.geodeticSurfaceNormal(
    position,
    scratchEndEllipsoidNormal
  );
  const startFaceNormal = computeMiteredNormal(
    preStartRTC,
    startRTC,
    endRTC,
    startEllipsoidNormal,
    scratchStartFaceNormal
  );
  const endFaceNormal = computeMiteredNormal(
    postEndRTC,
    endRTC,
    startRTC,
    endEllipsoidNormal,
    scratchEndFaceNormal
  );
  const startEllipsoidNormals = this.startEllipsoidNormals;
  const endEllipsoidNormals = this.endEllipsoidNormals;
  const startPositionAndHeights = this.startPositionAndHeights;
  const startFaceNormalAndVertexCornerIds = this.startFaceNormalAndVertexCornerIds;
  const endPositionAndHeights = this.endPositionAndHeights;
  const endFaceNormalAndHalfWidths = this.endFaceNormalAndHalfWidths;
  const vertexBatchIds = this.vertexBatchIds;
  let batchIdOffset = this.batchIdOffset;
  let vec3Offset = this.vec3Offset;
  let vec4Offset = this.vec4Offset;
  let i;
  for (i = 0; i < 8; i++) {
    Cartesian3_default.pack(startEllipsoidNormal, startEllipsoidNormals, vec3Offset);
    Cartesian3_default.pack(endEllipsoidNormal, endEllipsoidNormals, vec3Offset);
    Cartesian3_default.pack(startRTC, startPositionAndHeights, vec4Offset);
    startPositionAndHeights[vec4Offset + 3] = startHeight;
    Cartesian3_default.pack(endRTC, endPositionAndHeights, vec4Offset);
    endPositionAndHeights[vec4Offset + 3] = endHeight;
    Cartesian3_default.pack(
      startFaceNormal,
      startFaceNormalAndVertexCornerIds,
      vec4Offset
    );
    startFaceNormalAndVertexCornerIds[vec4Offset + 3] = i;
    Cartesian3_default.pack(endFaceNormal, endFaceNormalAndHalfWidths, vec4Offset);
    endFaceNormalAndHalfWidths[vec4Offset + 3] = halfWidth;
    vertexBatchIds[batchIdOffset++] = batchId;
    vec3Offset += 3;
    vec4Offset += 4;
  }
  this.batchIdOffset = batchIdOffset;
  this.vec3Offset = vec3Offset;
  this.vec4Offset = vec4Offset;
  const indices = this.indices;
  const volumeStartIndex = this.volumeStartIndex;
  const indexOffset = this.indexOffset;
  for (i = 0; i < REFERENCE_INDICES_LENGTH; i++) {
    indices[indexOffset + i] = REFERENCE_INDICES[i] + volumeStartIndex;
  }
  this.volumeStartIndex += 8;
  this.indexOffset += REFERENCE_INDICES_LENGTH;
};
var scratchRectangle = new Rectangle_default();
var scratchEllipsoid = new Ellipsoid_default();
var scratchCenter = new Cartesian3_default();
var scratchPrev = new Cartesian3_default();
var scratchP0 = new Cartesian3_default();
var scratchP1 = new Cartesian3_default();
var scratchNext = new Cartesian3_default();
function createVectorTileClampedPolylines(parameters, transferableObjects) {
  const encodedPositions = new Uint16Array(parameters.positions);
  const widths = new Uint16Array(parameters.widths);
  const counts = new Uint32Array(parameters.counts);
  const batchIds = new Uint16Array(parameters.batchIds);
  const rectangle = scratchRectangle;
  const ellipsoid = scratchEllipsoid;
  const center = scratchCenter;
  const packedBuffer = new Float64Array(parameters.packedBuffer);
  let offset = 0;
  const minimumHeight = packedBuffer[offset++];
  const maximumHeight = packedBuffer[offset++];
  Rectangle_default.unpack(packedBuffer, offset, rectangle);
  offset += Rectangle_default.packedLength;
  Ellipsoid_default.unpack(packedBuffer, offset, ellipsoid);
  offset += Ellipsoid_default.packedLength;
  Cartesian3_default.unpack(packedBuffer, offset, center);
  let i;
  let positionsLength = encodedPositions.length / 3;
  const uBuffer = encodedPositions.subarray(0, positionsLength);
  const vBuffer = encodedPositions.subarray(
    positionsLength,
    2 * positionsLength
  );
  const heightBuffer = encodedPositions.subarray(
    2 * positionsLength,
    3 * positionsLength
  );
  AttributeCompression_default.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);
  removeDuplicates(uBuffer, vBuffer, heightBuffer, counts);
  const countsLength = counts.length;
  let volumesCount = 0;
  for (i = 0; i < countsLength; i++) {
    const polylinePositionCount = counts[i];
    volumesCount += polylinePositionCount - 1;
  }
  const attribsAndIndices = new VertexAttributesAndIndices(volumesCount);
  const positions = decodePositions(
    uBuffer,
    vBuffer,
    heightBuffer,
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid,
    center
  );
  positionsLength = uBuffer.length;
  const positionsRTC = new Float32Array(positionsLength * 3);
  for (i = 0; i < positionsLength; ++i) {
    positionsRTC[i * 3] = positions[i * 3] - center.x;
    positionsRTC[i * 3 + 1] = positions[i * 3 + 1] - center.y;
    positionsRTC[i * 3 + 2] = positions[i * 3 + 2] - center.z;
  }
  let currentPositionIndex = 0;
  let currentHeightIndex = 0;
  for (i = 0; i < countsLength; i++) {
    const polylineVolumeCount = counts[i] - 1;
    const halfWidth = widths[i] * 0.5;
    const batchId = batchIds[i];
    const volumeFirstPositionIndex = currentPositionIndex;
    for (let j = 0; j < polylineVolumeCount; j++) {
      const volumeStart = Cartesian3_default.unpack(
        positionsRTC,
        currentPositionIndex,
        scratchP0
      );
      const volumeEnd = Cartesian3_default.unpack(
        positionsRTC,
        currentPositionIndex + 3,
        scratchP1
      );
      let startHeight = heightBuffer[currentHeightIndex];
      let endHeight = heightBuffer[currentHeightIndex + 1];
      startHeight = Math_default.lerp(
        minimumHeight,
        maximumHeight,
        startHeight / MAX_SHORT
      );
      endHeight = Math_default.lerp(
        minimumHeight,
        maximumHeight,
        endHeight / MAX_SHORT
      );
      currentHeightIndex++;
      let preStart = scratchPrev;
      let postEnd = scratchNext;
      if (j === 0) {
        const finalPositionIndex = volumeFirstPositionIndex + polylineVolumeCount * 3;
        const finalPosition = Cartesian3_default.unpack(
          positionsRTC,
          finalPositionIndex,
          scratchPrev
        );
        if (Cartesian3_default.equals(finalPosition, volumeStart)) {
          Cartesian3_default.unpack(positionsRTC, finalPositionIndex - 3, preStart);
        } else {
          const offsetPastStart = Cartesian3_default.subtract(
            volumeStart,
            volumeEnd,
            scratchPrev
          );
          preStart = Cartesian3_default.add(offsetPastStart, volumeStart, scratchPrev);
        }
      } else {
        Cartesian3_default.unpack(positionsRTC, currentPositionIndex - 3, preStart);
      }
      if (j === polylineVolumeCount - 1) {
        const firstPosition = Cartesian3_default.unpack(
          positionsRTC,
          volumeFirstPositionIndex,
          scratchNext
        );
        if (Cartesian3_default.equals(firstPosition, volumeEnd)) {
          Cartesian3_default.unpack(
            positionsRTC,
            volumeFirstPositionIndex + 3,
            postEnd
          );
        } else {
          const offsetPastEnd = Cartesian3_default.subtract(
            volumeEnd,
            volumeStart,
            scratchNext
          );
          postEnd = Cartesian3_default.add(offsetPastEnd, volumeEnd, scratchNext);
        }
      } else {
        Cartesian3_default.unpack(positionsRTC, currentPositionIndex + 6, postEnd);
      }
      attribsAndIndices.addVolume(
        preStart,
        volumeStart,
        volumeEnd,
        postEnd,
        startHeight,
        endHeight,
        halfWidth,
        batchId,
        center,
        ellipsoid
      );
      currentPositionIndex += 3;
    }
    currentPositionIndex += 3;
    currentHeightIndex++;
  }
  const indices = attribsAndIndices.indices;
  transferableObjects.push(attribsAndIndices.startEllipsoidNormals.buffer);
  transferableObjects.push(attribsAndIndices.endEllipsoidNormals.buffer);
  transferableObjects.push(attribsAndIndices.startPositionAndHeights.buffer);
  transferableObjects.push(
    attribsAndIndices.startFaceNormalAndVertexCornerIds.buffer
  );
  transferableObjects.push(attribsAndIndices.endPositionAndHeights.buffer);
  transferableObjects.push(attribsAndIndices.endFaceNormalAndHalfWidths.buffer);
  transferableObjects.push(attribsAndIndices.vertexBatchIds.buffer);
  transferableObjects.push(indices.buffer);
  let results = {
    indexDatatype: indices.BYTES_PER_ELEMENT === 2 ? IndexDatatype_default.UNSIGNED_SHORT : IndexDatatype_default.UNSIGNED_INT,
    startEllipsoidNormals: attribsAndIndices.startEllipsoidNormals.buffer,
    endEllipsoidNormals: attribsAndIndices.endEllipsoidNormals.buffer,
    startPositionAndHeights: attribsAndIndices.startPositionAndHeights.buffer,
    startFaceNormalAndVertexCornerIds: attribsAndIndices.startFaceNormalAndVertexCornerIds.buffer,
    endPositionAndHeights: attribsAndIndices.endPositionAndHeights.buffer,
    endFaceNormalAndHalfWidths: attribsAndIndices.endFaceNormalAndHalfWidths.buffer,
    vertexBatchIds: attribsAndIndices.vertexBatchIds.buffer,
    indices: indices.buffer
  };
  if (parameters.keepDecodedPositions) {
    const positionOffsets = getPositionOffsets(counts);
    transferableObjects.push(positions.buffer, positionOffsets.buffer);
    results = combine_default(results, {
      decodedPositions: positions.buffer,
      decodedPositionOffsets: positionOffsets.buffer
    });
  }
  return results;
}
var createVectorTileClampedPolylines_default = createTaskProcessorWorker_default(createVectorTileClampedPolylines);
export {
  createVectorTileClampedPolylines_default as default
};
