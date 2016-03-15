/*global define*/
define([
        './DeveloperError'
    ], function(
        DeveloperError) {
    'use strict';

    /**
     * Determines if a given date is a leap year.
     *
     * @exports isLeapYear
     *
     * @param {Number} year The year to be tested.
     * @returns {Boolean} True if <code>year</code> is a leap year.
     *
     * @example
     * var leapYear = Cesium.isLeapYear(2000); // true
     */
    function isLeapYear(year) {
        //>>includeStart('debug', pragmas.debug);
        if (year === null || isNaN(year)) {
            throw new DeveloperError('year is required and must be a number.');
        }
        //>>includeEnd('debug');

        return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
    }

    return isLeapYear;
});
