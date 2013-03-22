/*global define*/
define([
        './DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * Describes a single leap second, which is constructed from a {@link JulianDate} and a
     * numerical offset representing the number of seconds TAI is ahead of the UTC time standard.
     *
     * @alias LeapSecond
     * @constructor
     *
     * @param {JulianDate} date A Julian date representing the time of the leap second.
     * @param {Number} offset The cumulative number of seconds, that TAI is ahead of UTC at provided date.
     *
     * @exception {DeveloperError} <code>date</code> is required.
     * @exception {DeveloperError} <code>offset</code> is required.
     *
     * @see JulianDate
     * @see TimeStandard
     *
     * @example
     * // Example 1. Construct a LeapSecond using a JulianDate
     * var date = new Date('January 1, 1990 00:00:00 UTC');
     * var leapSecond = new LeapSecond(JulianDate.fromDate(date), 25.0);
     * var offset = leapSecond.offset;    // 25.0
     *
     * //////////////////////////////////////////////////////////////////
     *
     * // Example 2. Construct a LeapSecond using a date string
     * var date = 'January 1, 1990 00:00:00 UTC';
     * var leapSecond = new LeapSecond(date, 25.0);
     */
    var LeapSecond = function(date, offset) {
        if (typeof date === 'undefined') {
            throw new DeveloperError('date is required.');
        }

        if (offset === null || isNaN(offset)) {
            throw new DeveloperError('offset is required and must be a number.');
        }

        /**
         * The Julian date at which this leap second occurs.
         *
         * @type {JulianDate}
         */
        this.julianDate = date;

        /**
         * The cumulative number of seconds between the UTC and TAI time standards at the time
         * of this leap second.
         *
         * @type {Number}
         */
        this.offset = offset;
    };

    /**
     * Sets the list of leap seconds used throughout Cesium.
     *
     * @memberof LeapSecond
     *
     * @param {Array} leapSeconds An array of {@link LeapSecond} objects.
     * @exception {DeveloperErrpr} leapSeconds is required and must be an array.
     *
     * @see LeapSecond.setLeapSeconds
     *
     * @example
     * LeapSecond.setLeapSeconds([
     *                            new LeapSecond(new JulianDate(2453736, 43233.0, TimeStandard.TAI), 33), // January 1, 2006 00:00:00 UTC
     *                            new LeapSecond(new JulianDate(2454832, 43234.0, TimeStandard.TAI), 34), // January 1, 2009 00:00:00 UTC
     *                            new LeapSecond(new JulianDate(2456109, 43235.0, TimeStandard.TAI), 35)  // July 1, 2012 00:00:00 UTC
     *                           ]);
     */
    LeapSecond.setLeapSeconds = function(leapSeconds) {
        if (!Array.isArray(leapSeconds)) {
            throw new DeveloperError("leapSeconds is required and must be an array.");
        }
        LeapSecond._leapSeconds = leapSeconds;
        LeapSecond._leapSeconds.sort(LeapSecond.compareLeapSecondDate);
    };

    /**
     * Returns a copy of the array of leap seconds used throughout Cesium. By default, this is the
     * official list of leap seconds that was available when Cesium was released.
     *
     * @memberof LeapSecond
     *
     * @return {Array} A list of {@link LeapSecond} objects.
     *
     * @see LeapSecond.setLeapSeconds
     */
    LeapSecond.getLeapSeconds = function() {
        return LeapSecond._leapSeconds;
    };

    /**
     * Checks whether two leap seconds are equivalent to each other.
     *
     * @memberof LeapSecond
     *
     * @param {LeapSecond} other The leap second to compare against.
     *
     * @return {Boolean} <code>true</code> if the leap seconds are equal; otherwise, <code>false</code>.
     *
     * @example
     * var date = new Date('January 1, 1990 00:00:00 UTC');
     * var leapSecond1 = new LeapSecond(JulianDate.fromDate(date), 25.0);
     * var leapSecond2 = new LeapSecond(JulianDate.fromDate(date), 25.0);
     * leapSecond1.equals(leapSecond2);     // true
     */
    LeapSecond.prototype.equals = function(other) {
        return this.julianDate.equals(other.julianDate) && (this.offset === other.offset);
    };

    /**
     * Given two leap seconds, determines which comes before the other by comparing
     * their respective Julian dates.
     *
     * @memberof LeapSecond
     *
     * @param {LeapSecond} leapSecond1 The first leap second to be compared.
     * @param {LeapSecond} leapSecond2 The second leap second to be compared.
     *
     * @return {Number} A negative value if the first leap second is earlier than the second,
     *                  a positive value if the first leap second is later than the second, or
     *                  zero if the two leap seconds are equal (ignoring their offsets).
     *
     * @see JulianDate#lessThan
     * @see JulianDate#isAfter
     *
     * @example
     * var date = new Date('January 1, 2006 00:00:00 UTC');
     * var leapSecond1 = new LeapSecond(JulianDate.fromDate(date), 33.0);
     * var leapSecond2 = new LeapSecond(JulianDate.fromDate(date), 34.0);
     * LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond2);    // returns 0
     */
    LeapSecond.compareLeapSecondDate = function(leapSecond1, leapSecond2) {
        return leapSecond1.julianDate.compareTo(leapSecond2.julianDate);
    };

    LeapSecond._leapSeconds = [];

    return LeapSecond;
});