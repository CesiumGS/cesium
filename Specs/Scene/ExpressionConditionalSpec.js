/*global defineSuite*/
defineSuite([
        'Scene/ExpressionConditional',
        'Scene/Expression',
        'Core/Color'
    ], function(
        ExpressionConditional,
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
        conditional : {
            '${Height} > 100' : 'color("blue")',
            '${Height} > 50' : 'color("red")',
            'true' : 'color("green")'
        }
    };

    it('constructs', function() {
        var expression = new ExpressionConditional(new MockStyleEngine(), jsonExp);
        expect(expression._conditional).toEqual({
            '${Height} > 100' : 'color("blue")',
            '${Height} > 50' : 'color("red")',
            'true' : 'color("green")'
        });
    });

    it('evaluates conditional', function() {
        var expression = new ExpressionConditional(new MockStyleEngine(), jsonExp);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.RED);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.GREEN);
    });

    it('constructs and evaluates empty conditional', function() {
        var expression = new ExpressionConditional(new MockStyleEngine(), {
            conditional: {}
        });
        expect(expression._conditional).toEqual({});
        expect(expression.evaluate(new MockFeature('101'))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(undefined);
    });
});
