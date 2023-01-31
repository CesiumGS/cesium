/**
 * Cesium - https://github.com/CesiumGS/cesium
 *
 * Copyright 2011-2020 Cesium Contributors
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
 * See https://github.com/CesiumGS/cesium/blob/master/LICENSE.md for full licensing details.
 */

define(['./AttributeCompression-9ad7a83d', './Cartesian2-e7502022', './Math-34872ab7', './createTaskProcessorWorker', './Check-24483042', './when-54335d57'], function (AttributeCompression, Cartesian2, _Math, createTaskProcessorWorker, Check, when) { 'use strict';

  var maxShort = 32767;

  var scratchBVCartographic = new Cartesian2.Cartographic();
  var scratchEncodedPosition = new Cartesian2.Cartesian3();

  var scratchRectangle = new Cartesian2.Rectangle();
  var scratchEllipsoid = new Cartesian2.Ellipsoid();
  var scratchMinMaxHeights = {
    min: undefined,
    max: undefined,
  };

  function unpackBuffer(packedBuffer) {
    packedBuffer = new Float64Array(packedBuffer);

    var offset = 0;
    scratchMinMaxHeights.min = packedBuffer[offset++];
    scratchMinMaxHeights.max = packedBuffer[offset++];

    Cartesian2.Rectangle.unpack(packedBuffer, offset, scratchRectangle);
    offset += Cartesian2.Rectangle.packedLength;

    Cartesian2.Ellipsoid.unpack(packedBuffer, offset, scratchEllipsoid);
  }

  function createVectorTilePoints(parameters, transferableObjects) {
    var positions = new Uint16Array(parameters.positions);

    unpackBuffer(parameters.packedBuffer);
    var rectangle = scratchRectangle;
    var ellipsoid = scratchEllipsoid;
    var minimumHeight = scratchMinMaxHeights.min;
    var maximumHeight = scratchMinMaxHeights.max;

    var positionsLength = positions.length / 3;
    var uBuffer = positions.subarray(0, positionsLength);
    var vBuffer = positions.subarray(positionsLength, 2 * positionsLength);
    var heightBuffer = positions.subarray(
      2 * positionsLength,
      3 * positionsLength
    );
    AttributeCompression.AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);

    var decoded = new Float64Array(positions.length);
    for (var i = 0; i < positionsLength; ++i) {
      var u = uBuffer[i];
      var v = vBuffer[i];
      var h = heightBuffer[i];

      var lon = _Math.CesiumMath.lerp(rectangle.west, rectangle.east, u / maxShort);
      var lat = _Math.CesiumMath.lerp(rectangle.south, rectangle.north, v / maxShort);
      var alt = _Math.CesiumMath.lerp(minimumHeight, maximumHeight, h / maxShort);

      var cartographic = Cartesian2.Cartographic.fromRadians(
        lon,
        lat,
        alt,
        scratchBVCartographic
      );
      var decodedPosition = ellipsoid.cartographicToCartesian(
        cartographic,
        scratchEncodedPosition
      );
      Cartesian2.Cartesian3.pack(decodedPosition, decoded, i * 3);
    }

    transferableObjects.push(decoded.buffer);

    return {
      positions: decoded.buffer,
    };
  }
  var createVectorTilePoints$1 = createTaskProcessorWorker(createVectorTilePoints);

  return createVectorTilePoints$1;

});
//# sourceMappingURL=createVectorTilePoints.js.map
