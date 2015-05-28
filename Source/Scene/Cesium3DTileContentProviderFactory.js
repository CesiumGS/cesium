/*global define*/
define([
        './Cesium3DTileContentProvider',
        './Gltf3DTileContentProvider'
    ], function(
        Cesium3DTileContentProvider,
        Gltf3DTileContentProvider) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTileContentProviderFactory = {
        gltf : function(url, contentHeader) {
            return new Gltf3DTileContentProvider(url, contentHeader);
        },
        czml : function(url, contentHeader) {
            return new Cesium3DTileContentProvider(url, contentHeader);
        }
    };

    return Cesium3DTileContentProviderFactory;
});