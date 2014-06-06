/*global define*/
define([
        './defined',
        './defineProperties',
        './DeveloperError',
        './isArray'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        isArray) {
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
     * @see JulianDate
     * @see TimeStandard
     *
     * @example
     * // Example 1. Construct a LeapSecond using a JulianDate
     * var date = new Date('January 1, 1990 00:00:00 UTC');
     * var leapSecond = new Cesium.LeapSecond(Cesium.JulianDate.fromDate(date), 25.0);
     * var offset = leapSecond.offset;    // 25.0
     *
     * @example
     * // Example 2. Construct a LeapSecond using a date string
     * var date = 'January 1, 1990 00:00:00 UTC';
     * var leapSecond = new LeapSecond(date, 25.0);
     */
    var LeapSecond = function(date, offset) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(date)) {
            throw new DeveloperError('date is required.');
        }
        if (offset === null || isNaN(offset)) {
            throw new DeveloperError('offset is required and must be a number.');
        }
        //>>includeEnd('debug');

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

    defineProperties(LeapSecond, {
        /**
         * The list of leap seconds used throughout Cesium.
         * @memberof LeapSecond
         * @type {LeapSecond[]}
         */
        leapSeconds: {
            get: function() {
                return LeapSecond._leapSeconds;
            },
            set: function(leapSeconds) {
                //>>includeStart('debug', pragmas.debug);
                if (!isArray(leapSeconds)) {
                    throw new DeveloperError("leapSeconds is required and must be an array.");
                }
                //>>includeEnd('debug');

                LeapSecond._leapSeconds = leapSeconds;
                LeapSecond._leapSeconds.sort(LeapSecond.compareLeapSecondDate);
            }
        }
    });

    /**
     * Checks whether two leap seconds are equivalent to each other.
     *
     * @param {LeapSecond} other The leap second to compare against.
     * @returns {Boolean} <code>true</code> if the leap seconds are equal; otherwise, <code>false</code>.
     *
     * @example
     * var date = new Date('January 1, 1990 00:00:00 UTC');
     * var leapSecond1 = new Cesium.LeapSecond(Cesium.JulianDate.fromDate(date), 25.0);
     * var leapSecond2 = new Cesium.LeapSecond(Cesium.JulianDate.fromDate(date), 25.0);
     * leapSecond1.equals(leapSecond2);     // true
     */
    LeapSecond.prototype.equals = function(other) {
        return this.julianDate.equals(other.julianDate) && (this.offset === other.offset);
    };

    /**
     * Given two leap seconds, determines which comes before the other by comparing
     * their respective Julian dates.
     *
     * @param {LeapSecond} leapSecond1 The first leap second to be compared.
     * @param {LeapSecond} leapSecond2 The second leap second to be compared.
     * @returns {Number} A negative value if the first leap second is earlier than the second,
     *                  a positive value if the first leap second is later than the second, or
     *                  zero if the two leap seconds are equal (ignoring their offsets).
     *
     * @see JulianDate#lessThan
     * @see JulianDate#isAfter
     *
     * @example
     * var date = new Date('January 1, 2006 00:00:00 UTC');
     * var leapSecond1 = new Cesium.LeapSecond(Cesium.JulianDate.fromDate(date), 33.0);
     * var leapSecond2 = new Cesium.LeapSecond(Cesium.JulianDate.fromDate(date), 34.0);
     * Cesium.LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond2);    // returns 0
     */
    LeapSecond.compareLeapSecondDate = function(leapSecond1, leapSecond2) {
        return leapSecond1.julianDate.compareTo(leapSecond2.julianDate);
    };

    LeapSecond._leapSeconds = [];

    return LeapSecond;
});