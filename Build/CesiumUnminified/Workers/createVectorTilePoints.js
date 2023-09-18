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

// packages/engine/Source/Workers/createVectorTilePoints.js
var maxShort = 32767;
var scratchBVCartographic = new Cartographic_default();
var scratchEncodedPosition = new Cartesian3_default();
var scratchRectangle = new Rectangle_default();
var scratchEllipsoid = new Ellipsoid_default();
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
}
function createVectorTilePoints(parameters, transferableObjects) {
  const positions = new Uint16Array(parameters.positions);
  unpackBuffer(parameters.packedBuffer);
  const rectangle = scratchRectangle;
  const ellipsoid = scratchEllipsoid;
  const minimumHeight = scratchMinMaxHeights.min;
  const maximumHeight = scratchMinMaxHeights.max;
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
  transferableObjects.push(decoded.buffer);
  return {
    positions: decoded.buffer
  };
}
var createVectorTilePoints_default = createTaskProcessorWorker_default(createVectorTilePoints);
export {
  createVectorTilePoints_default as default
};
