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
  createTaskProcessorWorker_default
} from "./chunk-V2Y7GTNU.js";
import {
  OrientedBoundingBox_default
} from "./chunk-YQGUKCJO.js";
import {
  AttributeCompression_default
} from "./chunk-IJT7RSPE.js";
import "./chunk-LATQ4URD.js";
import "./chunk-IYKFKVQR.js";
import "./chunk-MKJM6R4K.js";
import "./chunk-PY3JQBWU.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
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
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Workers/createVectorTilePolygons.js
var scratchCenter = new Cartesian3_default();
var scratchEllipsoid = new Ellipsoid_default();
var scratchRectangle = new Rectangle_default();
var scratchScalars = {
  min: void 0,
  max: void 0,
  indexBytesPerElement: void 0
};
function unpackBuffer(buffer) {
  const packedBuffer = new Float64Array(buffer);
  let offset = 0;
  scratchScalars.indexBytesPerElement = packedBuffer[offset++];
  scratchScalars.min = packedBuffer[offset++];
  scratchScalars.max = packedBuffer[offset++];
  Cartesian3_default.unpack(packedBuffer, offset, scratchCenter);
  offset += Cartesian3_default.packedLength;
  Ellipsoid_default.unpack(packedBuffer, offset, scratchEllipsoid);
  offset += Ellipsoid_default.packedLength;
  Rectangle_default.unpack(packedBuffer, offset, scratchRectangle);
}
function packedBatchedIndicesLength(batchedIndices) {
  const length = batchedIndices.length;
  let count = 0;
  for (let i = 0; i < length; ++i) {
    count += Color_default.packedLength + 3 + batchedIndices[i].batchIds.length;
  }
  return count;
}
function packBuffer(indexDatatype, boundingVolumes, batchedIndices) {
  const numBVs = boundingVolumes.length;
  const length = 1 + 1 + numBVs * OrientedBoundingBox_default.packedLength + 1 + packedBatchedIndicesLength(batchedIndices);
  const packedBuffer = new Float64Array(length);
  let offset = 0;
  packedBuffer[offset++] = indexDatatype;
  packedBuffer[offset++] = numBVs;
  for (let i = 0; i < numBVs; ++i) {
    OrientedBoundingBox_default.pack(boundingVolumes[i], packedBuffer, offset);
    offset += OrientedBoundingBox_default.packedLength;
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
var maxShort = 32767;
var scratchEncodedPosition = new Cartesian3_default();
var scratchNormal = new Cartesian3_default();
var scratchScaledNormal = new Cartesian3_default();
var scratchMinHeightPosition = new Cartesian3_default();
var scratchMaxHeightPosition = new Cartesian3_default();
var scratchBVCartographic = new Cartographic_default();
var scratchBVRectangle = new Rectangle_default();
function createVectorTilePolygons(parameters, transferableObjects) {
  unpackBuffer(parameters.packedBuffer);
  let indices;
  const indexBytesPerElement = scratchScalars.indexBytesPerElement;
  if (indexBytesPerElement === 2) {
    indices = new Uint16Array(parameters.indices);
  } else {
    indices = new Uint32Array(parameters.indices);
  }
  const positions = new Uint16Array(parameters.positions);
  const counts = new Uint32Array(parameters.counts);
  const indexCounts = new Uint32Array(parameters.indexCounts);
  const batchIds = new Uint32Array(parameters.batchIds);
  const batchTableColors = new Uint32Array(parameters.batchTableColors);
  const boundingVolumes = new Array(counts.length);
  const center = scratchCenter;
  const ellipsoid = scratchEllipsoid;
  let rectangle = scratchRectangle;
  const minHeight = scratchScalars.min;
  const maxHeight = scratchScalars.max;
  let minimumHeights = parameters.minimumHeights;
  let maximumHeights = parameters.maximumHeights;
  if (defined_default(minimumHeights) && defined_default(maximumHeights)) {
    minimumHeights = new Float32Array(minimumHeights);
    maximumHeights = new Float32Array(maximumHeights);
  }
  let i;
  let j;
  let rgba;
  const positionsLength = positions.length / 2;
  const uBuffer = positions.subarray(0, positionsLength);
  const vBuffer = positions.subarray(positionsLength, 2 * positionsLength);
  AttributeCompression_default.zigZagDeltaDecode(uBuffer, vBuffer);
  const decodedPositions = new Float64Array(positionsLength * 3);
  for (i = 0; i < positionsLength; ++i) {
    const u = uBuffer[i];
    const v = vBuffer[i];
    const x = Math_default.lerp(rectangle.west, rectangle.east, u / maxShort);
    const y = Math_default.lerp(rectangle.south, rectangle.north, v / maxShort);
    const cart = Cartographic_default.fromRadians(x, y, 0, scratchBVCartographic);
    const decodedPosition = ellipsoid.cartographicToCartesian(
      cart,
      scratchEncodedPosition
    );
    Cartesian3_default.pack(decodedPosition, decodedPositions, i * 3);
  }
  const countsLength = counts.length;
  const offsets = new Array(countsLength);
  const indexOffsets = new Array(countsLength);
  let currentOffset = 0;
  let currentIndexOffset = 0;
  for (i = 0; i < countsLength; ++i) {
    offsets[i] = currentOffset;
    indexOffsets[i] = currentIndexOffset;
    currentOffset += counts[i];
    currentIndexOffset += indexCounts[i];
  }
  const batchedPositions = new Float32Array(positionsLength * 3 * 2);
  const batchedIds = new Uint16Array(positionsLength * 2);
  const batchedIndexOffsets = new Uint32Array(indexOffsets.length);
  const batchedIndexCounts = new Uint32Array(indexCounts.length);
  let batchedIndices = [];
  const colorToBuffers = {};
  for (i = 0; i < countsLength; ++i) {
    rgba = batchTableColors[i];
    if (!defined_default(colorToBuffers[rgba])) {
      colorToBuffers[rgba] = {
        positionLength: counts[i],
        indexLength: indexCounts[i],
        offset: 0,
        indexOffset: 0,
        batchIds: [i]
      };
    } else {
      colorToBuffers[rgba].positionLength += counts[i];
      colorToBuffers[rgba].indexLength += indexCounts[i];
      colorToBuffers[rgba].batchIds.push(i);
    }
  }
  let buffer;
  let byColorPositionOffset = 0;
  let byColorIndexOffset = 0;
  for (rgba in colorToBuffers) {
    if (colorToBuffers.hasOwnProperty(rgba)) {
      buffer = colorToBuffers[rgba];
      buffer.offset = byColorPositionOffset;
      buffer.indexOffset = byColorIndexOffset;
      const positionLength = buffer.positionLength * 2;
      const indexLength = buffer.indexLength * 2 + buffer.positionLength * 6;
      byColorPositionOffset += positionLength;
      byColorIndexOffset += indexLength;
      buffer.indexLength = indexLength;
    }
  }
  const batchedDrawCalls = [];
  for (rgba in colorToBuffers) {
    if (colorToBuffers.hasOwnProperty(rgba)) {
      buffer = colorToBuffers[rgba];
      batchedDrawCalls.push({
        color: Color_default.fromRgba(parseInt(rgba)),
        offset: buffer.indexOffset,
        count: buffer.indexLength,
        batchIds: buffer.batchIds
      });
    }
  }
  for (i = 0; i < countsLength; ++i) {
    rgba = batchTableColors[i];
    buffer = colorToBuffers[rgba];
    const positionOffset = buffer.offset;
    let positionIndex = positionOffset * 3;
    let batchIdIndex = positionOffset;
    const polygonOffset = offsets[i];
    const polygonCount = counts[i];
    const batchId = batchIds[i];
    let polygonMinimumHeight = minHeight;
    let polygonMaximumHeight = maxHeight;
    if (defined_default(minimumHeights) && defined_default(maximumHeights)) {
      polygonMinimumHeight = minimumHeights[i];
      polygonMaximumHeight = maximumHeights[i];
    }
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let minLon = Number.POSITIVE_INFINITY;
    let maxLon = Number.NEGATIVE_INFINITY;
    for (j = 0; j < polygonCount; ++j) {
      const position = Cartesian3_default.unpack(
        decodedPositions,
        polygonOffset * 3 + j * 3,
        scratchEncodedPosition
      );
      ellipsoid.scaleToGeodeticSurface(position, position);
      const carto = ellipsoid.cartesianToCartographic(
        position,
        scratchBVCartographic
      );
      const lat = carto.latitude;
      const lon = carto.longitude;
      minLat = Math.min(lat, minLat);
      maxLat = Math.max(lat, maxLat);
      minLon = Math.min(lon, minLon);
      maxLon = Math.max(lon, maxLon);
      const normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
      let scaledNormal = Cartesian3_default.multiplyByScalar(
        normal,
        polygonMinimumHeight,
        scratchScaledNormal
      );
      const minHeightPosition = Cartesian3_default.add(
        position,
        scaledNormal,
        scratchMinHeightPosition
      );
      scaledNormal = Cartesian3_default.multiplyByScalar(
        normal,
        polygonMaximumHeight,
        scaledNormal
      );
      const maxHeightPosition = Cartesian3_default.add(
        position,
        scaledNormal,
        scratchMaxHeightPosition
      );
      Cartesian3_default.subtract(maxHeightPosition, center, maxHeightPosition);
      Cartesian3_default.subtract(minHeightPosition, center, minHeightPosition);
      Cartesian3_default.pack(maxHeightPosition, batchedPositions, positionIndex);
      Cartesian3_default.pack(minHeightPosition, batchedPositions, positionIndex + 3);
      batchedIds[batchIdIndex] = batchId;
      batchedIds[batchIdIndex + 1] = batchId;
      positionIndex += 6;
      batchIdIndex += 2;
    }
    rectangle = scratchBVRectangle;
    rectangle.west = minLon;
    rectangle.east = maxLon;
    rectangle.south = minLat;
    rectangle.north = maxLat;
    boundingVolumes[i] = OrientedBoundingBox_default.fromRectangle(
      rectangle,
      minHeight,
      maxHeight,
      ellipsoid
    );
    let indicesIndex = buffer.indexOffset;
    const indexOffset = indexOffsets[i];
    const indexCount = indexCounts[i];
    batchedIndexOffsets[i] = indicesIndex;
    for (j = 0; j < indexCount; j += 3) {
      const i0 = indices[indexOffset + j] - polygonOffset;
      const i1 = indices[indexOffset + j + 1] - polygonOffset;
      const i2 = indices[indexOffset + j + 2] - polygonOffset;
      batchedIndices[indicesIndex++] = i0 * 2 + positionOffset;
      batchedIndices[indicesIndex++] = i1 * 2 + positionOffset;
      batchedIndices[indicesIndex++] = i2 * 2 + positionOffset;
      batchedIndices[indicesIndex++] = i2 * 2 + 1 + positionOffset;
      batchedIndices[indicesIndex++] = i1 * 2 + 1 + positionOffset;
      batchedIndices[indicesIndex++] = i0 * 2 + 1 + positionOffset;
    }
    for (j = 0; j < polygonCount; ++j) {
      const v0 = j;
      const v1 = (j + 1) % polygonCount;
      batchedIndices[indicesIndex++] = v0 * 2 + 1 + positionOffset;
      batchedIndices[indicesIndex++] = v1 * 2 + positionOffset;
      batchedIndices[indicesIndex++] = v0 * 2 + positionOffset;
      batchedIndices[indicesIndex++] = v0 * 2 + 1 + positionOffset;
      batchedIndices[indicesIndex++] = v1 * 2 + 1 + positionOffset;
      batchedIndices[indicesIndex++] = v1 * 2 + positionOffset;
    }
    buffer.offset += polygonCount * 2;
    buffer.indexOffset = indicesIndex;
    batchedIndexCounts[i] = indicesIndex - batchedIndexOffsets[i];
  }
  batchedIndices = IndexDatatype_default.createTypedArray(
    batchedPositions.length / 3,
    batchedIndices
  );
  const batchedIndicesLength = batchedDrawCalls.length;
  for (let m = 0; m < batchedIndicesLength; ++m) {
    const tempIds = batchedDrawCalls[m].batchIds;
    let count = 0;
    const tempIdsLength = tempIds.length;
    for (let n = 0; n < tempIdsLength; ++n) {
      count += batchedIndexCounts[tempIds[n]];
    }
    batchedDrawCalls[m].count = count;
  }
  const indexDatatype = batchedIndices.BYTES_PER_ELEMENT === 2 ? IndexDatatype_default.UNSIGNED_SHORT : IndexDatatype_default.UNSIGNED_INT;
  const packedBuffer = packBuffer(
    indexDatatype,
    boundingVolumes,
    batchedDrawCalls
  );
  transferableObjects.push(
    batchedPositions.buffer,
    batchedIndices.buffer,
    batchedIndexOffsets.buffer,
    batchedIndexCounts.buffer,
    batchedIds.buffer,
    packedBuffer.buffer
  );
  return {
    positions: batchedPositions.buffer,
    indices: batchedIndices.buffer,
    indexOffsets: batchedIndexOffsets.buffer,
    indexCounts: batchedIndexCounts.buffer,
    batchIds: batchedIds.buffer,
    packedBuffer: packedBuffer.buffer
  };
}
var createVectorTilePolygons_default = createTaskProcessorWorker_default(createVectorTilePolygons);
export {
  createVectorTilePolygons_default as default
};
