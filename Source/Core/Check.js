/*global define*/
define([
    './defaultValue',
    './defined',
    './DeveloperError',
    './isArray'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        isArray) {
    'use strict';

    /**
     * Contains functions for checking that supplied arguments are of a specified type
     * or meet specified conditions
     * @private
     *
     * @exports Check
     */
    var Check = {};

    Check.type = {};
    Check.numeric = {};

    var errors = {
        defined: getUndefinedErrorMessage,
        failedType: getFailedTypeErrorMessage
    };

    function getUndefinedErrorMessage(name) {
        return defaultValue(name, 'variable') + ' is required but is undefined.';
    }
    function getFailedTypeErrorMessage(actual, expected) {
        return 'Expected ' + expected + ', got ' + actual;
    }

    /**
     * @param {} test The value that is to be checked
     * @param {string} name The name of the variable being tested: makes
     * @throws {DeveloperError}
     */
    Check.defined = function (test, name) {
        if (!defined(test)) {
            throw new DeveloperError(errors.defined(name));
        }
    };

    /**
     * @param {} test The value to test
     * @param {number} min The minimum allowed value
     * @param {number} max The maximum allowed value
     * @throws {DeveloperError}
     */
    Check.numeric.withinRange = function (test, min, max) {
        Check.type.number(test);
        Check.type.number(max);
        Check.type.number(min);
        if (min > max) {
            throw new DeveloperError('Invalid condition: min (' + min + ') must be less than max (' + max + ')');
        }
        if (test > max || test < min) {
            throw new DeveloperError('Invalid argument: expected ' + test + ' to be in range [' + min + ', ' + max + ']');
        }
    };

    /**
     * @param {number} test The value to test
     * @param {number} max The maximum allowed value
     * @throws {DeveloperError}
     */
    Check.numeric.maximum = function (test, max) {
        Check.type.number(test);
        Check.type.number(max);
        if (test > max) {
            throw new DeveloperError('Expected ' + test + ' to be at most ' + max);
        }
    };

    /**
     * @param {number} test The value to test
     * @param {number} min The minimum allowed value
     * @throws {DeveloperError}
     */
    Check.numeric.minimum = function (test, min) {
        Check.type.number(test);
        Check.type.number(min);
        if (test < min) {
            throw new DeveloperError('Expected ' + test + ' to be at least ' + min);
        }
    };

    /**
     * @param {} test The value to test
     * @throws {DeveloperError}
     */
    Check.type.function = function (test) {
        if (typeof test !== 'function') {
            throw new DeveloperError(errors.failedType(typeof test, 'function'));
        }
    };

    /**
     * @param {} test The value to test
     * @throws {DeveloperError}
     */
    Check.type.string = function (test) {
        if (typeof test !== 'string') {
            throw new DeveloperError(errors.failedType(typeof test, 'string'));
        }
    };

    /**
     * @param {} test The value to test
     * @throws {DeveloperError}
     */
    Check.type.number = function (test) {
        if (typeof test !== 'number') {
            throw new DeveloperError(errors.failedType(typeof test, 'number'));
        }
    };

    /**
     * @param {} test The value to test
     * @throws {DeveloperError}
     */
    Check.type.object = function (test) {
        if (typeof test !== 'object' || isArray(test)) {
            throw new DeveloperError(errors.failedType(typeof test, 'object'));
        }
    };

    /**
     * @param {} test The value to test
     * @throws {DeveloperError}
     */
    Check.type.boolean = function (test) {
        if (typeof test !== 'boolean') {
            throw new DeveloperError(errors.failedType(typeof test, 'boolean'));
        }
    };

    return Check;
});
