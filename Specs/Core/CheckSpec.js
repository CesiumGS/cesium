/*global defineSuite*/
defineSuite([
    'Core/Check'
    ], function(
        Check) {
    'use strict';

    describe('type checks', function () {
        it('Check.type.boolean does not throw when passed a boolean', function () {
            expect(function () {
                Check.type.boolean(true);
            }).not.toThrowDeveloperError();
        });

        it('Check.type.boolean throws when passed a non-boolean', function () {
            expect(function () {
                Check.type.boolean({});
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.boolean([]);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.boolean(1);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.boolean('snth');
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.boolean(function () {return true;});
            }).toThrowDeveloperError();
        });

        it('Check.type.function does not throw when passed a function', function () {
            expect(function () {
                Check.type.function(function () {return true;});
            }).not.toThrowDeveloperError();
        });

        it('Check.type.function throws when passed a non-function', function () {
            expect(function () {
                Check.type.function({});
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.function([]);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.function(1);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.function('snth');
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.function(true);
            }).toThrowDeveloperError();
        });

        it('Check.type.object does not throw when passed object', function() {
            expect(function () {
                Check.type.object({});
            }).not.toThrowDeveloperError();
        });

        it('Check.type.object throws when passed non-object', function() {
            expect(function () {
                Check.type.object('snth');
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.object(true);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.object(1);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.object([2]);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.object(function () {return true;});
            }).toThrowDeveloperError();
        });

        it('Check.type.number does not throw when passed number', function() {
            expect(function () {
                Check.type.number(2);
            }).not.toThrowDeveloperError();
        });

        it('Check.type.number throws when passed non-number', function() {
            expect(function () {
                Check.type.number('snth');
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.number(true);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.number({});
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.number([2]);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.number(function () {return true;});
            }).toThrowDeveloperError();
        });

        it('Check.type.string does not throw when passed a string', function () {
            expect(function () {
                Check.type.string('s');
            }).not.toThrowDeveloperError();
        });

        it('Check.type.string throws on non-string', function () {
            expect(function () {
                Check.type.string({});
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.string(true);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.string(1);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.string([2]);
            }).toThrowDeveloperError();
            expect(function () {
                Check.type.string(function () {return true;});
            }).toThrowDeveloperError();
        });
    });

    describe('numeric tests: min/max/min-max', function () {
        it('min throws on value less than min', function () {
            expect(function () {
                Check.numeric.minimum(4, 5);
            }).toThrowDeveloperError();
        });
        it('min does not throw on value at least as big as min', function () {
            expect(function () {
                Check.numeric.minimum(4, 4);
                Check.numeric.minimum(4, 3);
            }).not.toThrowDeveloperError();
        });

        it('max throws on value greater than max', function () {
            expect(function () {
                Check.numeric.maximum(6, 5);
            }).toThrowDeveloperError();
        });
        it('max does not throw on value at most as big as max', function () {
            expect(function () {
                Check.numeric.maximum(5, 5);
                Check.numeric.maximum(4, 5);
            }).not.toThrowDeveloperError();
        });

        it('minMax throws on value outside range', function () {
            expect(function () {
                Check.numeric.withinRange(-2, 3, 5);
                Check.numeric.withinRange(6, 3, 5);
            }).toThrowDeveloperError();
        });
        it('minMax does not throw on value inside range', function () {
            expect(function () {
                Check.numeric.withinRange(3, 3, 5);
                Check.numeric.withinRange(5, 3, 5);
                Check.numeric.withinRange(4, 3, 5);
            }).not.toThrowDeveloperError();
        });
    });

    it('Check.defined does not throw unless passed value that is undefined or null', function () {
        expect(function () {
            Check.defined({});
        }).not.toThrowDeveloperError();
        expect(function () {
            Check.defined([]);
        }).not.toThrowDeveloperError();
        expect(function () {
            Check.defined(2);
        }).not.toThrowDeveloperError();
        expect(function () {
            Check.defined(function() {return true;});
        }).not.toThrowDeveloperError();
        expect(function () {
            Check.defined('snt');
        }).not.toThrowDeveloperError();
    });

    it('Check.defined throws when passed undefined', function () {
        expect(function () {
            Check.defined(undefined);
        }).toThrowDeveloperError();
    });

});
