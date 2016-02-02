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
    function getCesium3DTileStyle(style, propertiesMetadata) {
        // TODO: Design and implement full style schema
        // TODO: Define a new private type, Cesium3DTileStyle
        if (!defined(style)) {
            return undefined;
        }

        return {
            timeDynamic : false,
            name : style.name,
            colors : createBins(propertiesMetadata[style.name], style.autoBins)
        };
    }

    function createBins(propertyMetadata, colors) {
        var length = colors.length;
        var min = propertyMetadata.minimum;
        var max = propertyMetadata.maximum;
        var delta = Math.max(max - min, 0) / length;
        var colorBins = new Array(length);
        for (var i = 0; i < length; ++i) {
            colorBins[i] = {
                maximum : (i !== length - 1) ? Math.ceil(min + ((i + 1) * delta)) : max,
                color : Color.fromBytes((colors[i])[0], (colors[i])[1], (colors[i])[2])
            };
        }

        return colorBins;
    }

    return getCesium3DTileStyle;
});
