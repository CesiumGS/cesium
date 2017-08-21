define([
        '../Core/BoxGeometry',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/CylinderGeometry',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/EllipsoidGeometry',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/VertexFormat',
        './Vector3DTileBatch',
        './Vector3DTilePrimitive'
    ], function(
        BoxGeometry,
        Cartesian3,
        Color,
        CylinderGeometry,
        defaultValue,
        defined,
        destroyObject,
        EllipsoidGeometry,
        CesiumMath,
        Matrix4,
        VertexFormat,
        Vector3DTileBatch,
        Vector3DTilePrimitive) {
    'use strict';

    function Vector3DTileGeometry(options) {
        // these will all be released after the primitive is created
        this._boxes = options.boxes;
        this._boxBatchIds = options.boxBatchIds;
        this._cylinders = options.cylinders;
        this._cylinderBatchIds = options.cylinderBatchIds;
        this._ellipsoids = options.ellipsoids;
        this._ellipsoidBatchIds = options.ellipsoidBatchIds;
        this._spheres = options.spheres;
        this._sphereBatchIds = options.sphereBatchIds;
        this._center = options.center;
        this._modelMatrix = options.modelMatrix;
        this._batchTable = options.batchTable;
        this._boundingVolume = options.boundingVolume;

        this._primitive = undefined;

        /**
         * Draws the wireframe of the classification geometries.
         * @type {Boolean}
         * @default false
         */
        this.debugWireframe = false;
    }

    var packedBoxLength = Vector3DTileGeometry.packedBoxLength = Matrix4.packedLength + Cartesian3.packedLength;
    var packedCylinderLength = Vector3DTileGeometry.packedCylinderLength = Matrix4.packedLength + 2;
    var packedEllipsoidLength = Vector3DTileGeometry.packedEllipsoidLength = Matrix4.packedLength + Cartesian3.packedLength;
    var packedSphereLength = Vector3DTileGeometry.packedSphereLength = Matrix4.packedLength + 1;

    var boxGeometry;
    var cylinderGeometry;
    var ellipsoidGeometry;

    var scratchCartesian = new Cartesian3();
    var scratchPosition = new Cartesian3();
    var scratchModelMatrix = new Matrix4();

    function createPrimitive(geometries) {
        var boxes = geometries._boxes;
        var boxBatchIds = geometries._boxBatchIds;
        var cylinders = geometries._cylinders;
        var cylinderBatchIds = geometries._cylinderBatchIds;
        var ellipsoids = geometries._ellipsoids;
        var ellipsoidBatchIds = geometries._ellipsoidBatchIds;
        var spheres = geometries._spheres;
        var sphereBatchIds = geometries._sphereBatchIds;

        var center = geometries._center;
        var modelMatrix = geometries._modelMatrix;
        var batchTable = geometries._batchTable;

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
        var batchIds = new Array(numberOfGeometries);
        var batchedIndices = new Array(numberOfGeometries);
        var indexOffsets = new Array(numberOfGeometries);
        var indexCounts = new Array(numberOfGeometries);

        var i;
        var j;
        var position;

        var batchIdIndex = 0;
        var positionOffset = 0;
        var indexOffset = 0;

        for (i = 0; i < numberOfBoxes; ++i) {
            var boxIndex = i * packedBoxLength;

            var dimensions = Cartesian3.unpack(boxes, boxIndex, scratchCartesian);
            boxIndex += Cartesian3.packedLength;

            var boxModelMatrix = Matrix4.unpack(boxes, boxIndex, scratchModelMatrix);
            Matrix4.multiplyByScale(boxModelMatrix, dimensions, boxModelMatrix);
            Matrix4.multiply(modelMatrix, boxModelMatrix, boxModelMatrix);

            var boxBatchId = boxBatchIds[i];

            var boxLength = boxPositions.length;
            for (j = 0; j < boxLength; j += 3) {
                position = Cartesian3.unpack(boxPositions, j, scratchPosition);
                Matrix4.multiplyByPoint(boxModelMatrix, position, position);
                Cartesian3.subtract(position, center, position);

                Cartesian3.pack(position, positions, positionOffset * 3 + j);
                vertexBatchIds[batchIdIndex++] = boxBatchId;
            }

            var boxIndicesLength = boxIndices.length;
            for (j = 0; j < boxIndicesLength; ++j) {
                indices[indexOffset + j] = boxIndices[j] + positionOffset;
            }

            batchedIndices[i] = new Vector3DTileBatch({
                offset : indexOffset,
                count : boxIndicesLength,
                color : batchTable.getColor(boxBatchId, new Color()),
                batchIds : [boxBatchId]
            });
            batchIds[i] = boxBatchId;
            indexOffsets[i] = indexOffset;
            indexCounts[i] = boxIndicesLength;

            positionOffset += boxLength / 3;
            indexOffset += boxIndicesLength;
        }

        for (i = 0; i < numberOfCylinders; ++i) {
            var cylinderIndex = i * packedCylinderLength;

            var cylinderRadius = cylinders[cylinderIndex++];
            var length = cylinders[cylinderIndex++];
            var scale = Cartesian3.fromElements(cylinderRadius, cylinderRadius, length, scratchCartesian);

            var cylinderModelMatrix = Matrix4.unpack(cylinders, cylinderIndex, scratchModelMatrix);
            Matrix4.multiplyByScale(cylinderModelMatrix, scale, cylinderModelMatrix);
            Matrix4.multiply(modelMatrix, cylinderModelMatrix, cylinderModelMatrix);

            var cylinderBatchId = cylinderBatchIds[i];

            var cylinderLength = cylinderPositions.length;
            for (j = 0; j < cylinderLength; j += 3) {
                position = Cartesian3.unpack(cylinderPositions, j, scratchPosition);
                Matrix4.multiplyByPoint(cylinderModelMatrix, position, position);
                Cartesian3.subtract(position, center, position);

                Cartesian3.pack(position, positions, positionOffset * 3 + j);

                vertexBatchIds[batchIdIndex++] = cylinderBatchId;
            }

            var cylinderIndicesLength = cylinderIndices.length;
            for (j = 0; j < cylinderIndicesLength; ++j) {
                indices[indexOffset + j] = cylinderIndices[j] + positionOffset;
            }

            var cylinderOffset = i + numberOfBoxes;
            batchedIndices[cylinderOffset] = new Vector3DTileBatch({
                offset : indexOffset,
                count : cylinderIndicesLength,
                color : batchTable.getColor(cylinderBatchId, new Color()),
                batchIds : [cylinderBatchId]
            });
            batchIds[cylinderOffset] = cylinderBatchId;
            indexOffsets[cylinderOffset] = indexOffset;
            indexCounts[cylinderOffset] = cylinderIndicesLength;

            positionOffset += cylinderLength / 3;
            indexOffset += cylinderIndicesLength;
        }

        for (i = 0; i < numberOfEllipsoids; ++i) {
            var ellipsoidIndex = i * packedEllipsoidLength;

            var radii = Cartesian3.unpack(ellipsoids, ellipsoidIndex, scratchCartesian);
            ellipsoidIndex += Cartesian3.packedLength;

            var ellipsoidModelMatrix = Matrix4.unpack(ellipsoids, ellipsoidIndex, scratchModelMatrix);
            Matrix4.multiplyByScale(ellipsoidModelMatrix, radii, ellipsoidModelMatrix);
            Matrix4.multiply(modelMatrix, ellipsoidModelMatrix, ellipsoidModelMatrix);

            var ellipsoidBatchId = ellipsoidBatchIds[i];

            var ellipsoidLength = ellipsoidPositions.length;
            for (j = 0; j < ellipsoidLength; j += 3) {
                position = Cartesian3.unpack(ellipsoidPositions, j, scratchPosition);
                Matrix4.multiplyByPoint(ellipsoidModelMatrix, position, position);
                Cartesian3.subtract(position, center, position);

                Cartesian3.pack(position, positions, positionOffset * 3 + j);

                vertexBatchIds[batchIdIndex++] = ellipsoidBatchId;
            }

            var ellipsoidIndicesLength = ellipsoidIndices.length;
            for (j = 0; j < ellipsoidIndicesLength; ++j) {
                indices[indexOffset + j] = ellipsoidIndices[j] + positionOffset;
            }

            var ellipsoidOffset = i + numberOfBoxes + numberOfCylinders;
            batchedIndices[ellipsoidOffset] = new Vector3DTileBatch({
                offset : indexOffset,
                count : ellipsoidIndicesLength,
                color : batchTable.getColor(ellipsoidBatchId, new Color()),
                batchIds : [ellipsoidBatchId]
            });
            batchIds[ellipsoidOffset] = ellipsoidBatchId;
            indexOffsets[ellipsoidOffset] = indexOffset;
            indexCounts[ellipsoidOffset] = ellipsoidIndicesLength;

            positionOffset += ellipsoidLength / 3;
            indexOffset += ellipsoidIndicesLength;
        }

        for (i = 0; i < numberOfSpheres; ++i) {
            var sphereIndex = i * packedSphereLength;

            var sphereRadius = spheres[sphereIndex++];

            var sphereModelMatrix = Matrix4.unpack(spheres, sphereIndex, scratchModelMatrix);
            Matrix4.multiplyByUniformScale(sphereModelMatrix, sphereRadius, sphereModelMatrix);
            Matrix4.multiply(modelMatrix, sphereModelMatrix, sphereModelMatrix);

            var sphereBatchId = sphereBatchIds[i];

            var sphereLength = ellipsoidPositions.length;
            for (j = 0; j < sphereLength; j += 3) {
                position = Cartesian3.unpack(ellipsoidPositions, j, scratchPosition);
                Matrix4.multiplyByPoint(sphereModelMatrix, position, position);
                Cartesian3.subtract(position, center, position);

                Cartesian3.pack(position, positions, positionOffset * 3 + j);

                vertexBatchIds[batchIdIndex++] = sphereBatchId;
            }

            var sphereIndicesLength = ellipsoidIndices.length;
            for (j = 0; j < sphereIndicesLength; ++j) {
                indices[indexOffset + j] = ellipsoidIndices[j] + positionOffset;
            }

            var sphereOffset = i + numberOfBoxes + numberOfCylinders + numberOfEllipsoids;
            batchedIndices[sphereOffset] = new Vector3DTileBatch({
                offset : indexOffset,
                count : sphereIndicesLength,
                color : batchTable.getColor(sphereBatchId, new Color()),
                batchIds : [sphereBatchId]
            });
            batchIds[sphereOffset] = sphereBatchId;
            indexOffsets[sphereOffset] = indexOffset;
            indexCounts[sphereOffset] = sphereIndicesLength;

            positionOffset += sphereLength / 3;
            indexOffset += sphereIndicesLength;
        }

        geometries._primitive = new Vector3DTilePrimitive({
            batchTable : batchTable,
            positions : positions,
            batchIds : batchIds,
            vertexBatchIds : vertexBatchIds,
            indices : indices,
            indexOffsets : indexOffsets,
            indexCounts : indexCounts,
            batchedIndices : batchedIndices,
            boundingVolume : geometries._boundingVolume,
            boundingVolumes : [], // TODO
            center : center,
            pickObject : defaultValue(geometries._pickObject, geometries)
        });

        geometries._boxes = undefined;
        geometries._boxBatchIds = undefined;
        geometries._cylinders = undefined;
        geometries._cylinderBatchIds = undefined;
        geometries._ellipsoids = undefined;
        geometries._ellipsoidBatchIds = undefined;
        geometries._spheres = undefined;
        geometries._sphereBatchIds = undefined;
        geometries._center = undefined;
        geometries._modelMatrix = undefined;
        geometries._batchTable = undefined;
        geometries._boundingVolume = undefined;
    }

    /**
     * Creates features for each geometry and places it at the batch id index of features.
     *
     * @param {Vector3DTileContent} content The vector tile content.
     * @param {Cesium3DTileFeature[]} features An array of features where the polygon features will be placed.
     */
    Vector3DTileGeometry.prototype.createFeatures = function(content, features) {
        this._primitive.createFeatures(content, features);
    };

    /**
     * Colors the entire tile when enabled is true. The resulting color will be (geometry batch table color * color).
     *
     * @param {Boolean} enabled Whether to enable debug coloring.
     * @param {Color} color The debug color.
     */
    Vector3DTileGeometry.prototype.applyDebugSettings = function(enabled, color) {
        this._primitive.applyDebugSettings(enabled, color);
    };

    /**
     * Apply a style to the content.
     *
     * @param {FrameState} frameState The frame state.
     * @param {Cesium3DTileStyle} style The style.
     * @param {Cesium3DTileFeature[]} features The array of features.
     */
    Vector3DTileGeometry.prototype.applyStyle = function(frameState, style, features) {
        this._primitive.applyStyle(frameState, style, features);
    };

    /**
     * Call when updating the color of a geometry with batchId changes color. The geometries will need to be re-batched
     * on the next update.
     *
     * @param {Number} batchId The batch id of the geometries whose color has changed.
     * @param {Color} color The new polygon color.
     */
    Vector3DTileGeometry.prototype.updateCommands = function(batchId, color) {
        this._primitive.updateCommands(batchId, color);
    };

    /**
     * Updates the batches and queues the commands for rendering.
     *
     * @param {FrameState} frameState The current frame state.
     */
    Vector3DTileGeometry.prototype.update = function(frameState) {
        if (!defined(this._primitive)) {
            createPrimitive(this);
        }
        this._primitive.debugWireframe = this.debugWireframe;
        this._primitive.update(frameState);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     */
    Vector3DTileGeometry.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * </p>
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    Vector3DTileGeometry.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Vector3DTileGeometry;
});
