defineSuite([
        'Core/JulianDate',
        'Core/Iso8601',
        'Core/Math',
        'Core/TimeConstants',
        'Core/TimeStandard'
    ], function(
        JulianDate,
        Iso8601,
        CesiumMath,
        TimeConstants,
        TimeStandard) {
    'use strict';

    // All exact Julian Dates found using NASA's Time Conversion Tool: http://ssd.jpl.nasa.gov/tc.cgi
    it('Construct a default date', function() {
        var defaultDate = new JulianDate();
        expect(defaultDate.dayNumber).toEqual(0);
        expect(defaultDate.secondsOfDay).toEqual(10);
    });

    it('Construct a date with fractional day', function() {
        var julianDate = new JulianDate(2448257.75, 0, TimeStandard.UTC);
        var expected = new JulianDate(2448257, 64826, TimeStandard.TAI);
        expect(julianDate).toEqual(expected);
    });

    it('Construct a date at the current time', function() {
        // Default constructing a date uses 'now'.  Unfortunately,
        // there's no way to know exactly what that time will be, so we
        // give ourselves a 5 second epsilon as a hack to avoid possible
        // race conditions.  In reality, it might be better to just omit
        // a check in this test, since if this breaks, tons of other stuff
        // will as well.
        var defaultDate = JulianDate.now();
        var dateNow = JulianDate.fromDate(new Date());
        expect(defaultDate.equalsEpsilon(dateNow, 5)).toEqual(true);
    });

    it('Construct a date from basic TAI components', function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var timeStandard = TimeStandard.TAI;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.dayNumber).toEqual(dayNumber);
        expect(julianDate.secondsOfDay).toEqual(seconds);
    });

    it('clone works without result parameter', function() {
        var julianDate = JulianDate.now();
        var returnedResult = julianDate.clone();
        expect(returnedResult).toEqual(julianDate);
        expect(returnedResult).not.toBe(julianDate);
    });

    it('clone works with result parameter', function() {
        var julianDate = new JulianDate(1, 2);
        var result = JulianDate.now();
        var returnedResult = julianDate.clone(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).not.toBe(julianDate);
        expect(returnedResult).toEqual(julianDate);
    });

    it('Construct a date from UTC components just before a leap second', function() {
        var expected = new JulianDate(2443874, 43216, TimeStandard.TAI);
        var julianDate = new JulianDate(2443874, 43199.0, TimeStandard.UTC);
        expect(julianDate.dayNumber).toEqual(expected.dayNumber);
        expect(julianDate.secondsOfDay).toEqual(expected.secondsOfDay);
    });

    it('Construct a date from UTC components equivalent to a LeapSecond table entry', function() {
        var expected = new JulianDate(2443874, 43218, TimeStandard.TAI);
        var julianDate = new JulianDate(2443874, 43200.0, TimeStandard.UTC);
        expect(julianDate.dayNumber).toEqual(expected.dayNumber);
        expect(julianDate.secondsOfDay).toEqual(expected.secondsOfDay);
    });

    it('Construct a date from UTC components just after a leap second', function() {
        var expected = new JulianDate(2443874, 43219, TimeStandard.TAI);
        var julianDate = new JulianDate(2443874, 43201.0, TimeStandard.UTC);
        expect(julianDate.dayNumber).toEqual(expected.dayNumber);
        expect(julianDate.secondsOfDay).toEqual(expected.secondsOfDay);
    });

    it('Construct a date from basic components with more seconds than a day', function() {
        var dayNumber = 12;
        var seconds = 86401;
        var timeStandard = TimeStandard.TAI;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.dayNumber).toEqual(13);
        expect(julianDate.secondsOfDay).toEqual(1);
    });

    it('Construct a date from basic components with negative seconds in a day', function() {
        var dayNumber = 12;
        var seconds = -1;
        var timeStandard = TimeStandard.TAI;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.dayNumber).toEqual(11);
        expect(julianDate.secondsOfDay).toEqual(86399);
    });

    it('Construct a date from basic components with partial day and seconds in a day', function() {
        var dayNumber = 12.5;
        var seconds = -1;
        var timeStandard = TimeStandard.TAI;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.dayNumber).toEqual(12);
        expect(julianDate.secondsOfDay).toEqual(43199);
    });

    it('Construct a date with default time standard', function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var julianDateDefault = new JulianDate(dayNumber, seconds);
        var julianDateUtc = new JulianDate(dayNumber, seconds, TimeStandard.UTC);
        expect(julianDateDefault).toEqual(julianDateUtc);
    });

    it('Construct a date from a JavaScript Date (1)', function() {
        var date = new Date('January 1, 1991 06:00:00 UTC');
        var julianDate = JulianDate.fromDate(date);
        expect(julianDate.dayNumber).toEqual(2448257);
        expect(julianDate.secondsOfDay).toEqual(64826);
    });

    it('Construct a date from a JavaScript Date (2)', function() {
        var date = new Date('July 4, 2011 12:00:00 UTC');
        var julianDate = JulianDate.fromDate(date);
        expect(julianDate.dayNumber).toEqual(2455747);
        expect(julianDate.secondsOfDay).toEqual(34);
    });

    it('Construct a date from a JavaScript Date (3)', function() {
        var date = new Date('December 31, 2021 18:00:00 UTC');
        var julianDate = JulianDate.fromDate(date);
        expect(julianDate.dayNumber).toEqual(2459580);
        expect(julianDate.secondsOfDay).toEqual(21637);
    });

    it('Construct a date from a JavaScript Date (4)', function() {
        var jsDate = new Date('September 1, 2011 12:00:00 UTC');
        var julianDate = JulianDate.fromDate(jsDate);
        expect(julianDate.dayNumber).toEqual(2455806);
        expect(julianDate.secondsOfDay).toEqual(34);
    });

    it('Construct a date from a JavaScript Date (5)', function() {
        var jsDate = new Date('11/17/2039 12:00:00 AM UTC');
        var julianDate = JulianDate.fromDate(jsDate);
        expect(julianDate.dayNumber).toEqual(2466109);
        expect(julianDate.secondsOfDay).toEqual(43237);
    });

    it('Fail to construct from an undefined JavaScript Date', function() {
        expect(function() {
            return JulianDate.fromDate(undefined);
        }).toThrowDeveloperError();
    });

    it('Fail to construct from an invalid JavaScript Date', function() {
        expect(function() {
            return JulianDate.fromDate(new Date(Date.parse('garbage')));
        }).toThrowDeveloperError();
    });

    it('Construct from ISO8601 calendar date, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1)));
        var computedDate = JulianDate.fromIso8601('20090801');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 calendar date, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1)));
        var computedDate = JulianDate.fromIso8601('2009-08-01');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 calendar date on Feb 29th, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2000, 1, 29)));
        var computedDate = JulianDate.fromIso8601('20000229');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 calendar date on Feb 29th, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2000, 1, 29)));
        var computedDate = JulianDate.fromIso8601('2000-02-29');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 ordinal date, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(1985, 3, 12)));
        var computedDate = JulianDate.fromIso8601('1985102');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 ordinal date, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(1985, 3, 12)));
        var computedDate = JulianDate.fromIso8601('1985-102');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct an ISO8601 ordinal date on a leap year', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2000, 11, 31)));
        var computedDate = JulianDate.fromIso8601('2000-366');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 week date, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(1985, 3, 12)));
        var computedDate = JulianDate.fromIso8601('1985W155');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 week date, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2008, 8, 27)));
        var computedDate = JulianDate.fromIso8601('2008-W39-6');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 calendar week date, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(1985, 3, 7)));
        var computedDate = JulianDate.fromIso8601('1985W15');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 calendar week date, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2008, 8, 21)));
        var computedDate = JulianDate.fromIso8601('2008-W39');
        expect(computedDate).toEqual(expectedDate);
    });

    //Note, there is no 'extended format' for calendar month because eliminating the
    //would confuse is with old YYMMDD dates
    it('Construct from an ISO8601 calendar month, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(1985, 3, 1)));
        var computedDate = JulianDate.fromIso8601('1985-04');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 25)));
        var computedDate = JulianDate.fromIso8601('20090801T123025Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 25)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30:25Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional seconds, basic format', function() {
        //Date is only accurate to milliseconds, while JulianDate, much more so.  The below date gets
        //rounded to 513, so we need to construct a JulianDate directly.
        //var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 25, 5125423)));
        var expectedDate = new JulianDate(2455045, 1825.5125423, TimeStandard.UTC);
        var computedDate = JulianDate.fromIso8601('20090801T123025.5125423Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional seconds, extended format', function() {
        //Date is only accurate to milliseconds, while JulianDate, much more so.  The below date gets
        //rounded to 513, so we need to construct a JulianDate directly.
        var expectedDate = new JulianDate(2455045, 1825.5125423, TimeStandard.UTC);
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30:25.5125423Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional seconds, basic format, "," instead of "."', function() {
        //Date is only accurate to milliseconds, while JulianDate, much more so.  The below date gets
        //rounded to 513, so we need to construct a JulianDate directly.
        //var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 25, 5125423)));
        var expectedDate = new JulianDate(2455045, 1825.5125423, TimeStandard.UTC);
        var computedDate = JulianDate.fromIso8601('20090801T123025,5125423Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional seconds, extended format, "," instead of "."', function() {
        //Date is only accurate to milliseconds, while JulianDate, much more so.  The below date gets
        //rounded to 513, so we need to construct a JulianDate directly.
        var expectedDate = new JulianDate(2455045, 1825.5125423, TimeStandard.UTC);
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30:25,5125423Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time no seconds, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('20090801T1230Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time no seconds, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional minutes, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 30)));
        var computedDate = JulianDate.fromIso8601('20090801T1230.5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional minutes, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 30)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30.5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional minutes, basic format, "," instead of "."', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 30)));
        var computedDate = JulianDate.fromIso8601('20090801T1230,5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional minutes, extended format, "," instead of "."', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 30)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30,5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time no minutes/seconds, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 0, 0)));
        var computedDate = JulianDate.fromIso8601('20090801T12Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time no minutes/seconds, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 0, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional hours, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('20090801T12.5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional hours, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12.5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional hours, basic format, "," instead of "."', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('20090801T12,5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional hours, extended format, "," instead of "."', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12,5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 UTC calendar date and time on a leap second', function() {
        var computedDate = JulianDate.fromIso8601('2008-12-31T23:59:60Z');
        var expectedDate = new JulianDate(2454832, 43233, TimeStandard.TAI);
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 UTC calendar date and time within a leap second', function() {
        var computedDate = JulianDate.fromIso8601('2008-12-31T23:59:60.123456789Z');
        var expectedDate = new JulianDate(2454832, 43233.123456789, TimeStandard.TAI);
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date and time on a leap second 1 hour behind UTC', function() {
        var computedDate = JulianDate.fromIso8601('2008-12-31T22:59:60-01');
        var expectedDate = new JulianDate(2454832, 43233, TimeStandard.TAI);
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date and time on a leap second 1 hour ahead of UTC', function() {
        var computedDate = JulianDate.fromIso8601('2009-01-01T00:59:60+01');
        var expectedDate = new JulianDate(2454832, 43233, TimeStandard.TAI);
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 calendar date and time using 24:00:00 midnight notation', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 2, 0, 0, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T24:00:00Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset that crosses into previous month', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(1985, 2, 31, 23, 59, 0)));
        var computedDate = JulianDate.fromIso8601('1985-04-01T00:59:00+01');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset that crosses into next month', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(1985, 3, 1, 0, 59, 0)));
        var computedDate = JulianDate.fromIso8601('1985-03-31T23:59:00-01');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset that crosses into next year', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2008, 11, 31, 23, 0, 0)));
        var julianDate = JulianDate.fromIso8601('2009-01-01T01:00:00+02');
        expect(julianDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset that crosses into previous year', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 0, 1, 1, 0, 0)));
        var julianDate = JulianDate.fromIso8601('2008-12-31T23:00:00-02');
        expect(julianDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2008, 10, 10, 12, 0, 0)));
        var julianDate = JulianDate.fromIso8601('2008-11-10T14:00:00+02');
        expect(julianDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset in extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2008, 10, 10, 11, 30, 0)));
        var julianDate = JulianDate.fromIso8601('2008-11-10T14:00:00+02:30');
        expect(julianDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with zero UTC offset in extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2008, 10, 10, 14, 0, 0)));
        var julianDate = JulianDate.fromIso8601('2008-11-10T14:00:00+00:00');
        expect(julianDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with zero UTC offset in extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2008, 10, 10, 14, 0, 0)));
        var julianDate = JulianDate.fromIso8601('2008-11-10T14:00:00+00');
        expect(julianDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 local calendar date and time with no seconds and UTC offset in basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('20090801T0730-0500');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 local calendar date and time with no seconds and UTC offset in extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T07:30-05:00');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Fails to construct an ISO8601 ordinal date with day less than 1', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-000');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 ordinal date with day more than 365 on non-leap year', function() {
        expect(function() {
            return JulianDate.fromIso8601('2001-366');
        }).toThrowDeveloperError();
    });

    it('Fails to construct ISO8601 UTC calendar date of invalid YYMMDD format', function() {
        expect(function() {
            return JulianDate.fromIso8601('200905');
        }).toThrowDeveloperError();
    });

    it('Fails to construct a complete ISO8601 date missing T delimeter', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-08-0112:30.5Z');
        }).toThrowDeveloperError();
    });

    it('Fails to construct a complete ISO8601 date with delimeter other than T', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-08-01Q12:30.5Z');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 date from undefined', function() {
        expect(function() {
            return JulianDate.fromIso8601(undefined);
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 from complete garbage', function() {
        expect(function() {
            return JulianDate.fromIso8601('this is not a date');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 date from a valid ISO8601 interval', function() {
        expect(function() {
            return JulianDate.fromIso8601('2007-03-01T13:00:00Z/2008-05-11T15:30:00Z');
        }).toThrowDeveloperError();
    });

    it('Fails to construct from an ISO8601 with too many year digits', function() {
        expect(function() {
            return JulianDate.fromIso8601('20091-05-19');
        }).toThrowDeveloperError();
    });

    it('Fails to construct from an ISO8601 with too many month digits', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-100-19');
        }).toThrowDeveloperError();
    });

    it('Fails to construct from an ISO8601 with more than 12 months', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-13-19');
        }).toThrowDeveloperError();
    });

    it('Fails to construct from an ISO8601 with less than 1 months', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-00-19');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 January date with more than 31 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-01-32');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 Febuary date with more than 28 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-02-29');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 Febuary leap year date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-02-30');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 March date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-03-32');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 April date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-04-31');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 May date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-05-32');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 June date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-06-31');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 July date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-07-32');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 August date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-08-32');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 September date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-09-31');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 October date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-10-32');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 November date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-11-31');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 December date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-32');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 date with more than 24 hours (extra seconds)', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T24:00:01');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 date with more than 24 hours (extra minutes)', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T24:01:00');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 date with more than 59 minutes', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T12:60');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 date with more than 60 seconds', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T12:59:61');
        }).toThrowDeveloperError();
    });

    it('Fails to construct from an ISO8601 with less than 1 day', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-01-00');
        }).toThrowDeveloperError();
    });

    it('Fails to construct from an ISO8601 with too many dashes', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009--01-01');
        }).toThrowDeveloperError();
    });

    it('Fails to construct from an ISO8601 with garbage offset', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T12:59:23ZZ+-050708::1234');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 date with more than one decimal place', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T12:59:22..2');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 calendar date mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('200108-01');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 calendar date mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2001-0801');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 calendar week mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2008-W396');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 calendar week mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2008W39-6');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 date with trailing -', function() {
        expect(function() {
            return JulianDate.fromIso8601('2001-');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 time mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T22:0100');
        }).toThrowDeveloperError();
    });

    it('Fails to construct an ISO8601 time mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T2201:00');
        }).toThrowDeveloperError();
    });

    it('toDate works when using TAI', function() {
        var julianDateTai = new JulianDate(2455927.157772, 0, TimeStandard.UTC);
        var javascriptDate = JulianDate.toDate(julianDateTai);
        expect(javascriptDate.getUTCFullYear()).toEqual(2011);
        expect(javascriptDate.getUTCMonth()).toEqual(11);
        expect(javascriptDate.getUTCDate()).toEqual(31);
        expect(javascriptDate.getUTCHours()).toEqual(15);
        expect(javascriptDate.getUTCMinutes()).toEqual(47);
        expect(javascriptDate.getUTCSeconds()).toEqual(11);
        expect(javascriptDate.getUTCMilliseconds()).toEqualEpsilon(500, 10);
    });

    it('toDate works a second before a leap second', function() {
        var expectedDate = new Date('6/30/1997 11:59:59 PM UTC');
        var date = JulianDate.toDate(new JulianDate(2450630, 43229.0, TimeStandard.TAI));
        expect(date).toEqual(expectedDate);
    });

    it('toDate works on a leap second', function() {
        var expectedDate = new Date('6/30/1997 11:59:59 PM UTC');
        var date = JulianDate.toDate(new JulianDate(2450630, 43230.0, TimeStandard.TAI));
        expect(date).toEqual(expectedDate);
    });

    it('toDate works a second after a leap second', function() {
        var expectedDate = new Date('7/1/1997 12:00:00 AM UTC');
        var date = JulianDate.toDate(new JulianDate(2450630, 43231.0, TimeStandard.TAI));
        expect(date).toEqual(expectedDate);
    });

    it('toDate works on date before any leap seconds', function() {
        var expectedDate = new Date('09/10/1968 12:00:00 AM UTC');
        var date = JulianDate.toDate(new JulianDate(2440109, 43210.0, TimeStandard.TAI));
        expect(date).toEqual(expectedDate);
    });

    it('toDate works on date later than all leap seconds', function() {
        var expectedDate = new Date('11/17/2039 12:00:00 AM UTC');
        var date = JulianDate.toDate(new JulianDate(2466109, 43237.0, TimeStandard.TAI));
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works a second before a leap second', function() {
        var expectedDate = '1997-06-30T23:59:59Z';
        var date = JulianDate.toIso8601(JulianDate.fromIso8601(expectedDate));
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works on a leap second', function() {
        var expectedDate = '1997-06-30T23:59:60Z';
        var date = JulianDate.toIso8601(JulianDate.fromIso8601(expectedDate));
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works a second after a leap second', function() {
        var expectedDate = '1997-07-01T00:00:00Z';
        var date = JulianDate.toIso8601(JulianDate.fromIso8601(expectedDate));
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works on date before any leap seconds', function() {
        var expectedDate = '1968-09-10T00:00:00Z';
        var date = JulianDate.toIso8601(JulianDate.fromIso8601(expectedDate));
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works on date later than all leap seconds', function() {
        var expectedDate = '2031-11-17T00:00:00Z';
        var date = JulianDate.toIso8601(JulianDate.fromIso8601(expectedDate));
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works without precision', function() {
        var expectedDate = '0950-01-02T03:04:05.5Z';
        var date = JulianDate.toIso8601(JulianDate.fromIso8601(expectedDate));
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 pads zeros for year less than four digits or time components less than two digits', function() {
        var expectedDate = '0950-01-02T03:04:05.005Z';
        var date = JulianDate.toIso8601(JulianDate.fromIso8601(expectedDate), 3);
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 does not show milliseconds if they are 0', function() {
        var expectedDate = '0950-01-02T03:04:05Z';
        var date = JulianDate.toIso8601(JulianDate.fromIso8601(expectedDate));
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works with specified precision', function() {
        var isoDate = '0950-01-02T03:04:05.012345Z';
        var date;
        date = JulianDate.toIso8601(JulianDate.fromIso8601(isoDate), 0);
        expect(date).toEqual('0950-01-02T03:04:05Z');
        date = JulianDate.toIso8601(JulianDate.fromIso8601(isoDate), 1);
        expect(date).toEqual('0950-01-02T03:04:05.0Z');
        date = JulianDate.toIso8601(JulianDate.fromIso8601(isoDate), 2);
        expect(date).toEqual('0950-01-02T03:04:05.01Z');
        date = JulianDate.toIso8601(JulianDate.fromIso8601(isoDate), 3);
        expect(date).toEqual('0950-01-02T03:04:05.012Z');
        date = JulianDate.toIso8601(JulianDate.fromIso8601(isoDate), 4);
        expect(date).toEqual('0950-01-02T03:04:05.0123Z');
        date = JulianDate.toIso8601(JulianDate.fromIso8601(isoDate), 5);
        expect(date).toEqual('0950-01-02T03:04:05.01234Z');
        date = JulianDate.toIso8601(JulianDate.fromIso8601(isoDate), 6);
        expect(date).toEqual('0950-01-02T03:04:05.012345Z');
        date = JulianDate.toIso8601(JulianDate.fromIso8601(isoDate), 7);
        expect(date).toEqual('0950-01-02T03:04:05.0123450Z');
    });

    it('can format Iso8601.MINIMUM_VALUE and MAXIMUM_VALUE to ISO strings', function() {
        var minString = Iso8601.MINIMUM_VALUE.toString();
        expect(minString).toEqual('0000-01-01T00:00:00Z');
        expect(JulianDate.fromIso8601(minString)).toEqual(Iso8601.MINIMUM_VALUE);

        var maxString = Iso8601.MAXIMUM_VALUE.toString();
        expect(maxString).toEqual('9999-12-31T24:00:00Z');
        expect(JulianDate.fromIso8601(maxString)).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('secondsDifference works in UTC', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00 UTC'));
        expect(JulianDate.secondsDifference(end, start)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, CesiumMath.EPSILON5);
    });

    it('secondsDifference works in TAI', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00 UTC'));
        expect(JulianDate.secondsDifference(end, start)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, CesiumMath.EPSILON5);
    });

    it('secondsDifference works with mixed time standards', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00 UTC'));
        expect(JulianDate.secondsDifference(end, start)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, CesiumMath.EPSILON5);
    });

    it('daysDifference works', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 14:24:00'));
        var difference = JulianDate.daysDifference(end, start);
        expect(difference).toEqual(1.1);
    });

    it('daysDifference works with negative result', function() {
        var end = JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
        var start = JulianDate.fromDate(new Date('July 5, 2011 14:24:00'));
        var difference = JulianDate.daysDifference(end, start);
        expect(difference).toEqual(-1.1);
    });

    it('addSeconds works with whole seconds', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:30 UTC'));
        var end = JulianDate.addSeconds(start, 95, new JulianDate());
        expect(JulianDate.toDate(end).getUTCSeconds()).toEqualEpsilon(5, CesiumMath.EPSILON5);
        expect(JulianDate.toDate(end).getUTCMinutes()).toEqualEpsilon(2, CesiumMath.EPSILON5);
    });

    it('addSeconds works with fractions (1)', function() {
        var start = new JulianDate(2454832, 0, TimeStandard.TAI);
        var end = JulianDate.addSeconds(start, 1.5, new JulianDate());
        expect(JulianDate.secondsDifference(end, start)).toEqual(1.5);
    });

    it('addSeconds works with fractions (2)', function() {
        var start = JulianDate.fromDate(new Date('August 11 2011 6:00:00 UTC'));
        var end = JulianDate.addSeconds(start, 0.5, new JulianDate());
        expect(JulianDate.secondsDifference(end, start, new JulianDate())).toEqual(0.5);
    });

    it('addSeconds works with fractions (3)', function() {
        var start = JulianDate.fromDate(new Date('August 11 2011 11:59:59 UTC'));
        var end = JulianDate.addSeconds(start, 1.25, new JulianDate());
        expect(JulianDate.secondsDifference(end, start, new JulianDate())).toEqual(1.25);
    });

    it('addSeconds works with negative numbers', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:01:30 UTC'));
        var end = JulianDate.addSeconds(start, -60.0, new JulianDate());
        expect(JulianDate.secondsDifference(end, start)).toEqual(-60.0);
    });

    it('addSeconds works with more seconds than in a day', function() {
        var seconds = TimeConstants.SECONDS_PER_DAY * 7 + 15;
        var start = new JulianDate(2448444, 0, TimeStandard.UTC);
        var end = JulianDate.addSeconds(start, seconds, new JulianDate());
        expect(JulianDate.secondsDifference(end, start)).toEqual(seconds);
    });

    it('addSeconds works with negative seconds more than in a day', function() {
        var seconds = -TimeConstants.SECONDS_PER_DAY * 7 - 15;
        var start = new JulianDate(2448444, 0, TimeStandard.UTC);
        var end = JulianDate.addSeconds(start, seconds, new JulianDate());
        expect(JulianDate.secondsDifference(end, start)).toEqual(seconds);
    });
    it('addSeconds fails with undefined input', function() {
        expect(function() {
            return JulianDate.addSeconds(JulianDate.now(), undefined, new JulianDate());
        }).toThrowDeveloperError();
    });
    it('addMinutes works', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.addMinutes(start, 65, new JulianDate());
        expect(JulianDate.toDate(end).getUTCMinutes()).toEqualEpsilon(5, CesiumMath.EPSILON5);
        expect(JulianDate.toDate(end).getUTCHours()).toEqualEpsilon(13, CesiumMath.EPSILON5);
    });

    it('addMinutes works with negative numbers', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.addMinutes(start, -35, new JulianDate());
        expect(JulianDate.toDate(end).getUTCMinutes()).toEqualEpsilon(25, CesiumMath.EPSILON5);
        expect(JulianDate.toDate(end).getUTCHours()).toEqualEpsilon(11, CesiumMath.EPSILON5);
    });

    it('addMinutes fails with undefined input', function() {
        expect(function() {
            return JulianDate.addMinutes(JulianDate.now(), undefined, new JulianDate());
        }).toThrowDeveloperError();
    });

    it('addHours works', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.addHours(start, 6, new JulianDate());
        expect(JulianDate.toDate(end).getUTCHours()).toEqualEpsilon(18, CesiumMath.EPSILON5);
    });

    it('addHours works with negative numbers', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.addHours(start, -6, new JulianDate());
        expect(JulianDate.toDate(end).getUTCHours()).toEqualEpsilon(6, CesiumMath.EPSILON5);
    });
    it('addHours fails with undefined input', function() {
        expect(function() {
            return JulianDate.addHours(JulianDate.now(), undefined, new JulianDate());
        }).toThrowDeveloperError();
    });

    it('addDays works', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.addDays(start, 32, new JulianDate());
        expect(JulianDate.toDate(end).getUTCDate()).toEqualEpsilon(5, CesiumMath.EPSILON5);
        expect(JulianDate.toDate(end).getUTCMonth()).toEqualEpsilon(7, CesiumMath.EPSILON5);
    });

    it('addDays works with negative numbers', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.addDays(start, -4, new JulianDate());
        expect(JulianDate.toDate(end).getUTCDate()).toEqualEpsilon(30, CesiumMath.EPSILON5);
        expect(JulianDate.toDate(end).getUTCMonth()).toEqualEpsilon(5, CesiumMath.EPSILON5);
    });

    it('addDays fails with undefined input', function() {
        expect(function() {
            return JulianDate.addDays(JulianDate.now(), undefined, new JulianDate());
        }).toThrowDeveloperError();
    });

    it('lessThan works', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 2011 12:01:00'));
        expect(JulianDate.lessThan(start, end)).toEqual(true);
    });

    it('lessThan works with equal values', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(JulianDate.lessThan(start, end)).toEqual(false);
        expect(JulianDate.lessThan(start, JulianDate.addSeconds(end, 1, new JulianDate()))).toEqual(true);
    });

    it('lessThan works with different time standards', function() {
        var start = new JulianDate(0, 0, TimeStandard.TAI);
        var end = new JulianDate(0, 0, TimeStandard.UTC);
        expect(JulianDate.lessThan(start, end)).toEqual(true);
    });

    it('lessThanOrEquals works', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(JulianDate.lessThanOrEquals(start, end)).toEqual(true);
        expect(JulianDate.lessThanOrEquals(JulianDate.addSeconds(start, 1, new JulianDate()), end)).toEqual(false);
        expect(JulianDate.lessThanOrEquals(JulianDate.addSeconds(start, -1, new JulianDate()), end)).toEqual(true);
    });

    it('greaterThan works', function() {
        var start = JulianDate.fromDate(new Date('July 6, 2011 12:01:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(JulianDate.greaterThan(start, end)).toEqual(true);
    });

    it('greaterThan works with equal values', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(JulianDate.greaterThan(start, end)).toEqual(false);
        expect(JulianDate.greaterThan(start, JulianDate.addSeconds(end, -1, new JulianDate()))).toEqual(true);
    });

    it('greaterThan works with different time standards', function() {
        var start = new JulianDate(0, 0, TimeStandard.UTC);
        var end = new JulianDate(0, 0, TimeStandard.TAI);
        expect(JulianDate.greaterThan(start, end)).toEqual(true);
    });

    it('greaterThanOrEquals works', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(JulianDate.greaterThanOrEquals(start, end)).toEqual(true);
        expect(JulianDate.greaterThanOrEquals(JulianDate.addSeconds(start, -1, new JulianDate()), end)).toEqual(false);
        expect(JulianDate.greaterThanOrEquals(JulianDate.addSeconds(start, 1, new JulianDate()), end)).toEqual(true);
    });

    it('can be equal to within an epsilon of another JulianDate', function() {
        var original = JulianDate.fromDate(new Date('September 7, 2011 12:55:00 UTC'));
        var clone = JulianDate.fromDate(new Date('September 7, 2011 12:55:00 UTC'));
        clone = JulianDate.addSeconds(clone, 1, new JulianDate());
        expect(original.equalsEpsilon(clone, 2)).toEqual(true);
    });

    it('totalDays works', function() {
        var totalDays = 2455784.7500058;
        var original = new JulianDate(totalDays, 0, TimeStandard.TAI);
        expect(totalDays).toEqual(JulianDate.totalDays(original));
    });

    it('equalsEpsilon works', function() {
        var date = JulianDate.now();
        var datePlusOne = JulianDate.addSeconds(date, 0.01, new JulianDate());
        expect(date.equalsEpsilon(datePlusOne, CesiumMath.EPSILON1)).toEqual(true);
    });

    it('formats as ISO8601 with toString', function() {
        var date = JulianDate.now();
        expect(date.toString()).toEqual(JulianDate.toIso8601(date));
    });

    it('computeTaiMinusUtc works before all leap seconds', function() {
        var date = new Date('July 11, 1970 12:00:00 UTC');
        var jd = JulianDate.fromDate(date);
        var difference = JulianDate.computeTaiMinusUtc(jd);
        expect(difference).toEqual(10);
    });

    it('computeTaiMinusUtc works a second before a leap second', function() {
        var date = new JulianDate(2456109, 43233.0, TimeStandard.TAI);
        expect(JulianDate.computeTaiMinusUtc(date)).toEqual(34);
    });

    it('computeTaiMinusUtc works on a leap second', function() {
        var date = new JulianDate(2456109, 43234.0, TimeStandard.TAI);
        expect(JulianDate.computeTaiMinusUtc(date)).toEqual(34);
    });

    it('computeTaiMinusUtc works a second after a leap second', function() {
        var date = new JulianDate(2456109, 43235.0, TimeStandard.TAI);
        expect(JulianDate.computeTaiMinusUtc(date)).toEqual(35);
    });

    it('computeTaiMinusUtc works after all leap seconds', function() {
        var date = new JulianDate(2556109, 43237.0, TimeStandard.TAI);
        expect(JulianDate.computeTaiMinusUtc(date)).toEqual(37);
    });

    it('fromGregorianDate returns the same date', function() {
        var iso86011 = '2017-01-01T10:01:01.5Z';
        var julian1 = JulianDate.fromIso8601(iso86011);
        var gregorian = JulianDate.toGregorianDate(julian1);
        var julian2 = JulianDate.fromGregorianDate(gregorian);
        var iso86012 = JulianDate.toIso8601(julian2);

        expect(iso86011).toEqual(iso86012);
        expect(JulianDate.compare(julian1, julian2)).toEqual(0);
    });
});
