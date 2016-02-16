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

        // remove any operators we do not support
        jsep.removeUnaryOp("~");
        jsep.removeUnaryOp("+");

        var ast = jsep(expression);
        console.log(ast);

        this._runtimeAst = createRuntimeAst(this, ast);
        console.log(this._runtimeAst);
    }

    defineProperties(Expression.prototype, {
    });

    function Node(type, value, evaluate, left, right) {
        this._type = type;
        this._value = value;
        this.evaluate = evaluate;
        this._left = left;
        this._right = right;
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
        } else if (ast.type === 'UnaryExpression') {
            var op = ast.operator;
            var child = createRuntimeAst(expression, ast.argument);
            if (op === '!') {
                node = new Node(ExpressionType.UNARY, op, expression._evaluateNot, child);
            } else if (op === '-') {
                node = new Node(ExpressionType.UNARY, op, expression._evaluateNegative, child);
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

    Expression.prototype._evaluateNot = function(feature) {
        return !(this._left.evaluate(feature));
    };

    Expression.prototype._evaluateNegative = function(feature) {
        return -(this._left.evaluate(feature));
    };

    return Expression;
});
