/*global define*/
define(function() {
    "use strict";

    /**
     * The object returned by {@link JulianDate#toGregorianDate}.
     *
     * @alias GregorianDate
     * @see JulianDate#toGregorianDate
     * @constructor
     */
    var GregorianDate = function(year, month, day, hour, minute, second, millisecond, isLeapSecond) {
        /**
         * The year, a whole number.
         * @type {Number}
         */
        this.year = year;
        /**
         * The month, a whole number with range [1, 12].
         * @type {Number}
         */
        this.month = month;
        /**
         * The day, a whole number with range 1.
         * @type {Number}
         */
        this.day = day;
        /**
         * The hour, a whole number with range [0, 23].
         * @type {Number}
         */
        this.hour = hour;
        /**
         * The minute, a whole number with range [0, 59].
         * @type {Number}
         */
        this.minute = minute;
        /**
         * The second, a whole number with range [0, 60], with 60 representing a leap second.
         * @type {Number}
         */
        this.second = second;
        /**
         * The millisecond, a floating point number with range [0.0, 1000.0).
         * @type {Number}
         */
        this.millisecond = millisecond;
        /**
         * True if this date is during a leap second.
         * @type {Boolean}
         */
        this.isLeapSecond = isLeapSecond;
    };

    return GregorianDate;
});