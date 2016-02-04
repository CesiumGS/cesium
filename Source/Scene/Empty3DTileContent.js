/*global define*/
define([
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../ThirdParty/when',
        './Cesium3DTileContentState'
    ], function(
        defineProperties,
        destroyObject,
        when,
        Cesium3DTileContentState) {
    "use strict";

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
         * Part of the {@link Cesium3DTileContent} interface.
         */
        this.state = undefined;

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        this.contentReadyToProcessPromise = when.defer();

        // Transition into the PROCESSING state.
        this.state = Cesium3DTileContentState.PROCESSING;
        this.contentReadyToProcessPromise.resolve(this);

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        this.readyPromise = when.defer();

        // Transition into the READY state.
        this.state = Cesium3DTileContentState.READY;
        this.readyPromise.resolve(this);
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
        innerContents : {
            get : function() {
                return undefined;
            }
        }
    });

    /**
     * Part of the {@link Cesium3DTileContent} interface.  <code>Empty3DTileContent</code>
     * always returns <code>false</code> since a tile of this type does not have any features.
     */
    Empty3DTileContent.prototype.hasProperty = function(name) {
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
    Empty3DTileContent.prototype.request = function() {
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Empty3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
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