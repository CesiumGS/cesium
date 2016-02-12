/*global defineSuite*/
defineSuite([
        'Scene/LiteralColorExpression',
        'Core/Color'
    ], function(
        LiteralColorExpression,
        Color) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    it('constructs with hex', function() {
        var expression = new LiteralColorExpression(new MockStyleEngine(), '#ffffff');
        expect(expression.color).toEqual(Color.WHITE);
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);
    });

    it('constructs with color string', function() {
        var expression = new LiteralColorExpression(new MockStyleEngine(), 'white');
        expect(expression.color).toEqual(Color.WHITE);
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);
    });

    it('constructs with rgb', function() {
        var expression = new LiteralColorExpression(new MockStyleEngine(), 'rgb(255, 255, 255)');
        expect(expression.color).toEqual(Color.WHITE);
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);
    });

    it('constructs with hsl', function() {
        var expression = new LiteralColorExpression(new MockStyleEngine(), 'hsl(0, 0%, 100%)');
        expect(expression.color).toEqual(Color.WHITE);
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);
    });

    it('throws with invalid css string', function() {
        expect(function() {
           return new LiteralColorExpression(new MockStyleEngine(), 'not a color');
        }).toThrowDeveloperError();
    });

    it('sets color', function() {
        var expression = new LiteralColorExpression(new MockStyleEngine(), '#ffffff');
        expression.color = Color.BLACK;
        expect(expression.color).toEqual(Color.BLACK);
        expect(expression.evaluate(undefined)).toEqual(Color.BLACK);
    });

    it('marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new LiteralColorExpression(new MockStyleEngine(), '#ffffff');
        expression.color = Color.BLACK;

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('does not marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new LiteralColorExpression(new MockStyleEngine(), '#ffffff');
        expression.color = Color.WHITE;

        expect(MockStyleEngine.prototype.makeDirty).not.toHaveBeenCalled();
    });
});