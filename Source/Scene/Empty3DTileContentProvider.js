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
     * DOC_TBA
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