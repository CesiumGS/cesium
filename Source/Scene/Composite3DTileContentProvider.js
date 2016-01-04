/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getMagic',
        '../Core/loadArrayBuffer',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../ThirdParty/when',
        './Cesium3DTileContentState'
    ], function(
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        getMagic,
        loadArrayBuffer,
        RequestScheduler,
        RequestType,
        when,
        Cesium3DTileContentState) {
    "use strict";

    /**
     * DOC_TBA
     */
    function Composite3DTileContentProvider(tileset, tile, url, factory) {
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
    }

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#requestContent
     */
    Composite3DTileContentProvider.prototype.request = function() {
        var that = this;

        var promise = RequestScheduler.throttleRequest(this._url, loadArrayBuffer, RequestType.TILES3D, 0.0);
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
     * DOC_TBA
     */
    Composite3DTileContentProvider.prototype.initialize = function(arrayBuffer, byteOffset) {
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
        this.processingPromise.resolve(this);

        var tilesToLoad = tilesLength;

        var that = this;

        function checkDone() {
            if (tilesToLoad === 0) {
                that.state = Cesium3DTileContentState.READY;
                that.readyPromise.resolve(that);
            }
        }

        function tileLoaded(content) {
            tilesToLoad--;
            checkDone();
        }

        function tileFailed(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        }

        checkDone();

        for (var i = 0; i < tilesLength; ++i) {
            var tileType = getMagic(uint8Array, byteOffset);

            // Tile byte length is stored after magic and version
            var tileByteLength = view.getUint32(byteOffset + sizeOfUint32 * 2, true);

            var contentFactory = this._factory[tileType];

            if (defined(contentFactory)) {
                var content = contentFactory(this._tileset, this._tile, this._url);
                content.initialize(arrayBuffer, byteOffset);
                this._contentProviders.push(content);
                when(content.readyPromise).then(tileLoaded).otherwise(tileFailed);
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
        var length = this._contentProviders.length;
        for (var i = 0; i < length; ++i) {
            this._contentProviders[i].destroy();
        }
        return destroyObject(this);
    };

    return Composite3DTileContentProvider;
});
