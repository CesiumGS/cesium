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

    it('throws on invalid expressions', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), false);
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '2 3');
        }).toThrowDeveloperError();
    });

    it('throws on unknown characters', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), '#');
        }).toThrowDeveloperError();
    });

    it('throws on unmatched parenthesis', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), '((true)');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '(true))');
        }).toThrowDeveloperError();
    });

    it('throws on unknown identifiers', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), 'flse');
        }).toThrowDeveloperError();
    });

    it('throws on unknown function calls', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), 'unknown()');
        }).toThrowDeveloperError();
    });

    it('throws with unsupported operators', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), '~1');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '+1');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '2 | 3');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '2 & 3');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '2 == 3');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '2 != 3');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '2 << 3');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '2 >> 3');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '2 >>> 3');
        }).toThrowDeveloperError();
    });

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
        var expression = new Expression(new MockStyleEngine(), 'Color(\'#ffffff\')');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'Color(\'#fff\')');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'Color(\'white\')');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'Color(\'white\', 0.5)');
        expect(expression.evaluate(undefined)).toEqual(new Color(1.0, 1.0, 1.0, 0.5));

        expression = new Expression(new MockStyleEngine(), 'rgb(255, 255, 255)');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'hsl(0, 0, 1)');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 0.5)');
        expect(expression.evaluate(undefined)).toEqual(new Color(1.0, 1.0, 1.0, 0.5));

        expression = new Expression(new MockStyleEngine(), 'hsla(0, 0, 1, 0.5)');
        expect(expression.evaluate(undefined)).toEqual(new Color(1.0, 1.0, 1.0, 0.5));
    });

    it('color constructors throw with wrong number of arguments', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), 'rgb(255, 255)');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), 'hsl(1, 1)');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), 'rgba(255, 255, 255)');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), 'hsla(1, 1, 1)');
        }).toThrowDeveloperError();
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

    it('evaluates binary less than', function() {
        var expression = new Expression(new MockStyleEngine(), '2 < 3');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '2 < 2');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '3 < 2');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'true < false');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();

        expression = new Expression(new MockStyleEngine(), 'Color(\'blue\') < 10');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();
    });

    it('evaluates binary less than or equals', function() {
        var expression = new Expression(new MockStyleEngine(), '2 <= 3');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '2 <= 2');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '3 <= 2');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'true <= false');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();

        expression = new Expression(new MockStyleEngine(), 'Color(\'blue\') <= 10');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();
    });

    it('evaluates binary greater than', function() {
        var expression = new Expression(new MockStyleEngine(), '2 > 3');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '2 > 2');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '3 > 2');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'true > false');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();

        expression = new Expression(new MockStyleEngine(), 'Color(\'blue\') > 10');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();
    });

    it('evaluates binary greater than or equals', function() {
        var expression = new Expression(new MockStyleEngine(), '2 >= 3');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '2 >= 2');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '3 >= 2');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'true >= false');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();

        expression = new Expression(new MockStyleEngine(), 'Color(\'blue\') >= 10');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();
    });

    it('evaluates logical and', function() {
        var expression = new Expression(new MockStyleEngine(), 'false && false');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'false && true');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'true && true');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '2 && Color(\'red\')');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();
    });

    it('evaluates logical or', function() {
        var expression = new Expression(new MockStyleEngine(), 'false || false');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'false || true');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'true || true');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '2 || Color(\'red\')');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();
    });

    it('evaluates color operations', function() {
        var expression = new Expression(new MockStyleEngine(), 'rgba(255, 0, 0, 0.5) + rgba(0, 0, 255, 0.5)');
        expect(expression.evaluate(undefined)).toEqual(Color.MAGENTA);

        expression = new Expression(new MockStyleEngine(), 'rgba(0, 255, 255, 1.0) - rgba(0, 255, 0, 0)');
        expect(expression.evaluate(undefined)).toEqual(Color.BLUE);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 1.0) * rgba(255, 0, 0, 1.0)');
        expect(expression.evaluate(undefined)).toEqual(Color.RED);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 0, 1.0) * 1.0');
        expect(expression.evaluate(undefined)).toEqual(Color.YELLOW);

        expression = new Expression(new MockStyleEngine(), '1 * rgba(255, 255, 0, 1.0)');
        expect(expression.evaluate(undefined)).toEqual(Color.YELLOW);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 1.0) / rgba(255, 255, 255, 1.0)');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 1.0) / 2');
        expect(expression.evaluate(undefined)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));

        expression = new Expression(new MockStyleEngine(), 'rgba(255, 255, 255, 1.0) % rgba(255, 255, 255, 1.0)');
        expect(expression.evaluate(undefined)).toEqual(new Color(0, 0, 0, 0));

        expression = new Expression(new MockStyleEngine(), 'Color(\'green\') === Color(\'green\')');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'Color(\'green\') !== Color(\'green\')');
        expect(expression.evaluate(undefined)).toEqual(false);
    });
});
