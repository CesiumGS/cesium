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

    var unaryOperators = ['!', '-', '+'];
    var binaryOperators = ['+', '-', '*', '/', '%', '===', '!==', '>', '>=', '<', '<=', '&&', '||', '!~', '=~'];

    var variableRegex = /\${(.*?)}/g;
    var backslashRegex = /\\/g;
    var backslashReplacement = '@#%';
    var replacementRegex = /@#%/g;

    var scratchColor = new Color();

    /**
     * DOC_TBA
     */
    function Expression(styleEngine, expression) {
        // TODO: remove _styleEngine unless it is needed, e.g., because AST is exposed
        this._styleEngine = styleEngine;

        //>>includeStart('debug', pragmas.debug);
        if (typeof(expression) !== 'string') {
            throw new DeveloperError('expression must be a string.');
        }
        //>>includeEnd('debug');

        expression = replaceVariables(removeBackslashes(expression));

        // customize jsep operators
        jsep.addBinaryOp("=~", 0);
        jsep.addBinaryOp("!~", 0);

        var ast;
        try {
            ast = jsep(expression);
        } catch (e) {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError(e);
            //>>includeEnd('debug');
        }

        this._runtimeAst = createRuntimeAst(this, ast);
    }

    defineProperties(Expression.prototype, {

        // TODO: Expose AST?

    });

    Expression.prototype.evaluate = function(feature) {
        return this._runtimeAst.evaluate(feature);
    };

    Expression.prototype.evaluateColor = function(feature, result) {
        return this._runtimeAst.evaluate(feature, result);
    };

    function Node(type, value, left, right, test) {
        this._type = type;
        this._value = value;
        this._left = left;
        this._right = right;
        this._test = test;
        this.evaluate = undefined;

        setEvaluateFunction(this);
    }

    // TODO: Make fix to jsep to allow backslashes

    function removeBackslashes(expression) {
        return expression.replace(backslashRegex, backslashReplacement);
    }

    function replaceBackslashes(expression) {
        return expression.replace(replacementRegex, '\\');
    }

    function replaceVariables(expression) {
        // TODO: Allow variable names inside of member expressions, eg. ${foo[${bar}]}
        // TODO: Allow for escaped variables in strings

        var exp = expression;
        var result = '';
        var i = exp.indexOf('${');
        while (i >= 0) {
            // check if string is inside quotes
            var openSingleQuote = exp.indexOf('\'');
            var openDoubleQuote = exp.indexOf('"');
            var closeQuote;
            if (openSingleQuote >= 0 && openSingleQuote < i) {
                closeQuote = exp.indexOf('\'', openSingleQuote + 1);
                result += exp.substr(0, closeQuote + 1);
                exp = exp.substr(closeQuote + 1);
                i = exp.indexOf('${');
            } else if (openDoubleQuote >= 0 && openDoubleQuote < i) {
                closeQuote = exp.indexOf('"', openDoubleQuote + 1);
                result += exp.substr(0, closeQuote + 1);
                exp = exp.substr(closeQuote + 1);
                i = exp.indexOf('${');
            } else {
                result += exp.substr(0, i);
                var j = exp.indexOf('}');
                //>>includeStart('debug', pragmas.debug);
                if (j < 0) {
                    throw new DeveloperError('Error: unmatched {.');
                }
                //>>includeEnd('debug');
                result += "czm_" + exp.substr(i + 2, j - (i + 2));
                exp = exp.substr(j + 1);
                i = exp.indexOf('${');
            }
        }
        result += exp;
        return result;
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
            if (ast.value.indexOf('${') >= 0) {
                return new Node(ExpressionNodeType.VARIABLE_IN_STRING, ast.value);
            }
            return new Node(ExpressionNodeType.LITERAL_STRING, replaceBackslashes(ast.value));
        }
    }

    function parseCall(expression, ast) {
        var args = ast.arguments;
        var call;
        var val;

        // Member function calls
        if (ast.callee.type === 'MemberExpression') {
            call = ast.callee.property.name;
            var object = ast.callee.object;
            if (call === 'test' || call === 'exec') {
                // Make sure this is called on a valid type
                //>>includeStart('debug', pragmas.debug);
                if (object.callee.name !== 'regExp') {
                    throw new DeveloperError('Error: ' + call + ' is not a function.');
                }
                //>>includeEnd('debug');
                if (args.length === 0) {
                    if (call === 'test') {
                        return new Node(ExpressionNodeType.LITERAL_BOOLEAN, false);
                    } else {
                        return new Node(ExpressionNodeType.LITERAL_NULL, null);
                    }
                }
                var left = createRuntimeAst(expression, object);
                var right = createRuntimeAst(expression, args[0]);
                return new Node(ExpressionNodeType.FUNCTION_CALL, call, left, right);
            } else if (call === 'toString') {
                val = createRuntimeAst(expression, object);
                return new Node(ExpressionNodeType.FUNCTION_CALL, call, val);
            }

            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error: Unexpected function call "' + call + '".');
            //>>includeEnd('debug');
        }

        // Non-member function calls
        call = ast.callee.name;
        if (call === 'color') {
            if (args.length === 0) {
                return new Node(ExpressionNodeType.LITERAL_COLOR, call);
            }
            val = createRuntimeAst(expression, args[0]);
            if (defined(args[1])) {
                var alpha = createRuntimeAst(expression, args[1]);
                return new Node(ExpressionNodeType.LITERAL_COLOR, call, [val, alpha]);
            }
            return new Node(ExpressionNodeType.LITERAL_COLOR, call, [val]);
        } else if (call === 'rgb' || call === 'hsl') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length < 3) {
                throw new DeveloperError('Error: ' + call + ' requires three arguments.');
            }
            //>>includeEnd('debug');
            val = [
                createRuntimeAst(expression, args[0]),
                createRuntimeAst(expression, args[1]),
                createRuntimeAst(expression, args[2])
            ];
           return new Node(ExpressionNodeType.LITERAL_COLOR, call, val);
        } else if (call === 'rgba' || call === 'hsla') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length < 4) {
                throw new DeveloperError('Error: ' + call + ' requires four arguments.');
            }
            //>>includeEnd('debug');
            val = [
                createRuntimeAst(expression, args[0]),
                createRuntimeAst(expression, args[1]),
                createRuntimeAst(expression, args[2]),
                createRuntimeAst(expression, args[3])
            ];
            return new Node(ExpressionNodeType.LITERAL_COLOR, call, val);
        } else if (call === 'isNaN' || call === 'isFinite') {
            if (args.length === 0) {
                if (call === 'isNaN') {
                    return new Node(ExpressionNodeType.LITERAL_BOOLEAN, true);
                } else {
                    return new Node(ExpressionNodeType.LITERAL_BOOLEAN, false);
                }
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'Boolean') {
            if (args.length === 0) {
                return new Node(ExpressionNodeType.LITERAL_BOOLEAN, false);
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'Number') {
            if (args.length === 0) {
                return new Node(ExpressionNodeType.LITERAL_NUMBER, 0);
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'String') {
            if (args.length === 0) {
                return new Node(ExpressionNodeType.LITERAL_STRING, '');
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'regExp') {
            return parseRegex(expression, ast);
        }

        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('Error: Unexpected function call "' + call + '".');
        //>>includeEnd('debug');
    }

    function parseRegex(expression, ast) {
        var args = ast.arguments;
        // no arguments, return default regex
        if (args.length === 0) {
            return new Node(ExpressionNodeType.LITERAL_REGEX, new RegExp());
        }

        var pattern = createRuntimeAst(expression, args[0]);
        var exp;

        // optional flag argument supplied
        if (args.length > 1) {
            var flags = createRuntimeAst(expression, args[1]);
            if (isLiteralType(pattern) && isLiteralType(flags)) {
                try {
                    exp = new RegExp(replaceBackslashes(String(pattern._value)), flags._value);
                } catch (e) {
                    //>>includeStart('debug', pragmas.debug);
                    throw new DeveloperError(e);
                    //>>includeEnd('debug');
                }
                return new Node(ExpressionNodeType.LITERAL_REGEX, exp);
            }
            return new Node(ExpressionNodeType.REGEX, pattern, flags);
        }

        // only pattern argument supplied
        if (isLiteralType(pattern)) {
            try {
                exp = new RegExp(replaceBackslashes(String(pattern._value)));
            } catch (e) {
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError(e);
                //>>includeEnd('debug');
            }
            return new Node(ExpressionNodeType.LITERAL_REGEX, exp);
        }
        return new Node(ExpressionNodeType.REGEX, pattern);
    }

    function parseKeywordsAndVariables(ast) {
        if (isVariable(ast.name)) {
            return new Node(ExpressionNodeType.VARIABLE, getPropertyName(ast.name));
        } else if (ast.name === 'NaN') {
            return new Node(ExpressionNodeType.LITERAL_NUMBER, NaN);
        } else if (ast.name === 'Infinity') {
            return new Node(ExpressionNodeType.LITERAL_NUMBER, Infinity);
        } else if (ast.name === 'undefined') {
            return new Node(ExpressionNodeType.LITERAL_UNDEFINED, undefined);
        }

        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('Error: ' + ast.name + ' is not defined.');
        //>>includeEnd('debug');
    }

    function parseMemberExpression(expression, ast) {
        var obj = createRuntimeAst(expression, ast.object);
        if (ast.computed) {
            var val = createRuntimeAst(expression, ast.property);
            return new Node(ExpressionNodeType.MEMBER, 'brackets', obj, val);
        } else {
            return new Node(ExpressionNodeType.MEMBER, 'dot', obj, ast.property.name);
        }
    }

    function isLiteralType(node) {
        return (node._type >= ExpressionNodeType.LITERAL_NULL);
    }

    function isVariable(name) {
        return (name.substr(0, 4) === 'czm_');
    }

    function getPropertyName(variable) {
        return variable.substr(4);
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
        } else if (ast.type === 'Identifier') {
            node = parseKeywordsAndVariables(ast);
        } else if (ast.type === 'UnaryExpression') {
            op = ast.operator;
            var child = createRuntimeAst(expression, ast.argument);
            if (unaryOperators.indexOf(op) > -1) {
                node = new Node(ExpressionNodeType.UNARY, op, child);
            } else {
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error: Unexpected operator "' + op + '".');
                //>>includeEnd('debug');
            }
        } else if (ast.type === 'BinaryExpression') {
            op = ast.operator;
            left = createRuntimeAst(expression, ast.left);
            right = createRuntimeAst(expression, ast.right);
            if (binaryOperators.indexOf(op) > -1) {
                node = new Node(ExpressionNodeType.BINARY, op, left, right);
            } else {
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error: Unexpected operator "' + op + '".');
                //>>includeEnd('debug');
            }
        } else if (ast.type === 'LogicalExpression') {
            op = ast.operator;
            left = createRuntimeAst(expression, ast.left);
            right = createRuntimeAst(expression, ast.right);
            if (binaryOperators.indexOf(op) > -1) {
                node = new Node(ExpressionNodeType.BINARY, op, left, right);
            }
        } else if (ast.type === 'ConditionalExpression') {
            var test = createRuntimeAst(expression, ast.test);
            left = createRuntimeAst(expression, ast.consequent);
            right = createRuntimeAst(expression, ast.alternate);
            node = new Node(ExpressionNodeType.CONDITIONAL, '?', left, right, test);
        } else if (ast.type === 'MemberExpression') {
            node = parseMemberExpression(expression, ast);
        } else if (ast.type === 'ArrayExpression') {
            var val = [];
            for (var i = 0; i < ast.elements.length; i++) {
                val[i] = createRuntimeAst(expression, ast.elements[i]);
            }
            node = new Node(ExpressionNodeType.ARRAY, val);
        }
        //>>includeStart('debug', pragmas.debug);
        else if (ast.type === 'Compound') {
            // empty expression or multiple expressions
            throw new DeveloperError('Error: Provide exactly one expression.');
        }  else {
            throw new DeveloperError('Error: Cannot parse expression.');
        }
        //>>includeEnd('debug');

        return node;
    }

    function setEvaluateFunction(node) {
        if (node._type === ExpressionNodeType.CONDITIONAL) {
            node.evaluate = node._evaluateConditional;
        } else if (node._type === ExpressionNodeType.FUNCTION_CALL) {
            if (node._value === 'test') {
                node.evaluate = node._evaluateRegExpTest;
            } else if (node._value === 'exec') {
                node.evaluate = node._evaluateRegExpExec;
            } else if (node._value === 'toString') {
                node.evaluate = node._evaluateToString;
            }
        } else if (node._type === ExpressionNodeType.BINARY) {
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
            } else if (node._value === '=~') {
                node.evaluate = node._evaluateRegExpMatch;
            } else if (node._value === '!~') {
                node.evaluate = node._evaluateRegExpNotMatch;
            }
        } else if (node._type === ExpressionNodeType.UNARY) {
            if (node._value === '!') {
                node.evaluate = node._evaluateNot;
            } else if (node._value === '-') {
                node.evaluate = node._evaluateNegative;
            } else if (node._value === '+') {
                node.evaluate = node._evaluatePositive;
            } else if (node._value === 'isNaN') {
                node.evaluate = node._evaluateNaN;
            } else if (node._value === 'isFinite') {
                node.evaluate = node._evaluateIsFinite;
            } else if (node._value === 'Boolean') {
                node.evaluate = node._evaluateBooleanConversion;
            } else if (node._value === 'Number') {
                node.evaluate = node._evaluateNumberConversion;
            } else if (node._value === 'String') {
                node.evaluate = node._evaluateStringConversion;
            }
        } else if (node._type === ExpressionNodeType.MEMBER) {
            if (node._value === 'brackets') {
                node.evaluate = node._evaluateMemberBrackets;
            } else {
                node.evaluate = node._evaluateMemberDot;
            }
        } else if (node._type === ExpressionNodeType.ARRAY) {
            node.evaluate = node._evaluateArray;
        } else if (node._type === ExpressionNodeType.VARIABLE) {
            node.evaluate = node._evaluateVariable;
        } else if (node._type === ExpressionNodeType.VARIABLE_IN_STRING) {
            node.evaluate = node._evaluateVariableString;
        } else if (node._type === ExpressionNodeType.LITERAL_COLOR) {
            node.evaluate = node._evaluateLiteralColor;
        } else if (node._type === ExpressionNodeType.LITERAL_STRING) {
            node.evaluate = node._evaluateLiteralString;
        } else if (node._type === ExpressionNodeType.REGEX) {
            node.evaluate = node._evaluateRegExp;
        } else {
            node.evaluate = node._evaluateLiteral;
        }
    }

    Node.prototype._evaluateLiteral = function(feature) {
        return this._value;
    };

    Node.prototype._evaluateLiteralColor = function(feature, result) {
        if (!defined(result)) {
            result = new Color();
        }
        var args = this._left;
        if (this._value === 'color') {
            if (!defined(args)) {
                return Color.fromBytes(255, 255, 255, 255, result);
            } else if (args.length > 1) {
                Color.fromCssColorString(args[0].evaluate(feature, result), result);
                result.alpha = args[1].evaluate(feature, result);
            } else {
                Color.fromCssColorString(this._left[0].evaluate(feature, result), result);
            }
        } else if (this._value === 'rgb') {
            Color.fromBytes(
                args[0].evaluate(feature, result),
                args[1].evaluate(feature, result),
                args[2].evaluate(feature, result),
                255, result);
        } else if (this._value === 'rgba') {
            // convert between css alpha (0 to 1) and cesium alpha (0 to 255)
            var a = args[3].evaluate(feature, result) * 255;
            Color.fromBytes(
                args[0].evaluate(feature, result),
                args[1].evaluate(feature, result),
                args[2].evaluate(feature, result),
                a, result);
        } else if (this._value === 'hsl') {
            Color.fromHsl(
                args[0].evaluate(feature, result),
                args[1].evaluate(feature, result),
                args[2].evaluate(feature, result),
                1.0, result);
        } else if (this._value === 'hsla') {
            Color.fromHsl(
                args[0].evaluate(feature, result),
                args[1].evaluate(feature, result),
                args[2].evaluate(feature, result),
                args[3].evaluate(feature, result),
                result);
        }
        return result;
    };

    Node.prototype._evaluateLiteralString = function(feature) {
        return this._value;
    };

    Node.prototype._evaluateVariableString = function(feature) {
        var result = this._value;
        var match = variableRegex.exec(result);
        while (match !== null) {
            var placeholder = match[0];
            var variableName = match[1];
            var property = feature.getProperty(variableName);
            if (!defined(property)) {
                property = '';
            }
            result = result.replace(placeholder, property);
            match = variableRegex.exec(result);
        }
        return result;
    };

    Node.prototype._evaluateVariable = function(feature) {
        // evaluates to undefined if the property name is not defined for that feature
        return feature.getProperty(this._value);
    };

    function checkFeature (ast) {
        return (ast._value === 'feature');
    }

    // PERFORMANCE_IDEA: Determine if parent property needs to be computed before runtime
    Node.prototype._evaluateMemberDot = function(feature, result) {
        if(checkFeature(this._left)) {
            return feature.getProperty(this._right);
        }
        var property = this._left.evaluate(feature, result);
        if (!defined(property)) {
            return undefined;
        }
        return property[this._right];
    };

    Node.prototype._evaluateMemberBrackets = function(feature, result) {
        if(checkFeature(this._left)) {
            return feature.getProperty(this._right.evaluate(feature, result));
        }
        var property = this._left.evaluate(feature, result);
        if (!defined(property)) {
            return undefined;
        }
        return property[this._right.evaluate(feature, result)];
    };

    Node.prototype._evaluateArray = function(feature, result) {
        var array = [];
        for (var i = 0; i<this._value.length; i++) {
            array[i] = this._value[i].evaluate(feature, result);
        }
        return array;
    };

    // PERFORMANCE_IDEA: Have "fast path" functions that deal only with specific types
    // that we can assign if we know the types before runtime

    Node.prototype._evaluateNot = function(feature, result) {
        return !(this._left.evaluate(feature, result));
    };

    Node.prototype._evaluateNegative = function(feature, result) {
        return -(this._left.evaluate(feature, result));
    };

    Node.prototype._evaluatePositive = function(feature, result) {
        return +(this._left.evaluate(feature, result));
    };

    Node.prototype._evaluateLessThan = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        return left < right;
    };

    Node.prototype._evaluateLessThanOrEquals = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        return left <= right;
    };

    Node.prototype._evaluateGreaterThan = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        return left > right;
    };

    Node.prototype._evaluateGreaterThanOrEquals = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        return left >= right;
    };

    Node.prototype._evaluateOr = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(left) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined.');
        }
        //>>includeEnd('debug');

        // short circuit the expression
        if (left) {
            return true;
        }

        var right = this._right.evaluate(feature, result);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(right) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined.');
        }
        //>>includeEnd('debug');
        return left || right;
    };

    Node.prototype._evaluateAnd = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(left) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined.');
        }
        //>>includeEnd('debug');

        // short circuit the expression
        if (!left) {
            return false;
        }

        var right = this._right.evaluate(feature, result);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(right) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined.');
        }
        //>>includeEnd('debug');
        return left && right;
    };

    Node.prototype._evaluatePlus = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.add(left, right, scratchColor);
        }
        return left + right;
    };

    Node.prototype._evaluateMinus = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.subtract(left, right, scratchColor);
        }
        return left - right;
    };

    Node.prototype._evaluateTimes = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.multiply(left, right, scratchColor);
        } else if ((right instanceof Color) && (typeof(left) === 'number')) {
            return Color.multiplyByScalar(right, left, scratchColor);
        } else if ((left instanceof Color) && (typeof(right) === 'number')) {
            return Color.multiplyByScalar(left, right, scratchColor);
        }
        return left * right;
    };

    Node.prototype._evaluateDivide = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.divide(left, right, scratchColor);
        } else if ((left instanceof Color) && (typeof(right) === 'number')) {
            return Color.divideByScalar(left, right, scratchColor);
        }
        return left / right;
    };

    Node.prototype._evaluateMod = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.mod(left, right, scratchColor);
        }
        return left % right;
    };

    Node.prototype._evaluateEquals = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.equals(left, right);
        }
        return left === right;
    };

    Node.prototype._evaluateNotEquals = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        if ((right instanceof Color) && (left instanceof Color)) {
            return !Color.equals(left, right);
        }
        return left !== right;
    };

    Node.prototype._evaluateConditional = function(feature, result) {
        if (this._test.evaluate(feature, result)) {
            return this._left.evaluate(feature, result);
        }
        return this._right.evaluate(feature, result);
    };

    Node.prototype._evaluateNaN = function(feature, result) {
        return isNaN(this._left.evaluate(feature, result));
    };

    Node.prototype._evaluateIsFinite = function(feature, result) {
        return isFinite(this._left.evaluate(feature, result));
    };

    Node.prototype._evaluateBooleanConversion = function(feature, result) {
        return Boolean(this._left.evaluate(feature, result));
    };

    Node.prototype._evaluateNumberConversion = function(feature, result) {
        return Number(this._left.evaluate(feature, result));
    };

    Node.prototype._evaluateStringConversion = function(feature, result) {
        return String(this._left.evaluate(feature, result));
    };

    Node.prototype._evaluateRegExp = function(feature, result) {
        var pattern = this._value.evaluate(feature, result);
        var flags = '';

        if (defined(this._left)) {
            flags = this._left.evaluate(feature, result);
        }

        var exp;
        try {
            exp = new RegExp(pattern, flags);
        } catch (e) {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError(e);
            //>>includeEnd('debug');
        }
        return exp;
    };

    Node.prototype._evaluateRegExpTest = function(feature, result) {
        return this._left.evaluate(feature, result).test(this._right.evaluate(feature, result));
    };

    Node.prototype._evaluateRegExpMatch = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        if (left instanceof RegExp) {
            return left.test(right);
        } else if (right instanceof RegExp) {
            return right.test(left);
        } else {
            return false;
        }
    };

    Node.prototype._evaluateRegExpNotMatch = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        var right = this._right.evaluate(feature, result);
        if (left instanceof RegExp) {
            return !(left.test(right));
        } else if (right instanceof RegExp) {
            return !(right.test(left));
        } else {
            return false;
        }
    };

    Node.prototype._evaluateRegExpExec = function(feature, result) {
        var exec = this._left.evaluate(feature, result).exec(this._right.evaluate(feature, result));
        if (!defined(exec)) {
            return null;
        }
        return exec[1];
    };

    Node.prototype._evaluateToString = function(feature, result) {
        var left = this._left.evaluate(feature, result);
        if ((left instanceof RegExp) || (left instanceof Color)) {
            return String(left);
        }
        //>>includeStart('debug', pragmas.debug);
        else {
            throw new DeveloperError('Error: Unexpected function call "' + this._value + '".');
        }
        //>>includeEnd('debug');
    };

    return Expression;
});