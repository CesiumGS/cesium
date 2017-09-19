/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/Matrix4',
        '../Scene/Vector3DTileBatch',
        './createTaskProcessorWorker'
    ], function(
        Cartesian3,
        Color,
        Matrix4,
        Vector3DTileBatch,
        createTaskProcessorWorker) {
    'use strict';

    var scratchCenter = new Cartesian3();
    var scratchMatrix4 = new Matrix4();

    function unpackBuffer(buffer) {
        var packedBuffer = new Float64Array(buffer);

        var offset = 0;
        Cartesian3.unpack(packedBuffer, offset, scratchCenter);
        offset += Cartesian3.packedLength;

        Matrix4.unpack(packedBuffer, offset, scratchMatrix4);
    }

    function packedBatchedIndicesLength(batchedIndices) {
        var length = batchedIndices.length;
        var count = 0;
        for (var i = 0; i < length; ++i) {
            count += Color.packedLength + 3 + batchedIndices[i].batchIds.length;
        }
        return count;
    }

    function packBuffer(batchedIndices) {
        var length = 1 + packedBatchedIndicesLength(batchedIndices);
        var packedBuffer = new Float64Array(length);

        var offset = 0;
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

    var scratchPosition = new Cartesian3();

    function createMeshesFromVectorTile(parameters, transferableObjects) {
        debugger;

        var positions = new Float32Array(parameters.positions);
        var indexOffsets = new Uint32Array(parameters.indexOffsets);
        var indexCounts = new Uint32Array(parameters.indexCounts);
        var indices = new Uint32Array(parameters.indices);
        var batchIds = new Uint32Array(parameters.batchIds);
        var batchTableColors = new Uint32Array(parameters.batchTableColors);

        var numMeshes = indexOffsets.length;
        //var boundingVolumes = new Array(numMeshes);

        var vertexBatchIds = new Uint16Array(positions.length / 3);

        unpackBuffer(parameters.packedBuffer);

        var center = scratchCenter;
        var modelMatrix = scratchMatrix4;

        var i;
        var length = positions.length;
        for (i = 0; i < length; i += 3) {
            var position = Cartesian3.unpack(positions, i, scratchPosition);

            Matrix4.multiplyByPoint(modelMatrix, position, position);
            Cartesian3.subtract(position, center, position);

            Cartesian3.pack(position, positions, i);
        }

        var batchedIndices = new Array(numMeshes);

        for (i = 0; i < numMeshes; ++i) {
            var batchId = batchIds[i];
            var offset = indexOffsets[batchId];
            var count = indexCounts[batchId];

            for (var j = 0; j < count; ++j) {
                var index = indices[offset + j];
                vertexBatchIds[index] = batchId;
            }

            batchedIndices[i] = new Vector3DTileBatch({
                offset : offset,
                count : count,
                color : Color.fromRgba(batchTableColors[batchId]),
                batchIds : [batchId]
            });
        }

        var packedBuffer = packBuffer(batchedIndices);

        transferableObjects.push(positions.buffer, indices.buffer, indexOffsets.buffer, indexCounts.buffer, vertexBatchIds.buffer, packedBuffer.buffer);

        return {
            positions : positions.buffer,
            indices : indices.buffer,
            indexOffsets : indexOffsets.buffer,
            indexCounts : indexCounts.buffer,
            batchIds : vertexBatchIds.buffer,
            packedBuffer : packedBuffer.buffer
        };
    }

    return createTaskProcessorWorker(createMeshesFromVectorTile);
});
