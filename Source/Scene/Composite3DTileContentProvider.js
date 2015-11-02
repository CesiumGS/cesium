/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        './Cesium3DTileContentState',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        getStringFromTypedArray,
        loadArrayBuffer,
        Cesium3DTileContentState,
        when) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Composite3DTileContentProvider = function(tileset, tile, url, factory) {
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;
        this._contentProviders = [];
        this._factory = factory;

        /**
         * @readonly
         */
        this.state = Cesium3DTileContentState.UNLOADED;

        /**
         * @type {Promise}
         */
        this.processingPromise = when.defer();

        /**
         * @type {Promise}
         */
        this.readyPromise = when.defer();
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    function getSubarray(array, offset, length) {
        return array.subarray(offset, offset + length);
    }

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#requestContent
     */
    Composite3DTileContentProvider.prototype.request = function() {
        var that = this;

        this.state = Cesium3DTileContentState.LOADING;

        loadArrayBuffer(this._url).then(function(arrayBuffer) {
            that.init(arrayBuffer);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        });
    };

    /**
     * DOC_TBA
     */
    Composite3DTileContentProvider.prototype.init = function(arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getStringFromTypedArray(getSubarray(uint8Array, byteOffset, Math.min(4, uint8Array.byteLength)));
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

        var tilesToLoad = tilesLength;

        this.state = Cesium3DTileContentState.PROCESSING;
        this.processingPromise.resolve(this);

        var that = this;

        for (var i = 0; i < tilesLength; ++i) {
            var tileType = getStringFromTypedArray(getSubarray(uint8Array, byteOffset, 4));

            // Tile byte length is stored after magic and version
            var tileByteLength = view.getUint32(byteOffset + sizeOfUint32 * 2, true);

            var contentFactory = this._factory[tileType];

            if (defined(contentFactory)) {
                var content = contentFactory(this._tileset, this._tile, this._url);
                content.init(arrayBuffer, byteOffset);
                this._contentProviders.push(content);

                when(content.readyPromise).then(function(content) {
                    if (--tilesToLoad === 0) {
                        that.state = Cesium3DTileContentState.READY;
                        that.readyPromise.resolve(that);
                    }
                }).otherwise(function(error) {
                    that.state = Cesium3DTileContentState.FAILED;
                    that.readyPromise.reject(error);
                });
            } else {
                throw new DeveloperError('Unknown tile content type, ' + tileType + ', inside Composite tile');
            }

            byteOffset += tileByteLength;
        }
    };

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#update
     */
    Composite3DTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
        var length = this._contentProviders.length;
        for (var i = 0; i < length; ++i) {
            this._contentProviders[i].update(owner, context, frameState, commandList);
        }
    };

    /**
     * DOC_TBA
     */
    Composite3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    Composite3DTileContentProvider.prototype.destroy = function() {
        for (var i = 0; i < this._contentProviders; ++i) {
            this._contentProviders[i].destroy();
        }
        return destroyObject(this);
    };
    return Composite3DTileContentProvider;
});
