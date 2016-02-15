/*global defineSuite*/
defineSuite([
        'Scene/ColorMapExpression',
        'Core/Color'
    ], function(
        ColorMapExpression,
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
        'propertyName' : 'id',
        'map' : {
            '1' : 'blue',
            '2' : 'red'
        },
        'default' : 'green'
    };

    it('constructs', function() {
        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expect(expression.propertyName).toEqual('id');
        expect(expression.default).toEqual(Color.GREEN);
    });

    it('sets propertyName', function() {
        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expression.propertyName = 'height';
        expect(expression.propertyName).toEqual('height');
    });

    it('sets map', function() {
        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expression.map = {
            '3' : Color.PURPLE,
            '4' : Color.ORANGE
        };
        expect(expression.map).toEqual({
            '3' : Color.PURPLE,
            '4' : Color.ORANGE
        });
    });

    it('sets default', function() {
        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expression.default = Color.PURPLE;
        expect(expression.default).toEqual(Color.PURPLE);
    });

    it('evaluates map', function() {
        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expect(expression.evaluate(new MockFeature('1'))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature('2'))).toEqual(Color.RED);
    });

    it('evaluates default', function() {
        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.GREEN);
    });

    it('set propertyName marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expression.propertyName = 'height';

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('set map marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expression.map = {
            '3' : Color.PURPLE,
            '4' : Color.ORANGE
        };

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('set default marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expression.default = Color.ORANGE;

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('set propertyName does not mark style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expression.propertyName = 'id';

        expect(MockStyleEngine.prototype.makeDirty).not.toHaveBeenCalled();
    });

    it('set default does not mark style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorMapExpression(new MockStyleEngine(), jsonExp);
        expression.default = Color.GREEN;

        expect(MockStyleEngine.prototype.makeDirty).not.toHaveBeenCalled();
    });
});
