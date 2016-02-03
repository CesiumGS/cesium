/*global define*/
define([
       '../Core/Color',
       '../Core/defaultValue',
       '../Core/defined',
       '../Core/DeveloperError',
       '../Core/freezeObject',
       './BooleanExpression'
    ], function(
        Color,
        defaultValue,
        defined,
        DeveloperError,
        freezeObject,
        BooleanExpression) {
    "use strict";

    var DEFAULT_JSON_BOOLEAN_EXPRESSION = freezeObject({
        operator : 'true' // Constant expression returning true
    });

    /**
     * DOC_TBA
     */
    function Cesium3DTileStyle(tileset, jsonStyle) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tileset)) {
            throw new DeveloperError('tileset is required.');
        }

        // TODO: wait for readyPromise here instead of throwing?
        if (!tileset.ready) {
            throw new DeveloperError('The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.');
        }
        //>>includeEnd('debug');

        jsonStyle = defaultValue(jsonStyle, defaultValue.EMPTY_OBJECT);

        var colorExpression = jsonStyle.color;
        var showExpression = defaultValue(jsonStyle.show, DEFAULT_JSON_BOOLEAN_EXPRESSION);

        /**
         * DOC_TBA
         */
        this.timeDynamic = false;

        /**
         * DOC_TBA
         */
        this.color = {
            propertyName : colorExpression.propertyName,
            colors : createBins(tileset.properties[colorExpression.propertyName], colorExpression.autoBins)
        };

        /**
         * DOC_TBA
         */
        this.show = new BooleanExpression(tileset.styleEngine, showExpression);
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

    return Cesium3DTileStyle;
});
