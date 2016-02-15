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

        console.log(this._ast);
        this._runtimeAST = createRuntimeAst(this._ast);
        console.log(this._runtimeAST);
    }

    function createRuntimeAst(ast) {
        var node = ast;
        if (ast.type === 'Literal') {

            //check if the string is a color, if so turn it into a cesium color
            if (typeof(ast.value) === 'string') {
                var c = Color.fromCssColorString(ast.value);
                if (defined(c)) {
                    node.value = c;
                }
            }
        }

        return node;
    }

    defineProperties(Expression.prototype, {
    });

    Expression.prototype.evaluate = function(feature) {

        if (this._runtimeAST.type === 'Literal') {
            return this._runtimeAST.value;
        }

        return undefined;
    };

    return Expression;
});
