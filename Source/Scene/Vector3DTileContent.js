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

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat64 = Float64Array.BYTES_PER_ELEMENT;

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
            this._contentReadyToProcessPromise.resolve(this);
            this.state = Cesium3DTileContentState.READY;
            this._readyPromise.resolve(this);
            return;
        }

        var featureTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        /*
        //>>includeStart('debug', pragmas.debug);
        if (featureTableJSONByteLength === 0) {
            throw new DeveloperError('Feature table must have a byte length greater than zero');
        }
        //>>includeEnd('debug');
        */

        var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var batchTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var textByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var positionByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        // padding for byte alignment
        byteOffset += 7 * sizeOfUint32;

        // TODO:
        var featureTableJson;
        var featureTableBinary;
        if (featureTableJSONByteLength > 0) {
            var featureTableString = getStringFromTypedArray(uint8Array, byteOffset, featureTableJSONByteLength);
            featureTableJson = JSON.parse(featureTableString);
            byteOffset += featureTableJSONByteLength;

            featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
            byteOffset += featureTableBinaryByteLength;
        }

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

        var textString = getStringFromTypedArray(uint8Array, byteOffset, textByteLength);
        var text = JSON.parse(textString);
        byteOffset += textByteLength;

        var positions = new Float64Array(arrayBuffer, byteOffset, positionByteLength / sizeOfFloat64);

        var length = text.length;
        this._featuresLength = length;

        var batchTable = new Cesium3DTileBatchTable(this, length, batchTableJson, batchTableBinary);
        this.batchTable = batchTable;

        var labelCollection = new LabelCollection({
            batchTable : batchTable
        });
        var polylineCollection = new PolylineCollection();

        var displayCondition = this._tileset.distanceDisplayCondition;

        for (var i = 0; i < length; ++i) {
            var labelText = text[i];

            var lon = positions[i * 3];
            var lat = positions[i * 3 + 1];
            var alt = positions[i * 3 + 2];

            var cartographic = new Cartographic(lon, lat, alt);
            var position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

            cartographic.height += 100.0;
            var offsetPosition = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

            labelCollection.add({
                text : labelText,
                position : offsetPosition,
                horizontalOrigin : HorizontalOrigin.CENTER,
                distanceDisplayCondition : displayCondition
            });
            polylineCollection.add({
                positions : [position, offsetPosition],
                distanceDisplayCondition : displayCondition
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
    Vector3DTileContent.prototype.applyStyleWithShader = function(frameState, style) {
        return false;
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
