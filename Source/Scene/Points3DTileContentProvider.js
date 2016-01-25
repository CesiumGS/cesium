/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/getMagic',
        '../Core/loadArrayBuffer',
        '../Core/OrientedBoundingBox',
        '../Core/PointGeometry',
        '../Core/RequestScheduler',
        '../ThirdParty/when',
        './Cesium3DTileContentState',
        './PointAppearance',
        './Primitive',
        './TileBoundingRegion',
        './TileBoundingSphere',
        './TileOrientedBoundingBox'
    ], function(
        BoundingSphere,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        GeometryInstance,
        getMagic,
        loadArrayBuffer,
        OrientedBoundingBox,
        PointGeometry,
        RequestScheduler,
        when,
        Cesium3DTileContentState,
        PointAppearance,
        Primitive,
        TileBoundingRegion,
        TileBoundingSphere,
        TileOrientedBoundingBox) {
    "use strict";

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Points/README.md|Points}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     * <p>
     * Use this to access and modify individual features (points) in the tile.
     * </p>
     * <p>
     * Do not construct this directly.  Access it through {@link Cesium3DTile#content}.
     * </p>
     *
     * @alias Points3DTileContentProvider
     * @constructor
     */
    function Points3DTileContentProvider(tileset, tile, url) {
        this._primitive = undefined;
        this._url = url;

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         *
         * @private
         */
        this.state = Cesium3DTileContentState.UNLOADED;

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         *
         * @private
         */
        this.processingPromise = when.defer();

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         *
         * @private
         */
        this.readyPromise = when.defer();

        // If the tile's bounding volume is not a BoundingSphere, convert to a BoundingSphere
        var boundingVolume = tile.contentBoundingVolume.boundingVolume;
        if (boundingVolume instanceof OrientedBoundingBox) {
            this.boundingSphere = BoundingSphere.fromOrientedBoundingBox(boundingVolume);
        } else {
            this.boundingSphere = boundingVolume;
        }
        // TODO: need to improve this for other bounding volumes, e.g., regions

        this._debugColor = Color.fromRandom({ alpha : 1.0 });
        this._debugColorizeTiles = false;
    }

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Points3DTileContentProvider.prototype.request = function() {
        var that = this;

        var promise = RequestScheduler.throttleRequest(this._url, loadArrayBuffer);
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
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Points3DTileContentProvider.prototype.initialize = function(arrayBuffer, byteOffset) {
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

        var positionsOffsetInBytes = byteOffset;
        var positions = new Float32Array(arrayBuffer, positionsOffsetInBytes, pointsLength * 3);

        var colorsOffsetInBytes = positionsOffsetInBytes + (pointsLength * (3 * Float32Array.BYTES_PER_ELEMENT));
        var colors = new Uint8Array(arrayBuffer, colorsOffsetInBytes, pointsLength * 3);

        // TODO: performance test with 'interleave : true'
        var instance = new GeometryInstance({
            geometry : new PointGeometry({
                positionsTypedArray : positions,
                colorsTypedArray: colors,
                boundingSphere: this.boundingSphere
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
        this.processingPromise.resolve(this);

        var that = this;

        when(primitive.readyPromise).then(function(primitive) {
            that.state = Cesium3DTileContentState.READY;
            that.readyPromise.resolve(that);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        });
    };

    function applyDebugSettings(tiles3D, content) {
        if (tiles3D.debugColorizeTiles && !content._debugColorizeTiles) {
            content._debugColorizeTiles = true;
            content._primitive.appearance.uniforms.highlightColor = content._debugColor;
        } else if (!tiles3D.debugColorizeTiles && content._debugColorizeTiles) {
            content._debugColorizeTiles = false;
            content._primitive.appearance.uniforms.highlightColor = Color.WHITE;
        }
    }

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Points3DTileContentProvider.prototype.update = function(tiles3D, frameState) {
        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.
        applyDebugSettings(tiles3D, this);
        this._primitive.update(frameState);
    };

    /**
     * @private
     */
    Points3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
    Points3DTileContentProvider.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Points3DTileContentProvider;
});
