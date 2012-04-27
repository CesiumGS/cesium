/*global define*/
define(['./DeveloperError', './binarySearch', './TimeConstants', './LeapSecond', './TimeStandard'], function(DeveloperError, binarySearch, TimeConstants, LeapSecond, TimeStandard) {
    "use strict";

    function computeJulianDateComponents(date) {
        // Algorithm from page 604 of the Explanatory Supplement to the
        // Astronomical Almanac (Seidelmann 1992).

        var month = date.getUTCMonth() + 1; // getUTCMonth returns a value 0-11.
        var day = date.getUTCDate();
        var year = date.getUTCFullYear();

        var a = ((month - 14) / 12) | 0;
        var b = (year + 4800 + a) | 0;

        var dayNumber = ((((1461 * b) / 4) | 0) + (((367 * (month - 2 - 12 * a)) / 12) | 0) - (((3 * ((b + 100) / 100)) / 4) | 0) + day - 32075) | 0;

        var hour = date.getUTCHours();
        var minute = date.getUTCMinutes();
        var second = date.getUTCSeconds();
        var millisecond = date.getUTCMilliseconds();

        // JulianDates are noon-based
        hour = hour - 12;
        if (hour < 0) {
            hour += 24;
        }

        var secondsOfDay = second + ((hour * TimeConstants.SECONDS_PER_HOUR) + (minute * TimeConstants.SECONDS_PER_MINUTE) + (millisecond * TimeConstants.SECONDS_PER_MILLISECOND));

        if (secondsOfDay >= 43200.0) {
            dayNumber -= 1;
        }

        return [dayNumber, secondsOfDay];
    }

    /**
     * <p>Constructs an immutable JulianDate instance from a Julian day number and the number of seconds elapsed
     * into that day as arguments (along with an optional time standard).  Passing no parameters will
     * construct a JulianDate that represents the current system time.</p>
     *
     * <p>An astronomical Julian Date is the number of days since noon on January 1, -4712 (4713 BC).
     * For increased precision, this class stores the whole number part of the date and the seconds
     * part of the date in separate components.</p>
     *
     * <p>This type assumes that days always have TimeConstants.SECONDS_PER_DAY (86400.0) seconds.
     * When using a JulianDate with the (UTC) time standard, a day with a leap second actually
     * has 86401.0 seconds.  The end result is that JulianDate cannot represent the moment of a
     * leap second with the UTC time standard. However, it can represent the moment of a leap second in the
     * International Atomic Time standard {@link TimeStandard.TAI}.  Also, subtracting
     * two UTC dates that are on opposite sides of a leap second will correctly take the leap second into
     * account.</p>
     *
     * @name JulianDate
     * @constructor
     * @immutable
     *
     * @param {Number} julianDayNumber The Julian Day Number representing the number of whole days.  Fractional days will also be handled correctly.
     * @param {Number} julianSecondsOfDay The number of seconds into the current Julian Day Number.
     * @param {TimeStandard} [timeStandard = TimeStandard.UTC] Indicates the time standard in which this Julian date is represented.
     *
     * @see JulianDate.createFromDate
     * @see JulianDate.createFromTotalDays
     * @see JulianDate.createFromIso8601
     * @see TimeStandard
     * @see LeapSecond
     *
     * @example
     * // Example 1. Construct a Julian date representing the current system time.
     * var julianDate = new JulianDate();
     *
     * // Example 2. Construct a Julian date from a Julian day number and seconds of the day.
     * var julianDayNumber = 2448257;   // January 1, 1991
     * var secondsOfDay = 21600;        // 06:00:00
     * var julianDate = new JulianDate(julianDayNumber, secondsOfDay, TimeStandard.UTC);
     */
    function JulianDate(julianDayNumber, julianSecondsOfDay, timeStandard) {
        var wholeDays, secondsOfDay;

        //If any of the properties are defined, then we are constructing from components.
        if (typeof julianDayNumber !== 'undefined' || typeof julianSecondsOfDay !== 'undefined' || typeof timeStandard !== 'undefined') {
            if (typeof timeStandard === 'undefined') {
                //use UTC if not supplied
                timeStandard = TimeStandard.UTC;
            } else if (!TimeStandard.isKnownStandard(timeStandard)) {
                throw new DeveloperError("Invalid TimeStandard.", "timeStandard");
            }

            if (julianDayNumber === null || isNaN(julianDayNumber)) {
                throw new DeveloperError("Number required.", "julianDayNumber");
            }

            if (julianSecondsOfDay === null || isNaN(julianSecondsOfDay)) {
                throw new DeveloperError("Number required.", "julianSecondsOfDay");
            }

            //coerce to integer
            wholeDays = julianDayNumber | 0;
            //If julianDayNumber was fractional, add the number of seconds the fraction represented
            secondsOfDay = julianSecondsOfDay + (julianDayNumber - wholeDays) * TimeConstants.SECONDS_PER_DAY;
        } else {
            //Create a new date from the current time.
            var date = new Date();
            var components = computeJulianDateComponents(date);
            wholeDays = components[0];
            secondsOfDay = components[1];
            timeStandard = TimeStandard.UTC;
            this._date = date;
        }

        // Normalize so that the number of seconds is >= 0 and < a day.
        var extraDays = (secondsOfDay / TimeConstants.SECONDS_PER_DAY) | 0;
        wholeDays += extraDays;
        secondsOfDay -= TimeConstants.SECONDS_PER_DAY * extraDays;

        if (secondsOfDay < 0) {
            wholeDays--;
            secondsOfDay += TimeConstants.SECONDS_PER_DAY;
        }

        this._julianDayNumber = wholeDays;
        this._secondsOfDay = secondsOfDay;
        this._timeStandard = timeStandard;
    }

    /**
     * Creates an immutable JulianDate instance from a JavaScript Date object.
     * While the JavaScript Date object defaults to the system's local time zone,
     * the Julian date is computed using the UTC values.
     * <br/>
     *
     * @memberof JulianDate
     *
     * @param {Date} date The JavaScript Date object representing the time to be converted to a Julian date.
     * @param {TimeStandard} [timeStandard = TimeStandard.UTC] Indicates the time standard in which this Julian date is represented.
     *
     * @return {JulianDate} The new {@Link JulianDate} instance.
     *
     * @exception {DeveloperError} Valid JavaScript Date required.
     *
     * @see JulianDate
     * @see JulianDate.createFromTotalDays
     * @see JulianDate.createFromIso8601
     * @see TimeStandard
     * @see LeapSecond
     * @see <a href="http://www.w3schools.com/js/js_obj_date.asp">JavaScript Date Object on w3schools</a>.
     * @see <a href="http://www.w3schools.com/jsref/jsref_obj_date.asp">JavaScript Date Object Reference on w3schools</a>.
     *
     * @example
     * // Construct a Julian date specifying the UTC time standard
     * var date = new Date("January 1, 2011 12:00:00 EST");
     * var julianDate = JulianDate.createFromDate(date, TimeStandard.UTC);
     */
    JulianDate.createFromDate = function(date, timeStandard) {
        if (typeof date === 'undefined' || date === null || isNaN(date.getTime())) {
            throw new DeveloperError("Valid JavaScript Date required.", "date");
        }

        var components = computeJulianDateComponents(date);
        var wholeDays = components[0];
        var secondsOfDay = components[1];
        var result = new JulianDate(wholeDays, secondsOfDay, timeStandard);
        result._date = date;
        return result;
    };

    /**
     * Creates an immutable JulianDate instance from a ISO 8601 date string.
     * <br/>
     *
     * @memberof JulianDate
     *
     * @param {String} iso8601String The ISO 8601 date string representing the time to be converted to a Julian date.
     * @param {TimeStandard} [timeStandard = TimeStandard.UTC] Indicates the time standard in which this Julian date is represented.
     *
     * @return {JulianDate} The new {@Link JulianDate} instance.
     *
     * @exception {DeveloperError} Valid ISO 8601 date string required.
     *
     * @see JulianDate
     * @see JulianDate.createFromTotalDays
     * @see JulianDate.createFromDate
     * @see TimeStandard
     * @see LeapSecond
     * @see <a href="http://en.wikipedia.org/wiki/ISO_8601">ISO 8601 on Wikipedia</a>.
     *
     * @example
     * // Example 1. Construct a Julian date using the default UTC TimeStandard.
     * var julianDate = JulianDate.createFromIso8601("2012-04-24T18:08Z");
     */
    JulianDate.createFromIso8601 = function(iso8601String, timeStandard) {
        //FIXME Date.parse is only accurate to the millisecond and fails
        //completely on leap seconds.  We should parse the string directly.

        var totalMilliseconds = Date.parse(iso8601String);
        if (totalMilliseconds === null || isNaN(totalMilliseconds)) {
            throw new DeveloperError("Valid ISO 8601 date string required.", "iso8601String");
        }
        return JulianDate.createFromDate(new Date(totalMilliseconds), timeStandard);
    };

    /**
     * Creates an immutable JulianDate instance from a single number representing the Julian day and fractional day.
     *
     * @memberof JulianDate
     *
     * @param {Number} totalDays The combined Julian Day Number and fractional day.
     * @param {TimeStandard} [timeStandard = TimeStandard.UTC] Indicates the time standard in which this Julian date is represented.
     *
     * @return {JulianDate} The new {@Link JulianDate} instance.
     *
     * @exception {DeveloperError} Number required.
     *
     * @see JulianDate
     * @see JulianDate.createFromDate
     * @see JulianDate.createFromIso8601
     * @see TimeStandard
     * @see LeapSecond
     *
     * @example
     * // Construct a date which corresponds to January 1, 1991 06:00:00 UTC.
     * var julianDate = JulianDate.createFromTotalDays(2448257.75, TimeStandard.UTC);
     */
    JulianDate.createFromTotalDays = function(totalDays, timeStandard) {
        if (totalDays === null || isNaN(totalDays)) {
            throw new DeveloperError("Number required", "totalDays");
        }
        return new JulianDate(totalDays, 0, timeStandard);
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

        //Recompute dayDifference after changing time standards.
        dayDifference = (a._julianDayNumber - b._julianDayNumber);
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
    JulianDate.prototype.getTotalDays = function() {
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
     * @see JulianDate#getTotalDays
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
     * @see JulianDate#getTotalDays
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
     * Returns a JavaScript Date object equivalent to the Julian date
     * (accurate to the nearest millisecond in the UTC time standard).
     *
     * @memberof JulianDate
     *
     * @return {Date} The JavaScript Date equivalent to this Julian date.
     */
    JulianDate.prototype.getDate = function() {
        if (typeof this._date === 'undefined') {
            var julianDayNumber = this._julianDayNumber;
            var secondsOfDay = this._secondsOfDay;
            if (this._timeStandard === TimeStandard.TAI) {
                var julianDateTai = TimeStandard.convertTaiToUtc(this);

                //If julianDateTai is null, we are at a leap second, which can't be represented in UTC.
                //Since JavaScript has no concept of leap seconds, we add a second to match how Date would represent it.
                if (typeof julianDateTai === 'undefined') {
                    julianDateTai = TimeStandard.convertTaiToUtc(this.addSeconds(1));
                }
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
     * var start = JulianDate.createFromDate(new Date("July 4, 2011 12:00:00"));
     * var end = JulianDate.createFromDate(new Date("July 5, 2011 12:01:00"));
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
     * var start = JulianDate.createFromDate(new Date("July 4, 2011 12:00:00"));
     * var end = JulianDate.createFromDate(new Date("July 5, 2011 12:01:00"));
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
     * var julianDate = JulianDate.createFromDate(date, TimeStandard.TAI);
     * var difference = julianDate.getTaiMinusUtc();    // 34
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
                lastDate = JulianDate.createFromDate(beginning, TimeStandard.UTC);
                indexOffset = 10.0;
            } else {
                lastDate = leapSeconds[index].julianDate;
                indexOffset = leapSeconds[index].offset;
            }
            var taiCutoff = new JulianDate(lastDate.getJulianDayNumber(), lastDate.getSecondsOfDay());
            taiCutoff = taiCutoff.addSeconds(indexOffset);
            if (this.lessThan(taiCutoff)) {
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
     * @exception {DeveloperError} Number required.
     *
     * @see JulianDate#addMinutes
     * @see JulianDate#addHours
     * @see JulianDate#addDays
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00:00 UTC
     * date.setUTCHours(12, 0, 00, 0);
     * var start = JulianDate.createFromDate(date);
     * var end = start.addSeconds(95);      // July 4, 2011 @ 12:01:35 UTC
     */
    JulianDate.prototype.addSeconds = function(duration) {
        if (duration === null || isNaN(duration)) {
            throw new DeveloperError("Number required.", duration);
        }
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
     * @exception {DeveloperError} Number required.
     *
     * @see JulianDate#addSeconds
     * @see JulianDate#addHours
     * @see JulianDate#addDays
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = JulianDate.createFromDate(date);
     * var end = start.addMinutes(65);      // July 4, 2011 @ 13:05 UTC
     */
    JulianDate.prototype.addMinutes = function(duration) {
        if (duration === null || isNaN(duration)) {
            throw new DeveloperError("Number required.", duration);
        }
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
     * @exception {DeveloperError} Number required.
     *
     * @see JulianDate#addSeconds
     * @see JulianDate#addMinutes
     * @see JulianDate#addDays
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = JulianDate.createFromDate(date);
     * var end = start.addHours(6);         // July 4, 2011 @ 18:00 UTC
     */
    JulianDate.prototype.addHours = function(duration) {
        if (duration === null || isNaN(duration)) {
            throw new DeveloperError("Number required.", duration);
        }
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
     * @exception {DeveloperError} Number required.
     *
     * @see JulianDate#addSeconds
     * @see JulianDate#addMinutes
     * @see JulianDate#addHours
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = JulianDate.createFromDate(date);
     * var end = start.addDays(5);         // July 9, 2011 @ 12:00 UTC
     */
    JulianDate.prototype.addDays = function(duration) {
        if (duration === null || isNaN(duration)) {
            throw new DeveloperError("Number required.", duration);
        }
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
     * var julianDate = JulianDate.createFromDate(date);
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

        var date = this.getDate();
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
     * @see JulianDate#lessThanOrEquals
     * @see JulianDate#greaterThan
     * @see JulianDate#greaterThanOrEquals
     *
     * @example
     * var start = JulianDate.createFromDate(new Date("July 6, 1991 12:00:00"));
     * var end = JulianDate.createFromDate(new Date("July 6, 2011 12:01:00"));
     * start.lessThan(end);     // true
     */
    JulianDate.prototype.lessThan = function(other) {
        return JulianDate.compare(this, other) < 0;
    };

    /**
     * Returns true if <code>other</code> occurs at or after this Julian date.
     *
     * @memberof JulianDate
     *
     * @param {JulianDate} other The Julian date to be compared.
     *
     * @return {Boolean} <code>true</code> if this JulianDate is chronologically less than or equal to<code>other</code>; otherwise, <code>false</code>.
     *
     * @see JulianDate#lessThan
     * @see JulianDate#greaterThan
     * @see JulianDate#greaterThanOrEquals
     *
     * @example
     * var start = JulianDate.createFromDate(new Date("July 6, 1991 12:00:00"));
     * var end = JulianDate.createFromDate(new Date("July 6, 2011 12:00:00"));
     * start.lessThanOrEquals(end);     // true
     */
    JulianDate.prototype.lessThanOrEquals = function(other) {
        return JulianDate.compare(this, other) <= 0;
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
     * @see JulianDate#lessThan
     * @see JulianDate#lessThanOrEquals
     * @see JulianDate#greaterThanOrEquals
     *
     * @example
     * var start = JulianDate.createFromDate(new Date("July 6, 1991 12:00:00"));
     * var end = JulianDate.createFromDate(new Date("July 6, 2011 12:01:00"));
     * end.greaterThan(start);      // true
     */
    JulianDate.prototype.greaterThan = function(other) {
        return JulianDate.compare(this, other) > 0;
    };

    /**
     * Returns true if <code>other</code> occurs at or before this Julian date.
     *
     * @memberof JulianDate
     *
     * @param {JulianDate} other The Julian date to be compared.
     *
     * @return {Boolean} <code>true</code> if this JulianDate is chronologically later than or equal to <code>other</code>; otherwise, <code>false</code>.
     *
     * @see JulianDate#lessThan
     * @see JulianDate#lessThanOrEquals
     * @see JulianDate#greaterThan
     *
     * @example
     * var start = JulianDate.createFromDate(new Date("July 6, 1991 12:00:00"));
     * var end = JulianDate.createFromDate(new Date("July 6, 2011 12:00:00"));
     * end.greaterThanOrEquals(start);      // true
     */
    JulianDate.prototype.greaterThanOrEquals = function(other) {
        return JulianDate.compare(this, other) >= 0;
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
     * var original = JulianDate.createFromDate(new Date("July 4, 2011 12:00:00"));
     * var clone = JulianDate.createFromDate(new Date("July 4, 2011 12:00:00"));
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
     * @exception {DeveloperError} Number required.
     *
     * @see JulianDate#equals
     *
     * @example
     * var original = JulianDate.createFromDate(new Date("July 4, 2011 12:00:00"));
     * var clone = JulianDate.createFromDate(new Date("July 4, 2011 12:00:01"));
     * original.equalsEpsilon(clone, 2);    // true
     */
    JulianDate.prototype.equalsEpsilon = function(other, epsilon) {
        if (epsilon === null || isNaN(epsilon)) {
            throw new DeveloperError("Number required.", "epsilon");
        }
        return Math.abs(this.getSecondsDifference(other)) <= epsilon;
    };

    return JulianDate;
});