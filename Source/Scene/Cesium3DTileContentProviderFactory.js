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
        gltf : function(url) {
            return new Gltf3DTileContentProvider(url);
        },
        czml : function(url) {
            return new Cesium3DTileContentProvider(url);
        }
    };

    return Cesium3DTileContentProviderFactory;
});