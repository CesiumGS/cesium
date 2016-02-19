/*global define*/
define([
       '../Core/Color',
       '../Core/defined',
       '../Core/defineProperties',
       '../Core/DeveloperError',
       '../ThirdParty/jsep',
       './ExpressionNodeType'
    ], function(
        Color,
        defined,
        defineProperties,
        DeveloperError,
        jsep,
        ExpressionNodeType) {
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

    function Node(type, value, left, right) {
        this._type = type;
        this._value = value;
        this._left = left;
        this._right = right;
        this.evaluate = undefined;

        setEvaluateFunction(this);
    }

    function parseLiteral(ast) {
        var type = typeof(ast.value);
        if (ast.value === null) {
            return new Node(ExpressionNodeType.LITERAL_NULL, null);
        } else if (type === 'boolean') {
            return new Node(ExpressionNodeType.LITERAL_BOOLEAN, ast.value);
        } else if (type === 'number') {
            return new Node(ExpressionNodeType.LITERAL_NUMBER, ast.value);
        } else if (type === 'string') {
            return new Node(ExpressionNodeType.LITERAL_STRING, ast.value);
        }

        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('Error: ' + ast.value + ' is not defined');
        //>>includeEnd('debug');
    }

    function parseCall(expression, ast) {
        var call = ast.callee.name;
        var args = ast.arguments;
        var val;
        
        // TODO: Throw error if returned Color is not defined

        if (call === 'Color') {
            val = Color.fromCssColorString(args[0].value);
            if (defined(args[1])) {
                val = Color.fromAlpha(val, args[1].value);
            }
            if (defined(val)) {
               return new Node(ExpressionNodeType.LITERAL_COLOR, val);
            }
        } else if (call === 'rgb') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length !== 3) {
                throw new DeveloperError('Error: rgb requires three arguments');
            }
            //>>includeEnd('debug');
            val = Color.fromBytes(args[0].value, args[1].value, args[2].value);
            if (defined(val)) {
               return new Node(ExpressionNodeType.LITERAL_COLOR, val);
            }
        } else if (call === 'hsl') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length !== 3) {
                throw new DeveloperError('Error: hsl requires three arguments');
            }
            //>>includeEnd('debug');
            val = Color.fromHsl(args[0].value, args[1].value, args[2].value);
            if (defined(val)) {
               return new Node(ExpressionNodeType.LITERAL_COLOR, val);
            }
        } else if (call === 'rgba') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length !== 4) {
                throw new DeveloperError('Error: rgba requires four arguments');
            }
            //>>includeEnd('debug');
            // convert between css alpha (0 to 1) and cesium alpha (0 to 255)
            var a = args[3].value * 255;
            val = Color.fromBytes(args[0].value, args[1].value, args[2].value, a);
            if (defined(val)) {
               return new Node(ExpressionNodeType.LITERAL_COLOR, val);
            }
        } else if (call === 'hsla') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length !== 4) {
                throw new DeveloperError('Error: hlsa requires four arguments');
            }
            //>>includeEnd('debug');
            val = Color.fromHsl(args[0].value, args[1].value, args[2].value, args[3].value);
            if (defined(val)) {
               return new Node(ExpressionNodeType.LITERAL_COLOR, val);
            }
        } else if (call === 'isNaN') {
            if (args.length === 0) {
                return new Node(ExpressionNodeType.LITERAL_BOOLEAN, true);
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        }

        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('Error: Unexpected function call "' + call + '"');
        //>>includeEnd('debug');
    }

    function createRuntimeAst(expression, ast) {
        var node;
        var op;
        var left;
        var right;

        if (ast.type === 'Literal') {
            node = parseLiteral(ast);
        } else if (ast.type === 'CallExpression') {
            node = parseCall(expression, ast);
        } else if (ast.type === 'UnaryExpression') {
            op = ast.operator;
            var child = createRuntimeAst(expression, ast.argument);
            if (op === '!' || op === '-') {
                node = new Node(ExpressionNodeType.UNARY, op, child);
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
                node = new Node(ExpressionNodeType.BINARY, op, left, right);
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
                node = new Node(ExpressionNodeType.BINARY, op, left, right);
            } else {
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error: Unexpected operator "' + op + '"');
                //>>includeEnd('debug');
            }
        }
        //>>includeStart('debug', pragmas.debug);
        else if (ast.type === 'CompoundExpression') {
            // empty expression or multiple expressions
            throw new DeveloperError('Error: Provide exactly one expression');
        }  else {
            throw new DeveloperError('Error: Cannot parse expression');
        }
        //>>includeEnd('debug');

        return node;
    }

    function setEvaluateFunction(node) {
        if (node._type === ExpressionNodeType.BINARY) {
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
        } else if (node._type === ExpressionNodeType.UNARY) {
            if (node._value === '!') {
                node.evaluate = node._evaluateNot;
            } else if (node._value === '-') {
                node.evaluate = node._evaluateNegative;
            }  else if (node._value === '-') {
                node.evaluate = node._evaluateNaN;
            }
        } else {
            node.evaluate = node._evaluateLiteral;
        }
    }

    function checkRelationalTypes(ast) {
        //>>includeStart('debug', pragmas.debug);
        if (ast._left._type !== ast._right._type) {
            throw new DeveloperError('Error: Cannot convert between types');
        } else if (ast._left._type === ExpressionNodeType.LITERAL_BOOLEAN ||
                   ast._right._type === ExpressionNodeType.LITERAL_BOOLEAN ||
                   ast._left._type === ExpressionNodeType.LITERAL_COLOR ||
                   ast._right._type === ExpressionNodeType.LITERAL_COLOR) {
            throw new DeveloperError('Error: Operation is undefined');
        }
        //>>includeEnd('debug');
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
        checkRelationalTypes(this);
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        return left < right;
    };

    Node.prototype._evaluateLessThanOrEquals = function(feature) {
        checkRelationalTypes(this);
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        return left <= right;
    };

    Node.prototype._evaluateGreaterThan = function(feature) {
        checkRelationalTypes(this);
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        return left > right;
    };

    Node.prototype._evaluateGreaterThanOrEquals = function(feature) {
        checkRelationalTypes(this);
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        return left >= right;
    };

    Node.prototype._evaluateOr = function(feature) {
        var left = this._left.evaluate(feature);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(left) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined');
        }
        //>>includeEnd('debug');

        // short circuit the expression
        if (left) {
            return true;
        }

        var right = this._right.evaluate(feature);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(right) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined');
        }
        //>>includeEnd('debug');
        return left || right;
    };

    Node.prototype._evaluateAnd = function(feature) {
        var left = this._left.evaluate(feature);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(left) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined');
        }
        //>>includeEnd('debug');

        // short circuit the expression
        if (!left) {
            return false;
        }

        var right = this._right.evaluate(feature);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(right) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined');
        }
        //>>includeEnd('debug');
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

    Node.prototype._evaluateNaN = function(feature) {
        return isNaN(this._left.evaluate(feature));
    };

    return Expression;
});
