/*global define*/
define([
        '../ThirdParty/sprintf',
        './binarySearch',
        './defaultValue',
        './defined',
        './DeveloperError',
        './GregorianDate',
        './isLeapYear',
        './LeapSecond',
        './TimeConstants',
        './TimeStandard'
    ], function(
        sprintf,
        binarySearch,
        defaultValue,
        defined,
        DeveloperError,
        GregorianDate,
        isLeapYear,
        LeapSecond,
        TimeConstants,
        TimeStandard) {
    "use strict";

    var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var daysInLeapFeburary = 29;

    // we don't really need a leap second instance, anything with a julianDate property will do
    var binarySearchScratchLeapSecond = {
        julianDate : undefined
    };

    function convertUtcToTai(julianDate) {
        //Even though julianDate is in UTC, we'll treat it as TAI and
        //search the leap second table for it.
        binarySearchScratchLeapSecond.julianDate = julianDate;
        var leapSeconds = LeapSecond._leapSeconds;
        var index = binarySearch(leapSeconds, binarySearchScratchLeapSecond, LeapSecond.compareLeapSecondDate);

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
            var difference = JulianDate.getSecondsDifference(julianDate, leapSeconds[index].julianDate);
            if (difference > offset) {
                index--;
                offset = leapSeconds[index].offset;
            }
        }

        JulianDate.addSeconds(julianDate, offset, julianDate);
    }

    function convertTaiToUtc(julianDate, result) {
        binarySearchScratchLeapSecond.julianDate = julianDate;
        var leapSeconds = LeapSecond._leapSeconds;
        var index = binarySearch(leapSeconds, binarySearchScratchLeapSecond, LeapSecond.compareLeapSecondDate);
        if (index < 0) {
            index = ~index;
        }

        //All times before our first leap second get the first offset.
        if (index === 0) {
            return JulianDate.addSeconds(julianDate, -leapSeconds[0].offset, result);
        }

        //All times after our leap second get the last offset.
        if (index >= leapSeconds.length) {
            return JulianDate.addSeconds(julianDate, -leapSeconds[index - 1].offset, result);
        }

        //Compute the difference between the found leap second and the time we are converting.
        var difference = JulianDate.getSecondsDifference(julianDate, leapSeconds[index].julianDate);

        if (difference === 0) {
            //The date is in our leap second table.
            return JulianDate.addSeconds(julianDate, -leapSeconds[index].offset, result);
        }

        if (difference <= 1.0) {
            //The requested date is during the moment of a leap second, then we cannot convert to UTC
            return undefined;
        }

        //The time is in between two leap seconds, index is the leap second after the date
        //we're converting, so we subtract one to get the correct LeapSecond instance.
        return JulianDate.addSeconds(julianDate, -leapSeconds[--index].offset, result);
    }

    function setComponents(wholeDays, secondsOfDay, julianDate) {
        var extraDays = (secondsOfDay / TimeConstants.SECONDS_PER_DAY) | 0;
        wholeDays += extraDays;
        secondsOfDay -= TimeConstants.SECONDS_PER_DAY * extraDays;

        if (secondsOfDay < 0) {
            wholeDays--;
            secondsOfDay += TimeConstants.SECONDS_PER_DAY;
        }

        if (!defined(julianDate)) {
            return new JulianDate(wholeDays, secondsOfDay, TimeStandard.TAI);
        }

        julianDate.dayNumber = wholeDays;
        julianDate.secondsOfDay = secondsOfDay;
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
        return computeJulianDateComponents(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
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
     * Represents an astronomical Julian date, which is the number of days since noon on January 1, -4712 (4713 BC).
     * For increased precision, this class stores the whole number part of the date and the seconds
     * part of the date in separate components.  In order to be safe for arithmetic and represent
     * leap seconds, the date is always stored in the International Atomic Time standard
     * {@link TimeStandard.TAI}.
     * @alias JulianDate
     * @constructor
     *
     * @param {Number} julianDayNumber The Julian Day Number representing the number of whole days.  Fractional days will also be handled correctly.
     * @param {Number} julianSecondsOfDay The number of seconds into the current Julian Day Number.  Fractional seconds, negative seconds and seconds greater than a day will be handled correctly.
     * @param {TimeStandard} [timeStandard=TimeStandard.UTC] The time standard in which the first two parameters are defined.
     */
    var JulianDate = function(julianDayNumber, julianSecondsOfDay, timeStandard) {
        /**
         * Gets or sets the number of whole days.
         * @type {Number}
         */
        this.dayNumber = undefined;

        /**
         * Gets or sets the number of seconds into the current day.
         * @type {Number}
         */
        this.secondsOfDay = undefined;

        julianDayNumber = defaultValue(julianDayNumber, 0.0);
        julianSecondsOfDay = defaultValue(julianSecondsOfDay, 0.0);
        timeStandard = defaultValue(timeStandard, TimeStandard.UTC);

        //If julianDayNumber was fractional, make it an integer and add the number of seconds the fraction represented
        var wholeDays = julianDayNumber | 0;
        var secondsOfDay = julianSecondsOfDay + (julianDayNumber - wholeDays) * TimeConstants.SECONDS_PER_DAY;

        setComponents(wholeDays, secondsOfDay, this);

        if (timeStandard === TimeStandard.UTC) {
            convertUtcToTai(this);
        }
    };

    /**
     * Creates a JulianDate instance from a JavaScript Date object.
     * While the JavaScript Date object defaults to the system's local time zone,
     * the JulianDate is computed using the UTC values.
     *
     * @param {Date} date The JavaScript Date object representing the time to be converted to a JulianDate.
     * @param {TimeStandard} [timeStandard=TimeStandard.UTC] Indicates the time standard in which this date is represented.
     * @returns {JulianDate} The new {@Link JulianDate} instance.
     *
     * @exception {DeveloperError} date must be a valid JavaScript Date.
     *
     * @example
     * // Construct a JulianDate specifying the UTC time standard
     * var date = new Date('January 1, 2011 12:00:00 EST');
     * var julianDate = Cesium.JulianDate.fromDate(date, Cesium.TimeStandard.UTC);
     */
    JulianDate.fromDate = function(date, timeStandard) {
        //>>includeStart('debug', pragmas.debug);
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new DeveloperError('date must be a valid JavaScript Date.');
        }
        //>>includeEnd('debug');

        var components = computeJulianDateComponentsFromDate(date);
        return new JulianDate(components[0], components[1], timeStandard);
    };

    /**
     * Creates a JulianDate instance from an ISO 8601 date string.  Unlike Date.parse,
     * this method properly accounts for all valid formats defined by the ISO 8601
     * specification.  It also properly handles leap seconds and sub-millisecond times.
     *
     * @param {String} iso8601String The ISO 8601 date string representing the time to be converted to a JulianDate.
     * @returns {JulianDate} The new {@Link JulianDate} instance.
     *
     * @exception {DeveloperError} Valid ISO 8601 date string required.
     *
     * @see JulianDate
     * @see JulianDate.fromTotalDays
     * @see JulianDate.fromDate
     * @see LeapSecond
     * @see {@link http://en.wikipedia.org/wiki/ISO_8601|ISO 8601 on Wikipedia}
     *
     * @example
     * // Example 1. Construct a JulianDate in UTC at April 24th, 2012 6:08PM UTC
     * var julianDate = Cesium.JulianDate.fromIso8601('2012-04-24T18:08Z');
     *
     * @example
     * // Example 2. Construct a JulianDate in local time April 24th, 2012 12:00 AM
     * var localDay = Cesium.JulianDate.fromIso8601('2012-04-24');
     *
     * @example
     * // Example 3. Construct a JulianDate 5 hours behind UTC April 24th, 2012 5:00 pm UTC
     * var localDay = Cesium.JulianDate.fromIso8601('2012-04-24T12:00-05:00');
     */
    JulianDate.fromIso8601 = function(iso8601String) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof iso8601String !== 'string') {
            throw new DeveloperError(iso8601ErrorMessage);
        }
        //>>includeEnd('debug');

        //Comma and decimal point both indicate a fractional number according to ISO 8601,
        //start out by blanket replacing , with . which is the only valid such symbol in JS.
        iso8601String = iso8601String.replace(',', '.');

        //Split the string into its date and time components, denoted by a mandatory T
        var tokens = iso8601String.split('T');
        var year;
        var month = 1;
        var day = 1;
        var hour = 0;
        var minute = 0;
        var second = 0;
        var millisecond = 0;

        //Lacking a time is okay, but a missing date is illegal.
        var date = tokens[0];
        var time = tokens[1];
        var tmp;
        var inLeapYear;
        if (!defined(date)) {
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
                               ((!defined(tokens[3]) && dashCount !== 1) ||
                               (defined(tokens[3]) && dashCount !== 2))) {
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
        if (defined(time)) {
            tokens = time.match(matchHoursMinutesSeconds);
            if (tokens !== null) {
                dashCount = time.split(':').length - 1;
                if (dashCount > 0 && dashCount !== 2 && dashCount !== 3) {
                    throw new DeveloperError(iso8601ErrorMessage);
                }

                hour = +tokens[1];
                minute = +tokens[2];
                second = +tokens[3];
                millisecond = +(tokens[4] || 0) * 1000.0;
                offsetIndex = 5;
            } else {
                tokens = time.match(matchHoursMinutes);
                if (tokens !== null) {
                    dashCount = time.split(':').length - 1;
                    if (dashCount > 0 && dashCount !== 1) {
                        throw new DeveloperError(iso8601ErrorMessage);
                    }

                    hour = +tokens[1];
                    minute = +tokens[2];
                    second = +(tokens[3] || 0) * 60.0;
                    offsetIndex = 4;
                } else {
                    tokens = time.match(matchHours);
                    if (tokens !== null) {
                        hour = +tokens[1];
                        minute = +(tokens[2] || 0) * 60.0;
                        offsetIndex = 3;
                    } else {
                        throw new DeveloperError(iso8601ErrorMessage);
                    }
                }
            }

            //Validate that all values are in proper range.  Minutes and hours have special cases at 60 and 24.
            if (minute >= 60 || second >= 61 || hour > 24 || (hour === 24 && (minute > 0 || second > 0 || millisecond > 0))) {
                throw new DeveloperError(iso8601ErrorMessage);
            }

            //Check the UTC offset value, if no value exists, use local time
            //a Z indicates UTC, + or - are offsets.
            var offset = tokens[offsetIndex];
            var offsetHours = +(tokens[offsetIndex + 1]);
            var offsetMinutes = +(tokens[offsetIndex + 2] || 0);
            switch (offset) {
            case '+':
                hour = hour - offsetHours;
                minute = minute - offsetMinutes;
                break;
            case '-':
                hour = hour + offsetHours;
                minute = minute + offsetMinutes;
                break;
            case 'Z':
                break;
            default:
                minute = minute + new Date(Date.UTC(year, month - 1, day, hour, minute)).getTimezoneOffset();
                break;
            }
        } else {
            //If no time is specified, it is considered the beginning of the day, local time.
            minute = minute + new Date(Date.UTC(year, month - 1, day)).getTimezoneOffset();
        }

        //ISO8601 denotes a leap second by any time having a seconds component of 60 seconds.
        //If that's the case, we need to temporarily subtract a second in order to build a UTC date.
        //Then we add it back in after converting to TAI.
        var isLeapSecond = second === 60;
        if (isLeapSecond) {
            second--;
        }

        //Even if we successfully parsed the string into its components, after applying UTC offset or
        //special cases like 24:00:00 denoting midnight, we need to normalize the data appropriately.

        //milliseconds can never be greater than 1000, and seconds can't be above 60, so we start with minutes
        while (minute >= 60) {
            minute -= 60;
            hour++;
        }

        while (hour >= 24) {
            hour -= 24;
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
        while (minute < 0) {
            minute += 60;
            hour--;
        }

        while (hour < 0) {
            hour += 24;
            day--;
        }

        while (day < 1) {
            month--;
            if (month < 1) {
                month += 12;
                year--;
            }

            tmp = (inLeapYear && month === 2) ? daysInLeapFeburary : daysInMonth[month - 1];
            day += tmp;
        }

        //Now create the JulianDate components from the Gregorian date and actually create our instance.
        var components = computeJulianDateComponents(year, month, day, hour, minute, second, millisecond);
        var result = new JulianDate(components[0], components[1], TimeStandard.UTC);

        //If we were on a leap second, add it back.
        if (isLeapSecond) {
            JulianDate.addSeconds(result, 1, result);
        }

        return result;
    };

    /**
     * Creates a JulianDate instance from a single number representing the Julian day and fractional day.
     *
     * @param {Number} totalDays The combined Julian Day Number and fractional day.
     * @param {TimeStandard} [timeStandard=TimeStandard.UTC] Indicates the time standard in which the first parameter is defined.
     * @returns {JulianDate} The new {@Link JulianDate} instance.
     *
     * @see JulianDate
     * @see JulianDate.fromDate
     * @see JulianDate.fromIso8601
     * @see TimeStandard
     * @see LeapSecond
     *
     * @example
     * // Construct a date which corresponds to January 1, 1991 06:00:00 UTC.
     * var julianDate = Cesium.JulianDate.fromTotalDays(2448257.75, Cesium.TimeStandard.UTC);
     */
    JulianDate.fromTotalDays = function(totalDays, timeStandard) {
        //>>includeStart('debug', pragmas.debug);
        if (totalDays === null || isNaN(totalDays)) {
            throw new DeveloperError('totalDays is required.');
        }
        //>>includeEnd('debug');

        return new JulianDate(totalDays, 0, timeStandard);
    };

    /**
     * Creates a new instance that represents the current system time.
     * This is equivalent to calling <code>JulianDate.fromDate(new Date());</code>.
     *
     * @param {JulianDate} [result] An existing instance to store the result into.
     * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
     */
    JulianDate.now = function(result) {
        var components = computeJulianDateComponentsFromDate(new Date());
        if (!defined(result)) {
            return new JulianDate(components[0], components[1], TimeStandard.UTC);
        }
        setComponents(components[0], components[1], result);
        convertUtcToTai(result);
        return result;
    };

    /**
     * Duplicates a JulianDate instance.
     *
     * @param {JulianDate} date The JulianDate to duplicate.
     * @param {JulianDate} [result] The object onto which to store the JulianDate.
     * @returns {JulianDate} The modified result parameter or a new JulianDate instance if one was not provided. (Returns undefined if date is undefined)
     */
    JulianDate.clone = function(date, result) {
        if (!defined(date)) {
            return undefined;
        }
        if (!defined(result)) {
            return new JulianDate(date.dayNumber, date.secondsOfDay, TimeStandard.TAI);
        }
        result.dayNumber = date.dayNumber;
        result.secondsOfDay = date.secondsOfDay;
        return result;
    };

    /**
     * Compares two JulianDate instances.
     *
     * @param {JulianDate} a The first instance.
     * @param {JulianDate} b The second instance.
     * @returns {Number} A negative value if a is less than b,
     *                  a positive value if a is greater than b,
     *                  or zero if a and b are equal.
     */
    JulianDate.compare = function(left, right) {
        var julianDayNumberDifference = left.dayNumber - right.dayNumber;
        if (julianDayNumberDifference !== 0) {
            return julianDayNumberDifference;
        }
        return left.secondsOfDay - right.secondsOfDay;
    };

    /**
     * Returns true if the first JulianDate equals the second JulianDate.
     *
     * @param {JulianDate} left The first JulianDate to compare for equality.
     * @param {JulianDate} right The second JulianDate to compare for equality.
     * @returns {Boolean} <code>true</code> if the JulianDates are equal; otherwise, <code>false</code>.
     */
    JulianDate.equals = function(left, right) {
        return (left === right) ||
               (defined(left) &&
                defined(right) &&
                left.dayNumber === right.dayNumber &&
                left.secondsOfDay === right.secondsOfDay);
    };

    /**
     * Returns <code>true</code> if the provided dates are within <code>epsilon</code> seconds of
     * each other.  That is, in order for the dates to be considered equal (and for
     * this function to return <code>true</code>), the absolute value of the difference between them, in
     * seconds, must be less than <code>epsilon</code>.
     *
     * @param {JulianDate} left The first JulianDate to be compared.
     * @param {JulianDate} right The second JulianDate to be compared.
     * @param {Number} epsilon The number of seconds that should separate the two JulianDates
     * @returns {Boolean} <code>true</code> if the two JulianDates are within <code>epsilon</code> seconds of each other; otherwise <code>false</code>.
     *
     * @see JulianDate#equals
     */
    JulianDate.equalsEpsilon = function(left, right, epsilon) {
        //>>includeStart('debug', pragmas.debug);
        if (epsilon === null || isNaN(epsilon)) {
            throw new DeveloperError('epsilon is required and must be a number.');
        }
        //>>includeEnd('debug');

        return Math.abs(JulianDate.getSecondsDifference(left, right)) <= epsilon;
    };

    /**
     * Returns the total number of whole and fractional days represented by this astronomical Julian date.
     *
     * @returns {Number} The Julian date as single floating point number.
     */
    JulianDate.getTotalDays = function(julianDate) {
        return julianDate.dayNumber + (julianDate.secondsOfDay / TimeConstants.SECONDS_PER_DAY);
    };

    var toGregorianDateScratch = new JulianDate(0, 0, TimeStandard.TAI);

    /**
     * Creates a GregorianDate representation of this date in UTC.
     *
     * @returns {GregorianDate} A gregorian date.
     */
    JulianDate.toGregorianDate = function(julianDate) {
        var isLeapSecond = false;
        var thisUtc = convertTaiToUtc(julianDate, toGregorianDateScratch);
        if (!defined(thisUtc)) {
            //Conversion to UTC will fail if we are during a leap second.
            //If that's the case, subtract a second and convert again.
            //JavaScript doesn't support leap seconds, so this results in second 59 being repeated twice.
            JulianDate.addSeconds(julianDate, -1, toGregorianDateScratch);
            thisUtc = convertTaiToUtc(toGregorianDateScratch, toGregorianDateScratch);
            isLeapSecond = true;
        }

        var julianDayNumber = thisUtc.dayNumber;
        var secondsOfDay = thisUtc.secondsOfDay;

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

        var hour = (secondsOfDay / TimeConstants.SECONDS_PER_HOUR) | 0;
        var remainingSeconds = secondsOfDay - (hour * TimeConstants.SECONDS_PER_HOUR);
        var minute = (remainingSeconds / TimeConstants.SECONDS_PER_MINUTE) | 0;
        remainingSeconds = remainingSeconds - (minute * TimeConstants.SECONDS_PER_MINUTE);
        var second = remainingSeconds | 0;
        var millisecond = ((remainingSeconds - second) / TimeConstants.SECONDS_PER_MILLISECOND);

        // JulianDates are noon-based
        hour += 12;
        if (hour > 23) {
            hour -= 24;
        }

        //If we were on a leap second, add it back.
        if (isLeapSecond) {
            second += 1;
        }

        return new GregorianDate(year, month, day, hour, minute, second, millisecond, isLeapSecond);
    };

    /**
     * Creates a JavaScript Date representation of this date in UTC.
     * Javascript dates are only accurate to the nearest millisecond and
     * many implementation cannot represet a leap second.  Consider using
     * {@link JulianDate#toGregorianDate} instead.
     *
     * @returns {Date} A new JavaScript Date equivalent to this JulianDate.
     */
    JulianDate.toDate = function(julianDate) {
        var gDate = JulianDate.toGregorianDate(julianDate);
        var second = gDate.second;
        if (gDate.isLeapSecond) {
            second -= 1;
        }
        return new Date(Date.UTC(gDate.year, gDate.month - 1, gDate.day, gDate.hour, gDate.minute, second, gDate.millisecond));
    };

    /**
     * Creates an ISO8601 string represenation of this JulianDate in UTC.
     *
     * @param {Number} [precision] The number of fractional digits used to represent the seconds component.  By default, the most precise representation is used.
     * @returns {String} An ISO8601 string represenation of this JulianDate.
     */
    JulianDate.toIso8601 = function(julianDate, precision) {
        var gDate = JulianDate.toGregorianDate(julianDate);
        var millisecondStr;

        if (!defined(precision) && gDate.millisecond !== 0) {
            //Forces milliseconds into a number with at least 3 digits to whatever the default toString() precision is.
            millisecondStr = (gDate.millisecond * 0.01).toString().replace('.', '');
            return sprintf("%04d-%02d-%02dT%02d:%02d:%02d.%sZ", gDate.year, gDate.month, gDate.day, gDate.hour, gDate.minute, gDate.second, millisecondStr);
        }

        //Precision is either 0 or milliseconds is 0 with undefined precision, in either case, leave off milliseconds entirely
        if (!defined(precision) || precision === 0) {
            return sprintf("%04d-%02d-%02dT%02d:%02d:%02dZ", gDate.year, gDate.month, gDate.day, gDate.hour, gDate.minute, gDate.second);
        }

        //Forces milliseconds into a number with at least 3 digits to whatever the specified precision is.
        millisecondStr = (gDate.millisecond * 0.01).toFixed(precision).replace('.', '').slice(0, precision);
        return sprintf("%04d-%02d-%02dT%02d:%02d:%02d.%sZ", gDate.year, gDate.month, gDate.day, gDate.hour, gDate.minute, gDate.second, millisecondStr);
    };

    /**
     * Computes the number of seconds that have elapsed from this JulianDate to the <code>other</code>
     * JulianDate.
     *
     * @param {JulianDate} other The other JulianDate, which is the end of the interval.
     * @returns {Number} The number of seconds that have elpased from this JulianDate to the other JulianDate.
     *
     * @see JulianDate#getDaysDifference
     *
     * @example
     * var start = Cesium.JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
     * var end = Cesium.JulianDate.fromDate(new Date('July 5, 2011 12:01:00'));
     * var difference = start.getSecondsDifference(end);    // 86460.0 seconds
     */
    JulianDate.getSecondsDifference = function(left, right) {
        var dayDifference = (right.dayNumber - left.dayNumber) * TimeConstants.SECONDS_PER_DAY;
        return (dayDifference + (right.secondsOfDay - left.secondsOfDay));
    };

    /**
     * Computes the number of days that have elapsed from this JulianDate to the <code>other</code>
     * JulianDate.  A day is always exactly 86400.0 seconds.
     *
     * @param {JulianDate} other The other JulianDate, which is the end of the interval.
     * @returns {Number} The number of days that have elpased from this JulianDate to the other JulianDate.
     *
     * @example
     * var start = Cesium.JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
     * var end = Cesium.JulianDate.fromDate(new Date('July 5, 2011 14:24:00'));
     * var difference = JulianDate.getDaysDifference(start, end);    // 1.1 days
     */
    JulianDate.getDaysDifference = function(left, right) {
        var dayDifference = (right.dayNumber - left.dayNumber);
        var secondDifference = (right.secondsOfDay - left.secondsOfDay) / TimeConstants.SECONDS_PER_DAY;
        return dayDifference + secondDifference;
    };

    /**
     * Returns the number of seconds this TAI date is ahead of UTC.
     *
     * @returns {Number} The number of seconds this TAI date is ahead of UTC
     *
     * @see LeapSecond
     * @see TimeStandard
     */
    JulianDate.getTaiMinusUtc = function(julianDate) {
        binarySearchScratchLeapSecond.julianDate = julianDate;
        var leapSeconds = LeapSecond._leapSeconds;
        var index = binarySearch(leapSeconds, binarySearchScratchLeapSecond, LeapSecond.compareLeapSecondDate);
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
     * Returns a new JulianDate representing a time <code>duration</code> seconds later
     * (or earlier in the case of a negative amount).
     *
     * @param {Number} seconds The number of seconds to add or subtract.
     * @param {JulianDate} [result] The JulianDate to store the result into.
     * @returns {JulianDate} The modified result parameter or a new JulianDate instance if it was not provided.
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00:00 UTC
     * date.setUTCHours(12, 0, 00, 0);
     * var start = Cesium.JulianDate.fromDate(date);
     * var end = JulianDate.addSeconds(start, 95);      // July 4, 2011 @ 12:01:35 UTC
     */
    JulianDate.addSeconds = function(julianDate, seconds, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(seconds)) {
            throw new DeveloperError('seconds is required.');
        }
        //>>includeEnd('debug');

        return setComponents(julianDate.dayNumber, julianDate.secondsOfDay + seconds, result);
    };

    /**
     * Returns a new JulianDate representing a time <code>duration</code> minutes later
     * (or earlier in the case of a negative amount).
     *
     * @param {Number} duration An integer number of minutes to add or subtract.
     * @returns {JulianDate} A new JulianDate object
     *
     * @example
     * var date = new Date();
     * date.setUTCFullYear(2011, 6, 4);     // July 4, 2011 @ 12:00 UTC
     * date.setUTCHours(12, 0, 0, 0);
     * var start = Cesium.JulianDate.fromDate(date);
     * var end = start.addMinutes(65);      // July 4, 2011 @ 13:05 UTC
     */
    JulianDate.addMinutes = function(julianDate, duration) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(duration)) {
            throw new DeveloperError('duration is required and must be a number.');
        }
        //>>includeEnd('debug');

        var newSecondsOfDay = julianDate.secondsOfDay + (duration * TimeConstants.SECONDS_PER_MINUTE);
        return new JulianDate(julianDate.dayNumber, newSecondsOfDay, TimeStandard.TAI);
    };

    /**
     * Returns a new JulianDate representing a time <code>duration</code> hours later
     * (or earlier in the case of a negative amount).
     *
     * @param {Number} duration An integer number of hours to add or subtract.
     * @returns {JulianDate} A new JulianDate object
     */
    JulianDate.addHours = function(julianDate, hours) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(hours)) {
            throw new DeveloperError('hours is required.');
        }
        //>>includeEnd('debug');

        var newSecondsOfDay = julianDate.secondsOfDay + (hours * TimeConstants.SECONDS_PER_HOUR);
        return new JulianDate(julianDate.dayNumber, newSecondsOfDay, TimeStandard.TAI);
    };

    /**
     * Returns a new JulianDate representing a time <code>duration</code> days later
     * (or earlier in the case of a negative amount).
     *
     * @param {Number} duration An integer number of days to add or subtract.
     * @returns {JulianDate} A new JulianDate object
     */
    JulianDate.addDays = function(julianDate, duration) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(duration)) {
            throw new DeveloperError('duration is required and must be a number.');
        }
        //>>includeEnd('debug');

        var newJulianDayNumber = julianDate.dayNumber + duration;
        return new JulianDate(newJulianDayNumber, julianDate.secondsOfDay, TimeStandard.TAI);
    };

    /**
     * Returns true if <code>other</code> occurs after this JulianDate.
     *
     * @param {JulianDate} other The JulianDate to be compared.
     * @returns {Boolean} <code>true</code> if this JulianDate is chronologically earlier than <code>other</code>; otherwise, <code>false</code>.
     */
    JulianDate.lessThan = function(left, right) {
        return JulianDate.compare(left, right) < 0;
    };

    /**
     * Returns true if <code>other</code> occurs at or after this JulianDate.
     *
     * @param {JulianDate} other The JulianDate to be compared.
     * @returns {Boolean} <code>true</code> if this JulianDate is chronologically less than or equal to<code>other</code>; otherwise, <code>false</code>.
     *
     * @see JulianDate#lessThan
     * @see JulianDate#greaterThan
     * @see JulianDate#greaterThanOrEquals
     *
     * @example
     * var start = Cesium.JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
     * var end = Cesium.JulianDate.fromDate(new Date('July 6, 2011 12:00:00'));
     * JulianDate.lessThanOrEquals(start, end);     // true
     */
    JulianDate.lessThanOrEquals = function(left, right) {
        return JulianDate.compare(left, right) <= 0;
    };

    /**
     * Returns true if <code>other</code> occurs before this JulianDate.
     *
     * @param {JulianDate} other The JulianDate to be compared.
     * @returns {Boolean} <code>true</code> if this JulianDate is chronologically later than <code>other</code>; otherwise, <code>false</code>.
     *
     * @see JulianDate#lessThan
     * @see JulianDate#lessThanOrEquals
     * @see JulianDate#greaterThanOrEquals
     *
     * @example
     * var start = Cesium.JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
     * var end = Cesium.JulianDate.fromDate(new Date('July 6, 2011 12:01:00'));
     * JulianDate.greaterThan(end, start);      // true
     */
    JulianDate.greaterThan = function(left, right) {
        return JulianDate.compare(left, right) > 0;
    };

    /**
     * Returns true if <code>other</code> occurs at or before this JulianDate.
     *
     * @param {JulianDate} other The JulianDate to be compared.
     * @returns {Boolean} <code>true</code> if this JulianDate is chronologically later than or equal to <code>other</code>; otherwise, <code>false</code>.
     */
    JulianDate.greaterThanOrEquals = function(left, right) {
        return JulianDate.compare(left, right) >= 0;
    };

    /**
     * Duplicates this JulianDate.
     *
     * @param {JulianDate} [result] The object onto which to store the JulianDate.
     * @returns {JulianDate} The modified result parameter or a new JulianDate instance if one was not provided.
     */
    JulianDate.prototype.clone = function(result) {
        return JulianDate.clone(this, result);
    };

    /**
     * Returns <code>true</code> if this date is equivalent to the specified date.
     *
     * @param {JulianDate} other The JulianDate to be compared.
     * @returns {Boolean} <code>true</code> if the two JulianDates are equal; otherwise <code>false</code>.
     *
     * @see JulianDate#equalsEpsilon
     *
     * @example
     * var original = Cesium.JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
     * var clone = Cesium.JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
     * original.equals(clone);      // true
     */
    JulianDate.prototype.equals = function(other) {
        return JulianDate.equals(this, other);
    };

    /**
     * Returns <code>true</code> if this date is within <code>epsilon</code> seconds of the
     * specified date.  That is, in order for the dates to be considered equal (and for
     * this function to return <code>true</code>), the absolute value of the difference between them, in
     * seconds, must be less than <code>epsilon</code>.
     *
     * @param {JulianDate} other The JulianDate to be compared.
     * @param {Number} epsilon The number of seconds that should separate the two JulianDates
     * @returns {Boolean} <code>true</code> if the two JulianDates are within <code>epsilon</code> seconds of each other; otherwise <code>false</code>.
     *
     * @see JulianDate#equals
     *
     * @example
     * var original = Cesium.JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
     * var clone = Cesium.JulianDate.fromDate(new Date('July 4, 2011 12:00:01'));
     * original.equalsEpsilon(clone, 2);    // true
     */
    JulianDate.prototype.equalsEpsilon = function(other, epsilon) {
        return JulianDate.equalsEpsilon(this, other, epsilon);
    };

    /**
     * Compares this date to another date.
     *
     * @param {JulianDate} other The other JulianDate to compare to.
     * @returns {Number} A negative value if this instance is less than the other,
     *                  a positive value if this instance is greater than the other,
     *                  or zero if this instance and the other are equal.
     */
    JulianDate.prototype.compareTo = function(other) {
        return JulianDate.compare(this, other);
    };

    //To avoid circular dependencies, we load the default list of leap seconds
    //here, rather than in the LeapSecond class itself.
    if (LeapSecond._leapSeconds.length === 0) {
        LeapSecond._leapSeconds = [
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
                                 ];
    }

    return JulianDate;
});
