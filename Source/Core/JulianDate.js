/*global define*/
define(['Core/DeveloperError',
        'Core/binarySearch',
        'Core/TimeConstants',
        'Core/LeapSecond',
        'Core/TimeStandard',
        'Core/isLeapYear'],
function(DeveloperError,
         binarySearch,
         TimeConstants,
         LeapSecond,
         TimeStandard,
         isLeapYear) {
    "use strict";

    var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var daysInLeapFeburary = 29;

    function computeJulianDateComponents(year, month, day, hour, minute, second, millisecond) {
        // Algorithm from page 604 of the Explanatory Supplement to the
        // Astronomical Almanac (Seidelmann 1992).

        var a = ((month - 14) / 12) | 0;
        var b = year + 4800 + a;
        var dayNumber = (((1461 * b) / 4) | 0) + (((367 * (month - 2 - 12 * a)) / 12) | 0) - (((3 * ((b + 100) / 100)) / 4) | 0) + day - 32075;

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

    function computeJulianDateComponentsFromDate(date) {
        return computeJulianDateComponents(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date
                .getUTCMilliseconds());
    }

    //Regular expressions used for ISO8601 date parsing.

    //YYYY
    var matchCalendarYear = /^(\d{4})$/;
    //YYYY-MM (YYYYMM is invalid)
    var matchCalendarMonth = /^(\d{4})-(\d{2})$/;
    //YYYY-DDD or YYYYDDD
    var matchOrdinalDate = /^(\d{4})-?(\d{3})$/;
    //YYYY-Www or YYYYWww or YYYY-Www-D or YYYYWwwD
    var matchWeekDate = /^(\d{4})-?W(\d{2})-?(\d{1})?$/;
    //YYYY-MM-DD or YYYYMMDD
    var matchCalendarDate = /^(\d{4})-?(\d{2})-?(\d{2})$/;
    // Match utc offset
    var utcOffset = /([Z+\-])?(\d{2})?:?(\d{2})?$/;
    // Match hours HH or HH.xxxxx
    var matchHours = /^(\d{2})(\.\d+)?/.source + utcOffset.source;
    // Match hours/minutes HH:MM HHMM.xxxxx
    var matchHoursMinutes = /^(\d{2}):?(\d{2})(\.\d+)?/.source + utcOffset.source;
    // Match hours/minutes HH:MM:SS HHMMSS.xxxxx
    var matchHoursMinutesSeconds = /^(\d{2}):?(\d{2}):?(\d{2})(\.\d+)?/.source + utcOffset.source;

    var iso8601ErrorMessage = 'Valid ISO 8601 date string required.';

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
     * @see JulianDate.fromDate
     * @see JulianDate.fromTotalDays
     * @see JulianDate.fromIso8601
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
                throw new DeveloperError('timeStandard is not a known TimeStandard.');
            }

            if (julianDayNumber === null || isNaN(julianDayNumber)) {
                throw new DeveloperError('julianDayNumber is required.');
            }

            if (julianSecondsOfDay === null || isNaN(julianSecondsOfDay)) {
                throw new DeveloperError('julianSecondsOfDay is required.');
            }

            //coerce to integer
            wholeDays = julianDayNumber | 0;
            //If julianDayNumber was fractional, add the number of seconds the fraction represented
            secondsOfDay = julianSecondsOfDay + (julianDayNumber - wholeDays) * TimeConstants.SECONDS_PER_DAY;
        } else {
            //Create a new date from the current time.
            var date = new Date();
            var components = computeJulianDateComponentsFromDate(date);
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
     * @exception {DeveloperError} date must be a valid JavaScript Date.
     *
     * @see JulianDate
     * @see JulianDate.fromTotalDays
     * @see JulianDate.fromIso8601
     * @see TimeStandard
     * @see LeapSecond
     * @see <a href='http://www.w3schools.com/js/js_obj_date.asp'>JavaScript Date Object on w3schools</a>.
     * @see <a href='http://www.w3schools.com/jsref/jsref_obj_date.asp'>JavaScript Date Object Reference on w3schools</a>.
     *
     * @example
     * // Construct a Julian date specifying the UTC time standard
     * var date = new Date('January 1, 2011 12:00:00 EST');
     * var julianDate = JulianDate.fromDate(date, TimeStandard.UTC);
     */
    JulianDate.fromDate = function(date, timeStandard) {
        if (typeof date === 'undefined' || date === null || isNaN(date.getTime())) {
            throw new DeveloperError('date must be a valid JavaScript Date.');
        }

        var components = computeJulianDateComponentsFromDate(date);
        var result = new JulianDate(components[0], components[1], timeStandard);
        result._date = date;
        return result;
    };

    /**
     * <p>
     * Creates an immutable JulianDate instance from an ISO 8601 date string.  Unlike Date.parse,
     * this method properly accounts for all valid formats defined by the ISO 8601
     * specification.  It also properly handles leap seconds and sub-millisecond times.
     * <p/>
     *
     * @memberof JulianDate
     *
     * @param {String} iso8601String The ISO 8601 date string representing the time to be converted to a Julian date.
     *
     * @return {JulianDate} The new {@Link JulianDate} instance.
     *
     * @exception {DeveloperError} Valid ISO 8601 date string required.
     *
     * @see JulianDate
     * @see JulianDate.fromTotalDays
     * @see JulianDate.fromDate
     * @see LeapSecond
     * @see <a href='http://en.wikipedia.org/wiki/ISO_8601'>ISO 8601 on Wikipedia</a>.
     *
     * @example
     * // Example 1. Construct a Julian date in UTC at April 24th, 2012 6:08PM UTC
     * var julianDate = JulianDate.fromIso8601('2012-04-24T18:08Z');
     * // Example 2. Construct a Julian date in local time April 24th, 2012 12:00 AM
     * var localDay = JulianDate.fromIso8601('2012-04-24');
     * // Example 3. Construct a Julian date 5 hours behind UTC April 24th, 2012 5:00 pm UTC
     * var localDay = JulianDate.fromIso8601('2012-04-24T12:00-05:00');
     */
    JulianDate.fromIso8601 = function(iso8601String) {
        if (typeof iso8601String !== 'string') {
            throw new DeveloperError(iso8601ErrorMessage);
        }

        //Comma and decimal point both indicate a fractional number according to ISO 8601,
        //start out by blanket replacing , with . which is the only valid such symbol in JS.
        iso8601String = iso8601String.replace(',', '.');

        //Split the string into its date and time components, denoted by a mandatory T
        var tokens = iso8601String.split('T'), year, month = 1, day = 1, hours = 0, minutes = 0, seconds = 0, milliseconds = 0;

        //Lacking a time is okay, but a missing date is illegal.
        var date = tokens[0];
        var time = tokens[1];
        var tmp, inLeapYear;
        if (typeof date === 'undefined') {
            throw new DeveloperError(iso8601ErrorMessage);
        }

        var dashCount;

        //First match the date against possible regular expressions.
        tokens = date.match(matchCalendarDate);
        if (tokens !== null) {
            dashCount = date.split('-').length - 1;
            if (dashCount > 0 && dashCount !== 2) {
                throw new DeveloperError(iso8601ErrorMessage);
            }
            year = +tokens[1];
            month = +tokens[2];
            day = +tokens[3];
        } else {
            tokens = date.match(matchCalendarMonth);
            if (tokens !== null) {
                year = +tokens[1];
                month = +tokens[2];
            } else {
                tokens = date.match(matchCalendarYear);
                if (tokens !== null) {
                    year = +tokens[1];
                } else {
                    //Not a year/month/day so it must be an ordinal date.
                    var dayOfYear;
                    tokens = date.match(matchOrdinalDate);
                    if (tokens !== null) {

                        year = +tokens[1];
                        dayOfYear = +tokens[2];
                        inLeapYear = isLeapYear(year);

                        //This validation is only applicable for this format.
                        if (dayOfYear < 1 || (inLeapYear && dayOfYear > 366) || (!inLeapYear && dayOfYear > 365)) {
                            throw new DeveloperError(iso8601ErrorMessage);
                        }
                    } else {
                        tokens = date.match(matchWeekDate);
                        if (tokens !== null) {
                            //ISO week date to ordinal date from
                            //http://en.wikipedia.org/w/index.php?title=ISO_week_date&oldid=474176775
                            year = +tokens[1];
                            var weekNumber = +tokens[2];
                            var dayOfWeek = +tokens[3] || 0;

                            dashCount = date.split('-').length - 1;
                            if (dashCount > 0 &&
                               ((typeof tokens[3] === 'undefined' && dashCount !== 1) ||
                               (typeof tokens[3] !== 'undefined' && dashCount !== 2))) {
                                throw new DeveloperError(iso8601ErrorMessage);
                            }

                            var january4 = new Date(Date.UTC(year, 0, 4));
                            dayOfYear = (weekNumber * 7) + dayOfWeek - january4.getUTCDay() - 3;
                        } else {
                            //None of our regular expressions succeeded in parsing the date properly.
                            throw new DeveloperError(iso8601ErrorMessage);
                        }
                    }
                    //Split an ordinal date into month/day.
                    tmp = new Date(Date.UTC(year, 0, 1));
                    tmp.setUTCDate(dayOfYear);
                    month = tmp.getUTCMonth() + 1;
                    day = tmp.getUTCDate();
                }
            }
        }

        //Now that we have all of the date components, validate them to make sure nothing is out of range.
        inLeapYear = isLeapYear(year);
        if (month < 1 || month > 12 || day < 1 || ((month !== 2 || !inLeapYear) && day > daysInMonth[month - 1]) || (inLeapYear && month === 2 && day > daysInLeapFeburary)) {
            throw new DeveloperError(iso8601ErrorMessage);
        }

        //Not move onto the time string, which is much simpler.
        var offsetIndex;
        if (typeof time !== 'undefined') {
            tokens = time.match(matchHoursMinutesSeconds);
            if (tokens !== null) {
                dashCount = time.split(':').length - 1;
                if (dashCount > 0 && dashCount !== 2) {
                    throw new DeveloperError(iso8601ErrorMessage);
                }

                hours = +tokens[1];
                minutes = +tokens[2];
                seconds = +tokens[3];
                milliseconds = +(tokens[4] || 0) * 1000.0;
                offsetIndex = 5;
            } else {
                tokens = time.match(matchHoursMinutes);
                if (tokens !== null) {
                    dashCount = time.split(':').length - 1;
                    if (dashCount > 0 && dashCount !== 1) {
                        throw new DeveloperError(iso8601ErrorMessage);
                    }

                    hours = +tokens[1];
                    minutes = +tokens[2];
                    seconds = +(tokens[3] || 0) * 60.0;
                    offsetIndex = 4;
                } else {
                    tokens = time.match(matchHours);
                    if (tokens !== null) {
                        hours = +tokens[1];
                        minutes = +(tokens[2] || 0) * 60.0;
                        offsetIndex = 3;
                    } else {
                        throw new DeveloperError(iso8601ErrorMessage);
                    }
                }
            }

            //Validate that all values are in proper range.  Minutes and hours have special cases at 60 and 24.
            if (minutes >= 60 || seconds >= 61 || hours > 24 || (hours === 24 && (minutes > 0 || seconds > 0 || milliseconds > 0))) {
                throw new DeveloperError(iso8601ErrorMessage);
            }

            //Check the UTC offset value, if no value exists, use local time
            //a Z indicates UTC, + or - are offsets.
            var offset = tokens[offsetIndex];
            var offsetHours = +(tokens[offsetIndex + 1]);
            var offsetMinutes = +(tokens[offsetIndex + 2] || 0);
            switch (offset) {
            case '+':
                hours = hours - offsetHours;
                minutes = minutes - offsetMinutes;
                break;
            case '-':
                hours = hours + offsetHours;
                minutes = minutes + offsetMinutes;
                break;
            case 'Z':
                break;
            default:
                minutes = minutes + new Date(Date.UTC(year, month - 1, day, hours, minutes)).getTimezoneOffset();
                break;
            }
        } else {
            //If no time is specified, it is considered the beginning of the day, local time.
            minutes = minutes + new Date(Date.UTC(year, month - 1, day)).getTimezoneOffset();
        }

        //ISO8601 denotes a leap second by any time having a seconds component of 60 seconds.
        //If that's the case, we need to temporarily subtract a second in order to build a UTC date.
        //Then we add it back in after converting to TAI.
        var isLeapSecond = seconds === 60;
        if (isLeapSecond) {
            seconds--;
        }

        //Even if we successfully parsed the string into its components, after applying UTC offset or
        //special cases like 24:00:00 denoting midnight, we need to normalize the data appropriately.

        //milliseconds can never be greater than 1000, and seconds can't be above 60, so we start with minutes
        while (minutes >= 60) {
            minutes -= 60;
            hours++;
        }

        while (hours >= 24) {
            hours -= 24;
            day++;
        }

        tmp = (inLeapYear && month === 2) ? daysInLeapFeburary : daysInMonth[month - 1];
        while (day > tmp) {
            day -= tmp;
            month++;

            if (month > 12) {
                month -= 12;
                year++;
            }

            tmp = (inLeapYear && month === 2) ? daysInLeapFeburary : daysInMonth[month - 1];
        }

        //If UTC offset is at the beginning/end of the day, minutes can be negative.
        while (minutes < 0) {
            minutes += 60;
            hours--;
        }

        while (hours < 0) {
            hours += 24;
            day--;
        }

        while (day < 1) {
            tmp = (inLeapYear && month === 2) ? daysInLeapFeburary : daysInMonth[month - 1];
            day += tmp;
            month--;

            if (month < 1) {
                month += 12;
                year--;
            }
        }

        //Now create the JulianDate components from the Gregorian date and actually create our instance.
        var components = computeJulianDateComponents(year, month, day, hours, minutes, seconds, milliseconds);
        var result = new JulianDate(components[0], components[1], TimeStandard.UTC);

        //If we were on a leap second, add it back.
        if (isLeapSecond) {
            result = TimeStandard.convertUtcToTai(result).addSeconds(1);
        }

        return result;
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
     * @exception {DeveloperError} totalDays is required.
     *
     * @see JulianDate
     * @see JulianDate.fromDate
     * @see JulianDate.fromIso8601
     * @see TimeStandard
     * @see LeapSecond
     *
     * @example
     * // Construct a date which corresponds to January 1, 1991 06:00:00 UTC.
     * var julianDate = JulianDate.fromTotalDays(2448257.75, TimeStandard.UTC);
     */
    JulianDate.fromTotalDays = function(totalDays, timeStandard) {
        if (totalDays === null || isNaN(totalDays)) {
            throw new DeveloperError('totalDays is required.');
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
     * Creates a new JavaScript Date object equivalent to the Julian date
     * (accurate to the nearest millisecond in the UTC time standard).
     *
     * @memberof JulianDate
     *
     * @return {Date} A new JavaScript Date equivalent to this Julian date.
     */
    JulianDate.prototype.toDate = function() {
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
        return new Date(this._date.getTime());
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
     * var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
     * var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00'));
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
     * var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
     * var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00'));
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
     * var date = new Date('July 11, 2011 12:00:00 UTC');
     * var julianDate = JulianDate.fromDate(date, TimeStandard.TAI);
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
                lastDate = JulianDate.fromDate(beginning, TimeStandard.UTC);
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
     * @exception {DeveloperError} duration is required and must be a number.
     *
     * @see JulianDate#addMinutes
     * @see JulianDate#addHours
     * @see JulianDate#addDays
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00:00 UTC
     * date.setUTCHours(12, 0, 00, 0);
     * var start = JulianDate.fromDate(date);
     * var end = start.addSeconds(95);      // July 4, 2011 @ 12:01:35 UTC
     */
    JulianDate.prototype.addSeconds = function(duration) {
        if (duration === null || isNaN(duration)) {
            throw new DeveloperError('duration is required and must be a number.');
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
     * @exception {DeveloperError} duration is required and must be a number.
     *
     * @see JulianDate#addSeconds
     * @see JulianDate#addHours
     * @see JulianDate#addDays
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = JulianDate.fromDate(date);
     * var end = start.addMinutes(65);      // July 4, 2011 @ 13:05 UTC
     */
    JulianDate.prototype.addMinutes = function(duration) {
        if (duration === null || isNaN(duration)) {
            throw new DeveloperError('duration is required and must be a number.');
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
     * @exception {DeveloperError} duration is required and must be a number.
     *
     * @see JulianDate#addSeconds
     * @see JulianDate#addMinutes
     * @see JulianDate#addDays
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = JulianDate.fromDate(date);
     * var end = start.addHours(6);         // July 4, 2011 @ 18:00 UTC
     */
    JulianDate.prototype.addHours = function(duration) {
        if (duration === null || isNaN(duration)) {
            throw new DeveloperError('duration is required and must be a number.');
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
     * @exception {DeveloperError} duration is required and must be a number.
     *
     * @see JulianDate#addSeconds
     * @see JulianDate#addMinutes
     * @see JulianDate#addHours
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = JulianDate.fromDate(date);
     * var end = start.addDays(5);         // July 9, 2011 @ 12:00 UTC
     */
    JulianDate.prototype.addDays = function(duration) {
        if (duration === null || isNaN(duration)) {
            throw new DeveloperError('duration is required and must be a number.');
        }
        var newJulianDayNumber = this._julianDayNumber + duration;
        return new JulianDate(newJulianDayNumber, this._secondsOfDay, this._timeStandard);
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
     * var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
     * var end = JulianDate.fromDate(new Date('July 6, 2011 12:01:00'));
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
     * var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
     * var end = JulianDate.fromDate(new Date('July 6, 2011 12:00:00'));
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
     * var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
     * var end = JulianDate.fromDate(new Date('July 6, 2011 12:01:00'));
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
     * var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
     * var end = JulianDate.fromDate(new Date('July 6, 2011 12:00:00'));
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
     * var original = JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
     * var clone = JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
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
     * @exception {DeveloperError} epsilon is required and must be number.
     *
     * @see JulianDate#equals
     *
     * @example
     * var original = JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
     * var clone = JulianDate.fromDate(new Date('July 4, 2011 12:00:01'));
     * original.equalsEpsilon(clone, 2);    // true
     */
    JulianDate.prototype.equalsEpsilon = function(other, epsilon) {
        if (epsilon === null || isNaN(epsilon)) {
            throw new DeveloperError('epsilon is required and must be number.');
        }
        return Math.abs(this.getSecondsDifference(other)) <= epsilon;
    };

    return JulianDate;
});