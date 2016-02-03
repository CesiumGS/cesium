/*global define*/
define([
       '../Core/defineProperties'
    ], function(
        defineProperties) {
    "use strict";

    // TODO: best name/directory for this?

    /**
     * DOC_TBA
     * <p>
     * Creates an expression of the form: [propertyName] [operator] [operand].  For example:
     *     Height > 100
     *     id !== 10
     *     state === 'Pennsylvania'
     * </p>
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function BooleanExpression(styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;

        this._propertyName = jsonExpression.propertyName;
        this._operator = jsonExpression.operator;
        this._operand = jsonExpression.operand;

        /**
         * @readonly
         */
        this.evaluate = undefined;

        setEvaluateFunction(this);
    }

    defineProperties(BooleanExpression.prototype, {
        /**
         * DOC_TBA
         */
        propertyName : {
            get : function() {
                return this._propertyName;
            },
            set : function(value) {
                if (this._propertyName !== value) {
                    this._propertyName = value;
                    this._styleEngine.makeDirty();
                }
            }
        },

        /**
         * DOC_TBA
         */
        operator : {
            get : function() {
                return this._operator;
            },
            set : function(value) {
                if (this._operator !== value) {
                    this._operator = value;
                    setEvaluateFunction(this);
                    this._styleEngine.makeDirty();
                }
            }
        },

        /**
         * DOC_TBA
         */
        operand : {
            get : function() {
                return this._operand;
            },
            set : function(value) {
                if (this._operand !== value) {
                    this._operand = value;
                    this._styleEngine.makeDirty();
                }
            }
        }
    });

    function setEvaluateFunction(booleanExpression) {
        var evaluate;
        var operator = booleanExpression._operator;

        if (operator === 'true') {
            evaluate = booleanExpression._true;
        } else if (operator === 'false') {
            evaluate = booleanExpression._false;
        } else if (operator === '>') {
            evaluate = booleanExpression._greater;
        } else if (operator === '>=') {
            evaluate = booleanExpression._greaterEqual;
        } else if (operator === '<') {
            evaluate = booleanExpression._less;
        } else if (operator === '<=') {
            evaluate = booleanExpression._lessEqual;
        } else if (operator === '===') {
            evaluate = booleanExpression._equal;
        } else if (operator === '!==') {
            evaluate = booleanExpression._notEqual;
        } else {
            evaluate = undefined;
        }

        booleanExpression.evaluate = evaluate;
    }

    BooleanExpression.prototype._true = function(feature) {
        return true;
    };

    BooleanExpression.prototype._false = function(feature) {
        return false;
    };

    BooleanExpression.prototype._greater = function(feature) {
        return feature.getProperty(this._propertyName) > this._operand;
    };

    BooleanExpression.prototype._greaterEqual = function(feature) {
        return feature.getProperty(this._propertyName) >= this._operand;
    };

    BooleanExpression.prototype._less = function(feature) {
        return feature.getProperty(this._propertyName) < this._operand;
    };

    BooleanExpression.prototype._lessEqual = function(feature) {
        return feature.getProperty(this._propertyName) <= this._operand;
    };

    BooleanExpression.prototype._equal = function(feature) {
        return feature.getProperty(this._propertyName) === this._operand;
    };

    BooleanExpression.prototype._notEqual = function(feature) {
        return feature.getProperty(this._propertyName) !== this._operand;
    };

    return BooleanExpression;
});
