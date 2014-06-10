/*global define*/
define(function() {
    "use strict";

    /**
     * Represents a Gregorian date in a more precise format than the JavaScript Date object.
     * In addition to submillisecond precision, this object can also represent leap seconds.
     * @alias GregorianDate
     * @constructor
     *
     * @see JulianDate#toGregorianDate
     */
    var GregorianDate = function(year, month, day, hour, minute, second, millisecond, isLeapSecond) {
        /**
         * Gets or sets the year as a whole number.
         * @type {Number}
         */
        this.year = year;
        /**
         * Gets or sets the month as a whole number with range [1, 12].
         * @type {Number}
         */
        this.month = month;
        /**
         * Gets or sets the day of the month as a whole number starting at 1.
         * @type {Number}
         */
        this.day = day;
        /**
         * Gets or sets the hour as a whole number with range [0, 23].
         * @type {Number}
         */
        this.hour = hour;
        /**
         * Gets or sets the minute of the hour as a whole number with range [0, 59].
         * @type {Number}
         */
        this.minute = minute;
        /**
         * Gets or sets the second of the minute as a whole number with range [0, 60], with 60 representing a leap second.
         * @type {Number}
         */
        this.second = second;
        /**
         * Gets or sets the millisecond of the second as a floating point number with range [0.0, 1000.0).
         * @type {Number}
         */
        this.millisecond = millisecond;
        /**
         * Gets or sets whether this time is during a leap second.
         * @type {Boolean}
         */
        this.isLeapSecond = isLeapSecond;
    };

    return GregorianDate;
});