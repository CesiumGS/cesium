/*global define*/
define([
    './defined',
    './DeveloperError',
    './isArray'
], function(defined,
            DeveloperError,
            isArray) {
    'use strict';

    var exports = {
        defined: checkDefined,
        numeric: {
            min: checkMin,
            minMax: checkMinMax,
            max: checkMax
        },
        type: {
            array: checkArray,
            boolean: checkBoolean,
            function: checkFunction,
            object: checkObject,
            number: checkNumber,
            string: checkString
        }
    };

    var errors = {
        defined: getUndefinedErrorMessage,
        failedType: getFailedTypeErrorMessage
    };

    function getUndefinedErrorMessage(name) {
        return name + ' is required but is undefined.';
    }
    function getFailedTypeErrorMessage(actual, expected) {
        return 'Expected ' + expected + ', got ' + actual;
    }

    function checkMinMax(test, min, max) {
        checkNumber(test);
        checkNumber(max);
        checkNumber(min);
        if (min > max) {
            throw new DeveloperError('Invalid condition: min (' + min + ') must be less than max (' + max + ')');
        }
        if (test > max || test < min) {
            throw new DeveloperError('Invalid argument: expected ' + test + ' to be in range [' + min + ', ' + max + ']');
        }
    }

    function checkMax(test, max) {
        checkNumber(test);
        checkNumber(max);
        if (test > max) {
            throw new DeveloperError('Expected ' + test + ' to be at most ' + max);
        }
    }

    function checkMin(test, min) {
        checkNumber(test);
        checkNumber(min);
        if (test < min) {
            throw new DeveloperError('Expected ' + test + ' to be at least ' + min);
        }
    }

    function checkDefined(test, name) {
        if (test === undefined) {
            throw new DeveloperError(errors.defined(name));
        }
    }

    function checkFunction(test) {
        if (typeof test !== 'function') {
            throw new DeveloperError(errors.failedType(typeof test, 'function'));
        }
    }

    function checkString(test) {
        if (typeof test !== 'string') {
            throw new DeveloperError(errors.failedType(typeof test, 'string'));
        }
    }

    function checkNumber(test) {
        if (typeof test !== 'number') {
            throw new DeveloperError(errors.failedType(typeof test, 'number'));
        }
    }

    function checkObject(test) {
        if (typeof test !== 'object' || isArray(test)) {
            throw new DeveloperError(errors.failedType(typeof test, 'object'));
        }
    }

    function checkArray(test) {
        if (!isArray(test)) {
            throw new DeveloperError(errors.failedType(typeof test, 'array'));
        }
    }

    function checkBoolean(test) {
        if (typeof test !== 'boolean') {
            throw new DeveloperError(errors.failedType(typeof test, 'boolean'));
        }
    }

    return exports;
});
