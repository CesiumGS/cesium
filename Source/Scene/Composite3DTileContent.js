/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/getMagic',
        '../Core/loadArrayBuffer',
        '../Core/Request',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../ThirdParty/when',
        './Cesium3DTileContentState'
    ], function(
        defaultValue,
        defined,
        destroyObject,
        defineProperties,
        DeveloperError,
        getMagic,
        loadArrayBuffer,
        Request,
        RequestScheduler,
        RequestType,
        when,
        Cesium3DTileContentState) {
    "use strict";

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Composite/README.md|Composite}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     *
     * @alias Composite3DTileContent
     * @constructor
     *
     * @private
     */
    function Composite3DTileContent(tileset, tile, url, factory) {
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;
        this._content = [];
        this._factory = factory;

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        this.state = Cesium3DTileContentState.UNLOADED;

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        this.contentReadyToProcessPromise = when.defer();

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        this.readyPromise = when.defer();
    }

    defineProperties(Composite3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
         * always returns <code>0</code>.  Instead call <code>featuresLength</code> for a tile in the composite.
         */
        featuresLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Gets the array of {@link Cesium3DTileContent} objects that represent the
         * content of the composite's inner tiles, which can also be composites.
         */
        innerContents : {
            get : function() {
                return this._content;
            }
        }
    });

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
     * always returns <code>false</code>.  Instead call <code>hasProperty</code> for a tile in the composite.
     */
    Composite3DTileContent.prototype.hasProperty = function(name) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
     * always returns <code>undefined</code>.  Instead call <code>getFeature</code> for a tile in the composite.
     */
    Composite3DTileContent.prototype.getFeature = function(batchId) {
        return undefined;
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Composite3DTileContent.prototype.request = function() {
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
    Composite3DTileContent.prototype.initialize = function(arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getMagic(uint8Array, byteOffset);
        if (magic !== 'cmpt') {
            throw new DeveloperError('Invalid Composite Tile. Expected magic=cmpt. Read magic=' + magic);
        }

        var view = new DataView(arrayBuffer);

        byteOffset += sizeOfUint32;  // Skip magic number

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Composite Tile version 1 is supported. Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        // Skip byteLength
        byteOffset += sizeOfUint32;

        var tilesLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        this.state = Cesium3DTileContentState.PROCESSING;
        this.contentReadyToProcessPromise.resolve(this);

        var contentPromises = [];

        for (var i = 0; i < tilesLength; ++i) {
            var tileType = getMagic(uint8Array, byteOffset);

            // Tile byte length is stored after magic and version
            var tileByteLength = view.getUint32(byteOffset + sizeOfUint32 * 2, true);

            var contentFactory = this._factory[tileType];

            if (defined(contentFactory)) {
                var content = contentFactory(this._tileset, this._tile, this._url);
                content.initialize(arrayBuffer, byteOffset);
                this._content.push(content);
                contentPromises.push(content.readyPromise);
            } else {
                throw new DeveloperError('Unknown tile content type, ' + tileType + ', inside Composite tile');
            }

            byteOffset += tileByteLength;
        }

        var that = this;

        when.all(contentPromises, function() {
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
    Composite3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        var length = this._content.length;
        for (var i = 0; i < length; ++i) {
            this._content[i].applyDebugSettings(enabled, color);
        }
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Composite3DTileContent.prototype.update = function(tiles3D, context, frameState, commandList) {
        var length = this._content.length;
        for (var i = 0; i < length; ++i) {
            this._content[i].update(tiles3D, context, frameState, commandList);
        }
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Composite3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Composite3DTileContent.prototype.destroy = function() {
        var length = this._content.length;
        for (var i = 0; i < length; ++i) {
            this._content[i].destroy();
        }
        return destroyObject(this);
    };

    return Composite3DTileContent;
});
