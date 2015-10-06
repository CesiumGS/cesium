/*global define*/
define([
        './Batched3DModel3DTileContentProvider',
        './Instanced3DModel3DTileContentProvider',
        './Points3DTileContentProvider'
    ], function(
        Batched3DModel3DTileContentProvider,
        Instanced3DModel3DTileContentProvider,
        Points3DTileContentProvider) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTileContentProviderFactory = {
        b3dm : function(tileset, tile, url, contentHeader) {
            return new Batched3DModel3DTileContentProvider(tileset, tile, url, contentHeader);
        },
        pnts : function(tileset, tile, url, contentHeader) {
            return new Points3DTileContentProvider(tileset, tile, url, contentHeader);
        },
        i3dm : function(tileset, tile, url, contentHeader) {
            return new Instanced3DModel3DTileContentProvider(tileset, tile, url, contentHeader);
        }
    };

    return Cesium3DTileContentProviderFactory;
});