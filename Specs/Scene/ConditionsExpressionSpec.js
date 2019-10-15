import { Cartesian4 } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { ConditionsExpression } from '../../Source/Cesium.js';

describe('Scene/ConditionsExpression', function() {

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

    var defines = {
        halfHeight: '${Height}/2',
        quarterHeight: '${Height}/4'
    };

    var jsonExpWithDefines = {
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
        expect(expression.evaluateColor(new MockFeature(101))).toEqual(Color.BLUE);
        expect(expression.evaluateColor(new MockFeature(52))).toEqual(Color.RED);
        expect(expression.evaluateColor(new MockFeature(3))).toEqual(Color.LIME);
    });

    it('evaluates conditional with defines', function() {
        var expression = new ConditionsExpression(jsonExpWithDefines, defines);
        expect(expression.evaluateColor(new MockFeature(101))).toEqual(Color.BLUE);
        expect(expression.evaluateColor(new MockFeature(52))).toEqual(Color.LIME);
        expect(expression.evaluateColor(new MockFeature(3))).toEqual(Color.LIME);
    });

    it('evaluate takes result argument', function() {
        var result = new Cartesian4();
        var expression = new ConditionsExpression(jsonExpWithDefines, defines, result);
        var value = expression.evaluate(new MockFeature(101), result);
        expect(value).toEqual(new Cartesian4(0.0, 0.0, 1.0, 1.0));
        expect(value).toBe(result);
    });

    it('evaluate takes a color result argument', function() {
        var result = new Color();
        var expression = new ConditionsExpression(jsonExpWithDefines, defines, result);
        var value = expression.evaluate(new MockFeature(101), result);
        expect(value).toEqual(Color.BLUE);
        expect(value).toBe(result);
    });

    it('constructs and evaluates empty conditional', function() {
        var expression = new ConditionsExpression({
            'conditions' : []
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
