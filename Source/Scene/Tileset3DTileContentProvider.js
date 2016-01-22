/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        '../ThirdParty/when',
        './Cesium3DTileContentState'
    ], function(
        defined,
        destroyObject,
        when,
        Cesium3DTileContentState) {
    "use strict";

    /**
     * DOC_TBA
     */
    function Tileset3DTileContentProvider(tileset, tile, url) {
        this._tileset = tileset;
        this._tile = tile;
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
    }

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Tileset3DTileContentProvider.prototype.request = function() {
        var that = this;

        var promise = this._tileset.loadTileset(this._url, this._tile);

        if (defined(promise)) {
            this.state = Cesium3DTileContentState.LOADING;
            promise.then(function() {
                that.state = Cesium3DTileContentState.PROCESSING;
                that.processingPromise.resolve(that);
                that.state = Cesium3DTileContentState.READY;
                that.readyPromise.resolve(that);
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
    Tileset3DTileContentProvider.prototype.update = function(tiles3D, frameState) {
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Tileset3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Tileset3DTileContentProvider.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Tileset3DTileContentProvider;
});
