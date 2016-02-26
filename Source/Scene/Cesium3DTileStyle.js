/*global define*/
define([
       '../Core/defaultValue',
       '../Core/defined',
       '../Core/DeveloperError',
       '../Core/isArray',
       './BooleanRegularExpression',
       './ColorRampExpression',
       './ColorMapExpression',
       './ColorExpression',
       './Expression'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        isArray,
        BooleanRegularExpression,
        ColorRampExpression,
        ColorMapExpression,
        ColorExpression,
        Expression) {
    'use strict';

    var DEFAULT_JSON_COLOR_EXPRESSION = 'color("#ffffff")';
    var DEFAULT_JSON_BOOLEAN_EXPRESSION = true;

    /**
     * DOC_TBA
     */
    function Cesium3DTileStyle(tileset, jsonStyle) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tileset)) {
            throw new DeveloperError('tileset is required.');
        }
        //>>includeEnd('debug');

        jsonStyle = defaultValue(jsonStyle, defaultValue.EMPTY_OBJECT);
        var colorExpression = defaultValue(jsonStyle.color, DEFAULT_JSON_COLOR_EXPRESSION);
        var showExpression = defaultValue(jsonStyle.show, DEFAULT_JSON_BOOLEAN_EXPRESSION);

        var styleEngine = tileset.styleEngine;

        var color;
        if (typeof(colorExpression) === 'string') {
            color = new Expression(styleEngine, colorExpression);
        } else if (defined(colorExpression.map)) {
            color = new ColorMapExpression(styleEngine, colorExpression);
        } else if (defined(colorExpression.intervals)) {
            color = new ColorRampExpression(styleEngine, colorExpression);
        }

        /**
         * DOC_TBA
         */
        this.color = color;

        var show;
        if (typeof(showExpression) === 'boolean') {
            show = new Expression(styleEngine, String(showExpression));
        } else if (typeof(showExpression) === 'string') {
            show = new Expression(styleEngine, showExpression);
        }

        /**
         * DOC_TBA
         */
        this.show = show;
    }

    return Cesium3DTileStyle;
});
