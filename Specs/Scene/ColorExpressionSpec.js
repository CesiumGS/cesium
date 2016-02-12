/*global defineSuite*/
defineSuite([
        'Scene/ColorExpression',
        'Core/Color'
    ], function(
        ColorExpression,
        Color) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    function MockFeature() {
    }

    MockFeature.prototype.getProperty = function() {
        return '#ffffff';
    };

    it('constructs', function() {
        var expression = new ColorExpression(new MockStyleEngine(), 'colorProperty');
        expect(expression.propertyName).toEqual('colorProperty');
    });

    it('sets property', function() {
        var expression = new ColorExpression(new MockStyleEngine(), 'colorProperty');
        expression.propertyName = 'newColorProperty';
        expect(expression.propertyName).toEqual('newColorProperty');
    });

    it('evaluates', function() {
        var feature = new MockFeature();
        var expression = new ColorExpression(new MockStyleEngine(), 'colorProperty');
        expect(expression.evaluate(feature)).toEqual(Color.WHITE);
    });

    it('marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorExpression(new MockStyleEngine(), 'colorProperty');
        expression.propertyName = 'newColorProperty';

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('does not marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorExpression(new MockStyleEngine(), 'colorProperty');
        expression.propertyName = 'colorProperty';

        expect(MockStyleEngine.prototype.makeDirty).not.toHaveBeenCalled();
    });
});