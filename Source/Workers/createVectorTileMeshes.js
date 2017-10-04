define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/Matrix4',
        '../Scene/Vector3DTileBatch',
        './createTaskProcessorWorker'
    ], function(
        BoundingSphere,
        Cartesian3,
        Color,
        defined,
        Matrix4,
        Vector3DTileBatch,
        createTaskProcessorWorker) {
    'use strict';

    var scratchCenter = new Cartesian3();
    var scratchMatrix4 = new Matrix4();

    function unpackBuffer(buffer) {
        var packedBuffer = new Float64Array(buffer);

        var offset = 0;
        var indexBytesPerElement = packedBuffer[offset++];

        Cartesian3.unpack(packedBuffer, offset, scratchCenter);
        offset += Cartesian3.packedLength;

        Matrix4.unpack(packedBuffer, offset, scratchMatrix4);

        return indexBytesPerElement;
    }

    function packedBatchedIndicesLength(batchedIndices) {
        var length = batchedIndices.length;
        var count = 0;
        for (var i = 0; i < length; ++i) {
            count += Color.packedLength + 3 + batchedIndices[i].batchIds.length;
        }
        return count;
    }

    function packBuffer(batchedIndices, boundingVolumes) {
        var numBVs = boundingVolumes.length;
        var length = 1 + numBVs * BoundingSphere.packedLength + 1 + packedBatchedIndicesLength(batchedIndices);

        var packedBuffer = new Float64Array(length);

        var offset = 0;
        packedBuffer[offset++] = numBVs;

        for (var i = 0; i < numBVs; ++i) {
            BoundingSphere.pack(boundingVolumes[i], packedBuffer, offset);
            offset += BoundingSphere.packedLength;
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

    var scratchPosition = new Cartesian3();
    var scratchMesh = [];

    function createVectorTileMeshes(parameters, transferableObjects) {
        var indexBytesPerElement = unpackBuffer(parameters.packedBuffer);
        var indices;
        if (indexBytesPerElement === 2) {
            indices = new Uint16Array(parameters.indices);
        } else {
            indices = new Uint32Array(parameters.indices);
        }

        var positions = new Float32Array(parameters.positions);
        var indexOffsets = new Uint32Array(parameters.indexOffsets);
        var indexCounts = new Uint32Array(parameters.indexCounts);
        var batchIds = new Uint32Array(parameters.batchIds);
        var batchTableColors = new Uint32Array(parameters.batchTableColors);

        var numMeshes = indexOffsets.length;
        var boundingVolumes = new Array(numMeshes);

        var vertexBatchIds = new Uint16Array(positions.length / 3);

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
        var mesh = scratchMesh;

        for (i = 0; i < numMeshes; ++i) {
            var batchId = batchIds[i];
            var offset = indexOffsets[batchId];
            var count = indexCounts[batchId];

            mesh.length = count;

            for (var j = 0; j < count; ++j) {
                var index = indices[offset + j];
                vertexBatchIds[index] = batchId;

                var result = mesh[j];
                if (!defined(result)) {
                    result = mesh[j] = new Cartesian3();
                }

                var meshPosition = Cartesian3.unpack(positions, index * 3, scratchPosition);
                Cartesian3.add(meshPosition, center, result);
            }

            batchedIndices[i] = new Vector3DTileBatch({
                offset : offset,
                count : count,
                color : Color.fromRgba(batchTableColors[batchId]),
                batchIds : [batchId]
            });

            boundingVolumes[i] = BoundingSphere.fromPoints(mesh);
        }

        var packedBuffer = packBuffer(batchedIndices, boundingVolumes);

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

    return createTaskProcessorWorker(createVectorTileMeshes);
});
