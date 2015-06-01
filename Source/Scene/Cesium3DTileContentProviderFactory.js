/*global define*/
define([
        './Gltf3DTileContentProvider'
    ], function(
        Gltf3DTileContentProvider) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTileContentProviderFactory = {
        gltf : function(url, contentHeader) {
            return new Gltf3DTileContentProvider(url, contentHeader);
        }
    };

    return Cesium3DTileContentProviderFactory;
});