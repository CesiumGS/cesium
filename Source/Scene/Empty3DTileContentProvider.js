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