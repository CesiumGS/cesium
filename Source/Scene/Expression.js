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

    Expression.prototype.evaluate = function(feature) {
        return this._runtimeAst.evaluate(feature);
    };

    function Node(value, left, right) {
        this._value = value;
        this._left = left;
        this._right = right;
        this.evaluate = undefined;

        setEvaluateFunction(this);
    }

    function createRuntimeAst(expression, ast) {
        var node;

        if (ast.type === 'Literal') {
            node = new Node(ast.value);
        } else if (ast.type === 'CallExpression') {
            var call = ast.callee.name;
            var args = ast.arguments;
            var val;
            if (call === 'color') {
                val = Color.fromCssColorString(args[0].value);
                if (defined(val)) {
                    node = new Node(val);
                }
            } else if (call === 'rgb') {
                val = Color.fromBytes(args[0].value, args[1].value, args[2].value);
                if (defined(val)) {
                    node = new Node(val);
                }
            } else if (call === 'hsl') {
                val = Color.fromHsl(args[0].value, args[1].value, args[2].value);
                if (defined(val)) {
                    node = new Node(val);
                }
            }
        } else if (ast.type === 'UnaryExpression') {
            var op = ast.operator;
            var child = createRuntimeAst(expression, ast.argument);
            if (op === '!') {
                node = new Node(op, child);
            } else if (op === '-') {
                node = new Node(op, child);
            }
        }

        return node;
    }

    function setEvaluateFunction(node) {
        node.evaluate = node._evaluateLiteral;
    }

    Node.prototype._evaluateLiteral = function(feature) {
        return this._value;
    };

    Node.prototype._evaluateNot = function(feature) {
        return !(this._left.evaluate(feature));
    };

    Node.prototype._evaluateNegative = function(feature) {
        return -(this._left.evaluate(feature));
    };

    return Expression;
});
