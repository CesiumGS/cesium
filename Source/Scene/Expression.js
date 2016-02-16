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
        console.log(ast);

        this._runtimeAst = createRuntimeAst(this, ast);
        console.log(this._runtimeAst);
    }

    defineProperties(Expression.prototype, {
    });

    function Node(type, value, evaluate) {
        this._type = type;
        this._value = value;
        this.evaluate = evaluate;
    }

    function createRuntimeAst(expression, ast) {
        var node;

        if (ast.type === 'Literal') {
            node = new Node(ExpressionType.LITERAL, ast.value, expression._evaluateLiteral);
        } else if (ast.type === 'CallExpression') {
            var call = ast.callee.name;
            var args = ast.arguments;
            var val;
            if (call === 'color') {
                val = Color.fromCssColorString(args[0].value);
                if (defined(val)) {
                    node = new Node(ExpressionType.LITERAL, val, expression._evaluateLiteral);
                }
            } else if (call === 'rgb') {
                val = Color.fromBytes(args[0].value, args[1].value, args[2].value);
                if (defined(val)) {
                    node = new Node(ExpressionType.LITERAL, val, expression._evaluateLiteral);
                }
            } else if (call === 'hsl') {
                val = Color.fromHsl(args[0].value, args[1].value, args[2].value);
                if (defined(val)) {
                    node = new Node(ExpressionType.LITERAL, val, expression._evaluateLiteral);
                }
            }
        }

        return node;
    }

    Expression.prototype.evaluate = function(feature) {
        return this._runtimeAst.evaluate(feature);
    };

    Expression.prototype._evaluateLiteral = function(feature) {
        return this._value;
    };

    return Expression;
});
