/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * This type describes an interface and is not intended to be instantiated directly.
     *
     * DOC_TBA
     */
    function Cesium3DTileContentProvider(tileset, tile, url) {
        /**
         * @type {Cesium3DTileContentState}
         * @readonly
         */
        this.state = undefined;

        /**
         * @type {Promise}
         */
        this.processingPromise = undefined;

        /**
         * @type {Promise}
         */
        this.readyPromise = undefined;
    }

    Cesium3DTileContentProvider.prototype.request = function() {
        DeveloperError.throwInstantiationError();
    };

    Cesium3DTileContentProvider.prototype.initialize = function(arrayBuffer, byteOffset) {
        DeveloperError.throwInstantiationError();
    };

    Cesium3DTileContentProvider.prototype.update = function(owner, frameState) {
        DeveloperError.throwInstantiationError();
    };

    Cesium3DTileContentProvider.prototype.isDestroyed = function() {
        DeveloperError.throwInstantiationError();
    };

    Cesium3DTileContentProvider.prototype.destroy = function() {
        DeveloperError.throwInstantiationError();
    };

    return Cesium3DTileContentProvider;
});
