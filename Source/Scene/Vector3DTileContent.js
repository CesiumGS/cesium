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
    '../Core/Matrix4',
    '../Core/PolygonGeometry',
    '../Core/PolylineGeometry',
    '../Core/Request',
    '../Core/RequestScheduler',
    '../Core/RequestType',
    '../ThirdParty/when',
    './Cesium3DTileContentState',
    './Cesium3DTileGroundPrimitive'
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
    Matrix4,
    PolygonGeometry,
    PolylineGeometry,
    Request,
    RequestScheduler,
    RequestType,
    when,
    Cesium3DTileContentState,
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

        this._primitive = undefined;

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

    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat32 = Float32Array.BYTES_PER_ELEMENT;
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
            this.contentReadyToProcessPromise.resolve(this);
            this.state = Cesium3DTileContentState.READY;
            this.readyPromise.resolve(this);
            return;
        }

        var positionOffsetsByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var positionCountsByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var indexOffsetsByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var indexCountsByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var indicesByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var positionByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var decodeMatrixArray = new Float32Array(arrayBuffer, byteOffset, 16);
        byteOffset += 16 * sizeOfFloat32;

        var decodeMatrix = Matrix4.unpack(decodeMatrixArray);

        var offsets = new Uint32Array(arrayBuffer, byteOffset, positionOffsetsByteLength / sizeOfUint32);
        byteOffset += positionOffsetsByteLength;
        var counts = new Uint32Array(arrayBuffer, byteOffset, positionCountsByteLength / sizeOfUint32);
        byteOffset += positionCountsByteLength;
        var indexOffsets = new Uint32Array(arrayBuffer, byteOffset, indexOffsetsByteLength / sizeOfUint32);
        byteOffset += indexOffsetsByteLength;
        var indexCounts = new Uint32Array(arrayBuffer, byteOffset, indexCountsByteLength / sizeOfUint32);
        byteOffset += indexCountsByteLength;
        var indices = new Uint32Array(arrayBuffer, byteOffset, indicesByteLength / sizeOfUint32);
        byteOffset += indicesByteLength;
        var positions = new Uint16Array(arrayBuffer, byteOffset, positionByteLength / sizeOfUint16);
        byteOffset += positionByteLength;

        var x = view.getFloat64(byteOffset, true);
        byteOffset += sizeOfFloat64;
        var y = view.getFloat64(byteOffset, true);
        byteOffset += sizeOfFloat64;
        var z = view.getFloat64(byteOffset, true);
        byteOffset += sizeOfFloat64;

        var center = new Cartesian3(x, y, z);
        
        var minHeight = view.getFloat64(byteOffset, true);
        byteOffset += sizeOfFloat64;
        var maxHeight = view.getFloat64(byteOffset, true);

        var color = Color.fromRandom().withAlpha(0.5);

        this._primitive = new Cesium3DTileGroundPrimitive({
            positions : positions,
            offsets : offsets,
            counts : counts,
            indexOffsets : indexOffsets,
            indexCounts : indexCounts,
            indices : indices,
            decodeMatrix : decodeMatrix,
            minimumHeight : minHeight,
            maximumHeight : maxHeight,
            center : center,
            color : color,
            boundingVolume : this._tile._boundingVolume.boundingVolume
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
        if (defined(this._primitive)) {
            this._primitive.update(frameState);
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
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Vector3DTileContent;
});
