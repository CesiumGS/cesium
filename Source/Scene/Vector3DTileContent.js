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
    '../Core/DistanceDisplayCondition',
    '../Core/Ellipsoid',
    '../Core/getMagic',
    '../Core/getStringFromTypedArray',
    '../Core/loadArrayBuffer',
    '../Core/NearFarScalar',
    '../Core/PinBuilder',
    '../Core/Request',
    '../Core/RequestScheduler',
    '../Core/RequestType',
    '../ThirdParty/when',
    './BillboardCollection',
    './Cesium3DTileBatchTable',
    './Cesium3DTileFeature',
    './HorizontalOrigin',
    './LabelCollection',
    './LabelStyle',
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
    DistanceDisplayCondition,
    Ellipsoid,
    getMagic,
    getStringFromTypedArray,
    loadArrayBuffer,
    NearFarScalar,
    PinBuilder,
    Request,
    RequestScheduler,
    RequestType,
    when,
    BillboardCollection,
    Cesium3DTileBatchTable,
    Cesium3DTileFeature,
    HorizontalOrigin,
    LabelCollection,
    LabelStyle,
    PointPrimitiveCollection,
    PolylineCollection) {
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
        this._labelCollection = undefined;
        this._polylineCollection = undefined;
        this._batchTable = undefined;
        this._features = undefined;
        this._featuresLength = 0;
        this._readyPromise = when.defer();
        this._ready = false;

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
                return this._featuresLength;
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
        pointsLength : {
            get : function() {
                return this._featuresLength;
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
                return this._batchTable.memorySizeInBytes;
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
        url: {
            get: function() {
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

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat64 = Float64Array.BYTES_PER_ELEMENT;

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
        content._featuresLength = length;

        var batchTable = new Cesium3DTileBatchTable(content, length, batchTableJson, batchTableBinary);
        content._batchTable = batchTable;

        var labelCollection = new LabelCollection({
            batchTable : batchTable
        });
        var polylineCollection = new PolylineCollection();

        var displayCondition = content._tileset.distanceDisplayCondition;

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

            content._batchTable.setColor(i, Color.WHITE);
        }

        content._labelCollection = labelCollection;
        content._polylineCollection = polylineCollection;
    }

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
    Vector3DTileContent.prototype.hasProperty = function(batchId, name) {
        return this._batchTable.hasProperty(batchId, name);
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
    Vector3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
    };

    function clearStyle(content) {
        var length = content._featuresLength;
        for (var i = 0; i < length; ++i) {
            var feature = content.getFeature(i);
            feature.show = true;
            feature.color = Color.WHITE;
            feature.outlineColor = Color.BLACK;
            feature.outlineWidth = 1.0;
            feature.labelStyle = LabelStyle.FILL;
            feature.font = '30px sans-serif';
            feature.anchorLineColor = Color.WHITE;
            feature.backgroundColor = 'rgba(42, 42, 42, 0.8)';
            feature.backgroundXPadding = 7.0;
            feature.backgroundYPadding = 5.0;
            feature.backgroundEnabled = false;
            feature.scaleByDistance = undefined;
            feature.translucencyByDistance = undefined;
        }
    }

    var scratchColor = new Color();

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.applyStyle = function(frameState, style) {
        if (!defined(style)) {
            clearStyle(this);
            return;
        }

        var length = this._featuresLength;
        for (var i = 0; i < length; ++i) {
            var feature = this.getFeature(i);
            feature.color = style.color.evaluateColor(frameState, feature, scratchColor);
            feature.show = style.show.evaluate(frameState, feature);
            feature.outlineColor = style.outlineColor.evaluateColor(frameState, feature);
            feature.outlineWidth = style.outlineWidth.evaluate(frameState, feature);
            feature.labelStyle = style.labelStyle.evaluate(frameState, feature);
            feature.font = style.font.evaluate(frameState, feature);
            feature.backgroundColor = style.backgroundColor.evaluateColor(frameState, feature);
            feature.backgroundXPadding = style.backgroundXPadding.evaluate(frameState, feature);
            feature.backgroundYPadding = style.backgroundYPadding.evaluate(frameState, feature);
            feature.backgroundEnabled = style.backgroundEnabled.evaluate(frameState, feature);

            if (defined(feature.anchorLineColor)) {
                feature.anchorLineColor = style.anchorLineColor.evaluateColor(frameState, feature);
            }

            var scaleByDistanceNearRange = style.scaleByDistanceNearRange;
            var scaleByDistanceNearValue = style.scaleByDistanceNearValue;
            var scaleByDistanceFarRange = style.scaleByDistanceFarRange;
            var scaleByDistanceFarValue = style.scaleByDistanceFarValue;

            if (defined(scaleByDistanceNearRange) && defined(scaleByDistanceNearValue) &&
                defined(scaleByDistanceFarRange) && defined(scaleByDistanceFarValue)) {
                var nearRange = scaleByDistanceNearRange.evaluate(frameState, feature);
                var nearValue = scaleByDistanceNearValue.evaluate(frameState, feature);
                var farRange = scaleByDistanceFarRange.evaluate(frameState, feature);
                var farValue = scaleByDistanceFarValue.evaluate(frameState, feature);

                feature.scaleByDistance = new NearFarScalar(nearRange, nearValue, farRange, farValue);
            } else {
                feature.scaleByDistance = undefined;
            }

            var translucencyByDistanceNearRange = style.translucencyByDistanceNearRange;
            var translucencyByDistanceNearValue = style.translucencyByDistanceNearValue;
            var translucencyByDistanceFarRange = style.translucencyByDistanceFarRange;
            var translucencyByDistanceFarValue = style.translucencyByDistanceFarValue;

            if (defined(translucencyByDistanceNearRange) && defined(translucencyByDistanceNearValue) &&
                defined(translucencyByDistanceFarRange) && defined(translucencyByDistanceFarValue)) {
                var tNearRange = translucencyByDistanceNearRange.evaluate(frameState, feature);
                var tNearValue = translucencyByDistanceNearValue.evaluate(frameState, feature);
                var tFarRange = translucencyByDistanceFarRange.evaluate(frameState, feature);
                var tFarValue = translucencyByDistanceFarValue.evaluate(frameState, feature);

                feature.translucencyByDistance = new NearFarScalar(tNearRange, tNearValue, tFarRange, tFarValue);
            } else {
                feature.translucencyByDistance = undefined;
            }

            var distanceDisplayConditionNear = style.distanceDisplayConditionNear;
            var distanceDisplayConditionFar = style.distanceDisplayConditionFar;

            if (defined(distanceDisplayConditionNear) && defined(distanceDisplayConditionFar)) {
                var near = distanceDisplayConditionNear.evaluate(frameState, feature);
                var far = distanceDisplayConditionFar.evaluate(frameState, feature);

                feature.distanceDisplayCondition = new DistanceDisplayCondition(near, far);
            }
        }
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.update = function(tileset, frameState) {
        if (this._featuresLength === 0) {
            return;
        }

        this._batchTable.update(tileset, frameState);
        this._labelCollection.update(frameState);
        this._polylineCollection.update(frameState);

        if (!this._ready) {
            this._readyPromise.resolve(this);
            this._ready = true;
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
        this._labelCollection = this._labelCollection && this._labelCollection.destroy();
        this._polylineCollection = this._polylineCollection && this._polylineCollection.destroy();
        this._batchTable = this._batchTable && this._batchTable.destroy();
        return destroyObject(this);
    };

    return Vector3DTileContent;
});
