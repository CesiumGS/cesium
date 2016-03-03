/*global defineSuite*/
defineSuite([
        'Scene/ConditionalExpression',
        'Scene/Expression',
        'Core/Color'
    ], function(
        ConditionalExpression,
        Expression,
        Color) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

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

    it('constructs', function() {
        var expression = new ConditionalExpression(new MockStyleEngine(), jsonExp);
        expect(expression._conditional).toEqual({
            '${Height} > 100' : 'color("blue")',
            '${Height} > 50' : 'color("red")',
            'true' : 'color("green")'
        });
    });

    it('constructs with expression', function() {
        var expression = new ConditionalExpression(new MockStyleEngine(), jsonExpWithExpression);
        expect(expression._expression).toEqual('${Height}/2');
        expect(expression._conditional).toEqual({
            '${expression} > 50' : 'color("blue")',
            '${expression} > 25' : 'color("red")',
            'true' : 'color("green")'
        });
    });

    it('evaluates conditional', function() {
        var expression = new ConditionalExpression(new MockStyleEngine(), jsonExp);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.RED);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.GREEN);
    });

    it('evaluates conditional with expression', function() {
        var expression = new ConditionalExpression(new MockStyleEngine(), jsonExpWithExpression);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.RED);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.GREEN);
    });

    it('constructs and evaluates empty conditional', function() {
        var expression = new ConditionalExpression(new MockStyleEngine(), {
            conditions: {}
        });
        expect(expression._conditional).toEqual({});
        expect(expression.evaluate(new MockFeature('101'))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(undefined);
    });
});
