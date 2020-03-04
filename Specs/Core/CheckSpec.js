import { Check } from '../../Source/Cesium.js';

describe('Core/Check', function() {

    describe('type checks', function () {
        it('Check.typeOf.bool does not throw when passed a boolean', function () {
            expect(function () {
                Check.typeOf.bool('bool', true);
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.bool throws when passed a non-boolean', function () {
            expect(function () {
                Check.typeOf.bool('mockName', {});
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.bool('mockName', []);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.bool('mockName', 1);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.bool('mockName', 'snth');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.bool('mockName', function () {return true;});
            }).toThrowDeveloperError();
        });

        it('Check.typeOf.func does not throw when passed a function', function () {
            expect(function () {
                Check.typeOf.func('mockName', function () {return true;});
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.func throws when passed a non-function', function () {
            expect(function () {
                Check.typeOf.func('mockName', {});
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.func('mockName', [2]);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.func('mockName', 1);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.func('mockName', 'snth');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.func('mockName', true);
            }).toThrowDeveloperError();
        });

        it('Check.typeOf.object does not throw when passed object', function() {
            expect(function () {
                Check.typeOf.object('mockName', {});
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.object throws when passed non-object', function() {
            expect(function () {
                Check.typeOf.object('mockName', 'snth');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.object('mockName', true);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.object('mockName', 1);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.object('mockName', function () {return true;});
            }).toThrowDeveloperError();
        });

        it('Check.typeOf.number does not throw when passed number', function() {
            expect(function () {
                Check.typeOf.number('mockName', 2);
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.number throws when passed non-number', function() {
            expect(function () {
                Check.typeOf.number('mockName', 'snth');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number('mockName', true);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number('mockName', {});
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number('mockName', [2]);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number('mockName', function () {return true;});
            }).toThrowDeveloperError();
        });

        it('Check.typeOf.string does not throw when passed a string', function () {
            expect(function () {
                Check.typeOf.string('mockName', 's');
            }).not.toThrowDeveloperError();
        });

        it('Check.typeOf.string throws on non-string', function () {
            expect(function () {
                Check.typeOf.string('mockName', {});
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.string('mockName', true);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.string('mockName', 1);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.string('mockName', [2]);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.string('mockName', function () {return true;});
            }).toThrowDeveloperError();
        });
    });

    describe('Check.defined', function () {
        it('does not throw unless passed value that is undefined or null', function () {
            expect(function () {
                Check.defined('mockName', {});
            }).not.toThrowDeveloperError();
            expect(function () {
                Check.defined('mockName', []);
            }).not.toThrowDeveloperError();
            expect(function () {
                Check.defined('mockName', 2);
            }).not.toThrowDeveloperError();
            expect(function () {
                Check.defined('mockName', function () {return true;});
            }).not.toThrowDeveloperError();
            expect(function () {
                Check.defined('mockName', 'snt');
            }).not.toThrowDeveloperError();
        });

        it('throws when passed undefined', function () {
            expect(function () {
                Check.defined('mockName', undefined);
            }).toThrowDeveloperError();
        });
    });

    describe('Check.typeOf.number.lessThan', function () {
        it('throws if test is equal to limit', function () {
            expect(function () {
                Check.typeOf.number.lessThan('mockName', 3, 3);
            }).toThrowDeveloperError();
        });

        it('throws if test is greater than limit', function () {
            expect(function () {
                Check.typeOf.number.lessThan('mockName', 4, 3);
            }).toThrowDeveloperError();
        });

        it('does not throw if test is less than limit', function () {
            expect(function () {
                Check.typeOf.number.lessThan('mockName', 2, 3);
            }).not.toThrowDeveloperError();
        });
    });

    describe('Check.typeOf.number.lessThanOrEquals', function () {
        it('throws if test is greater than limit', function () {
            expect(function () {
                Check.typeOf.number.lessThanOrEquals('mockName', 4, 3);
            }).toThrowDeveloperError();
        });

        it('does not throw if test is equal to limit', function () {
            expect(function () {
                Check.typeOf.number.lessThanOrEquals('mockName', 3, 3);
            }).not.toThrowDeveloperError();
        });

        it('does not throw if test is less than limit', function () {
            expect(function () {
                Check.typeOf.number.lessThanOrEquals('mockName', 2, 3);
            }).not.toThrowDeveloperError();
        });
    });

    describe('Check.typeOf.number.equals', function () {
        it('throws if either value is not a number', function () {
            expect(function () {
                Check.typeOf.number.equals('mockName1', 'mockname2', 'a', 3);
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number.equals('mockName1', 'mockname2', 3, 'a');
            }).toThrowDeveloperError();
            expect(function () {
                Check.typeOf.number.equals('mockName1', 'mockname2', 'b', 'a');
            }).toThrowDeveloperError();
        });

        it('throws if both the values are a number but not equal', function () {
            expect(function () {
                Check.typeOf.number.equals('mockName1', 'mockName2', 1, 4);
            }).toThrowDeveloperError();
        });

        it('does not throw if both values are a number and are equal', function () {
            expect(function () {
                Check.typeOf.number.equal('mockName1', 'mockName2', 3, 3);
            }).not.toThrowDeveloperError();
        });
    });

    describe('Check.typeOf.number.greaterThan', function () {
        it('throws if test is equal to limit', function () {
            expect(function () {
                Check.typeOf.number.greaterThan('mockName', 3, 3);
            }).toThrowDeveloperError();
        });

        it('throws if test is less than limit', function () {
            expect(function () {
                Check.typeOf.number.greaterThan('mockName', 2, 3);
            }).toThrowDeveloperError();
        });

        it('does not throw if test is greater than limit', function () {
            expect(function () {
                Check.typeOf.number.greaterThan('mockName', 4, 3);
            }).not.toThrowDeveloperError();
        });
    });

    describe('Check.typeOf.number.greaterThanOrEquals', function () {
        it('throws if test is less than limit', function () {
            expect(function () {
                Check.typeOf.number.greaterThanOrEquals('mockName', 2, 3);
            }).toThrowDeveloperError();
        });

        it('does not throw if test is equal to limit', function () {
            expect(function () {
                Check.typeOf.number.greaterThanOrEquals('mockName', 3, 3);
            }).not.toThrowDeveloperError();
        });

        it('does not throw if test is greater than limit', function () {
            expect(function () {
                Check.typeOf.number.greaterThanOrEquals('mockName', 4, 3);
            }).not.toThrowDeveloperError();
        });
    });
});
