/*global define*/
define([
        '../Core/destroyObject',
        '../ThirdParty/when',
        './Cesium3DTileContentState'
    ], function(
        destroyObject,
        when,
        Cesium3DTileContentState) {
    "use strict";

    /**
     * @private
     */
    var Tileset3DTileContentProvider = function(tileset, tile, url) {
        this._tileset = tileset;
        this._tile = tile;
        this._url = url;

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

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#requestContent
     */
    Tileset3DTileContentProvider.prototype.request = function() {
        var that = this;

        this.state = Cesium3DTileContentState.LOADING;

        this._tileset.loadTilesJson(this._url, this._tile).then(function() {
            that.state = Cesium3DTileContentState.PROCESSING;
            that.processingPromise.resolve(that);
            that.state = Cesium3DTileContentState.READY;
            that.readyPromise.resolve(that);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        });
    };

    Tileset3DTileContentProvider.prototype.update = function(owner, frameState) {
    };

    Tileset3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    Tileset3DTileContentProvider.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Tileset3DTileContentProvider;
});
