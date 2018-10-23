define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/FeatureDetection',
        '../Core/getMagic',
        '../Core/getStringFromTypedArray',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/Rectangle',
        '../Core/RuntimeError',
        '../ThirdParty/when',
        './Cesium3DTileBatchTable',
        './Vector3DTilePoints',
        './Vector3DTilePolygons',
        './Vector3DTilePolylines'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        FeatureDetection,
        getMagic,
        getStringFromTypedArray,
        CesiumMath,
        Matrix4,
        Rectangle,
        RuntimeError,
        when,
        Cesium3DTileBatchTable,
        Vector3DTilePoints,
        Vector3DTilePolygons,
        Vector3DTilePolylines) {
    'use strict';

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/3d-tiles-next/TileFormats/VectorData|Vector}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification|3D Tiles} tileset.
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias Vector3DTileContent
     * @constructor
     *
     * @private
     */
    function Vector3DTileContent(tileset, tile, resource, arrayBuffer, byteOffset) {
        this._tileset = tileset;
        this._tile = tile;
        this._resource = resource;

        this._polygons = undefined;
        this._polylines = undefined;
        this._points = undefined;

        this._contentReadyPromise = undefined;
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
        featuresLength : {
            get : function() {
                return defined(this._batchTable) ? this._batchTable.featuresLength : 0;
            }
        },

        pointsLength : {
            get : function() {
                if (defined(this._points)) {
                    return this._points.pointsLength;
                }
                return 0;
            }
        },

        trianglesLength : {
            get : function() {
                var trianglesLength = 0;
                if (defined(this._polygons)) {
                    trianglesLength += this._polygons.trianglesLength;
                }
                if (defined(this._polylines)) {
                    trianglesLength += this._polylines.trianglesLength;
                }
                return trianglesLength;
            }
        },

        geometryByteLength : {
            get : function() {
                var geometryByteLength = 0;
                if (defined(this._polygons)) {
                    geometryByteLength += this._polygons.geometryByteLength;
                }
                if (defined(this._polylines)) {
                    geometryByteLength += this._polylines.geometryByteLength;
                }
                return geometryByteLength;
            }
        },

        texturesByteLength : {
            get : function() {
                if (defined(this._points)) {
                    return this._points.texturesByteLength;
                }
                return 0;
            }
        },

        batchTableByteLength : {
            get : function() {
                return defined(this._batchTable) ? this._batchTable.memorySizeInBytes : 0;
            }
        },

        innerContents : {
            get : function() {
                return undefined;
            }
        },

        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        tileset : {
            get : function() {
                return this._tileset;
            }
        },

        tile : {
            get : function() {
                return this._tile;
            }
        },

        url : {
            get : function() {
                return this._resource.getUrlComponent(true);
            }
        },

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

    function getBatchIds(featureTableJson, featureTableBinary) {
        var polygonBatchIds;
        var polylineBatchIds;
        var pointBatchIds;
        var i;

        var numberOfPolygons = defaultValue(featureTableJson.POLYGONS_LENGTH, 0);
        var numberOfPolylines = defaultValue(featureTableJson.POLYLINES_LENGTH, 0);
        var numberOfPoints = defaultValue(featureTableJson.POINTS_LENGTH, 0);

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

        var atLeastOneDefined = defined(polygonBatchIds) || defined(polylineBatchIds) || defined(pointBatchIds);
        var atLeastOneUndefined = (numberOfPolygons > 0 && !defined(polygonBatchIds)) ||
                                  (numberOfPolylines > 0 && !defined(polylineBatchIds)) ||
                                  (numberOfPoints > 0 && !defined(pointBatchIds));

        if (atLeastOneDefined && atLeastOneUndefined) {
            throw new RuntimeError('If one group of batch ids is defined, then all batch ids must be defined.');
        }

        var allUndefinedBatchIds = !defined(polygonBatchIds) && !defined(polylineBatchIds) && !defined(pointBatchIds);
        if (allUndefinedBatchIds) {
            var id = 0;
            if (!defined(polygonBatchIds) && numberOfPolygons > 0) {
                polygonBatchIds = new Uint16Array(numberOfPolygons);
                for (i = 0; i < numberOfPolygons; ++i) {
                    polygonBatchIds[i] = id++;
                }
            }
            if (!defined(polylineBatchIds) && numberOfPolylines > 0) {
                polylineBatchIds = new Uint16Array(numberOfPolylines);
                for (i = 0; i < numberOfPolylines; ++i) {
                    polylineBatchIds[i] = id++;
                }
            }
            if (!defined(pointBatchIds) && numberOfPoints > 0) {
                pointBatchIds = new Uint16Array(numberOfPoints);
                for (i = 0; i < numberOfPoints; ++i) {
                    pointBatchIds[i] = id++;
                }
            }
        }

        return {
            polygons : polygonBatchIds,
            polylines : polylineBatchIds,
            points : pointBatchIds
        };
    }

    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    function initialize(content, arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic number

        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new RuntimeError('Only Vector tile version 1 is supported.  Version ' + version + ' is not.');
        }
        byteOffset += sizeOfUint32;

        var byteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        if (byteLength === 0) {
            content._readyPromise.resolve(content);
            return;
        }

        var featureTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        if (featureTableJSONByteLength === 0) {
            throw new RuntimeError('Feature table must have a byte length greater than zero');
        }

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
        var totalPrimitives = numberOfPolygons + numberOfPolylines + numberOfPoints;

        var batchTable = new Cesium3DTileBatchTable(content, totalPrimitives, batchTableJson, batchTableBinary, createColorChangedCallback(content));
        content._batchTable = batchTable;

        if (totalPrimitives === 0) {
            return;
        }

        var rectangle;
        var minHeight;
        var maxHeight;
        if (defined(featureTableJson.REGION)) {
            var region = featureTableJson.REGION;
            rectangle = Rectangle.unpack(region);
            minHeight = region[4];
            maxHeight = region[5];
        } else {
            throw new RuntimeError('REGION is required in the feature table.');
        }

        var modelMatrix = content._tile.computedTransform;

        var center;
        if (defined(featureTableJson.RTC_CENTER)) {
            center = Cartesian3.unpack(featureTableJson.RTC_CENTER);
            Matrix4.multiplyByPoint(modelMatrix, center, center);
        } else {
            center = Rectangle.center(rectangle);
            center.height = CesiumMath.lerp(minHeight, maxHeight, 0.5);
            center = Ellipsoid.WGS84.cartographicToCartesian(center);
        }

        var batchIds = getBatchIds(featureTableJson, featureTableBinary);

        byteOffset += byteOffset % 4;

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
                boundingVolume : content.tile.boundingVolume.boundingVolume,
                batchTable : batchTable,
                batchIds : batchIds.polygons,
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
                widths = new Uint16Array(numberOfPolylines);
                for (var i = 0; i < numberOfPolylines; ++i) {
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
                batchIds : batchIds.polylines,
                minimumHeight : minHeight,
                maximumHeight : maxHeight,
                center : center,
                rectangle : rectangle,
                boundingVolume : content.tile.boundingVolume.boundingVolume,
                batchTable : batchTable
            });
        }

        if (numberOfPoints > 0) {
            var pointPositions = new Uint16Array(arrayBuffer, byteOffset, pointsPositionByteLength / sizeOfUint16);
            content._points = new Vector3DTilePoints({
                positions : pointPositions,
                batchIds : batchIds.points,
                minimumHeight : minHeight,
                maximumHeight : maxHeight,
                rectangle : rectangle,
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
            content._features = features;
        }
    }

    Vector3DTileContent.prototype.hasProperty = function(batchId, name) {
        return this._batchTable.hasProperty(batchId, name);
    };

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
    };

    Vector3DTileContent.prototype.applyStyle = function(style) {
        createFeatures(this);
        if (defined(this._polygons)) {
            this._polygons.applyStyle(style, this._features);
        }
        if (defined(this._polylines)) {
            this._polylines.applyStyle(style, this._features);
        }
        if (defined(this._points)) {
            this._points.applyStyle(style, this._features);
        }
    };

    Vector3DTileContent.prototype.update = function(tileset, frameState) {
        var ready = true;
        if (defined(this._polygons)) {
            this._polygons.classificationType = this._tileset.classificationType;
            this._polygons.update(frameState);
            ready = ready && this._polygons._ready;
        }
        if (defined(this._polylines)) {
            this._polylines.update(frameState);
            ready = ready && this._polylines._ready;
        }
        if (defined(this._points)) {
            this._points.update(frameState);
            ready = ready && this._points._ready;
        }
        if (defined(this._batchTable) && ready) {
            this._batchTable.update(tileset, frameState);
        }

        if (!defined(this._contentReadyPromise)) {
            var pointsPromise = defined(this._points) ? this._points.readyPromise : undefined;
            var polygonPromise = defined(this._polygons) ? this._polygons.readyPromise : undefined;
            var polylinePromise = defined(this._polylines) ? this._polylines.readyPromise : undefined;

            var that = this;
            this._contentReadyPromise = when.all([pointsPromise, polygonPromise, polylinePromise]).then(function() {
                that._readyPromise.resolve(that);
            });
        }
    };

    Vector3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    Vector3DTileContent.prototype.destroy = function() {
        this._polygons = this._polygons && this._polygons.destroy();
        this._polylines = this._polylines && this._polylines.destroy();
        this._points = this._points && this._points.destroy();
        this._batchTable = this._batchTable && this._batchTable.destroy();
        return destroyObject(this);
    };

    return Vector3DTileContent;
});
