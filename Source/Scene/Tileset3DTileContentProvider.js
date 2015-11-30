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
    var Tileset3DTileContentProvider = function() {
        this.state = Cesium3DTileContentState.UNLOADED;
    };

    Tileset3DTileContentProvider.prototype.request = function() {
    };

    Tileset3DTileContentProvider.prototype.update = function(owner, frameState) {
    };

    Tileset3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    Tileset3DTileContentProvider.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Tileset3DTileContentProvider;
});
