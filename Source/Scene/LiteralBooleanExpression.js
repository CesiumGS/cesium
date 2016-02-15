/*global define*/
define([
       '../Core/defineProperties'
    ], function(
        defineProperties) {
    "use strict";

    // TODO: replace with a real parser/AST

    /**
     * DOC_TBA
     */
    function LiteralBooleanExpression(styleEngine, literal) {
        this._styleEngine = styleEngine;

        this._literal = literal;

        /**
         * DOC_TBA
         *
         * @function
         */
        this.evaluate = undefined;

        setEvaluateFunction(this);
    }

    defineProperties(LiteralBooleanExpression.prototype, {
        /**
         * DOC_TBA
         */
        literal : {
            get : function() {
                return this._literal;
            },
            set : function(value) {
                if (this._literal !== value) {
                    this._literal = value;
                    setEvaluateFunction(this);
                    this._styleEngine.makeDirty();
                }
            }
        }
    });

    function setEvaluateFunction(expression) {
        if (expression._literal) {
            expression.evaluate = expression._true;
        } else {
            expression.evaluate = expression._false;
        }
    }

    LiteralBooleanExpression.prototype._true = function(feature) {
        return true;
    };

    LiteralBooleanExpression.prototype._false = function(feature) {
        return false;
    };

    return LiteralBooleanExpression;
});
