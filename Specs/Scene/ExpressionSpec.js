/*global defineSuite*/
defineSuite([
        'Scene/Expression',
        'Scene/ExpressionNodeType',
        'Core/Color'
    ], function(
        Expression,
        ExpressionNodeType,
        Color) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    function MockFeature() {
        this._properties = {};
    }

    MockFeature.prototype.addProperty = function(name, value) {
        this._properties[name] = value;
    };

    MockFeature.prototype.getProperty = function(name) {
        return this._properties[name];
    };

    it ('parses backslashes', function() {
        var expression = new Expression(new MockStyleEngine(), '"\\he\\\\\\ll\\\\o"');
        expect(expression.evaluate(undefined)).toEqual('\\he\\\\\\ll\\\\o');
    });

    it('evaluates variable', function() {
        var feature = new MockFeature();
        feature.addProperty('height', 10);
        feature.addProperty('width', 5);
        feature.addProperty('string', 'hello');
        feature.addProperty('boolean', true);
        feature.addProperty('color', Color.RED);
        feature.addProperty('null', null);
        feature.addProperty('undefined', undefined);

        var expression = new Expression(new MockStyleEngine(), '${height}');
        expect(expression.evaluate(feature)).toEqual(10);

        expression = new Expression(new MockStyleEngine(), '\'${height}\'');
        expect(expression.evaluate(feature)).toEqual('10');

        expression = new Expression(new MockStyleEngine(), '${height}/${width}');
        expect(expression.evaluate(feature)).toEqual(2);

        expression = new Expression(new MockStyleEngine(), '${string}');
        expect(expression.evaluate(feature)).toEqual('hello');

        expression = new Expression(new MockStyleEngine(), '\'replace ${string}\'');
        expect(expression.evaluate(feature)).toEqual('replace hello');

        expression = new Expression(new MockStyleEngine(), '\'replace ${string} multiple ${height}\'');
        expect(expression.evaluate(feature)).toEqual('replace hello multiple 10');

        expression = new Expression(new MockStyleEngine(), '"replace ${string}"');
        expect(expression.evaluate(feature)).toEqual('replace hello');

        expression = new Expression(new MockStyleEngine(), '\'replace ${string\'');
        expect(expression.evaluate(feature)).toEqual('replace ${string');

        expression = new Expression(new MockStyleEngine(), '${boolean}');
        expect(expression.evaluate(feature)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '\'${boolean}\'');
        expect(expression.evaluate(feature)).toEqual('true');

        expression = new Expression(new MockStyleEngine(), '${color}');
        expect(expression.evaluate(feature)).toEqual(Color.RED);

        expression = new Expression(new MockStyleEngine(), '\'${color}\'');
        expect(expression.evaluate(feature)).toEqual(Color.RED.toString());

        expression = new Expression(new MockStyleEngine(), '${null}');
        expect(expression.evaluate(feature)).toEqual(null);

        expression = new Expression(new MockStyleEngine(), '\'${null}\'');
        expect(expression.evaluate(feature)).toEqual('');

        expression = new Expression(new MockStyleEngine(), '${undefined}');
        expect(expression.evaluate(feature)).toEqual(undefined);

        expression = new Expression(new MockStyleEngine(), '\'${undefined}\'');
        expect(expression.evaluate(feature)).toEqual('');

        expect(function() {
            return new Expression(new MockStyleEngine(), '${height');
        }).toThrowDeveloperError();
    });

    it('throws on invalid expressions', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), false);
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), 'this');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '2; 3;');
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

    it('throws on unknown member function calls', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), 'regExp().unknown()');
        }).toThrowDeveloperError();
    });

    it('throws with unsupported operators', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), '~1');
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

    it('converts to literal boolean', function() {
        var expression = new Expression(new MockStyleEngine(), 'Boolean()');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'Boolean(1)');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'Boolean("true")');
        expect(expression.evaluate(undefined)).toEqual(true);
    });

    it('evaluates literal number', function() {
        var expression = new Expression(new MockStyleEngine(), '1');
        expect(expression.evaluate(undefined)).toEqual(1);

        expression = new Expression(new MockStyleEngine(), '0');
        expect(expression.evaluate(undefined)).toEqual(0);

        expression = new Expression(new MockStyleEngine(), 'NaN');
        expect(expression.evaluate(undefined)).toEqual(NaN);

        expression = new Expression(new MockStyleEngine(), 'Infinity');
        expect(expression.evaluate(undefined)).toEqual(Infinity);
    });

    it('converts to literal number', function() {
        var expression = new Expression(new MockStyleEngine(), 'Number()');
        expect(expression.evaluate(undefined)).toEqual(0);

        expression = new Expression(new MockStyleEngine(), 'Number("1")');
        expect(expression.evaluate(undefined)).toEqual(1);

        expression = new Expression(new MockStyleEngine(), 'Number(true)');
        expect(expression.evaluate(undefined)).toEqual(1);
    });

    it('evaluates literal string', function() {
        var expression = new Expression(new MockStyleEngine(), '\'hello\'');
        expect(expression.evaluate(undefined)).toEqual('hello');
    });

    it('converts to literal string', function() {
        var expression = new Expression(new MockStyleEngine(), 'String()');
        expect(expression.evaluate(undefined)).toEqual('');

        expression = new Expression(new MockStyleEngine(), 'String(1)');
        expect(expression.evaluate(undefined)).toEqual('1');

        expression = new Expression(new MockStyleEngine(), 'String(true)');
        expect(expression.evaluate(undefined)).toEqual('true');
    });

    it('evaluates literal color', function() {
        var expression = new Expression(new MockStyleEngine(), 'color(\'#ffffff\')');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'color(\'#fff\')');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'color(\'white\')');
        expect(expression.evaluate(undefined)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'color(\'white\', 0.5)');
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

    it('evaluates color with expressions as arguments', function() {
        var feature = new MockFeature();
        feature.addProperty('hex6', '#ffffff');
        feature.addProperty('hex3', '#fff');
        feature.addProperty('keyword', 'white');
        feature.addProperty('alpha', 0.2);

        var expression = new Expression(new MockStyleEngine(), 'color(${hex6})');
        expect(expression.evaluate(feature)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'color(${hex3})');
        expect(expression.evaluate(feature)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'color(${keyword})');
        expect(expression.evaluate(feature)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'color(${keyword}, ${alpha} + 0.6)');
        expect(expression.evaluate(feature).red).toEqual(1.0);
        expect(expression.evaluate(feature).green).toEqual(1.0);
        expect(expression.evaluate(feature).blue).toEqual(1.0);
        expect(expression.evaluate(feature).alpha).toEqual(0.8);
    });

    it('evaluates rgb with expressions as arguments', function() {
        var feature = new MockFeature();
        feature.addProperty('red', 100);
        feature.addProperty('green', 200);
        feature.addProperty('blue', 255);

        var expression = new Expression(new MockStyleEngine(), 'rgb(${red}, ${green}, ${blue})');
        expect(expression.evaluate(feature)).toEqual(Color.fromBytes(100, 200, 255));

        expression = new Expression(new MockStyleEngine(), 'rgb(${red}/2, ${green}/2, ${blue})');
        expect(expression.evaluate(feature)).toEqual(Color.fromBytes(50, 100, 255));
    });

    it('evaluates hsl with expressions as arguments', function() {
        var feature = new MockFeature();
        feature.addProperty('h', 0.0);
        feature.addProperty('s', 0.0);
        feature.addProperty('l', 1.0);

        var expression = new Expression(new MockStyleEngine(), 'hsl(${h}, ${s}, ${l})');
        expect(expression.evaluate(feature)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'hsl(${h} + 0.2, ${s} + 1.0, ${l} - 0.5)');
        expect(expression.evaluate(feature)).toEqual(Color.fromHsl(0.2, 1.0, 0.5));
    });

    it('evaluates rgba with expressions as arguments', function() {
        var feature = new MockFeature();
        feature.addProperty('red', 100);
        feature.addProperty('green', 200);
        feature.addProperty('blue', 255);
        feature.addProperty('a', 0.3);

        var expression = new Expression(new MockStyleEngine(), 'rgba(${red}, ${green}, ${blue}, ${a})');
        expect(expression.evaluate(feature)).toEqual(Color.fromBytes(100, 200, 255, 0.3*255));

        expression = new Expression(new MockStyleEngine(), 'rgba(${red}/2, ${green}/2, ${blue}, ${a} * 2)');
        expect(expression.evaluate(feature)).toEqual(Color.fromBytes(50, 100, 255, 0.6*255));
    });

    it('evaluates hsla with expressions as arguments', function() {
        var feature = new MockFeature();
        feature.addProperty('h', 0.0);
        feature.addProperty('s', 0.0);
        feature.addProperty('l', 1.0);
        feature.addProperty('a', 1.0);

        var expression = new Expression(new MockStyleEngine(), 'hsla(${h}, ${s}, ${l}, ${a})');
        expect(expression.evaluate(feature)).toEqual(Color.WHITE);

        expression = new Expression(new MockStyleEngine(), 'hsla(${h} + 0.2, ${s} + 1.0, ${l} - 0.5, ${a} / 4)');
        expect(expression.evaluate(feature)).toEqual(Color.fromHsl(0.2, 1.0, 0.5, 0.25));
    });

    it('evaluates rgba with expressions as arguments', function() {
        var feature = new MockFeature();
        feature.addProperty('red', 100);
        feature.addProperty('green', 200);
        feature.addProperty('blue', 255);
        feature.addProperty('alpha', 0.5);

        var expression = new Expression(new MockStyleEngine(), 'rgba(${red}, ${green}, ${blue}, ${alpha})');
        expect(expression.evaluate(feature)).toEqual(Color.fromBytes(100, 200, 255, 0.5 * 255));

        expression = new Expression(new MockStyleEngine(), 'rgba(${red}/2, ${green}/2, ${blue}, ${alpha} + 0.1)');
        expect(expression.evaluate(feature)).toEqual(Color.fromBytes(50, 100, 255, 0.6 * 255));
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

    it('evaluates unary positive', function() {
        var expression = new Expression(new MockStyleEngine(), '+5');
        expect(expression.evaluate(undefined)).toEqual(5);

        expression = new Expression(new MockStyleEngine(), '+"5"');
        expect(expression.evaluate(undefined)).toEqual(5);

        expression = new Expression(new MockStyleEngine(), '+true');
        expect(expression.evaluate(undefined)).toEqual(1);

        expression = new Expression(new MockStyleEngine(), '+null');
        expect(expression.evaluate(undefined)).toEqual(0);
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
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'color(\'blue\') < 10');
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('evaluates binary less than or equals', function() {
        var expression = new Expression(new MockStyleEngine(), '2 <= 3');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '2 <= 2');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '3 <= 2');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'true <= false');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'color(\'blue\') <= 10');
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('evaluates binary greater than', function() {
        var expression = new Expression(new MockStyleEngine(), '2 > 3');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '2 > 2');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '3 > 2');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'true > false');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'color(\'blue\') > 10');
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('evaluates binary greater than or equals', function() {
        var expression = new Expression(new MockStyleEngine(), '2 >= 3');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), '2 >= 2');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '3 >= 2');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'true >= false');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'color(\'blue\') >= 10');
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('evaluates logical and', function() {
        var expression = new Expression(new MockStyleEngine(), 'false && false');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'false && true');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'true && true');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), '2 && color(\'red\')');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();
    });

    it('throws with invalid and operands', function() {
        var expression = new Expression(new MockStyleEngine(), '2 && true');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();

        expression = new Expression(new MockStyleEngine(), 'true && color(\'red\')');
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
    });

    it('throws with invalid or operands', function() {
        var expression = new Expression(new MockStyleEngine(), '2 || false');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();

        expression = new Expression(new MockStyleEngine(), 'false || color(\'red\')');
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

        expression = new Expression(new MockStyleEngine(), 'color(\'green\') === color(\'green\')');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'color(\'green\') !== color(\'green\')');
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('evaluates isNaN function', function() {
        var expression = new Expression(new MockStyleEngine(), 'isNaN()');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'isNaN(NaN)');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'isNaN(1)');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'isNaN(Infinity)');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'isNaN(null)');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'isNaN(true)');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'isNaN("hello")');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'isNaN(color("white"))');
        expect(expression.evaluate(undefined)).toEqual(true);
    });

    it('evaluates isFinite function', function() {
        var expression = new Expression(new MockStyleEngine(), 'isFinite()');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'isFinite(NaN)');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'isFinite(1)');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'isFinite(Infinity)');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'isFinite(null)');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'isFinite(true)');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'isFinite("hello")');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'isFinite(color("white"))');
        expect(expression.evaluate(undefined)).toEqual(false);
    });

    it('evaluates ternary conditional', function() {
        var expression = new Expression(new MockStyleEngine(), 'true ? "first" : "second"');
        expect(expression.evaluate(undefined)).toEqual('first');

        expression = new Expression(new MockStyleEngine(), 'false ? "first" : "second"');
        expect(expression.evaluate(undefined)).toEqual('second');

        expression = new Expression(new MockStyleEngine(), '(!(1 + 2 > 3)) ? (2 > 1 ? 1 + 1 : 0) : (2 > 1 ? -1 + -1 : 0)');
        expect(expression.evaluate(undefined)).toEqual(2);
    });

    it('evaluates member expression with dot', function() {
        var feature = new MockFeature();
        feature.addProperty('height', 10);
        feature.addProperty('width', 5);
        feature.addProperty('string', 'hello');
        feature.addProperty('boolean', true);
        feature.addProperty('color', Color.RED);
        feature.addProperty('color.red', 'something else');
        feature.addProperty('feature.color', Color.GREEN);
        feature.addProperty('feature', {
            color : Color.BLUE
        });
        feature.addProperty('null', null);
        feature.addProperty('undefined', undefined);

        var expression = new Expression(new MockStyleEngine(), '${color.red}');
        expect(expression.evaluate(feature)).toEqual(1.0);

        expression = new Expression(new MockStyleEngine(), '${color.blue}');
        expect(expression.evaluate(feature)).toEqual(0.0);

        expression = new Expression(new MockStyleEngine(), '${height.blue}');
        expect(expression.evaluate(feature)).toEqual(undefined);

        expression = new Expression(new MockStyleEngine(), '${undefined.blue}');
        expect(expression.evaluate(feature)).toEqual(undefined);

        expression = new Expression(new MockStyleEngine(), '${feature.color}');
        expect(expression.evaluate(feature)).toEqual(Color.RED);

        expression = new Expression(new MockStyleEngine(), '${feature.feature.color}');
        expect(expression.evaluate(feature)).toEqual(Color.BLUE);

        expression = new Expression(new MockStyleEngine(), '${feature.color.red}');
        expect(expression.evaluate(feature)).toEqual(1.0);
    });

    it('evaluates member expression with brackets', function() {
        var feature = new MockFeature();
        feature.addProperty('height', 10);
        feature.addProperty('width', 5);
        feature.addProperty('string', 'hello');
        feature.addProperty('boolean', true);
        feature.addProperty('color', Color.RED);
        feature.addProperty('color.red', 'something else');
        feature.addProperty('feature.color', Color.GREEN);
        feature.addProperty('feature', {
            color : Color.BLUE
        });
        feature.addProperty('null', null);
        feature.addProperty('undefined', undefined);

        var expression = new Expression(new MockStyleEngine(), '${color["red"]}');
        expect(expression.evaluate(feature)).toEqual(1.0);

        expression = new Expression(new MockStyleEngine(), '${color["blue"]}');
        expect(expression.evaluate(feature)).toEqual(0.0);

        expression = new Expression(new MockStyleEngine(), '${height["blue"]}');
        expect(expression.evaluate(feature)).toEqual(undefined);

        expression = new Expression(new MockStyleEngine(), '${undefined["blue"]}');
        expect(expression.evaluate(feature)).toEqual(undefined);

        expression = new Expression(new MockStyleEngine(), '${feature["color"]}');
        expect(expression.evaluate(feature)).toEqual(Color.RED);

        expression = new Expression(new MockStyleEngine(), '${feature.color["red"]}');
        expect(expression.evaluate(feature)).toEqual(1.0);

        expression = new Expression(new MockStyleEngine(), '${feature["color"].red}');
        expect(expression.evaluate(feature)).toEqual(1.0);

        expression = new Expression(new MockStyleEngine(), '${feature["color.red"]}');
        expect(expression.evaluate(feature)).toEqual('something else');

        expression = new Expression(new MockStyleEngine(), '${feature.feature["color"]}');
        expect(expression.evaluate(feature)).toEqual(Color.BLUE);

        expression = new Expression(new MockStyleEngine(), '${feature["feature.color"]}');
        expect(expression.evaluate(feature)).toEqual(Color.GREEN);
    });

    it('member expressions throw without variable notation', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), 'color.red');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), 'color["red"]');
        }).toThrowDeveloperError();
    });

    it('member expression throws with variable property', function() {
        var feature = new MockFeature();
        feature.addProperty('color', Color.RED);
        feature.addProperty('colorName', 'red');

        expect(function() {
            return new Expression(new MockStyleEngine(), '${color[${colorName}]}');
        }).toThrowDeveloperError();
    });

    it('evaluates feature property', function() {
        var feature = new MockFeature();
        feature.addProperty('feature', {
            color : Color.BLUE
        });

        var expression = new Expression(new MockStyleEngine(), '${feature}');
        expect(expression.evaluate(feature)).toEqual({
            color : Color.BLUE
        });

        expression = new Expression(new MockStyleEngine(), '${feature} === ${feature.feature}');
        expect(expression.evaluate(feature)).toEqual(true);
    });

    it('constructs regex', function() {
        var feature = new MockFeature();
        feature.addProperty('pattern', "[abc]");

        var expression = new Expression(new MockStyleEngine(), 'regExp("a")');
        expect(expression.evaluate(undefined)).toEqual(/a/);
        expect(expression._runtimeAst._type).toEqual(ExpressionNodeType.LITERAL_REGEX);

        expression = new Expression(new MockStyleEngine(), 'regExp("\\w")');
        expect(expression.evaluate(undefined)).toEqual(/\w/);
        expect(expression._runtimeAst._type).toEqual(ExpressionNodeType.LITERAL_REGEX);

        expression = new Expression(new MockStyleEngine(), 'regExp(1 + 1)');
        expect(expression.evaluate(undefined)).toEqual(/2/);
        expect(expression._runtimeAst._type).toEqual(ExpressionNodeType.REGEX);

        expression = new Expression(new MockStyleEngine(), 'regExp(true)');
        expect(expression.evaluate(undefined)).toEqual(/true/);
        expect(expression._runtimeAst._type).toEqual(ExpressionNodeType.LITERAL_REGEX);

        expression = new Expression(new MockStyleEngine(), 'regExp()');
        expect(expression.evaluate(undefined)).toEqual(/(?:)/);
        expect(expression._runtimeAst._type).toEqual(ExpressionNodeType.LITERAL_REGEX);

        expression = new Expression(new MockStyleEngine(), 'regExp(${pattern})');
        expect(expression.evaluate(feature)).toEqual(/[abc]/);
        expect(expression._runtimeAst._type).toEqual(ExpressionNodeType.REGEX);
    });

    it ('constructs regex with flags', function() {
        var expression = new Expression(new MockStyleEngine(), 'regExp("a", "i")');
        expect(expression.evaluate(undefined)).toEqual(/a/i);
        expect(expression._runtimeAst._type).toEqual(ExpressionNodeType.LITERAL_REGEX);

        expression = new Expression(new MockStyleEngine(), 'regExp("a", "m" + "g")');
        expect(expression.evaluate(undefined)).toEqual(/a/mg);
        expect(expression._runtimeAst._type).toEqual(ExpressionNodeType.REGEX);
    });

    it('throws if regex constructor has invalid pattern', function() {
        var expression = new Expression(new MockStyleEngine(), 'regExp("(?<=\\s)" + ".")');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), 'regExp("(?<=\\s)")');
        }).toThrowDeveloperError();
    });

    it('throws if regex constructor has invalid flags', function() {
        var expression = new Expression(new MockStyleEngine(), 'regExp("a" + "b", "q")');
        expect(function() {
            expression.evaluate(undefined);
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), 'regExp("a", "q")');
        }).toThrowDeveloperError();
    });

    it('evaluates regex test function', function() {
        var feature = new MockFeature();
        feature.addProperty('property', 'abc');

        var expression = new Expression(new MockStyleEngine(), 'regExp("a").test("abc")');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'regExp("a").test("bcd")');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'regExp("quick\\s(brown).+?(jumps)", "ig").test("The Quick Brown Fox Jumps Over The Lazy Dog")');
        expect(expression.evaluate(undefined)).toEqual(true);

        expression = new Expression(new MockStyleEngine(), 'regExp("a").test()');
        expect(expression.evaluate(undefined)).toEqual(false);

        expression = new Expression(new MockStyleEngine(), 'regExp(${property}).test(${property})');
        expect(expression.evaluate(feature)).toEqual(true);
    });

    it('evaluates regex exec function', function() {
        var feature = new MockFeature();
        feature.addProperty('property', 'abc');

        var expression = new Expression(new MockStyleEngine(), 'regExp("a(.)").exec("abc")');
        expect(expression.evaluate(undefined)).toEqual('b');

        expression = new Expression(new MockStyleEngine(), 'regExp("a(.)").exec("qbc")');
        expect(expression.evaluate(undefined)).toEqual(null);

        expression = new Expression(new MockStyleEngine(), 'regExp("a(.)").exec()');
        expect(expression.evaluate(undefined)).toEqual(null);

        expression = new Expression(new MockStyleEngine(), 'regExp("quick\\s(b.*n).+?(jumps)", "ig").exec("The Quick Brown Fox Jumps Over The Lazy Dog")');
        expect(expression.evaluate(undefined)).toEqual('Brown');

        expression = new Expression(new MockStyleEngine(), 'regExp("(" + ${property} + ")").exec(${property})');
        expect(expression.evaluate(feature)).toEqual('abc');
    });

    it('throws if test is not call with a RegExp', function() {
        expect(function() {
            return new Expression(new MockStyleEngine(), 'color("blue").test()');
        }).toThrowDeveloperError();

        expect(function() {
            return new Expression(new MockStyleEngine(), '"blue".test()');
        }).toThrowDeveloperError();
    });

    it('evaluates array expression', function() {
        var feature = new MockFeature();
        feature.addProperty('property', 'value');
        feature.addProperty('array', [Color.GREEN, Color.PURPLE, Color.YELLOW]);
        feature.addProperty('complicatedArray', [{
                'subproperty' : Color.ORANGE,
                'anotherproperty' : Color.RED
             }, {
                'subproperty' : Color.BLUE,
                'anotherproperty' : Color.WHITE
        }]);

        var expression = new Expression(new MockStyleEngine(), '[1, 2, 3]');
        expect(expression.evaluate(undefined)).toEqual([1, 2, 3]);

        expression = new Expression(new MockStyleEngine(), '[1+2, "hello", 2 < 3, color("blue"), ${property}]');
        expect(expression.evaluate(feature)).toEqual([3, 'hello', true, Color.BLUE, 'value']);

        expression = new Expression(new MockStyleEngine(), '[1, 2, 3] * 4');
        expect(expression.evaluate(undefined)).toEqual(NaN);

        expression = new Expression(new MockStyleEngine(), '-[1, 2, 3]');
        expect(expression.evaluate(undefined)).toEqual(NaN);

        expression = new Expression(new MockStyleEngine(), '${array[1]}');
        expect(expression.evaluate(feature)).toEqual(Color.PURPLE);

        expression = new Expression(new MockStyleEngine(), '${complicatedArray[1].subproperty}');
        expect(expression.evaluate(feature)).toEqual(Color.BLUE);

        expression = new Expression(new MockStyleEngine(), '${complicatedArray[0]["anotherproperty"]}');
        expect(expression.evaluate(feature)).toEqual(Color.RED);
    });
});