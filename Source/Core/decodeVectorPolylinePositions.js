import AttributeCompression from "./AttributeCompression.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import CesiumMath from "./Math.js";

const maxShort = 32767;

const scratchBVCartographic = new Cartographic();
const scratchEncodedPosition = new Cartesian3();

function decodeVectorPolylinePositions(
  positions,
  rectangle,
  minimumHeight,
  maximumHeight,
  ellipsoid
) {
  const positionsLength = positions.length / 3;
  const uBuffer = positions.subarray(0, positionsLength);
  const vBuffer = positions.subarray(positionsLength, 2 * positionsLength);
  const heightBuffer = positions.subarray(
    2 * positionsLength,
    3 * positionsLength
  );
  AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);

  const decoded = new Float64Array(positions.length);
  for (let i = 0; i < positionsLength; ++i) {
    const u = uBuffer[i];
    const v = vBuffer[i];
    const h = heightBuffer[i];

    const lon = CesiumMath.lerp(rectangle.west, rectangle.east, u / maxShort);
    const lat = CesiumMath.lerp(rectangle.south, rectangle.north, v / maxShort);
    const alt = CesiumMath.lerp(minimumHeight, maximumHeight, h / maxShort);

    const cartographic = Cartographic.fromRadians(
      lon,
      lat,
      alt,
      scratchBVCartographic
    );
    const decodedPosition = ellipsoid.cartographicToCartesian(
      cartographic,
      scratchEncodedPosition
    );
    Cartesian3.pack(decodedPosition, decoded, i * 3);
  }
  return decoded;
}
export default decodeVectorPolylinePositions;
