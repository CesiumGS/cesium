/*global define*/
define(['require', './DeveloperError', './binarySearch', './LeapSecond'], function(require, DeveloperError, binarySearch, LeapSecond) {
    "use strict";

    var JulianDate = function(a, b, c) {
        //because of the circular reference between JulianDate and TimeStandard,
        //we need to require JulianDate later and replace our reference
        JulianDate = require('./JulianDate');
        return new JulianDate(a, b, c);
    };

    /**
     * Provides a means for measuring time by specifying the rate at which time passes and/or
     * points in time. Note that for many operations, an arithmetically safe standard (such as TAI)
     * should be used in order to correctly compare times. Additionally, functions to convert between
     * time standards and other supplemental functions are provided.
     *
     * @exports TimeStandard
     *
     * @see JulianDate
     * @see LeapSecond
     */
    var TimeStandard = {
        /**
         * Represents the coordinated Universal Time (UTC) time standard.
         *
         * UTC is related to TAI according to the relationship
         * <code>UTC = TAI - deltaT</code> where <code>deltaT</code> is the number of leap
         * seconds which have been introduced as of the time in TAI.
         *
         */
        UTC : 0,

        /**
         * Represents the International Atomic Time (TAI) time standard.
         * TAI is the principal time standard to which the other time standards are related.
         */
        TAI : 1,

        /**
         * Determines if the provided value is a valid TimeStandard.
         *
         * @param {Object} [timeStandard] The value to be checked.
         *
         * @return {Boolean} <code>true</code> if the provided value is a valid <code>TimeStandard</code>.
         *
         */
        isKnownStandard : function(timeStandard) {
            return (timeStandard === TimeStandard.UTC) || (timeStandard === TimeStandard.TAI);
        },

        /**
         * If the julian date is already in the UTC time standard, it is returned.
         *
         * @param {JulianDate} julianDate The date, in TAI time standard, to convert to the UTC time standard.
         *
         * @exception {DeveloperError} <code>julianDate</code> is required.
         * @exception {DeveloperError} <code>julianDate</code> is not in the TAI time standard.
         *
         * @return {JulianDate} A Julian date representing the input date in the UTC time standard,
         *                      or <code>undefined</code> if the requested date is during the moment of a leap second.
         *
         * @performance Expected <code>O(log n)</code>, where <code>n</code> is the number of elements
         * in the list of existing leap seconds returned by {@link LeapSecond.getLeapSeconds}.
         *
         * @example
         * // Convert a date representing Jan. 1, 2000 12:00:00 TAI to UTC.
         * var julianDateTai = JulianDate.fromTotalDays(2451545.0, TimeStandard.TAI);
         * var julianDateUtc = TimeStandard.convertTaiToUtc(julianDateTai);
         *
         */
        convertTaiToUtc : function(julianDate) {
            if (!julianDate) {
                throw new DeveloperError('julianDate is required.');
            }
            if (julianDate.getTimeStandard() === TimeStandard.UTC) {
                return julianDate;
            }
            if (julianDate.getTimeStandard() !== TimeStandard.TAI) {
                throw new DeveloperError('julianDate is not in the TAI time standard.');
            }

            // treat the request date as if it were UTC, and search for the most recent leap second.
            var toFind = new LeapSecond(julianDate, 0.0);
            var leapSeconds = LeapSecond.getLeapSeconds();
            var index = binarySearch(leapSeconds, toFind, LeapSecond.compareLeapSecondDate);
            if (index < 0) {
                index = ~index;
                --index;
            }
            var leapSecond;
            var newDate;
            // now we have the index of the most recent leap second that is after the requested date.
            if (index >= 0) {
                leapSecond = leapSeconds[index];
                var mostRecentOffset = leapSecond.offset;
                var leapSecondDate = leapSecond.julianDate;

                if (julianDate.getJulianDayNumber() === leapSecondDate.getJulianDayNumber()) {
                    // if the requested date is on the day of the leap second, we may have to adjust
                    var secondsSinceLeapSecond = julianDate.getSecondsOfDay() - leapSecondDate.getSecondsOfDay();
                    if (secondsSinceLeapSecond >= mostRecentOffset - 1 && secondsSinceLeapSecond < mostRecentOffset) {
                        // if the requested date is during the moment of a leap second, then we cannot convert to UTC
                        return undefined;
                    }

                    if (secondsSinceLeapSecond < mostRecentOffset) {
                        // The leap second we found is actually after the desired date, as a result of simply treating
                        // the TAI date as if it were UTC. So, use the previous leap second instead.
                        --index;
                    }
                }
                newDate = julianDate.addSeconds(-leapSeconds[index].offset);
            } else {
                newDate = julianDate.addSeconds(-leapSeconds[0].offset);
            }
            return new JulianDate(newDate.getJulianDayNumber(), newDate.getSecondsOfDay(), TimeStandard.UTC);
        },

        /**
         * If the julian date is already in the TAI time standard, it is returned.
         *
         * @param {JulianDate} julianDate The date, in the UTC time standard, to convert to the TAI time standard.
         *
         * @exception {DeveloperError} <code>julianDate</code> is required.
         * @exception {DeveloperError} <code>julianDate</code> is not in the UTC time standard.
         *
         * @return {JulianDate} A Julian date representing the input date in the TAI time standard.
         *
         * @example
         * var date = new Date('July 11, 2011 12:00:00 UTC');
         * var julianDateUtc = JulianDate.fromDate(date, TimeStandard.UTC);
         * var julianDateTai = TimeStandard.convertUtcToTai(julianDateUtc);
         */
        convertUtcToTai : function(julianDate) {
            if (!julianDate) {
                throw new DeveloperError('julianDate is required.');
            }
            if (julianDate.getTimeStandard() === TimeStandard.TAI) {
                return julianDate;
            }
            if (julianDate.getTimeStandard() !== TimeStandard.UTC) {
                throw new DeveloperError('julianDate is not in the UTC time standard.');
            }

            var newDate = julianDate.addSeconds(julianDate.getTaiMinusUtc());
            return new JulianDate(newDate.getJulianDayNumber(), newDate.getSecondsOfDay(), TimeStandard.TAI);
        }
    };

    return TimeStandard;
});