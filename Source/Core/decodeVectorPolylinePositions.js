import AttributeCompression from "./AttributeCompression.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import CesiumMath from "./Math.js";

var maxShort = 32767;

var scratchBVCartographic = new Cartographic();
var scratchEncodedPosition = new Cartesian3();

function decodeVectorPolylinePositions(
  positions,
  rectangle,
  minimumHeight,
  maximumHeight,
  ellipsoid
) {
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
  return decoded;
}
export default decodeVectorPolylinePositions;
