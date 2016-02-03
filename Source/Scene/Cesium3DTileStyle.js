/*global define*/
define([
       '../Core/Color',
       '../Core/defaultValue',
       '../Core/defined',
       '../Core/defineProperties',
       '../Core/DeveloperError',
       '../Core/freezeObject'
    ], function(
        Color,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        freezeObject) {
    "use strict";

    var DEFAULT_JSON_BOOLEAN_EXPRESSION = freezeObject({
        operator : 'true' // Constant expression returning true
    });

    /**
     * DOC_TBA
     */
    function getCesium3DTileStyle(tileset, style) {
        // TODO: Define a new private type, Cesium3DTileStyle
        if (!defined(tileset)) {
            throw new DeveloperError('tileset is required.');
        }

        // TODO: return a promise instead
        if (!tileset.ready) {
            throw new DeveloperError('The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.');
        }

        if (!defined(style)) {
            return undefined;
        }

        var styleColor = style.color;
        var showExpression = defaultValue(style.show, DEFAULT_JSON_BOOLEAN_EXPRESSION);

        return {
            timeDynamic : false,
            color : {
                propertyName : styleColor.propertyName,
                colors : createBins(tileset.properties[styleColor.propertyName], styleColor.autoBins)
            },
            show : new BooleanExpression(tileset.styleEngine, showExpression)
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * DOC_TBA
     * <p>
     * Creates an expression of the form: [propertyName] [operator] [operand].  For example:
     *     Height > 100
     *     id !== 10
     *     state === 'Pennsylvania'
     * </p>
     * <p>
     * Do not construct this directly; instead use DOC_TBA.
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

    ///////////////////////////////////////////////////////////////////////////

    function createBins(propertyMetadata, colors) {
        var length = colors.length;
        var min = propertyMetadata.minimum;
        var max = propertyMetadata.maximum;
        var delta = Math.max(max - min, 0) / length;
        var colorBins = new Array(length);
        for (var i = 0; i < length; ++i) {
            colorBins[i] = {
                maximum : (i !== length - 1) ? Math.ceil(min + ((i + 1) * delta)) : max,
                color : Color.fromBytes((colors[i])[0], (colors[i])[1], (colors[i])[2])
            };
        }

        return colorBins;
    }

    return getCesium3DTileStyle;
});
