/*global define*/
define([
    './defined',
    './DeveloperError'
    ], function(
        defined,
        DeveloperError) {
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
        return name + ' is required, actual value was undefined';
    }

    function getFailedTypeErrorMessage(actual, expected, name) {
        return 'Expected ' + name + ' to be typeof ' + expected + ', actual typeof was ' + actual;
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
     * @param {String} name The name of the variable being tested
     * @param {Number} maximum The maximum allowed value
     * @exception {DeveloperError} test must not be greater than maximum
     * @exception {DeveloperError} Both test and maximum must be typeof 'number'
     */
    Check.numeric.maximum = function (test, name, maximum) {
        Check.typeOf.number(test, 'test');
        Check.typeOf.string(name, 'name');
        Check.typeOf.number(maximum, 'maximum');
        if (test > maximum) {
            throw new DeveloperError('Expected ' + name + ' to be at most ' + maximum + ', actual value was ' + test);
        }
    };

    /**
     * Throws if test is less than minimum
     *
     * @param {Number} test The value to test
     * @param {String} name The name of the variable being tested
     * @param {Number} minimum The minimum allowed value
     * @exception {DeveloperError} test must not be less than mininum
     * @exception {DeveloperError} Both test and maximum must be typeof 'number'
     */
    Check.numeric.minimum = function (test, name, minimum) {
        Check.typeOf.number(test, 'test');
        Check.typeOf.string(name, 'name');
        Check.typeOf.number(minimum, 'minimum');
        if (test < minimum) {
            throw new DeveloperError('Expected ' + name + ' to be at least ' + minimum + ', actual value was ' + test);
        }
    };

    /**
     * Throws if test is not typeof 'function'
     *
     * @param {*} test The value to test
     * @param {String} name The name of the variable being tested
     * @exception {DeveloperError} test must be typeof 'function'
     */
    Check.typeOf.func = function (test, name) {
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
    Check.typeOf.bool = function (test, name) {
        if (typeof test !== 'boolean') {
            throw new DeveloperError(getFailedTypeErrorMessage(typeof test, 'boolean', name));
        }
    };

    return Check;
});
