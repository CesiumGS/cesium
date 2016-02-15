/*global define*/
define([
       '../Core/Color',
       '../Core/defined',
       '../Core/defineProperties',
       '../ThirdParty/jsep'
    ], function(
        Color,
        defined,
        defineProperties,
        jsep) {
    "use strict";

    /**
     * DOC_TBA
     */
    function Expression(styleEngine, expression) {
        this._styleEngine = styleEngine;

        this._ast = jsep(expression);
        this._runtimeAST = undefined;

        // create "compiled" AST
        createRuntimeAst(this);
    }

    function createRuntimeAst(expression) {
        console.log(expression._ast);
        if (expression._ast.type === 'Literal') {
            expression._runtimeAST = expression._ast;

            var value = expression._ast.value;

            //check if the string is a color, if so turn it into a cesium color
            if (typeof(value) === 'string') {
                var c = Color.fromCssColorString(value);
                if (defined(c)) {
                    expression._runtimeAST.value = c;
                }
            }
        }
        console.log(expression._runtimeAST);
    }

    defineProperties(Expression.prototype, {
    });

    Expression.prototype.evaluate = function(feature) {
        // if it's a literal, we're done, return value
        if (this._runtimeAST.type === 'Literal') {
            return this._runtimeAST.value;
        }

        return undefined;
    };

    return Expression;
});
