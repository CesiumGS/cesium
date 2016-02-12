/*global defineSuite*/
defineSuite([
        'Scene/LiteralBooleanExpression'
    ], function(
        LiteralBooleanExpression) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    it('constructs', function() {
        var expression = new LiteralBooleanExpression(new MockStyleEngine(), true);
        expect(expression.literal).toEqual(true);
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new LiteralBooleanExpression(new MockStyleEngine(), false);
        expect(expression.literal).toEqual(false);
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('sets literal', function() {
        var expression = new LiteralBooleanExpression(new MockStyleEngine(), true);
        expression.literal = false;
        expect(expression.literal).toEqual(false);
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new LiteralBooleanExpression(new MockStyleEngine(), true);
        expression.literal = false;

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('does not marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new LiteralBooleanExpression(new MockStyleEngine(), true);
        expression.literal = true;

        expect(MockStyleEngine.prototype.makeDirty).not.toHaveBeenCalled();
    });
});
