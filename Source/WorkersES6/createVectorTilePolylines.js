import Cartesian3 from "../Core/Cartesian3.js";
import combine from "../Core/combine.js";
import decodeVectorPolylinePositions from "../Core/decodeVectorPolylinePositions.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Rectangle from "../Core/Rectangle.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

var scratchRectangle = new Rectangle();
var scratchEllipsoid = new Ellipsoid();
var scratchCenter = new Cartesian3();
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
  offset += Ellipsoid.packedLength;

  Cartesian3.unpack(packedBuffer, offset, scratchCenter);
}

function getPositionOffsets(counts) {
  var countsLength = counts.length;
  var positionOffsets = new Uint32Array(countsLength + 1);
  var offset = 0;
  for (var i = 0; i < countsLength; ++i) {
    positionOffsets[i] = offset;
    offset += counts[i];
  }
  positionOffsets[countsLength] = offset;
  return positionOffsets;
}

var scratchP0 = new Cartesian3();
var scratchP1 = new Cartesian3();
var scratchPrev = new Cartesian3();
var scratchCur = new Cartesian3();
var scratchNext = new Cartesian3();

function createVectorTilePolylines(parameters, transferableObjects) {
  var encodedPositions = new Uint16Array(parameters.positions);
  var widths = new Uint16Array(parameters.widths);
  var counts = new Uint32Array(parameters.counts);
  var batchIds = new Uint16Array(parameters.batchIds);

  unpackBuffer(parameters.packedBuffer);
  var rectangle = scratchRectangle;
  var ellipsoid = scratchEllipsoid;
  var center = scratchCenter;
  var minimumHeight = scratchMinMaxHeights.min;
  var maximumHeight = scratchMinMaxHeights.max;

  var positions = decodeVectorPolylinePositions(
    encodedPositions,
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid
  );

  var positionsLength = positions.length / 3;
  var size = positionsLength * 4 - 4;

  var curPositions = new Float32Array(size * 3);
  var prevPositions = new Float32Array(size * 3);
  var nextPositions = new Float32Array(size * 3);
  var expandAndWidth = new Float32Array(size * 2);
  var vertexBatchIds = new Uint16Array(size);

  var positionIndex = 0;
  var expandAndWidthIndex = 0;
  var batchIdIndex = 0;

  var i;
  var offset = 0;
  var length = counts.length;

  for (i = 0; i < length; ++i) {
    var count = counts[i];
    var width = widths[i];
    var batchId = batchIds[i];

    for (var j = 0; j < count; ++j) {
      var previous;
      if (j === 0) {
        var p0 = Cartesian3.unpack(positions, offset * 3, scratchP0);
        var p1 = Cartesian3.unpack(positions, (offset + 1) * 3, scratchP1);

        previous = Cartesian3.subtract(p0, p1, scratchPrev);
        Cartesian3.add(p0, previous, previous);
      } else {
        previous = Cartesian3.unpack(
          positions,
          (offset + j - 1) * 3,
          scratchPrev
        );
      }

      var current = Cartesian3.unpack(positions, (offset + j) * 3, scratchCur);

      var next;
      if (j === count - 1) {
        var p2 = Cartesian3.unpack(
          positions,
          (offset + count - 1) * 3,
          scratchP0
        );
        var p3 = Cartesian3.unpack(
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

      var startK = j === 0 ? 2 : 0;
      var endK = j === count - 1 ? 2 : 4;

      for (var k = startK; k < endK; ++k) {
        Cartesian3.pack(current, curPositions, positionIndex);
        Cartesian3.pack(previous, prevPositions, positionIndex);
        Cartesian3.pack(next, nextPositions, positionIndex);
        positionIndex += 3;

        var direction = k - 2 < 0 ? -1.0 : 1.0;
        expandAndWidth[expandAndWidthIndex++] = 2 * (k % 2) - 1;
        expandAndWidth[expandAndWidthIndex++] = direction * width;

        vertexBatchIds[batchIdIndex++] = batchId;
      }
    }

    offset += count;
  }

  var indices = IndexDatatype.createTypedArray(size, positionsLength * 6 - 6);
  var index = 0;
  var indicesIndex = 0;
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

  var results = {
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
    var positionOffsets = getPositionOffsets(counts);
    transferableObjects.push(positions.buffer, positionOffsets.buffer);
    results = combine(results, {
      decodedPositions: positions.buffer,
      decodedPositionOffsets: positionOffsets.buffer,
    });
  }

  return results;
}
export default createTaskProcessorWorker(createVectorTilePolylines);
