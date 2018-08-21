defineSuite([
        'Scene/StyleExpression'
    ], function(
        StyleExpression) {
    'use strict';

    function MockFeature() {
    }

    MockFeature.prototype.getProperty = function(name) {
        return undefined;
    };

    it('throws', function() {
        var expression = new StyleExpression();
        var feature = new MockFeature();

        expect(function() {
            return expression.evaluate(feature);
        }).toThrowDeveloperError();

        expect(function() {
            return expression.evaluateColor(feature);
        }).toThrowDeveloperError();
    });
});
