/*global defineSuite*/
defineSuite([
        'Scene/BooleanRegularExpression'
    ], function(
        BooleanRegularExpression) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    function Feature() {
    }
    Feature.prototype.getProperty = function() {
        return 'hello';
    };

    var jsonExp = {
        'pattern' : '^h',
        'propertyName' : 'property'
    };

    it('constructs', function() {
        var expression = new BooleanRegularExpression(new MockStyleEngine(), jsonExp);
        expect(expression.pattern).toEqual('^h');
        expect(expression.propertyName).toEqual('property');
    });

    it('sets propertyName', function() {
        var expression = new BooleanRegularExpression(new MockStyleEngine(), jsonExp);
        expression.propertyName = 'newProperty';
        expect(expression.propertyName).toEqual('newProperty');
    });

    it('sets pattern', function() {
        var expression = new BooleanRegularExpression(new MockStyleEngine(), jsonExp);
        expression.pattern = 'x+';
        expect(expression.pattern).toEqual('x+');
    });

    it('evaluates', function() {
        var feature = new Feature();
        var expression = new BooleanRegularExpression(new MockStyleEngine(), jsonExp);
        expect(expression.evaluate(feature)).toEqual(true);

        expression.pattern = 'x+';
        expect(expression.evaluate(feature)).toEqual(false);
    });

    it('set propertyName marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new BooleanRegularExpression(new MockStyleEngine(), jsonExp);
        expression.propertyName = 'newProperty';

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('set pattern marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new BooleanRegularExpression(new MockStyleEngine(), jsonExp);
        expression.pattern = 'x+';

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('set propertyName does not mark style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new BooleanRegularExpression(new MockStyleEngine(), jsonExp);
        expression.propertyName = 'property';

        expect(MockStyleEngine.prototype.makeDirty).not.toHaveBeenCalled();
    });

    it('set pattern does not mark style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new BooleanRegularExpression(new MockStyleEngine(), jsonExp);
        expression.pattern = '^h';

        expect(MockStyleEngine.prototype.makeDirty).not.toHaveBeenCalled();
    });
});
