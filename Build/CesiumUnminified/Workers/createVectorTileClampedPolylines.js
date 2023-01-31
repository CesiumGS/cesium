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

define(['./AttributeCompression-9ad7a83d', './Cartesian2-e7502022', './IndexDatatype-a6fe1d66', './Math-34872ab7', './createTaskProcessorWorker', './Check-24483042', './when-54335d57', './WebGLConstants-95ceb4e9'], function (AttributeCompression, Cartesian2, IndexDatatype, _Math, createTaskProcessorWorker, Check, when, WebGLConstants) { 'use strict';

  var MAX_SHORT = 32767;
  var MITER_BREAK = Math.cos(_Math.CesiumMath.toRadians(150.0));

  var scratchBVCartographic = new Cartesian2.Cartographic();
  var scratchEncodedPosition = new Cartesian2.Cartesian3();

  function decodePositionsToRtc(
    uBuffer,
    vBuffer,
    heightBuffer,
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid,
    center
  ) {
    var positionsLength = uBuffer.length;
    var decodedPositions = new Float32Array(positionsLength * 3);
    for (var i = 0; i < positionsLength; ++i) {
      var u = uBuffer[i];
      var v = vBuffer[i];
      var h = heightBuffer[i];

      var lon = _Math.CesiumMath.lerp(rectangle.west, rectangle.east, u / MAX_SHORT);
      var lat = _Math.CesiumMath.lerp(rectangle.south, rectangle.north, v / MAX_SHORT);
      var alt = _Math.CesiumMath.lerp(minimumHeight, maximumHeight, h / MAX_SHORT);

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
      var rtc = Cartesian2.Cartesian3.subtract(
        decodedPosition,
        center,
        scratchEncodedPosition
      );
      Cartesian2.Cartesian3.pack(rtc, decodedPositions, i * 3);
    }
    return decodedPositions;
  }

  var previousCompressedCartographicScratch = new Cartesian2.Cartographic();
  var currentCompressedCartographicScratch = new Cartesian2.Cartographic();
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

        if (Cartesian2.Cartographic.equals(current, previous)) {
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

    this.indices = IndexDatatype.IndexDatatype.createTypedArray(vertexCount, 36 * volumesCount);

    this.vec3Offset = 0;
    this.vec4Offset = 0;
    this.batchIdOffset = 0;
    this.indexOffset = 0;

    this.volumeStartIndex = 0;
  }

  var towardCurrScratch = new Cartesian2.Cartesian3();
  var towardNextScratch = new Cartesian2.Cartesian3();
  function computeMiteredNormal(
    previousPosition,
    position,
    nextPosition,
    ellipsoidSurfaceNormal,
    result
  ) {
    var towardNext = Cartesian2.Cartesian3.subtract(
      nextPosition,
      position,
      towardNextScratch
    );
    var towardCurr = Cartesian2.Cartesian3.subtract(
      position,
      previousPosition,
      towardCurrScratch
    );
    Cartesian2.Cartesian3.normalize(towardNext, towardNext);
    Cartesian2.Cartesian3.normalize(towardCurr, towardCurr);

    if (Cartesian2.Cartesian3.dot(towardNext, towardCurr) < MITER_BREAK) {
      towardCurr = Cartesian2.Cartesian3.multiplyByScalar(
        towardCurr,
        -1.0,
        towardCurrScratch
      );
    }

    Cartesian2.Cartesian3.add(towardNext, towardCurr, result);
    if (Cartesian2.Cartesian3.equals(result, Cartesian2.Cartesian3.ZERO)) {
      result = Cartesian2.Cartesian3.subtract(previousPosition, position);
    }

    // Make sure the normal is orthogonal to the ellipsoid surface normal
    Cartesian2.Cartesian3.cross(result, ellipsoidSurfaceNormal, result);
    Cartesian2.Cartesian3.cross(ellipsoidSurfaceNormal, result, result);
    Cartesian2.Cartesian3.normalize(result, result);
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

  var positionScratch = new Cartesian2.Cartesian3();
  var scratchStartEllipsoidNormal = new Cartesian2.Cartesian3();
  var scratchStartFaceNormal = new Cartesian2.Cartesian3();
  var scratchEndEllipsoidNormal = new Cartesian2.Cartesian3();
  var scratchEndFaceNormal = new Cartesian2.Cartesian3();
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
    var position = Cartesian2.Cartesian3.add(startRTC, center, positionScratch);
    var startEllipsoidNormal = ellipsoid.geodeticSurfaceNormal(
      position,
      scratchStartEllipsoidNormal
    );
    position = Cartesian2.Cartesian3.add(endRTC, center, positionScratch);
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
      Cartesian2.Cartesian3.pack(startEllipsoidNormal, startEllipsoidNormals, vec3Offset);
      Cartesian2.Cartesian3.pack(endEllipsoidNormal, endEllipsoidNormals, vec3Offset);

      Cartesian2.Cartesian3.pack(startRTC, startPositionAndHeights, vec4Offset);
      startPositionAndHeights[vec4Offset + 3] = startHeight;

      Cartesian2.Cartesian3.pack(endRTC, endPositionAndHeights, vec4Offset);
      endPositionAndHeights[vec4Offset + 3] = endHeight;

      Cartesian2.Cartesian3.pack(
        startFaceNormal,
        startFaceNormalAndVertexCornerIds,
        vec4Offset
      );
      startFaceNormalAndVertexCornerIds[vec4Offset + 3] = i;

      Cartesian2.Cartesian3.pack(endFaceNormal, endFaceNormalAndHalfWidths, vec4Offset);
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

  var scratchRectangle = new Cartesian2.Rectangle();
  var scratchEllipsoid = new Cartesian2.Ellipsoid();
  var scratchCenter = new Cartesian2.Cartesian3();

  var scratchPrev = new Cartesian2.Cartesian3();
  var scratchP0 = new Cartesian2.Cartesian3();
  var scratchP1 = new Cartesian2.Cartesian3();
  var scratchNext = new Cartesian2.Cartesian3();
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

    Cartesian2.Rectangle.unpack(packedBuffer, offset, rectangle);
    offset += Cartesian2.Rectangle.packedLength;

    Cartesian2.Ellipsoid.unpack(packedBuffer, offset, ellipsoid);
    offset += Cartesian2.Ellipsoid.packedLength;

    Cartesian2.Cartesian3.unpack(packedBuffer, offset, center);

    var i;

    // Unpack positions and generate volumes
    var positionsLength = encodedPositions.length / 3;
    var uBuffer = encodedPositions.subarray(0, positionsLength);
    var vBuffer = encodedPositions.subarray(positionsLength, 2 * positionsLength);
    var heightBuffer = encodedPositions.subarray(
      2 * positionsLength,
      3 * positionsLength
    );
    AttributeCompression.AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);

    removeDuplicates(uBuffer, vBuffer, heightBuffer, counts);

    // Figure out how many volumes and how many vertices there will be.
    var countsLength = counts.length;
    var volumesCount = 0;
    for (i = 0; i < countsLength; i++) {
      var polylinePositionCount = counts[i];
      volumesCount += polylinePositionCount - 1;
    }

    var attribsAndIndices = new VertexAttributesAndIndices(volumesCount);

    var positionsRTC = decodePositionsToRtc(
      uBuffer,
      vBuffer,
      heightBuffer,
      rectangle,
      minimumHeight,
      maximumHeight,
      ellipsoid,
      center
    );

    var currentPositionIndex = 0;
    var currentHeightIndex = 0;
    for (i = 0; i < countsLength; i++) {
      var polylineVolumeCount = counts[i] - 1;
      var halfWidth = widths[i] * 0.5;
      var batchId = batchIds[i];
      var volumeFirstPositionIndex = currentPositionIndex;
      for (var j = 0; j < polylineVolumeCount; j++) {
        var volumeStart = Cartesian2.Cartesian3.unpack(
          positionsRTC,
          currentPositionIndex,
          scratchP0
        );
        var volumeEnd = Cartesian2.Cartesian3.unpack(
          positionsRTC,
          currentPositionIndex + 3,
          scratchP1
        );

        var startHeight = heightBuffer[currentHeightIndex];
        var endHeight = heightBuffer[currentHeightIndex + 1];
        startHeight = _Math.CesiumMath.lerp(
          minimumHeight,
          maximumHeight,
          startHeight / MAX_SHORT
        );
        endHeight = _Math.CesiumMath.lerp(
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
          var finalPosition = Cartesian2.Cartesian3.unpack(
            positionsRTC,
            finalPositionIndex,
            scratchPrev
          );
          if (Cartesian2.Cartesian3.equals(finalPosition, volumeStart)) {
            Cartesian2.Cartesian3.unpack(positionsRTC, finalPositionIndex - 3, preStart);
          } else {
            var offsetPastStart = Cartesian2.Cartesian3.subtract(
              volumeStart,
              volumeEnd,
              scratchPrev
            );
            preStart = Cartesian2.Cartesian3.add(offsetPastStart, volumeStart, scratchPrev);
          }
        } else {
          Cartesian2.Cartesian3.unpack(positionsRTC, currentPositionIndex - 3, preStart);
        }

        if (j === polylineVolumeCount - 1) {
          // Check if this volume is like a loop
          var firstPosition = Cartesian2.Cartesian3.unpack(
            positionsRTC,
            volumeFirstPositionIndex,
            scratchNext
          );
          if (Cartesian2.Cartesian3.equals(firstPosition, volumeEnd)) {
            Cartesian2.Cartesian3.unpack(
              positionsRTC,
              volumeFirstPositionIndex + 3,
              postEnd
            );
          } else {
            var offsetPastEnd = Cartesian2.Cartesian3.subtract(
              volumeEnd,
              volumeStart,
              scratchNext
            );
            postEnd = Cartesian2.Cartesian3.add(offsetPastEnd, volumeEnd, scratchNext);
          }
        } else {
          Cartesian2.Cartesian3.unpack(positionsRTC, currentPositionIndex + 6, postEnd);
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

    return {
      indexDatatype:
        indices.BYTES_PER_ELEMENT === 2
          ? IndexDatatype.IndexDatatype.UNSIGNED_SHORT
          : IndexDatatype.IndexDatatype.UNSIGNED_INT,
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
  }
  var createVectorTileClampedPolylines$1 = createTaskProcessorWorker(createVectorTileClampedPolylines);

  return createVectorTileClampedPolylines$1;

});
//# sourceMappingURL=createVectorTileClampedPolylines.js.map
