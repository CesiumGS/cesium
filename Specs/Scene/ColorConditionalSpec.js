/*global defineSuite*/
defineSuite([
        'Scene/ColorConditional',
        'Scene/Expression',
        'Core/Color'
    ], function(
        ColorConditional,
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
            '${Height} > 50' : 'color("red")'
        },
        default : 'color("green")'
    };

    it('constructs', function() {
        var expression = new ColorConditional(new MockStyleEngine(), jsonExp);
        expect(expression.conditional).toEqual({
            '${Height} > 100' : 'color("blue")',
            '${Height} > 50' : 'color("red")'
        });
        expect(expression.default).toEqual('color("green")');
    });

    it('evaluates conditional', function() {
        var expression = new ColorConditional(new MockStyleEngine(), jsonExp);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.RED);
    });

    it('evaluates default', function() {
        var expression = new ColorConditional(new MockStyleEngine(), jsonExp);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.GREEN);
    });


    it('sets conditional', function() {
        var expression = new ColorConditional(new MockStyleEngine(), jsonExp);
        var newConditional = {
            '${Height} > 70' : 'color("purple")',
            '${Height} > 30' : 'color("orange")'
        };
        expression.conditional = newConditional;
        expect(expression.conditional).toEqual(newConditional);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.PURPLE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.ORANGE);
    });

    it('sets default', function() {
        var expression = new ColorConditional(new MockStyleEngine(), jsonExp);
        expression.default = 'color("purple")';
        expect(expression.default).toEqual('color("purple")');
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.PURPLE);
    });

    it('constructs and evaluates without default', function() {
        var expression = new ColorConditional(new MockStyleEngine(), {
            conditional : {
                '${Height} > 100' : 'color("blue")',
                '${Height} > 50' : 'color("red")'
            }
        });
        expect(expression.conditional).toEqual({
            '${Height} > 100' : 'color("blue")',
            '${Height} > 50' : 'color("red")'
        });
        expect(expression.default).toEqual(undefined);
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.BLUE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.RED);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.WHITE);
    });

    it('constructs and evaluates without conditional', function() {
        var expression = new ColorConditional(new MockStyleEngine(), {
            default : 'color("orange")'
        });
        expect(expression.conditional).toEqual(undefined);
        expect(expression.default).toEqual('color("orange")');
        expect(expression.evaluate(new MockFeature('101'))).toEqual(Color.ORANGE);
        expect(expression.evaluate(new MockFeature('52'))).toEqual(Color.ORANGE);
        expect(expression.evaluate(new MockFeature('3'))).toEqual(Color.ORANGE);
    });

    it('set conditional marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorConditional(new MockStyleEngine(), jsonExp);
        var newConditional = {
            '${Height} > 70' : 'color("purple")',
            '${Height} > 30' : 'color("orange")'
        };
        expression.conditional = newConditional;

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('set default marks style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorConditional(new MockStyleEngine(), jsonExp);
        expression.default = 'color("purple")';

        expect(MockStyleEngine.prototype.makeDirty).toHaveBeenCalled();
    });

    it('set default does not mark style engine dirty', function() {
        spyOn(MockStyleEngine.prototype, 'makeDirty');

        var expression = new ColorConditional(new MockStyleEngine(), jsonExp);
        expression.default = 'color("green")';

        expect(MockStyleEngine.prototype.makeDirty).not.toHaveBeenCalled();
    });
});
