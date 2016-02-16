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

    function MockFeature(value) {
        this._value = value;
    }

    MockFeature.prototype.getProperty = function() {
        return this._value;
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
        var expression = new Expression(new MockStyleEngine(), '\'#ffffff\'');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), '\'white\'');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);
    });

    it('evaluates unary not', function() {
        var expression = new Expression(new MockStyleEngine(), '!true');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '!!true');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '!5');
        expect(expression.evaluate(undefined)).toEqual(undefined);
    });

    it('evaluates unary negative', function() {
        var expression = new Expression(new MockStyleEngine(), '-1');
        expect(expression.evaluate(undefined)).toEqual(-1);

        expression = new Expression(new MockStyleEngine(), '--1');
        expect(expression.evaluate(undefined)).toEqual(1);

        expression = new Expression(new MockStyleEngine(), '-false');
        expect(expression.evaluate(undefined)).toEqual(undefined);
    });

    it('evaluates equals operator', function() {
        var expression = new Expression(new MockStyleEngine(), '1 === 1');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '2 === false');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '\'white\' === \'white\'');
        expect(expression.evaluate(undefined)).toEqual(true);
    });

    it('evaluates not equals operator', function() {
        var expression = new Expression(new MockStyleEngine(), '1 !== 1');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '2 !== 1');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '\'white\' !== \'red\'');
        expect(expression.evaluate(undefined)).toEqual(true);
    });


    it('evaluates addition operator', function() {
        var expression = new Expression(new MockStyleEngine(), '1 + 1');
        expect(expression.evaluate(undefined)).toEqual(2);

        expression = new Expression(new MockStyleEngine(), 'true + false');
        expect(expression.evaluate(undefined)).toEqual(undefined);

        expression = new Expression(new MockStyleEngine(), '\'he\' + \'llo\'');
        expect(expression.evaluate(undefined)).toEqual('hello');
    });

    it('evaluates logical or operator', function() {
        var expression = new Expression(new MockStyleEngine(), '1 || true');
        expect(expression.evaluate(undefined)).toEqual(undefined);

        expression = new Expression(new MockStyleEngine(), 'true || false');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'false || false');
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('evaluates ternary conditional', function() {
        var expression = new Expression(new MockStyleEngine(), 'true ? \'yes\' : \'no\'');
        expect(expression.evaluate(undefined)).toEqual('yes');

        expression = new Expression(new MockStyleEngine(), 'false ? \'yes\' : \'no\'');
        expect(expression.evaluate(undefined)).toEqual('no');
    });
});
