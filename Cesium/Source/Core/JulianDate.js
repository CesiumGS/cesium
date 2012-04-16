/*global define*/
define([
        './DeveloperError',
        './binarySearch',
        './TimeConstants',
        './LeapSecond',
        './TimeStandard'
    ],function(
        DeveloperError,
        binarySearch,
        TimeConstants,
        LeapSecond,
        TimeStandard) {
    "use strict";

    function computeJulianDayNumber(month, day, year) {
        // Algorithm from page 604 of the Explanatory Supplement to the
        // Astronomical Almanac (Seidelmann 1992).
        month = month | 0;
        day = day | 0;
        year = year | 0;

        var a = ((month - 14) / 12) | 0;
        var b = (year + 4800 + a) | 0;

        return ((((1461 * b) / 4) | 0) + (((367 * (month - 2 - 12 * a)) / 12) | 0) - (((3 * ((b + 100) / 100)) / 4) | 0) + day - 32075) | 0;
    }

    function computeJulianSecondsOfDay(hour, minute, second, millisecond) {
        hour = hour | 0;
        minute = minute | 0;
        second = second | 0;
        millisecond = millisecond | 0;

        // JulianDates are noon-based
        hour = hour - 12;
        if (hour < 0) {
            hour += 24;
        }

        return second + ((hour * TimeConstants.SECONDS_PER_HOUR) + (minute * TimeConstants.SECONDS_PER_MINUTE) + (millisecond * TimeConstants.SECONDS_PER_MILLISECOND));
    }

    /**
     * Creates an immutable JulianDate instance from a Javascript Date object. Alternately, a JulianDate
     * may be constructed by passing a Julian day number and the number of seconds elapsed into that day
     * as arguments (along with an optional time standard).
     *
     * An astronomical Julian Date is the number of days since noon on January 1, -4712 (4713 BC).
     * For increased precision, this class stores the whole number part of the date and the seconds
     * part of the date in separate components.
     *
     * This type assumes that days always have TimeConstants.SECONDS_PER_DAY (86400.0) seconds.
     * When using a JulianDate with the (UTC) time standard, a day with a leap second actually
     * has 86401.0 seconds.  The end result is that JulianDate cannot represent the moment of a
     * leap second with the UTC time standard. However, it can represent the moment of a leap second in the
     * International Atomic Time standard {@link TimeStandard.TAI}.  Also, subtracting
     * two UTC dates that are on opposite sides of a leap second will correctly take the leap second into
     * account.
     * <br/>
     * While the Javascript Date object defaults to the system's local time zone, the Julian date is computed
     * using the UTC values.
     *
     * @name JulianDate
     * @constructor
     * @immutable
     *
     * @param {Date} [date] The Javascript Date object representing the time to be converted to a Julian date.
     * @param {TimeStandard} [timeStandard = TimeStandard.UTC] Indicates the time standard
     * in which this Julian date is represented.
     *
     * @see JulianDate.createJulianDate
     * @see TimeStandard
     * @see LeapSecond
     * @see <a href="http://www.w3schools.com/js/js_obj_date.asp">Javascript Date Object on w3schools</a>.
     * @see <a href="http://www.w3schools.com/jsref/jsref_obj_date.asp">Javascript Date Object Reference on w3schools</a>.
     *
     * @example
     * // Example 1. Construct a Julian date at the current time.
     * var jd = new JulianDate(); // Same as new JulianDate(new Date());
     * var julianDate = jd.getJulianDate();
     *
     * //////////////////////////////////////////////////////////////////
     *
     * // Example 2. Construct a Julian date specifying the UTC time standard
     * var date = new Date("January 1, 2011 12:00:00 EST");
     * var jd = new JulianDate(date, TimeStandard.UTC);
     *
     * //////////////////////////////////////////////////////////////////
     *
     * // Example 3. Construct a Julian date from a Julian day number and seconds of the day.
     * var julianDayNumber = 2448257;   // January 1, 1991
     * var secondsOfDay = 21600;        // 06:00:00
     * var jd = new JulianDate(julianDayNumber, secondsOfDay, TimeStandard.UTC);
     */
    function JulianDate(date) {
        var julianDayNumber;
        var julianSecondsOfDay;
        var timeStandard;

        date = date || new Date();

        if (typeof date === 'number') {
            julianDayNumber = arguments[0];
            julianSecondsOfDay = arguments[1];
            timeStandard = arguments[2];
        } else if (typeof date === 'object') {
            var month = date.getUTCMonth() + 1; // getUTCMonth returns a value 0-11.
            var day = date.getUTCDate();
            var year = date.getUTCFullYear();

            var hours = date.getUTCHours();
            var minutes = date.getUTCMinutes();
            var seconds = date.getUTCSeconds();
            var milliseconds = date.getUTCMilliseconds();

            julianDayNumber = computeJulianDayNumber(month, day, year);
            julianSecondsOfDay = computeJulianSecondsOfDay(hours, minutes, seconds, milliseconds);
            if (julianSecondsOfDay >= 43200.0) {
                julianDayNumber -= 1;
            }
            timeStandard = arguments[1];

            this._date = date;
        }

        // Normalize so that the number of seconds is >= 0 and < a day.
        var wholeDays = (julianSecondsOfDay / TimeConstants.SECONDS_PER_DAY) | 0;
        julianDayNumber += wholeDays;
        julianSecondsOfDay -= TimeConstants.SECONDS_PER_DAY * wholeDays;

        if (julianSecondsOfDay < 0) {
            julianDayNumber--;
            julianSecondsOfDay += TimeConstants.SECONDS_PER_DAY;
        }

        this._timeStandard = timeStandard || TimeStandard.UTC;
        this._julianDayNumber = julianDayNumber;
        this._secondsOfDay = julianSecondsOfDay;
    }

    /**
     * Creates an immutable JulianDate instance from a floating point number representing a Julian date.
     *
     * @memberof JulianDate
     *
     * @param {Number} date
     * @param {TimeStandard} [timeStandard = TimeStandard.UTC] Indicates the time standard
     * in which this Julian date is represented.
     *
     * @exception {DeveloperError} <code>date</code> is required.
     * @exception {DeveloperError} <code>date</code> must be non-negative.
     *
     * @see JulianDate
     * @see TimeStandard
     *
     * @example
     * // Construct a Julian date corresponding to January 1, 1991 06:00:00 UTC.
     * var julianDate = JulianDate.createJulianDate(2448257.75, TimeStandard.UTC);
     */
    JulianDate.createJulianDate = function(date, timeStandard) {
        if (typeof date === 'undefined' || date === null) {
            throw new DeveloperError("date is required.", "date");
        }

        if (date < 0) {
            throw new DeveloperError("Julian date must be non-negative", "date");
        }

        var julianDayNumber = date | 0;
        var secondsOfDay = (date - julianDayNumber) * TimeConstants.SECONDS_PER_DAY;
        return new JulianDate(julianDayNumber, secondsOfDay, timeStandard);
    };

    /**
     * Compares two {JulianDate} instances.
     *
     * @memberof JulianDate
     *
     * @param {JulianDate} a The first instance.
     * @param {JulianDate} b The second instance.
     * @return {Number} A negative value if a is less than b, a positive value if
     *                   a is greater than b, and zero if a and b are equal.
     */
    JulianDate.compare = function(a, b) {
        // If the days aren't even close, don't bother thinking about the time standard.
        var dayDifference = (a._julianDayNumber - b._julianDayNumber) | 0;
        if (dayDifference > 1 || dayDifference < -1) {
            return dayDifference;
        }

        if (a.getTimeStandard() !== TimeStandard.TAI) {
            a = TimeStandard.convertUtcToTai(a);
        }
        if (b.getTimeStandard() !== TimeStandard.TAI) {
            b = TimeStandard.convertUtcToTai(b);
        }

        if (dayDifference !== 0) {
            return dayDifference;
        }

        return a._secondsOfDay - b._secondsOfDay;
    };

    /**
     * Returns the time standard used to construct this JulianDate.
     *
     * @memberof JulianDate
     *
     * @return The property of {@Link TimeStandard} representing the correct time standard.
     *
     * @see TimeStandard
     */
    JulianDate.prototype.getTimeStandard = function() {
        return this._timeStandard;
    };

    /**
     * Returns the total number of whole and fractional days represented by this astronomical Julian date.
     *
     * @memberof JulianDate
     *
     * @return {Number} The Julian date as single floating point number.
     *
     * @see JulianDate#getJulianDayNumber
     * @see JulianDate#getJulianTimeFraction
     */
    JulianDate.prototype.getJulianDate = function() {
        if (!this._julianDate) {
            this._julianDate = this._julianDayNumber + (this._secondsOfDay / TimeConstants.SECONDS_PER_DAY);
        }
        return this._julianDate;
    };

    /**
     * Returns the whole number component of the Julian date.
     *
     * @memberof JulianDate
     *
     * @return {Number} A whole number representing the Julian day number.
     *
     * @see JulianDate#getJulianDate
     * @see JulianDate#getJulianTimeFraction
     */
    JulianDate.prototype.getJulianDayNumber = function() {
        return this._julianDayNumber;
    };

    /**
     * Returns the floating point component of the Julian date representing the time of day.
     *
     * @memberof JulianDate
     *
     * @return {Number} The floating point component of the Julian date representing the time of day.
     *
     * @see JulianDate#getJulianDate
     * @see JulianDate#getJulianDayNumber
     */
    JulianDate.prototype.getJulianTimeFraction = function() {
        if (!this._julianTimeFraction) {
            this._julianTimeFraction = this._secondsOfDay / TimeConstants.SECONDS_PER_DAY;
        }
        return this._julianTimeFraction;
    };

    /**
     * Return the number of seconds elapsed into the current Julian day (starting at noon).
     *
     * @memberof JulianDate
     *
     * @return {Number} The number of seconds elapsed into the current day.
     *
     * @see JulianDate#getJulianDayNumber
     */
    JulianDate.prototype.getSecondsOfDay = function() {
        return this._secondsOfDay;
    };

    /**
     * Returns a Javascript Date object equivalent to the Julian date
     * (accurate to the nearest second in the UTC time standard).
     *
     * @memberof JulianDate
     *
     * @return {Date} The Javascript Date equivalent to this Julian date.
     */
    JulianDate.prototype.getDate = function() {
        if (!this._date) {
            var julianDayNumber = this._julianDayNumber;
            var secondsOfDay = this._secondsOfDay;
            if (this._timeStandard === TimeStandard.TAI) {
                var julianDateTai = TimeStandard.convertTaiToUtc(this);
                julianDayNumber = julianDateTai._julianDayNumber;
                secondsOfDay = julianDateTai._secondsOfDay;
            }
            if (secondsOfDay >= 43200.0) {
                julianDayNumber += 1;
            }

            // Algorithm from page 604 of the Explanatory Supplement to the
            // Astronomical Almanac (Seidelmann 1992).
            var L = (julianDayNumber + 68569) | 0;
            var N = (4 * L / 146097) | 0;
            L = (L - (((146097 * N + 3) / 4) | 0)) | 0;
            var I = ((4000 * (L + 1)) / 1461001) | 0;
            L = (L - (((1461 * I) / 4) | 0) + 31) | 0;
            var J = ((80 * L) / 2447) | 0;
            var day = (L - (((2447 * J) / 80) | 0)) | 0;
            L = (J / 11) | 0;
            var month = (J + 2 - 12 * L) | 0;
            var year = (100 * (N - 49) + I + L) | 0;

            month--; // month field is zero-indexed

            var hours = (secondsOfDay / TimeConstants.SECONDS_PER_HOUR) | 0;
            var remainingSeconds = secondsOfDay - (hours * TimeConstants.SECONDS_PER_HOUR);
            var minutes = (remainingSeconds / TimeConstants.SECONDS_PER_MINUTE) | 0;
            remainingSeconds = remainingSeconds - (minutes * TimeConstants.SECONDS_PER_MINUTE);
            var seconds = remainingSeconds | 0;
            var milliseconds = ((remainingSeconds - seconds) / TimeConstants.SECONDS_PER_MILLISECOND) | 0;

            // JulianDates are noon-based
            hours += 12;
            if (hours > 23) {
                hours -= 24;
            }

            this._date = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
        }
        return this._date;
    };

    /**
     * Computes the number of seconds that have elapsed from this Julian date to the <code>other</code>
     * Julian date, taking leap seconds into account.
     *
     * @memberof JulianDate
     *
     * @param {JulianDate} other The other Julian date, which is the end of the interval.
     *
     * @return {Number} The number of seconds that have elpased from this Julian date to the other Julian date.
     *
     * @see JulianDate#getMinutesDifference
     *
     * @example
     * var start = new JulianDate(new Date("July 4, 2011 12:00:00"));
     * var end = new JulianDate(new Date("July 5, 2011 12:01:00"));
     * var difference = start.getSecondsDifference(end);    // 86460.0 seconds
     */
    JulianDate.prototype.getSecondsDifference = function(other) {
        // If not already, convert the dates to the TAI standard, which is safe for arithmetic.
        var julianDate1 = this;
        var julianDate2 = other;
        if (julianDate1.getTimeStandard() !== TimeStandard.TAI) {
            julianDate1 = TimeStandard.convertUtcToTai(julianDate1);
        }
        if (julianDate2.getTimeStandard() !== TimeStandard.TAI) {
            julianDate2 = TimeStandard.convertUtcToTai(julianDate2);
        }

        var dayDifference = (julianDate2.getJulianDayNumber() - julianDate1.getJulianDayNumber()) * TimeConstants.SECONDS_PER_DAY;
        return (dayDifference + (julianDate2.getSecondsOfDay() - julianDate1.getSecondsOfDay()));
    };

    /**
     * Computes the number of minutes that have elapsed from this Julian date to the <code>other</code>
     * Julian date, taking leap seconds into account.
     *
     * @memberof JulianDate
     *
     * @param {JulianDate} other The other Julian date, which is the end of the interval.
     *
     * @return {Number} The number of seconds that have elpased from this Julian date to the other Julian date.
     *
     * @see JulianDate#getSecondsDifference
     *
     * @example
     * var start = new JulianDate(new Date("July 4, 2011 12:00:00"));
     * var end = new JulianDate(new Date("July 5, 2011 12:01:00"));
     * var difference = start.getMinutesDifference(end);    // 1441.0 minutes
     */
    JulianDate.prototype.getMinutesDifference = function(other) {
        // If not already, convert the dates to the TAI standard, which is safe for arithmetic.
        var julianDate1 = this;
        var julianDate2 = other;
        if (julianDate1.getTimeStandard() !== TimeStandard.TAI) {
            julianDate1 = TimeStandard.convertUtcToTai(julianDate1);
        }
        if (julianDate2.getTimeStandard() !== TimeStandard.TAI) {
            julianDate2 = TimeStandard.convertUtcToTai(julianDate2);
        }

        var dayDifference = (julianDate2.getJulianDayNumber() - julianDate1.getJulianDayNumber()) * TimeConstants.MINUTES_PER_DAY;
        var timeDifference = (julianDate2.getSecondsOfDay() - julianDate1.getSecondsOfDay()) / TimeConstants.SECONDS_PER_MINUTE;
        return (dayDifference + timeDifference);
    };

    /**
     * Returns the difference in seconds between the TAI and UTC time standards
     * for this Julian date.
     *
     * @memberof JulianDate
     *
     * @return {Number} The difference in seconds between the TAI and UTC time standards for this date.
     *
     * @performance Expected <code>O(log n)</code>, where <code>n</code> is the number of elements
     * in the list of existing leap seconds returned by {@link LeapSecond.getLeapSeconds}.
     *
     * @see LeapSecond
     * @see TimeStandard
     *
     * @example
     * var date = new Date("July 11, 2011 12:00:00 UTC");
     * var jd = new JulianDate(date, TimeStandard.TAI);
     * var difference = jd.getTaiMinusUtc();    // 34
     */
    JulianDate.prototype.getTaiMinusUtc = function() {
        // Start by assuming we're working with UTC. We'll check
        // later if we're off by one because we really have TAI.
        var toFind = new LeapSecond(this, 0.0);
        var leapSeconds = LeapSecond.getLeapSeconds();
        var index = binarySearch(leapSeconds, toFind, LeapSecond.compareLeapSecondDate);
        if (index < 0) {
            index = ~index;
            --index;
        }
        // Check if we're off by one because we're really working with TAI.
        // If the requested date minus the most recent previous leap second offset is less than the date
        // for the current leap second, then we haven't quite gotten to that leap second yet.
        if (this.getTimeStandard() === TimeStandard.TAI) {
            var lastDate;
            var indexOffset;
            if (index < 0 || index >= leapSeconds.length) {
                // Corresponds to a the Julian Date 0.0
                var beginning = new Date(Date.UTC(-4712, 0, -37, 12, 0, 0, 0));
                lastDate = new JulianDate(beginning, TimeStandard.UTC);
                indexOffset = 10.0;
            } else {
                lastDate = leapSeconds[index].julianDate;
                indexOffset = leapSeconds[index].offset;
            }
            var taiCutoff = new JulianDate(lastDate.getJulianDayNumber(), lastDate.getSecondsOfDay());
            taiCutoff = taiCutoff.addSeconds(indexOffset);
            if (this.isBefore(taiCutoff)) {
                --index;
            }
        }

        if (index < 0) {
            return 10.0;
        }
        return LeapSecond.getLeapSeconds()[index].offset;
    };

    /**
     * Returns a new Julian date representing a time <code>duration</code> seconds later
     * (or earlier in the case of a negative amount).
     *
     * @memberof JulianDate
     *
     * @param {Number} duration An integer number of seconds to add or subtract.
     *
     * @return {JulianDate} A new Julian date object
     *
     * @see JulianDate#addMinutes
     * @see JulianDate#addHours
     * @see JulianDate#addDays
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00:00 UTC
     * date.setUTCHours(12, 0, 00, 0);
     * var start = new JulianDate(date);
     * var end = start.addSeconds(95);      // July 4, 2011 @ 12:01:35 UTC
     */
    JulianDate.prototype.addSeconds = function(duration) {
        var newSecondsOfDay = this._secondsOfDay + duration;
        return new JulianDate(this._julianDayNumber, newSecondsOfDay, this._timeStandard);
    };

    /**
     * Returns a new Julian date representing a time <code>duration</code> minutes later
     * (or earlier in the case of a negative amount).
     *
     * @memberof JulianDate
     *
     * @param {Number} duration An integer number of minutes to add or subtract.
     *
     * @return {JulianDate} A new Julian date object
     *
     * @see JulianDate#addSeconds
     * @see JulianDate#addHours
     * @see JulianDate#addDays
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = new JulianDate(date);
     * var end = start.addMinutes(65);      // July 4, 2011 @ 13:05 UTC
     */
    JulianDate.prototype.addMinutes = function(duration) {
        var newSecondsOfDay = this._secondsOfDay + (duration * TimeConstants.SECONDS_PER_MINUTE);
        return new JulianDate(this._julianDayNumber, newSecondsOfDay, this._timeStandard);
    };

    /**
     * Returns a new Julian date representing a time <code>duration</code> hours later
     * (or earlier in the case of a negative amount).
     *
     * @memberof JulianDate
     *
     * @param {Number} duration An integer number of hours to add or subtract.
     *
     * @return {JulianDate} A new Julian date object
     *
     * @see JulianDate#addSeconds
     * @see JulianDate#addMinutes
     * @see JulianDate#addDays
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = new JulianDate(date);
     * var end = start.addHours(6);         // July 4, 2011 @ 18:00 UTC
     */
    JulianDate.prototype.addHours = function(duration) {
        var newSecondsOfDay = this._secondsOfDay + (duration * TimeConstants.SECONDS_PER_HOUR);
        return new JulianDate(this._julianDayNumber, newSecondsOfDay, this._timeStandard);
    };

    /**
     * Returns a new Julian date representing a time <code>duration</code> days later
     * (or earlier in the case of a negative amount).
     *
     * @memberof JulianDate
     *
     * @param {Number} duration An integer number of days to add or subtract.
     *
     * @return {JulianDate} A new Julian date object
     *
     * @see JulianDate#addSeconds
     * @see JulianDate#addMinutes
     * @see JulianDate#addHours
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = new JulianDate(date);
     * var end = start.addDays(5);         // July 9, 2011 @ 12:00 UTC
     */
    JulianDate.prototype.addDays = function(duration) {
        var newJulianDayNumber = this._julianDayNumber + duration;
        return new JulianDate(newJulianDayNumber, this._secondsOfDay, this._timeStandard);
    };

    /**
     * Computes the fraction of the year corresponding to this Julian date. Leap years
     * are taken into account.
     *
     * @memberof JulianDate
     *
     * @return {Number} The fraction of the current year that has passed.
     *
     * @example
     * var date = new Date(2011, 0, 2); // January 2, 2011 @ 0:00
     * date.setUTCHours(0, 0, 0, 0);
     * var julianDate = new JulianDate(date);
     * var yearFraction = julianDate.toYearFraction(); //1.0/365.0
     */
    JulianDate.prototype.toYearFraction = function() {
        var commonYearCumulativeMonthTable = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        var leapYearCumulativeMonthTable = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
        var dayInYear;
        var fractionOfDay;

        function isLeapYear(year) {
            return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
        }

        function dayOfYear(date) {
            var day = date.getDate();
            var month = date.getMonth();
            if (isLeapYear(date.getFullYear())) {
                return day + leapYearCumulativeMonthTable[month];
            }
            return day + commonYearCumulativeMonthTable[month];
        }

        var date = this._date;
        if (this._secondsOfDay / TimeConstants.SECONDS_PER_DAY < 0.5) {
            dayInYear = dayOfYear(date) - 1;
            fractionOfDay = (this._secondsOfDay / TimeConstants.SECONDS_PER_DAY) + 0.5;
        } else {
            date.setDate(date.getDate() + 1);
            dayInYear = dayOfYear(date) - 1;
            fractionOfDay = (this._secondsOfDay / TimeConstants.SECONDS_PER_DAY) - 0.5;
        }

        if (isLeapYear(date.getFullYear())) {
            return (dayInYear + fractionOfDay) / 366.0;
        }

        return (dayInYear + fractionOfDay) / 365.0;
    };

    /**
     * Returns true if <code>other</code> occurs after this Julian date.
     *
     * @memberof JulianDate
     *
     * @param {JulianDate} other The Julian date to be compared.
     *
     * @return {Boolean} <code>true</code> if this JulianDate is chronologically earlier than <code>other</code>; otherwise, <code>false</code>.
     *
     * @see JulianDate#isAfter
     *
     * @example
     * var start = new JulianDate(new Date("July 6, 1991 12:00:00"));
     * var end = new JulianDate(new Date("July 6, 2011 12:01:00"));
     * start.isBefore(end);     // true
     */
    JulianDate.prototype.isBefore = function(other) {
        return JulianDate.compare(this, other) < 0;
    };

    /**
     * Returns true if <code>other</code> occurs before this Julian date.
     *
     * @memberof JulianDate
     *
     * @param {JulianDate} other The Julian date to be compared.
     *
     * @return {Boolean} <code>true</code> if this JulianDate is chronologically later than <code>other</code>; otherwise, <code>false</code>.
     *
     * @see JulianDate#isBefore
     *
     * @example
     * var start = new JulianDate(new Date("July 6, 1991 12:00:00"));
     * var end = new JulianDate(new Date("July 6, 2011 12:01:00"));
     * end.isAfter(start);      // true
     */
    JulianDate.prototype.isAfter = function(other) {
        return JulianDate.compare(this, other) > 0;
    };

    /**
     * Returns <code>true</code> if this date is equivalent to the specified date.
     *
     * @memberof JulianDate
     *
     * @param {JulianDate} other The JulianDate to be compared.
     * @param {Number} epsilon The number of seconds that should separate the two JulianDates
     *
     * @return {Boolean} <code>true</code> if the two JulianDates are equal; otherwise <code>false</code>.
     *
     * @see JulianDate#equalsEpsilon
     *
     * @example
     * var original = new JulianDate(new Date("July 4, 2011 12:00:00"));
     * var clone = new JulianDate(new Date("July 4, 2011 12:00:00"));
     * original.equals(clone);      // true
     */
    JulianDate.prototype.equals = function(other) {
        return JulianDate.compare(this, other) === 0;
    };

    /**
     * Returns <code>true</code> if this date is within <code>epsilon</code> seconds of the
     * specified date.  That is, in order for the dates to be considered equal (and for
     * this function to return <code>true</code>), the absolute value of the difference between them, in
     * seconds, must be less than <code>epsilon</code>.
     *
     * @memberof JulianDate
     *
     * @param {JulianDate} other The JulianDate to be compared.
     * @param {Number} epsilon The number of seconds that should separate the two JulianDates
     *
     * @return {Boolean} <code>true</code> if the two JulianDates are within <code>epsilon</code> seconds of each other; otherwise <code>false</code>.
     *
     * @see JulianDate#equals
     *
     * @example
     * var original = new JulianDate(new Date("July 4, 2011 12:00:00"));
     * var clone = new JulianDate(new Date("July 4, 2011 12:00:01"));
     * original.equalsEpsilon(clone, 2);    // true
     */
    JulianDate.prototype.equalsEpsilon = function(other, epsilon) {
        return Math.abs(this.getSecondsDifference(other)) <= epsilon;
    };

    return JulianDate;
});