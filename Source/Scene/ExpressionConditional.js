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

    /**
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ExpressionConditional(styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;
        this._conditional = clone(jsonExpression.conditional, true);

        this._runtimeConditional = undefined;

        setRuntime(this);
    }

    defineProperties(ExpressionConditional.prototype, {
        // TODO : Expose default expression and conditional?
    });

    function Statement(condition, expression) {
        this.condition = condition;
        this.expression = expression;
    }

    function setRuntime(expression) {
        var runtimeConditional = [];
        var conditional = expression._conditional;
        for (var cond in conditional) {
            if (conditional.hasOwnProperty(cond)) {
                var colorExpression = conditional[cond];
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
    ExpressionConditional.prototype.evaluate = function(feature) {
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
    ExpressionConditional.prototype.evaluateColor = function(feature, result) {
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

    return ExpressionConditional;
});
