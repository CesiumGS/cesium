/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle',
        '../Core/TranslationRotationScale',
        './createTaskProcessorWorker'
    ], function(
        Cartesian3,
        Cartographic,
        Color,
        defined,
        Ellipsoid,
        IndexDatatype,
        CesiumMath,
        Matrix4,
        OrientedBoundingBox,
        Rectangle,
        TranslationRotationScale,
        createTaskProcessorWorker) {
    'use strict';

    //var scratchQuantizedOffset = new Cartesian3();
    //var scratchQuantizedScale = new Cartesian3();
    var scratchCenter = new Cartesian3();
    var scratchEllipsoid = new Ellipsoid();
    var scratchRectangle = new Rectangle();
    var scratchHeights = {
        min : undefined,
        max : undefined
    };

    function unpackBuffer(buffer) {
        var packedBuffer = new Float64Array(buffer);

        var offset = 0;
        scratchHeights.min = packedBuffer[offset++];
        scratchHeights.max = packedBuffer[offset++];

        //Cartesian3.unpack(packedBuffer, offset, scratchQuantizedOffset);
        //offset += Cartesian3.packedLength;

        //Cartesian3.unpack(packedBuffer, offset, scratchQuantizedScale);
        //offset += Cartesian3.packedLength;

        Cartesian3.unpack(packedBuffer, offset, scratchCenter);
        offset += Cartesian3.packedLength;

        Ellipsoid.unpack(packedBuffer, offset, scratchEllipsoid);
        offset += Ellipsoid.packedLength;

        Rectangle.unpack(packedBuffer, offset, scratchRectangle);
    }

    function packedBatchedIndicesLength(batchedIndices) {
        var length = batchedIndices.length;
        var count = 0;
        for (var i = 0; i < length; ++i) {
            count += Color.packedLength + 3 + batchedIndices[i].batchIds.length;
        }
        return count;
    }

    function packBuffer(indexDatatype, boundingVolumes, batchedIndices) {
        var numBVs = boundingVolumes.length;
        var length = 1 + 1 + numBVs * OrientedBoundingBox.packedLength + 1 + packedBatchedIndicesLength(batchedIndices);

        var packedBuffer = new Float64Array(length);

        var offset = 0;
        packedBuffer[offset++] = indexDatatype;
        packedBuffer[offset++] = numBVs;

        for (var i = 0; i < numBVs; ++i) {
            OrientedBoundingBox.pack(boundingVolumes[i], packedBuffer, offset);
            offset += OrientedBoundingBox.packedLength;
        }

        var indicesLength = batchedIndices.length;
        packedBuffer[offset++] = indicesLength;

        for (var j = 0; j < indicesLength; ++j) {
            var batchedIndex = batchedIndices[j];

            Color.pack(batchedIndex.color, packedBuffer, offset);
            offset += Color.packedLength;

            packedBuffer[offset++] = batchedIndex.offset;
            packedBuffer[offset++] = batchedIndex.count;

            var batchIds = batchedIndex.batchIds;
            var batchIdsLength = batchIds.length;
            packedBuffer[offset++] = batchIdsLength;

            for (var k = 0; k < batchIdsLength; ++k) {
                packedBuffer[offset++] = batchIds[k];
            }
        }

        return packedBuffer;
    }

    function zigZagDecode(value) {
        return (value >> 1) ^ (-(value & 1));
    }

    var maxShort = 32767;

    //var scratchDecodeMatrix = new Matrix4();
    var scratchEncodedPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchScaledNormal = new Cartesian3();
    var scratchMinHeightPosition = new Cartesian3();
    var scratchMaxHeightPosition = new Cartesian3();
    var scratchBVCartographic = new Cartographic();
    var scratchBVRectangle = new Rectangle();

    function createVerticesFromVectorTile(parameters, transferableObjects) {
        //var positions = parameters.positions;
        var positions = new Uint16Array(parameters.positions);
        var counts = new Uint32Array(parameters.counts);
        var indexCounts = new Uint32Array(parameters.indexCounts);
        var indices = new Uint32Array(parameters.indices);
        var batchIds = new Uint32Array(parameters.batchIds);
        var batchTableColors = new Uint32Array(parameters.batchTableColors);

        var boundingVolumes = new Array(counts.length);

        unpackBuffer(parameters.packedBuffer);

        //var quantizedOffset = scratchQuantizedOffset;
        //var quantizedScale = scratchQuantizedScale;
        var center = scratchCenter;
        var ellipsoid = scratchEllipsoid;
        var rectangle = scratchRectangle;
        var minHeight = scratchHeights.min;
        var maxHeight = scratchHeights.max;

        /*
        var decodeMatrix;
        if (defined(quantizedOffset) && defined(quantizedScale)) {
            decodeMatrix = Matrix4.fromTranslationRotationScale(new TranslationRotationScale(quantizedOffset, undefined, quantizedScale), scratchDecodeMatrix);
            positions = new Uint16Array(positions);
        } else {
            decodeMatrix = Matrix4.IDENTITY;
            positions = new Float32Array(positions);
        }
        */

        var i;
        var j;
        var rgba;

        var positionsLength = positions.length / 2;
        var decodedPositions = new Float32Array(positionsLength * 3);
        var u = 0;
        var v = 0;
        for (i = 0; i < positionsLength; ++i) {
            u += zigZagDecode(positions[i]);
            v += zigZagDecode(positions[i + positionsLength]);

            lon = CesiumMath.lerp(rectangle.west, rectangle.east, u / maxShort);
            lat = CesiumMath.lerp(rectangle.south, rectangle.north, v / maxShort);

            var cartographic = Cartographic.fromRadians(lon, lat, 0.0, scratchBVCartographic);
            var decodedPosition = ellipsoid.cartographicToCartesian(cartographic, scratchEncodedPosition);
            Cartesian3.pack(decodedPosition, decodedPositions, i * 3);
        }

        positions = decodedPositions;
        positionsLength = positions.length;

        var countsLength = counts.length;
        var offsets = new Array(countsLength);
        var indexOffsets = new Array(countsLength);
        var currentOffset = 0;
        var currentIndexOffset = 0;
        for (i = 0; i < countsLength; ++i) {
            offsets[i] = currentOffset;
            indexOffsets[i] = currentIndexOffset;

            currentOffset += counts[i];
            currentIndexOffset += indexCounts[i];
        }

        //var positionsLength = positions.length;
        var batchedPositions = new Float32Array(positionsLength * 2);
        var batchedIds = new Uint16Array(positionsLength / 3 * 2);
        var batchedIndexOffsets = new Uint32Array(indexOffsets.length);
        var batchedIndexCounts = new Uint32Array(indexCounts.length);
        var batchedIndices = [];

        var colorToBuffers = {};
        for (i = 0; i < countsLength; ++i) {
            rgba = batchTableColors[i];
            if (!defined(colorToBuffers[rgba])) {
                colorToBuffers[rgba] = {
                    positionLength : counts[i],
                    indexLength : indexCounts[i],
                    offset : 0,
                    indexOffset : 0,
                    batchIds : [i]
                };
            } else {
                colorToBuffers[rgba].positionLength += counts[i];
                colorToBuffers[rgba].indexLength += indexCounts[i];
                colorToBuffers[rgba].batchIds.push(i);
            }
        }

        // get the offsets and counts for the positions and indices of each primitive
        var buffer;
        var byColorPositionOffset = 0;
        var byColorIndexOffset = 0;
        for (rgba in colorToBuffers) {
            if (colorToBuffers.hasOwnProperty(rgba)) {
                buffer = colorToBuffers[rgba];
                buffer.offset = byColorPositionOffset;
                buffer.indexOffset = byColorIndexOffset;

                var positionLength = buffer.positionLength * 2;
                var indexLength = buffer.indexLength * 2 + buffer.positionLength * 6;

                byColorPositionOffset += positionLength;
                byColorIndexOffset += indexLength;

                buffer.indexLength = indexLength;
            }
        }

        var batchedDrawCalls = [];

        for (rgba in colorToBuffers) {
            if (colorToBuffers.hasOwnProperty(rgba)) {
                buffer = colorToBuffers[rgba];

                batchedDrawCalls.push({
                    color : Color.fromRgba(parseInt(rgba)),
                    offset : buffer.indexOffset,
                    count : buffer.indexLength,
                    batchIds : buffer.batchIds
                });
            }
        }

        for (i = 0; i < countsLength; ++i) {
            rgba = batchTableColors[i];

            buffer = colorToBuffers[rgba];
            var positionOffset = buffer.offset;
            var positionIndex = positionOffset * 3;
            var batchIdIndex = positionOffset;

            var polygonOffset = offsets[i];
            var polygonCount = counts[i];
            var batchId = batchIds[i];

            var minLat = Number.POSITIVE_INFINITY;
            var maxLat = Number.NEGATIVE_INFINITY;
            var minLon = Number.POSITIVE_INFINITY;
            var maxLon = Number.NEGATIVE_INFINITY;

            for (j = 0; j < polygonCount; ++j) {
                //var encodedPosition = Cartesian3.unpack(positions, polygonOffset * 3 + j * 3, scratchEncodedPosition);
                //var rtcPosition = Matrix4.multiplyByPoint(decodeMatrix, encodedPosition, encodedPosition);
                //var position = Cartesian3.add(rtcPosition, center, rtcPosition);

                var position = Cartesian3.unpack(positions, polygonOffset * 3 + j * 3, scratchEncodedPosition);

                var carto = ellipsoid.cartesianToCartographic(position, scratchBVCartographic);
                var lat = carto.latitude;
                var lon = carto.longitude;

                minLat = Math.min(lat, minLat);
                maxLat = Math.max(lat, maxLat);
                minLon = Math.min(lon, minLon);
                maxLon = Math.max(lon, maxLon);

                var normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
                var scaledPosition = ellipsoid.scaleToGeodeticSurface(position, position);
                var scaledNormal = Cartesian3.multiplyByScalar(normal, minHeight, scratchScaledNormal);
                var minHeightPosition = Cartesian3.add(scaledPosition, scaledNormal, scratchMinHeightPosition);

                scaledNormal = Cartesian3.multiplyByScalar(normal, maxHeight, scaledNormal);
                var maxHeightPosition = Cartesian3.add(scaledPosition, scaledNormal, scratchMaxHeightPosition);

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

            boundingVolumes[i] = OrientedBoundingBox.fromRectangle(rectangle, minHeight, maxHeight, ellipsoid);

            var indicesIndex = buffer.indexOffset;

            var indexOffset = indexOffsets[i];
            var indexCount = indexCounts[i];

            batchedIndexOffsets[i] = indicesIndex;

            for (j = 0; j < indexCount; j += 3) {
                var i0 = indices[indexOffset + j] - polygonOffset;
                var i1 = indices[indexOffset + j + 1] - polygonOffset;
                var i2 = indices[indexOffset + j + 2] - polygonOffset;

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
                var v0 = j;
                var v1 = (j + 1) % polygonCount;

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

        batchedIndices = IndexDatatype.createTypedArray(batchedPositions.length / 3, batchedIndices);

        var batchedIndicesLength = batchedDrawCalls.length;
        for (var m = 0; m < batchedIndicesLength; ++m) {
            var tempIds = batchedDrawCalls[m].batchIds;
            var count = 0;
            var tempIdsLength = tempIds.length;
            for (var n = 0; n < tempIdsLength; ++n) {
                count += batchedIndexCounts[tempIds[n]];
            }
            batchedDrawCalls[m].count = count;
        }

        var indexDatatype = (batchedIndices.BYTES_PER_ELEMENT === 2) ?  IndexDatatype.UNSIGNED_SHORT : IndexDatatype.UNSIGNED_INT;
        var packedBuffer = packBuffer(indexDatatype, boundingVolumes, batchedDrawCalls);

        transferableObjects.push(batchedPositions.buffer, batchedIndices.buffer, batchedIndexOffsets.buffer, batchedIndexCounts.buffer, batchedIds.buffer, packedBuffer.buffer);

        return {
            positions : batchedPositions.buffer,
            indices : batchedIndices.buffer,
            indexOffsets : batchedIndexOffsets.buffer,
            indexCounts : batchedIndexCounts.buffer,
            batchIds : batchedIds.buffer,
            packedBuffer : packedBuffer.buffer
        };
    }

    return createTaskProcessorWorker(createVerticesFromVectorTile);
});
