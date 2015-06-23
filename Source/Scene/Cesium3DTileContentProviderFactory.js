/*global define*/
define([
        './Batched3DModel3DTileContentProvider',
        './Points3DTileContentProvider'
    ], function(
        Batched3DModel3DTileContentProvider,
        Points3DTileContentProvider) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTileContentProviderFactory = {
        b3dm : function(tileset, url, contentHeader) {
            return new Batched3DModel3DTileContentProvider(tileset, url, contentHeader);
        },
        pnts : function(tileset, url, contentHeader) {
            return new Points3DTileContentProvider(tileset, url, contentHeader);
        }
    };

    return Cesium3DTileContentProviderFactory;
});