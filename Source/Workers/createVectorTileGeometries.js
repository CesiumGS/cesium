define([
        '../Core/BoxGeometry',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/CylinderGeometry',
        '../Core/defined',
        '../Core/EllipsoidGeometry',
        '../Core/Matrix4',
        '../Core/VertexFormat',
        '../Scene/Vector3DTileBatch',
        './createTaskProcessorWorker'
    ], function(
        BoxGeometry,
        Cartesian3,
        Color,
        CylinderGeometry,
        defined,
        EllipsoidGeometry,
        Matrix4,
        VertexFormat,
        Vector3DTileBatch,
        createTaskProcessorWorker) {
    'use strict';

    var scratchCartesian = new Cartesian3();
    var scratchModelMatrix = new Matrix4();

    var boxGeometry;
    var packedBoxLength = Matrix4.packedLength + Cartesian3.packedLength;

    var cylinderGeometry;
    var packedCylinderLength = Matrix4.packedLength + 2;

    var ellipsoidGeometry;
    var packedEllipsoidLength = Matrix4.packedLength + Cartesian3.packedLength;
    var packedSphereLength = Matrix4.packedLength + 1;

    function unpackBoxModelMatrix(boxes, index) {
        var boxIndex  = index * packedBoxLength;

        var dimensions = Cartesian3.unpack(boxes, boxIndex, scratchCartesian);
        boxIndex += Cartesian3.packedLength;

        var boxModelMatrix = Matrix4.unpack(boxes, boxIndex, scratchModelMatrix);
        Matrix4.multiplyByScale(boxModelMatrix, dimensions, boxModelMatrix);

        return boxModelMatrix;
    }

    function unpackCylinderModelMatrix(cylinders, index) {
        var cylinderIndex = index * packedCylinderLength;

        var cylinderRadius = cylinders[cylinderIndex++];
        var length = cylinders[cylinderIndex++];
        var scale = Cartesian3.fromElements(cylinderRadius, cylinderRadius, length, scratchCartesian);

        var cylinderModelMatrix = Matrix4.unpack(cylinders, cylinderIndex, scratchModelMatrix);
        Matrix4.multiplyByScale(cylinderModelMatrix, scale, cylinderModelMatrix);

        return cylinderModelMatrix;
    }

    function unpackEllipsoidModelMatrix(ellipsoids, index) {
        var ellipsoidIndex = index * packedEllipsoidLength;

        var radii = Cartesian3.unpack(ellipsoids, ellipsoidIndex, scratchCartesian);
        ellipsoidIndex += Cartesian3.packedLength;

        var ellipsoidModelMatrix = Matrix4.unpack(ellipsoids, ellipsoidIndex, scratchModelMatrix);
        Matrix4.multiplyByScale(ellipsoidModelMatrix, radii, ellipsoidModelMatrix);

        return ellipsoidModelMatrix;
    }

    function unpackSphereModelMatrix(spheres, index) {
        var sphereIndex = index * packedSphereLength;

        var sphereRadius = spheres[sphereIndex++];

        var sphereModelMatrix = Matrix4.unpack(spheres, sphereIndex, scratchModelMatrix);
        Matrix4.multiplyByUniformScale(sphereModelMatrix, sphereRadius, sphereModelMatrix);

        return sphereModelMatrix;
    }

    var scratchPosition = new Cartesian3();

    function createPrimitive(options, primitive, primitiveBatchIds, geometry, unpackModelMatrix) {
        if (!defined(primitive)) {
            return;
        }

        var numberOfPrimitives = primitiveBatchIds.length;
        var geometryPositions = geometry.attributes.position.values;
        var geometryIndices = geometry.indices;

        var positions = options.positions;
        var vertexBatchIds = options.vertexBatchIds;
        var indices = options.indices;

        var batchIds = options.batchIds;
        var batchTableColors = options.batchTableColors;
        var batchedIndices = options.batchedIndices;
        var indexOffsets = options.indexOffsets;
        var indexCounts = options.indexCounts;

        var modelMatrix = options.modelMatrix;
        var center = options.center;

        var positionOffset = options.positionOffset;
        var batchIdIndex = options.batchIdIndex;
        var indexOffset = options.indexOffset;
        var batchedIndicesOffset = options.batchedIndicesOffset;

        for (var i = 0; i < numberOfPrimitives; ++i) {
            var primitiveModelMatrix = unpackModelMatrix(primitive, i);
            Matrix4.multiply(modelMatrix, primitiveModelMatrix, primitiveModelMatrix);

            var batchId = primitiveBatchIds[i];

            var positionsLength = geometryPositions.length;
            for (var j = 0; j < positionsLength; j += 3) {
                var position = Cartesian3.unpack(geometryPositions, j, scratchPosition);
                Matrix4.multiplyByPoint(primitiveModelMatrix, position, position);
                Cartesian3.subtract(position, center, position);

                Cartesian3.pack(position, positions, positionOffset * 3 + j);
                vertexBatchIds[batchIdIndex++] = batchId;
            }

            var indicesLength = geometryIndices.length;
            for (var k = 0; k < indicesLength; ++k) {
                indices[indexOffset + k] = geometryIndices[k] + positionOffset;
            }

            var offset = i + batchedIndicesOffset;
            batchedIndices[offset] = new Vector3DTileBatch({
                offset : indexOffset,
                count : indicesLength,
                color : Color.fromRgba(batchTableColors[batchId]),
                batchIds : [batchId]
            });
            batchIds[offset] = batchId;
            indexOffsets[offset] = indexOffset;
            indexCounts[offset] = indicesLength;

            positionOffset += positionsLength / 3;
            indexOffset += indicesLength;
        }

        options.positionOffset = positionOffset;
        options.batchIdIndex = batchIdIndex;
        options.indexOffset = indexOffset;
        options.batchedIndicesOffset += numberOfPrimitives;
    }

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

    function createVectorTileGeometries(parameters, transferableObjects) {
        var boxes = new Float32Array(parameters.boxes);
        var boxBatchIds = new Uint16Array(parameters.boxBatchIds);
        var cylinders =  new Float32Array(parameters.cylinders);
        var cylinderBatchIds = new Uint16Array(parameters.cylinderBatchIds);
        var ellipsoids =  new Float32Array(parameters.ellipsoids);
        var ellipsoidBatchIds = new Uint16Array(parameters.ellipsoidBatchIds);
        var spheres =  new Float32Array(parameters.spheres);
        var sphereBatchIds = new Uint16Array(parameters.sphereBatchIds);

        var numberOfBoxes = defined(boxes) ? boxBatchIds.length : 0;
        var numberOfCylinders = defined(cylinders) ? cylinderBatchIds.length : 0;
        var numberOfEllipsoids = defined(ellipsoids) ? ellipsoidBatchIds.length : 0;
        var numberOfSpheres = defined(spheres) ? sphereBatchIds.length : 0;

        if (!defined(boxGeometry)) {
            boxGeometry = BoxGeometry.createGeometry(BoxGeometry.fromDimensions({
                dimensions : new Cartesian3(1.0, 1.0, 1.0),
                vertexFormat : VertexFormat.POSITION_ONLY
            }));
            cylinderGeometry = CylinderGeometry.createGeometry(new CylinderGeometry({
                topRadius : 1.0,
                bottomRadius : 1.0,
                length : 1.0,
                vertexFormat : VertexFormat.POSITION_ONLY
            }));
            ellipsoidGeometry = EllipsoidGeometry.createGeometry((new EllipsoidGeometry({
                radii : new Cartesian3(1.0, 1.0, 1.0),
                vertexFormat : VertexFormat.POSITION_ONLY
            })));
        }

        var boxPositions = boxGeometry.attributes.position.values;
        var cylinderPositions = cylinderGeometry.attributes.position.values;
        var ellipsoidPositions = ellipsoidGeometry.attributes.position.values;

        var numberOfPositions = boxPositions.length * numberOfBoxes;
        numberOfPositions += cylinderPositions.length * numberOfCylinders;
        numberOfPositions += ellipsoidPositions.length * (numberOfEllipsoids + numberOfSpheres);

        var boxIndices = boxGeometry.indices;
        var cylinderIndices = cylinderGeometry.indices;
        var ellipsoidIndices = ellipsoidGeometry.indices;

        var numberOfIndices = boxIndices.length * numberOfBoxes;
        numberOfIndices += cylinderIndices.length * numberOfCylinders;
        numberOfIndices += ellipsoidIndices.length * (numberOfEllipsoids + numberOfSpheres);

        var positions = new Float32Array(numberOfPositions);
        var vertexBatchIds = new Uint16Array(numberOfPositions / 3);
        var indices = new Uint32Array(numberOfIndices);

        var numberOfGeometries = numberOfBoxes + numberOfCylinders + numberOfEllipsoids + numberOfSpheres;
        var batchIds = new Uint32Array(numberOfGeometries);
        var batchedIndices = new Array(numberOfGeometries);
        var indexOffsets = new Uint32Array(numberOfGeometries);
        var indexCounts = new Uint32Array(numberOfGeometries);

        unpackBuffer(parameters.packedBuffer);

        var options = {
            batchTableColors : new Uint32Array(parameters.batchTableColors),
            positions : positions,
            vertexBatchIds : vertexBatchIds,
            indices : indices,
            batchIds : batchIds,
            batchedIndices : batchedIndices,
            indexOffsets : indexOffsets,
            indexCounts : indexCounts,
            positionOffset : 0,
            batchIdIndex : 0,
            indexOffset : 0,
            batchedIndicesOffset : 0,
            modelMatrix : scratchMatrix4,
            center : scratchCenter
        };

        createPrimitive(options, boxes, boxBatchIds, boxGeometry, unpackBoxModelMatrix);
        createPrimitive(options, cylinders, cylinderBatchIds, cylinderGeometry, unpackCylinderModelMatrix);
        createPrimitive(options, ellipsoids, ellipsoidBatchIds, ellipsoidGeometry, unpackEllipsoidModelMatrix);
        createPrimitive(options, spheres, sphereBatchIds, ellipsoidGeometry, unpackSphereModelMatrix);

        var packedBuffer = packBuffer(batchedIndices);
        transferableObjects.push(positions.buffer, vertexBatchIds.buffer, indices.buffer);
        transferableObjects.push(batchIds.buffer, indexOffsets.buffer, indexCounts.buffer);
        transferableObjects.push(packedBuffer.buffer);

        return {
            positions : positions.buffer,
            vertexBatchIds : vertexBatchIds.buffer,
            indices : indices.buffer,
            indexOffsets : indexOffsets.buffer,
            indexCounts : indexCounts.buffer,
            batchIds : batchIds.buffer,
            packedBuffer : packedBuffer.buffer
        };
    }

    return createTaskProcessorWorker(createVectorTileGeometries);
});
