/*global defineSuite*/
defineSuite([
    'Core/check'
    ], function(
        validation) {
    'use strict';
    var check = validation.check;
    var Match = validation.Match;

    it('does not throw on matching empty object against Object', function () {
        expect(function () {
            check({}, Object);
        }).not.toThrowDeveloperError();
    });

    it('does not throw on matching plain object against Object', function () {
        var obj = {
            a: 2,
            b: 'snt'
        };
        expect(function () {
            check(obj, Object);
        }).not.toThrowDeveloperError();
    });

    it('throws on matching array against Object', function () {
        expect(function () {
            check([], Object);
        }).toThrowDeveloperError();
    });

    it('does not throw when matching array of any elements against []', function () {
        expect(function () {
            check([], []);
        }).toThrowDeveloperError();
        expect(function () {
            check([2], []);
        }).toThrowDeveloperError();
        expect(function () {
            check([34, 'snth'], []);
        }).toThrowDeveloperError();
    });

    it('throws when matching array with non-matching elements against [Type]', function () {
        expect(function () {
            check(['snth', 2], [Number]);
        }).toThrowDeveloperError();
        expect(function () {
            check([2, 'snth'], [String]);
        }).toThrowDeveloperError();
        expect(function () {
            check([34, 'snth'], [Boolean]);
        }).toThrowDeveloperError();
    });

    it('does not throw when matching array of matching elements against [Type]', function () {
        expect(function () {
            check([4, 2], [Number]);
        }).toThrowDeveloperError();
        expect(function () {
            check(['snth', 'snth'], [String]);
        }).toThrowDeveloperError();
        expect(function () {
            check([true, false], [Boolean]);
        }).toThrowDeveloperError();
    });

    it('throws on matching non-number with Number', function () {
        expect(function () {
            check('aeou', Number);
        }).toThrowDeveloperError();
        expect(function () {
            check(true, Number);
        }).toThrowDeveloperError();
        expect(function () {
            check(function() {}, Number);
        }).toThrowDeveloperError();
        expect(function () {
            check({}, Number);
        }).toThrowDeveloperError();
    });

    it('does not throw on matching number with Number', function () {
        expect(function () {
            check(3.39, Number);
        }).not.toThrowDeveloperError();
        expect(function () {
            check(3, Number);
        }).not.toThrowDeveloperError();
    });

    it('throws on matching non-string with String', function () {
        expect(function () {
            check(23, String);
        }).toThrowDeveloperError();
        expect(function () {
            check(true, String);
        }).toThrowDeveloperError();
        expect(function () {
            check(function() {}, String);
        }).toThrowDeveloperError();
        expect(function () {
            check({}, String);
        }).toThrowDeveloperError();
    });

    it('does not throw on matching string with String', function () {
        expect(function () {
            check('snt', String);
        }).not.toThrowDeveloperError();
    });

    it('throws for failing Match.Where condition', function () {
        var condition = function (x) {
            return x > 0.0;
        };
        expect(function () {
            check(-1, Match.Where(condition));
        }).toThrowDeveloperError();
    });

    it('does not throw for valid Match.Where condition', function () {
        var condition = function (x) {
            return x > 0.0;
        };
        expect(function () {
            check(1, Match.Where(condition));
        }).toThrowDeveloperError();
    });

});
