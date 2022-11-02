import AttributeCompression from "../Core/AttributeCompression.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import CesiumMath from "../Core/Math.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Rectangle from "../Core/Rectangle.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

const scratchCenter = new Cartesian3();
const scratchEllipsoid = new Ellipsoid();
const scratchRectangle = new Rectangle();
const scratchScalars = {
  min: undefined,
  max: undefined,
  indexBytesPerElement: undefined,
};

function unpackBuffer(buffer) {
  const packedBuffer = new Float64Array(buffer);

  let offset = 0;
  scratchScalars.indexBytesPerElement = packedBuffer[offset++];

  scratchScalars.min = packedBuffer[offset++];
  scratchScalars.max = packedBuffer[offset++];

  Cartesian3.unpack(packedBuffer, offset, scratchCenter);
  offset += Cartesian3.packedLength;

  Ellipsoid.unpack(packedBuffer, offset, scratchEllipsoid);
  offset += Ellipsoid.packedLength;

  Rectangle.unpack(packedBuffer, offset, scratchRectangle);
}

function packedBatchedIndicesLength(batchedIndices) {
  const length = batchedIndices.length;
  let count = 0;
  for (let i = 0; i < length; ++i) {
    count += Color.packedLength + 3 + batchedIndices[i].batchIds.length;
  }
  return count;
}

function packBuffer(indexDatatype, boundingVolumes, batchedIndices) {
  const numBVs = boundingVolumes.length;
  const length =
    1 +
    1 +
    numBVs * OrientedBoundingBox.packedLength +
    1 +
    packedBatchedIndicesLength(batchedIndices);

  const packedBuffer = new Float64Array(length);

  let offset = 0;
  packedBuffer[offset++] = indexDatatype;
  packedBuffer[offset++] = numBVs;

  for (let i = 0; i < numBVs; ++i) {
    OrientedBoundingBox.pack(boundingVolumes[i], packedBuffer, offset);
    offset += OrientedBoundingBox.packedLength;
  }

  const indicesLength = batchedIndices.length;
  packedBuffer[offset++] = indicesLength;

  for (let j = 0; j < indicesLength; ++j) {
    const batchedIndex = batchedIndices[j];

    Color.pack(batchedIndex.color, packedBuffer, offset);
    offset += Color.packedLength;

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

const maxShort = 32767;

const scratchEncodedPosition = new Cartesian3();
const scratchNormal = new Cartesian3();
const scratchScaledNormal = new Cartesian3();
const scratchMinHeightPosition = new Cartesian3();
const scratchMaxHeightPosition = new Cartesian3();
const scratchBVCartographic = new Cartographic();
const scratchBVRectangle = new Rectangle();

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
  if (defined(minimumHeights) && defined(maximumHeights)) {
    minimumHeights = new Float32Array(minimumHeights);
    maximumHeights = new Float32Array(maximumHeights);
  }

  let i;
  let j;
  let rgba;

  const positionsLength = positions.length / 2;
  const uBuffer = positions.subarray(0, positionsLength);
  const vBuffer = positions.subarray(positionsLength, 2 * positionsLength);
  AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer);

  const decodedPositions = new Float64Array(positionsLength * 3);
  for (i = 0; i < positionsLength; ++i) {
    const u = uBuffer[i];
    const v = vBuffer[i];

    const x = CesiumMath.lerp(rectangle.west, rectangle.east, u / maxShort);
    const y = CesiumMath.lerp(rectangle.south, rectangle.north, v / maxShort);

    const cart = Cartographic.fromRadians(x, y, 0.0, scratchBVCartographic);
    const decodedPosition = ellipsoid.cartographicToCartesian(
      cart,
      scratchEncodedPosition
    );
    Cartesian3.pack(decodedPosition, decodedPositions, i * 3);
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
    if (!defined(colorToBuffers[rgba])) {
      colorToBuffers[rgba] = {
        positionLength: counts[i],
        indexLength: indexCounts[i],
        offset: 0,
        indexOffset: 0,
        batchIds: [i],
      };
    } else {
      colorToBuffers[rgba].positionLength += counts[i];
      colorToBuffers[rgba].indexLength += indexCounts[i];
      colorToBuffers[rgba].batchIds.push(i);
    }
  }

  // get the offsets and counts for the positions and indices of each primitive
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
        color: Color.fromRgba(parseInt(rgba)),
        offset: buffer.indexOffset,
        count: buffer.indexLength,
        batchIds: buffer.batchIds,
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
    if (defined(minimumHeights) && defined(maximumHeights)) {
      polygonMinimumHeight = minimumHeights[i];
      polygonMaximumHeight = maximumHeights[i];
    }

    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let minLon = Number.POSITIVE_INFINITY;
    let maxLon = Number.NEGATIVE_INFINITY;

    for (j = 0; j < polygonCount; ++j) {
      const position = Cartesian3.unpack(
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
      let scaledNormal = Cartesian3.multiplyByScalar(
        normal,
        polygonMinimumHeight,
        scratchScaledNormal
      );
      const minHeightPosition = Cartesian3.add(
        position,
        scaledNormal,
        scratchMinHeightPosition
      );

      scaledNormal = Cartesian3.multiplyByScalar(
        normal,
        polygonMaximumHeight,
        scaledNormal
      );
      const maxHeightPosition = Cartesian3.add(
        position,
        scaledNormal,
        scratchMaxHeightPosition
      );

      Cartesian3.subtract(maxHeightPosition, center, maxHeightPosition);
      Cartesian3.subtract(minHeightPosition, center, minHeightPosition);

      Cartesian3.pack(maxHeightPosition, batchedPositions, positionIndex);
      Cartesian3.pack(minHeightPosition, batchedPositions, positionIndex + 3);

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

    boundingVolumes[i] = OrientedBoundingBox.fromRectangle(
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

      // triangle on the top of the extruded polygon
      batchedIndices[indicesIndex++] = i0 * 2 + positionOffset;
      batchedIndices[indicesIndex++] = i1 * 2 + positionOffset;
      batchedIndices[indicesIndex++] = i2 * 2 + positionOffset;

      // triangle on the bottom of the extruded polygon
      batchedIndices[indicesIndex++] = i2 * 2 + 1 + positionOffset;
      batchedIndices[indicesIndex++] = i1 * 2 + 1 + positionOffset;
      batchedIndices[indicesIndex++] = i0 * 2 + 1 + positionOffset;
    }

    // indices for the walls of the extruded polygon
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

  batchedIndices = IndexDatatype.createTypedArray(
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

  const indexDatatype =
    batchedIndices.BYTES_PER_ELEMENT === 2
      ? IndexDatatype.UNSIGNED_SHORT
      : IndexDatatype.UNSIGNED_INT;
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
    packedBuffer: packedBuffer.buffer,
  };
}
export default createTaskProcessorWorker(createVectorTilePolygons);
