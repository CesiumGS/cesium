/*global defineSuite*/
defineSuite([
    'Core/check'
    ], function(
        check) {
    'use strict';

    describe('type checks', function () {
        it('check.type.array does not throw when passed an array', function () {
            expect(function () {
                check.type.array([]);
            }).not.toThrowDeveloperError();
        });
        it('check.type.array does not throw when passed a typed array', function () {
            expect(function () {
                check.type.array([]);
            }).not.toThrowDeveloperError();
        });

        it('check.type.array throws when passed non-array', function () {
            expect(function () {
                check.type.array({});
            }).toThrowDeveloperError();
            expect(function () {
                check.type.array(true);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.array(1);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.array('snth');
            }).toThrowDeveloperError();
            expect(function () {
                check.type.array(function () {return true;});
            }).toThrowDeveloperError();
        });

        it('check.type.boolean does not throw when passed a boolean', function () {
            expect(function () {
                check.type.boolean(true);
            }).not.toThrowDeveloperError();
        });

        it('check.type.boolean throws when passed a non-boolean', function () {
            expect(function () {
                check.type.boolean({});
            }).toThrowDeveloperError();
            expect(function () {
                check.type.boolean([]);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.boolean(1);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.boolean('snth');
            }).toThrowDeveloperError();
            expect(function () {
                check.type.boolean(function () {return true;});
            }).toThrowDeveloperError();
        });

        it('check.type.function does not throw when passed a function', function () {
            expect(function () {
                check.type.function(function () {return true;});
            }).not.toThrowDeveloperError();
        });

        it('check.type.function throws when passed a non-function', function () {
            expect(function () {
                check.type.function({});
            }).toThrowDeveloperError();
            expect(function () {
                check.type.function([]);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.function(1);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.function('snth');
            }).toThrowDeveloperError();
            expect(function () {
                check.type.function(true);
            }).toThrowDeveloperError();
        });

        it('check.type.object does not throw when passed object', function() {
            expect(function () {
                check.type.object({});
            }).not.toThrowDeveloperError();
        });

        it('check.type.object throws when passed non-object', function() {
            expect(function () {
                check.type.object('snth');
            }).toThrowDeveloperError();
            expect(function () {
                check.type.object(true);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.object(1);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.object([2]);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.object(function () {return true;});
            }).toThrowDeveloperError();
        });

        it('check.type.number does not throw when passed number', function() {
            expect(function () {
                check.type.number(2);
            }).not.toThrowDeveloperError();
        });

        it('check.type.number throws when passed non-number', function() {
            expect(function () {
                check.type.number('snth');
            }).toThrowDeveloperError();
            expect(function () {
                check.type.number(true);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.number({});
            }).toThrowDeveloperError();
            expect(function () {
                check.type.number([2]);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.number(function () {return true;});
            }).toThrowDeveloperError();
        });

        it('check.type.string does not throw when passed a string', function () {
            expect(function () {
                check.type.string('s');
            }).not.toThrowDeveloperError();
        });

        it('check.type.string throws on non-string', function () {
            expect(function () {
                check.type.string({});
            }).toThrowDeveloperError();
            expect(function () {
                check.type.string(true);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.string(1);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.string([2]);
            }).toThrowDeveloperError();
            expect(function () {
                check.type.string(function () {return true;});
            }).toThrowDeveloperError();
        });
    });

    describe('numeric tests: min/max/min-max', function () {
        it('min throws on value less than min', function () {
            expect(function () {
                check.numeric.min(4, 5);
            }).toThrowDeveloperError();
        });
        it('min does not throw on value at least as big as min', function () {
            expect(function () {
                check.numeric.min(4, 4);
                check.numeric.min(4, 3);
            }).not.toThrowDeveloperError();
        });

        it('max throws on value greater than max', function () {
            expect(function () {
                check.numeric.max(6, 5);
            }).toThrowDeveloperError();
        });
        it('max does not throw on value at most as big as max', function () {
            expect(function () {
                check.numeric.max(5, 5);
                check.numeric.max(4, 5);
            }).not.toThrowDeveloperError();
        });

        it('minMax throws on value outside range', function () {
            expect(function () {
                check.numeric.minMax(-2, 3, 5);
                check.numeric.minMax(6, 3, 5);
            }).toThrowDeveloperError();
        });
        it('minMax does not throw on value inside range', function () {
            expect(function () {
                check.numeric.minMax(3, 3, 5);
                check.numeric.minMax(5, 3, 5);
                check.numeric.minMax(4, 3, 5);
            }).not.toThrowDeveloperError();
        });
    });

    it('check.defined does not throw when passed value that is not undefined', function () {
        expect(function () {
            check.defined({});
        }).not.toThrowDeveloperError();
        expect(function () {
            check.defined([]);
        }).not.toThrowDeveloperError();
        expect(function () {
            check.defined(null);
        }).not.toThrowDeveloperError();
        expect(function () {
            check.defined(2);
        }).not.toThrowDeveloperError();
        expect(function () {
            check.defined(function() {return true;});
        }).not.toThrowDeveloperError();
        expect(function () {
            check.defined('snt');
        }).not.toThrowDeveloperError();
    });

    it('check.defined throws when passed undefined', function () {
        expect(function () {
            check.defined(undefined);
        }).toThrowDeveloperError();
    });

});
