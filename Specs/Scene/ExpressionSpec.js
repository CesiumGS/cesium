/*global defineSuite*/
defineSuite([
        'Scene/Expression',
        'Core/Color'
    ], function(
        Expression,
        Color) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    it('evaluates literal null', function() {
        var expression = new Expression(new MockStyleEngine(), 'null');
        expect(expression.evaluate(undefined)).toEqual(null);
    });

    it('evaluates literal boolean', function() {
        var expression = new Expression(new MockStyleEngine(), 'true');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'false');
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('evaluates literal number', function() {
        var expression = new Expression(new MockStyleEngine(), '1');
        expect(expression.evaluate(undefined)).toEqual(1);

        expression = new Expression(new MockStyleEngine(), '0');
        expect(expression.evaluate(undefined)).toEqual(0);
    });

    it('evaluates literal string', function() {
        var expression = new Expression(new MockStyleEngine(), '\'hello\'');
        expect(expression.evaluate(undefined)).toEqual('hello');
    });

    it('evaluates literal color', function() {
        var expression = new Expression(new MockStyleEngine(), 'color(\'#ffffff\')');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'color(\'white\')');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'rgb(255, 255, 255)');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'hsl(0, 0, 1)');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 255)');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'hsla(0, 0, 1.0, 1.0)');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);
    });

    it('evaluates unary not', function() {
        var expression = new Expression(new MockStyleEngine(), '!true');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '!!true');
        expect(expression.evaluate(undefined)).toEqual(true);
    });

    it('evaluates unary negative', function() {
        var expression = new Expression(new MockStyleEngine(), '-5');
        expect(expression.evaluate(undefined)).toEqual(-5);

        expression = new Expression(new MockStyleEngine(), '-(-5)');
        expect(expression.evaluate(undefined)).toEqual(5);
    });

    it('evaluates binary addition', function() {
        var expression = new Expression(new MockStyleEngine(), '1 + 2');
        expect(expression.evaluate(undefined)).toEqual(3);

        expression = new Expression(new MockStyleEngine(), '1 + 2 + 3 + 4');
        expect(expression.evaluate(undefined)).toEqual(10);
    });

    it('evaluates binary subtraction', function() {
        var expression = new Expression(new MockStyleEngine(), '2 - 1');
        expect(expression.evaluate(undefined)).toEqual(1);

        expression = new Expression(new MockStyleEngine(), '4 - 3 - 2 - 1');
        expect(expression.evaluate(undefined)).toEqual(-2);
    });

    it('evaluates binary multiplication', function() {
        var expression = new Expression(new MockStyleEngine(), '1 * 2');
        expect(expression.evaluate(undefined)).toEqual(2);

        expression = new Expression(new MockStyleEngine(), '1 * 2 * 3 * 4');
        expect(expression.evaluate(undefined)).toEqual(24);
    });

    it('evaluates binary division', function() {
        var expression = new Expression(new MockStyleEngine(), '2 / 1');
        expect(expression.evaluate(undefined)).toEqual(2);

        expression = new Expression(new MockStyleEngine(), '1/2');
        expect(expression.evaluate(undefined)).toEqual(0.5);

        expression = new Expression(new MockStyleEngine(), '24 / -4 / 2');
        expect(expression.evaluate(undefined)).toEqual(-3);
    });

    it('evaluates binary modulus', function() {
        var expression = new Expression(new MockStyleEngine(), '2 % 1');
        expect(expression.evaluate(undefined)).toEqual(0);

        expression = new Expression(new MockStyleEngine(), '6 % 4 % 3');
        expect(expression.evaluate(undefined)).toEqual(2);
    });

    it('evaluates binary equals', function() {
        var expression = new Expression(new MockStyleEngine(), '\'hello\' === \'hello\'');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '1 === 2');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'false === true === false');
        expect(expression.evaluate(undefined)).toEqual(true);
    });

    it('evaluates binary not equals', function() {
        var expression = new Expression(new MockStyleEngine(), '\'hello\' !== \'hello\'');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '1 !== 2');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'false !== true !== false');
        expect(expression.evaluate(undefined)).toEqual(true);
    });

    it('evaluates color operations', function() {
        var expression = new Expression(new MockStyleEngine(), 'rgba(255, 0, 0, 200) + rgba(0, 0, 255, 55)');
        expect(expression.evaluate(undefined)).toEqual(Color.MAGENTA);

        expression = new Expression(new MockStyleEngine(), 'rgba(0, 255, 255, 255) - rgba(0, 255, 0, 0)');
        expect(expression.evaluate(undefined)).toEqual(Color.BLUE);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 255) * rgba(255, 0, 0, 255)');
        expect(expression.evaluate(undefined)).toEqual(Color.RED);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 0, 255) * 1');
        expect(expression.evaluate(undefined)).toEqual(Color.YELLOW);

        expression = new Expression(new MockStyleEngine(), '1 * rgba(255, 255, 0, 255)');
        expect(expression.evaluate(undefined)).toEqual(Color.YELLOW);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 255) / rgba(255, 255, 255, 255)');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 255) / 2');
        expect(expression.evaluate(undefined)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 255) % rgba(255, 255, 255, 255)');
        expect(expression.evaluate(undefined)).toEqual(new Color(0, 0, 0, 0));

        expression = new Expression(new MockStyleEngine(), 'color(\'green\') === color(\'green\')');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'color(\'green\') !== color(\'green\')');
        expect(expression.evaluate(undefined)).toEqual(false);
    });
});
