define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Check',
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/isArray',
        '../Core/Math',
        '../Core/RuntimeError',
        '../ThirdParty/jsep',
        './ExpressionNodeType'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Check,
        Color,
        defined,
        defineProperties,
        DeveloperError,
        isArray,
        CesiumMath,
        RuntimeError,
        jsep,
        ExpressionNodeType) {
    'use strict';

    /**
     * An expression for a style applied to a {@link Cesium3DTileset}.
     * <p>
     * Evaluates an expression defined using the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification/Styling|3D Tiles Styling language}.
     * </p>
     * <p>
     * Implements the {@link StyleExpression} interface.
     * </p>
     *
     * @alias Expression
     * @constructor
     *
     * @param {String} [expression] The expression defined using the 3D Tiles Styling language.
     * @param {Object} [defines] Defines in the style.
     *
     * @example
     * var expression = new Cesium.Expression('(regExp("^Chest").test(${County})) && (${YearBuilt} >= 1970)');
     * expression.evaluate(feature); // returns true or false depending on the feature's properties
     *
     * @example
     * var expression = new Cesium.Expression('(${Temperature} > 90) ? color("red") : color("white")');
     * expression.evaluateColor(feature, result); // returns a Cesium.Color object
     */
    function Expression(expression, defines) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('expression', expression);
        //>>includeEnd('debug');

        this._expression = expression;
        expression = replaceDefines(expression, defines);
        expression = replaceVariables(removeBackslashes(expression));

        // customize jsep operators
        jsep.addBinaryOp('=~', 0);
        jsep.addBinaryOp('!~', 0);

        var ast;
        try {
            ast = jsep(expression);
        } catch (e) {
            throw new RuntimeError(e);
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

    // Scratch storage manager while evaluating deep expressions.
    // For example, an expression like dot(vec4(${red}), vec4(${green}) * vec4(${blue}) requires 3 scratch Cartesian4's
    var scratchStorage = {
        arrayIndex : 0,
        arrayArray : [[]],
        cartesian2Index : 0,
        cartesian3Index : 0,
        cartesian4Index : 0,
        cartesian2Array : [new Cartesian2()],
        cartesian3Array : [new Cartesian3()],
        cartesian4Array : [new Cartesian4()],
        reset : function() {
            this.arrayIndex = 0;
            this.cartesian2Index = 0;
            this.cartesian3Index = 0;
            this.cartesian4Index = 0;
        },
        getArray : function() {
            if (this.arrayIndex >= this.arrayArray.length) {
                this.arrayArray.push([]);
            }
            var array = this.arrayArray[this.arrayIndex++];
            array.length = 0;
            return array;
        },
        getCartesian2 : function() {
            if (this.cartesian2Index >= this.cartesian2Array.length) {
                this.cartesian2Array.push(new Cartesian2());
            }
            return this.cartesian2Array[this.cartesian2Index++];
        },
        getCartesian3 : function() {
            if (this.cartesian3Index >= this.cartesian3Array.length) {
                this.cartesian3Array.push(new Cartesian3());
            }
            return this.cartesian3Array[this.cartesian3Index++];
        },
        getCartesian4 : function() {
            if (this.cartesian4Index >= this.cartesian4Array.length) {
                this.cartesian4Array.push(new Cartesian4());
            }
            return this.cartesian4Array[this.cartesian4Index++];
        }
    };

    /**
     * Evaluates the result of an expression, optionally using the provided feature's properties. If the result of
     * the expression in the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification/Styling|3D Tiles Styling language}
     * is of type <code>Boolean</code>, <code>Number</code>, or <code>String</code>, the corresponding JavaScript
     * primitive type will be returned. If the result is a <code>RegExp</code>, a Javascript <code>RegExp</code>
     * object will be returned. If the result is a <code>Cartesian2</code>, <code>Cartesian3</code>, or <code>Cartesian4</code>,
     * a {@link Cartesian2}, {@link Cartesian3}, or {@link Cartesian4} object will be returned. If the <code>result</code> argument is
     * a {@link Color}, the {@link Cartesian4} value is converted to a {@link Color} and then returned.
     *
     * @param {Cesium3DTileFeature} feature The feature whose properties may be used as variables in the expression.
     * @param {Object} [result] The object onto which to store the result.
     * @returns {Boolean|Number|String|RegExp|Cartesian2|Cartesian3|Cartesian4|Color} The result of evaluating the expression.
     */
    Expression.prototype.evaluate = function(feature, result) {
        scratchStorage.reset();
        var value = this._runtimeAst.evaluate(feature);
        if ((result instanceof Color) && (value instanceof Cartesian4)) {
            return Color.fromCartesian4(value, result);
        }
        if ((value instanceof Cartesian2) || (value instanceof Cartesian3) || (value instanceof Cartesian4)) {
            return value.clone(result);
        }
        return value;
    };

    /**
     * Evaluates the result of a Color expression, optionally using the provided feature's properties.
     * <p>
     * This is equivalent to {@link Expression#evaluate} but always returns a {@link Color} object.
     * </p>
     *
     * @param {Cesium3DTileFeature} feature The feature whose properties may be used as variables in the expression.
     * @param {Color} [result] The object in which to store the result
     * @returns {Color} The modified result parameter or a new Color instance if one was not provided.
     */
    Expression.prototype.evaluateColor = function(feature, result) {
        scratchStorage.reset();
        var color = this._runtimeAst.evaluate(feature);
        return Color.fromCartesian4(color, result);
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

    var unaryOperators = ['!', '-', '+'];
    var binaryOperators = ['+', '-', '*', '/', '%', '===', '!==', '>', '>=', '<', '<=', '&&', '||', '!~', '=~'];

    var variableRegex = /\${(.*?)}/g; // Matches ${variable_name}
    var backslashRegex = /\\/g;
    var backslashReplacement = '@#%';
    var replacementRegex = /@#%/g;

    var scratchColor = new Color();

    var unaryFunctions = {
        abs : getEvaluateUnaryComponentwise(Math.abs),
        sqrt : getEvaluateUnaryComponentwise(Math.sqrt),
        cos : getEvaluateUnaryComponentwise(Math.cos),
        sin : getEvaluateUnaryComponentwise(Math.sin),
        tan : getEvaluateUnaryComponentwise(Math.tan),
        acos : getEvaluateUnaryComponentwise(Math.acos),
        asin : getEvaluateUnaryComponentwise(Math.asin),
        atan : getEvaluateUnaryComponentwise(Math.atan),
        radians : getEvaluateUnaryComponentwise(CesiumMath.toRadians),
        degrees : getEvaluateUnaryComponentwise(CesiumMath.toDegrees),
        sign : getEvaluateUnaryComponentwise(CesiumMath.sign),
        floor : getEvaluateUnaryComponentwise(Math.floor),
        ceil : getEvaluateUnaryComponentwise(Math.ceil),
        round : getEvaluateUnaryComponentwise(Math.round),
        exp : getEvaluateUnaryComponentwise(Math.exp),
        exp2 : getEvaluateUnaryComponentwise(exp2),
        log : getEvaluateUnaryComponentwise(Math.log),
        log2 : getEvaluateUnaryComponentwise(log2),
        fract : getEvaluateUnaryComponentwise(fract),
        length : length,
        normalize: normalize
    };

    var binaryFunctions = {
        atan2 : getEvaluateBinaryComponentwise(Math.atan2, false),
        pow : getEvaluateBinaryComponentwise(Math.pow, false),
        min : getEvaluateBinaryComponentwise(Math.min, true),
        max : getEvaluateBinaryComponentwise(Math.max, true),
        distance : distance,
        dot : dot,
        cross : cross
    };

    var ternaryFunctions = {
        clamp : getEvaluateTernaryComponentwise(CesiumMath.clamp, true),
        mix : getEvaluateTernaryComponentwise(CesiumMath.lerp, true)
    };

    function fract(number) {
        return number - Math.floor(number);
    }

    function exp2(exponent) {
        return Math.pow(2.0,exponent);
    }

    function log2(number) {
        return CesiumMath.log2(number);
    }

    function getEvaluateUnaryComponentwise(operation) {
        return function(call, left) {
            if (typeof left === 'number') {
                return operation(left);
            } else if (left instanceof Cartesian2) {
                return Cartesian2.fromElements(operation(left.x), operation(left.y), scratchStorage.getCartesian2());
            } else if (left instanceof Cartesian3) {
                return Cartesian3.fromElements(operation(left.x), operation(left.y), operation(left.z), scratchStorage.getCartesian3());
            } else if (left instanceof Cartesian4) {
                return Cartesian4.fromElements(operation(left.x), operation(left.y), operation(left.z), operation(left.w), scratchStorage.getCartesian4());
            }
            throw new RuntimeError('Function "' + call + '" requires a vector or number argument. Argument is ' + left + '.');
        };
    }

    function getEvaluateBinaryComponentwise(operation, allowScalar) {
        return function(call, left, right) {
            if (allowScalar && typeof right === 'number') {
                if (typeof left === 'number') {
                    return operation(left, right);
                } else if (left instanceof Cartesian2) {
                    return Cartesian2.fromElements(operation(left.x, right), operation(left.y, right), scratchStorage.getCartesian2());
                } else if (left instanceof Cartesian3) {
                    return Cartesian3.fromElements(operation(left.x, right), operation(left.y, right), operation(left.z, right), scratchStorage.getCartesian3());
                } else if (left instanceof Cartesian4) {
                    return Cartesian4.fromElements(operation(left.x, right), operation(left.y, right), operation(left.z, right), operation(left.w, right), scratchStorage.getCartesian4());
                }
            }

            if (typeof left === 'number' && typeof right === 'number') {
                return operation(left, right);
            } else if (left instanceof Cartesian2 && right instanceof Cartesian2) {
                return Cartesian2.fromElements(operation(left.x, right.x), operation(left.y, right.y), scratchStorage.getCartesian2());
            } else if (left instanceof Cartesian3 && right instanceof Cartesian3) {
                return Cartesian3.fromElements(operation(left.x, right.x), operation(left.y, right.y), operation(left.z, right.z), scratchStorage.getCartesian3());
            } else if (left instanceof Cartesian4 && right instanceof Cartesian4) {
                return Cartesian4.fromElements(operation(left.x, right.x), operation(left.y, right.y), operation(left.z, right.z), operation(left.w, right.w), scratchStorage.getCartesian4());
            }

            throw new RuntimeError('Function "' + call + '" requires vector or number arguments of matching types. Arguments are ' + left + ' and ' + right + '.');
        };
    }

    function getEvaluateTernaryComponentwise(operation, allowScalar) {
        return function(call, left, right, test) {
            if (allowScalar && typeof test === 'number') {
                if (typeof left === 'number' && typeof right === 'number') {
                    return operation(left, right, test);
                } else if (left instanceof Cartesian2 && right instanceof Cartesian2) {
                    return Cartesian2.fromElements(operation(left.x, right.x, test), operation(left.y, right.y, test), scratchStorage.getCartesian2());
                } else if (left instanceof Cartesian3 && right instanceof Cartesian3) {
                    return Cartesian3.fromElements(operation(left.x, right.x, test), operation(left.y, right.y, test), operation(left.z, right.z, test), scratchStorage.getCartesian3());
                } else if (left instanceof Cartesian4 && right instanceof Cartesian4) {
                    return Cartesian4.fromElements(operation(left.x, right.x, test), operation(left.y, right.y, test), operation(left.z, right.z, test), operation(left.w, right.w, test), scratchStorage.getCartesian4());
                }
            }

            if (typeof left === 'number' && typeof right === 'number' && typeof test === 'number') {
                return operation(left, right, test);
            } else if (left instanceof Cartesian2 && right instanceof Cartesian2 && test instanceof Cartesian2) {
                return Cartesian2.fromElements(operation(left.x, right.x, test.x), operation(left.y, right.y, test.y), scratchStorage.getCartesian2());
            } else if (left instanceof Cartesian3 && right instanceof Cartesian3 && test instanceof Cartesian3) {
                return Cartesian3.fromElements(operation(left.x, right.x, test.x), operation(left.y, right.y, test.y), operation(left.z, right.z, test.z), scratchStorage.getCartesian3());
            } else if (left instanceof Cartesian4 && right instanceof Cartesian4 && test instanceof Cartesian4) {
                return Cartesian4.fromElements(operation(left.x, right.x, test.x), operation(left.y, right.y, test.y), operation(left.z, right.z, test.z), operation(left.w, right.w, test.w), scratchStorage.getCartesian4());
            }

            throw new RuntimeError('Function "' + call + '" requires vector or number arguments of matching types. Arguments are ' + left + ', ' + right + ', and ' + test + '.');
        };
    }

    function length(call, left) {
        if (typeof left === 'number') {
            return Math.abs(left);
        } else if (left instanceof Cartesian2) {
            return Cartesian2.magnitude(left);
        } else if (left instanceof Cartesian3) {
            return Cartesian3.magnitude(left);
        } else if (left instanceof Cartesian4) {
            return Cartesian4.magnitude(left);
        }

        throw new RuntimeError('Function "' + call + '" requires a vector or number argument. Argument is ' + left + '.');
    }

    function normalize(call, left) {
        if (typeof left === 'number') {
            return 1.0;
        } else if (left instanceof Cartesian2) {
            return Cartesian2.normalize(left, scratchStorage.getCartesian2());
        } else if (left instanceof Cartesian3) {
            return Cartesian3.normalize(left, scratchStorage.getCartesian3());
        } else if (left instanceof Cartesian4) {
            return Cartesian4.normalize(left, scratchStorage.getCartesian4());
        }

        throw new RuntimeError('Function "' + call + '" requires a vector or number argument. Argument is ' + left + '.');
    }

    function distance(call, left, right) {
        if (typeof left === 'number' && typeof right === 'number') {
            return Math.abs(left - right);
        } else if (left instanceof Cartesian2 && right instanceof Cartesian2) {
            return Cartesian2.distance(left, right);
        } else if (left instanceof Cartesian3 && right instanceof Cartesian3) {
            return Cartesian3.distance(left, right);
        } else if (left instanceof Cartesian4 && right instanceof Cartesian4) {
            return Cartesian4.distance(left, right);
        }

        throw new RuntimeError('Function "' + call + '" requires vector or number arguments of matching types. Arguments are ' + left + ' and ' + right + '.');
    }

    function dot(call, left, right) {
        if (typeof left === 'number' && typeof right === 'number') {
            return left * right;
        } else if (left instanceof Cartesian2 && right instanceof Cartesian2) {
            return Cartesian2.dot(left, right);
        } else if (left instanceof Cartesian3 && right instanceof Cartesian3) {
            return Cartesian3.dot(left, right);
        } else if (left instanceof Cartesian4 && right instanceof Cartesian4) {
            return Cartesian4.dot(left, right);
        }

        throw new RuntimeError('Function "' + call + '" requires vector or number arguments of matching types. Arguments are ' + left + ' and ' + right + '.');
    }

    function cross(call, left, right) {
        if (left instanceof Cartesian3 && right instanceof Cartesian3) {
            return Cartesian3.cross(left, right, scratchStorage.getCartesian3());
        }

        throw new RuntimeError('Function "' + call + '" requires vec3 arguments. Arguments are ' + left + ' and ' + right + '.');
    }

    function Node(type, value, left, right, test) {
        this._type = type;
        this._value = value;
        this._left = left;
        this._right = right;
        this._test = test;
        this.evaluate = undefined;

        setEvaluateFunction(this);
    }

    function replaceDefines(expression, defines) {
        if (!defined(defines)) {
            return expression;
        }
        for (var key in defines) {
            if (defines.hasOwnProperty(key)) {
                var definePlaceholder = new RegExp('\\$\\{' + key + '\\}', 'g');
                var defineReplace = '(' + defines[key] + ')';
                if (defined(defineReplace)) {
                    expression = expression.replace(definePlaceholder, defineReplace);
                }
            }
        }
        return expression;
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
            // Check if string is inside quotes
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
                if (j < 0) {
                    throw new RuntimeError('Unmatched {.');
                }
                result += 'czm_' + exp.substr(i + 2, j - (i + 2));
                exp = exp.substr(j + 1);
                i = exp.indexOf('${');
            }
        }
        result += exp;
        return result;
    }

    function parseLiteral(ast) {
        var type = typeof ast.value;
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
        var argsLength = args.length;
        var call;
        var val, left, right;

        // Member function calls
        if (ast.callee.type === 'MemberExpression') {
            call = ast.callee.property.name;
            var object = ast.callee.object;
            if (call === 'test' || call === 'exec') {
                // Make sure this is called on a valid type
                if (object.callee.name !== 'regExp') {
                    throw new RuntimeError(call + ' is not a function.');
                }
                if (argsLength === 0) {
                    if (call === 'test') {
                        return new Node(ExpressionNodeType.LITERAL_BOOLEAN, false);
                    }
                    return new Node(ExpressionNodeType.LITERAL_NULL, null);
                }
                left = createRuntimeAst(expression, object);
                right = createRuntimeAst(expression, args[0]);
                return new Node(ExpressionNodeType.FUNCTION_CALL, call, left, right);
            } else if (call === 'toString') {
                val = createRuntimeAst(expression, object);
                return new Node(ExpressionNodeType.FUNCTION_CALL, call, val);
            }

            throw new RuntimeError('Unexpected function call "' + call + '".');
        }

        // Non-member function calls
        call = ast.callee.name;
        if (call === 'color') {
            if (argsLength === 0) {
                return new Node(ExpressionNodeType.LITERAL_COLOR, call);
            }
            val = createRuntimeAst(expression, args[0]);
            if (defined(args[1])) {
                var alpha = createRuntimeAst(expression, args[1]);
                return new Node(ExpressionNodeType.LITERAL_COLOR, call, [val, alpha]);
            }
            return new Node(ExpressionNodeType.LITERAL_COLOR, call, [val]);
        } else if (call === 'rgb' || call === 'hsl') {
            if (argsLength < 3) {
                throw new RuntimeError(call + ' requires three arguments.');
            }
            val = [
                createRuntimeAst(expression, args[0]),
                createRuntimeAst(expression, args[1]),
                createRuntimeAst(expression, args[2])
            ];
            return new Node(ExpressionNodeType.LITERAL_COLOR, call, val);
        } else if (call === 'rgba' || call === 'hsla') {
            if (argsLength < 4) {
                throw new RuntimeError(call + ' requires four arguments.');
            }
            val = [
                createRuntimeAst(expression, args[0]),
                createRuntimeAst(expression, args[1]),
                createRuntimeAst(expression, args[2]),
                createRuntimeAst(expression, args[3])
            ];
            return new Node(ExpressionNodeType.LITERAL_COLOR, call, val);
        } else if (call === 'vec2' || call === 'vec3' || call === 'vec4') {
            // Check for invalid constructors at evaluation time
            val = new Array(argsLength);
            for (var i = 0; i < argsLength; ++i) {
                val[i] = createRuntimeAst(expression, args[i]);
            }
            return new Node(ExpressionNodeType.LITERAL_VECTOR, call, val);
        } else if (call === 'isNaN' || call === 'isFinite') {
            if (argsLength === 0) {
                if (call === 'isNaN') {
                    return new Node(ExpressionNodeType.LITERAL_BOOLEAN, true);
                }
                return new Node(ExpressionNodeType.LITERAL_BOOLEAN, false);
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'isExactClass' || call === 'isClass') {
            if (argsLength < 1 || argsLength > 1) {
                throw new RuntimeError(call + ' requires exactly one argument.');
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'getExactClassName') {
            if (argsLength > 0) {
                throw new RuntimeError(call + ' does not take any argument.');
            }
            return new Node(ExpressionNodeType.UNARY, call);
        } else if (defined(unaryFunctions[call])) {
            if (argsLength !== 1) {
                throw new RuntimeError(call + ' requires exactly one argument.');
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (defined(binaryFunctions[call])) {
            if (argsLength !== 2) {
                throw new RuntimeError(call + ' requires exactly two arguments.');
            }
            left = createRuntimeAst(expression, args[0]);
            right = createRuntimeAst(expression, args[1]);
            return new Node(ExpressionNodeType.BINARY, call, left, right);
        } else if (defined(ternaryFunctions[call])) {
            if (argsLength !== 3) {
                throw new RuntimeError(call + ' requires exactly three arguments.');
            }
            left = createRuntimeAst(expression, args[0]);
            right = createRuntimeAst(expression, args[1]);
            var test = createRuntimeAst(expression, args[2]);
            return new Node(ExpressionNodeType.TERNARY, call, left, right, test);
        } else if (call === 'Boolean') {
            if (argsLength === 0) {
                return new Node(ExpressionNodeType.LITERAL_BOOLEAN, false);
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'Number') {
            if (argsLength === 0) {
                return new Node(ExpressionNodeType.LITERAL_NUMBER, 0);
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'String') {
            if (argsLength === 0) {
                return new Node(ExpressionNodeType.LITERAL_STRING, '');
            }
            val = createRuntimeAst(expression, args[0]);
            return new Node(ExpressionNodeType.UNARY, call, val);
        } else if (call === 'regExp') {
            return parseRegex(expression, ast);
        }

        throw new RuntimeError('Unexpected function call "' + call + '".');
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
                    throw new RuntimeError(e);
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
                throw new RuntimeError(e);
            }
            return new Node(ExpressionNodeType.LITERAL_REGEX, exp);
        }
        return new Node(ExpressionNodeType.REGEX, pattern);
    }

    function parseKeywordsAndVariables(ast) {
        if (isVariable(ast.name)) {
            var name = getPropertyName(ast.name);
            if (name.substr(0, 8) === 'tiles3d_') {
                return new Node(ExpressionNodeType.BUILTIN_VARIABLE, name);
            }
            return new Node(ExpressionNodeType.VARIABLE, name);
        } else if (ast.name === 'NaN') {
            return new Node(ExpressionNodeType.LITERAL_NUMBER, NaN);
        } else if (ast.name === 'Infinity') {
            return new Node(ExpressionNodeType.LITERAL_NUMBER, Infinity);
        } else if (ast.name === 'undefined') {
            return new Node(ExpressionNodeType.LITERAL_UNDEFINED, undefined);
        }

        throw new RuntimeError(ast.name + ' is not defined.');
    }

    function parseMathConstant(ast) {
        var name = ast.property.name;
        if (name === 'PI') {
            return new Node(ExpressionNodeType.LITERAL_NUMBER, Math.PI);
        } else if (name === 'E') {
            return new Node(ExpressionNodeType.LITERAL_NUMBER, Math.E);
        }
    }

    function parseNumberConstant(ast) {
        var name = ast.property.name;
        if (name === 'POSITIVE_INFINITY') {
            return new Node(ExpressionNodeType.LITERAL_NUMBER, Number.POSITIVE_INFINITY);
        }
    }

    function parseMemberExpression(expression, ast) {
        if (ast.object.name === 'Math') {
            return parseMathConstant(ast);
        } else if (ast.object.name === 'Number') {
            return parseNumberConstant(ast);
        }

        var val;
        var obj = createRuntimeAst(expression, ast.object);
        if (ast.computed) {
            val = createRuntimeAst(expression, ast.property);
            return new Node(ExpressionNodeType.MEMBER, 'brackets', obj, val);
        }

        val = new Node(ExpressionNodeType.LITERAL_STRING, ast.property.name);
        return new Node(ExpressionNodeType.MEMBER, 'dot', obj, val);
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
                throw new RuntimeError('Unexpected operator "' + op + '".');
            }
        } else if (ast.type === 'BinaryExpression') {
            op = ast.operator;
            left = createRuntimeAst(expression, ast.left);
            right = createRuntimeAst(expression, ast.right);
            if (binaryOperators.indexOf(op) > -1) {
                node = new Node(ExpressionNodeType.BINARY, op, left, right);
            } else {
                throw new RuntimeError('Unexpected operator "' + op + '".');
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
        } else if (ast.type === 'Compound') {
            // empty expression or multiple expressions
            throw new RuntimeError('Provide exactly one expression.');
        } else {
            throw new RuntimeError('Cannot parse expression.');
        }

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
                node.evaluate = node._evaluateIsExactClass;
            } else if (node._value === 'isClass') {
                node.evaluate = node._evaluateIsClass;
            } else if (node._value === 'getExactClassName') {
                node.evaluate = node._evaluateGetExactClassName;
            } else if (node._value === 'Boolean') {
                node.evaluate = node._evaluateBooleanConversion;
            } else if (node._value === 'Number') {
                node.evaluate = node._evaluateNumberConversion;
            } else if (node._value === 'String') {
                node.evaluate = node._evaluateStringConversion;
            } else if (defined(unaryFunctions[node._value])) {
                node.evaluate = getEvaluateUnaryFunction(node._value);
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
            } else if (node._value === '!==') {
                node.evaluate = node._evaluateNotEqualsStrict;
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
            } else if (defined(binaryFunctions[node._value])) {
                node.evaluate = getEvaluateBinaryFunction(node._value);
            }
        } else if (node._type === ExpressionNodeType.TERNARY) {
            node.evaluate = getEvaluateTernaryFunction(node._value);
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
        } else if (node._type === ExpressionNodeType.LITERAL_VECTOR) {
            node.evaluate = node._evaluateLiteralVector;
        } else if (node._type === ExpressionNodeType.LITERAL_STRING) {
            node.evaluate = node._evaluateLiteralString;
        } else if (node._type === ExpressionNodeType.REGEX) {
            node.evaluate = node._evaluateRegExp;
        } else if (node._type === ExpressionNodeType.BUILTIN_VARIABLE) {
            if (node._value === 'tiles3d_tileset_time') {
                node.evaluate = evaluateTilesetTime;
            }
        } else {
            node.evaluate = node._evaluateLiteral;
        }
    }

    function evaluateTilesetTime(feature) {
        if (!defined(feature)) {
            return 0.0;
        }
        return feature.content.tileset.timeSinceLoad;
    }

    function getEvaluateUnaryFunction(call) {
        var evaluate = unaryFunctions[call];
        return function(feature) {
            var left = this._left.evaluate(feature);
            return evaluate(call, left);
        };
    }

    function getEvaluateBinaryFunction(call) {
        var evaluate = binaryFunctions[call];
        return function(feature) {
            var left = this._left.evaluate(feature);
            var right = this._right.evaluate(feature);
            return evaluate(call, left, right);
        };
    }

    function getEvaluateTernaryFunction(call) {
        var evaluate = ternaryFunctions[call];
        return function(feature) {
            var left = this._left.evaluate(feature);
            var right = this._right.evaluate(feature);
            var test = this._test.evaluate(feature);
            return evaluate(call, left, right, test);
        };
    }

    function getFeatureProperty(feature, name) {
        // Returns undefined if the feature is not defined or the property name is not defined for that feature
        if (defined(feature)) {
            return feature.getProperty(name);
        }
    }

    Node.prototype._evaluateLiteral = function() {
        return this._value;
    };

    Node.prototype._evaluateLiteralColor = function(feature) {
        var color = scratchColor;
        var args = this._left;
        if (this._value === 'color') {
            if (!defined(args)) {
                Color.fromBytes(255, 255, 255, 255, color);
            } else if (args.length > 1) {
                Color.fromCssColorString(args[0].evaluate(feature), color);
                color.alpha = args[1].evaluate(feature);
            } else {
                Color.fromCssColorString(args[0].evaluate(feature), color);
            }
        } else if (this._value === 'rgb') {
            Color.fromBytes(
                args[0].evaluate(feature),
                args[1].evaluate(feature),
                args[2].evaluate(feature),
                255, color);
        } else if (this._value === 'rgba') {
            // convert between css alpha (0 to 1) and cesium alpha (0 to 255)
            var a = args[3].evaluate(feature) * 255;
            Color.fromBytes(
                args[0].evaluate(feature),
                args[1].evaluate(feature),
                args[2].evaluate(feature),
                a, color);
        } else if (this._value === 'hsl') {
            Color.fromHsl(
                args[0].evaluate(feature),
                args[1].evaluate(feature),
                args[2].evaluate(feature),
                1.0, color);
        } else if (this._value === 'hsla') {
            Color.fromHsl(
                args[0].evaluate(feature),
                args[1].evaluate(feature),
                args[2].evaluate(feature),
                args[3].evaluate(feature),
                color);
        }
        return Cartesian4.fromColor(color, scratchStorage.getCartesian4());
    };

    Node.prototype._evaluateLiteralVector = function(feature) {
        // Gather the components that make up the vector, which includes components from interior vectors.
        // For example vec3(1, 2, 3) or vec3(vec2(1, 2), 3) are both valid.
        //
        // If the number of components does not equal the vector's size, then a RuntimeError is thrown - with two exceptions:
        // 1. A vector may be constructed from a larger vector and drop the extra components.
        // 2. A vector may be constructed from a single component - vec3(1) will become vec3(1, 1, 1).
        //
        // Examples of invalid constructors include:
        // vec4(1, 2)        // not enough components
        // vec3(vec2(1, 2))  // not enough components
        // vec3(1, 2, 3, 4)  // too many components
        // vec2(vec4(1), 1)  // too many components

        var components = scratchStorage.getArray();
        var call = this._value;
        var args = this._left;
        var argsLength = args.length;
        for (var i = 0; i < argsLength; ++i) {
            var value = args[i].evaluate(feature);
            if (typeof value === 'number') {
                components.push(value);
            } else if (value instanceof Cartesian2) {
                components.push(value.x, value.y);
            } else if (value instanceof Cartesian3) {
                components.push(value.x, value.y, value.z);
            } else if (value instanceof Cartesian4) {
                components.push(value.x, value.y, value.z, value.w);
            } else {
                throw new RuntimeError(call + ' argument must be a vector or number. Argument is ' + value + '.');
            }
        }

        var componentsLength = components.length;
        var vectorLength = parseInt(call.charAt(3));

        if (componentsLength === 0) {
            throw new RuntimeError('Invalid ' + call + ' constructor. No valid arguments.');
        } else if ((componentsLength < vectorLength) && (componentsLength > 1)) {
            throw new RuntimeError('Invalid ' + call + ' constructor. Not enough arguments.');
        } else if ((componentsLength > vectorLength) && (argsLength > 1)) {
            throw new RuntimeError('Invalid ' + call + ' constructor. Too many arguments.');
        }

        if (componentsLength === 1) {
            // Add the same component 3 more times
            var component = components[0];
            components.push(component, component, component);
        }

        if (call === 'vec2') {
            return Cartesian2.fromArray(components, 0, scratchStorage.getCartesian2());
        } else if (call === 'vec3') {
            return Cartesian3.fromArray(components, 0, scratchStorage.getCartesian3());
        } else if (call === 'vec4') {
            return Cartesian4.fromArray(components, 0, scratchStorage.getCartesian4());
        }
    };

    Node.prototype._evaluateLiteralString = function() {
        return this._value;
    };

    Node.prototype._evaluateVariableString = function(feature) {
        var result = this._value;
        var match = variableRegex.exec(result);
        while (match !== null) {
            var placeholder = match[0];
            var variableName = match[1];
            var property = getFeatureProperty(feature, variableName);
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
        return getFeatureProperty(feature, this._value);
    };

    function checkFeature (ast) {
        return (ast._value === 'feature');
    }

    // PERFORMANCE_IDEA: Determine if parent property needs to be computed before runtime
    Node.prototype._evaluateMemberDot = function(feature) {
        if (checkFeature(this._left)) {
            return getFeatureProperty(feature, this._right.evaluate(feature));
        }
        var property = this._left.evaluate(feature);
        if (!defined(property)) {
            return undefined;
        }

        var member = this._right.evaluate(feature);
        if ((property instanceof Cartesian2) || (property instanceof Cartesian3) || (property instanceof Cartesian4)) {
            // Vector components may be accessed with .r, .g, .b, .a and implicitly with .x, .y, .z, .w
            if (member === 'r') {
                return property.x;
            } else if (member === 'g') {
                return property.y;
            } else if (member === 'b') {
                return property.z;
            } else if (member === 'a') {
                return property.w;
            }
        }
        return property[member];
    };

    Node.prototype._evaluateMemberBrackets = function(feature) {
        if (checkFeature(this._left)) {
            return getFeatureProperty(feature, this._right.evaluate(feature));
        }
        var property = this._left.evaluate(feature);
        if (!defined(property)) {
            return undefined;
        }

        var member = this._right.evaluate(feature);
        if ((property instanceof Cartesian2) || (property instanceof Cartesian3) || (property instanceof Cartesian4)) {
            // Vector components may be accessed with [0][1][2][3], ['r']['g']['b']['a'] and implicitly with ['x']['y']['z']['w']
            // For Cartesian2 and Cartesian3 out-of-range components will just return undefined
            if (member === 0 || member === 'r') {
                return property.x;
            } else if (member === 1 || member === 'g') {
                return property.y;
            } else if (member === 2 || member === 'b') {
                return property.z;
            } else if (member === 3 || member === 'a') {
                return property.w;
            }
        }
        return property[member];
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
        var left = this._left.evaluate(feature);
        if (typeof left !== 'boolean') {
            throw new RuntimeError('Operator "!" requires a boolean argument. Argument is ' + left + '.');
        }
        return !left;
    };

    Node.prototype._evaluateNegative = function(feature) {
        var left = this._left.evaluate(feature);
        if (left instanceof Cartesian2) {
            return Cartesian2.negate(left, scratchStorage.getCartesian2());
        } else if (left instanceof Cartesian3) {
            return Cartesian3.negate(left, scratchStorage.getCartesian3());
        } else if (left instanceof Cartesian4) {
            return Cartesian4.negate(left, scratchStorage.getCartesian4());
        } else if (typeof left === 'number') {
            return -left;
        }

        throw new RuntimeError('Operator "-" requires a vector or number argument. Argument is ' + left + '.');
    };

    Node.prototype._evaluatePositive = function(feature) {
        var left = this._left.evaluate(feature);

        if (!((left instanceof Cartesian2) || (left instanceof Cartesian3) || (left instanceof Cartesian4) || (typeof left === 'number'))) {
            throw new RuntimeError('Operator "+" requires a vector or number argument. Argument is ' + left + '.');
        }

        return left;
    };

    Node.prototype._evaluateLessThan = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);

        if ((typeof left !== 'number') || (typeof right !== 'number')) {
            throw new RuntimeError('Operator "<" requires number arguments. Arguments are ' + left + ' and ' + right + '.');
        }

        return left < right;
    };

    Node.prototype._evaluateLessThanOrEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);

        if ((typeof left !== 'number') || (typeof right !== 'number')) {
            throw new RuntimeError('Operator "<=" requires number arguments. Arguments are ' + left + ' and ' + right + '.');
        }

        return left <= right;
    };

    Node.prototype._evaluateGreaterThan = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);

        if ((typeof left !== 'number') || (typeof right !== 'number')) {
            throw new RuntimeError('Operator ">" requires number arguments. Arguments are ' + left + ' and ' + right + '.');
        }

        return left > right;
    };

    Node.prototype._evaluateGreaterThanOrEquals = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);

        if ((typeof left !== 'number') || (typeof right !== 'number')) {
            throw new RuntimeError('Operator ">=" requires number arguments. Arguments are ' + left + ' and ' + right + '.');
        }

        return left >= right;
    };

    Node.prototype._evaluateOr = function(feature) {
        var left = this._left.evaluate(feature);
        if (typeof left !== 'boolean') {
            throw new RuntimeError('Operator "||" requires boolean arguments. First argument is ' + left + '.');
        }

        // short circuit the expression
        if (left) {
            return true;
        }

        var right = this._right.evaluate(feature);
        if (typeof right !== 'boolean') {
            throw new RuntimeError('Operator "||" requires boolean arguments. Second argument is ' + right + '.');
        }

        return left || right;
    };

    Node.prototype._evaluateAnd = function(feature) {
        var left = this._left.evaluate(feature);
        if (typeof left !== 'boolean') {
            throw new RuntimeError('Operator "&&" requires boolean arguments. First argument is ' + left + '.');
        }

        // short circuit the expression
        if (!left) {
            return false;
        }

        var right = this._right.evaluate(feature);
        if (typeof right !== 'boolean') {
            throw new RuntimeError('Operator "&&" requires boolean arguments. Second argument is ' + right + '.');
        }

        return left && right;
    };

    Node.prototype._evaluatePlus = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Cartesian2) && (left instanceof Cartesian2)) {
            return Cartesian2.add(left, right, scratchStorage.getCartesian2());
        } else if ((right instanceof Cartesian3) && (left instanceof Cartesian3)) {
            return Cartesian3.add(left, right, scratchStorage.getCartesian3());
        } else if ((right instanceof Cartesian4) && (left instanceof Cartesian4)) {
            return Cartesian4.add(left, right, scratchStorage.getCartesian4());
        } else if ((typeof left === 'string') || (typeof right === 'string')) {
            // If only one argument is a string the other argument calls its toString function.
            return left + right;
        } else if ((typeof left === 'number') && (typeof right === 'number')) {
            return left + right;
        }

        throw new RuntimeError('Operator "+" requires vector or number arguments of matching types, or at least one string argument. Arguments are ' + left + ' and ' + right + '.');
    };

    Node.prototype._evaluateMinus = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Cartesian2) && (left instanceof Cartesian2)) {
            return Cartesian2.subtract(left, right, scratchStorage.getCartesian2());
        } else if ((right instanceof Cartesian3) && (left instanceof Cartesian3)) {
            return Cartesian3.subtract(left, right, scratchStorage.getCartesian3());
        } else if ((right instanceof Cartesian4) && (left instanceof Cartesian4)) {
            return Cartesian4.subtract(left, right, scratchStorage.getCartesian4());
        } else if ((typeof left === 'number') && (typeof right === 'number')) {
            return left - right;
        }

        throw new RuntimeError('Operator "-" requires vector or number arguments of matching types. Arguments are ' + left + ' and ' + right + '.');
    };

    Node.prototype._evaluateTimes = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Cartesian2) && (left instanceof Cartesian2)) {
            return Cartesian2.multiplyComponents(left, right, scratchStorage.getCartesian2());
        } else if ((right instanceof Cartesian2) && (typeof left === 'number')) {
            return Cartesian2.multiplyByScalar(right, left, scratchStorage.getCartesian2());
        } else if ((left instanceof Cartesian2) && (typeof right === 'number')) {
            return Cartesian2.multiplyByScalar(left, right, scratchStorage.getCartesian2());
        } else if ((right instanceof Cartesian3) && (left instanceof Cartesian3)) {
            return Cartesian3.multiplyComponents(left, right, scratchStorage.getCartesian3());
        } else if ((right instanceof Cartesian3) && (typeof left === 'number')) {
            return Cartesian3.multiplyByScalar(right, left, scratchStorage.getCartesian3());
        } else if ((left instanceof Cartesian3) && (typeof right === 'number')) {
            return Cartesian3.multiplyByScalar(left, right, scratchStorage.getCartesian3());
        } else if ((right instanceof Cartesian4) && (left instanceof Cartesian4)) {
            return Cartesian4.multiplyComponents(left, right, scratchStorage.getCartesian4());
        } else if ((right instanceof Cartesian4) && (typeof left === 'number')) {
            return Cartesian4.multiplyByScalar(right, left, scratchStorage.getCartesian4());
        } else if ((left instanceof Cartesian4) && (typeof right === 'number')) {
            return Cartesian4.multiplyByScalar(left, right, scratchStorage.getCartesian4());
        } else if ((typeof left === 'number') && (typeof right === 'number')) {
            return left * right;
        }

        throw new RuntimeError('Operator "*" requires vector or number arguments. If both arguments are vectors they must be matching types. Arguments are ' + left + ' and ' + right + '.');
    };

    Node.prototype._evaluateDivide = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Cartesian2) && (left instanceof Cartesian2)) {
            return Cartesian2.divideComponents(left, right, scratchStorage.getCartesian2());
        } else if ((left instanceof Cartesian2) && (typeof right === 'number')) {
            return Cartesian2.divideByScalar(left, right, scratchStorage.getCartesian2());
        } else if ((right instanceof Cartesian3) && (left instanceof Cartesian3)) {
            return Cartesian3.divideComponents(left, right, scratchStorage.getCartesian3());
        } else if ((left instanceof Cartesian3) && (typeof right === 'number')) {
            return Cartesian3.divideByScalar(left, right, scratchStorage.getCartesian3());
        } else if ((right instanceof Cartesian4) && (left instanceof Cartesian4)) {
            return Cartesian4.divideComponents(left, right, scratchStorage.getCartesian4());
        } else if ((left instanceof Cartesian4) && (typeof right === 'number')) {
            return Cartesian4.divideByScalar(left, right, scratchStorage.getCartesian4());
        } else if ((typeof left === 'number') && (typeof right === 'number')) {
            return left / right;
        }

        throw new RuntimeError('Operator "/" requires vector or number arguments of matching types, or a number as the second argument. Arguments are ' + left + ' and ' + right + '.');
    };

    Node.prototype._evaluateMod = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Cartesian2) && (left instanceof Cartesian2)) {
            return Cartesian2.fromElements(left.x % right.x, left.y % right.y, scratchStorage.getCartesian2());
        } else if ((right instanceof Cartesian3) && (left instanceof Cartesian3)) {
            return Cartesian3.fromElements(left.x % right.x, left.y % right.y, left.z % right.z, scratchStorage.getCartesian3());
        } else if ((right instanceof Cartesian4) && (left instanceof Cartesian4)) {
            return Cartesian4.fromElements(left.x % right.x, left.y % right.y, left.z % right.z, left.w % right.w, scratchStorage.getCartesian4());
        } else if ((typeof left === 'number') && (typeof right === 'number')) {
            return left % right;
        }

        throw new RuntimeError('Operator "%" requires vector or number arguments of matching types. Arguments are ' + left + ' and ' + right + '.');
    };

    Node.prototype._evaluateEqualsStrict = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Cartesian2) && (left instanceof Cartesian2) ||
            (right instanceof Cartesian3) && (left instanceof Cartesian3) ||
            (right instanceof Cartesian4) && (left instanceof Cartesian4)) {
            return left.equals(right);
        }
        return left === right;
    };

    Node.prototype._evaluateNotEqualsStrict = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);
        if ((right instanceof Cartesian2) && (left instanceof Cartesian2) ||
            (right instanceof Cartesian3) && (left instanceof Cartesian3) ||
            (right instanceof Cartesian4) && (left instanceof Cartesian4)) {
            return !left.equals(right);
        }
        return left !== right;
    };

    Node.prototype._evaluateConditional = function(feature) {
        var test = this._test.evaluate(feature);

        if (typeof test !== 'boolean') {
            throw new RuntimeError('Conditional argument of conditional expression must be a boolean. Argument is ' + test + '.');
        }

        if (test) {
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

    Node.prototype._evaluateIsExactClass = function(feature) {
        if (defined(feature)) {
            return feature.isExactClass(this._left.evaluate(feature));
        }
        return false;
    };

    Node.prototype._evaluateIsClass = function(feature) {
        if (defined(feature)) {
            return feature.isClass(this._left.evaluate(feature));
        }
        return false;
    };

    Node.prototype._evaluateGetExactClassName = function(feature) {
        if (defined(feature)) {
            return feature.getExactClassName();
        }
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
            throw new RuntimeError(e);
        }
        return exp;
    };

    Node.prototype._evaluateRegExpTest = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);

        if (!((left instanceof RegExp) && (typeof right === 'string'))) {
            throw new RuntimeError('RegExp.test requires the first argument to be a RegExp and the second argument to be a string. Arguments are ' + left + ' and ' + right + '.');
        }

        return left.test(right);
    };

    Node.prototype._evaluateRegExpMatch = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);

        if ((left instanceof RegExp) && (typeof right === 'string')) {
            return left.test(right);
        } else if ((right instanceof RegExp) && (typeof left === 'string')) {
            return right.test(left);
        }

        throw new RuntimeError('Operator "=~" requires one RegExp argument and one string argument. Arguments are ' + left + ' and ' + right + '.');
    };

    Node.prototype._evaluateRegExpNotMatch = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);

        if ((left instanceof RegExp) && (typeof right === 'string')) {
            return !(left.test(right));
        } else if ((right instanceof RegExp) && (typeof left === 'string')) {
            return !(right.test(left));
        }

        throw new RuntimeError('Operator "!~" requires one RegExp argument and one string argument. Arguments are ' + left + ' and ' + right + '.');
    };

    Node.prototype._evaluateRegExpExec = function(feature) {
        var left = this._left.evaluate(feature);
        var right = this._right.evaluate(feature);

        if (!((left instanceof RegExp) && (typeof right === 'string'))) {
            throw new RuntimeError('RegExp.exec requires the first argument to be a RegExp and the second argument to be a string. Arguments are ' + left + ' and ' + right + '.');
        }

        var exec = left.exec(right);
        if (!defined(exec)) {
            return null;
        }
        return exec[1];
    };

    Node.prototype._evaluateToString = function(feature) {
        var left = this._left.evaluate(feature);
        if ((left instanceof RegExp) || (left instanceof Cartesian2) || (left instanceof Cartesian3) || (left instanceof Cartesian4)) {
            return String(left);
        }

        throw new RuntimeError('Unexpected function call "' + this._value + '".');
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
        }

        return number.toString();
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

    function getExpressionArray(array, attributePrefix, shaderState, parent) {
        var length = array.length;
        var expressions = new Array(length);
        for (var i = 0; i < length; ++i) {
            expressions[i] = array[i].getShaderExpression(attributePrefix, shaderState, parent);
        }
        return expressions;
    }

    Node.prototype.getShaderExpression = function(attributePrefix, shaderState, parent) {
        var color;
        var left;
        var right;
        var test;

        var type = this._type;
        var value = this._value;

        if (defined(this._left)) {
            if (isArray(this._left)) {
                // Left can be an array if the type is LITERAL_COLOR or LITERAL_VECTOR
                left = getExpressionArray(this._left, attributePrefix, shaderState, this);
            } else {
                left = this._left.getShaderExpression(attributePrefix, shaderState, this);
            }
        }

        if (defined(this._right)) {
            right = this._right.getShaderExpression(attributePrefix, shaderState, this);
        }

        if (defined(this._test)) {
            test = this._test.getShaderExpression(attributePrefix, shaderState, this);
        }

        if (isArray(this._value)) {
            // For ARRAY type
            value = getExpressionArray(this._value, attributePrefix, shaderState, this);
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
                } else if (value === 'round') {
                    return 'floor(' + left + ' + 0.5)';
                } else if (defined(unaryFunctions[value])) {
                    return value + '(' + left + ')';
                } else if ((value === 'isNaN') || (value === 'isFinite') || (value === 'String') || (value === 'isExactClass') || (value === 'isClass') || (value === 'getExactClassName')) {
                    throw new RuntimeError('Error generating style shader: "' + value + '" is not supported.');
                } else if (defined(unaryFunctions[value])) {
                    return value + '(' + left + ')';
                }
                return value + left;
            case ExpressionNodeType.BINARY:
                // Supported types: ||, &&, ===, !==, <, >, <=, >=, +, -, *, /, %
                if (value === '%') {
                    return 'mod(' + left + ', ' + right + ')';
                } else if (value === '===') {
                    return '(' + left + ' == ' + right + ')';
                } else if (value === '!==') {
                    return '(' + left + ' != ' + right + ')';
                } else if (value === 'atan2') {
                    return 'atan(' + left + ', ' + right + ')';
                } else if (defined(binaryFunctions[value])) {
                    return value + '(' + left + ', ' + right + ')';
                }
                return '(' + left + ' ' + value + ' ' + right + ')';
            case ExpressionNodeType.TERNARY:
                if (defined(ternaryFunctions[value])) {
                    return value + '(' + left + ', ' + right + ', ' + test + ')';
                }
                break;
            case ExpressionNodeType.CONDITIONAL:
                return '(' + test + ' ? ' + left + ' : ' + right + ')';
            case ExpressionNodeType.MEMBER:
                // This is intended for accessing the components of vector properties. String members aren't supported.
                // Check for 0.0 rather than 0 because all numbers are previously converted to decimals.
                if (right === 'r' || right === 'x' || right === '0.0') {
                    return left + '[0]';
                } else if (right === 'g' || right === 'y' || right === '1.0') {
                    return left + '[1]';
                } else if (right === 'b' || right === 'z' || right === '2.0') {
                    return left + '[2]';
                } else if (right === 'a' || right === 'w' || right === '3.0') {
                    return left + '[3]';
                }
                return left + '[int(' + right + ')]';
            case ExpressionNodeType.FUNCTION_CALL:
                throw new RuntimeError('Error generating style shader: "' + value + '" is not supported.');
            case ExpressionNodeType.ARRAY:
                if (value.length === 4) {
                    return 'vec4(' + value[0] + ', ' + value[1] + ', ' + value[2] + ', ' + value[3] + ')';
                } else if (value.length === 3) {
                    return 'vec3(' + value[0] + ', ' + value[1] + ', ' + value[2] + ')';
                } else if (value.length === 2) {
                    return 'vec2(' + value[0] + ', ' + value[1] + ')';
                }
                throw new RuntimeError('Error generating style shader: Invalid array length. Array length should be 2, 3, or 4.');
            case ExpressionNodeType.REGEX:
                throw new RuntimeError('Error generating style shader: Regular expressions are not supported.');
            case ExpressionNodeType.VARIABLE_IN_STRING:
                throw new RuntimeError('Error generating style shader: Converting a variable to a string is not supported.');
            case ExpressionNodeType.LITERAL_NULL:
                throw new RuntimeError('Error generating style shader: null is not supported.');
            case ExpressionNodeType.LITERAL_BOOLEAN:
                return value ? 'true' : 'false';
            case ExpressionNodeType.LITERAL_NUMBER:
                return numberToString(value);
            case ExpressionNodeType.LITERAL_STRING:
                if (defined(parent) && (parent._type === ExpressionNodeType.MEMBER)) {
                    if (value === 'r' || value === 'g' || value === 'b' || value === 'a' ||
                        value === 'x' || value === 'y' || value === 'z' || value === 'w') {
                        return value;
                    }
                }
                // Check for css color strings
                color = Color.fromCssColorString(value, scratchColor);
                if (defined(color)) {
                    return colorToVec3(color);
                }
                throw new RuntimeError('Error generating style shader: String literals are not supported.');
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
                    }
                    return 'vec4(' + args[0] + ', 1.0)';
                } else if (value === 'rgb') {
                    color = convertRGBToColor(this);
                    if (defined(color)) {
                        return colorToVec4(color);
                    }
                    return 'vec4(' + args[0] + ' / 255.0, ' + args[1] + ' / 255.0, ' + args[2] + ' / 255.0, 1.0)';
                } else if (value === 'rgba') {
                    if (args[3] !== '1.0') {
                        shaderState.translucent = true;
                    }
                    color = convertRGBToColor(this);
                    if (defined(color)) {
                        return colorToVec4(color);
                    }
                    return 'vec4(' + args[0] + ' / 255.0, ' + args[1] + ' / 255.0, ' + args[2] + ' / 255.0, ' + args[3] + ')';
                } else if (value === 'hsl') {
                    color = convertHSLToRGB(this);
                    if (defined(color)) {
                        return colorToVec4(color);
                    }
                    return 'vec4(czm_HSLToRGB(vec3(' + args[0] + ', ' + args[1] + ', ' + args[2] + ')), 1.0)';
                } else if (value === 'hsla') {
                    color = convertHSLToRGB(this);
                    if (defined(color)) {
                        if (color.alpha !== 1.0) {
                            shaderState.translucent = true;
                        }
                        return colorToVec4(color);
                    }
                    if (args[3] !== '1.0') {
                        shaderState.translucent = true;
                    }
                    return 'vec4(czm_HSLToRGB(vec3(' + args[0] + ', ' + args[1] + ', ' + args[2] + ')), ' + args[3] + ')';
                }
                break;
            case ExpressionNodeType.LITERAL_VECTOR:
                //>>includeStart('debug', pragmas.debug);
                if (!defined(left)) {
                    throw new DeveloperError('left should always be defined for type ExpressionNodeType.LITERAL_VECTOR');
                }
                //>>includeEnd('debug');
                var length = left.length;
                var vectorExpression = value + '(';
                for (var i = 0; i < length; ++i) {
                    vectorExpression += left[i];
                    if (i < (length - 1)) {
                        vectorExpression += ', ';
                    }
                }
                vectorExpression += ')';
                return vectorExpression;
            case ExpressionNodeType.LITERAL_REGEX:
                throw new RuntimeError('Error generating style shader: Regular expressions are not supported.');
            case ExpressionNodeType.LITERAL_UNDEFINED:
                throw new RuntimeError('Error generating style shader: undefined is not supported.');
            case ExpressionNodeType.BUILTIN_VARIABLE:
                if (value === 'tiles3d_tileset_time') {
                    return 'u_time';
                }
        }
    };

    return Expression;
});
