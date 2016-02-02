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
     * @alias Empty3DTileContentProvider
     * @constructor
     *
     * @private
     */
    function Empty3DTileContentProvider() {
        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        this.state = undefined;

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        this.contentReadyToProcessPromise = when.defer();

        // Transition into the PROCESSING state.
        this.state = Cesium3DTileContentState.PROCESSING;
        this.contentReadyToProcessPromise.resolve(this);

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        this.readyPromise = when.defer();

        // Transition into the READY state.
        this.state = Cesium3DTileContentState.READY;
        this.readyPromise.resolve(this);
    }

    defineProperties(Empty3DTileContentProvider.prototype, {
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
     * Part of the {@link Cesium3DTileContentProvider} interface.  <code>Empty3DTileContentProvider</code>
     * always returns <code>false</code> since a tile of this type does not have any features.
     */
    Empty3DTileContentProvider.prototype.hasProperty = function(name) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.  <code>Empty3DTileContentProvider</code>
     * always returns <code>undefined</code> since a tile of this type does not have any features.
     */
    Empty3DTileContentProvider.prototype.getFeature = function(batchId) {
        return undefined;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Empty3DTileContentProvider.prototype.request = function() {
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Empty3DTileContentProvider.prototype.applyDebugSettings = function(enabled, color) {
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Empty3DTileContentProvider.prototype.update = function(tiles3D, frameState) {
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Empty3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Empty3DTileContentProvider.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Empty3DTileContentProvider;
});