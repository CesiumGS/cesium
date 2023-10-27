import AttributeCompression from "../Core/AttributeCompression.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import CesiumMath from "../Core/Math.js";
import Rectangle from "../Core/Rectangle.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

const maxShort = 32767;

const scratchBVCartographic = new Cartographic();
const scratchEncodedPosition = new Cartesian3();

const scratchRectangle = new Rectangle();
const scratchEllipsoid = new Ellipsoid();
const scratchMinMaxHeights = {
  min: undefined,
  max: undefined,
};

function unpackBuffer(packedBuffer) {
  packedBuffer = new Float64Array(packedBuffer);

  let offset = 0;
  scratchMinMaxHeights.min = packedBuffer[offset++];
  scratchMinMaxHeights.max = packedBuffer[offset++];

  Rectangle.unpack(packedBuffer, offset, scratchRectangle);
  offset += Rectangle.packedLength;

  Ellipsoid.unpack(packedBuffer, offset, scratchEllipsoid);
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

  transferableObjects.push(decoded.buffer);

  return {
    positions: decoded.buffer,
  };
}
export default createTaskProcessorWorker(createVectorTilePoints);
