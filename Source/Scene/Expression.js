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

        this._ast = jsep(expression);
        this._runtimeAST = undefined;

        console.log(this._ast);
        this._runtimeAST = createRuntimeAst(this._ast);
        console.log(this._runtimeAST);
    }

    function createRuntimeAst(ast) {
        var node = ast;

        // evaluate this node if we can
        if (ast.type === 'Literal') {
            if (typeof(ast.value) === 'string') {
                var c = Color.fromCssColorString(ast.value);
                if (defined(c)) {
                    node.value = c;
                }
            }
        } else if(ast.type === 'UnaryExpression') {
            var operand = createRuntimeAst(ast.argument);
            if (operand.type === 'Literal') {
                node = defineLiteralNode(evaluateUnary(ast.operator, operand.value));
            }
        } else if (ast.type === 'BinaryExpression') {
            var left = createRuntimeAst(ast.left);
            var right = createRuntimeAst(ast.right);
            if (left.type === 'Literal' && right.type === 'Literal') {
                node = defineLiteralNode(evaluateBinary(left.value, ast.operator, right.value));
            }
        } else if (ast.type === 'LogicalExpression') {
            var l = createRuntimeAst(ast.left);
            var r = createRuntimeAst(ast.right);
            if (l.type === 'Literal' && r.type === 'Literal') {
                node = defineLiteralNode(evaluateLogical(l.value, ast.operator, r.value));
            }
        } else if (ast.type === 'ConditionalExpression') {
            var test = createRuntimeAst(ast.test);
            if (test.type === 'Literal') {
                node = createRuntimeAst(evaluateConditional(test.value, ast.consequent, ast.alternate));
            }

        }

        return node;
    }

    defineProperties(Expression.prototype, {
    });

    function defineLiteralNode(value) {
        return {
            'type' : 'Literal',
            'value' : value,
            'raw' : value
        };
    }

    function evaluateUnary(operator, operand) {
        if (operator === '!') {
            if (typeof(operand) === 'boolean') {
                return !operand;
            }
        } else if (operator === '-') {
            if (typeof(operand) === 'number') {
                return -operand;
            }
        }

        return undefined;
    }

    function evaluateBinary(left, operator, right) {
        if (operator === '===') {
            if (left instanceof Color && right instanceof Color) {
                return Color.equals(left, right);
            }
            return left === right;
        } else if (operator === '!==') {
            if (left instanceof Color && right instanceof Color) {
                return !Color.equals(left, right);
            }
            return left !== right;
        } else if (operator === '+') {
            if ((typeof left === 'number' && typeof right === 'number') ||
                (typeof left === 'string' && typeof right === 'string')) {
                return left + right;
            }
        }

        return undefined;
    }

    function evaluateLogical(left, operator, right) {
        if (typeof(left) === 'boolean' && typeof(right) === 'boolean') {
            if (operator === '||') {
                return (left || right);
            }
        }
        return undefined;
    }

    function evaluateConditional(test, consequent, alt) {
        if (typeof(test) === 'boolean') {
            if (test) {
                return consequent;
            } else {
                return alt;
            }
        }
        return undefined;
    }


    Expression.prototype.evaluate = function(feature) {
        var type = this._runtimeAST.type;

        if (type === 'Literal') {
            return this._runtimeAST.value;
        }

        return undefined;
    };

    return Expression;
});
