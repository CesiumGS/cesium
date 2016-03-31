/*global define*/
define([
       './Expression',
       '../Core/clone',
       '../Core/Color',
       '../Core/defaultValue',
       '../Core/defined',
       '../Core/defineProperties'
    ], function(
        Expression,
        clone,
        Color,
        defaultValue,
        defined,
        defineProperties) {
    'use strict';

    var expressionPlaceholder = /\$\{expression}/g;

    /**
     * <p>
     * Evaluates a conditions expression defined using the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}.
     * </p>
     * <p>
     * Implements the {@link StyleExpression} interface.
     * </p>
     *
     * @alias ConditionsExpression
     * @constructor
     *
     * @param {Object} [expression] The conditions expression defined using the 3D Tiles Styling language.
     *
     * @example
     * var expression = new Cesium.Expression({
     *     expression : 'regExp("^1(\\d)").exec(${id})',
     *     conditions : {
     *         '${expression} === "1"' : 'color("#FF0000")',
     *         '${expression} === "2"' : 'color("#00FF00")',
     *         'true' : 'color("#FFFFFF")'
     *     }
     * });
     * expression.evaluateColor(feature, result); // returns a Cesium.Color object
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
     */
    function ConditionsExpression(conditionsExpression) {
        this._conditionsExpression = clone(conditionsExpression, true);
        this._conditions = conditionsExpression.conditions;
        this._expression = conditionsExpression.expression;

        this._runtimeConditions = undefined;

        setRuntime(this);
    }

    defineProperties(ConditionsExpression.prototype, {
        /**
         * Gets the conditions expression defined in the 3D Tiles Styling language.
         *
         * @memberof ConditionsExpression.prototype
         *
         * @type {Object}
         * @readonly
         *
         * @default undefined
         */
        conditionsExpression : {
            get : function() {
                return this._conditionsExpression;
            }
        }
    });

    function Statement(condition, expression) {
        this.condition = condition;
        this.expression = expression;
    }

    function setRuntime(expression) {
        var runtimeConditions = [];
        var conditions = expression._conditions;
        var exp = expression._expression;
        for (var cond in conditions) {
            if (conditions.hasOwnProperty(cond)) {
                var colorExpression = conditions[cond];
                if (defined(exp)) {
                    cond = cond.replace(expressionPlaceholder, exp);
                } else {
                    cond = cond.replace(expressionPlaceholder, 'undefined');
                }
                runtimeConditions.push(new Statement(
                    new Expression(cond),
                    new Expression(colorExpression)
                ));
            }
        }

        expression._runtimeConditions = runtimeConditions;
    }

    /**
     * Evaluates the result of an expression, optionally using the provided feature's properties. If the result of
     * the expression in the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
     * is of type <code>Boolean</code>, <code>Number</code>, or <code>String</code>, the corresponding JavaScript
     * primitive type will be returned. If the result is a <code>RegExp</code>, a Javascript <code>RegExp</code>
     * object will be returned. If the result is a <code>Color</code>, a {@link Color} object will be returned.
     *
     * @param {Cesium3DTileFeature} feature The feature who's properties may be used as variables in the expression.
     * @returns {Boolean|Number|String|Color|RegExp} The result of evaluating the expression.
     */
    ConditionsExpression.prototype.evaluate = function(feature) {
        var conditions = this._runtimeConditions;
        if (defined(conditions)) {
            var length = conditions.length;
            for (var i = 0; i < length; ++i) {
                var statement = conditions[i];
                if (statement.condition.evaluate(feature)) {
                    return statement.expression.evaluate(feature);
                }
            }
        }
    };

    /**
     * Evaluates the result of a Color expression, using the values defined by a feature.
     *
     * @param {Cesium3DTileFeature} feature The feature who's properties may be used as variables in the expression.
     * @param {Color} [result] The object in which to store the result
     * @returns {Color} The modified result parameter or a new Color instance if one was not provided.
     */
    ConditionsExpression.prototype.evaluateColor = function(feature, result) {
        var conditions = this._runtimeConditions;
        if (defined(conditions)) {
            var length = conditions.length;
            for (var i = 0; i < length; ++i) {
                var statement = conditions[i];
                if (statement.condition.evaluate(feature, result)) {
                    return statement.expression.evaluateColor(feature, result);
                }
            }
        }
    };

    return ConditionsExpression;
});
