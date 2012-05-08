/*global define*/
define(['Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * Determines if a given date is a leap year.
     *
     * @param {Number} year The year to be tested.
     *
     * @return {Boolean} True if <code>year</code> is a leap yer.
     *
     * @exception {DeveloperError} Number required.
     *
     * @example
     * var leapYear = isLeapYear(2000); // true
     */
    function isLeapYear(year) {
        if (year === null || isNaN(year)) {
            throw new DeveloperError("Number required", "year");
        }
        return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
    }

    return isLeapYear;
});
