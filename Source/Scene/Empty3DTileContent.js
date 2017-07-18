define([
        '../Core/defineProperties',
        '../Core/destroyObject'
    ], function(
        defineProperties,
        destroyObject) {
    'use strict';

    /**
     * Represents empty content for tiles in a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset that
     * do not have content, e.g., because they are used to optimize hierarchical culling.
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias Empty3DTileContent
     * @constructor
     *
     * @private
     */
    function Empty3DTileContent(tileset, tile) {
        this._tileset = tileset;
        this._tile = tile;

        /**
         * @inheritdoc Cesium3DTileContent#featurePropertiesDirty
         */
        this.featurePropertiesDirty = false;
    }

    defineProperties(Empty3DTileContent.prototype, {
        /**
         * @inheritdoc Cesium3DTileContent#featuresLength
         */
        featuresLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#pointsLength
         */
        pointsLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#trianglesLength
         */
        trianglesLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#geometryByteLength
         */
        geometryByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#texturesByteLength
         */
        texturesByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#batchTableByteLength
         */
        batchTableByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#innerContents
         */
        innerContents : {
            get : function() {
                return undefined;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#readyPromise
         */
        readyPromise : {
            get : function() {
                return undefined;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#tileset
         */
        tileset : {
            get : function() {
                return this._tileset;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#tile
         */
        tile : {
            get : function() {
                return this._tile;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#url
         */
        url: {
            get: function() {
                return undefined;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#batchTable
         */
        batchTable : {
            get : function() {
                return undefined;
            }
        }
    });

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Empty3DTileContent</code>
     * always returns <code>false</code> since a tile of this type does not have any features.
     */
    Empty3DTileContent.prototype.hasProperty = function(batchId, name) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Empty3DTileContent</code>
     * always returns <code>undefined</code> since a tile of this type does not have any features.
     */
    Empty3DTileContent.prototype.getFeature = function(batchId) {
        return undefined;
    };

    /**
     * @inheritdoc Cesium3DTileContent#applyDebugSettings
     */
    Empty3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
    };

    /**
     * @inheritdoc Cesium3DTileContent#applyStyle
     */
    Empty3DTileContent.prototype.applyStyle = function(frameState, style) {
    };

    /**
     * @inheritdoc Cesium3DTileContent#update
     */
    Empty3DTileContent.prototype.update = function(tileset, frameState) {
    };

    /**
     * @inheritdoc Cesium3DTileContent#isDestroyed
     */
    Empty3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc Cesium3DTileContent#destroy
     */
    Empty3DTileContent.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Empty3DTileContent;
});
