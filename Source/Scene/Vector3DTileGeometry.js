define([
        '../Core/BoxGeometry',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/CylinderGeometry',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/EllipsoidGeometry',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/TaskProcessor',
        '../Core/VertexFormat',
        '../ThirdParty/when',
        './Vector3DTileBatch',
        './Vector3DTilePrimitive'
    ], function(
        BoxGeometry,
        Cartesian3,
        Color,
        CylinderGeometry,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        EllipsoidGeometry,
        CesiumMath,
        Matrix4,
        TaskProcessor,
        VertexFormat,
        when,
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

        this._ready = false;
        this._readyPromise = when.defer();

        this._verticesPromise = undefined;

        this._primitive = undefined;

        /**
         * Draws the wireframe of the classification geometries.
         * @type {Boolean}
         * @default false
         */
        this.debugWireframe = false;
    }

    defineProperties(Vector3DTileGeometry.prototype, {
        /**
         * Gets the number of triangles.
         *
         * @memberof Vector3DTileGeometry.prototype
         *
         * @type {Number}
         * @readonly
         */
        trianglesLength : {
            get : function() {
                if (defined(this._primitive)) {
                    return this._primitive.trianglesLength;
                }
                return 0;
            }
        },

        /**
         * Gets the geometry memory in bytes.
         *
         * @memberof Vector3DTileGeometry.prototype
         *
         * @type {Number}
         * @readonly
         */
        geometryByteLength : {
            get : function() {
                if (defined(this._primitive)) {
                    return this._primitive.geometryByteLength;
                }
                return 0;
            }
        },

        /**
         * Gets a promise that resolves when the primitive is ready to render.
         * @memberof Vector3DTileGeometry.prototype
         * @type {Promise}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        }
    });

    Vector3DTileGeometry.packedBoxLength = Matrix4.packedLength + Cartesian3.packedLength;
    Vector3DTileGeometry.packedCylinderLength = Matrix4.packedLength + 2;
    Vector3DTileGeometry.packedEllipsoidLength = Matrix4.packedLength + Cartesian3.packedLength;
    Vector3DTileGeometry.packedSphereLength = Matrix4.packedLength + 1;

    function packBuffer(geometries) {
        var packedBuffer = new Float64Array(Matrix4.packedLength + Cartesian3.packedLength);

        var offset = 0;
        Cartesian3.pack(geometries._center, packedBuffer, offset);
        offset += Cartesian3.packedLength;
        Matrix4.pack(geometries._modelMatrix, packedBuffer, offset);

        return packedBuffer;
    }

    function unpackBuffer(geometries, packedBuffer) {
        var offset = 0;

        var numBatchedIndices = packedBuffer[offset++];
        var bis = geometries._batchedIndices = new Array(numBatchedIndices);

        for (var j = 0; j < numBatchedIndices; ++j) {
            var color = Color.unpack(packedBuffer, offset);
            offset += Color.packedLength;

            var indexOffset = packedBuffer[offset++];
            var count = packedBuffer[offset++];

            var length = packedBuffer[offset++];
            var batchIds = new Array(length);

            for (var k = 0; k < length; ++k) {
                batchIds[k] = packedBuffer[offset++];
            }

            bis[j] = new Vector3DTileBatch({
                color : color,
                offset : indexOffset,
                count : count,
                batchIds : batchIds
            });
        }
    }

    var createVerticesTaskProcessor = new TaskProcessor('createVectorTileGeometries');
    var scratchColor = new Color();

    function createPrimitive(geometries) {
        if (defined(geometries._primitive)) {
            return;
        }
        if (!defined(geometries._verticesPromise)) {
            var boxes = geometries._boxes;
            var boxBatchIds = geometries._boxBatchIds;
            var cylinders = geometries._cylinders;
            var cylinderBatchIds = geometries._cylinderBatchIds;
            var ellipsoids = geometries._ellipsoids;
            var ellipsoidBatchIds = geometries._ellipsoidBatchIds;
            var spheres = geometries._spheres;
            var sphereBatchIds = geometries._sphereBatchIds;

            var batchTableColors = geometries._batchTableColors;
            var packedBuffer = geometries._packedBuffer;

            if (!defined(batchTableColors)) {
                // Copy because they may be the views on the same buffer.
                boxes = geometries._boxes = boxes.slice();
                boxBatchIds = geometries._boxBatchIds = boxBatchIds.slice();
                cylinders = geometries._cylinders = cylinders.slice();
                cylinderBatchIds = geometries._cylinderBatchIds = cylinderBatchIds.slice();
                ellipsoids = geometries._ellipsoids = ellipsoids.slice();
                ellipsoidBatchIds = geometries._ellipsoidBatchIds = ellipsoidBatchIds.slice();
                spheres = geometries._sphere = spheres.slice();
                sphereBatchIds = geometries._sphereBatchIds = sphereBatchIds.slice();

                var length = boxBatchIds.length + cylinderBatchIds.length + ellipsoidBatchIds.length + sphereBatchIds.length;
                batchTableColors = geometries._batchTableColors = new Uint32Array(length);

                var batchTable = geometries._batchTable;

                for (var i = 0; i < length; ++i) {
                    var color = batchTable.getColor(i, scratchColor);
                    batchTableColors[i] = color.toRgba();
                }

                packedBuffer = geometries._packedBuffer = packBuffer(geometries);
            }

            var transferrableObjects = [];
            transferrableObjects.push(boxes.buffer, boxBatchIds.buffer);
            transferrableObjects.push(cylinders.buffer, cylinderBatchIds.buffer);
            transferrableObjects.push(ellipsoids.buffer, ellipsoidBatchIds.buffer);
            transferrableObjects.push(spheres.buffer, sphereBatchIds.buffer);
            transferrableObjects.push(batchTableColors.buffer, packedBuffer.buffer);

            var parameters = {
                boxes : boxes.buffer,
                boxBatchIds : boxBatchIds.buffer,
                cylinders : cylinders.buffer,
                cylinderBatchIds : cylinderBatchIds.buffer,
                ellipsoids : ellipsoids.buffer,
                ellipsoidBatchIds : ellipsoidBatchIds.buffer,
                spheres : spheres.buffer,
                sphereBatchIds : sphereBatchIds.buffer,
                batchTableColors : batchTableColors.buffer,
                packedBuffer : packedBuffer.buffer
            };

            var verticesPromise = geometries._verticesPromise = createVerticesTaskProcessor.scheduleTask(parameters, transferrableObjects);
            if (!defined(verticesPromise)) {
                // Postponed
                return;
            }

            when(verticesPromise, function(result) {
                var packedBuffer = new Float64Array(result.packedBuffer);
                unpackBuffer(geometries, packedBuffer);

                geometries._indices = new Uint32Array(result.indices);
                geometries._indexOffsets = new Uint32Array(result.indexOffsets);
                geometries._indexCounts = new Uint32Array(result.indexCounts);

                geometries._positions = new Float32Array(result.positions);
                geometries._vertexBatchIds = new Uint32Array(result.vertexBatchIds);

                geometries._batchIds = new Uint16Array(result.batchIds);

                geometries._ready = true;
            });
        }

        if (geometries._ready && !defined(geometries._primitive)) {
            geometries._primitive = new Vector3DTilePrimitive({
                batchTable : geometries._batchTable,
                positions : geometries._positions,
                batchIds : geometries._batchIds,
                vertexBatchIds : geometries._vertexBatchIds,
                indices : geometries._indices,
                indexOffsets : geometries._indexOffsets,
                indexCounts : geometries._indexCounts,
                batchedIndices : geometries._batchedIndices,
                boundingVolume : geometries._boundingVolume,
                boundingVolumes : [], // TODO
                center : geometries._center,
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

            geometries._readyPromise.resolve();
        }
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
        createPrimitive(this);

        if (!this._ready) {
            return;
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
