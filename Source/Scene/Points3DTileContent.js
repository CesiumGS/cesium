/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/getMagic',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        '../Core/PointGeometry',
        '../Core/Request',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../ThirdParty/when',
        './Cesium3DTileContentState',
        './PointAppearance',
        './Primitive'
    ], function(
        BoundingSphere,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        destroyObject,
        defineProperties,
        DeveloperError,
        GeometryInstance,
        getMagic,
        getStringFromTypedArray,
        loadArrayBuffer,
        PointGeometry,
        Request,
        RequestScheduler,
        RequestType,
        when,
        Cesium3DTileContentState,
        PointAppearance,
        Primitive) {
    'use strict';

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Points/README.md|Points}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     *
     * @alias Points3DTileContent
     * @constructor
     *
     * @private
     */
    function Points3DTileContent(tileset, tile, url) {
        this._primitive = undefined;
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
        this._debugColor = Color.fromRandom({ alpha : 1.0 });
        this._debugColorizeTiles = false;
    }

    defineProperties(Points3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
                // TODO: implement batchTable for pnts tile format
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
    Points3DTileContent.prototype.hasProperty = function(name) {
        // TODO: implement batchTable for pnts tile format
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.getFeature = function(batchId) {
        // TODO: implement batchTable for pnts tile format
        return undefined;
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat32 = Float32Array.BYTES_PER_ELEMENT;

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.request = function() {
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

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.initialize = function(arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getMagic(uint8Array, byteOffset);
        if (magic !== 'pnts') {
            throw new DeveloperError('Invalid Points tile.  Expected magic=pnts.  Read magic=' + magic);
        }

        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic number

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Points tile version 1 is supported.  Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        // Skip byteLength
        byteOffset += sizeOfUint32;

        var pointsLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var positions = new Float32Array(arrayBuffer, byteOffset, pointsLength * 3);
        byteOffset += pointsLength * 3 * sizeOfFloat32;

        var colors;

        if (batchTableJSONByteLength > 0) {
            // Get the batch table JSON
            var batchTableString = getStringFromTypedArray(uint8Array, byteOffset, batchTableJSONByteLength);
            var batchTableJSON = JSON.parse(batchTableString);
            byteOffset += batchTableJSONByteLength;

            // Get the batch table binary
            var batchTableBinary;
            if (batchTableBinaryByteLength > 0) {
                batchTableBinary = new Uint8Array(arrayBuffer, byteOffset, batchTableBinaryByteLength);
            }
            byteOffset += batchTableBinaryByteLength;

            // Get the point colors
            var tiles3DRGB = batchTableJSON.TILES3D_RGB;
            if (defined(tiles3DRGB)) {
                var binaryByteOffset = tiles3DRGB.byteOffset;
                colors = new Uint8Array(batchTableBinary, binaryByteOffset, pointsLength * 3);
            }
        }

        if (!defined(colors)) {
            // If the tile does not contain colors, default to gray
            var length = pointsLength * 3;
            colors = new Uint8Array(length);
            for (var i = 0; i < length; ++i) {
                colors[i] = 64;
            }
        }

        // TODO: performance test with 'interleave : true'
        var instance = new GeometryInstance({
            geometry : new PointGeometry({
                positionsTypedArray : positions,
                colorsTypedArray : colors,
                boundingSphere : this.boundingSphere
            })
        });
        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : new PointAppearance(),
            asynchronous : false,
            allowPicking : false,
            cull : false,
            rtcCenter : this.boundingSphere.center
        });

        this._primitive = primitive;
        this.state = Cesium3DTileContentState.PROCESSING;
        this.contentReadyToProcessPromise.resolve(this);

        var that = this;

        when(primitive.readyPromise).then(function(primitive) {
            that.state = Cesium3DTileContentState.READY;
            that.readyPromise.resolve(that);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        });
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        color = enabled ? color : Color.WHITE;
        this._primitive.appearance.uniforms.highlightColor = color;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.update = function(tileset, frameState) {
        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.
        this._primitive.update(frameState);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Points3DTileContent;
});
