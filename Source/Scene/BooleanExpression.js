/*global define*/
define([
       '../Core/defined',
       '../Core/defineProperties',
       './getPropertyName'
    ], function(
        defined,
        defineProperties,
        getPropertyName) {
    'use strict';

    // TODO: best name/directory for this?
    // TODO: replace with a real parser/AST

    /**
     * DOC_TBA
     * <p>
     * Creates an expression of the form: [propertyName|literal] [operator] [propertyName|literal].  For example:
     *     {Height} > 100
     *     {id} !== 10
     *     {Height} === {id}
     *     {state} === 'Pennsylvania'
     * </p>
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function BooleanExpression(styleEngine, jsonExpression) {
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

    defineProperties(BooleanExpression.prototype, {
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

    function setEvaluateFunction(expression) {
        var evaluate;
        var operator = expression._operator;

        var leftOperandIsProperty = defined(expression._leftPropertyName);
        var leftOperandIsLiteral = !leftOperandIsProperty;

        var rightOperandIsProperty = defined(expression._rightPropertyName);
        var rightOperandIsLiteral = !rightOperandIsProperty;

        if (operator === 'true') {
            evaluate = expression._true;
        } else if (operator === 'false') {
            evaluate = expression._false;
        } else if (operator === '>') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._greaterLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._greaterLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._greaterPropertyLiteral;
            } else {
                evaluate = expression._greaterPropertyProperty;
            }
        } else if (operator === '>=') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._greaterEqualLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._greaterEqualLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._greaterEqualPropertyLiteral;
            } else {
                evaluate = expression._greaterEqualPropertyProperty;
            }
        } else if (operator === '<') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._lessLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._lessLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._lessPropertyLiteral;
            } else {
                evaluate = expression._lessPropertyProperty;
            }
        } else if (operator === '<=') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._lessEqualLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._lessEqualLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._lessEqualPropertyLiteral;
            } else {
                evaluate = expression._lessEqualPropertyProperty;
            }
        } else if (operator === '===') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._equalLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._equalLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._equalPropertyLiteral;
            } else {
                evaluate = expression._equalPropertyProperty;
            }
        } else if (operator === '!==') {
            if (leftOperandIsLiteral && rightOperandIsLiteral) {
                evaluate = expression._notEqualLiteralLiteral;
            } else if (leftOperandIsLiteral && rightOperandIsProperty) {
                evaluate = expression._notEqualLiteralProperty;
            } else if (leftOperandIsProperty && rightOperandIsLiteral) {
                evaluate = expression._notEqualPropertyLiteral;
            } else {
                evaluate = expression._notEqualPropertyProperty;
            }
        } else {
            evaluate = undefined;
        }

        expression.evaluate = evaluate;
    }

    // TODO: break true/false out into a "Constant boolean expression"

    BooleanExpression.prototype._true = function(feature) {
        return true;
    };

    BooleanExpression.prototype._false = function(feature) {
        return false;
    };

    ///////////////////////////////////////////////////////////////////////////

    BooleanExpression.prototype._greaterLiteralLiteral = function(feature) {
        return this._leftOperand > this._rightOperand;
    };

    BooleanExpression.prototype._greaterLiteralProperty = function(feature) {
        return this._leftOperand > feature.getProperty(this._rightPropertyName);
    };

    BooleanExpression.prototype._greaterPropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) > this._rightOperand;
    };

    BooleanExpression.prototype._greaterPropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) > feature.getProperty(this._rightPropertyName);
    };

    ///////////////////////////////////////////////////////////////////////////

    BooleanExpression.prototype._greaterEqualLiteralLiteral = function(feature) {
        return this._leftOperand >= this._rightOperand;
    };

    BooleanExpression.prototype._greaterEqualLiteralProperty = function(feature) {
        return this._leftOperand >= feature.getProperty(this._rightPropertyName);
    };

    BooleanExpression.prototype._greaterEqualPropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) >= this._rightOperand;
    };

    BooleanExpression.prototype._greaterEqualPropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) >= feature.getProperty(this._rightPropertyName);
    };

    ///////////////////////////////////////////////////////////////////////////

    BooleanExpression.prototype._lessLiteralLiteral = function(feature) {
        return this._leftOperand < this._rightOperand;
    };

    BooleanExpression.prototype._lessLiteralProperty = function(feature) {
        return this._leftOperand < feature.getProperty(this._rightPropertyName);
    };

    BooleanExpression.prototype._lessPropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) < this._rightOperand;
    };

    BooleanExpression.prototype._lessPropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) < feature.getProperty(this._rightPropertyName);
    };

    ///////////////////////////////////////////////////////////////////////////

    BooleanExpression.prototype._lessEqualLiteralLiteral = function(feature) {
        return this._leftOperand <= this._rightOperand;
    };

    BooleanExpression.prototype._lessEqualLiteralProperty = function(feature) {
        return this._leftOperand <= feature.getProperty(this._rightPropertyName);
    };

    BooleanExpression.prototype._lessEqualPropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) <= this._rightOperand;
    };

    BooleanExpression.prototype._lessEqualPropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) <= feature.getProperty(this._rightPropertyName);
    };

    ///////////////////////////////////////////////////////////////////////////

    BooleanExpression.prototype._equalLiteralLiteral = function(feature) {
        return this._leftOperand === this._rightOperand;
    };

    BooleanExpression.prototype._equalLiteralProperty = function(feature) {
        return this._leftOperand === feature.getProperty(this._rightPropertyName);
    };

    BooleanExpression.prototype._equalPropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) === this._rightOperand;
    };

    BooleanExpression.prototype._equalPropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) === feature.getProperty(this._rightPropertyName);
    };

    ///////////////////////////////////////////////////////////////////////////

    BooleanExpression.prototype._notEqualLiteralLiteral = function(feature) {
        return this._leftOperand !== this._rightOperand;
    };

    BooleanExpression.prototype._notEqualLiteralProperty = function(feature) {
        return this._leftOperand !== feature.getProperty(this._rightPropertyName);
    };

    BooleanExpression.prototype._notEqualPropertyLiteral = function(feature) {
        return feature.getProperty(this._leftPropertyName) !== this._rightOperand;
    };

    BooleanExpression.prototype._notEqualPropertyProperty = function(feature) {
        return feature.getProperty(this._leftPropertyName) !== feature.getProperty(this._rightPropertyName);
    };

    return BooleanExpression;
});
