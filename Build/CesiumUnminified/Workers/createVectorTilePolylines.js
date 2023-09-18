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

// packages/engine/Source/Core/decodeVectorPolylinePositions.js
var maxShort = 32767;
var scratchBVCartographic = new Cartographic_default();
var scratchEncodedPosition = new Cartesian3_default();
function decodeVectorPolylinePositions(positions, rectangle, minimumHeight, maximumHeight, ellipsoid) {
  const positionsLength = positions.length / 3;
  const uBuffer = positions.subarray(0, positionsLength);
  const vBuffer = positions.subarray(positionsLength, 2 * positionsLength);
  const heightBuffer = positions.subarray(
    2 * positionsLength,
    3 * positionsLength
  );
  AttributeCompression_default.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);
  const decoded = new Float64Array(positions.length);
  for (let i = 0; i < positionsLength; ++i) {
    const u = uBuffer[i];
    const v = vBuffer[i];
    const h = heightBuffer[i];
    const lon = Math_default.lerp(rectangle.west, rectangle.east, u / maxShort);
    const lat = Math_default.lerp(rectangle.south, rectangle.north, v / maxShort);
    const alt = Math_default.lerp(minimumHeight, maximumHeight, h / maxShort);
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
    Cartesian3_default.pack(decodedPosition, decoded, i * 3);
  }
  return decoded;
}
var decodeVectorPolylinePositions_default = decodeVectorPolylinePositions;

// packages/engine/Source/Workers/createVectorTilePolylines.js
var scratchRectangle = new Rectangle_default();
var scratchEllipsoid = new Ellipsoid_default();
var scratchCenter = new Cartesian3_default();
var scratchMinMaxHeights = {
  min: void 0,
  max: void 0
};
function unpackBuffer(packedBuffer) {
  packedBuffer = new Float64Array(packedBuffer);
  let offset = 0;
  scratchMinMaxHeights.min = packedBuffer[offset++];
  scratchMinMaxHeights.max = packedBuffer[offset++];
  Rectangle_default.unpack(packedBuffer, offset, scratchRectangle);
  offset += Rectangle_default.packedLength;
  Ellipsoid_default.unpack(packedBuffer, offset, scratchEllipsoid);
  offset += Ellipsoid_default.packedLength;
  Cartesian3_default.unpack(packedBuffer, offset, scratchCenter);
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
var scratchP0 = new Cartesian3_default();
var scratchP1 = new Cartesian3_default();
var scratchPrev = new Cartesian3_default();
var scratchCur = new Cartesian3_default();
var scratchNext = new Cartesian3_default();
function createVectorTilePolylines(parameters, transferableObjects) {
  const encodedPositions = new Uint16Array(parameters.positions);
  const widths = new Uint16Array(parameters.widths);
  const counts = new Uint32Array(parameters.counts);
  const batchIds = new Uint16Array(parameters.batchIds);
  unpackBuffer(parameters.packedBuffer);
  const rectangle = scratchRectangle;
  const ellipsoid = scratchEllipsoid;
  const center = scratchCenter;
  const minimumHeight = scratchMinMaxHeights.min;
  const maximumHeight = scratchMinMaxHeights.max;
  const positions = decodeVectorPolylinePositions_default(
    encodedPositions,
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid
  );
  const positionsLength = positions.length / 3;
  const size = positionsLength * 4 - 4;
  const curPositions = new Float32Array(size * 3);
  const prevPositions = new Float32Array(size * 3);
  const nextPositions = new Float32Array(size * 3);
  const expandAndWidth = new Float32Array(size * 2);
  const vertexBatchIds = new Uint16Array(size);
  let positionIndex = 0;
  let expandAndWidthIndex = 0;
  let batchIdIndex = 0;
  let i;
  let offset = 0;
  let length = counts.length;
  for (i = 0; i < length; ++i) {
    const count = counts[i];
    const width = widths[i];
    const batchId = batchIds[i];
    for (let j = 0; j < count; ++j) {
      let previous;
      if (j === 0) {
        const p0 = Cartesian3_default.unpack(positions, offset * 3, scratchP0);
        const p1 = Cartesian3_default.unpack(positions, (offset + 1) * 3, scratchP1);
        previous = Cartesian3_default.subtract(p0, p1, scratchPrev);
        Cartesian3_default.add(p0, previous, previous);
      } else {
        previous = Cartesian3_default.unpack(
          positions,
          (offset + j - 1) * 3,
          scratchPrev
        );
      }
      const current = Cartesian3_default.unpack(
        positions,
        (offset + j) * 3,
        scratchCur
      );
      let next;
      if (j === count - 1) {
        const p2 = Cartesian3_default.unpack(
          positions,
          (offset + count - 1) * 3,
          scratchP0
        );
        const p3 = Cartesian3_default.unpack(
          positions,
          (offset + count - 2) * 3,
          scratchP1
        );
        next = Cartesian3_default.subtract(p2, p3, scratchNext);
        Cartesian3_default.add(p2, next, next);
      } else {
        next = Cartesian3_default.unpack(positions, (offset + j + 1) * 3, scratchNext);
      }
      Cartesian3_default.subtract(previous, center, previous);
      Cartesian3_default.subtract(current, center, current);
      Cartesian3_default.subtract(next, center, next);
      const startK = j === 0 ? 2 : 0;
      const endK = j === count - 1 ? 2 : 4;
      for (let k = startK; k < endK; ++k) {
        Cartesian3_default.pack(current, curPositions, positionIndex);
        Cartesian3_default.pack(previous, prevPositions, positionIndex);
        Cartesian3_default.pack(next, nextPositions, positionIndex);
        positionIndex += 3;
        const direction = k - 2 < 0 ? -1 : 1;
        expandAndWidth[expandAndWidthIndex++] = 2 * (k % 2) - 1;
        expandAndWidth[expandAndWidthIndex++] = direction * width;
        vertexBatchIds[batchIdIndex++] = batchId;
      }
    }
    offset += count;
  }
  const indices = IndexDatatype_default.createTypedArray(size, positionsLength * 6 - 6);
  let index = 0;
  let indicesIndex = 0;
  length = positionsLength - 1;
  for (i = 0; i < length; ++i) {
    indices[indicesIndex++] = index;
    indices[indicesIndex++] = index + 2;
    indices[indicesIndex++] = index + 1;
    indices[indicesIndex++] = index + 1;
    indices[indicesIndex++] = index + 2;
    indices[indicesIndex++] = index + 3;
    index += 4;
  }
  transferableObjects.push(
    curPositions.buffer,
    prevPositions.buffer,
    nextPositions.buffer
  );
  transferableObjects.push(
    expandAndWidth.buffer,
    vertexBatchIds.buffer,
    indices.buffer
  );
  let results = {
    indexDatatype: indices.BYTES_PER_ELEMENT === 2 ? IndexDatatype_default.UNSIGNED_SHORT : IndexDatatype_default.UNSIGNED_INT,
    currentPositions: curPositions.buffer,
    previousPositions: prevPositions.buffer,
    nextPositions: nextPositions.buffer,
    expandAndWidth: expandAndWidth.buffer,
    batchIds: vertexBatchIds.buffer,
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
var createVectorTilePolylines_default = createTaskProcessorWorker_default(createVectorTilePolylines);
export {
  createVectorTilePolylines_default as default
};
