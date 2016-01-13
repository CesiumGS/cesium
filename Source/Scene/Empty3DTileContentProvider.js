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
     * @private
     */
    function Empty3DTileContentProvider() {
        /**
         * @readonly
         */
        this.state = undefined;

        /**
         * @type {Promise}
         */
        this.processingPromise = when.defer();
        this.state = Cesium3DTileContentState.PROCESSING;
        this.processingPromise.resolve(this);

        /**
         * @type {Promise}
         */
        this.readyPromise = when.defer();
        this.state = Cesium3DTileContentState.READY;
        this.readyPromise.resolve(this);
    }

    Empty3DTileContentProvider.prototype.request = function() {
    };

    Empty3DTileContentProvider.prototype.update = function(owner, frameState) {
    };

    Empty3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    Empty3DTileContentProvider.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Empty3DTileContentProvider;
});