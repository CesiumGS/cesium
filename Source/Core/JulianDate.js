/*global define*/
define([
        './DeveloperError',
        './binarySearch',
        './TimeConstants',
        './LeapSecond',
        './TimeStandard',
        './isLeapYear'
    ], function(
        DeveloperError,
        binarySearch,
        TimeConstants,
        LeapSecond,
        TimeStandard,
        isLeapYear) {
    "use strict";

    var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var daysInLeapFeburary = 29;

    function convertUtcToTai(julianDate) {
        //Even though julianDate is in UTC, we'll treat it as TAI and
        //search the leap second table for it.
        var toFind = new LeapSecond(julianDate, 0.0);
        var leapSeconds = LeapSecond.getLeapSeconds();
        var index = binarySearch(leapSeconds, toFind, LeapSecond.compareLeapSecondDate);

        if (index < 0) {
            index = ~index;
        }

        if (index >= leapSeconds.length) {
            index = leapSeconds.length - 1;
        }

        var offset = leapSeconds[index].offset;
        if (index > 0) {
            //Now we have the index of the closest leap second that comes on or after our UTC time.
            //However, if the difference between the UTC date being converted and the TAI
            //defined leap second is greater than the offset, we are off by one and need to use
            //the previous leap second.
            var difference = julianDate.getSecondsDifference(leapSeconds[index].julianDate);
            if (difference > offset) {
                index--;
                offset = leapSeconds[index].offset;
            }
        }

        julianDate.addSeconds(offset, julianDate);
    }

    function convertTaiToUtc(julianDate, result) {
        var toFind = new LeapSecond(julianDate, 0.0);
        var leapSeconds = LeapSecond.getLeapSeconds();
        var index = binarySearch(leapSeconds, toFind, LeapSecond.compareLeapSecondDate);
        if (index < 0) {
            index = ~index;
        }

        //All times before our first leap second get the first offset.
        if (index === 0) {
            return julianDate.addSeconds(-leapSeconds[0].offset, result);
        }

        //All times after our leap second get the last offset.
        if (index >= leapSeconds.length) {
            return julianDate.addSeconds(-leapSeconds[index - 1].offset, result);
        }

        //Compute the difference between the found leap second and the time we are converting.
        var difference = julianDate.getSecondsDifference(leapSeconds[index].julianDate);

        if (difference === 0) {
            //The date is in our leap second table.
            return julianDate.addSeconds(-leapSeconds[index].offset, result);
        }

        if (difference <= 1.0) {
            //The requested date is during the moment of a leap second, then we cannot convert to UTC
            return undefined;
        }

        //The time is in between two leap seconds, undex is the leap second after the date
        //we're converting, so we subtract one to get the correct LeapSecond instance.
        return julianDate.addSeconds(-leapSeconds[--index].offset, result);
    }

    function setComponents(wholeDays, secondsOfDay, julianDate) {
        var extraDays = (secondsOfDay / TimeConstants.SECONDS_PER_DAY) | 0;
        wholeDays += extraDays;
        secondsOfDay -= TimeConstants.SECONDS_PER_DAY * extraDays;

        if (secondsOfDay < 0) {
            wholeDays--;
            secondsOfDay += TimeConstants.SECONDS_PER_DAY;
        }

        if (typeof julianDate === 'undefined') {
            return new JulianDate(wholeDays, secondsOfDay, TimeStandard.TAI);
        }

        julianDate._julianDayNumber = wholeDays;
        julianDate._secondsOfDay = secondsOfDay;
        return julianDate;
    }

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
     * Constructs a JulianDate instance from a Julian day number, the number of seconds elapsed
     * into that day, and the time standard which the parameters are in.  Passing no parameters will
     * construct a JulianDate that represents the current system time.
     *
     * An astronomical Julian Date is the number of days since noon on January 1, -4712 (4713 BC).
     * For increased precision, this class stores the whole number part of the date and the seconds
     * part of the date in separate components.  In order to be safe for arithmetic and represent
     * leap seconds, the date is always stored in the International Atomic Time standard
     * {@link TimeStandard.TAI}.
     *
     * @alias JulianDate
     * @constructor
     * @immutable
     *
     * @param {Number} julianDayNumber The Julian Day Number representing the number of whole days.  Fractional days will also be handled correctly.
     * @param {Number} julianSecondsOfDay The number of seconds into the current Julian Day Number.  Fractional seconds, negative seconds and seconds greater than a day will be handled correctly.
     * @param {TimeStandard} [timeStandard = TimeStandard.UTC] The time standard in which the first two parameters are defined.
     *
     * @exception {DeveloperError} timeStandard is not a known TimeStandard.
     * @exception {DeveloperError} julianDayNumber is required.
     * @exception {DeveloperError} julianSecondsOfDay is required.
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
    var JulianDate = function(julianDayNumber, julianSecondsOfDay, timeStandard) {
        this._julianDayNumber = undefined;
        this._secondsOfDay = undefined;

        var wholeDays;
        var secondsOfDay;
        //If any of the properties are defined, then we are constructing from components.
        if (typeof julianDayNumber !== 'undefined' || typeof julianSecondsOfDay !== 'undefined' || typeof timeStandard !== 'undefined') {
            if (typeof timeStandard === 'undefined') {
                timeStandard = TimeStandard.UTC;
            } else if ((timeStandard !== TimeStandard.UTC) && (timeStandard !== TimeStandard.TAI)) {
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
        }

        setComponents(wholeDays, secondsOfDay, this);

        if (timeStandard === TimeStandard.UTC) {
            convertUtcToTai(this);
        }
    };

    /**
     * Duplicates a JulianDate instance.
     * @memberof JulianDate
     *
     * @param {Cartesian3} date The JulianDate to duplicate.
     * @param {Cartesian3} [result] The object onto which to store the JulianDate.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} date is required.
     */
    JulianDate.clone = function(date, result) {
        if (typeof date === 'undefined') {
            throw new DeveloperError('date is required.');
        }
        if (typeof result === 'undefined') {
            return new JulianDate(date._julianDayNumber, date._secondsOfDay, TimeStandard.TAI);
        }
        result._julianDayNumber = date._julianDayNumber;
        result._secondsOfDay = date._secondsOfDay;
        return result;
    };

    /**
     * Creates a JulianDate instance from a JavaScript Date object.
     * While the JavaScript Date object defaults to the system's local time zone,
     * the Julian date is computed using the UTC values.
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
        return new JulianDate(components[0], components[1], timeStandard);
    };

    /**
     * Creates a JulianDate instance from an ISO 8601 date string.  Unlike Date.parse,
     * this method properly accounts for all valid formats defined by the ISO 8601
     * specification.  It also properly handles leap seconds and sub-millisecond times.
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
            result.addSeconds(1, result);
        }

        return result;
    };

    /**
     * Creates a JulianDate instance from a single number representing the Julian day and fractional day.
     *
     * @memberof JulianDate
     *
     * @param {Number} totalDays The combined Julian Day Number and fractional day.
     * @param {TimeStandard} [timeStandard = TimeStandard.UTC] Indicates the time standard in which the first parameter is defined.
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
        var dayDifference = (a._julianDayNumber - b._julianDayNumber);
        if (dayDifference !== 0) {
            return dayDifference;
        }
        return a._secondsOfDay - b._secondsOfDay;
    };

    /**
     * Duplicates this JulianDate.
     * @memberof JulianDate
     *
     * @param {Cartesian3} [result] The object onto which to store the JulianDate.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    JulianDate.prototype.clone = function(result) {
        return JulianDate.clone(this, result);
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
        return this._julianDayNumber + (this._secondsOfDay / TimeConstants.SECONDS_PER_DAY);
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
        return this._secondsOfDay / TimeConstants.SECONDS_PER_DAY;
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

    var toDateScratch = new JulianDate(0, 0, TimeStandard.TAI);
    /**
     * Creates a new JavaScript Date object equivalent to the Julian date
     * (accurate to the nearest millisecond in the UTC time standard).
     *
     * @memberof JulianDate
     *
     * @return {Date} A new JavaScript Date equivalent to this Julian date.
     */
    JulianDate.prototype.toDate = function() {
        //Attempt to convert to UTC; if we are on a leap second, this will
        //return undefined.  Since JavaScript Date doesn't support leap second
        //we can just add second and re-convert.
        var thisUtc = convertTaiToUtc(this, toDateScratch);
        if (typeof thisUtc === 'undefined') {
            this.addSeconds(1, toDateScratch);
            thisUtc = convertTaiToUtc(toDateScratch, toDateScratch);
        }

        var julianDayNumber = thisUtc._julianDayNumber;
        var secondsOfDay = thisUtc._secondsOfDay;

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

        return new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
    };

    /**
     * Computes the number of seconds that have elapsed from this Julian date to the <code>other</code>
     * Julian date.
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
        var julianDate1 = this;
        var julianDate2 = other;
        var dayDifference = (julianDate2.getJulianDayNumber() - julianDate1.getJulianDayNumber()) * TimeConstants.SECONDS_PER_DAY;
        return (dayDifference + (julianDate2.getSecondsOfDay() - julianDate1.getSecondsOfDay()));
    };

    /**
     * Computes the number of minutes that have elapsed from this Julian date to the <code>other</code>
     * Julian date.
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
        return this.getSecondsDifference(other) / TimeConstants.SECONDS_PER_MINUTE;
    };

    /**
     * Returns the number of seconds this TAI date is ahead of UTC.
     *
     * @memberof JulianDate
     *
     * @return {Number} The number of seconds this TAI date is ahead of UTC
     *
     * @see LeapSecond
     * @see TimeStandard
     *
     * @example
     * var date = new Date('August 1, 2012 12:00:00 UTC');
     * var julianDate = JulianDate.fromDate(date);
     * var difference = julianDate.getTaiMinusUtc(); //35
     */
    JulianDate.prototype.getTaiMinusUtc = function() {
        var toFind = new LeapSecond(this, 0.0);
        var leapSeconds = LeapSecond.getLeapSeconds();
        var index = binarySearch(leapSeconds, toFind, LeapSecond.compareLeapSecondDate);
        if (index < 0) {
            index = ~index;
            --index;
            if (index < 0) {
                index = 0;
            }
        }
        return leapSeconds[index].offset;
    };

    /**
     * Returns a new Julian date representing a time <code>duration</code> seconds later
     * (or earlier in the case of a negative amount).
     *
     * @memberof JulianDate
     *
     * @param {Number} seconds The number of seconds to add or subtract.
     * @param {JulianDate} [result] The JulianDate to store the result into.
     *
     * @return {JulianDate} The modified result parameter or a new JulianDate instance if it was not provided.
     *
     * @exception {DeveloperError} seconds is required and must be a number.
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
    JulianDate.prototype.addSeconds = function(seconds, result) {
        if (seconds === null || isNaN(seconds)) {
            throw new DeveloperError('seconds is required and must be a number.');
        }
        return setComponents(this._julianDayNumber, this._secondsOfDay + seconds, result);
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
        return new JulianDate(this._julianDayNumber, newSecondsOfDay, TimeStandard.TAI);
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
        return new JulianDate(this._julianDayNumber, newSecondsOfDay, TimeStandard.TAI);
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
        return new JulianDate(newJulianDayNumber, this._secondsOfDay, TimeStandard.TAI);
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

    //To avoid circular dependencies, we load the default list of leap seconds
    //here, rather than in the LeapSecond class itself.
    if (LeapSecond.getLeapSeconds().length === 0) {
        LeapSecond.setLeapSeconds([
                                   new LeapSecond(new JulianDate(2441317, 43210.0, TimeStandard.TAI), 10), // January 1, 1972 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2441499, 43211.0, TimeStandard.TAI), 11), // July 1, 1972 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2441683, 43212.0, TimeStandard.TAI), 12), // January 1, 1973 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2442048, 43213.0, TimeStandard.TAI), 13), // January 1, 1974 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2442413, 43214.0, TimeStandard.TAI), 14), // January 1, 1975 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2442778, 43215.0, TimeStandard.TAI), 15), // January 1, 1976 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2443144, 43216.0, TimeStandard.TAI), 16), // January 1, 1977 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2443509, 43217.0, TimeStandard.TAI), 17), // January 1, 1978 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2443874, 43218.0, TimeStandard.TAI), 18), // January 1, 1979 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2444239, 43219.0, TimeStandard.TAI), 19), // January 1, 1980 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2444786, 43220.0, TimeStandard.TAI), 20), // July 1, 1981 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2445151, 43221.0, TimeStandard.TAI), 21), // July 1, 1982 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2445516, 43222.0, TimeStandard.TAI), 22), // July 1, 1983 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2446247, 43223.0, TimeStandard.TAI), 23), // July 1, 1985 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2447161, 43224.0, TimeStandard.TAI), 24), // January 1, 1988 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2447892, 43225.0, TimeStandard.TAI), 25), // January 1, 1990 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2448257, 43226.0, TimeStandard.TAI), 26), // January 1, 1991 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2448804, 43227.0, TimeStandard.TAI), 27), // July 1, 1992 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2449169, 43228.0, TimeStandard.TAI), 28), // July 1, 1993 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2449534, 43229.0, TimeStandard.TAI), 29), // July 1, 1994 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2450083, 43230.0, TimeStandard.TAI), 30), // January 1, 1996 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2450630, 43231.0, TimeStandard.TAI), 31), // July 1, 1997 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2451179, 43232.0, TimeStandard.TAI), 32), // January 1, 1999 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2453736, 43233.0, TimeStandard.TAI), 33), // January 1, 2006 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2454832, 43234.0, TimeStandard.TAI), 34), // January 1, 2009 00:00:00 UTC
                                   new LeapSecond(new JulianDate(2456109, 43235.0, TimeStandard.TAI), 35)  // July 1, 2012 00:00:00 UTC
                                 ]);
    }

    return JulianDate;
});