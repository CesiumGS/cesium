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
         * @private
         */
        this.state = undefined;

        /**
         * @private
         */
        this.processingPromise = when.defer();
        this.state = Cesium3DTileContentState.PROCESSING;
        this.processingPromise.resolve(this);

        /**
         * @private
         */
        this.readyPromise = when.defer();
        this.state = Cesium3DTileContentState.READY;
        this.readyPromise.resolve(this);
    }

    /**
     * @private
     */
    Empty3DTileContentProvider.prototype.request = function() {
    };

    /**
     * @private
     */
    Empty3DTileContentProvider.prototype.update = function(tiles3D, frameState) {
    };

    /**
     * @private
     */
    Empty3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
    Empty3DTileContentProvider.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Empty3DTileContentProvider;
});