/*global define*/
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
     *
     * @alias Empty3DTileContent
     * @constructor
     *
     * @private
     */
    function Empty3DTileContent() {
        /**
         * The following properties are part of the {@link Cesium3DTileContent} interface.
         */
        this.batchTable = undefined;
        this.featurePropertiesDirty = false;
    }

    defineProperties(Empty3DTileContent.prototype, {
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
        pointsLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        trianglesLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        vertexMemorySizeInBytes : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        textureMemorySizeInBytes : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        batchTableMemorySizeInBytes : {
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
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        readyPromise : {
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
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Empty3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Empty3DTileContent.prototype.applyStyleWithShader = function(frameState, style) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Empty3DTileContent.prototype.update = function(tileset, frameState) {
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Empty3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Empty3DTileContent.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Empty3DTileContent;
});
