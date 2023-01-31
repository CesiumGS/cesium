import AttributeCompression from "../Core/AttributeCompression.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import CesiumMath from "../Core/Math.js";
import Rectangle from "../Core/Rectangle.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

var maxShort = 32767;

var scratchBVCartographic = new Cartographic();
var scratchEncodedPosition = new Cartesian3();

var scratchRectangle = new Rectangle();
var scratchEllipsoid = new Ellipsoid();
var scratchMinMaxHeights = {
  min: undefined,
  max: undefined,
};

function unpackBuffer(packedBuffer) {
  packedBuffer = new Float64Array(packedBuffer);

  var offset = 0;
  scratchMinMaxHeights.min = packedBuffer[offset++];
  scratchMinMaxHeights.max = packedBuffer[offset++];

  Rectangle.unpack(packedBuffer, offset, scratchRectangle);
  offset += Rectangle.packedLength;

  Ellipsoid.unpack(packedBuffer, offset, scratchEllipsoid);
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
  AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);

  var decoded = new Float64Array(positions.length);
  for (var i = 0; i < positionsLength; ++i) {
    var u = uBuffer[i];
    var v = vBuffer[i];
    var h = heightBuffer[i];

    var lon = CesiumMath.lerp(rectangle.west, rectangle.east, u / maxShort);
    var lat = CesiumMath.lerp(rectangle.south, rectangle.north, v / maxShort);
    var alt = CesiumMath.lerp(minimumHeight, maximumHeight, h / maxShort);

    var cartographic = Cartographic.fromRadians(
      lon,
      lat,
      alt,
      scratchBVCartographic
    );
    var decodedPosition = ellipsoid.cartographicToCartesian(
      cartographic,
      scratchEncodedPosition
    );
    Cartesian3.pack(decodedPosition, decoded, i * 3);
  }

  transferableObjects.push(decoded.buffer);

  return {
    positions: decoded.buffer,
  };
}
export default createTaskProcessorWorker(createVectorTilePoints);
