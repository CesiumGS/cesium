/*global define*/
define([
       '../Core/Color',
       '../Core/defined'
    ], function(
        Color,
        defined) {
    "use strict";

    /**
     * @private
     */
    function getCesium3DTileStyle(style) {
        if (!defined(style)) {
            return undefined;
        }

        // TODO: Design and implement full style schema
        // TODO: Replace this getter function with a new type, Cesium3DTileStyle
        return {
            timeDynamic : false,
            color : Color.fromBytes(style.color[0], style.color[1], style.color[2])
        };
    }

    return getCesium3DTileStyle;
});
