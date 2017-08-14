define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Matrix4',
        './Vector3DTileBatch',
        './Vector3DTilePrimitive'
    ], function(
        Cartesian3,
        Color,
        defaultValue,
        defined,
        destroyObject,
        CesiumMath,
        Matrix4,
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
        this._batchIds = options.batchIds;
        this._center = options.center;
        this._modelMatrix = options.modelMatrix;
        this._batchTable = options.batchTable;

        this._primitive = undefined;

        /**
         * Draws the wireframe of the classification meshes.
         * @type {Boolean}
         * @default false
         */
        this.debugWireframe = false;
    }

    var scratchPosition = new Cartesian3();

    function createPrimitive(meshes) {
        var buffer = meshes._buffer;
        var byteOffset = meshes._byteOffset;

        var center = meshes._center;
        var modelMatrix = meshes._modelMatrix;

        var batchIds = meshes._batchIds;
        var batchTable = meshes._batchTable;

        var positionCount = meshes._positionCount;

        var indexOffsets = meshes._indexOffsets;
        var indexCounts = meshes._indexCounts;
        var indicesLength = 0;

        var i;
        var numMeshes = indexCounts.length;
        for (i = 0; i < numMeshes; ++i) {
            indicesLength += indexCounts[i];
        }

        var positions = new Float32Array(positionCount * 3);
        var vertexBatchIds = new Uint16Array(positionCount);

        var encodedIndices = new Uint32Array(buffer, byteOffset, indicesLength);
        var encodedPositions = new Float32Array(buffer, byteOffset + indicesLength * Uint32Array.BYTES_PER_ELEMENT, 3 * positionCount);

        var length = positions.length;
        for (i = 0; i < length; i += 3) {
            var position = Cartesian3.unpack(encodedPositions, i, scratchPosition);

            Matrix4.multiplyByPoint(modelMatrix, position, position);
            Cartesian3.subtract(position, center, position);

            Cartesian3.pack(position, positions, i);
        }

        var indices = new Uint32Array(indicesLength);
        var indexOffset = 0;
        var batchedIndices = new Array(numMeshes);

        for (i = 0; i < numMeshes; ++i) {
            var offset = indexOffsets[i];
            var count = indexCounts[i];
            var batchId = batchIds[i];

            for (var j = 0; j < count; ++j) {
                var index = encodedIndices[offset + j];
                indices[indexOffset + j] = index;
                vertexBatchIds[index] = batchId;
            }

            batchedIndices[i] = new Vector3DTileBatch({
                offset : indexOffset,
                count : count,
                color : batchTable.getColor(batchId, new Color()),
                batchIds : [batchId]
            });

            indexOffset += count;
        }

        meshes._primitive = new Vector3DTilePrimitive({
            batchTable : batchTable,
            positions : positions,
            batchIds : batchIds,
            vertexBatchIds : vertexBatchIds,
            indices : indices,
            indexOffsets : indexOffsets,
            indexCounts : indexCounts,
            batchedIndices : batchedIndices,
            boundingVolume : undefined, // TODO
            boundingVolumes : [], // TODO
            center : center,
            pickObject : defaultValue(meshes._pickObject, meshes)
        });

        meshes._buffer = undefined;
        meshes._byteOffset = undefined;
        meshes._positionOffset = undefined;
        meshes._positionCount = undefined;
        meshes._indexOffsets = undefined;
        meshes._indexCounts = undefined;
        meshes._batchIds = undefined;
        meshes._center = undefined;
        meshes._modelMatrix = undefined;
        meshes._batchTable = undefined;
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
