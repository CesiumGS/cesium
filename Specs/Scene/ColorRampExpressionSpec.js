/*global defineSuite*/
defineSuite([
        'Scene/ColorRampExpression',
        'Core/Color',
        'Scene/NumberExpression'
    ], function(
        ColorRampExpression,
        Color,
        NumberExpression) {
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
        'expression' : {
            'leftOperand' : '${Height}',
            'operator' : '+',
            'rightOperand' : 0
        },
        'colors' : [
            'red',
            'blue'
        ],
        'intervals': [
            5,
            10
        ]
    };

    it('constructs', function() {
        var mockStyleEngine = new MockStyleEngine();
        var expression = new ColorRampExpression(mockStyleEngine, jsonExp);
        expect(expression.expression).toEqual(new NumberExpression(mockStyleEngine, jsonExp.expression));
        expect(expression.colors).toEqual([Color.RED, Color.BLUE]);
        expect(expression.intervals).toEqual([5,10]);
    });

    it('sets colors', function() {
        var expression = new ColorRampExpression(new MockStyleEngine(), jsonExp);
        expression.colors = [Color.PURPLE, Color.ORANGE, Color.GREEN];
        expect(expression.colors).toEqual([Color.PURPLE, Color.ORANGE, Color.GREEN]);
    });

    it('sets intervals', function() {
        var expression = new ColorRampExpression(new MockStyleEngine(), jsonExp);
        expression.intervals = [1, 2, 3];
        expect(expression.intervals).toEqual([1, 2, 3]);
    });

    it('evaluates', function() {
        var expression = new ColorRampExpression(new MockStyleEngine(), jsonExp);
        var feature = new MockFeature(5);
        expect(expression.evaluate(feature)).toEqual(Color.RED);
        feature = new MockFeature(7);
        expect(expression.evaluate(feature)).toEqual(Color.RED);
        feature = new MockFeature(10);
        expect(expression.evaluate(feature)).toEqual(Color.BLUE);
    });

    it('set color marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorRampExpression(new MockStyleEngine(), jsonExp);
        expression.colors = ['purple', 'orange', 'green'];

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('set interval marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorRampExpression(new MockStyleEngine(), jsonExp);
        expression.intervals = [1, 2, 3];

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });
});
