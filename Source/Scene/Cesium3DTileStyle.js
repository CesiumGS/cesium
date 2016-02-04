/*global define*/
define([
       '../Core/defaultValue',
       '../Core/defined',
       '../Core/DeveloperError',
       '../Core/freezeObject',
       './BooleanExpression',
       './ColorExpression',
       './MapColorExpression',
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        freezeObject,
        BooleanExpression,
        ColorExpression,
        MapColorExpression) {
    "use strict";

    // TODO: best name/directory for this?  For example, a user may want to evaluate a
    // style/expression on mouse over, CZML may want to use this to evaluate expressions,
    // a UI might want to use it, etc.

    var DEFAULT_JSON_COLOR_EXPRESSION = freezeObject({
        // TODO
    });

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
        var colorExpression = defaultValue(jsonStyle.color, DEFAULT_JSON_COLOR_EXPRESSION);
        var showExpression = defaultValue(jsonStyle.show, DEFAULT_JSON_BOOLEAN_EXPRESSION);

        /**
         * DOC_TBA
         */
        this.timeDynamic = false;

        var color;
        if (colorExpression.type === 'map') {
            color = new MapColorExpression(tileset.styleEngine, colorExpression.map);
        } else if (colorExpression.type === 'ramp') {
            color = new ColorExpression(tileset, colorExpression.ramp);
        }

        /**
         * DOC_TBA
         */
        this.color = color;

        /**
         * DOC_TBA
         */
        this.show = new BooleanExpression(tileset.styleEngine, showExpression);
    }

    return Cesium3DTileStyle;
});
