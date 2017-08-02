define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/IndexDatatype',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle',
        '../Core/TaskProcessor',
        '../ThirdParty/when',
        './Vector3DTileBatch',
        './Vector3DTilePrimitive'
    ], function(
        Cartesian3,
        Color,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        Ellipsoid,
        IndexDatatype,
        Matrix4,
        OrientedBoundingBox,
        Rectangle,
        TaskProcessor,
        when,
        Vector3DTileBatch,
        Vector3DTilePrimitive) {
    'use strict';

    /**
     * Renders a batch of pre-triangulated polygons draped on terrain.
     *
     * @alias Vector3DTilePolygons
     * @constructor
     *
     * @param {Object} options An object with following properties:
     * @param {Float32Array|Uint16Array} options.positions The positions of the polygons. The positions must be contiguous
     * so that the positions for polygon n are in [c, c + counts[n]] where c = sum{counts[0], counts[n - 1]} and they are the outer ring of
     * the polygon in counter-clockwise order.
     * @param {Number[]} options.counts The number or positions in the each polygon.
     * @param {Uint16Array|Uint32Array} options.indices The indices of the triangulated polygons. The indices must be contiguous so that
     * the indices for polygon n are in [i, i + indexCounts[n]] where i = sum{indexCounts[0], indexCounts[n - 1]}.
     * @param {Number[]} options.indexCounts The number of indices for each polygon.
     * @param {Number} options.minimumHeight The minimum height of the terrain covered by the tile.
     * @param {Number} options.maximumHeight The maximum height of the terrain covered by the tile.
     * @param {Float32Array} [options.polygonMinimumHeights] An array containing the minimum heights for each polygon.
     * @param {Float32Array} [options.polygonMaximumHeights] An array containing the maximum heights for each polygon.
     * @param {Rectangle} options.rectangle The rectangle containing the tile.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.
     * @param {Cartesian3} [options.center=Cartesian3.ZERO] The RTC center.
     * @param {Cesium3DTileBatchTable} options.batchTable The batch table for the tile containing the batched polygons.
     * @param {Number[]} options.batchIds The batch ids for each polygon.
     * @param {BoundingSphere} options.boundingVolume The bounding volume for the entire batch of polygons.
     *
     * @private
     */
    function Vector3DTilePolygons(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._batchTable = options.batchTable;

        // These arrays are released after VAO creation.
        this._batchIds = options.batchIds;
        this._positions = options.positions;
        this._counts = options.counts;

        // These arrays are kept for re-batching indices based on colors.
        // If WebGL 2 is supported, indices will be released and rebatching uses buffer-to-buffer copies.
        this._indices = options.indices;
        this._indexCounts = options.indexCounts;
        this._indexOffsets = undefined;

        // Typed arrays transferred to web worker.
        this._batchTableColors = undefined;
        this._packedBuffer = undefined;

        // Typed array transferred from web worker and released after vbo creation.
        this._batchedPositions = undefined;
        this._transferrableBatchIds = undefined;
        this._vertexBatchIds = undefined;

        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._minimumHeight = options.minimumHeight;
        this._maximumHeight = options.maximumHeight;
        this._polygonMinimumHeights = options.polygonMinimumHeights;
        this._polygonMaximumHeights = options.polygonMaximumHeights;
        this._center = defaultValue(options.center, Cartesian3.ZERO);
        this._rectangle = options.rectangle;
        this._isCartographic = options.isCartographic;
        this._modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY);

        this._boundingVolume = options.boundingVolume;
        this._boundingVolumes = undefined;

        this._batchedIndices = undefined;

        this._pickObject = options.pickObject;

        this._ready = false;
        this._readyPromise = when.defer();

        this._verticesPromise = undefined;

        this._primitive = undefined;
    }

    defineProperties(Vector3DTilePolygons.prototype, {
        /**
         * Gets a promise that resolves when the primitive is ready to render.
         * @memberof Vector3DTilePolygons.prototype
         * @type {Promise}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        }
    });

    function packBuffer(polygons) {
        var packedBuffer = new Float64Array(3 + Cartesian3.packedLength + Ellipsoid.packedLength + Rectangle.packedLength + Matrix4.packedLength);

        var offset = 0;
        packedBuffer[offset++] = polygons._minimumHeight;
        packedBuffer[offset++] = polygons._maximumHeight;

        Cartesian3.pack(polygons._center, packedBuffer, offset);
        offset += Cartesian3.packedLength;

        Ellipsoid.pack(polygons._ellipsoid, packedBuffer, offset);
        offset += Ellipsoid.packedLength;

        Rectangle.pack(polygons._rectangle, packedBuffer, offset);
        offset += Rectangle.packedLength;

        packedBuffer[offset++] = polygons._isCartographic ? 1.0 : 0.0;

        Matrix4.pack(polygons._modelMatrix, packedBuffer, offset);

        return packedBuffer;
    }

    function unpackBuffer(polygons, packedBuffer) {
        var offset = 1;

        var numBVS = packedBuffer[offset++];
        var bvs = polygons._boundingVolumes = new Array(numBVS);

        for (var i = 0; i < numBVS; ++i) {
            bvs[i] = OrientedBoundingBox.unpack(packedBuffer, offset);
            offset += OrientedBoundingBox.packedLength;
        }

        var numBatchedIndices = packedBuffer[offset++];
        var bis = polygons._batchedIndices = new Array(numBatchedIndices);

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

    var createVerticesTaskProcessor = new TaskProcessor('createVerticesFromVectorTile');
    var scratchColor = new Color();

    function createPrimitive(polygons) {
        if (defined(polygons._primitive)) {
            return;
        }

        if (!defined(polygons._verticesPromise)) {
            var positions = polygons._positions;
            var counts = polygons._counts;
            var indexCounts = polygons._indexCounts;
            var indices = polygons._indices;

            var batchIds = polygons._transferrableBatchIds;
            var batchTableColors = polygons._batchTableColors;

            var packedBuffer = polygons._packedBuffer;

            if (!defined(batchTableColors)) {
                // Copy because they may be the views on the same buffer.
                positions = polygons._positions = polygons._positions.slice();
                counts = polygons._counts = polygons._counts.slice();
                indexCounts = polygons._indexCounts= polygons._indexCounts.slice();
                indices = polygons._indices = polygons._indices.slice();

                batchIds = polygons._transferrableBatchIds = new Uint32Array(polygons._batchIds);
                batchTableColors = polygons._batchTableColors = new Uint32Array(batchIds.length);
                var batchTable = polygons._batchTable;

                var length = batchTableColors.length;
                for (var i = 0; i < length; ++i) {
                    //var color = batchTable.getColor(batchIds[i], scratchColor);
                    var color = batchTable.getColor(i, scratchColor);
                    batchTableColors[i] = color.toRgba();
                }

                packedBuffer = polygons._packedBuffer = packBuffer(polygons);
            }

            var transferrableObjects = [positions.buffer, counts.buffer, indexCounts.buffer, indices.buffer, batchIds.buffer, batchTableColors.buffer, packedBuffer.buffer];
            var parameters = {
                packedBuffer : packedBuffer.buffer,
                positions : positions.buffer,
                counts : counts.buffer,
                indexCounts : indexCounts.buffer,
                indices : indices.buffer,
                batchIds : batchIds.buffer,
                batchTableColors : batchTableColors.buffer
            };

            var minimumHeights = polygons._polygonMinimumHeights;
            var maximumHeights = polygons._polygonMaximumHeights;
            if (defined(minimumHeights) && defined(maximumHeights)) {
                transferrableObjects.push(minimumHeights.buffer, maximumHeights.buffer);
                parameters.minimumHeights = minimumHeights;
                parameters.maximumHeights = maximumHeights;
            }

            var verticesPromise = polygons._verticesPromise = createVerticesTaskProcessor.scheduleTask(parameters, transferrableObjects);
            if (!defined(verticesPromise)) {
                // Postponed
                return;
            }

            when(verticesPromise, function(result) {
                polygons._positions = undefined;
                polygons._counts = undefined;
                polygons._polygonMinimumHeights = undefined;
                polygons._polygonMaximumHeights = undefined;

                var packedBuffer = new Float64Array(result.packedBuffer);
                var indexDatatype = packedBuffer[0];
                unpackBuffer(polygons, packedBuffer);

                polygons._indices = IndexDatatype.getSizeInBytes(indexDatatype) === 2 ? new Uint16Array(result.indices) : new Uint32Array(result.indices);
                polygons._indexOffsets = new Uint32Array(result.indexOffsets);
                polygons._indexCounts = new Uint32Array(result.indexCounts);

                // will be released
                polygons._batchedPositions = new Float32Array(result.positions);
                polygons._vertexBatchIds = new Uint32Array(result.batchIds);

                polygons._ready = true;
            });
        }

        if (polygons._ready && !defined(polygons._primitive)) {
            polygons._primitive = new Vector3DTilePrimitive({
                batchTable : polygons._batchTable,
                positions : polygons._batchedPositions,
                batchIds : polygons._batchIds,
                vertexBatchIds : polygons._vertexBatchIds,
                indices : polygons._indices,
                indexOffsets : polygons._indexOffsets,
                indexCounts : polygons._indexCounts,
                batchedIndices : polygons._batchedIndices,
                boundingVolume : polygons._boundingVolume,
                boundingVolumes : polygons._boundingVolumes,
                center : polygons._center,
                pickObject : defaultValue(polygons._pickObject, polygons)
            });

            polygons._batchedPositions = undefined;
            polygons._transferrableBatchIds = undefined;
            polygons._vertexBatchIds = undefined;
            polygons._verticesPromise = undefined;

            polygons._readyPromise.resolve();
        }
    }

    /**
     * Creates features for each polygon and places it at the batch id index of features.
     *
     * @param {Vector3DTileContent} content The vector tile content.
     * @param {Cesium3DTileFeature[]} features An array of features where the polygon features will be placed.
     */
    Vector3DTilePolygons.prototype.createFeatures = function(content, features) {
        this._primitive.createFeatures(content, features);
    };

    /**
     * Colors the entire tile when enabled is true. The resulting color will be (polygon batch table color * color).
     *
     * @param {Boolean} enabled Whether to enable debug coloring.
     * @param {Color} color The debug color.
     */
    Vector3DTilePolygons.prototype.applyDebugSettings = function(enabled, color) {
        this._primitive.applyDebugSettings(enabled, color);
    };

    /**
     * Apply a style to the content.
     *
     * @param {FrameState} frameState The frame state.
     * @param {Cesium3DTileStyle} style The style.
     * @param {Cesium3DTileFeature[]} features The array of features.
     */
    Vector3DTilePolygons.prototype.applyStyle = function(frameState, style, features) {
        this._primitive.applyStyle(frameState, style, features);
    };

    /**
     * Call when updating the color of a polygon with batchId changes color. The polygons will need to be re-batched
     * on the next update.
     *
     * @param {Number} batchId The batch id of the polygon whose color has changed.
     * @param {Color} color The new polygon color.
     */
    Vector3DTilePolygons.prototype.updateCommands = function(batchId, color) {
        this._primitive.updateCommands(batchId, color);
    };

    /**
     * Updates the batches and queues the commands for rendering.
     *
     * @param {FrameState} frameState The current frame state.
     */
    Vector3DTilePolygons.prototype.update = function(frameState) {
        createPrimitive(this);

        if (!this._ready) {
            return;
        }

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
    Vector3DTilePolygons.prototype.isDestroyed = function() {
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
    Vector3DTilePolygons.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Vector3DTilePolygons;
});
