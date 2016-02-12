/*global define*/
define([
       '../Core/defaultValue',
       '../Core/defined',
       '../Core/DeveloperError',
       '../Core/isArray',
       './BooleanExpression',
       './BooleanRegularExpression',
       './ColorRampExpression',
       './ColorMapExpression',
       './ColorExpression',
       './getPropertyName',
       './LiteralBooleanExpression',
       './LiteralColorExpression'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        isArray,
        BooleanExpression,
        BooleanRegularExpression,
        ColorRampExpression,
        ColorMapExpression,
        ColorExpression,
        getPropertyName,
        LiteralBooleanExpression,
        LiteralColorExpression) {
    'use strict';

    // TODO: best name/directory for this?  For example, a user may want to evaluate a
    // style/expression on mouse over, CZML may want to use this to evaluate expressions,
    // a UI might want to use it, etc.

    var DEFAULT_JSON_COLOR_EXPRESSION = "#ffffff";
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

        /**
         * DOC_TBA
         */
        this.timeDynamic = false;

        var color;
        if (typeof(colorExpression) === 'string') {
            if (defined(getPropertyName(colorExpression))) {
                color = new ColorExpression(styleEngine, colorExpression);
            } else {
                color = new LiteralColorExpression(styleEngine, colorExpression);
            }
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
            show = new LiteralBooleanExpression(styleEngine, showExpression);
        } else if (defined(showExpression.operator)) {
            show = new BooleanExpression(styleEngine, showExpression);
        } else if (defined(showExpression.pattern)) {
            show = new BooleanRegularExpression(styleEngine, showExpression);
        }

        /**
         * DOC_TBA
         */
        this.show = show;
    }

    return Cesium3DTileStyle;
});
