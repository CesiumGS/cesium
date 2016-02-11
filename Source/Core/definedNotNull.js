/*global define*/
define([
        './deprecationWarning'
    ], function(
        deprecationWarning) {
    'use strict';

    /**
     * @exports definedNotNull
     *
     * @param {Object} value The object.
     * @returns {Boolean} Returns true if the object is defined and not null, returns false otherwise.
     *
     * @example
     * if (Cesium.definedNotNull(positions)) {
     *      doSomething();
     * } else {
     *      doSomethingElse();
     * }
     *
     * @deprecated
     */
    function definedNotNull(value) {
        deprecationWarning('definedNotNull', 'definedNotNull has been deprecated and will be removed in Cesium 1.20.  Use `defined` instead, which has been updated to check for null.');
        return value !== undefined && value !== null;
    }

    return definedNotNull;
});
