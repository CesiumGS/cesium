/*global define*/
define([
       '../Core/Color',
       '../Core/defined',
       '../Core/defineProperties',
       '../Core/DeveloperError',
       '../Core/isArray',
       '../ThirdParty/jsep',
       './ExpressionNodeType'
    ], function(
        Color,
        defined,
        defineProperties,
        DeveloperError,
        isArray,
        jsep,
        ExpressionNodeType) {
    "use strict";

    var unaryOperators = ['!', '-', '+'];
    var binaryOperators = ['+', '-', '*', '/', '%', '===', '==', '!==', '!=', '>', '>=', '<', '<=', '&&', '||', '!~', '=~'];

    var variableRegex = /\${(.*?)}/g;
    var backslashRegex = /\\/g;
    var backslashReplacement = '@#%';
    var replacementRegex = /@#%/g;

    var scratchColor = new Color();

    var ScratchStorage = {
        scratchColorIndex : 0,
        scratchColors : [new Color()],
        reset : function() {
            this.scratchColorIndex = 0;
        },
        getColor : function() {
            if (this.scratchColorIndex >= this.scratchColors.length) {
                this.scratchColors.push(new Color());
            }
            var scratchColor = this.scratchColors[this.scratchColorIndex];
            ++this.scratchColorIndex;
            return scratchColor;
        }
    };

    /**
     * Evaluates an expression defined using the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}.
     * <p>
     * Implements the {@link StyleExpression} interface.
     * </p>
     *
     * @alias Expression
     * @constructor
     *
     * @param {String} [expression] The expression defined using the 3D Tiles Styling language.
     *
     * @example
     * var expression = new Cesium.Expression('(regExp("^Chest").test(${County})) && (${YearBuilt} >= 1970)');
     * expression.evaluate(feature); // returns true or false depending on the feature's properties
     *
     * @example
     * var expression = new Cesium.Expression('(${Temperature} > 90) ? color("red") : color("white")');
     * expression.evaluateColor(feature, result); // returns a Cesium.Color object
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
     */
    function Expression(expression) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof(expression) !== 'string') {
            throw new DeveloperError('expression must be a string.');
        }
        //>>includeEnd('debug');

        this._expression = expression;
        expression = replaceVariables(removeBackslashes(expression));

        // customize jsep operators
        jsep.addBinaryOp('=~', 0);
        jsep.addBinaryOp('!~', 0);

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
        /**
         * Gets the expression defined in the 3D Tiles Styling language.
         *
         * @memberof Expression.prototype
         *
         * @type {String}
         * @readonly
         *
         * @default undefined
         */
        expression : {
            get : function() {
                return this._expression;
            }
        }
    });

    /**
     * Evaluates the result of an expression, optionally using the provided feature's properties. If the result of
     * the expression in the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
     * is of type <code>Boolean</code>, <code>Number</code>, or <code>String</code>, the corresponding JavaScript
     * primitive type will be returned. If the result is a <code>RegExp</code>, a Javascript <code>RegExp</code>
     * object will be returned. If the result is a <code>Color</code>, a {@link Color} object will be returned.
     *
     * @param {Cesium3DTileFeature} feature The feature who's properties may be used as variables in the expression.
     * @returns {Boolean|Number|String|Color|RegExp} The result of evaluating the expression.
     */
    Expression.prototype.evaluate = function(feature) {
        ScratchStorage.reset();
        var result = this._runtimeAst.evaluate(feature);
        if (result instanceof Color) {
            return Color.clone(result);
        }
        return result;
    };

    /**
     * Evaluates the result of a Color expression, using the values defined by a feature.
     *
     * @param {Cesium3DTileFeature} feature The feature who's properties may be used as variables in the expression.
     * @param {Color} [result] The object in which to store the result
     * @returns {Color} The modified result parameter or a new Color instance if one was not provided.
     */
    Expression.prototype.evaluateColor = function(feature, result) {
        ScratchStorage.reset();
        var color = this._runtimeAst.evaluate(feature);
        return Color.clone(color, result);
    };

    /**
     * Gets the shader function for this expression.
     * Returns undefined if the shader function can't be generated from this expression.
     *
     * @param {String} functionName Name to give to the generated function.
     * @param {String} attributePrefix Prefix that is added to any variable names to access vertex attributes.
     * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
     * @param {String} returnType The return type of the generated function.
     *
     * @returns {String} The shader function.
     *
     * @private
     */
    Expression.prototype.getShaderFunction = function(functionName, attributePrefix, shaderState, returnType) {
        var shaderExpression = this.getShaderExpression(attributePrefix, shaderState);
        if (!defined(shaderExpression)) {
            return undefined;
        }

        shaderExpression = returnType + ' ' + functionName + '() \n' +
            '{ \n' +
            '    return ' + shaderExpression + '; \n' +
            '} \n';

        return shaderExpression;
    };

    /**
     * Gets the shader expression for this expression.
     * Returns undefined if the shader expression can't be generated from this expression.
     *
     * @param {String} attributePrefix Prefix that is added to any variable names to access vertex attributes.
     * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
     *
     * @returns {String} The shader expression.
     *
     * @private
     */
    Expression.prototype.getShaderExpression = function(attributePrefix, shaderState) {
        return this._runtimeAst.getShaderExpression(attributePrefix, shaderState);
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

    function removeBackslashes(expression) {
        return expression.replace(backslashRegex, backslashReplacement);
    }

    function replaceBackslashes(expression) {
        return expression.replace(replacementRegex, '\\');
    }

    function replaceVariables(expression) {
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
        } else if (call === 'isExactClass') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length < 1 || args.length > 1) {
                throw new DeveloperError('Error: ' + call + ' requires exactly one argument.');
            }
            //>>includeEnd('debug');
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'isClass') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length < 1 || args.length > 1) {
                throw new DeveloperError('Error: ' + call + ' requires exactly one argument.');
            }
            //>>includeEnd('debug');
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'getClassName') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length < 1 || args.length > 1) {
                throw new DeveloperError('Error: ' + call + ' requires exactly one argument.');
            }
            //>>includeEnd('debug');
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'abs') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length < 1 || args.length > 1) {
                throw new DeveloperError('Error: ' + call + ' requires exactly one argument.');
            }
            //>>includeEnd('debug');
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'cos') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length < 1 || args.length > 1) {
                throw new DeveloperError('Error: ' + call + ' requires exactly one argument.');
            }
            //>>includeEnd('debug');
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'sqrt') {
            //>>includeStart('debug', pragmas.debug);
            if (args.length < 1 || args.length > 1) {
                throw new DeveloperError('Error: ' + call + ' requires exactly one argument.');
            }
            //>>includeEnd('debug');
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
                node.evaluate = node._evaluateEqualsStrict;
            } else if (node._value === '==') {
                node.evaluate = node._evaluateEquals;
            } else if (node._value === '!==') {
                node.evaluate = node._evaluateNotEqualsStrict;
            } else if (node._value === '!=') {
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
            } else if (node._value === 'isExactClass') {
                node.evaluate = node._evaluateIsClass;
            } else if (node._value === 'isClass') {
                node.evaluate = node._evaluateIsDerived;
            } else if (node._value === 'getClassName') {
                node.evaluate = node._evaluateGetClassName;
            } else if (node._value === 'abs') {
                node.evaluate = node._evaluateAbsoluteValue;
            } else if (node._value === 'cos') {
                node.evaluate = node._evaluateCosine;
            } else if (node._value === 'sqrt') {
                node.evaluate = node._evaluateSquareRoot;
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

    Node.prototype._evaluateLiteralColor = function(feature) {
        var result = ScratchStorage.getColor();
        var args = this._left;
        if (this._value === 'color') {
            if (!defined(args)) {
                return Color.fromBytes(255, 255, 255, 255, result);
            } else if (args.length > 1) {
                Color.fromCssColorString(args[0].evaluate(feature, result), result);
                result.alpha = args[1].evaluate(feature, result);
            } else {
                Color.fromCssColorString(args[0].evaluate(feature, result), result);
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
    Node.prototype._evaluateMemberDot = function(feature) {
        if(checkFeature(this._left)) {
            return feature.getProperty(this._right);
        }
        var property = this._left.evaluate(feature);
        if (!defined(property)) {
            return undefined;
        }
        return property[this._right];
    };

    Node.prototype._evaluateMemberBrackets = function(feature) {
        if(checkFeature(this._left)) {
            return feature.getProperty(this._right.evaluate(feature));
        }
        var property = this._left.evaluate(feature);
        if (!defined(property)) {
            return undefined;
        }
        return property[this._right.evaluate(feature)];
    };

    Node.prototype._evaluateArray = function(feature) {
        var array = [];
        for (var i = 0; i < this._value.length; i++) {
            array[i] = this._value[i].evaluate(feature);
        }
        return array;
    };

    // PERFORMANCE_IDEA: Have "fast path" functions that deal only with specific types
    // that we can assign if we know the types before runtime

    Node.prototype._evaluateNot = function(feature) {
        return !(this._left.evaluate(feature));
    };

    Node.prototype._evaluateNegative = function(feature) {
        return -(this._left.evaluate(feature));
    };

    Node.prototype._evaluatePositive = function(feature) {
        return +(this._left.evaluate(feature));
    };

    Node.prototype._evaluateLessThan = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        return left < right;
    };

    Node.prototype._evaluateLessThanOrEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        return left <= right;
    };

    Node.prototype._evaluateGreaterThan = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        return left > right;
    };

    Node.prototype._evaluateGreaterThanOrEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        return left >= right;
    };

    Node.prototype._evaluateOr = function(feature) {
        var left = this._left.evaluate(feature);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(left) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined.');
        }
        //>>includeEnd('debug');

        // short circuit the expression
        if (left) {
            return true;
        }

        var right = this._right.evaluate(feature);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(right) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined.');
        }
        //>>includeEnd('debug');
        return left || right;
    };

    Node.prototype._evaluateAnd = function(feature) {
        var left = this._left.evaluate(feature);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(left) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined.');
        }
        //>>includeEnd('debug');

        // short circuit the expression
        if (!left) {
            return false;
        }

        var right = this._right.evaluate(feature);
        //>>includeStart('debug', pragmas.debug);
        if (typeof(right) !== 'boolean') {
            throw new DeveloperError('Error: Operation is undefined.');
        }
        //>>includeEnd('debug');
        return left && right;
    };

    Node.prototype._evaluatePlus = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.add(left, right, ScratchStorage.getColor());
        }
        return left + right;
    };

    Node.prototype._evaluateMinus = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.subtract(left, right, ScratchStorage.getColor());
        }
        return left - right;
    };

    Node.prototype._evaluateTimes = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.multiply(left, right, ScratchStorage.getColor());
        } else if ((right instanceof Color) && (typeof(left) === 'number')) {
            return Color.multiplyByScalar(right, left, ScratchStorage.getColor());
        } else if ((left instanceof Color) && (typeof(right) === 'number')) {
            return Color.multiplyByScalar(left, right, ScratchStorage.getColor());
        }
        return left * right;
    };

    Node.prototype._evaluateDivide = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.divide(left, right, ScratchStorage.getColor());
        } else if ((left instanceof Color) && (typeof(right) === 'number')) {
            return Color.divideByScalar(left, right, ScratchStorage.getColor());
        }
        return left / right;
    };

    Node.prototype._evaluateMod = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.mod(left, right, ScratchStorage.getColor());
        }
        return left % right;
    };

    Node.prototype._evaluateEqualsStrict = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.equals(left, right);
        }
        return left === right;
    };

    Node.prototype._evaluateEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Color) && (left instanceof Color)) {
            return Color.equals(left, right);
        }

        // Specifically want to do an abstract equality comparison (==) instead of a strict equality comparison (===)
        // so that cases like "5 == '5'" return true. Tell jsHint to ignore this line.
        return left == right; // jshint ignore:line
    };

    Node.prototype._evaluateNotEqualsStrict = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Color) && (left instanceof Color)) {
            return !Color.equals(left, right);
        }
        return left !== right;
    };

    Node.prototype._evaluateNotEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Color) && (left instanceof Color)) {
            return !Color.equals(left, right);
        }
        // Specifically want to do an abstract inequality comparison (!=) instead of a strict inequality comparison (!==)
        // so that cases like "5 != '5'" return false. Tell jsHint to ignore this line.
        return left != right; // jshint ignore:line
    };

    Node.prototype._evaluateConditional = function(feature) {
        if (this._test.evaluate(feature)) {
            return this._left.evaluate(feature);
        }
        return this._right.evaluate(feature);
    };

    Node.prototype._evaluateNaN = function(feature) {
        return isNaN(this._left.evaluate(feature));
    };

    Node.prototype._evaluateIsFinite = function(feature) {
        return isFinite(this._left.evaluate(feature));
    };

    Node.prototype._evaluateIsClass = function(feature) {
        return feature.isExactClass(this._left.evaluate(feature));
    };

    Node.prototype._evaluateIsDerived = function(feature) {
        return feature.isClass(this._left.evaluate(feature));
    };

    Node.prototype._evaluateGetClassName = function(feature) {
        return feature.getClassName(this._left.evaluate(feature));
    };

    Node.prototype._evaluateAbsoluteValue = function(feature) {
        return Math.abs(this._left.evaluate(feature));
    };

    Node.prototype._evaluateCosine = function(feature) {
        return Math.cos(this._left.evaluate(feature));
    };

    Node.prototype._evaluateSquareRoot = function(feature) {
        return Math.sqrt(this._left.evaluate(feature));
    };

    Node.prototype._evaluateBooleanConversion = function(feature) {
        return Boolean(this._left.evaluate(feature));
    };

    Node.prototype._evaluateNumberConversion = function(feature) {
        return Number(this._left.evaluate(feature));
    };

    Node.prototype._evaluateStringConversion = function(feature) {
        return String(this._left.evaluate(feature));
    };

    Node.prototype._evaluateRegExp = function(feature) {
        var pattern = this._value.evaluate(feature);
        var flags = '';

        if (defined(this._left)) {
            flags = this._left.evaluate(feature);
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

    Node.prototype._evaluateRegExpTest = function(feature) {
        return this._left.evaluate(feature).test(this._right.evaluate(feature));
    };

    Node.prototype._evaluateRegExpMatch = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if (left instanceof RegExp) {
            return left.test(right);
        } else if (right instanceof RegExp) {
            return right.test(left);
        } else {
            return false;
        }
    };

    Node.prototype._evaluateRegExpNotMatch = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if (left instanceof RegExp) {
            return !(left.test(right));
        } else if (right instanceof RegExp) {
            return !(right.test(left));
        } else {
            return false;
        }
    };

    Node.prototype._evaluateRegExpExec = function(feature) {
        var exec = this._left.evaluate(feature).exec(this._right.evaluate(feature));
        if (!defined(exec)) {
            return null;
        }
        return exec[1];
    };

    Node.prototype._evaluateToString = function(feature) {
        var left = this._left.evaluate(feature);
        if ((left instanceof RegExp) || (left instanceof Color)) {
            return String(left);
        }
        //>>includeStart('debug', pragmas.debug);
        else {
            throw new DeveloperError('Error: Unexpected function call "' + this._value + '".');
        }
        //>>includeEnd('debug');
    };

    function convertHSLToRGB(ast) {
        // Check if the color contains any nested expressions to see if the color can be converted here.
        // E.g. "hsl(0.9, 0.6, 0.7)" is able to convert directly to rgb, "hsl(0.9, 0.6, ${Height})" is not.
        var channels = ast._left;
        var length = channels.length;
        for (var i = 0; i < length; ++i) {
            if (channels[i]._type !== ExpressionNodeType.LITERAL_NUMBER) {
                return undefined;
            }
        }
        var h = channels[0]._value;
        var s = channels[1]._value;
        var l = channels[2]._value;
        var a = (length === 4) ? channels[3]._value : 1.0;
        return Color.fromHsl(h, s, l, a, scratchColor);
    }

    function convertRGBToColor(ast) {
        // Check if the color contains any nested expressions to see if the color can be converted here.
        // E.g. "rgb(255, 255, 255)" is able to convert directly to Color, "rgb(255, 255, ${Height})" is not.
        var channels = ast._left;
        var length = channels.length;
        for (var i = 0; i < length; ++i) {
            if (channels[i]._type !== ExpressionNodeType.LITERAL_NUMBER) {
                return undefined;
            }
        }
        var color = scratchColor;
        color.red = channels[0]._value / 255.0;
        color.green = channels[1]._value / 255.0;
        color.blue = channels[2]._value / 255.0;
        color.alpha = (length === 4) ? channels[3]._value : 1.0;
        return color;
    }

    function numberToString(number) {
        if (number % 1 === 0) {
            // Add a .0 to whole numbers
            return number.toFixed(1);
        } else {
            return number.toString();
        }
    }

    function colorToVec3(color) {
        var r = numberToString(color.red);
        var g = numberToString(color.green);
        var b = numberToString(color.blue);
        return 'vec3(' + r + ', ' + g + ', ' + b + ')';
    }

    function colorToVec4(color) {
        var r = numberToString(color.red);
        var g = numberToString(color.green);
        var b = numberToString(color.blue);
        var a = numberToString(color.alpha);
        return 'vec4(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
    }

    function getExpressionArray(array, attributePrefix, shaderState) {
        var length = array.length;
        var expressions = new Array(length);
        for (var i = 0; i < length; ++i) {
            var shader = array[i].getShaderExpression(attributePrefix, shaderState);
            if (!defined(shader)) {
                // If any of the expressions are not valid, the array is not valid
                return undefined;
            }
            expressions[i] = shader;
        }
        return expressions;
    }

    Node.prototype.getShaderExpression = function(attributePrefix, shaderState) {
        var color;
        var left;
        var right;
        var test;

        var type = this._type;
        var value = this._value;

        // Right may be a string if it's a member variable: e.g. "${property.name}"
        if (typeof(this._right) === 'string') {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('Error generating style shader: string members are not supported.');
            //>>includeEnd('debug');
            // Return undefined when not in debug. Tell jsHint to ignore this line.
            return; // jshint ignore:line
        }

        if (defined(this._left)) {
            if (isArray(this._left)) {
                // Left can be an array if the type is LITERAL_COLOR
                left = getExpressionArray(this._left, attributePrefix, shaderState);
            } else {
                left = this._left.getShaderExpression(attributePrefix, shaderState);
            }
            if (!defined(left)) {
                // If the left side is not valid shader code, then the expression is not valid
                return undefined;
            }
        }

        if (defined(this._right)) {
            right = this._right.getShaderExpression(attributePrefix, shaderState);
            if (!defined(right)) {
                // If the right side is not valid shader code, then the expression is not valid
                return undefined;
            }
        }

        if (defined(this._test)) {
            test = this._test.getShaderExpression(attributePrefix, shaderState);
            if (!defined(test)) {
                // If the test is not valid shader code, then the expression is not valid
                return undefined;
            }
        }

        if (isArray(this._value)) {
            // For ARRAY type
            value = getExpressionArray(this._value, attributePrefix, shaderState);
            if (!defined(value)) {
                // If the values are not valid shader code, then the expression is not valid
                return undefined;
            }
        }

        switch (type) {
            case ExpressionNodeType.VARIABLE:
                return attributePrefix + value;
            case ExpressionNodeType.UNARY:
                // Supported types: +, -, !, Boolean, Number
                if (value === 'Boolean') {
                    return 'bool(' + left + ')';
                } else if (value === 'Number') {
                    return 'float(' + left + ')';
                } else if (value === 'abs') {
                    return 'abs(' + left + ')';
                } else if (value === 'cos') {
                    return 'cos(' + left + ')';
                } else if (value === 'sqrt') {
                    return 'sqrt(' + left + ')';
                }
                //>>includeStart('debug', pragmas.debug);
                else if ((value === 'isNaN') || (value === 'isFinite') || (value === 'String') || (value === 'isExactClass') || (value === 'isClass') || (value === 'getClassName')) {
                    throw new DeveloperError('Error generating style shader: "' + value + '" is not supported.');
                }
                //>>includeEnd('debug');
                return value + left;
            case ExpressionNodeType.BINARY:
                // Supported types: ||, &&, ===, ==, !==, !=, <, >, <=, >=, +, -, *, /, %
                if (value === '%') {
                    return 'mod(' + left + ', ' + right + ')';
                } else if (value === '===') {
                    return '(' + left + ' == ' + right + ')';
                } else if (value === '!==') {
                    return '(' + left + ' != ' + right + ')';
                }
                return '(' + left + ' ' + value + ' ' + right + ')';
            case ExpressionNodeType.CONDITIONAL:
                return '(' + test + ' ? ' + left + ' : ' + right + ')';
            case ExpressionNodeType.MEMBER:
                // This is intended for accessing the components of vec2, vec3, and vec4 properties. String members aren't supported.
                return left + '[int(' + right + ')]';
            case ExpressionNodeType.FUNCTION_CALL:
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error generating style shader: "' + value + '" is not supported.');
                //>>includeEnd('debug');
            case ExpressionNodeType.ARRAY:
                if (value.length === 4) {
                    return 'vec4(' + value[0] + ', ' + value[1] + ', ' + value[2] + ', ' + value[3] + ')';
                } else if (value.length === 3) {
                    return 'vec3(' + value[0] + ', ' + value[1] + ', ' + value[2] + ')';
                } else if (value.length === 2) {
                    return 'vec2(' + value[0] + ', ' + value[1] + ')';
                }
                //>>includeStart('debug', pragmas.debug);
                else {
                    throw new DeveloperError('Error generating style shader: Invalid array length. Array length should be 2, 3, or 4.');
                }
                //>>includeEnd('debug');
                break;
            case ExpressionNodeType.REGEX:
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error generating style shader: Regular expressions are not supported.');
                //>>includeEnd('debug');
            case ExpressionNodeType.VARIABLE_IN_STRING:
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error generating style shader: Converting a variable to a string is not supported.');
                //>>includeEnd('debug');
            case ExpressionNodeType.LITERAL_NULL:
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error generating style shader: null is not supported.');
                //>>includeEnd('debug');
            case ExpressionNodeType.LITERAL_BOOLEAN:
                return value ? 'true' : 'false';
            case ExpressionNodeType.LITERAL_NUMBER:
                return numberToString(value);
            case ExpressionNodeType.LITERAL_STRING:
                // The only supported strings are css color strings
                color = Color.fromCssColorString(value, scratchColor);
                if (defined(color)) {
                    return colorToVec3(color);
                }
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error generating style shader: String literals are not supported.');
                //>>includeEnd('debug');
            case ExpressionNodeType.LITERAL_COLOR:
                var args = left;
                if (value === 'color') {
                    if (!defined(args)) {
                        return 'vec4(1.0)';
                    } else if (args.length > 1) {
                        var rgb = args[0];
                        var alpha = args[1];
                        if (alpha !== '1.0') {
                            shaderState.translucent = true;
                        }
                        return 'vec4(' + rgb + ', ' + alpha + ')';
                    } else {
                        return 'vec4(' + args[0] + ', 1.0)';
                    }
                } else if (value === 'rgb') {
                    color = convertRGBToColor(this);
                    if (defined(color)) {
                        return colorToVec4(color);
                    } else {
                        return 'vec4(' + args[0] + ' / 255.0, ' + args[1] + ' / 255.0, ' + args[2] + ' / 255.0, 1.0)';
                    }
                } else if (value === 'rgba') {
                    if (args[3] !== '1.0') {
                        shaderState.translucent = true;
                    }
                    color = convertRGBToColor(this);
                    if (defined(color)) {
                        return colorToVec4(color);
                    } else {
                        return 'vec4(' + args[0] + ' / 255.0, ' + args[1] + ' / 255.0, ' + args[2] + ' / 255.0, ' + args[3] + ')';
                    }
                } else if (value === 'hsl') {
                    color = convertHSLToRGB(this);
                    if (defined(color)) {
                        return colorToVec4(color);
                    } else {
                        return 'vec4(czm_HSLToRGB(vec3(' + args[0] + ', ' + args[1] + ', ' + args[2] + ')), 1.0)';
                    }
                } else if (value === 'hsla') {
                    color = convertHSLToRGB(this);
                    if (defined(color)) {
                        if (color.alpha !== 1.0) {
                            shaderState.translucent = true;
                        }
                        return colorToVec4(color);
                    } else {
                        if (args[3] !== '1.0') {
                            shaderState.translucent = true;
                        }
                        return 'vec4(czm_HSLToRGB(vec3(' + args[0] + ', ' + args[1] + ', ' + args[2] + ')), ' + args[3] + ')';
                    }
                }
                break;
            case ExpressionNodeType.LITERAL_REGEX:
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error generating style shader: Regular expressions are not supported.');
                //>>includeEnd('debug');
            case ExpressionNodeType.LITERAL_UNDEFINED:
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Error generating style shader: undefined is not supported.');
                //>>includeEnd('debug');
        }
    };

    return Expression;
});
