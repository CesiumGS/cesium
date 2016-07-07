/*global define*/
define([
    '../Core/BoundingSphere',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/Color',
    '../Core/ColorGeometryInstanceAttribute',
    '../Core/ComponentDatatype',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/defineProperties',
    '../Core/DeveloperError',
    '../Core/Ellipsoid',
    '../Core/Geometry',
    '../Core/Geometryattribute',
    '../Core/GeometryInstance',
    '../Core/getMagic',
    '../Core/getStringFromTypedArray',
    '../Core/loadArrayBuffer',
    '../Core/PolygonGeometry',
    '../Core/PolylineGeometry',
    '../Core/Request',
    '../Core/RequestScheduler',
    '../Core/RequestType',
    '../ThirdParty/when',
    './Cesium3DTileContentState',
    './GroundPrimitive',
    './LabelCollection',
    './PerInstanceColorAppearance',
    './PolylineColorAppearance',
    './Primitive'
], function(
    BoundingSphere,
    Cartesian3,
    Cartographic,
    Color,
    ColorGeometryInstanceAttribute,
    ComponentDatatype,
    defaultValue,
    defined,
    destroyObject,
    defineProperties,
    DeveloperError,
    Ellipsoid,
    Geometry,
    GeometryAttribute,
    GeometryInstance,
    getMagic,
    getStringFromTypedArray,
    loadArrayBuffer,
    PolygonGeometry,
    PolylineGeometry,
    Request,
    RequestScheduler,
    RequestType,
    when,
    Cesium3DTileContentState,
    GroundPrimitive,
    LabelCollection,
    PerInstanceColorAppearance,
    PolylineColorAppearance,
    Primitive) {
    'use strict';

    /**
     * @alias Vector3DTileContent
     * @constructor
     *
     * @private
     */
    function Vector3DTileContent(tileset, tile, url) {
        this._labelCollection = undefined;
        this._primitives = [];
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;

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
                // TODO: implement batchTable for vctr tile format
                return 0;
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

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.hasProperty = function(name) {
        // TODO: implement batchTable for vctr tile format
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Vector3DTileContent.prototype.getFeature = function(batchId) {
        // TODO: implement batchTable for vctr tile format
        return undefined;
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

        // Skip byteLength
        byteOffset += sizeOfUint32;

        var positionByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var indicesByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        if (positionByteLength === 0) {
            this.state = Cesium3DTileContentState.PROCESSING;
            this.contentReadyToProcessPromise.resolve(this);
            this.state = Cesium3DTileContentState.READY;
            this.readyPromise.resolve(this);
            return;
        }

        // padding
        byteOffset += sizeOfUint32;

        var positions = new Float64Array(arrayBuffer, byteOffset, positionByteLength / sizeOfFloat64);
        byteOffset += positionByteLength;
        var indices = new Uint32Array(arrayBuffer, byteOffset, indicesByteLength / sizeOfUint32);
        byteOffset += indicesByteLength;
        
        var x = view.getFloat64(byteOffset, true);
        byteOffset += sizeOfFloat64;
        var y = view.getFloat64(byteOffset, true);
        byteOffset += sizeOfFloat64;
        var z = view.getFloat64(byteOffset, true);
        byteOffset += sizeOfFloat64;
        var r = view.getFloat64(byteOffset, true);
        byteOffset += sizeOfFloat64;
        
        var minHeight = view.getFloat64(byteOffset, true);
        byteOffset += sizeOfFloat64;
        var maxHeight = view.getFloat64(byteOffset, true);
        
        var boundingSphere = new BoundingSphere(new Cartesian3(x, y, z), r);

        var color = Color.fromRandom().withAlpha(0.5);
        var geometryInstance = new GeometryInstance({
            geometry : new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        normalize : false,
                        values : positions
                    })
                },
                indices : indices,
                boundingSphere : boundingSphere
            }),
            attributes: {
                color: ColorGeometryInstanceAttribute.fromColor(color)
            }
        });

        this._primitives.push(new GroundPrimitive({
            geometryInstances : geometryInstance,
            asynchronous : false,
            _minimumHeight : minHeight !== Number.POSITIVE_INFINITY ? minHeight : undefined,
            _maximumHeight : maxHeight !== Number.NEGATIVE_INFINITY ? maxHeight : undefined,
            _precreated : true
        }));

        /*
        var labelCollection = new LabelCollection();

        var length = json.length;
        for (var i = 0; i < length; ++i) {
            var label = json[i];
            var labelText = label.text;
            var cartographicArray = label.position;

            var lon = cartographicArray[0];
            var lat = cartographicArray[1];
            var alt = defaultValue(cartographicArray[2], 0.0);

            var cartographic = new Cartographic(lon, lat, alt);
            var position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

            labelCollection.add({
                text : labelText,
                position : position
            });
        }
        */

        this.state = Cesium3DTileContentState.PROCESSING;
        this.contentReadyToProcessPromise.resolve(this);

        //this._labelCollection = labelCollection;
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
        //this._labelCollection.update(frameState);
        var primitives = this._primitives;
        var length = primitives.length;
        for (var i = 0; i < length; ++i) {
            primitives[i].update(frameState);
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
        return destroyObject(this);
    };

    return Vector3DTileContent;
});
