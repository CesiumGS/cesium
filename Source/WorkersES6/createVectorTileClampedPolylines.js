import AttributeCompression from "../Core/AttributeCompression.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import combine from "../Core/combine.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import CesiumMath from "../Core/Math.js";
import Rectangle from "../Core/Rectangle.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

var MAX_SHORT = 32767;
var MITER_BREAK = Math.cos(CesiumMath.toRadians(150.0));

var scratchBVCartographic = new Cartographic();
var scratchEncodedPosition = new Cartesian3();

function decodePositions(
  uBuffer,
  vBuffer,
  heightBuffer,
  rectangle,
  minimumHeight,
  maximumHeight,
  ellipsoid
) {
  var positionsLength = uBuffer.length;
  var decodedPositions = new Float64Array(positionsLength * 3);
  for (var i = 0; i < positionsLength; ++i) {
    var u = uBuffer[i];
    var v = vBuffer[i];
    var h = heightBuffer[i];

    var lon = CesiumMath.lerp(rectangle.west, rectangle.east, u / MAX_SHORT);
    var lat = CesiumMath.lerp(rectangle.south, rectangle.north, v / MAX_SHORT);
    var alt = CesiumMath.lerp(minimumHeight, maximumHeight, h / MAX_SHORT);

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
    Cartesian3.pack(decodedPosition, decodedPositions, i * 3);
  }
  return decodedPositions;
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

var previousCompressedCartographicScratch = new Cartographic();
var currentCompressedCartographicScratch = new Cartographic();
function removeDuplicates(uBuffer, vBuffer, heightBuffer, counts) {
  var countsLength = counts.length;
  var positionsLength = uBuffer.length;
  var markRemoval = new Uint8Array(positionsLength);
  var previous = previousCompressedCartographicScratch;
  var current = currentCompressedCartographicScratch;
  var offset = 0;
  for (var i = 0; i < countsLength; i++) {
    var count = counts[i];
    var updatedCount = count;
    for (var j = 1; j < count; j++) {
      var index = offset + j;
      var previousIndex = index - 1;
      current.longitude = uBuffer[index];
      current.latitude = vBuffer[index];
      previous.longitude = uBuffer[previousIndex];
      previous.latitude = vBuffer[previousIndex];

      if (Cartographic.equals(current, previous)) {
        updatedCount--;
        markRemoval[previousIndex] = 1;
      }
    }
    counts[i] = updatedCount;
    offset += count;
  }

  var nextAvailableIndex = 0;
  for (var k = 0; k < positionsLength; k++) {
    if (markRemoval[k] !== 1) {
      uBuffer[nextAvailableIndex] = uBuffer[k];
      vBuffer[nextAvailableIndex] = vBuffer[k];
      heightBuffer[nextAvailableIndex] = heightBuffer[k];
      nextAvailableIndex++;
    }
  }
}

function VertexAttributesAndIndices(volumesCount) {
  var vertexCount = volumesCount * 8;
  var vec3Floats = vertexCount * 3;
  var vec4Floats = vertexCount * 4;
  this.startEllipsoidNormals = new Float32Array(vec3Floats);
  this.endEllipsoidNormals = new Float32Array(vec3Floats);
  this.startPositionAndHeights = new Float32Array(vec4Floats);
  this.startFaceNormalAndVertexCornerIds = new Float32Array(vec4Floats);
  this.endPositionAndHeights = new Float32Array(vec4Floats);
  this.endFaceNormalAndHalfWidths = new Float32Array(vec4Floats);
  this.vertexBatchIds = new Uint16Array(vertexCount);

  this.indices = IndexDatatype.createTypedArray(vertexCount, 36 * volumesCount);

  this.vec3Offset = 0;
  this.vec4Offset = 0;
  this.batchIdOffset = 0;
  this.indexOffset = 0;

  this.volumeStartIndex = 0;
}

var towardCurrScratch = new Cartesian3();
var towardNextScratch = new Cartesian3();
function computeMiteredNormal(
  previousPosition,
  position,
  nextPosition,
  ellipsoidSurfaceNormal,
  result
) {
  var towardNext = Cartesian3.subtract(
    nextPosition,
    position,
    towardNextScratch
  );
  var towardCurr = Cartesian3.subtract(
    position,
    previousPosition,
    towardCurrScratch
  );
  Cartesian3.normalize(towardNext, towardNext);
  Cartesian3.normalize(towardCurr, towardCurr);

  if (Cartesian3.dot(towardNext, towardCurr) < MITER_BREAK) {
    towardCurr = Cartesian3.multiplyByScalar(
      towardCurr,
      -1.0,
      towardCurrScratch
    );
  }

  Cartesian3.add(towardNext, towardCurr, result);
  if (Cartesian3.equals(result, Cartesian3.ZERO)) {
    result = Cartesian3.subtract(previousPosition, position);
  }

  // Make sure the normal is orthogonal to the ellipsoid surface normal
  Cartesian3.cross(result, ellipsoidSurfaceNormal, result);
  Cartesian3.cross(ellipsoidSurfaceNormal, result, result);
  Cartesian3.normalize(result, result);
  return result;
}

// Winding order is reversed so each segment's volume is inside-out
//          3-----------7
//         /|   left   /|
//        / | 1       / |
//       2-----------6  5  end
//       | /         | /
// start |/  right   |/
//       0-----------4
//
var REFERENCE_INDICES = [
  0,
  2,
  6,
  0,
  6,
  4, // right
  0,
  1,
  3,
  0,
  3,
  2, // start face
  0,
  4,
  5,
  0,
  5,
  1, // bottom
  5,
  3,
  1,
  5,
  7,
  3, // left
  7,
  5,
  4,
  7,
  4,
  6, // end face
  7,
  6,
  2,
  7,
  2,
  3, // top
];
var REFERENCE_INDICES_LENGTH = REFERENCE_INDICES.length;

var positionScratch = new Cartesian3();
var scratchStartEllipsoidNormal = new Cartesian3();
var scratchStartFaceNormal = new Cartesian3();
var scratchEndEllipsoidNormal = new Cartesian3();
var scratchEndFaceNormal = new Cartesian3();
VertexAttributesAndIndices.prototype.addVolume = function (
  preStartRTC,
  startRTC,
  endRTC,
  postEndRTC,
  startHeight,
  endHeight,
  halfWidth,
  batchId,
  center,
  ellipsoid
) {
  var position = Cartesian3.add(startRTC, center, positionScratch);
  var startEllipsoidNormal = ellipsoid.geodeticSurfaceNormal(
    position,
    scratchStartEllipsoidNormal
  );
  position = Cartesian3.add(endRTC, center, positionScratch);
  var endEllipsoidNormal = ellipsoid.geodeticSurfaceNormal(
    position,
    scratchEndEllipsoidNormal
  );

  var startFaceNormal = computeMiteredNormal(
    preStartRTC,
    startRTC,
    endRTC,
    startEllipsoidNormal,
    scratchStartFaceNormal
  );
  var endFaceNormal = computeMiteredNormal(
    postEndRTC,
    endRTC,
    startRTC,
    endEllipsoidNormal,
    scratchEndFaceNormal
  );

  var startEllipsoidNormals = this.startEllipsoidNormals;
  var endEllipsoidNormals = this.endEllipsoidNormals;
  var startPositionAndHeights = this.startPositionAndHeights;
  var startFaceNormalAndVertexCornerIds = this
    .startFaceNormalAndVertexCornerIds;
  var endPositionAndHeights = this.endPositionAndHeights;
  var endFaceNormalAndHalfWidths = this.endFaceNormalAndHalfWidths;
  var vertexBatchIds = this.vertexBatchIds;

  var batchIdOffset = this.batchIdOffset;
  var vec3Offset = this.vec3Offset;
  var vec4Offset = this.vec4Offset;

  var i;
  for (i = 0; i < 8; i++) {
    Cartesian3.pack(startEllipsoidNormal, startEllipsoidNormals, vec3Offset);
    Cartesian3.pack(endEllipsoidNormal, endEllipsoidNormals, vec3Offset);

    Cartesian3.pack(startRTC, startPositionAndHeights, vec4Offset);
    startPositionAndHeights[vec4Offset + 3] = startHeight;

    Cartesian3.pack(endRTC, endPositionAndHeights, vec4Offset);
    endPositionAndHeights[vec4Offset + 3] = endHeight;

    Cartesian3.pack(
      startFaceNormal,
      startFaceNormalAndVertexCornerIds,
      vec4Offset
    );
    startFaceNormalAndVertexCornerIds[vec4Offset + 3] = i;

    Cartesian3.pack(endFaceNormal, endFaceNormalAndHalfWidths, vec4Offset);
    endFaceNormalAndHalfWidths[vec4Offset + 3] = halfWidth;

    vertexBatchIds[batchIdOffset++] = batchId;

    vec3Offset += 3;
    vec4Offset += 4;
  }

  this.batchIdOffset = batchIdOffset;
  this.vec3Offset = vec3Offset;
  this.vec4Offset = vec4Offset;
  var indices = this.indices;
  var volumeStartIndex = this.volumeStartIndex;

  var indexOffset = this.indexOffset;
  for (i = 0; i < REFERENCE_INDICES_LENGTH; i++) {
    indices[indexOffset + i] = REFERENCE_INDICES[i] + volumeStartIndex;
  }

  this.volumeStartIndex += 8;
  this.indexOffset += REFERENCE_INDICES_LENGTH;
};

var scratchRectangle = new Rectangle();
var scratchEllipsoid = new Ellipsoid();
var scratchCenter = new Cartesian3();

var scratchPrev = new Cartesian3();
var scratchP0 = new Cartesian3();
var scratchP1 = new Cartesian3();
var scratchNext = new Cartesian3();
function createVectorTileClampedPolylines(parameters, transferableObjects) {
  var encodedPositions = new Uint16Array(parameters.positions);
  var widths = new Uint16Array(parameters.widths);
  var counts = new Uint32Array(parameters.counts);
  var batchIds = new Uint16Array(parameters.batchIds);

  // Unpack tile decoding parameters
  var rectangle = scratchRectangle;
  var ellipsoid = scratchEllipsoid;
  var center = scratchCenter;
  var packedBuffer = new Float64Array(parameters.packedBuffer);

  var offset = 0;
  var minimumHeight = packedBuffer[offset++];
  var maximumHeight = packedBuffer[offset++];

  Rectangle.unpack(packedBuffer, offset, rectangle);
  offset += Rectangle.packedLength;

  Ellipsoid.unpack(packedBuffer, offset, ellipsoid);
  offset += Ellipsoid.packedLength;

  Cartesian3.unpack(packedBuffer, offset, center);

  var i;

  // Unpack positions and generate volumes
  var positionsLength = encodedPositions.length / 3;
  var uBuffer = encodedPositions.subarray(0, positionsLength);
  var vBuffer = encodedPositions.subarray(positionsLength, 2 * positionsLength);
  var heightBuffer = encodedPositions.subarray(
    2 * positionsLength,
    3 * positionsLength
  );
  AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);

  removeDuplicates(uBuffer, vBuffer, heightBuffer, counts);

  // Figure out how many volumes and how many vertices there will be.
  var countsLength = counts.length;
  var volumesCount = 0;
  for (i = 0; i < countsLength; i++) {
    var polylinePositionCount = counts[i];
    volumesCount += polylinePositionCount - 1;
  }

  var attribsAndIndices = new VertexAttributesAndIndices(volumesCount);

  var positions = decodePositions(
    uBuffer,
    vBuffer,
    heightBuffer,
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid,
    center
  );

  positionsLength = uBuffer.length;
  var positionsRTC = new Float32Array(positionsLength * 3);
  for (i = 0; i < positionsLength; ++i) {
    positionsRTC[i * 3] = positions[i * 3] - center.x;
    positionsRTC[i * 3 + 1] = positions[i * 3 + 1] - center.y;
    positionsRTC[i * 3 + 2] = positions[i * 3 + 2] - center.z;
  }

  var currentPositionIndex = 0;
  var currentHeightIndex = 0;
  for (i = 0; i < countsLength; i++) {
    var polylineVolumeCount = counts[i] - 1;
    var halfWidth = widths[i] * 0.5;
    var batchId = batchIds[i];
    var volumeFirstPositionIndex = currentPositionIndex;
    for (var j = 0; j < polylineVolumeCount; j++) {
      var volumeStart = Cartesian3.unpack(
        positionsRTC,
        currentPositionIndex,
        scratchP0
      );
      var volumeEnd = Cartesian3.unpack(
        positionsRTC,
        currentPositionIndex + 3,
        scratchP1
      );

      var startHeight = heightBuffer[currentHeightIndex];
      var endHeight = heightBuffer[currentHeightIndex + 1];
      startHeight = CesiumMath.lerp(
        minimumHeight,
        maximumHeight,
        startHeight / MAX_SHORT
      );
      endHeight = CesiumMath.lerp(
        minimumHeight,
        maximumHeight,
        endHeight / MAX_SHORT
      );

      currentHeightIndex++;

      var preStart = scratchPrev;
      var postEnd = scratchNext;
      if (j === 0) {
        // Check if this volume is like a loop
        var finalPositionIndex =
          volumeFirstPositionIndex + polylineVolumeCount * 3;
        var finalPosition = Cartesian3.unpack(
          positionsRTC,
          finalPositionIndex,
          scratchPrev
        );
        if (Cartesian3.equals(finalPosition, volumeStart)) {
          Cartesian3.unpack(positionsRTC, finalPositionIndex - 3, preStart);
        } else {
          var offsetPastStart = Cartesian3.subtract(
            volumeStart,
            volumeEnd,
            scratchPrev
          );
          preStart = Cartesian3.add(offsetPastStart, volumeStart, scratchPrev);
        }
      } else {
        Cartesian3.unpack(positionsRTC, currentPositionIndex - 3, preStart);
      }

      if (j === polylineVolumeCount - 1) {
        // Check if this volume is like a loop
        var firstPosition = Cartesian3.unpack(
          positionsRTC,
          volumeFirstPositionIndex,
          scratchNext
        );
        if (Cartesian3.equals(firstPosition, volumeEnd)) {
          Cartesian3.unpack(
            positionsRTC,
            volumeFirstPositionIndex + 3,
            postEnd
          );
        } else {
          var offsetPastEnd = Cartesian3.subtract(
            volumeEnd,
            volumeStart,
            scratchNext
          );
          postEnd = Cartesian3.add(offsetPastEnd, volumeEnd, scratchNext);
        }
      } else {
        Cartesian3.unpack(positionsRTC, currentPositionIndex + 6, postEnd);
      }

      attribsAndIndices.addVolume(
        preStart,
        volumeStart,
        volumeEnd,
        postEnd,
        startHeight,
        endHeight,
        halfWidth,
        batchId,
        center,
        ellipsoid
      );

      currentPositionIndex += 3;
    }
    currentPositionIndex += 3;
    currentHeightIndex++;
  }

  var indices = attribsAndIndices.indices;

  transferableObjects.push(attribsAndIndices.startEllipsoidNormals.buffer);
  transferableObjects.push(attribsAndIndices.endEllipsoidNormals.buffer);
  transferableObjects.push(attribsAndIndices.startPositionAndHeights.buffer);
  transferableObjects.push(
    attribsAndIndices.startFaceNormalAndVertexCornerIds.buffer
  );
  transferableObjects.push(attribsAndIndices.endPositionAndHeights.buffer);
  transferableObjects.push(attribsAndIndices.endFaceNormalAndHalfWidths.buffer);
  transferableObjects.push(attribsAndIndices.vertexBatchIds.buffer);
  transferableObjects.push(indices.buffer);

  var results = {
    indexDatatype:
      indices.BYTES_PER_ELEMENT === 2
        ? IndexDatatype.UNSIGNED_SHORT
        : IndexDatatype.UNSIGNED_INT,
    startEllipsoidNormals: attribsAndIndices.startEllipsoidNormals.buffer,
    endEllipsoidNormals: attribsAndIndices.endEllipsoidNormals.buffer,
    startPositionAndHeights: attribsAndIndices.startPositionAndHeights.buffer,
    startFaceNormalAndVertexCornerIds:
      attribsAndIndices.startFaceNormalAndVertexCornerIds.buffer,
    endPositionAndHeights: attribsAndIndices.endPositionAndHeights.buffer,
    endFaceNormalAndHalfWidths:
      attribsAndIndices.endFaceNormalAndHalfWidths.buffer,
    vertexBatchIds: attribsAndIndices.vertexBatchIds.buffer,
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
export default createTaskProcessorWorker(createVectorTileClampedPolylines);
