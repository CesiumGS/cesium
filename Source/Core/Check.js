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
     */
    var Check = {};

    /**
     * Contains type checking functions, all using the typeof operator
     */
    Check.typeOf = {};

    /**
     * Contains functions for checking numeric conditions such as minimum and maximum values
     */
    Check.numeric = {};

    function getUndefinedErrorMessage(name) {
        return name + ' was required but undefined.';
    }

    function getFailedTypeErrorMessage(actual, expected, name) {
        return 'Expected ' + name + ' to be typeof ' + expected + ', got ' + actual;
    }

    /**
     * Throws if test is not defined
     *
     * @param {*} test The value that is to be checked
     * @param {String} name The name of the variable being tested
     * @exception {DeveloperError} test must be defined
     */
    Check.defined = function (test, name) {
        if (!defined(test)) {
            throw new DeveloperError(getUndefinedErrorMessage(name));
        }
    };

    /**
     * Throws if test is greater than maximum
     *
     * @param {Number} test The value to test
     * @param {Number} maximum The maximum allowed value
     * @exception {DeveloperError} test must not be greater than maximum
     */
    Check.numeric.maximum = function (test, maximum) {
        Check.typeOf.number(test);
        Check.typeOf.number(maximum);
        if (test > maximum) {
            throw new DeveloperError('Expected ' + test + ' to be at most ' + maximum);
        }
    };

    /**
     * Throws if test is less than minimum
     *
     * @param {Number} test The value to test
     * @param {Number} minimum The minimum allowed value
     * @exception {DeveloperError} test must not be less than mininum
     */
    Check.numeric.minimum = function (test, minimum) {
        Check.typeOf.number(test);
        Check.typeOf.number(minimum);
        if (test < minimum) {
            throw new DeveloperError('Expected ' + test + ' to be at least ' + minimum);
        }
    };

    /**
     * Throws if test is not typeof 'function'
     *
     * @param {*} test The value to test
     * @param {String} name The name of the variable being tested
     * @exception {DeveloperError} test must be typeof 'function'
     */
    Check.typeOf.function = function (test, name) {
        if (typeof test !== 'function') {
            throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'function', name));
        }
    };

    /**
     * Throws if test is not typeof 'string'
     *
     * @param {*} test The value to test
     * @param {String} name The name of the variable being tested
     * @exception {DeveloperError} test must be typeof 'string'
     */
    Check.typeOf.string = function (test, name) {
        if (typeof test !== 'string') {
            throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'string', name));
        }
    };

    /**
     * Throws if test is not typeof 'number'
     *
     * @param {*} test The value to test
     * @param {String} name The name of the variable being tested
     * @exception {DeveloperError} test must be typeof 'number'
     */
    Check.typeOf.number = function (test, name) {
        if (typeof test !== 'number') {
            throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'number', name));
        }
    };

    /**
     * Throws if test is not typeof 'object'
     *
     * @param {*} test The value to test
     * @param {String} name The name of the variable being tested
     * @exception {DeveloperError} test must be typeof 'object'
     */
    Check.typeOf.object = function (test, name) {
        if (typeof test !== 'object') {
            throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'object', name));
        }
    };

    /**
     * Throws if test is not typeof 'boolean'
     *
     * @param {*} test The value to test
     * @param {String} name The name of the variable being tested
     * @exception {DeveloperError} test must be typeof 'boolean'
     */
    Check.typeOf.boolean = function (test, name) {
        if (typeof test !== 'boolean') {
            throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'boolean', name));
        }
    };

    return Check;
});
