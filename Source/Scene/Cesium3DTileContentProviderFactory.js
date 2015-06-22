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
        b3dm : function(url, contentHeader) {
            return new Batched3DModel3DTileContentProvider(url, contentHeader);
        },
        pnts : function(url, contentHeader) {
            return new Points3DTileContentProvider(url, contentHeader);
        }
    };

    return Cesium3DTileContentProviderFactory;
});