/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Constants for time conversions like those done by {@link JulianDate}.
     *
     * @exports TimeConstants
     *
     * @see JulianDate
     *
     * @private
     */
    var TimeConstants = {
        /**
         * The number of seconds in one millisecond: <code>0.001</code>
         * @type {Number}
         * @constant
         */
        SECONDS_PER_MILLISECOND : 0.001,

        /**
         * The number of seconds in one minute: <code>60</code>.
         * @type {Number}
         * @constant
         */
        SECONDS_PER_MINUTE : 60.0,

        /**
         * The number of minutes in one hour: <code>60</code>.
         * @type {Number}
         * @constant
         */
        MINUTES_PER_HOUR : 60.0,

        /**
         * The number of hours in one day: <code>24</code>.
         * @type {Number}
         * @constant
         */
        HOURS_PER_DAY : 24.0,

        /**
         * The number of seconds in one hour: <code>3600</code>.
         * @type {Number}
         * @constant
         */
        SECONDS_PER_HOUR : 3600.0,

        /**
         * The number of minutes in one day: <code>1440</code>.
         * @type {Number}
         * @constant
         */
        MINUTES_PER_DAY : 1440.0,

        /**
         * The number of seconds in one day, ignoring leap seconds: <code>86400</code>.
         * @type {Number}
         * @constant
         */
        SECONDS_PER_DAY : 86400.0,

        /**
         * The number of days in one Julian century: <code>36525</code>.
         * @type {Number}
         * @constant
         */
        DAYS_PER_JULIAN_CENTURY : 36525.0,

        /**
         * One trillionth of a second.
         * @type {Number}
         * @constant
         */
        PICOSECOND : 0.000000001,

        /**
         * The number of days to subtract from a Julian date to determine the
         * modified Julian date, which gives the number of days since midnight
         * on November 17, 1858.
         * @type {Number}
         * @constant
         */
        MODIFIED_JULIAN_DATE_DIFFERENCE : 2400000.5
    };

    return freezeObject(TimeConstants);
});
