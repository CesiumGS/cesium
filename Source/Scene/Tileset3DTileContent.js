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
     * @alias Tileset3DTileContent
     * @constructor
     *
     * @private
     */
    function Tileset3DTileContent(tileset, tile, url) {
        this._tileset = tileset;
        this._tile = tile;
        this._url = url;

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

    defineProperties(Tileset3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
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
     * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
     * always returns <code>false</code> since a tile of this type does not have any features.
     */
    Tileset3DTileContent.prototype.hasProperty = function(name) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
     * always returns <code>undefined</code> since a tile of this type does not have any features.
     */
    Tileset3DTileContent.prototype.getFeature = function(batchId) {
        return undefined;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Tileset3DTileContent.prototype.request = function() {
        var that = this;

        this.state = Cesium3DTileContentState.LOADING;
        this._tileset.loadTileset(this._url, this._tile).then(function() {
            that.state = Cesium3DTileContentState.PROCESSING;
            that.contentReadyToProcessPromise.resolve(that);
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
    Tileset3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Tileset3DTileContent.prototype.update = function(tileset, frameState) {
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Tileset3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Tileset3DTileContent.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Tileset3DTileContent;
});
