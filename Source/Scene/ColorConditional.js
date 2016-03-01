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
    function ColorConditional(styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;
        this._conditional = clone(jsonExpression.conditional, true);
        this._default = jsonExpression.default;

        this._runtimeConditional = undefined;
        this._runtimeDefault = undefined;

        setRuntime(this);
        setRuntimeDefault(this);
    }

    defineProperties(ColorConditional.prototype, {
        /**
         * DOC_TBA
         */
        conditional : {
            get : function() {
                return this._conditional;
            },
            set : function(value) {
                this._conditional = clone(value, true);
                setRuntime(this);
                this._styleEngine.makeDirty();
            }
        },

        /**
         * DOC_TBA
         */
        default : {
            get : function() {
                return this._default;
            },
            set : function(value) {
                if (value !== this._default) {
                    this._default = value;
                    setRuntimeDefault(this);
                    this._styleEngine.makeDirty();
                }
            }
        }
    });

    function setRuntime(expression) {
        var runtimeConditional = [];
        var conditional = expression._conditional;
        for (var cond in conditional) {
            if (conditional.hasOwnProperty(cond)) {
                var colorExpression = conditional[cond];
                runtimeConditional.push({
                    condition: new Expression(expression._styleEngine, cond),
                    color : new Expression(expression._styleEngine, colorExpression)
                }) ;
            }
        }

        expression._runtimeConditional = runtimeConditional;
    }

    function setRuntimeDefault(expression) {
        var c = expression._default;
        if (defined(c) && typeof(c) === 'string') {
            expression._runtimeDefault = new Expression(expression._styleEngine, c);
        } else {
            expression._runtimeDefault = new Expression(expression._styleEngine, 'color("#ffffff")');
        }
    }

    /**
     * DOC_TBA
     */
    ColorConditional.prototype.evaluate = function(feature) {
        var defaultColor = this._runtimeDefault;
        var conditional = this._runtimeConditional;
        if (defined(conditional)) {
            for (var i in conditional) {
                if (conditional.hasOwnProperty(i)) {
                    if (conditional[i].condition.evaluate(feature)) {
                        return conditional[i].color.evaluate(feature);
                    }
                }
            }
        }
        return defaultColor.evaluate(feature);
    };

    return ColorConditional;
});
