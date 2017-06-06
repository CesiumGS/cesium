/*global defineSuite*/
defineSuite([
        'Scene/ConditionsExpression',
        'Core/Color'
    ], function(
        ConditionsExpression,
        Color) {
    'use strict';

    var frameState = {};

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

    var additionalExpressions = {
        halfHeight: '${Height}/2',
        quarterHeight: '${Height}/4'
    };

    var jsonExpWithAdditionalExpressions = {
        conditions : [
            ['${halfHeight} > 50 && ${halfHeight} < 100', 'color("blue")'],
            ['${quarterHeight} > 50 && ${quarterHeight} < 52', 'color("red")'],
            ['true', 'color("lime")']
        ]
    };

    it('constructs', function() {
        var expression = new ConditionsExpression(jsonExp);
        expect(expression.conditionsExpression).toEqual(jsonExp);
    });

    it('evaluates conditional', function() {
        var expression = new ConditionsExpression(jsonExp);
        expect(expression.evaluateColor(frameState, new MockFeature(101))).toEqual(Color.BLUE);
        expect(expression.evaluateColor(frameState, new MockFeature(52))).toEqual(Color.RED);
        expect(expression.evaluateColor(frameState, new MockFeature(3))).toEqual(Color.LIME);
    });

    it('evaluates conditional with additional expressions', function() {
        var expression = new ConditionsExpression(jsonExpWithAdditionalExpressions, additionalExpressions);
        expect(expression.evaluateColor(frameState, new MockFeature(101))).toEqual(Color.BLUE);
        expect(expression.evaluateColor(frameState, new MockFeature(52))).toEqual(Color.LIME);
        expect(expression.evaluateColor(frameState, new MockFeature(3))).toEqual(Color.LIME);
    });

    it('constructs and evaluates empty conditional', function() {
        var expression = new ConditionsExpression({
            "conditions" : []
        });
        expect(expression._conditions).toEqual([]);
        expect(expression.evaluate(frameState, new MockFeature(101))).toEqual(undefined);
        expect(expression.evaluate(frameState, new MockFeature(52))).toEqual(undefined);
        expect(expression.evaluate(frameState, new MockFeature(3))).toEqual(undefined);
    });

    it('constructs and evaluates empty', function() {
        var expression = new ConditionsExpression([]);
        expect(expression._conditions).toEqual(undefined);
        expect(expression.evaluate(frameState, new MockFeature(101))).toEqual(undefined);
        expect(expression.evaluate(frameState, new MockFeature(52))).toEqual(undefined);
        expect(expression.evaluate(frameState, new MockFeature(3))).toEqual(undefined);
    });

    it('gets shader function', function() {
        var expression = new ConditionsExpression(jsonExp);
        var shaderFunction = expression.getShaderFunction('getColor', '', {}, 'vec4');
        var expected = 'vec4 getColor() \n' +
                       '{ \n' +
                       '    if ((Height > 100.0)) \n' +
                       '    { \n' +
                       '        return vec4(vec3(0.0, 0.0, 1.0), 1.0); \n' +
                       '    } \n' +
                       '    else if ((Height > 50.0)) \n' +
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
