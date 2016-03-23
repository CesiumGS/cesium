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
        conditions : {
            '${Height} > 100' : 'color("blue")',
            '${Height} > 50' : 'color("red")',
            'true' : 'color("green")'
        }
    };

    var jsonExpWithExpression = {
        expression : '${Height}/2',
        conditions : {
            '${expression} > 50' : 'color("blue")',
            '${expression} > 25' : 'color("red")',
            'true' : 'color("green")'
        }
    };

    var jsonExpWithMultipleExpression = {
        expression : '${Height}/2',
        conditions : {
            '${expression} > 50 && ${expression} < 100' : 'color("blue")',
            '${expression} > 25 && ${expression} < 26' : 'color("red")',
            'true' : 'color("green")'
        }
    };


    var jsonExpWithUndefinedExpression = {
        conditions : {
            '${expression} === undefined' : 'color("blue")',
            'true' : 'color("green")'
        }
    };


    it('constructs', function() {
        var expression = new ConditionsExpression(jsonExp);
        expect(expression._conditions).toEqual({
            '${Height} > 100' : 'color("blue")',
            '${Height} > 50' : 'color("red")',
            'true' : 'color("green")'
        });
    });

    it('constructs with expression', function() {
        var expression = new ConditionsExpression(jsonExpWithExpression);
        expect(expression._expression).toEqual('${Height}/2');
        expect(expression._conditions).toEqual({
            '${expression} > 50' : 'color("blue")',
            '${expression} > 25' : 'color("red")',
            'true' : 'color("green")'
        });
    });

    it('evaluates undefined expression', function() {
        var expression = new ConditionsExpression(jsonExpWithExpression);
        expect(expression._expression).toEqual('${Height}/2');
        expect(expression._conditions).toEqual({
            '${expression} > 50' : 'color("blue")',
            '${expression} > 25' : 'color("red")',
            'true' : 'color("green")'
        });
    });

    it('evaluates conditional', function() {
        var expression = new ConditionsExpression(jsonExp);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.RED);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.GREEN);
    });

    it('evaluates conditional with multiple expressions', function() {
        var expression = new ConditionsExpression(jsonExpWithMultipleExpression);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.GREEN);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.GREEN);
    });

    it('constructs and evaluates empty conditional', function() {
        var expression = new ConditionsExpression({
            "conditions" : {}
        });
        expect(expression._conditions).toEqual({});
        expect(expression.evaluate(new MockFeature('101'))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(undefined);
    });

    it('constructs and evaluates empty', function() {
        var expression = new ConditionsExpression({});
        expect(expression._conditions).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(undefined);
    });

    it('evaluates conditional with expression', function() {
        var expression = new ConditionsExpression(jsonExpWithExpression);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.RED);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.GREEN);
    });

    it('evaluates undefined conditional expression', function() {
        var expression = new ConditionsExpression(jsonExpWithUndefinedExpression);
        expect(expression._expression).toEqual(undefined);
        expect(expression.evaluate(undefined)).toEqual(Color.BLUE);
    });
});
