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
     * Represents empty content for tiles in a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset that
     * do not have content, e.g., because they are used to optimize hierarchical culling.
     * <p>
     * Do not construct this directly.  Access it through {@link Cesium3DTile#content}.
     * </p>
     *
     * @alias Empty3DTileContentProvider
     * @constructor
     */
    function Empty3DTileContentProvider() {
        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         *
         * @private
         */
        this.state = undefined;

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         *
         * @private
         */
        this.processingPromise = when.defer();

        // Transition into the PROCESSING state.
        this.state = Cesium3DTileContentState.PROCESSING;
        this.processingPromise.resolve(this);

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         *
         * @private
         */
        this.readyPromise = when.defer();

        // Transition into the READY state.
        this.state = Cesium3DTileContentState.READY;
        this.readyPromise.resolve(this);
    }

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.  <code>Empty3DTileContentProvider</code>
     * always returns <code>false</code> since a tile of this type does not have any features.
     *
     * @param {String} name The case-sensitive name of the property.
     * @returns {Boolean} <code>false</code>
     */
    Empty3DTileContentProvider.prototype.hasProperty = function(name) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.  <code>Empty3DTileContentProvider</code>
     * always returns <code>undefined</code> since a tile of this type does not have any features.
     *
     * @param {Number} batchId The batchId for the feature.
     * @returns {Cesium3DTileFeature} <code>undefined</code>.
     */
    Empty3DTileContentProvider.prototype.getFeature = function(batchId) {
        return undefined;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Empty3DTileContentProvider.prototype.request = function() {
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Empty3DTileContentProvider.prototype.applyDebugSettings = function(enabled, color) {
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Empty3DTileContentProvider.prototype.update = function(tiles3D, frameState) {
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Empty3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     *
     * @private
     */
    Empty3DTileContentProvider.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Empty3DTileContentProvider;
});