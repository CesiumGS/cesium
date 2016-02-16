/*global define*/
define([
       '../Core/Color',
       '../Core/defined',
       '../Core/defineProperties',
       '../ThirdParty/jsep',
       './ExpressionType'
    ], function(
        Color,
        defined,
        defineProperties,
        jsep,
        ExpressionType) {
    "use strict";

    /**
     * DOC_TBA
     */
    function Expression(styleEngine, expression) {
        this._styleEngine = styleEngine;

        var ast = jsep(expression);
        this._runtimeAst = undefined;

        console.log(ast);
        this._runtimeAst = createRuntimeAst(ast);
        console.log(this._runtimeAst);
    }

    defineProperties(Expression.prototype, {
    });

    function Node(type, value) {
        this._type = type;
        this._value = value;
    }

    function createRuntimeAst(ast) {
        var node;

        if (ast.type === 'Literal') {
            node = new Node(ExpressionType.LITERAL, ast.value);
        } else if (ast.type === 'CallExpression') {
            var call = ast.callee.name;
            var args = ast.arguments;
            var val;
            if (call === 'color') {
                 val = Color.fromCssColorString(args[0].value);
                if (defined(val)) {
                    node = new Node(ExpressionType.LITERAL, val);
                }
            } else if (call === 'rgb') {
                val = Color.fromBytes(args[0].value, args[1].value, args[2].value);
                if (defined(val)) {
                    node = new Node(ExpressionType.LITERAL, val);
                }
            } else if (call === 'hsl') {
                val = Color.fromHsl(args[0].value, args[1].value, args[2].value);
                if (defined(val)) {
                    node = new Node(ExpressionType.LITERAL, val);
                }
            }
        }

        return node;
    }

    Expression.prototype.evaluate = function(feature) {
        var runtimeAst = this._runtimeAst;

        if (runtimeAst._type === ExpressionType.LITERAL) {
            return runtimeAst._value;
        }

        return undefined;
    };

    return Expression;
});
