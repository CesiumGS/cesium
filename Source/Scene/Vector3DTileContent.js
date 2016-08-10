/*global define*/
define([
    '../Core/BoundingSphere',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/Color',
    '../Core/ComponentDatatype',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/defineProperties',
    '../Core/DeveloperError',
    '../Core/Ellipsoid',
    '../Core/getMagic',
    '../Core/getStringFromTypedArray',
    '../Core/loadArrayBuffer',
    '../Core/Matrix4',
    '../Core/Request',
    '../Core/RequestScheduler',
    '../Core/RequestType',
    '../ThirdParty/when',
    './Cesium3DTileBatchTableResources',
    './Cesium3DTileContentState',
    './Cesium3DTileFeature',
    './Cesium3DTileGroundPolylines',
    './Cesium3DTileGroundPrimitive'
], function(
    BoundingSphere,
    Cartesian3,
    Cartographic,
    Color,
    ComponentDatatype,
    defaultValue,
    defined,
    destroyObject,
    defineProperties,
    DeveloperError,
    Ellipsoid,
    getMagic,
    getStringFromTypedArray,
    loadArrayBuffer,
    Matrix4,
    Request,
    RequestScheduler,
    RequestType,
    when,
    Cesium3DTileBatchTableResources,
    Cesium3DTileContentState,
    Cesium3DTileFeature,
    Cesium3DTileGroundPolylines,
    Cesium3DTileGroundPrimitive) {
    'use strict';

    /**
     * @alias Vector3DTileContent
     * @constructor
     *
     * @private
     */
    function Vector3DTileContent(tileset, tile, url) {
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;

        this._polygons = undefined;
        this._polylines = undefined;

        /**
         * The following properties are part of the {@link Cesium3DTileContent} interface.
         */
        this.state = Cesium3DTileContentState.UNLOADED;
        this.contentReadyToProcessPromise = when.defer();
        this.readyPromise = when.defer();
        this.batchTableResources = undefined;
        this.featurePropertiesDirty = false;
        this.boundingSphere = tile.contentBoundingVolume.boundingSphere;
    }

    defineProperties(Vector3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
                return this.batchTableResources.featuresLength;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        innerContents : {
            get : function() {
                return undefined;
            }
        }
    });

    function createFeatures(content) {
        var tileset = content._tileset;
        var featuresLength = content.featuresLength;
        if (!defined(content._features) && (featuresLength > 0)) {
            var features = new Array(featuresLength);
            for (var i = 0; i < featuresLength; ++i) {
                features[i] = new Cesium3DTileFeature(tileset, content, i);
            }
            content._features = features;
        }
    }

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.hasProperty = function(name) {
        return this.batchTableResources.hasProperty(name);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.getFeature = function(batchId) {
        var featuresLength = this._featuresLength;
        //>>includeStart('debug', pragmas.debug);
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
    Vector3DTileContent.prototype.request = function() {
        var that = this;

        var distance = this._tile.distanceToCamera;
        var promise = RequestScheduler.schedule(new Request({
            url : this._url,
            server : this._tile.requestServer,
            requestFunction : loadArrayBuffer,
            type : RequestType.TILES3D,
            distance : distance
        }));
        if (defined(promise)) {
            this.state = Cesium3DTileContentState.LOADING;
            promise.then(function(arrayBuffer) {
                if (that.isDestroyed()) {
                    return when.reject('tileset is destroyed');
                }
                that.initialize(arrayBuffer);
            }).otherwise(function(error) {
                that.state = Cesium3DTileContentState.FAILED;
                that.readyPromise.reject(error);
            });
        }
    };

    function createColorChangedCallback(content, numberOfPolygons) {
        return function(batchId, color) {
            if (defined(content._polygons) && batchId < numberOfPolygons) {
                content._polygons.updateCommands(batchId, color);
            }
        };
    }

    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.initialize = function(arrayBuffer, byteOffset) {
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
            this.state = Cesium3DTileContentState.PROCESSING;
            this.contentReadyToProcessPromise.resolve(this);
            this.state = Cesium3DTileContentState.READY;
            this.readyPromise.resolve(this);
            return;
        }

        var featureTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
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

        var featureTableString = getStringFromTypedArray(uint8Array, byteOffset, featureTableJSONByteLength);
        var featureTableJSON = JSON.parse(featureTableString);
        byteOffset += featureTableJSONByteLength;

        var featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
        byteOffset += featureTableBinaryByteLength;

        var numberOfPolygons = featureTableJSON.NUMBER_OF_POLYGONS;
        var numberOfPolylines = featureTableJSON.NUMBER_OF_POLYLINES;

        var batchTableResources = new Cesium3DTileBatchTableResources(this, numberOfPolygons + numberOfPolylines, createColorChangedCallback(this, numberOfPolygons));
        this.batchTableResources = batchTableResources;
        if (batchTableJSONByteLength > 0) {
            var batchTableString = getStringFromTypedArray(uint8Array, byteOffset, batchTableJSONByteLength);
            batchTableResources.batchTable = JSON.parse(batchTableString);
            byteOffset += batchTableJSONByteLength;
        }

        // TODO: Right now batchTableResources doesn't support binary
        byteOffset += batchTableBinaryByteLength;

        var indices = new Uint32Array(arrayBuffer, byteOffset, indicesByteLength / sizeOfUint32);
        byteOffset += indicesByteLength;
        var positions = new Uint16Array(arrayBuffer, byteOffset, positionByteLength / sizeOfUint16);
        byteOffset += positionByteLength;
        var polylinePositions = new Uint16Array(arrayBuffer, byteOffset, polylinePositionByteLength / sizeOfUint16);

        byteOffset = featureTableBinary.byteOffset + featureTableJSON.POLYGON_POSITION_OFFSETS.offset;
        var offsets = new Uint32Array(featureTableBinary.buffer, byteOffset, numberOfPolygons);

        byteOffset = featureTableBinary.byteOffset + featureTableJSON.POLYGON_POSITION_COUNTS.offset;
        var counts = new Uint32Array(featureTableBinary.buffer, byteOffset, numberOfPolygons);

        byteOffset = featureTableBinary.byteOffset + featureTableJSON.POLYGON_INDICES_OFFSETS.offset;
        var indexOffsets = new Uint32Array(featureTableBinary.buffer, byteOffset, numberOfPolygons);

        byteOffset = featureTableBinary.byteOffset + featureTableJSON.POLYGON_INDICES_COUNTS.offset;
        var indexCounts = new Uint32Array(featureTableBinary.buffer, byteOffset, numberOfPolygons);

        byteOffset = featureTableBinary.byteOffset + featureTableJSON.POLYLINE_POSITION_OFFSETS.offset;
        var polylineOffsets = new Uint32Array(featureTableBinary.buffer, byteOffset, numberOfPolylines);

        byteOffset = featureTableBinary.byteOffset + featureTableJSON.POLYLINE_POSITION_COUNTS.offset;
        var polylineCounts = new Uint32Array(featureTableBinary.buffer, byteOffset, numberOfPolylines);

        var center = Cartesian3.unpack(featureTableJSON.CENTER);
        var minHeight = featureTableJSON.MINIMUM_HEIGHT;
        var maxHeight = featureTableJSON.MAXIMUM_HEIGHT;
        var quantizedOffset = Cartesian3.unpack(featureTableJSON.QUANTIZED_VOLUME_OFFSET);
        var quantizedScale = Cartesian3.unpack(featureTableJSON.QUANTIZED_VOLUME_SCALE);

        // TODO: get feature colors
        var randomColors = [Color.fromRandom({alpha : 0.5}), Color.fromRandom({alpha : 0.5})];
        var colors = [];
        var tempLength = offsets.length;
        var n;
        for (n = 0; n < tempLength; ++n) {
            colors[n] = randomColors[n % randomColors.length];
            batchTableResources.setColor(n, colors[n]);
        }

        this._polygons = new Cesium3DTileGroundPrimitive({
            positions : positions,
            colors : colors,
            offsets : offsets,
            counts : counts,
            indexOffsets : indexOffsets,
            indexCounts : indexCounts,
            indices : indices,
            minimumHeight : minHeight,
            maximumHeight : maxHeight,
            center : center,
            quantizedOffset : quantizedOffset,
            quantizedScale : quantizedScale,
            boundingVolume : this._tile._boundingVolume.boundingVolume,
            batchTableResources : this.batchTableResources
        });

        // TODO: get feature colors/widths
        colors = [];
        var widths = [];
        var batchIds = [];
        tempLength = polylineOffsets.length;
        for (n = 0; n < tempLength; ++n) {
            colors[n] = randomColors[n % randomColors.length];
            batchTableResources.setColor(n + numberOfPolygons, colors[n]);

            widths[n] = 2.0;
            batchIds[n] = numberOfPolygons + n;
        }

        this._polylines = new Cesium3DTileGroundPolylines({
            positions : polylinePositions,
            widths : widths,
            offsets : polylineOffsets,
            counts : polylineCounts,
            batchIds : batchIds,
            center : center,
            quantizedOffset : quantizedOffset,
            quantizedScale : quantizedScale,
            boundingVolume : this._tile._boundingVolume.boundingVolume,
            batchTableResources : this.batchTableResources
        });

        this.state = Cesium3DTileContentState.PROCESSING;
        this.contentReadyToProcessPromise.resolve(this);

        this.state = Cesium3DTileContentState.READY;
        this.readyPromise.resolve(this);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.update = function(tileset, frameState) {
        if (defined(this.batchTableResources)) {
            this.batchTableResources.update(tileset, frameState);
        }

        if (defined(this._polygons)) {
            this._polygons.update(frameState);
        }

        if (defined(this._polylines)) {
            this._polylines.update(frameState);
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
        return destroyObject(this);
    };

    return Vector3DTileContent;
});
