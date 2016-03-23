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
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ConditionsExpression (jsonExpression) {
        this._conditions = clone(jsonExpression.conditions, true);
        this._expression = jsonExpression.expression;

        this._runtimeConditions = undefined;

        setRuntime(this);
    }

    defineProperties(ConditionsExpression.prototype, {
        // TODO : Expose default expression and conditional?
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
     * DOC_TBA
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
     * DOC_TBA
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
