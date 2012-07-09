/*global define*/
define([
        './DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * Describes a single leap second, which is constructed from a {@link JulianDate} and a
     * numerical offset representing the number of seconds between the TAI and UTC time standards.
     *
     * @alias LeapSecond
     * @constructor
     *
     * @param {JulianDate} date A Julian date representing the time of the leap second.
     * Additionally, this parameter may be a {String} containing the date of the leap second
     * (in the format used to construct a Javascript Date object).
     * @param {Number} totalTaiOffsetFromUtc The cumulative difference, in seconds, between the TAI and
     * UTC standards at the time of this leap second.
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

        if (typeof offset === 'undefined') {
            throw new DeveloperError('offset is required.');
        }

        /*
         * The Julian date at which this leap second occurs.
         *
         * @type {JulianDate}
         */
        this.julianDate = date;
        /*
         * The cumulative number of seconds between the UTC and TAI time standards at the time
         * of this leap second.
         *
         * @type {Number}
         */
        this.offset = offset;
    };

    /**
     * Returns a list of leap seconds. If {@link LeapSecond.setLeapSeconds} has not yet been called,
     * then a list of leap seconds that was available when this library was released is returned.
     *
     * @memberof LeapSecond
     *
     * @return {Array} A list of {@link LeapSecond} objects.
     *
     * @see LeapSecond.setLeapSeconds
     */
    LeapSecond.leapSeconds = [];

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
        var julianDayNum1 = leapSecond1.julianDate.getJulianDayNumber();
        var julianDayNum2 = leapSecond2.julianDate.getJulianDayNumber();
        if (julianDayNum1 !== julianDayNum2) {
            return julianDayNum1 < julianDayNum2 ? -1 : 1;
        }
        var secondsOfDay1 = leapSecond1.julianDate.getSecondsOfDay();
        var secondsOfDay2 = leapSecond2.julianDate.getSecondsOfDay();
        if (secondsOfDay1 !== secondsOfDay2) {
            return secondsOfDay1 < secondsOfDay2 ? -1 : 1;
        }
        return 0;
    };

    return LeapSecond;
});