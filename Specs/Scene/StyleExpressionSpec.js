/*global defineSuite*/
defineSuite([
        'Scene/StyleExpression'
    ], function(
        StyleExpression) {
    'use strict';

    var frameState = {};

    function MockFeature() {
    }

    MockFeature.prototype.getProperty = function(name) {
        return undefined;
    };

    it('throws', function() {
        var expression = new StyleExpression();
        var feature = new MockFeature();

        expect(function() {
            return expression.evaluate(frameState, feature);
        }).toThrowDeveloperError();

        expect(function() {
            return expression.evaluateColor(frameState, feature);
        }).toThrowDeveloperError();
    });
});
