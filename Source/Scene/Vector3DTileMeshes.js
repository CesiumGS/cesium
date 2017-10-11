define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/TaskProcessor',
        '../ThirdParty/when',
        './Vector3DTileBatch',
        './Vector3DTilePrimitive'
    ], function(
        BoundingSphere,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        CesiumMath,
        Matrix4,
        TaskProcessor,
        when,
        Vector3DTileBatch,
        Vector3DTilePrimitive) {
    'use strict';

    function Vector3DTileMeshes(options) {
        // these will all be released after the primitive is created
        this._buffer = options.buffer;
        this._byteOffset = options.byteOffset;
        this._positionCount = options.positionCount;
        this._indexOffsets = options.indexOffsets;
        this._indexCounts = options.indexCounts;
        this._indexBytesPerElement = options.indexBytesPerElement;
        this._batchIds = options.batchIds;
        this._center = options.center;
        this._modelMatrix = options.modelMatrix;
        this._batchTable = options.batchTable;
        this._boundingVolume = options.boundingVolume;
        this._pickObject = options.pickObject;

        this._positions = undefined;
        this._vertexBatchIds = undefined;
        this._indices = undefined;
        this._batchedIndices = undefined;
        this._transferrableBatchIds = undefined;
        this._batchTableColors = undefined;
        this._packedBuffer = undefined;
        this._boundingVolumes = undefined;

        this._ready = false;
        this._readyPromise = when.defer();

        this._verticesPromise = undefined;

        this._primitive = undefined;

        /**
         * Draws the wireframe of the classification meshes.
         * @type {Boolean}
         * @default false
         */
        this.debugWireframe = false;

        /**
         * Forces a re-batch instead of waiting after a number of frames have been rendered.
         * @type {Boolean}
         * @default false
         */
        this.forceRebatch = false;
    }

    defineProperties(Vector3DTileMeshes.prototype, {
        /**
         * Gets the number of triangles.
         *
         * @memberof Vector3DTileMeshes.prototype
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
         * @memberof Vector3DTileMeshes.prototype
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
         * @memberof Vector3DTileMeshes.prototype
         * @type {Promise}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        }
    });

    function packBuffer(meshes) {
        var offset = 0;
        var packedBuffer = new Float64Array(1 + Cartesian3.packedLength + Matrix4.packedLength);

        packedBuffer[offset++] = meshes._indexBytesPerElement;

        Cartesian3.pack(meshes._center, packedBuffer, offset);
        offset += Cartesian3.packedLength;

        Matrix4.pack(meshes._modelMatrix, packedBuffer, offset);

        return packedBuffer;
    }

    function unpackBuffer(meshes, packedBuffer) {
        var offset = 0;

        var numBVS = packedBuffer[offset++];
        var bvs = meshes._boundingVolumes = new Array(numBVS);

        for (var i = 0; i < numBVS; ++i) {
            bvs[i] = BoundingSphere.unpack(packedBuffer, offset);
            offset += BoundingSphere.packedLength;
        }

        var numBatchedIndices = packedBuffer[offset++];
        var bis = meshes._batchedIndices = new Array(numBatchedIndices);

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

    var createVerticesTaskProcessor = new TaskProcessor('createVectorTileMeshes');
    var scratchColor = new Color();

    function createPrimitive(meshes) {
        if (defined(meshes._primitive)) {
            return;
        }

        if (!defined(meshes._verticesPromise)) {
            var positions = meshes._positions;
            var indexOffsets = meshes._indexOffsets;
            var indexCounts = meshes._indexCounts;
            var indices = meshes._indices;

            var batchIds = meshes._transferrableBatchIds;
            var batchTableColors = meshes._batchTableColors;

            var packedBuffer = meshes._packedBuffer;

            if (!defined(batchTableColors)) {
                // Copy because they may be the views on the same buffer.
                var buffer = meshes._buffer;
                var byteOffset = meshes._byteOffset;

                indexOffsets = meshes._indexOffsets = meshes._indexOffsets.slice();
                indexCounts = meshes._indexCounts = meshes._indexCounts.slice();

                var positionCount = meshes._positionCount;
                var batchTable = meshes._batchTable;

                var i;
                var indicesLength = 0;
                var numMeshes = indexCounts.length;
                for (i = 0; i < numMeshes; ++i) {
                    indicesLength += indexCounts[i];
                }

                var start = byteOffset;
                var end = start + indicesLength * meshes._indexBytesPerElement;
                var bufferCopy = buffer.slice(start, end);
                if (meshes._indexBytesPerElement === Uint16Array.BYTES_PER_ELEMENT) {
                    indices = meshes._indices = new Uint16Array(bufferCopy);
                } else {
                    indices = meshes._indices = new Uint32Array(bufferCopy);
                }

                start = end;
                end = start + 3 * positionCount * Float32Array.BYTES_PER_ELEMENT;
                positions = meshes._positions = new Float32Array(buffer.slice(start, end));

                batchIds = meshes._transferrableBatchIds = new Uint32Array(meshes._batchIds);
                batchTableColors = meshes._batchTableColors = new Uint32Array(batchIds.length);

                var length = batchTableColors.length;
                for (i = 0; i < length; ++i) {
                    var color = batchTable.getColor(i, scratchColor);
                    batchTableColors[i] = color.toRgba();
                }

                packedBuffer = meshes._packedBuffer = packBuffer(meshes);
            }

            var transferrableObjects = [positions.buffer, indexOffsets.buffer, indexCounts.buffer, indices.buffer, batchIds.buffer, batchTableColors.buffer, packedBuffer.buffer];
            var parameters = {
                packedBuffer : packedBuffer.buffer,
                positions : positions.buffer,
                indexOffsets : indexOffsets.buffer,
                indexCounts : indexCounts.buffer,
                indices : indices.buffer,
                batchIds : batchIds.buffer,
                batchTableColors : batchTableColors.buffer
            };

            var verticesPromise = meshes._verticesPromise = createVerticesTaskProcessor.scheduleTask(parameters, transferrableObjects);
            if (!defined(verticesPromise)) {
                // Postponed
                return;
            }

            when(verticesPromise, function(result) {
                var packedBuffer = new Float64Array(result.packedBuffer);
                unpackBuffer(meshes, packedBuffer);

                if (meshes._indexBytesPerElement === 2) {
                    meshes._indices = new Uint16Array(result.indices);
                } else {
                    meshes._indices = new Uint32Array(result.indices);
                }

                meshes._indexOffsets = new Uint32Array(result.indexOffsets);
                meshes._indexCounts = new Uint32Array(result.indexCounts);

                // will be released
                meshes._positions = new Float32Array(result.positions);
                meshes._vertexBatchIds = new Uint16Array(result.batchIds);

                meshes._ready = true;
            });
        }

        if (meshes._ready && !defined(meshes._primitive)) {
            meshes._primitive = new Vector3DTilePrimitive({
                batchTable : meshes._batchTable,
                positions : meshes._positions,
                batchIds : meshes._batchIds,
                vertexBatchIds : meshes._vertexBatchIds,
                indices : meshes._indices,
                indexOffsets : meshes._indexOffsets,
                indexCounts : meshes._indexCounts,
                batchedIndices : meshes._batchedIndices,
                boundingVolume : meshes._boundingVolume,
                boundingVolumes : meshes._boundingVolumes,
                center : meshes._center,
                pickObject : defaultValue(meshes._pickObject, meshes)
            });

            meshes._buffer = undefined;
            meshes._byteOffset = undefined;
            meshes._positionCount = undefined;
            meshes._indexOffsets = undefined;
            meshes._indexCounts = undefined;
            meshes._batchIds = undefined;
            meshes._center = undefined;
            meshes._modelMatrix = undefined;
            meshes._batchTable = undefined;
            meshes._boundingVolume = undefined;
            meshes._pickObject = undefined;

            meshes._positions = undefined;
            meshes._vertexBatchIds = undefined;
            meshes._indices = undefined;
            meshes._batchedIndices = undefined;
            meshes._transferrableBatchIds = undefined;
            meshes._batchTableColors = undefined;
            meshes._packedBuffer = undefined;
            meshes._boundingVolumes = undefined;

            meshes._readyPromise.resolve();
        }
    }

    /**
     * Creates features for each mesh and places it at the batch id index of features.
     *
     * @param {Vector3DTileContent} content The vector tile content.
     * @param {Cesium3DTileFeature[]} features An array of features where the polygon features will be placed.
     */
    Vector3DTileMeshes.prototype.createFeatures = function(content, features) {
        this._primitive.createFeatures(content, features);
    };

    /**
     * Colors the entire tile when enabled is true. The resulting color will be (mesh batch table color * color).
     *
     * @param {Boolean} enabled Whether to enable debug coloring.
     * @param {Color} color The debug color.
     */
    Vector3DTileMeshes.prototype.applyDebugSettings = function(enabled, color) {
        this._primitive.applyDebugSettings(enabled, color);
    };

    /**
     * Apply a style to the content.
     *
     * @param {FrameState} frameState The frame state.
     * @param {Cesium3DTileStyle} style The style.
     * @param {Cesium3DTileFeature[]} features The array of features.
     */
    Vector3DTileMeshes.prototype.applyStyle = function(frameState, style, features) {
        this._primitive.applyStyle(frameState, style, features);
    };

    /**
     * Call when updating the color of a mesh with batchId changes color. The meshes will need to be re-batched
     * on the next update.
     *
     * @param {Number} batchId The batch id of the meshes whose color has changed.
     * @param {Color} color The new polygon color.
     */
    Vector3DTileMeshes.prototype.updateCommands = function(batchId, color) {
        this._primitive.updateCommands(batchId, color);
    };

    /**
     * Updates the batches and queues the commands for rendering.
     *
     * @param {FrameState} frameState The current frame state.
     */
    Vector3DTileMeshes.prototype.update = function(frameState) {
        createPrimitive(this);

        if (!this._ready) {
            return;
        }

        this._primitive.debugWireframe = this.debugWireframe;
        this._primitive.forceRebatch = this.forceRebatch;
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
    Vector3DTileMeshes.prototype.isDestroyed = function() {
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
    Vector3DTileMeshes.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Vector3DTileMeshes;
});
