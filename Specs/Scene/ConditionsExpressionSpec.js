/*global defineSuite*/
defineSuite([
        'Scene/ConditionsExpression',
        'Scene/Expression',
        'Core/Color'
    ], function(
        ConditionsExpression,
        Expression,
        Color) {
    'use strict';

    function MockFeature(value) {
        this._value = value;
    }

    MockFeature.prototype.getProperty = function() {
        return this._value;
    };

    var jsonExp = {
        conditions : [
            ['${Height} > 100', 'color("blue")'],
            ['${Height} > 50', 'color("red")'],
            ['true', 'color("lime")']
        ]
    };

    var jsonExpWithExpression = {
        expression : '${Height}/2',
        conditions : [
            ['${expression} > 50', 'color("blue")'],
            ['${expression} > 25', 'color("red")'],
            ['true', 'color("lime")']
        ]
    };

    var jsonExpWithMultipleExpression = {
        expression : '${Height}/2',
        conditions : [
            ['${expression} > 50 && ${expression} < 100', 'color("blue")'],
            ['${expression} > 25 && ${expression} < 26', 'color("red")'],
            ['true', 'color("lime")']
        ]
    };


    var jsonExpWithUndefinedExpression = {
        conditions : [
            ['${expression} === undefined', 'color("blue")'],
            ['true', 'color("lime")']
        ]
    };


    it('constructs', function() {
        var expression = new ConditionsExpression(jsonExp);
        expect(expression.conditionsExpression).toEqual(jsonExp);
    });

    it('constructs with expression', function() {
        var expression = new ConditionsExpression(jsonExpWithExpression);
        expect(expression._expression).toEqual('${Height}/2');
        expect(expression._conditions).toEqual([
            ['${expression} > 50', 'color("blue")'],
            ['${expression} > 25', 'color("red")'],
            ['true', 'color("lime")']
        ]);
    });

    it('evaluates undefined expression', function() {
        var expression = new ConditionsExpression(jsonExpWithExpression);
        expect(expression._expression).toEqual('${Height}/2');
        expect(expression._conditions).toEqual([
            ['${expression} > 50', 'color("blue")'],
            ['${expression} > 25', 'color("red")'],
            ['true', 'color("lime")']
        ]);
    });

    it('evaluates conditional', function() {
        var expression = new ConditionsExpression(jsonExp);
        expect(expression.evaluate(new MockFeature(101))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature(52))).toEqual(Color.RED);
        expect(expression.evaluate(new MockFeature(3))).toEqual(Color.LIME);
    });

    it('evaluates conditional with multiple expressions', function() {
        var expression = new ConditionsExpression(jsonExpWithMultipleExpression);
        expect(expression.evaluate(new MockFeature(101))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature(52))).toEqual(Color.LIME);
        expect(expression.evaluate(new MockFeature(3))).toEqual(Color.LIME);
    });

    it('constructs and evaluates empty conditional', function() {
        var expression = new ConditionsExpression({
            "conditions" : []
        });
        expect(expression._conditions).toEqual([]);
        expect(expression.evaluate(new MockFeature(101))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature(52))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature(3))).toEqual(undefined);
    });

    it('constructs and evaluates empty', function() {
        var expression = new ConditionsExpression([]);
        expect(expression._conditions).toEqual(undefined);
        expect(expression.evaluate(new MockFeature(101))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature(52))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature(3))).toEqual(undefined);
    });

    it('evaluates conditional with expression', function() {
        var expression = new ConditionsExpression(jsonExpWithExpression);
        expect(expression.evaluate(new MockFeature(101))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature(52))).toEqual(Color.RED);
        expect(expression.evaluate(new MockFeature(3))).toEqual(Color.LIME);
    });

    it('evaluates undefined conditional expression', function() {
        var expression = new ConditionsExpression(jsonExpWithUndefinedExpression);
        expect(expression._expression).toEqual(undefined);
        expect(expression.evaluate(undefined)).toEqual(Color.BLUE);
    });

    it('gets shader function', function() {
        var expression = new ConditionsExpression(jsonExpWithExpression);
        var shaderFunction = expression.getShaderFunction('getColor', '', {}, 'vec4');
        var expected = 'vec4 getColor() \n' +
                       '{ \n' +
                       '    if (((Height / 2.0) > 50.0)) \n' +
                       '    { \n' +
                       '        return vec4(vec3(0.0, 0.0, 1.0), 1.0); \n' +
                       '    } \n' +
                       '    else if (((Height / 2.0) > 25.0)) \n' +
                       '    { \n' +
                       '        return vec4(vec3(1.0, 0.0, 0.0), 1.0); \n' +
                       '    } \n' +
                       '    else if (true) \n' +
                       '    { \n' +
                       '        return vec4(vec3(0.0, 1.0, 0.0), 1.0); \n' +
                       '    } \n' +
                       '    return vec4(1.0); \n' +
                       '} \n';
        expect(shaderFunction).toEqual(expected);
    });

    it('return undefined shader function when there are no conditions', function() {
        var expression = new ConditionsExpression([]);
        var shaderFunction = expression.getShaderFunction('getColor', '', {}, 'vec4');
        expect(shaderFunction).toBeUndefined();
    });
});
