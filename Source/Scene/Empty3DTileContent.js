define([
        '../Core/defineProperties',
        '../Core/destroyObject'
    ], function(
        defineProperties,
        destroyObject) {
    'use strict';

        /**
             * Represents empty content for tiles in a
             * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification|3D Tiles} tileset that
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
        class Empty3DTileContent {
            constructor(tileset, tile) {
                this._tileset = tileset;
                this._tile = tile;
                this.featurePropertiesDirty = false;
            }
            /**
                 * Part of the {@link Cesium3DTileContent} interface.  <code>Empty3DTileContent</code>
                 * always returns <code>false</code> since a tile of this type does not have any features.
                 */
            hasProperty(batchId, name) {
                return false;
            }
            /**
                 * Part of the {@link Cesium3DTileContent} interface.  <code>Empty3DTileContent</code>
                 * always returns <code>undefined</code> since a tile of this type does not have any features.
                 */
            getFeature(batchId) {
                return undefined;
            }
            applyDebugSettings(enabled, color) {
            }
            applyStyle(style) {
            }
            update(tileset, frameState) {
            }
            isDestroyed() {
                return false;
            }
            destroy() {
                return destroyObject(this);
            }
        }

    defineProperties(Empty3DTileContent.prototype, {
        featuresLength : {
            get : function() {
                return 0;
            }
        },

        pointsLength : {
            get : function() {
                return 0;
            }
        },

        trianglesLength : {
            get : function() {
                return 0;
            }
        },

        geometryByteLength : {
            get : function() {
                return 0;
            }
        },

        texturesByteLength : {
            get : function() {
                return 0;
            }
        },

        batchTableByteLength : {
            get : function() {
                return 0;
            }
        },

        innerContents : {
            get : function() {
                return undefined;
            }
        },

        readyPromise : {
            get : function() {
                return undefined;
            }
        },

        tileset : {
            get : function() {
                return this._tileset;
            }
        },

        tile : {
            get : function() {
                return this._tile;
            }
        },

        url: {
            get: function() {
                return undefined;
            }
        },

        batchTable : {
            get : function() {
                return undefined;
            }
        }
    });








    return Empty3DTileContent;
});
