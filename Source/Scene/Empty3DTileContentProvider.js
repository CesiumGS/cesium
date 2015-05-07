/*global define*/
define([
        '../Core/destroyObject',
        './Cesium3DTileContentState',
        '../ThirdParty/when'
    ], function(
        destroyObject,
        Cesium3DTileContentState,
        when) {
    "use strict";

    /**
     * @private
     */
    var Empty3DTileContentProvider = function() {
        /**
         * @readonly
         */
        this.state = Cesium3DTileContentState.READY;

        /**
         * @type {Promise}
         */
        this.processingPromise = when.defer();

        /**
         * @type {Promise}
         */
        this.readyPromise = when.defer();
        this.readyPromise.resolve(this);
    };

    Empty3DTileContentProvider.prototype.request = function() {
    };

    Empty3DTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
    };

    Empty3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    Empty3DTileContentProvider.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Empty3DTileContentProvider;
});