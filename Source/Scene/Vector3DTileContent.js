define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayCondition',
        '../Core/Ellipsoid',
        '../Core/getMagic',
        '../Core/getStringFromTypedArray',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/NearFarScalar',
        '../Core/Rectangle',
        '../ThirdParty/when',
        './Cesium3DTileBatchTable',
        './LabelStyle',
        './Vector3DTileMeshes',
        './Vector3DTilePoints',
        './Vector3DTilePolygons',
        './Vector3DTilePolylines'
    ], function(
        Cartesian3,
        Color,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        DistanceDisplayCondition,
        Ellipsoid,
        getMagic,
        getStringFromTypedArray,
        CesiumMath,
        Matrix4,
        NearFarScalar,
        Rectangle,
        when,
        Cesium3DTileBatchTable,
        LabelStyle,
        Vector3DTileMeshes,
        Vector3DTilePoints,
        Vector3DTilePolygons,
        Vector3DTilePolylines) {
    'use strict';

    /**
     * @alias Vector3DTileContent
     * @constructor
     *
     * @private
     */
    function Vector3DTileContent(tileset, tile, url, arrayBuffer, byteOffset) {
        this._tileset = tileset;
        this._tile = tile;
        this._url = url;

        this._polygons = undefined;
        this._polylines = undefined;
        this._points = undefined;
        this._meshes = undefined;

        this._readyPromise = when.defer();

        this._batchTable = undefined;
        this._features = undefined;

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        this.featurePropertiesDirty = false;

        initialize(this, arrayBuffer, byteOffset);
    }

    defineProperties(Vector3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
                return defined(this._batchTable) ? this._batchTable.featuresLength : 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        pointsLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        trianglesLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        geometryByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        texturesByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        batchTableByteLength : {
            get : function() {
                return defined(this._batchTable) ? this._batchTable.memorySizeInBytes : 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        innerContents : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        tileset : {
            get : function() {
                return this._tileset;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        tile : {
            get : function() {
                return this._tile;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        batchTable : {
            get : function() {
                return this._batchTable;
            }
        }
    });

    function createColorChangedCallback(content) {
        return function(batchId, color) {
            if (defined(content._polygons)) {
                content._polygons.updateCommands(batchId, color);
            }
        };
    }

    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    function initialize(content, arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getMagic(uint8Array, byteOffset);
        if (magic !== 'vctr') {
            throw new DeveloperError('Invalid Vector tile.  Expected magic=vctr.  Read magic=' + magic);
        }

        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic number

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Vector tile version 1 is supported.  Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        var byteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        if (byteLength === 0) {
            content._readyPromise.resolve(content);
            return;
        }

        var featureTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        //>>includeStart('debug', pragmas.debug);
        if (featureTableJSONByteLength === 0) {
            throw new DeveloperError('Feature table must have a byte length greater than zero');
        }
        //>>includeEnd('debug');

        var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var batchTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var indicesByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var positionByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var polylinePositionByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var pointsPositionByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var featureTableString = getStringFromTypedArray(uint8Array, byteOffset, featureTableJSONByteLength);
        var featureTableJson = JSON.parse(featureTableString);
        byteOffset += featureTableJSONByteLength;

        var featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
        byteOffset += featureTableBinaryByteLength;

        var batchTableJson;
        var batchTableBinary;
        if (batchTableJSONByteLength > 0) {
            // PERFORMANCE_IDEA: is it possible to allocate this on-demand?  Perhaps keep the
            // arraybuffer/string compressed in memory and then decompress it when it is first accessed.
            //
            // We could also make another request for it, but that would make the property set/get
            // API async, and would double the number of numbers in some cases.
            var batchTableString = getStringFromTypedArray(uint8Array, byteOffset, batchTableJSONByteLength);
            batchTableJson = JSON.parse(batchTableString);
            byteOffset += batchTableJSONByteLength;

            if (batchTableBinaryByteLength > 0) {
                // Has a batch table binary
                batchTableBinary = new Uint8Array(arrayBuffer, byteOffset, batchTableBinaryByteLength);
                // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
                batchTableBinary = new Uint8Array(batchTableBinary);
                byteOffset += batchTableBinaryByteLength;
            }
        }

        var numberOfPolygons = defaultValue(featureTableJson.POLYGONS_LENGTH, 0);
        var numberOfPolylines = defaultValue(featureTableJson.POLYLINES_LENGTH, 0);
        var numberOfPoints = defaultValue(featureTableJson.POINTS_LENGTH, 0);
        var numberOfMeshes = defaultValue(featureTableJson.MESHES_LENGTH, 0);

        var totalPrimitives = numberOfPolygons + numberOfPolylines + numberOfPoints + numberOfMeshes;
        var batchTable = new Cesium3DTileBatchTable(content, totalPrimitives, batchTableJson, batchTableBinary, createColorChangedCallback(content));
        content._batchTable = batchTable;

        if (totalPrimitives === 0) {
            return;
        }

        var rectangle;
        if (defined(featureTableJson.RECTANGLE)) {
            rectangle = Rectangle.unpack(featureTableJson.RECTANGLE);
        } else {
            rectangle = content._tile.contentBoundingVolume.rectangle;
        }

        var minHeight = featureTableJson.MINIMUM_HEIGHT;
        var maxHeight = featureTableJson.MAXIMUM_HEIGHT;
        var format = defaultValue(featureTableJson.FORMAT, 0);
        var isCartographic = format === 0;
        var modelMatrix = content._tile.computedTransform;

        var center;
        if (defined(featureTableJson.RTC_CENTER)) {
            center = Cartesian3.unpack(featureTableJson.RTC_CENTER);
            Matrix4.multiplyByPoint(modelMatrix, center, center);
        } else {
            center = Rectangle.center(rectangle);
            if (isCartographic) {
                center.height = CesiumMath.lerp(minHeight, maxHeight, 0.5);
                center = Ellipsoid.WGS84.cartographicToCartesian(center);
            } else {
                center = Cartesian3.fromElements(center.longitude, center.latitude, 0.0);
                center.z = CesiumMath.lerp(minHeight, maxHeight, 0.5);
            }
            Matrix4.multiplyByPoint(modelMatrix, center, center);
        }

        var polygonBatchIds;
        var polylineBatchIds;
        var pointBatchIds;
        var meshBatchIds;
        var i;

        if (numberOfPolygons > 0 && defined(featureTableJson.POLYGON_BATCH_IDS)) {
            var polygonBatchIdsByteOffset = featureTableBinary.byteOffset + featureTableJson.POLYGON_BATCH_IDS.byteOffset;
            polygonBatchIds = new Uint16Array(featureTableBinary.buffer, polygonBatchIdsByteOffset, numberOfPolygons);
        }

        if (numberOfPolylines > 0 && defined(featureTableJson.POLYLINE_BATCH_IDS)) {
            var polylineBatchIdsByteOffset = featureTableBinary.byteOffset + featureTableJson.POLYLINE_BATCH_IDS.byteOffset;
            polylineBatchIds = new Uint16Array(featureTableBinary.buffer, polylineBatchIdsByteOffset, numberOfPolylines);
        }

        if (numberOfPoints > 0 && defined(featureTableJson.POINT_BATCH_IDS)) {
            var pointBatchIdsByteOffset = featureTableBinary.byteOffset + featureTableJson.POINT_BATCH_IDS.byteOffset;
            pointBatchIds = new Uint16Array(featureTableBinary.buffer, pointBatchIdsByteOffset, numberOfPoints);
        }

        if (numberOfMeshes > 0 && defined(featureTableJson.MESH_BATCH_IDS)) {
            var meshBatchIdsByteOffset = featureTableBinary.byteOffset + featureTableJson.MESH_BATCH_IDS.byteOffset;
            meshBatchIds = new Uint16Array(featureTableBinary.buffer, meshBatchIdsByteOffset, numberOfMeshes);
        }

        if (!defined(polygonBatchIds) || !defined(polylineBatchIds) || !defined(pointBatchIds) || !defined(meshBatchIds)) {
            var maxId = -1;

            if (defined(polygonBatchIds)) {
                for (i = 0; i < numberOfPolygons; ++i) {
                    maxId = Math.max(maxId, polygonBatchIds[i]);
                }
            }

            if (defined(polylineBatchIds)) {
                for (i = 0; i < numberOfPolylines; ++i) {
                    maxId = Math.max(maxId, polylineBatchIds[i]);
                }
            }

            if (defined(pointBatchIds)) {
                for (i = 0; i < numberOfPoints; ++i) {
                    maxId = Math.max(maxId, pointBatchIds[i]);
                }
            }

            if (defined(meshBatchIds)) {
                for (i = 0; i < numberOfMeshes; ++i) {
                    maxId = Math.max(maxId, meshBatchIds[i]);
                }
            }

            maxId = maxId + 1;

            if (!defined(polygonBatchIds) && numberOfPolygons > 0) {
                polygonBatchIds = new Uint16Array(numberOfPolygons);
                for (i = 0; i < numberOfPolygons; ++i) {
                    polygonBatchIds[i] = maxId++;
                }
            }

            if (!defined(polylineBatchIds) && numberOfPolylines > 0) {
                polylineBatchIds = new Uint16Array(numberOfPolylines);
                for (i = 0; i < numberOfPolylines; ++i) {
                    polylineBatchIds[i] = maxId++;
                }
            }

            if (!defined(pointBatchIds) && numberOfPoints > 0) {
                pointBatchIds = new Uint16Array(numberOfPoints);
                for (i = 0; i < numberOfPoints; ++i) {
                    pointBatchIds[i] = maxId++;
                }
            }

            if (!defined(meshBatchIds) && numberOfMeshes > 0) {
                meshBatchIds = new Uint16Array(numberOfMeshes);
                for (i = 0; i < numberOfMeshes; ++i) {
                    meshBatchIds[i] = maxId++;
                }
            }
        }

        var pickObject = {
            content : content,
            primitive : content._tileset
        };

        if (numberOfPolygons > 0) {
            var indices = new Uint32Array(arrayBuffer, byteOffset, indicesByteLength / sizeOfUint32);
            byteOffset += indicesByteLength;

            var polygonPositions = new Uint16Array(arrayBuffer, byteOffset, positionByteLength / sizeOfUint16);
            byteOffset += positionByteLength;

            var polygonCountByteOffset = featureTableBinary.byteOffset + featureTableJson.POLYGON_COUNT.byteOffset;
            var counts = new Uint32Array(featureTableBinary.buffer, polygonCountByteOffset, numberOfPolygons);

            var polygonIndexCountByteOffset = featureTableBinary.byteOffset + featureTableJson.POLYGON_INDEX_COUNT.byteOffset;
            var indexCounts = new Uint32Array(featureTableBinary.buffer, polygonIndexCountByteOffset, numberOfPolygons);

            var polygonMinimumHeights;
            var polygonMaximumHeights;
            if (defined(featureTableJson.POLYGON_MINIMUM_HEIGHTS) && defined(featureTableJson.POLYGON_MAXIMUM_HEIGHTS)) {
                var polygonMinimumHeightsByteOffset = featureTableBinary.byteOffset + featureTableJson.POLYGON_MINIMUM_HEIGHTS.byteOffset;
                polygonMinimumHeights = new Float32Array(featureTableBinary.buffer, polygonMinimumHeightsByteOffset, numberOfPolygons);

                var polygonMaximumHeightsByteOffset = featureTableBinary.byteOffset + featureTableJson.POLYGON_MAXIMUM_HEIGHTS.byteOffset;
                polygonMaximumHeights = new Float32Array(featureTableBinary.buffer, polygonMaximumHeightsByteOffset, numberOfPolygons);
            }

            content._polygons = new Vector3DTilePolygons({
                positions : polygonPositions,
                counts : counts,
                indexCounts : indexCounts,
                indices : indices,
                minimumHeight : minHeight,
                maximumHeight : maxHeight,
                polygonMinimumHeights : polygonMinimumHeights,
                polygonMaximumHeights : polygonMaximumHeights,
                center : center,
                rectangle : rectangle,
                boundingVolume : content._tile._boundingVolume.boundingVolume,
                batchTable : batchTable,
                batchIds : polygonBatchIds,
                pickObject : pickObject,
                isCartographic : isCartographic,
                modelMatrix : modelMatrix
            });
        }

        if (numberOfPolylines > 0) {
            var polylinePositions = new Uint16Array(arrayBuffer, byteOffset, polylinePositionByteLength / sizeOfUint16);
            byteOffset += polylinePositionByteLength;

            var polylineCountByteOffset = featureTableBinary.byteOffset + featureTableJson.POLYLINE_COUNT.byteOffset;
            var polylineCounts = new Uint32Array(featureTableBinary.buffer, polylineCountByteOffset, numberOfPolylines);

            var widths;
            if (!defined(featureTableJson.POLYLINE_WIDTHS)) {
                widths = new Array(numberOfPolylines);
                for (i = 0; i < numberOfPolylines; ++i) {
                    widths[i] = 2.0;
                }
            } else {
                var polylineWidthsByteOffset = featureTableBinary.byteOffset + featureTableJson.POLYLINE_WIDTHS.byteOffset;
                widths = new Uint16Array(featureTableBinary.buffer, polylineWidthsByteOffset, numberOfPolylines);
            }

            content._polylines = new Vector3DTilePolylines({
                positions : polylinePositions,
                widths : widths,
                counts : polylineCounts,
                batchIds : polylineBatchIds,
                minimumHeight : minHeight,
                maximumHeight : maxHeight,
                center : center,
                rectangle : rectangle,
                boundingVolume : content._tile._boundingVolume.boundingVolume,
                batchTable : batchTable
            });
        }

        if (numberOfPoints > 0) {
            var pointPositions = new Uint16Array(arrayBuffer, byteOffset, pointsPositionByteLength / sizeOfUint16);
            byteOffset += pointsPositionByteLength;

            content._points = new Vector3DTilePoints({
                positions : pointPositions,
                batchIds : pointBatchIds,
                minimumHeight : minHeight,
                maximumHeight : maxHeight,
                rectangle : rectangle,
                batchTable : batchTable
            });
        }

        if (numberOfMeshes > 0) {
            var meshIndexOffsetsByteOffset = featureTableBinary.byteOffset + featureTableJson.MESH_INDEX_OFFSETS.byteOffset;
            var meshIndexOffsets = new Uint32Array(featureTableBinary.buffer, meshIndexOffsetsByteOffset, numberOfMeshes);

            var meshIndexCountsByteOffset = featureTableBinary.byteOffset + featureTableJson.MESH_INDEX_COUNTS.byteOffset;
            var meshIndexCounts = new Uint32Array(featureTableBinary.buffer, meshIndexCountsByteOffset, numberOfMeshes);

            var meshPositionCount = featureTableJson.MESH_POSITION_COUNT;

            content._meshes = new Vector3DTileMeshes({
                buffer : arrayBuffer,
                byteOffset : byteOffset,
                positionCount : meshPositionCount,
                indexOffsets : meshIndexOffsets,
                indexCounts : meshIndexCounts,
                batchIds : meshBatchIds,
                center : center,
                modelMatrix : modelMatrix,
                batchTable : batchTable
            });
        }
    }

    function createFeatures(content) {
        var featuresLength = content.featuresLength;
        if (!defined(content._features) && (featuresLength > 0)) {
            var features = new Array(featuresLength);

            if (defined(content._polygons)) {
                content._polygons.createFeatures(content, features);
            }
            if (defined(content._polylines)) {
                content._polylines.createFeatures(content, features);
            }
            if (defined(content._points)) {
                content._points.createFeatures(content, features);
            }
            if (defined(content._meshes)) {
                content._meshes.createFeatures(content, features);
            }
            content._features = features;
        }
    }

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.hasProperty = function(batchId, name) {
        return this._batchTable.hasProperty(batchId, name);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.getFeature = function(batchId) {
        //>>includeStart('debug', pragmas.debug);
        var featuresLength = this.featuresLength;
        if (!defined(batchId) || (batchId < 0) || (batchId >= featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + (featuresLength - 1) + ').');
        }
        //>>includeEnd('debug');

        createFeatures(this);
        return this._features[batchId];
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        if (defined(this._polygons)) {
            this._polygons.applyDebugSettings(enabled, color);
        }
        if (defined(this._polylines)) {
            this._polylines.applyDebugSettings(enabled, color);
        }
        if (defined(this._points)) {
            this._points.applyDebugSettings(enabled, color);
        }
        if (defined(this._meshes)) {
            this._meshes.applyDebugSettings(enabled, color);
        }
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.applyStyle = function(frameState, style) {
        createFeatures(this);
        if (defined(this._polygons)) {
            this._polygons.applyStyle(frameState, style, this._features);
        }
        if (defined(this._polylines)) {
            this._polylines.applyStyle(frameState, style, this._features);
        }
        if (defined(this._points)) {
            this._points.applyStyle(frameState, style, this._features);
        }
        if (defined(this._meshes)) {
            this._meshes.applyStyle(frameState, style, this._features);
        }
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.update = function(tileset, frameState) {
        if (defined(this._batchTable)) {
            this._batchTable.update(tileset, frameState);
        }
        if (defined(this._polygons)) {
            this._polygons.update(frameState);
        }
        if (defined(this._polylines)) {
            this._polylines.update(frameState);
        }
        if (defined(this._points)) {
            this._points.update(frameState);
        }
        if (defined(this._meshes)) {
            this._meshes.debugWireframe = this._tileset.debugWireframe;
            this._meshes.update(frameState);
        }

        if (!defined(this._polygonReadyPromise)) {
            if (defined(this._polygons)) {
                var that = this;
                this._polygonReadyPromise = this._polygons.readyPromise.then(function() {
                    that._readyPromise.resolve(that);
                });
            } else {
                this._polygonReadyPromise = true;
                this._readyPromise.resolve(this);
            }
        }
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.destroy = function() {
        this._polygons = this._polygons && this._polygons.destroy();
        this._polylines = this._polylines && this._polylines.destroy();
        this._points = this._points && this._points.destroy();
        this._meshes = this._meshes && this._meshes.destroy();
        this._batchTable = this._batchTable && this._batchTable.destroy();
        return destroyObject(this);
    };

    return Vector3DTileContent;
});
