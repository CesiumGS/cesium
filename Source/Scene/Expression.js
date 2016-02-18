/*global define*/
define([
       '../Core/Color',
       '../Core/defined',
       '../Core/defineProperties',
       '../Core/DeveloperError',
       '../ThirdParty/jsep'
    ], function(
        Color,
        defined,
        defineProperties,
        DeveloperError,
        jsep) {
    "use strict";

    /**
     * DOC_TBA
     */
    function Expression(styleEngine, expression) {
        this._styleEngine = styleEngine;

        var ast;
        try {
            ast = jsep(expression);
        } catch (e) {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError(e);
            //>>includeEnd('debug');
        }
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
        var left;
        var right;

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
            } else if (call === 'rgba') {
                // convert between css alpha (0 to 1) and cesium alpha (0 to 255)
                var a = args[3].value * 255;
                val = Color.fromBytes(args[0].value, args[1].value, args[2].value, a);
                if (defined(val)) {
                    node = new Node(val);
                }
            } else if (call === 'hsla') {
                val = Color.fromHsl(args[0].value, args[1].value, args[2].value, args[3].value);
                if (defined(val)) {
                    node = new Node(val);
                }
            } else {
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error: Unexpected function call "' + call + '"');
                //>>includeEnd('debug');
            }
        } else if (ast.type === 'UnaryExpression') {
            op = ast.operator;
            var child = createRuntimeAst(expression, ast.argument);
            if (op === '!' || op === '-') {
                node = new Node(op, child);
            } else {
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error: Unexpected operator "' + op + '"');
                //>>includeEnd('debug');
            }
        } else if (ast.type === 'BinaryExpression') {
            op = ast.operator;
            left = createRuntimeAst(expression, ast.left);
            right = createRuntimeAst(expression, ast.right);
            if (op === '+' || op === '-' || op === '*' ||
                op === '/' || op === '%' || op === '===' ||
                op === '!==' || op === '>' || op === '>=' ||
                op === '<' || op === '<=') {
                node = new Node(op, left, right);
            } else {
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error: Unexpected operator "' + op + '"');
                //>>includeEnd('debug');
            }
        } else if (ast.type === 'LogicalExpression') {
            op = ast.operator;
            left = createRuntimeAst(expression, ast.left);
            right = createRuntimeAst(expression, ast.right);
            if (op === '&&' || op === '||') {
                node = new Node(op, left, right);
            } else {
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error: Unexpected operator "' + op + '"');
                //>>includeEnd('debug');
            }
        } else if (ast.type === 'CompoundExpression') {
            // empty expression or multiple expressions
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error: Provide exactly one expression');
            //>>includeEnd('debug');
        }  else {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error: Cannot parse expression');
            //>>includeEnd('debug');
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
            } else if (node._value === '<') {
                node.evaluate = node._evaluateLessThan;
            } else if (node._value === '<=') {
                node.evaluate = node._evaluateLessThanOrEquals;
            } else if (node._value === '>') {
                node.evaluate = node._evaluateGreaterThan;
            } else if (node._value === '>=') {
                node.evaluate = node._evaluateGreaterThanOrEquals;
            } else if (node._value === '&&') {
                node.evaluate = node._evaluateAnd;
            } else if (node._value === '||') {
                node.evaluate = node._evaluateOr;
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

    function checkRelationalTypes(left, right) {
        var ltype = typeof(left);
        var rtype = typeof(right);
        if (ltype !== rtype) {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error: Cannot convert between types');
            //>>includeEnd('debug');
        } else if (ltype === 'boolean' || rtype === 'boolean' ||
                   left instanceof Color || right instanceof Color) {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error: Operation is undefined');
            //>>includeEnd('debug');
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

    // PERFORMANCE_IDEA: Have "fast path" functions that deal only with specific types
    // that we can assign if we know the types before runtime
    Node.prototype._evaluateLessThan = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        checkRelationalTypes(left, right);
        return left < right;
    };

    Node.prototype._evaluateLessThanOrEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        checkRelationalTypes(left, right);
        return left <= right;
    };

    Node.prototype._evaluateGreaterThan = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        checkRelationalTypes(left, right);
        return left > right;
    };

    Node.prototype._evaluateGreaterThanOrEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        checkRelationalTypes(left, right);
        return left >= right;
    };

    Node.prototype._evaluateOr = function(feature) {
        var left = this._left.evaluate(feature);
        if (typeof(left) !== 'boolean') {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error: Operation is undefined');
            //>>includeEnd('debug');
        }

        // short circuit the expression
        if (left) {
            return true;
        }

        var right = this._right.evaluate(feature);
        if (typeof(right) !== 'boolean') {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error: Operation is undefined');
            //>>includeEnd('debug');
        }
        return left || right;
    };

    Node.prototype._evaluateAnd = function(feature) {
        var left = this._left.evaluate(feature);
        if (typeof(left) !== 'boolean') {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error: Operation is undefined');
            //>>includeEnd('debug');
        }

        // short circuit the expression
        if (!left) {
            return false;
        }

        var right = this._right.evaluate(feature);
        if (typeof(right) !== 'boolean') {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error: Operation is undefined');
            //>>includeEnd('debug');
        }
        return left && right;
    };

    // PERFORMANCE_IDEA: Have "fast path" functions that deal only with specific types
    // that we can assign if we know the types before runtime
    Node.prototype._evaluatePlus = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if (right instanceof Color && left instanceof Color) {
            return Color.add(left, right, new Color());
        }
        return left + right;
    };

    Node.prototype._evaluateMinus = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if (right instanceof Color && left instanceof Color) {
            return Color.subtract(left, right, new Color());
        }
        return left - right;
    };

    Node.prototype._evaluateTimes = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if (right instanceof Color && left instanceof Color) {
            return Color.multiply(left, right, new Color());
        } else if (right instanceof Color && typeof(left) === 'number') {
            return Color.multiplyByScalar(right, left, new Color());
        } else if (left instanceof Color && typeof(right) === 'number') {
            return Color.multiplyByScalar(left, right, new Color());
        }
        return left * right;
    };

    Node.prototype._evaluateDivide = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if (right instanceof Color && left instanceof Color) {
            return Color.divide(left, right, new Color());
        } else if (left instanceof Color && typeof(right) === 'number') {
            return Color.divideByScalar(left, right, new Color());
        }
        return left / right;
    };

    Node.prototype._evaluateMod = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if (right instanceof Color && left instanceof Color) {
            return Color.mod(left, right, new Color());
        }
        return left % right;
    };

    Node.prototype._evaluateEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if (right instanceof Color && left instanceof Color) {
            return Color.equals(left, right);
        }
        return left === right;
    };

    Node.prototype._evaluateNotEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if (right instanceof Color && left instanceof Color) {
            return !Color.equals(left, right);
        }
        return left !== right;
    };

    return Expression;
});
