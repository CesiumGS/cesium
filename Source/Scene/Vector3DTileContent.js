/*global define*/
define([
    '../Core/BoundingSphere',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/defineProperties',
    '../Core/DeveloperError',
    '../Core/Ellipsoid',
    '../Core/getMagic',
    '../Core/getStringFromTypedArray',
    '../Core/loadArrayBuffer',
    '../Core/PinBuilder',
    '../Core/Request',
    '../Core/RequestScheduler',
    '../Core/RequestType',
    '../ThirdParty/when',
    './BillboardCollection',
    './Cesium3DTileBatchTable',
    './Cesium3DTileContentState',
    './Cesium3DTileFeature',
    './HorizontalOrigin',
    './LabelCollection',
    './PointPrimitiveCollection',
    './PolylineCollection'
], function(
    BoundingSphere,
    Cartesian3,
    Cartographic,
    Color,
    defaultValue,
    defined,
    destroyObject,
    defineProperties,
    DeveloperError,
    Ellipsoid,
    getMagic,
    getStringFromTypedArray,
    loadArrayBuffer,
    PinBuilder,
    Request,
    RequestScheduler,
    RequestType,
    when,
    BillboardCollection,
    Cesium3DTileBatchTable,
    Cesium3DTileContentState,
    Cesium3DTileFeature,
    HorizontalOrigin,
    LabelCollection,
    PointPrimitiveCollection,
    PolylineCollection) {
    'use strict';

    /**
     * @alias Vector3DTileContent
     * @constructor
     *
     * @private
     */
    function Vector3DTileContent(tileset, tile, url) {
        this._labelCollection = undefined;
        this._polylineCollection = undefined;
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;

        /**
         * The following properties are part of the {@link Cesium3DTileContent} interface.
         */
        this.state = Cesium3DTileContentState.UNLOADED;
        this.batchTable = undefined;
        this.featurePropertiesDirty = false;

        this._contentReadyToProcessPromise = when.defer();
        this._readyPromise = when.defer();
        this._featuresLength = 0;
        this._features = undefined;
    }

    defineProperties(Vector3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
                return this._featuresLength;
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
        contentReadyToProcessPromise : {
            get : function() {
                return this._contentReadyToProcessPromise.promise;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        }
    });

    function createFeatures(content) {
        var tileset = content._tileset;
        var featuresLength = content._featuresLength;
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
        return this.batchTable.hasProperty(name);
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

        if (!defined(promise)) {
            return false;
        }

        this.state = Cesium3DTileContentState.LOADING;
        promise.then(function(arrayBuffer) {
            if (that.isDestroyed()) {
                return when.reject('tileset is destroyed');
            }
            that.initialize(arrayBuffer);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that._readyPromise.reject(error);
        });

        return true;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.initialize = function(arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);

        var text = getStringFromTypedArray(uint8Array, byteOffset);
        var json = JSON.parse(text);

        var labels = json.labels;
        var length = labels.length;

        this._featuresLength = length;

        var batchTable = new Cesium3DTileBatchTable(this, length, json.batchTable, undefined);
        this.batchTable = batchTable;

        var labelCollection = new LabelCollection({
            batchTable : batchTable
        });
        var polylineCollection = new PolylineCollection();

        for (var i = 0; i < length; ++i) {
            var label = labels[i];
            var labelText = label.text;
            var cartographicArray = label.position;

            var lon = cartographicArray[0];
            var lat = cartographicArray[1];
            var alt = defaultValue(cartographicArray[2], 0.0);

            var cartographic = new Cartographic(lon, lat, alt);
            var position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

            cartographic.height += 100.0;
            var offsetPosition = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

            labelCollection.add({
                text : labelText,
                position : offsetPosition,
                horizontalOrigin : HorizontalOrigin.CENTER
            });
            polylineCollection.add({
                positions : [position, offsetPosition]
            });

            this.batchTable.setColor(i, Color.WHITE);
        }

        this.state = Cesium3DTileContentState.PROCESSING;
        this._contentReadyToProcessPromise.resolve(this);

        this._labelCollection = labelCollection;
        this._polylineCollection = polylineCollection;
        this.state = Cesium3DTileContentState.READY;
        this._readyPromise.resolve(this);
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
        if (this._featuresLength === 0) {
            return;
        }
        this.batchTable.update(tileset, frameState);
        this._labelCollection.update(frameState);
        this._polylineCollection.update(frameState);
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
        this._labelCollection = this._labelCollection && this._labelCollection.destroy();
        this._polylineCollection = this._polylineCollection && this._polylineCollection.destroy();
        return destroyObject(this);
    };

    return Vector3DTileContent;
});
