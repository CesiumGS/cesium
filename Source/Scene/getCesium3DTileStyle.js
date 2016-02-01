/*global define*/
define([
       '../Core/Color',
       '../Core/defined'
    ], function(
        Color,
        defined) {
    "use strict";

    /**
     * DOC_TBA
     */
    function getCesium3DTileStyle(styleJson) {
        if (!defined(styleJson)) {
            return undefined;
        }

        // TODO: Design and implement full style schema
        // TODO: Define a type for this, e.g., Cesium3DTileStyle
        return {
            timeDynamic : false,
            color : Color.fromBytes(styleJson.color[0], styleJson.color[1], styleJson.color[2])
        };
    }

    return getCesium3DTileStyle;
});
