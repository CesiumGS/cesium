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

    var expressionPlaceholder = '${expression}';

    /**
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ConditionalExpression (styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;
        this._conditional = clone(jsonExpression.conditions, true);
        this._expression = jsonExpression.expression;

        this._runtimeConditional = undefined;

        setRuntime(this);
    }

    defineProperties(ConditionalExpression.prototype, {
        // TODO : Expose default expression and conditional?
    });

    function Statement(condition, expression) {
        this.condition = condition;
        this.expression = expression;
    }

    function setRuntime(expression) {
        var runtimeConditional = [];
        var conditional = expression._conditional;
        var exp = expression._expression;
        for (var cond in conditional) {
            if (conditional.hasOwnProperty(cond)) {
                var colorExpression = conditional[cond];
                if (defined(exp)) {
                    cond = cond.replace(expressionPlaceholder, exp);
                } else {
                    cond = cond.replace(expressionPlaceholder, 'undefined');
                }
                runtimeConditional.push(new Statement(
                    new Expression(expression._styleEngine, cond),
                    new Expression(expression._styleEngine, colorExpression)
                ));
            }
        }

        expression._runtimeConditional = runtimeConditional;
    }

    /**
     * DOC_TBA
     */
    ConditionalExpression.prototype.evaluate = function(feature) {
        var conditional = this._runtimeConditional;
        if (defined(conditional)) {
            for (var i=0; i<conditional.length; ++i) {
                var statement = conditional[i];
                if (statement.condition.evaluate(feature)) {
                    return statement.expression.evaluate(feature);
                }
            }
        }
    };

    /**
     * DOC_TBA
     */
    ConditionalExpression.prototype.evaluateColor = function(feature, result) {
        var conditional = this._runtimeConditional;
        if (defined(conditional)) {
            for (var i=0; i<conditional.length; ++i) {
                var statement = conditional[i];
                if (statement.condition.evaluate(feature, result)) {
                    return statement.expression.evaluateColor(feature, result);
                }
            }
        }
    };

    return ConditionalExpression;
});
