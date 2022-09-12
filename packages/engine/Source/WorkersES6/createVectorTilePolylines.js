import Cartesian3 from "../Core/Cartesian3.js";
import combine from "../Core/combine.js";
import decodeVectorPolylinePositions from "../Core/decodeVectorPolylinePositions.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Rectangle from "../Core/Rectangle.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

const scratchRectangle = new Rectangle();
const scratchEllipsoid = new Ellipsoid();
const scratchCenter = new Cartesian3();
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
  offset += Ellipsoid.packedLength;

  Cartesian3.unpack(packedBuffer, offset, scratchCenter);
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

const scratchP0 = new Cartesian3();
const scratchP1 = new Cartesian3();
const scratchPrev = new Cartesian3();
const scratchCur = new Cartesian3();
const scratchNext = new Cartesian3();

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

  const positions = decodeVectorPolylinePositions(
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
        const p0 = Cartesian3.unpack(positions, offset * 3, scratchP0);
        const p1 = Cartesian3.unpack(positions, (offset + 1) * 3, scratchP1);

        previous = Cartesian3.subtract(p0, p1, scratchPrev);
        Cartesian3.add(p0, previous, previous);
      } else {
        previous = Cartesian3.unpack(
          positions,
          (offset + j - 1) * 3,
          scratchPrev
        );
      }

      const current = Cartesian3.unpack(
        positions,
        (offset + j) * 3,
        scratchCur
      );

      let next;
      if (j === count - 1) {
        const p2 = Cartesian3.unpack(
          positions,
          (offset + count - 1) * 3,
          scratchP0
        );
        const p3 = Cartesian3.unpack(
          positions,
          (offset + count - 2) * 3,
          scratchP1
        );

        next = Cartesian3.subtract(p2, p3, scratchNext);
        Cartesian3.add(p2, next, next);
      } else {
        next = Cartesian3.unpack(positions, (offset + j + 1) * 3, scratchNext);
      }

      Cartesian3.subtract(previous, center, previous);
      Cartesian3.subtract(current, center, current);
      Cartesian3.subtract(next, center, next);

      const startK = j === 0 ? 2 : 0;
      const endK = j === count - 1 ? 2 : 4;

      for (let k = startK; k < endK; ++k) {
        Cartesian3.pack(current, curPositions, positionIndex);
        Cartesian3.pack(previous, prevPositions, positionIndex);
        Cartesian3.pack(next, nextPositions, positionIndex);
        positionIndex += 3;

        const direction = k - 2 < 0 ? -1.0 : 1.0;
        expandAndWidth[expandAndWidthIndex++] = 2 * (k % 2) - 1;
        expandAndWidth[expandAndWidthIndex++] = direction * width;

        vertexBatchIds[batchIdIndex++] = batchId;
      }
    }

    offset += count;
  }

  const indices = IndexDatatype.createTypedArray(size, positionsLength * 6 - 6);
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
    indexDatatype:
      indices.BYTES_PER_ELEMENT === 2
        ? IndexDatatype.UNSIGNED_SHORT
        : IndexDatatype.UNSIGNED_INT,
    currentPositions: curPositions.buffer,
    previousPositions: prevPositions.buffer,
    nextPositions: nextPositions.buffer,
    expandAndWidth: expandAndWidth.buffer,
    batchIds: vertexBatchIds.buffer,
    indices: indices.buffer,
  };

  if (parameters.keepDecodedPositions) {
    const positionOffsets = getPositionOffsets(counts);
    transferableObjects.push(positions.buffer, positionOffsets.buffer);
    results = combine(results, {
      decodedPositions: positions.buffer,
      decodedPositionOffsets: positionOffsets.buffer,
    });
  }

  return results;
}
export default createTaskProcessorWorker(createVectorTilePolylines);
