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
        var op;
        var val;

        if (ast.type === 'Literal') {
            node = new Node(ast.value);
        } else if (ast.type === 'CallExpression') {
            var call = ast.callee.name;
            var args = ast.arguments;
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
            op = ast.operator;
            var child = createRuntimeAst(expression, ast.argument);
            if (op === '!' || op === '-') {
                node = new Node(op, child);
            }
        } else if (ast.type === 'BinaryExpression') {
            op = ast.operator;
            var left = createRuntimeAst(expression, ast.left);
            var right = createRuntimeAst(expression, ast.right);
            if (op === '+' || op === '-' || op === '*' ||
                op === '/' || op === '%' || op === '===' ||
                op === '!==') {
                node = new Node(op, left, right);
            }
        }

        return node;
    }

    function setEvaluateFunction(node) {
        if (defined(node._right)) {
            if (node._value === '+') {
                node.evaluate = node._evaluatePlus;
            } else if (node._value === '-') {
                node.evaluate = node._evaluateMinus;
            } else if (node._value === '*') {
                node.evaluate = node._evaluateTimes;
            } else if (node._value === '/') {
                node.evaluate = node._evaluateDivide;
            } else if (node._value === '%') {
                node.evaluate = node._evaluateMod;
            } else if (node._value === '===') {
                node.evaluate = node._evaluateEquals;
            } else if (node._value === '!==') {
                node.evaluate = node._evaluateNotEquals;
            }
        } else if (defined(node._left)) {
            if (node._value === '!') {
                node.evaluate = node._evaluateNot;
            } else if (node._value === '-') {
                node.evaluate = node._evaluateNegative;
            }
        } else {
            node.evaluate = node._evaluateLiteral;
        }
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

    Node.prototype._evaluatePlus = function(feature) {
        return this._left.evaluate(feature) + this._right.evaluate(feature);
    };

    Node.prototype._evaluateMinus = function(feature) {
        return this._left.evaluate(feature) - this._right.evaluate(feature);
    };

    Node.prototype._evaluateTimes = function(feature) {
        return this._left.evaluate(feature) * this._right.evaluate(feature);
    };

    Node.prototype._evaluateDivide = function(feature) {
        return this._left.evaluate(feature) / this._right.evaluate(feature);
    };

    Node.prototype._evaluateMod = function(feature) {
        return this._left.evaluate(feature) % this._right.evaluate(feature);
    };

    Node.prototype._evaluateEquals = function(feature) {
        return this._left.evaluate(feature) === this._right.evaluate(feature);
    };

    Node.prototype._evaluateNotEquals = function(feature) {
        return this._left.evaluate(feature) !== this._right.evaluate(feature);
    };

    return Expression;
});
