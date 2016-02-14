/*global defineSuite*/
defineSuite([
        'Scene/Expression'
    ], function(
        Expression) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    it('evalutes', function() {
        var expression = new Expression(new MockStyleEngine(), 'true');
        expect(expression.evaluate(undefined)).toEqual(true);
    });
});
