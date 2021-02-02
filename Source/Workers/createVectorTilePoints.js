/* This file is automatically rebuilt by the Cesium build process. */
define(['./AttributeCompression-be503b68', './Cartesian2-eb270219', './Math-ae27e6c0', './createTaskProcessorWorker', './Check-24cae389', './when-e6985d2a'], function (AttributeCompression, Cartesian2, _Math, createTaskProcessorWorker, Check, when) { 'use strict';

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
