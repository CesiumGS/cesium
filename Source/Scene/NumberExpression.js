/*global define*/
define([
       '../Core/defined',
       '../Core/defineProperties'
    ], function(
        defined,
        defineProperties) {
    "use strict";

    // TODO: best name/directory for this?
    // TODO: replace with a real parser/AST

    /**
     * DOC_TBA
     * <p>
     * Creates an expression of the form: [propertyName|literal] [operator] [propertyName|literal].  For example:
     *     {Height} + 100
     *     {id} - 10
     *     {Height} / {id}
     * </p>
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function NumberExpression(styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;

        var leftOperand = jsonExpression.leftOperand;
        this._leftOperand = leftOperand;
        this._leftPropertyName = getPropertyName(leftOperand);  // Cached property name if left operand is a property

        this._operator = jsonExpression.operator;

        var rightOperand = jsonExpression.rightOperand;
        this._rightOperand = rightOperand;
        this._rightPropertyName = getPropertyName(rightOperand);  // Cached property name if right operand is a property

        /**
         * DOC_TBA
         *
         * @function
         */
        this.evaluate = undefined;

        setEvaluateFunction(this);
    }

    defineProperties(NumberExpression.prototype, {
        /**
         * DOC_TBA
         */
        leftOperand : {
            get : function() {
                return this._leftOperand;
            },
            set : function(value) {
                if (this._leftOperand !== value) {
                    this._leftOperand = value;
                    this._leftPropertyName = getPropertyName(value);
                    setEvaluateFunction(this);
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
        rightOperand : {
            get : function() {
                return this._rightOperand;
            },
            set : function(value) {
                if (this._rightOperand !== value) {
                    this._rightOperand = value;
                    this._rightPropertyName = getPropertyName(value);
                    setEvaluateFunction(this);
                    this._styleEngine.makeDirty();
                }
            }
        }
    });

    // TODO: do not duplicate function with BooleanExpression.js
    function getPropertyName(operand) {
        if (typeof operand !== 'string') {
            return undefined;
        }

        if (operand.length < 3) {
            return undefined;
        }

        // Strings that should be substituted with a property value are enclosed in ${}.
        if ((operand.charAt(0) !== '$') || (operand.charAt(1) !== '{') || (operand.charAt(operand.length - 1) !== '}')) {
            return undefined;
        }

        return operand.substring(2, operand.length - 1);
    }

    function setEvaluateFunction(expression) {
        var evaluate;
        var operator = expression._operator;

        var leftOperandIsProperty = defined(expression._leftPropertyName);
        var leftOperandIsLiteral = !leftOperandIsProperty;

        var rightOperandIsProperty = defined(expression._rightPropertyName);
        var rightOperandIsLiteral = !rightOperandIsProperty;

        if (operator === '+') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._addLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._addLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._addPropertyLiteral;
            } else {
                evaluate = expression._addPropertyProperty;
            }
        } else if (operator === '-') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._subtractLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._subtractLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._subtractPropertyLiteral;
            } else {
                evaluate = expression._subtractPropertyProperty;
            }
        } else if (operator === '*') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._multiplyLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._multiplyLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._multiplyPropertyLiteral;
            } else {
                evaluate = expression._multiplyPropertyProperty;
            }
        } else if (operator === '/') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._divideLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._divideLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._dividePropertyLiteral;
            } else {
                evaluate = expression._dividePropertyProperty;
            }
        } else {
            evaluate = undefined;
        }

        expression.evaluate = evaluate;
    }

    ///////////////////////////////////////////////////////////////////////////

    NumberExpression.prototype._addLiteralLiteral = function(feature) {
        return this._leftOperand + this._rightOperand;
    };

    NumberExpression.prototype._addLiteralProperty = function(feature) {
        return this._leftOperand + feature.getProperty(this._rightPropertyName);
    };

    NumberExpression.prototype._addPropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) + this._rightOperand;
    };

    NumberExpression.prototype._addPropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) + feature.getProperty(this._rightPropertyName);
    };

    ///////////////////////////////////////////////////////////////////////////

    NumberExpression.prototype._subtractLiteralLiteral = function(feature) {
        return this._leftOperand - this._rightOperand;
    };

    NumberExpression.prototype._subtractLiteralProperty = function(feature) {
        return this._leftOperand - feature.getProperty(this._rightPropertyName);
    };

    NumberExpression.prototype._subtractPropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) - this._rightOperand;
    };

    NumberExpression.prototype._subtractPropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) - feature.getProperty(this._rightPropertyName);
    };

    ///////////////////////////////////////////////////////////////////////////

    NumberExpression.prototype._multiplyLiteralLiteral = function(feature) {
        return this._leftOperand * this._rightOperand;
    };

    NumberExpression.prototype._multiplyLiteralProperty = function(feature) {
        return this._leftOperand * feature.getProperty(this._rightPropertyName);
    };

    NumberExpression.prototype._multiplyPropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) * this._rightOperand;
    };

    NumberExpression.prototype._multiplyPropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) * feature.getProperty(this._rightPropertyName);
    };

    ///////////////////////////////////////////////////////////////////////////

    NumberExpression.prototype._divideLiteralLiteral = function(feature) {
        return this._leftOperand / this._rightOperand;
    };

    NumberExpression.prototype._divideLiteralProperty = function(feature) {
        return this._leftOperand / feature.getProperty(this._rightPropertyName);
    };

    NumberExpression.prototype._dividePropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) / this._rightOperand;
    };

    NumberExpression.prototype._dividePropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) / feature.getProperty(this._rightPropertyName);
    };

    return NumberExpression;
});
