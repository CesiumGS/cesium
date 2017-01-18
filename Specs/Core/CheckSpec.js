/*global defineSuite*/
defineSuite([
    'Core/Check'
    ], function(
        Check) {
    'use strict';

    describe('type checks', function () {
        it('Check.typeOf.bool does not throw when passed a boolean', function () {
            expect(function () {
                Check.typeOf.bool(true);
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.boolean throws when passed a non-boolean', function () {
            expect(function () {
                Check.typeOf.bool({}, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.bool([], 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.bool(1, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.bool('snth', 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.bool(function () {return true;}, 'mockName');
            }).toThrowDeveloperError();
        });

        it('Check.typeOf.func does not throw when passed a function', function () {
            expect(function () {
                Check.typeOf.func(function () {return true;}, 'mockName');
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.func throws when passed a non-function', function () {
            expect(function () {
                Check.typeOf.func({}, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.func([], 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.func(1, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.func('snth', 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.func(true, 'mockName');
            }).toThrowDeveloperError();
        });

        it('Check.typeOf.object does not throw when passed object', function() {
            expect(function () {
                Check.typeOf.object({}, 'mockName');
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.object throws when passed non-object', function() {
            expect(function () {
                Check.typeOf.object('snth', 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.object(true, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.object(1, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.object(function () {return true;}, 'mockName');
            }).toThrowDeveloperError();
        });

        it('Check.typeOf.number does not throw when passed number', function() {
            expect(function () {
                Check.typeOf.number(2, 'mockName');
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.number throws when passed non-number', function() {
            expect(function () {
                Check.typeOf.number('snth', 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number(true, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number({}, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number([2], 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number(function () {return true;}, 'mockName');
            }).toThrowDeveloperError();
        });

        it('Check.typeOf.string does not throw when passed a string', function () {
            expect(function () {
                Check.typeOf.string('s', 'mockName');
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.string throws on non-string', function () {
            expect(function () {
                Check.typeOf.string({}, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.string(true, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.string(1, 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.string([2], 'mockName');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.string(function () {return true;}, 'mockName');
            }).toThrowDeveloperError();
        });
    });

    describe('Check.numeric', function () {
        it('minimum throws on value less than minimum', function () {
            var test = 4;
            var minimum = 5;
            expect(function () {
                Check.numeric.minimum(test, 'test', minimum);
            }).toThrowDeveloperError();
        });
        it('minimum does not throw on value at least as big as minimum', function () {
            var test = 4;
            expect(function () {
                Check.numeric.minimum(test, 'test', 4);
                Check.numeric.minimum(test, 'test', 3);
            }).not.toThrowDeveloperError();
        });

        it('maximum throws on value greater than maximum', function () {
            var test = 6;
            expect(function () {
                Check.numeric.maximum(test, 'test', 5);
            }).toThrowDeveloperError();
        });
        it('maximum does not throw on value at most as big as maximum', function () {
            expect(function () {
                var test = 5;
                Check.numeric.maximum(test, 'test', 5);
                test = 4;
                Check.numeric.maximum(test, 'test', 5);
            }).not.toThrowDeveloperError();
        });
    });

    describe('Check.defined', function () {
        it('does not throw unless passed value that is undefined or null', function () {
            expect(function () {
                Check.defined({}, 'mockName');
            }).not.toThrowDeveloperError();
            expect(function () {
                Check.defined([], 'mockName');
            }).not.toThrowDeveloperError();
            expect(function () {
                Check.defined(2, 'mockName');
            }).not.toThrowDeveloperError();
            expect(function () {
                Check.defined(function() {return true;}, 'mockName');
            }).not.toThrowDeveloperError();
            expect(function () {
                Check.defined('snt', 'mockName');
            }).not.toThrowDeveloperError();
        });

        it('throws when passed undefined', function () {
            expect(function () {
                Check.defined(undefined, 'mockName');
            }).toThrowDeveloperError();
        });
    });
});
