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

    var scratchPosition = new Cartesian3();
    var scratchCartesian = new Cartesian3();
    var scratchModelMatrix = new Matrix4();

    var boxGeometry;
    var packedBoxLength = Matrix4.packedLength + Cartesian3.packedLength;

    function createBoxes(options) {
        var boxes = options.boxes;
        if (!defined(boxes)) {
            return;
        }

        var boxBatchIds = options.boxBatchIds;
        var numberOfBoxes = boxBatchIds.length;
        var boxPositions = boxGeometry.attributes.position.values;
        var boxIndices = boxGeometry.indices;

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

        for (var i = 0; i < numberOfBoxes; ++i) {
            var boxIndex = i * packedBoxLength;

            var dimensions = Cartesian3.unpack(boxes, boxIndex, scratchCartesian);
            boxIndex += Cartesian3.packedLength;

            var boxModelMatrix = Matrix4.unpack(boxes, boxIndex, scratchModelMatrix);
            Matrix4.multiplyByScale(boxModelMatrix, dimensions, boxModelMatrix);
            Matrix4.multiply(modelMatrix, boxModelMatrix, boxModelMatrix);

            var boxBatchId = boxBatchIds[i];

            var boxLength = boxPositions.length;
            for (var j = 0; j < boxLength; j += 3) {
                var position = Cartesian3.unpack(boxPositions, j, scratchPosition);
                Matrix4.multiplyByPoint(boxModelMatrix, position, position);
                Cartesian3.subtract(position, center, position);

                Cartesian3.pack(position, positions, positionOffset * 3 + j);
                vertexBatchIds[batchIdIndex++] = boxBatchId;
            }

            var boxIndicesLength = boxIndices.length;
            for (var k = 0; k < boxIndicesLength; ++k) {
                indices[indexOffset + k] = boxIndices[k] + positionOffset;
            }

            var boxOffset = i + batchedIndicesOffset;
            batchedIndices[boxOffset] = new Vector3DTileBatch({
                offset : indexOffset,
                count : boxIndicesLength,
                color : Color.fromRgba(batchTableColors[boxBatchId]),
                batchIds : [boxBatchId]
            });
            batchIds[i] = boxBatchId;
            indexOffsets[i] = indexOffset;
            indexCounts[i] = boxIndicesLength;

            positionOffset += boxLength / 3;
            indexOffset += boxIndicesLength;
        }

        options.positionOffset = positionOffset;
        options.batchIdIndex = batchIdIndex;
        options.indexOffset = indexOffset;
        options.batchedIndicesOffset += numberOfBoxes;
    }

    var cylinderGeometry;
    var packedCylinderLength = Matrix4.packedLength + 2;

    function createCylinders(options) {
        var cylinders = options.cylinders;
        if (!defined(cylinders)) {
            return;
        }

        var cylinderBatchIds = options.cylinderBatchIds;
        var numberOfCylinders = cylinderBatchIds.length;
        var cylinderPositions = cylinderGeometry.attributes.position.values;
        var cylinderIndices = cylinderGeometry.indices;

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

        for (var i = 0; i < numberOfCylinders; ++i) {
            var cylinderIndex = i * packedCylinderLength;

            var cylinderRadius = cylinders[cylinderIndex++];
            var length = cylinders[cylinderIndex++];
            var scale = Cartesian3.fromElements(cylinderRadius, cylinderRadius, length, scratchCartesian);

            var cylinderModelMatrix = Matrix4.unpack(cylinders, cylinderIndex, scratchModelMatrix);
            Matrix4.multiplyByScale(cylinderModelMatrix, scale, cylinderModelMatrix);
            Matrix4.multiply(modelMatrix, cylinderModelMatrix, cylinderModelMatrix);

            var cylinderBatchId = cylinderBatchIds[i];

            var cylinderLength = cylinderPositions.length;
            for (var j = 0; j < cylinderLength; j += 3) {
                var position = Cartesian3.unpack(cylinderPositions, j, scratchPosition);
                Matrix4.multiplyByPoint(cylinderModelMatrix, position, position);
                Cartesian3.subtract(position, center, position);

                Cartesian3.pack(position, positions, positionOffset * 3 + j);

                vertexBatchIds[batchIdIndex++] = cylinderBatchId;
            }

            var cylinderIndicesLength = cylinderIndices.length;
            for (var k = 0; k < cylinderIndicesLength; ++k) {
                indices[indexOffset + k] = cylinderIndices[k] + positionOffset;
            }

            var cylinderOffset = i + batchedIndicesOffset;
            batchedIndices[cylinderOffset] = new Vector3DTileBatch({
                offset : indexOffset,
                count : cylinderIndicesLength,
                color : Color.fromRgba(batchTableColors[cylinderBatchId]),
                batchIds : [cylinderBatchId]
            });
            batchIds[cylinderOffset] = cylinderBatchId;
            indexOffsets[cylinderOffset] = indexOffset;
            indexCounts[cylinderOffset] = cylinderIndicesLength;

            positionOffset += cylinderLength / 3;
            indexOffset += cylinderIndicesLength;
        }

        options.positionOffset = positionOffset;
        options.batchIdIndex = batchIdIndex;
        options.indexOffset = indexOffset;
        options.batchedIndicesOffset += numberOfCylinders;
    }

    var ellipsoidGeometry;
    var packedEllipsoidLength = Matrix4.packedLength + Cartesian3.packedLength;

    function createEllipsoids(options) {
        var ellipsoids = options.ellipsoids;
        if (!defined(ellipsoids)) {
            return;
        }

        var ellipsoidBatchIds = options.ellipsoidBatchIds;
        var numberOfEllipsoids = ellipsoidBatchIds.length;
        var ellipsoidPositions = ellipsoidGeometry.attributes.position.values;
        var ellipsoidIndices = ellipsoidGeometry.indices;

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

        for (var i = 0; i < numberOfEllipsoids; ++i) {
            var ellipsoidIndex = i * packedEllipsoidLength;

            var radii = Cartesian3.unpack(ellipsoids, ellipsoidIndex, scratchCartesian);
            ellipsoidIndex += Cartesian3.packedLength;

            var ellipsoidModelMatrix = Matrix4.unpack(ellipsoids, ellipsoidIndex, scratchModelMatrix);
            Matrix4.multiplyByScale(ellipsoidModelMatrix, radii, ellipsoidModelMatrix);
            Matrix4.multiply(modelMatrix, ellipsoidModelMatrix, ellipsoidModelMatrix);

            var ellipsoidBatchId = ellipsoidBatchIds[i];

            var ellipsoidLength = ellipsoidPositions.length;
            for (var j = 0; j < ellipsoidLength; j += 3) {
                var position = Cartesian3.unpack(ellipsoidPositions, j, scratchPosition);
                Matrix4.multiplyByPoint(ellipsoidModelMatrix, position, position);
                Cartesian3.subtract(position, center, position);

                Cartesian3.pack(position, positions, positionOffset * 3 + j);

                vertexBatchIds[batchIdIndex++] = ellipsoidBatchId;
            }

            var ellipsoidIndicesLength = ellipsoidIndices.length;
            for (var k = 0; k < ellipsoidIndicesLength; ++k) {
                indices[indexOffset + k] = ellipsoidIndices[k] + positionOffset;
            }

            var ellipsoidOffset = i + batchedIndicesOffset;
            batchedIndices[ellipsoidOffset] = new Vector3DTileBatch({
                offset : indexOffset,
                count : ellipsoidIndicesLength,
                color : Color.fromRgba(batchTableColors[ellipsoidBatchId]),
                batchIds : [ellipsoidBatchId]
            });
            batchIds[ellipsoidOffset] = ellipsoidBatchId;
            indexOffsets[ellipsoidOffset] = indexOffset;
            indexCounts[ellipsoidOffset] = ellipsoidIndicesLength;

            positionOffset += ellipsoidLength / 3;
            indexOffset += ellipsoidIndicesLength;
        }

        options.positionOffset = positionOffset;
        options.batchIdIndex = batchIdIndex;
        options.indexOffset = indexOffset;
        options.batchedIndicesOffset += numberOfEllipsoids;
    }

    var packedSphereLength = Matrix4.packedLength + 1;

    function createSpheres(options) {
        var spheres = options.spheres;
        if (!defined(spheres)) {
            return;
        }

        var sphereBatchIds = options.sphereBatchIds;
        var numberOfSpheres = sphereBatchIds.length;
        var ellipsoidPositions = ellipsoidGeometry.attributes.position.values;
        var ellipsoidIndices = ellipsoidGeometry.indices;

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

        for (var i = 0; i < numberOfSpheres; ++i) {
            var sphereIndex = i * packedSphereLength;

            var sphereRadius = spheres[sphereIndex++];

            var sphereModelMatrix = Matrix4.unpack(spheres, sphereIndex, scratchModelMatrix);
            Matrix4.multiplyByUniformScale(sphereModelMatrix, sphereRadius, sphereModelMatrix);
            Matrix4.multiply(modelMatrix, sphereModelMatrix, sphereModelMatrix);

            var sphereBatchId = sphereBatchIds[i];

            var sphereLength = ellipsoidPositions.length;
            for (var j = 0; j < sphereLength; j += 3) {
                var position = Cartesian3.unpack(ellipsoidPositions, j, scratchPosition);
                Matrix4.multiplyByPoint(sphereModelMatrix, position, position);
                Cartesian3.subtract(position, center, position);

                Cartesian3.pack(position, positions, positionOffset * 3 + j);

                vertexBatchIds[batchIdIndex++] = sphereBatchId;
            }

            var sphereIndicesLength = ellipsoidIndices.length;
            for (var k = 0; k < sphereIndicesLength; ++k) {
                indices[indexOffset + k] = ellipsoidIndices[k] + positionOffset;
            }

            var sphereOffset = i + batchedIndicesOffset;
            batchedIndices[sphereOffset] = new Vector3DTileBatch({
                offset : indexOffset,
                count : sphereIndicesLength,
                color : Color.fromRgba(batchTableColors[sphereBatchId]),
                batchIds : [sphereBatchId]
            });
            batchIds[sphereOffset] = sphereBatchId;
            indexOffsets[sphereOffset] = indexOffset;
            indexCounts[sphereOffset] = sphereIndicesLength;

            positionOffset += sphereLength / 3;
            indexOffset += sphereIndicesLength;
        }

        options.positionOffset = positionOffset;
        options.batchIdIndex = batchIdIndex;
        options.indexOffset = indexOffset;
        options.batchedIndicesOffset += numberOfSpheres;
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
        debugger;

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
        var modelMatrix = scratchMatrix4;
        var center = scratchCenter;

        var options = {
            boxes : boxes,
            boxBatchIds : boxBatchIds,
            cylinders : cylinders,
            cylinderBatchIds : cylinderBatchIds,
            ellipsoids : ellipsoids,
            ellipsoidBatchIds : ellipsoidBatchIds,
            spheres : spheres,
            sphereBatchIds : sphereBatchIds,
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
            modelMatrix : modelMatrix,
            center : center
        };

        createBoxes(options);
        createCylinders(options);
        createEllipsoids(options);
        createSpheres(options);

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
