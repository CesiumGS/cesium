/*global define*/
define([
        './B3dm3DTileContentProvider'
    ], function(
        B3dm3DTileContentProvider) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTileContentProviderFactory = {
        b3dm : function(url, contentHeader) {
            return new B3dm3DTileContentProvider(url, contentHeader);
        }
    };

    return Cesium3DTileContentProviderFactory;
});