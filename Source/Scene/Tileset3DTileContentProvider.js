/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../ThirdParty/when',
        './Cesium3DTileContentState'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        when,
        Cesium3DTileContentState) {
    "use strict";

    /**
     * Represents content for a tile in a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset whose
     * content points to another 3D Tiles tileset.
     *
     * @alias Tileset3DTileContentProvider
     * @constructor
     *
     * @private
     */
    function Tileset3DTileContentProvider(tileset, tile, url) {
        this._tileset = tileset;
        this._tile = tile;
        this._url = url;

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        this.state = Cesium3DTileContentState.UNLOADED;

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        this.contentReadyToProcessPromise = when.defer();

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        this.readyPromise = when.defer();
    }

    defineProperties(Tileset3DTileContentProvider.prototype, {
        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        featuresLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        innerContents : {
            get : function() {
                return undefined;
            }
        }
    });

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.  <code>Tileset3DTileContentProvider</code>
     * always returns <code>false</code> since a tile of this type does not have any features.
     */
    Tileset3DTileContentProvider.prototype.hasProperty = function(name) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.  <code>Tileset3DTileContentProvider</code>
     * always returns <code>undefined</code> since a tile of this type does not have any features.
     */
    Tileset3DTileContentProvider.prototype.getFeature = function(batchId) {
        return undefined;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Tileset3DTileContentProvider.prototype.request = function() {
        var that = this;

        var promise = this._tileset.loadTileset(this._url, this._tile);

        if (defined(promise)) {
            this.state = Cesium3DTileContentState.LOADING;
            promise.then(function() {
                that.state = Cesium3DTileContentState.PROCESSING;
                that.contentReadyToProcessPromise.resolve(that);
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
     */
    Tileset3DTileContentProvider.prototype.applyDebugSettings = function(enabled, color) {
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Tileset3DTileContentProvider.prototype.update = function(tiles3D, frameState) {
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Tileset3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Tileset3DTileContentProvider.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Tileset3DTileContentProvider;
});
