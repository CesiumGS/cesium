/*global define*/
define([
        'require',
        './DeveloperError'
    ], function(
        require,
        DeveloperError) {
    "use strict";

    var JulianDate = {};
    JulianDate.fromDate = function(a, b) {
        //because of the circular reference between JulianDate and TimeStandard,
        //we need to require JulianDate later and replace our reference
        JulianDate = require('./JulianDate');
        return JulianDate.fromDate(a, b);
    };

    /**
     * Describes a single leap second, which is constructed from a {@link JulianDate} and a
     * numerical offset representing the number of seconds between the TAI and UTC time standards.
     *
     * @name LeapSecond
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
    function LeapSecond(date, offset) {
        var julianDate;
        var totalTaiOffsetFromUtc;

        if (!date) {
            throw new DeveloperError('date is required.');
        }
        if (typeof offset === 'undefined') {
            throw new DeveloperError('offset is required.');
        }

        if (typeof date === 'object') {
            julianDate = date;
            totalTaiOffsetFromUtc = offset;
        } else if (typeof date === 'string') {
            julianDate = JulianDate.fromDate(new Date(date));
            totalTaiOffsetFromUtc = offset;
        }

        /*
         * The Julian date at which this leap second occurs.
         *
         * @type {JulianDate}
         */
        this.julianDate = julianDate;
        /*
         * The cumulative number of seconds between the UTC and TAI time standards at the time
         * of this leap second.
         *
         * @type {Number}
         */
        this.offset = totalTaiOffsetFromUtc;
    }

    /**
     * Sets the list of currently known leap seconds from user provided data.
     *
     * @memberof LeapSecond
     *
     * @param {Object} data An array of the form:
     *                          [
     *                            {
     *                              date   : xxx,
     *                              offset : xxx
     *                            },
     *                            ...
     *                          ]
     * <code>date</code> should be a String representing the
     * time of the leap second (in the format used to construct a Javascript Date object), and <code>offset</code>
     * should be a number representing the difference, in seconds, between the TAI and UTC standards at the
     * time of this leap second.
     *
     * @exception {DeveloperError} <code>data</code> is required.
     *
     * @see LeapSecond.getLeapSeconds
     *
     * @example
     * // Set the list of leap seconds using user defined data.
     * var data = [
     *     {
     *          date: 'January 1, 1972 00:00:00 UTC',
     *          offset: 10.0
     *     },
     *     {
     *          date: 'July 1, 1972 00:00:00 UTC',
     *          offset: 11.0
     *     }
     * ];
     * LeapSecond.setLeapSeconds(data);
     * var leapSeconds = LeapSecond.getLeapSeconds();  // An array of two LeapSeconds.
     */
    LeapSecond.setLeapSeconds = function(data) {
        if (!data) {
            throw new DeveloperError('data is required.');
        }

        LeapSecond._leapSeconds = [];
        var numObjects = data.length;
        for ( var i = 0; i < numObjects; i++) {
            LeapSecond._leapSeconds.push(new LeapSecond(data[i].date, data[i].offset));
        }
        LeapSecond._leapSeconds.sort(LeapSecond.compareLeapSecondDate);
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
    LeapSecond.getLeapSeconds = function() {
        if (!LeapSecond._leapSeconds) {
            LeapSecond._leapSeconds =
                [
                     new LeapSecond('January 1, 1972 00:00:00 UTC', 10),
                     new LeapSecond('July 1, 1972 00:00:00 UTC', 11),
                     new LeapSecond('January 1, 1973 00:00:00 UTC', 12),
                     new LeapSecond('January 1, 1974 00:00:00 UTC', 13),
                     new LeapSecond('January 1, 1975 00:00:00 UTC', 14),
                     new LeapSecond('January 1, 1976 00:00:00 UTC', 15),
                     new LeapSecond('January 1, 1977 00:00:00 UTC', 16),
                     new LeapSecond('January 1, 1978 00:00:00 UTC', 17),
                     new LeapSecond('January 1, 1979 00:00:00 UTC', 18),
                     new LeapSecond('January 1, 1980 00:00:00 UTC', 19),
                     new LeapSecond('July 1, 1981 00:00:00 UTC', 20),
                     new LeapSecond('July 1, 1982 00:00:00 UTC', 21),
                     new LeapSecond('July 1, 1983 00:00:00 UTC', 22),
                     new LeapSecond('July 1, 1985 00:00:00 UTC', 23),
                     new LeapSecond('January 1, 1988 00:00:00 UTC', 24),
                     new LeapSecond('January 1, 1990 00:00:00 UTC', 25),
                     new LeapSecond('January 1, 1991 00:00:00 UTC', 26),
                     new LeapSecond('July 1, 1992 00:00:00 UTC', 27),
                     new LeapSecond('July 1, 1993 00:00:00 UTC', 28),
                     new LeapSecond('July 1, 1994 00:00:00 UTC', 29),
                     new LeapSecond('January 1, 1996 00:00:00 UTC', 30),
                     new LeapSecond('July 1, 1997 00:00:00 UTC', 31),
                     new LeapSecond('January 1, 1999 00:00:00 UTC', 32),
                     new LeapSecond('January 1, 2006 00:00:00 UTC', 33),
                     new LeapSecond('January 1, 2009 00:00:00 UTC', 34),
                     new LeapSecond('July 1, 2012 00:00:00 UTC', 35)
                 ];
        }
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